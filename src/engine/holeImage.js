// ─── 홀 이미지 렌더러 ─────────────────────────────────────────────────────────
//
// 라운드가 끝난 뒤 한 홀의 GPS 지점·핀·남은거리를 한 장의 PNG로 뽑는다.
// Leaflet 지도를 그대로 캡처할 수는 없어(DOM → 이미지 변환은 별도 의존성이
// 필요하다) 타일을 직접 받아 canvas에 그린다.
//
// VWorld 타일이 Access-Control-Allow-Origin: * 를 주기 때문에
// crossOrigin='anonymous' 로 받으면 canvas가 오염되지 않아 toDataURL이 된다.

import { haversine, shotDistances, pinDistances } from './geo.js';
import { satelliteTileUrl, TILE_MAX_ZOOM } from './mapTiles.js';

const TILE = 256;
const MAX_TILES = 64;        // 한 장에 받을 타일 수 상한 (과도한 요청 방지)
const TILE_TIMEOUT_MS = 8000;

const C = {
  ink: '#0b0e18', panel: '#111827', line: '#e8edf8', dim: '#8896b0',
  gold: '#c9a228', goldBright: '#f0c93a', green: '#3db87a', red: '#ef5350',
  stroke: '#06080f',
};

const FONT = (w, s) => `${w} ${s}px 'Noto Sans KR', system-ui, sans-serif`;

// ── Web Mercator ────────────────────────────────────────────────────────────
const lng2px = (lng, z) => ((lng + 180) / 360) * TILE * 2 ** z;
const lat2px = (lat, z) => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * TILE * 2 ** z;
};

function loadTile(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => resolve(null), TILE_TIMEOUT_MS);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); resolve(null); };
    img.src = url;
  });
}

// 모든 지점이 들어가면서 타일 수가 상한을 넘지 않는 가장 큰 줌을 고른다.
function pickZoom(points, mapSize) {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const pad = 1.35; // 마커와 라벨이 잘리지 않도록 여유
  for (let z = TILE_MAX_ZOOM; z >= 12; z--) {
    const w = (Math.max(...lngs.map((v) => lng2px(v, z))) - Math.min(...lngs.map((v) => lng2px(v, z)))) * pad;
    const h = (Math.max(...lats.map((v) => lat2px(v, z))) - Math.min(...lats.map((v) => lat2px(v, z)))) * pad;
    if (w <= mapSize && h <= mapSize) {
      const tiles = Math.ceil(mapSize / TILE + 1) ** 2;
      if (tiles <= MAX_TILES) return z;
    }
  }
  return 12;
}

// ── 그리기 도우미 ───────────────────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function chip(ctx, text, x, y, { bg, border, color, size = 22, pad = 9, align = 'left' }) {
  ctx.font = FONT(800, size);
  const w = ctx.measureText(text).width + pad * 2;
  const h = size + pad * 1.1;
  const left = align === 'right' ? x - w : x;
  const top = y - h / 2;
  ctx.fillStyle = bg;
  roundRect(ctx, left, top, w, h, 6);
  ctx.fill();
  if (border) { ctx.strokeStyle = border; ctx.lineWidth = 1.5; ctx.stroke(); }
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(text, left + pad, y + 1);
  return { w, h, left, top };
}

