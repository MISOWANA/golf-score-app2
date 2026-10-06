import { useEffect, useRef, useState } from 'react';
import { haversine, combinedAccuracy, gpsQuality } from '../../engine/geo.js';

// ─── 측위 ──────────────────────────────────────────────────────────────────────
//
// getCurrentPosition은 첫 fix가 들어오는 즉시 반환해서 오차가 크게 잡힌다.
// 짧게 watchPosition을 걸어 들어오는 fix 중 가장 정확한 것을 고르고,
// 충분히 좋은 값이 나오면 기다리지 않고 바로 끝낸다.

const CAPTURE_MS = 6000;
const GOOD_ENOUGH_M = 6;

function captureBestFix(onProgress) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('UNSUPPORTED')); return; }

    let best = null;
    let watchId = null;
    let timer = null;
    let done = false;

    const stop = () => {
      done = true;
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      clearTimeout(timer);
    };

    const finish = () => {
      if (done) return;
      stop();
      if (best) resolve(best); else reject(new Error('NO_FIX'));
    };

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (done) return;
        const fix = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          acc: pos.coords.accuracy ?? null,
          t: Date.now(),
        };
        if (!best || (fix.acc != null && (best.acc == null || fix.acc < best.acc))) best = fix;
        onProgress?.(best);
        if (best.acc != null && best.acc <= GOOD_ENOUGH_M) finish();
      },
      (err) => {
        if (done) return;
        // 측위 중 한 번 실패해도 이미 받아둔 fix가 있으면 그걸 쓴다.
        if (best) { finish(); return; }
        stop();
        reject(err);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: CAPTURE_MS },
    );

    timer = setTimeout(finish, CAPTURE_MS);
  });
}

function errorMessage(err) {
  if (err?.message === 'UNSUPPORTED') return '이 브라우저는 위치 기능을 지원하지 않습니다.';
  if (err?.message === 'NO_FIX') return '위치를 잡지 못했습니다. 하늘이 트인 곳에서 다시 시도해 주세요.';
  switch (err?.code) {
    case 1: return '위치 권한이 거부됐습니다. 브라우저 설정에서 허용해 주세요.';
    case 2: return '위치를 잡지 못했습니다. 하늘이 트인 곳에서 다시 시도해 주세요.';
    case 3: return '측위 시간이 초과됐습니다. 다시 시도해 주세요.';
    default: return '위치를 가져오지 못했습니다. 다시 시도해 주세요.';
  }
}

const fmtAcc = (acc) => acc == null ? '' : `±${Math.round(acc)}m`;

// ─── 컴포넌트 ──────────────────────────────────────────────────────────────────
//
// 한 지점당 버튼 하나. prevPoint가 있으면 "직전 지점 → 이 지점" 거리가
// 곧 그 샷의 거리이므로 같이 보여준다 (사용자가 볼 앞에 서서 방금 친 샷이
// 몇 m 갔는지 바로 확인하는 흐름).

export default function GpsShotPoint({ label, point, prevPoint, prevLabel, onCapture, onClear }) {
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(null);
  const [error, setError] = useState(null);
  const aliveRef = useRef(true);

  useEffect(() => () => { aliveRef.current = false; }, []);

  const run = async () => {
    setBusy(true); setError(null); setLive(null);
    try {
      const fix = await captureBestFix((f) => { if (aliveRef.current) setLive(f); });
      if (!aliveRef.current) return;
      onCapture(fix);
    } catch (err) {
      if (aliveRef.current) setError(errorMessage(err));
    } finally {
      if (aliveRef.current) { setBusy(false); setLive(null); }
    }
  };

  const quality = gpsQuality(point?.acc);
  const distance = haversine(prevPoint, point);
  const distanceAcc = combinedAccuracy(prevPoint, point);

  return (
    <div style={{ padding: '8px 16px 10px', borderBottom: '1px solid #0e1320' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 14, width: 18, textAlign: 'center', color: '#7888a8', flexShrink: 0 }}>📍</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#8ca4bc', letterSpacing: '0.15em' }}>{label}</span>
        {point && quality && (
          <span style={{ fontSize: 10, fontWeight: 700, color: quality.color, marginLeft: 2 }}>
            {fmtAcc(point.acc)} {quality.label}
          </span>
        )}
      </div>

      {point ? (
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '11px 12px', borderRadius: 9,
            border: '1.5px solid rgba(61,184,122,0.45)', background: 'rgba(61,184,122,0.1)',
          }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#3db87a' }}>✓ 기록됨</span>
            {distance != null && (
              <span style={{ fontSize: 13, fontWeight: 800, color: '#e8edf8' }}>
                {prevLabel} {Math.round(distance)}m
                {distanceAcc != null && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#8896b0', marginLeft: 4 }}>
                    {fmtAcc(distanceAcc)}
                  </span>
                )}
              </span>
            )}
          </div>
          <button
            onClick={onClear}
            style={{
              width: 44, borderRadius: 9, cursor: 'pointer',
              border: '1px solid rgba(239,83,80,0.3)', background: 'transparent',
              color: 'rgba(239,83,80,0.65)', fontSize: 13, fontWeight: 700,
            }}
          >✕</button>
        </div>
      ) : (
        <button
          onClick={run}
          disabled={busy}
          style={{
            width: '100%', padding: '12px 16px', borderRadius: 9,
            cursor: busy ? 'default' : 'pointer',
            border: `1.5px solid ${busy ? 'rgba(201,162,40,0.45)' : '#3a4e72'}`,
            background: busy ? 'rgba(201,162,40,0.08)' : 'rgba(255,255,255,0.03)',
            color: busy ? '#c9a228' : '#c4cfe0',
            fontSize: 13, fontWeight: 700, letterSpacing: '0.04em',
          }}
        >
          {busy
            ? `측위 중… ${live?.acc != null ? fmtAcc(live.acc) : ''}`
            : '📍 여기서 위치 찍기'}
        </button>
      )}

      {error && (
        <div style={{ marginTop: 7, fontSize: 10, lineHeight: 1.5, color: '#ef5350' }}>{error}</div>
      )}
    </div>
  );
}
