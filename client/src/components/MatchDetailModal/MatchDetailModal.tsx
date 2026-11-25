import { announcedStoppage, formatMatchMinute, matchStatusLabel, playingHalf } from '@shared/matchClock';
import React, { useState } from 'react';
import { MatchLiveSnapshot } from '@shared/types';
import { resolveColorHex, isLightColor } from '../../utils/colorHelper';
import { MatchStatisticsBars } from './MatchStatisticsBars';
import { MatchLiveTimeline } from './MatchLiveTimeline';
import { X, MapPin, Calendar, FileText, BarChart2 } from 'lucide-react';
import '../../styles/MatchModal.css';

interface MatchDetailModalProps {
  isOpen: boolean;
  matchData: MatchLiveSnapshot | null;
  onClose: () => void;
}

export const MatchDetailModal: React.FC<MatchDetailModalProps> = ({
  isOpen,
  matchData,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'stats'>('timeline');

  if (!isOpen || !matchData) return null;

  const isFinished = matchData.clock.period === 'FINISHED';
  const stoppage = announcedStoppage(matchData);
  const half = playingHalf(matchData.clock);
  const hasAttemptedKicks = Boolean(
    matchData.penaltyShootout?.homeKicks?.some(
      (k) =>
        Boolean(k.playerName) &&
        (k.isAttempted || k.status !== undefined || (k.isAttempted === undefined && k.scored !== undefined))
    ) ||
      matchData.penaltyShootout?.awayKicks?.some(
        (k) =>
          Boolean(k.playerName) &&
          (k.isAttempted || k.status !== undefined || (k.isAttempted === undefined && k.scored !== undefined))
      )
  );
  const hasShootout = Boolean(
    matchData.penaltyShootout?.enabled &&
      (matchData.penaltyShootout.homeScore > 0 ||
        matchData.penaltyShootout.awayScore > 0 ||
        matchData.penaltyShootout.isCompleted ||
        hasAttemptedKicks)
  );

  const formatDateTime = matchData.kickoffTime || '2026年5月30日 16:26';

  return (
    <div className="match-modal-backdrop" onClick={onClose}>
      <div className="match-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* 顶部标题与关闭按钮 (对齐图4) */}
        <div className="modal-top-header">
          <div className="modal-top-title-group">
            <span className={`modal-status-pill ${matchData.clock.isRunning ? 'live' : ''}`}>
              {matchStatusLabel(matchData)}
              {half && !matchData.clock.regularTimeEnded && ` · ${formatMatchMinute(matchData, matchData.clock.displayMinute)}`}
              {stoppage !== undefined && ` · 至少补时 ${stoppage} 分钟`}
            </span>
            <span className="modal-header-title-text">赛事回顾</span>
          </div>

          <button className="modal-round-close-btn" onClick={onClose} aria-label="关闭">
            <X size={16} />
          </button>
        </div>

        {/* 核心比分卡片：浅蓝圆角卡片 (对齐图4) */}
        <div className="modal-hero-score-card">
          {/* 主队 */}
          <div className="modal-team-unit">
            <div className="modal-team-circle-logo">
              {matchData.homeTeam.logo ? (
                <img
                  src={matchData.homeTeam.logo}
                  alt={matchData.homeTeam.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundColor: resolveColorHex(matchData.homeTeam.primaryColor),
                    color: isLightColor(resolveColorHex(matchData.homeTeam.primaryColor))
                      ? '#0f172a'
                      : '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '1.2rem',
                  }}
                >
                  {matchData.homeTeam.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="modal-team-unit-name">{matchData.homeTeam.name}</div>
          </div>

          {/* 居中比分与点球 */}
          <div className="modal-center-score-wrap">
            <div className="modal-big-score-digits">
              {matchData.score.home} : {matchData.score.away}
            </div>
            {hasShootout && (
              <div className="modal-shootout-score-pill">
                点球 {matchData.penaltyShootout!.homeScore}-{matchData.penaltyShootout!.awayScore}
              </div>
            )}
          </div>

          {/* 客队 */}
          <div className="modal-team-unit">
            <div className="modal-team-circle-logo">
              {matchData.awayTeam.logo ? (
                <img
                  src={matchData.awayTeam.logo}
                  alt={matchData.awayTeam.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundColor: resolveColorHex(matchData.awayTeam.primaryColor),
                    color: isLightColor(resolveColorHex(matchData.awayTeam.primaryColor))
                      ? '#0f172a'
                      : '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '1.2rem',
                  }}
                >
                  {matchData.awayTeam.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="modal-team-unit-name">{matchData.awayTeam.name}</div>
          </div>
        </div>

        {/* 比赛地点与时间双信息网格 (对齐图4) */}
        <div className="modal-info-tiles-grid">
          <div className="modal-info-tile">
            <div className="modal-info-tile-icon-box" style={{ background: '#fce7f3' }}>
              <MapPin size={18} color="#ec4899" />
            </div>
            <div>
              <div className="modal-info-tile-label">比赛地点</div>
              <div className="modal-info-tile-val">{matchData.venue || '北区'}</div>
            </div>
          </div>

          <div className="modal-info-tile">
            <div className="modal-info-tile-icon-box" style={{ background: '#eff6ff' }}>
              <Calendar size={18} color="#3b82f6" />
            </div>
            <div>
              <div className="modal-info-tile-label">比赛时间</div>
              <div className="modal-info-tile-val">{formatDateTime}</div>
            </div>
          </div>
        </div>

        {/* Tab 切换栏 (关键事件 | 技术统计) */}
        <div className="modal-nav-tabs">
          <button
            className={`modal-nav-tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('timeline')}
          >
            <FileText size={16} />
            <span>关键事件</span>
          </button>
          <button
            className={`modal-nav-tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            <BarChart2 size={16} />
            <span>技术统计</span>
          </button>
        </div>

        {/* 滚动内容区域 */}
        <div className="modal-scroll-body">
          {activeTab === 'timeline' && (
            <div>
              <div className="timeline-section-title">
                <span>📝</span>
                <span>比赛关键事件回顾</span>
              </div>
              <MatchLiveTimeline
                events={matchData.timeline}
                homeTeam={matchData.homeTeam}
                awayTeam={matchData.awayTeam}
                penaltyShootout={matchData.penaltyShootout}
                clock={matchData.clock}
                halfDuration={matchData.halfDuration || 45}
              />
            </div>
          )}

          {activeTab === 'stats' && (
            <div>
              <MatchStatisticsBars stats={matchData.stats} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
