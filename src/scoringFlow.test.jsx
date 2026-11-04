// @vitest-environment jsdom
// 스코어 상세 입력 — 사용자 흐름 테스트. 방식은 test/flowKit.jsx 머리말 참고.
import { describe, it, expect, vi } from 'vitest';
import { openApp, startRound, one, tap, area, currentTab, tabInfo, puttCards, openPutts, scoreNow, holeHeader, stored, visibleText, installHooks, looksOn, on, setDistance, waitForHole, SETTINGS } from './test/flowKit.jsx';

vi.setConfig({ testTimeout: 40000 });
installHooks();


describe.each(SETTINGS)('파4 한 홀을 처음부터 끝까지 — %s', (_name, prefs) => {
  it('티샷 → 필드샷 → 퍼팅 2번 → 홀인: 단계마다 화면이 사용자가 기대하는 모습이다', async () => {
    await openApp({ prefs });
    await startRound();

    // ── 티샷 ────────────────────────────────────────────────
    expect(holeHeader()).toEqual({ hole: 1, par: 4 });
    expect(currentTab()).toBe('티샷');
    expect(tabInfo()['필드샷'].disabled).toBe(true);
    expect(tabInfo()['퍼팅'].disabled).toBe(true);

    await tap('DRIVER');
    expect(tabInfo()['티샷'].done).toBe(true);                       // 티샷 탭에 ✓
    expect(tabInfo()['필드샷'].disabled).toBe(false);                // 이제 필드샷으로 갈 수 있다
    expect(scoreNow()).toEqual({ pending: 2, n: null });             // 티샷 + 세컨샷 = 온그린까지 2타, 퍼팅은 남음
    await tap('스트레이트');
    expect(looksOn(one('스트레이트'))).toBe(true);

    await tap('O');                                                   // 페어웨이 O
    expect(currentTab()).toBe('티샷');                                // 눌렀다고 탭이 바뀌지는 않는다
    expect(looksOn(area('tee-fairway-hit'))).toBe(true);

    // ── 필드샷 (세컨샷) ─────────────────────────────────────────
    await tap(/^필드샷 입력하기/);
    expect(currentTab()).toBe('필드샷');
    expect(on('second-surface-fairway')).toBe(true);                  // 티샷 페어웨이라 지형이 미리 선택돼 있다
    expect(visibleText()).toContain('티샷 페어웨이라 자동 선택');
    expect(on('second-surface-rough')).toBe(false);

    await tap('IRON');                                                // 클럽 → 세부 클럽이 펼쳐진다
    await tap('7I');
    expect(looksOn(one('7I'))).toBe(true);
    await setDistance(area('second-surface').parentElement, 150);
    await tap(area('second-lie-flat'));
    expect(on('second-lie-flat')).toBe(true);

    // 성공을 누르기 전: 아직 필드샷 탭, 퍼팅 카드는 안 보인다
    expect(currentTab()).toBe('필드샷');
    expect(puttCards()).toEqual([]);

    await tap(area('second-result-on'));
    // ── 온그린 성공 → 퍼팅으로 ────────────────────────────────────
    expect(currentTab()).toBe('퍼팅');
    expect(tabInfo()['필드샷'].done).toBe(true);
    expect(puttCards().map((c) => c.n)).toEqual([1, 2]);              // 기본 2퍼트로 카드 두 개
    expect(openPutts()).toEqual([1]);                                 // 열려 있는 건 PUTT 1 (PUTT 2 가 아니다)
    expect(area('landing-top')).toBeTruthy();                         // 랜딩 방향 휠도 같이 있다

    // ── PUTT 1: 라이 · 거리를 넣고 안 들어감 → PUTT 2 ──────────────────
    await tap(area('putt-lie-uphill'));
    expect(on('putt-lie-uphill')).toBe(true);
    await setDistance(area('putt-cards'), 8);
    await tap(area('putt-next'));
    expect(openPutts()).toEqual([2]);                                 // 다음 퍼트가 열린다
    expect(puttCards().map((c) => c.n)).toEqual([1, 2]);
    expect(area('putt-summary').textContent).toMatch(/오르막/);       // 접힌 PUTT 1 은 입력한 것을 한 줄로 남긴다
    expect((await stored()).s.puttDetails[0]).toMatchObject({ holein: 'fail' });

    // ── PUTT 2 홀인 ───────────────────────────────────────────────
    await tap(area('putt-primary'));
    await waitForHole(2);
    // 다음 홀은 티샷부터
    expect(currentTab()).toBe('티샷');
    expect(tabInfo()['필드샷'].disabled).toBe(true);
    // 위 홀 표에 1번 홀 결과: 4타 · 2퍼트
    const { round } = await stored(0);
    expect(round.holes[0].scores['테스터']).toMatchObject({ strokes: 4, putts: 2, confirmed: true });
    expect(visibleText()).toMatch(/SCORE 4 - - - - - - - - /);
    expect(visibleText()).toMatch(/PUTT 2 - - - - - - - - /);
  });
});
