// 테스트 공용 라운드 데이터. 난수는 시드를 고정해 항상 같은 데이터가 나온다.
//
// 라운드/홀 모양은 GolfScoringApp.startNewRound 가 만드는 것과 같다 (README·copilot-instructions 참고).

export const PARS = [4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4];

// 선형합동 난수 — 같은 시드면 같은 수열
export function createRng(seed = 1) {
  let s = seed >>> 0;
  const next = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  return {
    next,
    pick: (a) => a[Math.floor(next() * a.length)],
    int: (a, b) => a + Math.floor(next() * (b - a + 1)),
    chance: (p) => next() < p,
  };
}

// 입력하지 않은 홀의 기본값 (startNewRound 와 같다: 파 · 2퍼트 · GIR 성공)
export const defaultScore = (par) => ({
  strokes: par, putts: 2, fairway: null, fairwayHit: null, shotShape: null,
  ob: 0, hazard: 0, unplayable: 0, gir: true, girAuto: true, greenMiss: null, memo: '', touched: false,
});

// 직접 만든 한 홀의 점수 — 필요한 필드만 덮어쓴다
export const played = (par, over = {}) => ({ ...defaultScore(par), touched: true, confirmed: true, ...over });

// 규칙에 맞는 상세 입력 홀 (타수는 티 · 필드샷 · 퍼트 개수와 맞춘다)
function playedHole(par, rng) {
  const s = played(par);
  s.teeClub = par > 3 ? rng.pick(['driver', 'driver', 'wood']) : rng.pick(['iron', 'hybrid']);
  s.shotShape = rng.pick(['스트레이트', '페이드', '드로우']);
  if (par > 3) { s.fairway = rng.chance(0.6); s.fairwayHit = s.fairway ? 'C' : rng.pick(['L', 'R']); }
  else { s.teeOnGreen = rng.chance(0.5); s.teeDistance = rng.int(120, 190); }
  const putts = rng.pick([1, 2, 2, 2, 3]);
  s.putts = putts;
  s.puttDetails = Array.from({ length: putts }, (_, i) => ({
    distance: i === 0 ? rng.int(2, 14) : rng.pick([0.5, 1, 2.5]), aimDistance: null, lie: 'flat',
    holein: i === putts - 1 ? 'success' : 'fail',
  }));
  let field;
  if (par === 3) {
    field = s.teeOnGreen ? 0 : 1;
    if (!s.teeOnGreen) { s.secondClub = 'wedge'; s.secondClubSub = '52'; s.remainingDistance = rng.int(10, 40); s.onGreen = true; }
  } else {
    field = 1; s.secondClub = 'iron'; s.secondClubSub = '7I'; s.remainingDistance = rng.int(90, 170); s.onGreen = true;
    if (par === 5) { s.extraShots = [{ club: 'wedge', subClub: '52', remainingDistance: rng.int(40, 90), onGreen: true, lie: 'flat' }]; field = 2; }
  }
  s.strokes = 1 + field + putts;
  s.gir = (s.strokes - putts) <= par - 2;
  return s;
}

const baseRound = (id, name, date, over = {}) => ({
  id: String(id), date, courseName: '남서울CC', outCourseName: 'OUT', inCourseName: 'IN', teeBox: '화이트티',
  players: [name], pars: [...PARS], currentHole: 17, completed: true, trackConfirm: true, clubRecommend: true,
  greenSpeed: null, ...over,
});

// 18홀 모두 입력한 1인 라운드
export function makeFullRound(i = 1, name = '테스터', over = {}) {
  const rng = createRng(100 + i);
  const holes = PARS.map((par, h) => ({ holeNumber: h + 1, par, scores: { [name]: playedHole(par, rng) } }));
  return baseRound(2000 + i, name, new Date(2026, 8, 1 + i * 3, 12).toISOString(), {
    holes, finishedAt: new Date(2026, 8, 1 + i * 3, 17).toISOString(), ...over,
  });
}

// 전반 9홀만 입력하고 끝낸 라운드 (후반은 기본값 그대로)
export function makeHalfRound(i = 1, name = '테스터', over = {}) {
  const r = makeFullRound(i, name);
  r.id = String(3000 + i); r.courseName = '9홀연습장';
  r.holes.forEach((h, idx) => { if (idx >= 9) h.scores[name] = defaultScore(h.par); });
  return { ...r, ...over };
}

// 9홀 라운드 (nine: 'out' = OUT 코스의 파, 'in' = IN 코스의 파) — 처음부터 9개 홀만 가지고 홀 번호는 항상 1~9
export function makeNineRound(i = 1, nine = 'out', name = '테스터', over = {}) {
  const rng = createRng(300 + i);
  const offset = nine === 'in' ? 9 : 0;
  const holes = PARS.slice(offset, offset + 9).map((par, h) => ({ holeNumber: h + 1, par, scores: { [name]: playedHole(par, rng) } }));
  return baseRound(6000 + i, name, new Date(2026, 8, 1 + i * 3, 12).toISOString(), {
    courseName: nine === 'in' ? '9홀(IN)CC' : '9홀(OUT)CC', nine, holes, pars: PARS.slice(offset, offset + 9), currentHole: 8,
    finishedAt: new Date(2026, 8, 1 + i * 3, 15).toISOString(), ...over,
  });
}

