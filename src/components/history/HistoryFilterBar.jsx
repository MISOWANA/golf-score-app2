import { Search, X } from 'lucide-react';
import { HISTORY_SORTS, HISTORY_KINDS } from '../../engine/historyFilter.js';

// 히스토리 위쪽의 찾기 줄 — 코스 · 메모 검색, 연도 · 9홀/18홀 걸러 보기, 정렬.
// 라운드가 몇 개 안 될 때는 HistoryView 가 아예 그리지 않는다 (찾을 일이 없는데 화면만 차지한다).
//   years  기록이 있는 연도들 (2개 이상일 때만 연도 칩을 보인다)
//   showKinds  18홀 · 9홀 기록이 둘 다 있을 때만 종류 칩을 보인다
const chip = (on) => ({
  minHeight: 44, padding: '0 14px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
  border: `1.5px solid ${on ? '#1b64da' : '#cdd3d8'}`,
  background: on ? 'rgba(27,100,218,0.16)' : 'transparent',
  color: on ? '#1b64da' : '#333d4b', fontSize: 14, fontWeight: 700,
});
const rowStyle = { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 };

export default function HistoryFilterBar({ query, onQuery, year, onYear, years, kind, onKind, showKinds, sort, onSort, shown, total, filtered, onClear }) {
  return (
    <div data-role="history-filter" style={{ marginBottom: 14 }}>
      <div style={{ position: 'relative' }}>
        <Search size={18} color="#4e5968" style={{ position: 'absolute', left: 14, top: 14, pointerEvents: 'none' }} />
        <input type="text" data-role="history-search" value={query} onChange={(e) => onQuery(e.target.value)}
          placeholder="코스 · 메모로 찾기" aria-label="라운드 검색" autoComplete="off" spellCheck={false}
          style={{ width: '100%', boxSizing: 'border-box', height: 46, padding: '0 44px 0 42px', fontSize: 16, borderRadius: 12, border: '1px solid #d1d6db', background: '#e8ebee', color: '#191f28', outline: 'none' }} />
        {query && (
          <button type="button" data-role="history-search-clear" aria-label="검색어 지우기" onClick={() => onQuery('')}
            style={{ position: 'absolute', right: 2, top: 1, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: '#333d4b', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        )}
      </div>

      {(years.length > 1 || showKinds) && (
        <div role="group" aria-label="걸러 보기" style={rowStyle}>
          {years.length > 1 && years.map((y) => (
            <button key={y} type="button" data-role={`history-year-${y}`} aria-pressed={year === y} style={chip(year === y)}
              onClick={() => onYear(year === y ? null : y)}>{y}년</button>
          ))}
          {showKinds && HISTORY_KINDS.filter((k) => k.id !== 'all').map((k) => (
            <button key={k.id} type="button" data-role={`history-kind-${k.id}`} aria-pressed={kind === k.id} style={chip(kind === k.id)}
              onClick={() => onKind(kind === k.id ? 'all' : k.id)}>{k.label}</button>
          ))}
        </div>
      )}

      <div role="radiogroup" aria-label="정렬" style={rowStyle}>
        {HISTORY_SORTS.map((s) => (
          <button key={s.id} type="button" role="radio" aria-checked={sort === s.id} data-role={`history-sort-${s.id}`}
            style={{ ...chip(sort === s.id), borderRadius: 10 }} onClick={() => onSort(s.id)}>{s.label}</button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 10, minHeight: 28 }}>
        <span data-role="history-count" style={{ fontSize: 14, color: '#333d4b' }}>
          {filtered ? <>전체 {total}개 중 <b style={{ color: '#191f28' }}>{shown}개</b></> : <>라운드 <b style={{ color: '#191f28' }}>{total}개</b></>}
        </span>
        {filtered && (
          <button type="button" data-role="history-clear" onClick={onClear}
            style={{ minHeight: 36, padding: '0 6px', background: 'none', border: 'none', color: '#1b64da', fontSize: 14, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}>
            조건 지우기
          </button>
        )}
      </div>
    </div>
  );
}
