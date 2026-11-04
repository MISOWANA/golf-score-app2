// @vitest-environment jsdom
// 스코어 상세 입력 — 잘못 눌렀을 때 · 탭을 오갈 때 · 홀을 다시 열 때 · 앱을 껐다 켰을 때의 흐름.
// 방식은 test/flowKit.jsx 머리말 참고.
import { describe, it, expect, vi } from 'vitest';
import { one, find, tap, tapTab, area, currentTab, tabInfo, puttCards, openPutts, scoreNow, holeHeader, stored, looksOn, on, text, newHole, setDistance, waitForHole, reopenApp, installHooks, buttons, labelOf } from './test/flowKit.jsx';

vi.setConfig({ testTimeout: 40000 });
installHooks();

const PREFS = [
  ['기본 설정', null],
  ['첫 퍼팅 기본 거리 6m', { unit: 'm', firstPutt: 6 }],
];

const toPutting = async (prefs = null) => {
  await newHole(prefs);
  await tap('DRIVER'); await tap('O');
  await tapTab('field');
  await tap('IRON'); await tap('7I');
  await setDistance(area('second-surface').parentElement, 150);
  await tap(area('second-lie-flat'));
  await tap(area('second-result-on'));
};
const goHole = (n) => tap(buttons().filter((b) => labelOf(b) !== '' && b.closest('[data-role="nav-score"]'))[n - 1], `${n}번 홀 칸`);

describe.each(PREFS)('잘못 눌렀을 때 — %s', (_n, prefs) => {
  it('PUTT 1 에서 홀인을 잘못 눌러 "취소 (잘못 눌렀어요)"하면 홀이 확정되지 않고 PUTT 1 이 다시 열려 있다', async () => {
    await toPutting(prefs);
    await tap(area('putt-primary'));
    expect(text()).toContain('취소 (잘못 눌렀어요)');                          // 홀인 연출 창
    await tap('취소 (잘못 눌렀어요)');
    expect(text()).not.toContain('취소 (잘못 눌렀어요)');
    expect(holeHeader().hole).toBe(1);
    expect(currentTab()).toBe('퍼팅');
    expect((await stored(0)).s.confirmed).not.toBe(true);
    expect(puttCards().length).toBeGreaterThan(0);
    expect(openPutts()).toEqual([1]);
    expect(area('putt-primary').textContent).toContain('홀인 성공');           // 다시 누를 수 있다
    await tap(area('putt-primary'));
    await waitForHole(2);                                                    // 이번에는 취소하지 않고 끝낸다
    expect((await stored(0)).s).toMatchObject({ putts: 1, confirmed: true });
  });

  it('PUTT 2 에서 홀인을 잘못 눌러 취소하면 PUTT 2 가 그대로 열려 있고, 1번째 퍼트의 "실패" 표시도 남는다', async () => {
    await toPutting(prefs);
    await tap(area('putt-next'));
    await tap(area('putt-primary'));
    await tap('취소 (잘못 눌렀어요)');
    expect(openPutts()).toEqual([2]);
    expect(puttCards().map((c) => c.n)).toEqual([1, 2]);
    expect((await stored(0)).s.puttDetails[0].holein).toBe('fail');
  });

  it('필드샷 탭에서 성공 → 실수였다며 실패로 고치면 써드샷이 열리고, 다시 성공으로 고치면 퍼팅 PUTT 1 이 열려 있다', async () => {
    await toPutting(prefs);
    expect(openPutts()).toEqual([1]);
    await tapTab('field');
    await tap(area('second-result-miss'));
    expect(text()).toContain('써드샷');
    await tapTab('putt');
    expect(puttCards().length).toBeGreaterThan(0);                           // 써드샷이 아직 안 끝났어도 퍼팅 탭은 열려 있다
    await tapTab('field');
    await tap(area('second-result-on'));
    expect(currentTab()).toBe('퍼팅');
    expect(openPutts()).toEqual([1]);
  });

  it('퍼팅 ↔ 필드샷 ↔ 티샷 탭을 오가도 펼친 카드와 입력한 값이 그대로다', async () => {
    await toPutting(prefs);
    await tap(area('putt-lie-uphill'));
    await setDistance(area('putt-cards'), 9);
    await tap(area('putt-next'));
    expect(openPutts()).toEqual([2]);
    await tapTab('field');
    await tapTab('tee');
    await tapTab('putt');
    expect(openPutts()).toEqual([2]);                                          // 탭을 오갔다고 카드가 되돌아가지 않는다
    expect(area('putt-summary').textContent).toMatch(/오르막/);
  });
});

