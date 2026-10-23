import { describe, it, expect } from 'vitest';
import { buildCourseHistory, courseKey, plannedHoles, HARD_HOLES_SHOWN, RECENT_SHOWN, MEMOS_SHOWN } from './courseHistory.js';
import { makeFullRound, makeNineRound, makeMultiRound, played } from '../test/fixtures.js';

const ME = '테스터';

// i번째 라운드 (2026-01-i) — 같은 코스. over: 홀마다 파 + over (숫자 또는 홀별 배열)
const mk = (i, over = 0, extra = {}) => {
  const r = makeFullRound(i, ME, { id: `c${String(i).padStart(2, '0')}`, courseName: '남서울CC', outCourseName: 'OUT', inCourseName: 'IN', date: new Date(2026, 0, i, 12).toISOString(), ...extra });
  r.holes.forEach((h, idx) => { h.scores[ME] = played(h.par, { strokes: h.par + (Array.isArray(over) ? over[idx] : over), putts: 2 }); });
  return r;
};
const base = { courseName: '남서울CC', outName: 'OUT', inName: 'IN', nine: null, userName: ME };

describe('courseKey', () => {
  it('공백 · 대소문자를 무시한다', () => {
    expect(courseKey(' 남서울 CC ')).toBe('남서울cc');
    expect(courseKey(undefined)).toBe('');
  });
});

