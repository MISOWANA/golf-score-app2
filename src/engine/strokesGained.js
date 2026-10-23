// ─── Strokes Gained (투어 평균 대비) ─────────────────────────────────────────────
//
// 샷의 SG = (샷 전 홀아웃까지 평균 타수) − (샷 뒤 평균 타수) − 1.  Broadie, Every Shot Counts 5장.
// 기준선은 data/baseline.js (투어 평균). 양수면 투어 평균보다 잘 친 샷이다.
//
// 앱이 가진 기록을 '상태'와 '단계'로 바꿔 계산한다:
//   상태 = 샷을 치기 전 자리 { 종류, 홀까지 거리(m), 라이 }
//     티(티 → 홀 길이) → 그린 밖(다음 샷의 남은 거리) → … → 그린(첫 퍼트 거리) → 퍼트마다 → 홀
//   단계 = 상태와 상태 사이의 샷. 벌타는 그 샷에 붙는다(책과 같다): OB로 다시 친 티샷은 −2타.
//
// 기록하지 않은 자리(남은 거리·퍼트 거리를 입력하지 않음)는 '모르는 상태'다. 앞뒤가 모두 아는 상태인
// 구간만 계산하고, 사이에 모르는 상태가 끼면 그 구간을 하나로 묶어 계산한다 — 묶인 구간은 한 샷의
// 값이 아니라서 카테고리를 정할 수 없어 'mixed'(분류 불가)에 넣는다 (퍼트끼리 묶이면 퍼팅).
// 홀아웃은 늘 아는 상태라서 첫 번째로 아는 자리 이후의 타수는 전부 어딘가의 구간에 들어가고, 합이 맞는다:
//   한 구간의 SG = (구간 시작 기준선) − (구간 끝 기준선) − (구간 타수)
//   → 홀 전체 SG 합 = (처음 아는 자리의 기준선) − (그 자리부터 친 타수)
// 시작 자리를 모르는 앞쪽 샷(홀 길이 없는 티샷 등)만 계산하지 않고 '미측정 타수'로 센다.
//
// 이 앱에 없는 정보와 그 대체:
//   · 표면(페어웨이·러프·벙커): 샷마다 입력한 지형(shotInfo.js)을 쓴다. 지형을 입력하지 않은 샷만
//     세컨샷은 페어웨이 O/X로, 그 뒤는 거리로 추정한다 (91m 안 = 러프, 밖 = 페어웨이).
//     그래서 지형이 없는 벙커 샷은 기준선이 낮게 잡혀 SG가 좋게/나쁘게 틀어질 수 있다.
//   · 파4·5 티샷: 홀 길이를 모르면 계산하지 않는다 (티 지점과 핀을 지도로 찍은 홀만).
//   · 20야드 안 그린 밖 샷: 책 표에 값이 없어 20야드 값을 쓴다 (data/baseline.js).

import { expectedStrokes } from '../data/baseline.js';
import { penaltyAt, penaltyCount } from './penalties.js';
import { fieldShotCount, isHoledOut, pinDistances, saneRemaining } from './geo.js';
import { puttSequence } from './puttAnalysis.js';
import { offGreenShots, offGreenChain } from './offGreen.js';
import { surfaceOfShot, baselineLieOf } from './shotInfo.js';

// 책의 숏게임 경계: 그린 밖 100야드 이내. 그보다 멀면 어프로치.
export const SHORT_GAME_MAX_M = 100 * 0.9144;

export const SG_CATEGORIES = ['tee', 'approach', 'shortGame', 'putting'];
export const SG_LABEL = { tee: '티샷', approach: '어프로치', shortGame: '숏게임', putting: '퍼팅', mixed: '분류 불가' };

const UNKNOWN = { kind: 'unknown' };
const HOLE = { kind: 'hole' };
const positive = (d) => (typeof d === 'number' && Number.isFinite(d) && d > 0 ? d : null);

// 상태의 홀아웃까지 평균 타수. 모르면 null.
function baselineOf(st) {
  if (st.kind === 'hole') return 0;
  if (st.kind === 'unknown' || st.dist == null) return null;
  return expectedStrokes(st.kind === 'green' ? 'green' : st.lie, st.dist);
}

