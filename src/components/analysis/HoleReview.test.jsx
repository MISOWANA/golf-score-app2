// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

// 지도는 jsdom 에서 그릴 수 없다 — 키를 비워 지도 대신 "인증키가 필요해요" 안내가 나오게 한다 (로컬 .env 키와 상관없이 같게)
vi.mock('../../engine/mapTiles.js', async (importOriginal) => ({ ...(await importOriginal()), getVWorldKey: () => '' }));

import HoleReview from './HoleReview.jsx';

afterEach(cleanup);

// 라운드를 마친 뒤 홀을 눌러 여는 홀 복기 화면.
// 2026-11-12 사용자 신고: 회색 카드 위 "티샷"·"1번째 퍼팅"·거리·아래 "2홀 →" 글자가 안 보였다 —
// 밝은 테마로 바꿀 때 이 화면만 어두운 테마의 밝은 글자색(MAP_COLOR)을 그대로 쓰고 있었다.
// 글자색을 상수 이름으로 쓰면 styles/contrast.test.js(글자색 #xxxxxx 를 직접 읽는 검사)에 걸리지 않으므로,
// 여기서는 화면을 실제로 그려서 글자마다 "글자색 vs 그 뒤 바탕색" 대비를 잰다.

const ME = 'me';
const tee = { lat: 37.5, lng: 127.0 };
const second = { lat: 37.50252, lng: 127.0 };     // 티샷 약 280m
const green = { lat: 37.503455, lng: 127.0 };     // 세컨샷 약 104m
const pin = { lat: 37.50347, lng: 127.00002 };

const hole1 = {
  holeNumber: 1, par: 4,
  scores: { [ME]: {
    strokes: 4, putts: 2, fairway: true, gir: true, onGreen: true,
    teeClub: 'driver', secondClub: 'wedge', secondClubSub: '52', remainingDistance: 98, terrainCondition: 'hook',
    puttDetails: [{ distance: 8, holein: 'fail' }, { distance: 1, holein: 'success' }],
    gpsPoints: [tee, second], gpsGreen: green, gpsPin: pin,
    memo: '바람이 셌다',
  } },
};
// 파3 · 3퍼트 (원인 줄) · 벌타 1
const hole2 = {
  holeNumber: 2, par: 3,
  scores: { [ME]: {
    strokes: 6, putts: 3, gir: false, teeOnGreen: false, hazard: 1,
    teeClub: 'iron', teeClubSub: '7I', secondClub: 'wedge', secondClubSub: '56', onGreen: true,
    puttDetails: [{ distance: 12, holein: 'fail' }, { distance: 2.5, holein: 'fail' }, { distance: 0.5, holein: 'success' }],
  } },
};
const round = { holes: [hole1, hole2] };

const open = (holeIdx = 0, props = {}) => {
  const fns = { onNav: vi.fn(), onClose: vi.fn(), onEditScore: vi.fn() };
  render(<HoleReview round={round} player={ME} holeIdx={holeIdx} {...fns} {...props} />);
  return fns;
};
const area = (role) => document.querySelector(`[data-role="${role}"]`);

// ── 대비 재기 ──────────────────────────────────────────────────────────────
const parse = (v) => {
  if (!v || v === 'transparent' || v === 'none') return null;
  let m = v.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] == null ? 1 : +m[4] };
  m = v.match(/#([0-9a-f]{6})\b/i);
  if (m) { const n = parseInt(m[1], 16); return { r: n >> 16, g: (n >> 8) & 255, b: n & 255, a: 1 }; }
  return null;
};
const bgOf = (el) => parse(el.style.backgroundColor) ?? parse(el.style.background);
const over = (top, under) => ({
  r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1,
});
// 글자 뒤 실제 바탕 — 위로 올라가며 칠해진 면을 모아 반투명이면 겹쳐 칠한다 (맨 아래는 흰 바탕)
const backdrop = (el) => {
  const layers = [];
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
    const c = bgOf(n);
    if (c) { layers.push(c); if (c.a >= 1) break; }
  }
  return layers.reverse().reduce((acc, c) => over(c, acc), { r: 255, g: 255, b: 255, a: 1 });
};
const ink = (el) => {
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
    const c = parse(n.style.color);
    if (c) return c;
  }
  return { r: 0, g: 0, b: 0, a: 1 };
};
const lum = ({ r, g, b }) => [r, g, b].map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; })
  .reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// 화면에 글자가 있는 모든 요소의 대비 — 눌러지지 않는(disabled) 버튼은 일부러 흐리게 둔 것이라 뺀다
const weakTexts = () => {
  const out = [];
  const all = [...document.body.querySelectorAll('*')];
  expect(all.length).toBeGreaterThan(20);   // 화면이 실제로 그려졌는지
  for (const el of all) {
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join('');
    if (!own || el.closest('[disabled]')) continue;
    const r = ratio(ink(el), backdrop(el));
    if (r < 4.5) out.push(`${own} (${r.toFixed(1)})`);
  }
  return out;
};

