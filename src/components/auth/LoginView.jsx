import React, { useState } from 'react';
import styles from '../../styles/styles';

function BirdieBuddyLogo() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      marginBottom: '36px',
    }}>
      {/* Flag icon mark */}
      <div style={{ marginBottom: '18px' }}>
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
          <line x1="16" y1="5" x2="16" y2="39" stroke="#c9a228" strokeWidth="2.5" strokeLinecap="round" />
          <polygon points="16,5 34,13 16,21" fill="#c9a228" />
          <ellipse cx="16" cy="39" rx="9" ry="2.5" fill="rgba(201,162,40,0.22)" />
        </svg>
      </div>

      {/* BIRDIE — large gold */}
      <div style={{
        fontSize: '38px',
        fontWeight: '900',
        color: '#c9a228',
        letterSpacing: '0.10em',
        lineHeight: 1,
        fontFamily: "'Noto Sans KR', sans-serif",
      }}>
        BIRDIE
      </div>

      {/* BUDDY — light with wide tracking */}
      <div style={{
        fontSize: '17px',
        fontWeight: '300',
        color: '#e8edf8',
        letterSpacing: '0.40em',
        lineHeight: 1,
        marginTop: '6px',
        fontFamily: "'Noto Sans KR', sans-serif",
        paddingLeft: '0.40em', /* compensate tracking so it looks centered */
      }}>
        BUDDY
      </div>

      {/* Gold separator line */}
      <div style={{
        width: '44px',
        height: '1.5px',
        background: 'linear-gradient(90deg, transparent, #c9a228, transparent)',
        marginTop: '14px',
      }} />

      {/* Tagline */}
      <div style={{
        fontSize: '10px',
        fontWeight: '500',
        color: '#4d5a78',
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        marginTop: '10px',
        fontFamily: "'Noto Sans KR', sans-serif",
      }}>
        GOLF SCORE TRACKER
      </div>
    </div>
  );
}

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
        <BirdieBuddyLogo />

        <form onSubmit={handleSubmit} style={styles.loginForm}>
          <div style={styles.formSection}>
            <label style={styles.formLabel}>이름</label>
            <input
              style={{
                ...styles.formInput,
                borderColor: inputFocused ? '#c9a228' : '#252f4a',
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
