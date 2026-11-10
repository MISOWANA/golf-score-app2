// @vitest-environment jsdom
// 스코어 상세 입력 — 9홀 라운드 · 동반자와 함께(간편 입력) · 거리 단위(야드·피트) · 마이백 클럽 추천 · 필수 정보 확인 창.
// 방식은 test/flowKit.jsx 머리말 참고.
import { describe, it, expect, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { one, find, tap, tapTab, area, currentTab, openPutts, holeHeader, stored, text, newHole, setDistance, waitForHole, openApp, startRound, getDb, getUser, installHooks } from './test/flowKit.jsx';

vi.setConfig({ testTimeout: 40000 });
installHooks();

describe('9홀 라운드', () => {
  it('전반 9홀로 시작하면 진행률이 0 / 9 holes, 홀 번호는 1~9 이고 9번 홀에서 다음 버튼 대신 완료가 나온다', async () => {
    await newHole(null, { nine: 'out' });
    expect(text()).toContain('/9홀');
    expect(holeHeader().hole).toBe(1);
    const cells = [...document.querySelectorAll('[data-role="nav-score"] button')];
    expect(cells).toHaveLength(9);
    await tap(cells[8], '9번 홀 칸');
    expect(holeHeader().hole).toBe(9);
    expect(find('라운드 완료').length).toBeGreaterThan(0);
    expect(find('다음 홀').length).toBe(0);
  });

  it('후반 9홀로 시작해도 홀 번호는 1~9 이고 한 홀을 끝까지 칠 수 있다', async () => {
    await newHole(null, { nine: 'in' });
    expect(holeHeader().hole).toBe(1);
    await tap('DRIVER'); await tap('O');
    await tapTab('field');
    await tap(area('second-result-on'));
    expect(openPutts()).toEqual([1]);
    await tap(area('putt-primary'));
    await waitForHole(2);
    expect(text()).toContain('/9홀');
  });
});

describe('동반자와 함께 (간편 입력)', () => {
  it('플레이어가 둘이면 상세 샷 입력 대신 플레이어별 스코어 −/+ 가 나오고, 아래 막대의 다음 홀 · 이전 버튼으로 이동한다', async () => {
    await newHole(null, { players: ['철수'] });
    expect(text()).toContain('철수');
    expect(text()).not.toContain('페어웨이 적중');                     // 상세 샷 입력은 혼자 칠 때만
    expect(find('다음 홀').length).toBe(1);                           // 아래 막대 하나뿐 (본문 안에 같은 버튼을 또 두지 않는다)
    const minus = find('−').length; const plus = find('+').length;
    expect(minus).toBeGreaterThanOrEqual(2);
    expect(plus).toBeGreaterThanOrEqual(2);
  });

  it('철수의 + 를 누르면 철수 스코어만 오르고, 다음 홀로 가면 홀 표에 두 사람의 스코어가 보인다', async () => {
    await newHole(null, { players: ['철수'] });
    const rows = [...document.querySelectorAll('[data-role="nav-score"]')];
    expect(rows.length).toBe(2 * 2);                                  // 플레이어 2명 × OUT/IN
    // 두 번째 플레이어(철수) 행의 + : 간편 입력 카드의 + 두 번째
    const plusButtons = find('+');
    await tap(plusButtons[1]);
    await tap(find('다음 홀')[0]);
    if (area('hole-check')) await tap(find(/그대로|취소/)[0]);
    await waitFor(() => expect(text()).toMatch(/2번 홀|입력하지 않았어요/));
  });
});

describe('거리 단위 — 야드 · 피트', () => {
  it('야드 모드: 남은 거리는 야드로, 퍼팅 거리는 피트로 보이고 저장은 미터다', async () => {
    await newHole({ unit: 'yd' });
    await tap('DRIVER'); await tap('O');
    await tapTab('field');
    expect(text()).toMatch(/탭하면 \d+ ?yd 부터/);
    await setDistance(area('second-surface').parentElement, 164);       // 164야드
    expect(text()).toContain('164');
    const m = (await stored()).s.remainingDistance;
    expect(m).toBeGreaterThan(149); expect(m).toBeLessThan(151);        // ≈150m
    await tap('IRON'); await tap('7I');
    await tap(area('second-result-on'));
    expect(text()).toMatch(/ft/);                                        // 퍼팅 거리는 피트
    expect(text()).not.toMatch(/탭하면 5 ?m 부터/);
  });

  it('야드 모드에서 첫 퍼팅 기본 거리 6m 는 약 20ft 로 보이고 PUTT 1 이 열려 있다', async () => {
    await newHole({ unit: 'yd', firstPutt: 6 });
    await tap('DRIVER'); await tap('O');
    await tapTab('field');
    await tap(area('second-result-on'));
    expect(openPutts()).toEqual([1]);
    expect(text()).toMatch(/19\.7 ?ft|20 ?ft/);
  });
});

describe('마이백 클럽 추천', () => {
  const IRON7 = { id: 'iron7', name: '7i', type: 'Iron', carry: 140, total: 150 };
  const IRON8 = { id: 'iron8', name: '8i', type: 'Iron', carry: 128, total: 138 };
  const IRON6 = { id: 'iron6', name: '6i', type: 'Iron', carry: 152, total: 162 };

  it('마이백이 없으면 거리를 넣은 뒤 "마이백에서 … 설정하면 추천" 안내가 나오고, 클럽을 고르면 사라진다', async () => {
    await newHole();
    await tap('DRIVER'); await tap('O');
    await tapTab('field');
    await setDistance(area('second-surface').parentElement, 150);
    expect(text()).toContain('마이백에서 클럽별 캐리·토탈 거리를 설정하면');
    await tap('IRON'); await tap('7I');
    expect(text()).not.toContain('마이백에서 클럽별 캐리·토탈 거리를 설정하면');
  });

  it('마이백이 있으면 거리에 맞는 클럽 칩이 나오고, 칩을 누르면 클럽 종류와 세부 클럽이 한 번에 입력된다', async () => {
    await openApp();
    await getDb().saveClubsForUser(getUser().userId, [IRON6, IRON7, IRON8]);
    await startRound();
    await tap('DRIVER'); await tap('O');
    await tapTab('field');
    await setDistance(area('second-surface').parentElement, 150);
    await waitFor(() => expect(find(/7I/).length).toBeGreaterThan(0));
    const chip = find(/^★ .*7I/)[0] || find(/7I/)[0];
    await tap(chip);
    expect((await stored()).s).toMatchObject({ secondClub: 'iron', secondClubSub: '7I' });
    await tap(find(/7I/).find((b) => b.getAttribute('aria-pressed') === 'true'));       // 선택된 칩을 다시 누르면 해제
    expect((await stored()).s.secondClub ?? null).toBeNull();
  });
});

describe('필수 정보(라이 · 지형 · 거리 · 클럽)와 확인 창', () => {
  it('세컨샷의 라이 · 지형 · 거리를 비워 둔 채 성공 → 퍼팅까지 하고 "다음"을 누르면 어느 샷의 무엇이 빠졌는지 보여 준다', async () => {
    await newHole();
    await tap('DRIVER');
    await tapTab('field');
    await tap(area('second-result-on'));
    await tap(area('putt-next'));
    await tap(one('다음 홀'));
    // 퍼팅 수를 알면(PUTT 1 → 2 를 눌러 2퍼트 이상이 확정) 샷 정보만 묻는다
    expect(area('hole-check')).toBeTruthy();
    expect(area('hole-check').getAttribute('data-info')).toBe('1');
    const gaps = [...document.querySelectorAll('[data-role="info-ask-gap"]')].map((g) => g.textContent);
    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps.join(' ')).toMatch(/세컨샷/);
    expect(gaps.join(' ')).toMatch(/라이|지형|거리|클럽/);
  });

  it('"입력하러 가기"를 누르면 빠진 샷의 필드샷 탭이 열리고, 빠진 칸이 표시된다', async () => {
    await newHole();
    await tap('DRIVER');
    await tapTab('field');
    await tap(area('second-result-on'));
    await tap(area('putt-next'));
    await tap(one('다음 홀'));
    await tap(area('info-ask-fill'));
    expect(area('hole-check')).toBeNull();
    expect(currentTab()).toBe('필드샷');
    expect(area('second-lie').getAttribute('data-missing')).toBe('1');
    expect(area('second-surface').getAttribute('data-missing')).toBe('1');
    await tap(area('second-lie-flat'));
    expect(area('second-lie').getAttribute('data-missing')).toBe('0');       // 채우면 표시가 사라진다
  });

  it('"그대로 다음 홀"을 누르면 빠진 채로 확정하고 다음 홀로 간다 (코스 위에서 막지 않는다)', async () => {
    await newHole();
    await tap('DRIVER');
    await tapTab('field');
    await tap(area('second-result-on'));
    await tap(area('putt-next'));
    await tap(one('다음 홀'));
    await tap(find(/^그대로 다음 홀$/)[0]);
    expect(holeHeader().hole).toBe(2);
    expect((await stored(0)).s.confirmed).toBe(true);
  });
});
