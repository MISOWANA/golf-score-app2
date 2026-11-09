// 스탯과 인사이트가 같은 라운드에서 같은 숫자를 말하는지 — 같은 계산을 한 곳에서 하도록 합친 것들을 고정한다.
//   · OB · 해저드 · 3퍼트 · 더블+ 횟수 (shotStats.countRoundEvents)
//   · 홀 결과 · 파별 성적 (statsReport.buildComposition)
//   · 1~2m 퍼트 구간 (roundStory.buildPuttZone ↔ 퍼트 거리별 표의 '1-2m' 줄)
//   · '가장 약한 부문' (리포트 포커스 ↔ 연습 처방 ↔ 스탯 강점·약점이 같은 기준)
//   · 한 줄 요약 (점수는 범위 카드가 말하므로 요약에는 점수 뒤 내용만)
import { describe, it, expect } from 'vitest';
import { buildLeaks, buildComposition, buildStatsReport } from './statsReport.js';
import { buildAwfulShots, countRoundEvents, sumRoundEvents } from './shotStats.js';
import { AWFUL_POINTS } from './bookBenchmarks.js';
import { buildPuttZone, buildPrescriptions, pickWeakestSkill, PUTT_ZONE_M, PRACTICE } from './roundStory.js';
import { localizeText } from './units.js';
import { buildPuttingDetail } from './puttingDetail.js';
import { buildInsightReport, buildRoundReplay } from './insightIndex.js';
import { SG_CATEGORIES } from './strokesGained.js';
import { createRng, makeMessyRound, makeFullRound, PARS } from '../test/fixtures.js';
import { ME, holeOf, roundOf, made, missed } from '../test/putts.js';

const messyRounds = (n = 8, seed = 7) => {
  const rng = createRng(seed);
  return Array.from({ length: n }, (_, i) => makeMessyRound(rng, i + 1));
};
const fullRounds = () => [makeFullRound(1), makeFullRound(2), makeFullRound(3)];

describe('사고 · 3퍼트 · 더블+ 횟수는 한 함수가 센다', () => {
  it('스탯 타수가 새는 곳 · 끔찍한 샷 · 합계가 같은 숫자다 (뒤섞인 입력 포함)', () => {
    [messyRounds(), messyRounds(6, 21), fullRounds()].forEach((rounds) => {
      const e = sumRoundEvents(rounds);
      const leaks = buildLeaks(rounds);
      const awful = buildAwfulShots(rounds);
      expect(leaks.threePutt.total).toBe(e.threePutt);
      expect(leaks.ob.total).toBe(e.ob);
      expect(leaks.hazard.total).toBe(e.hazard + e.unplayable);
      expect(leaks.doubleHoles.total).toBe(e.double);
      expect(awful.ob).toBe(e.ob);
      expect(awful.hazard).toBe(e.hazard);
      expect(awful.unplayable).toBe(e.unplayable);
      expect(awful.points).toBe(e.ob * AWFUL_POINTS.ob + e.hazard * AWFUL_POINTS.hazard + e.unplayable * AWFUL_POINTS.unplayable);
      expect(buildComposition(rounds).counts.double).toBe(e.double);          // 홀 결과의 더블+ 도 같은 홀을 센다
    });
  });

  it('여러 라운드의 합은 라운드마다 센 값의 합이다', () => {
    const rounds = messyRounds();
    const sum = rounds.map(countRoundEvents).reduce((a, e) => a + e.threePutt, 0);
    expect(sumRoundEvents(rounds).threePutt).toBe(sum);
  });

  it('입력하지 않은 홀은 2퍼트 · 파로 읽어 3퍼트나 더블로 세지 않는다', () => {
    const r = makeFullRound(1);
    r.holes.forEach((h) => { delete h.scores[ME].putts; delete h.scores[ME].strokes; });
    const e = countRoundEvents(r);
    expect(e).toMatchObject({ threePutt: 0, onePutt: 0, double: 0, extraPutts: 0 });
    expect(e.score).toBe(PARS.reduce((a, b) => a + b, 0));
  });
});

