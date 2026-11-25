import { clockAtSecond, formatMatchMinute, playingHalf, projectMatchClock } from '@shared/matchClock';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { LocalMatchStore } from './storage/local-match-store';
import {
  MatchLiveSnapshot,
  MatchTimelineEvent,
  MatchPeriod,
  PossessionSide,
  CreateMatchDto,
} from '@shared/types';
import { SubmitLiveActionDto } from './dto/live-action.dto';
import { AnnounceStoppageDto, ChangeClockPeriodDto, SwitchPossessionDto } from './dto/match-period.dto';
import { UpdateStatsDeltaDto } from './dto/update-stats.dto';

function formatKickoffTime(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

const clockTransitions: Record<MatchPeriod, MatchPeriod[]> = {
  NOT_STARTED: ['FIRST_HALF'],
  FIRST_HALF: ['PAUSED', 'HALF_TIME', 'FINISHED'],
  HALF_TIME: ['SECOND_HALF', 'FINISHED'],
  SECOND_HALF: ['PAUSED', 'FINISHED'],
  PAUSED: ['FIRST_HALF', 'SECOND_HALF', 'HALF_TIME', 'FINISHED'],
  FINISHED: [],
};

@Injectable()
export class MatchLiveService {
  private readonly store = new LocalMatchStore();

  public getMatches(): MatchLiveSnapshot[] {
    return this.store.getAll().map(match => projectMatchClock(match));
  }

  public createMatch(dto: CreateMatchDto): MatchLiveSnapshot {
    const id = `match-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const halfDuration = dto.halfDuration || (dto.matchType === '8_aside' ? 40 : 45);
    const fullDuration = dto.fullDuration || (halfDuration * 2);

    const newSnapshot: MatchLiveSnapshot = {
      id,
      title: dto.title,
      competitionName: dto.competitionName || dto.title,
      venue: dto.venue,
      matchType: dto.matchType,
      halfDuration,
      fullDuration,
      kickoffTime: null,
      homeTeam: {
        id: `team-home-${Date.now()}`,
        name: dto.homeTeam.name,
        shortName: dto.homeTeam.shortName || dto.homeTeam.name,
        college: dto.homeTeam.college,
        primaryColor: dto.homeTeam.primaryColor || '#1a56db',
        starters: dto.homeTeam.starters || [],
        substitutes: dto.homeTeam.substitutes || [],
      },
      awayTeam: {
        id: `team-away-${Date.now()}`,
        name: dto.awayTeam.name,
        shortName: dto.awayTeam.shortName || dto.awayTeam.name,
        college: dto.awayTeam.college,
        primaryColor: dto.awayTeam.primaryColor || '#0ea5e9',
        starters: dto.awayTeam.starters || [],
        substitutes: dto.awayTeam.substitutes || [],
      },
      score: {
        home: 0,
        away: 0,
      },
      clock: {
        period: 'NOT_STARTED',
        isRunning: false,
        currentSecond: 0,
        displayMinute: 0,
        displayTime: '00:00',
        halfTimeMinute: null,
        secondHalfStartMinute: halfDuration,
        lastStartedAt: null,
      },
      possessionSide: 'neutral',
      stats: {
        possession: { home: 50, away: 50, homeSeconds: 0, awaySeconds: 0 },
        shots: { home: 0, away: 0 },
        shotsOnTarget: { home: 0, away: 0 },
        cornerKicks: { home: 0, away: 0 },
        freeKicks: { home: 0, away: 0 },
        fouls: { home: 0, away: 0 },
        yellowCards: { home: 0, away: 0 },
        redCards: { home: 0, away: 0 },
      },
      timeline: [],
      updatedAt: Date.now(),
      version: 1,
    };

    return this.store.create(newSnapshot);
  }

  public updateMatch(matchId: string, dto: CreateMatchDto): MatchLiveSnapshot {
    const match = this.getLiveSnapshot(matchId);
    if (match.clock.period !== 'NOT_STARTED') {
      throw new Error('比赛已经开赛，无法修改主客队与名单信息！若需修改请先重置比赛。');
    }

    const halfDuration = dto.halfDuration || (dto.matchType === '8_aside' ? 40 : 45);
    const fullDuration = dto.fullDuration || (halfDuration * 2);

    match.title = dto.title;
    match.competitionName = dto.competitionName || dto.title;
    match.venue = dto.venue;
    match.matchType = dto.matchType;
    match.halfDuration = halfDuration;
    match.fullDuration = fullDuration;
    match.clock.secondHalfStartMinute = halfDuration;

    match.homeTeam.name = dto.homeTeam.name;
    match.homeTeam.shortName = dto.homeTeam.shortName || dto.homeTeam.name;
    match.homeTeam.college = dto.homeTeam.college;
    match.homeTeam.primaryColor = dto.homeTeam.primaryColor;
    match.homeTeam.starters = dto.homeTeam.starters || [];
    match.homeTeam.substitutes = dto.homeTeam.substitutes || [];

    match.awayTeam.name = dto.awayTeam.name;
    match.awayTeam.shortName = dto.awayTeam.shortName || dto.awayTeam.name;
    match.awayTeam.college = dto.awayTeam.college;
    match.awayTeam.primaryColor = dto.awayTeam.primaryColor;
    match.awayTeam.starters = dto.awayTeam.starters || [];
    match.awayTeam.substitutes = dto.awayTeam.substitutes || [];

    return this.store.update(matchId, match);
  }

  public deleteMatch(matchId: string): { success: boolean; id: string } {
    const success = this.store.delete(matchId);
    if (!success) {
      throw new NotFoundException(`比赛 ${matchId} 不存在或已被删除`);
    }
    return { success: true, id: matchId };
  }

  public getLiveSnapshot(matchId: string): MatchLiveSnapshot {
    const match = this.store.getById(matchId);
    if (!match) {
      throw new NotFoundException(`比赛 ${matchId} 不存在`);
    }
    return projectMatchClock(match);
  }

  private getEditableMatch(matchId: string): MatchLiveSnapshot {
    const match = this.getLiveSnapshot(matchId);
    if (match.clock.period === 'FINISHED') {
      throw new ConflictException('比赛已完赛，请先撤销完赛再修改赛况');
    }
    return match;
  }

  public updateClock(matchId: string, dto: ChangeClockPeriodDto): MatchLiveSnapshot {
    const match = this.getLiveSnapshot(matchId);
    const { clock } = match;
    const next = dto.period;
    const half = playingHalf(clock);
    if (dto.expectedVersion !== undefined && dto.expectedVersion !== match.version) {
      throw new ConflictException('比赛已更新，请确认当前状态后重试');
    }

    const changingSettlement = clock.period === 'PAUSED' && next === 'PAUSED'
      && half === 'SECOND_HALF' && dto.regularTimeEnded !== undefined
      && dto.regularTimeEnded !== Boolean(clock.regularTimeEnded);
    if ((!clockTransitions[clock.period].includes(next) && !changingSettlement)
      || (clock.period === 'PAUSED' && next === 'HALF_TIME' && half !== 'FIRST_HALF')
      || (clock.period === 'PAUSED' && (next === 'FIRST_HALF' || next === 'SECOND_HALF') && next !== half)) {
      throw new ConflictException('当前阶段不能执行这个时钟操作');
    }
    if (dto.regularTimeEnded && (next !== 'PAUSED' || half !== 'SECOND_HALF')) {
      throw new BadRequestException('只能在下半场确认常规时间结束');
    }

    const now = Date.now();
    const isRunning = next === 'FIRST_HALF' || next === 'SECOND_HALF';
    const halfDuration = match.halfDuration || 45;
    const second = clock.period === 'HALF_TIME' && next === 'SECOND_HALF'
      ? halfDuration * 60
      : dto.currentSecond ?? dto.resetSecond ?? clock.currentSecond;

    match.clock = {
      ...clockAtSecond(clock, second),
      period: next,
      isRunning,
      anchorAt: isRunning ? now : undefined,
      lastStartedAt: isRunning ? now : null,
      previousPeriod: next === 'PAUSED' ? half : null,
      regularTimeEnded: next === 'PAUSED' ? dto.regularTimeEnded : undefined,
    };

    if (clock.period === 'NOT_STARTED') match.kickoffTime = match.kickoffTime || formatKickoffTime();
    if (next === 'HALF_TIME') {
      match.clock.halfTimeMinute = match.clock.displayMinute;
      match.clock.secondHalfStartMinute = halfDuration;
      this.insertPeriodNode(match, 'HT 中场休息', match.clock.displayMinute, next, half);
    } else if (next === 'FINISHED') {
      this.insertPeriodNode(match, 'FT 比赛结束', match.clock.displayMinute, next, half);
    }

    if (dto.penaltyShootout === null) delete match.penaltyShootout;
    else if (dto.penaltyShootout !== undefined) match.penaltyShootout = dto.penaltyShootout;

    this.store.save(match);
    return match;
  }

  public announceStoppage(matchId: string, dto: AnnounceStoppageDto): MatchLiveSnapshot {
    const match = this.getLiveSnapshot(matchId);
    if (playingHalf(match.clock) !== dto.half || match.clock.regularTimeEnded) {
      throw new ConflictException('只能设置当前半场的补时');
    }
    match.clock.announcedStoppage = { ...match.clock.announcedStoppage, [dto.half]: dto.minutes };
    this.store.save(match);
    return match;
  }

  public updatePenaltyShootout(matchId: string, dto: any): MatchLiveSnapshot {
    const match = this.getEditableMatch(matchId);
    match.penaltyShootout = {
      enabled: dto.enabled !== undefined ? dto.enabled : true,
      homeScore: dto.homeScore ?? 0,
      awayScore: dto.awayScore ?? 0,
      winnerSide: dto.winnerSide ?? null,
      roundsCount: dto.roundsCount ?? 5,
      homeKicks: dto.homeKicks ?? [],
      awayKicks: dto.awayKicks ?? [],
      isCompleted: dto.isCompleted ?? false,
      firstKickSide: dto.firstKickSide ?? null,
    };
    this.store.save(match);
    return match;
  }

  public switchPossession(matchId: string, dto: SwitchPossessionDto): MatchLiveSnapshot {
    const match = this.getEditableMatch(matchId);
    match.possessionSide = dto.side;
    if (dto.homeSeconds !== undefined) {
      match.stats.possession.homeSeconds = Math.max(0, dto.homeSeconds);
    }
    if (dto.awaySeconds !== undefined) {
      match.stats.possession.awaySeconds = Math.max(0, dto.awaySeconds);
    }
    if (dto.currentSecond !== undefined) {
      match.clock.currentSecond = Math.max(match.clock.currentSecond, dto.currentSecond);
      match.clock.displayMinute = dto.displayMinute ?? Math.max(1, Math.ceil(match.clock.currentSecond / 60));
    }
    if (dto.displayTime !== undefined) {
      match.clock.displayTime = dto.displayTime;
    }
    this.recalculatePossession(match);
    this.store.save(match);
    return match;
  }

  public recordAction(matchId: string, dto: SubmitLiveActionDto): MatchLiveSnapshot {
    const match = this.getEditableMatch(matchId);
    if (dto.expectedVersion !== undefined && dto.expectedVersion !== match.version) {
      throw new ConflictException('比赛已更新，请核对记录后再提交');
    }
    const minute = dto.minute ?? match.clock.displayMinute ?? Math.max(1, Math.ceil(match.clock.currentSecond / 60));
    const side = dto.side;
    const secondFormatted = dto.secondFormatted || match.clock.displayTime || '00:00';
    const displayMinuteFormatted = formatMatchMinute(match, minute);
    const currentPeriod: MatchPeriod =
      match.clock.period === 'PAUSED'
        ? match.clock.previousPeriod || 'FIRST_HALF'
        : match.clock.period;

    switch (dto.type) {
      case 'GOAL': {
        const gType = dto.goalType || 'regular';
        if (gType === 'own_goal') {
          // 乌龙球：对方比分 +1，双方射门数不变
          const opponentSide = side === 'home' ? 'away' : 'home';
          match.score[opponentSide] += 1;
        } else if (gType === 'penalty_missed') {
          // 点球未进：比分不变，己方射门+1, 射正+1
          match.stats.shots[side] += 1;
          match.stats.shotsOnTarget[side] += 1;
        } else {
          // 普通进球 (regular) 或 点球罚进 (penalty)：己方比分+1，射门+1，射正+1
          match.score[side] += 1;
          match.stats.shots[side] += 1;
          match.stats.shotsOnTarget[side] += 1;
        }

        // 写入时间线 (统一为 type: 'goal', 附带 goalType)
        const event: MatchTimelineEvent = {
          id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          matchId,
          type: 'goal',
          goalType: gType,
          side,
          minute,
          period: currentPeriod,
          secondFormatted,
          displayMinuteFormatted,
          playerName: dto.playerName || (side === 'home' ? '主队球员' : '客队球员'),
          playerNumber: dto.playerNumber,
          assistPlayerName: dto.assistPlayerName,
          createdAt: Date.now(),
        };
        match.timeline.push(event);
        break;
      }

      case 'PENALTY': {
        const isScored = dto.penaltyScored !== false;
        // 己方射门与射正均 +1
        match.stats.shots[side] += 1;
        match.stats.shotsOnTarget[side] += 1;
        if (isScored) {
          match.score[side] += 1;
        }

        const event: MatchTimelineEvent = {
          id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          matchId,
          type: 'goal',
          goalType: isScored ? 'penalty' : 'penalty_missed',
          side,
          minute,
          period: currentPeriod,
          secondFormatted,
          displayMinuteFormatted,
          playerName: dto.playerName || (side === 'home' ? '主队球员' : '客队球员'),
          playerNumber: dto.playerNumber,
          createdAt: Date.now(),
        };
        match.timeline.push(event);
        break;
      }

      case 'OWN_GOAL': {
        // 对方比分 +1
        const opponentSide = side === 'home' ? 'away' : 'home';
        match.score[opponentSide] += 1;

        // 乌龙球时间线事件记录在犯错方 side，展示犯错球员
        const event: MatchTimelineEvent = {
          id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          matchId,
          type: 'goal',
          goalType: 'own_goal',
          side,
          minute,
          period: currentPeriod,
          secondFormatted,
          displayMinuteFormatted,
          playerName: dto.playerName || (side === 'home' ? '主队球员' : '客队球员'),
          playerNumber: dto.playerNumber,
          createdAt: Date.now(),
        };
        match.timeline.push(event);
        break;
      }

      case 'YELLOW_CARD': {
        match.stats.yellowCards[side] += 1;
        match.stats.fouls[side] += 1;

        const event: MatchTimelineEvent = {
          id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          matchId,
          type: 'yellow_card',
          side,
          minute,
          period: currentPeriod,
          secondFormatted,
          displayMinuteFormatted,
          playerName: dto.playerName || (side === 'home' ? '主队球员' : '客队球员'),
          playerNumber: dto.playerNumber,
          reason: dto.reason,
          createdAt: Date.now(),
        };
        match.timeline.push(event);
        break;
      }

      case 'RED_CARD': {
        match.stats.redCards[side] += 1;
        match.stats.fouls[side] += 1;

        const event: MatchTimelineEvent = {
          id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          matchId,
          type: 'red_card',
          side,
          minute,
          period: currentPeriod,
          secondFormatted,
          displayMinuteFormatted,
          playerName: dto.playerName || (side === 'home' ? '主队球员' : '客队球员'),
          playerNumber: dto.playerNumber,
          reason: dto.reason,
          createdAt: Date.now(),
        };
        match.timeline.push(event);
        break;
      }

      case 'SUBSTITUTION': {
        const event: MatchTimelineEvent = {
          id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          matchId,
          type: 'substitution',
          side,
          minute,
          period: currentPeriod,
          secondFormatted,
          displayMinuteFormatted,
          subInPlayerName: dto.subInPlayerName || '替补球员',
          subOutPlayerName: dto.subOutPlayerName || '离场球员',
          createdAt: Date.now(),
        };
        match.timeline.push(event);
        break;
      }

      // 纯统计动作（不写入时间线）
      case 'SHOT': {
        match.stats.shots[side] += 1;
        if (dto.isShotOnTarget) {
          match.stats.shotsOnTarget[side] += 1;
        }
        break;
      }

      case 'SHOT_ON_TARGET': {
        match.stats.shots[side] += 1;
        match.stats.shotsOnTarget[side] += 1;
        break;
      }

      case 'CORNER': {
        match.stats.cornerKicks[side] += 1;
        break;
      }

      case 'FREE_KICK': {
        match.stats.freeKicks[side] += 1;
        break;
      }

      case 'FOUL': {
        match.stats.fouls[side] += 1;
        break;
      }
    }

    this.store.save(match);
    return match;
  }

  public updateStatsDelta(matchId: string, dto: UpdateStatsDeltaDto): MatchLiveSnapshot {
    const match = this.getEditableMatch(matchId);
    const { statKey, side, delta } = dto;
    const current = match.stats[statKey][side];
    match.stats[statKey][side] = Math.max(0, current + delta);
    this.store.save(match);
    return match;
  }

  public deleteTimelineEvent(matchId: string, eventId: string): MatchLiveSnapshot {
    const match = this.getEditableMatch(matchId);
    const eventIndex = match.timeline.findIndex((e) => e.id === eventId);
    if (eventIndex >= 0) {
      const evt = match.timeline[eventIndex];
      // 如果删除的是进球/点球/乌龙球，扣减比分和射门统计
      if (evt.type === 'goal' && (evt.side === 'home' || evt.side === 'away')) {
        if (evt.goalType === 'own_goal') {
          const opponentSide = evt.side === 'home' ? 'away' : 'home';
          match.score[opponentSide] = Math.max(0, match.score[opponentSide] - 1);
        } else if (evt.goalType === 'penalty_missed') {
          match.stats.shots[evt.side] = Math.max(0, match.stats.shots[evt.side] - 1);
          match.stats.shotsOnTarget[evt.side] = Math.max(0, match.stats.shotsOnTarget[evt.side] - 1);
        } else {
          // 普通进球或点球进球
          match.score[evt.side] = Math.max(0, match.score[evt.side] - 1);
          match.stats.shots[evt.side] = Math.max(0, match.stats.shots[evt.side] - 1);
          match.stats.shotsOnTarget[evt.side] = Math.max(0, match.stats.shotsOnTarget[evt.side] - 1);
        }
      } else if (evt.type === 'penalty_goal' && (evt.side === 'home' || evt.side === 'away')) {
        match.score[evt.side] = Math.max(0, match.score[evt.side] - 1);
        match.stats.shots[evt.side] = Math.max(0, match.stats.shots[evt.side] - 1);
        match.stats.shotsOnTarget[evt.side] = Math.max(0, match.stats.shotsOnTarget[evt.side] - 1);
      } else if (evt.type === 'penalty_missed' && (evt.side === 'home' || evt.side === 'away')) {
        match.stats.shots[evt.side] = Math.max(0, match.stats.shots[evt.side] - 1);
        match.stats.shotsOnTarget[evt.side] = Math.max(0, match.stats.shotsOnTarget[evt.side] - 1);
      } else if (evt.type === 'own_goal' && (evt.side === 'home' || evt.side === 'away')) {
        const opponentSide = evt.side === 'home' ? 'away' : 'home';
        match.score[opponentSide] = Math.max(0, match.score[opponentSide] - 1);
      } else if (evt.type === 'yellow_card' && (evt.side === 'home' || evt.side === 'away')) {
        match.stats.yellowCards[evt.side] = Math.max(0, match.stats.yellowCards[evt.side] - 1);
        match.stats.fouls[evt.side] = Math.max(0, match.stats.fouls[evt.side] - 1);
      } else if (evt.type === 'red_card' && (evt.side === 'home' || evt.side === 'away')) {
        match.stats.redCards[evt.side] = Math.max(0, match.stats.redCards[evt.side] - 1);
        match.stats.fouls[evt.side] = Math.max(0, match.stats.fouls[evt.side] - 1);
      }
      match.timeline.splice(eventIndex, 1);
      this.store.save(match);
    }
    return match;
  }

  public undo(matchId: string): MatchLiveSnapshot {
    const popped = this.store.popHistory(matchId);
    if (!popped) {
      return this.getLiveSnapshot(matchId);
    }
    return popped;
  }

  public reset(matchId: string): MatchLiveSnapshot {
    const res = this.store.reset(matchId);
    if (!res) {
      throw new NotFoundException(`比赛 ${matchId} 不存在`);
    }
    return res;
  }

  private insertPeriodNode(match: MatchLiveSnapshot, label: string, minute: number, period: MatchPeriod, half: ReturnType<typeof playingHalf>) {
    const node: MatchTimelineEvent = {
      id: `node-${Date.now()}`,
      matchId: match.id,
      type: 'period_node',
      side: 'neutral',
      minute,
      period,
      periodLabel: label,
      displayMinuteFormatted: formatMatchMinute(match, minute, half),
      createdAt: Date.now(),
    };
    match.timeline.push(node);
  }

  private recalculatePossession(match: MatchLiveSnapshot) {
    const total = match.stats.possession.homeSeconds + match.stats.possession.awaySeconds;
    if (total > 0) {
      const homePct = Math.round((match.stats.possession.homeSeconds / total) * 100);
      match.stats.possession.home = homePct;
      match.stats.possession.away = 100 - homePct;
    } else {
      match.stats.possession.home = 50;
      match.stats.possession.away = 50;
    }
  }
}
