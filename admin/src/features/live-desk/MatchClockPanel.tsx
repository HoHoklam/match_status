import React, { useState } from 'react';
import { Clock, FastForward, Pause, Play, Square } from 'lucide-react';
import type { MatchLiveSnapshot } from '@shared/types';
import { announcedStoppage, formatMatchMinute, matchStatusLabel, playingHalf, stoppageBase } from '@shared/matchClock';

interface MatchClockPanelProps {
  match: MatchLiveSnapshot;
  busy: boolean;
  onStart: () => void;
  onPause: () => void;
  onHalfTime: () => void;
  onStartSecondHalf: () => void;
  onRegularTimeEnd: () => void;
  onFinishMatch: () => void;
  onAnnounceStoppage: (minutes: number) => void;
  onEnterPenaltyShootout: () => void;
}

export function MatchClockPanel({
  match, busy, onStart, onPause, onHalfTime, onStartSecondHalf, onRegularTimeEnd,
  onFinishMatch, onAnnounceStoppage, onEnterPenaltyShootout,
}: MatchClockPanelProps) {
  const { clock, kickoffTime } = match;
  const { period, isRunning, regularTimeEnded } = clock;
  const half = playingHalf(clock);
  const stoppage = announcedStoppage(match);
  const base = half ? stoppageBase(match, half) : 0;
  const inStoppage = Boolean(half) && clock.currentSecond >= base * 60;
  const reached = inStoppage && stoppage !== undefined && clock.currentSecond >= (base + stoppage) * 60;
  const [editing, setEditing] = useState(false);
  const [minutes, setMinutes] = useState('');

  return (
    <div className="clock-center-section">
      <div className="clock-readout">
        <Clock size={20} />
        <div className="clock-digits">{clock.displayTime}</div>
      </div>
      <div className={`clock-status-pill ${isRunning ? 'running' : ''}`}>
        {matchStatusLabel(match)}
        {half && !regularTimeEnded && ` · ${formatMatchMinute(match, clock.displayMinute)}`}
      </div>
      {kickoffTime && <span className="clock-kickoff">开球时间 {kickoffTime}</span>}
      {half && stoppage !== undefined && (
        <div className="clock-stoppage">
          至少补时 {stoppage} 分钟
          {reached && !regularTimeEnded && ' · 已达到宣布时长'}
        </div>
      )}

      <div className="clock-actions">
        {period === 'NOT_STARTED' && (
          <button className="action-btn primary" disabled={busy} onClick={onStart}><Play size={14} /> 鸣哨开球</button>
        )}
        {half && !regularTimeEnded && (
          <>
            <button className="action-btn secondary" disabled={busy} onClick={isRunning ? onPause : onStart}>
              {isRunning ? <Pause size={14} /> : <Play size={14} />}
              {isRunning ? '暂停走时' : '恢复走时'}
            </button>
            <button className="action-btn secondary" disabled={busy} onClick={() => {
              setMinutes(String(stoppage ?? ''));
              setEditing(!editing);
            }}>
              {stoppage === undefined ? '设置补时' : '修改补时'}
            </button>
            {half === 'FIRST_HALF' ? (
              <button className="action-btn secondary" disabled={busy} onClick={onHalfTime}><FastForward size={14} /> 中场休息</button>
            ) : (
              <button className="action-btn danger" disabled={busy} onClick={onRegularTimeEnd}><Square size={14} /> 常规时间结束</button>
            )}
          </>
        )}
        {period === 'HALF_TIME' && (
          <button className="action-btn primary" disabled={busy} onClick={onStartSecondHalf}>
            <Play size={14} /> 开始下半场（从 {clock.secondHalfStartMinute}:00 起）
          </button>
        )}
        {(half === 'FIRST_HALF' || period === 'HALF_TIME' || regularTimeEnded) && (
          <button className="action-btn danger" disabled={busy} onClick={onFinishMatch}><Square size={14} /> 结束比赛</button>
        )}
        {regularTimeEnded && (
          <>
            <button className="action-btn primary" disabled={busy} onClick={onEnterPenaltyShootout}>点球大战</button>
            <button className="action-btn secondary" disabled={busy} onClick={onStart}>恢复走时</button>
          </>
        )}
      </div>
      {half && !regularTimeEnded && editing && (
        <form className="clock-stoppage-form" onSubmit={event => {
          event.preventDefault();
          onAnnounceStoppage(Number(minutes));
          setEditing(false);
        }}>
          <label>补时分钟 <input type="number" min={0} max={99} step={1} required value={minutes}
            disabled={busy} onChange={e => setMinutes(e.target.value)} /></label>
          <button className="action-btn primary" type="submit" disabled={busy}>保存补时</button>
        </form>
      )}
    </div>
  );
}
