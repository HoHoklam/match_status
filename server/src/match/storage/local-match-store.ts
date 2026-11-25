import * as fs from 'fs';
import * as path from 'path';
import { MatchLiveSnapshot } from '@shared/types';
import { projectMatchClock } from '@shared/matchClock';
import { MOCK_MATCH_LIST } from '@shared/mockMatches';

const moduleRoot = path.resolve(__dirname, '../../..');
const serverRoot = path.basename(path.dirname(moduleRoot)) === 'dist'
  ? path.resolve(moduleRoot, '../..')
  : moduleRoot;

export class LocalMatchStore {
  private readonly dataDir = path.resolve(process.env.MATCH_DATA_DIR || path.join(serverRoot, 'data'));
  private readonly dataFilePath = path.join(this.dataDir, 'matches.json');
  private readonly memoryCache = new Map<string, MatchLiveSnapshot>();
  private readonly historySnapshots = new Map<string, MatchLiveSnapshot[]>();

  constructor() {
    fs.mkdirSync(this.dataDir, { recursive: true });
    const legacyPath = path.join(serverRoot, 'dist/server/data/matches.json');
    const source = fs.existsSync(this.dataFilePath) ? this.dataFilePath
      : !process.env.MATCH_DATA_DIR && fs.existsSync(legacyPath) ? legacyPath : undefined;
    const list: MatchLiveSnapshot[] = source
      ? JSON.parse(fs.readFileSync(source, 'utf-8'))
      : structuredClone(MOCK_MATCH_LIST);

    for (const snapshot of list) {
      snapshot.clock.secondHalfStartMinute = snapshot.halfDuration || 45;
      if (snapshot.clock.isRunning && snapshot.clock.anchorAt === undefined) {
        snapshot.clock.anchorAt = Date.now();
      }
      this.memoryCache.set(snapshot.id, snapshot);
    }
    if (source !== this.dataFilePath) this.persist(this.memoryCache.values());
  }

  private persist(snapshots: Iterable<MatchLiveSnapshot>) {
    const temporaryPath = this.dataFilePath + '.tmp';
    fs.writeFileSync(temporaryPath, JSON.stringify(Array.from(snapshots), null, 2), 'utf-8');
    fs.renameSync(temporaryPath, this.dataFilePath);
  }

  private replace(id: string, snapshot?: MatchLiveSnapshot): void {
    const next = new Map(this.memoryCache);
    if (snapshot) next.set(id, structuredClone(snapshot));
    else next.delete(id);
    this.persist(next.values());
    if (snapshot) this.memoryCache.set(id, next.get(id)!);
    else this.memoryCache.delete(id);
  }

  public getAll(): MatchLiveSnapshot[] {
    return Array.from(this.memoryCache.values());
  }

  public getById(id: string): MatchLiveSnapshot | null {
    const found = this.memoryCache.get(id);
    return found ? structuredClone(found) : null;
  }

  public save(snapshot: MatchLiveSnapshot): void {
    const id = snapshot.id;
    const current = this.memoryCache.get(id)!;
    const history = this.historySnapshots.get(id) || [];
    snapshot.updatedAt = Date.now();
    snapshot.version = current.version + 1;
    this.replace(id, snapshot);
    history.push(projectMatchClock(current, snapshot.updatedAt));
    if (history.length > 30) history.shift();
    this.historySnapshots.set(id, history);
  }

  public popHistory(id: string): MatchLiveSnapshot | null {
    const history = this.historySnapshots.get(id);
    if (!history?.length) return null;

    const previous = structuredClone(history[history.length - 1]);
    const current = this.memoryCache.get(id)!;
    previous.updatedAt = Date.now();
    previous.version = current.version + 1;
    if (previous.clock.period === current.clock.period &&
        previous.clock.regularTimeEnded === current.clock.regularTimeEnded) {
      const live = projectMatchClock(current, previous.updatedAt);
      previous.clock = { ...live.clock, announcedStoppage: previous.clock.announcedStoppage };
      previous.stats.possession = live.stats.possession;
    } else if (previous.clock.isRunning) {
      previous.clock.anchorAt = previous.updatedAt;
    }
    this.replace(id, previous);
    history.pop();
    return previous;
  }

  public reset(id: string): MatchLiveSnapshot | null {
    const match = this.getById(id);
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

    this.replace(id, match);
    this.historySnapshots.delete(id);
    return match;
  }

  public update(id: string, updated: MatchLiveSnapshot): MatchLiveSnapshot {
    updated.updatedAt = Date.now();
    updated.version = (updated.version || 0) + 1;
    this.replace(id, updated);
    return updated;
  }

  public create(snapshot: MatchLiveSnapshot): MatchLiveSnapshot {
    snapshot.updatedAt = Date.now();
    snapshot.version = 1;
    this.replace(snapshot.id, snapshot);
    return snapshot;
  }

  public delete(id: string): boolean {
    if (!this.memoryCache.has(id)) return false;
    this.replace(id);
    this.historySnapshots.delete(id);
    return true;
  }
}
