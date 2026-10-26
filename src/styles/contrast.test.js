import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// 야외(햇빛 아래)에서도 읽히도록 — 어두운 바탕 위의 글자색은 대비 4.5 이상이어야 한다 (WCAG AA).
// 글자색(color: '#xxxxxx')으로 쓴 색을 모두 모아, "어두운 바탕 위에 놓는 흐린 글자"가 남아 있지 않은지 본다.
// 어두운 글자(금색 버튼 위의 #0b0e18 등)는 밝은 바탕 위에 놓는 것이라 대상이 아니다 (휘도가 아주 낮은 색은 건너뛴다).
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
// 글자가 가장 많이 놓이는 어두운 카드 바탕(#1a2235) 위 대비
const BG = luminance('#1a2235');
const contrast = (hex) => (luminance(hex) + 0.05) / (BG + 0.05);

const DARK_TEXT_MAX_L = 0.04;   // 이보다 어두운 글자는 밝은 버튼 위의 글자다

describe('글자색 대비 (어두운 바탕 위 4.5 이상)', () => {
  const found = new Map();
  for (const file of walk(SRC)) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/(?<![A-Za-z])color:\s*['"](#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})['"]/g)) {
      const hex = m[1].toLowerCase();
      if (luminance(hex) < DARK_TEXT_MAX_L) continue;
      found.set(hex, [...(found.get(hex) ?? []), file.replace(SRC, '')]);
    }
  }

  it('글자색으로 쓴 색이 하나 이상 모였다 (검사가 제대로 도는지)', () => {
    expect(found.size).toBeGreaterThan(10);
  });

  it('흐린 글자색이 남아 있지 않다', () => {
    const weak = [...found.entries()].filter(([hex]) => contrast(hex) < 4.5).map(([hex, files]) => `${hex} (${contrast(hex).toFixed(1)}) ← ${[...new Set(files)].slice(0, 3).join(', ')}`);
    expect(weak).toEqual([]);
  });
});
