// 스코어 상세 입력 — 사용자 흐름 테스트.
//
// 여기 테스트는 "내부 값이 저장됐나"가 아니라 사용자가 한 홀을 입력하는 순서 그대로 버튼을 누르고,
// 그때마다 화면에 무엇이 보이는지(어느 탭이 열렸나 · 어느 퍼팅 카드가 펼쳐졌나 · 어느 칩이 눌린 모양인가 ·
// 스코어가 얼마로 보이나)를 확인한다. 시작은 늘 새 라운드 설정 화면에서 "라운드 시작하기"를 누르는 것부터다
// (중간 상태를 데이터로 미리 만들어 놓지 않는다 — 그러면 진짜 시작 상태에서 생기는 문제를 놓친다).
//
// 모든 누름은 tap() 을 거치고, 누를 때마다 audit() 가 "어느 화면에서나 참이어야 하는 것"을 검사한다.
import 'fake-indexeddb/auto';
import { expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';

export const ME = '테스터';
let db;
let user;

// ─── 앱을 켜고 새 라운드를 시작한다 ───────────────────────────────────────────────
// prefs: 설정 (예: { unit:'yd', firstPutt: 6 }). 처음 쓰는 사람이 아니라 이미 로그인한 사용자.
// shots: 샷 기록 구역을 열어 둔 채로 시작한다 (기본 true — 예전 상세 입력 흐름 테스트가 그대로 돈다). false 면 새 사용자의 기본 모습(스코어 · 퍼팅만).
export async function openApp({ prefs = null, shots = true } = {}) {
  globalThis.indexedDB = new IDBFactory();
  try { localStorage.setItem('bb-shot-detail', shots ? '1' : '0'); } catch { /* 저장소가 없으면 기본(접힘) */ }
  vi.resetModules();
  db = await import('../db.js');
  await db.initDB();
  user = await db.loginByName(ME);
  if (prefs) await db.savePrefs(user.userId, prefs);
  const App = (await import('../GolfScoringApp.jsx')).default;
  render(<App />);
  await screen.findByText('새 라운드');
}

// nine: null(18홀) | 'out' | 'in' · players: 함께 칠 동반자 이름들 (최대 3명)
export async function startRound({ nine = null, players = [] } = {}) {
  fireEvent.click(screen.getByText('시작하기'));
  await screen.findByPlaceholderText('골프장 이름 검색...');
  fireEvent.change(screen.getByPlaceholderText('골프장 이름 검색...'), { target: { value: '흐름CC' } });
  if (nine) fireEvent.click(screen.getByText(nine === 'out' ? '전반 9홀' : '후반 9홀'));
  for (let i = 0; i < players.length; i++) {
    fireEvent.click(screen.getByText('추가'));
    fireEvent.change(await screen.findByPlaceholderText(`플레이어 ${i + 2}`), { target: { value: players[i] } });
  }
  fireEvent.click(screen.getByText('화이트'));
  fireEvent.click(screen.getByText('라운드 시작하기'));
  await screen.findByText(/^1번 홀$/);
}
export const getDb = () => db;
export const getUser = () => user;

export function installHooks() {
  beforeEach(() => {
    window.scrollTo = () => {};
    Element.prototype.scrollIntoView = () => {};
    window.alert = vi.fn();
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });
}

// ─── 화면 읽기 ───────────────────────────────────────────────────────────────────
export const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
export const root = () => document.body;

// 눌린(선택된) 모양인가 — aria-pressed 가 있으면 그것, 없으면 테두리 색이 평소 색(옅은 회색)이 아니면 눌린 것
// (칩은 눌리면 파랑·초록·빨강 테두리로 바뀐다. 평소 테두리는 #d1d6db 계열)
const OFF_BORDERS = ['rgb(209, 214, 219)', 'rgb(229, 232, 235)', 'rgb(217, 221, 226)', 'rgb(205, 211, 216)', 'rgb(176, 184, 193)', 'rgb(242, 244, 246)', 'transparent', 'rgba(0, 0, 0, 0)', ''];
export const looksOn = (b) => {
  if (b.getAttribute('aria-pressed') != null) return b.getAttribute('aria-pressed') === 'true';
  const m = (b.style.border || '').match(/(rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}|transparent)\s*$/);
  const c = (m?.[1] || '').trim();
  return !OFF_BORDERS.includes(c);
};

