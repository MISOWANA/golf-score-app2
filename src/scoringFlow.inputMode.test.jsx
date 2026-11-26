// @vitest-environment jsdom
// 라운드 입력 모드 — 간단 입력(스코어 · 퍼팅만) · 세부 입력(예전부터 있던 화면 그대로).
// 새 라운드 설정에서 고르고, 라운드 중에는 ☰ 메뉴에서 바꾼다. 고른 모드는 다음 라운드에 미리 골라져 있다.
// 방식은 test/flowKit.jsx 머리말 참고: 새 라운드 시작부터 사용자가 누르는 순서대로, 화면에 보이는 것을 확인한다.
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import {
  ME, find, tap, area, text, stored, openApp, startRound, installHooks, waitForHole, scoreNow, puttsPicked, holeHeader,
  menuTap, openMenu, reopenApp, getDb, getUser, tapTab,
} from './test/flowKit.jsx';

vi.setConfig({ testTimeout: 60000 });
installHooks();

const hasTabs = () => document.querySelectorAll('[role="tab"]').length > 0;
const menuRoles = () => [...area('scoring-menu').querySelectorAll('button[data-role]')].map((b) => b.getAttribute('data-role'));
const blockers = () => area('start-blockers')?.textContent ?? null;
const startBtn = () => area('start-round');
const modeCard = (mode) => area(`input-mode-${mode}`);
const checked = (mode) => modeCard(mode).getAttribute('aria-checked');
const bottomTab = (label) => fireEvent.click(screen.getByTitle(label));
const prefs = () => getDb().getPrefs(getUser().userId);

// 홈 → 새 라운드 설정 (골프장 · 티까지 채운다. 입력 모드는 건드리지 않는다)
async function openSetup() {
  fireEvent.click(screen.getByText('시작하기'));
  await screen.findByPlaceholderText('골프장 이름 검색...');
  fireEvent.change(screen.getByPlaceholderText('골프장 이름 검색...'), { target: { value: '흐름CC' } });
  fireEvent.click(screen.getByText('화이트'));
}

// 지금 홀의 스코어 · 퍼팅을 넣는다 — 간단 입력에서 쓰는 버튼만 (한 번에 고르기 · 퍼팅 줄)
async function enterScore(strokes, putts, par = 4) {
  const quick = { [par - 1]: '버디', [par]: '파', [par + 1]: '보기', [par + 2]: '더블 이상' }[strokes];
  if (quick) await tap(find(quick)[0], quick);
  else {
    for (let guard = 0; guard < 15 && scoreNow().n !== strokes; guard++) await tap(area(scoreNow().n < strokes ? 'score-plus' : 'score-minus'));
  }
  expect(scoreNow().n).toBe(strokes);
  await tap(area(`putts-${putts}`), `퍼팅 ${putts}`);
  expect(puttsPicked()).toBe(String(putts));
}

// 18홀 동안 칠 스코어 — 파 4 · 보기 5 · 더블 6 이 번갈아 나온다 (합계 90타 · 퍼팅 42개). e2e/kit.js 의 ROUND 와 같다
const ROUND = Array.from({ length: 18 }, (_, i) => ({ strokes: 4 + (i % 3), putts: i % 3 === 2 ? 3 : 2 }));
const TOTAL = ROUND.reduce((s, h) => s + h.strokes, 0);
const PUTTS = ROUND.reduce((s, h) => s + h.putts, 0);
const sum = (list) => list.reduce((s, h) => s + h.strokes, 0);

