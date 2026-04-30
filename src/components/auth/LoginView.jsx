import React, { useState } from 'react';
import styles from '../../styles/styles';

export default function LoginView({ onLogin, loading }) {
  const [userName, setUserName] = useState('');
  const [inputFocused, setInputFocused] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (userName.trim()) {
      onLogin(userName.trim());
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginCard}>
        <div style={styles.loginLogo}>⛳</div>
        <h1 style={styles.loginTitle}>Every Score</h1>
        <p style={styles.loginSubtitle}>골프 스코어 기록 앱</p>

        <form onSubmit={handleSubmit} style={styles.loginForm}>
          <div style={styles.formSection}>
            <label style={styles.formLabel}>이름</label>
            <input
              style={{
                ...styles.formInput,
                borderColor: inputFocused ? '#1f3d2e' : '#e0dbd3',
              }}
              placeholder="플레이어 이름을 입력하세요"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              disabled={loading}
            />
          </div>

          <button
            style={{
              ...styles.primaryButton,
              opacity: userName.trim() && !loading ? 1 : 0.4,
              cursor: userName.trim() && !loading ? 'pointer' : 'not-allowed',
            }}
            disabled={!userName.trim() || loading}
            type="submit"
          >
            {loading ? '로딩 중...' : '시작하기'}
          </button>
        </form>
      </div>
    </div>
  );
}
