import { Fragment, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { haversine, combinedAccuracy, gpsQuality, shotDistances, pinDistances } from '../../engine/geo.js';
import { pointIcon, pinIcon, draftIcon, distanceIcon, createSatelliteMap } from '../map/holeMapLayers.js';
import { getVWorldKey, setVWorldKey, VWORLD_SIGNUP_URL } from '../../engine/mapTiles.js';

// 라운드 중에 쓰는 화면이라 기본 줌은 한 홀이 거의 다 들어오는 수준으로 잡는다.
const INITIAL_ZOOM = 17;
const GREEN_SLOT = 'green';
const PIN_SLOT = 'pin';

const COLOR = {
  gold: '#c9a228', green: '#3db87a', red: '#ef5350',
  ink: '#0b0e18', line: '#e8edf8', dim: '#8896b0',
};

const fmtAcc = (acc) => (acc == null ? '' : `±${Math.round(acc)}m`);

// ─── 본체 ─────────────────────────────────────────────────────────────────────

export default function HoleMapModal({
  holeNo, par, gpsPoints, gpsGreen, gpsPin, fieldShots, shotLabel, finalLabel = '그린',
  onSetPoint, onSetGreen, onSetPin, onAddShot, onUndoShot, onClose,
}) {
  const [apiKey, setApiKey] = useState(getVWorldKey);
  const [keyDraft, setKeyDraft] = useState('');
  // 평소엔 빌드에 주입된 키로 바로 열린다. 이 폼은 키가 아예 없거나(로컬 개발,
  // 시크릿 미설정) 키가 막혔을 때 재배포 없이 끼워 넣는 탈출구다.
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [pos, setPos] = useState(null);          // 실시간 현재 위치
  const [posError, setPosError] = useState(
    () => (navigator.geolocation ? null : '이 브라우저는 위치 기능을 지원하지 않습니다.'),
  );
  const [placeMode, setPlaceMode] = useState(false);
  const [tileError, setTileError] = useState(false);
  // draft: 지도에서 놓았지만 아직 확정하지 않은 위치. 드래그로 미세조정한 뒤
  // "위치 확정"을 눌러야 기록된다 — 한 번 탭으로 바로 들어가면 손가락이
  // 빗나갔을 때 되돌리기가 번거롭다.
  const [draft, setDraft] = useState(null);

  // 지점은 순서대로만 찍는다 — 직전 지점이 없으면 거리가 나오지 않아 기록해도
  // 의미가 없다. 원온(파3 GIR·파4/5 teeGIR)과 홀인원은 fieldShots가 1이라
  // 마지막 지점의 직전이 곧 티샷이 되어, 세컨샷을 거치지 않고 바로 열린다.
  const slots = [
    ...Array.from({ length: fieldShots }, (_, i) => ({
      id: i, label: shotLabel(i), point: gpsPoints[i] || null,
      locked: i > 0 && !gpsPoints[i - 1],
    })),
    {
      id: GREEN_SLOT, label: finalLabel, point: gpsGreen,
      locked: !gpsPoints[fieldShots - 1],
    },
    // 핀은 샷 순서와 무관하다. 티에서 그린을 보고 미리 찍어야 홀 전장과
    // 잔여거리가 나오므로 순차 잠금에서 뺀다.
    { id: PIN_SLOT, label: '핀', point: gpsPin || null, locked: false },
  ];
  const firstOpen = slots.find((s) => !s.point && !s.locked);
  const [selected, setSelected] = useState(firstOpen ? firstOpen.id : 0);
  const selectedSlot = slots.find((s) => s.id === selected) ?? slots[0];

  // 선택된 지점이 아직 차례가 아님 — 찍기 버튼을 막는다.
  const blockedSlot = !!selectedSlot?.locked && !selectedSlot?.point;

  // 거리를 재는 기준이 되는 직전 지점. 핀은 티박스 기준이라 그 거리가 홀 전장이다.
  const prevPointOf = (slotId) => {
    if (slotId === PIN_SLOT) return gpsPoints[0] || null;
    if (slotId === GREEN_SLOT) return gpsPoints[fieldShots - 1] || null;
    return slotId > 0 ? (gpsPoints[slotId - 1] || null) : null;
  };
  const prevLabelOf = (slotId) => {
    if (slotId === PIN_SLOT) return '홀 전장';
    if (slotId === GREEN_SLOT) return shotLabel(fieldShots - 1);
    return slotId > 0 ? shotLabel(slotId - 1) : null;
  };
  const prerequisiteLabel = prevLabelOf(selected);
  const draftPrevPoint = prevPointOf(selected);

  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const overlayRef = useRef(null);   // 샷 지점·궤적
  const meRef = useRef(null);        // 현재 위치
  const didCenterRef = useRef(false);
  const placeModeRef = useRef(placeMode);
  const selectedRef = useRef(selected);
  const commitRef = useRef(null);
  const draftRef = useRef(null);
  const draftLineRef = useRef(null);
  // 드래그 중에는 Leaflet이 마커 위치의 주인이다. 그 사이 setLatLng을 다시
  // 걸면 손가락과 마커가 어긋나므로 동기화를 건너뛴다.
  const draggingRef = useRef(false);

  const commitPoint = (slotId, fix) => {
    if (slotId === PIN_SLOT) onSetPin(fix);
    else if (slotId === GREEN_SLOT) onSetGreen(fix);
    else onSetPoint(slotId, fix);
  };

  // 새로 찍은 경우에만 다음 빈 지점으로 넘어간다 (티 → 세컨 → 그린 순서로
  // 버튼만 누르면 되도록). 이미 찍힌 지점을 고쳐 찍는 중이거나 지우는 중이면
  // 그 자리에 머물러야 한다 — 수정하자마자 다른 지점으로 튀면 안 된다.
  const commitAndAdvance = (slotId, fix) => {
    const wasEmpty = !slots.find((s) => s.id === slotId)?.point;
    commitPoint(slotId, fix);
    if (!fix || !wasEmpty) return;

    // 핀은 샷 순서 밖이다. 핀을 막 찍었다면 샷 흐름의 첫 미기록 지점으로
    // 되돌려 준다 — 안 그러면 핀에 머물러 다음 샷을 찍으러 한 번 더 눌러야 한다.
    if (slotId === PIN_SLOT) {
      const back = slots.find((s) => s.id !== PIN_SLOT && !s.point && !s.locked);
      if (back) setSelected(back.id);
      return;
    }
    const from = slots.findIndex((s) => s.id === slotId);
    const next = slots.slice(from + 1).find((s) => s.id !== PIN_SLOT && !s.point);
    if (next) setSelected(next.id);
  };

  // 샷 추가: 그린을 못 올렸을 때. 새로 생긴 샷 칸을 바로 선택해 둔다.
  const addShot = () => {
    setDraft(null);
    setPlaceMode(false);
    onAddShot?.();
    setSelected(fieldShots); // 지금의 그린 자리가 곧 새 샷의 자리가 된다
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

    const map = createSatelliteMap(containerRef.current, apiKey, {
      onTileError: () => setTileError(true),
      onTileLoad: () => setTileError(false),
    });

    overlayRef.current = L.layerGroup().addTo(map);
    draftLineRef.current = L.layerGroup().addTo(map);
    meRef.current = L.layerGroup().addTo(map);

    // 지도에서 지정 모드: 탭한 곳을 선택된 지점으로 기록한다.
    // GPS 측위가 나쁘거나 찍는 걸 깜빡했을 때 위성영상 보고 직접 지정하는 용도라
    // acc는 null로 둔다 (측정값이 아니라는 표시).
    // 탭은 임시 위치를 놓기만 한다. 확정은 아래 "위치 확정" 버튼에서.
    map.on('click', (e) => {
      if (!placeModeRef.current) return;
      setDraft({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    mapRef.current = map;
    // 모달이 그려진 직후엔 컨테이너 크기가 0일 수 있다.
    setTimeout(() => map.invalidateSize(), 60);

    return () => {
      map.remove();
      mapRef.current = null; draftRef.current = null; draftLineRef.current = null;
    };
  }, [apiKey]);

  // ── 확정 전 임시 마커 (드래그 가능) ─────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!draft) {
      if (draftRef.current) { map.removeLayer(draftRef.current); draftRef.current = null; }
      draggingRef.current = false;
      return;
    }
    if (!draftRef.current) {
      const marker = L.marker([draft.lat, draft.lng], {
        draggable: true, autoPan: true, icon: draftIcon(), zIndexOffset: 1000,
      });
      const sync = () => {
        const ll = marker.getLatLng();
        setDraft({ lat: ll.lat, lng: ll.lng });
      };
      marker.on('dragstart', () => { draggingRef.current = true; });
      // 'drag'는 끄는 동안 계속 발생한다 — 거리를 실시간으로 갱신하려면
      // dragend만으로는 부족하다.
      marker.on('drag', sync);
      marker.on('dragend', () => { draggingRef.current = false; sync(); });
      marker.addTo(map);
      draftRef.current = marker;
    } else if (!draggingRef.current) {
      draftRef.current.setLatLng([draft.lat, draft.lng]);
    }
  }, [draft]);

  // ── 확정 전 미리보기 선 ─────────────────────────────────────────────────────
  // 직전 지점 → 임시 위치 → 핀. 선 객체를 유지하고 좌표만 갈아끼운다 —
  // 드래그 프레임마다 레이어를 지웠다 다시 만들면 끊겨 보인다.
  useEffect(() => {
    const group = draftLineRef.current;
    if (!group) return;

    if (!draft) { group.clearLayers(); return; }

    const want = [];
    if (draftPrevPoint) {
      want.push([[draftPrevPoint.lat, draftPrevPoint.lng], [draft.lat, draft.lng], COLOR.gold, '6 5']);
    }
    if (gpsPin && selected !== PIN_SLOT) {
      want.push([[draft.lat, draft.lng], [gpsPin.lat, gpsPin.lng], '#ef5350', '3 5']);
    }

    const lines = group.getLayers();
    want.forEach(([from, to, color, dash], i) => {
      if (lines[i]) {
        lines[i].setLatLngs([from, to]);
        lines[i].setStyle({ color, dashArray: dash });
      } else {
        L.polyline([from, to], { color, weight: 2.5, opacity: 0.9, dashArray: dash }).addTo(group);
      }
    });
    lines.slice(want.length).forEach((l) => group.removeLayer(l));
  }, [draft, draftPrevPoint, gpsPin, selected]);

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

    // 핀은 샷 궤적 체인에 들어가지 않는다 — 샷이 지나간 자리가 아니라 목표다.
    const shotSlots = slots.filter((s) => s.id !== PIN_SLOT);
    const marked = shotSlots.filter((s) => s.point);

    marked.forEach((s) => {
      L.marker([s.point.lat, s.point.lng], { icon: pointIcon(s.label) }).addTo(layer);
    });
    if (gpsPin) {
      L.marker([gpsPin.lat, gpsPin.lng], { icon: pinIcon() }).addTo(layer);
    }

    // 각 샷 지점에서 핀까지 — 남은 거리를 눈으로 보도록 가는 실선으로 잇는다.
    if (gpsPin) {
      marked.forEach((s) => {
        if (s.id === GREEN_SLOT) return; // 그린 도착점은 핀과 거의 겹친다
        L.polyline([[s.point.lat, s.point.lng], [gpsPin.lat, gpsPin.lng]], {
          color: '#ef5350', weight: 1.2, opacity: 0.45, dashArray: '2 6',
        }).addTo(layer);
      });
    }

    // 연속으로 기록된 구간만 선으로 잇는다 (중간이 비면 거리가 성립하지 않는다).
    for (let i = 0; i < shotSlots.length - 1; i++) {
      const from = shotSlots[i].point;
      const to = shotSlots[i + 1].point;
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
    const focus = gpsPin ? [...marked.map((s) => s.point), gpsPin] : marked.map((s) => s.point);
    if (map && focus.length > 0 && !didCenterRef.current) {
      didCenterRef.current = true;
      if (focus.length === 1) map.setView([focus[0].lat, focus[0].lng], INITIAL_ZOOM);
      else map.fitBounds(L.latLngBounds(focus.map((p) => [p.lat, p.lng])), { padding: [60, 60] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpsPoints, gpsGreen, gpsPin, fieldShots, apiKey]);

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
    setDraft(null);
    setPlaceMode(false);
    commitAndAdvance(selected, { ...pos, t: Date.now() });
  };

  const confirmDraft = () => {
    if (!draft) return;
    // acc를 null로 둔다 — 측정값이 아니라 지도에서 지정한 위치라는 표시.
    commitAndAdvance(selected, { lat: draft.lat, lng: draft.lng, acc: null, t: Date.now(), manual: true });
    setDraft(null);
    setPlaceMode(false);
  };

  const cancelDraft = () => { setDraft(null); setPlaceMode(false); };

  // 확정 전 미리보기 거리 — 드래그하는 동안 실시간으로 갱신된다.
  //   draftDistance : 직전 지점 → 임시 위치 (그 샷이 날아간 거리)
  //   draftToPin    : 임시 위치 → 핀 (거기서 남는 거리)
  // 핀 자리를 잡는 중이면 "임시 위치 → 핀"이 성립하지 않으므로, 대신 티박스
  // 기준 거리 하나(= 그날 홀 전장)만 보여준다.
  const draftDistance = haversine(draftPrevPoint, draft);
  const draftToPin = selected === PIN_SLOT ? null : haversine(draft, gpsPin);

  const quality = gpsQuality(pos?.acc);
  const liveDistance = haversine(pos, selectedSlot?.point);
  const liveDistanceAcc = combinedAccuracy(pos, selectedSlot?.point);
  const liveToPin = haversine(pos, gpsPin);

  // 거리 요약.
  //   shotDist[i]  = (i+1)번째 샷이 날아간 거리
  //   toPinArr[i]  = (i+1)번째 샷을 치는 자리에서 핀까지 남은 거리
  // 따라서 샷 n의 "볼이 멈춘 자리에서 핀까지"는 toPinArr[n]이고, 마지막 샷은
  // 볼이 그린에 있으므로 그린 도착점 → 핀이 된다(= 첫 퍼팅 거리).
  const shotDist = shotDistances(gpsPoints, gpsGreen, fieldShots);
  const toPinArr = pinDistances(gpsPoints, gpsPin, fieldShots);
  const holeLength = toPinArr[0] ?? null;   // 티박스 → 핀 = 그날의 홀 전장

  const summaryRows = Array.from({ length: fieldShots }, (_, i) => ({
    label: shotLabel(i),
    shot: shotDist[i] ?? null,
    toPin: i + 1 < fieldShots ? (toPinArr[i + 1] ?? null) : haversine(gpsGreen, gpsPin),
  })).filter((r) => r.shot != null || r.toPin != null);

  // ── 키 입력 화면 (탈출구) ───────────────────────────────────────────────────
  if (!apiKey || showKeyForm) {
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
              setShowKeyForm(false);
              setTileError(false);
            }}
            disabled={!keyDraft.trim()}
            style={{
              width: '100%', padding: '13px', borderRadius: 9, cursor: 'pointer',
              border: 'none', background: keyDraft.trim() ? COLOR.gold : '#252f4a',
              color: keyDraft.trim() ? COLOR.ink : '#4d5a78', fontSize: 14, fontWeight: 800,
            }}
          >저장하고 지도 열기</button>

          {apiKey && (
            <button
              onClick={() => { setShowKeyForm(false); setKeyDraft(''); }}
              style={{
                width: '100%', marginTop: 8, padding: '11px', borderRadius: 9, cursor: 'pointer',
                border: '1px solid #3a4e72', background: 'transparent',
                color: COLOR.dim, fontSize: 13, fontWeight: 700,
              }}
            >취소하고 지도로 돌아가기</button>
          )}

          <div style={{ marginTop: 14, fontSize: 10, lineHeight: 1.7, color: '#4d5a78' }}>
            여기서 넣은 키는 이 기기에만 저장되고 서버로 전송되지 않습니다.
            배포본에 키를 넣어두면 이 화면 없이 바로 지도가 열립니다
            (저장소 시크릿 VITE_VWORLD_KEY).
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
            zIndex: 500, padding: '7px 14px', borderRadius: 999, whiteSpace: 'nowrap',
            background: draft ? 'rgba(142,192,255,0.95)' : 'rgba(201,162,40,0.94)',
            color: COLOR.ink, fontSize: 12, fontWeight: 800, pointerEvents: 'none',
          }}>
            {draft
              ? '마커를 끌어 맞춘 뒤 아래에서 확정하세요'
              : `${selectedSlot?.label} 위치를 지도에서 탭하세요`}
          </div>
        )}

        {tileError && (
          <div style={{
            position: 'absolute', top: 10, left: 12, right: 12, zIndex: 500,
            padding: '9px 12px', borderRadius: 9, background: 'rgba(239,83,80,0.92)',
            color: '#fff', fontSize: 11, lineHeight: 1.6, fontWeight: 600,
          }}>
            타일을 불러오지 못했습니다. 인증키가 만료됐거나, 현재 위치가 국내가
            아닐 수 있습니다 (VWorld 위성영상은 대한민국만 제공합니다).
            <button
              onClick={() => setShowKeyForm(true)}
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
        {/* 현재 위치 → 핀: 라운드 중 가장 자주 보는 숫자라 제일 크게 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 10, padding: '9px 14px 7px',
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: quality?.color ?? '#4d5a78' }}>
            {posError ? '측위 불가' : pos ? `내 위치 ${fmtAcc(pos.acc)} ${quality?.label ?? ''}` : '측위 중…'}
          </span>
          {liveToPin != null ? (
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: COLOR.dim }}>⛳ 핀까지</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: COLOR.gold, lineHeight: 1 }}>
                {Math.round(liveToPin)}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: COLOR.dim }}>m</span>
            </span>
          ) : liveDistance != null ? (
            <span style={{ fontSize: 12, fontWeight: 800, color: COLOR.line }}>
              {selectedSlot.label}까지 {Math.round(liveDistance)}m
              {liveDistanceAcc != null && (
                <span style={{ fontSize: 10, fontWeight: 600, color: COLOR.dim, marginLeft: 4 }}>
                  {fmtAcc(liveDistanceAcc)}
                </span>
              )}
            </span>
          ) : null}
        </div>

        {posError && (
          <div style={{ padding: '0 14px 7px', fontSize: 10, lineHeight: 1.5, color: COLOR.red }}>{posError}</div>
        )}

        {/* 거리 요약 — 홀 전장과 샷별 거리/잔여거리 */}
        {summaryRows.length > 0 && (
          <div style={{ padding: '0 14px 8px' }}>
            {holeLength != null && (
              <div style={{
                display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                padding: '5px 9px', borderRadius: 6, marginBottom: 4,
                background: 'rgba(201,162,40,0.1)', border: '1px solid rgba(201,162,40,0.28)',
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: COLOR.gold, letterSpacing: '0.1em' }}>
                  홀 전장 (티 → 핀)
                </span>
                <span style={{ fontSize: 14, fontWeight: 900, color: COLOR.gold }}>
                  {Math.round(holeLength)}m
                </span>
              </div>
            )}
            {summaryRows.map((r) => (
              <div key={r.label} style={{
                display: 'flex', alignItems: 'baseline', gap: 8,
                padding: '3px 9px', borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}>
                <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: COLOR.dim }}>{r.label}</span>
                {r.shot != null && (
                  <span style={{ fontSize: 13, fontWeight: 800, color: COLOR.line }}>
                    {Math.round(r.shot)}m
                  </span>
                )}
                {r.toPin != null && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: COLOR.gold, minWidth: 74, textAlign: 'right' }}>
                    핀까지 {Math.round(r.toPin)}m
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 지점 선택 */}
        <div style={{ display: 'flex', gap: 6, padding: '0 14px 9px', overflowX: 'auto' }}>
          {slots.map((s) => {
            const on = s.id === selected;
            // 아직 차례가 아닌 지점은 고를 수 없다. 이미 찍힌 지점은 언제든
            // 다시 고를 수 있어야 한다 — 지나온 샷도 고쳐 찍을 수 있도록.
            const blocked = s.locked && !s.point;
            return (
              <Fragment key={String(s.id)}>
                <button
                  onClick={() => {
                    if (blocked) return;
                    setSelected(s.id);
                    // 임시 위치는 그 지점에 속한 것이라 지점을 바꾸면 버린다.
                    setDraft(null);
                    // 핀은 티박스에서 GPS로 찍을 수 없어 거의 항상 지도를 보고
                    // 찍는다. 아직 안 찍혔으면 바로 지정 모드로 들어가 한 탭 아낀다.
                    setPlaceMode(s.id === PIN_SLOT && !s.point);
                  }}
                  disabled={blocked}
                  style={{
                    flexShrink: 0, padding: '7px 11px', borderRadius: 8,
                    cursor: blocked ? 'default' : 'pointer',
                    opacity: blocked ? 0.4 : 1,
                    border: `1.5px solid ${on ? COLOR.gold : s.point ? 'rgba(61,184,122,0.5)' : '#252f4a'}`,
                    background: on ? 'rgba(201,162,40,0.18)' : '#1a2235',
                    color: on ? COLOR.gold : s.point ? COLOR.green : COLOR.dim,
                    fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                  }}
                >{s.point ? '✓ ' : blocked ? '🔒 ' : ''}{s.label}</button>

                {/* 마지막 샷 칸 바로 뒤에 "샷 추가" — 그린을 못 올렸을 때
                    폼으로 돌아가지 않고 여기서 샷을 늘린다. */}
                {s.id === fieldShots - 1 && onAddShot && (
                  <button
                    onClick={addShot}
                    style={{
                      flexShrink: 0, padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
                      border: '1.5px dashed #3a4e72', background: 'transparent',
                      color: '#8ec0ff', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                    }}
                  >＋ 샷</button>
                )}
                {s.id === fieldShots - 1 && onUndoShot && (
                  <button
                    onClick={() => { setDraft(null); setPlaceMode(false); onUndoShot(); }}
                    style={{
                      flexShrink: 0, padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
                      border: '1px solid rgba(239,83,80,0.3)', background: 'transparent',
                      color: 'rgba(239,83,80,0.7)', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                    }}
                  >− 취소</button>
                )}
              </Fragment>
            );
          })}
        </div>

        {draft ? (
          /* 확정 대기 — 마커를 끌어 맞춘 뒤 눌러 기록한다 */
          <div style={{ padding: '0 14px 12px' }}>
            {/* 끄는 동안 양쪽 거리가 같이 움직인다 — 어디에 놓을지 이 숫자로 정한다 */}
            <div style={{
              padding: '8px 12px', borderRadius: 8, marginBottom: 7,
              background: 'rgba(142,192,255,0.1)', border: '1px solid rgba(142,192,255,0.3)',
            }}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: '#8ec0ff',
                letterSpacing: '0.1em', marginBottom: 5, textAlign: 'center',
              }}>
                {selectedSlot?.label} 위치 조정 중
              </div>
              <div style={{ display: 'flex', alignItems: 'stretch', gap: 10 }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: COLOR.dim, marginBottom: 2 }}>
                    {prerequisiteLabel ?? '직전 지점'}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: COLOR.line, lineHeight: 1 }}>
                    {draftDistance != null ? Math.round(draftDistance) : '—'}
                    <span style={{ fontSize: 11, fontWeight: 700, color: COLOR.dim, marginLeft: 2 }}>m</span>
                  </div>
                </div>
                <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: COLOR.dim, marginBottom: 2 }}>
                    ⛳ 핀까지
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: COLOR.gold, lineHeight: 1 }}>
                    {draftToPin != null ? Math.round(draftToPin) : '—'}
                    <span style={{ fontSize: 11, fontWeight: 700, color: COLOR.dim, marginLeft: 2 }}>m</span>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 7 }}>
              <button
                onClick={confirmDraft}
                style={{
                  flex: 2, padding: '14px 10px', borderRadius: 10, cursor: 'pointer',
                  border: 'none', background: COLOR.gold, color: COLOR.ink,
                  fontSize: 14, fontWeight: 800,
                }}
              >✓ 이 위치로 확정</button>
              <button
                onClick={cancelDraft}
                style={{
                  flex: 1, padding: '14px 8px', borderRadius: 10, cursor: 'pointer',
                  border: '1.5px solid #3a4e72', background: 'transparent',
                  color: '#c4cfe0', fontSize: 12, fontWeight: 700,
                }}
              >취소</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 7, padding: '0 14px 12px' }}>
            <button
              onClick={markHere}
              disabled={!pos || blockedSlot}
              style={{
                flex: 2, padding: '14px 10px', borderRadius: 10,
                cursor: pos && !blockedSlot ? 'pointer' : 'default',
                border: 'none', background: pos && !blockedSlot ? COLOR.gold : '#252f4a',
                color: pos && !blockedSlot ? COLOR.ink : '#4d5a78', fontSize: 14, fontWeight: 800,
              }}
            >
              {blockedSlot
                ? `${prerequisiteLabel} 지점을 먼저 찍어주세요`
                : `📍 ${selectedSlot?.label} ${selectedSlot?.point ? '다시 찍기' : '여기로 찍기'}`}
            </button>
            <button
              onClick={() => setPlaceMode((v) => !v)}
              disabled={blockedSlot}
              style={{
                flex: 1, padding: '14px 8px', borderRadius: 10,
                cursor: blockedSlot ? 'default' : 'pointer', opacity: blockedSlot ? 0.4 : 1,
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
        )}
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
