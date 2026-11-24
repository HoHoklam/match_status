import React, { useState, useEffect, useRef, useCallback } from 'react';
import { matchLiveService } from '../../api/matchLive.service';
import {
  MatchLiveSnapshot,
  LiveActionType,
  PossessionSide,
  LiveBroadcastMessage,
} from '@shared/types';
import { MatchClockPanel } from './MatchClockPanel';
import { TeamActionColumn } from './TeamActionColumn';
import { PossessionIndicator } from './PossessionIndicator';
import { TimelineEventStream } from './TimelineEventStream';
import { LiveStatsPreviewBoard } from './LiveStatsPreviewBoard';
import { PlayerRemarkModal } from './PlayerRemarkModal';
import { PenaltyShootoutDesk } from './PenaltyShootoutDesk';
import { RotateCcw, Undo2, Radio, CheckCircle, RefreshCw, ArrowLeft, FileEdit } from 'lucide-react';

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
  const [matchData, setMatchData] = useState<MatchLiveSnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isUndoing, setIsUndoing] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [inShootoutView, setInShootoutView] = useState<boolean>(false);
  const [mobileActiveSide, setMobileActiveSide] = useState<'home' | 'away'>('home');

  // 弹窗状态
  const [playerModalState, setPlayerModalState] = useState<{
    isOpen: boolean;
    actionType: LiveActionType | null;
    side: 'home' | 'away';
    goalType?: import('@shared/types').GoalType;
  }>({
    isOpen: false,
    actionType: null,
    side: 'home',
    goalType: undefined,
  });

  // 广播通道 BroadcastChannel
  const broadcastRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    try {
      broadcastRef.current = new BroadcastChannel('sztufa_live_bus');
    } catch {
      // ignore
    }
    return () => {
      broadcastRef.current?.close();
    };
  }, []);

  const broadcastUpdate = useCallback((snapshot: MatchLiveSnapshot) => {
    if (broadcastRef.current) {
      const msg: LiveBroadcastMessage = {
        type: 'MATCH_LIVE_UPDATE',
        matchId: snapshot.id,
        snapshot,
        timestamp: Date.now(),
      };
      broadcastRef.current.postMessage(msg);
    }
  }, []);

  const latestMatchDataRef = useRef<MatchLiveSnapshot | null>(matchData);
  useEffect(() => {
    latestMatchDataRef.current = matchData;
  });

  // 安全合并服务端快照：若比赛走表中，保障走表时钟与控球秒数不被覆盖回退
  const safeMergeSnapshot = useCallback((serverSnapshot: MatchLiveSnapshot) => {
    setMatchData((prev: MatchLiveSnapshot | null) => {
      if (!prev) return serverSnapshot;

      if (prev.clock.isRunning && serverSnapshot.clock.isRunning) {
        const safeSecond = Math.max(prev.clock.currentSecond, serverSnapshot.clock.currentSecond);
        const min = Math.floor(safeSecond / 60);
        const sec = safeSecond % 60;
        const displayTime = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
        const displayMinute = Math.max(1, Math.ceil(safeSecond / 60));

        const homeSec = Math.max(
          prev.stats.possession.homeSeconds || 0,
          serverSnapshot.stats.possession.homeSeconds || 0,
        );
        const awaySec = Math.max(
          prev.stats.possession.awaySeconds || 0,
          serverSnapshot.stats.possession.awaySeconds || 0,
        );
        const total = homeSec + awaySec;
        const homePct = total > 0 ? Math.round((homeSec / total) * 100) : 50;
        const awayPct = total > 0 ? 100 - homePct : 50;

        return {
          ...serverSnapshot,
          clock: {
            ...serverSnapshot.clock,
            currentSecond: safeSecond,
            displayMinute,
            displayTime,
          },
          stats: {
            ...serverSnapshot.stats,
            possession: {
              home: homePct,
              away: awayPct,
              homeSeconds: homeSec,
              awaySeconds: awaySec,
            },
          },
        };
      }

      return serverSnapshot;
    });
  }, []);

  // 赛况数据变更时（包含秒级走表），向 BroadcastChannel 广播最新快照
  useEffect(() => {
    if (matchData) {
      broadcastUpdate(matchData);
    }
  }, [matchData, broadcastUpdate]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const loadData = async (matchId: string) => {
    try {
      setLoading(true);
      const data = await matchLiveService.getLiveSnapshot(matchId);
      setMatchData(data);
      broadcastUpdate(data);
    } catch (err: any) {
      setError(err.message || '加载赛况失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    matchLiveService
      .getMatches()
      .then((res) => {
        setMatches(res);
        if (res.length > 0 && !selectedMatchId) {
          setSelectedMatchId(res[0].id);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (initialMatchId) {
      setSelectedMatchId(initialMatchId);
    }
  }, [initialMatchId]);

  useEffect(() => {
    if (selectedMatchId) {
      loadData(selectedMatchId);
    }
  }, [selectedMatchId]);

  // 本地时钟走字与控球秒数累计（每秒推进一次）
  useEffect(() => {
    if (!matchData?.clock.isRunning) return;

    const timer = setInterval(() => {
      setMatchData((prev: MatchLiveSnapshot | null) => {
        if (!prev || !prev.clock.isRunning) return prev;
        const newSec = prev.clock.currentSecond + 1;
        const min = Math.floor(newSec / 60);
        const sec = newSec % 60;
        const displayTime = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
        const displayMinute = Math.max(1, Math.ceil(newSec / 60));

        // 控球秒数递增（纯不可变状态计算，严防对象原地修改引发双倍累加）
        const currentHomeSec = prev.stats?.possession?.homeSeconds || 0;
        const currentAwaySec = prev.stats?.possession?.awaySeconds || 0;

        const newHomeSec = prev.possessionSide === 'home' ? currentHomeSec + 1 : currentHomeSec;
        const newAwaySec = prev.possessionSide === 'away' ? currentAwaySec + 1 : currentAwaySec;
        const total = newHomeSec + newAwaySec;
        const homePct = total > 0 ? Math.round((newHomeSec / total) * 100) : 50;
        const awayPct = total > 0 ? 100 - homePct : 50;

        return {
          ...prev,
          clock: {
            ...prev.clock,
            currentSecond: newSec,
            displayMinute,
            displayTime,
          },
          stats: {
            ...prev.stats,
            possession: {
              home: homePct,
              away: awayPct,
              homeSeconds: newHomeSec,
              awaySeconds: newAwaySec,
            },
          },
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [matchData?.clock.isRunning, matchData?.possessionSide]);

  // 定时每 10 秒将走表秒数推送到服务端持久化保存
  useEffect(() => {
    if (!matchData?.clock.isRunning) return;

    const syncInterval = setInterval(() => {
      const cur = latestMatchDataRef.current;
      if (cur && cur.clock.isRunning) {
        matchLiveService
          .updateClock(cur.id, {
            period: cur.clock.period,
            currentSecond: cur.clock.currentSecond,
            displayTime: cur.clock.displayTime,
          })
          .catch((err) => console.error('[LiveDesk] 定时时钟同步轻度异常:', err));
      }
    }, 10000);

    return () => clearInterval(syncInterval);
  }, [matchData?.id, matchData?.clock.isRunning]);

  // 控制时钟：开始/继续/恢复走时
  const handleStartClock = async () => {
    if (!matchData) return;
    const isResuming = matchData.clock.period === 'PAUSED';
    let targetPeriod = matchData.clock.period;
    if (targetPeriod === 'NOT_STARTED') {
      targetPeriod = 'FIRST_HALF';
    } else if (targetPeriod === 'PAUSED') {
      targetPeriod =
        matchData.clock.previousPeriod ||
        (matchData.clock.halfTimeMinute ? 'SECOND_HALF' : 'FIRST_HALF');
    }

    const updated = await matchLiveService.updateClock(matchData.id, {
      period: targetPeriod,
      currentSecond: matchData.clock.currentSecond,
      displayTime: matchData.clock.displayTime,
    });
    setMatchData(updated);
    broadcastUpdate(updated);
    showToast(isResuming ? '比赛走时已恢复 ▶' : '比赛走时已启动 ▶');
  };

  // 暂停
  const handlePauseClock = async () => {
    if (!matchData) return;
    const updated = await matchLiveService.updateClock(matchData.id, {
      period: 'PAUSED',
      currentSecond: matchData.clock.currentSecond,
      displayTime: matchData.clock.displayTime,
    });
    setMatchData(updated);
    broadcastUpdate(updated);
    showToast('比赛走时已暂停 ⏸');
  };

  // 中场休息直接进入（无需弹窗，使用创建比赛时设定的半场时长）
  const handleDirectHalfTime = async () => {
    if (!matchData) return;
    const targetHalfMinute = matchData.halfDuration || 45;
    const updated = await matchLiveService.updateClock(matchData.id, {
      period: 'HALF_TIME',
      confirmedMinute: targetHalfMinute,
      currentSecond: matchData.clock.currentSecond,
      displayTime: matchData.clock.displayTime,
    });
    setMatchData(updated);
    broadcastUpdate(updated);
    showToast(`已直接进入中场休息 (HT ${targetHalfMinute}')`);
  };

  // 开始下半场
  const handleStartSecondHalf = async () => {
    if (!matchData) return;
    const updated = await matchLiveService.updateClock(matchData.id, {
      period: 'SECOND_HALF',
    });
    setMatchData(updated);
    broadcastUpdate(updated);
    showToast(`下半场比赛正式开球 ▶ (第 ${updated.clock.secondHalfStartMinute}')`);
  };

  // 比赛结束 (常规时间完赛，未进行点球大战)
  const handleFinishMatch = async () => {
    if (!matchData) return;
    if (window.confirm('确定要全场结束本场比赛吗？比赛结果将锁定为最终比分。')) {
      const updated = await matchLiveService.updateClock(matchData.id, {
        period: 'FINISHED',
        currentSecond: matchData.clock.currentSecond,
        displayTime: matchData.clock.displayTime,
        penaltyShootout: null, // 常规比赛结束，显式重置/清除点球大战数据
      });
      setMatchData(updated);
      broadcastUpdate(updated);
      showToast('全场比赛已结束 (FT) 🏁');
    }
  };

  // 切换控球方
  const handleSwitchPossession = async (side: PossessionSide) => {
    if (!matchData) return;
    const currentSec = matchData.clock.currentSecond;
    const displayTime = matchData.clock.displayTime;
    const displayMinute = matchData.clock.displayMinute;

    const updated = await matchLiveService.switchPossession(matchData.id, {
      side,
      homeSeconds: matchData.stats.possession.homeSeconds,
      awaySeconds: matchData.stats.possession.awaySeconds,
      currentSecond: currentSec,
      displayTime,
      displayMinute,
    });
    safeMergeSnapshot(updated);
    const sideName =
      side === 'home'
        ? matchData.homeTeam.shortName || matchData.homeTeam.name
        : side === 'away'
        ? matchData.awayTeam.shortName || matchData.awayTeam.name
        : '中立争夺';
    showToast(`控球方已切换至: ${sideName}`);
  };

  // 快捷打点纯统计动作 (射门/角球/任意球/犯规)
  const handleQuickRecordAction = async (
    actionType: LiveActionType,
    side: 'home' | 'away',
    isShotOnTarget?: boolean,
  ) => {
    if (!matchData) return;
    const updated = await matchLiveService.recordAction(matchData.id, {
      type: actionType,
      side,
      minute: matchData.clock.displayMinute,
      secondFormatted: matchData.clock.displayTime,
      isShotOnTarget,
    });
    safeMergeSnapshot(updated);
    const sideName =
      side === 'home'
        ? matchData.homeTeam.shortName || matchData.homeTeam.name
        : matchData.awayTeam.shortName || matchData.awayTeam.name;
    showToast(`${sideName} ${actionType} 数据已累加 (+1)`);
  };

  // 录入带球员信息的重大事件 (进球/点球/乌龙球/红黄牌/换人)
  const handleConfirmPlayerModal = async (data: {
    playerName?: string;
    playerNumber?: number;
    assistPlayerName?: string;
    subInPlayerName?: string;
    subOutPlayerName?: string;
    reason?: string;
    goalType?: import('@shared/types').GoalType;
    penaltyScored?: boolean;
  }) => {
    if (!matchData || !playerModalState.actionType) return;
    try {
      const updated = await matchLiveService.recordAction(matchData.id, {
        type: playerModalState.actionType,
        side: playerModalState.side,
        goalType: data.goalType || playerModalState.goalType,
        minute: matchData.clock.displayMinute,
        secondFormatted: matchData.clock.displayTime,
        playerName: data.playerName,
        playerNumber: data.playerNumber,
        assistPlayerName: data.assistPlayerName,
        subInPlayerName: data.subInPlayerName,
        subOutPlayerName: data.subOutPlayerName,
        reason: data.reason,
        penaltyScored: data.penaltyScored,
      });
      setPlayerModalState({ isOpen: false, actionType: null, side: 'home', goalType: undefined });
      safeMergeSnapshot(updated);
      showToast(`重大事件已记录并广播同步 ⚽/🎯/🥅/🟨/🟥/🔄`);
    } catch (err: any) {
      console.error('事件录入失败:', err);
      alert(`事件录入失败: ${err.message || '网络或接口异常'}`);
    }
  };

  // 手动微调统计数值
  const handleUpdateStatsDelta = async (
    statKey: 'shots' | 'shotsOnTarget' | 'cornerKicks' | 'freeKicks' | 'fouls' | 'yellowCards' | 'redCards',
    side: 'home' | 'away',
    delta: number,
  ) => {
    if (!matchData) return;
    const updated = await matchLiveService.updateStatsDelta(matchData.id, {
      statKey,
      side,
      delta,
    });
    safeMergeSnapshot(updated);
  };

  // 删除事件
  const handleDeleteEvent = async (eventId: string) => {
    if (!matchData) return;
    if (window.confirm('确定删除该事件？关联的比分与统计将自动反向扣减回退。')) {
      const updated = await matchLiveService.deleteTimelineEvent(matchData.id, eventId);
      safeMergeSnapshot(updated);
      showToast('事件已删除，比分与统计已同步扣减');
    }
  };

  // 撤销上一步操作
  const handleUndo = useCallback(async () => {
    if (!matchData) return;
    setIsUndoing(true);
    setTimeout(() => setIsUndoing(false), 1000);
    const updated = await matchLiveService.undo(matchData.id);
    setMatchData(updated);
    broadcastUpdate(updated);
    showToast('已撤销上一次操作 (Undo) ↩️');
  }, [matchData, broadcastUpdate]);

  // 键盘快捷键监听：Ctrl+Z 撤销
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (!playerModalState.isOpen) {
          e.preventDefault();
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleUndo, playerModalState.isOpen]);

  // 重置比赛（彻底清空所有实时数据，恢复为比赛前状态）
  const handleReset = async () => {
    if (!matchData) return;
    if (
      window.confirm(
        '确定要完全重置本场比赛吗？\n所有比分、走表、开球时间、事件流水与技术统计将被彻底清除，恢复为赛前就绪状态（保留球队信息与参赛名单）。',
      )
    ) {
      setIsResetting(true);
      setTimeout(() => setIsResetting(false), 1000);
      const updated = await matchLiveService.reset(matchData.id);
      setMatchData(updated);
      broadcastUpdate(updated);
      showToast('比赛已彻底重置为开赛前状态 🔄');
    }
  };

  if (loading && !matchData) {
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
        {toastMessage && (
          <div className="desk-toast-pill">
            <CheckCircle size={16} color="#34d399" />
            <span>{toastMessage}</span>
          </div>
        )}
        <PenaltyShootoutDesk
          matchData={matchData}
          onBackToDesk={() => setInShootoutView(false)}
          onFinishMatchSuccess={(updated) => {
            setMatchData(updated);
            setInShootoutView(false);
            showToast('点球大战完赛，结果已锁定 🏁');
          }}
          broadcastUpdate={broadcastUpdate}
        />
      </div>
    );
  }

  return (
    <div className="live-desk-container">
      {/* 操作反馈轻提示 Toast */}
      {toastMessage && (
        <div className="desk-toast-pill">
          <CheckCircle size={16} color="#34d399" />
          <span>{toastMessage}</span>
        </div>
      )}

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
            className={`action-btn secondary ${isUndoing ? 'btn-clicked' : ''}`}
            onClick={handleUndo}
            title="撤销上一次操作 (支持快捷键 Ctrl+Z)"
          >
            <Undo2 size={14} /> 撤销 (Ctrl+Z)
          </button>
          <button
            className={`action-btn secondary ${isResetting ? 'btn-clicked' : ''}`}
            onClick={handleReset}
            title="完全重置本场比赛数据为开赛前状态"
          >
            <RotateCcw size={14} /> 重置 (Reset)
          </button>
        </div>
      </div>

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
          clock={matchData.clock}
          kickoffTime={matchData.kickoffTime}
          onStart={handleStartClock}
          onPause={handlePauseClock}
          onOpenHalfTimeModal={handleDirectHalfTime}
          onStartSecondHalf={handleStartSecondHalf}
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
            isPossessing={matchData.possessionSide === 'home'}
            onSwitchPossession={handleSwitchPossession}
            onOpenPlayerModal={(type, side, goalType) =>
              setPlayerModalState({ isOpen: true, actionType: type, side, goalType })
            }
            onQuickRecordAction={handleQuickRecordAction}
          />
        </div>

        <div className={`battlefield-col away ${mobileActiveSide !== 'away' ? 'mobile-hidden' : ''}`}>
          <TeamActionColumn
            side="away"
            team={matchData.awayTeam}
            isPossessing={matchData.possessionSide === 'away'}
            onSwitchPossession={handleSwitchPossession}
            onOpenPlayerModal={(type, side, goalType) =>
              setPlayerModalState({ isOpen: true, actionType: type, side, goalType })
            }
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
          onDeleteEvent={handleDeleteEvent}
          penaltyShootout={matchData.penaltyShootout}
        />

        <LiveStatsPreviewBoard
          stats={matchData.stats}
          homeTeamName={matchData.homeTeam.shortName || matchData.homeTeam.name}
          awayTeamName={matchData.awayTeam.shortName || matchData.awayTeam.name}
          onUpdateStatsDelta={handleUpdateStatsDelta}
        />
      </div>


      {/* 进球/红黄牌/换人录入弹窗 */}
      <PlayerRemarkModal
        isOpen={playerModalState.isOpen}
        actionType={playerModalState.actionType}
        side={playerModalState.side}
        goalType={playerModalState.goalType}
        teamName={
          playerModalState.side === 'home'
            ? matchData.homeTeam.shortName || matchData.homeTeam.name
            : matchData.awayTeam.shortName || matchData.awayTeam.name
        }
        teamRoster={
          playerModalState.side === 'home'
            ? { starters: matchData.homeTeam.starters, substitutes: matchData.homeTeam.substitutes }
            : { starters: matchData.awayTeam.starters, substitutes: matchData.awayTeam.substitutes }
        }
        onConfirm={handleConfirmPlayerModal}
        onClose={() => setPlayerModalState({ isOpen: false, actionType: null, side: 'home', goalType: undefined })}
      />
    </div>
  );
};
