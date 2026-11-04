// @vitest-environment jsdom
// 스코어 상세 입력 — 퍼팅 탭(랜딩 휠 · 핀 위치 · 그린 스피드 · 퍼팅 카드 · 판 · 그린 밖)의 버튼들을 사용자 순서대로 눌러 본다.
// 모든 흐름은 필드샷 "성공"으로 퍼팅에 들어오는 실제 경로에서 시작하고, 첫 퍼팅 기본 거리 설정이 있는 사람/없는 사람 둘 다 돈다.
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, waitFor } from '@testing-library/react';
import { find, tap, tapTab, area, currentTab, puttCards, openPutts, puttsPicked, stored, on, text, newHole, setDistance, waitForHole, settle, installHooks } from './test/flowKit.jsx';

vi.setConfig({ testTimeout: 40000 });
installHooks();

const PREFS = [
  ['기본 설정', null],
  ['첫 퍼팅 기본 거리 6m', { unit: 'm', firstPutt: 6 }],
];

// 파4: 드라이버 → (페어웨이 O) → 필드샷 7I 성공 → 퍼팅 탭
const toPutting = async (prefs = null) => {
  await newHole(prefs);
  await tap('DRIVER'); await tap('O');
  await tapTab('field');
  await tap('IRON'); await tap('7I');
  await tap(area('second-result-on'));
  expect(currentTab()).toBe('퍼팅');
};
const card = () => area('putt-cards');
const board = () => area('putt-board');
const key = (k, n = 1) => { for (let i = 0; i < n; i++) fireEvent.keyDown(board(), { key: k }); };

