import React from 'react';
import { MatchLiveSnapshot } from '@shared/types';
import { resolveColorHex, isLightColor } from '../utils/colorHelper';
import { MapPin, Calendar, Radio } from 'lucide-react';

interface MatchCardProps {
  match: MatchLiveSnapshot;
  onOpenDetail: (matchId: string) => void;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, onOpenDetail }) => {
  const isFinished = match.clock.period === 'FINISHED';
  const hasAttemptedKicks = Boolean(
    match.penaltyShootout?.homeKicks?.some(
      (k) =>
        Boolean(k.playerName) &&
        (k.isAttempted || k.status !== undefined || (k.isAttempted === undefined && k.scored !== undefined))
    ) ||
      match.penaltyShootout?.awayKicks?.some(
        (k) =>
          Boolean(k.playerName) &&
          (k.isAttempted || k.status !== undefined || (k.isAttempted === undefined && k.scored !== undefined))
      )
  );
  const hasShootout = Boolean(
    match.penaltyShootout?.enabled &&
      (match.penaltyShootout.homeScore > 0 ||
        match.penaltyShootout.awayScore > 0 ||
        match.penaltyShootout.isCompleted ||
        hasAttemptedKicks)
  );

  const getStatusBadge = () => {
    if (match.clock.period === 'NOT_STARTED') {
      return (
        <span
          style={{
            fontSize: '0.8rem',
            color: '#64748b',
            background: '#f1f5f9',
            padding: '4px 12px',
            borderRadius: '9999px',
            fontWeight: 600,
          }}
        >
          未开赛
        </span>
      );
    }
    if (match.clock.period === 'HALF_TIME') {
      return (
        <span
          style={{
            fontSize: '0.8rem',
            color: '#b45309',
            background: '#fef3c7',
            padding: '4px 12px',
            borderRadius: '9999px',
            fontWeight: 700,
          }}
        >
          中场休息 (HT)
        </span>
      );
    }
    if (isFinished) {
      return (
        <span
          style={{
            fontSize: '0.82rem',
            color: '#ffffff',
            background: '#5b6574',
            padding: '4px 14px',
            borderRadius: '9999px',
            fontWeight: 600,
          }}
        >
          已结束
        </span>
      );
    }
    if (match.clock.period === 'PAUSED') {
      return (
        <span
          style={{
            fontSize: '0.8rem',
            color: '#d97706',
            background: '#fef3c7',
            padding: '4px 12px',
            borderRadius: '9999px',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>⏸</span> 暂停中 {match.clock.displayMinute}'
        </span>
      );
    }
    // 比赛进行中（哪怕在点球大战中，卡片也不显示点球大战，按要求保持 live）
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.82rem',
          color: '#047857',
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          padding: '4px 12px',
          borderRadius: '9999px',
          fontWeight: 700,
        }}
      >
        <Radio size={12} className="live-dot" /> LIVE {match.clock.displayMinute}'
      </span>
    );
  };

  // 格式化日期显示
  const dateFormatted = match.kickoffTime || '2026/5/30';
  const fullDateTimeFormatted = match.kickoffTime
    ? `${match.kickoffTime}`
    : '2026年5月30日 16:26';

  return (
    <div
      onClick={() => onOpenDetail(match.id)}
      style={{
        background: '#f2f3ef',
        borderRadius: '16px',
        border: '1px solid #e2e4dc',
        padding: '20px 28px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.08)';
        e.currentTarget.style.borderColor = '#cbd5e1';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
        e.currentTarget.style.borderColor = '#e2e4dc';
      }}
    >
      {/* 顶部状态与时间 (对齐图1) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>{getStatusBadge()}</div>
        <div style={{ fontSize: '0.88rem', color: '#64748b', fontWeight: 500 }}>
          {fullDateTimeFormatted}
        </div>
      </div>

      {/* 赛事名称 / 阶段 (居中，如 🔥 决赛) */}
      <div style={{ textAlign: 'center', marginTop: '-4px' }}>
        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
          🔥 {match.competitionName || match.title}
        </span>
      </div>

      {/* 对战双方与比分 (对齐图1经典布局) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: '24px',
          padding: '4px 0 10px',
        }}
      >
        {/* 主队 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              border: '2px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
              overflow: 'hidden',
            }}
          >
            {match.homeTeam.logo ? (
              <img
                src={match.homeTeam.logo}
                alt={match.homeTeam.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: resolveColorHex(match.homeTeam.primaryColor),
                  color: isLightColor(resolveColorHex(match.homeTeam.primaryColor))
                    ? '#0f172a'
                    : '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1.15rem',
                }}
              >
                {match.homeTeam.name.charAt(0)}
              </div>
            )}
          </div>
          <div
            style={{
              fontWeight: 800,
              fontSize: '1rem',
              color: '#0f172a',
              lineHeight: 1.3,
              maxWidth: '160px',
            }}
          >
            {match.homeTeam.name}
          </div>
        </div>

        {/* 居中比分与点球结果 (对齐图1) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '120px',
          }}
        >
          <div
            style={{
              fontSize: '2.5rem',
              fontWeight: 900,
              color: '#0f172a',
              letterSpacing: '2px',
              lineHeight: 1,
            }}
          >
            {match.score.home} : {match.score.away}
          </div>

          {/* 完赛后的点球比分浅绿胶囊 (图1: 点球 2-4) */}
          {isFinished && hasShootout && (
            <div
              style={{
                marginTop: '10px',
                background: '#dcfce7',
                color: '#15803d',
                fontSize: '0.82rem',
                fontWeight: 700,
                padding: '3px 14px',
                borderRadius: '9999px',
                border: '1px solid #bbf7d0',
                letterSpacing: '0.5px',
              }}
            >
              点球 {match.penaltyShootout!.homeScore}-{match.penaltyShootout!.awayScore}
            </div>
          )}
        </div>

        {/* 客队 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              border: '2px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
              overflow: 'hidden',
            }}
          >
            {match.awayTeam.logo ? (
              <img
                src={match.awayTeam.logo}
                alt={match.awayTeam.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: resolveColorHex(match.awayTeam.primaryColor),
                  color: isLightColor(resolveColorHex(match.awayTeam.primaryColor))
                    ? '#0f172a'
                    : '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1.15rem',
                }}
              >
                {match.awayTeam.name.charAt(0)}
              </div>
            )}
          </div>
          <div
            style={{
              fontWeight: 800,
              fontSize: '1rem',
              color: '#0f172a',
              lineHeight: 1.3,
              maxWidth: '160px',
            }}
          >
            {match.awayTeam.name}
          </div>
        </div>
      </div>

      {/* 底部信息 (对齐图1: 地点与日期) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '32px',
          fontSize: '0.85rem',
          color: '#64748b',
          borderTop: '1px solid #e2e4dc',
          paddingTop: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <MapPin size={15} color="#3b82f6" />
          <span>{match.venue || '北区'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={15} color="#3b82f6" />
          <span>{dateFormatted}</span>
        </div>
      </div>
    </div>
  );
};
