import { describe, it, expect } from 'vitest';
import { buildRoundReplay, buildInsightReport, buildInsightIndex } from './insightIndex.js';
import { buildRoundMetrics } from './metrics.js';
import { toHoleInput } from './engine.js';
import { makeFullRound, makeHalfRound, makeNoParsRound, played } from '../test/fixtures.js';

const ME = '테스터';

// 전반·후반의 홀당 타수 차이를 정해서 만든 18홀 라운드 (전반은 파, 후반은 파 + backExtra)
function roundWithBackExtra(backExtra) {
  const round = makeFullRound(1);
  round.holes.forEach((h, i) => { h.scores[ME] = played(h.par, { strokes: i < 9 ? h.par : h.par + backExtra, putts: 2, gir: i < 9 }); });
  return round;
}

describe('라운드 복기 한 줄 요약', () => {
  it('9홀만 입력한 라운드는 입력하지 않은 후반을 근거로 "후반이 전반보다 …"를 말하지 않는다', () => {
    const half = makeHalfRound(1);
    half.holes.forEach((h, i) => { if (i < 9) h.scores[ME] = played(h.par, { strokes: h.par + 1, putts: 2, gir: false }); });
    const replay = buildRoundReplay(half);
    expect(replay.headline).not.toMatch(/후반이 전반보다/);
    expect(replay.enteredHoles).toBe(9);
    expect(replay.defaultHoles).toBe(9);
  });

  it('18홀 모두 입력했으면 후반이 많이 나쁜 라운드를 알려 준다', () => {
    expect(buildRoundReplay(roundWithBackExtra(1)).headline).toMatch(/후반이 전반보다 9타 많음/);
  });

  it('후반이 많이 좋은 라운드도 알려 준다', () => {
    const round = roundWithBackExtra(0);
    round.holes.forEach((h, i) => { if (i < 9) h.scores[ME] = played(h.par, { strokes: h.par + 1, putts: 2, gir: false }); });
    expect(buildRoundReplay(round).headline).toMatch(/후반이 전반보다 9타 적음/);
  });

  it('인사이트 규칙의 후반 차이(backFade)와 같은 값이다', () => {
    const round = roundWithBackExtra(1);
    const m = buildRoundMetrics(round.holes.map((h) => toHoleInput(h, ME)));
    expect(m.backFade).toBe(9);
    expect(buildRoundReplay(round).headline).toContain(`${m.backFade}타`);
  });
});

describe('pars 가 없는 라운드', () => {
  it('복기·리포트·검색 색인이 pars 없이도 만들어진다', () => {
    const rounds = [makeNoParsRound(1), makeFullRound(2)];
    expect(() => buildRoundReplay(rounds[0])).not.toThrow();
    expect(buildRoundReplay(rounds[0]).par).toBe(72);
    expect(() => buildInsightReport(rounds, 'career')).not.toThrow();
    expect(() => buildInsightIndex(rounds)).not.toThrow();
  });
});