describe('새 라운드 설정 — 입력 모드 고르기', () => {
  it('처음 쓰는 사람은 아무것도 골라져 있지 않고, 고르지 않으면 "입력 모드를 골라 주세요"로 시작이 막힌다', async () => {
    await openApp({ shots: false });
    await openSetup();
    expect(area('input-mode').querySelector('[role="radiogroup"]').getAttribute('aria-label')).toBe('입력 모드');
    expect([checked('simple'), checked('detailed')]).toEqual(['false', 'false']);
    expect(modeCard('simple').textContent).toBe('간단 입력스코어와 퍼팅만 빠르게');
    expect(modeCard('detailed').textContent).toBe('세부 입력샷마다 클럽·거리·결과까지');
    expect(blockers()).toBe('입력 모드를 골라 주세요');
    expect(startBtn().disabled).toBe(true);

    fireEvent.click(modeCard('detailed'));
    expect([checked('simple'), checked('detailed')]).toEqual(['false', 'true']);
    fireEvent.click(modeCard('simple'));                                    // 다른 쪽을 누르면 그쪽으로 바뀐다 (하나만 골라진다)
    expect([checked('simple'), checked('detailed')]).toEqual(['true', 'false']);
    expect(blockers()).toBeNull();
    expect(startBtn().disabled).toBe(false);
  });

  it('입력 모드 구역은 "라운드 시작하기" 바로 위(설정 화면의 맨 아래)에 있다', async () => {
    await openApp({ shots: false });
    await openSetup();
    const after = (a, b) => !!(area(a).compareDocumentPosition(area(b)) & Node.DOCUMENT_POSITION_PRECEDING);
    expect(after('input-mode', 'hole-mode')).toBe(true);
    expect(after('input-mode', 'setup-green-speed')).toBe(true);
    // 입력 모드 구역 다음은 시작 막대 자리(빈 칸)와 시작 막대뿐이다
    expect(area('input-mode').nextElementSibling.getAttribute('aria-hidden')).toBe('true');
    expect(area('input-mode').nextElementSibling.nextElementSibling).toBe(area('start-bar'));
  });

  it('고른 모드는 이 사용자의 기본값으로 저장돼, 다음 라운드 설정에서 미리 골라져 있다', async () => {
    await openApp({ shots: false });
    await startRound({ mode: 'simple' });
    await waitFor(async () => expect((await prefs()).defaultInputMode).toBe('simple'));
    expect((await stored()).round.inputMode).toBe('simple');

    // 라운드를 그만두고 세팅 다시하기 → 설정 화면에 간단 입력이 골라져 있다
    await menuTap('quit-round');
    fireEvent.click(screen.getByText('삭제하고 세팅 다시하기'));
    await screen.findByPlaceholderText('골프장 이름 검색...');
    expect([checked('simple'), checked('detailed')]).toEqual(['true', 'false']);
    expect(blockers()).not.toContain('입력 모드');

    // 앱을 껐다 켜도 기억한다 (기기의 임시 기억이 아니라 사용자 설정)
    await reopenFresh();
    await openSetup();
    expect(checked('simple')).toBe('true');
    expect(blockers()).toBeNull();
  });

  it('설정에서 거리 단위 · 첫 퍼팅 거리를 바꿔도 기본 입력 모드는 지워지지 않는다', async () => {
    await openApp({ shots: false, prefs: { unit: 'm', defaultInputMode: 'simple' } });
    fireEvent.click(area('open-settings'));
    await waitFor(() => expect(area('unit-yd')).toBeTruthy());
    fireEvent.click(area('unit-yd'));
    await waitFor(async () => expect(await prefs()).toEqual({ unit: 'yd', defaultInputMode: 'simple' }));
    fireEvent.change(document.querySelector('[data-role="first-putt-input"] [data-role="dist-slider"]'), { target: { value: '20' } });
    await waitFor(async () => expect(await prefs()).toEqual({ unit: 'yd', firstPutt: 6.1, defaultInputMode: 'simple' }));
    // 새 라운드 설정에도 그대로 미리 골라져 있다
    bottomTab('홈');
    await screen.findByText('새 라운드');
    await openSetup();
    expect(checked('simple')).toBe('true');
  });

  it('동반자 라운드는 모드 구역 대신 "동반자 라운드는 스코어만 기록돼요" 한 줄만 보이고, 모드를 묻지 않으며 저장하지도 않는다', async () => {
    await openApp({ shots: false });
    await openSetup();
    fireEvent.click(screen.getByText('추가'));
    fireEvent.change(await screen.findByPlaceholderText('플레이어 2'), { target: { value: '철수' } });
    expect(area('input-mode').textContent).toBe('동반자 라운드는 스코어만 기록돼요');
    expect(modeCard('simple')).toBeNull();
    expect(blockers()).toBeNull();
    fireEvent.click(startBtn());
    await waitForHole(1);
    const { round } = await stored(0);
    expect(round.players).toEqual([ME, '철수']);
    expect('inputMode' in round).toBe(false);
    expect((await prefs()).defaultInputMode).toBeUndefined();               // 동반자 라운드는 기본값도 바꾸지 않는다
    // 동반자 화면에는 모드 바꾸기가 없다 (늘 간편 스코어)
    await openMenu();
    expect(menuRoles()).not.toContain('input-mode-change');
  });
});