describe('홀 복기 — 글자가 보인다 (밝은 바탕 위 대비 4.5 이상)', () => {
  it('1번 홀 (파4 · 샷 · 퍼팅 · 메모 · GPS)', () => {
    open(0);
    expect(document.querySelectorAll('[data-role="review-row"]').length).toBe(4);
    expect(weakTexts()).toEqual([]);
  });

  it('2번 홀 (파3 · 3퍼트 원인 · 벌타) — 마지막 홀', () => {
    open(1);
    expect(area('putt-cause')).toBeTruthy();
    expect(weakTexts()).toEqual([]);
  });

  it('스코어 수정 편집기를 연 상태', () => {
    open(0);
    fireEvent.click(area('edit-score'));
    expect(area('score-editor')).toBeTruthy();
    expect(weakTexts()).toEqual([]);
  });

  it('검사가 진짜로 잰다 — 회색 카드 위 예전 글자색(#e8edf8)은 걸린다', () => {
    open(0);
    const title = screen.getByText('티샷');
    title.style.color = '#e8edf8';
    expect(weakTexts().some((t) => t.startsWith('티샷'))).toBe(true);
  });
});

describe('홀 복기 — 무엇이 보이나', () => {
  it('머리줄: 몇 번 홀 · 파 · 한글 스코어 이름 · 타수', () => {
    open(0);
    expect(area('review-hole-no').textContent).toBe('1번 홀');
    expect(area('review-header').textContent).toContain('파 4');
    expect(area('review-score-name').textContent).toBe('파');
    expect(area('review-score').textContent).toContain('4타');
  });

  it('파3 6타는 "트리플 보기"', () => {
    open(1);
    expect(area('review-score-name').textContent).toBe('트리플 보기');
    expect(area('review-score').textContent).toContain('6타');
  });

  it('샷 기록: 티샷 · 세컨샷 · 퍼팅 줄과 결과', () => {
    open(0);
    const rows = [...document.querySelectorAll('[data-role="review-row"]')].map((r) => r.textContent);
    expect(rows[0]).toContain('티샷');
    expect(rows[0]).toContain('DRIVER');
    expect(rows[0]).toContain('페어웨이');
    expect(rows[1]).toContain('WEDGE 52°');
    // 남은거리는 찍은 GPS(세컨샷 자리 → 핀) 실측이 입력값(98m)보다 먼저다
    expect(rows[1]).toContain('남은거리 106m · 훅');
    expect(rows[1]).toContain('온그린');
    expect(rows[2]).toContain('1번째 퍼팅');
    expect(rows[2]).toContain('실패');
    expect(rows[3]).toContain('2번째 퍼팅');
    expect(rows[3]).toContain('홀인');
    expect(area('review-memo').textContent).toBe('바람이 셌다');
    // 지도 키가 없으면 지도 자리에 안내 한 줄
    expect(screen.getByText('지도를 보려면 VWorld 인증키가 필요해요.')).toBeTruthy();
  });
});

describe('홀 복기 — 아래 막대', () => {
  it('첫 홀: 이전은 눌리지 않고, 파랑 칸은 "2번 홀" → 다음 홀로', () => {
    const { onNav } = open(0);
    expect(area('review-prev').disabled).toBe(true);
    expect(area('review-next').textContent).toBe('2번 홀');
    expect(area('review-done')).toBeNull();
    fireEvent.click(area('review-next'));
    expect(onNav).toHaveBeenCalledWith(1);
  });

  it('마지막 홀: 이전은 "1번 홀", 파랑 칸은 "닫기" → 복기를 닫는다', () => {
    const { onNav, onClose } = open(1);
    expect(area('review-prev').textContent).toBe('1번 홀');
    fireEvent.click(area('review-prev'));
    expect(onNav).toHaveBeenCalledWith(0);
    expect(area('review-next')).toBeNull();
    fireEvent.click(area('review-done'));
    expect(onClose).toHaveBeenCalled();
  });

  it('버튼 높이는 56px (야외에서 누르기 쉬운 44px 이상)', () => {
    open(0);
    for (const role of ['review-prev', 'review-next']) expect(parseInt(area(role).style.height, 10)).toBe(56);
    expect(screen.getByRole('button', { name: '닫기' }).style.width).toBe('44px');
  });
});

describe('홀 복기 — 스코어 수정', () => {
  it('스코어 +1 하고 저장하면 그 홀 값으로 저장된다', () => {
    const { onEditScore } = open(0);
    fireEvent.click(area('edit-score'));
    fireEvent.click(screen.getByRole('button', { name: '스코어 하나 더하기' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(onEditScore).toHaveBeenCalledWith(0, { strokes: 5, putts: 2 });
    expect(area('score-editor')).toBeNull();
  });

  it('취소하면 편집기가 닫히고 저장하지 않는다', () => {
    const { onEditScore } = open(0);
    fireEvent.click(area('edit-score'));
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(area('score-editor')).toBeNull();
    expect(onEditScore).not.toHaveBeenCalled();
  });
});
