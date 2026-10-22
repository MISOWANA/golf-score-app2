// 9홀 라운드가 18홀 중심의 집계를 오염시키지 않는지. 스탯·인사이트 화면에는 App 이 9홀 라운드를 아예 걸러 보내지만
// (GolfScoringApp.test), 엔진도 9홀이 섞여 들어와도 평균·베스트·추세·누적이 오염되지 않게 방어한다.
import { describe, it, expect } from 'vitest';
import { summarizeRound } from './roundSummary.js';
import { buildScoreSummary, buildLeaks, buildStatsReport } from './statsReport.js';
import { buildCareerInsights } from './careerInsights.js';
import { buildRoundReplay } from './insightIndex.js';
import { buildRoundDiagnosis } from './diagnosis.js';
import { buildRoundMetrics } from './metrics.js';
import { toHoleInput } from './engine.js';
import { puttingOfRound, buildGreenSpeedReport } from './greenSpeed.js';
import { makeFullRound, makeNineRound, played } from '../test/fixtures.js';

const ME = '테스터';
const strokesOf = (r) => r.holes.reduce((s, h) => s + h.scores[ME].strokes, 0);

// 모든 홀이 파인 18홀 라운드 / 모든 홀이 파인 9홀 라운드 (퍼트 2개)
const evenPar = (round) => { round.holes.forEach((h) => { h.scores[ME] = played(h.par, { strokes: h.par, putts: 2, gir: true }); }); return round; };

describe('9홀 라운드의 리포트 숫자', () => {
  it('전반 9홀: front9 = 합계, back9 = 0', () => {
    const r = makeNineRound(1, 'out');
    const s = summarizeRound(r, ME);
    expect(s.total).toBe(strokesOf(r));
    expect(s.front9).toBe(s.total);
    expect(s.back9).toBe(0);
    expect(s.playedCount).toBe(9);
    expect(s.totalPar).toBe(r.holes.reduce((a, h) => a + h.par, 0));   // 9홀 파 합계 (36 근처) — 파 72 가 아니다
  });

  it('IN 코스 9홀도 홀 번호는 1~9 라서 합계가 front9 로 잡힌다 (리포트는 9홀이면 전반·후반 칸을 숨긴다)', () => {
    const r = makeNineRound(1, 'in');
    const s = summarizeRound(r, ME);
    expect(s.front9).toBe(s.total);
    expect(s.back9).toBe(0);
  });
});

describe('스탯: 스코어는 18홀끼리', () => {
  const full = [makeFullRound(1), makeFullRound(2), makeFullRound(3)];
  const nine = makeNineRound(9, 'out');

  it('평균·베스트·라운드 수에 9홀 라운드를 넣지 않고, 몇 개 뺐는지 알려 준다', () => {
    const s = buildScoreSummary([nine, ...full]);
    expect(s.rounds).toBe(3);
    expect(s.nineHoleRounds).toBe(1);
    expect(s.avg).toBeCloseTo(full.reduce((a, r) => a + strokesOf(r), 0) / 3);
    expect(s.best.course).not.toBe(nine.courseName);
    expect(s.trend).toHaveLength(3);
  });

  it('9홀 점수(예: 33)가 베스트가 되지 않는다', () => {
    const lowNine = evenPar(makeNineRound(9, 'out'));          // 36타 — 어떤 18홀 점수보다 작다
    const s = buildScoreSummary([lowNine, ...full]);
    expect(s.best.total).toBeGreaterThan(60);
  });

  it('18홀 라운드가 없으면 빈 요약을 돌려준다 (화면이 죽지 않는다)', () => {
    const s = buildScoreSummary([nine, makeNineRound(8, 'in')]);
    expect(s).toMatchObject({ rounds: 0, nineHoleRounds: 2, avg: null, best: null, improvement: null, trend: [] });
  });

  it('라운드가 아예 없으면 null', () => {
    expect(buildScoreSummary([])).toBeNull();
  });

  it('엔진은 9홀 라운드가 섞여 와도 홀 단위 집계를 그대로 낸다 (집계에서 뺄지는 호출하는 쪽이 정한다)', () => {
    const report = buildStatsReport([nine, ...full]);
    expect(report.approach.gir.holes).toBe(9 + 18 * 3);
    expect(report.score.nineHoleRounds).toBe(1);
  });

  it('라운드당 새는 타수는 18홀 기준으로 환산한다 (9홀 둘 = 18홀 하나)', () => {
    const threePuttRound = (r, holeIdx) => { r.holes[holeIdx].scores[ME] = played(r.holes[holeIdx].par, { putts: 3, strokes: r.holes[holeIdx].par + 1 }); return r; };
    const base18 = evenPar(makeFullRound(1)); threePuttRound(base18, 0); threePuttRound(base18, 5);
    const a = evenPar(makeNineRound(1, 'out')); threePuttRound(a, 0);
    const b = evenPar(makeNineRound(2, 'in')); threePuttRound(b, 1);
    expect(buildLeaks([a, b]).threePutt.perRound).toBeCloseTo(buildLeaks([base18]).threePutt.perRound);
    expect(buildLeaks([a, b]).threePutt.perRound).toBe(2);
  });
});

