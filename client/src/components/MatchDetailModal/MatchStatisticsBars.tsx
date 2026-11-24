import React from 'react';
import { MatchStatistics } from '@shared/types';
import '../../styles/statsBars.css';

interface MatchStatisticsBarsProps {
  stats: MatchStatistics;
}

export const MatchStatisticsBars: React.FC<MatchStatisticsBarsProps> = ({ stats }) => {
  // 1. 控球率条
  const homePossession = stats.possession.home;
  const awayPossession = stats.possession.away;

  // 2. 数值条辅助百分比计算
  const calcPercents = (homeVal: number, awayVal: number) => {
    const total = homeVal + awayVal;
    if (total === 0) return { homePct: 0, awayPct: 0 };
    return {
      homePct: Math.round((homeVal / total) * 100),
      awayPct: Math.round((awayVal / total) * 100),
    };
  };

  const renderNumericRow = (
    label: string,
    homeVal: number,
    awayVal: number,
    isFoulRow = false,
  ) => {
    const { homePct, awayPct } = calcPercents(homeVal, awayVal);

    // 高亮判断规则：正向指标领先者为深技大蓝，犯规指标更多者为警示红
    const isHomeAdvantage = !isFoulRow && homeVal > awayVal;
    const isAwayAdvantage = !isFoulRow && awayVal > homeVal;

    const isHomeMoreFouls = isFoulRow && homeVal > awayVal;
    const isAwayMoreFouls = isFoulRow && awayVal > homeVal;

    return (
      <div className="stat-row">
        {/* 1. 主队数值（最左端） */}
        <div
          className={`stat-value home ${
            isHomeMoreFouls ? 'foul-highlight' : isHomeAdvantage ? 'highlight' : ''
          }`}
        >
          {homeVal}
        </div>

        {/* 2. 主队进度槽（右对齐向左伸展） */}
        <div className="stat-track home-track">
          <div
            className={`stat-fill ${isHomeAdvantage ? 'advantage' : ''} ${
              isHomeMoreFouls ? 'foul-negative' : ''
            }`}
            style={{ width: `${homePct}%` }}
          />
        </div>

        {/* 3. 中间指标名称 */}
        <div className="stat-label">{label}</div>

        {/* 4. 客队进度槽（左对齐向右伸展） */}
        <div className="stat-track away-track">
          <div
            className={`stat-fill ${isAwayAdvantage ? 'advantage' : ''} ${
              isAwayMoreFouls ? 'foul-negative' : ''
            }`}
            style={{ width: `${awayPct}%` }}
          />
        </div>

        {/* 5. 客队数值（最右端） */}
        <div
          className={`stat-value away ${
            isAwayMoreFouls ? 'foul-highlight' : isAwayAdvantage ? 'highlight' : ''
          }`}
        >
          {awayVal}
        </div>
      </div>
    );
  };

  // 渲染黄牌、红牌卡片图元排布 (1:1 还原用户参考图)
  const renderCardsRow = (label: string, homeCount: number, awayCount: number, colorType: 'yellow' | 'red') => {
    return (
      <div className="stat-row">
        {/* 主队数量 */}
        <div className={`stat-value home ${homeCount > 0 ? (colorType === 'yellow' ? 'card-yellow-num' : 'card-red-num') : ''}`}>
          {homeCount}
        </div>

        {/* 主队卡片芯片（右对齐紧贴标签） */}
        <div className="card-chips-wrap home">
          {Array.from({ length: homeCount }).map((_, i) => (
            <span key={`h-c-${i}`} className={`card-chip ${colorType}`} />
          ))}
        </div>

        {/* 中间指标名称 */}
        <div className="stat-label">{label}</div>

        {/* 客队卡片芯片（左对齐紧贴标签） */}
        <div className="card-chips-wrap away">
          {Array.from({ length: awayCount }).map((_, i) => (
            <span key={`a-c-${i}`} className={`card-chip ${colorType}`} />
          ))}
        </div>

        {/* 客队数量 */}
        <div className={`stat-value away ${awayCount > 0 ? (colorType === 'yellow' ? 'card-yellow-num' : 'card-red-num') : ''}`}>
          {awayCount}
        </div>
      </div>
    );
  };

  return (
    <div className="stats-bars-container">
      {/* 1. 控球率 (严格按参考图居中外展) */}
      <div className="stat-row">
        <div className={`stat-value home ${homePossession > awayPossession ? 'highlight' : ''}`}>
          {homePossession}
        </div>
        <div className="stat-track home-track">
          <div
            className={`stat-fill ${homePossession > awayPossession ? 'advantage' : ''}`}
            style={{ width: `${homePossession}%` }}
          />
        </div>
        <div className="stat-label">控球率</div>
        <div className="stat-track away-track">
          <div
            className={`stat-fill ${awayPossession > homePossession ? 'advantage' : ''}`}
            style={{ width: `${awayPossession}%` }}
          />
        </div>
        <div className={`stat-value away ${awayPossession > homePossession ? 'highlight' : ''}`}>
          {awayPossession}
        </div>
      </div>

      {/* 2. 角球 (按参考图排在控球率之后) */}
      {renderNumericRow('角球', stats.cornerKicks.home, stats.cornerKicks.away)}

      {/* 3. 射门 */}
      {renderNumericRow('射门', stats.shots.home, stats.shots.away)}

      {/* 4. 射正 */}
      {renderNumericRow('射正', stats.shotsOnTarget.home, stats.shotsOnTarget.away)}

      {/* 5. 任意球 */}
      {renderNumericRow('任意球', stats.freeKicks.home, stats.freeKicks.away)}

      {/* 6. 犯规 (违规多者标警示红) */}
      {renderNumericRow('犯规', stats.fouls.home, stats.fouls.away, true)}

      {/* 7. 黄牌 (矩形芯片方块图元) */}
      {renderCardsRow('黄牌', stats.yellowCards.home, stats.yellowCards.away, 'yellow')}

      {/* 8. 红牌 (矩形芯片方块图元) */}
      {renderCardsRow('红牌', stats.redCards.home, stats.redCards.away, 'red')}
    </div>
  );
};
