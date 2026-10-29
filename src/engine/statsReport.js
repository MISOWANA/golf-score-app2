// ─── 스탯 화면 집계 ────────────────────────────────────────────────────────────
//
// 스탯은 "내 숫자를 영역별로 한눈에"가 목적이다. 인사이트가 한 라운드를 진단한다면 여기는
// 쌓인 라운드로 '내 평소 모습'을 보여 준다: 티샷 · 어프로치 · 숏게임 · 퍼팅 · 클럽.
// 영역마다 대표 숫자 하나와, 그 숫자를 설명하는 몇 개의 묶음(미스 방향, 거리 구간, 클럽별 …)만 둔다.
//
// 규칙
//   · rounds[0] = 최신 라운드, 1인 라운드만 들어온다 (GolfScoringApp이 거른다).
//   · 비율 지표는 입력한(touched) 홀만 센다 — 입력 없이 저장된 파(par)가 비율을 끌어올리지 않게.
//     스코어·타수는 저장된 값 그대로 쓴다 (홈·히스토리와 같다).
//   · 거리·적중률은 인사이트의 클럽 거리·어프로치와 같은 함수(extractClubShots 등)를 쓴다 → 같은 숫자.
//   · '최근 5R vs 그 이전' 추세는 양쪽 표본이 충분할 때만 낸다.

import { extractClubShots, buildClubDistanceStats, SHORT_SHOT_MAX_M } from './clubDistance.js';
import { APPROACH_BUCKETS, buildScrambling, buildGirp, buildGirConversion } from './shotStats.js';
import { buildTeePenalty, pickWeakestSkill } from './roundStory.js';
import { analyzePutts, summarizePuttCauses } from './puttAnalysis.js';
import { median, rateTier } from './stats.js';
import { landingCounts, landingSummary, landingCaption } from './landing.js';
import { aggregateSG, sgTier } from './strokesGained.js';
import { buildRoundBreakdown, toBreakdownInput } from './scoreBreakdown.js';
import { clubLabelOf } from './clubRecommend.js';
import { totalPar } from './players.js';
import { buildGreenMissStats } from './greenMiss.js';
import { isFullRound, FULL_ROUND_HOLES } from './nines.js';
import { buildShortGamePattern } from './shortGamePattern.js';
import { buildPuttingDetail } from './puttingDetail.js';

export const RECENT_ROUNDS = 5;                 // 추세의 '최근' 라운드 수
const MIN_TREND_SAMPLE = 10;                    // 추세를 내려면 양쪽 모두 이만큼의 홀(샷)이 필요
export const SHORT_GAME_MAX = SHORT_SHOT_MAX_M;   // 이 거리 안에서 친 샷은 어프로치가 아니라 숏게임(칩·피치)으로 본다
export const CLUB_WINDOW = 20;                  // 클럽·거리 구간 표본: 최근 20라운드 (인사이트와 같다)
const MIN_ROW = 3;                              // 표(클럽·구질 …)에 한 줄로 올리는 최소 횟수
const FULL_SWING_MIN_M = 60;                    // 거리 일관성은 풀스윙 클럽(중앙값 60m 이상)끼리만 본다
export const MIN_CONSISTENCY_N = 5;             // 거리 일관성을 비교하려면 클럽마다 필요한 샷 수
export const MIN_CONSISTENCY_CLUBS = 3;         // 클럽끼리 견주려면 필요한 클럽 수

const me = (r) => r.players[0];
const sum = (a) => a.reduce((x, y) => x + y, 0);
const mean = (a) => (a.length ? sum(a) / a.length : null);
const pct = (n, d) => (d > 0 ? (n / d) * 100 : null);

// 입력한(touched) 홀의 점수 객체
const playedScores = (round) => round.holes
  .map((h) => ({ hole: h, s: h.scores?.[me(round)] }))
  .filter((x) => x.s && x.s.touched);

