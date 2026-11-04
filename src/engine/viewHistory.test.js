import { describe, it, expect } from 'vitest';
import { planNav, resolvePop, MAX_DEPTH } from './viewHistory.js';

describe('planNav — 화면 이동과 뒤로가기 기록', () => {
  it('홈에서 다른 화면으로 가면 기록을 쌓는다 (뒤로가기 → 홈)', () => {
    for (const next of ['stats', 'history', 'insights', 'mybag', 'settings', 'setup', 'scoring']) {
      expect(planNav('home', next, 0)).toEqual({ op: 'push', depth: 1 });
    }
  });

  it('아래 메뉴로 화면을 옮겨 다녀도 기록이 쌓이지 않는다', () => {
    expect(planNav('stats', 'insights', 1)).toEqual({ op: 'replace', depth: 1 });
    expect(planNav('insights', 'mybag', 1)).toEqual({ op: 'replace', depth: 1 });
    expect(planNav('settings', 'history', 1)).toEqual({ op: 'replace', depth: 1 });
  });

  it('메뉴에서 홈으로 가면 쌓인 기록을 되감는다 (홈 기록이 바닥)', () => {
    expect(planNav('stats', 'home', 1)).toEqual({ op: 'root', depth: 0, back: 1 });
    expect(planNav('analysis', 'home', 2)).toEqual({ op: 'root', depth: 0, back: 2 });
  });

  it('홈에서 홈으로는 기록을 바꿔치기만 한다', () => {
    expect(planNav('home', 'home', 0)).toEqual({ op: 'replace', depth: 0 });
    expect(planNav('login', 'home', 0)).toEqual({ op: 'replace', depth: 0 });
  });

  it('로그인 ↔ 홈은 기록을 남기지 않는다 (뒤로가기가 로그인 화면으로 돌아오지 않게)', () => {
    expect(planNav('login', 'home', 0)).toEqual({ op: 'replace', depth: 0 });
    expect(planNav('home', 'login', 0)).toEqual({ op: 'replace', depth: 0 });
    expect(planNav('stats', 'login', 1)).toEqual({ op: 'replace', depth: 0 });
  });

  it('라운드 설정 → 기록 → 리포트는 한 칸으로 이어진다 (뒤로가면 홈)', () => {
    let s = planNav('home', 'setup', 0);                    // 홈 → 설정 (쌓음)
    expect(s).toEqual({ op: 'push', depth: 1 });
    s = planNav('setup', 'scoring', s.depth);               // 설정 → 기록 (바꿔치기)
    expect(s).toEqual({ op: 'replace', depth: 1 });
    s = planNav('scoring', 'analysis', s.depth);            // 기록 → 리포트 (바꿔치기)
    expect(s).toEqual({ op: 'replace', depth: 1 });
  });

  it('진행 중인 라운드를 이어서 열면 홈 위에 한 칸 쌓는다', () => {
    expect(planNav('home', 'scoring', 0)).toEqual({ op: 'push', depth: 1 });
  });

  it('히스토리 → 리포트는 쌓아서 뒤로가기로 히스토리에 돌아온다', () => {
    expect(planNav('history', 'analysis', 1)).toEqual({ op: 'push', depth: 2 });
  });

  it(`깊이는 ${MAX_DEPTH}단계를 넘지 않는다`, () => {
    expect(planNav('analysis', 'history', MAX_DEPTH)).toEqual({ op: 'replace', depth: MAX_DEPTH });
    expect(planNav('history', 'analysis', MAX_DEPTH)).toEqual({ op: 'replace', depth: MAX_DEPTH });
  });

  it('같은 화면으로의 이동은 기록을 늘리지 않는다', () => {
    expect(planNav('stats', 'stats', 1)).toEqual({ op: 'replace', depth: 1 });
  });
});

describe('resolvePop — 뒤로가기로 돌아온 화면', () => {
  const ctx = { loggedIn: true, hasRound: true, hasSelected: true };

  it('그대로 갈 수 있으면 기록의 화면으로 간다', () => {
    expect(resolvePop('stats', ctx)).toBe('stats');
    expect(resolvePop('scoring', ctx)).toBe('scoring');
    expect(resolvePop('analysis', ctx)).toBe('analysis');
  });

  it('로그아웃한 뒤라면 어떤 기록이든 로그인으로', () => {
    expect(resolvePop('stats', { ...ctx, loggedIn: false })).toBe('login');
    expect(resolvePop('home', { ...ctx, loggedIn: false })).toBe('login');
  });

  it('로그인한 채 로그인 기록으로 돌아오면 홈으로', () => {
    expect(resolvePop('login', ctx)).toBe('home');
  });

  it('진행 중인 라운드가 없는데 기록 화면으로 돌아오면(앞으로가기) 홈으로', () => {
    expect(resolvePop('scoring', { ...ctx, hasRound: false })).toBe('home');
  });

  it('볼 라운드가 없는데 리포트로 돌아오면 홈으로', () => {
    expect(resolvePop('analysis', { ...ctx, hasSelected: false })).toBe('home');
  });
});
