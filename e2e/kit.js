// 실제 브라우저 테스트 도구 — 사용자가 누르는 순서 그대로 손가락으로 누르고, 화면에 보이는 것을 확인한다.
// (src/test/flowKit.jsx 의 jsdom 판과 같은 생각: 중간 상태를 데이터로 만들어 놓지 않고, 늘 처음 화면부터 시작한다)
import { test as base, expect } from '@playwright/test';

export { expect };

// ─── 모든 테스트에 붙는 검사: 콘솔 오류 · 화면 오류 · 보안 규칙(CSP) 위반이 하나라도 나면 실패 ───────────────
// 사용자 눈에는 안 보여도, 이게 나면 어딘가 기능이 조용히 멈춘 것이다.
// 일부러 오류를 내 보는 테스트는 test.use({ allowProblems: [/정규식/] }) 로 그 오류만 빼고 본다.
export const test = base.extend({
  allowProblems: [[], { option: true }],
  page: async ({ page, context, allowProblems }, use, testInfo) => {
    const problems = [];
    const watch = (p) => {
      p.on('pageerror', (err) => problems.push(`화면 오류: ${err.message}`));
      p.on('console', (msg) => { if (msg.type() === 'error') problems.push(`콘솔 오류: ${msg.text()}`); });
    };
    // 보안 규칙에 막힌 것 — 브라우저가 콘솔에도 남기지만, 무엇이 막혔는지 이름을 또렷하게 남긴다
    await context.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (e) => {
        console.error(`보안 규칙(CSP) 위반: ${e.violatedDirective} ← ${e.blockedURI || '(인라인)'}`);
      });
    });
    watch(page);
    context.on('page', watch);   // 테스트 안에서 새 탭을 열어도 같이 본다
    await use(page);
    if (testInfo.status === testInfo.expectedStatus) {
      const left = problems.filter((p) => !allowProblems.some((re) => re.test(p)));
      expect(left, '테스트하는 동안 오류가 없어야 한다').toEqual([]);
    }
  },
});

export const ME = '테스터';
export const COURSE = '실브라우저CC';

export const role = (page, name) => page.locator(`[data-role="${name}"]`);

// 손가락으로 누른다 (휴대폰 모드라 마우스 클릭이 아니라 터치로 들어간다)
export async function tap(locator) {
  await locator.tap();
}

// ─── 화면 읽기 ─────────────────────────────────────────────────────────────────
export async function expectHole(page, n) {
  await expect(role(page, 'hole-no')).toHaveText(`${n}번 홀`);
}
export async function scoreNow(page) {
  return Number((await role(page, 'score-value').textContent()).trim());
}
// 아래 탭(홈 · 히스토리 · 스탯 · 인사이트 · 마이백)
export async function goTab(page, label) {
  await tap(page.getByRole('button', { name: label, exact: true }).last());
}

// ─── 처음 쓰는 사람: 이름을 넣고 시작한다 ──────────────────────────────────────────────
export async function login(page, name = ME) {
  await page.goto('./');
  await page.getByPlaceholder('플레이어 이름을 입력하세요').fill(name);
  await tap(page.getByRole('button', { name: '시작하기', exact: true }));
  await expect(role(page, 'user-name')).toHaveText(name);
}

// 홈 → 새 라운드 → 코스 이름 · 화이트 티 → 라운드 시작하기 → 1번 홀
export async function startRound(page, course = COURSE) {
  await tap(role(page, 'home-new-round').getByRole('button', { name: /시작하기/ }));
  await page.getByPlaceholder('골프장 이름 검색...').fill(course);
  await tap(page.getByRole('button', { name: '화이트', exact: true }));
  await tap(page.getByRole('button', { name: '라운드 시작하기' }));
  await expectHole(page, 1);
}

// 지금 홀의 스코어 · 퍼팅을 넣는다 (기본 모습: 스코어 · 퍼팅만). 다음 홀로 넘기지는 않는다.
export async function enterHole(page, { strokes, putts }) {
  await tap(role(page, `putts-${putts}`));
  for (let guard = 0; guard < 12; guard++) {
    const now = await scoreNow(page);
    if (now === strokes) break;
    await tap(role(page, now < strokes ? 'score-plus' : 'score-minus'));
    await expect(role(page, 'score-value')).not.toHaveText(String(now));
  }
  await expect(role(page, 'score-value')).toHaveText(String(strokes));
  await expect(role(page, `putts-${putts}`)).toHaveAttribute('aria-pressed', 'true');
}

