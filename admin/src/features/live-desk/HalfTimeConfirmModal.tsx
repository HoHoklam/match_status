import React, { useState, useEffect } from 'react';

interface HalfTimeConfirmModalProps {
  currentMinute: number;
  isOpen: boolean;
  onConfirm: (minute: number) => void;
  onClose: () => void;
}

export const HalfTimeConfirmModal: React.FC<HalfTimeConfirmModalProps> = ({
  currentMinute,
  isOpen,
  onConfirm,
  onClose,
}) => {
  const [minute, setMinute] = useState<number>(currentMinute || 35);

  useEffect(() => {
    if (isOpen) {
      setMinute(currentMinute || 35);
    }
  }, [isOpen, currentMinute]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm(minute);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, minute, onConfirm, onClose]);

  if (!isOpen) return null;

  const secondHalfStartMin = minute >= 45 ? 46 : minute + 1;
  const presets = [30, 35, 40, 45];
  if (!presets.includes(currentMinute) && currentMinute > 0) {
    presets.push(currentMinute);
    presets.sort((a, b) => a - b);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>⏱️</span> 确认进入中场休息 (HT)
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0 }}>
          请输入或确认上半场结束分钟数。系统将据此打点时间线并自适应推算下半场起始点：
        </p>

        {/* 快捷预设按钮 */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`action-btn ${minute === preset ? 'primary' : 'secondary'}`}
              style={{ padding: '4px 10px', fontSize: '0.8rem' }}
              onClick={() => setMinute(preset)}
            >
              {preset}' {preset === currentMinute ? '(当前表盘)' : ''}
            </button>
          ))}
        </div>

        <div className="form-group">
          <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>上半场结束时间 (分钟数)</label>
          <input
            type="number"
            className="form-input"
            value={minute}
            onChange={(e) => setMinute(Math.max(1, parseInt(e.target.value, 10) || 1))}
            min={1}
            max={70}
            autoFocus
          />
        </div>

        {/* 自适应规则提示 */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '8px',
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            fontSize: '0.84rem',
            color: '#0369a1',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div><strong>📌 自适应起点换算：</strong></div>
          <div>
            时间线将记录: <code style={{ color: '#d97706', fontWeight: 600 }}>[HT {minute}'] 中场休息</code>
          </div>
          <div>
            下半场开表将自适应从 <strong style={{ color: '#059669' }}>{secondHalfStartMin}'</strong> ({minute}:01) 起算
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="action-btn secondary" onClick={onClose}>
            取消 (Esc)
          </button>
          <button className="action-btn primary" onClick={() => onConfirm(minute)}>
            确认进入中场 (Enter)
          </button>
        </div>
      </div>
    </div>
  );
};
