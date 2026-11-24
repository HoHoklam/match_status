import React from 'react';
import {
  MatchTimelineEvent,
  MatchTeamInfo,
  PenaltyShootoutState,
  PenaltyKickRecord,
  MatchClockState,
} from '@shared/types';
import { resolveColorHex, isLightColor } from '../../utils/colorHelper';
import { Clock, CheckSquare, XCircle, ArrowRightLeft } from 'lucide-react';

interface MatchLiveTimelineProps {
  events: MatchTimelineEvent[];
  homeTeam?: MatchTeamInfo;
  awayTeam?: MatchTeamInfo;
  homeTeamName?: string;
  awayTeamName?: string;
  penaltyShootout?: PenaltyShootoutState;
  clock?: MatchClockState;
  halfDuration?: number;
}

export const MatchLiveTimeline: React.FC<MatchLiveTimelineProps> = ({
  events,
  homeTeam,
  awayTeam,
  homeTeamName,
  awayTeamName,
  penaltyShootout,
  clock,
  halfDuration = 45,
}) => {
  const resolvedHomeTeam: MatchTeamInfo = homeTeam || {
    id: 'home',
    name: homeTeamName || '主队',
    primaryColor: '#1A56DB',
  };
  const resolvedAwayTeam: MatchTeamInfo = awayTeam || {
    id: 'away',
    name: awayTeamName || '客队',
    primaryColor: '#0EA5E9',
  };

  // 过滤常规事件（排除自动插入的 period_node 如中场/完赛，改由独立视觉节点呈现）
  const regularEvents = events.filter((evt) => evt.type !== 'period_node');

  // 查找中场休息节点时间戳，用于高精度划分事件归属
  const htNode = events.find(
    (e) =>
      e.type === 'period_node' &&
      (e.period === 'HALF_TIME' ||
        e.periodLabel?.includes('HT') ||
        e.periodLabel?.includes('中场'))
  );
  const htTimestamp = htNode?.createdAt || 0;

  // 中场与完赛状态与时间计算
  const htMinute = clock?.halfTimeMinute || halfDuration || 45;
  const hasReachedHalfTime = Boolean(
    clock?.period === 'HALF_TIME' ||
      clock?.period === 'SECOND_HALF' ||
      clock?.period === 'FINISHED' ||
      (clock?.period === 'PAUSED' &&
        (clock?.previousPeriod === 'SECOND_HALF' || Boolean(clock?.halfTimeMinute))) ||
      Boolean(clock?.halfTimeMinute) ||
      Boolean(htNode)
  );

  const isFinished = Boolean(
    clock?.period === 'FINISHED' ||
      events.some(
        (e) =>
          e.type === 'period_node' &&
          (e.period === 'FINISHED' ||
            e.periodLabel?.includes('FT') ||
            e.periodLabel?.includes('结束'))
      )
  );

  // 严格基于比赛阶段 (period) 与中场时间戳划分上半场与下半场事件
  const isFirstHalfEvent = (evt: MatchTimelineEvent): boolean => {
    if (evt.period === 'FIRST_HALF') return true;
    if (evt.period === 'SECOND_HALF') return false;
    if (htTimestamp > 0) {
      return evt.createdAt < htTimestamp;
    }
    return evt.minute <= htMinute;
  };

  // 上半场与下半场事件分别依序排布，杜绝同分钟跨半场混淆
  const firstHalfEvents = regularEvents
    .filter(isFirstHalfEvent)
    .sort((a, b) => (a.minute !== b.minute ? a.minute - b.minute : a.createdAt - b.createdAt));

  const secondHalfEvents = regularEvents
    .filter((evt) => !isFirstHalfEvent(evt))
    .sort((a, b) => (a.minute !== b.minute ? a.minute - b.minute : a.createdAt - b.createdAt));

  // 格式化轴线中央分钟标签（统一带单引号，如 20+1', 21', 40+2'）
  const formatMinuteBadge = (evt: MatchTimelineEvent, isFirstHalfEvt: boolean): string => {
    if (evt.displayMinuteFormatted) {
      const trimmed = evt.displayMinuteFormatted.trim();
      return trimmed.endsWith("'") ? trimmed : `${trimmed}'`;
    }
    if (isFirstHalfEvt && evt.minute > htMinute) {
      const extra = evt.minute - htMinute;
      return `${htMinute}+${extra}'`;
    }
    const fullMin = (halfDuration || htMinute) * 2;
    if (!isFirstHalfEvt && evt.minute > fullMin) {
      const extra = evt.minute - fullMin;
      return `${fullMin}+${extra}'`;
    }
    return `${evt.minute}'`;
  };

  // 将点球大战主客队轮次编排为交替顺序（仅统计已明确主罚的有效轮次）
  const shootoutRounds = React.useMemo(() => {
    if (!penaltyShootout || !penaltyShootout.enabled) return [];

    const homeKicks = (penaltyShootout.homeKicks || []).filter(
      (k) =>
        Boolean(k.playerName) &&
        (k.isAttempted === true ||
          k.status !== undefined ||
          (k.isAttempted === undefined && k.scored !== undefined))
    );
    const awayKicks = (penaltyShootout.awayKicks || []).filter(
      (k) =>
        Boolean(k.playerName) &&
        (k.isAttempted === true ||
          k.status !== undefined ||
          (k.isAttempted === undefined && k.scored !== undefined))
    );

    const maxR = Math.max(
      penaltyShootout.roundsCount || 5,
      ...homeKicks.map((k) => k.round),
      ...awayKicks.map((k) => k.round)
    );

    const list: {
      round: number;
      side: 'home' | 'away';
      kick: PenaltyKickRecord;
    }[] = [];

    // 根据先罚球队 (firstKickSide，默认为主队先罚) 依序排布每轮主罚节点
    const firstSide: 'home' | 'away' = penaltyShootout.firstKickSide === 'away' ? 'away' : 'home';
    const secondSide: 'home' | 'away' = firstSide === 'home' ? 'away' : 'home';

    for (let r = 1; r <= maxR; r++) {
      const firstKick = (firstSide === 'home' ? homeKicks : awayKicks).find((k) => k.round === r);
      if (firstKick) {
        list.push({ round: r, side: firstSide, kick: firstKick });
      }
      const secondKick = (secondSide === 'home' ? homeKicks : awayKicks).find((k) => k.round === r);
      if (secondKick) {
        list.push({ round: r, side: secondSide, kick: secondKick });
      }
    }

    return list;
  }, [penaltyShootout]);

  // 获取点球大战是否展示：
  // 必须操作台点击了点球大战 (enabled === true)，且至少已记录1轮实际主罚，或已有比分，或点球大战已完赛
  const hasShootout = Boolean(
    penaltyShootout?.enabled &&
      (shootoutRounds.length > 0 ||
        penaltyShootout.homeScore > 0 ||
        penaltyShootout.awayScore > 0 ||
        penaltyShootout.isCompleted)
  );

  // 渲染事件图标
  const renderEventIcon = (evt: MatchTimelineEvent) => {
    switch (evt.type) {
      case 'goal': {
        if (evt.goalType === 'penalty') return <span style={{ color: '#10b981' }}>🎯</span>;
        if (evt.goalType === 'penalty_missed') return <span>❌</span>;
        if (evt.goalType === 'own_goal') return <span>🥅</span>;
        return <span>⚽</span>;
      }
      case 'penalty_goal':
        return <span style={{ color: '#10b981' }}>🎯</span>;
      case 'penalty_missed':
        return <span>❌</span>;
      case 'own_goal':
        return <span>🥅</span>;
      case 'yellow_card':
        return <span>🟨</span>;
      case 'red_card':
        return <span>🟥</span>;
      case 'substitution':
        return <span style={{ color: '#2563eb' }}>🔄</span>;
      default:
        return <span>⏱️</span>;
    }
  };

  // 渲染事件文字详情 (对齐图2、3及规范)
  const renderEventText = (evt: MatchTimelineEvent) => {
    switch (evt.type) {
      case 'goal': {
        if (evt.goalType === 'penalty') {
          return (
            <span>
              {evt.playerName} {evt.playerNumber ? `(${evt.playerNumber}号)` : ''} 点球进球
            </span>
          );
        }
        if (evt.goalType === 'penalty_missed') {
          return (
            <span>
              {evt.playerName} {evt.playerNumber ? `(${evt.playerNumber}号)` : ''} 点球未进
            </span>
          );
        }
        if (evt.goalType === 'own_goal') {
          return (
            <span>
              {evt.playerName} {evt.playerNumber ? `(${evt.playerNumber}号)` : ''} 乌龙球
            </span>
          );
        }
        return (
          <span>
            {evt.playerName} {evt.playerNumber ? `(${evt.playerNumber}号)` : ''} 进球
          </span>
        );
      }
      case 'penalty_goal':
        return (
          <span>
            {evt.playerName} {evt.playerNumber ? `(${evt.playerNumber}号)` : ''} 点球进球
          </span>
        );
      case 'penalty_missed':
        return (
          <span>
            {evt.playerName} {evt.playerNumber ? `(${evt.playerNumber}号)` : ''} 点球未进
          </span>
        );
      case 'own_goal':
        return (
          <span>
            {evt.playerName} {evt.playerNumber ? `(${evt.playerNumber}号)` : ''} 乌龙球
          </span>
        );
      case 'yellow_card':
        return (
          <span>
            {evt.playerName} {evt.playerNumber ? `(${evt.playerNumber}号)` : ''} 黄牌
          </span>
        );
      case 'red_card':
        return (
          <span>
            {evt.playerName} {evt.playerNumber ? `(${evt.playerNumber}号)` : ''} 红牌罚下
          </span>
        );
      case 'substitution':
        return (
          <span>
            换上 {evt.subInPlayerName || '球员'}，换下 {evt.subOutPlayerName || '球员'}
          </span>
        );
      default:
        return <span>{evt.playerName || '比赛事件'}</span>;
    }
  };

  // 渲染球队迷你徽标
  const renderTeamMiniBadge = (team: MatchTeamInfo) => {
    if (team.logo) {
      return (
        <img
          src={team.logo}
          alt={team.name}
          style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'cover' }}
        />
      );
    }
    return (
      <span
        style={{
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          backgroundColor: resolveColorHex(team.primaryColor),
          display: 'inline-block',
        }}
      />
    );
  };

  // 单条事件行渲染
  const renderEventRow = (evt: MatchTimelineEvent, isFirstHalfEvt: boolean) => {
    const isHome = evt.side === 'home';
    const team = isHome ? resolvedHomeTeam : resolvedAwayTeam;

    return (
      <div key={evt.id} className="timeline-event-row">
        {/* 左侧：主队事件卡片 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
          {isHome && (
            <div className="timeline-card home-card">
              <div className="timeline-card-header">
                {renderTeamMiniBadge(team)}
                <span>{team.name}</span>
              </div>
              <div className="timeline-card-action">{renderEventText(evt)}</div>
            </div>
          )}
        </div>

        {/* 中间：分钟与图标 (带单引号与补时格式，如 20+1', 21', 40+2') */}
        <div className="timeline-center-mark">
          <span className="timeline-center-minute">
            {formatMinuteBadge(evt, isFirstHalfEvt)}
          </span>
          <div className="timeline-center-icon-badge">{renderEventIcon(evt)}</div>
        </div>

        {/* 右侧：客队事件卡片 (带左绿修饰条) */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
          {!isHome && (
            <div className="timeline-card away-card">
              <div className="timeline-card-header">
                {renderTeamMiniBadge(team)}
                <span>{team.name}</span>
              </div>
              <div className="timeline-card-action">{renderEventText(evt)}</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="timeline-vertical-stream">
      {/* 顶部开赛节点 (对齐图4) */}
      <div className="timeline-start-node">
        <span className="timeline-start-text">比赛开始</span>
        <div className="timeline-start-icon-circle">
          <Clock size={14} />
        </div>
      </div>

      {/* 上半场关键事件 */}
      {firstHalfEvents.map((evt) => renderEventRow(evt, true))}

      {/* 中场 HT 节点：当且仅当达到设定中场时间后展示 */}
      {hasReachedHalfTime && (
        <div className="timeline-ht-node">
          <div className="timeline-ht-badge">HT {htMinute}' 中场休息</div>
        </div>
      )}

      {/* 下半场关键事件 */}
      {secondHalfEvents.map((evt) => renderEventRow(evt, false))}

      {/* 点球大战独立区域 (对齐图2) */}
      {hasShootout && (
        <>
          {/* 点球大战标题 */}
          <div className="shootout-section-header">
            <span className="shootout-section-title">
              点球大战 {penaltyShootout!.homeScore}-{penaltyShootout!.awayScore}
            </span>
          </div>

          {/* 点球轮次列表 */}
          {shootoutRounds.map((item, idx) => {
            const isHome = item.side === 'home';
            const { kick } = item;
            const scoreText = kick.scoreAfterKick || '';

            return (
              <div key={`shootout-row-${idx}`} className="timeline-event-row">
                {/* 主队罚球卡片 (居左: (0-1) 洪奕壕 ❌) */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                  {isHome && (
                    <div className="shootout-kick-card home">
                      <span>({scoreText})</span>
                      <span>{kick.playerName}</span>
                      <span>{kick.scored ? '⚽' : '❌'}</span>
                    </div>
                  )}
                </div>

                {/* 中央绿色圆点节点：“点” */}
                <div className="timeline-center-mark">
                  <div className="shootout-green-dot-node">点</div>
                </div>

                {/* 客队罚球卡片 (居右: ⚽ 蔡卓钦 (0-1)) */}
                <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
                  {!isHome && (
                    <div className="shootout-kick-card away">
                      <span>{kick.scored ? '⚽' : '❌'}</span>
                      <span>{kick.playerName}</span>
                      <span>({scoreText})</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* 底部比赛结束节点：仅在操作员操作比赛结束 (FINISHED) 后展示 */}
      {isFinished && (
        <div className="timeline-finish-node">
          <div className="timeline-finish-flag">🏁</div>
          <span className="timeline-finish-text">比赛结束</span>
        </div>
      )}

      {/* 底部图标图例栏 (对齐图2) */}
      <div className="timeline-legend-row">
        <div className="timeline-legend-item">
          <span>⚽</span>
          <span>进球</span>
        </div>
        <div className="timeline-legend-item">
          <span style={{ color: '#10b981' }}>🎯</span>
          <span>点球</span>
        </div>
        <div className="timeline-legend-item">
          <span>❌</span>
          <span>点球未进</span>
        </div>
        <div className="timeline-legend-item">
          <span>🥅</span>
          <span>乌龙球</span>
        </div>
        <div className="timeline-legend-item">
          <span>🦄</span>
          <span>助攻</span>
        </div>
      </div>
    </div>
  );
};
