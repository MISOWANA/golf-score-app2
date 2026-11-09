// 결과 화면 아래쪽 "짚어 볼 곳" — 위 요약 카드와 같은 말을 되풀이하지 않고, 같은 문제는 홀을 묶어 한 장으로 보인다.
import { describe, it, expect } from 'vitest';
import { buildCheckpoints, MAX_CHECKPOINTS } from './roundCheckpoints.js';
import { buildRoundCard } from './roundCard.js';
import { makeFullRound, played } from '../test/fixtures.js';

const ME = '테스터';

// 모든 홀을 파로 치고, 지정한 홀만 티샷을 페어웨이 밖(러프)으로 보낸 18홀
const withRough = (holeNumbers) => {
  const r = makeFullRound(1, ME);
  r.holes.forEach((h) => { h.scores[ME] = played(h.par, { strokes: h.par, putts: 2, gir: true, fairway: h.par > 3 ? true : null, fairwayHit: h.par > 3 ? 'C' : null }); });
  holeNumbers.forEach((n) => { const s = r.holes[n - 1].scores[ME]; s.fairway = false; s.fairwayHit = 'R'; });
  return r;
};
// 체크포인트들을 "요약 카드가 이미 말한 것"의 모양으로 — 홀 번호까지 적은 경우
const asSaid = (items) => items.flatMap((x) => (x.holes.length ? x.holes.map((hole) => ({ title: x.title, hole })) : [{ title: x.title, hole: null }]));

describe('buildCheckpoints', () => {
  const all = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => makeFullRound(i, ME));

  it('잘한 점은 빼고 짚어 볼 것(주의 · 위험)만 준다', () => {
    all.forEach((r) => {
      buildCheckpoints(r, ME).forEach((it2) => expect(['warning', 'critical']).toContain(it2.severity));
    });
  });

  it('같은 제목은 한 장으로 묶이고, 최대 개수를 넘기지 않는다', () => {
    all.forEach((r) => {
      const items = buildCheckpoints(r, ME);
      expect(items.length).toBeLessThanOrEqual(MAX_CHECKPOINTS);
      expect(new Set(items.map((x) => x.title)).size).toBe(items.length);
      items.forEach((x) => { expect([...x.holes]).toEqual([...x.holes].sort((a, b) => a - b)); });   // 홀 번호는 작은 것부터
    });
  });

  it('여러 홀에서 난 같은 문제는 홀 번호만 모아 한 장이 된다', () => {
    const items = buildCheckpoints(withRough([2, 5, 9]), ME);
    const rough = items.find((x) => x.holes.length > 1);
    expect(rough).toBeTruthy();
    expect(rough.holes).toEqual(expect.arrayContaining([2, 5, 9]));
    expect(items.filter((x) => x.title === rough.title)).toHaveLength(1);
  });

  it('요약 카드가 그 홀까지 말한 항목은 다시 보이지 않는다', () => {
    const r = withRough([2, 5, 9]);
    const items = buildCheckpoints(r, ME);
    expect(items.length).toBeGreaterThan(0);
    expect(buildCheckpoints(r, ME, asSaid(items))).toEqual([]);
  });

  it('요약 카드가 제목만 말하고 홀 번호가 없으면, 어느 홀인지는 여기서 알려 준다', () => {
    const r = withRough([2, 5, 9]);
    const items = buildCheckpoints(r, ME);
    const rough = items.find((x) => x.holes.length > 1);
    const again = buildCheckpoints(r, ME, [{ title: rough.title, hole: null }]);
    expect(again.find((x) => x.title === rough.title)?.holes).toEqual(rough.holes);   // 위 카드에 홀 번호가 없으니 그대로 남는다
  });

  it('요약 카드의 잘한 점 · 아쉬운 점과 같은 말(같은 제목·같은 홀)은 남지 않는다 (결과 화면 그대로)', () => {
    all.forEach((r) => {
      const card = buildRoundCard(r, []);
      const said = [...card.strengths, ...card.issues];
      buildCheckpoints(r, ME, said).forEach((x) => {
        said.filter((p) => p.title === x.title && p.hole != null).forEach((p) => {
          expect(x.holes, `${x.title} — 카드가 ${p.hole}번 홀까지 말했는데 또 나왔다`).not.toContain(p.hole);
        });
        // 라운드 전체 문제(홀 번호 없음)는 카드에 같은 제목이 있으면 남지 않는다
        if (x.holes.length === 0) expect(said.some((p) => p.title === x.title)).toBe(false);
      });
    });
  });
});
