import React, { useState, useEffect } from 'react';
import { projectMatchClock } from '@shared/matchClock';
import { MatchCard } from './components/MatchCard';
import { MatchDetailModal } from './components/MatchDetailModal/MatchDetailModal';
import { useLiveMatches } from './hooks/useLiveMatches';
import { Trophy, RefreshCw } from 'lucide-react';
import './styles/index.css';

export const App: React.FC = () => {
  const { matches, loading, refreshing, error, refresh } = useLiveMatches();
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now);
  const hasRunningMatch = matches.some(match => match.clock.isRunning);

  useEffect(() => {
    if (!hasRunningMatch) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [hasRunningMatch]);

  const liveMatches = matches.map(match => projectMatchClock(match, now));
  const liveData = liveMatches.find(match => match.id === selectedMatchId) ?? null;

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
          onClick={() => void refresh(true)}
          disabled={refreshing}
          style={{
            background: refreshing ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.18)',
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
            transform: refreshing ? 'scale(0.97)' : 'scale(1)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!refreshing) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.28)';
          }}
          onMouseLeave={(e) => {
            if (!refreshing) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)';
          }}
        >
          <RefreshCw size={14} className={refreshing ? 'spin-icon' : ''} />
          {refreshing ? '刷新中…' : '刷新赛程'}
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

        {error && <p role="status">连接中断，正在重试。</p>}
        {loading && matches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
            正在加载赛程数据...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {liveMatches.map((m) => (
              <MatchCard key={m.id} match={m} onOpenDetail={setSelectedMatchId} />
            ))}
          </div>
        )}
      </main>

      {/* 赛况详情弹窗 */}
      <MatchDetailModal
        isOpen={Boolean(liveData)}
        matchData={liveData}
        onClose={() => setSelectedMatchId(null)}
      />
    </div>
  );
};

export default App;
