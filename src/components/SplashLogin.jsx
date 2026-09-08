import React, { useState } from 'react';

export default function SplashLogin({ onLogin }) {
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setError('이름(닉네임)을 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const BASE_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';
      const res = await fetch(`${BASE_URL}/api/auth/w2m`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim(), password })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || '로그인에 실패했습니다.');
      }
      
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 9999
    }}>
      <div style={{
        background: 'var(--surface)', padding: '40px', borderRadius: '16px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)', maxWidth: '400px', width: '100%',
        border: '1px solid var(--border)', textAlign: 'center'
      }}>
        <h1 style={{ marginBottom: '32px', color: 'var(--text-1)', fontSize: '2rem' }}>로그인</h1>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', gap: '8px' }}>
            <label style={{ color: 'var(--text-1)', fontWeight: 'bold' }}>이름 (닉네임):</label>
            <input 
              type="text" 
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              style={{
                padding: '12px', borderRadius: '8px', border: '1px solid var(--border)',
                background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '1rem', outline: 'none'
              }}
              required
              autoFocus
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', gap: '8px' }}>
            <label style={{ color: 'var(--text-1)', fontWeight: 'bold' }}>비밀번호 (선택사항):</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                padding: '12px', borderRadius: '8px', border: '1px solid var(--border)',
                background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '1rem', outline: 'none'
              }}
            />
          </div>

          {error && <div style={{ color: '#ef4444', fontSize: '0.9rem' }}>{error}</div>}

          <button 
            type="submit" 
            disabled={loading}
            style={{
              marginTop: '8px', padding: '14px', background: 'var(--primary)', color: '#fff',
              border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1rem',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s'
            }}
          >
            {loading ? '로그인 중...' : '시작하기'}
          </button>
        </form>

        <div style={{ marginTop: '32px', color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: '1.6' }}>
          이름/비밀번호는 현재 기기에서만 사용됩니다.<br/>
          처음 오셨다면 새로운 비밀번호를 만들어주세요.<br/>
          다시 오셨다면 기존 이름/비밀번호를 입력해주세요.
        </div>
      </div>
    </div>
  );
}