// 지금 홀을 넣고 "다음 홀" → 다음 홀이 열릴 때까지
export async function playHole(page, hole, score) {
  await enterHole(page, score);
  await tap(role(page, 'next-hole'));
  await expectHole(page, hole + 1);
}

// 18홀 동안 칠 스코어 — 파 4 · 보기 5 · 더블 6 이 번갈아 나온다 (합계 90타 · 퍼팅 42개)
export const ROUND = Array.from({ length: 18 }, (_, i) => ({ strokes: 4 + (i % 3), putts: i % 3 === 2 ? 3 : 2 }));
export const ROUND_TOTAL = ROUND.reduce((s, h) => s + h.strokes, 0);
export const ROUND_PUTTS = ROUND.reduce((s, h) => s + h.putts, 0);

// 18홀을 다 넣고 "라운드 완료" → 라운드 리포트가 열릴 때까지
export async function playFullRound(page) {
  for (let i = 0; i < 17; i++) await playHole(page, i + 1, ROUND[i]);
  await enterHole(page, ROUND[17]);
  await tap(role(page, 'finish-round'));
  await expect(page.getByText('라운드 리포트', { exact: true })).toBeVisible();
}

// ─── 손가락 동작 ──────────────────────────────────────────────────────────────────
// 실제 휴대폰처럼 손가락을 대고(touchStart) 조금씩 움직이고(touchMove) 뗀다(touchEnd).
// Playwright 의 tap() 은 제자리 탭만 하므로, 끌기 · 스크롤은 크롬의 터치 입력(CDP)을 직접 쓴다.
export async function swipe(page, from, to, { steps = 14 } = {}) {
  const cdp = await page.context().newCDPSession(page);
  const at = (p) => [{ x: p.x, y: p.y, id: 1, radiusX: 6, radiusY: 6, force: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(from) });
  for (let i = 1; i <= steps; i++) {
    const p = { x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(p) });
    await page.waitForTimeout(16);   // 손가락 속도 — 한 화면(60fps)마다 한 번 움직인다
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}
export async function fingerTap(page, p) { await swipe(page, p, p, { steps: 1 }); }

// 화면이 저절로 움직이던 것(다음 칸으로 부드럽게 내려가기 등)이 멈출 때까지
export async function waitScrollStill(page) {
  let last = null;
  for (let i = 0; i < 40; i++) {
    const y = await page.evaluate(() => window.scrollY);
    if (y === last) return y;
    last = y;
    await page.waitForTimeout(150);
  }
  return last;
}

// ─── 화면 점검: 옆으로 넘치는 것 · 너무 작은 글자 ─────────────────────────────────────────────
// 야외 사용성 기준 — 글자는 12px 이상, 화면은 옆으로 밀리지 않는다 (320px 아이폰 SE 에서도).
// 옆으로 스크롤하게 만든 줄(탭 줄 · 표)의 안쪽은 넘쳐도 된다. 처음 넘친 것만 적는다 (그 안쪽 것은 적지 않는다).
export async function layoutProblems(page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const out = [];
    const sw = document.documentElement.scrollWidth;
    if (sw > vw + 1) out.push(`화면이 옆으로 밀린다 (내용 폭 ${sw}px > 화면 ${vw}px)`);
    const name = (el) => {
      const t = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24);
      return `${el.tagName.toLowerCase()}${el.dataset?.role ? `[${el.dataset.role}]` : ''} "${t}"`;
    };
    const clippedByParent = (el) => {
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        if (getComputedStyle(a).overflowX !== 'visible') return true;
      }
      return false;
    };
    const flagged = new Set();
    for (const el of document.body.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      // 옆으로 넘침
      if ((r.right > vw + 1 || r.left < -1) && !clippedByParent(el)) {
        let a = el.parentElement;
        while (a && !flagged.has(a)) a = a.parentElement;
        if (!a) { flagged.add(el); out.push(`화면 밖으로 나감: ${name(el)} (${Math.round(r.left)}~${Math.round(r.right)}px)`); }
      }
      // 작은 글자 — 글자를 직접 가진 요소만 본다
      const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (ownText && el.namespaceURI === 'http://www.w3.org/1999/xhtml' && parseFloat(cs.fontSize) < 12) {
        out.push(`글자가 12px 보다 작다: ${name(el)} (${cs.fontSize})`);
      }
    }
    return out;
  });
}
export async function expectTidy(page, screenName) {
  expect.soft(await layoutProblems(page), `${screenName} 화면`).toEqual([]);
}
