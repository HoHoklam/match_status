import React, { useState, useEffect, useMemo } from 'react';
import {
  MatchLiveSnapshot,
  PenaltyKickRecord,
  PenaltyShootoutState,
  PlayerInfo,
} from '@shared/types';
import { matchLiveService } from '../../api/matchLive.service';
import { ArrowLeft, Plus, Square, Trophy, Trash2, RotateCcw } from 'lucide-react';
import { resolveColorHex } from '../../utils/colorHelper';

interface PenaltyShootoutDeskProps {
  matchData: MatchLiveSnapshot;
  onBackToDesk: () => void;
  onFinishMatchSuccess: (updatedMatch: MatchLiveSnapshot) => void;
  broadcastUpdate: (snapshot: MatchLiveSnapshot) => void;
}

export const PenaltyShootoutDesk: React.FC<PenaltyShootoutDeskProps> = ({
  matchData,
  onBackToDesk,
  onFinishMatchSuccess,
  broadcastUpdate,
}) => {
  const [roundsCount, setRoundsCount] = useState<number>(() => {
    return matchData.penaltyShootout?.roundsCount || 5;
  });

  const [homeKicks, setHomeKicks] = useState<PenaltyKickRecord[]>(() => {
    if (matchData.penaltyShootout?.homeKicks?.length) {
      return matchData.penaltyShootout.homeKicks.map((k) => ({
        ...k,
        status: k.status || (k.isAttempted ? (k.scored ? 'scored' : 'missed') : undefined),
        isAttempted:
          k.isAttempted !== undefined
            ? k.isAttempted
            : Boolean(k.playerName && k.scored !== undefined),
      }));
    }
    return Array.from({ length: 5 }, (_, i) => ({
      round: i + 1,
      side: 'home',
      playerName: '',
      playerNumber: undefined,
      scored: false,
      status: undefined,
      isAttempted: false,
      scoreAfterKick: '',
    }));
  });

  const [awayKicks, setAwayKicks] = useState<PenaltyKickRecord[]>(() => {
    if (matchData.penaltyShootout?.awayKicks?.length) {
      return matchData.penaltyShootout.awayKicks.map((k) => ({
        ...k,
        status: k.status || (k.isAttempted ? (k.scored ? 'scored' : 'missed') : undefined),
        isAttempted:
          k.isAttempted !== undefined
            ? k.isAttempted
            : Boolean(k.playerName && k.scored !== undefined),
      }));
    }
    return Array.from({ length: 5 }, (_, i) => ({
      round: i + 1,
      side: 'away',
      playerName: '',
      playerNumber: undefined,
      scored: false,
      status: undefined,
      isAttempted: false,
      scoreAfterKick: '',
    }));
  });

  // 双方可选大名单列表
  const homeRoster: PlayerInfo[] = useMemo(() => {
    const list = [...(matchData.homeTeam.starters || []), ...(matchData.homeTeam.substitutes || [])];
    return list.filter((p) => p.name.trim() !== '');
  }, [matchData.homeTeam]);

  const awayRoster: PlayerInfo[] = useMemo(() => {
    const list = [...(matchData.awayTeam.starters || []), ...(matchData.awayTeam.substitutes || [])];
    return list.filter((p) => p.name.trim() !== '');
  }, [matchData.awayTeam]);

  // 计算实时点球比分与各球后大比分
  const { homeScore, awayScore, calculatedHomeKicks, calculatedAwayKicks } = useMemo(() => {
    let curHome = 0;
    let curAway = 0;

    const newHomeKicks: PenaltyKickRecord[] = [];
    const newAwayKicks: PenaltyKickRecord[] = [];

    const maxR = Math.max(roundsCount, homeKicks.length, awayKicks.length);

    for (let r = 1; r <= maxR; r++) {
      const hk = homeKicks.find((k) => k.round === r) || {
        round: r,
        side: 'home' as const,
        playerName: '',
        scored: false,
        status: undefined,
        isAttempted: false,
      };
      const ak = awayKicks.find((k) => k.round === r) || {
        round: r,
        side: 'away' as const,
        playerName: '',
        scored: false,
        status: undefined,
        isAttempted: false,
      };

      const hkAttempted = Boolean(hk.playerName && (hk.isAttempted || hk.status));
      if (hkAttempted && hk.scored) {
        curHome++;
      }
      const homeScoreAfter = `${curHome}-${curAway}`;

      const akAttempted = Boolean(ak.playerName && (ak.isAttempted || ak.status));
      if (akAttempted && ak.scored) {
        curAway++;
      }
      const awayScoreAfter = `${curHome}-${curAway}`;

      newHomeKicks.push({
        ...hk,
        isAttempted: hkAttempted,
        scoreAfterKick: homeScoreAfter,
      });

      newAwayKicks.push({
        ...ak,
        isAttempted: akAttempted,
        scoreAfterKick: awayScoreAfter,
      });
    }

    return {
      homeScore: curHome,
      awayScore: curAway,
      calculatedHomeKicks: newHomeKicks,
      calculatedAwayKicks: newAwayKicks,
    };
  }, [roundsCount, homeKicks, awayKicks]);

  // 人为确认胜者：默认依据比分预选
  const [winnerSide, setWinnerSide] = useState<'home' | 'away' | null>(() => {
    if (matchData.penaltyShootout?.winnerSide) {
      return matchData.penaltyShootout.winnerSide;
    }
    return null;
  });

  // 首发罚球方（根据第1轮录入动作自动记录）
  const [firstKickSide, setFirstKickSide] = useState<'home' | 'away' | null>(() => {
    return matchData.penaltyShootout?.firstKickSide || null;
  });

  // 当比分变化时，如果未人为手动指定或平局打破，预设胜者
  useEffect(() => {
    if (homeScore > awayScore) {
      setWinnerSide('home');
    } else if (awayScore > homeScore) {
      setWinnerSide('away');
    }
  }, [homeScore, awayScore]);

  // 同步点球快照并广播
  const syncShootoutState = async (
    customHomeKicks = calculatedHomeKicks,
    customAwayKicks = calculatedAwayKicks,
    customWinner = winnerSide,
    customRounds = roundsCount,
    customFirstKickSide = firstKickSide
  ) => {
    try {
      const state: PenaltyShootoutState = {
        enabled: true,
        homeScore,
        awayScore,
        winnerSide: customWinner,
        roundsCount: customRounds,
        homeKicks: customHomeKicks,
        awayKicks: customAwayKicks,
        isCompleted: false,
        firstKickSide: customFirstKickSide,
      };

      const updated = await matchLiveService.updatePenaltyShootout(matchData.id, state);
      broadcastUpdate(updated);
    } catch (err) {
      console.error('同步点球状态失败:', err);
    }
  };

  // 修改球员选择
  const handlePlayerChange = (side: 'home' | 'away', round: number, playerName: string) => {
    let nextFirst = firstKickSide;
    if (!nextFirst && playerName.trim()) {
      nextFirst = side;
      setFirstKickSide(side);
    }

    if (side === 'home') {
      setHomeKicks((prev) => {
        const next = [...prev];
        const idx = next.findIndex((k) => k.round === round);
        const found = homeRoster.find((p) => p.name === playerName);
        if (idx >= 0) {
          next[idx] = {
            ...next[idx],
            playerName,
            playerNumber: found?.number,
          };
        } else {
          next.push({
            round,
            side: 'home',
            playerName,
            playerNumber: found?.number,
            scored: false,
            status: undefined,
            isAttempted: false,
          });
        }
        syncShootoutState(next, awayKicks, winnerSide, roundsCount, nextFirst);
        return next;
      });
    } else {
      setAwayKicks((prev) => {
        const next = [...prev];
        const idx = next.findIndex((k) => k.round === round);
        const found = awayRoster.find((p) => p.name === playerName);
        if (idx >= 0) {
          next[idx] = {
            ...next[idx],
            playerName,
            playerNumber: found?.number,
          };
        } else {
          next.push({
            round,
            side: 'away',
            playerName,
            playerNumber: found?.number,
            scored: false,
            status: undefined,
            isAttempted: false,
          });
        }
        syncShootoutState(homeKicks, next, winnerSide, roundsCount, nextFirst);
        return next;
      });
    }
  };

  // 修改罚进 / 罚失状态 (二选一，点击当前状态可反选撤销恢复待罚)
  const handleKickStatusChange = (
    side: 'home' | 'away',
    round: number,
    targetStatus: 'scored' | 'missed'
  ) => {
    let nextFirst = firstKickSide;
    if (!nextFirst) {
      nextFirst = side;
      setFirstKickSide(side);
    }

    if (side === 'home') {
      setHomeKicks((prev) => {
        const next = [...prev];
        const idx = next.findIndex((k) => k.round === round);
        if (idx >= 0) {
          const current = next[idx];
          const isTogglingOff = current.status === targetStatus;
          const newStatus = isTogglingOff ? undefined : targetStatus;
          const newScored = isTogglingOff ? false : targetStatus === 'scored';
          const newAttempted = !isTogglingOff;
          next[idx] = {
            ...current,
            status: newStatus,
            scored: newScored,
            isAttempted: newAttempted,
          };
        } else {
          next.push({
            round,
            side: 'home',
            playerName: '',
            scored: targetStatus === 'scored',
            status: targetStatus,
            isAttempted: true,
          });
        }
        syncShootoutState(next, awayKicks, winnerSide, roundsCount, nextFirst);
        return next;
      });
    } else {
      setAwayKicks((prev) => {
        const next = [...prev];
        const idx = next.findIndex((k) => k.round === round);
        if (idx >= 0) {
          const current = next[idx];
          const isTogglingOff = current.status === targetStatus;
          const newStatus = isTogglingOff ? undefined : targetStatus;
          const newScored = isTogglingOff ? false : targetStatus === 'scored';
          const newAttempted = !isTogglingOff;
          next[idx] = {
            ...current,
            status: newStatus,
            scored: newScored,
            isAttempted: newAttempted,
          };
        } else {
          next.push({
            round,
            side: 'away',
            playerName: '',
            scored: targetStatus === 'scored',
            status: targetStatus,
            isAttempted: true,
          });
        }
        syncShootoutState(homeKicks, next, winnerSide, roundsCount, nextFirst);
        return next;
      });
    }
  };

  // 重置当前点球大战数据
  const handleResetShootout = async () => {
    if (
      window.confirm(
        '确定要重置当前点球大战数据吗？\n所有点球轮次、比分与主罚记录将被彻底清空。'
      )
    ) {
      const initialHome: PenaltyKickRecord[] = Array.from({ length: 5 }, (_, i) => ({
        round: i + 1,
        side: 'home',
        playerName: '',
        playerNumber: undefined,
        scored: false,
        status: undefined,
        isAttempted: false,
        scoreAfterKick: '',
      }));
      const initialAway: PenaltyKickRecord[] = Array.from({ length: 5 }, (_, i) => ({
        round: i + 1,
        side: 'away',
        playerName: '',
        playerNumber: undefined,
        scored: false,
        status: undefined,
        isAttempted: false,
        scoreAfterKick: '',
      }));
      setRoundsCount(5);
      setHomeKicks(initialHome);
      setAwayKicks(initialAway);
      setWinnerSide(null);
      setFirstKickSide(null);

      const emptyState: PenaltyShootoutState = {
        enabled: true,
        homeScore: 0,
        awayScore: 0,
        winnerSide: null,
        roundsCount: 5,
        homeKicks: initialHome,
        awayKicks: initialAway,
        isCompleted: false,
        firstKickSide: null,
      };
      try {
        const updated = await matchLiveService.updatePenaltyShootout(matchData.id, emptyState);
        broadcastUpdate(updated);
      } catch (err) {
        console.error('重置点球大战失败:', err);
      }
    }
  };

  // 删除 / 清空轮次
  const handleDeleteOrClearRound = (side: 'home' | 'away', round: number) => {
    if (round <= 5) {
      // 1~5 轮：仅清空已选球员和主罚状态，保留空白行以便重新录入
      if (side === 'home') {
        setHomeKicks((prev) => {
          const next = prev.map((k) =>
            k.round === round
              ? {
                  ...k,
                  playerName: '',
                  playerNumber: undefined,
                  scored: false,
                  status: undefined,
                  isAttempted: false,
                }
              : k
          );
          syncShootoutState(next, awayKicks);
          return next;
        });
      } else {
        setAwayKicks((prev) => {
          const next = prev.map((k) =>
            k.round === round
              ? {
                  ...k,
                  playerName: '',
                  playerNumber: undefined,
                  scored: false,
                  status: undefined,
                  isAttempted: false,
                }
              : k
          );
          syncShootoutState(homeKicks, next);
          return next;
        });
      }
    } else {
      // 第 6 轮及以上追加轮次
      const otherKicks = side === 'home' ? awayKicks : homeKicks;
      const thisKicks = side === 'home' ? homeKicks : awayKicks;
      const otherKick = otherKicks.find((k) => k.round === round);
      const thisKick = thisKicks.find((k) => k.round === round);

      // 若双方当前轮均有录入数据，优先清空当前侧
      if (thisKick?.playerName && otherKick?.playerName) {
        if (side === 'home') {
          setHomeKicks((prev) => {
            const next = prev.map((k) =>
              k.round === round
                ? {
                    ...k,
                    playerName: '',
                    playerNumber: undefined,
                    scored: false,
                    status: undefined,
                    isAttempted: false,
                  }
                : k
            );
            syncShootoutState(next, awayKicks);
            return next;
          });
        } else {
          setAwayKicks((prev) => {
            const next = prev.map((k) =>
              k.round === round
                ? {
                    ...k,
                    playerName: '',
                    playerNumber: undefined,
                    scored: false,
                    status: undefined,
                    isAttempted: false,
                  }
                : k
            );
            syncShootoutState(homeKicks, next);
            return next;
          });
        }
      } else {
        // 移除该追加轮次并重新对后续轮次编号
        const nextRounds = Math.max(5, roundsCount - 1);
        setRoundsCount(nextRounds);

        const filterAndReindex = (kicks: PenaltyKickRecord[]) => {
          return kicks
            .filter((k) => k.round !== round)
            .map((k) => {
              if (k.round > round) {
                return { ...k, round: k.round - 1 };
              }
              return k;
            });
        };

        const nextHome = filterAndReindex(homeKicks);
        const nextAway = filterAndReindex(awayKicks);
        setHomeKicks(nextHome);
        setAwayKicks(nextAway);
        syncShootoutState(nextHome, nextAway, winnerSide, nextRounds);
      }
    }
  };

  // 增加轮次
  const handleAddRound = () => {
    const nextRound = roundsCount + 1;
    setRoundsCount(nextRound);
    const newHomeRound: PenaltyKickRecord = {
      round: nextRound,
      side: 'home',
      playerName: '',
      scored: false,
      status: undefined,
      isAttempted: false,
    };
    const newAwayRound: PenaltyKickRecord = {
      round: nextRound,
      side: 'away',
      playerName: '',
      scored: false,
      status: undefined,
      isAttempted: false,
    };
    const nextHome = [...homeKicks, newHomeRound];
    const nextAway = [...awayKicks, newAwayRound];
    setHomeKicks(nextHome);
    setAwayKicks(nextAway);
    syncShootoutState(nextHome, nextAway, winnerSide, nextRound);
  };

  // 全场比赛结束提交
  const handleFinishMatch = async () => {
    if (!winnerSide) {
      if (!window.confirm('当前尚未明确选择点球大战胜方，是否直接按当前比分确认完赛？')) {
        return;
      }
    } else {
      const winnerName =
        winnerSide === 'home' ? matchData.homeTeam.name : matchData.awayTeam.name;
      if (
        !window.confirm(
          `确认以点球大战比分 [${homeScore}-${awayScore}]，判定【${winnerName}】胜出并全场完赛吗？`
        )
      ) {
        return;
      }
    }

    try {
      const finalShootout: PenaltyShootoutState = {
        enabled: true,
        homeScore,
        awayScore,
        winnerSide,
        roundsCount,
        homeKicks: calculatedHomeKicks.filter((k) => k.playerName && (k.isAttempted || k.status)),
        awayKicks: calculatedAwayKicks.filter((k) => k.playerName && (k.isAttempted || k.status)),
        isCompleted: true,
      };

      const updated = await matchLiveService.updateClock(matchData.id, {
        period: 'FINISHED',
        currentSecond: matchData.clock.currentSecond,
        displayTime: matchData.clock.displayTime,
        penaltyShootout: finalShootout,
      });

      broadcastUpdate(updated);
      onFinishMatchSuccess(updated);
    } catch (err: any) {
      alert(`完赛失败: ${err.message || '未知错误'}`);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', color: '#1e293b' }}>
      {/* 顶部导航与操作栏 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <button
          className="mgmt-btn mgmt-btn-secondary"
          onClick={onBackToDesk}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
        >
          <ArrowLeft size={16} /> 返回比赛操作台
        </button>

        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
            ⚽ 点球大战录入控制台
          </h2>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            {matchData.title} · 常规时间比分 {matchData.score.home} : {matchData.score.away}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="mgmt-btn mgmt-btn-secondary"
            onClick={handleResetShootout}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              color: '#dc2626',
              border: '1px solid #fca5a5',
              background: '#fff',
              borderRadius: '8px',
            }}
            title="清空当前点球大战的所有轮次与比分记录"
          >
            <RotateCcw size={15} /> 重置点球数据
          </button>

          <button
            className="action-btn danger"
            onClick={handleFinishMatch}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Square size={16} /> 全场比赛结束
          </button>
        </div>
      </div>

      {/* 核心战报与比分卡片 */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '20px 28px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          marginBottom: '24px',
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* 主队 */}
        <div>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: resolveColorHex(matchData.homeTeam.primaryColor),
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 8px',
              fontWeight: 800,
              fontSize: '1.2rem',
            }}
          >
            {matchData.homeTeam.name.charAt(0)}
          </div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{matchData.homeTeam.name}</div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            {matchData.homeTeam.college || '主队'}
          </div>
        </div>

        {/* 居中比分 */}
        <div style={{ padding: '0 24px' }}>
          <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>
            常规时间 {matchData.score.home} : {matchData.score.away}
          </div>
          <div
            style={{
              fontSize: '2.5rem',
              fontWeight: 900,
              color: '#0f172a',
              letterSpacing: '2px',
              lineHeight: 1,
            }}
          >
            {homeScore} : {awayScore}
          </div>
          <div
            style={{
              display: 'inline-block',
              background: '#dcfce7',
              color: '#15803d',
              padding: '3px 12px',
              borderRadius: '9999px',
              fontSize: '0.82rem',
              fontWeight: 700,
              marginTop: '8px',
            }}
          >
            点球大战进行中 · 共 {roundsCount} 轮
          </div>
        </div>

        {/* 客队 */}
        <div>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: resolveColorHex(matchData.awayTeam.primaryColor),
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 8px',
              fontWeight: 800,
              fontSize: '1.2rem',
            }}
          >
            {matchData.awayTeam.name.charAt(0)}
          </div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{matchData.awayTeam.name}</div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            {matchData.awayTeam.college || '客队'}
          </div>
        </div>
      </div>

      {/* 主客队两大点球录入板块 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* 主队板块 */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '12px',
              borderBottom: '1px solid #f1f5f9',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: resolveColorHex(matchData.homeTeam.primaryColor),
                }}
              />
              <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                {matchData.homeTeam.name} 点球手
              </span>
            </div>
            <span
              style={{
                fontSize: '0.9rem',
                fontWeight: 700,
                color: '#15803d',
                background: '#f0fdf4',
                padding: '2px 8px',
                borderRadius: '6px',
              }}
            >
              进球: {homeScore}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Array.from({ length: roundsCount }, (_, i) => i + 1).map((round) => {
              const kick = calculatedHomeKicks.find((k) => k.round === round) || {
                round,
                side: 'home' as const,
                playerName: '',
                scored: false,
              };

              return (
                <div
                  key={`home-round-${round}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                  }}
                >
                  <span
                    style={{
                      width: '60px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: '#64748b',
                    }}
                  >
                    第 {round} 轮
                  </span>

                  {/* 仅限大名单下拉选择 */}
                  <select
                    value={kick.playerName || ''}
                    onChange={(e) => handlePlayerChange('home', round, e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      background: '#fff',
                      color: '#0f172a',
                    }}
                  >
                    <option value="">-- 请点选大名单球员 --</option>
                    <optgroup label="首发阵容">
                      {matchData.homeTeam.starters?.map((p) => (
                        <option key={`h-starters-${p.number}`} value={p.name}>
                          {p.number}号 {p.name}
                        </option>
                      ))}
                    </optgroup>
                    {Boolean(matchData.homeTeam.substitutes?.length) && (
                      <optgroup label="替补名单">
                        {matchData.homeTeam.substitutes?.map((p) => (
                          <option key={`h-sub-${p.number}`} value={p.name}>
                            {p.number}号 {p.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>

                  {/* 罚进与罚失二选一按钮组 + 删除选项 */}
                  <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleKickStatusChange('home', round, 'scored')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        border:
                          kick.status === 'scored' ? '1px solid #86efac' : '1px solid #e2e8f0',
                        background: kick.status === 'scored' ? '#dcfce7' : '#ffffff',
                        color: kick.status === 'scored' ? '#15803d' : '#64748b',
                        boxShadow:
                          kick.status === 'scored'
                            ? '0 1px 3px rgba(21, 128, 61, 0.15)'
                            : 'none',
                      }}
                      title="标记为罚进 (进球 +1)"
                    >
                      ⚽ 罚进
                    </button>

                    <button
                      type="button"
                      onClick={() => handleKickStatusChange('home', round, 'missed')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        border:
                          kick.status === 'missed' ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                        background: kick.status === 'missed' ? '#fee2e2' : '#ffffff',
                        color: kick.status === 'missed' ? '#b91c1c' : '#64748b',
                        boxShadow:
                          kick.status === 'missed'
                            ? '0 1px 3px rgba(185, 28, 28, 0.15)'
                            : 'none',
                      }}
                      title="标记为罚失 (不计进球)"
                    >
                      ❌ 罚失
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteOrClearRound('home', round)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#ef4444';
                        e.currentTarget.style.borderColor = '#fca5a5';
                        e.currentTarget.style.background = '#fef2f2';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#94a3b8';
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.background = '#ffffff';
                      }}
                      title={round <= 5 ? '清空本轮录入 (重置为空白行)' : '移除此追加轮次'}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 客队板块 */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '12px',
              borderBottom: '1px solid #f1f5f9',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: resolveColorHex(matchData.awayTeam.primaryColor),
                }}
              />
              <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                {matchData.awayTeam.name} 点球手
              </span>
            </div>
            <span
              style={{
                fontSize: '0.9rem',
                fontWeight: 700,
                color: '#15803d',
                background: '#f0fdf4',
                padding: '2px 8px',
                borderRadius: '6px',
              }}
            >
              进球: {awayScore}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Array.from({ length: roundsCount }, (_, i) => i + 1).map((round) => {
              const kick = calculatedAwayKicks.find((k) => k.round === round) || {
                round,
                side: 'away' as const,
                playerName: '',
                scored: false,
              };

              return (
                <div
                  key={`away-round-${round}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                  }}
                >
                  <span
                    style={{
                      width: '60px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: '#64748b',
                    }}
                  >
                    第 {round} 轮
                  </span>

                  {/* 仅限大名单下拉选择 */}
                  <select
                    value={kick.playerName || ''}
                    onChange={(e) => handlePlayerChange('away', round, e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      background: '#fff',
                      color: '#0f172a',
                    }}
                  >
                    <option value="">-- 请点选大名单球员 --</option>
                    <optgroup label="首发阵容">
                      {matchData.awayTeam.starters?.map((p) => (
                        <option key={`a-starters-${p.number}`} value={p.name}>
                          {p.number}号 {p.name}
                        </option>
                      ))}
                    </optgroup>
                    {Boolean(matchData.awayTeam.substitutes?.length) && (
                      <optgroup label="替补名单">
                        {matchData.awayTeam.substitutes?.map((p) => (
                          <option key={`a-sub-${p.number}`} value={p.name}>
                            {p.number}号 {p.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>

                  {/* 罚进与罚失二选一按钮组 + 删除选项 */}
                  <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleKickStatusChange('away', round, 'scored')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        border:
                          kick.status === 'scored' ? '1px solid #86efac' : '1px solid #e2e8f0',
                        background: kick.status === 'scored' ? '#dcfce7' : '#ffffff',
                        color: kick.status === 'scored' ? '#15803d' : '#64748b',
                        boxShadow:
                          kick.status === 'scored'
                            ? '0 1px 3px rgba(21, 128, 61, 0.15)'
                            : 'none',
                      }}
                      title="标记为罚进 (进球 +1)"
                    >
                      ⚽ 罚进
                    </button>

                    <button
                      type="button"
                      onClick={() => handleKickStatusChange('away', round, 'missed')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        border:
                          kick.status === 'missed' ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                        background: kick.status === 'missed' ? '#fee2e2' : '#ffffff',
                        color: kick.status === 'missed' ? '#b91c1c' : '#64748b',
                        boxShadow:
                          kick.status === 'missed'
                            ? '0 1px 3px rgba(185, 28, 28, 0.15)'
                            : 'none',
                      }}
                      title="标记为罚失 (不计进球)"
                    >
                      ❌ 罚失
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteOrClearRound('away', round)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#ef4444';
                        e.currentTarget.style.borderColor = '#fca5a5';
                        e.currentTarget.style.background = '#fef2f2';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#94a3b8';
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.background = '#ffffff';
                      }}
                      title={round <= 5 ? '清空本轮录入 (重置为空白行)' : '移除此追加轮次'}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5轮后自由追加轮次按钮 */}
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <button
          className="mgmt-btn mgmt-btn-secondary"
          onClick={handleAddRound}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 24px',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
            borderColor: '#94a3b8',
          }}
        >
          <Plus size={16} /> 追加第 {roundsCount + 1} 轮点球（猝死制）
        </button>
      </div>

      {/* 人为判定胜者区域 */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          marginTop: '24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '1.1rem',
            fontWeight: 800,
            marginBottom: '12px',
          }}
        >
          <Trophy size={20} color="#eab308" />
          <span>人为判断点球大战最终胜者</span>
        </div>
        <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 16px' }}>
          系统已依据实时点球数（{homeScore} : {awayScore}）为您预设胜方，裁判员可在此人为校准确认：
        </p>

        <div style={{ display: 'inline-flex', gap: '24px', marginBottom: '20px' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '12px',
              border: winnerSide === 'home' ? '2px solid #2563eb' : '1px solid #cbd5e1',
              background: winnerSide === 'home' ? '#eff6ff' : '#fff',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '1rem',
            }}
          >
            <input
              type="radio"
              name="winnerGroup"
              checked={winnerSide === 'home'}
              onChange={() => {
                setWinnerSide('home');
                syncShootoutState(calculatedHomeKicks, calculatedAwayKicks, 'home');
              }}
              style={{ accentColor: '#2563eb' }}
            />
            <span>主队胜出 ({matchData.homeTeam.name})</span>
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '12px',
              border: winnerSide === 'away' ? '2px solid #2563eb' : '1px solid #cbd5e1',
              background: winnerSide === 'away' ? '#eff6ff' : '#fff',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '1rem',
            }}
          >
            <input
              type="radio"
              name="winnerGroup"
              checked={winnerSide === 'away'}
              onChange={() => {
                setWinnerSide('away');
                syncShootoutState(calculatedHomeKicks, calculatedAwayKicks, 'away');
              }}
              style={{ accentColor: '#2563eb' }}
            />
            <span>客队胜出 ({matchData.awayTeam.name})</span>
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            className="mgmt-btn mgmt-btn-secondary"
            onClick={handleResetShootout}
            style={{
              padding: '12px 24px',
              fontSize: '1rem',
              fontWeight: 600,
              borderRadius: '10px',
              color: '#dc2626',
              border: '1px solid #fca5a5',
              background: '#fff',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RotateCcw size={16} /> 重置点球数据
          </button>

          <button
            className="action-btn danger"
            onClick={handleFinishMatch}
            style={{
              padding: '12px 36px',
              fontSize: '1.05rem',
              fontWeight: 800,
              borderRadius: '10px',
              boxShadow: '0 4px 12px rgba(225, 29, 72, 0.3)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Square size={18} /> 全场比赛结束（锁定终局记录并广播）
          </button>
        </div>
      </div>
    </div>
  );
};
