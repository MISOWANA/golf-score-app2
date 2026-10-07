import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { buildHoleReview } from '../../engine/holeReview.js';
import { getVWorldKey } from '../../engine/mapTiles.js';
import { renderHoleImage } from '../../engine/holeImage.js';
import { createSatelliteMap, drawHoleOverlay, MAP_COLOR as C } from '../map/holeMapLayers.js';

// 라운드 후 홀별 복기. "어떤 거리에서 어떤 채를 쓰고 어떤 결과였나"를
// 지도와 샷 목록으로 함께 본다.
//
// 레이아웃은 샷 트래킹 앱(Arccos·18Birdies)의 홀 상세를 따른다:
//   헤더 = 홀·파·전장 + 스코어카드 기호(버디 ○, 보기 □)
//   요약 = 한 줄 스탯 바 (페어웨이 · GIR · 퍼팅 · 벌타)
//   샷 목록 = 클럽 배지 | 샷·조건 | 친 거리·결과 — 한 행에 한 샷

const m = (v) => (v == null ? '—' : `${Math.round(v)}m`);
const m1 = (v) => (v == null ? '—' : `${Number(v).toFixed(1)}m`);

const TONE = { great: C.goldBright, good: C.green, bad: C.red };
// C.dim(#8896b0)은 작은 글씨에서 대비가 부족해 라벨용 밝은 회색을 따로 쓴다.
const LABEL = '#a8b6cc';
const MUTED = '#4d5a78';
const CARD = '#121a2e';
const BORDER = '#1e2840';
const DIVIDER = 'rgba(255,255,255,0.06)';

