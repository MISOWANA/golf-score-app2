import { describe, it, expect } from 'vitest';
import { setupBlockers } from './roundSetup.js';

const ok = { courseName: '남서울CC', players: ['홍길동'], teeBox: '화이트티', inputMode: 'simple' };

describe('setupBlockers — 라운드 시작이 막힌 이유', () => {
  it('모두 채웠으면 막힌 이유가 없다', () => {
    expect(setupBlockers(ok)).toEqual([]);
  });

  it('OUT·IN 코스 이름은 필수가 아니다 (비우면 OUT·IN 으로 저장된다)', () => {
    expect(setupBlockers({ ...ok, outCourseName: '', inCourseName: '' })).toEqual([]);
  });

  it('골프장 이름이 비면 알려 준다', () => {
    expect(setupBlockers({ ...ok, courseName: '  ' })).toEqual(['골프장 이름을 입력해 주세요']);
  });

  it('TEE BOX 를 안 골랐으면 알려 준다', () => {
    expect(setupBlockers({ ...ok, teeBox: null })).toEqual(['TEE BOX를 선택해 주세요']);
  });

  it('이름이 빈 플레이어가 있으면 알려 준다', () => {
    expect(setupBlockers({ ...ok, players: ['홍길동', ' '] })).toEqual(['플레이어 이름을 모두 입력해 주세요']);
  });

  it('같은 이름의 플레이어(대소문자·공백 무시)를 알려 준다', () => {
    expect(setupBlockers({ ...ok, players: ['Tiger', ' tiger '] })).toEqual(['플레이어 이름이 겹쳐요 (예: 철수A, 철수B)']);
  });

  it('여러 가지가 비면 모두 알려 준다 (1인 라운드는 입력 모드까지)', () => {
    expect(setupBlockers({ courseName: '', players: [''], teeBox: null })).toHaveLength(4);
  });

  it('1인 라운드는 입력 모드를 골라야 시작된다 — 맨 아래(시작 버튼 바로 위) 구역이라 이유도 맨 뒤에 나온다', () => {
    expect(setupBlockers({ ...ok, inputMode: null })).toEqual(['입력 모드를 골라 주세요']);
    expect(setupBlockers({ ...ok, inputMode: undefined, teeBox: null })).toEqual(['TEE BOX를 선택해 주세요', '입력 모드를 골라 주세요']);
    expect(setupBlockers({ ...ok, inputMode: 'detailed' })).toEqual([]);
    expect(setupBlockers({ ...ok, inputMode: 'fast' })).toEqual(['입력 모드를 골라 주세요']);   // 모르는 값은 고르지 않은 것
  });

  it('동반자 라운드(2명 이상)는 입력 모드를 묻지 않는다 — 늘 간편 스코어다', () => {
    expect(setupBlockers({ ...ok, players: ['홍길동', '철수'], inputMode: null })).toEqual([]);
  });
});
