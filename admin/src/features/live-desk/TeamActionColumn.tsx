import React, { useState } from 'react';
import { MatchTeamInfo, LiveActionType, PossessionSide, GoalType } from '@shared/types';
import { Zap, ShieldAlert, Flag, Award, RefreshCw, Crosshair } from 'lucide-react';

interface TeamActionColumnProps {
  side: 'home' | 'away';
  team: MatchTeamInfo;
  isPossessing: boolean;
  busy: boolean;
  onSwitchPossession: (side: PossessionSide) => void;
  onOpenPlayerModal: (actionType: LiveActionType, side: 'home' | 'away', goalType?: GoalType) => void;
  onQuickRecordAction: (actionType: LiveActionType, side: 'home' | 'away', isShotOnTarget?: boolean) => void;
}

export const TeamActionColumn: React.FC<TeamActionColumnProps> = ({
  side,
  team,
  isPossessing,
  busy,
  onSwitchPossession,
  onOpenPlayerModal,
  onQuickRecordAction,
}) => {
  const [clickedAction, setClickedAction] = useState<string | null>(null);

  const handleActionClick = (actionName: string, fn: () => void) => {
    setClickedAction(actionName);
    fn();
    setTimeout(() => {
      setClickedAction(null);
    }, 400);
  };

  const isHome = side === 'home';
  const themeColor = team.primaryColor || (isHome ? '#1A56DB' : '#0EA5E9');

  return (
    <div
      className="team-action-card"
      style={{
        borderColor: isPossessing ? themeColor : undefined,
        boxShadow: isPossessing ? `0 0 16px ${themeColor}33` : undefined,
      }}
    >
      <div className="card-title-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: themeColor,
              boxShadow: `0 0 8px ${themeColor}`,
            }}
          />
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {isHome ? '【左侧·主队操作区】' : '【右侧·客队操作区】'} {team.college || ''}
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-main, #0f172a)' }}>
              {team.name}
            </h2>
          </div>
        </div>

        <button
          disabled={busy}
          className={`action-btn ${isPossessing ? 'primary' : 'secondary'}`}
          onClick={() => {
            if (!isPossessing) {
              onSwitchPossession(side);
            }
          }}
          style={{
            fontSize: '0.82rem',
            backgroundColor: isPossessing ? '#059669' : undefined,
            borderColor: isPossessing ? '#10b981' : undefined,
            cursor: isPossessing ? 'default' : 'pointer',
          }}
        >
          <Zap size={14} color={isPossessing ? '#fef08a' : undefined} />
          {isPossessing ? '⚡ 当前控球中' : '⚡ 切换此方控球'}
        </button>
      </div>

      <div className="action-buttons-grid">
        {/* 进球按钮（适当改小，精致横排） */}
        <button
          disabled={busy}
          className={`big-action-btn goal ${clickedAction === 'GOAL' ? 'action-active' : ''}`}
          onClick={() => handleActionClick('GOAL', () => onOpenPlayerModal('GOAL', side, 'regular'))}
          style={{
            background: isHome
              ? 'linear-gradient(135deg, #1e3a8a, #1d4ed8)'
              : 'linear-gradient(135deg, #0369a1, #0284c7)',
            padding: '8px 12px',
            minHeight: '44px',
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>⚽</span>
            <span style={{ fontSize: '0.98rem', fontWeight: 700 }}>
              {team.shortName} 进球 (Goal)
            </span>
          </div>
          <span style={{ fontSize: '0.72rem', opacity: 0.9 }}>
            比分+1 · 射门/射正+1
          </span>
        </button>

        {/* 紧随进球下方的 2 列并排按钮：🎯 点球 + 🥅 乌龙球 (复用 GOAL 管道) */}
        <button
          disabled={busy}
          className={`big-action-btn ${clickedAction === 'PENALTY' ? 'action-active' : ''}`}
          onClick={() => handleActionClick('PENALTY', () => onOpenPlayerModal('GOAL', side, 'penalty'))}
          style={{
            borderColor: '#a7f3d0',
            background: '#ecfdf5',
            padding: '10px 8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '1.2rem' }}>🎯</span>
            <span style={{ fontWeight: 700, color: '#065f46' }}>点球 (Penalty)</span>
          </div>
          <span style={{ fontSize: '0.7rem', color: '#047857' }}>
            射门/射正+1 · 进球可计
          </span>
        </button>

        <button
          disabled={busy}
          className={`big-action-btn ${clickedAction === 'OWN_GOAL' ? 'action-active' : ''}`}
          onClick={() => handleActionClick('OWN_GOAL', () => onOpenPlayerModal('GOAL', side, 'own_goal'))}
          style={{
            borderColor: '#fed7aa',
            background: '#fff7ed',
            padding: '10px 8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '1.2rem' }}>🥅</span>
            <span style={{ fontWeight: 700, color: '#9a3412' }}>乌龙球 (OG)</span>
          </div>
          <span style={{ fontSize: '0.7rem', color: '#c2410c' }}>
            对方比分+1 · 选己方球员
          </span>
        </button>

        {/* 射门 */}
        <button
          disabled={busy}
          className={`big-action-btn ${clickedAction === 'SHOT' ? 'action-active' : ''}`}
          onClick={() => handleActionClick('SHOT', () => onQuickRecordAction('SHOT', side, false))}
        >
          <Crosshair size={20} color="#38bdf8" />
          <span style={{ fontWeight: 600 }}>射门 (+1)</span>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>纯统计 · 不入时间线</span>
        </button>

        {/* 射正 */}
        <button
          disabled={busy}
          className={`big-action-btn ${clickedAction === 'SHOT_ON_TARGET' ? 'action-active' : ''}`}
          onClick={() => handleActionClick('SHOT_ON_TARGET', () => onQuickRecordAction('SHOT_ON_TARGET', side, true))}
        >
          <Crosshair size={20} color="#34d399" />
          <span style={{ fontWeight: 600 }}>射正 (+1)</span>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>射门/射正联动+1</span>
        </button>

        {/* 角球 */}
        <button
          disabled={busy}
          className={`big-action-btn ${clickedAction === 'CORNER' ? 'action-active' : ''}`}
          onClick={() => handleActionClick('CORNER', () => onQuickRecordAction('CORNER', side))}
        >
          <Flag size={20} color="#38bdf8" />
          <span style={{ fontWeight: 600 }}>角球 (+1)</span>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>角球统计+1</span>
        </button>

        {/* 任意球 */}
        <button
          disabled={busy}
          className={`big-action-btn ${clickedAction === 'FREE_KICK' ? 'action-active' : ''}`}
          onClick={() => handleActionClick('FREE_KICK', () => onQuickRecordAction('FREE_KICK', side))}
        >
          <Award size={20} color="#fbbf24" />
          <span style={{ fontWeight: 600 }}>任意球 (+1)</span>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>任意球统计+1</span>
        </button>

        {/* 犯规 */}
        <button
          disabled={busy}
          className={`big-action-btn ${clickedAction === 'FOUL' ? 'action-active' : ''}`}
          onClick={() => handleActionClick('FOUL', () => onQuickRecordAction('FOUL', side))}
        >
          <ShieldAlert size={20} color="#f87171" />
          <span style={{ fontWeight: 600 }}>犯规 (+1)</span>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>犯规统计+1</span>
        </button>

        {/* 换人 */}
        <button
          disabled={busy}
          className={`big-action-btn ${clickedAction === 'SUB' ? 'action-active' : ''}`}
          onClick={() => handleActionClick('SUB', () => onOpenPlayerModal('SUBSTITUTION', side))}
        >
          <RefreshCw size={20} color="#c084fc" />
          <span style={{ fontWeight: 600 }}>球员换人</span>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>仅写入时间线</span>
        </button>

        {/* 黄牌 */}
        <button
          disabled={busy}
          className={`big-action-btn ${clickedAction === 'YELLOW' ? 'action-active' : ''}`}
          onClick={() => handleActionClick('YELLOW', () => onOpenPlayerModal('YELLOW_CARD', side))}
          style={{ borderColor: '#fde047', background: '#fefce8' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '1.2rem' }}>🟨</span>
            <span style={{ fontWeight: 700, color: '#854d0e' }}>出示黄牌</span>
          </div>
          <span style={{ fontSize: '0.7rem', color: '#a16207' }}>黄牌+1 · 犯规+1 · 进时间线</span>
        </button>

        {/* 红牌 */}
        <button
          disabled={busy}
          className={`big-action-btn ${clickedAction === 'RED' ? 'action-active' : ''}`}
          onClick={() => handleActionClick('RED', () => onOpenPlayerModal('RED_CARD', side))}
          style={{ borderColor: '#fecaca', background: '#fef2f2' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '1.2rem' }}>🟥</span>
            <span style={{ fontWeight: 700, color: '#b91c1c' }}>罚下红牌</span>
          </div>
          <span style={{ fontSize: '0.7rem', color: '#dc2626' }}>红牌+1 · 犯规+1 · 进时间线</span>
        </button>
      </div>
    </div>
  );
};
