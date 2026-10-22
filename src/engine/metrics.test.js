import { describe, it, expect } from 'vitest';
import { toHoleInput, analyzeRound, matchRoundInsightRules } from './engine.js';
import { buildRoundMetrics, getTeeMissCategory } from './metrics.js';
import { HOLE_RULES } from './rules/holeRules.js';
import { ROUND_RULES } from './rules/roundRules.js';
import { makeHalfRound, makeFullRound, played, defaultScore } from '../test/fixtures.js';

const ME = '테스터';
const inputsOf = (round) => round.holes.map((h) => toHoleInput(h, ME));

// 전반 9홀만 입력: GIR 성공 3홀(파) · 나머지 6홀은 보기(GIR 실패). 후반은 입력 없음(기본값 = GIR 성공 표시).
function frontNineOnly() {
  const round = makeHalfRound(1);
  round.holes.forEach((h, i) => {
    if (i < 9) h.scores[ME] = played(h.par, { strokes: i < 3 ? h.par : h.par + 1, putts: 2, gir: i < 3 });
  });
  return round;
}

describe('라운드 지표: 입력하지 않은 홀은 세지 않는다', () => {
  it('GIR·퍼트·횟수는 입력한 9홀 기준이다 (기본값 GIR 성공이 섞이지 않는다)', () => {
    const m = buildRoundMetrics(inputsOf(frontNineOnly()));
    expect(m.holeCount).toBe(9);
    expect(m.girCount).toBe(3);
    expect(m.girRate).toBeCloseTo(3 / 9);
    expect(m.avgPutts).toBe(2);
    expect(m.parCount).toBe(3);
    expect(m.bogeyCount).toBe(6);
  });

  it('입력하지 않은 후반을 근거로 "후반 강세" 같은 전후반 인사이트를 만들지 않는다', () => {
    const m = buildRoundMetrics(inputsOf(frontNineOnly()));
    expect(m.backNineScoreToPar).toBe(0);
    expect(m.backFade).toBe(0);
  });

  it('"그린 적중률이 탁월합니다"(R001)는 실제 GIR이 낮으면 나오지 않는다', () => {
    const m = buildRoundMetrics(inputsOf(frontNineOnly()));
    const ids = matchRoundInsightRules(m, ROUND_RULES).map((i) => i.id);
    expect(ids).not.toContain('R001');
    const text = matchRoundInsightRules(m, ROUND_RULES).map((i) => i.title + i.summary).join(' ');
    expect(text).not.toMatch(/후반 강세|후반이 전반보다/);
  });

  it('18홀 모두 입력한 라운드는 예전과 같은 숫자다 (회귀)', () => {
    const round = makeFullRound(1);
    const m = buildRoundMetrics(inputsOf(round));
    const strokes = round.holes.reduce((s, h) => s + h.scores[ME].strokes, 0);
    expect(m.holeCount).toBe(18);
    expect(m.totalScore).toBe(strokes);
    expect(m.girCount).toBe(round.holes.filter((h) => h.scores[ME].gir === true).length);
    // 전후반은 홀 번호 기준
    const front = round.holes.slice(0, 9).reduce((s, h) => s + h.scores[ME].strokes - h.par, 0);
    expect(m.frontNineScoreToPar).toBe(front);
  });

  it('전반·후반을 모두 입력했으면 backFade 가 계산된다', () => {
    const round = makeFullRound(2);
    round.holes.forEach((h, i) => { h.scores[ME] = played(h.par, { strokes: i < 9 ? h.par : h.par + 1, gir: i < 9 }); });
    expect(buildRoundMetrics(inputsOf(round)).backFade).toBe(9);
  });

  it('아무 홀도 입력하지 않았으면 null 이다 (화면은 null 을 처리한다)', () => {
    const round = makeFullRound(3);
    round.holes.forEach((h) => { h.scores[ME] = defaultScore(h.par); });
    expect(buildRoundMetrics(inputsOf(round))).toBeNull();
    expect(analyzeRound(inputsOf(round), HOLE_RULES, ROUND_RULES).roundInsights).toEqual([]);
  });

  it('touched 표시가 없는 예전 기록은 입력한 홀로 본다', () => {
    const round = makeFullRound(4);
    round.holes.forEach((h) => { delete h.scores[ME].touched; });
    expect(buildRoundMetrics(inputsOf(round)).holeCount).toBe(18);
  });
});

describe('티샷 구질: UI가 저장하는 한글 값을 읽는다', () => {
  const hole = (shape, fairway) => toHoleInput({ holeNumber: 1, par: 4, scores: { [ME]: played(4, { shotShape: shape, fairway, fairwayHit: 'R' }) } }, ME);

  it.each([
    ['슬라이스', false, 'severe_right'],
    ['훅', false, 'severe_left'],
    ['slice', false, 'severe_right'],   // 예전 영문 값도 계속 읽는다
    ['hook', false, 'severe_left'],
  ])('%s + 페어웨이 미적중 → %s', (shape, fairway, expected) => {
    expect(getTeeMissCategory(hole(shape, fairway))).toBe(expected);
  });

  it('슬라이스·훅이어도 페어웨이에 올렸으면 "심각한 미스"가 아니다', () => {
    expect(getTeeMissCategory(hole('슬라이스', true))).toBe('fairway');
    expect(getTeeMissCategory(hole('훅', true))).toBe('fairway');
  });

  it('다른 구질은 방향 기록(L/R)을 따른다', () => {
    expect(getTeeMissCategory(hole('스트레이트', false))).toBe('miss_right');
    expect(getTeeMissCategory(hole('풀', false))).toBe('miss_right');
  });

  it('슬라이스 4번이면 홀 인사이트(H028)와 라운드 인사이트(R018)가 발동한다', () => {
    const round = makeFullRound(5);
    let n = 0;   // 파3 은 티샷 미스 분류가 없으므로 파4·5 홀 4개를 슬라이스로 한다
    round.holes.forEach((h) => {
      const slice = h.par > 3 && n < 4;
      if (slice) n++;
      h.scores[ME] = played(h.par, {
        strokes: h.par + 1, shotShape: slice ? '슬라이스' : '스트레이트',
        fairway: h.par > 3 ? false : null, fairwayHit: h.par > 3 ? 'R' : null,
      });
    });
    const { holeInsights, roundInsights } = analyzeRound(inputsOf(round), HOLE_RULES, ROUND_RULES);
    expect(holeInsights.flat().filter((i) => i.id === 'H028')).toHaveLength(4);
    expect(roundInsights.map((i) => i.id)).toContain('R018');
  });
});