// 중심을 비운 십자 조준선 — 화면 지도와 같은 표기.
function crosshair(ctx, x, y, r = 19) {
  const arms = [[0, -r, 0, -r * 0.42], [0, r * 0.42, 0, r], [-r, 0, -r * 0.42, 0], [r * 0.42, 0, r, 0]];
  for (const [col, lw] of [[C.stroke, 4.5], [C.goldBright, 2]]) {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
    ctx.beginPath();
    arms.forEach(([x1, y1, x2, y2]) => { ctx.moveTo(x + x1, y + y1); ctx.lineTo(x + x2, y + y2); });
    ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, r * 0.37, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.fillStyle = C.stroke; ctx.beginPath(); ctx.arc(x, y, 3.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.goldBright; ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
}

function flag(ctx, x, y) {
  ctx.strokeStyle = C.stroke; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y - 46); ctx.lineTo(x, y); ctx.stroke();
  ctx.strokeStyle = '#e8edf8'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x, y - 46); ctx.lineTo(x, y); ctx.stroke();

  ctx.beginPath(); ctx.moveTo(x, y - 46); ctx.lineTo(x + 30, y - 36); ctx.lineTo(x, y - 26); ctx.closePath();
  ctx.strokeStyle = C.stroke; ctx.lineWidth = 5; ctx.stroke();
  ctx.fillStyle = C.red; ctx.fill();

  ctx.beginPath(); ctx.ellipse(x, y + 2, 8, 3.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = C.stroke; ctx.fill();
  ctx.strokeStyle = '#e8edf8'; ctx.lineWidth = 1.6; ctx.stroke();
}

const fmtM = (v) => (v == null ? null : `${Math.round(v)}m`);

// ── 본 렌더 ─────────────────────────────────────────────────────────────────
//
// review : buildHoleReview 결과
// 반환   : { dataUrl, width, height } 또는 points 가 없으면 null
export async function renderHoleImage(review, { apiKey, mapSize = 1040 } = {}) {
  if (!review) return null;

  const pts = [];
  review.shots.forEach((s) => {
    const p = review.gps.points[s.slot];
    if (p) pts.push({ ...p, label: s.name, slot: s.slot });
  });
  if (review.gps.green) pts.push({ ...review.gps.green, label: review.holedOut ? '홀' : '그린', slot: 'green' });
  const pin = review.gps.pin;
  const all = pin ? [...pts, pin] : pts;
  if (all.length === 0) return null;

  // 각 샷 지점에서 핀까지 남은 거리 (사용자 요청의 핵심 표기)
  const toPin = pinDistances(review.gps.points, pin, review.gps.fieldShots);
  const shotDist = shotDistances(review.gps.points, review.gps.green, review.gps.fieldShots);

  const rows = review.shots.map((s, i) => ({
    name: s.name,
    club: s.club,
    flown: shotDist[i] ?? null,
    remain: toPin[i] ?? null,
  }));

  const headH = 118;
  const rowH = 44;
  const footH = rows.length > 0 ? 34 + rows.length * rowH + 14 : 0;
  const W = mapSize;
  const H = headH + mapSize + footH;

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  if (document.fonts?.ready) { try { await document.fonts.ready; } catch { /* 폰트 없이도 그린다 */ } }

  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, W, H);

  // ── 헤더 ──
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = C.gold;
  ctx.font = FONT(800, 24);
  ctx.fillText(`HOLE ${review.holeNo}`, 32, 50);
  ctx.fillStyle = C.line;
  ctx.font = FONT(800, 30);
  ctx.fillText(`PAR ${review.par}`, 32, 92);
  if (review.holeLength != null) {
    ctx.fillStyle = C.dim;
    ctx.font = FONT(700, 24);
    ctx.fillText(`홀 전장 ${fmtM(review.holeLength)}`, 150, 92);
  }
  ctx.textAlign = 'right';
  ctx.fillStyle = C.line;
  ctx.font = FONT(900, 46);
  ctx.fillText(String(review.strokes ?? '-'), W - 100, 84);
  const diff = review.diff;
  ctx.fillStyle = diff == null ? C.dim : diff < 0 ? C.green : diff === 0 ? C.line : C.red;
  ctx.font = FONT(800, 28);
  ctx.fillText(diff == null ? '' : diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`, W - 32, 84);
  ctx.strokeStyle = '#1b2238'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, headH); ctx.lineTo(W, headH); ctx.stroke();

  // ── 지도 ──
  const z = pickZoom(all, mapSize);
  const cx = all.reduce((a, p) => a + lng2px(p.lng, z), 0) / all.length;
  const cy = all.reduce((a, p) => a + lat2px(p.lat, z), 0) / all.length;
  const originX = cx - mapSize / 2;
  const originY = cy - mapSize / 2;
  const toXY = (p) => ({ x: lng2px(p.lng, z) - originX, y: lat2px(p.lat, z) - originY + headH });

  ctx.save();
  ctx.beginPath(); ctx.rect(0, headH, W, mapSize); ctx.clip();
  ctx.fillStyle = '#16301f'; ctx.fillRect(0, headH, W, mapSize);

  if (apiKey) {
    const t0 = Math.floor(originX / TILE);
    const t1 = Math.floor((originX + mapSize) / TILE);
    const s0 = Math.floor(originY / TILE);
    const s1 = Math.floor((originY + mapSize) / TILE);
    const jobs = [];
    for (let tx = t0; tx <= t1; tx++) {
      for (let ty = s0; ty <= s1; ty++) {
        jobs.push({ tx, ty, url: satelliteTileUrl(apiKey).replace('{z}', z).replace('{y}', ty).replace('{x}', tx) });
      }
    }
    const imgs = await Promise.all(jobs.slice(0, MAX_TILES).map((j) => loadTile(j.url)));
    imgs.forEach((img, i) => {
      if (!img) return;
      const { tx, ty } = jobs[i];
      ctx.drawImage(img, tx * TILE - originX, ty * TILE - originY + headH, TILE, TILE);
    });
  }

  // 핀까지 가는 보조선
  if (pin) {
    const pp = toXY(pin);
    ctx.setLineDash([3, 9]);
    ctx.strokeStyle = 'rgba(239,83,80,0.55)'; ctx.lineWidth = 2;
    pts.filter((p) => p.slot !== 'green').forEach((p) => {
      const a = toXY(p);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(pp.x, pp.y); ctx.stroke();
    });
    ctx.setLineDash([]);
  }

  // 샷 궤적 + 구간 거리
  ctx.setLineDash([12, 9]);
  ctx.strokeStyle = C.gold; ctx.lineWidth = 4;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = toXY(pts[i]); const b = toXY(pts[i + 1]);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  ctx.setLineDash([]);
  for (let i = 0; i < pts.length - 1; i++) {
    const d = haversine(pts[i], pts[i + 1]);
    if (d == null) continue;
    const a = toXY(pts[i]); const b = toXY(pts[i + 1]);
    chip(ctx, fmtM(d), (a.x + b.x) / 2 - 24, (a.y + b.y) / 2, {
      bg: 'rgba(6,8,15,0.88)', border: 'rgba(240,201,58,0.55)', color: C.goldBright, size: 20,
    });
  }

  // 지점 마커 + "남은거리" 라벨 (요청의 핵심)
  pts.forEach((p) => {
    const { x, y } = toXY(p);
    crosshair(ctx, x, y);
    const remain = typeof p.slot === 'number' ? toPin[p.slot] : haversine(review.gps.green, pin);
    const text = remain != null ? `${p.label} · 남은 ${fmtM(remain)}` : p.label;
    const rightSide = x < mapSize * 0.62;
    chip(ctx, text, rightSide ? x + 26 : x - 26, y - 30, {
      bg: 'rgba(6,8,15,0.86)', border: 'rgba(240,201,58,0.5)', color: C.goldBright,
      size: 21, align: rightSide ? 'left' : 'right',
    });
  });

  if (pin) {
    const pp = toXY(pin);
    flag(ctx, pp.x, pp.y);
    chip(ctx, '핀', pp.x + 36, pp.y - 50, {
      bg: 'rgba(6,8,15,0.86)', border: 'rgba(239,83,80,0.65)', color: '#ff8a87', size: 21,
    });
  }
  ctx.restore();

  // ── 하단 샷 표 ──
  if (footH > 0) {
    let y = headH + mapSize;
    ctx.strokeStyle = '#1b2238'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    y += 30;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = C.gold; ctx.font = FONT(800, 19);
    ctx.fillText('샷 기록', 32, y);
    y += 22;

    rows.forEach((r) => {
      y += rowH;
      ctx.fillStyle = C.panel;
      roundRect(ctx, 24, y - rowH + 10, W - 48, rowH - 8, 8);
      ctx.fill();

      ctx.textAlign = 'left';
      ctx.fillStyle = C.gold; ctx.font = FONT(800, 19);
      ctx.fillText(r.name, 40, y - 8);
      ctx.fillStyle = r.club ? C.line : '#3a4e72'; ctx.font = FONT(800, 21);
      ctx.fillText(r.club ?? '클럽 미입력', 150, y - 8);

      ctx.textAlign = 'right';
      if (r.flown != null) {
        ctx.fillStyle = C.goldBright; ctx.font = FONT(800, 21);
        ctx.fillText(fmtM(r.flown), W - 190, y - 8);
      }
      if (r.remain != null) {
        ctx.fillStyle = C.dim; ctx.font = FONT(700, 19);
        ctx.fillText(`남은 ${fmtM(r.remain)}`, W - 40, y - 8);
      }
    });
  }

  return { dataUrl: canvas.toDataURL('image/png'), width: W, height: H };
}
