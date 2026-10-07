// ─── 홀 지도 공통 레이어 ───────────────────────────────────────────────────────
//
// 라운드 중 지도(HoleMapModal)와 라운드 후 복기(HoleReview)가 같은 그림을
// 쓰도록 아이콘과 오버레이 그리기를 한곳에 모았다.

import L from 'leaflet';
import { haversine } from '../../engine/geo.js';
import { satelliteTileUrl, TILE_MIN_ZOOM, TILE_MAX_ZOOM, TILE_ATTRIBUTION } from '../../engine/mapTiles.js';

export const MAP_COLOR = {
  gold: '#c9a228', goldBright: '#f0c93a', green: '#3db87a', red: '#ef5350',
  ink: '#0b0e18', line: '#e8edf8', dim: '#8896b0', blue: '#8ec0ff',
};

// ─── Leaflet 아이콘 (이미지 에셋 없이 divIcon으로만 구성) ──────────────────────

// 샷 지점은 "어디쯤"이 아니라 "정확히 이 자리"가 중요하다. 라벨 알약으로 점을
// 덮어버리지 않도록, 중심을 비운 십자 조준선으로 지점을 찍고 라벨은 옆으로 뺀다.
// 위성영상은 밝기가 제각각이라 모든 선에 어두운 테두리를 깔아 대비를 만든다.
// 라벨은 조준선 왼쪽에 둔다 — 오른쪽은 구간 거리 라벨 자리다(distanceIcon).
export const pointIcon = (label) => L.divIcon({
  className: '',
  html: `<div style="position:relative;width:0;height:0">
      <svg width="38" height="38" viewBox="0 0 38 38" style="position:absolute;left:-19px;top:-19px">
        <g stroke="#06080f" stroke-width="3.5" stroke-linecap="round" opacity="0.85">
          <line x1="19" y1="1" x2="19" y2="11"/><line x1="19" y1="27" x2="19" y2="37"/>
          <line x1="1" y1="19" x2="11" y2="19"/><line x1="27" y1="19" x2="37" y2="19"/>
          <circle cx="19" cy="19" r="7" fill="none"/>
        </g>
        <g stroke="#f0c93a" stroke-width="1.6" stroke-linecap="round">
          <line x1="19" y1="1" x2="19" y2="11"/><line x1="19" y1="27" x2="19" y2="37"/>
          <line x1="1" y1="19" x2="11" y2="19"/><line x1="27" y1="19" x2="37" y2="19"/>
          <circle cx="19" cy="19" r="7" fill="none"/>
        </g>
        <circle cx="19" cy="19" r="2.6" fill="#06080f"/>
        <circle cx="19" cy="19" r="1.5" fill="#f0c93a"/>
      </svg>
      <div style="
        position:absolute;right:14px;top:-22px;white-space:nowrap;
        padding:2px 7px;border-radius:4px;
        background:rgba(6,8,15,0.82);border:1px solid rgba(240,201,58,0.55);
        color:#f0c93a;font-size:10px;font-weight:800;letter-spacing:0.04em;
      ">${label}</div>
    </div>`,
  iconSize: [0, 0],
  iconAnchor: [0, 0],
});

// 핀은 샷 지점과 성격이 달라 모양을 완전히 다르게 둔다 — 깃대 밑동이 홀 자리다.
export const pinIcon = () => L.divIcon({
  className: '',
  html: `<div style="position:relative;width:0;height:0">
      <svg width="36" height="44" viewBox="0 0 36 44" style="position:absolute;left:-8px;top:-40px">
        <g stroke="#06080f" stroke-width="4" stroke-linecap="round" opacity="0.85" fill="none">
          <line x1="8" y1="6" x2="8" y2="38"/>
          <path d="M8 6 L30 13 L8 20 Z"/>
          <ellipse cx="8" cy="39" rx="6" ry="2.4"/>
        </g>
        <line x1="8" y1="6" x2="8" y2="38" stroke="#e8edf8" stroke-width="2" stroke-linecap="round"/>
        <path d="M8 6 L30 13 L8 20 Z" fill="#ef5350" stroke="#ef5350" stroke-width="1"/>
        <ellipse cx="8" cy="39" rx="6" ry="2.4" fill="#06080f" stroke="#e8edf8" stroke-width="1.2"/>
      </svg>
      <div style="
        position:absolute;left:18px;top:-44px;white-space:nowrap;
        padding:2px 7px;border-radius:4px;
        background:rgba(6,8,15,0.82);border:1px solid rgba(239,83,80,0.6);
        color:#ff8a87;font-size:10px;font-weight:800;letter-spacing:0.04em;
      ">핀</div>
    </div>`,
  iconSize: [0, 0],
  iconAnchor: [0, 0],
});

