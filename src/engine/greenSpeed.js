// ─── 그린 스피드 ───────────────────────────────────────────────────────────────
//
// 그날의 그린 스피드는 라운드 단위로 하나를 기록한다 (round.greenSpeed). 값은 스팀프미터 피트 수 —
// 스팀프미터에서 공이 굴러간 거리다. 국내 코스는 미터(2.7m)로 알려 주는 경우도 많아서 화면에는
// 미터를 함께 보여준다 (1피트 = 0.3048m). 값이 없으면(설정하지 않음) null.
//
// 분석은 라운드를 그린 스피드 구간(느림·보통·빠름·매우 빠름)으로 나눠 퍼팅을 비교한다. 같은
// 퍼트 수라도 빠른 날과 느린 날의 의미가 달라서, 퍼팅이 안 된 날이 '그린 탓'인지 '내 문제'인지
// 가르는 데 쓴다. 한 라운드 숫자는 careerInsights.roundStats 와 같은 정의다 (퍼트 = 전체 홀의
// 퍼트 합, 입력하지 않은 홀은 기본 2퍼트).

import { analyzePutts, summarizePuttCauses, puttSequence } from './puttAnalysis.js';
import { aggregateSG } from './strokesGained.js';

export const STIMP_MIN = 6;
export const STIMP_MAX = 14;
export const STIMP_STEP = 0.5;
export const STIMP_DEFAULT = 9;
const FT_TO_M = 0.3048;

// 구간 경계(피트): 느림 < 8.5 ≤ 보통 < 10 ≤ 빠름 < 11.5 ≤ 매우 빠름. preset은 구간 안의 대표값.
// 일반 퍼블릭 코스는 8~10, 대회·고급 코스는 10~12 안팎이다.
export const GREEN_SPEED_BANDS = [
  { id: 'slow',     label: '느림',     min: 0,    max: 8.5,      preset: 7.5 },
  { id: 'medium',   label: '보통',     min: 8.5,  max: 10,       preset: 9 },
  { id: 'fast',     label: '빠름',     min: 10,   max: 11.5,     preset: 10.5 },
  { id: 'veryFast', label: '매우 빠름', min: 11.5, max: Infinity, preset: 12 },
];

export const validSpeed = (v) => typeof v === 'number' && Number.isFinite(v) && v >= STIMP_MIN && v <= STIMP_MAX;
export const clampSpeed = (v) => Math.min(STIMP_MAX, Math.max(STIMP_MIN, Math.round(v * 10) / 10));
export const stimpToMeters = (ft) => ft * FT_TO_M;
export const metersToStimp = (m) => clampSpeed(m / FT_TO_M);

export const speedBand = (ft) => (validSpeed(ft) ? GREEN_SPEED_BANDS.find((b) => ft >= b.min && ft < b.max) ?? null : null);

// "스팀프 10.5 · 3.2m · 빠름"
export function speedLabel(ft) {
  const b = speedBand(ft);
  if (!b) return null;
  return `스팀프 ${ft.toFixed(1)} · ${stimpToMeters(ft).toFixed(1)}m · ${b.label}`;
}

// 구간별 퍼팅 요령. 속도가 느리면 짧게 서고, 빠르면 내리막이 크게 달라진다.
// 빠른 쪽의 수치는 책(Broadie) 예제다: 스팀프 11, 경사 2°에서 20피트(6m) 내리막은 평지 10피트(3m)처럼,
// 6피트(1.8m) 오르막은 9피트(2.7m)처럼 구른다.
export const GREEN_SPEED_TIPS = {
  slow: '느린 그린은 평소 속도로 치면 짧게 서기 쉬워요. 홀을 지나 30~60cm까지 보낼 세기로 치고, 오르막 롱퍼트는 특히 더 강하게 읽으세요.',
  medium: null,
  fast: '빠른 그린은 내리막이 크게 달라져요. 스팀프 11·경사 2°에서 6m 내리막 퍼트는 평지 3m처럼, 1.8m 오르막은 2.7m처럼 구릅니다. 롱퍼트는 홀이 아니라 1m 원에 세우세요.',
};
GREEN_SPEED_TIPS.veryFast = GREEN_SPEED_TIPS.fast;

