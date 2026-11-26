// 라운드 도중 휴대폰 브라우저가 새로고침되거나 꺼졌다 켜져도 입력한 것이 남아 있고, 홈에서 "이어서"로 돌아온다.
// (진짜 브라우저 저장소 IndexedDB 에 저장되는지는 jsdom 테스트로는 볼 수 없다)
import { test, expect, COURSE, role, tap, login, startRound, playHole, enterHole, expectHole, waitSaved } from './kit.js';

const FIRST3 = [{ strokes: 4, putts: 2 }, { strokes: 5, putts: 2 }, { strokes: 6, putts: 3 }];

test('3홀을 넣고 새로고침 → 홈에 "진행 중인 라운드" → 이어서 → 4번 홀, 앞 3홀 스코어 그대로', async ({ page }) => {
  await login(page);
  await startRound(page);
  for (let i = 0; i < 3; i++) await playHole(page, i + 1, FIRST3[i]);
  await expect(role(page, 'running-total')).toHaveText('15(+3)');

  await waitSaved(page);
  await page.reload();

  // 이름을 다시 묻지 않고 홈이 열린다. 맨 위 주인공은 "이어서"
  await expect(role(page, 'home-greeting')).toContainText('이어서');
  const active = role(page, 'home-active-round');
  await expect(active).toContainText(COURSE);
  await expect(active).toContainText('4번 홀 진행 중');
  await tap(role(page, 'home-resume'));

  await expectHole(page, 4);
  await expect(role(page, 'progress-count')).toHaveText('3/18홀');
  await expect(role(page, 'running-total')).toHaveText('15(+3)');
  const holeScores = role(page, 'nav-score').getByRole('button');
  await expect(holeScores.nth(0)).toHaveText('4');
  await expect(holeScores.nth(1)).toHaveText('5');
  await expect(holeScores.nth(2)).toHaveText('6');
});

test('"다음 홀"을 누르기 전에 새로고침돼도 그 홀에 넣던 스코어 · 퍼팅이 남아 있다', async ({ page }) => {
  await login(page);
  await startRound(page);
  await playHole(page, 1, FIRST3[0]);
  await enterHole(page, { strokes: 7, putts: 3 });   // 2번 홀: 7타 3퍼트 — 아직 "다음 홀"을 안 눌렀다

  await waitSaved(page);
  await page.reload();
  await tap(role(page, 'home-resume'));

  await expectHole(page, 2);
  await expect(role(page, 'score-value')).toHaveText('7');
  await expect(role(page, 'putts-3')).toHaveAttribute('aria-pressed', 'true');
});

test('브라우저 탭을 닫았다가 새 탭으로 다시 열어도 이어서 할 수 있다', async ({ page, context }) => {
  await login(page);
  await startRound(page);
  await playHole(page, 1, FIRST3[0]);
  await waitSaved(page);
  await page.close();

  const again = await context.newPage();
  await again.goto('./');
  await tap(role(again, 'home-resume'));
  await expectHole(again, 2);
  await expect(role(again, 'running-total')).toHaveText('4(E)');
});
