// @vitest-environment jsdom
// 스코어 입력의 기본 모습 — 스코어 · 퍼팅만 받고, 샷 기록(티샷부터)은 "샷 기록" 줄을 눌러야 열린다.
// (예전 상세 입력 흐름 테스트는 샷 기록을 열어 둔 채 시작한다 — test/flowKit.jsx 의 openApp)
// 방식은 test/flowKit.jsx 머리말 참고: 새 라운드 시작부터 사용자가 누르는 순서대로, 화면에 보이는 것을 확인한다.
import { describe, it, expect, vi } from 'vitest';
import { find, tap, area, text, stored, openApp, startRound, installHooks, waitForHole, scoreNow, puttsPicked, holeHeader } from './test/flowKit.jsx';

vi.setConfig({ testTimeout: 40000 });
installHooks();

const hasTabs = () => document.querySelectorAll('[role="tab"]').length > 0;
const pressed = (el) => el.getAttribute('aria-pressed') === 'true';
const shotPref = () => localStorage.getItem('bb-shot-detail');

describe('기본 모습 — 스코어와 퍼팅만', () => {
  it('새 라운드를 시작하면 1번 홀 스코어 · 퍼팅 · 벌타 · 샷 기록 줄이 보이고, 샷 탭(티샷 · 필드샷 · 퍼팅)은 없다', async () => {
    await openApp({ shots: false });
    await startRound();
    expect(holeHeader()).toEqual({ hole: 1, par: 4 });
    expect(text()).toContain('스코어를 알려 주세요');
    expect(scoreNow().n).toBe(4);
    expect(area('score-minus')).toBeTruthy();
    expect(area('score-plus')).toBeTruthy();
    expect(puttsPicked()).toBe('2');
    expect(area('penalty-summary').textContent).toBe('없음');
    expect(area('shot-summary').textContent).toBe('티샷부터');
    expect(hasTabs()).toBe(false);
    expect(area('shot-hint').textContent).toMatch(/티샷부터/);       // 샷 기록으로 이끄는 한 줄 안내
    expect(text()).not.toContain('티샷 지점');
  });

  it('+ · 버디/파/보기/더블 이상 버튼으로 스코어를 정하면 큰 숫자와 이름이 따라 바뀌고 저장된다', async () => {
    await openApp({ shots: false });
    await startRound();
    await tap(area('score-plus'));
    expect(scoreNow().n).toBe(5);
    expect(area('score-name').textContent).toBe('보기');
    await tap(find('버디')[0]);
    expect(scoreNow().n).toBe(3);
    expect(area('score-name').textContent).toBe('버디');
    expect(pressed(find('버디')[0])).toBe(true);
    expect(pressed(find('파')[0])).toBe(false);
    await tap(find('더블 이상')[0]);
    expect(scoreNow().n).toBe(6);
    expect(area('score-name').textContent).toBe('더블 보기');
    expect((await stored()).s).toMatchObject({ strokes: 6, touched: true });
  });

  it('퍼팅 수를 누르면 하나만 눌린 모양이고 저장된다. 스코어가 낮으면 큰 퍼팅 수는 눌리지 않는다', async () => {
    await openApp({ shots: false });
    await startRound();
    await tap(area('putts-3'));
    expect(puttsPicked()).toBe('3');
    expect((await stored()).s.putts).toBe(3);
    await tap(area('putts-1'));
    expect(puttsPicked()).toBe('1');
    for (let i = 0; i < 3; i++) await tap(area('score-minus'));   // 4 → 1타 (홀인원)
    expect(scoreNow().n).toBe(1);
    expect(area('putts-1').disabled).toBe(true);                     // 1타에 퍼팅 1개는 없다
    expect(area('putts-2').disabled).toBe(true);
  });

  it('벌타 줄을 누르면 해저드 · OB · 언플레이어블 칸이 열리고, OB 를 넣으면 스코어가 +2 되며 줄에 요약이 보인다', async () => {
    await openApp({ shots: false });
    await startRound();
    expect(area('penalty-panel')).toBeNull();
    await tap(area('penalty-toggle'));
    expect(area('penalty-panel')).toBeTruthy();
    await tap(area('penalty-OB').querySelectorAll('button')[1]);
    expect(scoreNow().n).toBe(6);
    expect(area('penalty-summary').textContent).toContain('OB 1');
    await tap(find('초기화').filter((b) => area('penalty-panel').contains(b))[0]);
    expect(scoreNow().n).toBe(4);
    expect(area('penalty-summary').textContent).toBe('없음');
    expect((await stored()).s).toMatchObject({ ob: 0, hazard: 0, unplayable: 0 });
  });

  it('샷 기록 없이 한 홀을 입력하고 "다음 홀"을 누르면 묻지 않고 다음 홀로 간다 (샷 정보는 샷 기록을 쓴 홀에서만 챙긴다)', async () => {
    await openApp({ shots: false });
    await startRound();
    await tap(area('score-plus'));            // 5타
    await tap(area('putts-2'));
    await tap(area('next-hole'));
    await waitForHole(2);
    expect(text()).not.toContain('샷 정보가 비어 있어요');
    const s = await stored(0);
    expect(s.s).toMatchObject({ strokes: 5, putts: 2, confirmed: true });
    expect(s.s.teeClub ?? null).toBeNull();
    expect(area('progress-count').textContent).toBe('1/18홀');
    expect(area('running-total').textContent).toBe('5(+1)');   // 맨 위 전체 스코어 카드
  });
});