// 앱을 완전히 껐다 켠다 (진행 중인 라운드 없이 — 홈에서 멈춘다)
async function reopenFresh() {
  const { render } = await import('@testing-library/react');
  cleanup();
  vi.resetModules();
  const App = (await import('./GolfScoringApp.jsx')).default;
  render(<App />);
  await screen.findByText('새 라운드');
}

describe('간단 입력 — 스코어와 퍼팅만', () => {
  it('벌타 · 샷 기록 구역이 없고 스코어 · 한 번에 고르기 · 퍼팅만 보인다 (샷 기록을 열어 둔 기기여도)', async () => {
    await openApp({ shots: true });                                       // 이 기기는 예전에 샷 기록을 열어 둔 적이 있다
    await startRound({ mode: 'simple' });
    expect(holeHeader()).toEqual({ hole: 1, par: 4 });
    expect(text()).toContain('1번 홀 스코어를 알려 주세요');
    expect(area('score-input')).toBeTruthy();
    expect(area('score-quick')).toBeTruthy();
    expect(area('putts-input')).toBeTruthy();
    expect(area('penalty-input')).toBeNull();
    expect(area('shot-entry')).toBeNull();
    expect(hasTabs()).toBe(false);
    expect(text()).not.toContain('티샷 지점');
    // 전체 스코어 영역 · 아래 막대는 그대로
    expect(area('progress')).toBeTruthy();
    expect(area('running-total')).toBeTruthy();
    expect(area('nav-score')).toBeTruthy();
    expect(area('nav-putts')).toBeTruthy();
    expect([...area('scoring-bar').querySelectorAll('button')].map((b) => b.getAttribute('data-role'))).toEqual(['menu-button', 'prev-hole', 'next-hole']);
  });

  it('☰ 메뉴: 코스맵이 없고, 메모 · 라운드 수정 · 입력 모드 바꾸기(지금: 간단 입력) · 라운드 그만두기가 있다', async () => {
    await openApp({ shots: false });
    await startRound({ mode: 'simple' });
    await openMenu();
    expect(menuRoles()).toEqual(['go-home', 'memo-button', 'round-edit', 'input-mode-change', 'quit-round']);
    expect(area('input-mode-change').textContent).toContain('지금: 간단 입력');
  });

  it('퍼팅은 0~4 이고 4를 다시 누르면 5 이상이 열린다 · 스코어보다 많은 퍼팅은 고를 수 없다 · GIR 은 (스코어 − 퍼팅) ≤ 파 − 2', async () => {
    await openApp({ shots: false });
    await startRound({ mode: 'simple' });
    await tap(find('버디')[0]);                                             // 3타 — 퍼팅은 2개까지
    expect(area('putts-2').disabled).toBe(false);
    expect(area('putts-3').disabled).toBe(true);
    expect(area('putts-4').disabled).toBe(true);
    await tap(find('보기')[0]);                                             // 5타
    await tap(area('putts-2'));
    expect((await stored(0)).s).toMatchObject({ strokes: 5, putts: 2, gir: false });  // 5 − 2 = 3 > 2 — 그린을 놓쳤다
    await tap(area('putts-3'));
    expect((await stored(0)).s).toMatchObject({ strokes: 5, putts: 3, gir: true });   // 5 − 3 = 2 ≤ 2 — 2온 3퍼트
    // 4 를 누르면 4, 한 번 더 누르면 5 이상이 열린다
    await tap(find('더블 이상')[0]);
    for (let g = 0; g < 5 && scoreNow().n < 10; g++) await tap(area('score-plus'));
    expect(scoreNow().n).toBe(10);
    await tap(area('putts-4'));
    expect(puttsPicked()).toBe('4+');                                       // 4 이상을 고르면 "4+" 로 보인다
    await tap(area('putts-4'));
    const more = find(/^\d+$/).filter((b) => Number(b.textContent) >= 5 && b.closest('[data-role="putts-input"]'));
    expect(more.map((b) => Number(b.textContent))).toEqual([5, 6, 7, 8, 9]);   // 스코어 10타 — 퍼팅은 9개까지
    await tap(more[2]);
    expect((await stored(0)).s.putts).toBe(7);
  });

  it('입력 없는 홀에서 "다음 홀"을 누르면 파(2퍼트)로 기록할지 묻는다 (간단 입력에서도 그대로)', async () => {
    await openApp({ shots: false });
    await startRound({ mode: 'simple' });
    await tap(area('next-hole'));
    expect(text()).toMatch(/1 ?번 홀 스코어를 입력하지 않았어요/);
    expect(text()).toContain('파(2퍼트)로 기록할까요?');
    await tap(find('파로 기록하고 다음 홀')[0]);
    await waitForHole(2);
    expect((await stored(0)).s).toMatchObject({ strokes: 4, putts: 2, touched: true, confirmed: true });
  });
});

