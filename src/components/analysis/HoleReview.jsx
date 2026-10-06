import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { buildHoleReview } from '../../engine/holeReview.js';
import { getVWorldKey } from '../../engine/mapTiles.js';
import { renderHoleImage } from '../../engine/holeImage.js';
import { createSatelliteMap, drawHoleOverlay, MAP_COLOR as C } from '../map/holeMapLayers.js';

// 라운드 후 홀별 복기. "어떤 거리에서 어떤 채를 쓰고 어떤 결과였나"를
// 지도와 샷 목록으로 함께 본다.

const m = (v) => (v == null ? '—' : `${Math.round(v)}m`);
const m1 = (v) => (v == null ? '—' : `${Number(v).toFixed(1)}m`);

const TONE = { great: C.goldBright, good: C.green, bad: C.red };

const scoreTone = (diff) => {
  if (diff == null) return C.dim;
  if (diff <= -1) return C.green;
  if (diff === 0) return C.line;
  return diff === 1 ? '#e57373' : C.red;
};
const scoreText = (diff) => (diff == null ? '—' : diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`);

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

  const tiles = [
    ['퍼팅', review.puttCount, C.line],
    ['GIR', review.gir === true ? 'O' : review.gir === false ? 'X' : '—',
      review.gir === true ? C.green : review.gir === false ? C.red : C.dim],
    ...(review.par > 3
      ? [['페어웨이', review.fairway === true ? 'O' : review.fairway === false ? 'X' : '—',
        review.fairway === true ? C.green : review.fairway === false ? C.red : C.dim]]
      : []),
    ...(review.penalty > 0 ? [['벌타', review.penalty, C.red]] : []),
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1200,
      display: 'flex', flexDirection: 'column', background: C.ink,
      paddingTop: 'env(safe-area-inset-top, 0)', paddingBottom: 'env(safe-area-inset-bottom, 0)',
    }}>
      {/* 헤더 */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 10, padding: '12px 14px', borderBottom: '1px solid #1b2238',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, minWidth: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: '0.2em' }}>
            HOLE {review.holeNo}
          </span>
          <span style={{ fontSize: 13, fontWeight: 800, color: C.line }}>PAR {review.par}</span>
          {review.holeLength != null && (
            <span style={{ fontSize: 11, fontWeight: 700, color: C.dim }}>{m(review.holeLength)}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22, fontWeight: 900, color: C.line, lineHeight: 1 }}>
            {review.strokes ?? '—'}
          </span>
          <span style={{ fontSize: 13, fontWeight: 800, color: scoreTone(review.diff) }}>
            {scoreText(review.diff)}
          </span>
          <button onClick={onClose} style={{
            width: 34, height: 34, borderRadius: 8, border: 'none',
            background: 'transparent', color: C.dim, fontSize: 18, cursor: 'pointer',
          }}>✕</button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {hasMap ? (
          <div style={{ position: 'relative', height: 260, background: C.ink }}>
            <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
            {tileError && (
              <div style={{
                position: 'absolute', top: 8, left: 10, right: 10, zIndex: 500,
                padding: '7px 10px', borderRadius: 7, background: 'rgba(239,83,80,0.9)',
                color: '#fff', fontSize: 10, lineHeight: 1.5,
              }}>위성 타일을 불러오지 못했습니다. 인증키가 만료됐을 수 있습니다.</div>
            )}
          </div>
        ) : (
          <div style={{
            margin: '12px 14px', padding: '18px 14px', borderRadius: 9, textAlign: 'center',
            border: '1px dashed #252f4a', color: '#4d5a78', fontSize: 11, lineHeight: 1.7,
          }}>
            {review.gps.hasAny
              ? '지도를 보려면 VWorld 인증키가 필요합니다.'
              : '이 홀은 GPS 지점을 기록하지 않아 지도가 없습니다.'}
          </div>
        )}

        {/* 이미지 — GPS 지점·핀·남은거리를 한 장으로 */}
        {review.gps.hasAny && (
          <div style={{ padding: '10px 14px 0' }}>
            <button
              onClick={makeImage}
              disabled={rendering}
              style={{
                width: '100%', padding: '11px', borderRadius: 9,
                cursor: rendering ? 'default' : 'pointer',
                border: `1.5px solid ${rendering ? 'rgba(201,162,40,0.4)' : '#3a4e72'}`,
                background: rendering ? 'rgba(201,162,40,0.08)' : 'transparent',
                color: rendering ? C.gold : '#c4cfe0', fontSize: 13, fontWeight: 700,
              }}
            >{rendering ? '이미지 만드는 중…' : shownImage ? '↻ 이미지 다시 만들기' : '🖼 이미지로 보기'}</button>

            {shownError && (
              <div style={{ marginTop: 7, fontSize: 10, lineHeight: 1.6, color: C.red }}>{shownError}</div>
            )}

            {shownImage && (
              <div style={{ marginTop: 10 }}>
                <img
                  src={shownImage.dataUrl}
                  alt={`HOLE ${review.holeNo} 샷 기록`}
                  style={{ width: '100%', borderRadius: 9, border: '1px solid #1b2238', display: 'block' }}
                />
                {/* iOS 사파리는 data URL 다운로드가 막히는 경우가 있어, 위 이미지를
                    길게 눌러 저장하는 길도 함께 열어 둔다. */}
                <a
                  href={shownImage.dataUrl}
                  download={`hole-${review.holeNo}.png`}
                  style={{
                    display: 'block', marginTop: 7, padding: '10px', borderRadius: 9,
                    textAlign: 'center', textDecoration: 'none',
                    border: '1px solid #3a4e72', color: '#c4cfe0', fontSize: 12, fontWeight: 700,
                  }}
                >이미지 저장</a>
                <div style={{ marginTop: 5, fontSize: 9, color: '#4d5a78', textAlign: 'center' }}>
                  저장이 안 되면 위 이미지를 길게 눌러 저장하세요
                </div>
              </div>
            )}
          </div>
        )}

        {/* 요약 타일 */}
        <div style={{ display: 'flex', gap: 7, padding: '12px 14px 4px' }}>
          {tiles.map(([label, value, color]) => (
            <div key={label} style={{
              flex: 1, padding: '8px 6px', borderRadius: 8, textAlign: 'center',
              background: '#131d35', border: '1px solid #1b2238',
            }}>
              <div style={{
                fontSize: 9, fontWeight: 700, color: C.dim,
                letterSpacing: '0.1em', marginBottom: 3,
              }}>{label}</div>
              <div style={{ fontSize: 15, fontWeight: 900, color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* 샷 기록 — 복기의 본체 */}
        <div style={{ padding: '10px 14px 4px' }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: C.gold,
            letterSpacing: '0.2em', marginBottom: 7,
          }}>샷 기록</div>
          {review.shots.map((s) => (
            <div key={s.slot} style={{
              padding: '9px 11px', borderRadius: 8, marginBottom: 6,
              background: '#131d35', border: '1px solid #1b2238',
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                <span style={{
                  fontSize: 10, fontWeight: 800, color: C.gold,
                  letterSpacing: '0.08em', minWidth: 46,
                }}>{s.name}</span>
                <span style={{
                  flex: 1, fontSize: 13, fontWeight: 800,
                  color: s.club ? C.line : '#3a4e72',
                }}>{s.club ?? '클럽 미입력'}</span>
                {s.result && (
                  <span style={{ fontSize: 11, fontWeight: 800, color: TONE[s.result.tone] ?? C.dim }}>
                    {s.result.text}
                  </span>
                )}
              </div>
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '2px 12px',
                fontSize: 11, color: C.dim,
              }}>
                {s.from && (
                  <span>
                    남은거리 <b style={{ color: C.line, fontWeight: 700 }}>{m(s.from.value)}</b>
                    {!s.from.measured && <span style={{ fontSize: 9, marginLeft: 2 }}>(입력)</span>}
                  </span>
                )}
                {s.distance != null && (
                  <span>친 거리 <b style={{ color: C.goldBright, fontWeight: 700 }}>{m(s.distance)}</b></span>
                )}
                {s.lie && <span>라이 <b style={{ color: C.line, fontWeight: 700 }}>{s.lie}</b></span>}
                {s.shape && <span>구질 <b style={{ color: C.line, fontWeight: 700 }}>{s.shape}</b></span>}
              </div>
            </div>
          ))}
        </div>

        {/* 퍼팅 */}
        {review.putts.length > 0 && (
          <div style={{ padding: '6px 14px 4px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 7 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: '0.2em',
              }}>퍼팅</span>
              {review.approachProximity != null && (
                <span style={{ fontSize: 10, color: C.dim }}>
                  그린 도착 시 핀까지 {m1(review.approachProximity)}
                </span>
              )}
            </div>
            {review.putts.map((p) => (
              <div key={p.no} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '6px 11px', borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: C.dim, minWidth: 46 }}>
                  PUTT {p.no}
                </span>
                <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: C.line }}>
                  {m1(p.distance)}
                </span>
                {p.lie && <span style={{ fontSize: 11, color: C.dim }}>{p.lie}</span>}
                <span style={{
                  fontSize: 11, fontWeight: 800,
                  color: p.holein === 'success' ? C.green : p.holein === 'fail' ? C.red : '#3a4e72',
                }}>
                  {p.holein === 'success' ? '홀인' : p.holein === 'fail' ? '실패' : '—'}
                </span>
              </div>
            ))}
          </div>
        )}

        {review.memo && (
          <div style={{ padding: '10px 14px 4px' }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: C.gold,
              letterSpacing: '0.2em', marginBottom: 6,
            }}>메모</div>
            <div style={{
              padding: '10px 12px', borderRadius: 8, background: '#131d35',
              border: '1px solid #1b2238', fontSize: 12, lineHeight: 1.7,
              color: '#c4cfe0', whiteSpace: 'pre-wrap',
            }}>{review.memo}</div>
          </div>
        )}

        <div style={{ height: 12 }} />
      </div>

      {/* 홀 이동 */}
      <div style={{
        flexShrink: 0, display: 'flex', gap: 8, padding: '10px 14px',
        borderTop: '1px solid #1b2238', background: '#0d1220',
      }}>
        <button
          onClick={() => canPrev && onNav(holeIdx - 1)}
          disabled={!canPrev}
          style={{
            flex: 1, padding: '12px', borderRadius: 9, cursor: canPrev ? 'pointer' : 'default',
            border: '1px solid #252f4a', background: 'transparent',
            color: canPrev ? '#c4cfe0' : '#252f4a', fontSize: 13, fontWeight: 700,
          }}
        >← {holeIdx} 홀</button>
        <button
          onClick={() => canNext && onNav(holeIdx + 1)}
          disabled={!canNext}
          style={{
            flex: 1, padding: '12px', borderRadius: 9, cursor: canNext ? 'pointer' : 'default',
            border: '1px solid #252f4a', background: 'transparent',
            color: canNext ? '#c4cfe0' : '#252f4a', fontSize: 13, fontWeight: 700,
          }}
        >{holeIdx + 2} 홀 →</button>
      </div>
    </div>
  );
}