// 보이는 글자가 label 인 버튼들 (★ · ▲ · ▼ · ✓ 같은 표시는 무시)
export const labelOf = (b) => clean(b.textContent).replace(/[★▲▼✓⛳⭐]/g, '').replace(/\s+/g, ' ').trim();
export function buttons(scope = root()) { return [...scope.querySelectorAll('button')]; }
export function find(label, scope = root()) {
  const want = typeof label === 'string' ? (t) => t === label : (t) => label.test(t);
  return buttons(scope).filter((b) => want(labelOf(b)));
}
export function one(label, scope = root()) {
  const hits = find(label, scope);
  if (hits.length !== 1) {
    const sample = buttons(scope).map(labelOf).filter(Boolean).slice(0, 60).join(' | ');
    throw new Error(`버튼 "${label}" 이(가) ${hits.length}개 — 화면의 버튼: ${sample}`);
  }
  return hits[0];
}
export const area = (role) => document.querySelector(`[data-role="${role}"]`);

// 지금 열려 있는 샷 탭
export function currentTab() {
  const t = [...document.querySelectorAll('[role="tab"]')].find((x) => x.getAttribute('aria-selected') === 'true');
  return t ? clean(t.textContent).replace('✓', '').trim() : null;
}
export function tabInfo() {
  return Object.fromEntries([...document.querySelectorAll('[role="tab"]')].map((t) => [clean(t.textContent).replace('✓', '').trim(), { disabled: t.disabled, done: t.textContent.includes('✓') }]));
}
// 퍼팅 카드 머리글들 → [{ n, open }]
export function puttCards() {
  return [...document.querySelectorAll('[data-role="putt-cards"] button')]
    .filter((b) => /^PUTT \d+$/.test(clean(b.textContent).replace(/[▲▼]/g, '').trim()))
    .map((b) => ({ n: Number(b.textContent.replace(/\D/g, '')), open: b.textContent.includes('▲') }));
}
export const openPutts = () => puttCards().filter((c) => c.open).map((c) => c.n);
// 윗쪽 큰 스코어 칸 — { pending: "온그린까지 3타" 로 보이면 그 타수, n: 숫자로 보이면 그 스코어 }
export function scoreNow() {
  const pend = area('score-pending');
  if (pend) { const m = clean(pend.textContent).match(/온그린까지 (\d+) ?타/); return { pending: m ? Number(m[1]) : null, n: null }; }
  const v = area('score-value');
  return { pending: null, n: v ? Number(clean(v.textContent)) : null };
}
// 윗쪽 퍼팅 줄에서 눌린 모양인 숫자 (0~4) — 없으면 null
export function puttsPicked() {
  const on = [...document.querySelectorAll('[data-role^="putts-"][aria-pressed="true"]')];
  return on.length ? clean(on[0].textContent) : null;
}
// 홀 머리글 (n번 홀 · 파 m 홀이에요)
export function holeHeader() {
  const m = visibleText().match(/(\d+)번 홀 (?:스코어를 알려 주세요 )?파 (\d) 홀이에요/);
  return m ? { hole: Number(m[1]), par: Number(m[2]) } : null;
}

