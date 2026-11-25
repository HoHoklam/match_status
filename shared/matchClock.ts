import type { MatchClockState, MatchLiveSnapshot, PlayingHalf } from './types';

export function playingHalf(clock: MatchClockState): PlayingHalf | undefined {
  const period = clock.period === 'PAUSED' ? clock.previousPeriod : clock.period;
  return period === 'FIRST_HALF' || period === 'SECOND_HALF' ? period : undefined;
}

export function clockAtSecond(clock: MatchClockState, second: number): MatchClockState {
  const minutes = String(Math.floor(second / 60)).padStart(2, '0');
  const seconds = String(second % 60).padStart(2, '0');
  return {
    ...clock,
    currentSecond: second,
    displayMinute: Math.max(1, Math.ceil(second / 60)),
    displayTime: minutes + ':' + seconds,
  };
}

export function projectMatchClock(match: MatchLiveSnapshot, now = Date.now()): MatchLiveSnapshot {
  const { clock, stats, possessionSide } = match;
  if (!clock.isRunning || clock.anchorAt === undefined) return match;

  const elapsed = Math.max(0, Math.floor((now - clock.anchorAt) / 1000));
  if (!elapsed) return match;
  const homeSeconds = stats.possession.homeSeconds + (possessionSide === 'home' ? elapsed : 0);
  const awaySeconds = stats.possession.awaySeconds + (possessionSide === 'away' ? elapsed : 0);
  const total = homeSeconds + awaySeconds;
  const home = total ? Math.round(homeSeconds * 100 / total) : 50;
  return {
    ...match,
    clock: { ...clockAtSecond(clock, clock.currentSecond + elapsed), anchorAt: clock.anchorAt + elapsed * 1000 },
    stats: { ...stats, possession: { home, away: 100 - home, homeSeconds, awaySeconds } },
  };
}

export function stoppageBase(match: MatchLiveSnapshot, half: PlayingHalf): number {
  const halfDuration = match.halfDuration || 45;
  return half === 'FIRST_HALF' ? halfDuration : match.fullDuration || halfDuration * 2;
}

export function formatMatchMinute(match: MatchLiveSnapshot, minute: number, half = playingHalf(match.clock)): string {
  if (half) {
    const base = stoppageBase(match, half);
    if (minute > base) return base + '+' + (minute - base) + "'";
  }
  return minute + "'";
}

export function announcedStoppage(match: MatchLiveSnapshot): number | undefined {
  const half = playingHalf(match.clock);
  return half ? match.clock.announcedStoppage?.[half] : undefined;
}

export function matchStatusLabel(match: MatchLiveSnapshot): string {
  const { clock } = match;
  if (clock.period === 'FINISHED') return '已完赛';
  if (clock.regularTimeEnded) return match.penaltyShootout?.enabled ? '点球大战' : '常规时间已结束';
  if (clock.period === 'NOT_STARTED') return '未开赛';
  if (clock.period === 'HALF_TIME') return '中场休息';
  const label = playingHalf(clock) === 'SECOND_HALF' ? '下半场' : '上半场';
  return clock.isRunning ? label : label + ' · 暂停';
}