describe.each(PREFS)('퍼팅 — 카드 열림 · 다음 퍼트 · 홀인 — %s', (_n, prefs) => {
  it('PUTT 1 에서 바로 홀인: 1퍼트로 홀이 끝나고(버디) 다음 홀 티샷이 열린다', async () => {
    await toPutting(prefs);
    expect(openPutts()).toEqual([1]);
    expect(area('putt-primary').textContent).toContain('홀인 성공');
    await tap(area('putt-primary'));
    expect(text()).toContain('홀인 성공');                                  // 홀인 연출
    expect(text()).toContain('1 펏');
    await waitForHole(2);
    expect(currentTab()).toBe('티샷');
    expect((await stored(0)).s).toMatchObject({ strokes: 3, putts: 1, confirmed: true });
  });

  it('3퍼트: PUTT 1 → 2 → 3 로 넘어가고 카드가 하나씩 늘며 매번 새로 넘어간 카드만 열려 있다. 마지막 홀인이면 5타·3퍼트', async () => {
    await toPutting(prefs);
    expect(puttCards().map((c) => c.n)).toEqual([1, 2]);
    await tap(area('putt-next'));
    expect(openPutts()).toEqual([2]);
    expect(puttCards().map((c) => c.n)).toEqual([1, 2]);
    await tap(area('putt-next'));                                           // PUTT 2 → PUTT 3
    expect(puttCards().map((c) => c.n)).toEqual([1, 2, 3]);
    expect(openPutts()).toEqual([3]);
    expect(area('putt-next').textContent).toContain('PUTT 4');
    await tap(area('putt-primary'));
    await waitForHole(2);
    expect((await stored(0)).s).toMatchObject({ strokes: 5, putts: 3, confirmed: true });
  });

  it('되돌리기: PUTT 2 에서 "↩ 되돌리기"를 누르면 PUTT 2 카드가 없어지고 PUTT 1 이 다시 열린다', async () => {
    await toPutting(prefs);
    await tap(area('putt-next'));
    expect(openPutts()).toEqual([2]);
    await tap(area('putt-undo'));
    expect(openPutts()).toEqual([1]);
    expect(puttCards().map((c) => c.n)).toEqual([1]);
    expect((await stored()).s.puttDetails[0].holein ?? null).toBeNull();      // 1번째 퍼트의 '실패' 표시도 풀린다
    expect(area('putt-undo')).toBeNull();                                      // PUTT 1 에는 되돌리기가 없다
  });

  it('머리글: 열린 카드를 누르면 접히고, 닫힌 카드를 누르면 그 카드만 열린다', async () => {
    await toPutting(prefs);
    const head = (n) => find(new RegExp(`^PUTT ${n}$`))[0];
    await tap(head(1));
    expect(openPutts()).toEqual([]);
    await tap(head(2));
    expect(openPutts()).toEqual([2]);
    await tap(head(1));
    expect(openPutts()).toEqual([1]);                                           // 하나를 열면 다른 하나는 닫힌다
  });

  it('라이를 고르고 거리를 넣은 PUTT 1 은 접으면 요약 한 줄이 남고, 다시 열어도 값이 그대로다', async () => {
    await toPutting(prefs);
    await tap(area('putt-lie-downhill'));
    await setDistance(card(), 12);
    await tap(find(/^PUTT 1$/)[0]);                                             // 접기
    expect(area('putt-summary').textContent).toMatch(/내리막/);
    await tap(find(/^PUTT 1$/)[0]);                                             // 다시 열기
    expect(on('putt-lie-downhill')).toBe(true);
    expect(card().querySelector('[data-role="dist-slider"]').value).toBe('12');
  });

  it('판에서 멈춘 곳을 찍으면 결과 버튼이 "PUTT 2 탭인 성공"으로 바뀌고 남은 거리가 보인다. 탭인 성공으로 끝내면 2퍼트', async () => {
    await toPutting(prefs);
    await setDistance(card(), 8);
    key('ArrowLeft', 2); key('ArrowDown', 1);                                    // 홀 근처(약 30cm)에 멈춘 위치
    await settle();
    await waitFor(() => expect(area('putt-primary').textContent).toMatch(/PUTT 2 탭인 성공/));
    expect(area('putt-primary').disabled).toBe(false);
    expect(area('putt-leave').textContent).not.toBe('—');
    await tap(area('putt-primary'));
    await waitForHole(2);
    expect((await stored(0)).s).toMatchObject({ putts: 2, confirmed: true });
  });

  it('판에서 멈춘 곳이 멀면(탭인 거리 밖) 탭인 성공은 눌리지 않고, "PUTT 2 →" 로 넘어가면 PUTT 2 의 거리가 이어서 들어가 있다', async () => {
    await toPutting(prefs);
    await setDistance(card(), 8);
    key('ArrowLeft', 12);                                                         // 1.2m 쯤 옆
    await settle();
    expect(area('putt-primary').disabled).toBe(true);
    await tap(area('putt-next'));
    expect(openPutts()).toEqual([2]);
    expect(text()).toContain('직전 퍼트가 멈춘 곳에서 자동으로 넣었어요');
    const slider = card().querySelector('[data-role="dist-slider"]');
    expect(Number(slider.value)).toBeGreaterThan(0);
  });

  it('그린 밖으로 나갔어요: 필드샷 탭의 칩 카드로 데려가고, 칩이 온그린하면 퍼팅 탭에서 다음 퍼트(PUTT 2)가 열린다', async () => {
    await toPutting(prefs);
    await tap(area('off-green'));
    expect(currentTab()).toBe('필드샷');                                          // 다음에 칠 샷은 칩 — 칩 입력 자리로 간다
    expect(area('off-green-card')).toBeTruthy();
    expect(text()).toContain('1번째 퍼트 뒤 칩');
    expect(text()).toMatch(/그린 밖으로 나가 다시 친 칩 1 ?타는 스코어에만 들어가요/);   // 윗칸 안내
    await tap(find('성공', area('off-green-card'))[0]);                            // 칩 온그린 성공
    expect(currentTab()).toBe('퍼팅');
    expect(openPutts()).toEqual([2]);
    expect(area('off-green-chip').textContent).toMatch(/그린 밖 → 칩 1타 · 온그린/);   // 퍼팅 탭에는 요약만 남는다
    expect(text()).toContain('그린 밖');                                           // PUTT 1 요약에도 "그린 밖"
  });

  it('칩 결과를 안 넣고 퍼팅 탭으로 돌아오면 "칩 결과 입력" 버튼이 칩 카드로 데려간다', async () => {
    await toPutting(prefs);
    await tap(area('off-green'));
    await tapTab('putt');
    expect(text()).toContain('칩이 그린에 오르면 다음 퍼트를 기록해요');
    await tap(find('칩 결과 입력')[0]);
    expect(currentTab()).toBe('필드샷');
    expect(area('off-green-card')).toBeTruthy();
  });

  it('그린 밖으로 표시한 퍼트에서 퍼팅 탭의 버튼을 다시 누르면 취소되고 PUTT 1 카드로 돌아온다', async () => {
    await toPutting(prefs);
    await tap(area('off-green'));
    await tapTab('putt');
    expect(area('off-green').textContent).toContain('다시 누르면 취소');
    await tap(area('off-green'));
    expect(area('off-green').textContent).not.toContain('다시 누르면 취소');
    expect(area('off-green-chip')).toBeNull();
    expect(openPutts()).toEqual([1]);
    expect(text()).not.toContain('스코어에만 들어가요');                             // 윗칸의 칩 안내도 사라진다
  });

  it('칩 카드의 "✕ 칩 삭제"를 누르면 칩이 지워진다', async () => {
    await toPutting(prefs);
    await tap(area('off-green'));
    await tap(find(/칩 삭제$/)[0]);
    expect(area('off-green-card')).toBeNull();
    expect((await stored()).s.offGreen ?? []).toHaveLength(0);
  });
});