// 라운드별 { n, d } 를 뽑아 '최근 vs 그 이전' 비율 추세를 만든다. 비율은 % 단위.
// delta = 최근 − 이전 (+면 비율이 올랐다). 어느 쪽이 좋은지는 쓰는 쪽에서 정한다.
function trendOf(rounds, perRound, minSample = MIN_TREND_SAMPLE) {
  const parts = rounds.map(perRound);
  const recent = parts.slice(0, RECENT_ROUNDS), prior = parts.slice(RECENT_ROUNDS);
  const tally = (list) => ({ n: sum(list.map((x) => x.n)), d: sum(list.map((x) => x.d)) });
  const a = tally(recent), b = tally(prior);
  if (a.d < minSample || b.d < minSample) return null;
  const recentPct = pct(a.n, a.d), priorPct = pct(b.n, b.d);
  return { recentPct, priorPct, delta: recentPct - priorPct };
}

// ─── 스코어 ──────────────────────────────────────────────────────────────────
// 평균·베스트·추세는 18홀 라운드끼리만 견준다 — 9홀 점수가 섞이면 평균이 반토막 나고 '베스트'가 9홀 라운드가 된다.
// 9홀 라운드는 홀 단위 통계(GIR·퍼팅·티샷 …)에는 그대로 들어가고, 몇 개를 뺐는지만 nineHoleRounds 로 알려 준다.
export function buildScoreSummary(rounds) {
  if (rounds.length === 0) return null;
  const full = rounds.filter(isFullRound);
  const nineHoleRounds = rounds.length - full.length;
  const per = full.map((r) => {
    const p = me(r);
    const total = r.holes.reduce((s, h) => s + (h.scores?.[p]?.strokes || 0), 0);
    const par = totalPar(r);
    return { id: r.id, date: r.date, course: r.courseName, total, par, diff: total - par };
  });
  if (per.length === 0) {
    return { rounds: 0, nineHoleRounds, avg: null, avgDiff: null, best: null, recentAvg: null, priorAvg: null, improvement: null, trend: [] };
  }
  const best = per.reduce((a, b) => (b.total < a.total ? b : a));       // 동률이면 최신 라운드
  const recent = per.slice(0, RECENT_ROUNDS), prior = per.slice(RECENT_ROUNDS, RECENT_ROUNDS * 2);
  return {
    rounds: per.length,
    avg: mean(per.map((x) => x.total)),
    avgDiff: mean(per.map((x) => x.diff)),
    best,
    recentAvg: mean(recent.map((x) => x.total)),
    priorAvg: prior.length >= 3 ? mean(prior.map((x) => x.total)) : null,
    // +면 좋아졌다 (최근 타수가 줄었다)
    improvement: prior.length >= 3 ? mean(prior.map((x) => x.total)) - mean(recent.map((x) => x.total)) : null,
    trend: per.slice(0, 10).reverse(),
    nineHoleRounds,
  };
}

// 홀 결과 구성과 파별 성적 (저장된 타수 기준 — 입력하지 않은 홀도 홈·히스토리 합계에 들어가므로 같이 센다)
export function buildComposition(rounds) {
  const counts = { birdie: 0, par: 0, bogey: 0, double: 0 };
  const byPar = {};
  let total = 0;
  rounds.forEach((r) => {
    const p = me(r);
    r.holes.forEach((h) => {
      const s = h.scores?.[p];
      if (!s) return;
      const diff = (s.strokes ?? h.par) - h.par;
      total++;
      if (diff <= -1) counts.birdie++;
      else if (diff === 0) counts.par++;
      else if (diff === 1) counts.bogey++;
      else counts.double++;
      (byPar[h.par] ??= []).push(diff);
    });
  });
  return {
    total, counts,
    doubleRate: pct(counts.double, total),
    byPar: Object.keys(byPar).map(Number).sort((a, b) => a - b).map((par) => ({
      par, count: byPar[par].length, avgDiff: mean(byPar[par]),
    })),
  };
}

