import React from 'react';
import { MatchStatistics } from '@shared/types';
import { Plus, Minus } from 'lucide-react';

interface LiveStatsPreviewBoardProps {
  stats: MatchStatistics;
  homeTeamName: string;
  awayTeamName: string;
  onUpdateStatsDelta: (
    statKey: 'shots' | 'shotsOnTarget' | 'cornerKicks' | 'freeKicks' | 'fouls' | 'yellowCards' | 'redCards',
    side: 'home' | 'away',
    delta: number,
  ) => void;
}

export const LiveStatsPreviewBoard: React.FC<LiveStatsPreviewBoardProps> = ({
  stats,
  homeTeamName,
  awayTeamName,
  onUpdateStatsDelta,
}) => {
  const statRows: Array<{
    key: 'shots' | 'shotsOnTarget' | 'cornerKicks' | 'freeKicks' | 'fouls' | 'yellowCards' | 'redCards';
    label: string;
    isFoulType?: boolean;
    isCardType?: boolean;
  }> = [
    { key: 'shots', label: '射门' },
    { key: 'shotsOnTarget', label: '射正' },
    { key: 'cornerKicks', label: '角球' },
    { key: 'freeKicks', label: '任意球' },
    { key: 'fouls', label: '犯规', isFoulType: true },
    { key: 'yellowCards', label: '黄牌', isCardType: true },
    { key: 'redCards', label: '红牌', isCardType: true },
  ];

  // 渲染卡牌方块芯片
  const renderCardChips = (count: number, isYellow: boolean, alignRight: boolean) => {
    const chips = [];
    for (let i = 0; i < count; i++) {
      chips.push(
        <span
          key={i}
          style={{
            display: 'inline-block',
            width: '9px',
            height: '13px',
            borderRadius: '2px',
            margin: '0 2px',
            backgroundColor: isYellow ? '#EAB308' : '#EF4444',
            boxShadow: `0 0 4px ${isYellow ? '#EAB30888' : '#EF444488'}`,
          }}
        />,
      );
    }
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: alignRight ? 'flex-end' : 'flex-start',
          alignItems: 'center',
          flexWrap: 'wrap',
          minHeight: '16px',
        }}
      >
        {chips.length > 0 ? chips : <span style={{ color: '#475569', fontSize: '0.75rem' }}>-</span>}
      </div>
    );
  };

  return (
    <div className="panel-card" style={{ maxHeight: '380px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>📊</span> 实时技术统计 (居中外展对照板)
        </h3>
        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>支持即时 +1 / -1 修正</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#94a3b8', padding: '0 4px' }}>
        <span>{homeTeamName} (主)</span>
        <span>{awayTeamName} (客)</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {statRows.map(({ key, label, isFoulType, isCardType }) => {
          const homeVal = stats[key].home;
          const awayVal = stats[key].away;
          const total = homeVal + awayVal;

          const isHomeAdvantage = !isFoulType && homeVal > awayVal;
          const isAwayAdvantage = !isFoulType && awayVal > homeVal;
          const isHomeMoreFouls = isFoulType && homeVal > awayVal;
          const isAwayMoreFouls = isFoulType && awayVal > homeVal;

          const homePct = total > 0 ? (homeVal / total) * 100 : 0;
          const awayPct = total > 0 ? (awayVal / total) * 100 : 0;

          return (
            <div
              key={key}
              style={{
                display: 'grid',
                gridTemplateColumns: '80px 1fr 64px 1fr 80px',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 10px',
                borderRadius: '8px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              {/* 1. 主队调控与数值 (最左端) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => onUpdateStatsDelta(key, 'home', -1)}
                  title="扣减 -1"
                  style={{
                    background: '#e2e8f0',
                    border: 'none',
                    color: '#334155',
                    borderRadius: '4px',
                    padding: '3px 5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Minus size={11} />
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateStatsDelta(key, 'home', 1)}
                  title="增加 +1"
                  style={{
                    background: '#e2e8f0',
                    border: 'none',
                    color: '#334155',
                    borderRadius: '4px',
                    padding: '3px 5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Plus size={11} />
                </button>
                <span
                  style={{
                    fontWeight: 700,
                    minWidth: '22px',
                    textAlign: 'center',
                    color: isHomeMoreFouls ? '#ef4444' : isHomeAdvantage ? '#1a56db' : '#0f172a',
                  }}
                >
                  {homeVal}
                </span>
              </div>

              {/* 2. 主队进度槽 (起始点在右侧，向左延伸生长) */}
              {isCardType ? (
                renderCardChips(homeVal, key === 'yellowCards', true)
              ) : (
                <div
                  style={{
                    height: '8px',
                    background: '#e2e8f0',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    display: 'flex',
                    justifyContent: 'flex-end', // 关键：居中外展，向左生长
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${homePct}%`,
                      borderRadius: '4px',
                      backgroundColor: isHomeMoreFouls
                        ? '#EF4444'
                        : isHomeAdvantage
                        ? '#1A56DB'
                        : '#94a3b8',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              )}

              {/* 3. 中间指标标签 */}
              <div style={{ textAlign: 'center', fontWeight: 600, color: '#475569', fontSize: '0.82rem' }}>
                {label}
              </div>

              {/* 4. 客队进度槽 (起始点在左侧，向右延伸生长) */}
              {isCardType ? (
                renderCardChips(awayVal, key === 'yellowCards', false)
              ) : (
                <div
                  style={{
                    height: '8px',
                    background: '#e2e8f0',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    display: 'flex',
                    justifyContent: 'flex-start', // 关键：居中外展，向右生长
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${awayPct}%`,
                      borderRadius: '4px',
                      backgroundColor: isAwayMoreFouls
                        ? '#EF4444'
                        : isAwayAdvantage
                        ? '#0EA5E9'
                        : '#94a3b8',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              )}

              {/* 5. 客队数值与调控 (最右端) */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                <span
                  style={{
                    fontWeight: 700,
                    minWidth: '22px',
                    textAlign: 'center',
                    color: isAwayMoreFouls ? '#ef4444' : isAwayAdvantage ? '#0284c7' : '#0f172a',
                  }}
                >
                  {awayVal}
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateStatsDelta(key, 'away', -1)}
                  title="扣减 -1"
                  style={{
                    background: '#e2e8f0',
                    border: 'none',
                    color: '#334155',
                    borderRadius: '4px',
                    padding: '3px 5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Minus size={11} />
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateStatsDelta(key, 'away', 1)}
                  title="增加 +1"
                  style={{
                    background: '#e2e8f0',
                    border: 'none',
                    color: '#334155',
                    borderRadius: '4px',
                    padding: '3px 5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Plus size={11} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
