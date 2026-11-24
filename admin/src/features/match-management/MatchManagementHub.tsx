import React, { useState, useEffect, useRef } from 'react';
import { MatchLiveSnapshot, LiveBroadcastMessage } from '@shared/types';
import { matchLiveService } from '../../api/matchLive.service';
import { resolveColorHex } from '../../utils/colorHelper';
import { Plus, Trash2, ArrowRight, Clock, MapPin, Trophy, RefreshCw } from 'lucide-react';
import '../../styles/matchManagement.css';

interface MatchManagementHubProps {
  onEnterLiveDesk: (matchId: string) => void;
  onCreateNewMatch: () => void;
}

export const MatchManagementHub: React.FC<MatchManagementHubProps> = ({
  onEnterLiveDesk,
  onCreateNewMatch,
}) => {
  const [matches, setMatches] = useState<MatchLiveSnapshot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const broadcastRef = useRef<BroadcastChannel | null>(null);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const list = await matchLiveService.getMatches();
      setMatches(list);
    } catch (err) {
      console.error('加载比赛列表异常:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();

    try {
      broadcastRef.current = new BroadcastChannel('sztufa_live_bus');
      broadcastRef.current.onmessage = (e: MessageEvent<LiveBroadcastMessage>) => {
        if (e.data.type === 'MATCH_CREATED' || e.data.type === 'MATCH_DELETED' || e.data.type === 'MATCH_LIVE_UPDATE') {
          fetchMatches();
        }
      };
    } catch (err) {
      console.warn('BroadcastChannel 不可用:', err);
    }

    return () => {
      broadcastRef.current?.close();
    };
  }, []);

  const handleDeleteMatch = async (match: MatchLiveSnapshot) => {
    const confirmMessage = `确定要删除比赛【${match.homeTeam.name} vs ${match.awayTeam.name}】吗？\n删除后数据不可恢复。`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setDeletingId(match.id);
      await matchLiveService.deleteMatch(match.id);
      
      // 发送删除广播
      if (broadcastRef.current) {
        broadcastRef.current.postMessage({
          type: 'MATCH_DELETED',
          matchId: match.id,
          timestamp: Date.now(),
        });
      }

      setMatches((prev) => prev.filter((m) => m.id !== match.id));
    } catch (err: any) {
      alert(`删除失败: ${err.message || '未知错误'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const getPeriodLabel = (match: MatchLiveSnapshot) => {
    const period = match.clock.period;
    if (period === 'NOT_STARTED') return { text: '未开赛', className: 'period-not-started' };
    if (period === 'FINISHED') return { text: '全场完赛', className: 'period-finished' };
    if (period === 'HALF_TIME') return { text: `中场休息 (${match.clock.halfTimeMinute || 35}')`, className: 'period-live' };
    if (period === 'FIRST_HALF') return { text: `上半场 ${match.clock.displayMinute || 1}'`, className: 'period-live' };
    if (period === 'SECOND_HALF') return { text: `下半场 ${match.clock.displayMinute || 46}'`, className: 'period-live' };
    return { text: '走时暂停', className: 'period-not-started' };
  };

  return (
    <div className="mgmt-container">
      {/* 顶部标题栏 */}
      <header className="mgmt-header">
        <div className="mgmt-title-group">
          <h1>
            <Trophy size={26} color="#667eea" />
            足球赛况系统 · 比赛管理工作台
          </h1>
          <p>深圳技术大学足球协会 (SZTUFA) 现场控制中心 · 共 {matches.length} 场赛事记录</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button className="mgmt-btn mgmt-btn-secondary" onClick={fetchMatches} title="刷新列表">
            <RefreshCw size={14} /> 刷新
          </button>
          <button className="mgmt-btn mgmt-btn-primary" onClick={onCreateNewMatch}>
            <Plus size={16} /> 新增比赛
          </button>
        </div>
      </header>

      {/* 比赛卡片列表 */}
      {loading && matches.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
          正在加载赛事列表...
        </div>
      ) : matches.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', background: '#fff', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
          <Trophy size={48} color="#cbd5e1" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.2rem', color: '#475569', marginBottom: '8px' }}>暂无比赛记录</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '20px' }}>点击右上角“新增比赛”即可创建新赛事并录入球队首发名单</p>
          <button className="mgmt-btn mgmt-btn-primary" onClick={onCreateNewMatch}>
            <Plus size={16} /> 立即创建比赛
          </button>
        </div>
      ) : (
        <div className="match-grid">
          {matches.map((m) => {
            const periodInfo = getPeriodLabel(m);
            return (
              <div key={m.id} className="match-mgmt-card">
                <div>
                  <div className="match-card-top">
                    <span className="match-type-pill">
                      {m.matchType === '8_aside' ? '8人制足球赛' : '11人制标准赛'}
                    </span>
                    <span className={`match-period-badge ${periodInfo.className}`}>
                      ● {periodInfo.text}
                    </span>
                  </div>

                  <h3 className="match-title">{m.title}</h3>
                  <div className="match-venue">
                    <MapPin size={13} /> {m.venue || 'SZTU 足球场'}
                  </div>

                  {/* 比分与队伍信息 */}
                  <div className="match-scoreboard-preview">
                    <div className="team-preview-item">
                      <div
                        className="team-color-indicator"
                        style={{ backgroundColor: resolveColorHex(m.homeTeam.primaryColor) }}
                        title={`主队球衣色: ${m.homeTeam.primaryColor}`}
                      />
                      <span>{m.homeTeam.name}</span>
                    </div>

                    <div className="score-display-preview">
                      {m.score.home} : {m.score.away}
                    </div>

                    <div className="team-preview-item" style={{ flexDirection: 'row-reverse' }}>
                      <div
                        className="team-color-indicator"
                        style={{ backgroundColor: resolveColorHex(m.awayTeam.primaryColor) }}
                        title={`客队球衣色: ${m.awayTeam.primaryColor}`}
                      />
                      <span>{m.awayTeam.name}</span>
                    </div>
                  </div>

                  {/* 开球时间显示 */}
                  {m.kickoffTime ? (
                    <div className="match-kickoff-row">
                      <Clock size={14} />
                      <span>开球时间：{m.kickoffTime}</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={13} /> 尚未开球
                    </div>
                  )}
                </div>

                {/* 卡片底部操作按钮 */}
                <div className="match-card-actions">
                  <button
                    className="mgmt-btn mgmt-btn-danger"
                    onClick={() => handleDeleteMatch(m)}
                    disabled={deletingId === m.id}
                    title="删除比赛（若误触创建）"
                  >
                    <Trash2 size={14} /> {deletingId === m.id ? '正在删除...' : '删除比赛'}
                  </button>

                  <button
                    className="mgmt-btn mgmt-btn-primary"
                    onClick={() => onEnterLiveDesk(m.id)}
                  >
                    进入操作台 <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
