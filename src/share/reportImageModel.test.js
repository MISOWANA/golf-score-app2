import { describe, it, expect } from 'vitest';
import { buildReportImageModel, reportImageFileName, fmtDelta, signedDiff } from './reportImageModel.js';
import { buildRoundCard } from '../engine/roundCard.js';
import { makeFullRound, makeNineRound } from '../test/fixtures.js';

describe('fmtDelta · signedDiff', () => {
  it('변화 방향과 크기, 비슷하면 "비슷"', () => {
    expect(fmtDelta({ tone: 'good', delta: -1.8, unit: '타' })).toBe('▼1.8타');
    expect(fmtDelta({ tone: 'bad', delta: 5, unit: '%' })).toBe('▲5%');
    expect(fmtDelta({ tone: 'flat', delta: 0.4, unit: '개' })).toBe('비슷');
  });

  it('파 대비 표기', () => {
    expect([signedDiff(5), signedDiff(0), signedDiff(-2)]).toEqual(['+5', 'E', '-2']);
  });
});

describe('reportImageFileName', () => {
  it('코스 이름과 날짜로 만들고 파일에 못 쓰는 글자는 _ 로', () => {
    expect(reportImageFileName({ courseName: '남서울 CC/동', date: new Date(2026, 9, 3, 12).toISOString() })).toBe('birdie-buddy-남서울_CC_동-2026-10-03.png');
  });

  it('날짜를 읽을 수 없어도 이름을 만든다', () => {
    expect(reportImageFileName({ courseName: 'A', date: 'x' })).toBe('birdie-buddy-A-round.png');
  });
});

describe('buildReportImageModel', () => {
  const history = [1, 2, 3, 4].map((i) => makeFullRound(i));
  const round = makeFullRound(8);

  it('카드의 숫자·문장을 이미지용으로 옮긴다', () => {
    const card = buildRoundCard(round, history);
    const m = buildReportImageModel(card);
    expect(m).toMatchObject({ title: card.courseName, kind: '18홀', score: card.score, par: card.par, headline: card.headline, empty: false });
    expect(m.diffText).toBe(signedDiff(card.diff));
    expect(m.dateText).toMatch(/^\d{4}년 \d{1,2}월 \d{1,2}일$/);
    expect(m.compareTitle).toMatch(/^내 최근 4라운드 평균 대비$/);
    expect(m.compare.length).toBeGreaterThan(0);
    expect(m.strengths.length).toBeLessThanOrEqual(3);
    expect(m.issues.length).toBeLessThanOrEqual(3);
  });

  it('비교가 없으면 비교 칸은 비어 있다', () => {
    const m = buildReportImageModel(buildRoundCard(round, []));
    expect(m.compareTitle).toBeNull();
    expect(m.compare).toEqual([]);
  });

it('개인 기록은 한 줄 문구로 옮기고, 없으면 빈 목록', () => {
    const card = buildRoundCard(round, history);
    expect(buildReportImageModel(card).records).toEqual([]);
    const rec = { id: 'score', label: '베스트 스코어', value: 74, previous: 76, unit: '타' };
    expect(buildReportImageModel(card, { records: [rec] }).records).toEqual(['베스트 스코어 74타 (이전 76타)']);
  });

  it('9홀 라운드는 9홀로 표시하고 후반 타수가 없다', () => {
    const m = buildReportImageModel(buildRoundCard(makeNineRound(3, 'in'), []));
    expect(m.kind).toBe('9홀');
    expect(m.back).toBeNull();
  });

  it('홀 번호가 있는 항목은 문장 끝에 붙인다', () => {
    const card = { ...buildRoundCard(round, []), strengths: [{ id: 'a', title: '버디', hole: 7 }, { id: 'b', title: '파 세이브', hole: null }], issues: [] };
    expect(buildReportImageModel(card).strengths).toEqual(['버디 (7번 홀)', '파 세이브']);
  });
});
