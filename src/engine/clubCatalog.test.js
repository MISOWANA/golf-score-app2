import { describe, it, expect } from 'vitest';
import { sanitizeClubs } from './clubCatalog.js';

const iron7 = { id: 'iron7', name: '7i', type: 'Iron', carry: 135, total: 140 };

describe('sanitizeClubs (가져온 클럽 목록 검사)', () => {
  it('정상 항목은 그대로 둔다 — 퍼터(거리 없음)와 예전 형식(avg 만 있음)도', () => {
    const putter = { id: 'putter', name: 'Putter', type: 'Putter' };
    const legacy = { id: 'iron8', name: '8i', type: 'Iron', avg: 125 };
    expect(sanitizeClubs([iron7, putter, legacy])).toEqual([iron7, putter, legacy]);
  });

  it('배열이 아니면 빈 배열', () => {
    expect(sanitizeClubs(undefined)).toEqual([]);
    expect(sanitizeClubs({ 0: iron7 })).toEqual([]);
    expect(sanitizeClubs('iron7')).toEqual([]);
  });

  it('모양이 깨진 항목은 버린다', () => {
    const bad = [null, 7, 'x', [], {}, { ...iron7, id: '' }, { ...iron7, id: 3 }, { ...iron7, name: null }, { ...iron7, type: 'Spoon' }];
    expect(sanitizeClubs([...bad, iron7])).toEqual([iron7]);
  });

  it('거리가 숫자가 아니거나 무한이면 버린다', () => {
    expect(sanitizeClubs([{ ...iron7, carry: '135' }, { ...iron7, id: 'b', total: NaN }, { ...iron7, id: 'c', avg: Infinity }])).toEqual([]);
  });

  it('id 가 겹치면 먼저 나온 것만 남긴다', () => {
    expect(sanitizeClubs([iron7, { ...iron7, carry: 1 }])).toEqual([iron7]);
  });
});
