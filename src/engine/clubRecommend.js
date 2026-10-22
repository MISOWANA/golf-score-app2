// ─── 클럽 추천 ────────────────────────────────────────────────────────────────
//
// 마이백에 입력한 클럽별 거리(캐리·토탈)와 남은 거리로 칠 클럽을 고른다.
//
// 마이백 클럽은 { name: '7i', type: 'Iron', carry, total } 모양이고, 스코어 입력은
// 클럽 종류(club: 'iron')와 세부(subClub: '7I')로 기록한다. 추천은 이 두 표기를 이어
// 주는 일이다 — 스코어 입력에서 고를 수 없는 마이백 클럽(4W 등)은 추천에서 뺀다.
//
// 한 클럽이 닿는 거리는 [캐리, 토탈] 구간으로 본다 (토탈이 캐리보다 짧을 수도 있어
// 작은 쪽~큰 쪽). 남은 거리가 구간 안이면 날려서 굴려서 핀에 닿는다. 구간 밖이면 가장
// 가까운 끝까지의 차이(gap)가 작은 클럽이 앞선다. 바람·라이·고저차는 반영하지 않는다 —
// 스코어 입력에서 그것들은 클럽을 고른 뒤에 받기 때문에, 추천은 마이백 거리 기준이다.

// 스코어 입력에서 고를 수 있는 클럽 종류와 세부 클럽.
export const CLUB_SUBS = {
  driver: [],
  wood:   [{ id: '3W', label: '3W' }, { id: '5W', label: '5W' }, { id: '7W', label: '7W' }, { id: '9W', label: '9W' }],
  hybrid: [{ id: '2H', label: '2H' }, { id: '3H', label: '3H' }, { id: '4H', label: '4H' }, { id: '5H', label: '5H' }],
  iron:   [{ id: '2I', label: '2I' }, { id: '3I', label: '3I' }, { id: '4I', label: '4I' }, { id: '5I', label: '5I' }, { id: '6I', label: '6I' }, { id: '7I', label: '7I' }, { id: '8I', label: '8I' }, { id: '9I', label: '9I' }],
  wedge:  [
    { id: '48', label: '48°' },
    { id: '50', label: '50°' },
    { id: '52', label: '52°' },
    { id: '54', label: '54°' },
    { id: '56', label: '56°' },
    { id: '58', label: '58°' },
    { id: '60', label: '60°' },
    { id: '62', label: '62°' },
    { id: 'P',  label: 'P'   },
  ],
};

// 스코어 입력에는 피칭 웨지가 'P' 하나뿐이다. 이 로프트 이하(마이백의 46° 등)는 P로 본다.
const PITCHING_MAX_LOFT = 47;

const DRIVER_NAME = /^(DRIVER|DR|1W|드라이버)$/;
const PITCHING_NAME = /^(P|PW|피칭|피칭웨지)$/;
// 숫자 + 선택적 접미사 (5i · 5I · 5번 · 5 iron · 5번 아이언)
const NUMBERED = {
  Wood:   { club: 'wood',   re: /^(\d+)(?:W|WOOD|번?우드)?$/,            sub: (n) => `${n}W` },
  Hybrid: { club: 'hybrid', re: /^(\d+)(?:H|U|HYBRID|번?하이브리드)?$/,   sub: (n) => `${n}H` },
  Iron:   { club: 'iron',   re: /^(\d+)(?:I|IRON|번?아이언|번)?$/,        sub: (n) => `${n}I` },
};

const selectable = (club, subClub) => {
  if (club === 'driver') return { club, subClub: null };
  return CLUB_SUBS[club]?.some((s) => s.id === subClub) ? { club, subClub } : null;
};

// 마이백 클럽 → 스코어 입력의 { club, subClub }. 스코어 입력에서 고를 수 없는 클럽
// (퍼터, 4W처럼 선택지에 없는 번호, 샌드·갭 웨지 같은 이름뿐인 웨지)은 null.
export function shotClubOf(bagClub) {
  const type = bagClub?.type;
  if (!type || type === 'Putter') return null;
  const name = String(bagClub?.name ?? '').replace(/\s+/g, '').toUpperCase();
  if (!name) return null;

  if (type === 'Wood' && DRIVER_NAME.test(name)) return selectable('driver', null);
  if ((type === 'Wedge' || type === 'Iron') && PITCHING_NAME.test(name)) return selectable('wedge', 'P');

  if (type === 'Wedge') {
    const m = name.match(/^(\d{2})(?:°|도|DEG)?$/);
    if (!m) return null;
    const loft = Number(m[1]);
    return selectable('wedge', loft <= PITCHING_MAX_LOFT ? 'P' : String(loft));
  }

  const rule = NUMBERED[type];
  const m = rule && name.match(rule.re);
  return m ? selectable(rule.club, rule.sub(m[1])) : null;
}

// 화면에 보이는 클럽 이름 — 스코어 입력의 버튼 글자와 같다 (DRIVER · 7I · 52°).
export function clubLabelOf(club, subClub) {
  if (!subClub) return String(club ?? '').toUpperCase();
  return CLUB_SUBS[club]?.find((s) => s.id === subClub)?.label ?? subClub;
}

const pos = (v) => (Number.isFinite(v) && v > 0 ? v : null);

