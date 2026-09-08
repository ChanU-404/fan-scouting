/**
 * AuthModal 컴포넌트
 * 로그인 / 회원가입 모달
 */
import React, { useState } from 'react';
import { X, User, Lock, Mail, LogIn, UserPlus } from 'lucide-react';

const BASE_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';
const API = `${BASE_URL}/api`;

export default function AuthModal({ onClose, onAuth }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ nickname: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const body = mode === 'login'
        ? { email: form.email, password: form.password }
        : { nickname: form.nickname, email: form.email, password: form.password };

      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '오류가 발생했습니다.');

      localStorage.setItem('kbo_token', data.token);
      localStorage.setItem('kbo_user', JSON.stringify(data.user));
      onAuth(data.token, data.user);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>

        <div className="auth-modal-header">
          <div className="auth-logo">⚾</div>
          <h2 className="auth-title">KBO 스카우팅 카드</h2>
          <p className="auth-subtitle">팬이 만드는 선수 능력치</p>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(''); }}
          >
            <LogIn size={14} /> 로그인
          </button>
          <button
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => { setMode('register'); setError(''); }}
          >
            <UserPlus size={14} /> 회원가입
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="auth-field">
              <User size={15} />
              <input
                type="text" name="nickname" placeholder="닉네임 (스카우터명)"
                value={form.nickname} onChange={handleChange} required
                maxLength={20}
              />
            </div>
          )}
          <div className="auth-field">
            <Mail size={15} />
            <input
              type="email" name="email" placeholder="이메일"
              value={form.email} onChange={handleChange} required
            />
          </div>
          <div className="auth-field">
            <Lock size={15} />
            <input
              type="password" name="password" placeholder="비밀번호 (6자 이상)"
              value={form.password} onChange={handleChange} required
              minLength={6}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? '처리 중...' : mode === 'login' ? '로그인' : '스카우터 등록하기'}
          </button>
        </form>

        <div className="auth-footer">
          {mode === 'login' ? (
            <span>아직 계정이 없으신가요? <button onClick={() => { setMode('register'); setError(''); }}>회원가입</button></span>
          ) : (
            <span>이미 계정이 있으신가요? <button onClick={() => { setMode('login'); setError(''); }}>로그인</button></span>
          )}
        </div>
      </div>
    </div>
  );
}
