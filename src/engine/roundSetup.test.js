import { describe, it, expect } from 'vitest';
import { setupBlockers } from './roundSetup.js';

const ok = { courseName: '남서울CC', players: ['홍길동'], teeBox: '화이트티' };

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

  it('여러 가지가 비면 모두 알려 준다', () => {
    expect(setupBlockers({ courseName: '', players: [''], teeBox: null })).toHaveLength(3);
  });
});