// 타수를 새게 하는 것 — 라운드당 횟수. (3퍼트 · OB · 해저드 · 더블보기 이상 홀)
export function buildLeaks(rounds) {
  let three = 0, ob = 0, hazard = 0, unplayable = 0, double = 0, extraPutts = 0;
  rounds.forEach((r) => {
    const p = me(r);
    r.holes.forEach((h) => {
      const s = h.scores?.[p];
      if (!s) return;
      const putts = s.putts ?? 2;
      if (putts >= 3) { three++; extraPutts += putts - 2; }
      ob += s.ob ?? 0;
      hazard += s.hazard ?? 0;
      unplayable += s.unplayable ?? 0;
      if ((s.strokes ?? h.par) - h.par >= 2) double++;
    });
  });
  // '라운드당'은 18홀 기준이다 — 9홀 라운드는 0.5라운드로 센다 (18홀 라운드만 있으면 라운드 수와 같다)
  const holeCount = rounds.reduce((s, r) => s + r.holes.length, 0);
  const n = holeCount > 0 ? holeCount / FULL_ROUND_HOLES : 1;
  const per = (v) => v / n;
  return {
    rounds: rounds.length,
    threePutt: { total: three, perRound: per(three), extraStrokesPerRound: per(extraPutts) },
    ob: { total: ob, perRound: per(ob) },
    hazard: { total: hazard + unplayable, perRound: per(hazard + unplayable) },
    // 벌타로 잃는 타수의 근사: OB 2타, 해저드·언플레이어블 1타
    penaltyStrokesPerRound: per(ob * 2 + hazard + unplayable),
    doubleHoles: { total: double, perRound: per(double) },
  };
}

// ─── 티샷 ────────────────────────────────────────────────────────────────────
const TEE_CLUB_LABEL = { driver: '드라이버', wood: '우드', hybrid: '하이브리드', iron: '아이언', wedge: '웨지' };

// 파4·5 티샷 한 개의 결과. 페어웨이 O/X를 기록한(boolean) 홀만 센다.
// 1온(teeGIR)은 페어웨이 미적중으로 센다 — 티샷이 페어웨이에 멈춘 비율(Driving Accuracy) 기준.
function teeShotsOf(round) {
  const out = [];
  playedScores(round).forEach(({ hole, s }) => {
    if (hole.par <= 3 || typeof s.fairway !== 'boolean') return;
    const hit = s.fairway === true;
    const dir = hit ? 'C' : s.teeGIR === true ? 'G' : s.fairwayHit === 'L' ? 'L' : s.fairwayHit === 'R' ? 'R' : 'U';
    out.push({ hit, dir, club: s.teeClub ?? null, shape: s.shotShape ?? null });
  });
  return out;
}

const groupRows = (shots, keyOf, labelOf) => {
  const map = new Map();
  shots.forEach((x) => {
    const k = keyOf(x);
    if (k == null) return;
    const e = map.get(k) ?? { key: k, label: labelOf(k), n: 0, hit: 0 };
    e.n++; if (x.hit) e.hit++;
    map.set(k, e);
  });
  return [...map.values()].map((e) => ({ ...e, hitPct: pct(e.hit, e.n), tier: rateTier(e.hit, e.n) })).sort((a, b) => b.n - a.n);
};

export function buildTeeStats(rounds) {
  const per = rounds.map(teeShotsOf);
  const all = per.flat();
  const total = all.length;
  const cnt = (dir) => all.filter((x) => x.dir === dir).length;
  const hit = cnt('C'), left = cnt('L'), right = cnt('R'), green = cnt('G'), unknown = cnt('U');
  const leftPct = pct(left, total), rightPct = pct(right, total);
  // 좌우가 뚜렷하게 한쪽이면 그쪽으로 치우친 것으로 본다 (왼쪽·오른쪽 미스가 합쳐 5개 이상, 한쪽이 1.5배 이상)
  let side = null;
  if (left + right >= 5) {
    if (right >= left * 1.5) side = 'right';
    else if (left >= right * 1.5) side = 'left';
  }
  const penalty = buildTeePenalty(rounds);
  return {
    total, hit, left, right, green, unknown,
    hitPct: pct(hit, total), leftPct, rightPct, greenPct: pct(green, total),
    tier: rateTier(hit, total),
    side,
    trend: trendOf(rounds, (r) => { const t = teeShotsOf(r); return { n: t.filter((x) => x.hit).length, d: t.length }; }),
    byClub: groupRows(all, (x) => x.club, (k) => TEE_CLUB_LABEL[k] ?? String(k).toUpperCase()).filter((r) => r.n >= MIN_ROW),
    byShape: groupRows(all, (x) => x.shape, (k) => k).filter((r) => r.n >= MIN_ROW),
    penalty: {
      teeShots: penalty.teeShots, ob: penalty.ob, other: penalty.other,
      obRate: penalty.obRate,
      otherRate: penalty.teeShots > 0 ? penalty.other / penalty.teeShots : null,
    },
  };
}

