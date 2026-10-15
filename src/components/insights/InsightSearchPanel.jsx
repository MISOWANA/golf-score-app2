import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import InsightCard from './InsightCard.jsx';
import { SEVERITY_COLOR } from './insightTheme.js';
import { buildInsightIndex, searchInsights, countByCategory, SEVERITY_LABEL } from '../../engine/insightIndex.js';
import { INSIGHT_CATEGORY_LABEL, INSIGHT_CATEGORY_ORDER } from '../../engine/rules/category.js';

const QUICK = ['3퍼트', '숏퍼트', '거리감', 'OB', '해저드', '드라이버', '업앤다운', '버디', '후반', '연속'];
const PAGE = 30;

const pill = (active, color = '#c9a228') => ({
  padding: '6px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer',
  border: `1px solid ${active ? color : '#252f4a'}`,
  background: active ? `${color}22` : '#111827',
  color: active ? color : '#8896b0', whiteSpace: 'nowrap',
});

const dateLabel = (d) => {
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? String(d).slice(0, 10) : `${t.getMonth() + 1}/${t.getDate()}`;
};

// 인사이트 검색 — 모든 라운드·홀·누적 인사이트를 한 목록에서 찾는다.
export default function InsightSearchPanel({ rounds }) {
  const solo = useMemo(() => rounds.filter(r => r.players.length === 1), [rounds]);
  const index = useMemo(() => buildInsightIndex(solo), [solo]);
  const [query, setQuery] = useState('');
  const [severities, setSeverities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [scope, setScope] = useState('all');
  const [roundId, setRoundId] = useState('');
  const [limit, setLimit] = useState(PAGE);

  const toggle = (arr, setArr, v) => { setArr(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]); setLimit(PAGE); };
  const results = useMemo(
    () => searchInsights(index, { query, severities, categories, scope, roundId: roundId || undefined }),
    [index, query, severities, categories, scope, roundId],
  );
  // 분류 칩의 개수는 '분류 필터를 뺀' 결과 기준 — 다른 분류를 누르면 얼마나 있는지 미리 보여준다
  const forCounts = useMemo(
    () => searchInsights(index, { query, severities, scope, roundId: roundId || undefined }),
    [index, query, severities, scope, roundId],
  );
  const catCounts = countByCategory(forCounts);
  const activeFilterCount = severities.length + categories.length + (scope !== 'all' ? 1 : 0) + (roundId ? 1 : 0);
  const reset = () => { setQuery(''); setSeverities([]); setCategories([]); setScope('all'); setRoundId(''); setLimit(PAGE); };

  return (
    <div data-panel="search">
      {/* 검색창 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#111827', border: '1px solid #252f4a', borderRadius: 10, padding: '0 12px', marginBottom: 10 }}>
        <Search size={16} color="#6e84a8" />
        <input
          type="search"
          aria-label="인사이트 검색"
          value={query}
          onChange={e => { setQuery(e.target.value); setLimit(PAGE); }}
          placeholder="예: 3퍼트, 숏퍼트, 거리감, OB, 드라이버, 7번"
          style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: '#e8edf8', fontSize: 14, padding: '12px 0' }}
        />
        {query && (
          <button aria-label="검색어 지우기" onClick={() => { setQuery(''); setLimit(PAGE); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6e84a8', padding: 4, display: 'flex' }}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* 추천 검색어 */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 10 }}>
        {QUICK.map(q => (
          <button key={q} style={pill(query.trim() === q)} onClick={() => { setQuery(query.trim() === q ? '' : q); setLimit(PAGE); }}>{q}</button>
        ))}
      </div>

      {/* 필터 */}
      <div style={{ background: '#111827', border: '1px solid #1b2238', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#6e84a8', letterSpacing: '0.18em', marginBottom: 6 }}>심각도</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {['critical', 'warning', 'neutral', 'positive'].map(s => (
            <button key={s} style={pill(severities.includes(s), SEVERITY_COLOR[s])} onClick={() => toggle(severities, setSeverities, s)}>{SEVERITY_LABEL[s]}</button>
          ))}
        </div>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#6e84a8', letterSpacing: '0.18em', marginBottom: 6 }}>분류</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {INSIGHT_CATEGORY_ORDER.filter(c => catCounts[c] || categories.includes(c)).map(c => (
            <button key={c} style={pill(categories.includes(c))} onClick={() => toggle(categories, setCategories, c)}>
              {INSIGHT_CATEGORY_LABEL[c]} {catCounts[c] ?? 0}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#6e84a8', letterSpacing: '0.18em', marginBottom: 6 }}>범위</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {[['all', '전체'], ['hole', '홀별'], ['round', '라운드 요약'], ['career', '누적 추세']].map(([v, l]) => (
            <button key={v} style={pill(scope === v)} onClick={() => { setScope(v); setLimit(PAGE); }}>{l}</button>
          ))}
          {solo.length > 1 && (
            <select
              aria-label="라운드 선택"
              value={roundId}
              onChange={e => { setRoundId(e.target.value); setLimit(PAGE); }}
              style={{ background: '#111827', color: '#e8edf8', border: '1px solid #252f4a', borderRadius: 8, padding: '6px 8px', fontSize: 12, maxWidth: 180 }}
            >
              <option value="">모든 라운드</option>
              {solo.map(r => <option key={r.id} value={r.id}>{dateLabel(r.date)} {r.courseName}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* 결과 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: '#8896b0' }} data-role="result-count">
          {query.trim() ? `"${query.trim()}" ` : ''}<b style={{ color: '#e8edf8' }}>{results.length}건</b>
          {activeFilterCount > 0 && ` · 필터 ${activeFilterCount}개`}
        </div>
        {(query || activeFilterCount > 0) && (
          <button onClick={reset} style={{ background: 'none', border: 'none', color: '#c9a228', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>초기화</button>
        )}
      </div>

      {results.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#8896b0', fontSize: 13, lineHeight: 1.7, padding: '28px 12px', background: '#111827', border: '1px solid #1b2238', borderRadius: 8 }}>
          {index.length === 0
            ? '아직 분석할 인사이트가 없어요. 라운드를 기록하면 여기서 찾아볼 수 있어요.'
            : <>검색 결과가 없어요.<br />다른 말로 찾아보거나 필터를 줄여 보세요.</>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {results.slice(0, limit).map(it => (
            <InsightCard key={it.key} insight={it} showContext highlight={query} />
          ))}
          {results.length > limit && (
            <button onClick={() => setLimit(limit + PAGE)}
              style={{ ...pill(false), padding: '11px', textAlign: 'center', borderRadius: 8 }}>
              {Math.min(PAGE, results.length - limit)}건 더 보기
            </button>
          )}
        </div>
      )}
    </div>
  );
}
