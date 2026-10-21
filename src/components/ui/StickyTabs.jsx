import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import styles from '../../styles/styles';

// 화면 맨 위에 붙는 탭 행 — 스탯 · 인사이트 · 스코어 입력이 같이 쓴다.
// 위에 둔 1px 표지(sentinel)가 화면 밖으로 나가면 '붙은 상태'로 보고 배경을 깐다.
// 탭을 바꾸면 새 탭의 맨 위부터 보이도록 탭 행 자리로 되돌린다 (scrollOnChange).
//   tabs            [[id, 라벨, { disabled, done }?], …]  disabled: 누를 수 없음 · done: 라벨 앞에 ✓
//   label           접근성 이름 (aria-label)
//   rolePrefix      탭 버튼의 data-role 앞부분 → `${rolePrefix}-${id}`, 바깥 띠는 `${rolePrefix}bar`
//   variant         'pill'(기본) 알약 상자 · 'underline' 칸을 똑같이 나누고 밑줄로 표시 (탭이 6개쯤 돼도 한 줄)
//   scrollOnChange  'stuck'(기본) 붙은 채 바꿀 때만 · 'always' 언제나 (탭 행이 화면 아래쪽에 있는 화면용)
//   anchorRef       탭 행 자리를 바깥에서도 쓰고 싶을 때 (표지 요소를 받는다)
// 바깥 띠는 화면 좌우 여백(16px)까지 펴서 붙었을 때 내용이 비쳐 보이지 않게 한다.
export default function StickyTabs({ tabs, current, onChange, label, rolePrefix, variant = 'pill', scrollOnChange = 'stuck', anchorRef }) {
  const ownRef = useRef(null);
  const sentinel = anchorRef ?? ownRef;
  const stuckRef = useRef(false);
  const mounted = useRef(false);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => {
      const now = !e.isIntersecting && e.boundingClientRect.top < 0;
      stuckRef.current = now;
      setStuck(now);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [sentinel]);

  useLayoutEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    if (scrollOnChange === 'always' || stuckRef.current) sentinel.current?.scrollIntoView?.({ block: 'start' });
  }, [current, scrollOnChange, sentinel]);

  const underline = variant === 'underline';
  const bar = underline
    ? {
      position: 'sticky', top: 0, zIndex: 30, margin: '0 -16px 14px', padding: '0 8px',
      background: stuck ? 'rgba(11,14,24,0.94)' : 'transparent',
      backdropFilter: stuck ? 'blur(8px)' : 'none', WebkitBackdropFilter: stuck ? 'blur(8px)' : 'none',
      borderBottom: '1px solid #1b2238',
      transition: 'background 0.15s',
    }
    : {
      position: 'sticky', top: 0, zIndex: 30, margin: '-8px -16px 6px', padding: '8px 16px',
      background: stuck ? 'rgba(11,14,24,0.94)' : 'transparent',
      backdropFilter: stuck ? 'blur(8px)' : 'none', WebkitBackdropFilter: stuck ? 'blur(8px)' : 'none',
      borderBottom: `1px solid ${stuck ? '#1b2238' : 'transparent'}`,
      transition: 'background 0.15s, border-color 0.15s',
    };

  return (
    <>
      <div ref={sentinel} aria-hidden="true" style={{ height: 1, marginBottom: -1 }} />
      <div data-role={`${rolePrefix}bar`} data-stuck={stuck ? '1' : '0'} style={bar}>
        <div style={underline ? { display: 'flex' } : { ...styles.riToggleRow, marginBottom: 0 }} role="tablist" aria-label={label}>
          {tabs.map(([id, text, opt]) => {
            const disabled = !!opt?.disabled;
            const on = current === id;
            const look = underline
              ? {
                flex: '1 1 0', minWidth: 0, height: 46, padding: '0 2px', background: 'none', border: 'none',
                borderBottom: `2px solid ${on ? '#c9a228' : 'transparent'}`, borderRadius: 0,
                color: on ? '#f3d36b' : '#8896b0', fontSize: 12.5, fontWeight: on ? 800 : 700, whiteSpace: 'nowrap', cursor: 'pointer',
              }
              : { ...styles.riToggleBtn, letterSpacing: 0, padding: '8px 0', ...(on ? styles.riToggleBtnActive : {}) };
            return (
              <button key={id} role="tab" type="button" aria-selected={on} disabled={disabled} data-role={`${rolePrefix}-${id}`}
                style={{ ...look, ...(disabled ? { color: '#3d4d65', cursor: 'default' } : {}) }}
                onClick={() => onChange(id)}>
                {opt?.done && <span aria-hidden="true" style={{ color: '#3db87a', marginRight: 3 }}>✓</span>}{text}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