// ─── 어프로치 ────────────────────────────────────────────────────────────────
// 한 홀의 필드샷 체인(extractClubShots)에서 샷마다 '그린에 올랐나'를 가른다 —
// 마지막 샷이 그린에 도달했을 때만 성공, 그 앞 샷은 그린을 놓친 샷이다.
function approachShotsOf(round) {
  const p = me(round);
  const out = [];
  round.holes.forEach((h) => {
    const s = h.scores?.[p];
    if (!s) return;
    const chain = extractClubShots(h, p);
    chain.forEach((shot, i) => {
      const last = i === chain.length - 1;
      out.push({
        club: shot.club, subClub: shot.subClub, from: shot.fromDistance, distance: shot.distance,
        hit: last && shot.onGreen === true,
        // 그린에 올린 샷의 결과: 첫 퍼트 거리
        endPutt: last && shot.onGreen === true ? (s.puttDetails?.[0]?.distance ?? null) : null,
      });
    });
  });
  return out;
}

// 거리 구간별 그린 적중 — 인사이트의 어프로치 근접도와 같은 표본(최근 20라운드)
function distanceBuckets(rounds) {
  const shots = rounds.slice(0, CLUB_WINDOW).flatMap((r) => approachShotsOf(r));
  return APPROACH_BUCKETS.map((b) => {
    const inB = shots.filter((x) => x.from != null && x.from >= b.min && x.from < b.max);
    const hits = inB.filter((x) => x.hit);
    const putts = hits.map((x) => x.endPutt).filter((v) => v != null);
    return {
      id: b.id, label: b.label, n: inB.length, hit: hits.length,
      hitPct: pct(hits.length, inB.length), tier: rateTier(hits.length, inB.length),
      puttMedian: median(putts), puttN: putts.length,
    };
  });
}

// 라이(경사)별 그린 적중 — 80m 밖 어프로치 샷. 라이는 평지 · 오르막 · 내리막 · 옆 경사(훅·슬라이스)로 묶는다.
export const LIE_GROUPS = [['flat', '평지'], ['uphill', '오르막'], ['downhill', '내리막'], ['side', '옆 경사']];
const lieGroupOf = (lie) => {
  const v = Array.isArray(lie) ? lie[0] : lie;
  if (!v) return null;
  if (v === 'flat') return 'flat';
  if (String(v).includes('uphill')) return 'uphill';
  if (String(v).includes('downhill')) return 'downhill';
  return 'side';
};

export function buildLieStats(rounds, windowSize = CLUB_WINDOW) {
  const acc = Object.fromEntries(LIE_GROUPS.map(([id]) => [id, { n: 0, hit: 0 }]));
  rounds.slice(0, windowSize).forEach((r) => {
    const p = me(r);
    r.holes.forEach((h) => {
      if (!h.scores?.[p]) return;
      const chain = extractClubShots(h, p);
      chain.forEach((shot, i) => {
        if (shot.fromDistance != null && shot.fromDistance < SHORT_GAME_MAX) return;
        const g = lieGroupOf(shot.lie);
        if (!g) return;
        acc[g].n++;
        if (i === chain.length - 1 && shot.onGreen === true) acc[g].hit++;
      });
    });
  });
  return LIE_GROUPS.map(([id, label]) => ({ id, label, n: acc[id].n, hit: acc[id].hit, hitPct: pct(acc[id].hit, acc[id].n), tier: rateTier(acc[id].hit, acc[id].n) }));
}