describe('간단 입력으로 18홀 — 리포트 · 홈 · 히스토리가 같은 숫자', () => {
  it('간단 입력으로 18홀을 끝내면 1인 18홀 라운드로 저장되고 리포트 · 홈 · 히스토리 · 스탯에 같은 숫자로 들어간다', async () => {
    await openApp({ shots: false });
    await startRound({ mode: 'simple' });
    for (let i = 0; i < 18; i++) {
      expect(holeHeader().hole).toBe(i + 1);
      await enterScore(ROUND[i].strokes, ROUND[i].putts);
      if (i < 17) {
        await tap(area('next-hole'), `${i + 1}번 홀 다음`);
        await waitForHole(i + 2);
        const done = ROUND.slice(0, i + 1);
        const over = sum(done) - 4 * done.length;
        expect(area('progress-count').textContent).toBe(`${i + 1}/18홀`);
        expect(area('running-total').textContent).toBe(`${sum(done)}(${over === 0 ? 'E' : `+${over}`})`);
        expect(area('hole-check')).toBeNull();                              // 확인 창 없이 바로 넘어간다
      }
    }
    await tap(area('finish-round'), '라운드 완료');
    await waitFor(() => expect(text()).toContain('라운드 리포트'), { timeout: 8000 });

    // 저장된 라운드 — 1인 · 18홀 · 간단 입력 · 입력한 그대로
    const [saved] = await getDb().loadRoundsByUser([getUser().userId]);
    expect(saved).toMatchObject({ completed: true, inputMode: 'simple', players: [ME] });
    expect(saved.holes).toHaveLength(18);
    expect(saved.holes.map((h) => h.scores[ME].strokes)).toEqual(ROUND.map((h) => h.strokes));
    expect(saved.holes.map((h) => h.scores[ME].putts)).toEqual(ROUND.map((h) => h.putts));
    expect(saved.holes.every((h) => !h.scores[ME].teeClub)).toBe(true);    // 샷 기록은 없다

    // 리포트
    const report = text();
    expect(report).toContain(`${TOTAL}타 (+${TOTAL - 72})`);
    expect(report).toContain(`전반 9홀 ${sum(ROUND.slice(0, 9))}`);
    expect(report).toContain(`후반 9홀 ${sum(ROUND.slice(9))}`);
    expect(report).toMatch(new RegExp(`Putts\\s*${PUTTS}`));

    // 홈 — 평균 스코어 · 최근 라운드
    bottomTab('홈');
    await screen.findByText('새 라운드');
    expect(area('home-active-round')).toBeNull();
    expect(area('home-stats').textContent).toContain(`${TOTAL}.0`);
    const homeRow = find(new RegExp('흐름CC'))[0];
    expect(homeRow.textContent).toContain(String(TOTAL));
    expect(homeRow.textContent).toContain(`+${TOTAL - 72}`);

    // 히스토리 — 같은 라운드, 같은 타수
    bottomTab('히스토리');
    await waitFor(() => expect(find(new RegExp('흐름CC'))).toHaveLength(1));
    const card = find(new RegExp('흐름CC'))[0];
    expect(card.textContent).toContain(String(TOTAL));
    expect(card.textContent).toContain(`+${TOTAL - 72}`);

    // 스탯 — 통계에 들어간다 (동반자 · 9홀 라운드처럼 빠지지 않는다)
    bottomTab('스탯');
    await waitFor(() => expect(text()).toMatch(/스탯|통계/));
    expect(area('stats-empty')).toBeNull();
  });
});

