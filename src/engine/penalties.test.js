import { describe, it, expect } from 'vitest';
import {
  strokeNumberOf, phantomStrokes, shotTitle, penaltyModeLabel, penaltyResultText, penaltyReasonLabel, asksReason, PENALTY_REASONS,
} from './penalties.js';

const score = (penalties, ob = 0) => ({ penalties, ob, hazard: 0, unplayable: 0 });

describe('OB 로 센 타수 — 방식마다 다음 샷이 몇 번째 샷인가', () => {
  it('세컨샷 OB, 스트로크와 거리(1벌타 + 제자리에서 다시 치기): 3번째가 벌타, 다시 친 샷이 4번째', () => {
    const s = score([{ slot: 1, type: 'ob', mode: 'replay' }], 1);
    expect(strokeNumberOf(s, 2)).toBe(4);
    expect(phantomStrokes(s)).toBe(0);                              // 다시 친 샷이 기록되므로 따로 세지 않는다
    expect(shotTitle(s, 2)).toBe('4번째 샷 · 다시 친 샷');
  });

  it('세컨샷 OB, OB티(2벌타 상당): 다음 샷이 5번째', () => {
    const s = score([{ slot: 1, type: 'ob', mode: 'forward' }], 1);
    expect(strokeNumberOf(s, 2)).toBe(5);
    expect(phantomStrokes(s)).toBe(1);
  });

  it('티샷 OB: 다시 치기는 3번째 샷, OB티는 4번째 샷', () => {
    expect(strokeNumberOf(score([{ slot: 0, type: 'ob', mode: 'replay' }], 1), 1)).toBe(3);
    expect(strokeNumberOf(score([{ slot: 0, type: 'ob', mode: 'forward' }], 1), 1)).toBe(4);
  });
});

describe('벌타 이유 — 거리 미스 · 방향 미스 · 생크', () => {
  it('OB · 해저드만 이유를 묻고 언플레이어블은 묻지 않는다', () => {
    expect(asksReason('ob')).toBe(true);
    expect(asksReason('hazard')).toBe(true);
    expect(asksReason('unplayable')).toBe(false);
  });

  it('이유 이름은 세 가지', () => {
    expect(PENALTY_REASONS.map((r) => r.label)).toEqual(['거리 미스', '방향 미스', '생크']);
    expect(penaltyReasonLabel({ reason: 'shank' })).toBe('생크');
    expect(penaltyReasonLabel({ reason: '모르는 값' })).toBeNull();
    expect(penaltyReasonLabel({})).toBeNull();
  });

  it('복기·칩에 쓰는 문장에 방식과 이유가 이어서 붙고, 이유가 없으면 예전 문장 그대로다', () => {
    expect(penaltyResultText({ type: 'ob', mode: 'replay', reason: 'direction' }, 1)).toBe('OB · 다시 치기 · 방향 미스');
    expect(penaltyResultText({ type: 'ob', mode: 'replay' }, 1)).toBe('OB · 다시 치기');
    expect(penaltyResultText({ type: 'ob', mode: 'forward' }, 0)).toBe('OB · OB티');
    expect(penaltyResultText({ type: 'hazard', mode: 'back', reason: 'distance' }, 1)).toBe('해저드 · 후방 드롭 · 거리 미스');
    expect(penaltyModeLabel({ type: 'ob', mode: 'replay' })).toBe('다시 치기');
  });
});
