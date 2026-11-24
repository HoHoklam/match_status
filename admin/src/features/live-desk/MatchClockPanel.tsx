import React from 'react';
import { MatchClockState, MatchPeriod } from '@shared/types';
import { Play, Pause, FastForward, Square, Clock } from 'lucide-react';

interface MatchClockPanelProps {
  clock: MatchClockState;
  kickoffTime?: string | null;
  onStart: () => void;
  onPause: () => void;
  onOpenHalfTimeModal: () => void;
  onStartSecondHalf: () => void;
  onFinishMatch: () => void;
  onEnterPenaltyShootout?: () => void;
}

export const MatchClockPanel: React.FC<MatchClockPanelProps> = ({
  clock,
  kickoffTime,
  onStart,
  onPause,
  onOpenHalfTimeModal,
  onStartSecondHalf,
  onFinishMatch,
  onEnterPenaltyShootout,
}) => {
  const [regularTimeEnded, setRegularTimeEnded] = React.useState(false);

  React.useEffect(() => {
    if (clock.period === 'FINISHED' || clock.period === 'NOT_STARTED') {
      setRegularTimeEnded(false);
    }
  }, [clock.period]);
  const getPeriodLabel = (period: MatchPeriod) => {
    switch (period) {
      case 'NOT_STARTED':
        return '未开赛 (Ready)';
      case 'FIRST_HALF':
        return clock.isRunning ? '上半场 进行中' : '上半场 (已暂停)';
      case 'HALF_TIME':
        return `中场休息 (HT ${clock.halfTimeMinute || 35}')`;
      case 'SECOND_HALF':
        return clock.isRunning ? '下半场 进行中' : '下半场 (已暂停)';
      case 'FINISHED':
        return '全场已完赛 (FT)';
      case 'PAUSED': {
        const isSecond = clock.previousPeriod === 'SECOND_HALF' || Boolean(clock.halfTimeMinute);
        return isSecond ? '下半场 (已暂停走时)' : '上半场 (已暂停走时)';
      }
      default:
        return period;
    }
  };

  const getStatusColor = () => {
    if (clock.period === 'FINISHED') return '#94a3b8';
    if (clock.period === 'HALF_TIME') return '#f59e0b';
    if (clock.isRunning) return '#10b981';
    return '#f97316';
  };

  return (
    <div className="clock-center-section">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Clock size={20} color={getStatusColor()} />
        <div className="clock-digits">{clock.displayTime || '00:00'}</div>
      </div>

      <div
        className={`clock-status-pill ${clock.isRunning ? 'running' : ''}`}
        style={{
          border: `1px solid ${getStatusColor()}66`,
        }}
      >
        <span style={{ color: getStatusColor(), marginRight: '4px' }}>●</span>
        {getPeriodLabel(clock.period)} · 第 {clock.displayMinute || 1}'
      </div>

      {kickoffTime && (
        <div
          style={{
            fontSize: '0.78rem',
            color: '#059669',
            fontWeight: 700,
            background: '#ecfdf5',
            padding: '2px 8px',
            borderRadius: '12px',
            border: '1px solid #a7f3d0',
            marginTop: '2px',
          }}
        >
          ⏱️ 开球时间: {kickoffTime}
        </div>
      )}

      <div className="clock-actions">
        {/* 未开赛 */}
        {clock.period === 'NOT_STARTED' && (
          <button className="action-btn primary" onClick={onStart} style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
            <Play size={16} /> 鸣哨开球 (上半场)
          </button>
        )}

        {/* 上半场 */}
        {clock.period === 'FIRST_HALF' && (
          <>
            {clock.isRunning ? (
              <button className="action-btn secondary" onClick={onPause} title="暂停比赛走字">
                <Pause size={14} /> 暂停走时
              </button>
            ) : (
              <button className="action-btn primary" onClick={onStart} title="继续比赛走字">
                <Play size={14} /> 继续走时
              </button>
            )}

            <button className="action-btn secondary" onClick={onOpenHalfTimeModal} style={{ borderColor: '#f59e0b', color: '#fef08a' }}>
              <FastForward size={14} /> 中场休息 (HT)
            </button>

            <button className="action-btn danger" onClick={onFinishMatch}>
              <Square size={14} /> 结束比赛
            </button>
          </>
        )}

        {/* 中场休息 */}
        {clock.period === 'HALF_TIME' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className="action-btn primary" onClick={onStartSecondHalf} style={{ background: '#0284c7' }}>
              <Play size={14} /> 开始下半场 (从 {clock.secondHalfStartMinute}' 起)
            </button>
            <button className="action-btn danger" onClick={onFinishMatch}>
              <Square size={14} /> 提前结束
            </button>
          </div>
        )}

        {/* 下半场 */}
        {clock.period === 'SECOND_HALF' && (
          <>
            {clock.isRunning ? (
              <button className="action-btn secondary" onClick={onPause}>
                <Pause size={14} /> 暂停走时
              </button>
            ) : (
              <button className="action-btn primary" onClick={onStart}>
                <Play size={14} /> 继续走时
              </button>
            )}

            {!regularTimeEnded ? (
              <button
                className="action-btn danger"
                onClick={() => {
                  if (clock.isRunning) onPause();
                  setRegularTimeEnded(true);
                }}
                style={{ background: '#e11d48' }}
                title="常规时间已走完，准备进入完赛确认或点球大战"
              >
                <Square size={14} /> 常规时间结束
              </button>
            ) : (
              <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                <button
                  className="action-btn danger"
                  onClick={() => {
                    setRegularTimeEnded(false);
                    onFinishMatch();
                  }}
                  title="直接全场比赛结束（按常规时间比分结算）"
                >
                  <Square size={14} /> 全场比赛结束
                </button>
                <button
                  className="action-btn primary"
                  onClick={() => {
                    setRegularTimeEnded(false);
                    if (onEnterPenaltyShootout) onEnterPenaltyShootout();
                  }}
                  style={{ background: '#10b981' }}
                  title="进入点球大战录入"
                >
                  ⚽ 点球大战
                </button>
                <button
                  className="action-btn secondary"
                  onClick={() => setRegularTimeEnded(false)}
                  style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                >
                  取消
                </button>
              </div>
            )}
          </>
        )}

        {/* 暂停走时 */}
        {clock.period === 'PAUSED' && (
          <>
            <button
              className="action-btn primary"
              onClick={() => {
                setRegularTimeEnded(false);
                onStart();
              }}
              title="恢复走时 (从当前秒数继续递增)"
              style={{ background: '#10b981' }}
            >
              <Play size={14} /> 恢复走时
            </button>

            {(!clock.halfTimeMinute || clock.previousPeriod === 'FIRST_HALF') && (
              <button
                className="action-btn secondary"
                onClick={onOpenHalfTimeModal}
                style={{ borderColor: '#f59e0b', color: '#d97706' }}
              >
                <FastForward size={14} /> 中场休息 (HT)
              </button>
            )}

            {Boolean(clock.halfTimeMinute) || clock.previousPeriod === 'SECOND_HALF' ? (
              !regularTimeEnded ? (
                <button
                  className="action-btn danger"
                  onClick={() => setRegularTimeEnded(true)}
                  style={{ background: '#e11d48' }}
                >
                  <Square size={14} /> 常规时间结束
                </button>
              ) : (
                <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    className="action-btn danger"
                    onClick={() => {
                      setRegularTimeEnded(false);
                      onFinishMatch();
                    }}
                  >
                    <Square size={14} /> 全场比赛结束
                  </button>
                  <button
                    className="action-btn primary"
                    onClick={() => {
                      setRegularTimeEnded(false);
                      if (onEnterPenaltyShootout) onEnterPenaltyShootout();
                    }}
                    style={{ background: '#10b981' }}
                  >
                    ⚽ 点球大战
                  </button>
                  <button
                    className="action-btn secondary"
                    onClick={() => setRegularTimeEnded(false)}
                    style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                  >
                    取消
                  </button>
                </div>
              )
            ) : (
              <button className="action-btn danger" onClick={onFinishMatch}>
                <Square size={14} /> 结束比赛
              </button>
            )}
          </>
        )}

        {/* 完赛 */}
        {clock.period === 'FINISHED' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.85rem' }}>
            <span>🏁 比赛已顺利完赛，结果已锁定</span>
          </div>
        )}
      </div>
    </div>
  );
};
