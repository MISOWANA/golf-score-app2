import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// 설명 문구를 접어 두는 (!) 버튼. 화면에는 동그라미 안의 느낌표만 놓고, 누르면 알림창(노티스)으로 본문을 보여준다.
//   title     알림창 제목 (버튼의 접근성 이름에도 쓰인다)
//   children  본문 — 문단이 여럿이면 <p> 로 나눈다 (문단 사이 간격은 globalCSS 의 .bb-note-body p).
// 버튼은 제목·라벨 글자 바로 뒤에 인라인으로 붙는다. 알림창은 body 로 띄워서 어느 카드 안에 있든 레이아웃을 건드리지 않는다.

const BLUE = '#8ca4bc';

const circle = (size, font) => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box',
  width: size, height: size, borderRadius: '50%', border: '1.5px solid currentColor',
  fontSize: font, fontWeight: 800, lineHeight: 1, letterSpacing: 0, textTransform: 'none', fontStyle: 'normal',
});

export default function InfoNote({ title = '참고', children }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const closeRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    const btn = btnRef.current;
    return () => { window.removeEventListener('keydown', onKey); btn?.focus?.(); };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef} type="button" data-role="info-note"
        aria-label={`${title} 설명 보기`} aria-haspopup="dialog" aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', verticalAlign: 'middle',
          width: 26, height: 26, margin: '-6px -3px -6px 3px', padding: 0, flexShrink: 0,
          background: 'transparent', border: 'none', cursor: 'pointer', color: open ? '#c9a228' : '#7f93b3',
        }}
      >
        <span aria-hidden="true" style={circle(16, 10)}>!</span>
      </button>

      {open && createPortal(
        <div
          // 포탈이어도 React 이벤트는 부모로 번진다 — 알림창을 닫는 클릭이 감싼 카드의 onClick 을 건드리지 않게 막는다
          data-role="info-note-dialog" onClick={(e) => { e.stopPropagation(); setOpen(false); }}
          style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(0,0,0,0.65)' }}
        >
          <div
            role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 340, maxHeight: '80vh', display: 'flex', flexDirection: 'column',
              background: '#0f1825', border: '1px solid #1b2744', borderRadius: 16, padding: '20px 20px 16px',
              boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12, color: BLUE }}>
              <span aria-hidden="true" style={{ ...circle(20, 12), flexShrink: 0 }}>!</span>
              <div id={titleId} style={{ fontSize: 15, fontWeight: 800, color: '#e8edf8', lineHeight: 1.35, wordBreak: 'keep-all' }}>{title}</div>
            </div>
            <div data-role="info-note-body" className="bb-note-body" style={{ overflowY: 'auto', fontSize: 13, lineHeight: 1.7, color: '#b4c0d8', wordBreak: 'keep-all' }}>
              {children}
            </div>
            <button
              ref={closeRef} type="button" onClick={() => setOpen(false)}
              style={{ marginTop: 16, padding: '12px 8px', borderRadius: 10, border: '1.5px solid #252f4a', background: 'transparent', color: '#e8edf8', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >확인</button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
