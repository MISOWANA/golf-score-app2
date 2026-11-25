// 손가락 동작 — 거리 칸(슬라이더 · 숫자 칸) 위에서 세로로 쓸면 화면만 스크롤되고 거리는 비어 있어야 한다.
//
// 2026-11-04 사고: 테스트는 전부 초록이었는데, 진짜 휴대폰에서는 스크롤하려고 슬라이더를 스치기만 해도 거리가 저장됐다.
// 크롬은 슬라이더에 손가락이 닿는 순간 값을 바꿔 버리는데, jsdom 은 이 순서를 만들지 못한다. 그래서 여기서 진짜 크롬으로 본다.
import { test, expect, role, tap, login, startRound, swipe, fingerTap, waitScrollStill } from './kit.js';

// 새 라운드 → 샷 기록 열기 → 티샷 DRIVER → 필드샷 탭. 세컨샷 거리 칸은 비어 있다.
async function openFieldShot(page) {
  await login(page);
  await startRound(page);
  await tap(role(page, 'shot-toggle'));
  await tap(page.getByRole('button', { name: 'DRIVER', exact: true }));
  await tap(page.getByRole('button', { name: /^필드샷 입력하기/ }));
  await expect(role(page, 'shot-tab-field')).toHaveAttribute('aria-selected', 'true');
  const field = role(page, 'second-surface').locator('..');
  const slider = field.locator('[data-role="dist-slider"]');
  const number = field.locator('[data-role="dist-value"]');
  await expect(slider).toHaveAttribute('data-empty', '1');
  // 슬라이더를 화면 가운데로 — 위아래 어느 쪽으로든 스크롤할 여유가 있게
  await slider.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await waitScrollStill(page);
  return { slider, number };
}

const centerOf = async (loc, fx = 0.5) => {
  const b = await loc.boundingBox();
  return { x: b.x + b.width * fx, y: b.y + b.height / 2 };
};

test('슬라이더 위에서 세로로 쓸어 올리면 화면만 내려가고, 거리는 비어 있다', async ({ page }) => {
  const { slider, number } = await openFieldShot(page);
  const before = await page.evaluate(() => window.scrollY);
  const p = await centerOf(slider, 0.7);
  await swipe(page, p, { x: p.x + 4, y: p.y - 220 });
  const after = await waitScrollStill(page);

  expect(after - before, '화면이 스크롤돼야 한다').toBeGreaterThan(60);
  await expect(slider).toHaveAttribute('data-empty', '1');
  await expect(number).not.toContainText(/\d/);                       // 숫자 대신 "미입력" 모양 그대로
});

test('슬라이더 위에서 세로로 쓸어 내려도(화면 올리기) 거리는 비어 있다', async ({ page }) => {
  const { slider } = await openFieldShot(page);
  const p = await centerOf(slider, 0.3);
  await swipe(page, p, { x: p.x - 4, y: p.y + 200 });
  await waitScrollStill(page);
  await expect(slider).toHaveAttribute('data-empty', '1');
});

test('슬라이더를 가로로 끌면 거리가 들어가고, 끈 방향으로 커진다', async ({ page }) => {
  const { slider, number } = await openFieldShot(page);
  const from = await centerOf(slider, 0.25);
  const to = await centerOf(slider, 0.75);
  await swipe(page, from, to);

  await expect(slider).toHaveAttribute('data-empty', '0');
  const first = Number(await slider.inputValue());
  expect(first).toBeGreaterThan(0);
  await expect(number).toContainText(String(first));                  // 숫자 칸에도 같은 값

  // 왼쪽으로 조금 되돌리면 줄어든다
  const now = await centerOf(slider, 0.75);
  await swipe(page, now, { x: now.x - 60, y: now.y });
  await expect.poll(async () => Number(await slider.inputValue())).toBeLessThan(first);
});

test('슬라이더를 톡 치면 친 자리의 거리가 들어간다', async ({ page }) => {
  const { slider, number } = await openFieldShot(page);
  await fingerTap(page, await centerOf(slider, 0.6));
  await expect(slider).toHaveAttribute('data-empty', '0');
  await expect(number).toContainText(String(await slider.inputValue()));
});

test('숫자 칸 위에서 세로로 쓸어도 거리는 비어 있고, 가로로 밀면 들어간다', async ({ page }) => {
  const { slider, number } = await openFieldShot(page);
  const p = await centerOf(number);
  await swipe(page, p, { x: p.x + 3, y: p.y - 180 });
  await waitScrollStill(page);
  await expect(slider).toHaveAttribute('data-empty', '1');

  await number.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await waitScrollStill(page);
  const q = await centerOf(number, 0.3);
  await swipe(page, q, { x: q.x + 80, y: q.y });
  await expect(slider).toHaveAttribute('data-empty', '0');
});