const scoreTone = (diff) => {
  if (diff == null) return C.dim;
  if (diff <= -1) return C.green;
  if (diff === 0) return C.line;
  return diff === 1 ? '#e57373' : C.red;
};
const scoreText = (diff) => (diff == null ? '' : diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`);
const SCORE_NAME = { [-3]: '알바트로스', [-2]: '이글', [-1]: '버디', 0: '파', 1: '보기', 2: '더블보기', 3: '트리플보기' };
const scoreName = (strokes, diff) => {
  if (strokes === 1) return '홀인원';
  if (diff == null) return null;
  return SCORE_NAME[diff] ?? scoreText(diff);
};

// 색을 반투명 바탕으로.
const tint = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

// 스코어카드 기호 — 골퍼가 종이 스코어카드에서 익숙한 표기.
// 이글 이하 ◎, 버디 ○, 파 없음, 보기 □, 더블 이상 ▣
function ScoreMark({ strokes, diff }) {
  const color = strokes === 1 ? C.goldBright : scoreTone(diff);
  const round = diff != null && diff < 0;
  const double = diff != null && (diff <= -2 || diff >= 2);
  const framed = diff != null && diff !== 0;
  const size = 50;
  const ring = (inset) => ({
    position: 'absolute', inset, border: `2px solid ${color}`,
    borderRadius: round ? '50%' : 6,
  });
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {framed && <div style={ring(0)} />}
      {framed && double && <div style={ring(5)} />}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 26, fontWeight: 900, color: C.line,
      }}>{strokes ?? '—'}</div>
    </div>
  );
}

// 스탯 바의 한 칸 — 값이 O/X면 ✓/✕ 아이콘으로.
function Stat({ label, value, color }) {
  return (
    <div style={{ flex: 1, padding: '12px 4px', textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: LABEL, marginTop: 4 }}>{label}</div>
    </div>
  );
}

// 샷 목록의 한 행.
function Row({ badge, badgeColor, title, sub, meta, value, valueColor, result, resultColor, first }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px',
      borderTop: first ? 'none' : `1px solid ${DIVIDER}`,
    }}>
      <div style={{
        width: 46, height: 46, borderRadius: 12, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: tint(badgeColor, 0.14), border: `1.5px solid ${tint(badgeColor, 0.55)}`,
        color: badgeColor, fontSize: 15, fontWeight: 900, letterSpacing: '-0.02em',
      }}>{badge}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: C.line, flexShrink: 0 }}>{title}</span>
          {sub && (
            <span style={{
              fontSize: 13, fontWeight: 700, color: LABEL,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{sub}</span>
          )}
        </div>
        {meta && <div style={{ fontSize: 13, color: LABEL, marginTop: 3, lineHeight: 1.4 }}>{meta}</div>}
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: valueColor, lineHeight: 1.1 }}>{value}</div>
        {result && <div style={{ fontSize: 12, fontWeight: 800, color: resultColor, marginTop: 4 }}>{result}</div>}
      </div>
    </div>
  );
}

function Section({ title, aside, children }) {
  return (
    <div style={{ padding: '16px 14px 0' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 4px 8px' }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: C.gold, letterSpacing: '0.1em' }}>{title}</span>
        {aside && <span style={{ fontSize: 12, fontWeight: 700, color: LABEL }}>{aside}</span>}
      </div>
      <div style={{ borderRadius: 14, background: CARD, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
        {children}
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

  // 오버레이가 떠 있는 동안 뒤 페이지 스크롤을 막는다. 막지 않으면 내용이
  // 화면보다 짧아도 터치가 뒤 페이지로 넘어가 그쪽 스크롤바가 나타난다.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

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

  const ox = (v) => (v === true ? '✓' : v === false ? '✕' : '—');
  const oxTone = (v) => (v === true ? C.green : v === false ? C.red : MUTED);
  const stats = [
    ...(review.par > 3 ? [['페어웨이', ox(review.fairway), oxTone(review.fairway)]] : []),
    ['GIR', ox(review.gir), oxTone(review.gir)],
    ['퍼팅', review.puttCount, review.puttCount >= 3 ? C.red : review.puttCount === 1 ? C.green : C.line],
    ['벌타', review.penalty, review.penalty > 0 ? C.red : MUTED],
  ];

  const name = scoreName(review.strokes, review.diff);
  const nameTone = review.strokes === 1 ? C.goldBright : scoreTone(review.diff);
  const puttSummary = review.puttCount > 0 && review.putts.length === 0;

  const navBtn = (enabled) => ({
    flex: 1, padding: '13px', borderRadius: 12, cursor: enabled ? 'pointer' : 'default',
    border: `1px solid ${enabled ? '#2c3a58' : BORDER}`, background: enabled ? CARD : 'transparent',
    color: enabled ? C.line : '#2a3650', fontSize: 15, fontWeight: 800,
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1200, textAlign: 'left',
      display: 'flex', flexDirection: 'column', background: C.ink,
      paddingTop: 'env(safe-area-inset-top, 0)', paddingBottom: 'env(safe-area-inset-bottom, 0)',
    }}>
      {/* 헤더 */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 14,
        padding: '10px 6px 10px 18px', borderBottom: `1px solid ${BORDER}`,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.gold, letterSpacing: '0.12em' }}>HOLE</span>
            <span style={{ fontSize: 30, fontWeight: 900, color: C.line, lineHeight: 1 }}>{review.holeNo}</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: LABEL, marginTop: 4 }}>
            PAR {review.par}{review.holeLength != null && ` · ${m(review.holeLength)}`}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: nameTone }}>{name ?? '—'}</div>
            {review.diff != null && (
              <div style={{ fontSize: 12, fontWeight: 700, color: LABEL, marginTop: 2 }}>{scoreText(review.diff)}</div>
            )}
          </div>
          <ScoreMark strokes={review.strokes} diff={review.diff} />
        </div>
        <button onClick={onClose} aria-label="닫기" style={{
          width: 42, height: 42, borderRadius: 10, border: 'none', flexShrink: 0,
          background: 'transparent', color: LABEL, fontSize: 22, cursor: 'pointer',
        }}>✕</button>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain' }}>
        {/* 스탯 바 */}
        <div style={{ padding: '14px 14px 0' }}>
          <div style={{
            display: 'flex', borderRadius: 14, background: CARD, border: `1px solid ${BORDER}`,
          }}>
            {stats.map(([label, value, color], i) => (
              <div key={label} style={{ flex: 1, display: 'flex', borderLeft: i ? `1px solid ${DIVIDER}` : 'none' }}>
                <Stat label={label} value={value} color={color} />
              </div>
            ))}
          </div>
        </div>

        {/* 지도 — GPS를 찍은 홀만. 안 찍은 홀은 자리를 차지하지 않는다. */}
        {hasMap && (
          <div style={{ padding: '14px 14px 0' }}>
            <div style={{
              position: 'relative', height: 280, borderRadius: 14, overflow: 'hidden',
              border: `1px solid ${BORDER}`, background: C.ink,
            }}>
              <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
              {tileError && (
                <div style={{
                  position: 'absolute', top: 8, left: 10, right: 10, zIndex: 500,
                  padding: '7px 10px', borderRadius: 7, background: 'rgba(239,83,80,0.9)',
                  color: '#fff', fontSize: 13, lineHeight: 1.6, fontWeight: 600,
                }}>위성 타일을 불러오지 못했습니다. 인증키가 만료됐을 수 있습니다.</div>
              )}
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
          </div>
        )}
        {!hasMap && review.gps.hasAny && (
          <div style={{ padding: '10px 18px 0', fontSize: 12, color: LABEL }}>
            지도를 보려면 VWorld 인증키가 필요합니다.
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
                  style={{ width: '100%', borderRadius: 14, border: `1px solid ${BORDER}`, display: 'block' }}
                />
                {/* iOS 사파리는 data URL 다운로드가 막히는 경우가 있어, 위 이미지를
                    길게 눌러 저장하는 길도 함께 열어 둔다. */}
                <a
                  href={shownImage.dataUrl}
                  download={`hole-${review.holeNo}.png`}
                  style={{
                    display: 'block', marginTop: 7, padding: '10px', borderRadius: 12,
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

        {/* 샷 목록 */}
        <Section
          title="샷 기록"
          aside={`${review.shots.length}샷${review.puttCount ? ` · ${review.puttCount}퍼트` : ''}${review.gps.hasAny ? '' : ' · GPS 없음'}`}
        >
          {review.shots.map((s, i) => {
            const tone = s.result ? (TONE[s.result.tone] ?? LABEL) : MUTED;
            // 티샷의 남은거리는 홀 전장이라 헤더에 이미 있다.
            const from = s.slot === 0 ? null : s.from;
            const meta = [
              from && `남은 ${m(from.value)}${from.measured ? '' : ' (입력)'}`,
              s.lie, s.shape,
            ].filter(Boolean).join(' · ');
            return (
              <Row
                key={s.slot}
                first={i === 0}
                badge={s.code ?? '?'}
                badgeColor={s.code ? tone : MUTED}
                title={s.name}
                sub={s.club ?? '클럽 미입력'}
                meta={meta || null}
                value={m(s.distance)}
                valueColor={s.distance != null ? C.goldBright : MUTED}
                result={s.result?.text}
                resultColor={tone}
              />
            );
          })}

          {review.putts.map((p, i) => {
            const tone = p.holein === 'success' ? C.green : p.holein === 'fail' ? C.red : MUTED;
            return (
              <Row
                key={`p${p.no}`}
                badge={`P${p.no}`}
                badgeColor={tone === MUTED ? LABEL : tone}
                title={`${p.no}번째 퍼팅`}
                meta={[i === 0 && review.approachProximity != null && p.distance == null
                  ? `핀까지 ${m1(review.approachProximity)}` : null, p.lie].filter(Boolean).join(' · ') || null}
                value={m1(p.distance)}
                valueColor={p.distance != null ? C.line : MUTED}
                result={p.holein === 'success' ? '홀인' : p.holein === 'fail' ? '실패' : null}
                resultColor={tone}
              />
            );
          })}

          {/* 퍼팅 수만 있고 상세가 없는 홀 */}
          {puttSummary && (
            <Row
              badge="PT"
              badgeColor={LABEL}
              title={`퍼팅 ${review.puttCount}회`}
              meta={review.approachProximity != null ? `핀까지 ${m1(review.approachProximity)}` : '거리 미입력'}
              value=""
              valueColor={C.line}
            />
          )}
        </Section>

        {review.memo && (
          <Section title="메모">
            <div style={{ padding: '12px 14px', fontSize: 15, lineHeight: 1.8, color: '#d6dfec', whiteSpace: 'pre-wrap' }}>
              {review.memo}
            </div>
          </Section>
        )}

        <div style={{ height: 18 }} />
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
