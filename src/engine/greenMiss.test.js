import { describe, it, expect } from 'vitest';
import { greenMissed, greenMissOf, effectiveGreenMiss, buildGreenMissStats, GREEN_MISS_DIRS } from './greenMiss.js';
import { buildStatsReport } from './statsReport.js';
import { toHoleInput, analyzeRound, matchRoundInsightRules } from './engine.js';
import { buildRoundMetrics } from './metrics.js';
import { HOLE_RULES } from './rules/holeRules.js';
import { ROUND_RULES } from './rules/roundRules.js';
import { makeFullRound, played } from '../test/fixtures.js';

const ME = '테스터';

describe('greenMissed — 방향을 물을 홀', () => {
  it('GIR 실패 홀이다', () => {
    expect(greenMissed({ gir: false }, 4)).toBe(true);
    expect(greenMissed({ gir: false }, 3)).toBe(true);
  });

  it('GIR 성공이거나 기록이 없으면 아니다', () => {
    expect(greenMissed({ gir: true }, 4)).toBe(false);
    expect(greenMissed({ gir: null }, 4)).toBe(false);
    expect(greenMissed(null, 4)).toBe(false);
  });

  it('파5는 세 번째 샷(추가 샷 첫 번째)이 그린을 놓쳤을 때 놓친 홀이다 (2온 실패는 레이업이라 아니다)', () => {
    expect(greenMissed({ gir: true, extraShots: [{ onGreen: false }] }, 5)).toBe(true);
    expect(greenMissed({ gir: true, extraShots: [{ onGreen: true }] }, 5)).toBe(false);
    expect(greenMissed({ gir: true, extraShots: [] }, 5)).toBe(false);
    expect(greenMissed({ gir: true, extraShots: [{ onGreen: false }] }, 4)).toBe(false);   // 파4 의 추가 샷 실패는 이미 gir 로 잡힌다
  });
});

describe('저장된 방향', () => {
  it('롱·라이트·숏·레프트만 받는다', () => {
    expect(GREEN_MISS_DIRS.map((d) => d.id)).toEqual(['long', 'right', 'short', 'left']);
    expect(greenMissOf({ greenMiss: 'short' })).toBe('short');
    expect(greenMissOf({ greenMiss: 'up' })).toBeNull();
    expect(greenMissOf({ greenMiss: null })).toBeNull();
    expect(greenMissOf(undefined)).toBeNull();
  });

  it('그린을 놓치지 않은 홀에 남은 방향은 무시한다 (방향을 고른 뒤 성공으로 고친 경우)', () => {
    expect(effectiveGreenMiss({ gir: true, greenMiss: 'left' }, 4)).toBeNull();
    expect(effectiveGreenMiss({ gir: false, greenMiss: 'left' }, 4)).toBe('left');
  });
});

describe('인사이트 규칙이 실제로 동작한다', () => {
  // 그린을 놓친 홀 6개를 모두 같은 방향으로 놓친 라운드
  const roundMissing = (dir) => {
    const round = makeFullRound(1);
    round.holes.forEach((h, i) => {
      h.scores[ME] = i < 6
        ? played(h.par, { strokes: h.par + 1, putts: 2, gir: false, greenMiss: dir })
        : played(h.par, { strokes: h.par, putts: 2, gir: true });
    });
    return round;
  };
  const inputs = (round) => round.holes.map((h) => toHoleInput(h, ME));

  it('toHoleInput 은 놓친 홀의 방향을 엔진에 넘긴다', () => {
    const round = roundMissing('right');
    expect(inputs(round)[0].greenMissDirection).toBe('right');
    expect(inputs(round)[10].greenMissDirection).toBeNull();
  });

  it('오른쪽으로 반복해 놓치면 라운드 인사이트(우측 미스 반복)가 나온다', () => {
    const m = buildRoundMetrics(inputs(roundMissing('right')));
    expect(m.greenMissTotal).toBe(6);
    expect(m.greenMissRight).toBe(6);
    const ids = matchRoundInsightRules(m, ROUND_RULES).map((i) => i.summary).join(' ');
    expect(ids).toMatch(/그린 미스 중 우측 100%/);
  });

  it('짧게 반복해 놓치면 숏 인사이트가 나온다', () => {
    const m = buildRoundMetrics(inputs(roundMissing('short')));
    expect(matchRoundInsightRules(m, ROUND_RULES).map((i) => i.summary).join(' ')).toMatch(/숏/);
  });

  it.each([
    ['long', 'H025', /오버/],
    ['short', 'H024', /짧게/],
    ['right', 'H026', /오른쪽 방향으로 놓쳤습니다/],
    ['left', 'H026', /왼쪽 방향으로 놓쳤습니다/],
  ])('홀 인사이트: %s → %s', (dir, id, wording) => {
    const { holeInsights } = analyzeRound(inputs(roundMissing(dir)), HOLE_RULES, ROUND_RULES);
    const hit = holeInsights[0].find((i) => i.id === id);
    expect(hit).toBeTruthy();
    expect(hit.summary).toMatch(wording);
    expect(hit.summary).toMatch(/^1번 홀/);
  });

  it('인사이트 문구에 영어 값(left/right)이 노출되지 않는다', () => {
    ['left', 'right', 'short', 'long'].forEach((dir) => {
      const { holeInsights, roundInsights } = analyzeRound(inputs(roundMissing(dir)), HOLE_RULES, ROUND_RULES);
      const text = [...holeInsights.flat(), ...roundInsights].map((i) => `${i.title} ${i.summary} ${i.recommendation}`).join(' ');
      expect(text).not.toMatch(/\b(left|right|short|long)\b/);
    });
  });

  it('방향을 기록하지 않았으면 방향 인사이트를 만들지 않는다', () => {
    const m = buildRoundMetrics(inputs(roundMissing(null)));
    expect(m.greenMissTotal).toBe(0);
  });
});