describe('홀 결과 · 파별 성적 (buildComposition)', () => {
  const par4 = (strokes, n) => holeOf([made(1)], { par: 4, strokes, number: n });

  it('이글 · 버디 · 파 · 보기 · 더블+ 로 가르고, 버디는 이글을 포함한다', () => {
    const c = buildComposition([roundOf([par4(2, 1), par4(3, 2), par4(4, 3), par4(5, 4), par4(6, 5), par4(8, 6)])]);
    expect(c.counts).toEqual({ eagle: 1, birdie: 2, par: 1, bogey: 1, double: 2 });
    expect(c.total).toBe(6);
  });

  it('파별 평균 타수 · 버디↑ 비율 · 보기↑ 비율을 같은 홀에서 센다', () => {
    const c = buildComposition([roundOf([par4(3, 1), par4(4, 2), par4(5, 3), par4(6, 4)])]);
    expect(c.byPar).toHaveLength(1);
    expect(c.byPar[0]).toMatchObject({ par: 4, count: 4, avgStrokes: 4.5, avgDiff: 0.5, birdiePct: 25, bogeyPlusPct: 50 });
  });

  it('뒤섞인 입력에서도 합이 맞는다', () => {
    const c = buildComposition(messyRounds());
    const k = c.counts;
    expect(k.birdie + k.par + k.bogey + k.double).toBe(c.total);
    expect(k.eagle).toBeLessThanOrEqual(k.birdie);
    expect(c.byPar.reduce((a, p) => a + p.count, 0)).toBe(c.total);
    c.byPar.forEach((p) => { expect(Number.isFinite(p.avgStrokes)).toBe(true); });
  });
});

describe('1~2m 퍼트 구간은 거리별 표의 1-2m 줄과 같다', () => {
  it('경계: 1m 는 들어가고 2m 는 들어가지 않는다 (표의 줄과 같은 경계)', () => {
    expect(PUTT_ZONE_M).toEqual([1, 2]);
    const r = roundOf([holeOf([made(0.95), made(1), missed(1.99, 'flat'), made(2), made(2.1)], { number: 1 })]);
    expect(buildPuttZone([r])).toMatchObject({ made: 1, total: 2, ratePct: 50 });
    const row = buildPuttingDetail([r]).byDistance.find((b) => b.id === '1to2');
    expect([row.made, row.total]).toEqual([1, 2]);
  });

  it('뒤섞인 입력에서도 표의 1-2m 줄과 성공 · 시도가 같다', () => {
    [messyRounds(), messyRounds(6, 21)].forEach((rounds) => {
      const zone = buildPuttZone(rounds);
      const row = buildPuttingDetail(rounds).byDistance.find((b) => b.id === '1to2');
      expect([zone.made, zone.total]).toEqual([row.made, row.total]);
    });
  });
});