describe('plannedHoles', () => {
  it('18홀: OUT 1~9, IN 10~18 (번호는 이번 라운드 번호)', () => {
    const p = plannedHoles({ nine: null, outName: 'A', inName: 'B' });
    expect(p).toHaveLength(18);
    expect(p[0]).toEqual({ key: 'a#1', holeNumber: 1 });
    expect(p[9]).toEqual({ key: 'b#1', holeNumber: 10 });
  });

  it('9홀: 고른 쪽 9개, 번호는 항상 1~9', () => {
    expect(plannedHoles({ nine: 'in', outName: 'A', inName: 'B' }).map((x) => x.holeNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(plannedHoles({ nine: 'in', outName: 'A', inName: 'B' })[0].key).toBe('b#1');
  });

  it('코스 이름을 비웠으면 OUT · IN', () => {
    expect(plannedHoles({ nine: null, outName: '', inName: ' ' })[0].key).toBe('out#1');
    expect(plannedHoles({ nine: null, outName: '', inName: ' ' })[9].key).toBe('in#1');
  });
});

describe('buildCourseHistory', () => {
  it('코스 이름이 비었거나 친 기록이 없으면 null', () => {
    expect(buildCourseHistory([mk(1)], { ...base, courseName: '' })).toBeNull();
    expect(buildCourseHistory([mk(1)], { ...base, courseName: '다른CC' })).toBeNull();
    expect(buildCourseHistory([], base)).toBeNull();
  });

  it('이름이 같으면 공백 · 대소문자가 달라도 같은 코스', () => {
    expect(buildCourseHistory([mk(1)], { ...base, courseName: '  남서울 cc' }).count).toBe(1);
  });

  it('최근 3개 라운드(최근 것이 앞)와 총 횟수', () => {
    const rounds = [1, 2, 3, 4, 5].map((i) => mk(i, i % 2));
    const h = buildCourseHistory(rounds, base);
    expect(h.count).toBe(5);
    expect(h.recent.map((r) => r.id)).toEqual(['c05', 'c04', 'c03']);
    expect(h.recent).toHaveLength(RECENT_SHOWN);
    expect(h.recent[0]).toMatchObject({ total: 72 + 18, diff: 18, nine: false });
  });

  it('베스트는 18홀 라운드 중에서만 — 9홀 점수는 넣지 않는다', () => {
    const nine = makeNineRound(2, 'out', ME, { courseName: '남서울CC', id: 'nine1', date: new Date(2026, 0, 20, 12).toISOString() });
    const h = buildCourseHistory([mk(1, 1), mk(2, 0), nine], base);
    expect(h.best).toMatchObject({ id: 'c02', total: 72 });
    expect(h.recent.find((r) => r.id === 'nine1').nine).toBe(true);
    expect(buildCourseHistory([nine], base).best).toBeNull();
  });

  it('끝나지 않은 라운드는 세지 않는다', () => {
    expect(buildCourseHistory([{ ...mk(1), completed: false }], base)).toBeNull();
  });

  it('동반자와 함께 친 라운드는 내 점수로 센다', () => {
    const multi = makeMultiRound(1);
    multi.courseName = '남서울CC';
    const h = buildCourseHistory([multi], base);
    expect(h.count).toBe(1);
    const mine = multi.holes.reduce((s, x) => s + x.scores[ME].strokes, 0);
    expect(h.recent[0].total).toBe(mine);
  });

  describe('어려웠던 홀', () => {
    // 모든 라운드에서 4번 홀은 +2, 9번 홀은 +1, 나머지 파
    const hard = (i) => mk(i, (() => { const o = Array(18).fill(0); o[3] = 2; o[8] = 1; o[11] = 3; return o; })());

    it('평균이 파보다 높은 순으로 최대 3개 — 번호 · 파 · 평균 · 쳐 본 횟수', () => {
      const h = buildCourseHistory([hard(1), hard(2), hard(3)], base);
      expect(h.hardest.map((x) => x.holeNumber)).toEqual([12, 4, 9]);
      expect(h.hardest[0]).toMatchObject({ holeNumber: 12, avgDiff: 3, n: 3 });
      expect(h.hardest[1]).toMatchObject({ holeNumber: 4, avgDiff: 2, par: 5 });
      expect(h.hardest.length).toBeLessThanOrEqual(HARD_HOLES_SHOWN);
    });

    it('한 번만 쳐 본 홀이나 평균이 +0.5 미만인 홀은 꼽지 않는다', () => {
      expect(buildCourseHistory([hard(1)], base).hardest).toEqual([]);                 // 한 번뿐
      const mild = (n) => Array.from({ length: n }, (_, k) => mk(k + 1, (() => { const o = Array(18).fill(0); o[0] = k === 0 ? 1 : 0; return o; })()));
      expect(buildCourseHistory(mild(3), base).hardest).toEqual([]);                   // 평균 +0.33 → 어렵다고 보지 않는다
      expect(buildCourseHistory(mild(2), base).hardest.map((x) => x.holeNumber)).toEqual([1]);   // 평균 +0.5 는 경계 — 포함
    });

    it('입력하지 않은 홀은 세지 않는다', () => {
      const rounds = [1, 2].map((i) => { const r = hard(i); r.holes[3].scores[ME] = { ...r.holes[3].scores[ME], touched: false, strokes: 5 }; return r; });
      expect(buildCourseHistory(rounds, base).hardest.map((x) => x.holeNumber)).not.toContain(4);
    });

    it('다른 9홀 조합의 기록은 섞지 않는다 (27홀 골프장)', () => {
      const eastWest = [1, 2].map((i) => hard(i));
      eastWest.forEach((r) => { r.outCourseName = '이스트'; r.inCourseName = '웨스트'; });
      // 이번엔 이스트 + 사우스 — 4번(이스트)은 같고 12번(웨스트→사우스 3번)은 다르다
      const h = buildCourseHistory(eastWest, { ...base, outName: '이스트', inName: '사우스' });
      expect(h.hardest.map((x) => x.holeNumber)).toEqual([4, 9]);
      const same = buildCourseHistory(eastWest, { ...base, outName: '이스트', inName: '웨스트' });
      expect(same.hardest.map((x) => x.holeNumber)).toEqual([12, 4, 9]);
    });

    it('9홀로 칠 때는 그 9홀의 기록만 보고, 번호는 1~9 로 부른다', () => {
      const rounds = [1, 2].map((i) => hard(i));
      const inOnly = buildCourseHistory(rounds, { ...base, nine: 'in' });
      expect(inOnly.hardest.map((x) => x.holeNumber)).toEqual([3]);                    // 18홀의 12번 = IN 코스 3번째 홀
      const outOnly = buildCourseHistory(rounds, { ...base, nine: 'out' });
      expect(outOnly.hardest.map((x) => x.holeNumber)).toEqual([4, 9]);
    });

    it('예전에 9홀로 친 후반 기록도 같은 홀로 합쳐진다 (홀 번호 1~9 → IN 코스 같은 홀)', () => {
      const nineIn = (i, d) => { const r = makeNineRound(i, 'in', ME, { courseName: '남서울CC', id: `ni${i}`, date: new Date(2026, 0, i + 10, 12).toISOString() }); r.holes.forEach((h) => { h.scores[ME] = played(h.par, { strokes: h.par + (h.holeNumber === 3 ? d : 0) }); }); return r; };
      const h = buildCourseHistory([nineIn(1, 2), nineIn(2, 2)], { ...base, nine: null });
      expect(h.hardest.map((x) => x.holeNumber)).toEqual([12]);                         // IN 3번째 = 18홀 라운드의 12번
    });
  });

  describe('홀 메모', () => {
    const withMemo = (i, hole, text) => { const r = mk(i); r.holes[hole].scores[ME] = { ...r.holes[hole].scores[ME], memo: text }; return r; };

    it('최근 것부터 최대 3개, 이번 라운드의 홀 번호로', () => {
      const rounds = [withMemo(1, 6, '왼쪽 OB'), withMemo(2, 6, '핀은 앞쪽'), withMemo(3, 12, '바람 주의'), withMemo(4, 0, '티박스 앞'), mk(5)];
      const h = buildCourseHistory(rounds, base);
      expect(h.memos.map((m) => m.text)).toEqual(['티박스 앞', '바람 주의', '핀은 앞쪽']);
      expect(h.memos.map((m) => m.holeNumber)).toEqual([1, 13, 7]);
      expect(h.memos).toHaveLength(MEMOS_SHOWN);
    });

    it('공백뿐인 메모는 무시한다', () => {
      expect(buildCourseHistory([withMemo(1, 2, '   ')], base).memos).toEqual([]);
    });

    it('다른 9홀 조합의 메모는 보이지 않는다', () => {
      const r = withMemo(1, 12, '웨스트 3번 메모'); r.inCourseName = '웨스트';
      expect(buildCourseHistory([r], { ...base, inName: '사우스' }).memos).toEqual([]);
    });
  });
});
