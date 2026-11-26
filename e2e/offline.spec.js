// 골프장은 전파가 약하다 — 한 번 열어 둔 앱은 인터넷이 끊겨도 열리고, 라운드를 기록할 수 있어야 한다 (PWA).
// 서비스 워커(앱을 휴대폰에 저장해 두는 장치)가 실제로 일하는지는 진짜 브라우저에서만 볼 수 있다.
import { test, expect, role, tap, login, startRound, playHole, expectHole, waitSaved } from './kit.js';

test.use({
  serviceWorkers: 'allow',
  // 인터넷이 끊긴 동안 브라우저가 남기는 "불러오지 못했다" 메시지는 오류로 보지 않는다
  allowProblems: [/ERR_INTERNET_DISCONNECTED|Failed to fetch|net::ERR_/],
});

test('한 번 열어 둔 앱은 인터넷이 끊긴 뒤 새로고침해도 열리고, 라운드를 시작해 기록할 수 있다', async ({ page, context }) => {
  await login(page);
  // 서비스 워커가 앱 파일을 다 받아 두고 이 화면을 맡을 때까지 기다린다
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }));
    }
  });

  await context.setOffline(true);
  await page.reload();

  await expect(role(page, 'user-name')).toBeVisible();          // 인터넷 없이 홈이 열린다
  await startRound(page);
  await playHole(page, 1, { strokes: 5, putts: 2 });
  await expectHole(page, 2);
  await expect(role(page, 'running-total')).toHaveText('5(+1)');

  // 인터넷이 끊긴 채로 다시 새로고침해도 기록이 남아 있다
  await waitSaved(page);
  await page.reload();
  await tap(role(page, 'home-resume'));
  await expectHole(page, 2);
  await expect(role(page, 'running-total')).toHaveText('5(+1)');
  await context.setOffline(false);
});
