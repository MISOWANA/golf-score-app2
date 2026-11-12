import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, Edit3, ImageDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { buildHoleReview } from '../../engine/holeReview.js';
import { getVWorldKey } from '../../engine/mapTiles.js';
import { renderHoleImage } from '../../engine/holeImage.js';
import { createSatelliteMap, drawHoleOverlay } from '../map/holeMapLayers.js';
import { fmtShot, fmtPutt } from '../../engine/units.js';
import { koScoreName, koScoreNameTone } from '../ui/scoreTone.js';

// 라운드 후 홀별 복기. "어떤 거리에서 어떤 채를 쓰고 어떤 결과였나"를
// 지도와 샷 목록으로 함께 본다.
//
// 레이아웃은 샷 트래킹 앱(Arccos·18Birdies)의 홀 상세를 따른다:
//   머리줄 = 몇 번 홀 · 파 · 전장 + 스코어 ([보기] 5타)
//   요약 = 한 줄 스탯 바 (페어웨이 · GIR · 퍼팅 · 벌타)
//   샷 목록 = 클럽 배지 | 샷·조건 | 친 거리·결과 — 한 행에 한 샷
//
// 색은 앱 전체와 같은 밝은 테마다 (흰 바탕 · 회색 카드 · 파랑 한 가지).
// 지도 위 마커만 어두운 색(holeMapLayers 의 MAP_COLOR)을 쓴다 — 위성 사진 위에 놓이기 때문.
// 예전에는 이 화면 글자도 MAP_COLOR(어두운 테마의 밝은 글자)를 써서, 밝은 카드 위에서 글자가 안 보였다.

const m = (v) => fmtShot(v, { fallback: '—' });
const m1 = (v) => fmtPutt(v, { digits: 1, fallback: '—' });

const T = {
  bg: '#ffffff', card: '#f2f4f6', inner: '#e8ebee', line: '#e5e8eb',
  text: '#191f28', strong: '#333d4b', sub: '#4e5968', muted: '#5b6572',
  blue: '#1b64da', green: '#0a7f3f', red: '#c8323a', orange: '#a85b00',
};

// 샷 결과 색 — 아주 좋음(칩인·홀인원) 파랑 · 좋음 초록 · 나쁨 빨강
const TONE = { great: T.blue, good: T.green, bad: T.red };

// 아래 막대 아래 여백 — 스코어 입력(ScoringView)의 BAR_GAP 과 같은 값. 아이폰 홈 막대 자리에서 10px 를 덜어 버튼을 아래로 붙인다
const BAR_GAP = 'max(10px, calc(env(safe-area-inset-bottom, 0px) - 10px))';

// 스탯 바의 한 칸 — 값이 O/X면 ✓/✕ 로.
function Stat({ label, value, color }) {
  return (
    <div style={{ flex: 1, padding: '14px 4px', textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: T.sub, marginTop: 6 }}>{label}</div>
    </div>
  );
}

// 샷 목록의 한 행.
function Row({ badge, badgeColor, title, sub, meta, value, valueColor, result, resultColor, first }) {
  return (
    <div data-role="review-row" style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
      borderTop: first ? 'none' : `1px solid ${T.line}`,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: T.bg, color: badgeColor, fontSize: 15, fontWeight: 800,
      }}>{badge}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: T.text, flexShrink: 0 }}>{title}</span>
          {sub && (
            <span style={{
              fontSize: 14, fontWeight: 600, color: T.sub,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{sub}</span>
          )}
        </div>
        {meta && <div style={{ fontSize: 14, color: T.sub, marginTop: 3, lineHeight: 1.45 }}>{meta}</div>}
      </div>

      {(value != null || result) && (
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {value != null && <div style={{ fontSize: 18, fontWeight: 800, color: valueColor, lineHeight: 1.15 }}>{value}</div>}
          {result && <div style={{ fontSize: 14, fontWeight: 700, color: resultColor, marginTop: value != null ? 4 : 0 }}>{result}</div>}
        </div>
      )}
    </div>
  );
}