// 마이백 클럽의 캐리·토탈. 평균(avg)만 있던 예전 저장값도 마이백 화면과 같게 읽는다.
// 거리를 아직 확인하지 않은 클럽(unset — 새로 추가했거나 등록에서 제안값 그대로인 클럽)은 추천에 쓰지 않는다.
function reachOf(c) {
  if (c.unset) return null;
  const total = pos(c.total) ?? pos(c.avg);
  const carry = pos(c.carry) ?? (pos(c.avg) ? c.avg - 10 : null) ?? total;
  if (carry == null && total == null) return null;
  const a = carry ?? total;
  const b = total ?? carry;
  return { carry: a, total: b, lo: Math.min(a, b), hi: Math.max(a, b) };
}

// 마이백 중 추천에 쓸 수 있는 클럽 수와, 못 쓰는 클럽 이름들 (퍼터는 세지 않는다).
// 못 쓰는 경우: 스코어 입력에서 고를 수 없는 클럽(4W·64°·SW …)이거나 캐리·토탈이 비어 있음.
// 라운드 시작 전에 "왜 이 클럽은 추천에 안 나오지?"를 미리 알려 주는 데 쓴다.
export function bagCoverage(bagClubs) {
  const used = new Set();
  const skipped = [];
  for (const c of Array.isArray(bagClubs) ? bagClubs : []) {
    if (!c || c.type === 'Putter') continue;
    const sc = shotClubOf(c);
    if (sc && reachOf(c)) used.add(`${sc.club}:${sc.subClub ?? ''}`);
    else if (c.name) skipped.push(String(c.name));
  }
  return { usable: used.size, skipped };
}

// bagClubs: 마이백에 저장된 클럽 배열 · distance: 남은 거리(m) ·
// allowedClubs: 지금 고를 수 있는 클럽 종류 id들(['wood', 'iron', …]) — 없으면 제한 없음.
//
// 돌려주는 값 (추천할 수 없으면 null):
//   primary  추천 클럽  { club, subClub, name, carry, total, lo, hi }
//   shorter  한 클럽 짧게 — 추천보다 짧게 가는 가장 가까운 클럽 (없으면 null)
//   longer   한 클럽 길게 — 추천보다 멀리 가는 가장 가까운 클럽 (없으면 null)
//   fit      'in' 거리가 추천 클럽 구간 안 · 'under' 추천 클럽이 모자람 · 'over' 추천 클럽이 길게 감
//   gap      구간 밖일 때 가장 가까운 끝까지의 차이(m)
//   edge     마이백의 가장 긴 클럽도 모자라면 'longest', 가장 짧은 클럽도 길면 'shortest'
export function recommendClubs(bagClubs, distance, allowedClubs = null) {
  const d = Number(distance);
  if (!Array.isArray(bagClubs) || !(d > 0)) return null;

  const seen = new Set();
  const ladder = [];
  for (const c of bagClubs) {
    const sc = c && shotClubOf(c);
    if (!sc || (allowedClubs && !allowedClubs.includes(sc.club))) continue;
    const reach = reachOf(c);
    if (!reach) continue;
    const key = `${sc.club}:${sc.subClub ?? ''}`;
    if (seen.has(key)) continue;   // 같은 클럽이 둘이면(46°와 PW 등) 마이백 순서상 앞의 것만
    seen.add(key);
    ladder.push({ ...sc, name: c.name, ...reach, mid: (reach.lo + reach.hi) / 2 });
  }
  if (ladder.length === 0) return null;
  ladder.sort((a, b) => a.mid - b.mid);   // 짧게 가는 클럽 → 멀리 가는 클럽

  const gapOf = (c) => (d < c.lo ? c.lo - d : d > c.hi ? d - c.hi : 0);
  let best = 0;
  ladder.forEach((c, i) => {
    const g = gapOf(c);
    const bg = gapOf(ladder[best]);
    // 비기면 더 긴 클럽 — 순서대로 훑으니 같거나 더 가까울 때 덮어쓴다
    if (g < bg || (g === bg && Math.abs(d - c.mid) <= Math.abs(d - ladder[best].mid))) best = i;
  });

  const primary = ladder[best];
  const gap = gapOf(primary);
  const fit = gap === 0 ? 'in' : d > primary.hi ? 'under' : 'over';
  const edge = fit === 'under' && best === ladder.length - 1 ? 'longest'
    : fit === 'over' && best === 0 ? 'shortest'
      : null;

  return {
    distance: d,
    primary,
    shorter: ladder[best - 1] ?? null,
    longer: ladder[best + 1] ?? null,
    fit, gap, edge,
  };
}

// 추천 클럽이 이 거리에 얼마나 맞는지 한 줄로.
export function fitText(rec) {
  const { primary: p, fit, gap, edge } = rec;
  if (fit === 'in') return p.carry === p.total ? `${p.carry}m 클럽이에요` : `캐리 ${p.carry} · 토탈 ${p.total}m 안에 들어와요`;
  if (fit === 'under') {
    return edge === 'longest' ? `마이백에서 가장 긴 클럽도 ${gap}m 모자라요` : `토탈 ${p.hi}m보다 ${gap}m 더 필요해요`;
  }
  return edge === 'shortest'
    ? `가장 짧은 클럽(${p.lo}m)보다 ${gap}m 짧아요 · 줄여 치는 샷이에요`
    : `${p.lo}m보다 ${gap}m 짧아요 · 줄여 치세요`;
}

// 구간 표기 (135–140m · 같으면 135m)
export const reachText = (c) => (c.lo === c.hi ? `${c.lo}m` : `${c.lo}–${c.hi}m`);
