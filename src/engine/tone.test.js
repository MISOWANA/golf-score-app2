// 문구 톤 — 앱은 "~해요/~예요" 체다. 규칙 엔진의 문장만 "~합니다"로 남아 있던 것을 되돌리지 않게 한다.
import { describe, it, expect } from 'vitest';
import { HOLE_RULES } from './rules/holeRules.js';
import { ROUND_RULES } from './rules/roundRules.js';
import { PRACTICE } from './roundStory.js';

const FORMAL = /(습니다|합니다|입니다|됩니다|드립니다|십시오|니까)(?![가-힣])/;
const textsOf = (rule) => [rule.result?.title, rule.result?.summaryTemplate, rule.result?.recommendationTemplate].filter((t) => typeof t === 'string');

describe('규칙 엔진 문장은 해요체다', () => {
  it('홀 규칙 · 라운드 규칙의 제목 · 요약 · 조언에 "~합니다" 체가 없다', () => {
    const bad = [];
    [...HOLE_RULES, ...ROUND_RULES].forEach((r) => textsOf(r).forEach((t) => { if (FORMAL.test(t)) bad.push(`${r.id ?? r.title}: ${t}`); }));
    expect(bad).toEqual([]);
  });

  it('연습 처방 문장도 마찬가지다', () => {
    Object.values(PRACTICE).forEach((c) => [c.title, c.drill, c.target].forEach((t) => expect(t).not.toMatch(FORMAL)));
  });

  it('규칙이 비어 있지 않다 (위 검사가 빈 배열로 통과하지 않게)', () => {
    expect(HOLE_RULES.length).toBeGreaterThan(20);
    expect(ROUND_RULES.length).toBeGreaterThan(20);
    expect([...HOLE_RULES, ...ROUND_RULES].every((r) => textsOf(r).length >= 2)).toBe(true);
  });
});