// 이 샷의 벌타로 다음 샷 전에 더해지는 타수 — penalties.js 의 strokesAddedAfter 와 같다
const addedStrokes = (p) => (!p ? 0 : p.type === 'ob' && p.mode !== 'replay' ? 2 : 1);

// 샷 상세 입력 홀의 샷 구조를 믿을 수 있는지: 벌타가 모두 샷별로 기록돼 있고, 샷 기록으로 센 타수가
// 저장된 스코어와 같아야 한다. 스코어를 직접 고쳤거나 세컨샷 결과를 비운 파5(규정 타수를 가정해
// 계산됨)는 샷 기록과 스코어가 어긋나 걸러진다.
function fieldStructure(s, par) {
  if (!s.teeClub) return null;
  if ((s.penalties || []).length < penaltyCount(s)) return null;
  const putts = puttSequence(s).length;
  const chips = offGreenShots(s).length;
  const n = fieldShotCount(s, par);
  const holedOut = isHoledOut(s);
  if (putts === 0 && !holedOut) return null;

  // 마지막 필드샷이 '그린을 놓쳤다'로 기록돼 있으면 뒤 샷이 기록되지 않은 홀이다
  if (n === 2 && s.onGreen === false) return null;
  const extras = s.extraShots || [];
  if (n > 2 && extras[n - 3]?.onGreen === false) return null;

  let strokes = putts + chips;
  for (let j = 0; j < n; j++) strokes += 1 + addedStrokes(penaltyAt(s, j));
  if (strokes !== (s.strokes ?? par)) return null;
  return { n, holedOut };
}

// 홀 하나의 SG. hole: 앱의 홀 객체, player: 플레이어 키.
// 반환: { holeNumber, strokes, segments[], measuredStrokes, unmeasuredStrokes, fieldMeasured }
//   segment = { category, sg, strokes, startDist }
export function buildHoleSG(hole, player) {
  const s = hole.scores?.[player];
  const par = hole.par;
  const empty = { holeNumber: hole.holeNumber, strokes: 0, segments: [], measuredStrokes: 0, unmeasuredStrokes: 0, fieldMeasured: false };
  if (!s || !s.touched) return empty;
  const strokes = s.strokes ?? par;

  const seq = puttSequence(s);
  const putts = seq.length;
  const struct = fieldStructure(s, par);

  const states = [];
  const steps = [];

  // ── 필드샷: 티 → … → 그린(또는 홀)
  if (struct) {
    const { n, holedOut } = struct;
    const teeLen = par === 3
      ? positive(s.teeDistance)
      : saneRemaining(pinDistances(s.gpsPoints, s.gpsPin, 1)[0]);
    states.push({ kind: 'tee', lie: 'tee', dist: teeLen });

    const remainingOf = (j) => positive(j === 1 ? s.remainingDistance : (s.extraShots || [])[j - 2]?.remainingDistance);
    // 그 샷을 치는 자리의 표면 — 입력한 지형(페어웨이·러프·벙커)이 있으면 그 값, 없으면 아래처럼 추정한다
    const lieAt = (j, dist) => {
      const recorded = baselineLieOf(surfaceOfShot(s, j));
      if (recorded) return recorded;
      const prev = penaltyAt(s, j - 1);
      if (j === 1 && par > 3) {
        if (prev) return prev.type === 'ob' ? 'fairway' : 'rough';   // OB티는 페어웨이 쪽, 드롭은 러프로 본다
        return s.fairway === true ? 'fairway' : 'rough';
      }
      return dist != null && dist < SHORT_GAME_MAX_M ? 'rough' : 'fairway';
    };

    for (let j = 0; j < n; j++) {
      const p = penaltyAt(s, j);
      steps.push({ strokes: 1 + addedStrokes(p), kind: 'field' });
      if (j < n - 1) {
        // 다시 친 샷(스트로크와 거리)은 같은 자리에서 친다
        if (p?.mode === 'replay') {
          states.push({ ...states[j] });
        } else {
          const dist = remainingOf(j + 1);
          states.push({ kind: 'off', dist, lie: lieAt(j + 1, dist) });
        }
      } else if (holedOut) {
        states.push(HOLE);
      } else {
        states.push({ kind: 'green', dist: seq[0]?.distance ?? null });
      }
    }
  } else {
    // 샷 구조를 모르면 퍼팅만 — 퍼트 거리는 필드샷과 무관하게 계산된다
    if (putts === 0) return { ...empty, strokes };
    states.push({ kind: 'green', dist: seq[0]?.distance ?? null });
  }

  // ── 퍼트 (그린 밖으로 나간 퍼트 뒤의 칩 포함)
  const holedAfterField = struct?.holedOut === true;
  if (!holedAfterField) {
    for (let i = 0; i < putts; i++) {
      const lastPutt = i === putts - 1;
      const nextPuttStart = lastPutt ? HOLE : { kind: 'green', dist: seq[i + 1]?.distance ?? null };
      const chain = offGreenChain(s, i);
      steps.push({ strokes: 1, kind: 'putt' });
      if (chain.length === 0) {
        states.push(nextPuttStart);
      } else {
        states.push(UNKNOWN);   // 그린 밖으로 나간 퍼트가 멈춘 자리는 기록하지 않는다
        chain.forEach((_, c) => {
          steps.push({ strokes: 1, kind: 'chip' });
          states.push(c === chain.length - 1 ? nextPuttStart : UNKNOWN);
        });
      }
    }
  }

  // ── 구간 나누기: 앞뒤 상태를 모두 아는 구간만 계산한다
  const known = (st) => baselineOf(st) != null;
  const segments = [];
  let measured = 0;
  let i = 0;
  while (i < steps.length) {
    if (!known(states[i])) { i++; continue; }
    let j = i + 1;
    while (j <= steps.length && !known(states[j])) j++;
    if (j > steps.length) break;   // 끝을 모르는 샷들 — 미측정

    const group = steps.slice(i, j);
    const stk = group.reduce((a, x) => a + x.strokes, 0);
    const sg = baselineOf(states[i]) - baselineOf(states[j]) - stk;
    let category;
    if (group.length === 1) {
      const st = states[i];
      if (group[0].kind === 'putt') category = 'putting';
      else if (st.kind === 'tee') category = par === 3 ? 'approach' : 'tee';
      else category = st.dist >= SHORT_GAME_MAX_M ? 'approach' : 'shortGame';
    } else {
      category = group.every(x => x.kind === 'putt') ? 'putting' : 'mixed';
    }
    segments.push({ category, sg, strokes: stk, startDist: states[i].dist ?? null });
    measured += stk;
    i = j;
  }

  return {
    holeNumber: hole.holeNumber, strokes, segments,
    measuredStrokes: measured,
    unmeasuredStrokes: Math.max(0, strokes - measured),
    fieldMeasured: !!struct,
  };
}

