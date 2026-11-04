// @vitest-environment jsdom
// 스코어 상세 입력 — 파3 · 파5 홀 흐름, 라운드 수정(파 바꾸기). 방식은 test/flowKit.jsx 머리말 참고.
import { describe, it, expect, vi } from 'vitest';
import { one, find, tap, tapTab, area, currentTab, tabInfo, openPutts, scoreNow, holeHeader, stored, looksOn, text, newHole, setPar, setDistance, installHooks } from './test/flowKit.jsx';

vi.setConfig({ testTimeout: 40000 });
installHooks();

describe('라운드 수정 — 파 바꾸기', () => {
  it('연필 → 파 칸을 눌러 1번 홀을 파3 으로, 2번 홀을 파5 로 바꾸고 저장하면 홀 머리글이 바뀐다', async () => {
    await newHole();
    expect(holeHeader()).toEqual({ hole: 1, par: 4 });
    await setPar(0, 3);
    expect(holeHeader()).toEqual({ hole: 1, par: 3 });
    expect((await stored(0)).round.pars.slice(0, 2)).toEqual([3, 4]);
    await setPar(1, 5);
    expect((await stored(0)).round.pars.slice(0, 2)).toEqual([3, 5]);
    expect(text()).toMatch(/PAR 3 5 4 4/);                            // 홀 표의 파 줄
  });
});

describe('파3 홀', () => {
  const startPar3 = async () => { await newHole(); await setPar(0, 3); };

  it('파3 은 티샷 탭에 핀 위치 · 거리 · 클럽 · 구질 · GIR 이 차례로 있고, 클럽을 골라야 GIR 이 나온다', async () => {
    await startPar3();
    expect(area('pin-position')).toBeTruthy();
    expect(text()).toContain('거리');
    expect(text()).not.toContain('GIR');                               // 클럽 전에는 GIR 칸이 없다
    await tap('IRON'); await tap('7I');
    expect(text()).toContain('GIR');
    expect(text()).not.toContain('FAIRWAY HIT');                        // 파3 에는 페어웨이가 없다
    // 파3 은 티샷 결과(GIR)까지 눌러야 다음 탭이 열리고, 무엇이 남았는지 화면이 알려 준다
    expect(tabInfo()['필드샷'].disabled).toBe(true);
    expect(text()).toContain('남은 항목: GIR 성공/실패');
    await tap(find('실패')[0]);
    expect(tabInfo()['티샷'].done).toBe(true);
  });

  it('GIR 성공 → 퍼팅 탭, PUTT 1 이 열려 있다. 다시 필드샷 탭을 보면 비어 있고 GIR 칩은 초록으로 남는다', async () => {
    await startPar3();
    await tap('IRON'); await tap('7I');
    await setDistance(area('pin-position').nextElementSibling, 150);
    await tap(find('성공')[0]);
    expect(currentTab()).toBe('퍼팅');
    expect(openPutts()).toEqual([1]);
    expect(tabInfo()['필드샷'].done).toBe(true);
    await tapTab('tee');
    expect(looksOn(find('성공')[0])).toBe(true);
  });

  it('GIR 실패 → 필드샷 탭이 열리고, 놓친 방향을 고를 수 있으며, 온그린 성공을 누르면 퍼팅으로 간다', async () => {
    await startPar3();
    await tap('IRON'); await tap('7I');
    await tap(find('실패')[0]);
    expect(currentTab()).toBe('필드샷');
    expect(text()).toContain('놓친 방향');
    await tap('숏');
    expect(looksOn(one('숏'))).toBe(true);
    await tap('숏');                                                  // 같은 칩을 다시 누르면 해제
    expect(looksOn(one('숏'))).toBe(false);
    await tap('라이트');
    expect(looksOn(one('라이트'))).toBe(true);
    await tap(area('second-result-on'));
    expect(currentTab()).toBe('퍼팅');
    expect(openPutts()).toEqual([1]);
  });

  it('홀인원 버튼을 누르면 홀인 연출이 나오고, 취소하면 그대로 돌아온다', async () => {
    await startPar3();
    await tap('IRON'); await tap('7I');
    await tap('홀인원');
    expect(text()).toContain('홀인 성공');
    expect(text()).toContain('취소 (잘못 눌렀어요)');
    await tap('취소 (잘못 눌렀어요)');
    expect(text()).not.toContain('취소 (잘못 눌렀어요)');
    expect(holeHeader()).toEqual({ hole: 1, par: 3 });                 // 다음 홀로 넘어가지 않았다
    expect((await stored(0)).s.confirmed).not.toBe(true);
  });
});

describe('파5 홀', () => {
  const startPar5 = async () => { await newHole(); await setPar(0, 5); };

  it('파5 세컨샷 결과 칸의 이름은 GIR 이 아니라 2온이다', async () => {
    await startPar5();
    await tap('DRIVER');
    await tapTab('field');
    const row = area('second-result');
    expect(row.textContent).toContain('2온');
    expect(row.textContent).not.toContain('GIR');
  });

  it('티샷 → 세컨샷 레이업(실패) → 써드샷이 열리고 → 써드샷 성공 → 퍼팅. 홀 점수는 5타 + 퍼팅', async () => {
    await startPar5();
    await tap('DRIVER'); await tap('O');
    await tapTab('field');
    await tap('IRON'); await tap('7I');
    await tap(area('second-result-miss'));                              // 2온 실패 = 레이업
    expect(text()).toContain('써드샷');
    expect(looksOn(area('second-result-miss'))).toBe(true);
    // 써드샷 입력: 클럽 · 성공
    await tap('WEDGE');
    await tap('56°');
    const third = find('성공');
    await tap(third[third.length - 1]);                                 // 써드샷의 온그린 성공
    expect(currentTab()).toBe('퍼팅');
    expect(openPutts()).toEqual([1]);
    expect(scoreNow().n === null ? scoreNow().pending : scoreNow().n).toBe(3);   // 티·세컨·써드 = 온그린까지 3타 (퍼팅 전)
  });

  it('2온 성공이면 써드샷 없이 바로 퍼팅이다', async () => {
    await startPar5();
    await tap('DRIVER');
    await tapTab('field');
    await tap(area('second-result-on'));
    expect(currentTab()).toBe('퍼팅');
    expect(text()).not.toContain('써드샷');
    expect(openPutts()).toEqual([1]);
  });
});
