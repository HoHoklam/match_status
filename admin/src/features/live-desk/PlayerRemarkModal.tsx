import React, { useState, useEffect } from 'react';
import { LiveActionType, PlayerInfo, GoalType } from '@shared/types';

interface PlayerRemarkModalProps {
  isOpen: boolean;
  actionType: LiveActionType | null;
  side: 'home' | 'away';
  goalType?: GoalType;
  teamName: string;
  teamRoster?: {
    starters?: PlayerInfo[];
    substitutes?: PlayerInfo[];
  };
  onConfirm: (data: {
    playerName?: string;
    playerNumber?: number;
    assistPlayerName?: string;
    subInPlayerName?: string;
    subOutPlayerName?: string;
    reason?: string;
    goalType?: GoalType;
    penaltyScored?: boolean;
  }) => void;
  onClose: () => void;
}

export const PlayerRemarkModal: React.FC<PlayerRemarkModalProps> = ({
  isOpen,
  actionType,
  side,
  goalType,
  teamName,
  teamRoster,
  onConfirm,
  onClose,
}) => {
  const [playerName, setPlayerName] = useState('');
  const [playerNumber, setPlayerNumber] = useState<number | undefined>(undefined);
  const [assistPlayerName, setAssistPlayerName] = useState('');
  const [subInPlayerName, setSubInPlayerName] = useState('');
  const [subOutPlayerName, setSubOutPlayerName] = useState('');
  const [reason, setReason] = useState('');
  const [penaltyScored, setPenaltyScored] = useState<boolean>(true);

  const allPlayers = [
    ...(teamRoster?.starters || []),
    ...(teamRoster?.substitutes || []),
  ].filter((p) => p && p.name);

  useEffect(() => {
    if (isOpen) {
      setPlayerName('');
      setPlayerNumber(undefined);
      setAssistPlayerName('');
      setSubInPlayerName('');
      setSubOutPlayerName('');
      setReason('');
      setPenaltyScored(true);
    }
  }, [isOpen, actionType, goalType]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !actionType) return null;

  const isPenalty = actionType === 'PENALTY' || (actionType === 'GOAL' && goalType === 'penalty');
  const isOwnGoal = actionType === 'OWN_GOAL' || (actionType === 'GOAL' && goalType === 'own_goal');

  const getTitle = () => {
    if (actionType === 'GOAL') {
      if (goalType === 'penalty') return `🎯 录入常规时间点球 - ${teamName}`;
      if (goalType === 'own_goal') return `🥅 录入乌龙球 - ${teamName}`;
      return `⚽ 录入进球 - ${teamName}`;
    }
    switch (actionType) {
      case 'PENALTY':
        return `🎯 录入常规时间点球 - ${teamName}`;
      case 'OWN_GOAL':
        return `🥅 录入乌龙球 - ${teamName}`;
      case 'YELLOW_CARD':
        return `🟨 出示黄牌 - ${teamName}`;
      case 'RED_CARD':
        return `🟥 罚下红牌 - ${teamName}`;
      case 'SUBSTITUTION':
        return `🔄 球员换人 - ${teamName}`;
      default:
        return '现场事件录入';
    }
  };

  const yellowReasons = ['战术犯规', '禁区前推人', '延误比赛时间', '顶撞裁判', '假摔'];
  const redReasons = ['两黄变一红', '严重战术犯规', '破坏必进球机会 (DOGSO)', '暴力行为', '侮辱性言论'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let computedGoalType: GoalType | undefined = goalType;
    if (isPenalty) {
      computedGoalType = penaltyScored ? 'penalty' : 'penalty_missed';
    } else if (isOwnGoal) {
      computedGoalType = 'own_goal';
    } else if (actionType === 'GOAL') {
      computedGoalType = 'regular';
    }

    onConfirm({
      playerName: playerName.trim() || undefined,
      playerNumber: playerNumber || undefined,
      assistPlayerName: assistPlayerName.trim() || undefined,
      subInPlayerName: subInPlayerName.trim() || undefined,
      subOutPlayerName: subOutPlayerName.trim() || undefined,
      reason: reason.trim() || undefined,
      goalType: computedGoalType,
      penaltyScored: isPenalty ? penaltyScored : undefined,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>{getTitle()}</h3>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', color: '#fff', background: side === 'home' ? '#1A56DB' : '#0EA5E9' }}>
            {side === 'home' ? '主队' : '客队'}
          </span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {actionType === 'SUBSTITUTION' ? (
            <>
              <div className="form-group">
                <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>换上球员姓名 / 号码</label>
                {teamRoster?.substitutes && teamRoster.substitutes.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    {teamRoster.substitutes.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSubInPlayerName(`${p.name} (${p.number}号)`)}
                        style={{
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          borderRadius: '4px',
                          color: '#166534',
                          fontSize: '0.75rem',
                          padding: '2px 8px',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        +{p.number} {p.name}
                      </button>
                    ))}
                  </div>
                )}
                <input
                  type="text"
                  className="form-input"
                  placeholder="例如: 张三 (10号)"
                  value={subInPlayerName}
                  onChange={(e) => setSubInPlayerName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>换下球员姓名 / 号码</label>
                {teamRoster?.starters && teamRoster.starters.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    {teamRoster.starters.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSubOutPlayerName(`${p.name} (${p.number}号)`)}
                        style={{
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          color: '#991b1b',
                          fontSize: '0.75rem',
                          padding: '2px 8px',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        -{p.number} {p.name}
                      </button>
                    ))}
                  </div>
                )}
                <input
                  type="text"
                  className="form-input"
                  placeholder="例如: 李四 (7号)"
                  value={subOutPlayerName}
                  onChange={(e) => setSubOutPlayerName(e.target.value)}
                />
              </div>
            </>
          ) : (
            <>
              {/* 点球判定单选组 (罚进 / 罚失) */}
              {isPenalty && (
                <div className="form-group" style={{ marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                    点球主罚结果判定：
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setPenaltyScored(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '10px 8px',
                        borderRadius: '8px',
                        border: penaltyScored ? '2px solid #86efac' : '1px solid #e2e8f0',
                        background: penaltyScored ? '#dcfce7' : '#ffffff',
                        color: penaltyScored ? '#15803d' : '#64748b',
                        fontWeight: penaltyScored ? 800 : 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>⚽</span>
                      <span>【罚进】比分+1 · 射门/射正+1</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPenaltyScored(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '10px 8px',
                        borderRadius: '8px',
                        border: !penaltyScored ? '2px solid #fca5a5' : '1px solid #e2e8f0',
                        background: !penaltyScored ? '#fee2e2' : '#ffffff',
                        color: !penaltyScored ? '#b91c1c' : '#64748b',
                        fontWeight: !penaltyScored ? 800 : 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>❌</span>
                      <span>【罚失】比分不变 · 射门/射正+1</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 乌龙球友情提示 */}
              {isOwnGoal && (
                <div
                  style={{
                    background: '#fff7ed',
                    border: '1px solid #fed7aa',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: '#c2410c',
                    fontSize: '0.82rem',
                    lineHeight: 1.5,
                    marginBottom: '4px',
                  }}
                >
                  ⚠️ <strong>乌龙球规则说明：</strong> 请选择不慎造成乌龙的<strong>【{teamName}】</strong>球员。提交后该事件将呈现在己方时间线卡片，<strong>对方球队比分自动 +1</strong>。
                </div>
              )}

              {/* 整队网格徽章卡片平铺选人（进球 / 点球 / 乌龙球 / 红黄牌 全面覆盖） */}
              {allPlayers.length > 0 && (
                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>
                      {actionType === 'GOAL' && !isPenalty && !isOwnGoal && '平铺整队名单快捷选人（进球球员）：'}
                      {isPenalty && '平铺整队名单快捷选人（主罚队员）：'}
                      {isOwnGoal && '平铺整队名单快捷选人（乌龙球员）：'}
                      {actionType === 'YELLOW_CARD' && '平铺整队名单快捷选人（被黄牌警告）：'}
                      {actionType === 'RED_CARD' && '平铺整队名单快捷选人（被罚下球员）：'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      (共 {teamRoster?.starters?.length || 0} 首发 / {teamRoster?.substitutes?.length || 0} 替补)
                    </span>
                  </label>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(95px, 1fr))',
                      gap: '8px',
                      maxHeight: '180px',
                      overflowY: 'auto',
                      padding: '6px',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    {allPlayers.map((p, idx) => {
                      const isSelected = playerName === p.name && (playerNumber === undefined || playerNumber === p.number);
                      const isStarter = teamRoster?.starters?.some(
                        (st) => st.number === p.number && st.name === p.name
                      );

                      // 针对不同事件的主题色方案
                      let selectedBg = '#dbeafe';
                      let selectedBorder = '#3b82f6';
                      let badgeBg = '#3b82f6';

                      if (actionType === 'YELLOW_CARD') {
                        selectedBg = '#fef9c3';
                        selectedBorder = '#eab308';
                        badgeBg = isSelected ? '#ca8a04' : '#3b82f6';
                      } else if (actionType === 'RED_CARD') {
                        selectedBg = '#fee2e2';
                        selectedBorder = '#ef4444';
                        badgeBg = isSelected ? '#dc2626' : '#3b82f6';
                      } else if (isOwnGoal) {
                        selectedBg = '#ffedd5';
                        selectedBorder = '#f97316';
                        badgeBg = isSelected ? '#ea580c' : '#3b82f6';
                      } else if (isPenalty) {
                        if (penaltyScored) {
                          selectedBg = '#dcfce7';
                          selectedBorder = '#22c55e';
                          badgeBg = isSelected ? '#16a34a' : '#3b82f6';
                        } else {
                          selectedBg = '#fee2e2';
                          selectedBorder = '#ef4444';
                          badgeBg = isSelected ? '#dc2626' : '#3b82f6';
                        }
                      } else if (actionType === 'GOAL') {
                        selectedBg = '#dcfce7';
                        selectedBorder = '#22c55e';
                        badgeBg = isSelected ? '#16a34a' : '#3b82f6';
                      }

                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            setPlayerName(p.name);
                            setPlayerNumber(p.number);
                          }}
                          style={{
                            background: isSelected ? selectedBg : '#ffffff',
                            border: `2px solid ${isSelected ? selectedBorder : '#e2e8f0'}`,
                            borderRadius: '8px',
                            padding: '6px 8px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                            transform: isSelected ? 'scale(1.02)' : 'none',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <span
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                background: badgeBg,
                                color: '#ffffff',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {p.number}
                            </span>
                            <span
                              style={{
                                fontSize: '0.62rem',
                                padding: '1px 4px',
                                borderRadius: '4px',
                                background: isStarter ? '#eff6ff' : '#f1f5f9',
                                color: isStarter ? '#1d4ed8' : '#64748b',
                                fontWeight: 600,
                              }}
                            >
                              {isStarter ? '首发' : '替补'}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: '0.82rem',
                              fontWeight: isSelected ? 800 : 600,
                              color: isSelected ? '#0f172a' : '#334155',
                              textAlign: 'center',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '85px',
                            }}
                          >
                            {p.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: '8px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>球员姓名</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="输入或点击上方快捷点选"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>球衣号码</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="号数"
                    value={playerNumber || ''}
                    onChange={(e) => setPlayerNumber(parseInt(e.target.value, 10) || undefined)}
                  />
                </div>
              </div>

              {actionType === 'GOAL' && !isPenalty && !isOwnGoal && (
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>助攻球员 (选填)</label>
                    {assistPlayerName && (
                      <button
                        type="button"
                        onClick={() => setAssistPlayerName('')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          padding: '0 4px',
                          fontWeight: 600,
                        }}
                      >
                        清空助攻
                      </button>
                    )}
                  </div>
                  {allPlayers.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px', maxHeight: '76px', overflowY: 'auto', padding: '2px 0' }}>
                      {allPlayers.map((p, idx) => {
                        const isCurrentScorer = playerName === p.name;
                        const isSelected = assistPlayerName === p.name;
                        return (
                          <button
                            key={idx}
                            type="button"
                            disabled={isCurrentScorer}
                            onClick={() => setAssistPlayerName(isSelected ? '' : p.name)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: isSelected ? '#dbeafe' : isCurrentScorer ? '#f1f5f9' : '#ffffff',
                              border: `1px solid ${isSelected ? '#3b82f6' : '#cbd5e1'}`,
                              borderRadius: '6px',
                              color: isSelected ? '#1d4ed8' : isCurrentScorer ? '#94a3b8' : '#334155',
                              fontSize: '0.75rem',
                              padding: '3px 8px',
                              cursor: isCurrentScorer ? 'not-allowed' : 'pointer',
                              opacity: isCurrentScorer ? 0.45 : 1,
                              fontWeight: isSelected ? 700 : 500,
                              transition: 'all 0.15s ease',
                            }}
                            title={isCurrentScorer ? '进球者不可作为自身助攻球员' : ''}
                          >
                            <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>#{p.number}</span>
                            <span>{p.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <input
                    type="text"
                    className="form-input"
                    placeholder="输入或点击上方卡片选择助攻者"
                    value={assistPlayerName}
                    onChange={(e) => setAssistPlayerName(e.target.value)}
                  />
                </div>
              )}

              {(actionType === 'YELLOW_CARD' || actionType === 'RED_CARD') && (
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>出牌原因 (可选快捷标签)</label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    {(actionType === 'YELLOW_CARD' ? yellowReasons : redReasons).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setReason(tag)}
                        style={{
                          background: reason === tag ? (actionType === 'YELLOW_CARD' ? '#fef08a' : '#fee2e2') : '#f1f5f9',
                          border: `1px solid ${reason === tag ? (actionType === 'YELLOW_CARD' ? '#facc15' : '#f87171') : '#e2e8f0'}`,
                          borderRadius: '4px',
                          color: reason === tag ? (actionType === 'YELLOW_CARD' ? '#854d0e' : '#991b1b') : '#475569',
                          fontWeight: reason === tag ? 700 : 500,
                          padding: '3px 8px',
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                        }}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="例如: 战术犯规 / 假摔 / 严重犯规"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
              )}
            </>
          )}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button type="button" className="action-btn secondary" onClick={onClose}>
              取消 (Esc)
            </button>
            <button type="submit" className="action-btn primary">
              确认录入并广播
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
