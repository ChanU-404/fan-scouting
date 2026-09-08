import React, { useState } from 'react';
import { Users, Star, Zap, Check } from 'lucide-react';

const STAT_NAMES = {
  BATTER: ['CON', 'PWR', 'EYE', 'SPD', 'FLD'],
  PITCHER: ['STF', 'CMD', 'MOV', 'STA', 'CMP'],
};

const GRADE_STYLES = {
  S: { border: 'linear-gradient(135deg, #FFD700, #FFA500, #FFD700)', glow: '0 0 30px rgba(255, 215, 0, 0.6), 0 0 60px rgba(255, 165, 0, 0.3)', badge: 'linear-gradient(135deg, #FFD700, #FFA500)', badgeText: '#1a0a00', shimmer: true },
  A: { border: 'linear-gradient(135deg, #C0C0C0, #E8E8E8, #C0C0C0)', glow: '0 0 20px rgba(192, 192, 192, 0.5)', badge: 'linear-gradient(135deg, #C0C0C0, #E8E8E8)', badgeText: '#1a1a1a', shimmer: true },
  B: { border: 'linear-gradient(135deg, #CD7F32, #E8A87C, #CD7F32)', glow: '0 0 15px rgba(205, 127, 50, 0.4)', badge: 'linear-gradient(135deg, #CD7F32, #E8A87C)', badgeText: '#fff', shimmer: false },
  C: { border: '1px solid rgba(148, 163, 184, 0.4)', glow: 'none', badge: 'rgba(100,116,139,0.8)', badgeText: '#fff', shimmer: false },
  D: { border: '1px solid rgba(71, 85, 105, 0.3)', glow: 'none', badge: 'rgba(51,65,85,0.8)', badgeText: '#94a3b8', shimmer: false },
};