describe('티샷을 건너뛰고 · 순서를 바꿔서 입력할 때', () => {
  it('필드샷을 건너뛰고 퍼팅 탭으로 가서 홀인해도 홀이 정상으로 끝난다 (티샷 1 + 기본 필드샷 + 퍼팅 1 = 3타)', async () => {
    await newHole();
    await tap('DRIVER'); await tap('O');
    await tapTab('putt');
    expect(openPutts()).toEqual([1]);
    await tap(area('putt-primary'));
    await waitForHole(2);
    expect((await stored(0)).s).toMatchObject({ putts: 1, confirmed: true });
    expect((await stored(0)).s.strokes).toBeGreaterThanOrEqual(2);
  });

  it('티샷 OB(다시 치기): 온그린까지 2타 → 3타, 다시 친 샷이 필드샷 자리에 오고, 그 샷이 그린에 못 올라가면 4번째 샷이 이어진다', async () => {
    await newHole();
    await tap('DRIVER');
    expect(scoreNow().pending).toBe(2);
    await tap(find('OB')[0]);
    await tap(find(/번째 샷/).find((b) => b.textContent.includes('스트로크와 거리')));
    expect(scoreNow().pending).toBe(3);                                       // 티샷 + 벌타 + 다시 친 샷
    expect(currentTab()).toBe('필드샷');                                       // 다음 샷을 입력하러 필드샷 탭이 열린다
    expect(text()).toMatch(/3번째 샷|다시 친 샷/);
    await tap('DRIVER');                                                       // 다시 친 샷은 드라이버일 수 있다
    await tap(area('second-result-miss'));                                     // 다시 친 샷도 그린에 못 올렸다
    expect(text()).toContain('4번째 샷');
    expect(scoreNow().pending).toBe(4);
  });

  it('티샷 OB(OB티)는 벌타 2타 상당이라 바로 온그린까지 4타가 되고, 다음 샷은 4번째 샷이다', async () => {
    await newHole();
    await tap('DRIVER');
    await tap(find('OB')[0]);
    await tap(find(/번째 샷/).find((b) => b.textContent.includes('OB티')));
    expect(scoreNow().pending).toBe(4);
    expect(text()).toContain('4번째 샷');
  });
});

describe('끝낸 홀을 다시 열어 고칠 때', () => {
  it('1번 홀을 끝내고 2번 홀에서 1번으로 돌아와 라이를 고친 뒤 "다음"을 누르면 확인 창 없이 2번 홀로 간다', async () => {
    await toPutting();
    await tap(area('putt-primary'));
    await waitForHole(2);
    await goHole(1);
    expect(currentTab()).toBe('퍼팅');
    await tap(area('putt-lie-flat'));
    await tap(one('다음'));
    expect(area('hole-check')).toBeNull();                                    // 이미 끝낸 홀은 다시 묻지 않는다
    expect(holeHeader().hole).toBe(2);
    expect((await stored(0)).s.puttDetails[0].lie).toBe('flat');
  });

  it('끝낸 홀의 스코어를 홀 표에서 보면 버디(3) · 퍼팅 1 이고 윗칸 누적 스코어에도 반영돼 있다', async () => {
    await toPutting();
    await tap(area('putt-primary'));
    await waitForHole(2);
    expect(text()).toMatch(/SCORE 3 - /);
    expect(text()).toMatch(/PUTT 1 - /);
    expect(text()).toMatch(/1 ?\/ ?18 holes/);
    expect(text()).toMatch(/SCORE 3/);
  });
});

describe('앱을 껐다 켜면 (이어서)', () => {
  it('필드샷 중에 앱이 꺼져도 다시 열면 같은 홀 필드샷 탭이 열리고 입력한 값이 그대로다', async () => {
    await newHole();
    await tap('DRIVER'); await tap('X');
    await tapTab('field');
    await tap('IRON'); await tap('7I');
    await setDistance(area('second-surface').parentElement, 140);
    await reopenApp();
    expect(holeHeader().hole).toBe(1);
    expect(currentTab()).toBe('필드샷');
    expect(on('second-surface-rough')).toBe(true);
    expect(looksOn(one('7I'))).toBe(true);
    expect(text()).toContain('140');
  });

  it('퍼팅 중에 앱이 꺼져도 다시 열면 퍼팅 탭이 열리고, 안 들어간 PUTT 1 은 접히고 PUTT 2 가 열려 있다', async () => {
    await toPutting();
    await tap(area('putt-lie-flat'));
    await tap(area('putt-next'));
    expect(openPutts()).toEqual([2]);
    await reopenApp();
    expect(currentTab()).toBe('퍼팅');
    expect(openPutts()).toEqual([2]);
    expect(puttCards().map((c) => c.n)).toEqual([1, 2]);
  });

  it('PUTT 1 에서 입력을 안 하고 꺼졌다 켜져도 PUTT 1 이 열려 있다 (첫 퍼팅 기본 거리가 있어도)', async () => {
    await toPutting({ unit: 'm', firstPutt: 6 });
    await reopenApp();
    expect(currentTab()).toBe('퍼팅');
    expect(openPutts()).toEqual([1]);
  });

  it('티샷만 하고 꺼졌다 켜져도 티샷 탭이 아니라 이어서 입력할 필드샷 탭이 열린다', async () => {
    await newHole();
    await tap('DRIVER');
    await reopenApp();
    expect(tabInfo()['티샷'].done).toBe(true);
    expect(['티샷', '필드샷']).toContain(currentTab());
  });
});