function Section({ title, aside, children }) {
  return (
    <div style={{ paddingTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, padding: '0 4px 10px' }}>
        <span style={{ fontSize: 17, fontWeight: 700, color: T.text }}>{title}</span>
        {aside && <span style={{ fontSize: 14, fontWeight: 600, color: T.sub, textAlign: 'right' }}>{aside}</span>}
      </div>
      <div style={{ borderRadius: 20, background: T.card, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

// 라운드를 마친 뒤 이 홀의 스코어·퍼팅 수를 고치는 작은 편집기.
function ScoreEditor({ par, strokes, putts, onSave, onCancel }) {
  const [st, setSt] = useState(strokes ?? par);
  const [pt, setPt] = useState(Math.min(putts ?? 2, Math.max(0, (strokes ?? par) - 1)));
  const setStrokes = (v) => { const nv = Math.max(1, Math.min(20, v)); setSt(nv); setPt((p) => Math.min(p, nv - 1)); };
  const stepBtn = { flex: 1, height: '100%', background: 'none', border: 'none', color: T.strong, fontSize: 24, fontWeight: 700, cursor: 'pointer' };
  const stepper = (label, value, onDec, onInc) => (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: T.sub, textAlign: 'center', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', height: 52, borderRadius: 14, background: T.bg }}>
        <button type="button" aria-label={`${label} 하나 빼기`} onClick={onDec} style={stepBtn}>−</button>
        <span style={{ minWidth: 40, textAlign: 'center', fontSize: 24, fontWeight: 800, color: T.text }}>{value}</span>
        <button type="button" aria-label={`${label} 하나 더하기`} onClick={onInc} style={stepBtn}>+</button>
      </div>
    </div>
  );
  return (
    <div data-role="score-editor" style={{ padding: 16, borderRadius: 20, background: T.card }}>
      <div style={{ display: 'flex', gap: 10 }}>
        {stepper('스코어', st, () => setStrokes(st - 1), () => setStrokes(st + 1))}
        {stepper('퍼팅', pt, () => setPt(Math.max(0, pt - 1)), () => setPt(Math.min(st - 1, pt + 1)))}
      </div>
      <div style={{ fontSize: 14, color: T.sub, lineHeight: 1.6, marginTop: 10 }}>
        GIR은 스코어와 퍼팅 수로 다시 계산돼요. 퍼팅 수를 바꾸면 퍼팅별 상세 기록은 지워져요.
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button type="button" onClick={onCancel} style={{ flex: 1, height: 52, borderRadius: 14, border: 'none', background: T.inner, color: T.strong, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>취소</button>
        <button type="button" onClick={() => onSave({ strokes: st, putts: pt })} style={{ flex: 2, height: 52, borderRadius: 14, border: 'none', background: T.blue, color: '#ffffff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>저장</button>
      </div>
    </div>
  );
}

export default function HoleReview({ round, player, holeIdx, onNav, onClose, onEditScore }) {
  const hole = round?.holes?.[holeIdx];
  // 매 렌더마다 새로 만들면 아래 지도 effect가 렌더마다 다시 돌아 범위가 계속 맞춰진다.
  const review = useMemo(() => (hole ? buildHoleReview(hole, player, holeIdx) : null), [hole, player, holeIdx]);
  // 스코어 편집 — 어느 홀의 편집인지 함께 들고 다녀서 홀을 넘기면 자연히 닫힌다.
  const [editingHole, setEditingHole] = useState(null);

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
      ...review.shots.map((s) => ({ label: s.name, point: review.gps.points[s.slot] || null, trusted: review.gps.trusted[s.slot] })),
      { label: review.holedOut ? '홀' : '그린 랜딩', point: review.gps.green },
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
        setImageError({ holeIdx, text: '이 홀은 기록된 GPS 지점이 없어 이미지를 만들 수 없어요.' });
        return;
      }
      setImage({ holeIdx, ...out });
    } catch (e) {
      setImageError({ holeIdx, text: `이미지를 만들지 못했어요. ${e?.message ?? ''}` });
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
  const holeNoAt = (i) => round.holes[i]?.holeNumber ?? i + 1;

  const ox = (v) => (v === true ? '✓' : v === false ? '✕' : '—');
  const oxTone = (v) => (v === true ? T.green : v === false ? T.red : T.muted);
  const stats = [
    ...(review.par > 3 ? [['페어웨이', ox(review.fairway), oxTone(review.fairway)]] : []),
    ['GIR', ox(review.gir), oxTone(review.gir)],
    ['퍼팅', review.puttCount, review.puttCount >= 3 ? T.red : review.puttCount === 1 ? T.green : T.text],
    ['벌타', review.penalty, review.penalty > 0 ? T.red : T.muted],
  ];

  // 스코어 이름 알약 — 스코어 입력 화면의 알약과 같은 이름 · 같은 색 (파 이하 초록 · 오버 빨강)
  const name = review.strokes != null ? koScoreName(review.strokes, review.par) : null;
  const nameTone = name ? koScoreNameTone(review.strokes, review.par) : null;
  const puttSummary = review.puttCount > 0 && review.putts.length === 0;
  // 거리 값이 하나도 없는 홀은 오른쪽 값 칸을 숨긴다 (줄마다 '—'가 반복되지 않게)
  const hasAnyDistance = review.shots.some(s => s.distance != null)
    || review.putts.some((p, i) => (p.distance ?? (i === 0 ? review.approachProximity : null)) != null);

  const barBtn = (primary, enabled) => ({
    flex: 1, height: 56, borderRadius: 16, border: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
    background: primary ? T.blue : T.card, color: primary ? '#ffffff' : T.strong,
    fontSize: 17, fontWeight: 700, cursor: enabled ? 'pointer' : 'default',
    opacity: enabled ? 1 : 0.45,
  });

  return (
    <div data-role="hole-review" style={{
      position: 'fixed', inset: 0, zIndex: 1200, textAlign: 'left',
      display: 'flex', flexDirection: 'column', background: T.bg, color: T.text,
      paddingTop: 'env(safe-area-inset-top, 0)',
    }}>
      {/* 머리줄 — 몇 번 홀 · 파 · 전장 | 스코어 이름 + 타수 | 닫기 */}
      <div data-role="review-header" style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 8px 10px 20px', borderBottom: `1px solid ${T.card}`,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div data-role="review-hole-no" style={{ fontSize: 22, fontWeight: 800, color: T.text, lineHeight: 1.2 }}>{review.holeNo}번 홀</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.sub, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            파 {review.par}{review.holeLength != null && ` · ${m(review.holeLength)}`}
          </div>
        </div>
        <div data-role="review-score" style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
          {name && (
            <span data-role="review-score-name" style={{
              padding: '5px 10px', borderRadius: 999, background: nameTone.bg,
              fontSize: 14, fontWeight: 700, color: nameTone.color,
            }}>{name}</span>
          )}
          <span style={{ fontSize: 22, fontWeight: 800, color: T.text }}>
            {review.strokes != null ? `${review.strokes}타` : '—'}
          </span>
        </div>
        <button type="button" onClick={onClose} aria-label="닫기" style={{
          width: 44, height: 44, borderRadius: 12, border: 'none', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent', color: T.strong, cursor: 'pointer',
        }}><X size={24} strokeWidth={2} /></button>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', padding: '0 16px' }}>
        {/* 스탯 바 */}
        <div data-role="review-stats" style={{ display: 'flex', marginTop: 16, borderRadius: 20, background: T.card }}>
          {stats.map(([label, value, color], i) => (
            <div key={label} style={{ flex: 1, display: 'flex', borderLeft: i ? `1px solid ${T.line}` : 'none', margin: '10px 0' }}>
              <Stat label={label} value={value} color={color} />
            </div>
          ))}
        </div>

        {/* 라운드 후 스코어 수정 */}
        {onEditScore && (
          <div style={{ marginTop: 10 }}>
            {editingHole === holeIdx ? (
              <ScoreEditor
                key={holeIdx}
                par={review.par}
                strokes={review.strokes}
                putts={review.puttCount}
                onCancel={() => setEditingHole(null)}
                onSave={(v) => { onEditScore(holeIdx, v); setEditingHole(null); }}
              />
            ) : (
              <button
                type="button"
                data-role="edit-score"
                onClick={() => setEditingHole(holeIdx)}
                style={{
                  width: '100%', height: 48, borderRadius: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  border: 'none', background: T.card, color: T.strong, fontSize: 15, fontWeight: 700,
                }}
              ><Edit3 size={16} strokeWidth={2} />이 홀 스코어 수정</button>
            )}
          </div>
        )}

        {/* 지도 — GPS를 찍은 홀만. 안 찍은 홀은 자리를 차지하지 않는다. */}
        {hasMap && (
          <div style={{
            position: 'relative', height: 280, marginTop: 16, borderRadius: 20, overflow: 'hidden', background: T.inner,
          }}>
            <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
            {tileError && (
              <div style={{
                position: 'absolute', top: 8, left: 10, right: 10, zIndex: 500,
                padding: '7px 10px', borderRadius: 10, background: 'rgba(200,50,58,0.92)',
                color: '#ffffff', fontSize: 14, lineHeight: 1.6, fontWeight: 600,
              }}>위성 타일을 불러오지 못했어요. 인증키가 만료됐을 수 있어요.</div>
            )}
            <button
              type="button"
              data-role="make-image"
              onClick={makeImage}
              disabled={rendering}
              style={{
                position: 'absolute', left: 10, bottom: 10, zIndex: 500,
                height: 44, padding: '0 14px', borderRadius: 999, cursor: rendering ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                border: 'none', background: 'rgba(255,255,255,0.95)', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                color: rendering ? T.blue : T.text, fontSize: 15, fontWeight: 700,
              }}
            ><ImageDown size={18} strokeWidth={2} />{rendering ? '만드는 중…' : shownImage ? '이미지 다시 만들기' : '이미지로 저장'}</button>
          </div>
        )}
        {!hasMap && review.gps.hasAny && (
          <div style={{ padding: '12px 4px 0', fontSize: 14, color: T.sub }}>
            지도를 보려면 VWorld 인증키가 필요해요.
          </div>
        )}

        {(shownError || shownImage) && (
          <div style={{ paddingTop: 10 }}>
            {shownError && <div style={{ fontSize: 14, lineHeight: 1.6, color: T.red }}>{shownError}</div>}
            {shownImage && (
              <>
                <img
                  src={shownImage.dataUrl}
                  alt={`${review.holeNo}번 홀 샷 기록`}
                  style={{ width: '100%', borderRadius: 16, display: 'block' }}
                />
                {/* iOS 사파리는 data URL 다운로드가 막히는 경우가 있어, 위 이미지를
                    길게 눌러 저장하는 길도 함께 열어 둔다. */}
                <a
                  href={shownImage.dataUrl}
                  download={`hole-${review.holeNo}.png`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', height: 48, marginTop: 8,
                    borderRadius: 14, textDecoration: 'none',
                    background: T.card, color: T.blue, fontSize: 15, fontWeight: 700,
                  }}
                >이미지 저장</a>
                <div style={{ marginTop: 6, fontSize: 13, color: T.sub, textAlign: 'center' }}>
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
            const tone = s.result ? (TONE[s.result.tone] ?? T.sub) : T.sub;
            // 티샷의 남은거리는 홀 전장이라 머리줄에 이미 있다.
            const from = s.slot === 0 ? null : s.from;
            const meta = [
              from && `남은거리 ${m(from.value)}${from.measured ? '' : ' (입력)'}`,
              s.lie, s.shape,
              // 벌타 홀에서 멈춘 자리가 불확실해 뺀 거리 (티샷 → OB티 등)
              s.distanceExcluded && '벌타 홀 · 거리 제외',
            ].filter(Boolean).join(' · ');
            return (
              <Row
                key={s.slot}
                first={i === 0}
                badge={s.code ?? '?'}
                badgeColor={s.code ? tone : T.sub}
                title={s.name}
                sub={s.club ?? '클럽 미입력'}
                meta={meta || null}
                value={hasAnyDistance ? m(s.distance) : null}
                valueColor={s.distance != null ? T.text : T.muted}
                result={s.result?.text}
                resultColor={tone}
              />
            );
          })}

          {review.putts.map((p, i) => {
            const off = p.holein === 'offgreen';
            const tone = p.holein === 'success' ? T.green : p.holein === 'fail' ? T.red : off ? T.orange : T.sub;
            const displayDist = p.distance ?? (i === 0 ? review.approachProximity : null);
            return (
              <Fragment key={`p${p.no}`}>
                <Row
                  first={review.shots.length === 0 && i === 0}
                  badge={`P${p.no}`}
                  badgeColor={tone}
                  title={`${p.no}번째 퍼팅`}
                  meta={p.lie || null}
                  value={hasAnyDistance ? m1(displayDist) : null}
                  valueColor={displayDist != null ? T.text : T.muted}
                  result={p.holein === 'success' ? '홀인' : p.holein === 'fail' ? '실패' : off ? '그린 밖' : null}
                  resultColor={tone}
                />
                {/* 그린 밖으로 나간 퍼트 뒤에 다시 친 칩 — 퍼팅이 아니라 1타로만 더해진다 */}
                {p.chips.map((chip, k) => (
                  <div key={k} data-role="off-green-chip">
                    <Row
                      badge="칩"
                      badgeColor={T.orange}
                      title={p.chips.length > 1 ? `그린 밖 칩 ${k + 1}` : '그린 밖에서 칩'}
                      sub={chip.club}
                      meta={[chip.from != null && `남은거리 ${m(chip.from)} (입력)`, chip.surface, '스코어 +1타 · 퍼팅 수 제외'].filter(Boolean).join(' · ')}
                      value={null}
                      result={chip.result === 'chip-in' ? '칩인' : chip.result === 'on' ? '온그린' : chip.result === 'miss' ? '그린 놓침' : null}
                      resultColor={chip.result === 'chip-in' ? T.blue : chip.result === 'miss' ? T.red : T.green}
                    />
                  </div>
                ))}
              </Fragment>
            );
          })}

          {/* 3퍼트 이상 — 퍼트 거리로 본 원인 (거리가 없으면 판단 보류) */}
          {review.puttAnalysis && (
            <div data-role="putt-cause" style={{ padding: '14px 16px', borderTop: `1px solid ${T.line}`, fontSize: 14, lineHeight: 1.6, color: T.sub }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: review.puttAnalysis.cause === 'unknown' ? T.sub : T.text, marginBottom: 2 }}>
                3퍼트 원인 · {review.puttAnalysis.label}
              </div>
              <div>{review.puttAnalysis.detail}</div>
            </div>
          )}

          {/* 퍼팅 수만 있고 상세가 없는 홀 */}
          {puttSummary && (
            <Row
              first={review.shots.length === 0}
              badge="PT"
              badgeColor={T.sub}
              title={`퍼팅 ${review.puttCount}회`}
              meta={review.approachProximity != null ? `핀까지 ${m1(review.approachProximity)}` : '거리 미입력'}
              value=""
              valueColor={T.text}
            />
          )}
        </Section>

        {review.memo && (
          <Section title="메모">
            <div data-role="review-memo" style={{ padding: '14px 16px', fontSize: 15, lineHeight: 1.7, color: T.text, whiteSpace: 'pre-wrap' }}>
              {review.memo}
            </div>
          </Section>
        )}

        <div style={{ height: 20 }} />
      </div>

      {/* 홀 이동 — 스코어 입력 화면의 아래 막대와 같은 모양 (회색 이전 · 파랑 다음). 마지막 홀에서는 파랑 칸이 '닫기' */}
      <div data-role="review-bar" style={{
        flexShrink: 0, display: 'flex', gap: 8, background: T.bg, borderTop: `1px solid ${T.card}`,
        paddingTop: 10, paddingLeft: 16, paddingRight: 16, paddingBottom: BAR_GAP,
      }}>
        <button
          type="button" data-role="review-prev"
          onClick={() => canPrev && onNav(holeIdx - 1)} disabled={!canPrev}
          aria-label={canPrev ? `이전 홀 — ${holeNoAt(holeIdx - 1)}번 홀` : '이전 홀 없음'}
          style={barBtn(false, canPrev)}
        ><ChevronLeft size={20} strokeWidth={2.2} />{canPrev ? `${holeNoAt(holeIdx - 1)}번 홀` : '이전'}</button>
        {canNext ? (
          <button
            type="button" data-role="review-next"
            onClick={() => onNav(holeIdx + 1)}
            aria-label={`다음 홀 — ${holeNoAt(holeIdx + 1)}번 홀`}
            style={barBtn(true, true)}
          >{holeNoAt(holeIdx + 1)}번 홀<ChevronRight size={20} strokeWidth={2.2} /></button>
        ) : (
          <button type="button" data-role="review-done" aria-label="홀 복기 닫기" onClick={onClose} style={barBtn(true, true)}>닫기</button>
        )}
      </div>
    </div>
  );
}