export function buildApproachStats(rounds) {
  const girOf = (r) => {
    const sc = playedScores(r);
    return { n: sc.filter((x) => x.s.gir === true).length, d: sc.length };
  };
  const played = rounds.flatMap(playedScores);
  const girHoles = played.filter((x) => x.s.gir === true);
  const byParMap = {};
  played.forEach(({ hole, s }) => {
    const e = (byParMap[hole.par] ??= { par: hole.par, n: 0, hit: 0 });
    e.n++; if (s.gir === true) e.hit++;
  });

  const byDistance = distanceBuckets(rounds);

  const firstPutts = girHoles.map((x) => x.s.puttDetails?.[0]?.distance).filter((v) => typeof v === 'number' && v > 0);
  const girTotal = played.length, girHit = girHoles.length;
  const lc = landingCounts(rounds);
  const ls = landingSummary(lc.counts);
  return {
    gir: {
      holes: girTotal, hit: girHit, pct: pct(girHit, girTotal), tier: rateTier(girHit, girTotal),
      byPar: Object.values(byParMap).sort((a, b) => a.par - b.par).map((e) => ({ ...e, pct: pct(e.hit, e.n) })),
      trend: trendOf(rounds, girOf),
    },
    girp: buildGirp(rounds),
    conversion: buildGirConversion(rounds),
    firstPutt: { median: median(firstPutts), n: firstPutts.length },
    byDistance,
    byLie: buildLieStats(rounds),
    shotCount: byDistance.reduce((a, x) => a + x.n, 0),
    landing: { total: lc.total, shortGame: lc.shortGame, summary: ls, caption: landingCaption(ls) },   // 80m 밖 샷만 — 80m 안은 숏게임(핀 기준 탄착)이 센다
    greenMiss: buildGreenMissStats(rounds),
  };
}

// ─── 숏게임 (그린을 놓친 뒤) ─────────────────────────────────────────────────
export function buildShortGameStats(rounds) {
  const scr = buildScrambling(rounds);
  const near = distanceBuckets(rounds)[0];
  const missed = rounds.flatMap(playedScores).filter((x) => x.s.gir === false);
  const diffs = missed.map(({ hole, s }) => (s.strokes ?? hole.par) - hole.par);
  return {
    ...scr,
    missedHoles: missed.length,
    avgDiff: mean(diffs),
    // 80m 안에서 친 샷(칩·피치): 그린에 올린 비율과 올린 뒤 첫 퍼트 거리
    near: { n: near.n, hit: near.hit, hitPct: near.hitPct, tier: near.tier, puttMedian: near.puttMedian, puttN: near.puttN },
    // 80m 안 샷이 핀 기준 어디에 멈췄나 (랜딩 방향 + 첫 퍼트 거리) — 스탯 '숏게임' 탭
    pattern: buildShortGamePattern(rounds),
    trend: trendOf(rounds, (r) => {
      const m = playedScores(r).filter((x) => x.s.gir === false);
      return { n: m.filter(({ hole, s }) => (s.strokes ?? hole.par) - hole.par <= 0).length, d: m.length };
    }, 8),
  };
}

