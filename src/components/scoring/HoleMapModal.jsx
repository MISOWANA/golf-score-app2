import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { haversine, combinedAccuracy, gpsQuality } from '../../engine/geo.js';
import {
  getVWorldKey, setVWorldKey, satelliteTileUrl,
  TILE_MIN_ZOOM, TILE_MAX_ZOOM, TILE_ATTRIBUTION, VWORLD_SIGNUP_URL,
} from '../../engine/mapTiles.js';

// 라운드 중에 쓰는 화면이라 기본 줌은 한 홀이 거의 다 들어오는 수준으로 잡는다.
const INITIAL_ZOOM = 17;
const GREEN_SLOT = 'green';

const COLOR = {
  gold: '#c9a228', green: '#3db87a', red: '#ef5350',
  ink: '#0b0e18', line: '#e8edf8', dim: '#8896b0',
};

const fmtAcc = (acc) => (acc == null ? '' : `±${Math.round(acc)}m`);

// ─── Leaflet 아이콘 (이미지 에셋 없이 divIcon으로만 구성) ──────────────────────

const pointIcon = (label, done) => L.divIcon({
  className: '',
  html: `<div style="
      transform:translate(-50%,-50%);
      display:flex;align-items:center;gap:5px;
      padding:3px 8px 3px 4px;border-radius:999px;white-space:nowrap;
      background:${done ? 'rgba(201,162,40,0.92)' : 'rgba(11,14,24,0.78)'};
      border:1.5px solid ${done ? '#f0c93a' : '#3a4e72'};
      color:${done ? '#0b0e18' : '#8896b0'};
      font-size:11px;font-weight:800;letter-spacing:0.02em;
      box-shadow:0 1px 6px rgba(0,0,0,0.5);
    ">
      <span style="width:9px;height:9px;border-radius:50%;background:${done ? '#0b0e18' : '#3a4e72'}"></span>
      ${label}
    </div>`,
  iconSize: [0, 0],
  iconAnchor: [0, 0],
});

const distanceIcon = (meters) => L.divIcon({
  className: '',
  html: `<div style="
      transform:translate(-50%,-50%);
      padding:2px 7px;border-radius:999px;white-space:nowrap;
      background:rgba(11,14,24,0.86);border:1px solid rgba(201,162,40,0.5);
      color:#f0c93a;font-size:11px;font-weight:800;
    ">${Math.round(meters)}m</div>`,
  iconSize: [0, 0],
  iconAnchor: [0, 0],
});

// ─── 본체 ─────────────────────────────────────────────────────────────────────

