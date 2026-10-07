import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { buildHoleReview } from '../../engine/holeReview.js';
import { getVWorldKey } from '../../engine/mapTiles.js';
import { renderHoleImage } from '../../engine/holeImage.js';
import { createSatelliteMap, drawHoleOverlay, MAP_COLOR as C } from '../map/holeMapLayers.js';

// 라운드 후 홀별 복기. "어떤 거리에서 어떤 채를 쓰고 어떤 결과였나"를
// 지도와 샷 타임라인으로 함께 본다.

const m = (v) => (v == null ? '—' : `${Math.round(v)}m`);
const m1 = (v) => (v == null ? '—' : `${Number(v).toFixed(1)}m`);

const TONE = { great: C.goldBright, good: C.green, bad: C.red };
// C.dim(#8896b0)은 작은 글씨에서 대비가 부족해 라벨용 밝은 회색을 따로 쓴다.
const LABEL = '#a8b6cc';
const MUTED = '#4d5a78';
const CARD = '#131d35';
const BORDER = '#1b2238';

const scoreTone = (diff) => {
  if (diff == null) return C.dim;
  if (diff <= -1) return C.green;
  if (diff === 0) return C.line;
  return diff === 1 ? '#e57373' : C.red;
};
const scoreText = (diff) => (diff == null ? '—' : diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`);
const SCORE_NAME = { [-3]: '알바트로스', [-2]: '이글', [-1]: '버디', 0: '파', 1: '보기', 2: '더블보기', 3: '트리플보기' };
const scoreName = (strokes, diff) => {
  if (strokes === 1) return '홀인원';
  if (diff == null) return null;
  return SCORE_NAME[diff] ?? scoreText(diff);
};

// 색을 반투명 바탕으로 — 결과 배지·요약 타일 배경에 쓴다.
const tint = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

// 결과 배지 (페어웨이·온그린·그린 놓침 …)
function Pill({ text, color }) {
  return (
    <span style={{
      flexShrink: 0, padding: '4px 10px', borderRadius: 999,
      background: tint(color, 0.14), border: `1px solid ${tint(color, 0.45)}`,
      color, fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap',
    }}>{text}</span>
  );
}

// 숫자 하나를 크게, 라벨은 위에 작게.
function Metric({ label, value, color, note }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: LABEL, letterSpacing: '0.04em', marginBottom: 2 }}>
        {label}{note && <span style={{ marginLeft: 4, fontWeight: 600, opacity: 0.8 }}>{note}</span>}
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}

function Tag({ label, value }) {
  return (
    <span style={{
      padding: '4px 9px', borderRadius: 7, background: 'rgba(255,255,255,0.05)',
      fontSize: 12, color: LABEL, whiteSpace: 'nowrap',
    }}>
      {label} <b style={{ color: C.line, fontWeight: 800 }}>{value}</b>
    </span>
  );
}

// 타임라인 한 칸 — 왼쪽 레일(번호 원 + 연결선)과 오른쪽 카드.
// 원과 카드 왼쪽 선을 결과 색으로 칠해 스크롤만 해도 흐름이 읽히게 한다.
function Step({ marker, color, last, children }) {
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <div style={{ width: 30, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%', flexShrink: 0, marginTop: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: tint(color, 0.16), border: `2px solid ${color}`,
          color, fontSize: 13, fontWeight: 900,
        }}>{marker}</div>
        {!last && <div style={{ flex: 1, width: 2, minHeight: 10, background: '#24304d', marginTop: 3 }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingBottom: last ? 0 : 10 }}>
        <div style={{
          padding: '12px 14px', borderRadius: 12, background: CARD,
          border: `1px solid ${BORDER}`, borderLeft: `3px solid ${color}`,
        }}>{children}</div>
      </div>
    </div>
  );
}

export default function HoleReview({ round, player, holeIdx, onNav, onClose }) {
  const hole = round?.holes?.[holeIdx];
  const review = hole ? buildHoleReview(hole, player, holeIdx) : null;

  const apiKey = getVWorldKey();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const overlayRef = useRef(null);
  const [tileError, setTileError] = useState(false);
  // 이미지 저장 — 캔버스에 타일을 직접 그려 PNG로 만든다.
  // 어느 홀의 결과인지 함께 들고 다녀서, 홀을 넘기면 자연히 사라지게 한다
  // (effect로 초기화하면 불필요한 연쇄 렌더가 생긴다).
  const [image, setImage] = useState(null);       // { holeIdx, dataUrl, ... }
  const [rendering, setRendering] = useState(false);
  const [imageError, setImageError] = useState(null); // { holeIdx, text }

  const hasMap = !!apiKey && !!review?.gps.hasAny;

  useEffect(() => {
    if (!hasMap || !containerRef.current || mapRef.current) return;
    const map = createSatelliteMap(containerRef.current, apiKey, {
      onTileError: () => setTileError(true),
      onTileLoad: () => setTileError(false),
    });
    overlayRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 60);
    return () => { map.remove(); mapRef.current = null; overlayRef.current = null; };
  }, [hasMap, apiKey]);

  // 홀을 넘길 때마다 다시 그리고 범위를 맞춘다.
  useEffect(() => {
    const map = mapRef.current;
    const group = overlayRef.current;
    if (!map || !group || !review) return;

    const chain = [
      ...review.shots.map((s) => ({ label: s.name, point: review.gps.points[s.slot] || null })),
      { label: review.holedOut ? '홀' : '그린', point: review.gps.green },
    ];
    const focus = drawHoleOverlay(group, { chain, pin: review.gps.pin });

    if (focus.length === 1) map.setView([focus[0].lat, focus[0].lng], 17);
    else if (focus.length > 1) {
      map.fitBounds(L.latLngBounds(focus.map((p) => [p.lat, p.lng])), { padding: [50, 50] });
    }
    setTimeout(() => map.invalidateSize(), 60);
  }, [review, holeIdx]);

  const makeImage = async () => {
    setRendering(true); setImageError(null);
    try {
      const out = await renderHoleImage(review, { apiKey });
      if (!out) {
        setImageError({ holeIdx, text: '이 홀은 기록된 GPS 지점이 없어 이미지를 만들 수 없습니다.' });
        return;
      }
      setImage({ holeIdx, ...out });
    } catch (e) {
      setImageError({ holeIdx, text: `이미지를 만들지 못했습니다. ${e?.message ?? ''}` });
    } finally {
      setRendering(false);
    }
  };

  // 지금 보고 있는 홀의 결과만 쓴다.
  const shownImage = image?.holeIdx === holeIdx ? image : null;
  const shownError = imageError?.holeIdx === holeIdx ? imageError.text : null;

  if (!review) return null;

  const canPrev = holeIdx > 0;
  const canNext = holeIdx < round.holes.length - 1;

  const ox = (v) => (v === true ? 'O' : v === false ? 'X' : '—');
  const oxTone = (v) => (v === true ? C.green : v === false ? C.red : C.dim);
  const tiles = [
    ['퍼팅', review.puttCount, review.puttCount >= 3 ? C.red : review.puttCount === 1 ? C.green : C.line],
    ['GIR', ox(review.gir), oxTone(review.gir)],
    ...(review.par > 3 ? [['페어웨이', ox(review.fairway), oxTone(review.fairway)]] : []),
    ...(review.penalty > 0 ? [['벌타', review.penalty, C.red]] : []),
  ];
  // 중립색(흰·회색) 타일은 바탕을 칠하지 않는다 — 좋고 나쁨이 있는 것만 눈에 띄게.
  const isNeutral = (color) => color === C.line || color === C.dim;

  const tone = scoreTone(review.diff);
  const badgeBase = isNeutral(tone) ? C.dim : tone;
  const greenColor = review.holedOut ? C.goldBright : C.green;

  const navBtn = (enabled) => ({
    flex: 1, padding: '14px', borderRadius: 10, cursor: enabled ? 'pointer' : 'default',
    border: `1px solid ${enabled ? '#33415f' : BORDER}`, background: enabled ? CARD : 'transparent',
    color: enabled ? C.line : '#2a3650', fontSize: 15, fontWeight: 800,
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1200,
      display: 'flex', flexDirection: 'column', background: C.ink,
      paddingTop: 'env(safe-area-inset-top, 0)', paddingBottom: 'env(safe-area-inset-bottom, 0)',
    }}>
      {/* 헤더 — 홀 정보는 왼쪽, 결과(타수·스코어 이름)는 오른쪽 배지로 */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 8px 12px 16px', borderBottom: `1px solid ${BORDER}`,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.gold, letterSpacing: '0.2em' }}>
            HOLE {review.holeNo}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: C.line }}>PAR {review.par}</span>
            {review.holeLength != null && (
              <span style={{ fontSize: 15, fontWeight: 700, color: LABEL }}>{m(review.holeLength)}</span>
            )}
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px 6px 10px', borderRadius: 12,
          background: tint(badgeBase, 0.12), border: `1px solid ${tint(badgeBase, 0.4)}`,
        }}>
          <span style={{ fontSize: 32, fontWeight: 900, color: C.line, lineHeight: 1 }}>
            {review.strokes ?? '—'}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <span style={{ fontSize: 15, fontWeight: 900, color: tone }}>{scoreName(review.strokes, review.diff) ?? '—'}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: LABEL }}>{scoreText(review.diff)}</span>
          </div>
        </div>
        <button onClick={onClose} aria-label="닫기" style={{
          width: 40, height: 40, borderRadius: 10, border: 'none', flexShrink: 0,
          background: 'transparent', color: LABEL, fontSize: 22, cursor: 'pointer',
        }}>✕</button>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {hasMap ? (
          <div style={{ position: 'relative', height: 300, background: C.ink }}>
            <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
            {tileError && (
              <div style={{
                position: 'absolute', top: 8, left: 10, right: 10, zIndex: 500,
                padding: '7px 10px', borderRadius: 7, background: 'rgba(239,83,80,0.9)',
                color: '#fff', fontSize: 13, lineHeight: 1.6, fontWeight: 600,
              }}>위성 타일을 불러오지 못했습니다. 인증키가 만료됐을 수 있습니다.</div>
            )}
            {/* 이미지 저장은 부가 기능이라 지도 위 작은 버튼으로 둔다 */}
            <button
              onClick={makeImage}
              disabled={rendering}
              style={{
                position: 'absolute', left: 10, bottom: 10, zIndex: 500,
                padding: '8px 13px', borderRadius: 999, cursor: rendering ? 'default' : 'pointer',
                border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(11,14,24,0.85)',
                color: rendering ? C.gold : C.line, fontSize: 13, fontWeight: 800,
              }}
            >{rendering ? '만드는 중…' : shownImage ? '↻ 이미지 다시 만들기' : '🖼 이미지로 저장'}</button>
          </div>
        ) : (
          <div style={{
            margin: '12px 14px 0', padding: '16px 14px', borderRadius: 10, textAlign: 'center',
            border: '1px dashed #252f4a', color: LABEL, fontSize: 13, lineHeight: 1.8,
          }}>
            {review.gps.hasAny
              ? '지도를 보려면 VWorld 인증키가 필요합니다.'
              : '이 홀은 GPS 지점을 기록하지 않아 지도가 없습니다.'}
          </div>
        )}

        {(shownError || shownImage) && (
          <div style={{ padding: '10px 14px 0' }}>
            {shownError && <div style={{ fontSize: 13, lineHeight: 1.6, color: C.red }}>{shownError}</div>}
            {shownImage && (
              <>
                <img
                  src={shownImage.dataUrl}
                  alt={`HOLE ${review.holeNo} 샷 기록`}
                  style={{ width: '100%', borderRadius: 10, border: `1px solid ${BORDER}`, display: 'block' }}
                />
                {/* iOS 사파리는 data URL 다운로드가 막히는 경우가 있어, 위 이미지를
                    길게 눌러 저장하는 길도 함께 열어 둔다. */}
                <a
                  href={shownImage.dataUrl}
                  download={`hole-${review.holeNo}.png`}
                  style={{
                    display: 'block', marginTop: 7, padding: '10px', borderRadius: 10,
                    textAlign: 'center', textDecoration: 'none',
                    border: '1px solid #3a4e72', color: '#d6dfec', fontSize: 14, fontWeight: 700,
                  }}
                >이미지 저장</a>
                <div style={{ marginTop: 6, fontSize: 11, color: LABEL, textAlign: 'center' }}>
                  저장이 안 되면 위 이미지를 길게 눌러 저장하세요
                </div>
              </>
            )}
          </div>
        )}

        {/* 요약 — 결과 색을 바탕에 깔아 O/X가 한눈에 들어오게 */}
        <div style={{ display: 'flex', gap: 8, padding: '14px 14px 4px' }}>
          {tiles.map(([label, value, color]) => (
            <div key={label} style={{
              flex: 1, padding: '9px 4px 10px', borderRadius: 10, textAlign: 'center',
              background: isNeutral(color) ? CARD : tint(color, 0.1),
              border: `1px solid ${isNeutral(color) ? BORDER : tint(color, 0.35)}`,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: LABEL, marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color, lineHeight: 1.1 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* 샷 흐름 — 티샷부터 홀아웃까지 한 줄기 타임라인 */}
        <div style={{ padding: '10px 14px 4px' }}>
          {review.shots.map((s, i) => {
            const color = s.result ? (TONE[s.result.tone] ?? LABEL) : MUTED;
            // 티샷의 '남은거리'는 홀 전장이라 헤더에 이미 있다.
            const from = s.slot === 0 ? null : s.from;
            const lastStep = i === review.shots.length - 1 && review.putts.length === 0 && !review.holedOut;
            return (
              <Step key={s.slot} marker={i + 1} color={color} last={lastStep}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: C.gold, letterSpacing: '0.04em' }}>{s.name}</div>
                    <div style={{ fontSize: 19, fontWeight: 900, marginTop: 1, color: s.club ? C.line : MUTED }}>
                      {s.club ?? '클럽 미입력'}
                    </div>
                  </div>
                  {s.result && <Pill text={s.result.text} color={color} />}
                </div>

                {(from || s.distance != null) && (
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
                    marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    {from
                      ? <Metric label="남은거리" value={m(from.value)} color={C.line} note={from.measured ? null : '(입력)'} />
                      : <div />}
                    {s.distance != null
                      ? <Metric label="친 거리" value={m(s.distance)} color={C.goldBright} />
                      : <div />}
                  </div>
                )}

                {(s.lie || s.shape) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    {s.lie && <Tag label="라이" value={s.lie} />}
                    {s.shape && <Tag label="구질" value={s.shape} />}
                  </div>
                )}
              </Step>
            );
          })}

          {/* 그린 → 퍼팅 */}
          {(review.putts.length > 0 || review.holedOut) && (
            <Step marker="⛳" color={greenColor} last>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, fontSize: 17, fontWeight: 900, color: C.line }}>
                  {review.putts.length === 0 ? '홀아웃' : `퍼팅 ${review.puttCount}회`}
                </div>
                {review.approachProximity != null && review.putts.length > 0 && (
                  <span style={{ fontSize: 13, color: LABEL }}>
                    핀까지 <b style={{ color: C.line, fontSize: 15 }}>{m1(review.approachProximity)}</b>
                  </span>
                )}
              </div>
              {review.putts.map((p) => {
                const pc = p.holein === 'success' ? C.green : p.holein === 'fail' ? C.red : MUTED;
                return (
                  <div key={p.no} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0 0', marginTop: 8,
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: LABEL, minWidth: 50 }}>PUTT {p.no}</span>
                    <span style={{ flex: 1, fontSize: 18, fontWeight: 900, color: C.line }}>{m1(p.distance)}</span>
                    {p.lie && <span style={{ fontSize: 12, color: LABEL }}>{p.lie}</span>}
                    <span style={{ fontSize: 13, fontWeight: 800, color: pc }}>
                      {p.holein === 'success' ? '홀인' : p.holein === 'fail' ? '실패' : '—'}
                    </span>
                  </div>
                );
              })}
            </Step>
          )}
        </div>

        {review.memo && (
          <div style={{ padding: '10px 14px 4px' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.gold, letterSpacing: '0.08em', marginBottom: 7 }}>메모</div>
            <div style={{
              padding: '10px 12px', borderRadius: 10, background: CARD,
              border: `1px solid ${BORDER}`, fontSize: 15, lineHeight: 1.8,
              color: '#d6dfec', whiteSpace: 'pre-wrap',
            }}>{review.memo}</div>
          </div>
        )}

        <div style={{ height: 16 }} />
      </div>

      {/* 홀 이동 */}
      <div style={{
        flexShrink: 0, display: 'flex', gap: 8, padding: '10px 14px',
        borderTop: `1px solid ${BORDER}`, background: '#0d1220',
      }}>
        <button onClick={() => canPrev && onNav(holeIdx - 1)} disabled={!canPrev} style={navBtn(canPrev)}>
          ← {holeIdx}홀
        </button>
        <button onClick={() => canNext && onNav(holeIdx + 1)} disabled={!canNext} style={navBtn(canNext)}>
          {holeIdx + 2}홀 →
        </button>
      </div>
    </div>
  );
}