// ─── 퍼팅 ────────────────────────────────────────────────────────────────────
export function buildPuttingSummary(rounds) {
  const played = rounds.flatMap(playedScores).filter((x) => typeof x.s.putts === 'number');
  const holes = played.length;
  const putts = sum(played.map((x) => x.s.putts));
  const one = played.filter((x) => x.s.putts <= 1).length;
  const two = played.filter((x) => x.s.putts === 2).length;
  const three = played.filter((x) => x.s.putts >= 3).length;
  const gir = played.filter((x) => x.s.gir === true);
  const detail = buildPuttingDetail(rounds);   // 거리 · 라이 · 미스 위치를 합친 상세 — 인사이트 퍼팅 섹션도 같은 함수를 쓴다
  const causes = summarizePuttCauses(played.filter((x) => x.s.putts >= 3).map((x) => analyzePutts(x.s)));
  const per18 = (r) => {
    const pl = playedScores(r).filter((x) => typeof x.s.putts === 'number');
    return { n: sum(pl.map((x) => x.s.putts)), d: pl.length };
  };
  // 라운드당(18홀 환산) 퍼트 — 최근 vs 이전. 비율이 아니라 평균이라 따로 계산한다.
  const parts = rounds.map(per18);
  const recent = parts.slice(0, RECENT_ROUNDS), prior = parts.slice(RECENT_ROUNDS);
  const rp = (l) => { const d = sum(l.map((x) => x.d)); return d > 0 ? (sum(l.map((x) => x.n)) / d) * 18 : null; };
  const recentD = sum(recent.map((x) => x.d)), priorD = sum(prior.map((x) => x.d));
  const trend = recentD >= MIN_TREND_SAMPLE && priorD >= MIN_TREND_SAMPLE ? { recent: rp(recent), prior: rp(prior), delta: rp(recent) - rp(prior) } : null;
  return {
    holes, putts,
    per18: holes > 0 ? (putts / holes) * 18 : null,
    perHole: holes > 0 ? putts / holes : null,
    one: { n: one, pct: pct(one, holes) }, two: { n: two, pct: pct(two, holes) }, three: { n: three, pct: pct(three, holes) },
    perGir: gir.length > 0 ? sum(gir.map((x) => x.s.putts)) / gir.length : null,
    girHoles: gir.length,
    byDistance: detail.byDistance,
    detail,
    causes,
    trend,
  };
}

// ─── 클럽 ────────────────────────────────────────────────────────────────────
// 인사이트의 클럽별 거리(최근 20R)와 같은 표본·같은 중앙값에, 사용 횟수와 '목표에 올린 비율'을 붙인다.
//   티샷: 파4·5는 페어웨이, 파3은 그린에 올렸나 / 그 뒤 샷: 그린에 올렸나

export function buildClubReport(rounds, windowSize = CLUB_WINDOW) {
  const recent = rounds.slice(0, windowSize);
  const dist = buildClubDistanceStats(rounds, windowSize);
  const keyOf = (club, sub) => (sub ? `${club}:${sub}` : club);
  const usage = new Map();
  const bump = (club, sub, hit, role) => {
    const k = keyOf(club, sub);
    const e = usage.get(k) ?? { tee: { n: 0, hit: 0 }, approach: { n: 0, hit: 0 }, short: { n: 0, hit: 0 } };
    e[role].n++; if (hit) e[role].hit++;
    usage.set(k, e);
  };
  recent.forEach((r) => {
    const p = me(r);
    r.holes.forEach((h) => {
      const s = h.scores?.[p];
      if (!s || !s.touched) return;
      if (s.teeClub) {
        const hit = h.par > 3 ? (typeof s.fairway === 'boolean' ? s.fairway === true : null) : (s.gir === true);
        if (hit !== null) bump(s.teeClub, s.teeClubSub ?? null, hit, 'tee');
      }
      extractClubShots(h, p).forEach((shot, i, chain) => {
        const role = shot.fromDistance != null && shot.fromDistance < SHORT_GAME_MAX ? 'short' : 'approach';
        bump(shot.club, shot.subClub ?? null, i === chain.length - 1 && shot.onGreen === true, role);
      });
    });
  });

  const distByKey = new Map(dist.map((d) => [keyOf(d.club, d.subClub), d]));
  const keys = [...new Set([...distByKey.keys(), ...usage.keys()])];
  const rows = keys.map((k) => {
    const d = distByKey.get(k);
    const [club, subClub = null] = k.split(':');
    const u = usage.get(k) ?? { tee: { n: 0, hit: 0 }, approach: { n: 0, hit: 0 }, short: { n: 0, hit: 0 } };
    const uses = u.tee.n + u.approach.n + u.short.n;
    // 적중률은 풀샷(티샷 · 80m 밖 어프로치)만 센다 — 그린 주변 칩·피치는 목적이 달라 섞지 않는다
    const full = u.tee.n + u.approach.n, fullHits = u.tee.hit + u.approach.hit;
    return {
      key: k, club, subClub, label: clubLabelOf(club, subClub),
      n: d?.n ?? 0, median: d?.median ?? null, q1: d?.iqr?.q1 ?? null, q3: d?.iqr?.q3 ?? null, tier: d?.tier ?? 'low',
      uses, hitPct: full >= MIN_ROW ? pct(fullHits, full) : null, hitN: full,
      tee: u.tee, approach: u.approach, short: u.short,
    };
  }).sort((a, b) => (b.median ?? -1) - (a.median ?? -1) || b.uses - a.uses);

  return { rows, consistency: clubConsistency(rows), rounds: recent.length };
}