describe('라운드 중 입력 모드 바꾸기', () => {
  // 세부 입력에서 1번 홀(파4)에 티샷(드라이버 · 페어웨이 O) · 퍼팅 2 · 해저드 1 을 넣는다 → 샷 기록으로 자동 계산 5타
  async function detailedHoleWithShots() {
    await openApp({ shots: true });
    await startRound({ mode: 'detailed' });
    await tap('DRIVER');
    await tap('O');
    await tap(area('putts-2'), '퍼팅 2');
    await tap(area('penalty-toggle'), '벌타 열기');
    await tap(document.querySelector('[aria-label="해저드 늘리기"]'), '해저드 +');
    expect(scoreNow().n).toBe(5);
    expect(text()).toContain('샷 기록으로 자동 계산');
  }

  it('세부 → 간단: 확인 시트에서 바꾸면 벌타 · 샷 기록이 화면에서만 숨고, 기록과 스코어는 그대로다', async () => {
    await detailedHoleWithShots();
    const before = (await stored(0)).s;
    // 세부 입력에서는 비어 있는 세컨샷 정보를 '다음 홀' 전에 묻는다 — 창만 닫는다
    await tap(area('next-hole'));
    expect(area('hole-check').getAttribute('data-info')).toBe('1');
    fireEvent.click(area('hole-check').parentElement);
    expect(area('hole-check')).toBeNull();

    await menuTap('input-mode-change');
    const sheet = area('mode-sheet');
    expect(sheet.getAttribute('role')).toBe('dialog');
    expect(area('mode-sheet-title').textContent).toBe('간단 입력으로 바꿀까요?');
    expect(area('mode-sheet-text').textContent).toContain('입력한 샷 기록은 그대로 남아요');
    await tap(area('mode-sheet-confirm'), '바꾸기');
    expect(area('mode-sheet')).toBeNull();

    // 화면: 스코어 · 퍼팅만 — 스코어는 그대로 5타 (샷 기록으로 계산한 값)
    expect(area('penalty-input')).toBeNull();
    expect(area('shot-entry')).toBeNull();
    expect(hasTabs()).toBe(false);
    expect(scoreNow().n).toBe(5);
    expect(puttsPicked()).toBe('2');
    expect(text()).toContain('샷 기록으로 자동 계산');

    // 저장: 이 라운드의 모드만 바뀌고, 홀 기록은 한 글자도 바뀌지 않았다
    const after = await stored(0);
    expect(after.round.inputMode).toBe('simple');
    expect(after.s).toEqual(before);
    expect(after.s).toMatchObject({ teeClub: 'driver', fairway: true, hazard: 1, putts: 2, strokes: 5 });
    expect((await prefs()).defaultInputMode).toBe('detailed');              // 라운드 중에 바꾼 건 기본값을 바꾸지 않는다

    // 간단 입력에서는 빠진 샷 정보를 묻지 않고 바로 다음 홀로 — 확정해도 스코어는 5타
    await tap(area('next-hole'));
    expect(area('hole-check')).toBeNull();
    await waitForHole(2);
    expect((await stored(0)).s).toMatchObject({ teeClub: 'driver', hazard: 1, strokes: 5, confirmed: true });
    expect(area('nav-score').querySelectorAll('button')[0].textContent).toBe('5');
  });

  it('간단 → 세부로 되돌리면 숨겨 둔 벌타 · 샷 기록이 다시 보인다', async () => {
    await detailedHoleWithShots();
    await menuTap('input-mode-change');
    await tap(area('mode-sheet-confirm'));
    await menuTap('input-mode-change');
    expect(area('mode-sheet-title').textContent).toBe('세부 입력으로 바꿀까요?');
    await tap(area('mode-sheet-confirm'));
    expect((await stored(0)).round.inputMode).toBe('detailed');
    expect(area('penalty-summary').textContent).toBe('해저드 1');
    expect(area('shot-summary').textContent).toMatch(/\d샷 기록됨/);
    expect(hasTabs()).toBe(true);
    await tapTab('tee');
    expect(scoreNow().n).toBe(5);
    await openMenu();
    expect(menuRoles()).toContain('map-button');
  });

  it('취소하면 아무것도 바뀌지 않는다', async () => {
    await openApp({ shots: false });
    await startRound({ mode: 'simple' });
    await menuTap('input-mode-change');
    expect(area('mode-sheet-title').textContent).toBe('세부 입력으로 바꿀까요?');
    await tap(area('mode-sheet-cancel'));
    expect(area('mode-sheet')).toBeNull();
    expect(area('penalty-input')).toBeNull();
    expect((await stored(0)).round.inputMode).toBe('simple');
  });
});

