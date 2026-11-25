// 좁은 화면 점검 — 390px(아이폰 13~16)과 320px(아이폰 SE) 두 크기에서 화면을 하나씩 열어,
// 옆으로 넘치는 것이 없고 글자가 12px 보다 작지 않은지 본다 (야외 사용성 기준).
// 한 화면에서 문제가 나와도 멈추지 않고 끝까지 돌아, 어느 화면의 무엇인지 한 번에 다 적는다.
import { test, expect, role, tap, login, startRound, playFullRound, goTab, expectTidy, layoutProblems } from './kit.js';

// 탭 줄(스탯 영역 · 인사이트 장 · 마이백 보기)의 탭을 하나씩 눌러 가며 점검한다
async function eachTab(page, prefix, screenName) {
  const tabs = page.locator(`[data-role^="${prefix}-"][role="tab"]`);
  const n = await tabs.count();
  expect(n, `${screenName} 탭 수`).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) {
    const t = tabs.nth(i);
    if (await t.isDisabled()) continue;
    const label = (await t.innerText()).trim();
    await tap(t);
    await expect(t).toHaveAttribute('aria-selected', 'true');
    await expectTidy(page, `${screenName} · ${label}`);
  }
}

// 점검 도구부터 믿을 수 있어야 한다 — 일부러 넘치는 칸과 작은 글자를 넣으면 잡아낸다
test('점검 도구가 옆으로 넘치는 칸과 작은 글자를 실제로 잡아낸다', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByPlaceholder('플레이어 이름을 입력하세요')).toBeVisible();
  expect(await layoutProblems(page)).toEqual([]);
  await page.evaluate(() => {
    document.body.insertAdjacentHTML('beforeend',
      '<div data-role="too-wide" style="width:600px">넓은 칸</div><span data-role="too-small" style="font-size:10px">작은 글자</span>');
  });
  const found = (await layoutProblems(page)).join('\n');
  expect(found).toContain('화면이 옆으로 밀린다');
  expect(found).toContain('[too-wide]');
  expect(found).toContain('[too-small]');
});

test('처음 화면들 — 로그인 · 첫 홈 · 새 라운드 · 스코어 입력 · 벌타 · ☰ 메뉴 · 진행 중 홈', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByPlaceholder('플레이어 이름을 입력하세요')).toBeVisible();
  await expectTidy(page, '로그인');

  await login(page);
  await expectTidy(page, '첫 홈');

  await tap(role(page, 'home-new-round').getByRole('button', { name: /시작하기/ }));
  await expect(page.getByPlaceholder('골프장 이름 검색...')).toBeVisible();
  await expectTidy(page, '새 라운드 설정');
  await page.goto('./');                                       // 홈으로 (startRound 가 홈에서 시작한다)

  await startRound(page);
  await expectTidy(page, '스코어 입력');

  await tap(role(page, 'penalty-toggle'));
  await expect(role(page, 'penalty-panel')).toBeVisible();
  await expectTidy(page, '스코어 입력 · 벌타 열림');

  await tap(role(page, 'menu-button'));
  await expect(role(page, 'scoring-menu')).toBeVisible();
  await expectTidy(page, '☰ 메뉴');
  await tap(role(page, 'go-home'));

  await expect(role(page, 'home-resume')).toBeVisible();
  await expectTidy(page, '진행 중인 라운드가 있는 홈');
});

test('샷 기록 화면들 — 티샷 · 필드샷 · 퍼팅', async ({ page }) => {
  await login(page);
  await startRound(page);
  await tap(role(page, 'shot-toggle'));
  await expect(role(page, 'shot-tab-tee')).toHaveAttribute('aria-selected', 'true');
  await expectTidy(page, '샷 기록 · 티샷');

  await tap(page.getByRole('button', { name: 'DRIVER', exact: true }));
  await tap(page.getByRole('button', { name: /^필드샷 입력하기/ }));
  await expect(role(page, 'shot-tab-field')).toHaveAttribute('aria-selected', 'true');
  await expectTidy(page, '샷 기록 · 필드샷');

  await tap(role(page, 'second-result-on'));
  await expect(role(page, 'shot-tab-putt')).toHaveAttribute('aria-selected', 'true');
  await expectTidy(page, '샷 기록 · 퍼팅');
});

test('라운드를 끝낸 뒤 화면들 — 리포트 · 홈 · 히스토리 · 스탯 · 인사이트 · 마이백 · 설정', async ({ page }) => {
  await login(page);
  await startRound(page);
  await playFullRound(page);
  await expectTidy(page, '라운드 리포트');

  await goTab(page, '홈');
  await expect(role(page, 'home-stats')).toBeVisible();
  await expectTidy(page, '라운드 1개가 있는 홈');

  await goTab(page, '히스토리');
  await expectTidy(page, '히스토리');

  await goTab(page, '스탯');
  await eachTab(page, 'stats-tab', '스탯');

  await goTab(page, '인사이트');
  await expect(page.locator('[data-role^="insights-"][role="tab"]').first()).toBeVisible();
  await eachTab(page, 'insights-tab', '인사이트');

  // 마이백 — 아직 클럽을 등록하지 않았으면 탭 대신 "내 클럽 등록" 화면이 먼저 나온다
  await goTab(page, '마이백');
  await expect(page.getByText('내 클럽 등록', { exact: true })).toBeVisible();
  await expectTidy(page, '마이백 · 내 클럽 등록');

  await goTab(page, '홈');
  await tap(role(page, 'open-settings'));
  await expect(page.getByText('설정', { exact: true }).first()).toBeVisible();
  await expectTidy(page, '설정');
});