// 클럽별 거리 일관성 — 중간 절반(25~75%) 샷의 폭을 중앙값으로 나눈 값(상대 퍼짐)이 작을수록 거리가 일정하다.
// 클럽 사이가 비었는지·겹치는지는 말하지 않는다 — 어떤 간격이 맞는지는 사람마다 다르다. 여기서는 내 클럽끼리만 견준다.
// 폭(width)은 m 로, 순서는 상대 퍼짐으로 정한다 (긴 클럽일수록 폭이 절대값으로도 커지기 때문).
export function clubConsistency(rows) {
  const list = (rows ?? [])
    .filter((r) => r.n >= MIN_CONSISTENCY_N && r.median != null && r.median >= FULL_SWING_MIN_M && r.q1 != null && r.q3 != null)
    .map((r) => ({ key: r.key, label: r.label, n: r.n, median: r.median, width: r.q3 - r.q1, spread: (r.q3 - r.q1) / r.median }))
    .sort((a, b) => a.spread - b.spread);
  const enough = list.length >= MIN_CONSISTENCY_CLUBS;
  return { list, enough, steadiest: enough ? list[0] : null, widest: enough ? list[list.length - 1] : null };
}

// 어프로치 탭의 클럽별: 클럽 → 그린 적중. 클럽 리포트의 approach 사용분만 쓴다.
export function approachClubRows(clubReport) {
  return clubReport.rows
    .filter((r) => r.approach.n >= MIN_ROW)
    .map((r) => ({ ...r, hitPct: pct(r.approach.hit, r.approach.n), hitN: r.approach.n, hitTier: rateTier(r.approach.hit, r.approach.n) }))
    .sort((a, b) => (b.median ?? -1) - (a.median ?? -1) || b.approach.n - a.approach.n);
}

// ─── 강점·약점 ───────────────────────────────────────────────────────────────
// 인사이트 리포트와 같은 기준: 측정된 샷이 충분하면 SG(투어 대비), 아니면 스코어 기준 손실.
export function buildSkillBalance(rounds) {
  if (rounds.length === 0) return null;
  const sg = aggregateSG(rounds);
  const breakdown = buildRoundBreakdown(rounds.flatMap((r) => r.holes.map((h) => toBreakdownInput(h, me(r)))));
  const weakest = pickWeakestSkill({ sg, ranked: breakdown.ranked });
  // SG로 가장 나은 부문 — 측정된 샷이 6타 이상인 부문이 둘 이상이고 그중 가장 좋은 쪽이 플러스일 때
  const measured = ['tee', 'approach', 'shortGame', 'putting']
    .map((id) => ({ id, sg: sg.categories[id].sg, n: sg.categories[id].strokes }))
    .filter((x) => x.n >= 6);
  let strongest = null;
  if (measured.length >= 2) {
    const best = measured.reduce((a, b) => (b.sg > a.sg ? b : a));
    if (best.sg > 0) strongest = { skill: best.id };
  }
  return {
    weakest: weakest?.skill ?? null,
    weakestBasis: weakest?.basis ?? null,
    strongest: strongest?.skill ?? null,
    sgTier: sgTier(sg.measuredStrokes),
  };
}

// ─── 전체 ────────────────────────────────────────────────────────────────────
export function buildStatsReport(rounds) {
  const clubs = buildClubReport(rounds);
  return {
    rounds: rounds.length,
    score: buildScoreSummary(rounds),
    composition: buildComposition(rounds),
    leaks: buildLeaks(rounds),
    tee: buildTeeStats(rounds),
    approach: { ...buildApproachStats(rounds), clubs: approachClubRows(clubs) },
    shortGame: buildShortGameStats(rounds),
    putting: buildPuttingSummary(rounds),
    clubs,
    balance: buildSkillBalance(rounds),
  };
}