function getStatColor(score) {
  if (score >= 70) return '#22c55e';
  if (score >= 55) return '#38bdf8';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

export default function PlayerCard({ player, onClick, compact = false, myVote = null }) {
  const [hovered, setHovered] = useState(false);
  const [useProxy, setUseProxy] = useState(false);
  const [imgError, setImgError] = useState(false);
  if (!player) return null;

  const grade = player.card_grade || 'D';
  const gs = GRADE_STYLES[grade] || GRADE_STYLES.D;
  const type = player.player_type || 'BATTER';
  const statNames = STAT_NAMES[type] || STAT_NAMES.BATTER;
  const stats = [player.stat1 || 40, player.stat2 || 40, player.stat3 || 40, player.stat4 || 40, player.stat5 || 40];
  const statsPot = [player.stat1_pot || 60, player.stat2_pot || 60, player.stat3_pot || 60, player.stat4_pot || 60, player.stat5_pot || 60];
  const overall = player.overall_score || 50;
  const voteCount = player.vote_count || 0;
  const isLegendsLevel = grade === 'S';
  const isFutures = player.league_level === 'FUTURES';
  const isHotTake = player.std_dev > 15;

  const teamColorMap = {
    'KT': '#000000', 'LG': '#C30452', 'SSG': '#CE0E2D', '삼성': '#074CA1',
    'NC': '#315288', 'KIA': '#EA0029', '두산': '#131230', '롯데': '#041E42',
    '한화': '#FF6600', '키움': '#820024'
  };
  const teamColor = teamColorMap[player.team] || '#38bdf8';
  const r = parseInt(teamColor.slice(1,3),16);
  const g2 = parseInt(teamColor.slice(3,5),16);
  const b = parseInt(teamColor.slice(5,7),16);

  return (
    <div
      className={`trading-card grade-${grade.toLowerCase()} ${isLegendsLevel ? 'hologram' : ''} ${compact ? 'compact' : ''}`}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        '--team-color': teamColor,
        '--team-r': r, '--team-g': g2, '--team-b': b,
        boxShadow: hovered ? gs.glow : `0 10px 25px rgba(0,0,0,0.6)`,
        transform: hovered ? 'translateY(-8px) scale(1.03) rotateX(2deg) rotateY(-2deg)' : 'none',
      }}
      onClick={() => onClick && onClick(player)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="tc-inner" style={{ border: ['C','D'].includes(grade) ? gs.border : 'none', background: ['S','A','B'].includes(grade) ? gs.border : 'transparent', padding: ['S','A','B'].includes(grade) ? '2px' : '0' }}>
        <div className="tc-bg-wrapper">
          {/* Shimmer Effects */}
          {isLegendsLevel && <div className="hologram-overlay" />}
          {gs.shimmer && <div className="card-shimmer" />}

          {/* Background Image */}
          <div className="tc-bg-image">
            {player.photo_url && !imgError ? (
              <img 
                src={useProxy ? `https://images.weserv.nl/?url=${encodeURIComponent(player.photo_url)}` : player.photo_url} 
                alt={player.name} 
                onError={() => {
                  if (!useProxy) setUseProxy(true);
                  else setImgError(true);
                }} 
                referrerPolicy="no-referrer" 
              />
            ) : (
              <div className="tc-fallback-bg" style={{ backgroundColor: `rgba(${r},${g2},${b},0.3)` }}>
                {player.name?.[0] || '?'}
              </div>
            )}
          </div>

          <div className="tc-gradient-top" />
          <div className="tc-gradient-bottom" style={{ background: `linear-gradient(to top, rgba(15,23,42,1) 0%, rgba(${r},${g2},${b},0.6) 40%, transparent 100%)` }} />

          {/* Content overlay */}
          <div className="tc-content">
            <div className="tc-header">
              <div className="tc-grade" style={{ background: gs.badge, color: gs.badgeText }}>{grade}</div>
              <div className="tc-badges">
                {isFutures && <span className="tc-badge futures">FUTURES</span>}
                {isHotTake && <span className="tc-badge hottake">🔥</span>}
                {myVote && (
                  <div className="tc-my-vote" title="평가 완료">
                    <Check size={compact ? 12 : 16} strokeWidth={4} />
                  </div>
                )}
              </div>
            </div>

            <div className="tc-footer">
              <div className="tc-name-row">
                <span className="tc-name">{player.name}</span>
                {player.back_number && <span className="tc-backnum">#{Math.floor(player.back_number)}</span>}
              </div>
              
              <div className="tc-meta">
                <span className="tc-team" style={{ color: teamColor }}>{player.team}</span>
                <span className="tc-pos">{player.position || (type === 'BATTER' ? '타자' : '투수')}</span>
              </div>

              <div className="tc-divider" style={{ background: `linear-gradient(90deg, transparent, ${teamColor}, transparent)` }} />

              <div className="tc-stats-container" style={{ gap: '6px', alignItems: 'stretch' }}>
                <div className="tc-ovr-box" style={{ padding: '6px 8px', justifyContent: 'center' }}>
                  <span className="tc-ovr-label">OVR</span>
                  <span className="tc-ovr-val" style={{ color: voteCount === 0 ? '#94a3b8' : getStatColor(overall) }}>
                    {voteCount === 0 ? 'N/A' : overall}
                  </span>
                </div>
                
                {!compact && (
                  <div className="tc-detailed-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px 2px', flex: 1 }}>
                    {stats.map((score, i) => (
                      <div key={i} className="tc-stat-col" style={{ alignItems: 'center' }}>
                        <span className="tc-stat-name">{statNames[i]}</span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1px' }}>
                          <span className="tc-stat-score" style={{ color: voteCount === 0 ? '#94a3b8' : getStatColor(score), fontSize: '0.7rem' }}>
                            {voteCount === 0 ? '-' : score}
                          </span>
                          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem', padding: '0 1px' }}>/</span>
                          <span style={{ color: voteCount === 0 ? '#94a3b8' : getStatColor(statsPot[i]), fontSize: '0.7rem', fontWeight: 'bold' }}>
                            {voteCount === 0 ? '-' : statsPot[i]}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {!compact && (
                <div className="tc-vote-count">
                  <Users size={10} /> {voteCount.toLocaleString()}명 평가
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
