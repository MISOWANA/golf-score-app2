import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CSP_DIRECTIVES, MAP_TILE_ORIGIN, cspContent, cspPlugin } from './csp.js';
import { satelliteTileUrl, VWORLD_SIGNUP_URL } from '../engine/mapTiles.js';

// 두 번째 안전장치(Content-Security-Policy) 규칙 검사.
// 실제로 막히는지는 빌드한 앱을 크롬에서 열어 확인했다 (지도 · 이미지 저장 · 백업 · 공유) — 2026-11-12.

const SRC = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = join(dir, e.name);
  if (e.isDirectory()) return walk(p);
  return /\.(js|jsx)$/.test(e.name) && !/\.test\./.test(e.name) ? [p] : [];
});

// 눌러서 여는 안내 페이지 링크 — 앱이 불러오는 게 아니라 규칙에 넣을 필요가 없다
const LINK_ONLY = [new URL(VWORLD_SIGNUP_URL).origin];

describe('두 번째 안전장치 (CSP)', () => {
  it('스크립트는 앱 자기 파일만 — 인라인 · eval 을 열지 않는다', () => {
    expect(CSP_DIRECTIVES['script-src']).toEqual(["'self'"]);
    expect(cspContent()).not.toContain('unsafe-eval');
    expect(CSP_DIRECTIVES['object-src']).toEqual(["'none'"]);
    expect(CSP_DIRECTIVES['base-uri']).toEqual(["'self'"]);
  });

  it('지도 사진 주소(VWorld)는 이미지로 불러올 수 있다', () => {
    const tileOrigin = new URL(satelliteTileUrl('KEY').replace(/[{}]/g, '')).origin;
    expect(tileOrigin).toBe(MAP_TILE_ORIGIN);
    expect(CSP_DIRECTIVES['img-src']).toContain(tileOrigin);
    // 지도 이미지 저장은 canvas → data: PNG, 백업·공유 파일은 blob:
    expect(CSP_DIRECTIVES['img-src']).toEqual(expect.arrayContaining(['data:', 'blob:']));
  });

  it('src 안의 바깥 주소는 모두 규칙에 있거나 눌러서 여는 링크다 (새 주소를 쓰면 여기서 걸린다)', () => {
    const allowed = new Set([...CSP_DIRECTIVES['img-src'], ...CSP_DIRECTIVES['connect-src'], ...LINK_ONLY]);
    const missing = new Set();
    for (const file of walk(SRC)) {
      for (const m of readFileSync(file, 'utf8').matchAll(/https:\/\/[a-z0-9.-]+/gi)) {
        if (!allowed.has(m[0])) missing.add(`${m[0]} ← ${file.replace(SRC, '')}`);
      }
    }
    expect([...missing]).toEqual([]);
  });

  it('빌드 때만 index.html 머리 맨 앞에 <meta http-equiv> 로 들어간다 (개발 서버에는 안 넣는다)', () => {
    const plugin = cspPlugin();
    expect(plugin.apply).toBe('build');
    const [tag] = plugin.transformIndexHtml();
    expect(tag).toMatchObject({ tag: 'meta', injectTo: 'head-prepend', attrs: { 'http-equiv': 'Content-Security-Policy' } });
    expect(tag.attrs.content).toBe(cspContent());
    expect(tag.attrs.content).toContain("default-src 'self'");
  });
});