// ─── 한 라운드의 퍼팅 요약 ──────────────────────────────────────────────────────
export function puttingOfRound(round) {
  const p = round.players[0];
  let putts = 0, three = 0, one = 0, firstSum = 0, firstN = 0;
  const analyses = [];
  round.holes.forEach((h) => {
    const s = h.scores?.[p];
    if (!s) return;
    const n = s.putts ?? 2;
    putts += n;
    if (n >= 3) three++;
    if (n === 1) one++;
    if (s.touched === false) return;
    const d = puttSequence(s)[0]?.distance;
    if (d != null) { firstSum += d; firstN++; }
    analyses.push(analyzePutts(s));
  });
  const sgPutting = aggregateSG([round]).categories.putting;
  return {
    putts, three, one,
    firstDist: firstN > 0 ? firstSum / firstN : null,
    causes: summarizePuttCauses(analyses),
    sgPutting: sgPutting.segments > 0 ? sgPutting.sg : null,
  };
}

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const avgOf = (rows, key) => mean(rows.map((r) => r[key]).filter((v) => v != null));

const toRow = (round) => {
  const speed = validSpeed(round.greenSpeed) ? round.greenSpeed : null;
  return { id: round.id, date: round.date, courseName: round.courseName, speed, band: speedBand(speed), ...puttingOfRound(round) };
};

// 라운드 간 비교에 쓰는 평균 — 퍼트·3퍼트·1퍼트(라운드당)
const summarize = (rows) => ({
  rounds: rows.length,
  putts: avgOf(rows, 'putts'),
  three: avgOf(rows, 'three'),
  one: avgOf(rows, 'one'),
  firstDist: avgOf(rows, 'firstDist'),
  sgPutting: avgOf(rows, 'sgPutting'),
  sgRounds: rows.filter((r) => r.sgPutting != null).length,
});

// 인사이트 화면과 리포트가 같은 숫자를 보도록 하나의 계산을 공유한다.
//   mode 'round'  = 가장 최근 라운드 (rounds[0])
//   mode 'career' = 모든 라운드 합산
// rounds: 최신이 앞. 1인 라운드만 쓴다.
export function buildGreenSpeedReport(rounds, mode = 'round') {
  const solo = rounds.filter((r) => r.players.length === 1);
  if (solo.length === 0) return null;
  const all = solo.map(toRow);
  const target = mode === 'career' ? all : [all[0]];
  const withSpeed = target.filter((r) => r.speed != null);

  const bands = GREEN_SPEED_BANDS
    .map((b) => ({ id: b.id, label: b.label, ...summarize(withSpeed.filter((r) => r.band?.id === b.id)) }))
    .filter((b) => b.rounds > 0);

  const out = {
    mode, rounds: target.length,
    speedRounds: withSpeed.length,
    unsetRounds: target.length - withSpeed.length,
    bands,
    latest: null, compare: null, tip: null,
  };
  if (mode === 'career') return out;

  const latest = all[0];
  const others = all.slice(1);
  out.latest = latest;
  if (latest.band) out.tip = GREEN_SPEED_TIPS[latest.band.id] ?? null;

  // 비교 대상: 같은 구간의 다른 라운드가 있으면 그것, 없으면 기록한 나머지 전체, 그것도 모자라면 속도 기록과 무관한 전체
  const sameBand = latest.band ? others.filter((r) => r.band?.id === latest.band.id) : [];
  const anySpeed = others.filter((r) => r.speed != null);
  let basis = null;
  if (sameBand.length >= 1) basis = { label: `같은 ${latest.band.label} 그린 ${sameBand.length}라운드`, rows: sameBand };
  else if (latest.band && anySpeed.length >= 2) basis = { label: `그린 스피드를 기록한 다른 ${anySpeed.length}라운드`, rows: anySpeed };
  else if (others.length >= 2) basis = { label: `다른 ${others.length}라운드`, rows: others };
  if (basis) {
    const s = summarize(basis.rows);
    out.compare = { label: basis.label, rounds: basis.rows.length, dPutts: latest.putts - s.putts, dThree: latest.three - s.three };
  }
  return out;
}

// ─── 라운드 인사이트 (복기·리포트·검색에 들어간다) ─────────────────────────────
const mkInsight = (id, scope, priority, severity, insightType, title, summary, recommendation, tags) => ({
  id, scope, priority, holeNumber: null, insightType, severity, category: 'putting',
  title, summary, recommendation, tags: ['putting', 'green_speed', ...tags],
});

