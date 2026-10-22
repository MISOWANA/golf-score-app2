// 마이백 등록에서 고르는 클럽 목록과, 직접 추가한 클럽의 분류.
//
// 목록은 일부러 넓게 잡는다 — 9W·2H·1I처럼 잘 쓰지 않는 클럽도 가방에 있을 수 있어서다.
// 이 중 스코어 입력에서 고를 수 없는 클럽(예: 4W · 1I · 64°)도 마이백에는 담을 수 있다.
// 그런 클럽은 클럽 추천에서만 빠진다 (shotClubOf 가 null) — 등록 화면이 그 표시를 달아 준다.

import { shotClubOf } from './clubRecommend.js';
import { BAG_LIMIT } from './bagStats.js';

export { BAG_LIMIT };

// 거리를 입력하는 종류 (퍼터는 거리가 없다)
export const CATEGORIES = ['Wood', 'Hybrid', 'Iron', 'Wedge'];
export const ALL_TYPES = [...CATEGORIES, 'Putter'];
export const CATEGORY_LABEL = { Wood: '우드', Hybrid: '하이브리드', Iron: '아이언', Wedge: '웨지', Putter: '퍼터' };
export const CATEGORY_TITLE = {
  Wood: 'WOODS · 우드', Hybrid: 'HYBRIDS · 하이브리드', Iron: 'IRONS · 아이언', Wedge: 'WEDGES · 웨지', Putter: 'PUTTER · 퍼터',
};

export const NAME_MAX = 12;           // 클럽 이름 최대 글자 수 (마이백 이름 칸과 같다)

// ── 고를 수 있는 클럽 (마이백에 쓰는 이름 그대로: Driver · 3W · 4H · 5i · 52° · PW)
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const WEDGE_LOFTS = [46, 48, 50, 52, 54, 56, 58, 60, 62, 64];

// 제안 거리 { 캐리, 토탈 } — 등록 화면에서 입력을 시작하는 값일 뿐, 사용자가 확인하기 전에는 추천에 쓰지 않는다.
// (기본 14개의 값은 마이백의 기본 구성과 같다)
const SUGGEST = {
  Wood: { Driver: [200, 215], '2W': [190, 205], '3W': [180, 195], '4W': [175, 188], '5W': [170, 180], '6W': [165, 175], '7W': [160, 170], '8W': [155, 165], '9W': [150, 160] },
  Hybrid: { '1H': [185, 195], '2H': [178, 188], '3H': [170, 180], '4H': [160, 170], '5H': [152, 162], '6H': [145, 155], '7H': [138, 148] },
  Iron: { '1i': [175, 185], '2i': [170, 178], '3i': [165, 172], '4i': [160, 166], '5i': [155, 160], '6i': [145, 150], '7i': [135, 140], '8i': [125, 130], '9i': [115, 120] },
  Wedge: { PW: [100, 105], '46°': [100, 105], '48°': [95, 100], '50°': [90, 95], '52°': [85, 90], '54°': [78, 83], '56°': [70, 75], '58°': [62, 67], '60°': [55, 60], '62°': [50, 55], '64°': [45, 50] },
};
// 직접 추가한 클럽의 제안 거리 — 종류별로 무난한 값
const CUSTOM_SUGGEST = { Wood: [175, 185], Hybrid: [155, 165], Iron: [140, 145], Wedge: [75, 80] };

const idOf = (type, name) => {
  if (type === 'Putter') return 'putter';
  if (name === 'Driver') return 'driver';
  if (type === 'Wedge') return `wedge${name.replace('°', '')}`;   // wedge46 · wedgePW
  return `${type.toLowerCase()}${name.replace(/\D/g, '')}`;        // wood3 · hybrid4 · iron5
};

function buildCatalog() {
  const names = {
    Wood: ['Driver', ...range(2, 9).map((n) => `${n}W`)],
    Hybrid: range(1, 7).map((n) => `${n}H`),
    Iron: range(1, 9).map((n) => `${n}i`),
    Wedge: ['PW', ...WEDGE_LOFTS.map((d) => `${d}°`)],
    Putter: ['Putter'],
  };
  return ALL_TYPES.flatMap((type) => names[type].map((name) => ({ key: `${type}:${name}`, id: idOf(type, name), name, type, custom: false })));
}

export const CATALOG = buildCatalog();
export const catalogOf = (type) => CATALOG.filter((c) => c.type === type);