describe('가장 약한 부문은 리포트 포커스 · 연습 처방이 같은 기준이다', () => {
  // 스코어 분해 1위가 아닌 부문을 SG 로 가장 나쁘게 만든다 — 두 기준이 서로 다른 부문을 가리키는 상황
  const sgWorst = (cat) => ({ categories: Object.fromEntries(SG_CATEGORIES.map((c) => [c, { sg: c === cat ? -2 : 0.5, strokes: 12, segments: 3 }])) });

  it('SG 가 충분히 측정됐으면 포커스 첫 줄도 SG 로 가장 나쁜 부문이다', () => {
    const rounds = fullRounds();
    const base = buildInsightReport(rounds, 'career');
    expect(base.ranked.length).toBeGreaterThan(0);
    const topByScore = base.ranked[0][0];
    const other = SG_CATEGORIES.find((c) => c !== topByScore);
    const rep = buildInsightReport(rounds, 'career', sgWorst(other));
    expect(rep.weakest).toEqual({ skill: other, basis: 'sg' });
    expect(rep.focus[0].category).toBe(other);
    expect(rep.focus[0].text).toMatch(/투어 평균 대비/);
  });

  it('SG 가 부족하면 스코어 기준 손실 1위이고, 포커스와 연습 처방이 같은 부문이다', () => {
    [fullRounds(), messyRounds(5, 33)].forEach((rounds) => {
      ['round', 'career'].forEach((mode) => {
        const rep = buildInsightReport(rounds, mode);
        if (!rep.weakest) return;
        expect(rep.focus[0].category).toBe(rep.weakest.skill);
        const p = buildPrescriptions({ sg: null, ranked: rep.ranked.map(([category, strokes]) => ({ category, strokes })) });
        if (rep.weakest.basis === 'score') expect(p.primary.skill).toBe(rep.weakest.skill);
      });
    });
  });

  it('연습 처방은 넘겨받은 부문(pick)을 그대로 따른다 — 다시 골라 다른 부문이 되지 않는다', () => {
    const ranked = [{ category: 'tee', strokes: 9 }, { category: 'putting', strokes: 4 }];
    expect(pickWeakestSkill({ sg: null, ranked }).skill).toBe('tee');
    const p = buildPrescriptions({ sg: null, ranked, pick: { skill: 'putting', basis: 'sg' } });
    expect(p.primary.skill).toBe('putting');
    expect(buildPrescriptions({ sg: null, ranked, pick: null })).toEqual({ primary: null, cards: [] });
  });

  it('티샷 처방의 "치우침"은 스탯 티샷과 같은 판정(teeSide)을 쓴다', () => {
    const card = (teeSide) => buildPrescriptions({ pick: { skill: 'tee', basis: 'score' }, teePen: { teeShots: 12, ob: 1, obRate: 1 / 12 }, teeSide }).cards[0].why;
    expect(card('right')).toContain('우측으로 치우침');
    expect(card('left')).toContain('좌측으로 치우침');
    expect(card(null)).not.toMatch(/치우침/);
  });

  it('스탯의 강점·약점도 같은 pickWeakestSkill 로 정한다', () => {
    const rounds = fullRounds();
    const rep = buildInsightReport(rounds, 'career');
    expect(buildStatsReport(rounds).balance.weakest).toBe(rep.weakest?.skill ?? null);
  });
});

describe('한 줄 요약 — 점수는 범위 카드가 말한다', () => {
  it('headlineDetail 은 점수를 뺀 나머지이고, 복기·카드의 headline 은 그대로 점수로 시작한다', () => {
    fullRounds().forEach((r) => {
      const rp = buildRoundReplay(r);
      expect(rp.headline.startsWith(`${rp.score}타 (`)).toBe(true);
      expect(rp.headline.endsWith(` — ${rp.headlineDetail}`)).toBe(true);
      expect(rp.headlineDetail).not.toMatch(/^\d+타/);
      expect(rp.headlineDetail.length).toBeGreaterThan(0);
    });
  });
});

describe('3퍼트 원인은 인사이트와 스탯이 같다', () => {
  it('같은 라운드의 원인별 횟수가 같다', () => {
    [fullRounds(), messyRounds(), messyRounds(6, 21)].forEach((rounds) => {
      const insight = buildInsightReport(rounds, 'career').causes;
      const stats = buildStatsReport(rounds).putting.causes;
      expect(insight.total).toBe(stats.total);
      expect(insight.counts).toEqual(stats.counts);
    });
  });
});

describe('연습 처방 문구는 거리 단위를 한 가지로 쓴다', () => {
  it('근접도 목표의 투어·평균 값은 야드 모드에서 같은 단위(피트)로 바뀐다', () => {
    const t = localizeText(PRACTICE.approach.target, 'yd');
    expect(t).toMatch(/투어 \d+피트 · 평균 90타 골퍼 \d+피트/);
    expect(t).not.toMatch(/야드/);
  });

  it('제목과 본문은 같은 순서로 쓰고, 야드 모드에서는 둘 다 125야드가 된다', () => {
    expect(PRACTICE.approach.title).toMatch(/^114m\(125야드\)/);
    expect(PRACTICE.approach.drill).toMatch(/^114m\(125야드\)/);
    expect(localizeText(PRACTICE.approach.title, 'yd')).toBe('125야드 근접도 도전');
    expect(localizeText(PRACTICE.approach.drill, 'yd')).toMatch(/^125야드에서/);
  });

  it('어떤 카드도 야드 모드에서 미터 글자가 남지 않는다', () => {
    Object.values(PRACTICE).forEach((c) => ['title', 'drill', 'target'].forEach((f) => {
      expect(localizeText(c[f], 'yd')).not.toMatch(/\d\s?m(?![A-Za-z])/);
    }));
  });
});
