import React, { useState, useEffect, useRef, useCallback } from 'react';
import { matchLiveService } from '../../api/matchLive.service';
import {
  MatchLiveSnapshot,
  LiveActionType,
  PossessionSide,
  ChangeClockPeriodDto,
  SubmitLiveActionDto,
} from '@shared/types';
import { playingHalf, projectMatchClock } from '@shared/matchClock';
import { MatchClockPanel } from './MatchClockPanel';
import { TeamActionColumn } from './TeamActionColumn';
import { PossessionIndicator } from './PossessionIndicator';
import { TimelineEventStream } from './TimelineEventStream';
import { LiveStatsPreviewBoard } from './LiveStatsPreviewBoard';
import { PlayerRemarkModal } from './PlayerRemarkModal';
import { PenaltyShootoutDesk } from './PenaltyShootoutDesk';
import { RotateCcw, Undo2, Radio, RefreshCw, ArrowLeft, FileEdit } from 'lucide-react';

interface LiveMatchDeskProps {
  initialMatchId?: string;
  onBackToHub?: () => void;
  onEditMatchSetup?: (match: MatchLiveSnapshot) => void;
}

export const LiveMatchDesk: React.FC<LiveMatchDeskProps> = ({
  initialMatchId,
  onBackToHub,
  onEditMatchSetup,
}) => {
  const [matches, setMatches] = useState<MatchLiveSnapshot[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>(initialMatchId || 'sztu-match-2026-001');
  const [snapshot, setSnapshot] = useState<MatchLiveSnapshot | null>(null);
  const [now, setNow] = useState(Date.now);
  const matchData = snapshot?.id === selectedMatchId ? projectMatchClock(snapshot, now) : null;
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const pending = useRef(false);
  const [inShootoutView, setInShootoutView] = useState<boolean>(false);
  const [mobileActiveSide, setMobileActiveSide] = useState<'home' | 'away'>('home');

  const [playerAction, setPlayerAction] = useState<Pick<SubmitLiveActionDto,
    'type' | 'side' | 'goalType' | 'minute' | 'secondFormatted' | 'expectedVersion'> | null>(null);

  const applySnapshot = useCallback((next: MatchLiveSnapshot) => {
    setNow(Date.now());
    setSnapshot(prev => prev?.id === next.id && prev.version > next.version ? prev : next);
  }, []);

  const loadData = useCallback(async (id: string, signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const next = await matchLiveService.getLiveSnapshot(id, signal);
      if (!signal?.aborted) applySnapshot(next);
    } catch (err) {
      if (!signal?.aborted) setError(err instanceof Error ? err.message : '加载赛况失败');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [applySnapshot]);

  useEffect(() => {
    matchLiveService.getMatches().then(setMatches).catch(console.error);
  }, []);

  useEffect(() => {
    if (initialMatchId) setSelectedMatchId(initialMatchId);
  }, [initialMatchId]);

  useEffect(() => {
    const controller = new AbortController();
    setPlayerAction(null);
    setInShootoutView(false);
    setFeedback('');
    void loadData(selectedMatchId, controller.signal);
    return () => controller.abort();
  }, [loadData, selectedMatchId]);

  useEffect(() => {
    if (!snapshot?.clock.isRunning) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [snapshot?.clock.isRunning]);

  const submit = useCallback(async (
    id: string,
    save: () => Promise<MatchLiveSnapshot>,
    success: string | ((next: MatchLiveSnapshot) => string),
  ) => {
    if (pending.current) return false;
    pending.current = true;
    setSubmitting(true);
    setFeedback('正在提交…');
    try {
      const next = await save();
      applySnapshot(next);
      setFeedback(typeof success === 'string' ? success : success(next));
      return true;
    } catch (err) {
      const reason = err instanceof Error ? err.message : '网络异常';
      setFeedback(`提交未确认：${reason}。请核对最新记录后再操作。`);
      try {
        applySnapshot(await matchLiveService.getLiveSnapshot(id));
      } catch {
        setFeedback(`提交未确认：${reason}。请重新加载比赛后核对记录。`);
      }
      return false;
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  }, [applySnapshot]);

  const changeClock = (change: ChangeClockPeriodDto, success: string) => {
    if (!matchData) return;
    const { id, version } = matchData;
    void submit(id, () => matchLiveService.updateClock(id, { ...change, expectedVersion: version }), success);
  };

  const handleStartClock = () => {
    if (!matchData) return;
    changeClock({ period: playingHalf(matchData.clock) ?? 'FIRST_HALF' }, '比赛走时已启动');
  };

  const handleFinishMatch = () => {
    if (window.confirm('确定结束比赛并锁定比分？')) {
      changeClock({ period: 'FINISHED', penaltyShootout: null }, '全场比赛已结束');
    }
  };

  const handleAnnounceStoppage = (minutes: number) => {
    if (!matchData) return;
    const half = playingHalf(matchData.clock);
    if (!half) return;
    void submit(matchData.id, () => matchLiveService.announceStoppage(matchData.id, half, minutes), '补时已保存');
  };

  const handleSwitchPossession = (side: PossessionSide) => {
    if (!matchData) return;
    void submit(matchData.id, () => matchLiveService.switchPossession(matchData.id, { side }), '控球方已更新');
  };

  const handleQuickRecordAction = (type: LiveActionType, side: 'home' | 'away', isShotOnTarget?: boolean) => {
    if (!matchData) return;
    void submit(matchData.id, () => matchLiveService.recordAction(matchData.id, {
      type, side, isShotOnTarget, expectedVersion: matchData.version,
    }), '技术统计已保存');
  };

  const handleOpenPlayerModal = (type: LiveActionType, side: 'home' | 'away', goalType?: SubmitLiveActionDto['goalType']) => {
    if (!matchData || pending.current) return;
    const { clock } = projectMatchClock(matchData);
    setPlayerAction({ type, side, goalType, minute: clock.displayMinute, secondFormatted: clock.displayTime, expectedVersion: matchData.version });
    setFeedback('');
  };

  const handleConfirmPlayerModal = async (details: Omit<SubmitLiveActionDto, 'type' | 'side'>) => {
    if (!matchData || !playerAction || pending.current) return;
    const { id } = matchData;
    setPlayerAction(null);
    await submit(id, () => matchLiveService.recordAction(id, {
      ...playerAction, ...details, goalType: details.goalType ?? playerAction.goalType,
    }), '事件已保存');
  };

  const handleUpdateStatsDelta = (statKey: Parameters<typeof matchLiveService.updateStatsDelta>[1]['statKey'],
    side: 'home' | 'away', delta: number) => {
    if (!matchData) return;
    void submit(matchData.id, () => matchLiveService.updateStatsDelta(matchData.id, { statKey, side, delta }), '技术统计已保存');
  };

  const handleDeleteEvent = (eventId: string) => {
    if (!matchData || pending.current || !window.confirm('确定删除该事件并回退关联比分与统计？')) return;
    void submit(matchData.id, () => matchLiveService.deleteTimelineEvent(matchData.id, eventId), '事件已删除');
  };

  const handleUndo = useCallback(() => {
    if (!snapshot || snapshot.id !== selectedMatchId) return;
    const { id, version } = snapshot;
    void submit(id, () => matchLiveService.undo(id), next => next.version > version ? '已撤销上一次操作' : '没有可撤销的操作');
  }, [snapshot, selectedMatchId, submit]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const element = e.target as HTMLElement | null;
      if (playerAction || inShootoutView || element?.closest('input, textarea, select, [contenteditable]')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.repeat) {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, inShootoutView, playerAction]);

  const handleReset = () => {
    if (!matchData || pending.current || !window.confirm('确定清空比分、时钟和事件，重置本场比赛？')) return;
    void submit(matchData.id, () => matchLiveService.reset(matchData.id), '比赛已重置');
  };

  if (!matchData && (loading || !error)) {
    return <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>正在加载现场记录操控台...</div>;
  }

  if (error || !matchData) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#ef4444' }}>
        无法连接后端轻量服务 (3002端口) 或比赛不存在: {error}
        <div style={{ marginTop: '16px' }}>
          <button className="action-btn primary" onClick={() => loadData(selectedMatchId)}>
            <RefreshCw size={14} /> 重试加载
          </button>
        </div>
      </div>
    );
  }

  if (inShootoutView && matchData) {
    return (
      <div className="live-desk-container" style={{ background: '#f8fafc', minHeight: '100vh' }}>
        <PenaltyShootoutDesk
          matchData={matchData}
          onBackToDesk={() => setInShootoutView(false)}
          onFinishMatchSuccess={(updated) => {
            applySnapshot(updated);
            setInShootoutView(false);
            setFeedback('点球大战完赛，结果已锁定');
          }}
          onSnapshot={applySnapshot}
        />
      </div>
    );
  }

  const editingDisabled = submitting || matchData.clock.period === 'FINISHED';

  return (
    <div className="live-desk-container">
      {/* 顶部控制栏 */}
      <div className="desk-header">
        <div className="title-badge">
          {onBackToHub && (
            <button
              className="action-btn secondary"
              onClick={onBackToHub}
              style={{ marginRight: '8px', padding: '6px 12px' }}
              title="返回比赛管理工作台"
            >
              <ArrowLeft size={14} /> 比赛列表
            </button>
          )}
          <Radio size={20} color="#10b981" />
          <h1>SZTUFA 现场记录操控台 (Live Desk)</h1>
          <select
            value={selectedMatchId}
            disabled={submitting}
            onChange={(e) => setSelectedMatchId(e.target.value)}
            className="desk-header-select"
          >
            {matches.map((m) => (
              <option key={m.id} value={m.id} style={{ color: '#0f172a' }}>
                {m.title}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {matchData.clock.period === 'NOT_STARTED' && onEditMatchSetup && (
            <button
              className="action-btn secondary"
              onClick={() => onEditMatchSetup(matchData)}
              style={{
                borderColor: '#6366f1',
                color: '#4f46e5',
                background: '#eef2ff',
                fontWeight: 600,
              }}
              title="返回修改主客队信息与名单配置 (仅比赛开球前允许编辑)"
            >
              <FileEdit size={14} /> 修改球队与名单
            </button>
          )}
          <button
            className="action-btn secondary"
            disabled={submitting}
            onClick={handleUndo}
            title="撤销上一次操作 (支持快捷键 Ctrl+Z)"
          >
            <Undo2 size={14} /> 撤销 (Ctrl+Z)
          </button>
          <button
            className="action-btn secondary"
            disabled={submitting}
            onClick={handleReset}
            title="完全重置本场比赛数据为开赛前状态"
          >
            <RotateCcw size={14} /> 重置 (Reset)
          </button>
        </div>
      </div>

      <p className="desk-operation-status" role="status" aria-live="polite">
        {feedback || '就绪'}
      </p>

      {/* 大比分与中央时钟 */}
      <div className="scoreboard-clock-banner">
        {/* 主队名称与比分 */}
        <div className="team-summary home">
          <div className="team-name">{matchData.homeTeam.name}</div>
          <div className="score-box home">
            {matchData.score.home}
          </div>
        </div>

        {/* 计时器与控制中心 */}
        <MatchClockPanel
          key={matchData.id + ':' + playingHalf(matchData.clock)}
          match={matchData}
          busy={submitting}
          onStart={handleStartClock}
          onPause={() => changeClock({ period: 'PAUSED' }, '比赛已暂停')}
          onHalfTime={() => changeClock({ period: 'HALF_TIME' }, '已进入中场休息')}
          onStartSecondHalf={() => changeClock({ period: 'SECOND_HALF' }, '下半场已开球')}
          onRegularTimeEnd={() => changeClock({ period: 'PAUSED', regularTimeEnded: true }, '常规时间已结束')}
          onAnnounceStoppage={handleAnnounceStoppage}
          onFinishMatch={handleFinishMatch}
          onEnterPenaltyShootout={() => setInShootoutView(true)}
        />

        {/* 客队比分与名称 */}
        <div className="team-summary away">
          <div className="score-box away">
            {matchData.score.away}
          </div>
          <div className="team-name">{matchData.awayTeam.name}</div>
        </div>
      </div>

      {/* 实时控球率条 */}
      <PossessionIndicator
        stats={matchData.stats}
        possessionSide={matchData.possessionSide}
        homeTeamName={matchData.homeTeam.shortName || matchData.homeTeam.name}
        awayTeamName={matchData.awayTeam.shortName || matchData.awayTeam.name}
      />

      {/* 移动端专属：主队 / 客队 操作区切换标签条 */}
      <div className="mobile-team-switcher">
        <button
          type="button"
          className={`mobile-team-tab ${mobileActiveSide === 'home' ? 'active home' : ''}`}
          onClick={() => setMobileActiveSide('home')}
        >
          <span className="team-dot home" />
          <span>主队 · {matchData.homeTeam.name}</span>
        </button>
        <button
          type="button"
          className={`mobile-team-tab ${mobileActiveSide === 'away' ? 'active away' : ''}`}
          onClick={() => setMobileActiveSide('away')}
        >
          <span className="team-dot away" />
          <span>客队 · {matchData.awayTeam.name}</span>
        </button>
      </div>

      {/* 双侧对抗核心操作区 (主队在左 / 客队在右) */}
      <div className="battlefield-grid">
        <div className={`battlefield-col home ${mobileActiveSide !== 'home' ? 'mobile-hidden' : ''}`}>
          <TeamActionColumn
            side="home"
            team={matchData.homeTeam}
            busy={editingDisabled}
            isPossessing={matchData.possessionSide === 'home'}
            onSwitchPossession={handleSwitchPossession}
            onOpenPlayerModal={handleOpenPlayerModal}
            onQuickRecordAction={handleQuickRecordAction}
          />
        </div>

        <div className={`battlefield-col away ${mobileActiveSide !== 'away' ? 'mobile-hidden' : ''}`}>
          <TeamActionColumn
            side="away"
            team={matchData.awayTeam}
            busy={editingDisabled}
            isPossessing={matchData.possessionSide === 'away'}
            onSwitchPossession={handleSwitchPossession}
            onOpenPlayerModal={handleOpenPlayerModal}
            onQuickRecordAction={handleQuickRecordAction}
          />
        </div>
      </div>

      {/* 底部面板：时间线流 + 技术统计实时微调 */}
      <div className="desk-bottom-row">
        <TimelineEventStream
          events={matchData.timeline}
          homeTeamName={matchData.homeTeam.shortName || matchData.homeTeam.name}
          awayTeamName={matchData.awayTeam.shortName || matchData.awayTeam.name}
          busy={editingDisabled}
          onDeleteEvent={handleDeleteEvent}
          penaltyShootout={matchData.penaltyShootout}
        />

        <LiveStatsPreviewBoard
          stats={matchData.stats}
          homeTeamName={matchData.homeTeam.shortName || matchData.homeTeam.name}
          awayTeamName={matchData.awayTeam.shortName || matchData.awayTeam.name}
          busy={editingDisabled}
          onUpdateStatsDelta={handleUpdateStatsDelta}
        />
      </div>


      {/* 进球/红黄牌/换人录入弹窗 */}
      <PlayerRemarkModal
        isOpen={Boolean(playerAction)}
        actionType={playerAction?.type ?? null}
        side={playerAction?.side ?? 'home'}
        goalType={playerAction?.goalType}
        eventTime={playerAction?.secondFormatted}
        teamName={
          playerAction?.side !== 'away'
            ? matchData.homeTeam.shortName || matchData.homeTeam.name
            : matchData.awayTeam.shortName || matchData.awayTeam.name
        }
        teamRoster={
          playerAction?.side !== 'away'
            ? { starters: matchData.homeTeam.starters, substitutes: matchData.homeTeam.substitutes }
            : { starters: matchData.awayTeam.starters, substitutes: matchData.awayTeam.substitutes }
        }
        onConfirm={handleConfirmPlayerModal}
        onClose={() => setPlayerAction(null)}
      />
    </div>
  );
};