describe('샷 기록 — 눌러서 티샷부터', () => {
  it('"샷 기록" 줄을 누르면 티샷 탭이 열려 있고 티샷부터 입력한다. 안내 문구는 사라지고 줄에는 "접기"가 보인다', async () => {
    await openApp({ shots: false });
    await startRound();
    await tap(area('shot-toggle'));
    expect(hasTabs()).toBe(true);
    expect([...document.querySelectorAll('[role="tab"]')].find((t) => t.getAttribute('aria-selected') === 'true').textContent).toContain('티샷');
    expect(text()).toContain('티샷 지점');
    expect(find('DRIVER').length).toBeGreaterThan(0);                // 클럽부터 고른다
    expect(area('shot-summary').textContent).toBe('접기');
    expect(area('shot-hint')).toBeNull();
    expect(area('shot-toggle').getAttribute('aria-expanded')).toBe('true');
  });

  it('한 번 열면 다음 홀에서도 열려 있고(이 기기에 기억), 접으면 다시 접힌 채로 시작한다', async () => {
    await openApp({ shots: false });
    await startRound();
    expect(shotPref()).toBe('0');
    await tap(area('shot-toggle'));
    expect(shotPref()).toBe('1');
    await tap(area('score-plus')); await tap(area('putts-2'));
    await tap(area('next-hole'));
    await waitForHole(2);
    expect(hasTabs()).toBe(true);                                      // 2번 홀도 열려 있다
    await tap(area('shot-toggle'));                                    // 접는다
    expect(hasTabs()).toBe(false);
    expect(shotPref()).toBe('0');
    expect(area('shot-summary').textContent).toBe('티샷부터');
  });

  it('샷 기록이 있는 홀은 접을 수 없다 — 기록이 숨지 않고 "N샷 기록됨"으로 보인다. 기록이 없는 홀은 접힌 채다', async () => {
    await openApp({ shots: false });
    await startRound();
    await tap(area('shot-toggle'));
    await tap('DRIVER');                                               // 1번 홀에 티샷 기록
    expect(area('shot-summary').textContent).toBe('1샷 기록됨');
    await tap(area('putts-2'));
    await tap(area('next-hole'));
    expect(text()).toContain('샷 정보가 비어 있어요');                // 샷 기록을 쓴 홀은 빠진 라이 · 지형 · 거리를 한 번 짚어 준다
    await tap(find('그대로 다음 홀')[0]);
    await waitForHole(2);
    await tap(area('shot-toggle'));                                    // 2번 홀은 기록이 없으니 접는다
    expect(hasTabs()).toBe(false);
    await tap(area('prev-hole'));
    await waitForHole(1);
    expect(hasTabs()).toBe(true);                                      // 1번 홀은 기록이 있어 열려 있다
    expect(area('shot-summary').textContent).toBe('3샷 기록됨');          // 티샷 1 + 퍼트 2
  });

  it('샷 기록을 열어 둔 사람은 새 라운드를 시작해도 열린 채다 (기록해 둔 선택)', async () => {
    await openApp({ shots: true });
    await startRound();
    expect(hasTabs()).toBe(true);
    expect(area('shot-summary').textContent).toBe('접기');
  });
});
