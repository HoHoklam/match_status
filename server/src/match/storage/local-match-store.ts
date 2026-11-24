import * as fs from 'fs';
import * as path from 'path';
import { MatchLiveSnapshot } from '@shared/types';
import { MOCK_MATCH_LIST } from '@shared/mockMatches';

export class LocalMatchStore {
  private readonly dataDir = path.resolve(__dirname, '../../../data');
  private readonly dataFilePath = path.join(this.dataDir, 'matches.json');
  private memoryCache: Map<string, MatchLiveSnapshot> = new Map();
  private historySnapshots: Map<string, MatchLiveSnapshot[]> = new Map(); // 30步快照回滚栈

  constructor() {
    this.ensureDataDir();
    this.loadFromDisk();
  }

  private ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private loadFromDisk() {
    if (fs.existsSync(this.dataFilePath)) {
      try {
        const raw = fs.readFileSync(this.dataFilePath, 'utf-8');
        const list: MatchLiveSnapshot[] = JSON.parse(raw);
        for (const item of list) {
          this.memoryCache.set(item.id, item);
        }
        return;
      } catch (err) {
        console.error('[LocalMatchStore] 读取持久化数据异常，使用预置数据初始化:', err);
      }
    }

    // 初始化预置数据
    for (const match of MOCK_MATCH_LIST) {
      this.memoryCache.set(match.id, JSON.parse(JSON.stringify(match)));
    }
    this.persistToDisk();
  }

  public persistToDisk() {
    try {
      this.ensureDataDir();
      const list = Array.from(this.memoryCache.values());
      fs.writeFileSync(this.dataFilePath, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.error('[LocalMatchStore] 数据持久化写入失败:', err);
    }
  }

  public getAll(): MatchLiveSnapshot[] {
    return Array.from(this.memoryCache.values());
  }

  public getById(id: string): MatchLiveSnapshot | null {
    const found = this.memoryCache.get(id);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  public save(snapshot: MatchLiveSnapshot): void {
    // 压入历史栈（最多保存 30 步快照用于撤销）
    const matchId = snapshot.id;
    const history = this.historySnapshots.get(matchId) || [];
    const current = this.memoryCache.get(matchId);
    if (current) {
      history.push(JSON.parse(JSON.stringify(current)));
      if (history.length > 30) {
        history.shift();
      }
      this.historySnapshots.set(matchId, history);
    }

    snapshot.updatedAt = Date.now();
    snapshot.version = (snapshot.version || 0) + 1;
    this.memoryCache.set(matchId, JSON.parse(JSON.stringify(snapshot)));
    this.persistToDisk();
  }

  public popHistory(id: string): MatchLiveSnapshot | null {
    const history = this.historySnapshots.get(id);
    if (!history || history.length === 0) {
      return null;
    }
    const previous = history.pop()!;
    previous.updatedAt = Date.now();
    previous.version = (previous.version || 0) + 1;
    this.memoryCache.set(id, previous);
    this.persistToDisk();
    return JSON.parse(JSON.stringify(previous));
  }

  public reset(id: string): MatchLiveSnapshot | null {
    const match = this.memoryCache.get(id);
    if (!match) return null;

    const halfMin = match.halfDuration || 45;
    match.score = { home: 0, away: 0 };
    match.kickoffTime = null;
    match.timeline = [];
    delete match.penaltyShootout;
    match.clock = {
      period: 'NOT_STARTED',
      isRunning: false,
      currentSecond: 0,
      displayMinute: 0,
      displayTime: '00:00',
      halfTimeMinute: null,
      secondHalfStartMinute: halfMin,
      lastStartedAt: null,
      previousPeriod: null,
    };
    match.stats = {
      possession: { home: 50, away: 50, homeSeconds: 0, awaySeconds: 0 },
      shots: { home: 0, away: 0 },
      shotsOnTarget: { home: 0, away: 0 },
      cornerKicks: { home: 0, away: 0 },
      freeKicks: { home: 0, away: 0 },
      fouls: { home: 0, away: 0 },
      yellowCards: { home: 0, away: 0 },
      redCards: { home: 0, away: 0 },
    };
    match.possessionSide = 'neutral';
    match.updatedAt = Date.now();
    match.version = (match.version || 0) + 1;

    this.historySnapshots.set(id, []);
    this.persistToDisk();
    return JSON.parse(JSON.stringify(match));
  }

  public update(id: string, updated: MatchLiveSnapshot): MatchLiveSnapshot {
    updated.updatedAt = Date.now();
    updated.version = (updated.version || 0) + 1;
    this.memoryCache.set(id, JSON.parse(JSON.stringify(updated)));
    this.persistToDisk();
    return updated;
  }

  public create(snapshot: MatchLiveSnapshot): MatchLiveSnapshot {
    snapshot.updatedAt = Date.now();
    snapshot.version = 1;
    this.memoryCache.set(snapshot.id, JSON.parse(JSON.stringify(snapshot)));
    this.historySnapshots.set(snapshot.id, []);
    this.persistToDisk();
    return snapshot;
  }

  public delete(id: string): boolean {
    const existed = this.memoryCache.delete(id);
    this.historySnapshots.delete(id);
    if (existed) {
      this.persistToDisk();
    }
    return existed;
  }
}