describe('퍼팅 — 랜딩 방향 · 핀 위치 · 그린 스피드', () => {
  it('랜딩 휠에서 3시를 누르면 헤더에 "3시 방향"이 보이고, 같은 구역을 다시 누르면 지워진다', async () => {
    await toPutting();
    expect(text()).toContain('온그린 랜딩 방향');
    await tap(document.querySelector('[data-role="landing-zone"][data-hour="3"]'));
    expect(text()).toContain('3시 방향');
    expect((await stored()).s.onGreenLanding).toBe(3);
    await tap(document.querySelector('[data-role="landing-zone"][data-hour="3"]'));
    expect(text()).not.toContain('3시 방향');
  });

  it('핀 위치: 센터가 아닌 방향을 고르면 요약이 헤더에 보인다', async () => {
    await toPutting();
    expect(area('pin-position')).toBeTruthy();
    const dirs = [...area('pin-position').querySelectorAll('button')].map((b) => b.textContent.trim());
    expect(dirs.length).toBeGreaterThan(0);
  });

  it('그린 스피드: 막대를 누르면 창이 열리고 저장하면 막대에 값이 보인다. 취소하면 그대로다', async () => {
    await toPutting();
    expect(area('green-speed-bar').textContent).toContain('설정하기');
    await tap(area('green-speed-bar'));
    expect(area('green-speed-modal')).toBeTruthy();
    await tap(find('취소')[0]);
    expect(area('green-speed-modal')).toBeNull();
    expect(area('green-speed-bar').textContent).toContain('설정하기');
    await tap(area('green-speed-bar'));
    await tap(find(/^보통/, area('green-speed-modal'))[0]);
    await tap(area('green-speed-save'));
    expect(area('green-speed-modal')).toBeNull();
    expect(area('green-speed-bar').textContent).not.toContain('설정하기');
  });
});

describe('퍼팅 — 윗칸의 퍼팅 수와 카드가 같은 숫자를 보여 준다', () => {
  const picked = () => puttsPicked();

  it.each(PREFS)('퍼팅 수 1 · 3 · 4 를 누르면 카드 수가 그 숫자가 되고 첫 미입력 카드가 열린다 — %s', async (_n, prefs) => {
    await toPutting(prefs);
    for (const n of [3, 1, 4]) {
      await tap(find(String(n), area('putt-cards').ownerDocument.body).find((b) => /^\d$/.test(b.textContent.trim()) && b.style.fontSize === '18px'));
      expect(puttCards().length, `${n}퍼트 선택`).toBe(n);
      expect(picked()).toBe(n === 4 ? '4+' : String(n));
      expect(openPutts(), `${n}퍼트 선택 후 열린 카드`).toEqual([1]);
    }
  });

  it('퍼팅 수 0 을 누르면 퍼팅 탭이 빈 화면이 아니다 — 왜 비었는지와 "퍼팅 입력하기" 버튼이 보이고, 누르면 PUTT 1 이 열린다', async () => {
    await toPutting();
    await tap(find('0').find((b) => b.style.fontSize === '18px'));
    expect(currentTab()).toBe('퍼팅');
    expect(puttCards()).toEqual([]);
    expect(area('putts-zero-note')).toBeTruthy();
    expect(area('putts-zero-note').textContent).toContain('퍼팅 수가 0개예요');
    await tap(area('putts-add'));
    expect(area('putts-zero-note')).toBeNull();
    expect(puttCards().map((c) => c.n)).toEqual([1]);
    expect(openPutts()).toEqual([1]);
    expect(puttsPicked()).toBe('1');
  });

  it('칩인으로 끝낸 홀을 다시 열어 퍼팅 탭을 보면 "칩인으로 끝난 홀이라 퍼팅이 없어요"가 보이고 입력 버튼은 없다', async () => {
    await newHole();
    await tap('DRIVER'); await tap('O');
    await tapTab('field');
    await tap(find('칩인')[0]);
    await waitForHole(2);
    await tap(find('이전')[0]);
    await tapTab('putt');
    expect(area('putts-zero-note').textContent).toContain('칩인(홀인원)으로 끝난 홀이라 퍼팅이 없어요');
    expect(area('putts-add')).toBeNull();
  });
});