const newBucket = () => ({ sg: 0, strokes: 0, segments: 0 });

// 여러 라운드 합산. rounds: 1인 라운드 배열.
//   categories[c] = { sg, strokes(측정된 타수), segments }
//   coverage = 측정된 타수 / 입력한 홀의 전체 타수
export function aggregateSG(rounds) {
  const categories = { tee: newBucket(), approach: newBucket(), shortGame: newBucket(), putting: newBucket(), mixed: newBucket() };
  let strokes = 0, measured = 0, holes = 0, holesWithData = 0;
  rounds.forEach(r => {
    const p = r.players[0];
    r.holes.forEach(h => {
      const res = buildHoleSG(h, p);
      if (res.strokes === 0 && res.segments.length === 0) return;   // 입력하지 않은 홀
      holes++;
      strokes += res.strokes;
      measured += res.measuredStrokes;
      if (res.segments.length > 0) holesWithData++;
      res.segments.forEach(seg => {
        const b = categories[seg.category];
        b.sg += seg.sg; b.strokes += seg.strokes; b.segments++;
      });
    });
  });
  const total = Object.values(categories).reduce((a, b) => a + b.sg, 0);
  return {
    rounds: rounds.length, holes, holesWithData,
    strokes, measuredStrokes: measured,
    coverage: strokes > 0 ? measured / strokes : null,
    categories, total,
  };
}

// 측정된 타수가 얼마나 쌓였는가로 보는 신뢰도 (stats.js 의 low/mid/high 와 같은 이름)
export function sgTier(measuredStrokes) {
  if (measuredStrokes >= 40) return 'high';
  if (measuredStrokes >= 15) return 'mid';
  return 'low';
}