describe('누적 인사이트: 9홀 라운드는 라운드 합계 비교에서 뺀다', () => {
  it('베스트 라운드(C003)는 18홀 라운드 중에서 뽑는다', () => {
    const rounds = [makeFullRound(1), makeFullRound(2), makeFullRound(3), evenPar(makeNineRound(9, 'out'))];
    const best = buildCareerInsights(rounds).find((i) => i.id === 'C003');
    expect(best).toBeTruthy();
    expect(best.summary).not.toContain(rounds[3].courseName);
    expect(best.summary).toContain('3라운드 중');
  });

  it('18홀 라운드가 둘 미만이면 합계 기반 인사이트를 만들지 않는다 (예외도 없다)', () => {
    const rounds = [makeFullRound(1), makeNineRound(2, 'out'), makeNineRound(3, 'in')];
    expect(() => buildCareerInsights(rounds)).not.toThrow();
    expect(buildCareerInsights(rounds).find((i) => i.id === 'C003')).toBeUndefined();
  });
});

describe('그린 스피드: 퍼트 수를 18홀로 환산해 견준다', () => {
  it('9홀(퍼트 18개)은 18홀 36개와 같은 눈금이다', () => {
    const nine = evenPar(makeNineRound(1, 'out'));
    const p = puttingOfRound(nine);
    expect(p.putts).toBe(18);
    expect(p.putts18).toBe(36);
    expect(puttingOfRound(evenPar(makeFullRound(1))).putts18).toBe(36);
  });

  it('같은 퍼트 페이스의 9홀과 18홀을 견주면 차이가 없다 (9홀 18개를 "18개 줄었다"고 하지 않는다)', () => {
    const latest = evenPar(makeNineRound(5, 'out')); latest.greenSpeed = 9;
    const others = [1, 2].map((i) => { const r = evenPar(makeFullRound(i)); r.greenSpeed = 9; return r; });
    const rep = buildGreenSpeedReport([latest, ...others], 'round');
    expect(rep.compare.dPutts).toBe(0);
    expect(rep.compare.dThree).toBe(0);
  });
});

describe('진단 카드', () => {
  it('홀 번호와 배열 위치가 다른 기록(가져온 예전 기록)에서도 3퍼트 원인을 찾는다 — 홀 번호를 배열 위치로 쓰지 않는다', () => {
    const r = evenPar(makeNineRound(1, 'in'));
    r.holes.forEach((h, i) => { h.holeNumber = i + 10; });   // 번호 10~18, 위치 0~8
    r.holes[2].scores[ME] = played(r.holes[2].par, { strokes: r.holes[2].par + 1, putts: 3, gir: true,
      puttDetails: [{ distance: 10, holein: 'fail' }, { distance: 3, holein: 'fail' }, { distance: 0.5, holein: 'success' }] });
    const d = buildRoundDiagnosis(r, ME);
    expect(d.top.category).toBe('putting');
    expect(d.observation).toMatch(/3퍼트/);
  });
});

describe('복기·지표', () => {
  it('buildRoundReplay: 9홀은 1~9번 한쪽뿐이라 전반·후반 비교가 없다', () => {
    for (const side of ['out', 'in']) {
      const rep = buildRoundReplay(makeNineRound(1, side));
      expect([rep.hasFront, rep.hasBack]).toEqual([true, false]);
      expect(rep.holes.map((h) => h.holeNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      expect(rep.headline).not.toMatch(/후반이 전반보다/);
    }
  });

  it('buildRoundMetrics: 9홀은 holeCount 9, 전후반 비교는 하지 않는다', () => {
    const r = makeNineRound(1, 'in');
    const m = buildRoundMetrics(r.holes.map((h) => toHoleInput(h, ME)));
    expect(m.holeCount).toBe(9);
    expect(m.backFade).toBe(0);
  });
});
