import React from 'react';
import { MatchLiveSnapshot } from '@shared/types';
import { MatchStatisticsBars } from './MatchStatisticsBars';
import { MatchLiveTimeline } from './MatchLiveTimeline';
import { Activity, Clock } from 'lucide-react';

interface MatchModalStatsProps {
  matchData: MatchLiveSnapshot;
}

export const MatchModalStats: React.FC<MatchModalStatsProps> = ({ matchData }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* 1. 技术统计大盘 */}
      <section>
        <div className="section-block-title">
          <Activity size={18} color="#1A56DB" />
          <span>全场技术统计 (Match Statistics)</span>
        </div>
        <MatchStatisticsBars stats={matchData.stats} />
      </section>

      {/* 2. 关键事件时间线 */}
      <section>
        <div className="section-block-title">
          <Clock size={18} color="#0EA5E9" />
          <span>关键事件时间线 (Match Timeline)</span>
        </div>
        <MatchLiveTimeline
          events={matchData.timeline}
          homeTeam={matchData.homeTeam}
          awayTeam={matchData.awayTeam}
          penaltyShootout={matchData.penaltyShootout}
          clock={matchData.clock}
          halfDuration={matchData.halfDuration}
        />
      </section>
    </div>
  );
};