describe('buildGreenMissStats — 스탯 어프로치 탭', () => {
  // dirs: 앞에서부터 그린을 놓친 홀의 방향 (null = 방향 미기록). 나머지 홀은 그린에 올렸다.
  const roundWith = (dirs, over = {}) => {
    const round = makeFullRound(1, ME, over);
    round.holes.forEach((h, i) => {
      h.scores[ME] = i < dirs.length
        ? played(h.par, { strokes: h.par + 1, putts: 2, gir: false, greenMiss: dirs[i] })
        : played(h.par, { strokes: h.par, putts: 2, gir: true });
    });
    return round;
  };

  it('그린을 놓친 홀 수와 방향별 횟수를 센다', () => {
    const s = buildGreenMissStats([roundWith(['right', 'right', 'short', 'left', null])]);
    expect(s).toMatchObject({ missed: 5, recorded: 4, top: 'right' });
    expect(s.counts).toEqual({ long: 0, right: 2, short: 1, left: 1 });
  });

  it('그린에 올린 홀과 입력하지 않은 홀은 세지 않는다', () => {
    const r = roundWith(['long', 'long']);
    r.holes[10].scores[ME] = { ...r.holes[10].scores[ME], touched: false, gir: false, greenMiss: 'left' };   // 입력 없는 홀
    r.holes[11].scores[ME] = { ...r.holes[11].scores[ME], gir: true, greenMiss: 'left' };                    // 올렸는데 방향이 남은 홀
    const s = buildGreenMissStats([r]);
    expect(s).toMatchObject({ missed: 2, recorded: 2, top: 'long' });
  });

  it('기록이 없으면 0 이고 top 은 null', () => {
    expect(buildGreenMissStats([])).toEqual({ missed: 0, recorded: 0, counts: { long: 0, right: 0, short: 0, left: 0 }, top: null });
    expect(buildGreenMissStats([roundWith([])]).missed).toBe(0);
  });

  it('여러 라운드를 합산한다', () => {
    const s = buildGreenMissStats([roundWith(['right', 'right']), roundWith(['right', 'short'])]);
    expect(s).toMatchObject({ missed: 4, recorded: 4, top: 'right' });
    expect(s.counts.right).toBe(3);
  });

  it('인사이트의 그린 미스 지표와 같은 숫자다 (화면 간 일치)', () => {
    const round = roundWith(['right', 'right', 'short', 'long', 'left', null]);
    const stats = buildGreenMissStats([round]);
    const m = buildRoundMetrics(round.holes.map((h) => toHoleInput(h, ME)));
    expect(stats.recorded).toBe(m.greenMissTotal);
    expect([stats.counts.right, stats.counts.left, stats.counts.short, stats.counts.long])
      .toEqual([m.greenMissRight, m.greenMissLeft, m.greenMissShort, m.greenMissLong]);
  });

  it('스탯 리포트의 어프로치에 들어 있다', () => {
    const report = buildStatsReport([roundWith(['right', 'right', 'right', 'short'])]);
    expect(report.approach.greenMiss).toMatchObject({ missed: 4, recorded: 4, top: 'right' });
  });
});