// 화면에 보이는 글자 (스타일·스크립트 글자는 뺀다)
export function visibleText() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (['STYLE', 'SCRIPT'].includes(n.parentElement?.tagName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const out = [];
  while (walker.nextNode()) out.push(walker.currentNode.textContent);
  return clean(out.join(' '));
}

export async function stored(hole = null) {
  const r = await db.loadActiveRound([user.userId]);
  const idx = hole ?? r.currentHole;
  return { round: r, hole: r.holes[idx], s: r.holes[idx].scores[ME] };
}

// ─── 누르기 + 늘 맞아야 하는 것 검사 ─────────────────────────────────────────────────
export async function settle() { await act(async () => { await new Promise((r) => setTimeout(r, 0)); }); }

// 어느 화면에서나 참이어야 하는 것 — 사용자가 이걸 보면 앱이 고장났다고 느낀다
export function audit(where = '') {
  const t = visibleText();
  for (const bad of ['NaN', 'undefined', '[object', 'null']) {
    expect(t.includes(bad), `${where}: 화면에 "${bad}" 이(가) 보인다`).toBe(false);
  }
  // 샷 탭은 정확히 하나만 선택돼 있다
  const tabs = [...document.querySelectorAll('[role="tab"][data-role^="shot-tab-"]')];
  if (tabs.length) {
    expect(tabs.filter((x) => x.getAttribute('aria-selected') === 'true'), `${where}: 선택된 샷 탭 수`).toHaveLength(1);
  }
  // 퍼팅 카드는 번호가 1부터 이어지고, 펼쳐진 건 많아야 하나
  const cards = puttCards();
  cards.forEach((c, i) => expect(c.n, `${where}: 퍼팅 카드 번호`).toBe(i + 1));
  expect(cards.filter((c) => c.open).length, `${where}: 펼쳐진 퍼팅 카드 수`).toBeLessThanOrEqual(1);

  // ── 화면 간 숫자 일치 (한 홀의 같은 숫자는 어느 칸에서 봐도 같다) ──
  const hole = holeHeader();
  const nav = (row) => [...document.querySelectorAll(`[data-role="${row}"] button`)];
  if (hole && nav('nav-score').length >= hole.hole) {
    // 윗칸 스코어 ↔ 홀 표의 스코어 (퍼팅 전 '·' 이면 윗칸은 "온그린까지 N타")
    const sc = scoreNow();
    const cell = clean(nav('nav-score')[hole.hole - 1].textContent).replace('★', '');
    // 끝나지 않은 홀(다음 퍼트·칩이 남은 홀)은 홀 표가 '·' 이고 머리글에 '진행 중'이 보인다 — 숫자로 보이면 끝난 홀로 오해한다
    if (cell === '·') expect(visibleText(), `${where}: 홀 표가 · 인데 머리글에 진행 중 표시가 없다`).toContain('진행 중');
    if (sc.n != null && cell !== '-' && cell !== '·') expect(cell, `${where}: 윗칸 스코어 ${sc.n} 과 홀 표 ${cell}`).toBe(String(sc.n));
    if (sc.pending != null && cell !== '-') expect(cell, `${where}: 퍼팅 전인데 홀 표에 ${cell}`).toBe('·');
    // 윗칸 퍼팅 수 ↔ 홀 표의 퍼팅 수 (표는 퍼팅 수를 아는 홀만 숫자로 보인다)
    const picked = puttsPicked();
    const pcell = clean(nav('nav-putts')[hole.hole - 1]?.textContent);
    if (picked != null && /^\d+$/.test(pcell)) {
      if (picked.endsWith('+')) expect(Number(pcell), `${where}: 퍼팅 ${picked} 과 홀 표 ${pcell}`).toBeGreaterThanOrEqual(Number(picked.slice(0, -1)));
      else expect(pcell, `${where}: 윗칸 퍼팅 ${picked} 과 홀 표 ${pcell}`).toBe(picked);
    }
    // 윗칸 퍼팅 수 ↔ 퍼팅 카드 수 (그린 밖 칩이 낀 홀은 카드를 일부만 보여 주므로 제외)
    if (picked != null && cards.length > 0 && !document.querySelector('[data-role="off-green-chip"]')) {
      if (picked.endsWith('+')) expect(cards.length, `${where}: 퍼팅 ${picked} 과 카드 ${cards.length}개`).toBeGreaterThanOrEqual(Number(picked.slice(0, -1)));
      else expect(cards.length, `${where}: 윗칸 퍼팅 ${picked} 과 카드 ${cards.length}개`).toBe(Number(picked));
    }
  }
}

export async function tap(target, where = '') {
  const el = typeof target === 'string' || target instanceof RegExp ? one(target) : target;
  fireEvent.click(el);
  await settle();
  audit(where || (el.textContent || '').slice(0, 20));
}
export const tapIn = (scope, label) => tap(one(label, scope));
export const tapTab = (name) => tap(document.querySelector(`[data-role="shot-tab-${name}"]`), `탭 ${name}`);

// ─── 설정 조합 ───────────────────────────────────────────────────────────────────
export const SETTINGS = [
  ['기본 설정', null],
  ['첫 퍼팅 기본 거리 6m', { unit: 'm', firstPutt: 6 }],
  ['야드 모드', { unit: 'yd' }],
  ['야드 모드 + 첫 퍼팅 기본 거리', { unit: 'yd', firstPutt: 6 }],
];


// ─── 자주 쓰는 동작 ────────────────────────────────────────────────────────────────
export const text = () => visibleText();
// 눌린 모양인가 (data-role 로 찾는다)
export const on = (role) => { const el = area(role); if (!el) throw new Error(`[${role}] 이(가) 화면에 없다`); return looksOn(el); };
// 거리 칸의 슬라이더를 움직인다 (scope 안의 것). 값이 들어간 모양(흐린 손잡이가 아닌 것)이 됐는지까지 확인한다.
// 슬라이더의 출발값과 같은 값으로 바꾸면 React 가 변경으로 보지 않으므로, 그럴 땐 한 칸 옆으로 갔다 돌아온다.
export const setDistance = async (scope, value) => {
  const slider = scope.querySelector('[data-role="dist-slider"]');
  if (!slider) throw new Error('거리 슬라이더가 없다');
  const target = String(value);
  if (slider.value === target) {
    const step = Number(slider.step || 1);
    const alt = Number(target) + (Number(target) + step <= Number(slider.max) ? step : -step);
    fireEvent.change(slider, { target: { value: String(alt) } });
    await settle();
  }
  fireEvent.change(slider, { target: { value: target } });
  await settle();
  await waitFor(() => expect(slider.value).toBe(target));
  expect(slider.getAttribute('data-empty'), '거리가 실제로 입력된 모양이어야 한다').toBe('0');
};
// 홀인 연출(2.5초)이 끝나고 다음 홀 n 이 열릴 때까지
export const waitForHole = (n) => screen.findByText(new RegExp(`^${n}번 홀$`), {}, { timeout: 8000 });
export const newHole = async (prefs = null, options = {}) => { await openApp({ prefs }); await startRound(options); };

// 아래 막대 ☰ 메뉴 — 홈으로(go-home) · 코스맵(map-button) · 메모(memo-button) · 라운드 수정(round-edit) · 라운드 그만두기(quit-round)
export async function openMenu() { await tap(area('menu-button'), '☰ 메뉴 열기'); }
// 메뉴를 열고(이미 열려 있으면 그대로) 그 안의 줄을 누른다. 누르면 메뉴는 닫히고 그 기능이 열린다
export async function menuTap(role) {
  if (!area('scoring-menu')) await openMenu();
  const el = area(role);
  if (!el) throw new Error(`☰ 메뉴에 [${role}] 이(가) 없다`);
  await tap(el, `메뉴 ${role}`);
}

// ☰ 메뉴 → 라운드 수정 → 파 표에서 n번째 홀의 칸을 눌러 고르고, 아래 버튼(파 3~7)으로 파를 바꾸고 저장한다
export async function setPar(holeIdx, par) {
  await menuTap('round-edit');
  const title = await screen.findByText('라운드 수정');
  const modal = title.closest('div[style*="max-width"]') || title.parentElement.parentElement;
  const cell = modal.querySelector(`[data-role="par-cell"][data-hole="${holeIdx}"]`);
  expect(cell, `${holeIdx + 1}번 홀 파 칸`).toBeTruthy();
  if (cell.getAttribute('aria-pressed') !== 'true') await tap(cell, `${holeIdx + 1}번 홀 고르기`);
  const option = modal.querySelector(`[data-role="par-option"][data-par="${par}"]`);
  expect(option, `파 ${par} 버튼`).toBeTruthy();
  await tap(option, `파 ${par} 고르기`);
  expect(cell.textContent.trim(), `${holeIdx + 1}번 홀 파 편집`).toBe(String(par));
  await tap(one('저장', modal), '라운드 수정 저장');
}

// 앱을 완전히 껐다 켠다 (저장소는 그대로) → 홈에서 "이어서"를 눌러 진행 중이던 라운드로 돌아온다
export async function reopenApp() {
  cleanup();
  vi.resetModules();
  db = await import('../db.js');
  await db.initDB();
  const App = (await import('../GolfScoringApp.jsx')).default;
  render(<App />);
  await screen.findByText('새 라운드');
  fireEvent.click(await screen.findByText('이어서'));
  await screen.findByText(/^\d+번 홀$/);
}