// pars 필드가 없는 예전 백업 라운드
export function makeNoParsRound(i = 1, name = '테스터') {
  const r = makeFullRound(i, name);
  r.id = String(4000 + i); r.courseName = '예전백업CC';
  delete r.pars;
  return r;
}

// 동반자가 있는 간편 기록 라운드
export function makeMultiRound(i = 1) {
  const names = ['테스터', '친구'];
  const rng = createRng(500 + i);
  const holes = PARS.map((par, h) => ({
    holeNumber: h + 1, par,
    scores: Object.fromEntries(names.map((n) => [n, played(par, { strokes: par + rng.int(0, 2), putts: 2 })])),
  }));
  return baseRound(5000 + i, '테스터', new Date(2026, 8, 20).toISOString(), { players: names, holes, courseName: '동반라운드CC' });
}

// 3홀까지 입력한 진행 중 라운드
export function makeActiveRound(name = '테스터', over = {}) {
  const r = makeFullRound(99, name);
  r.id = 'active-9999'; r.courseName = '진행중CC'; r.completed = false; delete r.finishedAt;
  r.holes.forEach((h, idx) => { if (idx >= 3) h.scores[name] = defaultScore(h.par); });
  r.currentHole = 3;
  return { ...r, ...over };
}

// ── 뒤섞인(현실에서 나올 수 있는 불완전·예외 입력) 라운드 — 퍼징용 ──
function messyScore(par, rng) {
  const { pick, int, chance } = rng;
  const s = defaultScore(par);
  s.touched = chance(0.9);
  if (!s.touched) return s;
  s.confirmed = chance(0.8);
  s.putts = pick([0, 1, 2, 2, 3, 4]);
  s.strokes = Math.max(1, par - 2 + int(0, 5));
  if (par > 3) { s.fairway = pick([true, false, null]); s.fairwayHit = pick(['L', 'C', 'R', null]); }
  s.shotShape = pick(['페이드', '스트레이트', '드로우', '훅', '풀', '푸시', '슬라이스', null]);
  if (chance(0.15)) s.ob = int(1, 2);
  if (chance(0.15)) s.hazard = 1;
  if (chance(0.05)) s.unplayable = 1;
  s.gir = pick([true, false, null]);
  s.onGreenLanding = pick([null, 1, 3, 6, 9, 12, '4']);
  if (chance(0.7)) {
    const clubs = ['driver', 'wood', 'hybrid', 'iron', 'wedge'];
    s.teeClub = pick(clubs); s.teeClubSub = pick(['3', '5', '7I', '52', null]); s.teeGIR = par > 3 && chance(0.05);
    if (par === 3) { s.teeOnGreen = pick([true, false, undefined]); s.teeDistance = pick([int(100, 200), null]); }
    if (chance(0.7)) {
      s.secondClub = pick(clubs); s.secondClubSub = pick(['7I', '52', 'P', null]);
      s.remainingDistance = pick([int(20, 220), null]); s.terrainCondition = pick(['flat', 'uphill', 'downhill-hook', null]);
      s.onGreen = pick([true, false, 'chip-in', null]);
    }
    if (chance(0.3)) {
      s.extraShots = Array.from({ length: int(1, 3) }, () => ({
        club: pick([...clubs, null]), subClub: null, remainingDistance: pick([int(5, 120), null]),
        onGreen: pick([true, false, 'chip-in', null]), lie: pick(['flat', ['flat'], [], null]),
      }));
    }
    if (s.putts > 0 && chance(0.8)) {
      s.puttDetails = Array.from({ length: s.putts }, (_, i) => ({
        distance: pick([int(1, 20) / 2, null]), aimDistance: null, lie: pick(['flat', 'uphill-break-left', [], null]),
        holein: i === s.putts - 1 ? pick(['success', null]) : pick(['fail', 'offgreen', null]),
      }));
    }
    if (chance(0.3)) s.penalties = [{ slot: int(0, 2), type: pick(['ob', 'hazard', 'unplayable']), mode: pick(['replay', 'forward', 'back', 'lateral', 'tee', 'drop', undefined]) }];
    if (chance(0.15)) {
      const pt = (acc, t) => ({ lat: 37.5 + rng.next() / 500, lng: 127 + rng.next() / 500, acc, t });
      s.gpsPoints = [pt(5, 1), chance(0.5) ? null : pt(9, 2)];
      s.gpsGreen = chance(0.5) ? pt(4, 3) : null;
      s.gpsPin = chance(0.5) ? pt(4, 4) : null;
    }
    if (chance(0.1)) s.strokesManual = true;
    if (chance(0.1)) s.offGreen = [{ after: 0, club: 'wedge', subClub: '52', onGreen: pick([true, false, 'chip-in', null]) }];
  }
  return s;
}

export function makeMessyRound(rng, i, name = '테스터') {
  return baseRound(7000 + i, name, new Date(2026, 6, 1 + i * 4, 12).toISOString(), {
    courseName: `뒤섞인CC ${i}`,
    holes: PARS.map((par, h) => ({ holeNumber: h + 1, par, scores: { [name]: messyScore(par, rng) } })),
    trackConfirm: rng.chance(0.7), greenSpeed: rng.pick([null, 7.5, 9, 10.5, 12]),
  });
}
