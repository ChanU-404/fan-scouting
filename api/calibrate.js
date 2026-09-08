/**
 * 20-80 스케일 보정 알고리즘 모듈
 * 
 * 규칙:
 * - 최소 20, 최대 80
 * - 5점 단위로만 최종 표기
 * - 팬 평균의 반올림(0.5 이상 올림) 적용
 */

/**
 * 원점수 배열을 받아 20-80 스케일로 보정
 * @param {number[]} rawScores - 팬 입력 점수 배열 (20~80)
 * @returns {number|null} 보정된 5점 단위 점수 (20~80) 또는 null
 */
function calibrateScore(rawScores) {
  if (!rawScores || rawScores.length === 0) return null;

  // 1. 산술 평균
  const mean = rawScores.reduce((sum, s) => sum + s, 0) / rawScores.length;

  // 2. 5점 단위 그리딩 (표준 반올림: 0.5 이상 올림)
  const rounded = Math.round(mean / 5) * 5;

  // 3. [20, 80] 범위 클램핑
  return Math.max(20, Math.min(80, rounded));
}

/**
 * 팬 평가 수에 따라 가중 블렌딩된 최종 점수 계산
 * @param {number} fanMean - 팬 평균 원점수
 * @param {number} seedScore - 시스템 Seed Score
 * @param {number} voteCount - 참여 인원 수
 * @returns {{ score: number, source: string }}
 */
function blendScore(fanMean, seedScore, voteCount) {
  let blended;
  let source;

  if (voteCount === 0) {
    blended = seedScore;
    source = 'SEED';
  } else if (voteCount < 5) {
    blended = fanMean * 0.4 + seedScore * 0.6;
    source = 'BLENDED';
  } else if (voteCount < 20) {
    blended = fanMean * 0.7 + seedScore * 0.3;
    source = 'BLENDED';
  } else {
    blended = fanMean;
    source = 'FAN';
  }

  // 5점 단위 보정 + 클램핑
  const rounded = Math.round(blended / 5) * 5;
  return {
    score: Math.max(20, Math.min(80, rounded)),
    source
  };
}

/**
 * 선수 시즌 스탯으로부터 Seed Score를 산출
 * 타자: AVG, HR, RBI, SB, OPS 기반
 * 투수: ERA, IP, SO, BB, FIP 기반
 * @param {object} stat - 선수 스탯 객체
 * @param {'BATTER'|'PITCHER'} type
 * @returns {number[]} [stat1, stat2, stat3, stat4, stat5] — 각 20~80 점수
 */
function generateSeedScores(stat, type) {
  if (type === 'BATTER') {
    // Contact: 타율 기반 (avg: 0.200=20, 0.350=80)
    const contact = Math.round(clampMap(stat.avg || 0, 0.200, 0.350, 20, 80) / 5) * 5;
    // Power: HR 기반 (0=20, 40=80)
    const power = Math.round(clampMap(stat.hr || 0, 0, 40, 20, 80) / 5) * 5;
    // Eye: BB 기반 (0=20, 80=80)
    const eye = Math.round(clampMap(stat.bb || 0, 0, 80, 20, 80) / 5) * 5;
    // Speed: SB 기반 (0=20, 50=80)
    const speed = Math.round(clampMap(stat.sb || 0, 0, 50, 20, 80) / 5) * 5;
    // Fielding: OPS 기반 대략 매핑 (0.600=20, 1.000=80)
    const fielding = Math.round(clampMap(stat.ops || 0, 0.600, 1.000, 20, 80) / 5) * 5;
    return [contact, power, eye, speed, fielding].map(s => Math.max(20, Math.min(80, s)));
  } else {
    // Stuff: SO 기반 (0=20, 200=80)
    const stuff = Math.round(clampMap(stat.so || 0, 0, 200, 20, 80) / 5) * 5;
    // Command: BB 기반 (역방향, 많을수록 나쁨) (80=20, 0=80)
    const command = Math.round(clampMap(stat.bb || 0, 80, 0, 20, 80) / 5) * 5;
    // Movement: ERA 기반 (역방향) (6.00=20, 2.00=80)
    const movement = Math.round(clampMap(stat.era || 4, 6.00, 2.00, 20, 80) / 5) * 5;
    // Stamina: IP 기반 (0=20, 200=80)
    const stamina = Math.round(clampMap(parseFloat(stat.ip) || 0, 0, 200, 20, 80) / 5) * 5;
    // Composure: 승률(W/G) 기반 (0=20, 0.8=80)
    const winRate = stat.g > 0 ? (stat.win || 0) / stat.g : 0;
    const composure = Math.round(clampMap(winRate, 0, 0.8, 20, 80) / 5) * 5;
    return [stuff, command, movement, stamina, composure].map(s => Math.max(20, Math.min(80, s)));
  }
}

function clampMap(val, inMin, inMax, outMin, outMax) {
  if (inMin === inMax) return (outMin + outMax) / 2;
  const t = Math.max(0, Math.min(1, (val - inMin) / (inMax - inMin)));
  return outMin + t * (outMax - outMin);
}

/**
 * 5개 능력치의 Overall Score 계산 (5점 단위 보정)
 */
function calcOverall(stats) {
  const mean = stats.reduce((a, b) => a + b, 0) / stats.length;
  return Math.max(20, Math.min(80, Math.round(mean / 5) * 5));
}

/**
 * Overall 합산으로 카드 등급 산정
 * S: 350+, A: 300~349, B: 250~299, C: 200~249, D: <200
 */
function calcGrade(totalScore) {
  if (totalScore >= 350) return 'S';
  if (totalScore >= 300) return 'A';
  if (totalScore >= 250) return 'B';
  if (totalScore >= 200) return 'C';
  return 'D';
}

module.exports = { calibrateScore, blendScore, generateSeedScores, calcOverall, calcGrade };
