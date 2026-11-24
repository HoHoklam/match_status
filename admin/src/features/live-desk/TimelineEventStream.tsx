import React from 'react';
import { MatchTimelineEvent, PenaltyShootoutState } from '@shared/types';
import { Trash2, AlertCircle } from 'lucide-react';

interface TimelineEventStreamProps {
  events: MatchTimelineEvent[];
  homeTeamName: string;
  awayTeamName: string;
  onDeleteEvent: (eventId: string) => void;
  penaltyShootout?: PenaltyShootoutState;
}

export const TimelineEventStream: React.FC<TimelineEventStreamProps> = ({
  events,
  homeTeamName,
  awayTeamName,
  onDeleteEvent,
  penaltyShootout,
}) => {
  const getEventBadge = (event: MatchTimelineEvent) => {
    switch (event.type) {
      case 'goal': {
        if (event.goalType === 'penalty') {
          return { label: '点球进球 🎯', color: '#047857', bg: '#d1fae5' };
        }
        if (event.goalType === 'penalty_missed') {
          return { label: '点球未进 ❌', color: '#b91c1c', bg: '#fee2e2' };
        }
        if (event.goalType === 'own_goal') {
          return { label: '乌龙球 🥅', color: '#c2410c', bg: '#ffedd5' };
        }
        return { label: '进球 ⚽', color: '#047857', bg: '#d1fae5' };
      }
      case 'penalty_goal':
        return { label: '点球进球 🎯', color: '#047857', bg: '#d1fae5' };
      case 'penalty_missed':
        return { label: '点球未进 ❌', color: '#b91c1c', bg: '#fee2e2' };
      case 'own_goal':
        return { label: '乌龙球 🥅', color: '#c2410c', bg: '#ffedd5' };
      case 'yellow_card':
        return { label: '黄牌 🟨', color: '#b45309', bg: '#fef3c7' };
      case 'red_card':
        return { label: '红牌 🟥', color: '#b91c1c', bg: '#fee2e2' };
      case 'substitution':
        return { label: '换人 🔄', color: '#6d28d9', bg: '#ede9fe' };
      case 'period_node':
        return { label: '节点 ⏱️', color: '#0369a1', bg: '#e0f2fe' };
      default:
        return { label: event.type, color: '#334155', bg: '#f1f5f9' };
    }
  };

  const getTeamLabel = (side: 'home' | 'away' | 'neutral') => {
    if (side === 'home') return { name: homeTeamName, color: '#1A56DB' };
    if (side === 'away') return { name: awayTeamName, color: '#0EA5E9' };
    return { name: '双方', color: '#64748b' };
  };

  const formatPeriodNodeLabel = (evt: MatchTimelineEvent): string => {
    const label = evt.periodLabel || '';
    if (label.includes('HT') || label.includes('中场')) {
      return 'HT 中场休息';
    }
    if (label.includes('FT') || label.includes('结束')) {
      return 'FT 比赛结束';
    }
    return evt.periodLabel || '比赛节点';
  };

  // 过滤掉开球等非分界节点，仅保留中场休息与全场结束核心分界标签
  const filteredEvents = events.filter((evt) => {
    if (evt.type !== 'period_node') return true;
    const label = evt.periodLabel || '';
    return label.includes('HT') || label.includes('中场') || label.includes('FT') || label.includes('结束');
  });

  // 倒序展示（最新事件排在最上方）
  const displayEvents = [...filteredEvents].reverse();

  return (
    <div className="panel-card" style={{ maxHeight: '380px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>📝</span> 现场关键事件时间线流
        </h3>
        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
          共 {filteredEvents.length} 项 (仅进球/红黄牌/换人/时段)
        </span>
      </div>

      {Boolean(penaltyShootout?.enabled) && (
        <div
          style={{
            margin: '8px 0 12px',
            padding: '10px 14px',
            borderRadius: '10px',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.1rem' }}>⚽</span>
            <span style={{ fontWeight: 700, color: '#065f46', fontSize: '0.9rem' }}>
              点球大战状态：{penaltyShootout!.homeScore} - {penaltyShootout!.awayScore}
            </span>
          </div>
          <span style={{ fontSize: '0.8rem', color: '#047857', fontWeight: 600 }}>
            {penaltyShootout?.isCompleted ? '已结算完赛' : '录入中'}
          </span>
        </div>
      )}

      {displayEvents.length === 0 ? (
        <div style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', padding: '36px 0' }}>
          <AlertCircle size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
          <div>暂无现场关键事件，点击上方按钮开始记录</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {displayEvents.map((evt) => {
            const badge = getEventBadge(evt);
            const team = getTeamLabel(evt.side);

            // 贯穿节点居中展示 (中场休息 / 完赛)
            if (evt.type === 'period_node') {
              return (
                <div
                  key={evt.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.85rem',
                    color: '#334155',
                    fontWeight: 600,
                  }}
                >
                  <span>{formatPeriodNodeLabel(evt)}</span>
                </div>
              );
            }

            return (
              <div
                key={evt.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {/* 分钟点 */}
                  <span
                    style={{
                      fontWeight: 700,
                      color: '#1a56db',
                      minWidth: '32px',
                    }}
                  >
                    {evt.displayMinuteFormatted || `${evt.minute}'`}
                  </span>

                  {/* 事件类型徽标 */}
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      color: badge.color,
                      backgroundColor: badge.bg,
                    }}
                  >
                    {badge.label}
                  </span>

                  {/* 球队标签 */}
                  <span
                    style={{
                      fontSize: '0.75rem',
                      padding: '1px 6px',
                      borderRadius: '3px',
                      color: '#fff',
                      backgroundColor: team.color,
                    }}
                  >
                    {team.name}
                  </span>

                  {/* 详情内容 */}
                  <span style={{ color: '#0f172a', fontWeight: 500 }}>
                    {evt.type === 'substitution' ? (
                      <>
                        <span style={{ color: '#047857' }}>上: {evt.subInPlayerName}</span>
                        {' / '}
                        <span style={{ color: '#b91c1c' }}>下: {evt.subOutPlayerName}</span>
                      </>
                    ) : (
                      <>
                        {evt.playerName}
                        {evt.playerNumber ? ` (#${evt.playerNumber})` : ''}
                        {evt.assistPlayerName ? (
                          <span style={{ color: '#64748b', marginLeft: '6px' }}>
                            (助攻: {evt.assistPlayerName})
                          </span>
                        ) : null}
                        {evt.reason ? (
                          <span style={{ color: '#b45309', marginLeft: '6px' }}>
                            [{evt.reason}]
                          </span>
                        ) : null}
                      </>
                    )}
                  </span>

                  {evt.secondFormatted && (
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {evt.secondFormatted}
                    </span>
                  )}
                </div>

                {/* 删除按钮 */}
                <button
                  type="button"
                  onClick={() => onDeleteEvent(evt.id)}
                  title="删除此事件 (将自动扣减对应比分与统计)"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px',
                    borderRadius: '4px',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#7f1d1d33')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
