// 글자 크기 정책: 화면 글자는 10px 보다 작게 쓰지 않는다 (야외·햇빛에서 읽을 수 있게).
// 새로 작은 글자를 넣으면 이 테스트가 어디인지 알려 준다. 정말 필요한 곳(SVG 안 축소 글자 등)은 ALLOW 에 이유와 함께 적는다.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../', import.meta.url));   // src/
const MIN_PX = 10;

// 정말 작아야 하는 곳 — 'src 기준 경로: 이유'
const ALLOW = {
  // (현재 없음)
};

// 쓰이지 않는 예전 디자인 시스템 파일은 검사하지 않는다 (ui/AppButton·AppChip·SectionCard·StatCard, theme/, styles/theme.js·typography.js)
const SKIP = [/\.test\./, /[\\/]test[\\/]/, /[\\/]ui[\\/](AppButton|AppChip|SectionCard|StatCard)/, /[\\/]theme[\\/]/, /styles[\\/](theme|typography)\.js$/];

function* sources(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* sources(p);
    else if (/\.(js|jsx)$/.test(name) && !SKIP.some((r) => r.test(p))) yield p;
  }
}

// 줄 안의 모든 글자 크기 리터럴 — fontSize: 9 · fontSize:'9px' · fontSize="9" · 삼항 · css 문자열 font-size:9px
function sizesIn(line) {
  const out = [];
  for (const m of line.matchAll(/fontSize\s*[:=]\s*\{?\s*([^,}\n]+)/g)) {
    for (const n of m[1].matchAll(/(?<![\w.])['"]?(\d+(?:\.\d+)?)(?:px)?['"]?(?![\w.])/g)) {
      // 삼항의 조건식 속 숫자(예: length>5)는 건너뛴다 — 값 자리(? 뒤 / : 뒤)의 숫자만 본다
      const before = m[1].slice(0, n.index);
      const isValue = !before.trim() || /[?:]\s*$/.test(before);
      if (isValue) out.push(Number(n[1]));
    }
  }
  for (const m of line.matchAll(/font-size\s*:\s*(\d+(?:\.\d+)?)px/g)) out.push(Number(m[1]));
  return out;
}

describe('글자 크기', () => {
  it(`화면 글자는 ${MIN_PX}px 보다 작지 않다`, () => {
    const found = [];
    for (const file of sources(SRC)) {
      const rel = relative(SRC, file).split(sep).join('/');
      if (ALLOW[rel]) continue;
      readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
        sizesIn(line).filter((n) => n < MIN_PX).forEach((n) => found.push(`${rel}:${i + 1}  ${n}px  ${line.trim().slice(0, 90)}`));
      });
    }
    expect(found).toEqual([]);
  });

  it('검사기가 작은 글자를 실제로 잡는다 (검사기 자체의 확인)', () => {
    expect(sizesIn("style={{ fontSize: 9, color: 'red' }}")).toEqual([9]);
    expect(sizesIn("style={{ fontSize: '8px' }}")).toEqual([8]);
    expect(sizesIn('<text fontSize="7.5" />')).toEqual([7.5]);
    expect(sizesIn("fontSize: len>5 ? '7px' : '9px'")).toEqual([7, 9]);
    expect(sizesIn('font-size:9px;')).toEqual([9]);
    expect(sizesIn("style={{ fontSize: 14, padding: 4 }}")).toEqual([14]);
  });
});
