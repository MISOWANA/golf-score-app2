// 간단 입력(스코어 · 퍼팅만)으로 18홀 — 진짜 크롬 휴대폰 화면(390 · 320)에서 처음 쓰는 사람이 끝까지 친다.
// 중간에 새로고침해도 간단 입력으로 이어지고, 결과는 리포트 · 홈 · 히스토리에서 같은 숫자로 보인다.
// 좁은 화면(320)에서도 돌아 — 새 라운드의 모드 카드 · 간단 입력 화면 · 모드 바꾸기 시트가 넘치지 않는지 함께 본다.
import { test, expect, COURSE, role, tap, login, playHole, enterHole, expectHole, goTab, waitSaved, expectTidy, ROUND, ROUND_TOTAL, ROUND_PUTTS } from './kit.js';

const PAR = 72;
const DIFF = `+${ROUND_TOTAL - PAR}`;
const sum = (list) => list.reduce((s, h) => s + h.strokes, 0);
const textOf = { useInnerText: true };   // 칸 사이를 띄어 읽는다

test('간단 입력 — 모드를 골라 18홀 · 새로고침 후 이어서도 간단 입력 · 리포트 · 홈 · 히스토리가 같은 숫자', async ({ page }) => {
  await login(page);

  // ── 새 라운드: 처음에는 모드가 골라져 있지 않아 시작이 막힌다 ──
  await tap(role(page, 'home-new-round').getByRole('button', { name: /시작하기/ }));
  await page.getByPlaceholder('골프장 이름 검색...').fill(COURSE);
  await tap(page.getByRole('button', { name: '화이트', exact: true }));
  await expect(role(page, 'start-blockers')).toHaveText('입력 모드를 골라 주세요');
  await expect(role(page, 'start-round')).toBeDisabled();
  await role(page, 'input-mode').scrollIntoViewIfNeeded();
  await expectTidy(page, '새 라운드 · 입력 모드 고르기 전');
  await tap(role(page, 'input-mode-simple'));
  await expect(role(page, 'input-mode-simple')).toHaveAttribute('aria-checked', 'true');
  await expect(role(page, 'start-blockers')).toHaveCount(0);
  await expectTidy(page, '새 라운드 · 간단 입력 고름');
  // 모드 카드 · 시작 버튼은 손가락으로 누르기 충분히 크다 (44px 이상)
  for (const r of ['input-mode-simple', 'input-mode-detailed', 'start-round']) {
    expect((await role(page, r).boundingBox()).height, r).toBeGreaterThanOrEqual(44);
  }
  await tap(page.getByRole('button', { name: '라운드 시작하기' }));
  await expectHole(page, 1);

  // ── 간단 입력 화면: 스코어 · 퍼팅만 ──
  await expect(role(page, 'score-input')).toBeVisible();
  await expect(role(page, 'putts-input')).toBeVisible();
  await expect(role(page, 'penalty-input')).toHaveCount(0);
  await expect(role(page, 'shot-entry')).toHaveCount(0);
  await expect(page.getByRole('tab')).toHaveCount(0);
  await expectTidy(page, '간단 입력 스코어 화면');

  // ☰ 메뉴: 코스맵 없음 · 입력 모드 바꾸기 있음 → 시트를 열어 보고 취소
  await tap(role(page, 'menu-button'));
  await expect(role(page, 'map-button')).toHaveCount(0);
  await expect(role(page, 'input-mode-change')).toContainText('지금: 간단 입력');
  await expectTidy(page, '간단 입력 ☰ 메뉴');
  await tap(role(page, 'input-mode-change'));
  await expect(role(page, 'mode-sheet-title')).toHaveText('세부 입력으로 바꿀까요?');
  await expectTidy(page, '입력 모드 바꾸기 시트');
  await tap(role(page, 'mode-sheet-cancel'));
  await expect(role(page, 'mode-sheet')).toHaveCount(0);

  // ── 9홀을 넣고 새로고침 → 이어서 → 10번 홀, 여전히 간단 입력 ──
  for (let i = 0; i < 9; i++) await playHole(page, i + 1, ROUND[i]);
  const front = ROUND.slice(0, 9);
  await expect(role(page, 'running-total')).toHaveText(`${sum(front)}(+${sum(front) - 36})`);
  await waitSaved(page);
  await page.reload();
  const active = role(page, 'home-active-round');
  await expect(active).toContainText('10번 홀 진행 중');
  await expect(role(page, 'home-input-mode')).toHaveText('간단 입력');
  await expectTidy(page, '진행 중인 라운드가 있는 홈 (간단 입력 라벨)');
  await tap(role(page, 'home-resume'));
  await expectHole(page, 10);
  await expect(role(page, 'progress-count')).toHaveText('9/18홀');
  await expect(role(page, 'penalty-input')).toHaveCount(0);
  await expect(role(page, 'shot-entry')).toHaveCount(0);

  // ── 나머지 9홀 → 라운드 완료 ──
  for (let i = 9; i < 17; i++) await playHole(page, i + 1, ROUND[i]);
  await enterHole(page, ROUND[17]);
  await tap(role(page, 'finish-round'));

  // ── 라운드 리포트 ──
  await expect(page.getByText('라운드 리포트', { exact: true })).toBeVisible();
  const body = page.locator('body');
  await expect(body).toContainText(`${ROUND_TOTAL}타 (${DIFF})`, textOf);
  await expect(body).toContainText(`전반 9홀 ${sum(front)}`, textOf);
  await expect(body).toContainText(`후반 9홀 ${sum(ROUND.slice(9))}`, textOf);
  await expect(body).toContainText(`스코어 ${front.map((h) => h.strokes).join(' ')} ${sum(front)} (+${sum(front) - 36})`, textOf);
  await expect(body).toContainText(`퍼트 ${front.map((h) => h.putts).join(' ')}`, textOf);
  await expect(body).toContainText(`Score ${ROUND_TOTAL} (${DIFF}) Putts ${ROUND_PUTTS}`, textOf);

  // ── 홈: 평균 스코어 · 최근 라운드 ──
  await goTab(page, '홈');
  await expect(role(page, 'home-active-round')).toHaveCount(0);
  await expect(role(page, 'home-stats')).toContainText('누적 라운드 1회', textOf);
  await expect(role(page, 'home-stats')).toContainText(`평균 스코어 ${ROUND_TOTAL}.0타`, textOf);
  await expect(page.getByRole('button').filter({ hasText: COURSE })).toContainText(`${ROUND_TOTAL} ${DIFF}`, textOf);

  // ── 히스토리 ──
  await goTab(page, '히스토리');
  const card = page.getByRole('button').filter({ hasText: COURSE });
  await expect(card).toHaveCount(1);
  await expect(card).toContainText(`${ROUND_TOTAL} ${DIFF}`, textOf);

  // ── 다음 새 라운드에는 간단 입력이 미리 골라져 있다 (모드를 누르지 않고 바로 시작된다) ──
  await goTab(page, '홈');
  await tap(role(page, 'home-new-round').getByRole('button', { name: /시작하기/ }));
  await page.getByPlaceholder('골프장 이름 검색...').fill('두번째CC');
  await tap(page.getByRole('button', { name: '화이트', exact: true }));
  await expect(role(page, 'input-mode-simple')).toHaveAttribute('aria-checked', 'true');
  await expect(role(page, 'start-blockers')).toHaveCount(0);
  await tap(page.getByRole('button', { name: '라운드 시작하기' }));
  await expectHole(page, 1);
  await expect(role(page, 'penalty-input')).toHaveCount(0);
});
