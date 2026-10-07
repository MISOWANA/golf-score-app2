import React, { useState } from 'react';
import styles from '../../styles/styles';
import { loadRoundsByUser, userIdsOf } from '../../db.js';

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

export default function LoginView({ onLogin, onDeleteProfile, loading, profiles = [] }) {
  const [userName, setUserName] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  // 삭제 확인 중인 사용자 { profile, rounds: 라운드 수(불러오는 중이면 null) }
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const askDelete = async (profile) => {
    setPendingDelete({ profile, rounds: null });
    try {
      const rounds = await loadRoundsByUser(userIdsOf(profile));
      setPendingDelete((cur) => (cur?.profile.userId === profile.userId ? { profile, rounds: rounds.length } : cur));
    } catch {
      setPendingDelete((cur) => (cur?.profile.userId === profile.userId ? { profile, rounds: '?' } : cur));
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await onDeleteProfile(pendingDelete.profile);
      setPendingDelete(null);
    } catch (e) {
      alert(`삭제하지 못했어요. ${e?.message || ''}`);
    } finally {
      setDeleting(false);
    }
  };

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

        {/* 이 기기에 기록이 있는 사용자 — 탭 한 번으로 이어서 쓴다 */}
        {profiles.length > 0 && (
          <div style={{ marginBottom: 24, textAlign: 'left' }}>
            <div style={{ ...styles.formLabel, marginBottom: 8 }}>이어서 하기</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {profiles.map((p) => (
                <div key={p.userId} style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => onLogin(p.userName)}
                    style={{
                      flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                      padding: '13px 16px', borderRadius: 10, cursor: 'pointer',
                      border: '1.5px solid rgba(201,162,40,0.45)', background: 'rgba(201,162,40,0.08)',
                      color: '#e8edf8', fontSize: 15, fontWeight: 700, textAlign: 'left',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.userName}</span>
                    <span style={{ color: '#c9a228', fontSize: 13, flexShrink: 0 }}>계속 →</span>
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => askDelete(p)}
                    aria-label={`${p.userName} 삭제`}
                    style={{
                      width: 48, flexShrink: 0, borderRadius: 10, cursor: 'pointer',
                      border: '1.5px solid #252f4a', background: 'transparent',
                      color: '#8896b0', fontSize: 16,
                    }}
                  >🗑</button>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#4d5a78', marginTop: 8, lineHeight: 1.6 }}>
              같은 이름을 입력해도 기존 기록으로 이어집니다.
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.loginForm}>
          <div style={styles.formSection}>
            <label style={styles.formLabel}>{profiles.length > 0 ? '새 사용자' : '이름'}</label>
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
              maxLength={20}
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

      {/* 사용자 삭제 확인 */}
      {pendingDelete && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 24 }}
          onClick={() => !deleting && setPendingDelete(null)}
        >
          <div
            style={{ background: '#0f1825', borderRadius: 16, padding: '28px 22px', width: '100%', maxWidth: 320, border: '1px solid #1b2744', boxShadow: '0 8px 40px rgba(0,0,0,0.6)', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 26, marginBottom: 12 }}>🗑</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#e8edf8', marginBottom: 8 }}>
              '{pendingDelete.profile.userName}' 사용자를 삭제할까요?
            </div>
            <div style={{ fontSize: 12, color: '#ef5350', background: 'rgba(239,83,80,0.08)', border: '1px solid rgba(239,83,80,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, lineHeight: 1.6 }}>
              라운드 {pendingDelete.rounds ?? '…'}개, MY BAG 설정, 진행 중인 라운드가<br />
              이 기기에서 영구히 삭제돼요. 되돌릴 수 없어요.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                disabled={deleting}
                onClick={() => setPendingDelete(null)}
                style={{ padding: 13, borderRadius: 10, border: '1.5px solid #252f4a', background: 'transparent', color: '#e8edf8', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >취소</button>
              <button
                type="button"
                disabled={deleting || pendingDelete.rounds == null}
                onClick={confirmDelete}
                style={{
                  padding: 13, borderRadius: 10, border: 'none', background: '#ef5350', color: '#fff',
                  fontSize: 14, fontWeight: 800, cursor: 'pointer',
                  opacity: deleting || pendingDelete.rounds == null ? 0.5 : 1,
                }}
              >{deleting ? '삭제 중…' : '삭제'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