export function greenSpeedRoundInsights(round) {
  const speed = validSpeed(round.greenSpeed) ? round.greenSpeed : null;
  if (speed == null || round.players.length !== 1) return [];
  const band = speedBand(speed);
  const { putts, three, causes } = puttingOfRound(round);
  const where = `스팀프 ${speed.toFixed(1)}(약 ${stimpToMeters(speed).toFixed(1)}m, ${band.label}) 그린`;
  const fast = band.id === 'fast' || band.id === 'veryFast';
  const out = [];

  if (fast && three >= 2) {
    const lag = causes.lagTotal > 0 ? ` 그중 거리감(롱 퍼트) 문제가 ${causes.lagTotal}회였습니다.` : '';
    out.push(mkInsight('G001', 'round', 28, 'warning', 'fast_green_three_putts',
      '빠른 그린에서 3퍼트',
      `${where}에서 3퍼트가 ${three}회 나왔습니다 (퍼트 ${putts}개).${lag}`,
      GREEN_SPEED_TIPS.fast, ['three_putt', 'fast_green']));
  } else if (fast && three <= 1 && putts <= 31) {
    out.push(mkInsight('G002', 'round', 28, 'positive', 'fast_green_putting_steady',
      '빠른 그린에서도 퍼팅이 안정적',
      `${where}에서 퍼트 ${putts}개 · 3퍼트 ${three}회로 막았습니다.`,
      '속도 감각이 맞은 라운드입니다. 오늘 쓴 퍼팅 루틴(연습 그린 속도 확인·홀 뒤 거리)을 기억해 두세요.', ['fast_green']));
  }
  if (band.id === 'slow' && three >= 2) {
    out.push(mkInsight('G003', 'round', 28, 'warning', 'slow_green_three_putts',
      '느린 그린에서 3퍼트',
      `${where}에서 3퍼트가 ${three}회 나왔습니다 (퍼트 ${putts}개).`,
      GREEN_SPEED_TIPS.slow, ['three_putt', 'slow_green']));
  }
  return out;
}

// 누적: 빠른 그린(빠름·매우 빠름)과 느린 그린을 각각 나머지와 비교한다. 양쪽에 2라운드 이상일 때만.
export function greenSpeedCareerInsights(rounds) {
  const rows = rounds.filter((r) => r.players.length === 1).map(toRow).filter((r) => r.speed != null);
  const out = [];
  const compare = (id, groupLabel, test, tip) => {
    const a = rows.filter((r) => test(r.band.id));
    const b = rows.filter((r) => !test(r.band.id));
    if (a.length < 2 || b.length < 2) return;
    const sa = summarize(a), sb = summarize(b);
    const dThree = sa.three - sb.three;
    const dPutts = sa.putts - sb.putts;
    const text = `${groupLabel} ${a.length}라운드는 라운드당 퍼트 ${sa.putts.toFixed(1)}개 · 3퍼트 ${sa.three.toFixed(1)}회, 그 밖 ${b.length}라운드는 ${sb.putts.toFixed(1)}개 · ${sb.three.toFixed(1)}회입니다.`;
    if (dThree >= 1 || dPutts >= 2) {
      out.push(mkInsight(id, 'career', 28, 'warning', `${id === 'C012' ? 'fast' : 'slow'}_green_putting_drop`,
        `${groupLabel}에서 퍼팅이 흔들림`, text, tip, ['trend', 'pattern']));
    } else if (id === 'C012' && (dThree <= -1 || dPutts <= -2)) {
      out.push(mkInsight(id, 'career', 28, 'positive', 'fast_green_putting_strength',
        `${groupLabel}에서 퍼팅이 더 좋음`, text, '속도가 빠른 날 오히려 잘 맞는 편입니다 — 빠른 그린에서의 거리 감각을 강점으로 삼아 보세요.', ['trend', 'positive']));
    }
  };
  compare('C012', '빠른 그린', (id) => id === 'fast' || id === 'veryFast', GREEN_SPEED_TIPS.fast);
  compare('C013', '느린 그린', (id) => id === 'slow', GREEN_SPEED_TIPS.slow);
  return out;
}
