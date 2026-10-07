import React from 'react';

// 화면 하나가 렌더 중 오류를 내도 앱 전체가 흰 화면으로 멈추지 않게 한다.
// 데이터는 IndexedDB에 그대로 있으므로, 홈으로 돌아가거나 새로고침하면 대부분 복구된다.
//
//   onHome — 있으면 "홈으로" 버튼을 보여준다 (앱 안쪽 경계용).
//   key를 바꾸면(화면 전환) 오류 상태가 초기화된다.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('화면 오류', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const btn = {
      width: '100%', padding: '14px', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer',
    };
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, background: '#0b0e18', textAlign: 'center',
      }}>
        <div style={{ width: '100%', maxWidth: 340 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⛳</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#e8edf8', marginBottom: 8 }}>
            화면을 표시하지 못했어요
          </div>
          <div style={{ fontSize: 13, color: '#8896b0', lineHeight: 1.7, marginBottom: 20 }}>
            저장된 기록은 그대로 있어요.<br />
            아래 버튼으로 다시 시도해 주세요.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {this.props.onHome && (
              <button
                style={{ ...btn, border: 'none', background: '#c9a228', color: '#0b0e18' }}
                onClick={() => { this.setState({ error: null }); this.props.onHome(); }}
              >홈으로</button>
            )}
            <button
              style={{ ...btn, border: '1.5px solid #3a4e72', background: 'transparent', color: '#e8edf8' }}
              onClick={() => window.location.reload()}
            >새로고침</button>
          </div>
          <div style={{ marginTop: 16, fontSize: 11, color: '#4d5a78', wordBreak: 'break-all' }}>
            {String(error?.message || error)}
          </div>
        </div>
      </div>
    );
  }
}