describe('홈 · 이어서', () => {
  it('진행 중인 라운드 카드에 "간단 입력" 라벨이 붙고, 앱을 다시 열어 "이어서"로 들어와도 간단 입력이다', async () => {
    await openApp({ shots: false });
    await startRound({ mode: 'simple' });
    await enterScore(5, 2);
    await tap(area('next-hole'));
    await waitForHole(2);
    await menuTap('go-home');
    await screen.findByText('새 라운드');
    expect(area('home-input-mode').textContent).toBe('간단 입력');

    await reopenApp();                                                     // 앱을 껐다 켜고 "이어서"
    expect(holeHeader().hole).toBe(2);
    expect(area('penalty-input')).toBeNull();
    expect(area('shot-entry')).toBeNull();
    expect(area('running-total').textContent).toBe('5(+1)');
  });

  it('세부 입력 라운드는 "세부 입력" 라벨이 붙는다', async () => {
    await openApp({ shots: false });
    await startRound({ mode: 'detailed' });
    await menuTap('go-home');
    await screen.findByText('새 라운드');
    expect(area('home-input-mode').textContent).toBe('세부 입력');
  });

  it('동반자 라운드는 모드 라벨이 없다', async () => {
    await openApp({ shots: false });
    await startRound({ players: ['철수'] });
    await menuTap('go-home');
    await screen.findByText('새 라운드');
    expect(area('home-active-round')).toBeTruthy();
    expect(area('home-input-mode')).toBeNull();
  });
});

