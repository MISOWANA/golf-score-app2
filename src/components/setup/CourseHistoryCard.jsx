import KoEnTitle from '../ui/KoEnTitle';
import { signedDiff } from '../../share/reportImageModel.js';

// 라운드 설정의 "이 코스 기록" — 같은 코스를 전에 쳤을 때의 스코어 · 어려웠던 홀 · 홀 메모 (engine/courseHistory.js).
//   history  buildCourseHistory 결과 (기록이 없으면 null → 아무것도 그리지 않는다)
const md = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : `${d.getMonth() + 1}/${d.getDate()}`; };
const diffColor = (d) => (d < 0 ? '#3db87a' : d === 0 ? '#8896b0' : '#ef5350');
const sign = (n) => (n > 0 ? `+${n}` : `${n}`);

export default function CourseHistoryCard({ history }) {
  if (!history) return null;
  const { count, best, recent, hardest, memos } = history;
  return (
    <section data-role="course-history" style={{ margin: '0 0 14px', padding: '12px 14px', borderRadius: 16, background: 'rgba(201,162,40,0.06)', border: '1px solid rgba(201,162,40,0.3)', textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
        <div style={{ color: '#b4c0d8' }}><KoEnTitle ko="이 코스 기록" en="COURSE HISTORY" /></div>
        <span data-role="course-count" style={{ fontSize: 14, fontWeight: 800, color: '#c9a228', whiteSpace: 'nowrap' }}>{count}번 쳤어요</span>
      </div>

      <div data-role="course-recent" style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {recent.map((r) => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#c4cfe0' }}>
            <span style={{ width: 44, color: '#8896b0' }}>{md(r.date)}</span>
            <b style={{ color: '#e8edf8', fontVariantNumeric: 'tabular-nums' }}>{r.total}타</b>
            <span style={{ color: diffColor(r.diff), fontWeight: 700 }}>({signedDiff(r.diff)})</span>
            {r.nine && <span style={{ fontSize: 12, color: '#8896b0', border: '1px solid #2c3a5c', borderRadius: 6, padding: '0 5px' }}>9홀</span>}
            {r.players > 1 && <span style={{ fontSize: 12, color: '#8896b0' }}>동반 {r.players}명</span>}
          </div>
        ))}
      </div>

      {best && (
        <div data-role="course-best" style={{ marginTop: 8, fontSize: 14, color: '#a9b8d6' }}>
          베스트 <b style={{ color: '#f3d36b' }}>{best.total}타</b> <span style={{ color: '#8896b0' }}>({md(best.date)})</span>
        </div>
      )}

      {hardest.length > 0 && (
        <div data-role="course-hardest" style={{ marginTop: 10, paddingTop: 9, borderTop: '1px solid rgba(201,162,40,0.2)' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#8896b0', marginBottom: 5 }}>어려웠던 홀 <span style={{ fontWeight: 500 }}>· 이 코스에서 파보다 평균 얼마나 더 쳤는지</span></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {hardest.map((h) => (
              <span key={h.holeNumber} data-role="course-hard-hole" style={{ fontSize: 14, fontWeight: 800, color: '#ef5350', background: 'rgba(239,83,80,0.1)', border: '1px solid rgba(239,83,80,0.3)', borderRadius: 999, padding: '3px 10px', whiteSpace: 'nowrap' }}>
                {h.holeNumber}번 {sign(h.avgDiff)} <span style={{ fontSize: 12, fontWeight: 600, color: '#a9b8d6' }}>파{h.par} · {h.n}번</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {memos.length > 0 && (
        <div data-role="course-memos" style={{ marginTop: 10, paddingTop: 9, borderTop: '1px solid rgba(201,162,40,0.2)' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#8896b0', marginBottom: 5 }}>지난 홀 메모</div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
            {memos.map((m, i) => (
              <li key={i} style={{ fontSize: 14, color: '#c4cfe0', lineHeight: 1.5, wordBreak: 'keep-all' }}>
                <b style={{ color: '#c9a228' }}>{m.holeNumber}번 홀</b> {m.text} <span style={{ fontSize: 12, color: '#6e84a8' }}>({md(m.date)})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
