import { clubLabelOf, fitText, reachText } from '../../engine/clubRecommend.js';

// 클럽 선택 바로 위에 놓이는 추천 카드.
//   [한 클럽 짧게]  [★ 추천]  [한 클럽 길게]   — 짧게 가는 클럽부터 오른쪽으로 갈수록 멀리 간다
// 칩 하나를 누르면 클럽 종류와 세부 클럽(7I · 52° …)이 한 번에 입력된다. 이미 선택된 칩을
// 다시 누르면 선택이 풀린다 (아래 클럽 버튼의 토글과 같은 동작).
//
// suggest: { rec } 추천 결과 | { noBag: true, distance } 마이백에 저장된 거리가 없을 때의 안내
// value/subValue: 지금 선택돼 있는 클럽 · onPick(club, subClub): 칩을 눌렀을 때

const GREEN = '#3db87a';
const GOLD = '#c9a228';

const wrap = {
  margin: '0 0 10px', padding: '8px 8px 7px', borderRadius: 14,
  background: 'rgba(61,184,122,0.06)', border: '1px solid rgba(61,184,122,0.24)',
  animation: 'fadeIn 0.15s ease-out',
};

function Chip({ club, tag, primary, selected, onClick }) {
  const accent = selected ? GOLD : primary ? GREEN : '#252f4a';
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      style={{
        flex: primary ? 1.25 : 1, minWidth: 0, padding: '7px 2px 8px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
        border: `${primary || selected ? 2 : 1.5}px solid ${accent}`,
        background: selected ? 'rgba(201,162,40,0.18)' : primary ? 'rgba(61,184,122,0.14)' : '#1a2235',
        color: selected ? GOLD : '#e8edf8',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.02em', color: selected ? GOLD : primary ? GREEN : '#6e84a8', whiteSpace: 'nowrap' }}>
        {primary && !selected ? '★ ' : ''}{tag}
      </div>
      <div style={{ fontSize: primary ? 20 : 17, fontWeight: 900, lineHeight: 1.25, marginTop: 2 }}>
        {clubLabelOf(club.club, club.subClub)}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: selected ? GOLD : '#8896b0', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
        {reachText(club)}
      </div>
    </button>
  );
}

export default function ClubSuggestions({ suggest, value, subValue, onPick }) {
  if (!suggest) return null;

  // 마이백에 저장한 거리가 없으면 추천 대신 안내만 — 클럽을 이미 골랐으면 방해하지 않는다
  if (suggest.noBag) {
    if (value) return null;
    return (
      <div style={{ margin: '0 0 10px', padding: '8px 10px', borderRadius: 12, background: 'rgba(142,192,255,0.06)', border: '1px solid rgba(142,192,255,0.2)', fontSize: 13, lineHeight: 1.5, color: '#8ec0ff', wordBreak: 'keep-all' }}>
        마이백에서 클럽별 캐리·토탈 거리를 설정하면 {suggest.distance}m에 맞는 클럽을 추천해 드려요
      </div>
    );
  }

  const { rec } = suggest;
  const isSelected = (c) => value === c.club && (subValue ?? null) === (c.subClub ?? null);
  const pick = (c) => (isSelected(c) ? onPick(null, null) : onPick(c.club, c.subClub));

  return (
    <div style={wrap} data-role="club-suggestions">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 2px 6px' }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: GREEN, letterSpacing: '0.04em' }}>추천 클럽</span>
        <span style={{ fontSize: 12, color: '#8896b0', fontVariantNumeric: 'tabular-nums' }}>남은 {rec.distance}m · 마이백 거리 기준</span>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
        {/* 없는 쪽은 빈 칸으로 둬서 추천 칩이 늘 가운데 있게 한다 */}
        {rec.shorter ? <Chip club={rec.shorter} tag="한 클럽 짧게" selected={isSelected(rec.shorter)} onClick={() => pick(rec.shorter)} /> : <div style={{ flex: 1 }} />}
        <Chip club={rec.primary} tag="추천" primary selected={isSelected(rec.primary)} onClick={() => pick(rec.primary)} />
        {rec.longer ? <Chip club={rec.longer} tag="한 클럽 길게" selected={isSelected(rec.longer)} onClick={() => pick(rec.longer)} /> : <div style={{ flex: 1 }} />}
      </div>
      <div style={{ marginTop: 6, textAlign: 'center', fontSize: 13, color: rec.fit === 'in' ? '#8896b0' : '#e6b94a', lineHeight: 1.4, wordBreak: 'keep-all' }}>
        {fitText(rec)}
      </div>
    </div>
  );
}