describe('입력 모드가 없는 예전 라운드 · 백업 — 세부 입력으로', () => {
  it('모드 값이 없는 진행 중 라운드는 세부 입력 화면(벌타 · 샷 기록 · 코스맵)으로 열리고 홈 라벨도 세부 입력이다', async () => {
    await openApp({ shots: false });
    await startRound({ mode: 'simple' });
    // 이 기능이 생기기 전에 시작한 라운드처럼 — 모드 값을 지운다
    const { round } = await stored(0);
    delete round.inputMode;
    await getDb().saveActiveRound(getUser().userId, round);

    await reopenApp();
    expect(area('penalty-input')).toBeTruthy();
    expect(area('shot-entry')).toBeTruthy();
    await openMenu();
    expect(menuRoles()).toContain('map-button');
    expect(area('input-mode-change').textContent).toContain('지금: 세부 입력');
    await menuTap('go-home');
    await screen.findByText('새 라운드');
    expect(area('home-input-mode').textContent).toBe('세부 입력');
  });

  it('예전 백업(라운드에 모드 없음 · 설정에 기본 모드 없음)을 가져와도 라운드는 그대로 복원되고, 지금 고른 기본 모드는 지워지지 않는다', async () => {
    const { serializeBackup } = await import('./engine/backupStatus.js');
    await openApp({ shots: false });
    await startRound({ mode: 'simple' });
    await waitFor(async () => expect((await prefs()).defaultInputMode).toBe('simple'));
    await menuTap('quit-round');
    fireEvent.click(screen.getByText('삭제하고 나가기'));
    await screen.findByText('새 라운드');

    // 기능이 생기기 전의 1인 18홀 라운드 하나 (inputMode 없음)
    const holes = Array.from({ length: 18 }, (_, i) => ({ holeNumber: i + 1, par: 4, scores: { [ME]: { strokes: 5, putts: 2, touched: true, confirmed: true } } }));
    const old = { id: 'old-1', date: '2026-05-01T03:00:00.000Z', courseName: '예전CC', players: [ME], pars: Array(18).fill(4), holes, completed: true };
    const file = new File([serializeBackup({ version: '1.0', userId: 'someone', data: { rounds: [old], clubs: [], prefs: { unit: 'm' } } })], 'backup.json', { type: 'application/json' });

    fireEvent.click(area('open-settings'));
    await waitFor(() => expect(document.querySelector('[data-role="settings-view"] input[type="file"]')).toBeTruthy());
    fireEvent.change(document.querySelector('[data-role="settings-view"] input[type="file"]'), { target: { files: [file] } });
    await waitFor(async () => expect(await getDb().loadRoundsByUser([getUser().userId])).toHaveLength(1));
    const [restored] = await getDb().loadRoundsByUser([getUser().userId]);
    expect('inputMode' in restored).toBe(false);                            // 값을 지어 넣지 않는다 — 읽을 때 세부 입력으로 본다
    expect(restored.holes.map((h) => h.scores[ME].strokes)).toEqual(Array(18).fill(5));
    expect(await prefs()).toEqual({ unit: 'm', defaultInputMode: 'simple' });
  });

  it('간단 입력 라운드를 백업했다가 가져오면 모드가 그대로 남는다 (백업 형식 버전은 그대로)', async () => {
    const { serializeBackup, BACKUP_FORMAT_VERSION } = await import('./engine/backupStatus.js');
    await openApp({ shots: false });
    await startRound({ mode: 'simple' });
    for (let i = 0; i < 17; i++) { await tap(area('next-hole')); await tap(find('파로 기록하고 다음 홀')[0]); await waitForHole(i + 2); }
    await enterScore(4, 2);
    await tap(area('finish-round'));
    await waitFor(() => expect(text()).toContain('라운드 리포트'), { timeout: 8000 });
    expect(BACKUP_FORMAT_VERSION).toBe('1.1');

    const exported = await getDb().exportUserData(getUser());
    expect(exported.data.rounds[0].inputMode).toBe('simple');
    expect(exported.data.prefs.defaultInputMode).toBe('simple');
    const parsed = JSON.parse(serializeBackup(exported));
    expect(parsed.version).toBe('1.1');

    // 다른 기기(새 사용자)에서 가져온다
    cleanup();
    await openApp({ shots: false });
    await getDb().importUserData(getUser().userId, parsed, [getUser().userId]);
    const [r] = await getDb().loadRoundsByUser([getUser().userId]);
    expect(r.inputMode).toBe('simple');
    expect((await prefs()).defaultInputMode).toBe('simple');
  });
});
