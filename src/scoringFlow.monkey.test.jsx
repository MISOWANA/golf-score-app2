// @vitest-environment jsdom
// 스코어 상세 입력 — 아무 버튼이나 무작위 순서로 계속 눌러 본다 ("몽키").
// 사람이 미리 생각하지 못한 누름 순서에서도 ① 화면이 깨지지 않고(오류 화면 · NaN · undefined 없음)
// ② 윗칸 · 퍼팅 카드 · 홀 표의 숫자가 서로 어긋나지 않고(audit) ③ 콘솔에 에러가 없는지 본다.
// 시드를 고정해 같은 순서가 재현된다 — 실패하면 메시지 끝에 직전 50번의 누름이 나온다.
import { describe, it, expect, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import { tap, buttons, labelOf, audit, settle, text, newHole, setPar, installHooks, SETTINGS, scoreNow, puttsPicked, puttCards, holeHeader, currentTab, tabInfo, stored } from './test/flowKit.jsx';

vi.setConfig({ testTimeout: 120000 });
installHooks();

// mulberry32 — 시드가 같으면 같은 수열
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// 눌러도 되는 것만: 이 화면을 떠나거나(홈 · 뒤로 · 완료 · 나가기) 2.5초 연출을 거치는 것(홀인 · 칩인)은 따로 테스트한다
const SKIP = /^(홈|뒤로|완료|라운드 완료|삭제하고 나가기|삭제하고 세팅 다시하기|기록 유지하고 홈으로|그대로 완료|9홀로 완료|홀인 성공|✓ 홀인 성공|칩인|홀인원|취소 \(잘못 눌렀어요\)|저장)$/;
const SKIP_ROLES = new Set(['putt-primary', 'putt-board-hole', 'round-edit']);

// 입력 영역의 버튼에 무게를 둔다 — 홀 표 칸(36개)이 후보의 대부분이라 그대로 두면 입력 버튼은 거의 안 눌린다.
// 탭 · 성공/실패 · 다음 퍼트처럼 상태를 깊게 끌고 가는 버튼은 무게를 더 준다.
const DEEP = /^(필드샷|퍼팅|티샷|성공|실패|PUTT \d+ →|그린 밖으로 나갔어요|DRIVER|WOOD|HYBRID|IRON|WEDGE)/;
// 창(어두운 막이 화면 전체를 덮는 것)이 열려 있으면 사람은 창 안의 버튼만 누를 수 있다
function openOverlay() {
  return [...document.querySelectorAll('div')].find((d) => d.style.position === 'fixed' && d.style.top === '0px' && d.style.bottom === '0px' && d.style.left === '0px' && d.style.right === '0px');
}
function candidates() {
  const out = [];
  const overlay = openOverlay();
  for (const b of buttons(overlay || document.body)) {
    if (b.disabled) continue;
    const label = labelOf(b);
    const role = b.getAttribute('data-role') || '';
    if (SKIP.test(label) || SKIP_ROLES.has(role)) continue;
    if (/탭인 성공|홀인 성공/.test(label)) continue;
    if (b.getAttribute('aria-label') === '홈' || b.getAttribute('aria-label') === '뒤로') continue;
    const inNav = !!b.closest('[data-role="nav-score"], [data-role="nav-putts"]');
    const name = label || role || b.getAttribute('aria-label') || '(이름 없음)';
    const weight = inNav ? 0.04 : (DEEP.test(label) || /^(second-result|putt-next|shot-tab)/.test(role)) ? 4 : (label === '다음 홀' || label === '이전') ? 0.15 : 1;
    out.push({ el: b, name, weight });
  }
  if (!overlay) for (const z of document.querySelectorAll('[data-role="landing-zone"]')) out.push({ el: z, name: `랜딩 ${z.getAttribute('data-hour')}시`, weight: 0.5 });
  return out;
}
const weighted = (list, rand) => {
  const total = list.reduce((a, c) => a + c.weight, 0);
  let r = rand() * total;
  for (const c of list) { r -= c.weight; if (r <= 0) return c; }
  return list[list.length - 1];
};
const sliders = () => [...document.querySelectorAll('[data-role="dist-slider"]')];

// 화면에 보이는 값이 저장소(앱을 꺼도 남는 값)와 같은지 — 다르면 앱을 껐다 켰을 때 입력이 사라진다
async function expectSaved(where) {
  const h = holeHeader();
  await waitFor(async () => {
    const { s } = await stored(h.hole - 1);
    const sc = scoreNow();
    if (sc.n != null) expect(s.strokes, `${where}: 화면 스코어 ${sc.n} 과 저장된 ${s.strokes}`).toBe(sc.n);
    const picked = puttsPicked();
    if (picked != null && !picked.endsWith('+')) expect(s.putts, `${where}: 화면 퍼팅 ${picked} 과 저장된 ${s.putts}`).toBe(Number(picked));
    if (!document.querySelector('[data-role="off-green-chip"]') && puttCards().length) expect(s.putts, `${where}: 퍼팅 카드 ${puttCards().length}개 와 저장된 ${s.putts}`).toBe(puttCards().length);
  }, { timeout: 3000 });
}

// 탭이 잠겨 있으면 그 탭 내용을 보고 있을 수 없다
function expectTabsConsistent(where) {
  const t = tabInfo(); const cur = currentTab();
  if (cur && t[cur]) expect(t[cur].disabled, `${where}: 잠긴 "${cur}" 탭을 보고 있다`).toBe(false);
}

async function monkey({ seed, steps, prefs = null, par = null }) {
  const rand = rng(seed);
  const errors = [];
  const spy = vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a.map(String).join(' ').slice(0, 200)); });
  await newHole(prefs);
  if (par) await setPar(0, par);
  const trail = [];
  const tabs = {};
  try {
    for (let i = 0; i < steps; i++) {
      // 가끔은 거리 슬라이더를 아무 값으로 움직인다
      const sl = openOverlay() ? [] : sliders();
      if (sl.length && rand() < 0.12) {
        const s = sl[Math.floor(rand() * sl.length)];
        const v = Math.round((Number(s.min) + rand() * (Number(s.max) - Number(s.min))) / Number(s.step || 1)) * Number(s.step || 1);
        trail.push(`슬라이더 → ${v}`);
        fireEvent.change(s, { target: { value: String(v) } });
        await settle();
        audit(`몽키 ${i}`);
        continue;
      }
      const board = document.querySelector('[data-role="putt-board"]');
      if (board && !openOverlay() && rand() < 0.15) {
        const k = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'][Math.floor(rand() * 4)];
        trail.push(`판 ${k}`);
        fireEvent.keyDown(board, { key: k });
        await settle();
        audit(`몽키 ${i}: 판 ${k}`);
        continue;
      }
      const list = candidates();
      if (!list.length) break;
      const pick = weighted(list, rand);
      trail.push(pick.name);
      tabs[document.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.replace('✓', '') || '?'] = (tabs[document.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.replace('✓', '') || '?'] || 0) + 1;
      await tap(pick.el, `몽키 ${i}: ${pick.name}`);
      expectTabsConsistent(`몽키 ${i}: ${pick.name}`);
      if (i % 15 === 14) await expectSaved(`몽키 ${i}: ${pick.name}`);
      expect(text(), '오류 화면').not.toContain('화면을 표시하지 못했어요');
      expect(errors, '콘솔 에러').toEqual([]);
    }
  } catch (e) {
    e.message += `\n\n── 직전 누름 (최근 50번) ──\n${trail.slice(-50).map((t, k) => `${trail.length - Math.min(50, trail.length) + k + 1}. ${t}`).join('\n')}`;
    throw e;
  } finally {
    spy.mockRestore();
    if (globalThis.process?.env?.MONKEY_REPORT) {
      const counts = {}; trail.forEach((t) => { counts[t] = (counts[t] || 0) + 1; });
      console.log(`MONKEY seed=${seed} 누름 ${trail.length}번, 서로 다른 버튼 ${Object.keys(counts).length}종`);
      console.log('MONKEY-TABS', JSON.stringify(tabs));
      console.log('MONKEY-BUTTONS', Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}×${v}`).join(' | '));
    }
  }
}

// 평소에는 시드 6개. 버그 사냥은 MONKEY_SEEDS=40 MONKEY_STEPS=500 처럼 늘려서 돌린다.
const SEEDS = Array.from({ length: Number(globalThis.process?.env?.MONKEY_SEEDS || 6) }, (_, i) => i + 1);
const STEPS = Number(globalThis.process?.env?.MONKEY_STEPS || 300);

describe('몽키 — 파4 1번 홀', () => {
  it.each(SEEDS)('시드 %i: 아무거나 눌러도 화면이 깨지지 않고 숫자가 어긋나지 않는다', async (seed) => {
    await monkey({ seed, steps: STEPS });
  });
});

describe('몽키 — 설정별', () => {
  it.each(SETTINGS.slice(1))('%s: 200번', async (_n, prefs) => {
    await monkey({ seed: 11, steps: 200, prefs });
  });
});

describe('몽키 — 파3 · 파5', () => {
  it.each([3, 5])('파%i: 250번', async (par) => {
    await monkey({ seed: 20 + par, steps: 250, par });
  });
});
