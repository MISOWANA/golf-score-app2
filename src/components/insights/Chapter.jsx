import { CHAPTERS } from './chapters.js';

// 리포트의 장(章) 머리글과 장 이동 칩.

const jump = (id) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
};

export function ChapterNav() {
  return (
    <div data-role="chapter-nav" role="navigation" aria-label="리포트 장 이동"
      style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 6 }}>
      {CHAPTERS.map((c) => (
        <button key={c.id} type="button" data-role={`nav-${c.id}`} onClick={() => jump(c.id)}
          style={{
            flexShrink: 0, padding: '6px 10px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
            border: '1px solid #252f4a', background: '#111827', color: '#8ca4bc', fontSize: 12, fontWeight: 700,
          }}>
          <span style={{ color: '#c9a228', marginRight: 4 }}>{c.no}</span>{c.short}
        </button>
      ))}
    </div>
  );
}

export default function Chapter({ no }) {
  const c = CHAPTERS.find((x) => x.no === no);
  return (
    <div id={c.id} data-role={c.id} style={{ margin: '30px 0 16px', scrollMarginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(201,162,40,0.16)', border: '1px solid rgba(201,162,40,0.5)', color: '#c9a228', fontSize: 13, fontWeight: 900,
        }}>{c.no}</div>
        <div style={{ fontSize: 18, fontWeight: 900, color: '#e8edf8', letterSpacing: '-0.01em' }}>{c.title}</div>
      </div>
      <div style={{ fontSize: 12, color: '#8896b0', marginTop: 6, paddingBottom: 10, borderBottom: '1px solid #1b2238', lineHeight: 1.5, wordBreak: 'keep-all' }}>
        {c.question}
      </div>
    </div>
  );
}
