import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// 야외(햇빛 아래)에서도 읽히도록 — 밝은 바탕(흰색 · 연회색 카드) 위의 글자색은 대비 4.5 이상이어야 한다 (WCAG AA).
// 글자색(color: '#xxxxxx')으로 쓴 색을 모두 모아, "밝은 바탕 위에 놓는 흐린 글자"가 남아 있지 않은지 본다.
// 아주 밝은 글자(파랑 버튼 위의 흰색 등)는 진한 바탕 위에 놓는 것이라 대상이 아니다 (휘도가 아주 높은 색은 건너뛴다).
const SRC = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = join(dir, e.name);
  if (e.isDirectory()) return walk(p);
  return /\.(js|jsx)$/.test(e.name) && !/\.test\./.test(e.name) ? [p] : [];
});

const lin = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const luminance = (hex) => {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.length === 3 ? h[i / 2] + h[i / 2] : h.slice(i, i + 2), 16));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
// 글자가 가장 많이 놓이는 연회색 카드 바탕(#f2f4f6) 위 대비 — 흰 바탕보다 조금 더 어렵다
const BG = luminance('#f2f4f6');
const contrast = (hex) => (BG + 0.05) / (luminance(hex) + 0.05);

const LIGHT_TEXT_MIN_L = 0.7;   // 이보다 밝은 글자는 진한 버튼 · 채운 칸 위의 글자다

describe('글자색 대비 (밝은 바탕 위 4.5 이상)', () => {
  const found = new Map();
  for (const file of walk(SRC)) {
    if (/holeImage\.js$/.test(file)) continue;   // 지도 위에 그리는 이미지 — 어두운 라벨 위의 밝은 글자라 이 검사의 대상이 아니다
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/(?<![A-Za-z])color:\s*['"](#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})['"]/g)) {
      const hex = m[1].toLowerCase();
      if (luminance(hex) > LIGHT_TEXT_MIN_L) continue;
      found.set(hex, [...(found.get(hex) ?? []), file.replace(SRC, '')]);
    }
  }

  it('글자색으로 쓴 색이 하나 이상 모였다 (검사가 제대로 도는지)', () => {
    expect(found.size).toBeGreaterThan(5);
  });

  it('흐린 글자색이 남아 있지 않다', () => {
    const weak = [...found.entries()].filter(([hex]) => contrast(hex) < 4.5).map(([hex, files]) => `${hex} (${contrast(hex).toFixed(1)}) ← ${[...new Set(files)].slice(0, 3).join(', ')}`);
    expect(weak).toEqual([]);
  });
});
