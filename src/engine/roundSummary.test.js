import { describe, it, expect } from 'vitest';
import { summarizeRound } from './roundSummary.js';
import { buildRoundMetrics } from './metrics.js';
import { toHoleInput } from './engine.js';
import { buildStatsReport } from './statsReport.js';
import { makeFullRound, makeHalfRound, makeMultiRound, makeNoParsRound, played, PARS } from '../test/fixtures.js';

const ME = '테스터';

// 전반 9홀만 입력: GIR 3/9 (33%)
function frontNineOnly() {
  const round = makeHalfRound(1);
  round.holes.forEach((h, i) => {
    if (i < 9) h.scores[ME] = played(h.par, { strokes: i < 3 ? h.par : h.par + 1, putts: 2, gir: i < 3, fairway: h.par > 3 ? i % 2 === 0 : null });
  });
  return round;
}

describe('summarizeRound (라운드 리포트 숫자)', () => {
  it('18홀 입력 라운드: 합계·전후반·파 대비를 저장된 타수로 계산한다', () => {
    const round = makeFullRound(1);
    const s = summarizeRound(round, ME);
    const strokes = round.holes.map((h) => h.scores[ME].strokes);
    expect(s.total).toBe(strokes.reduce((a, b) => a + b, 0));
    expect(s.front9).toBe(strokes.slice(0, 9).reduce((a, b) => a + b, 0));
    expect(s.back9).toBe(strokes.slice(9).reduce((a, b) => a + b, 0));
    expect(s.totalPar).toBe(PARS.reduce((a, b) => a + b, 0));
    expect(s.diff).toBe(s.total - s.totalPar);
    expect(s.playedCount).toBe(18);
  });

  it('9홀만 입력한 라운드: GIR·퍼트는 입력한 9홀 기준이다', () => {
    const s = summarizeRound(frontNineOnly(), ME);
    expect(s.playedCount).toBe(9);
    expect(s.girHoles).toBe(3);
    expect(s.girPct).toBe('33');
    expect(s.avgPutts).toBe('2.0');
    expect(s.totalPutts).toBe(18);
  });

  it('9홀만 입력한 라운드: 점수 구성(버디·파·보기)도 입력한 홀만 센다', () => {
    const s = summarizeRound(frontNineOnly(), ME);
    expect(s.pars).toBe(3);
    expect(s.bogeys).toBe(6);
    expect(s.pars + s.bogeys + s.birdies + s.eagles + s.doubles).toBe(9);
  });

  it('pars 필드가 없어도 계산된다 (홀의 파에서 구한다)', () => {
    const s = summarizeRound(makeNoParsRound(1), ME);
    expect(s.totalPar).toBe(PARS.reduce((a, b) => a + b, 0));
  });

  it('동반자 라운드는 선택한 플레이어 기준이다', () => {
    const round = makeMultiRound(1);
    expect(summarizeRound(round, '친구').playedCount).toBe(18);
  });

  it('아무 홀도 입력하지 않았어도 0 으로 나눈 값(NaN)이 나오지 않는다', () => {
    const round = makeHalfRound(1);
    round.holes.forEach((h) => { h.scores[ME] = { ...h.scores[ME], touched: false, gir: true, putts: 2 }; });
    const s = summarizeRound(round, ME);
    expect(s.playedCount).toBe(0);
    expect(Number.isNaN(Number(s.girPct))).toBe(false);
    expect(Number.isNaN(Number(s.avgPutts))).toBe(false);
  });
});

describe('화면 간 숫자 일치: 같은 라운드의 GIR 은 리포트·인사이트·스탯이 같다', () => {
  it.each([
    ['9홀만 입력', frontNineOnly()],
    ['18홀 입력', makeFullRound(2)],
  ])('%s', (_, round) => {
    const report = summarizeRound(round, ME);
    const insight = buildRoundMetrics(round.holes.map((h) => toHoleInput(h, ME)));
    const stats = buildStatsReport([round]).approach.gir;
    expect(report.girHoles).toBe(insight.girCount);
    expect(report.girHoles).toBe(stats.hit);
    expect(report.playedCount).toBe(insight.holeCount);
    expect(report.playedCount).toBe(stats.holes);
    expect(Number(report.girPct)).toBe(Math.round(insight.girRate * 100));
    expect(Number(report.girPct)).toBe(Math.round(stats.pct));
  });
});
