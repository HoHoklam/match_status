import React, { useState, useEffect } from 'react';
import { MatchLiveSnapshot } from '@shared/types';
import { matchesApi } from './api/matches';
import { MatchCard } from './components/MatchCard';
import { MatchDetailModal } from './components/MatchDetailModal/MatchDetailModal';
import { useLiveMatchSync } from './hooks/useLiveMatchSync';
import { Trophy, RefreshCw } from 'lucide-react';
import './styles/index.css';

export const App: React.FC = () => {
  const [matches, setMatches] = useState<MatchLiveSnapshot[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>('sztu-match-2026-001');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false); // 默认关闭弹窗，首屏完整展示所有赛程
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // 加载比赛列表
  const fetchMatches = async () => {
    try {
      setLoading(true);
      const list = await matchesApi.getMatches();
      setMatches(list);
    } catch (err) {
      console.error('加载比赛列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    await fetchMatches();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  useEffect(() => {
    fetchMatches();

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('sztufa_live_bus');
      channel.onmessage = (e) => {
        if (
          e.data?.type === 'MATCH_CREATED' ||
          e.data?.type === 'MATCH_DELETED' ||
          e.data?.type === 'MATCH_LIVE_UPDATE'
        ) {
          fetchMatches();
        }
      };
    } catch (err) {
      console.warn('BroadcastChannel error:', err);
    }

    return () => {
      channel?.close();
    };
  }, []);

  // 监听当前选中的比赛实时数据（3s 轮询 + BroadcastChannel）
  const { data: liveData } = useLiveMatchSync(selectedMatchId || 'sztu-match-2026-001');

  const handleOpenDetail = (matchId: string) => {
    setSelectedMatchId(matchId);
    setIsModalOpen(true);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', paddingBottom: '40px' }}>
      {/* 顶部导航 Header */}
      <header
        style={{
          backgroundColor: '#1a56db',
          color: '#ffffff',
          padding: '16px 28px',
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Trophy size={22} color="#fcd34d" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '0.5px', margin: 0 }}>
              深圳技术大学足球协会 (SZTUFA) · 赛况中心
            </h1>
            <p style={{ fontSize: '0.75rem', color: '#bfdbfe', margin: '2px 0 0 0' }}>
              SZTUFA Official Match Center · 实时赛况与全场技术统计
            </p>
          </div>
        </div>

        <button
          onClick={handleRefreshClick}
          style={{
            background: isRefreshing ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.18)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            color: '#fff',
            padding: '7px 14px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            transform: isRefreshing ? 'scale(0.97)' : 'scale(1)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!isRefreshing) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.28)';
          }}
          onMouseLeave={(e) => {
            if (!isRefreshing) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)';
          }}
        >
          <RefreshCw size={14} className={isRefreshing ? 'spin-icon' : ''} />
          {isRefreshing ? '已刷新' : '刷新赛程'}
        </button>
      </header>

      {/* 主体容器 */}
      <main style={{ maxWidth: '960px', margin: '24px auto', padding: '0 16px' }}>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
            🏆 今日焦点赛程 (Match Center)
          </h2>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            点击任意卡片查看 1:1 高保真技术统计与时间线
          </span>
        </div>

        {loading && matches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
            正在加载赛程数据...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {matches.map((m) => (
              <MatchCard key={m.id} match={m} onOpenDetail={handleOpenDetail} />
            ))}
          </div>
        )}
      </main>

      {/* 赛况详情弹窗 */}
      <MatchDetailModal
        isOpen={isModalOpen}
        matchData={liveData}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default App;
