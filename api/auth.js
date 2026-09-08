/**
 * JWT 인증 미들웨어 및 인증 유틸리티
 */
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'kbo-scouting-secret-key-2026-change-in-prod';
const JWT_EXPIRES = '7d';

/**
 * JWT 토큰 생성
 */
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

/**
 * 비밀번호 해시
 */
async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

/**
 * 비밀번호 검증
 */
async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

/**
 * 인증 미들웨어 — Authorization: Bearer <token>
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '인증이 필요합니다.' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, nickname, email }
    next();
  } catch (e) {
    return res.status(401).json({ error: '토큰이 유효하지 않습니다.' });
  }
}

/**
 * 선택적 인증 미들웨어 — 로그인 시 user 세팅, 아니면 통과
 */
function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.slice(7), JWT_SECRET);
    } catch (_) {}
  }
  next();
}

module.exports = { signToken, hashPassword, comparePassword, requireAuth, optionalAuth };
