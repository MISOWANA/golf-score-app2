import { useEffect } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

// 앱 안에서 띄우는 알림 — 브라우저 기본 alert() 는 설치형(PWA) 화면에서 어색하고 앱 글꼴도 아니라서 이걸로 바꿨다.
//   notice  { tone: 'ok' | 'error', text } | null     text 안의 줄바꿈(\n)은 그대로 보인다
//   onClose 닫기 — 성공 알림은 몇 초 뒤 저절로 닫히고, 오류는 "확인"을 누를 때까지 남는다 (중요한 경고를 놓치지 않게)
const OK_MS = 9000;

export default function NoticeToast({ notice, onClose }) {
  useEffect(() => {
    if (!notice || notice.tone === 'error') return undefined;
    const t = setTimeout(onClose, OK_MS);
    return () => clearTimeout(t);
  }, [notice, onClose]);

  if (!notice) return null;
  const error = notice.tone === 'error';
  const Icon = error ? AlertTriangle : CheckCircle2;
  const tone = error ? '#ef5350' : '#3db87a';
  return (
    <div role={error ? 'alert' : 'status'} data-role="notice" data-tone={notice.tone}
      style={{
        position: 'fixed', left: 16, right: 16, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)', zIndex: 9500,
        maxWidth: 488, margin: '0 auto', boxSizing: 'border-box', display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '12px 8px 12px 14px', borderRadius: 14, background: '#1b2744', border: `1.5px solid ${error ? 'rgba(239,83,80,0.65)' : 'rgba(61,184,122,0.55)'}`,
        boxShadow: '0 8px 28px rgba(0,0,0,0.55)', textAlign: 'left',
      }}>
      <Icon size={20} color={tone} style={{ flexShrink: 0, marginTop: 2 }} />
      <div data-role="notice-text" style={{ flex: 1, minWidth: 0, fontSize: 15, lineHeight: 1.55, color: '#e8edf8', whiteSpace: 'pre-line', wordBreak: 'keep-all', overflowWrap: 'anywhere' }}>{notice.text}</div>
      <button type="button" data-role="notice-close" onClick={onClose}
        style={{ flexShrink: 0, minHeight: 44, minWidth: 52, padding: '0 10px', borderRadius: 10, border: 'none', background: 'transparent', color: error ? '#ff8a87' : '#7fd4a6', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>확인</button>
    </div>
  );
}