// 확정 전 임시 마커. 손가락으로 끌어야 하므로 실제 크기(44px)를 주어 터치
// 영역을 만든다 — 다른 마커처럼 iconSize를 0으로 두면 잡을 데가 없다.
export const draftIcon = () => L.divIcon({
  className: '',
  html: `<div style="width:44px;height:44px;position:relative;cursor:grab">
      <svg width="44" height="44" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r="16" fill="rgba(91,156,246,0.16)"
                stroke="#06080f" stroke-width="3.5" stroke-dasharray="3 4"/>
        <circle cx="22" cy="22" r="16" fill="none"
                stroke="#8ec0ff" stroke-width="1.4" stroke-dasharray="3 4"/>
        <g stroke="#06080f" stroke-width="4" stroke-linecap="round">
          <line x1="22" y1="4" x2="22" y2="13"/><line x1="22" y1="31" x2="22" y2="40"/>
          <line x1="4" y1="22" x2="13" y2="22"/><line x1="31" y1="22" x2="40" y2="22"/>
        </g>
        <g stroke="#8ec0ff" stroke-width="1.8" stroke-linecap="round">
          <line x1="22" y1="4" x2="22" y2="13"/><line x1="22" y1="31" x2="22" y2="40"/>
          <line x1="4" y1="22" x2="13" y2="22"/><line x1="31" y1="22" x2="40" y2="22"/>
        </g>
        <circle cx="22" cy="22" r="3" fill="#06080f"/>
        <circle cx="22" cy="22" r="1.8" fill="#8ec0ff"/>
      </svg>
    </div>`,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

// 구간 거리 라벨. (nx, ny) = 선에 수직인 화면 방향 단위벡터(오른쪽을 향한 쪽).
// 선 중점에서 그 방향으로 떼어 놓아 라벨이 선을 덮지 않게 한다 — 세로에 가까운
// 선이면 오른쪽, 가로에 가까운 선이면 위·아래로 자연스럽게 옮겨 간다.
// 크기 0인 마커 안이라 width:max-content를 주지 않으면 박스가 글자보다 좁아진다.
export const distanceIcon = (meters, nx = 1, ny = 0) => L.divIcon({
  className: '',
  html: `<div style="position:relative;width:0;height:0">
      <div style="
        position:absolute;left:${(nx * 12).toFixed(1)}px;top:${(ny * 12).toFixed(1)}px;
        transform:translate(${(-50 + nx * 50).toFixed(0)}%,${(-50 + ny * 50).toFixed(0)}%);
        width:max-content;padding:2px 7px;border-radius:4px;white-space:nowrap;
        background:rgba(6,8,15,0.88);border:1px solid rgba(255,255,255,0.35);
        color:#ffffff;font-size:11px;font-weight:800;line-height:1.4;
      ">${Math.round(meters)}m</div>
    </div>`,
  iconSize: [0, 0],
  iconAnchor: [0, 0],
});

// from→to 선의 오른쪽 수직 방향(화면 좌표, y는 아래가 +). 지도는 북쪽이 위라
// 경도 차에 cos(위도)를 곱하면 화면 방향과 거의 같다.
export function rightNormal(from, to) {
  const dx = (to.lng - from.lng) * Math.cos((from.lat * Math.PI) / 180);
  const dy = -(to.lat - from.lat);
  const len = Math.hypot(dx, dy) || 1;
  let nx = -dy / len;
  let ny = dx / len;
  if (nx < 0 || (nx === 0 && ny > 0)) { nx = -nx; ny = -ny; }
  return [nx, ny];
}

// 위성 타일 지도를 만든다. 실패 콜백은 인증키/영역 문제를 화면에 알리는 용도.
export function createSatelliteMap(el, apiKey, { onTileError, onTileLoad } = {}) {
  const map = L.map(el, { zoomControl: false, attributionControl: true })
    .setView([36.5, 127.8], 7);

  const tiles = L.tileLayer(satelliteTileUrl(apiKey), {
    minZoom: TILE_MIN_ZOOM, maxZoom: TILE_MAX_ZOOM, attribution: TILE_ATTRIBUTION,
  });
  if (onTileError) tiles.on('tileerror', onTileError);
  if (onTileLoad) tiles.on('tileload', onTileLoad);
  tiles.addTo(map);
  return map;
}

// 샷 궤적 + 핀을 그린다.
//   chain : [{ label, point }] — 샷 지점들과 마지막 그린 도착점 (순서대로)
//   pin   : 핀 좌표 (없으면 핀 관련 요소는 그리지 않는다)
// 반환: 지도 범위를 맞출 좌표 목록
export function drawHoleOverlay(group, { chain = [], pin = null } = {}) {
  group.clearLayers();
  const marked = chain.filter((c) => c.point);

  marked.forEach((c) => {
    L.marker([c.point.lat, c.point.lng], { icon: pointIcon(c.label) }).addTo(group);
  });
  if (pin) L.marker([pin.lat, pin.lng], { icon: pinIcon() }).addTo(group);

  // 각 샷 지점에서 핀까지 — 남은 거리를 눈으로 보도록 가는 점선으로.
  // 마지막(그린 도착)은 핀과 거의 겹쳐 선이 지저분해지므로 뺀다.
  if (pin) {
    marked.slice(0, -1).forEach((c) => {
      L.polyline([[c.point.lat, c.point.lng], [pin.lat, pin.lng]], {
        color: MAP_COLOR.red, weight: 1.2, opacity: 0.45, dashArray: '2 6',
      }).addTo(group);
    });
  }

  // 연속으로 기록된 구간만 잇는다 (중간이 비면 거리가 성립하지 않는다).
  for (let i = 0; i < chain.length - 1; i++) {
    const from = chain[i].point;
    const to = chain[i + 1].point;
    if (!from || !to) continue;
    L.polyline([[from.lat, from.lng], [to.lat, to.lng]], {
      color: MAP_COLOR.gold, weight: 3, opacity: 0.85, dashArray: '6 5',
    }).addTo(group);
    const d = haversine(from, to);
    if (d != null) {
      L.marker([(from.lat + to.lat) / 2, (from.lng + to.lng) / 2], { icon: distanceIcon(d, ...rightNormal(from, to)) }).addTo(group);
    }
  }

  return pin ? [...marked.map((c) => c.point), pin] : marked.map((c) => c.point);
}
