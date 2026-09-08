/**
 * ScoutingPanel 컴포넌트
 * 팬이 선수를 평가하는 슬라이더 + Recharts RadarChart 실시간 프리뷰
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { Send, Star, Info, ChevronDown, ChevronUp } from 'lucide-react';

const BASE_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';
const API = `${BASE_URL}/api`;

const STAT_CONFIGS = {
  BATTER: [
    { key: 'stat1', label: 'Contact', ko: '컨택', desc: '공을 배트에 맞추는 능력' },
    { key: 'stat2', label: 'Power', ko: '파워', desc: '타구의 폭발적인 힘' },
    { key: 'stat3', label: 'Eye', ko: '선구안', desc: '스트라이크/볼 판별 능력' },
    { key: 'stat4', label: 'Speed', ko: '주루', desc: '베이스 주루 속도' },
    { key: 'stat5', label: 'Fielding', ko: '수비', desc: '수비 범위와 정확도' },
  ],
  PITCHER: [
    { key: 'stat1', label: 'Stuff', ko: '구위', desc: '투구의 위력과 속도' },
    { key: 'stat2', label: 'Command', ko: '제구', desc: '원하는 구석에 공을 꽂는 능력' },
    { key: 'stat3', label: 'Movement', ko: '무브먼트', desc: '변화구의 예리함과 다양성' },
    { key: 'stat4', label: 'Stamina', ko: '체력', desc: '긴 이닝을 버티는 지구력' },
    { key: 'stat5', label: 'Composure', ko: '멘탈', desc: '위기 상황에서의 침착함' },
  ],
};

const SCALE_LABELS = {
  20: 'Well Below Avg',
  40: 'Below Avg',
  50: 'Average',
  60: 'Above Avg',
  70: 'Well Above Avg',
  80: 'Elite',
};

function getScaleLabel(val) {
  const keys = [20, 40, 50, 60, 70, 80];
  let closest = keys[0];
  for (const k of keys) {
    if (Math.abs(val - k) < Math.abs(val - closest)) closest = k;
  }
  return SCALE_LABELS[closest];
}

function getStatColor(score) {
  if (score >= 70) return '#22c55e';
  if (score >= 55) return '#38bdf8';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

export default function ScoutingPanel({ player, nickname, token, onRequestNickname, currentCard, onSubmitSuccess }) {
  const type = player?.player_type || 'BATTER';
  const configs = STAT_CONFIGS[type] || STAT_CONFIGS.BATTER;

  const defaultStats = {
    stat1: 40, stat2: 40, stat3: 40, stat4: 40, stat5: 40,
    stat1_pot: 60, stat2_pot: 60, stat3_pot: 60, stat4_pot: 60, stat5_pot: 60
  };
  const [myStats, setMyStats] = useState(defaultStats);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [existingVote, setExistingVote] = useState(null);

  const [commentsList, setCommentsList] = useState([]);

  // 기존 내 투표 로드 및 코멘트 리스트 로드
  useEffect(() => {
    if (!player) return;

    // 코멘트 로드
    fetch(`${API}/votes/comments?player_id=${player.id}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setCommentsList(data);
      })
      .catch(() => {});

    if (!token) return;
    
    // 내 투표 로드
    fetch(`${API}/votes/my?player_id=${player.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(v => {
        if (v && !v.error) {
          setMyStats({
            stat1: v.stat1, stat2: v.stat2, stat3: v.stat3, stat4: v.stat4, stat5: v.stat5,
            stat1_pot: v.stat1_pot, stat2_pot: v.stat2_pot, stat3_pot: v.stat3_pot, stat4_pot: v.stat4_pot, stat5_pot: v.stat5_pot
          });
          setComment(v.comment || '');
          setExistingVote(v);
        }
      })
      .catch(() => {});
  }, [player, token]);

  const handleSlider = useCallback((key, val) => {
    setMyStats(prev => ({ ...prev, [key]: val }));
  }, []);

  const handleSubmit = async () => {
    if (!nickname) {
      if (onRequestNickname) onRequestNickname();
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/votes`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ player_id: player.id, ...myStats, comment })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '제출 실패');
      alert('평가가 성공적으로 제출되었습니다!');
      setExistingVote({ ...myStats, comment });
      
      // 코멘트 리로드
      fetch(`${API}/votes/comments?player_id=${player.id}`)
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setCommentsList(data);
        })
        .catch(() => {});

      if (onSubmitSuccess) onSubmitSuccess(data);
    } catch (e) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // RadarChart 데이터 구성
  const isNoVotes = currentCard ? currentCard.vote_count === 0 : true;
  const radarData = configs.map((cfg, i) => ({
    stat: cfg.ko,
    내평가: myStats[cfg.key],
    내잠재: myStats[`${cfg.key}_pot`],
    팬평균: isNoVotes ? null : (currentCard ? [currentCard.stat1, currentCard.stat2, currentCard.stat3, currentCard.stat4, currentCard.stat5][i] : 40),
    팬잠재: isNoVotes ? null : (currentCard ? [currentCard.stat1_pot, currentCard.stat2_pot, currentCard.stat3_pot, currentCard.stat4_pot, currentCard.stat5_pot][i] : 60),
  }));

  if (!player) return null;

  return (
    <div className="scouting-panel">
      {/* 상세 프로필 헤더 */}
      <div className="scouting-profile-header">
        <h2 className="profile-name">{player.name}</h2>
        <div className="profile-meta-grid">
          <div className="profile-meta-item">
            <span className="meta-label">소속팀</span>
            <span className="meta-value" style={{ color: 'var(--accent)' }}>{player.team}</span>
          </div>
          <div className="profile-meta-item">
            <span className="meta-label">포지션</span>
            <span className="meta-value">{player.position || (player.player_type === 'BATTER' ? '타자' : '투수')}</span>
          </div>
          <div className="profile-meta-item">
            <span className="meta-label">생년월일</span>
            <span className="meta-value">{player.birth || '업데이트 중'}</span>
          </div>
          <div className="profile-meta-item">
            <span className="meta-label">체격</span>
            <span className="meta-value">{player.height ? `${player.height}cm / ${player.weight}kg` : '업데이트 중'}</span>
          </div>
          <div className="profile-meta-item">
            <span className="meta-label">투타</span>
            <span className="meta-value">{player.throws_bats || '업데이트 중'}</span>
          </div>
          <div className="profile-meta-item">
            <span className="meta-label">리그</span>
            <span className="meta-value">{player.league_level === 'FUTURES' ? '퓨처스리그' : 'KBO 1군'}</span>
          </div>
        </div>

        {/* 2026 시즌 기록 */}
        <div className="profile-meta-grid" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {player.player_type === 'BATTER' ? (
            <>
              <div className="profile-meta-item"><span className="meta-label">타율 (AVG)</span><span className="meta-value">{player.record_avg?.toFixed(3) || '0.000'}</span></div>
              <div className="profile-meta-item"><span className="meta-label">홈런 (HR)</span><span className="meta-value">{player.record_hr || 0}</span></div>
              <div className="profile-meta-item"><span className="meta-label">OPS</span><span className="meta-value">{player.record_ops?.toFixed(3) || '0.000'}</span></div>
            </>
          ) : (
            <>
              <div className="profile-meta-item"><span className="meta-label">평균자책 (ERA)</span><span className="meta-value">{player.record_era?.toFixed(2) || '0.00'}</span></div>
              <div className="profile-meta-item"><span className="meta-label">승리 (W)</span><span className="meta-value">{player.record_win || 0}</span></div>
              <div className="profile-meta-item"><span className="meta-label">탈삼진 (SO)</span><span className="meta-value">{player.record_so || 0}</span></div>
            </>
          )}
        </div>

        {existingVote && (
          <div className="my-vote-indicator" style={{ marginTop: '12px' }}>
            <Star size={14} fill="currentColor" /> 이전에 평가를 완료했습니다. (수정 모드)
          </div>
        )}
      </div>

      <div className="scouting-body">
        {/* 레이더 차트 */}
        <div className="scouting-radar">
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis dataKey="stat" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <PolarRadiusAxis domain={[20, 80]} tick={false} axisLine={false} />
              <Radar name="팬 평균(현재)" dataKey="팬평균" stroke="#475569" fill="#475569" fillOpacity={0.2} strokeWidth={1} strokeDasharray="4 2" />
              <Radar name="팬 평균(잠재)" dataKey="팬잠재" stroke="#475569" fill="none" strokeWidth={1} strokeDasharray="2 4" />
              <Radar name="내 평가(현재)" dataKey="내평가" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.4} strokeWidth={2} />
              <Radar name="내 평가(잠재)" dataKey="내잠재" stroke="#38bdf8" fill="none" strokeWidth={2} strokeDasharray="4 4" />
              <Tooltip
                contentStyle={{ background: 'rgba(11,14,20,0.95)', border: '1px solid #30363d', borderRadius: '8px', fontSize: '12px' }}
                formatter={(val, name) => [val, name]}
              />
              <Legend iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* 팬 평가 분포도 */}
        {currentCard?.distribution && currentCard.vote_count > 0 && (
          <div className="scouting-distribution" style={{ marginBottom: '24px', padding: '16px', background: 'var(--surface-2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-1)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📊 팬 평가 분포도 (OVR 기준)
            </h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={currentCard.distribution} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="range" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ background: 'rgba(11,14,20,0.95)', border: '1px solid #30363d', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(val) => [`${val}명`, '투표 수']}
                />
                <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 스카우팅 산정 방식 안내 */}
        <div className="scouting-guide" style={{ marginBottom: '24px', padding: '16px', background: 'var(--surface-2)', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '0.9rem', color: 'var(--text-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-1)', fontWeight: 'bold' }}>
            💡 20-80 스카우팅 스케일 가이드
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px', listStyleType: 'disc', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <li><strong style={{ color: '#ef4444' }}>20~30</strong> : 매우 부족 (Poor)</li>
            <li><strong style={{ color: '#f59e0b' }}>40</strong> : 평균 이하 (Below Avg)</li>
            <li><strong style={{ color: '#38bdf8' }}>50</strong> : 리그 평균 (Average)</li>
            <li><strong style={{ color: '#22c55e' }}>60</strong> : 평균 이상 (Plus)</li>
            <li><strong style={{ color: '#a855f7' }}>70~80</strong> : 엘리트 (Elite)</li>
          </ul>
          
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <div style={{ color: 'var(--text-1)', fontWeight: 'bold', marginBottom: '6px' }}>📊 산출 방식 안내 (왜 내 점수대로 팍팍 안 변하나요?)</div>
            <div style={{ fontSize: '0.85rem', lineHeight: '1.5' }}>
              선수의 최종 능력치는 <strong>팬 평가 평균</strong>과 <strong>선수 기록 기반 초기값(Seed)</strong>을 혼합하여 계산됩니다.<br/>
              • <strong>5명 미만 참여:</strong> 팬 평가 40% + 기록 초기값 60% 반영<br/>
              • <strong>20명 미만 참여:</strong> 팬 평가 70% + 기록 초기값 30% 반영<br/>
              • <strong>20명 이상 참여:</strong> 팬 평가 100% 반영<br/>
              (평가자가 적을 때는 일부 극단적인 평가를 방지하기 위해 실제 기록의 비중을 높게 반영합니다.)
            </div>
          </div>
        </div>

        {/* 숫자 입력형 스카우팅 패널 */}
        <div className="scouting-inputs">
          {configs.map((cfg) => {
            const curVal = myStats[cfg.key] || '';
            const potVal = myStats[`${cfg.key}_pot`] || '';
            const isCurInvalid = curVal !== '' && (curVal < 20 || curVal > 80);
            const isPotInvalid = potVal !== '' && (potVal < 20 || potVal > 80);
            const isInvalid = isCurInvalid || isPotInvalid;
            return (
              <div key={cfg.key} className="stat-input-row" style={{ borderColor: isInvalid ? '#ef4444' : '', paddingBottom: '16px' }}>
                <div className="stat-input-header">
                  <div className="stat-input-labels">
                    <span className="stat-input-label">{cfg.ko}</span>
                    <span className="stat-input-sublabel">{cfg.label}</span>
                  </div>
                  {!isInvalid && curVal !== '' && potVal !== '' && <span className="stat-input-scale">{getScaleLabel(curVal)} → {getScaleLabel(potVal)}</span>}
                </div>
                
                <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                  {/* Current Input */}
                  <div className="number-input-control" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--surface-1)', padding: '6px', borderRadius: '12px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-2)', paddingLeft: '8px', minWidth: '30px' }}>현재</span>
                    <button className="neo-btn step-btn" style={{ padding: '2px 8px', fontSize: '1.2rem', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-1)' }} onClick={() => handleSlider(cfg.key, Math.max(20, (curVal||40) - 5))}>-</button>
                    <input type="number" placeholder="40" min="20" max="80" step="5" value={curVal}
                      onChange={e => handleSlider(cfg.key, e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                      style={{ color: isCurInvalid ? '#ef4444' : getStatColor(curVal || 40), width: '40px', textAlign: 'center', background: 'transparent', border: 'none', outline: 'none', fontSize: '1rem', fontWeight: 'bold' }} />
                    <button className="neo-btn step-btn" style={{ padding: '2px 8px', fontSize: '1.2rem', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-1)' }} onClick={() => handleSlider(cfg.key, Math.min(80, (curVal||40) + 5))}>+</button>
                  </div>
                  
                  {/* Potential Input */}
                  <div className="number-input-control" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--surface-1)', padding: '6px', borderRadius: '12px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--accent)', paddingLeft: '8px', minWidth: '30px' }}>잠재</span>
                    <button className="neo-btn step-btn" style={{ padding: '2px 8px', fontSize: '1.2rem', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-1)' }} onClick={() => handleSlider(`${cfg.key}_pot`, Math.max(20, (potVal||60) - 5))}>-</button>
                    <input type="number" placeholder="60" min="20" max="80" step="5" value={potVal}
                      onChange={e => handleSlider(`${cfg.key}_pot`, e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                      style={{ color: isPotInvalid ? '#ef4444' : getStatColor(potVal || 60), width: '40px', textAlign: 'center', background: 'transparent', border: 'none', outline: 'none', fontSize: '1rem', fontWeight: 'bold' }} />
                    <button className="neo-btn step-btn" style={{ padding: '2px 8px', fontSize: '1.2rem', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-1)' }} onClick={() => handleSlider(`${cfg.key}_pot`, Math.min(80, (potVal||60) + 5))}>+</button>
                  </div>
                </div>
                {isInvalid && <div className="validation-error">20~80 사이의 숫자를 입력해주세요.</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* 코멘트 */}
      <div className="scouting-comment" style={{ marginTop: '24px' }}>
        <textarea
          placeholder="💬 한줄 스카우팅 코멘트 (선택, 최대 100자)"
          maxLength={100}
          value={comment}
          onChange={e => setComment(e.target.value)}
          className="comment-textarea"
          style={{ width: '100%', minHeight: '80px', padding: '14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-1)', fontSize: '0.95rem', resize: 'none', outline: 'none', transition: 'var(--transition)' }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <span className="comment-count" style={{ display: 'block', textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-3)', marginTop: '6px' }}>{comment.length} / 100</span>
      </div>

      {/* 제출 버튼 */}
      <button
        className="scouting-submit-btn neo-btn"
        style={{ width: '100%', marginTop: '16px', padding: '16px', background: 'linear-gradient(135deg, var(--accent), #0284c7)', color: '#fff', fontSize: '1.1rem', fontWeight: 'bold', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', boxShadow: '0 4px 20px rgba(56, 189, 248, 0.4)', transition: 'all 0.3s ease', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 25px rgba(56, 189, 248, 0.5)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(56, 189, 248, 0.4)'; }}
        onClick={() => {
          const hasInvalid = configs.some(cfg => {
             const v = myStats[cfg.key];
             const vp = myStats[`${cfg.key}_pot`];
             return v === '' || v < 20 || v > 80 || vp === '' || vp < 20 || vp > 80;
          });
          if (hasInvalid) {
            alert("모든 능력치를 20~80 사이로 입력해주세요.");
            return;
          }
          handleSubmit();
        }}
        disabled={submitting}
      >
        <Send size={16} />
        {submitting ? '제출 중...' : existingVote ? '📝 평가 수정하기' : '📤 스카우팅 리포트 제출'}
      </button>



      {/* 팬들의 스카우팅 코멘트 */}
      {commentsList.length > 0 && (
        <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-1)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            💬 스카우터들의 평가 코멘트
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {commentsList.map((c, i) => (
              <div key={i} style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                  <strong style={{ color: 'var(--text-1)' }}>{c.nickname}</strong>
                  <span style={{ color: 'var(--text-3)' }}>{new Date(c.updated_at).toLocaleDateString()}</span>
                </div>
                <div style={{ color: 'var(--text-2)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                  {c.comment}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function grade_color(g) {
  const m = { S: '#FFD700', A: '#C0C0C0', B: '#CD7F32', C: '#94a3b8', D: '#475569' };
  return m[g] || '#94a3b8';
}