// 처음 켜져 있는 클럽 — 마이백의 기본 구성(14개)과 같다. 없는 클럽을 끄고, 더 있는 클럽을 켜게 한다.
export const DEFAULT_SELECTION = ['Driver', '3W', '5W', '4H', '5i', '6i', '7i', '8i', '9i', '46°', '52°', '56°', '60°', 'Putter']
  .map((name) => CATALOG.find((c) => c.name === name).key);

// 이름 비교용 — 공백을 없애고 대문자로
export const normName = (name) => String(name ?? '').replace(/\s+/g, '').toUpperCase();

// ── 이름으로 종류 짐작 (직접 추가에서 종류를 미리 골라 주는 용도 — 사용자가 바꿀 수 있다)
// 반환: 'Wood' | 'Hybrid' | 'Iron' | 'Wedge' | null (모르면 null — 사용자가 직접 고른다)
export function guessCategory(name) {
  const n = normName(name);
  if (!n) return null;
  if (/^(DRIVER|DR|1W|드라이버)$/.test(n)) return 'Wood';
  if (/^\d{1,2}(W|WOOD|번?우드)$/.test(n)) return 'Wood';
  if (/^\d{1,2}(H|U|HYBRID|번?하이브리드|번?유틸리티)$/.test(n)) return 'Hybrid';
  if (/^\d{1,2}(I|IRON|번?아이언)$/.test(n) || /^\d{1,2}번$/.test(n)) return 'Iron';
  if (/^(P|PW|AW|GW|SW|LW|UW|피칭|피칭웨지|갭|갭웨지|샌드|샌드웨지|로브|로브웨지|어프로치|어프로치웨지)$/.test(n)) return 'Wedge';
  const m = n.match(/^(\d{2}(?:\.\d)?)(?:°|도|DEG|DEGREE)?$/);   // 47° · 53 · 54.5°
  if (m && Number(m[1]) >= 44 && Number(m[1]) <= 72) return 'Wedge';
  return null;
}

export function suggestDistance(type, name) {
  const hit = SUGGEST[type]?.[name];
  if (hit) return { carry: hit[0], total: hit[1] };
  if (type === 'Wedge') {   // 특이한 각: 46°(105m)~64°(50m) 사이를 이어서 짐작
    const loft = Number(String(name).match(/\d+(?:\.\d+)?/)?.[0]);
    if (Number.isFinite(loft)) {
      const total = Math.max(30, Math.min(120, Math.round(105 - (loft - 46) * 3)));
      return { carry: total - 5, total };
    }
  }
  const c = CUSTOM_SUGGEST[type];
  return c ? { carry: c[0], total: c[1] } : { carry: 100, total: 105 };
}

// 직접 추가 입력 검사 — 통과하면 { ok: true, name, type }, 아니면 { ok: false, reason }.
// existing: 이미 목록에 있는 클럽들([{ name, type }]) — 이름이 겹치면 종류가 달라도 막는다 (마이백에서 헷갈리지 않게).
export function checkNewClub(rawName, type, existing = []) {
  const name = String(rawName ?? '').trim().replace(/\s+/g, ' ');
  if (!name) return { ok: false, reason: 'name' };
  if (name.length > NAME_MAX) return { ok: false, reason: 'long' };
  if (!CATEGORIES.includes(type)) return { ok: false, reason: 'type' };
  const dup = existing.find((c) => normName(c.name) === normName(name));
  if (dup) return { ok: false, reason: 'dup', dup };
  return { ok: true, name, type };
}

// 스코어 입력에서 읽히는 클럽인가 (읽히면 클럽 추천에 쓰인다)
export const readableInScoring = (club) => shotClubOf({ name: club.name, type: club.type }) != null;

// 등록 결과 → 마이백에 저장하는 클럽 배열.
//   entries: [{ key, id, name, type }] — 고른 클럽들 (순서는 종류별로 다시 정렬한다)
//   dist:    { [key]: { carry, total, confirmed } } — 없으면 제안 거리 · confirmed 가 아니면 unset(추천에서 뺌)
export function toBagClubs(entries, dist = {}) {
  const out = [];
  for (const type of ALL_TYPES) {
    for (const e of entries.filter((x) => x.type === type)) {
      if (type === 'Putter') { out.push({ id: e.id, name: e.name, type }); continue; }
      const d = dist[e.key];
      const s = suggestDistance(type, e.name);
      const club = { id: e.id, name: e.name, type, carry: d?.carry ?? s.carry, total: d?.total ?? s.total };
      if (!d?.confirmed) club.unset = true;
      out.push(club);
    }
  }
  return out;
}