export default function HoleMapModal({
  holeNo, par, gpsPoints, gpsGreen, fieldShots, shotLabel,
  onSetPoint, onSetGreen, onClose,
}) {
  const [apiKey, setApiKey] = useState(getVWorldKey);
  const [keyDraft, setKeyDraft] = useState('');
  const [pos, setPos] = useState(null);          // 실시간 현재 위치
  const [posError, setPosError] = useState(
    () => (navigator.geolocation ? null : '이 브라우저는 위치 기능을 지원하지 않습니다.'),
  );
  const [placeMode, setPlaceMode] = useState(false);
  const [tileError, setTileError] = useState(false);

  const slots = [
    ...Array.from({ length: fieldShots }, (_, i) => ({
      id: i, label: shotLabel(i), point: gpsPoints[i] || null,
    })),
    { id: GREEN_SLOT, label: '그린', point: gpsGreen },
  ];
  const firstEmpty = slots.find((s) => !s.point);
  const [selected, setSelected] = useState(firstEmpty ? firstEmpty.id : 0);
  const selectedSlot = slots.find((s) => s.id === selected) ?? slots[0];

  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const overlayRef = useRef(null);   // 샷 지점·궤적
  const meRef = useRef(null);        // 현재 위치
  const didCenterRef = useRef(false);
  const placeModeRef = useRef(placeMode);
  const selectedRef = useRef(selected);
  const commitRef = useRef(null);

  const commitPoint = (slotId, fix) => {
    if (slotId === GREEN_SLOT) onSetGreen(fix);
    else onSetPoint(slotId, fix);
  };

  // 기록 후에는 아직 안 찍은 다음 지점으로 넘어간다 (티 → 세컨 → 그린 순서로
  // 버튼만 누르면 되도록). 지우는 경우엔 그 자리에 머문다.
  const commitAndAdvance = (slotId, fix) => {
    commitPoint(slotId, fix);
    if (!fix) return;
    const from = slots.findIndex((s) => s.id === slotId);
    const next = slots.slice(from + 1).find((s) => !s.point);
    if (next) setSelected(next.id);
  };

  // Leaflet의 click 핸들러는 지도 생성 시 한 번만 등록되므로 그 클로저가 첫
  // 렌더의 값에 묶인다. placeMode/selected뿐 아니라 commit 함수도 마찬가지인데,
  // 이쪽은 gpsPoints와 playerScore를 캡처하고 있어서 묶이면 나중에 찍은 지점이
  // 그 전 기록을 지워버린다. 그래서 셋 다 ref로 최신값을 건넨다.
  useEffect(() => { placeModeRef.current = placeMode; }, [placeMode]);
  useEffect(() => { selectedRef.current = selected; }, [selected]);
  useEffect(() => { commitRef.current = commitAndAdvance; });

  // ── 지도 생성 (한 번만) ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!apiKey || !containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView([36.5, 127.8], 7);

    const tiles = L.tileLayer(satelliteTileUrl(apiKey), {
      minZoom: TILE_MIN_ZOOM,
      maxZoom: TILE_MAX_ZOOM,
      attribution: TILE_ATTRIBUTION,
    });
    tiles.on('tileerror', () => setTileError(true));
    tiles.on('tileload', () => setTileError(false));
    tiles.addTo(map);

    overlayRef.current = L.layerGroup().addTo(map);
    meRef.current = L.layerGroup().addTo(map);

    // 지도에서 지정 모드: 탭한 곳을 선택된 지점으로 기록한다.
    // GPS 측위가 나쁘거나 찍는 걸 깜빡했을 때 위성영상 보고 직접 지정하는 용도라
    // acc는 null로 둔다 (측정값이 아니라는 표시).
    map.on('click', (e) => {
      if (!placeModeRef.current) return;
      commitRef.current?.(selectedRef.current, {
        lat: e.latlng.lat, lng: e.latlng.lng, acc: null, t: Date.now(), manual: true,
      });
      setPlaceMode(false);
    });

    mapRef.current = map;
    // 모달이 그려진 직후엔 컨테이너 크기가 0일 수 있다.
    setTimeout(() => map.invalidateSize(), 60);

    return () => { map.remove(); mapRef.current = null; };
  }, [apiKey]);

  // ── 현재 위치 추적 ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setPosError(null);
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy ?? null, t: Date.now() });
      },
      (err) => {
        setPosError(err?.code === 1
          ? '위치 권한이 거부됐습니다. 브라우저 설정에서 허용해 주세요.'
          : '위치를 잡지 못했습니다. 하늘이 트인 곳에서 다시 시도해 주세요.');
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // ── 샷 지점·궤적 그리기 ─────────────────────────────────────────────────────
  useEffect(() => {
    const layer = overlayRef.current;
    if (!layer) return;
    layer.clearLayers();

    const marked = slots.filter((s) => s.point);
    marked.forEach((s) => {
      L.marker([s.point.lat, s.point.lng], { icon: pointIcon(s.label, true) }).addTo(layer);
    });

    // 연속으로 기록된 구간만 선으로 잇는다 (중간이 비면 거리가 성립하지 않는다).
    for (let i = 0; i < slots.length - 1; i++) {
      const from = slots[i].point;
      const to = slots[i + 1].point;
      if (!from || !to) continue;
      L.polyline([[from.lat, from.lng], [to.lat, to.lng]], {
        color: COLOR.gold, weight: 3, opacity: 0.85, dashArray: '6 5',
      }).addTo(layer);
      const d = haversine(from, to);
      if (d != null) {
        L.marker([(from.lat + to.lat) / 2, (from.lng + to.lng) / 2], { icon: distanceIcon(d) }).addTo(layer);
      }
    }

    const map = mapRef.current;
    if (map && marked.length > 0 && !didCenterRef.current) {
      didCenterRef.current = true;
      if (marked.length === 1) map.setView([marked[0].point.lat, marked[0].point.lng], INITIAL_ZOOM);
      else map.fitBounds(L.latLngBounds(marked.map((s) => [s.point.lat, s.point.lng])), { padding: [60, 60] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpsPoints, gpsGreen, fieldShots, apiKey]);

  // ── 현재 위치 표시 ──────────────────────────────────────────────────────────
  useEffect(() => {
    const layer = meRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!pos) return;

    if (pos.acc != null) {
      L.circle([pos.lat, pos.lng], {
        radius: pos.acc, color: '#5b9cf6', weight: 1,
        fillColor: '#5b9cf6', fillOpacity: 0.12,
      }).addTo(layer);
    }
    L.circleMarker([pos.lat, pos.lng], {
      radius: 7, color: '#ffffff', weight: 2,
      fillColor: '#5b9cf6', fillOpacity: 1,
    }).addTo(layer);

    const map = mapRef.current;
    if (map && !didCenterRef.current) {
      didCenterRef.current = true;
      map.setView([pos.lat, pos.lng], INITIAL_ZOOM);
    }
  }, [pos]);

  const recenter = () => {
    const map = mapRef.current;
    if (map && pos) map.setView([pos.lat, pos.lng], Math.max(map.getZoom(), INITIAL_ZOOM));
  };

  const markHere = () => {
    if (!pos) return;
    commitAndAdvance(selected, { ...pos, t: Date.now() });
  };

  const quality = gpsQuality(pos?.acc);
  const liveDistance = haversine(pos, selectedSlot?.point);
  const liveDistanceAcc = combinedAccuracy(pos, selectedSlot?.point);

  // ── 키 미입력 화면 ──────────────────────────────────────────────────────────
  if (!apiKey) {
    return (
      <Shell holeNo={holeNo} par={par} onClose={onClose}>
        <div style={{ padding: '28px 20px', overflowY: 'auto' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: COLOR.line, marginBottom: 10 }}>
            지도를 쓰려면 VWorld 인증키가 필요합니다
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.8, color: COLOR.dim, marginBottom: 18 }}>
            국토교통부가 운영하는 무료 위성영상입니다. 가입과 키 발급 모두 무료이고
            결제 카드 등록은 없습니다.
            <br /><br />
            1. 아래 링크에서 가입 후 <b style={{ color: COLOR.line }}>오픈API → 인증키 발급</b>
            <br />
            2. 서비스 환경은 <b style={{ color: COLOR.line }}>웹사이트</b>
            <br />
            3. 서비스 URL에 <b style={{ color: COLOR.line }}>misowana.github.io</b> 등록
            <br />
            4. 발급된 키를 아래에 붙여넣기
          </div>

          <a
            href={VWORLD_SIGNUP_URL} target="_blank" rel="noreferrer"
            style={{
              display: 'block', textAlign: 'center', padding: '11px', borderRadius: 9,
              border: `1.5px solid ${COLOR.gold}`, color: COLOR.gold,
              fontSize: 13, fontWeight: 700, textDecoration: 'none', marginBottom: 16,
            }}
          >VWorld 인증키 발급 페이지 열기 ↗</a>

          <input
            value={keyDraft}
            onChange={(e) => setKeyDraft(e.target.value)}
            placeholder="발급받은 인증키 붙여넣기"
            autoComplete="off" autoCorrect="off" spellCheck={false}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 9,
              border: '1.5px solid #3a4e72', background: '#131d35', color: COLOR.line,
              fontSize: 13, marginBottom: 10,
            }}
          />
          <button
            onClick={() => {
              const v = keyDraft.trim();
              if (!v) return;
              if (!setVWorldKey(v)) { setPosError('이 브라우저에서는 키를 저장할 수 없습니다.'); return; }
              setApiKey(v);
            }}
            disabled={!keyDraft.trim()}
            style={{
              width: '100%', padding: '13px', borderRadius: 9, cursor: 'pointer',
              border: 'none', background: keyDraft.trim() ? COLOR.gold : '#252f4a',
              color: keyDraft.trim() ? COLOR.ink : '#4d5a78', fontSize: 14, fontWeight: 800,
            }}
          >저장하고 지도 열기</button>

          <div style={{ marginTop: 14, fontSize: 10, lineHeight: 1.7, color: '#4d5a78' }}>
            키는 이 기기에만 저장되고 서버로 전송되지 않습니다. 발급 시 등록한
            도메인에서만 동작하므로 노출돼도 다른 곳에서 쓸 수 없습니다.
          </div>
        </div>
      </Shell>
    );
  }

  // ── 지도 화면 ───────────────────────────────────────────────────────────────
  return (
    <Shell holeNo={holeNo} par={par} onClose={onClose}>
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <div ref={containerRef} style={{ position: 'absolute', inset: 0, background: COLOR.ink }} />

        {placeMode && (
          <div style={{
            position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
            zIndex: 500, padding: '7px 14px', borderRadius: 999,
            background: 'rgba(201,162,40,0.94)', color: COLOR.ink,
            fontSize: 12, fontWeight: 800, pointerEvents: 'none',
          }}>
            {selectedSlot?.label} 위치를 지도에서 탭하세요
          </div>
        )}

        {tileError && (
          <div style={{
            position: 'absolute', top: 10, left: 12, right: 12, zIndex: 500,
            padding: '9px 12px', borderRadius: 9, background: 'rgba(239,83,80,0.92)',
            color: '#fff', fontSize: 11, lineHeight: 1.6, fontWeight: 600,
          }}>
            타일을 불러오지 못했습니다. 인증키가 이 도메인에 등록됐는지 확인해 주세요.
            <button
              onClick={() => { setVWorldKey(''); setApiKey(''); setKeyDraft(''); }}
              style={{
                display: 'block', marginTop: 6, padding: '4px 10px', borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.6)', background: 'transparent',
                color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}
            >키 다시 입력</button>
          </div>
        )}

        <button
          onClick={recenter}
          disabled={!pos}
          style={{
            position: 'absolute', right: 12, bottom: 12, zIndex: 500,
            width: 44, height: 44, borderRadius: 22, cursor: pos ? 'pointer' : 'default',
            border: '1.5px solid #3a4e72', background: 'rgba(11,14,24,0.85)',
            color: pos ? '#5b9cf6' : '#3a4e72', fontSize: 18,
          }}
        >◎</button>
      </div>

      {/* 하단 조작부 */}
      <div style={{ flexShrink: 0, borderTop: '1px solid #1b2238', background: '#0d1220' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 10, padding: '9px 14px 7px',
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: quality?.color ?? '#4d5a78' }}>
            {posError ? '측위 불가' : pos ? `내 위치 ${fmtAcc(pos.acc)} ${quality?.label ?? ''}` : '측위 중…'}
          </span>
          {liveDistance != null && (
            <span style={{ fontSize: 12, fontWeight: 800, color: COLOR.line }}>
              {selectedSlot.label}까지 {Math.round(liveDistance)}m
              {liveDistanceAcc != null && (
                <span style={{ fontSize: 10, fontWeight: 600, color: COLOR.dim, marginLeft: 4 }}>
                  {fmtAcc(liveDistanceAcc)}
                </span>
              )}
            </span>
          )}
        </div>

        {posError && (
          <div style={{ padding: '0 14px 7px', fontSize: 10, lineHeight: 1.5, color: COLOR.red }}>{posError}</div>
        )}

        {/* 지점 선택 */}
        <div style={{ display: 'flex', gap: 6, padding: '0 14px 9px', overflowX: 'auto' }}>
          {slots.map((s) => {
            const on = s.id === selected;
            return (
              <button
                key={String(s.id)}
                onClick={() => setSelected(s.id)}
                style={{
                  flexShrink: 0, padding: '7px 11px', borderRadius: 8, cursor: 'pointer',
                  border: `1.5px solid ${on ? COLOR.gold : s.point ? 'rgba(61,184,122,0.5)' : '#252f4a'}`,
                  background: on ? 'rgba(201,162,40,0.18)' : '#1a2235',
                  color: on ? COLOR.gold : s.point ? COLOR.green : COLOR.dim,
                  fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                }}
              >{s.point ? '✓ ' : ''}{s.label}</button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 7, padding: '0 14px 12px' }}>
          <button
            onClick={markHere}
            disabled={!pos}
            style={{
              flex: 2, padding: '14px 10px', borderRadius: 10, cursor: pos ? 'pointer' : 'default',
              border: 'none', background: pos ? COLOR.gold : '#252f4a',
              color: pos ? COLOR.ink : '#4d5a78', fontSize: 14, fontWeight: 800,
            }}
          >📍 {selectedSlot?.label} 여기로 찍기</button>
          <button
            onClick={() => setPlaceMode((v) => !v)}
            style={{
              flex: 1, padding: '14px 8px', borderRadius: 10, cursor: 'pointer',
              border: `1.5px solid ${placeMode ? COLOR.gold : '#3a4e72'}`,
              background: placeMode ? 'rgba(201,162,40,0.18)' : 'transparent',
              color: placeMode ? COLOR.gold : '#c4cfe0', fontSize: 12, fontWeight: 700,
            }}
          >{placeMode ? '취소' : '지도에서'}</button>
          {selectedSlot?.point && (
            <button
              onClick={() => commitPoint(selected, null)}
              style={{
                width: 48, borderRadius: 10, cursor: 'pointer',
                border: '1px solid rgba(239,83,80,0.35)', background: 'transparent',
                color: 'rgba(239,83,80,0.75)', fontSize: 13, fontWeight: 700,
              }}
            >✕</button>
          )}
        </div>
      </div>
    </Shell>
  );
}

// ─── 공통 껍데기 ──────────────────────────────────────────────────────────────

function Shell({ holeNo, par, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1200,
      display: 'flex', flexDirection: 'column',
      background: COLOR.ink,
      paddingTop: 'env(safe-area-inset-top, 0)',
      paddingBottom: 'env(safe-area-inset-bottom, 0)',
    }}>
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px', borderBottom: '1px solid #1b2238',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: COLOR.gold, letterSpacing: '0.22em' }}>
            HOLE {holeNo}
          </span>
          <span style={{ fontSize: 13, fontWeight: 800, color: COLOR.line }}>PAR {par}</span>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 36, height: 36, borderRadius: 8, cursor: 'pointer',
            border: 'none', background: 'transparent', color: COLOR.dim, fontSize: 18,
          }}
        >✕</button>
      </div>
      {children}
    </div>
  );
}