// 홀 표의 1번 홀 칸 (SCORE 줄 · PUTT 줄)
const navScore = () => document.querySelector('[data-role="nav-score"] button').textContent.replace('★', '').trim();
const navPutts = () => document.querySelector('[data-role="nav-putts"] button').textContent.trim();

describe.each(PREFS)('끝나지 않은 홀은 홀 표에 숫자로 보이지 않는다 — %s', (_n, prefs) => {
  it('그린 밖으로 표시한 직후: 홀 표는 SCORE · / PUTT - 이고, 머리글은 "진행 중"이며 "보기" 같은 이름이 붙지 않는다', async () => {
    await toPutting(prefs);
    await tap(area('off-green'));
    expect([navScore(), navPutts()]).toEqual(['·', '-']);
    expect(text()).toContain('진행 중');
    expect(text()).not.toMatch(/Bogey|Birdie|Double/);
    expect(text()).not.toMatch(/HOLE 1 PAR 4 \+\d/);                        // 파 대비 "+1" 배지도 없다
  });

  it('칩이 그린에 올라간 뒤에도 마지막 퍼트가 들어가기 전까지는 계속 진행 중이고, 홀인하면 그때 숫자(5타 · 퍼팅 2)로 바뀐다', async () => {
    await toPutting(prefs);
    await tap(area('off-green'));
    await tap(find('성공', area('off-green-card'))[0]);
    expect(openPutts()).toEqual([2]);
    expect([navScore(), navPutts()]).toEqual(['·', '-']);
    await tap(area('putt-primary'));
    await waitForHole(2);
    expect([navScore(), navPutts()]).toEqual(['5', '2']);                    // 티샷 · 세컨샷 · 퍼트 · 칩 · 퍼트
    expect(text()).toMatch(/1 ?\/ ?18 holes/);
  });

  it('PUTT 1 에서 안 들어가 PUTT 2 로 넘어가 있는 동안도 진행 중이다 (카드를 만들어 둔 것일 뿐 퍼트 수가 정해진 게 아니다)', async () => {
    await toPutting(prefs);
    await tap(area('putt-next'));
    expect([navScore(), navPutts()]).toEqual(['·', '-']);
    expect(text()).toContain('진행 중');
    await tap(area('putt-primary'));
    await waitForHole(2);
    expect([navScore(), navPutts()]).toEqual(['4', '2']);
  });

  it('윗칸에서 퍼팅 수를 직접 정하면 그 수가 확정이라 홀 표에 숫자로 보인다', async () => {
    await toPutting(prefs);
    await tap(area('putt-next'));
    expect(navScore()).toBe('·');
    await tap(find('3').find((b) => b.style.fontSize === '18px'));
    expect([navScore(), navPutts()]).toEqual(['5', '3']);
    expect(text()).not.toContain('진행 중');
  });

  it('진행 중인 홀에서 "다음"으로 넘기면 그 홀은 지금까지 기록한 대로 확정되어 숫자로 보인다', async () => {
    await toPutting(prefs);
    await tap(area('putt-next'));
    await tap(find('다음')[0]);
    if (area('hole-check')) await tap(find(/^그대로 다음 홀$/)[0] || area('putt-ask-2'));
    await waitForHole(2);
    expect(navScore()).toMatch(/^\d$/);
    expect(navPutts()).toMatch(/^\d$/);
  });
});
