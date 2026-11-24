import React from 'react';
import { MatchStatistics, PossessionSide } from '@shared/types';

interface PossessionIndicatorProps {
  stats: MatchStatistics;
  possessionSide: PossessionSide;
  homeTeamName: string;
  awayTeamName: string;
}

export const PossessionIndicator: React.FC<PossessionIndicatorProps> = ({
  stats,
  possessionSide,
  homeTeamName,
  awayTeamName,
}) => {
  const homePct = stats.possession.home;
  const awayPct = stats.possession.away;

  const formatSec = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}分${s.toString().padStart(2, '0')}秒`;
  };

  return (
    <div className="possession-bar-wrap">
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
        <span style={{ color: possessionSide === 'home' ? '#1A56DB' : '#64748b', fontWeight: 700 }}>
          {possessionSide === 'home' && '⚡ '}
          {homeTeamName}: {homePct}% ({formatSec(stats.possession.homeSeconds)})
        </span>
        <span style={{ color: '#475569', fontWeight: 600 }}>控球率对比</span>
        <span style={{ color: possessionSide === 'away' ? '#0284c7' : '#64748b', fontWeight: 700 }}>
          {awayTeamName}: {awayPct}% ({formatSec(stats.possession.awaySeconds)})
          {possessionSide === 'away' && ' ⚡'}
        </span>
      </div>
      <div className="possession-bar">
        <div className="possession-fill-home" style={{ width: `${homePct}%` }}></div>
        <div className="possession-fill-away" style={{ width: `${awayPct}%` }}></div>
      </div>
    </div>
  );
};
