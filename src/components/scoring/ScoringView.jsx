import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, X, Edit3, Map as MapIcon, StickyNote, Minus, Plus, Home } from 'lucide-react';
import styles from '../../styles/styles';
import ParTable from '../ui/ParTable';
import GpsShotPoint from './GpsShotPoint';
import HoleMapModal from './HoleMapModal';
import { fieldShotCount as countFieldShots, haversine, isHoledOut, par3TeeOnGreen, pinDistances, saneRemaining, shotDistanceTrusted, SANE_REMAIN_M } from '../../engine/geo.js';
import { penaltyAt, penaltyCount, penaltyModeLabel, penaltyResultText, phantomStrokes, strokeNumberOf, shotTitle, titleShifted, PENALTY_LABEL, PENALTY_REASONS, asksReason } from '../../engine/penalties.js';
import { offGreenShots, offGreenCount, offGreenChain, offGreenPendingAfter, emptyOffGreenShot, OFF_GREEN_CLUBS, OFF_GREEN_START_M, OFF_GREEN_MAX_M } from '../../engine/offGreen.js';
import { PUTT_MIN_M, PUTT_MAX_M, PUTT_STEP_M, PUTT_START_M, newPuttDetail, sanitizeFirstPutt } from '../../engine/firstPutt.js';
import { PUTT_LIES, COMPOUND_LIES, DEFAULT_FRAME, TAP_IN_MAX_M, lieIdOf, lieShape, isCompoundLie, puttLieText, refreshMiss, nextFrame, puttRowText } from '../../engine/puttMiss.js';
import { CLUB_SUBS, recommendClubs, clubLabelOf, fitText, reachText } from '../../engine/clubRecommend.js';
import ClubSuggestions from './ClubSuggestions';
import { useBagClubs } from './useBagClubs';
import GreenSpeedPicker from '../common/GreenSpeedPicker';
import { validSpeed, speedLabel } from '../../engine/greenSpeed.js';
import { readSpeedUnit } from '../../engine/greenSpeedUnit.js';
import { applyParEdit } from '../../engine/parEdit.js';
import { greenMissed, GREEN_MISS_DIRS } from '../../engine/greenMiss.js';
import { ninesOf, holeNoOf } from '../../engine/nines.js';
import { SURFACES, shotInfoGaps, fairwayFromSurface, surfaceLabel, surfaceIdOf } from '../../engine/shotInfo.js';
import { unitLabel, fmtShot, fmtPutt } from '../../engine/units.js';
import { playedNineOf } from '../../engine/nineConversion.js';
import LandingWheel from './LandingWheel';
import StickyTabs from '../ui/StickyTabs';
import GoalLine from '../goals/GoalLine';
import SwipeDistance from '../ui/SwipeDistance.jsx';
import PuttBoard from './PuttBoard.jsx';

// ─── Constants ────────────────────────────────────────────────────────────────

const SECOND_CLUBS = [
  { id: 'wood',   label: 'WOOD' },
  { id: 'hybrid', label: 'HYBRID' },
  { id: 'iron',   label: 'IRON' },
  { id: 'wedge',  label: 'WEDGE' },
];

// 티샷 벌타 뒤 다음 샷 — 다시 친 티샷이면 드라이버, 드롭 후면 아이언·웨지일 수 있다.
const AFTER_TEE_PENALTY_CLUBS = [{ id: 'driver', label: 'DRIVER' }, ...SECOND_CLUBS];

// 클럽별 세부 선택지(CLUB_SUBS)는 클럽 추천이 마이백 클럽과 맞춰 보는 기준이기도 해서
// engine/clubRecommend.js 에 둔다.

// 거리 슬라이더가 덮는 범위(m) — 남은 거리는 흔한 거리를 손가락 끝으로 맞추기 좋게 입력 허용 범위(700m)보다 좁게 잡는다
// (퍼팅 거리는 입력 범위 30m 를 그대로 덮는다 — engine/firstPutt.js)
const SLIDER_REMAIN_M = 300;

const ids = (list) => list.map((c) => c.id);

const COMPASS_LABELS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
const toCompassLabel = (deg) => deg == null ? '—' : COMPASS_LABELS[Math.round(deg / 22.5) % 16];

const getNavLabelFontSize = (text) => {
  const len = (text || '').length;
  return len <= 3 ? '13px' : '12px';   // 12px 아래로는 줄이지 않는다 — 긴 이름은 라벨 칸 안에서 줄바꿈된다
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function WindCompass({ direction, onChange }) {
  const ref = useRef(null);
  const [dragging, setDragging] = useState(false);
  const lastBearing = useRef(direction ?? 0);
  const downRef = useRef(null);   // { x, y, dragging } — 누른 위치와 끌기 시작 여부

  const getBearing = (clientX, clientY) => {
    const rect = ref.current.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    if (Math.hypot(dx, dy) < 8) return lastBearing.current;
    const b = Math.round((Math.atan2(dy, dx) * 180 / Math.PI + 90 + 360) % 360);
    lastBearing.current = b;
    return b;
  };

  return (
    <div>
      <div
        ref={ref}
        // 탭하거나 옆으로 끌면 방향이 정해지고, 세로로 밀면 화면이 스크롤된다.
        // 예전에는 누르는 순간 방향이 들어가서, 나침반 위에서 스크롤하려다
        // 바람 방향이 입력됐다.
        style={{ position: 'relative', width: 210, height: 210, margin: '0 auto', touchAction: 'pan-y', cursor: 'crosshair', userSelect: 'none' }}
        onPointerDown={e => {
          downRef.current = { x: e.clientX, y: e.clientY, dragging: false };
          // 마우스는 나침반 밖으로 끌어도 계속 받도록 캡처한다
          if (e.pointerType === 'mouse') e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={e => {
          const d = downRef.current;
          if (!d) return;
          if (!d.dragging) {
            if (Math.abs(e.clientX - d.x) < 10) return;   // 옆으로 끌기 시작해야 회전
            d.dragging = true;
            setDragging(true);
          }
          onChange(getBearing(e.clientX, e.clientY));
        }}
        onPointerUp={e => {
          const d = downRef.current;
          downRef.current = null;
          setDragging(false);
          // 거의 움직이지 않고 뗐으면 탭 — 누른 쪽 방향으로 정한다
          if (d && !d.dragging && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 8) onChange(getBearing(e.clientX, e.clientY));
        }}
        onPointerCancel={() => { downRef.current = null; setDragging(false); }}
      >
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          {/* Background */}
          <circle cx="50" cy="50" r="48" fill="#ffffff" stroke="#e5e8eb" strokeWidth="1.5" />
          <circle cx="50" cy="50" r="44" fill="none" stroke="#f2f4f6" strokeWidth="0.5" />

          {/* Degree ticks */}
          {Array.from({ length: 72 }, (_, i) => {
            const deg = i * 5;
            const rad = (deg - 90) * Math.PI / 180;
            const isMajor = deg % 90 === 0;
            const isMinor = deg % 45 === 0;
            const r1 = isMajor ? 37 : isMinor ? 39 : 41;
            return (
              <line key={i}
                x1={50 + r1 * Math.cos(rad)} y1={50 + r1 * Math.sin(rad)}
                x2={50 + 44 * Math.cos(rad)} y2={50 + 44 * Math.sin(rad)}
                stroke={isMajor ? '#4e5968' : isMinor ? '#4e5968' : '#e5e8eb'}
                strokeWidth={isMajor ? 1.5 : isMinor ? 1 : 0.6}
              />
            );
          })}

          {/* Cardinal labels */}
          {[['N', 0, '#c8323a'], ['E', 90, '#4e5968'], ['S', 180, '#4e5968'], ['W', 270, '#4e5968']].map(([l, a, col]) => {
            const rad = (a - 90) * Math.PI / 180;
            const r = 31;
            return (
              <text key={l} x={50 + r * Math.cos(rad)} y={50 + r * Math.sin(rad)}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="10" /* fontsize-ok: 100칸 viewBox 를 210px 로 그려 화면에서는 약 21px */ fontWeight="bold" fill={col}
              >{l}</text>
            );
          })}

          {/* Wind arrow — rotates with direction */}
          <g style={{
            transformOrigin: '50px 50px',
            transform: `rotate(${direction ?? 0}deg)`,
            transition: dragging ? 'none' : 'transform 0.08s ease-out',
            opacity: direction != null ? 1 : 0,
          }}>
            <polygon points="50,9 45,24 55,24" fill="#1b64da" />
            <rect x="48.5" y="24" width="3" height="20" fill="#1b64da" rx="1" />
            <line x1="50" y1="50" x2="50" y2="70" stroke="rgba(27,100,218,0.28)" strokeWidth="2" strokeLinecap="round" />
          </g>

          {/* Center */}
          <circle cx="50" cy="50" r="4" fill={direction != null ? '#1b64da' : '#d1d6db'} stroke="#ffffff" strokeWidth="1.5" />
        </svg>

        {direction == null && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#4e5968', letterSpacing:'0', pointerEvents: 'none' }}>
            탭해서 방향 설정
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10, minHeight: 26 }}>
        {direction != null ? (<>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#1b64da' }}>{toCompassLabel(direction)}</span>
          <span style={{ fontSize: 13, color: '#4e5968' }}>{direction}°</span>
        </>) : (
          <span style={{ fontSize: 12, color: '#4e5968' }}>방향 미설정</span>
        )}
      </div>
    </div>
  );
}

function WindInput({ direction, strength, onDir, onStrength }) {
  return (
    <div>
      <WindCompass direction={direction} onChange={onDir} />
      <div style={{ marginTop: 16 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 8 }}>
          <div style={{ flex:1 }} />
          <div style={{ fontSize: 12, color: '#4e5968', letterSpacing:'0', textTransform:'none' }}>바람 세기</div>
          <div style={{ flex:1, display:'flex', justifyContent:'flex-end' }}>
            {strength > 0 && (
              <button style={{ fontSize:12, color:'#4e5968', background:'none', border:'1px solid #d1d6db', borderRadius: 8, padding:'0 12px', minHeight: 36, cursor:'pointer' }}
                onClick={() => onStrength(0)}>초기화</button>
            )}
          </div>
        </div>
        <SwipeDistance value={strength ?? 0} min={0} max={20} step={0.1} decimals={1} unit="m/s" onChange={onStrength} />
      </div>
    </div>
  );
}

// 선택 입력 섹션 (라이·바람) — 쓰는 사람이 적어 기본은 접어 둔다. 클럽을 고르기
// 전에는 더 흐리게 두되 눌러서 펼칠 수는 있다(막지 않는다). 값이 없을 때는 중립색
// 테두리라 필수 항목(빨강)보다 눈에 띄지 않는다. 입력한 값이 있으면 금색으로 바뀌고
// 접힌 상태에서도 헤더에 요약한다.
// children(close) — 선택이 끝나면 섹션을 접을 수 있도록 close를 넘긴다.
// required — 꼭 골라야 하는 선택. 값이 없으면 처음부터 펼쳐 둔다 ('필수' 표시는 따로 하지 않는다).
// defaultOpen: 처음부터 펼쳐 둔다 (값이 있어도). 없으면 필수인데 아직 값이 없을 때만 펼친다.
// hint: 값이 없고 접혀 있을 때 보이는 안내 글 (null 이면 생략 — 라벨이 길어 좁은 폭에서 잘리는 칸용)
function OptionalSection({ icon, label, enabled, summary, required = false, defaultOpen, hint = '선택 입력', children }) {
  const [open, setOpen] = useState(defaultOpen ?? (required && !summary));
  const hasValue = !!summary;
  const accent = hasValue ? '#1b64da' : enabled ? '#4e5968' : '#4e5968';
  return (
    <div style={{ padding:'8px 16px', borderBottom:'1px solid #e5e8eb' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width:'100%', display:'flex', alignItems:'center', gap:8, minHeight:44, padding:'10px 12px', borderRadius:9,
          cursor:'pointer', textAlign:'left',
          border:`1.5px solid ${hasValue ? '#1b64da' : enabled ? '#cdd3d8' : '#e5e8eb'}`,
          background: hasValue ? 'rgba(27,100,218,0.12)' : 'transparent',
        }}
      >
        <span style={{ ...fIcon, color: accent }}>{icon}</span>
        <span style={{ ...fLbl, color: hasValue ? '#b45309' : enabled ? '#333d4b' : '#4e5968' }}>{label}</span>
        <span style={{ flex:1, minWidth:0, fontSize:14, fontWeight:700, color:'#1b64da', marginLeft:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {hasValue ? summary
            : !open && hint != null && <span style={{ color: enabled ? '#4e5968' : '#4e5968', fontWeight:600 }}>
                {enabled ? hint : '클럽 선택 후 입력'}
              </span>}
        </span>
        <span style={{ fontSize:14, fontWeight:800, color: accent }}>{open ? '접기 ▴' : '펼치기 ▾'}</span>
      </button>
      {open && (
        <div style={{ marginTop:12, paddingBottom:6, animation:'fadeIn 0.18s ease-out' }}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function WindSection({ enabled, direction, strength, onDir, onStrength, onReset }) {
  const summary = [
    direction != null && `${toCompassLabel(direction)} ${direction}°`,
    strength > 0 && `${Number(strength).toFixed(1)}m/s`,
  ].filter(Boolean).join(' · ');
  return (
    <OptionalSection icon="💨" label="바람" enabled={enabled} summary={summary}>
      {() => (<>
        {direction != null && (
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:6 }}>
            <button style={{ fontSize:12, color:'#4e5968', background:'none', border:'1px solid #d1d6db', borderRadius: 8, padding:'0 12px', minHeight: 36, cursor:'pointer' }}
              onClick={onReset}>방향 초기화</button>
          </div>
        )}
        <WindInput direction={direction} strength={strength} onDir={onDir} onStrength={onStrength} />
      </>)}
    </OptionalSection>
  );
}

// 라이 값은 문자열 또는 [문자열] (과거 데이터) 로 들어온다.
const lieValue = (lie) => (Array.isArray(lie) ? lie[0] || null : lie || null);
const lieText = (lie) => {
  const v = lieValue(lie);
  if (!v) return '';
  if (v === 'flat') return '평지';
  return (LIE_DIRS.find(d => d.id === v)?.label ?? v).replace('\n', ' ');
};

// 지형 — 그 샷을 치는 자리의 표면 (페어웨이 · 러프 · 벙커). 샷마다 꼭 받는다.
// suggest: 티샷 결과로 짐작한 표면 — 아직 고르지 않았을 때만 ★ 로 알려 주고, 눌러야 기록된다.
//   (티샷 페어웨이 O/X 를 누르면 예외 — 세컨샷 지형을 페어웨이/러프로 미리 채우고 auto 로 알려 준다. setTeeFairway)
// auto: 사용자가 고른 게 아니라 티샷 결과로 채운 값이다 — 다른 칩을 누르면 바뀐다.
function SurfaceRow({ role, value, missing, suggest = null, auto = false, onChange }) {
  return (
    <div data-role={role} data-step={role} data-missing={missing ? '1' : '0'} style={{ padding:'8px 16px 12px', borderBottom:'1px solid #e5e8eb', scrollMarginTop: 72 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, flexWrap:'wrap' }}>
        <span style={fIcon}>⛳</span><span style={fLbl}>지형</span>
        {value == null && suggest && <span style={{ fontSize:12, color:'#4e5968' }}>티샷 결과로는 {surfaceLabel(suggest)}</span>}
        {value != null && auto && <span data-role={`${role}-auto`} style={{ fontSize:12, color:'#4e5968' }}>{value === 'fairway' ? '티샷 페어웨이라 자동 선택' : '티샷 페어웨이를 놓쳐 자동 선택'} · 다르면 눌러서 바꾸세요</span>}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(64px, 1fr))', gap:6 }}>
        {SURFACES.map((x) => {
          const on = value === x.id;
          const hinted = value == null && suggest === x.id;
          return (
            <button key={x.id} type="button" data-role={`${role}-${x.id}`} aria-pressed={on}
              style={{ ...fChip, textAlign:'center', padding:'11px 4px', fontSize:14, borderRadius:8, ...(on ? fChipOn : {}), ...(hinted ? { border:'1.5px dashed #1b64da' } : {}) }}
              onClick={() => onChange(on ? null : x.id)}>
              {x.label}{hinted ? ' ★' : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// 라이 — 경사. 평지 · 오르막 · 내리막은 한 번에, 슬라이스·훅이 섞인 라이는 "기타"에서 고른다. 샷마다 꼭 받는다.
const QUICK_LIES = [['flat', '평지'], ['uphill', '오르막'], ['downhill', '내리막']];
function LieRow({ role, value, missing, onChange }) {
  const [more, setMore] = useState(false);
  const v = lieValue(value);
  const other = !!v && !QUICK_LIES.some(([id]) => id === v);
  return (
    <div data-role={role} data-step={role} data-missing={missing ? '1' : '0'} style={{ padding:'8px 16px 12px', borderBottom:'1px solid #e5e8eb', scrollMarginTop: 72 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, flexWrap:'wrap' }}>
        <span style={fIcon}>▲</span><span style={fLbl}>라이</span>
        {other && <span style={{ fontSize:13, fontWeight:700, color:'#1b64da' }}>{lieText(v)}</span>}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(64px, 1fr))', gap:6 }}>
        {QUICK_LIES.map(([id, label]) => {
          const on = v === id;
          return (
            <button key={id} type="button" data-role={`${role}-${id}`} aria-pressed={on}
              style={{ ...fChip, textAlign:'center', padding:'11px 4px', fontSize:14, borderRadius:8, ...(on ? fChipOn : {}) }}
              onClick={() => { onChange(on ? null : id); setMore(false); }}>{label}</button>
          );
        })}
        <button type="button" data-role={`${role}-more`} aria-pressed={other || more}
          style={{ ...fChip, textAlign:'center', padding:'11px 4px', fontSize:14, borderRadius:8, ...(other || more ? fChipOn : {}) }}
          onClick={() => setMore(m => !m)}>기타 {more ? '▴' : '▾'}</button>
      </div>
      {more && (
        <div style={{ marginTop:10 }}>
          <RadialPicker centerId="flat" centerLabel="평지" dirs={LIE_DIRS} alwaysOpen value={v}
            onChange={(x) => { onChange(x); if (x) setMore(false); }} />
        </div>
      )}
    </div>
  );
}

// suggest: 마이백 거리로 만든 클럽 추천 { rec, onPick } — 칩을 누르면 클럽 종류와 세부 클럽이
// 한 번에 입력된다. 아래 클럽 버튼에는 추천 클럽에 ★만 붙여 직접 고르는 흐름은 그대로 둔다.
// columns — 클럽 종류 버튼을 한 줄이 아니라 N칸 격자로 놓는다 (티샷: DRIVER WOOD / HYBRID IRON 2×2)
function ClubSelector({ icon, label, categories, value, subValue, onCategory, onSub, stacked, suggest, columns = null }) {
  const [expandedId, setExpandedId] = useState(null);

  // 선택이 지워지면 펼친 세부 클럽도 접는다 — value 가 바뀐 그 렌더에서 바로 맞춘다
  const [prevValue, setPrevValue] = useState(value);
  if (prevValue !== value) {
    setPrevValue(value);
    if (!value) setExpandedId(null);
  }

  const recPick = suggest?.rec?.primary ?? null;
  const suggestions = suggest && (
    <ClubSuggestions
      suggest={suggest}
      value={value}
      subValue={subValue}
      onPick={(club, sub) => { setExpandedId(null); suggest.onPick?.(club, sub); }}
    />
  );

  const btnChip = stacked
    ? { ...fChip, padding:'10px 8px', fontSize:14, borderRadius:8, width:'100%', textAlign:'center' }
    : { ...fChip, width:'100%', textAlign:'center' };

  const handleCategory = (c) => {
    const subs = CLUB_SUBS[c.id] || [];
    if (subs.length === 0) {
      onCategory(value === c.id ? null : c.id, false);
      return;
    }
    if (value === c.id) {
      setExpandedId(prev => prev === c.id ? null : c.id);
    } else {
      onCategory(c.id, true);   // 세부 클럽(번호) 줄이 바로 아래에 열린다 — 다음 칸은 그걸 고른 뒤
      setExpandedId(c.id);
    }
  };

  const handleSub = (subId) => {
    onSub(subId === subValue ? null : subId);
    setExpandedId(null);
  };

  const expandedSubs = (expandedId && expandedId === value) ? (CLUB_SUBS[expandedId] || []) : [];

  const categoryRow = (
    <div data-role={columns ? 'club-grid' : undefined} style={columns
      ? { display:'grid', gridTemplateColumns:`repeat(${columns}, minmax(0, 1fr))`, gap: 8 }
      : { display:'flex', gap: stacked ? 6 : 5, flex: stacked ? undefined : 1 }}>
      {categories.map(c => {
        const isSelected = value === c.id;
        const subs = CLUB_SUBS[c.id] || [];
        const selectedSub = isSelected && subValue != null ? subs.find(s => s.id === subValue) : null;
        const displayLabel = selectedSub ? selectedSub.label : c.label;
        return (
          <button
            key={c.id}
            style={{
              ...btnChip, flex:1,
              ...(isSelected ? fChipOn : {}),
              border: `${selectedSub ? '2px' : '1.5px'} solid ${isSelected ? '#1b64da' : '#d1d6db'}`,
              ...(selectedSub ? { fontWeight:900, fontSize: stacked ? 15 : 14, boxShadow:'0 0 8px rgba(27,100,218,0.45)', color:'#1b64da' } : {}),
            }}
            onClick={() => handleCategory(c)}
          >
            {displayLabel}
            {recPick?.club === c.id && !isSelected && <span style={{ color:'#0a7f3f', marginLeft:3, fontSize:12 }}>★</span>}
          </button>
        );
      })}
    </div>
  );

  const subRow = expandedSubs.length > 0 && (
    <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:8, animation:'fadeIn 0.15s ease-out' }}>
      {expandedSubs.map(s => {
        const isSel = subValue === s.id;
        return (
          <button
            key={s.id}
            onClick={() => handleSub(s.id)}
            style={{
              flex:1, minWidth:'calc(25% - 4px)',
              minHeight:44, padding:'9px 4px', borderRadius: 10, textAlign:'center',
              fontSize:14, fontWeight: isSel ? 700 : 500, cursor:'pointer',
              border:`1.5px solid ${isSel ? '#1b64da' : '#d1d6db'}`,
              background: isSel ? 'rgba(27,100,218,0.18)' : '#e8ebee',
              color: isSel ? '#1b64da' : '#191f28',
            }}
          >
            {s.label}
            {!isSel && recPick && recPick.club === value && recPick.subClub === s.id && <span style={{ color:'#0a7f3f', marginLeft:3, fontSize:12 }}>★</span>}
          </button>
        );
      })}
    </div>
  );

  if (stacked) {
    return (
      <div style={{ padding:'8px 16px 12px', borderBottom:'1px solid #e5e8eb' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <span style={fIcon}>{icon}</span>
          <span style={fLbl}>{label}</span>
        </div>
        {suggestions}
        {categoryRow}
        {subRow}
      </div>
    );
  }

  return (
    <div style={{ padding:'10px 16px', borderBottom:'1px solid #e5e8eb', minHeight:54 }}>
      {suggestions}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
        <div style={fLeft}>
          <span style={fIcon}>{icon}</span>
          <span style={fLbl}>{label}</span>
        </div>
        {categoryRow}
      </div>
      {subRow}
    </div>
  );
}

// ─── RadialPicker: press-and-slide cross selector (generic) ──────────────────
const SliceIcon = () => (
  <svg width="14" height="12" viewBox="0 0 14 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 1 L1 11 L13 11 Z" />
  </svg>
);
const HookIcon = () => (
  <svg width="14" height="12" viewBox="0 0 14 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 11 L13 1 L13 11 Z" />
  </svg>
);

// 퍼팅 라이 — 기본 9개(경사 × 슬라이스·훅)를 늘 펼쳐 두고, 자주 쓰지 않는 복합(S자) 6개는 접어 둔다. 한 번 눌러 고르고, 같은 칸을 다시 누르면 비운다.
// 복합 라이를 골라 둔 퍼트는 접힌 헤더에 그 이름이 보이고 처음부터 펼쳐진다.
function PuttLieGrid({ value, onPick }) {
  const id = lieIdOf(value);
  const compound = isCompoundLie(value);
  const [openState, setOpenState] = useState(null);   // null = 복합 라이를 골라 뒀을 때만 펼침
  const open = openState ?? compound;
  const chip = (x, extra) => {
    const on = id === x.id;
    return (
      <button key={x.id} type="button" data-role={`putt-lie-${x.id}`} aria-pressed={on}
        style={{ ...fChip, textAlign:'center', padding:'9px 4px', minHeight:52, fontSize:14, lineHeight:1.25, borderRadius:8, minWidth:0, whiteSpace:'pre-line', display:'flex', alignItems:'center', justifyContent:'center', gap:5, ...(on ? fChipOn : {}) }}
        onClick={() => onPick(on ? null : x.id)}>
        {extra}{x.label}
      </button>
    );
  };
  return (
    <div data-role="putt-lie">
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0, 1fr))', gap:6 }}>
        {PUTT_LIES.map((x) => chip(x, x.id === 'break-left' ? <SliceIcon /> : x.id === 'break-right' ? <HookIcon /> : null))}
      </div>
      <button type="button" data-role="putt-lie-compound-toggle" aria-expanded={open}
        style={{ ...fChip, display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, width:'100%', marginTop:8, padding:'11px 12px', minHeight:44, fontSize:14, borderRadius:8, ...(compound ? fChipOn : {}) }}
        onClick={() => setOpenState(!open)}>
        <span>복합 라이 (S자){compound && !open ? ` · ${puttLieText(value)}` : ''}</span>
        <span aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div data-role="putt-lie-compound" style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:6, marginTop:6 }}>
          {COMPOUND_LIES.map((x) => chip(x, null))}
        </div>
      )}
    </div>
  );
}

// alwaysOpen: 접기 버튼 없이 선택지만 보인다 (바깥 섹션이 접기를 맡을 때).
// openWhenEmpty: false면 선택이 없어도 접힌 채 시작한다 (건너뛸 수 있는 선택 입력).
function RadialPicker({ centerId, centerLabel, dirs, value, onChange, onOpen, placeholder, alwaysOpen, openWhenEmpty = true }) {
  const raw = Array.isArray(value) ? value[0] || null : value || null;
  // 아직 선택이 없으면 펼친 상태로 시작한다 — 필드에서 입력 차례마다 "열기"를
  // 한 번 더 누르지 않게 하려는 것. 선택이 끝나면 접혀서 결과만 남고, 사용자가
  // 직접 접은 경우에는(값 변화가 없으므로) 그대로 접힌 채 유지된다.
  const [openState, setOpen] = useState(raw == null && openWhenEmpty);
  const open = alwaysOpen || openState;

  // 선택값이나 시작 방식이 바뀌면 그 렌더에서 바로 펼침 상태를 다시 맞춘다
  const [synced, setSynced] = useState({ raw, openWhenEmpty });
  if (synced.raw !== raw || synced.openWhenEmpty !== openWhenEmpty) {
    setSynced({ raw, openWhenEmpty });
    setOpen(raw == null && openWhenEmpty);
  }

  const selDir = dirs.find(d => d.id === raw);
  const selLabel = raw === centerId ? centerLabel : (selDir?.label ?? null);
  const selIcon = selDir?.icon ?? null;
  const hasSelection = raw != null;

  const handleSelect = (id) => {
    onChange(id === raw ? null : id);
    setOpen(false);
  };

  return (
    <div style={{ width:'100%' }}>
      {!alwaysOpen && <button
        onClick={() => { setOpen(v => { if (!v && onOpen) onOpen(); return !v; }); }}
        style={{
          width:'100%', display:'flex', alignItems:'center', justifyContent:'center',
          gap:6, minHeight:44, padding:'10px 16px', borderRadius:10, cursor:'pointer',
          background: open ? 'rgba(27,100,218,0.07)' : hasSelection ? 'rgba(27,100,218,0.12)' : 'rgba(25,31,40,0.024)',
          border:`1.5px solid ${open || hasSelection ? 'rgba(27,100,218,0.4)' : '#b0b8c1'}`,
          transition:'background 0.15s, border-color 0.15s',
        }}
      >
        <span style={{ fontSize:15, fontWeight:700, color: open || hasSelection ? '#1b64da' : '#4e5968' }}>
          {hasSelection ? (selLabel || centerLabel) : (placeholder || centerLabel)}
        </span>
        {!open && selIcon && <span style={{ color:'#1b64da' }}>{selIcon}</span>}
        <span style={{ fontSize: 12, color: open || hasSelection ? '#1b64da' : '#4e5968', marginLeft:4 }}>{open ? '▲' : '▼'}</span>
      </button>}

      {open && (() => {
        const byPos = {};
        dirs.forEach(d => { byPos[d.pos] = d; });
        const optBtn = (opt) => {
          if (!opt) return <div />;
          const isSel = raw === opt.id;
          const isCompound = opt.label && opt.label.includes('\n');
          return (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              style={{
                width:'100%', minHeight:44, padding: isCompound ? '7px 4px' : '11px 6px', borderRadius:8, cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:2,
                fontSize: isCompound ? 12 : 14, fontWeight: isSel ? 700 : 500, lineHeight: isCompound ? 1.3 : 1,
                border:`1.5px solid ${isSel ? '#1b64da' : '#d1d6db'}`,
                background: isSel ? 'rgba(27,100,218,0.18)' : '#eef1f4',
                color: isSel ? '#1b64da' : '#4e5968',
                animation:'fadeIn 0.15s ease-out',
                textAlign:'center', whiteSpace:'pre-line',
              }}
            >
              {opt.label}{!isCompound && opt.icon && opt.icon}
            </button>
          );
        };
        const centerOpt = { id: centerId, label: centerLabel, icon: null };
        return (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginTop: alwaysOpen ? 0 : 8 }}>
            {optBtn(byPos['ul'])}{optBtn(byPos['up'])}{optBtn(byPos['ur'])}
            {optBtn(byPos['left'])}{optBtn(centerOpt)}{optBtn(byPos['right'])}
            {optBtn(byPos['dl'])}{optBtn(byPos['down'])}{optBtn(byPos['dr'])}
          </div>
        );
      })()}
    </div>
  );
}

const LIE_DIRS = [
  { id:'uphill',          label:'오르막',        pos:'up'    },
  { id:'slice',           label:'슬라이스',      pos:'left',  icon: <SliceIcon /> },
  { id:'downhill',        label:'내리막',        pos:'down'  },
  { id:'hook',            label:'훅',            pos:'right', icon: <HookIcon /> },
  { id:'uphill-slice',    label:'오르막\n슬라이스', pos:'ul'  },
  { id:'uphill-hook',     label:'오르막\n훅',    pos:'ur'    },
  { id:'downhill-slice',  label:'내리막\n슬라이스', pos:'dl'  },
  { id:'downhill-hook',   label:'내리막\n훅',    pos:'dr'    },
];
const PIN_DIRS = [
  { id:'back',         label:'백',           pos:'up'    },
  { id:'left',         label:'레프트',       pos:'left'  },
  { id:'front',        label:'프론트',       pos:'down'  },
  { id:'right',        label:'라이트',       pos:'right' },
  { id:'back-left',    label:'백\n레프트',   pos:'ul'    },
  { id:'back-right',   label:'백\n라이트',   pos:'ur'    },
  { id:'front-left',   label:'프론트\n레프트', pos:'dl'  },
  { id:'front-right',  label:'프론트\n라이트', pos:'dr'  },
];
// ─── Main Component ───────────────────────────────────────────────────────────

// ─── 샷 기록 열기/접기 · 새 입력 화면 공통 모양 ─────────────────────────────────
// 기본은 스코어 · 퍼팅만 받는다. 샷 기록(티샷 · 필드샷 · 퍼팅 상세)은 "샷 기록" 줄을 눌러야 열리고, 한 번 열면 다음 홀에서도 열려 있다
// (이 기기에 기억 — 접으면 다시 접힌 채로 시작). 이미 샷 기록이 있는 홀은 늘 열려 보인다.
const SHOT_DETAIL_KEY = 'bb-shot-detail';
const readShotDetail = () => { try { return localStorage.getItem(SHOT_DETAIL_KEY) === '1'; } catch { return false; } };
const writeShotDetail = (on) => { try { localStorage.setItem(SHOT_DETAIL_KEY, on ? '1' : '0'); } catch { /* 저장하지 못해도 이번 화면에서는 그대로 동작한다 */ } };

// 스코어 이름 (한글) — 큰 숫자 아래 작은 알약에 보인다
const koScoreName = (strokes, par) => {
  if (!strokes) return null;
  if (strokes === 1) return '홀인원';
  const d = strokes - par;
  if (d <= -3) return '알바트로스';
  if (d === -2) return '이글';
  if (d === -1) return '버디';
  if (d === 0) return '파';
  if (d === 1) return '보기';
  if (d === 2) return '더블 보기';
  if (d === 3) return '트리플 보기';
  if (d === 4) return '쿼드러플 보기';
  return `+${d}`;
};
const NAME_TONE = (strokes, par) => (strokes - par <= 0 ? { color: '#0a7f3f', bg: '#e6f6ec' } : { color: '#c8323a', bg: '#fdebec' });

// 머리줄 아이콘 버튼 · 스코어 −/+ 큰 버튼 · 한 줄 목록 버튼
const HDR_BTN = { width: 44, height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 12 };
const STEP_BTN = { width: 72, height: 72, flexShrink: 0, borderRadius: '50%', border: 'none', background: '#f2f4f6', color: '#191f28', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
const ROW_BTN = { width: '100%', minHeight: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '0 2px', background: 'transparent', border: 'none', borderBottom: '1px solid #f2f4f6', color: '#191f28', fontSize: 15, cursor: 'pointer', textAlign: 'left' };
const SMALL_LINK = { fontSize: 13, color: '#5b6572', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', minHeight: 44 };

export default function ScoringView({ round, currentUser, onUpdate, onFinish, onGoHome, onExit, onGoToSetup, goals = [], firstPutt = null }) {
  // 거리별 클럽 추천을 받을지 — 라운드 시작 전에 정한 설정. 값이 없는 예전 라운드는 켜짐.
  const recommendOn = round.clubRecommend !== false;
  // 클럽 추천의 재료 — 마이백에 저장한 클럽별 거리. 마이백을 고친 뒤 이 화면으로 돌아오면
  // 새로 마운트되며 다시 불러온다. 꺼 둔 라운드는 불러오지도 않는다.
  const bagClubs = useBagClubs(recommendOn ? currentUser : null);
  const [holeIdx, setHoleIdx] = useState(round.currentHole || 0);
  const [activePlayer] = useState(round.players[0]);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [pendingFinish, setPendingFinish] = useState(null);   // 미입력 홀 확인 중인 완료 라운드
  const [pendingSkip, setPendingSkip] = useState(null);       // 입력 없는 홀에서 '다음' — 이동할 홀 번호
  const [penaltyChoice, setPenaltyChoice] = useState(null);   // 벌타 처리 방법(OB티·드롭·다시 치기 …)과 이유를 고르는 중인 { slot, type, reason }
  // '다음'/'완료'를 누른 홀에 확인할 게 있을 때 — { next } 또는 { finish: true }. 빠진 샷 정보(라이·지형·거리·클럽)와
  // 모르는 퍼팅 수를 한 창에서 한 번만 묻는다 (예전에는 창이 차례로 둘 떠서 같은 홀에서 연속으로 눌러야 했다).
  const [holeCheck, setHoleCheck] = useState(null);
  const finishingRef = useRef(false);                          // 완료 버튼 연타 방지
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [memoDraft, setMemoDraft] = useState('');
  const [showParEditModal, setShowParEditModal] = useState(false);
  const [parDraft, setParDraft] = useState([...round.pars]);
  const [expandedPutt, setExpandedPutt] = useState(0);
  const [expandedExtraShot, setExpandedExtraShot] = useState(0);
  // 지금 보는 입력 탭 — 'tee'(티샷) · 'field'(세컨샷부터 그린 전까지) · 'putt'(그린·퍼팅).
  // 한 단계 입력을 마치면 다음 탭으로 넘어간다 (티샷 완료 · 온그린 성공 …).
  const [stage, setStage] = useState('tee');
  // 필드샷 탭에서 펼친 그린 밖 칩 카드 — null이면 결과를 아직 안 넣은 칩(없으면 마지막)을 연다
  const [expandedOffGreen, setExpandedOffGreen] = useState(null);
  const [teeClubInteracting, setTeeClubInteracting] = useState(false);
  const [secondShotExpanded, setSecondShotExpanded] = useState(true);
  const [showHoleInModal, setShowHoleInModal] = useState(false);
  const [holeInModalData, setHoleInModalData] = useState(null);
  const [showPuttsDropdown, setShowPuttsDropdown] = useState(false);
  const [shotPref, setShotPref] = useState(readShotDetail);   // 샷 기록을 열어 두었는지 (이 기기에 기억)
  const [penOpen, setPenOpen] = useState(false);              // 벌타 칸이 열려 있는지
  const [showHoleMap, setShowHoleMap] = useState(false);
  // 그날의 그린 스피드 — 라운드 시작 때 못 정했거나 라운드 중 알게 된 값을 퍼팅 화면에서 고친다
  const [showGreenSpeed, setShowGreenSpeed] = useState(false);
  const [speedDraft, setSpeedDraft] = useState(null);
  const [parEditSpeed, setParEditSpeed] = useState(null);   // 라운드 수정 안의 그린 스피드 (저장하기 전 값)
  const roundSpeed = validSpeed(round.greenSpeed) ? round.greenSpeed : null;
  const holeInCbRef = useRef(null);
  // 홀인/칩인 모달이 화면에 그려지기 전 빠른 연속 탭으로 완료 콜백이 두 번
  // 실행(저장/이동 중복)되는 것을 막는 가드.
  const holeInModalPendingRef = useRef(false);

  const openParEdit = () => { setParDraft([...round.pars]); setParEditSpeed(roundSpeed); setShowParEditModal(true); };

  const updateParDraft = (idx, val) => { const u = [...parDraft]; u[idx] = val; setParDraft(u); };

  // 입력하지 않은 홀은 새 파 기준 기본값으로, 입력한 홀은 타수를 두고 자동 계산된 GIR 만 다시 계산한다 (engine/parEdit.js)
  // 그린 스피드는 1인 라운드에서만 다루고, 바꾸지 않았으면 건드리지 않는다
  const saveParEdit = () => {
    const edited = applyParEdit(round, parDraft);
    onUpdate(round.players.length === 1 && parEditSpeed !== roundSpeed ? { ...edited, greenSpeed: parEditSpeed } : edited);
    setShowParEditModal(false);
  };

  const hole = round.holes[holeIdx];
  const playerScore = hole.scores[activePlayer];
  // 18홀이든 9홀이든 같은 코드로 — 홀 번호는 배열 위치가 아니라 holeNumber (9홀은 항상 1~9번)
  const holeNo = hole.holeNumber ?? holeIdx + 1;
  const holeTotal = round.holes.length;
  const nines = ninesOf(round);

  const hasProgress = round.holes.some(h => round.players.some(p => h.scores[p]?.touched === true));

  // 진행률·누적 스코어·홀 표에서 '끝난 홀'로 셀지. 새 라운드는 확정(confirmed —
  // '다음'·홀인으로 끝낸)한 홀만 센다: 티샷 클럽만 골라도 그 홀이 끝난 홀로 잡혀
  // 진행률이 먼저 오르고 누적 스코어에 미리 들어가던 문제. 예전 진행 중 라운드는
  // 확정 기록이 없으므로 입력한(touched) 홀 기준 그대로 둔다.
  const doneFor = (h, p) => (round.trackConfirm ? h.scores[p]?.confirmed === true : h.scores[p]?.touched === true);

  // offGreenChips: 퍼트가 그린 밖으로 나간 뒤 다시 친 칩 수 — 그린에 오른 뒤의 샷이라 GIR 계산에서 뺀다
  const calculateGir = (strokes, putts, par, offGreenChips = 0) => {
    if (strokes == null || putts == null) return null;
    return (strokes - putts - offGreenChips) <= par - 2;
  };

  const inferStatsFromStrokes = (strokes, par) => {
    if (strokes === 1) return { putts: 0, fairway: null, gir: true };
    if (strokes === par - 2) return { putts: 0, fairway: null, gir: true };
    const diff = strokes - par;
    let putts, gir;
    if (diff <= -1) { putts = 1; gir = true; }
    else if (diff === 0) { putts = 2; gir = true; }
    else if (diff === 1) { putts = 2; gir = false; }
    else { putts = 2; gir = false; }
    if (putts >= strokes) putts = Math.max(0, strokes - 1);
    return { putts, fairway: null, gir };
  };

  // 파4 이상 세컨샷의 결과(온그린·실패·칩인)가 기록에 있는지.
  // 'GIR/2온 성공'은 onGreen:true로 남긴다 — gir는 홀 확정 때 다시 계산돼 바뀌므로
  // 기준으로 쓰면 확정할 때마다 결과가 흔들린다. 퍼팅 홀인까지 기록했으면 추가 샷이
  // 없는 것 자체가 세컨샷 온그린이라는 기록이다.
  const secondShotDecided = (s) =>
    (s.extraShots?.length ?? 0) > 0 || s.onGreen === true || s.onGreen === 'chip-in'
    || (s.gir === true && s.girAuto === false)
    || (Array.isArray(s.puttDetails) && s.puttDetails.some(p => p?.holein === 'success'));

  const calcAutoStrokes = (score, par) => {
    const ob = score.ob || 0;
    const hazard = score.hazard || 0;
    const unplayable = score.unplayable || 0;
    const hasPenalty = ob + hazard + unplayable > 0;
    const effectiveTeeGIR = score.teeGIR && !hasPenalty;
    // 티샷과 퍼팅 사이의 기본 필드샷.
    //   파3: 티샷 온그린(GIR)이면 0, 그린을 놓쳤으면 세컨샷(어프로치) 1개 — geo.fieldShotCount와 같은 기준.
    //   파4 이상: 세컨샷 1개. 단 세컨샷 결과를 아직 기록하지 않았으면 규정 타수 온그린
    //   (파-2타 만에 온그린)을 가정한다 — 티샷만 입력한 파5가 버디(4타)로 계산되지 않게.
    const baseField = par > 3
      ? (secondShotDecided(score) ? 1 : par - 3)
      : (par3TeeOnGreen(score) ? 0 : 1);
    // OB 1회 = 벌타 1타 + 다시 치는 샷 1타.
    //   OB티로 이동(앞으로 나가서 치기)이나 어느 샷인지 모르는 OB는 다시 치는 샷을 치지
    //   않으므로 여기서 1타씩 더한다(phantomStrokes). 직전 샷 위치에서 다시 친 OB는 그 샷이
    //   다음 샷으로 기록되므로 더하지 않는다.
    // 해저드·언플레이어블 1회 = 벌타 1타뿐 — 드롭(또는 다시 치기) 후 이어 치는 샷은 사용자가
    // 다음 샷으로 기록한다.
    const field = effectiveTeeGIR ? 0 : baseField + phantomStrokes(score) + (score.extraShots?.length || 0);
    // 퍼트가 그린 밖으로 나가 다시 친 칩은 퍼팅이 아니지만 스코어에는 들어간다
    return 1 + field + (score.putts || 0) + offGreenCount(score) + ob + hazard + unplayable;
  };

  // ─── 스코어 자동 계산 ───────────────────────────────────────────────────────
  // 상세 입력 홀(티샷 클럽을 고른 홀)은 스코어 칸이 샷 기록으로 계산된다:
  // 샷 수 + 퍼팅 수 + 벌타. 퍼팅을 아직 입력하지 않았으면 기본 2퍼트로 본다.
  // 스코어는 벌타를 포함한 총 스코어다. 사용자가 −/+로 직접 고치면(strokesManual) 그 값이
  // 언제나 우선이다 — 상세 입력으로 표현 못 하는 상황(규칙 적용 등)을 바로잡을 방법이
  // 그것뿐이다. 이후 샷·벌타를 더 입력하거나 칩인·홀인 처리를 해도 자동 계산 값으로
  // 덮어쓰지 않고, '자동 계산' 버튼을 눌러야만 샷 기록 계산으로 돌아간다.
  // 예전에는 퍼팅 '홀인 성공'을 눌러야만 계산돼서, 위쪽 퍼팅 수만 고르고 넘기면
  // 샷 기록과 다른 기본 파가 저장됐다.
  const autoScoreOn = (s) => round.players.length === 1 && !!s.teeClub && !s.strokesManual;
  const withAutoStrokes = (s) => (autoScoreOn(s) ? { ...s, strokes: calcAutoStrokes(s, hole.par) } : s);

  // 퍼팅 수를 알고 있는지 — 위쪽 퍼팅 수를 골랐거나, 퍼팅 홀인 성공·실패를 눌렀거나,
  // 칩인·홀인원으로 끝났거나, 이미 확정한 홀.
  const puttsKnown = (s) => !!(s.puttsManual || s.confirmed || isHoledOut(s)
    || (Array.isArray(s.puttDetails) && s.puttDetails.some(p => p?.holein === 'success' || p?.holein === 'fail' || p?.holein === 'offgreen')));
  // 상세 입력 중이고 퍼팅을 아직 모르는 홀. 스코어를 2퍼트로 가정해 보여주면 GIR을
  // 놓치는 순간 보기로 보이지만 1퍼트로 막을 수도 있다 — 그래서 스코어 대신
  // '온그린까지 N타 · 퍼팅 남음'을 보여주고, 퍼팅을 입력하면 확정한다.
  // (저장값은 2퍼트 기준 예상치로 계속 갱신해 둔다 — 중간에 앱이 꺼져도 남도록.)
  const scorePending = (s) => autoScoreOn(s) && !puttsKnown(s);

  // 아직 끝나지 않은 홀 — 퍼트 결과를 누르기 시작했지만(다음 퍼트로 넘어갔거나 그린 밖으로 보냈다) 마지막 퍼트가 들어가지
  // 않았고, 칩인·홀인원도 아니고, 퍼팅 수를 직접 정하거나 홀을 확정하지도 않았다. 이때의 스코어·퍼팅 수는 "지금까지 확실한 최소"일 뿐
  // (다음 퍼트 카드나 칩 뒤 퍼트는 자리만 만들어 둔 것)이라, 끝난 홀처럼 홀 표에 숫자로 보이거나 "보기" 같은 이름이 붙으면 안 된다.
  const lastPuttHoled = (s) => { const d = s.puttDetails; return Array.isArray(d) && d.length > 0 && d[d.length - 1]?.holein === 'success'; };
  const holeOpen = (s) => autoScoreOn(s) && !s.confirmed && !s.puttsManual && !isHoledOut(s) && !lastPuttHoled(s)
    && (s.puttDetails || []).some(p => p?.holein === 'fail' || p?.holein === 'offgreen');
  const inProgress = (s) => scorePending(s) || holeOpen(s);

  // 홀 표(SCORE · PUTT 줄)에 보일 글자 — 입력하지 않은 홀은 저장된 기본값(파·2퍼트)이 아니라 '-' 로 보여 준다.
  // PUTT 는 퍼트 수를 직접 입력했거나 확정한 홀만 보인다 (퍼팅을 아직 모르는 홀의 2퍼트는 가정값이다).
  const NAV_EMPTY = '-';
  const navStrokesText = (s, done) => (s?.touched !== true ? NAV_EMPTY : !done && inProgress(s) ? '·' : s.strokes);
  const navPuttsText = (s, done) => (s?.touched !== true || (!done && (holeOpen(s) || !puttsKnown(s))) || s.putts == null ? NAV_EMPTY : s.putts);
  const strokesToGreen = (s, par) => calcAutoStrokes({ ...s, putts: 0 }, par);

  // 홀 확정 — 상세 입력 홀은 스코어·GIR을 샷 기록으로 다시 계산한다(칩인·홀인원 포함).
  // confirmed: 이 홀을 '다음'/홀인으로 끝냈다는 표시. 진행률과 누적 스코어는 확정된
  // 홀만 센다 — 입력 중인 홀이 미리 끝난 홀로 잡히지 않게.
  const finalizeScore = (s, par) => {
    if (!s.teeClub || s.strokesManual) return { ...s, touched: true, confirmed: true };
    const autoStrokes = calcAutoStrokes(s, par);
    const autoGir = (autoStrokes - (s.putts || 0) - offGreenCount(s)) <= par - 2;
    return { ...s, strokes: autoStrokes, gir: autoGir, girAuto: true, touched: true, confirmed: true };
  };

  // updateScore handles strokes/putts with auto-inference; other fields use updateField
  // extra: 같은 갱신에 함께 넣을 필드 (예: 스코어 초기화 시 strokesManual 해제)
  const updateScore = (field, value, extra = {}) => {
    const updated = { ...round };
    updated.holes = [...round.holes];
    let np = { ...playerScore, [field]: value, touched: true };
    if (field === 'strokes') np.strokesManual = true;
    // GIR을 사용자가 직접 선택(girAuto:false)한 뒤에는 스코어/퍼팅 수 보정이
    // 그 선택을 조용히 덮어쓰지 않는다 — girAuto일 때만 자동 재계산한다.
    const girIsAuto = playerScore.girAuto !== false;
    if (field === 'strokes') {
      // 퍼팅 수를 직접 정했거나 상세 입력 홀이면 스코어 변경이 퍼팅 수를 추정해
      // 바꾸지 않는다 — 상세 입력 홀의 퍼팅 수는 기록이다.
      if (playerScore.puttsManual || playerScore.teeClub) {
        // 퍼팅 수를 사용자가 직접 지정한 뒤라면 스코어 변경이 그 값을 덮어쓰지 않는다.
        // 유효 범위(퍼팅 < 스코어)를 벗어날 때만 클램프한다. 클램프로 잘린 퍼팅 수는 기억해 두었다가
        // (puttsHeld) 점수를 다시 올리면 되돌린다 — −를 눌렀다 +로 되돌렸을 때 퍼팅 기록이 사라지지 않게.
        const maxPutts = Math.max(0, value - 1);
        const curPutts = playerScore.putts || 0;
        const held = playerScore.puttsHeld;
        const basePutts = held && curPutts === held.clamped ? held.value : curPutts;   // 잘린 값 그대로일 때만 원래 값 기준
        const nextPutts = Math.min(basePutts, maxPutts);
        if (nextPutts !== curPutts) np.putts = nextPutts;
        if (nextPutts < basePutts) np.puttsHeld = { value: basePutts, clamped: nextPutts };
        else delete np.puttsHeld;
        if (girIsAuto) {
          const ag = calculateGir(value, np.putts, hole.par, offGreenCount(np));
          if (ag !== null) { np.gir = ag; np.girAuto = true; }
        }
      } else {
        const inf = inferStatsFromStrokes(value, hole.par);
        np.putts = inf.putts;
        if (hole.par > 3 && !playerScore.touched) np.fairway = inf.fairway;
        if (girIsAuto) { np.gir = inf.gir; np.girAuto = true; }
      }
    }
    if (field === 'putts' && girIsAuto) {
      const ag = calculateGir(np.strokes, value, hole.par, offGreenCount(np));
      if (ag !== null) { np.gir = ag; np.girAuto = true; }
    }
    if (field === 'gir') np.girAuto = false;
    np = { ...np, ...extra };
    updated.holes[holeIdx] = { ...hole, scores: { ...hole.scores, [activePlayer]: np } };
    onUpdate(updated);
  };

  // 상세 입력 필드를 바꾸는 경로는 모두 여기를 지난다 — 스코어 자동 계산을 함께 반영한다.
  const updateField = (field, value) => updateFields({ [field]: value });

  // ─── 직전 샷 위치에서 다시 치기 → 남은 거리는 직전 샷과 같다 ──────────────────────────
  // 벌타 처리를 '스트로크와 거리 구제(다시 치기)'로 하면 다시 친 샷은 벌타가 난 샷과 같은
  // 자리에서 친다 — 핀까지 남은 거리도 같다. 다시 친 샷의 남은 거리가 비어 있으면 벌타가 난
  // 샷의 값(슬라이더 값, 없으면 지도 실측, 티샷이면 티샷 거리)을 넣고, 사용자가 직접 정하기
  // 전까지(replayCopied) 앞 샷의 값을 따라간다. 처리 방법을 다시 치기가 아닌 것으로 바꾸면
  // 넣어 둔 값을 비운다.
  const syncReplayRemaining = (s) => {
    const pens = s.penalties || [];
    const exs = s.extraShots || [];
    if (pens.length === 0 && !s.replayCopied && !exs.some(x => x?.replayCopied)) return s;
    const out = { ...s };
    const extras = exs.map(x => ({ ...x }));
    const measured = pinDistances(s.gpsPoints, s.gpsPin, extras.length + 2).map(saneRemaining);
    const rnd = (d) => (d == null ? null : Math.round(d));
    const shotAt = (slot) => (slot === 1 ? out : extras[slot - 2]);   // 1=세컨샷, 2 이상=익스트라샷
    let changed = false;
    for (let slot = 0; slot <= extras.length; slot++) {
      const target = shotAt(slot + 1);
      if (!target) continue;
      const replay = pens.find(p => p.slot === slot && p.mode === 'replay');
      if (!replay) {
        if (target.replayCopied) {
          target.remainingDistance = null; target.remainingAppliedM = undefined; target.remainingSource = null;
          delete target.replayCopied;
          changed = true;
        }
        continue;
      }
      let val; let applied; let source = null;
      if (slot === 0) {
        val = hole.par === 3 ? (s.teeDistance ?? null) : rnd(measured[0]);   // 티 → 핀 = 그날 전장
      } else {
        const prev = shotAt(slot);
        val = prev.remainingDistance ?? rnd(measured[slot]);
        applied = prev.remainingAppliedM; source = prev.remainingSource ?? null;
      }
      if (val == null) continue;
      if (target.remainingDistance == null || target.replayCopied) {
        if (target.remainingDistance !== val || !target.replayCopied) changed = true;
        target.remainingDistance = val; target.remainingAppliedM = applied; target.remainingSource = source;
        target.replayCopied = true;
      }
    }
    return changed ? { ...out, extraShots: extras } : s;
  };

  const updateFields = (fields) => {
    const updated = { ...round };
    updated.holes = [...round.holes];
    updated.holes[holeIdx] = { ...hole, scores: { ...hole.scores, [activePlayer]: withAutoStrokes(syncReplayRemaining({ ...playerScore, ...fields, touched: true })) } };
    onUpdate(updated);
  };

  const extraShotTopRef = useRef(null);
  const puttTopRef = useRef(null);   // 퍼팅 영역의 맨 위 — 랜딩을 고르면 화면을 여기로 옮긴다
  const pinTopRef = useRef(null);    // 퍼팅 탭의 핀 위치 칸 — 온그린 성공 뒤 화면이 먼저 오는 자리 (파4 이상)
  const landingTopRef = useRef(null); // 온그린 랜딩 방향 휠 자리 — 방향이 비어 있으면 퍼팅 단계에 들어올 때 화면을 여기로 옮긴다
  const offGreenTopRef = useRef(null);
  const prevExtraShotsLenRef = useRef(0);
  const tabsTopRef = useRef(null);   // 입력 탭 행의 자리 — 탭을 바꾸거나 다음 홀로 가면 화면을 여기로 옮긴다

  const scrollToTabs = () => setTimeout(() => {
    const el = tabsTopRef.current;
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else window.scrollTo?.({ top: 0, behavior: 'smooth' });   // 샷 기록이 접혀 있으면 새 홀의 맨 위로
  }, 80);
  const scrollToPutting = () => setTimeout(() => puttTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  // 다음에 눌러야 할 입력 칸을 화면 맨 위(탭 행 바로 아래)로 옮긴다 — 예전에는 화면 맨 아래로 내렸는데, 아래에 전체 스코어 표가 있어
  // 다음 칸을 지나쳐 버렸다. 칸은 data-step 이름으로 찾는다. 방금 눌러서 나타나는 칸일 수 있어 잠깐씩 기다리며 몇 번 다시 찾는다
  // (칸이 끝내 없으면 — 예: 단계가 바뀌어 다른 탭으로 넘어갔다 — 아무것도 하지 않는다).
  const scrollToStep = (name, tries = 8) => {
    const go = (n) => {
      const el = document.querySelector(`[data-step="${name}"]`);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      if (n > 0) setTimeout(() => go(n - 1), 60);
    };
    setTimeout(() => go(tries), 60);
  };

  // ─── 라운드 완료 ────────────────────────────────────────────────────────────
  // 입력하지 않은 홀은 기본값(파·2퍼트)이 그대로 저장돼 평균 스코어가 왜곡되므로
  // 그런 홀이 있으면 한 번 확인한다. 완료는 한 번만 실행되게 막는다.
  const untouchedHoles = (r) => r.holes
    .map((h, i) => (r.players.some(p => h.scores[p]?.touched !== true) ? i : -1))
    .filter(i => i >= 0);

  const doFinish = (u) => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setPendingFinish(null);
    // 입력은 했지만 '다음'으로 확정하지 않고 지나간 홀(홀 번호를 눌러 이동한 경우)도
    // 확정한 홀과 똑같이 스코어·GIR을 샷 기록으로 맞춰 저장한다.
    const finalized = {
      ...u,
      // 예전 진행 중 라운드(trackConfirm 없음)는 확정 기록이 없어 모든 홀이 미확정으로
      // 보이므로 건드리지 않는다 — 그때 직접 고친 스코어를 다시 계산해 덮어쓰지 않게.
      holes: !u.trackConfirm ? u.holes : u.holes.map(h => {
        const pending = u.players.some(p => h.scores[p]?.touched && !h.scores[p]?.confirmed);
        if (!pending) return h;
        const scores = { ...h.scores };
        u.players.forEach(p => { if (scores[p]?.touched && !scores[p].confirmed) scores[p] = finalizeScore(scores[p], h.par); });
        return { ...h, scores };
      }),
    };
    // 저장에 실패하면 다시 누를 수 있게 잠금을 푼다 (안내는 상위에서 띄운다).
    setTimeout(() => Promise.resolve(onFinish(finalized)).catch(() => { finishingRef.current = false; }), 50);
  };

  const requestFinish = (u) => {
    if (finishingRef.current) return;
    if (untouchedHoles(u).length > 0) { setPendingFinish(u); return; }
    doFinish(u);
  };

  const goToHole = (idx) => { if (idx >= 0 && idx < holeTotal) { setHoleIdx(idx); onUpdate({ ...round, currentHole: idx }); } };

  // ─── '다음' / '완료' ─────────────────────────────────────────────────────────
  // '다음'은 이 홀을 확정한다(입력 안 한 플레이어는 파·기본값으로). 다만 홀 전체에
  // 아무 입력이 없으면 실수로 넘긴 것일 수 있어 파로 기록할지 먼저 묻는다.
  // 홀 번호 칸을 눌러 이동하는 건 둘러보기라 확정하지 않는다.
  const holeUntouched = (idx) => round.players.every(p => round.holes[idx].scores[p]?.touched !== true);

  // 홀을 확정하기 전에 확인할 것: 빠진 샷 정보(라이·지형·거리·클럽)와, 상세 입력 중인데 모르는 퍼팅 수.
  // 퍼팅 수는 2퍼트로 가정하지 않고 묻는다. 둘 다 막지는 않는다 — 코스 위에서 급하게 넘겨야 할 때를 위해
  // 샷 정보는 '그대로'를 둔다. 확인할 게 없으면 창 없이 바로 넘어간다.
  const needsCheck = () => infoGaps.length > 0 || scorePending(playerScore);

  const handleNext = () => {
    if (holeUntouched(holeIdx)) { setPendingSkip(holeIdx + 1); return; }
    if (needsCheck()) { setHoleCheck({ next: holeIdx + 1 }); return; }
    confirmAndGoToHole(holeIdx + 1);
  };

  // 비어 있는 샷 정보 입력으로 데려간다 — 그 샷이 있는 필드샷 탭(파3 티샷 거리는 티샷 탭), 그 샷의 칸을 펼친다.
  const goFillShotInfo = (gap) => {
    setHoleCheck(null);
    if (gap.slot === 0) {
      setStage('tee');
    } else {
      setStage('field');
      if (gap.slot === 1) setSecondShotExpanded(true); else setExpandedExtraShot(gap.slot - 2);
    }
    scrollToTabs();
  };

  // 마지막 홀을 확정하고 완료한다. freshScore: 현재 플레이어의 최신 스코어(있으면).
  const finishWith = (freshScore) => {
    const u = { ...round }; u.holes = [...round.holes];
    const lh = u.holes[holeIdx]; const us = {};
    round.players.forEach(p => { us[p] = finalizeScore(p === activePlayer && freshScore ? freshScore : lh.scores[p], lh.par); });
    u.holes[holeIdx] = { ...lh, scores: us }; onUpdate(u); requestFinish(u);
  };

  // 마지막 홀이 비어 있으면 확정하지 않고 넘긴다 — 완료 전 미입력 홀 확인에 함께 잡힌다.
  const handleFinishClick = () => {
    if (holeUntouched(holeIdx)) { requestFinish(round); return; }
    if (needsCheck()) { setHoleCheck({ finish: true }); return; }
    finishWith(null);
  };

  // 확인 창에서 이대로 넘어간다. putts: 퍼팅 수를 골랐으면 그 수로 스코어를 계산해 확정한다.
  const goOnFromCheck = (putts = null) => {
    const ask = holeCheck;
    setHoleCheck(null);
    if (!ask) return;
    let fresh = null;
    if (putts != null) {
      const details = Array.from({ length: putts }, (_, i) => puttDetails[i] || newPuttDetail(i, firstPutt));
      const keptOffGreen = offGreenShots({ putts, puttDetails: details, offGreen: playerScore.offGreen });
      fresh = withAutoStrokes({ ...playerScore, putts, puttDetails: details, offGreen: keptOffGreen, puttsManual: true, puttsHeld: null, touched: true });
    }
    if (ask.finish) finishWith(fresh); else confirmAndGoToHole(ask.next, fresh);
  };

  // freshScore: 현재 플레이어의 최신 스코어 객체 (setState 배치 전 최신값을 직접 전달할 때 사용)
  const confirmAndGoToHole = (idx, freshScore) => {
    scrollToTabs();   // 다음 홀은 티샷 탭부터 — 탭 행이 맨 위에 오게 옮긴다
    const updated = { ...round };
    updated.holes = [...round.holes];
    const ch = updated.holes[holeIdx];
    const us = {};
    round.players.forEach(p => {
      const s = (p === activePlayer && freshScore) ? freshScore : ch.scores[p];
      us[p] = finalizeScore(s, ch.par);
    });
    updated.holes[holeIdx] = { ...ch, scores: us };
    updated.currentHole = idx; setHoleIdx(idx); onUpdate(updated);
  };

  // info: 퍼트가 그린 밖으로 나간 뒤의 칩인이면 { putts, onCount } — 기본은 필드샷 칩인(퍼팅 0)
  const triggerChipIn = (freshScore, info = null) => {
    if (holeInModalPendingRef.current) return;
    holeInModalPendingRef.current = true;
    holeInCbRef.current = () => {
      if (isLastHole) {
        const u = { ...round }; u.holes = [...round.holes];
        const lh = u.holes[holeIdx]; const us = {};
        round.players.forEach(p => {
          const s = p === activePlayer ? freshScore : lh.scores[p];
          us[p] = finalizeScore(s, lh.par);
        });
        u.holes[holeIdx] = { ...lh, scores: us }; onUpdate(u); requestFinish(u);
      } else {
        confirmAndGoToHole(holeIdx + 1, freshScore);
      }
    };
    openHoleInModal({
      isLastHole,
      scoreName: getScoreName(freshScore.strokes, hole.par),
      strokes: freshScore.strokes,
      putts: info?.putts ?? 0,
      onCount: info?.onCount ?? freshScore.strokes,
    });
  };

  // slot번째 샷이 그린에 올라갔다(또는 홀에 들어갔다)면 그 뒤 샷은 있을 수 없다 — 뒤 샷과 그 GPS 지점·벌타를 지운다.
  // 벌타를 남기면 지운 샷의 벌타가 타수에 그대로 더해진다. 지울 게 없으면 빈 객체 (저장값에 빈 배열을 새로 만들지 않는다).
  const fieldsWithoutShotsAfter = (slot) => {
    const fields = {};
    const extras = playerScore.extraShots || [];
    const pts = playerScore.gpsPoints || [];
    const keep = Math.max(0, slot - 1);   // extraShots[i] 는 slot i+2 — slot 이하만 남긴다
    if (extras.length > keep) fields.extraShots = extras.slice(0, keep);
    if (pts.length > slot + 1) fields.gpsPoints = pts.slice(0, slot + 1);
    const all = playerScore.penalties || [];
    const dropped = all.filter((p) => p.slot > slot);
    if (dropped.length > 0) {
      fields.penalties = all.filter((p) => p.slot <= slot);
      dropped.forEach((p) => { fields[p.type] = Math.max(0, (fields[p.type] ?? playerScore[p.type] ?? 0) - 1); });
    }
    return fields;
  };

  // 세컨샷이 바로 홀에 들어간 경우 (파3 그린 놓친 뒤 칩인, 파4 세컨샷 이글 등).
  // 세컨샷 결과는 onGreen에 'chip-in'으로 남긴다 — 써드샷 이후의 칩인과 같은 표기.
  // 세컨샷을 '실패'로 눌러 써드샷이 만들어져 있었어도 칩인이면 그 뒤 샷은 없다.
  const secondShotChipIn = () => {
    const base = { ...playerScore, ...fieldsWithoutShotsAfter(1), onGreen: 'chip-in', putts: 0, puttDetails: [], offGreen: [] };
    // 직접 고친 스코어가 있으면 그 값을 유지한다 (base가 strokes·strokesManual을 그대로 들고 있다)
    triggerChipIn(playerScore.strokesManual
      ? { ...base, touched: true }
      : { ...base, strokes: calcAutoStrokes(base, hole.par), touched: true, strokesManual: false });
  };

  // 홀인 모달: 2.5초 뒤 저장·이동(holeInCbRef). 그 전에 '취소'하면 아무것도
  // 저장하지 않는다 — 홀인원·퍼팅 성공을 잘못 눌렀을 때 되돌릴 길.
  const holeInTimerRef = useRef(null);
  const openHoleInModal = (data) => {
    setHoleInModalData(data);
    setShowHoleInModal(true);
    clearTimeout(holeInTimerRef.current);
    holeInTimerRef.current = setTimeout(() => { setShowHoleInModal(false); holeInModalPendingRef.current = false; holeInCbRef.current?.(); }, 2500);
  };
  const cancelHoleIn = () => {
    clearTimeout(holeInTimerRef.current);
    holeInCbRef.current = null;
    setShowHoleInModal(false);
    holeInModalPendingRef.current = false;
  };

  const getScoreName = (strokes, par) => {
    if (!strokes) return null;
    if (strokes === 1) return { name: '🏆 HOLE IN ONE', color: '#1b64da', textColor: '#ffffff', bg: 'linear-gradient(135deg,#1b64da 0%,#1b64da 50%,#9db9ee 100%)', shadow: '0 2px 12px rgba(27,100,218,0.5)', anim: 'holeInOnePulse 2s ease-in-out infinite', fw: '800' };
    const diff = strokes - par;
    if (diff <= -3) return { name: 'Albatross', color: '#1b64da', bg: 'rgba(27,100,218,0.12)', shadow: '0 2px 16px rgba(27,100,218,0.4)', anim: 'albatrossGlow 1.8s ease-in-out infinite', fw: '800' };
    if (diff === -2) return { name: 'Eagle',     color: '#1b64da', bg: 'rgba(27,100,218,0.1)',  shadow: '0 2px 10px rgba(27,100,218,0.35)', anim: 'eagleGlow 2.2s ease-in-out infinite',     fw: '700' };
    if (diff === -1) return { name: 'Birdie',    color: '#0a7f3f', bg: 'rgba(10,127,63,0.08)', shadow: '0 2px 6px rgba(10,127,63,0.25)',   anim: 'birdieGlow 2.8s ease-in-out infinite',   fw: '600' };
    if (diff === 0)  return { name: 'Par',        color: '#4e5968' };
    if (diff === 1)  return { name: 'Bogey',      color: '#c8323a', bg: 'rgba(200,50,58,0.06)',  shadow: '0 2px 5px rgba(200,50,58,0.2)',   anim: 'bogeyRed 3.5s ease-in-out infinite',  fw: '600' };
    if (diff === 2)  return { name: 'Double',     color: '#c8323a', bg: 'rgba(200,50,58,0.09)',  shadow: '0 2px 8px rgba(200,50,58,0.3)',   anim: 'doubleRed 3s ease-in-out infinite',   fw: '700' };
    if (diff === 3)  return { name: 'Triple',     color: '#c8323a', bg: 'rgba(200,50,58,0.12)',  shadow: '0 2px 10px rgba(200,50,58,0.4)',  anim: 'tripleRed 2.5s ease-in-out infinite', fw: '700' };
    if (diff === 4)  return { name: 'Quadruple',  color: '#c8323a', bg: 'rgba(200,50,58,0.15)',  shadow: '0 2px 12px rgba(200,50,58,0.5)',  anim: 'quadRed 2s ease-in-out infinite',     fw: '800' };
    if (diff === 5)  return { name: 'Quintuple',  color: '#c8323a', bg: 'rgba(200,50,58,0.17)',  shadow: '0 2px 14px rgba(200,50,58,0.55)', anim: 'quadRed 1.9s ease-in-out infinite',   fw: '800' };
    if (diff === 6)  return { name: 'Sextuple',   color: '#c8323a', bg: 'rgba(200,50,58,0.18)',  shadow: '0 2px 15px rgba(200,50,58,0.58)', anim: 'quadRed 1.8s ease-in-out infinite',   fw: '800' };
    if (diff === 7)  return { name: 'Septuple',   color: '#c8323a', bg: 'rgba(200,50,58,0.19)',  shadow: '0 2px 16px rgba(200,50,58,0.62)', anim: 'quadRed 1.7s ease-in-out infinite',   fw: '800' };
    if (diff === 8)  return { name: 'Octuple',    color: '#c8323a', bg: 'rgba(200,50,58,0.2)',  shadow: '0 2px 17px rgba(200,50,58,0.65)', anim: 'quadRed 1.6s ease-in-out infinite',   fw: '800' };
    if (diff === 9)  return { name: 'Nonuple',    color: '#c8323a', bg: 'rgba(200,50,58,0.21)',  shadow: '0 2px 18px rgba(200,50,58,0.68)', anim: 'quadRed 1.5s ease-in-out infinite',   fw: '800' };
    if (diff === 10) return { name: 'Decuple',    color: '#c8323a', bg: 'rgba(200,50,58,0.22)',  shadow: '0 2px 20px rgba(200,50,58,0.72)', anim: 'quadRed 1.4s ease-in-out infinite',   fw: '800' };
    return                   { name: `+${diff}`,  color: '#c8323a', bg: 'rgba(200,50,58,0.22)',  shadow: '0 2px 20px rgba(200,50,58,0.72)', anim: 'quadRed 1.4s ease-in-out infinite',   fw: '800' };
  };

  const scoreName = getScoreName(playerScore.strokes, hole.par);
  // 티샷이 끝나려면 아직 고르지 않은 항목. 비어 있어야 티샷 완료다.
  //   파4·5: 페어웨이 O/X와 랜딩 L/C/R을 둘 다 골라야 한다 (1온 G는 그 자체가 결과).
  //          예전에는 O를 누르면 랜딩이 C로 자동 기록돼 L/C/R을 건너뛸 수 있었다.
  //   파3: GIR 성공/실패
  //   티샷에서 OB·해저드가 났으면 그것으로 티샷 결과가 정해진다.
  //
  // 필수 선택은 지금 입력 중인 홀에만 적용한다. 이미 확정한 홀(confirmed)이나 확정 기록이
  // 없는 예전 진행 중 라운드는 고쳐 보러 들어갔을 때 탭이 잠기면 안 되므로 예전 기준을 쓴다.
  const strictRequired = !!round.trackConfirm && !playerScore.confirmed;
  // 티샷에서 꼭 받는 것은 클럽이다 (파3은 티샷 결과도 — 그린에 올랐는지에 따라 이어지는 입력이 달라진다).
  // 구질 · 페어웨이 O/X · 랜딩 L/C/R 은 선택이다: 입력하면 분석에 쓰이고, 비워 두어도 필드샷으로 넘어갈 수 있다.
  // 파3 티샷 거리를 비워 두면 '다음'을 누를 때 한 번 묻는다 (샷 정보 확인 — shotInfoGaps).
  const teeRequired = (() => {
    const s = playerScore;
    if (!s.teeClub) return ['클럽'];
    if (!penaltyAt(s, 0) && hole.par === 3 && s.teeOnGreen == null && s.girAuto) return ['티샷 결과'];
    return [];
  })();
  const teeOptionalLeft = (() => {
    const s = playerScore;
    if (!s.teeClub) return [];
    const out = [];
    if (!s.shotShape) out.push('구질');
    if (!penaltyAt(s, 0) && hole.par > 3 && !s.teeGIR) {
      if (strictRequired && s.fairway == null) out.push('페어웨이 O/X');
      if (s.fairwayHit == null) out.push('랜딩 L/C/R');
    }
    return out;
  })();
  const teeReady = teeRequired.length === 0;                          // 필드샷·퍼팅 탭이 열린다
  const teeComplete = teeReady && teeOptionalLeft.length === 0;        // 선택 항목까지 모두 입력 — 자동으로 다음 탭으로 넘어간다
  const isLastHole = holeIdx === holeTotal - 1;
  const isSimpleMode = round.players.length > 1;

  // ─── 샷 기록 열기 — 기본은 접혀 있고 스코어 · 퍼팅만 받는다 ─────────────────────────────
  // 이미 샷 기록(티샷 클럽 · 필드샷 · 퍼트 상세)이 있는 홀은 그 기록이 숨지 않게 늘 열어 둔다.
  const hasShotData = !!(playerScore.teeClub || (playerScore.extraShots || []).length > 0
    || (Array.isArray(playerScore.puttDetails) && playerScore.puttDetails.some(Boolean))
    || (playerScore.penalties || []).length > 0);
  const shotVisible = !isSimpleMode && (shotPref || hasShotData);
  const shotCount = (playerScore.teeClub ? 1 : 0) + (playerScore.extraShots || []).length
    + (Array.isArray(playerScore.puttDetails) ? playerScore.puttDetails.filter(Boolean).length : 0);
  const setShotOpen = (open) => {
    setShotPref(open);
    writeShotDetail(open);
    if (open) { setStage('tee'); scrollToTabs(); }   // 샷 기록은 티샷부터
  };
  const penaltySummary = penaltyCount(playerScore) > 0
    ? [['해저드', playerScore.hazard || 0], ['OB', playerScore.ob || 0], ['언플레이어블', playerScore.unplayable || 0]]
      .filter(([, n]) => n > 0).map(([l, n]) => `${l} ${n}`).join(', ') || `${penaltyCount(playerScore)}타`
    : '없음';


  // 벌타가 기록된 홀은 티샷이 그린에 한 번에 올라갔다(1온·파3 티샷 온그린·홀인원)고 기록할 수 없다.
  // 벌타를 넣을 때는 그 표시가 풀리는데, 반대 순서(벌타 → 1온)를 막지 않으면 1온 표시와 벌타가
  // 함께 남아 화면은 1온인데 타수는 벌타 기준으로 계산되는 모순이 된다. 벌타를 먼저 지워야 한다.
  const penaltyBlocksTeeOnGreen = penaltyCount(playerScore) > 0;
  const teeOnGreenBlockedHint = (
    <div style={{ fontSize:13, color:'#4e5968', lineHeight:1.5, marginTop:6, textAlign:'center' }}>
      벌타가 기록돼 있어 티샷 한 번에 올린 것으로 기록할 수 없어요 · 벌타를 먼저 지워 주세요
    </div>
  );

  // 볼이 그린에 올라갔다고 '기록된' 홀인지 — 사용자가 고른 결과만 본다. gir는 홀을 확정할 때
  // 타수로 다시 계산되고 기본값이 true라서 입력 여부를 판단하는 데 쓸 수 없다.
  const ballOnGreen = (() => {
    const s = playerScore;
    const ex = s.extraShots || [];
    if (ex.length > 0) return ex[ex.length - 1]?.onGreen === true;
    if (hole.par === 3) {
      return s.teeOnGreen === true || s.onGreen === true
        || (s.teeOnGreen == null && s.gir === true && s.girAuto === false);
    }
    return s.teeGIR === true || s.onGreen === true || (s.gir === true && s.girAuto === false);
  })();

  // 샷 정보 — 샷마다 꼭 받는 네 가지: 라이 · 지형 · 거리 · 클럽 (engine/shotInfo.js).
  // 지금 입력 중인 상세 입력 홀에서만 필수 표시를 하고, '다음'·'완료'에서 비어 있으면 한 번 짚어 준다.
  // 확정한 홀·예전 라운드·간편 입력(동반자) 홀은 막지 않는다 (strictRequired).
  const infoRequired = strictRequired && !isSimpleMode;
  const infoGaps = infoRequired ? shotInfoGaps(playerScore, hole.par) : [];

  // 세컨샷 지형 추천 — 티샷에서 페어웨이를 지켰으면 페어웨이, 놓쳤으면 러프 (고르기 전에만 ★ 로 알려 준다)
  const secondSurfaceSuggest = penaltyAt(playerScore, 0) ? null : playerScore.fairway === true ? 'fairway' : playerScore.fairway === false ? 'rough' : null;

  // 티샷 페어웨이 O/X. 세컨샷은 티샷이 멈춘 자리에서 치는 것이니 지형을 미리 채운다 (secondSurfaceAuto 로 직접 고른 값과 구분).
  // O 면 페어웨이, X 면 러프 — X 는 벙커일 수도 있지만 가장 흔한 쪽으로 채우고, 다르면 눌러서 바꾸게 한다.
  // 비어 있거나 이미 채워 둔 지형만 바꾼다 (직접 고른 지형은 덮어쓰지 않는다). 티샷 벌타가 있으면 볼 자리를 알 수 없어 채우지 않는다.
  const autoSurfaceClear = playerScore.secondSurfaceAuto ? { secondSurface: null, secondSurfaceAuto: false } : {};   // 채워 둔 지형만 비운다 (직접 고른 값은 그대로)
  const setTeeFairway = (hit) => {
    const patch = { fairway: hit, ...(playerScore.fairwayFromLanding ? { fairwayFromLanding: false } : {}), ...(playerScore.fairwayDerived ? { fairwayDerived: false } : {}) };   // 직접 누른 값
    if (penaltyAt(playerScore, 0)) Object.assign(patch, autoSurfaceClear);
    else if (playerScore.secondSurface == null || playerScore.secondSurfaceAuto) Object.assign(patch, { secondSurface: hit === true ? 'fairway' : 'rough', secondSurfaceAuto: true });
    updateFields(patch);
  };

  // 티샷 랜딩 L/C/R. 센터(C)는 페어웨이 한가운데로 갔다는 뜻이라, 페어웨이 O/X 가 비어 있으면 O 로 채워 둔다 (fairwayFromLanding 으로
  // 직접 누른 값과 구분 — 다르면 O/X 를 눌러 바꾸면 된다). 랜딩을 L/R 로 바꾸거나 지우면 채워 둔 O 도 함께 걷어 낸다.
  // 세컨샷 지형도 setTeeFairway 처럼 페어웨이로 미리 채운다. 벌타가 있는 티샷에는 채우지 않는다.
  const landingFlagClear = playerScore.fairwayFromLanding ? { fairwayFromLanding: false } : {};
  const pickLanding = (id) => {
    const next = playerScore.fairwayHit === id ? null : id;
    const patch = { teeGIR: false, fairwayHit: next };
    if (next === 'C' && playerScore.fairway == null && !penaltyAt(playerScore, 0)) {
      Object.assign(patch, { fairway: true, fairwayFromLanding: true });
      if (playerScore.secondSurface == null) Object.assign(patch, { secondSurface: 'fairway', secondSurfaceAuto: true });
    } else if (playerScore.fairwayFromLanding && next !== 'C') {
      Object.assign(patch, { fairway: null, fairwayFromLanding: false, ...autoSurfaceClear });
    }
    updateFields(patch);
  };

  // 세컨샷 지형을 고르면 티샷의 페어웨이 적중도 그에 맞춘다 — 페어웨이에서 쳤으면 O, 러프·벙커면 X.
  // 티샷 때 O 로 짐작하고 왔는데 막상 러프였던 경우처럼, 볼이 실제로 있는 자리가 티샷 때의 짐작보다 정확하다. 직접 누른 값도 따라 바뀐다
  // (fairwayDerived 로 표시해 두고 티샷 쪽에 알려 준다 — 거기서 O/X 를 다시 누르면 그때부터는 직접 고른 값이다).
  const setSecondSurface = (v) => {
    const patch = { secondSurface: v };
    if (playerScore.secondSurfaceAuto) patch.secondSurfaceAuto = false;   // 이제 사용자가 고른(또는 지운) 값이다
    const fw = v ? fairwayFromSurface({ ...playerScore, secondSurface: v }, hole.par) : null;
    if (fw != null) Object.assign(patch, { fairway: fw, fairwayDerived: true, ...landingFlagClear });
    else if (v == null && playerScore.fairwayDerived) Object.assign(patch, { fairway: null, fairwayDerived: false });
    updateFields(patch);
  };

  // 티샷 클럽 버튼 — 파3이든 파4·5든 DRIVER WOOD / HYBRID IRON 네 개를 2×2 로 (2026-11-12 사용자 요청으로 우드를 되살렸다).
  // 예전에 웨지로 기록한 홀은 WEDGE 버튼이 하나 더 보여서 기록이 숨지 않는다.
  const TEE_CLUBS = [{ id: 'driver', label: 'DRIVER' }, { id: 'wood', label: 'WOOD' }, { id: 'hybrid', label: 'HYBRID' }, { id: 'iron', label: 'IRON' }];
  const LEGACY_TEE_CLUBS = { wedge: { id: 'wedge', label: 'WEDGE' } };
  const clubs = LEGACY_TEE_CLUBS[playerScore.teeClub] ? [...TEE_CLUBS, LEGACY_TEE_CLUBS[playerScore.teeClub]] : TEE_CLUBS;

  const secHdr = (label, onDelete, state = 'idle') => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px 6px' }}>
      <div style={{ height: 1, flex: 1, background: HDR[state].line }} />
      <span style={{ fontSize: 13, fontWeight: 800, color: HDR[state].label, letterSpacing:'0' }}>
        {state === 'done' && '✓ '}{label}
      </span>
      <div style={{ height: 1, flex: 1, background: HDR[state].line }} />
      {onDelete && (
        <button onClick={onDelete} style={{ fontSize: 12, color: '#c8323a', background: 'none', border: '1px solid rgba(200,50,58,0.3)', borderRadius: 8, padding: '2px 6px', cursor: 'pointer', flexShrink: 0 }}>✕ 삭제</button>
      )}
    </div>
  );

  const extraShots = playerScore.extraShots || [];

  // ─── 지금 입력 차례인 섹션 ──────────────────────────────────────────────────
  // 헤더 색: 지금 차례 = 금색, 입력을 마친 샷 = 초록 ✓, 아직 차례가 아닌 샷 = 회색.
  // 예전에는 '접힌 + 완료' 헤더를 금색으로 칠해서, 그린을 입력하는 중에도 티샷이
  // 강조돼 티샷 차례로 착각하게 만들었다.
  const currentTurn = (() => {
    if (stage === 'putt') return 'putt';
    if (!teeReady) return 'tee';
    if (extraShots.length === 0) return 'second';
    return expandedExtraShot >= 0 ? expandedExtraShot : extraShots.length - 1;
  })();
  const turnState = (key, done) => (currentTurn === key ? 'active' : done ? 'done' : 'idle');

  const EXTRA_SHOT_NAMES = [
    '써드샷 ( 3rd )',
    '포쓰샷 ( 4th )',
    '피프스샷 ( 5th )',
    '식스샷 ( 6th )',
    '세븐샷 ( 7th )',
    '에잇샷 ( 8th )',
    '나인스샷 ( 9th )',
    '텐스샷 ( 10th )',
    '일레븐스샷 ( 11th )',
    '트웰프스샷 ( 12th )',
    '써틴스샷 ( 13th )',
    '포틴스샷 ( 14th )',
    '피프틴스샷 ( 15th )',
    '식스틴스샷 ( 16th )',
    '세븐틴스샷 ( 17th )',
    '에잇틴스샷 ( 18th )',
    '나인틴스샷 ( 19th )',
    '트웬티스샷 ( 20th )',
  ];
  // 벌타로 실제 타수가 밀린 샷은 '4번째 샷 · OB티'처럼 실제 타수로 부른다 (penalties.shotTitle).
  const extraShotName = (idx) => (titleShifted(playerScore, idx + 2)
    ? shotTitle(playerScore, idx + 2)
    : (EXTRA_SHOT_NAMES[idx] ?? `${idx + 3}번째 샷`));
  const secondShotName = titleShifted(playerScore, 1) ? shotTitle(playerScore, 1) : '세컨샷 ( 2nd )';
  // 확인 창에 쓰는 짧은 이름 — '써드샷 ( 3rd )' 의 영문 표기는 뺀다
  const shortShotName = (slot) => (slot === 0 ? '티샷' : (slot === 1 ? secondShotName : extraShotName(slot - 2)).replace(/\s*\([^)]*\)\s*$/, ''));

  // ─── GPS 샷 지점 ────────────────────────────────────────────────────────────
  // gpsPoints[slot] = (slot+1)번째 샷을 친 지점, gpsGreen = 그린 도착 지점.
  // 샷 거리만 측정하므로 핀·티박스 좌표는 따로 저장하지 않는다.
  const gpsPoints = playerScore.gpsPoints || [];
  const gpsGreen = playerScore.gpsGreen || null;
  // gpsPin: 그날의 핀 자리. 지도에서 그린을 보고 찍거나 홀 옆에 서서 찍는다.
  // 각 샷 지점에서 핀까지 남은 거리와, 티박스→핀 = 그날의 홀 전장이 나온다.
  const gpsPin = playerScore.gpsPin || null;
  const fieldShots = countFieldShots(playerScore, hole.par);

  // 위치 기록은 스코어 입력이 아니므로 touched를 세우지 않는다. updateField를
  // 쓰면 티에서 위치만 찍어도 홀이 '입력 완료'로 잡혀 진행률이 먼저 올라간다.
  const updateGpsField = (field, value) => updateGpsFields({ [field]: value });

  const updateGpsFields = (fields) => {
    const updated = { ...round };
    updated.holes = [...round.holes];
    updated.holes[holeIdx] = { ...hole, scores: { ...hole.scores, [activePlayer]: { ...playerScore, ...fields } } };
    onUpdate(updated);
  };

  // ─── 잔여거리 자동 반영 ──────────────────────────────────────────────────────
  // measuredRemaining[i] = (i+1)번째 샷을 치는 자리에서 핀까지 실측 거리.
  // 슬라이더 값은 눈대중 추정치라, 핀과 그 샷 지점을 모두 찍었으면 실측값이
  // 언제나 더 정확하다. 측정값이 생기거나 바뀌면 슬라이더에 덮어쓴다.
  const measuredRemaining = pinDistances(gpsPoints, gpsPin, fieldShots);
  // GPS가 튄 값(2km 등)은 clubDistance·복기와 같은 기준으로 걸러낸다.
  const roundM = (d) => { const v = saneRemaining(d); return v != null ? Math.round(v) : null; };
  // 세컨샷은 슬롯 1, 익스트라샷 k는 슬롯 k+2 가 '치기 전' 자리다.
  const measuredSecond = roundM(measuredRemaining[1]);
  const measuredExtra = (k) => roundM(measuredRemaining[k + 2]);

  // 측정값이 생기거나 바뀔 때만 저장값에 덮어쓴다. 마지막으로 반영한 실측값을
  // remainingAppliedM 에 같이 저장해 두고 그것과 비교한다 — 사용자가 그 뒤
  // 슬라이더를 직접 돌린 값은, 홀을 오가거나 선수를 바꿔 effect가 다시 돌아도
  // 실측값 자체가 바뀌지 않는 한 그대로 남는다.
  //
  // 우선순위: 사용자가 슬라이더로 정한 값 > 지도(실측) 거리. 지도 거리는 '1차로' 채워 둔
  // 값이라, 비어 있거나 앞서 지도 거리로 넣어 둔 뒤 손대지 않은 값일 때만 새로 채운다.
  //   value === applied  → 지도 거리를 그대로 넣어 둔 값 (핀·지점을 다시 찍으면 같이 갱신)
  //   source === 'live'  → 지도를 닫을 때 현재 위치 기준으로 넣어 둔 값 (이후 실측으로 갱신)
  //   그 밖의 값        → 사용자가 직접 정한 값 — 지도 거리가 바뀌어도 건드리지 않는다
  const mapManaged = (value, applied, source) => value == null || value === applied || source === 'live';
  // 파3 티샷 거리는 티 지점 → 핀이다 (슬라이더 범위 50~250m 안일 때만 채운다)
  const measuredTee = (() => {
    if (hole.par !== 3) return null;
    const d = roundM(measuredRemaining[0]);
    return d != null && d >= 50 && d <= 250 ? d : null;
  })();
  const measuredKey = [holeIdx, activePlayer, ...measuredRemaining.map((d) => roundM(d) ?? '')].join('|');
  useEffect(() => {
    const patch = {};
    if (measuredSecond != null && measuredSecond !== playerScore.remainingDistance
        && mapManaged(playerScore.remainingDistance, playerScore.remainingAppliedM, playerScore.remainingSource)) {
      patch.remainingDistance = measuredSecond;
      patch.remainingAppliedM = measuredSecond;
      patch.remainingSource = null;
      patch.replayCopied = false;
    }
    if (measuredTee != null && measuredTee !== playerScore.teeDistance
        && mapManaged(playerScore.teeDistance, playerScore.teeDistanceAppliedM, null)) {
      patch.teeDistance = measuredTee;
      patch.teeDistanceAppliedM = measuredTee;
    }
    let extrasChanged = false;
    const nextExtras = extraShots.map((shot, k) => {
      const d = measuredExtra(k);
      if (d != null && d !== shot.remainingDistance && mapManaged(shot.remainingDistance, shot.remainingAppliedM, shot.remainingSource)) {
        extrasChanged = true;
        return { ...shot, remainingDistance: d, remainingAppliedM: d, remainingSource: null, replayCopied: false };
      }
      return shot;
    });
    if (extrasChanged) patch.extraShots = nextExtras;
    if (Object.keys(patch).length > 0) updateGpsFields(patch);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measuredKey]);

  // 직전 샷 위치에서 다시 친 샷의 남은 거리가 직전 샷 값을 그대로 쓴 경우
  const replayTag = (copied) => (copied
    ? <span style={{ fontSize: 12, fontWeight: 800, marginLeft: 6, padding: '1px 5px', borderRadius: 8, color: '#a85b00', border: '1px solid rgba(168,91,0,0.4)' }}>다시 치기 · 직전 샷과 같음</span>
    : null);

  // 남은 거리·티샷 거리 옆 표시 — 값이 지도 거리와 같으면 'GPS 실측', 사용자가 정한 값이 달라서
  // 지도 거리가 따로 있으면 그 거리를 보여 주고 한 번에 바꿀 수 있게 한다. 현재 위치 기준으로
  // 넣어 둔 값은 그렇게 표시한다.
  const mapDistanceTag = (measured, value, source, onApply) => {
    const base = { fontSize: 12, fontWeight: 800, marginLeft: 6, padding: '1px 5px', borderRadius: 8 };
    if (measured != null && value === measured) {
      return <span style={{ ...base, color: '#0a7f3f', border: '1px solid rgba(10,127,63,0.4)' }}>GPS 실측</span>;
    }
    if (measured != null) {
      return (
        <button onClick={onApply}
          style={{ ...base, color: '#1b64da', background: 'transparent', border: '1px solid rgba(27,100,218,0.5)', cursor: 'pointer' }}>
          지도 {fmtShot(measured)} 적용
        </button>
      );
    }
    if (source === 'live' && value != null) {
      return <span style={{ ...base, color: '#1b64da', border: '1px solid rgba(27,100,218,0.4)' }}>지도 현재 위치 기준</span>;
    }
    return null;
  };

  // ─── 지도에서 본 거리를 남은 거리에 먼저 채우기 ──────────────────────────────
  // 지점을 찍지 않고 지도의 '여기서 핀까지' 숫자만 보고 닫는 경우가 많다. 그때 남은 거리
  // 슬라이더가 비어 있으면 그 숫자를 먼저 넣어 둔다 — 사용자는 미세 조정만 하면 된다.
  //   · 지금 칠 샷만 채운다: 익스트라샷이 없으면 세컨샷, 있으면 결과가 아직 없는 마지막 샷
  //   · 슬라이더로 입력한 값은 건드리지 않는다 (미입력이거나 앞서 지도 기준으로 넣어 둔 값일 때만)
  //   · 직전 지점에서 거의 움직이지 않았으면(티박스에서 막 열어 본 경우 등) 채우지 않는다
  //   · remainingAppliedM은 건드리지 않는다 — 나중에 그 샷의 지점을 찍으면 실측값이 이 값을 대체한다
  const mapFillFor = (livePos) => {
    if (!livePos || !gpsPin || isHoledOut(playerScore)) return null;
    let slot;
    if (extraShots.length === 0) {
      if (hole.par === 3 ? par3TeeOnGreen(playerScore) : playerScore.teeGIR) return null;   // 세컨샷이 없는 홀
      if (secondShotDecided(playerScore)) return null;                                      // 이미 온그린·칩인
      if (measuredSecond != null) return null;   // 이 샷의 지점이 찍혀 있으면 실측값이 채운다
      if (playerScore.remainingDistance != null && playerScore.remainingSource !== 'live') return null;
      slot = 1;
    } else {
      const last = extraShots[extraShots.length - 1];
      if (last.onGreen != null) return null;
      if (measuredExtra(extraShots.length - 1) != null) return null;
      if (last.remainingDistance != null && last.remainingSource !== 'live') return null;
      slot = extraShots.length + 1;
    }
    const prev = gpsPoints[slot - 1] || null;
    if (prev) {
      const moved = haversine(prev, livePos);
      if (moved != null && moved < Math.max(15, livePos.acc ?? 0)) return null;
    } else if (slot === 1 && !teeReady) {
      return null;   // 티 지점도 없고 티샷도 아직 안 끝났으면 어디서 보는 거리인지 알 수 없다
    }
    const d = roundM(haversine(livePos, gpsPin));
    return d == null ? null : { slot, d, label: shotLabel(slot) };
  };

  const closeMapAndFill = (livePos) => {
    setShowHoleMap(false);
    const f = mapFillFor(livePos);
    if (!f) return;
    patchGpsLatest(holeIdx, activePlayer, (s) => {
      if (f.slot === 1) {
        return s.remainingDistance != null && s.remainingSource !== 'live' ? {} : { remainingDistance: f.d, remainingSource: 'live' };
      }
      const x = (s.extraShots || [])[f.slot - 2];
      if (!x || (x.remainingDistance != null && x.remainingSource !== 'live')) return {};
      return { extraShots: s.extraShots.map((e, i) => (i === f.slot - 2 ? { ...e, remainingDistance: f.d, remainingSource: 'live' } : e)) };
    });
  };

  // ─── 클럽 추천 ──────────────────────────────────────────────────────────────
  // 남은 거리가 저장돼 있으면 — 슬라이더로 정했든 지도로 채웠든 — 그 거리로 클럽을 추천한다.
  // 거리를 입력하기 전에는 보여주지 않는다 (눈대중 시작값으로 추천하면 틀린 클럽을 권한다).
  // slot은 지도의 지점 번호와 같다: 0=티샷, 1=세컨샷, 2 이상=익스트라샷.
  // 샷마다 고를 수 있는 클럽 종류 안에서만 추천한다. 파4·5 티샷은 거리 입력이 없어 추천하지 않는다.
  const clubIdsForSlot = (slot) => {
    if (slot === 0) return hole.par === 3 ? ids(clubs) : null;
    return ids(slot === 1 && penaltyAt(playerScore, 0) ? AFTER_TEE_PENALTY_CLUBS : SECOND_CLUBS);
  };

  // ClubSelector의 suggest — 마이백을 불러오는 중이거나 거리가 없으면 null.
  // 마이백에 저장한 거리가 없으면 추천 대신 안내({ noBag })를 보여준다.
  const clubSuggest = (slot, distance, onPick) => {
    const allowed = clubIdsForSlot(slot);
    if (!recommendOn || bagClubs === undefined || !allowed || !(distance > 0)) return null;
    if (bagClubs === null) return { noBag: true, distance, onPick };
    const rec = recommendClubs(bagClubs, distance, allowed);
    return rec ? { rec, onPick } : null;
  };

  // 지도 화면에 한 줄로 보여줄 추천 — 마이백 거리가 없으면 안내 없이 비운다 (지도는 이미 빽빽하다).
  const clubHintFor = (distance, slot) => {
    const allowed = clubIdsForSlot(slot);
    if (!recommendOn || !Array.isArray(bagClubs) || !allowed) return null;
    const rec = recommendClubs(bagClubs, distance, allowed);
    if (!rec) return null;
    return { label: clubLabelOf(rec.primary.club, rec.primary.subClub), range: reachText(rec.primary), text: fitText(rec), fit: rec.fit };
  };

  // 직전 샷 거리를 보여줄 기준 지점. 벌타 홀에서 멈춘 자리가 불확실한 샷(티샷 →
  // OB티 등)은 거리를 보여주지 않는다 — 복기·클럽 통계와 같은 기준.
  const trustedPrevPoint = (slot) => (shotDistanceTrusted(playerScore, hole.par, slot) ? (gpsPoints[slot] || null) : null);

  // GPS 측위는 누른 뒤 최대 6초 걸려 결과가 비동기로 도착한다. 그 사이 사용자는 온그린·
  // 랜딩 방향 같은 다른 입력을 이어서 하는데, 결과를 누른 시점의 화면(playerScore)에
  // 펼쳐 저장하면 측위가 끝나는 순간 그 입력이 되돌려져 사라진다 (파5 써드샷 뒤 그린
  // 랜딩 방향이 기록되지 않던 문제). 그래서 지점 기록은 '지금'의 라운드에 반영하되,
  // 대상 홀·선수는 누른 시점 것으로 고정한다 — 측위 중 홀을 넘겨도 엉뚱한 홀에 쓰지 않는다.
  const latestRoundRef = useRef(round);
  useEffect(() => { latestRoundRef.current = round; });

  const patchGpsLatest = (targetHole, player, makePatch) => {
    const r = latestRoundRef.current;
    const h = r.holes[targetHole];
    const s = h?.scores?.[player];
    if (!s) return;
    const holes = [...r.holes];
    holes[targetHole] = { ...h, scores: { ...h.scores, [player]: { ...s, ...makePatch(s) } } };
    const updated = { ...r, holes };
    latestRoundRef.current = updated;   // 같은 틱에 연달아 도착해도 서로 덮어쓰지 않게
    onUpdate(updated);
  };

  const setGpsPoint = (slot, fix) => {
    patchGpsLatest(holeIdx, activePlayer, (s) => {
      const next = [...(s.gpsPoints || [])];
      while (next.length <= slot) next.push(null);
      next[slot] = fix;
      return { gpsPoints: next };
    });
  };

  const setGpsGreen = (fix) => patchGpsLatest(holeIdx, activePlayer, () => ({ gpsGreen: fix }));

  // 0=티샷, 1=세컨샷, 2 이상은 익스트라샷 이름에서 괄호 표기를 뗀 것.
  const shotLabel = (slot) =>
    titleShifted(playerScore, slot) ? shotTitle(playerScore, slot)
      : slot === 0 ? '티샷'
        : slot === 1 ? '세컨샷'
          : (EXTRA_SHOT_NAMES[slot - 2]?.replace(/\s*\(.*\)\s*$/, '') ?? `${slot + 1}번째 샷`);

  // 마지막 지점 이름: 홀인원·칩인은 볼이 그린에 멈추지 않고 홀에 들어간다.
  const finalPointLabel = isHoledOut(playerScore) ? '홀인 지점' : '그린 랜딩 지점';

  // 지점은 순서대로만 찍는다. 직전 지점이 없으면 거리가 계산되지 않아 기록해도
  // 의미가 없다. 원온(파3 GIR·파4/5 teeGIR)과 홀인원이면 fieldShots가 1이라
  // 그린(=마지막) 지점의 직전이 곧 티샷이 되어, 세컨샷을 거치지 않고 바로 열린다.
  const gpsLocked = (slot) => {
    if (slot <= 0 || gpsPoints[slot - 1]) return false;
    // 그린 랜딩 슬롯(마지막)은 GIR/온그린이 확정된 경우 이전 GPS 없이도 찍을 수 있게 완화.
    // 파5 세컨온, 파3 세컨온, 써드/포쓰샷 온그린 모두 해당.
    if (slot === fieldShots) {
      const lastExtraOnGreen = extraShots.length > 0 && extraShots[extraShots.length - 1]?.onGreen === true;
      const secondOnGreen = extraShots.length === 0 && (
        (hole.par > 3 && playerScore.gir === true) ||
        (hole.par === 3 && playerScore.onGreen === true)
      );
      if (lastExtraOnGreen || secondOnGreen) return false;
    }
    return true;
  };
  const gpsLockHint = (slot) => `${shotLabel(slot - 1)} 지점을 먼저 찍어주세요`;

  // extraFields: 같은 클릭 안에서 함께 반영할 다른 필드(예: gir/onGreen).
  // updateField를 별도로 또 호출하면 이전 playerScore를 다시 읽어와 그 값을 덮어써 버리므로 한 번에 합쳐서 반영한다.
  // 세컨샷 남은 거리 시작값. 파3의 세컨샷은 그린을 놓친 뒤의 어프로치라
  // 보통 10~30m — 150m에서 시작하면 화면 폭보다 길게 밀어야 한다.
  const defaultRemaining = hole.par === 3 ? 20 : 150;

  // 익스트라샷 남은 거리 슬라이더의 출발값 — 직전 샷 남은 거리의 절반.
  // 직전 샷도 미입력이면 그 출발값을 기준으로 이어서 줄인다. (저장은 하지 않는다)
  const extraStartDistance = (k) => {
    const prev = k === 0
      ? (playerScore.remainingDistance ?? defaultRemaining)
      : (extraShots[k - 1]?.remainingDistance ?? extraStartDistance(k - 1));
    return Math.max(1, Math.ceil(prev / 2));
  };

  const addExtraShot = (extraFields = {}) => {
    const newIdx = extraShots.length;
    updateFields({
      extraShots: [...extraShots, { club: null, subClub: null, lie: [], surface: null, remainingDistance: null, windDirection: null, windStrength: null, onGreen: null }],
      ...extraFields,
    });
    setExpandedExtraShot(newIdx);
  };

  // slot번째 샷(1=세컨샷, 2 이상=익스트라샷)의 '그린 온 여부' 표시를 미입력으로 되돌린 필드.
  // 뒤에 이어지던 샷을 지웠는데 앞 샷에 '실패'가 눌린 채 남으면, 화면에는 실패인데 이어질
  // 샷이 없어 타수는 온그린으로 계산되는 모순이 된다. (파4·5 세컨샷은 gir도 같이 쓴다 —
  // 처음 상태인 gir=true·자동으로 돌려야 성공/실패 어느 쪽도 눌린 것으로 보이지 않는다.)
  const withResultCleared = (fields, extras, slot) => {
    if (slot === 1) {
      const ag = playerScore.strokesManual ? calculateGir(playerScore.strokes, playerScore.putts, hole.par, offGreenCount(playerScore)) : null;
      const second = hole.par === 3 ? { onGreen: null } : { onGreen: null, gir: ag ?? true, girAuto: true };
      return { fields: { ...fields, ...second }, extras };
    }
    return { fields, extras: extras.map((x, i) => (i === slot - 2 ? { ...x, onGreen: null } : x)) };
  };

  const removeExtraShot = (fromIdx) => {
    // 삭제한 샷의 GPS 지점도 함께 버린다. 남겨두면 나중에 같은 자리에 샷을 다시
    // 추가했을 때 지웠던 좌표가 "✓ 기록됨" 상태로 되살아난다.
    // (슬롯 0=티샷, 1=세컨샷이므로 익스트라샷 idx의 슬롯은 idx+2)
    let fields = { gpsPoints: gpsPoints.slice(0, fromIdx + 2) };
    let kept = extraShots.slice(0, fromIdx);
    // 바로 앞 샷의 '실패' 표시도 되돌린다. 앞 샷이 벌타로 그린에 못 간 것이면 그 결과가
    // 맞으므로 그대로 둔다.
    const prevSlot = fromIdx + 1;
    if (!penaltyAt(playerScore, prevSlot)) {
      const r = withResultCleared(fields, kept, prevSlot);
      fields = r.fields; kept = r.extras;
    }
    updateFields({ ...fields, extraShots: kept });
    setExpandedExtraShot(Math.max(0, fromIdx - 1));
    if (fromIdx === 0) setSecondShotExpanded(true);
  };

  const updateExtraShot = (idx, patch) =>
    updateField('extraShots', extraShots.map((s, i) => i === idx ? { ...s, ...patch } : s));

  // 지도에서 "샷 추가" — 스코어 폼의 온그린 실패와 같은 뜻이다. 지도만 보고
  // 라운드할 수 있어야 하는데, 그린을 못 올렸을 때 폼으로 돌아가야만 샷이
  // 늘어나던 것을 지도 안에서도 되게 한다.
  const addShotFromMap = () => {
    // 1온(파4·5 G)이나 파3 티샷 온그린으로 표시한 홀에서 '＋샷'은 그 표시가 틀렸다는
    // 뜻이다 — 표시를 풀어 세컨샷 자리를 연다. 익스트라샷을 붙이면 1온 계산에 가려
    // 화면에도 지도에도 나타나지 않고 기록에만 남았다.
    if (extraShots.length === 0 && hole.par > 3 && playerScore.teeGIR) {
      updateFields({ teeGIR: false });
      setStage('field');
      return;
    }
    if (extraShots.length === 0 && hole.par === 3 && par3TeeOnGreen(playerScore)) {
      updateFields({ teeOnGreen: false, gir: false, girAuto: false });
      setStage('field');
      return;
    }
    if (extraShots.length === 0) {
      // 파5 이상 세컨샷 뒤 샷 추가는 레이업이라 GIR 실패가 아니다 (폼의 '2온 실패'와 같게)
      addExtraShot(hole.par >= 5 ? {} : hole.par > 3 ? { gir: false, girAuto: false } : { onGreen: false });
      return;
    }
    const lastIdx = extraShots.length - 1;
    // 아직 아무것도 입력하지 않은 마지막 샷이 이미 있으면 그 샷이 곧 다음 샷이다 — 빈 샷을 또
    // 만들면 앞 샷이 '실패'로 바뀌고 타수만 늘어난다 (벌타·실패로 생긴 빈 샷에서 ＋샷을 연타한 경우).
    const lastShot = extraShots[lastIdx];
    if (!lastShot.club && lastShot.onGreen == null && !gpsPoints[lastIdx + 2]) {
      setExpandedExtraShot(lastIdx);
      return;
    }
    updateField('extraShots', [
      ...extraShots.map((s, i) => i === lastIdx ? { ...s, onGreen: false } : s),
      { club: null, subClub: null, lie: [], surface: null, remainingDistance: null,
        windDirection: null, windStrength: null, onGreen: null },
    ]);
    setExpandedExtraShot(extraShots.length);
  };

  // 잘못 눌렀을 때를 위한 되돌리기. 아무것도 입력되지 않은 마지막 샷만 지운다.
  const lastShotIsEmpty = extraShots.length > 0 && (() => {
    const last = extraShots[extraShots.length - 1];
    return !last.club && last.onGreen == null && !gpsPoints[extraShots.length + 1];
  })();
  // 앞 샷의 벌타(해저드·OB)가 만든 빈 샷이면 벌타까지 함께 되돌린다 — 샷만 지우면 '다음
  // 샷이 없는 벌타'가 남는다. (removeShotPenalty는 비어 있는 다음 샷과 지점도 같이 지운다)
  const undoLastShotFromMap = () => {
    const prevSlot = extraShots.length;   // 마지막 익스트라샷(slot len+1)의 바로 앞 샷
    if (penaltyAt(playerScore, prevSlot)) removeShotPenalty(prevSlot);
    else removeExtraShot(extraShots.length - 1);
  };

  const puttDetails = (() => {
    const raw = playerScore.puttDetails;
    return Array.from({ length: playerScore.putts || 0 }, (_, i) =>
      (raw && raw[i]) || (i === 0
        ? { distance: playerScore.puttDistance || sanitizeFirstPutt(firstPutt), aimDistance: playerScore.puttAimedDistance || playerScore.puttDistance || sanitizeFirstPutt(firstPutt) }
        : { distance: null, aimDistance: null })
    );
  })();

  // 그린 밖으로 나간 퍼트 뒤의 칩 (필드샷 탭에서 기록한다)
  const offGreenList = offGreenShots(playerScore);
  const offGreenPending = offGreenPendingAfter(playerScore);
  const offGreenDefaultOpen = (() => {
    const i = offGreenList.findIndex(r => r.onGreen == null);
    return i >= 0 ? i : offGreenList.length - 1;
  })();
  const puttVisibleCount = offGreenPending == null ? puttDetails.length : offGreenPending + 1;
  const offGreenClubText = (c) => {
    const base = OFF_GREEN_CLUBS.find(x => x.id === c.club)?.label;
    if (!base) return null;
    return c.subClub ? `${base} ${/^\d+$/.test(String(c.subClub)) ? c.subClub + '°' : c.subClub}` : base;
  };

  // 퍼팅 거리 슬라이더의 시작값. 첫 퍼팅은 5m, 이후는 직전 퍼팅 거리의 절반
  // (0.5m 단위, 최소 0.5m) — 5m를 놓치면 보통 그보다 훨씬 짧게 남는다.
  // 직전 퍼팅도 입력 전이면 그 시작값을 기준으로 이어서 줄인다.
  const puttDefaultDistance = (idx) => {
    if (idx <= 0) return sanitizeFirstPutt(firstPutt) ?? PUTT_START_M;
    const prev = puttDetails[idx - 1]?.distance ?? puttDefaultDistance(idx - 1);
    return Math.max(0.5, Math.round(prev / 2 / 0.5) * 0.5);
  };

  // 퍼팅 수로 고를 수 있는 최댓값.
  //   스코어 자동 계산 중(상세 입력 홀): 스코어가 퍼팅 수를 따라 바뀌므로 스코어로 막지 않는다.
  //   그 외: 스코어(총 타수)가 우선값이라 퍼팅 수는 스코어-1을 넘을 수 없다.
  const PUTTS_MAX = 12;
  const maxPuttsAllowed = autoScoreOn(playerScore) ? PUTTS_MAX : Math.max(0, (playerScore.strokes || 1) - 1);

  const updatePuttsCount = (n) => {
    const clamped = Math.min(n, maxPuttsAllowed);
    const newDetails = Array.from({ length: clamped }, (_, i) => puttDetails[i] || newPuttDetail(i, firstPutt));
    // GIR을 사용자가 직접 선택한 뒤에는(girAuto:false) 퍼팅 수 변경이 그 선택을 덮어쓰지 않는다.
    // 스코어 자동 계산 중이면 GIR은 홀을 확정할 때 샷 기록으로 다시 계산한다.
    const keptOffGreen = offGreenShots({ putts: clamped, puttDetails: newDetails, offGreen: playerScore.offGreen });
    const ag = !autoScoreOn(playerScore) && playerScore.girAuto !== false ? calculateGir(playerScore.strokes, clamped, hole.par, keptOffGreen.length) : null;
    const girFields = ag !== null ? { gir: ag, girAuto: true } : {};
    updateFields({ putts: clamped, puttDetails: newDetails, offGreen: keptOffGreen, puttsManual: true, puttsHeld: null, ...girFields });
  };

  // 위쪽 벌타 칸(홀 합계). 샷을 모르고 넣은 벌타는 OB티 기준으로 계산된다.
  // 합계를 샷별 벌타 수보다 줄이면 샷에 붙은 벌타도 마지막 것부터 함께 지운다.
  const updatePenalty = (field, newVal) => {
    let penalties = playerScore.penalties || [];
    let excess = penalties.filter(p => p.type === field).length - newVal;
    if (excess > 0) {
      penalties = [...penalties].reverse().filter(p => (excess > 0 && p.type === field ? (excess--, false) : true)).reverse();
    }
    const newScore = { ...playerScore, [field]: newVal, penalties };
    const hasPenalty = penaltyCount(newScore) > 0;
    // 벌타가 생기면 티샷이 그린에 한 번에 올라갔다는 표시(파4·5 1온, 파3 티샷 온그린)는 풀린다
    const extra = {};
    if (hasPenalty) {
      if (playerScore.teeGIR) extra.teeGIR = false;
      if (hole.par === 3 && par3TeeOnGreen(playerScore)) Object.assign(extra, { teeOnGreen: false, gir: false, girAuto: false });
    }
    // 직접 고친 스코어(벌타 포함 총 스코어)가 있으면 벌타 횟수만 기록하고 스코어는 그대로 둔다.
    if (playerScore.strokesManual) {
      updateFields({ [field]: newVal, penalties, ...extra });
      return;
    }
    const newStrokes = calcAutoStrokes({ ...newScore, ...extra }, hole.par);
    updateFields({ [field]: newVal, penalties, ...extra, strokes: newStrokes });
  };

  // ─── 샷별 벌타 ──────────────────────────────────────────────────────────────
  // 샷 결과에서 [OB]·[해저드]를 누르면 그 샷의 벌타로 기록한다 (penalties.js 참고).
  // 한 샷에는 벌타가 하나뿐이다. 위쪽 합계 칸도 함께 올린다.
  // 벌타가 난 샷은 그린에 가지 못한 것이므로 결과를 맞추고 다음 샷 자리를 연다.
  const emptyShot = () => ({ club: null, subClub: null, lie: [], surface: null, remainingDistance: null, windDirection: null, windStrength: null, onGreen: null });

  // extra: 벌타 기록에 덧붙일 것 — { reason }(왜 벌타가 났나)
  const addShotPenalty = (slot, type, mode = null, extra = {}) => {
    const old = penaltyAt(playerScore, slot);
    const rest = (playerScore.penalties || []).filter(p => p.slot !== slot);
    const counts = {
      ob: Math.max(0, (playerScore.ob || 0) - (old?.type === 'ob' ? 1 : 0)),
      hazard: Math.max(0, (playerScore.hazard || 0) - (old?.type === 'hazard' ? 1 : 0)),
      unplayable: Math.max(0, (playerScore.unplayable || 0) - (old?.type === 'unplayable' ? 1 : 0)),
    };
    // 위쪽 합계 칸에 이미 넣어 둔(어느 샷인지 모르는) 같은 벌타가 있으면 그것을 이 샷의
    // 벌타로 본다 — 위에서 OB +1을 누른 뒤 티샷 [OB]를 또 눌러도 두 번 세지 않게.
    const unclaimed = counts[type] - rest.filter(p => p.type === type).length;
    if (unclaimed <= 0) counts[type] += 1;
    // 스코어가 자동 계산 중이면 updateFields가 샷 기록으로 다시 계산한다. 직접 고친 스코어
    // (strokesManual)는 그대로 둔다 — 벌타를 기록해도 총 스코어를 바꾸지 않는다.
    const fields = { penalties: [...rest, { slot, type, mode, ...extra }], ...counts };
    if (slot === hole.par - 3 && playerScore.greenMiss) fields.greenMiss = null;   // 규정 타수로 그린을 노린 샷이 벌타면 방향 대신 벌타 이유를 쓴다
    if (slot === 0) {
      // 티샷 벌타 — 페어웨이 미적중, 1온·온그린 아님. 다음 샷(세컨샷 자리)은 늘 있다.
      if (hole.par > 3) Object.assign(fields, { fairway: false, teeGIR: false, ...autoSurfaceClear });
      else Object.assign(fields, { teeOnGreen: false, gir: false, girAuto: false });
    } else if (slot === 1) {
      // 세컨샷에서 벌타가 났다면 티샷은 그린에 못 올라간 것이다
      if (hole.par === 3 && par3TeeOnGreen(playerScore)) Object.assign(fields, { teeOnGreen: false, gir: false, girAuto: false });
      if (hole.par > 3 && playerScore.teeGIR) fields.teeGIR = false;
      if (extraShots.length === 0) {
        fields.extraShots = [emptyShot()];
        if (hole.par === 3) fields.onGreen = false;
        else { fields.onGreen = null; if (hole.par < 5) Object.assign(fields, { gir: false, girAuto: false }); }
      }
    } else {
      const k = slot - 2;
      const next = extraShots.map((x, i) => (i === k ? { ...x, onGreen: false } : x));
      if (k === extraShots.length - 1) next.push(emptyShot());
      fields.extraShots = next;
    }
    // 직전 샷 위치에서 다시 치기(OB·해저드·언플레이어블 공통) — 다시 친 샷은 직전 샷과 같은 자리에서 친다.
    // 그 자리를 찍어 뒀으면 옮겨 적는다.
    if (mode === 'replay' && gpsPoints[slot] && !gpsPoints[slot + 1]) {
      const pts = [...gpsPoints];
      while (pts.length <= slot + 1) pts.push(null);
      pts[slot + 1] = gpsPoints[slot];
      fields.gpsPoints = pts;
    }
    updateFields(fields);
    // 다음 샷으로 화면을 옮긴다
    if (slot === 0) { setStage('field'); setSecondShotExpanded(true); }
    else if (slot === 1) { setSecondShotExpanded(false); setExpandedExtraShot(0); }
    else setExpandedExtraShot(slot - 1);
  };

  const removeShotPenalty = (slot) => {
    const p = penaltyAt(playerScore, slot);
    if (!p) return;
    const fields = {
      penalties: (playerScore.penalties || []).filter(x => x.slot !== slot),
      [p.type]: Math.max(0, (playerScore[p.type] || 0) - 1),
    };
    // 벌타 때문에 만든 다음 샷이 아직 비어 있으면 함께 지운다 (잘못 누른 경우)
    const nextIdx = slot - 1;   // 다음 샷(slot+1)의 익스트라샷 번호
    const ns = slot >= 1 && nextIdx === extraShots.length - 1 ? extraShots[nextIdx] : null;
    if (ns && !ns.club && ns.onGreen == null && !gpsPoints[slot + 1]) {
      fields.gpsPoints = gpsPoints.slice(0, slot + 1);
      // 벌타 때문에 '그린 못 감'이던 이 샷의 결과도 되돌린다 (이어질 샷이 사라지므로)
      const r = slot >= 1
        ? withResultCleared(fields, extraShots.slice(0, nextIdx), slot)
        : { fields, extras: extraShots.slice(0, nextIdx) };
      Object.assign(fields, r.fields);
      fields.extraShots = r.extras;
    }
    updateFields(fields);
  };

  // 벌타 처리 방법 선택 창의 선택지 — 규칙집(Rules of Golf)의 구제 방식 이름을 영문과 함께 그대로 보여주고,
  // 벌타 뒤 다음 샷이 몇 번째 샷인지(next)를 크게 강조한다.
  //   OB: 스트로크와 거리 구제(18.2, 1벌타) / OB티(국내 관행, 2벌타 상당)
  //   해저드(17.1d): 후방선·측면(레드만)·스트로크와 거리 구제, 해저드 티(드롭존, 로컬룰) — 모두 1벌타
  //   언플레이어블(19.2): 후방선·측면·스트로크와 거리 구제 — 모두 1벌타
  const penaltyOptions = (slot, type) => {
    const n = strokeNumberOf(playerScore, slot);   // 벌타가 난 샷이 몇 타째인지
    const next1 = n + 2;                           // +1벌타 뒤 다음 샷의 타수
    const opt = (mode, ko, en, rule, penalty, where, next, tag = null) => ({ mode, ko, en, rule, penalty, where, next, tag });
    const replayWhere = '직전 샷 위치에서 다시 치기 · 다시 친 샷의 클럽·위치도 기록';
    if (type === 'ob') {
      return [
        opt('replay', '스트로크와 거리 구제', 'Stroke-and-Distance Relief', 'Rule 18.2', '1벌타', replayWhere, next1),
        opt('forward', 'OB티', 'OB Tee · Local Rule', '국내 골프장 관행', '2벌타 상당',
          slot === 0 ? '지정된 특설티에서 치기' : '지정된 특설티에서 치기 (없으면 OB 지점 근처 드롭)', n + 3),
      ];
    }
    if (type === 'hazard') {
      return [
        opt('back', '후방선 구제', 'Back-on-the-Line Relief', 'Rule 17.1d(2)', '1벌타',
          '홀과 볼이 경계를 마지막으로 넘은 지점을 잇는 선 뒤쪽 · 거리 제한 없음', next1),
        opt('lateral', '측면 구제', 'Lateral Relief', 'Rule 17.1d(3)', '1벌타',
          '볼이 경계를 마지막으로 넘은 지점에서 2클럽 이내 · 홀에 가깝지 않게', next1, '레드만'),
        opt('replay', '스트로크와 거리 구제', 'Stroke-and-Distance Relief', 'Rule 17.1d(1)', '1벌타', replayWhere, next1),
        opt('tee', '해저드 티', 'Drop Zone', '코스 로컬룰', '1벌타',
          '코스에 해저드 티(드롭존)가 있을 때 그곳에서 치기', next1),
      ];
    }
    return [
      opt('back', '후방선 구제', 'Back-on-the-Line Relief', 'Rule 19.2b', '1벌타',
        '볼 자리와 홀을 잇는 선 뒤쪽 · 거리 제한 없음', next1),
      opt('lateral', '측면 구제', 'Lateral Relief', 'Rule 19.2c', '1벌타',
        '볼 자리에서 2클럽 이내 · 홀에 가깝지 않게', next1),
      opt('replay', '스트로크와 거리 구제', 'Stroke-and-Distance Relief', 'Rule 19.2a', '1벌타', replayWhere, next1),
    ];
  };

  const choosePenaltyMode = (mode) => {
    const c = penaltyChoice;
    setPenaltyChoice(null);
    if (c) addShotPenalty(c.slot, c.type, mode, c.reason ? { reason: c.reason } : {});
  };

  // 이미 기록한 벌타의 이유를 바꾼다 (같은 이유를 다시 누르면 비운다)
  const setPenaltyReason = (slot, reason) => {
    const list = (playerScore.penalties || []).map((p) => {
      if (p.slot !== slot) return p;
      const { reason: old, ...rest } = p;
      return old === reason ? rest : { ...rest, reason };
    });
    updateFields({ penalties: list });
  };

  // [OB]·[해저드]·[언플레이어블] 버튼 한 줄. 누르면 처리 방법(OB티·드롭·다시 치기 …)을 고른 뒤 기록한다.
  const penaltyRow = (slot) => {
    const p = penaltyAt(playerScore, slot);
    const chip = (active) => ({
      flex: active ? 2.2 : 1, minWidth: 'min-content', minHeight: 44, padding: '9px 4px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',   // min-content: 가장 긴 단어(언플레이어블)가 글자 중간에서 꺾이지 않게
      fontSize: 14, fontWeight: 700, lineHeight: 1.25, whiteSpace: 'normal', wordBreak: 'keep-all',
      border: `1.5px solid ${active ? '#c8323a' : '#d1d6db'}`,
      background: active ? 'rgba(200,50,58,0.14)' : '#e8ebee',
      color: active ? '#c8323a' : '#4e5968',
    });
    return (
      <>
      <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 16px 10px', borderBottom: p && asksReason(p.type) ? 'none' : '1px solid #e5e8eb' }}>
        <span style={{ ...fLbl, minWidth: 32 }}>벌타</span>
        {['ob', 'hazard', 'unplayable'].map((type) => {
          const active = p?.type === type;
          const mode = active ? penaltyModeLabel(p, slot) : null;
          return (
            <button key={type} style={chip(active)}
              onClick={() => (active ? removeShotPenalty(slot) : setPenaltyChoice({ slot, type, reason: null }))}>
              {active ? `${PENALTY_LABEL[type]}${mode ? ` · ${mode}` : ''} ✕` : PENALTY_LABEL[type]}
            </button>
          );
        })}
      </div>
      {/* 왜 벌타가 났나 — 거리 미스 · 방향 미스 · 생크. 선택 입력이라 안 눌러도 된다 */}
      {p && asksReason(p.type) && (
        <div data-role={`penalty-reason-${slot}`} style={{ display:'flex', alignItems:'center', gap:6, padding:'0 16px 10px', borderBottom:'1px solid #e5e8eb' }}>
          <span style={{ ...fLbl, minWidth: 32 }}>이유</span>
          {PENALTY_REASONS.map((r) => (
            <button key={r.id} type="button" aria-pressed={p.reason === r.id} data-role={`penalty-reason-${slot}-${r.id}`}
              style={{ ...fChip, flex:1, textAlign:'center', padding:'9px 4px', fontSize:14, borderRadius:8, ...(p.reason === r.id ? fChipOn : {}) }}
              onClick={() => setPenaltyReason(slot, r.id)}>{r.label}</button>
          ))}
        </div>
      )}
      </>
    );
  };

  // ─── 퍼트 입력: 라이 · 거리 · 미스 위치 판 · 다음 퍼트 ───────────────────────────────────
  // 퍼트 한 번은 puttDetails[i] 에 쌓인다 (모양은 engine/puttMiss.js 머리말). 판에서 멈춘 곳을 찍으면 다음 퍼트의
  // 거리와 판 방향이 거기서 이어지고, 판에 찍지 않아도 예전처럼 거리 · 라이 · 결과만으로 기록할 수 있다.
  const omitKeys = (obj, keys) => Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k)));
  const mapPutt = (idx, fn) => puttDetails.map((p, i) => (i === idx ? fn(p) : p));
  const puttFrame = (idx) => puttDetails[idx]?.frame ?? DEFAULT_FRAME;
  const prevStopsOf = (idx) => puttDetails.slice(0, idx).map((p, k) => (p.miss ? { n: k + 1, gx: p.miss.gx, gy: p.miss.gy } : null)).filter(Boolean);

  // 직전 퍼트가 멈춘 곳으로 다음 퍼트의 거리와 판 방향을 맞춘다. 다음 퍼트에 이미 판을 찍었으면(방향이 달라지면 기록이 어긋난다)
  // 손대지 않고, 사용자가 직접 입력한 거리는 방향만 맞춘다.
  const chainNextPutt = (details, idx) => {
    const nxt = details[idx + 1];
    const m = details[idx]?.miss;
    if (!nxt || nxt.miss) return details;
    const auto = nxt.distance == null || nxt.distanceAuto === true;
    const patched = m
      ? { ...nxt, frame: nextFrame({ x: m.gx, y: m.gy }), ...(auto ? { distance: m.leave, aimDistance: m.leave, distanceAuto: true } : {}) }
      : (nxt.distanceAuto === true ? { ...omitKeys(nxt, ['frame', 'distanceAuto']), distance: null, aimDistance: null } : omitKeys(nxt, ['frame']));
    return details.map((p, i) => (i === idx + 1 ? patched : p));
  };

  const placeMiss = (idx, miss) => {
    const details = mapPutt(idx, (p) => (miss ? { ...p, miss } : omitKeys(p, ['miss'])));
    updateField('puttDetails', chainNextPutt(details, idx));
  };

  const setPuttDistance = (idx, v) =>
    updateField('puttDetails', mapPutt(idx, (p) => ({ ...omitKeys(p, ['distanceAuto']), distance: v, aimDistance: v })));

  // 라이는 칸 하나를 눌러 고른다 (기본 9개 + 복합 6개). 찍어 둔 위치가 있으면 새 라이로 사이드를 다시 계산한다. null 이면 비운다.
  const pickPuttLie = (idx, lieId) =>
    updateField('puttDetails', mapPutt(idx, (p) => ({
      ...p, lie: lieId ?? [],
      ...(p.miss ? { miss: refreshMiss(p.miss, { brk: lieShape(lieId), frame: puttFrame(idx) }) } : {}),
    })));

  // 퍼트가 들어가 홀이 끝난다 — 퍼팅 수 = puttsUsed. 점수 이름 안내 창을 거쳐 다음 홀(마지막 홀이면 라운드 끝)로 간다.
  const finishHoleIn = (puttsUsed, newDetails) => {
    if (holeInModalPendingRef.current) return;
    holeInModalPendingRef.current = true;
    // 직접 고친 스코어가 있으면 그 값이 우선 (퍼팅 수만 기록하고 타수는 유지)
    const manual = !!playerScore.strokesManual;
    // 홀인한 퍼트 뒤에는 칩이 있을 수 없다
    const keptOffGreen = offGreenShots({ putts: puttsUsed, puttDetails: newDetails, offGreen: playerScore.offGreen });
    const freshStrokes = manual ? playerScore.strokes : calcAutoStrokes({ ...playerScore, putts: puttsUsed, puttDetails: newDetails, offGreen: keptOffGreen }, hole.par);
    const freshScore = { ...playerScore, putts: puttsUsed, strokes: freshStrokes, puttDetails: newDetails, offGreen: keptOffGreen, touched: true, strokesManual: manual };
    holeInCbRef.current = () => {
      if (isLastHole) {
        const u = { ...round }; u.holes = [...round.holes];
        const lh = u.holes[holeIdx]; const us = {};
        round.players.forEach(p => {
          const s = p === activePlayer ? freshScore : lh.scores[p];
          us[p] = finalizeScore(s, lh.par);
        });
        u.holes[holeIdx] = { ...lh, scores: us }; onUpdate(u); requestFinish(u);
      } else {
        confirmAndGoToHole(holeIdx + 1, freshScore);
      }
    };
    openHoleInModal({
      isLastHole,
      scoreName: getScoreName(freshStrokes, hole.par),
      strokes: freshStrokes,
      putts: puttsUsed,
      onCount: freshStrokes - puttsUsed - keptOffGreen.length,
    });
  };

  // 이 퍼트가 들어갔다 (홀인 성공). 판에 찍어 둔 위치가 있었다면 잘못 찍은 것이므로 지운다.
  const holeOutAt = (puttIdx) => {
    const details = Array.from({ length: puttIdx + 1 }, (_, i) =>
      i === puttIdx ? { ...omitKeys(puttDetails[i], ['miss']), holein: 'success' } : (puttDetails[i] || newPuttDetail(i, firstPutt)));
    finishHoleIn(puttIdx + 1, details);
  };

  // 탭인 — 판에 찍은 자리가 1m 안이면 이 퍼트는 실패, 다음 퍼트는 거기서 평지 직선으로 넣은 것으로 한 번에 기록한다
  const tapInAt = (puttIdx) => {
    const miss = puttDetails[puttIdx]?.miss;
    if (!miss || miss.leave > TAP_IN_MAX_M) return;
    const tap = { distance: miss.leave, aimDistance: miss.leave, distanceAuto: true, lie: 'flat', frame: nextFrame({ x: miss.gx, y: miss.gy }), holein: 'success', tapIn: true };
    const details = Array.from({ length: puttIdx + 2 }, (_, i) =>
      i === puttIdx ? { ...puttDetails[i], holein: 'fail' } : i === puttIdx + 1 ? tap : (puttDetails[i] || newPuttDetail(i, firstPutt)));
    finishHoleIn(puttIdx + 2, details);
  };

  // 이 퍼트는 들어가지 않았다 → 다음 퍼트로. 멈춘 곳을 찍어 뒀다면 다음 퍼트 거리와 판 방향이 거기서 이어진다.
  const goNextPutt = (puttIdx) => {
    if (puttDetails[puttIdx]?.holein === 'offgreen') {            // 그린 밖으로 나간 퍼트는 칩 카드에서 이어 간다
      const nextCard = Math.min(puttIdx + 1, puttDetails.length - 1);
      setExpandedPutt(nextCard);
      scrollToStep(`putt-card-${nextCard}`);
      return;
    }
    const newPutts = Math.max(playerScore.putts || 0, puttIdx + 2);
    const base = Array.from({ length: newPutts }, (_, i) =>
      i === puttIdx ? { ...puttDetails[i], holein: 'fail' } : (puttDetails[i] || newPuttDetail(i, firstPutt)));
    const details = chainNextPutt(base, puttIdx);
    updateFields({ putts: newPutts, puttDetails: details, offGreen: offGreenShots({ putts: newPutts, puttDetails: details, offGreen: playerScore.offGreen }) });
    setExpandedPutt(puttIdx + 1);
    scrollToStep(`putt-card-${puttIdx + 1}`);
  };

  // 되돌리기 — 이 퍼트를 없애고 앞 퍼트를 다시 입력 중으로 연다 (찍어 둔 위치는 그대로 남아 끌어서 고칠 수 있다)
  const undoPutt = (puttIdx) => {
    if (puttIdx < 1 || puttDetails[puttIdx - 1]?.holein === 'offgreen') return;
    const details = puttDetails.slice(0, puttIdx).map((p, i) => (i === puttIdx - 1 ? { ...p, holein: null } : p));
    updateFields({ putts: puttIdx, puttDetails: details, offGreen: offGreenShots({ putts: puttIdx, puttDetails: details, offGreen: playerScore.offGreen }) });
    setExpandedPutt(puttIdx - 1);
  };

  // ─── 그린 밖으로 나간 퍼트 뒤의 칩 ───────────────────────────────────────────
  // 퍼트가 그린 밖으로 나가면 그 퍼트는 퍼팅 1타, 다시 올리는 칩은 퍼팅이 아닌 필드샷 1타다.
  // 칩은 필드샷 탭에서 클럽과 온그린 결과를 받는다 (온그린 → 퍼팅 탭, 실패 → 다시 칩,
  // 칩인 → 홀 끝). 퍼팅 탭에는 요약만 남는다. (engine/offGreen.js 참고)
  const markOffGreen = (puttIdx) => {
    const current = playerScore.putts || 0;
    const others = offGreenList.filter(r => r.after !== puttIdx);
    if (offGreenChain(playerScore, puttIdx).length > 0) {
      // 이미 그린 밖으로 표시한 퍼트를 다시 누르면 되돌린다
      const details = puttDetails.map((p, i) => i === puttIdx ? { ...p, holein: puttIdx < current - 1 ? 'fail' : null } : p);
      updateFields({ puttDetails: details, offGreen: others });
      return;
    }
    // 칩이 올라간 뒤 칠 퍼트가 하나 더 있어야 하므로 퍼팅 칸을 하나 늘려 둔다
    const newPutts = Math.max(current, puttIdx + 2);
    const newDetails = Array.from({ length: newPutts }, (_, i) =>
      i === puttIdx ? { ...puttDetails[i], holein: 'offgreen' } : (puttDetails[i] || newPuttDetail(i, firstPutt))
    );
    const list = offGreenShots({ putts: newPutts, puttDetails: newDetails, offGreen: [...others, emptyOffGreenShot(puttIdx)] });
    updateFields({ putts: newPutts, puttDetails: newDetails, offGreen: list });
    // 다음에 칠 샷은 칩 — 필드샷 탭에서 그 칩을 입력한다
    setStage('field');
    setExpandedOffGreen(list.findIndex(r => r.after === puttIdx));
    setTimeout(() => offGreenTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 160);
  };

  const openOffGreenCard = (idx) => {
    setStage('field');
    setExpandedOffGreen(idx);
    setTimeout(() => offGreenTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 160);
  };

  const updateOffGreenShot = (idx, patch) =>
    updateField('offGreen', offGreenList.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  // 온그린 성공 → 퍼팅 탭에서 이 칩 뒤의 퍼트를 기록한다
  const offGreenLanded = (idx) => {
    const target = offGreenList[idx];
    // 이 칩이 그린에 올라갔으면 같은 퍼트 뒤의 다음 칩은 있을 수 없다 ('실패'를 잘못 눌러 생긴 칩 정리)
    const list = offGreenList
      .filter((r, i) => !(r.after === target.after && i > idx))
      .map((r, i) => (i === idx ? { ...r, onGreen: true } : r));
    updateField('offGreen', list);
    setExpandedPutt(target.after + 1);
    setStage('putt');
  };

  // 온그린 실패 → 같은 자리에서 다시 칩
  const offGreenMissed = (idx) => {
    const target = offGreenList[idx];
    const marked = offGreenList.map((r, i) => (i === idx ? { ...r, onGreen: false } : r));
    const next = offGreenList[idx + 1];
    if (next && next.after === target.after) {           // 뒤에 이미 칩이 있으면 그게 후속타다
      updateField('offGreen', marked);
      setExpandedOffGreen(idx + 1);
      return;
    }
    const list = [...marked.slice(0, idx + 1), emptyOffGreenShot(target.after), ...marked.slice(idx + 1)];
    updateField('offGreen', list);
    setExpandedOffGreen(idx + 1);
  };

  // 칩인 → 그 퍼트까지가 퍼팅이고 홀이 끝난다
  const offGreenHoledAt = (idx) => {
    if (holeInModalPendingRef.current) return;
    const target = offGreenList[idx];
    const puttsUsed = target.after + 1;
    const details = puttDetails.slice(0, puttsUsed);
    const chain = offGreenList
      .filter((r, i) => r.after < target.after || (r.after === target.after && i <= idx))
      .map((r) => (r === target ? { ...r, onGreen: 'chip-in' } : r));
    const base = { ...playerScore, putts: puttsUsed, puttDetails: details, offGreen: chain };
    const kept = offGreenShots(base);
    const manual = !!playerScore.strokesManual;
    const freshStrokes = manual ? playerScore.strokes : calcAutoStrokes({ ...base, offGreen: kept }, hole.par);
    triggerChipIn(
      { ...base, offGreen: kept, strokes: freshStrokes, touched: true, strokesManual: manual },
      { putts: puttsUsed, onCount: freshStrokes - puttsUsed - kept.length },
    );
  };

  // 이 칩과 그 뒤에 이어진 칩을 지운다. 그 퍼트의 첫 칩이면 '그린 밖' 표시도 함께 풀린다.
  const removeOffGreenShot = (idx) => {
    const target = offGreenList[idx];
    if (offGreenList.findIndex(r => r.after === target.after) === idx) { markOffGreen(target.after); return; }
    const prev = offGreenList[idx - 1];
    const list = offGreenList
      .filter((r, i) => !(r.after === target.after && i >= idx))
      .map((r) => (r === prev ? { ...r, onGreen: null } : r));
    updateField('offGreen', list);
    setExpandedOffGreen(idx - 1);
  };

  const updatePlayerStrokes = (player, newStrokes) => {
    const updated = { ...round };
    updated.holes = [...round.holes];
    const ps = hole.scores[player];
    const inf = inferStatsFromStrokes(newStrokes, hole.par);
    updated.holes[holeIdx] = { ...hole, scores: { ...hole.scores, [player]: { ...ps, strokes: newStrokes, putts: inf.putts, gir: inf.gir, girAuto: true, touched: true } } };
    onUpdate(updated);
  };

  // lie 미입력은 세 가지 형태로 들어온다: 새로 만든 퍼팅 슬롯은 [], 라디얼에서
  // 선택을 해제하면 null, 과거 데이터는 ''. 빈 배열을 입력된 값으로 오판하면
  // 새로 늘어난 퍼팅이 "미입력"으로 잡히지 않아 자동으로 펼쳐지지 않는다.
  // 홀인 성공/실패를 누른 퍼트도 입력된 것이다 — 거리 없이 '실패'만 눌러 다음 퍼트가 생겼을 때
  // 첫 퍼트를 '빈 퍼트'로 보면 열린 카드가 PUTT 1로 되돌아가 잘못된 퍼트에 홀인을 누르게 된다.
  // 직전 퍼트가 멈춘 곳에서 자동으로 넣은 거리(distanceAuto)는 사용자가 입력한 게 아니라서 빈 퍼트로 본다.
  // 첫 퍼팅 기본 거리(설정)도 마찬가지다 — 첫 퍼트에 그 값만 들어 있고 라이·결과가 없으면 아직 입력 전이다.
  // (이걸 입력한 것으로 보면 온그린 직후 PUTT 1 을 건너뛰고 PUTT 2 가 열린다.)
  const seededFirstPutt = sanitizeFirstPutt(firstPutt);
  const isPuttEmpty = (p, i) => {
    const onlySeeded = i === 0 && seededFirstPutt != null && p.distance === seededFirstPutt && (p.aimDistance == null || p.aimDistance === seededFirstPutt);
    return p.holein == null && (p.distance == null || p.distanceAuto === true || onlySeeded) && (p.aimDistance == null || p.distanceAuto === true || onlySeeded) && p.miss == null &&
      (p.lie == null || p.lie === '' || (Array.isArray(p.lie) && p.lie.length === 0));
  };

  // 아래 세 덩어리는 이펙트에서 setState 하지 않고, 값이 바뀐 그 렌더에서 바로 상태를 맞춘다
  // (처음 그릴 때도 한 번 맞추려고 null 에서 시작한다). 순서는 위에서부터 차례로 적용된다.

  // 홀이 바뀌거나 퍼트 수가 달라지면 아직 입력 안 한 첫 퍼트 카드를 연다
  const puttSyncKey = `${holeIdx}:${puttDetails.length}`;
  const [syncedPuttKey, setSyncedPuttKey] = useState(null);
  if (syncedPuttKey !== puttSyncKey) {
    setSyncedPuttKey(puttSyncKey);
    const firstEmpty = puttDetails.findIndex(isPuttEmpty);
    setExpandedPutt(firstEmpty >= 0 ? firstEmpty : 0);
  }

  // 홀이 바뀌면 펼침·탭 상태를 처음으로 되돌린다. 열어 볼 탭은 입력이 어디까지 됐는지로 정한다:
  // 티샷이 아직이면 티샷, 볼이 그린에 올라 있으면 퍼팅, 아니면 필드샷.
  const [syncedHoleIdx, setSyncedHoleIdx] = useState(null);
  if (syncedHoleIdx !== holeIdx) {
    setSyncedHoleIdx(holeIdx);
    setStage(!teeReady ? 'tee' : ballOnGreen ? 'putt' : 'field');
    setSecondShotExpanded(true); setExpandedExtraShot(0); setExpandedOffGreen(null); setShowPuttsDropdown(false);
  }

  // ref 는 렌더 중에 건드릴 수 없어 이펙트에 남긴다
  useEffect(() => {
    prevExtraShotsLenRef.current = 0;
  }, [holeIdx]);

  // 직전 렌더의 홀·탭. 홀을 옮겨 올 때 어느 탭에서 왔는지 아래 스크롤 판단에 쓴다.
  const lastViewRef = useRef({ hole: holeIdx, stage });
  useEffect(() => {
    // 다른 홀로 옮겨 왔는데 직전 화면이 필드샷 탭이 아니었다면(예: 퍼팅 탭) 이미 있던 추가 샷으로는 스크롤하지 않는다
    const fromOtherTab = lastViewRef.current.hole !== holeIdx && lastViewRef.current.stage !== 'field';
    if (extraShots.length > prevExtraShotsLenRef.current && extraShotTopRef.current && !fromOtherTab) {
      setTimeout(() => extraShotTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    }
    prevExtraShotsLenRef.current = extraShots.length;
  // holeIdx 를 deps 에 넣으면 홀을 옮길 때마다 다시 돌아 스크롤 시점이 달라진다 — 추가 샷 수가 바뀔 때만 본다
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraShots.length]);
  useEffect(() => { lastViewRef.current = { hole: holeIdx, stage }; });

  // 화면을 열었을 때와 퍼팅 단계로 넘어왔을 때 입력할 자리가 처음 화면 안에 있게 한다.
  //  · 처음 열었을 때(새 라운드 · 이어서): 맨 위는 스코어보드라, 탭 행이 맨 위에 오게 내린다. 퍼팅 단계라면 아래 둘 중 하나로.
  //  · 퍼팅 단계로 넘어왔을 때(탭 · 샷 결과 버튼): 아직 비어 있는 첫 칸으로 간다 — 핀 위치(파4 이상) → 온그린 랜딩 방향 → PUTT 카드.
  //    핀 위치를 고르면 랜딩 휠로, 휠을 고르면 PUTT 카드로 내려간다 (각 onChange → scrollToStep / scrollToPutting).
  //    파3 은 핀 위치를 티샷 탭에서 받으므로 랜딩 휠부터. 그린 스피드는 위로 올리면 있다.
  // 홀을 옮길 때의 스크롤은 confirmAndGoToHole(scrollToTabs)이 맡는다.
  const landingEmptyRef = useRef(false);
  useEffect(() => { landingEmptyRef.current = !playerScore.onGreenLanding; });
  const pinEmptyRef = useRef(false);
  useEffect(() => {
    const pin = Array.isArray(playerScore.pinPosition) ? playerScore.pinPosition[0] : playerScore.pinPosition;
    pinEmptyRef.current = hole.par > 3 && !pin;
  });
  const prevStageRef = useRef(null);
  useEffect(() => {
    const was = prevStageRef.current;
    prevStageRef.current = stage;
    const first = was === null;
    const toPutt = stage === 'putt' && (first || was !== 'putt');
    if (!toPutt && !first) return;
    // 타이머는 되돌리지 않는다 — 개발 모드의 StrictMode 가 효과를 두 번 돌려도 첫 스크롤이 사라지지 않게
    setTimeout(() => {
      const el = toPutt
        ? ((pinEmptyRef.current && pinTopRef.current) || (landingEmptyRef.current && landingTopRef.current) || puttTopRef.current)
        : tabsTopRef.current;
      el?.scrollIntoView?.({ behavior: first ? 'auto' : 'smooth', block: 'start' });
    }, 80);
  }, [stage]);

  // 티샷 입력을 선택 항목까지 모두 마치면 다음 탭으로 넘어간다 (볼이 이미 그린이면 퍼팅, 아니면 필드샷).
  // 꼭 받는 항목(클럽 등)이 비면 티샷 탭으로 되돌린다. 선택 항목만 비는 건 되돌리지 않는다 — 필드샷에서 지형을 지우다가
  // 티샷 탭으로 끌려 가면 안 된다.
  const [syncedTeeComplete, setSyncedTeeComplete] = useState(null);
  if (syncedTeeComplete !== teeComplete) {
    setSyncedTeeComplete(teeComplete);
    if (teeComplete) setStage(ballOnGreen ? 'putt' : 'field');
    else if (!teeReady) setStage('tee');
  }
  // 티샷 필수 항목(클럽 등)이 비어 있는 동안 필드샷·퍼팅 탭은 잠겨 있다 — 다른 버튼이 탭을 바꿔도(예: 클럽 없이 코스맵의 "＋ 샷")
  // 잠긴 탭의 내용을 보여 주지 않고 티샷 탭에 둔다. 몽키 테스트(파3)에서 잠긴 필드샷 탭이 열린 채로 보인 일이 있었다.
  if (!teeReady && stage !== 'tee') setStage('tee');

  // 미입력 홀 확인 모달에 보여 줄 홀 번호들
  const pendingMissing = pendingFinish ? untouchedHoles(pendingFinish) : [];

  // '다음'/'완료' 확인 창 — 샷 정보가 비었는지 · 퍼팅 수를 모르는지에 따라 제목과 버튼이 달라진다
  const checkInfo = infoGaps.length > 0;
  const checkPutts = scorePending(playerScore);
  const checkTitle = checkInfo && checkPutts ? '확인할 게 있어요' : checkPutts ? '퍼팅을 몇 번 했나요?' : '샷 정보가 비어 있어요';

  return (
    <div style={styles.container}>
      {/* Header — 홈 · 코스 이름 · 코스맵 · 메모 · 라운드 수정
          왼쪽은 누르면 바로 홈으로 가는 버튼이다 (기록은 저장돼 있어 홈의 "이어서"로 같은 홀에 돌아온다).
          예전엔 뒤로(<) → 확인 창 → "기록 유지하고 홈으로" 두 번을 눌러야 했다 (2026-11-12 사용자 요청).
          라운드 삭제 · 세팅 다시하기는 실수로 누르지 않게 라운드 수정(연필) 창 맨 아래 "라운드 그만두기"로 옮겼다. */}
      <header style={{ ...styles.scoringHeader, padding: '4px 0 8px' }}>
        <button data-role="go-home" style={{ ...styles.iconBack, background: 'transparent', border: 'none', color: '#191f28', flexShrink: 0 }} onClick={onGoHome} aria-label="홈"><Home size={23} strokeWidth={2} /></button>
        <div style={{ ...styles.scoringCourse, fontSize: 16 }} title={round.courseName}>{round.courseName}</div>
        {(() => {
          const mapUsed = gpsPoints.some(Boolean) || !!gpsGreen;
          return (
            <button data-role="map-button" style={HDR_BTN} onClick={() => setShowHoleMap(true)} aria-label="코스맵">
              <MapIcon size={21} strokeWidth={mapUsed ? 2.2 : 1.8} color={mapUsed ? '#1b64da' : '#4e5968'} />
            </button>
          );
        })()}
        <button
          data-role="memo-button" data-has-memo={playerScore.memo ? '1' : '0'}
          style={{ ...HDR_BTN, position: 'relative' }}
          onClick={() => { setMemoDraft(playerScore.memo || ''); setShowMemoModal(true); }}
          aria-label={playerScore.memo ? '메모 있음 — 열기' : '메모 쓰기'}
        >
          <StickyNote size={21} strokeWidth={playerScore.memo ? 2.2 : 1.8} color={playerScore.memo ? '#1b64da' : '#4e5968'} />
          {playerScore.memo && <span data-role="memo-dot" style={{ position: 'absolute', top: 9, right: 9, width: 9, height: 9, borderRadius: '50%', background: '#1b64da', border: '2px solid #ffffff' }} />}
        </button>
        <button style={HDR_BTN} onClick={openParEdit} data-role="round-edit" aria-label="라운드 수정"><Edit3 size={19} strokeWidth={1.8} color="#4e5968" /></button>
      </header>

      {/* 전체 스코어 — 화면 맨 위: 몇 홀째 · 누적 · 홀 표(눌러서 홀 이동). 사용자가 "맨 위에 있는 게 낫다"고 해서 입력 아래에서 올렸다 (2026-11-12) */}
      <div data-role="overview">
      {/* 제목 · 몇 홀째 · 진행 막대 — 합계·퍼트 숫자는 바로 아래 카드에 크게 있어 여기서 다시 쓰지 않는다 */}
      {(() => {
        const c = round.holes.filter(h => round.players.every(p => doneFor(h, p))).length;
        return (
          <div data-role="progress" style={{ margin: '4px 4px 0', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#191f28' }}>전체 스코어</span>
              <span data-role="progress-count" style={{ fontSize: 13, color: '#4e5968' }}><b style={{ color: '#191f28', fontWeight: 800 }}>{c}</b>{`/${holeTotal}홀`}</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: '#e5e8eb', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(c / holeTotal) * 100}%`, borderRadius: 3, background: '#1b64da', transition: 'width 0.3s ease' }} />
            </div>
          </div>
        );
      })()}

      <GoalLine goals={goals} round={round} margin="10px 0 0" />

      <div style={{ marginTop: 14 }}>
      {/* Running Score */}
      {isSimpleMode ? (() => {
        const fmt=(d,has)=>!has?'—':d===0?'E':d>0?`+${d}`:`${d}`;
        const fmtC=(d,has)=>!has?'#4e5968':d>0?'#c8323a':d<0?'#0a7f3f':'#4e5968';
        return (
          <div style={{ ...styles.runningScore, flexDirection:'column', gap:0, padding:'8px 16px' }}>
            {round.players.map((player, pi) => {
              const th = round.holes.filter(h => doneFor(h, player));
              const ps = th.reduce((s,h) => s+(h.scores[player]?.strokes||0), 0);
              const pp = th.reduce((s,h) => s+h.par, 0);
              const pd = ps-pp;
              // 9홀 묶음별 파 대비 — 18홀은 OUT·IN 두 칸, 9홀은 치는 9홀 한 칸
              const nineStats = nines.map(n => {
                const done = n.holes.map(x => x.hole).filter(h => doneFor(h, player));
                return { key:n.key, label:n.label, has: done.length>0, d: done.reduce((s,h)=>s+h.scores[player].strokes-h.par,0) };
              });
              const isLast = pi === round.players.length - 1;
              return (
                <div key={player} style={{ display:'flex', alignItems:'center', gap:8, paddingTop:6, paddingBottom:6, borderBottom: isLast?'none':'1px solid rgba(25,31,40,0.04)' }}>
                  <div style={{ width:20, height:20, borderRadius:'50%', background:'#eef1f4', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span style={{ fontSize:12, fontWeight:800, color:'#1b64da' }}>{pi+1}</span>
                  </div>
                  <span style={{ flex:1, fontSize:14, fontWeight:700, color:'#333d4b', minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{player}</span>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    {nineStats.map(ns => (
                      <div key={ns.key} style={{ textAlign:'center', minWidth:28 }}>
                        <div style={{ fontSize: 12, fontWeight:700, letterSpacing:'0', color:'#4e5968', marginBottom:1 }}>{ns.label}</div>
                        <div style={{ fontSize:14, fontWeight:800, color: fmtC(ns.d,ns.has) }}>{fmt(ns.d,ns.has)}</div>
                      </div>
                    ))}
                    <div style={{ display:'flex', alignItems:'baseline', gap:2, minWidth:60, justifyContent:'flex-end' }}>
                      <span style={{ fontSize:22, fontWeight:900, color:'#191f28', lineHeight:1 }}>{ps||0}</span>
                      {th.length > 0 && <span style={{ fontSize:14, fontWeight:800, color: fmtC(pd,true), lineHeight:1 }}>({fmt(pd,true)})</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })() : (() => {
        const th = round.holes.filter(h => doneFor(h, activePlayer));
        const ps = th.reduce((s,h) => s+(h.scores[activePlayer]?.strokes||0), 0);
        const pp = th.reduce((s,h) => s+h.par, 0);
        const pu = th.reduce((s,h) => s+(h.scores[activePlayer]?.putts||0), 0);
        const pd = ps-pp;
        // 9홀 묶음별 파 대비 — 18홀은 OUT·IN 두 칸, 9홀은 치는 9홀 한 칸
        const nineStats = nines.map(n => {
          const done = n.holes.map(x => x.hole).filter(h => doneFor(h, activePlayer));
          return { key:n.key, label:n.label, has: done.length>0, d: done.reduce((s,h)=>s+h.scores[activePlayer].strokes-h.par,0) };
        });
        const fmt=(d,has)=>!has?'—':d===0?'E':d>0?`+${d}`:`${d}`;
        const fmtC=(d,has)=>!has?'#4e5968':d>0?'#c8323a':d<0?'#0a7f3f':'#4e5968';
        return (
          <div style={styles.runningScore}>
            <div style={styles.runningScoreMain}>
              <div style={styles.runningScoreLabel}>스코어</div>
              <div data-role="running-total" style={styles.runningScoreValues}>
                <span style={styles.runningScoreNumber}>{ps}</span>
                {th.length > 0 && <span style={{ ...styles.runningScoreDiff, color: fmtC(pd,true) }}>({fmt(pd,true)})</span>}
              </div>
            </div>
            <div style={styles.runningScoreDivider} />
            <div style={styles.runningScoreStats}>
              {nineStats.map(ns => (
                <div key={ns.key} style={styles.runningScoreStat}>
                  <span style={{ ...styles.runningScoreStatLabel, fontSize: '12px' }}>{ns.label}</span>
                  <span style={{ ...styles.runningScoreStatValue, color: fmtC(ns.d,ns.has) }}>{fmt(ns.d,ns.has)}</span>
                </div>
              ))}
              <div style={styles.runningScoreStat}>
                <span style={styles.runningScoreStatLabel}>퍼트</span>
                <span style={styles.runningScoreStatValue}>{pu||'—'}</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Hole Navigator */}
      <div style={styles.holeNavigator}>
        {/* 18홀은 OUT·IN 두 줄, 9홀은 치는 9홀 한 줄. offset = 그 묶음의 첫 홀이 round.holes 에서 차지하는 위치 */}
        {nines.map(({ label, holes: items }) => ({ label, holes: items.map(x => x.hole), offset: items[0].index })).map(({ label, holes, offset }) => (
          <div key={label} style={styles.holeNavTable}>
            <div style={styles.holeNavTableRow}>
              <div style={{ ...styles.holeNavRowLabel, ...styles.holeNavRowLabelHeader, fontSize: getNavLabelFontSize(label) }}>{label}</div>
              <div style={styles.holeNavTableCells}>
                {holes.map((h,li) => { const i=offset+li; const ic=i===holeIdx; return <button key={i} style={{ ...styles.holeNavHoleCell, background: ic?'#1b64da':'transparent', color: ic?'#ffffff':'#4e5968' }} onClick={()=>goToHole(i)}>{h.holeNumber ?? i+1}</button>; })}
              </div>
            </div>
            <div style={styles.holeNavTableRow}>
              <div style={styles.holeNavRowLabel}>파</div>
              <div style={styles.holeNavTableCells}>
                {holes.map((h,li) => { const i=offset+li; const ic=i===holeIdx; const pc=h.par===3?(ic?'#b45309':'#b45309'):h.par===5?(ic?'#0a7f3f':'#0a7f3f'):(ic?'#1b64da':'#4e5968'); const pb=ic?(h.par===3?'rgba(217,119,6,0.22)':h.par===5?'rgba(10,127,63,0.18)':'#e8ebee'):'transparent'; return <button key={i} style={{ ...styles.holeNavParCell, background: pb, color: pc, fontWeight: (h.par===3||h.par===5)?'800':'700', border:'none', cursor:'pointer', padding:0 }} onClick={()=>goToHole(i)}>{h.par}</button>; })}
              </div>
            </div>
            {isSimpleMode ? round.players.map((player, pi) => {
              const isLastPlayer = pi === round.players.length - 1;
              const shortName = player.length > 4 ? player.slice(0,4) : player;
              return (
                <div key={player} data-role="nav-score" style={{ ...styles.holeNavTableRow, borderBottom: isLastPlayer ? 'none' : '1px solid rgba(25,31,40,0.032)' }}>
                  <div style={{ ...styles.holeNavRowLabel, color:'#1b64da', fontSize: 12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{shortName}</div>
                  <div style={styles.holeNavTableCells}>
                    {holes.map((h,li) => {
                      const i=offset+li; const done=doneFor(h, player); const ic=i===holeIdx;
                      const psc=h.scores[player]; const diff=psc.strokes-h.par; const hio=done&&psc.strokes===1;
                      let ms={};
                      if(done) { if(hio) ms={...styles.markerHoleInOne}; else if(diff<=-2) ms={...styles.markerEagle}; else if(diff===-1) ms={...styles.markerBirdie}; else if(diff===0) ms={...styles.markerPar}; else if(diff===1) ms={...styles.markerBogey}; else ms={...styles.markerDouble}; }
                      return (
                        <button key={i} style={{ ...styles.holeNavScoreCell, background: ic?'#e8ebee':'transparent' }} onClick={()=>goToHole(i)}>
                          <span style={{ ...styles.scoreMarker, ...ms, color: hio?'#ffffff':done?(diff<=-1?'#0a7f3f':diff>=1?'#c8323a':'#191f28'):(ic?'#1b64da':'#4e5968'), fontWeight: done?'700':'500' }}>
                            {hio&&<span style={styles.holeInOneStar}>★</span>}{navStrokesText(psc, done)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }) : (<>
            <div style={styles.holeNavTableRow} data-role="nav-score">
              <div style={styles.holeNavRowLabel}>스코어</div>
              <div style={styles.holeNavTableCells}>
                {holes.map((h,li) => {
                  const i=offset+li; const done=round.players.every(p=>doneFor(h, p)); const ic=i===holeIdx;
                  const psc=h.scores[activePlayer]; const diff=psc.strokes-h.par; const hio=done&&psc.strokes===1;
                  let ms={};
                  if(done) { if(hio) ms={...styles.markerHoleInOne}; else if(diff<=-2) ms={...styles.markerEagle}; else if(diff===-1) ms={...styles.markerBirdie}; else if(diff===0) ms={...styles.markerPar}; else if(diff===1) ms={...styles.markerBogey}; else ms={...styles.markerDouble}; }
                  return (
                    <button key={i} style={{ ...styles.holeNavScoreCell, background: ic?'#e8ebee':'transparent' }} onClick={()=>goToHole(i)}>
                      <span style={{ ...styles.scoreMarker, ...ms, color: hio?'#ffffff':done?(diff<=-1?'#0a7f3f':diff>=1?'#c8323a':'#191f28'):(ic?'#1b64da':'#4e5968'), fontWeight: done?'700':'500' }}>
                        {hio&&<span style={styles.holeInOneStar}>★</span>}{navStrokesText(psc, done)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            {/* PUTT — 입력한 퍼트 수. 동반자와 함께 기록할 때는 퍼트를 입력하지 않으므로(스코어로 추정) 이 줄이 없다 */}
            <div style={{ ...styles.holeNavTableRow, borderBottom: 'none' }} data-role="nav-putts">
              <div style={styles.holeNavRowLabel}>퍼트</div>
              <div style={styles.holeNavTableCells}>
                {holes.map((h,li) => {
                  const i=offset+li; const ic=i===holeIdx;
                  const psc=h.scores[activePlayer]; const text=navPuttsText(psc, doneFor(h, activePlayer)); const has=text!==NAV_EMPTY;
                  return (
                    <button key={i} style={{ ...styles.holeNavScoreCell, background: ic?'#e8ebee':'transparent' }} onClick={()=>goToHole(i)}>
                      <span style={{ ...styles.scoreMarker, height: 24, color: has?'#333d4b':(ic?'#1b64da':'#4e5968'), fontWeight: has?'700':'500' }}>{text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            </>)}
          </div>
        ))}
      </div>
      </div>
      </div>

      {/* Hole Header — 몇 번 홀 · 파 몇 */}
      <div data-role="hole-header" style={{ padding: '22px 4px 0', textAlign: 'left' }}>
        <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.4, letterSpacing: '-0.02em', color: '#191f28' }}>
          <span data-role="hole-no">{`${holeNo}번 홀`}</span>{isSimpleMode ? '' : <> 스코어를<br />알려 주세요</>}
        </div>
        <div data-role="hole-par" style={{ marginTop: 4, fontSize: 15, color: '#4e5968' }}>{`파 ${hole.par} 홀이에요`}</div>
      </div>

      {/* ── 멀티플레이어 간편 스코어 ── */}
      {isSimpleMode && (
        <div style={{ padding:'8px 16px 4px' }}>
          {round.players.map((player, pi) => {
            const ps = hole.scores[player];
            const sn = getScoreName(ps.strokes, hole.par);
            const diff = ps.strokes - hole.par;
            const diffLabel = diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`;
            return (
              <div key={player} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8, padding:'6px 10px', borderRadius:10, background:'#eef1f4', border:'1px solid #e5e8eb' }}>
                <div style={{ width:26, height:26, borderRadius:'50%', background:'#eef1f4', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ fontSize:13, fontWeight:800, color:'#1b64da' }}>{pi+1}</span>
                </div>
                <span style={{ flex:1, fontSize:14, fontWeight:600, color:'#333d4b', minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{player}</span>
                <span style={{ fontSize:12, fontWeight:700, color: sn?.color||'#4e5968', minWidth:24, textAlign:'center' }}>{diffLabel}</span>
                <div style={{ display:'flex', alignItems:'center', background:'#eef1f4', borderRadius:8, overflow:'hidden', height:38 }}>
                  <button style={{ width:38, height:38, background:'transparent', border:'none', color:'#0a7f3f', fontSize:20, fontWeight:700, cursor:'pointer', flexShrink:0 }}
                    onClick={() => updatePlayerStrokes(player, Math.max(1, ps.strokes - 1))}>−</button>
                  <span style={{ width:34, textAlign:'center', fontSize:20, fontWeight:900, color: sn?.color||'#191f28', lineHeight:1 }}>{ps.strokes}</span>
                  <button style={{ width:38, height:38, background:'transparent', border:'none', color:'#c8323a', fontSize:20, fontWeight:700, cursor:'pointer', flexShrink:0 }}
                    onClick={() => updatePlayerStrokes(player, Math.min(20, ps.strokes + 1))}>+</button>
                </div>
              </div>
            );
          })}

        </div>
      )}

      {!isSimpleMode && <div style={{ padding: '0 4px', textAlign: 'left' }}>
        {/* 스코어 — 크게 하나 */}
        <div data-role="score-input" style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <button data-role="score-minus" aria-label="한 타 줄이기" style={STEP_BTN}
            onClick={() => updateScore('strokes', Math.max(1, playerScore.strokes - 1))}><Minus size={28} strokeWidth={2.2} /></button>
          <div style={{ textAlign: 'center', minWidth: 0 }}>
            {scorePending(playerScore) ? (
              // 퍼팅 전: 2퍼트로 가정한 스코어 대신 그린까지 친(칠) 타수만 보여준다
              <div data-role="score-pending" style={{ lineHeight: 1.3 }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#191f28' }}>온그린까지 {strokesToGreen(playerScore, hole.par)}타</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#4e5968', marginTop: 2 }}>퍼팅 남음</div>
              </div>
            ) : (
              <div data-role="score-value" style={{ fontSize: 96, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em', color: '#191f28' }}>{playerScore.strokes}</div>
            )}
            {inProgress(playerScore) ? (
              <div data-role="score-name" style={{ display: 'inline-block', marginTop: 4, height: 26, lineHeight: '26px', padding: '0 12px', borderRadius: 13, background: '#f2f4f6', color: '#4e5968', fontSize: 13, fontWeight: 700 }}>진행 중</div>
            ) : scoreName && (
              <div data-role="score-name" style={{ display: 'inline-block', marginTop: 4, height: 26, lineHeight: '26px', padding: '0 12px', borderRadius: 13, ...NAME_TONE(playerScore.strokes, hole.par), fontSize: 13, fontWeight: 700, opacity: playerScore.touched ? 1 : 0.65 }}>
                {koScoreName(playerScore.strokes, hole.par)}
              </div>
            )}
          </div>
          <button data-role="score-plus" aria-label="한 타 늘리기" style={{ ...STEP_BTN, background: '#1b64da', color: '#ffffff' }}
            onClick={() => updateScore('strokes', Math.min(20, playerScore.strokes + 1))}><Plus size={28} strokeWidth={2.2} /></button>
        </div>

        {/* 한 번에 고르기 — 버디 · 파 · 보기 · 더블 이상 */}
        <div data-role="score-quick" style={{ marginTop: 14, display: 'flex', gap: 8 }}>
          {[['버디', hole.par - 1], ['파', hole.par], ['보기', hole.par + 1], ['더블 이상', hole.par + 2]].map(([label, val]) => {
            const diff = playerScore.strokes - hole.par;
            const on = playerScore.touched && !scorePending(playerScore) && (label === '더블 이상' ? diff >= 2 : playerScore.strokes === val);
            return (
              <button key={label} type="button" aria-pressed={on}
                style={{ flex: 1, minHeight: 44, borderRadius: 12, border: 'none', background: on ? '#e8f3ff' : '#f2f4f6', color: on ? '#1b64da' : '#191f28', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
                onClick={() => updateScore('strokes', Math.min(20, Math.max(1, val)))}>{label}</button>
            );
          })}
        </div>

        {/* 상세 입력 홀: 샷 기록으로 계산 중이면 '자동', 직접 고쳤으면 '직접 입력' */}
        <div style={{ marginTop: 4, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: playerScore.teeClub && playerScore.strokesManual ? '#1b64da' : '#0a7f3f' }}>
            {playerScore.teeClub ? (playerScore.strokesManual ? '직접 입력 · 벌타 포함 총 스코어' : '샷 기록으로 자동 계산') : ''}
          </span>
          {playerScore.teeClub ? (
            // 상세 입력 홀에서 직접 고친 값을 버리고 샷 기록 계산으로 되돌린다
            playerScore.strokesManual && (
              <button style={SMALL_LINK} onClick={() => {
                // 점수를 퍼팅 수 밑으로 내려 잘려 나간 퍼팅 기록이 있으면 함께 되돌린다
                const hd = playerScore.puttsHeld;
                updateFields(hd && (playerScore.putts || 0) === hd.clamped
                  ? { strokesManual: false, putts: hd.value, puttsHeld: null }
                  : { strokesManual: false });
              }}>자동 계산</button>
            )
          ) : (
            <button style={SMALL_LINK} onClick={() => updateScore('strokes', hole.par, { strokesManual: false })}>초기화</button>
          )}
        </div>

        {/* 퍼팅 */}
        <div data-role="putts-input" style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#191f28' }}>퍼팅</span>
            <button style={SMALL_LINK} onClick={() => { updatePuttsCount(2); setShowPuttsDropdown(false); }}>초기화</button>
          </div>
          <div role="group" aria-label="퍼팅 수" style={{ display: 'flex', gap: 2, background: '#f2f4f6', borderRadius: 16, padding: 4 }}>
            {[0, 1, 2, 3, 4].map((n) => {
              const sel = n === 4 ? playerScore.putts >= 4 : playerScore.putts === n;
              const curVal = playerScore.putts;
              const disabled = n > maxPuttsAllowed;
              const label = n === 4 ? (curVal < 4 ? '4' : `${curVal}+`) : String(n);
              return (
                <button key={n} type="button" data-role={`putts-${n}`} aria-pressed={sel} disabled={disabled}
                  style={{
                    flex: 1, minHeight: 52, borderRadius: 12, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
                    background: sel ? '#ffffff' : 'transparent', color: sel ? '#191f28' : '#4e5968',
                    fontSize: 18, fontWeight: sel ? 900 : 700, opacity: disabled ? 0.35 : 1,
                    boxShadow: sel ? '0 1px 4px rgba(25,31,40,0.14)' : 'none',
                  }}
                  onClick={() => {
                    if (n === 4) {
                      if (curVal < 4) { updatePuttsCount(4); setShowPuttsDropdown(false); }
                      else { setShowPuttsDropdown(v => !v); }
                    } else {
                      updatePuttsCount(n);
                      setShowPuttsDropdown(false);
                    }
                  }}>{label}</button>
              );
            })}
          </div>

          {offGreenCount(playerScore) > 0 && (
            <div data-role="off-green-note" style={{ marginTop: 6, fontSize: 13, color: '#a85b00', textAlign: 'center', lineHeight: 1.5 }}>
              그린 밖으로 나가 다시 친 칩 {offGreenCount(playerScore)}타는 스코어에만 들어가요
            </div>
          )}

          {showPuttsDropdown && (() => {
            // 스코어가 높아 퍼팅 8개를 넘어야 하는 경우도 선택 가능하도록 상한까지 확장
            const upper = Math.max(8, Math.min(maxPuttsAllowed, 15));
            const options = Array.from({ length: Math.max(0, upper - 4) }, (_, i) => i + 5);
            return (
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {options.map(n => {
                  const disabled = n > maxPuttsAllowed;
                  const sel = playerScore.putts === n;
                  return (
                    <button key={n} disabled={disabled} aria-pressed={sel}
                      style={{
                        flex: 1, minHeight: 44, borderRadius: 12, border: 'none',
                        background: sel ? '#e8f3ff' : '#f2f4f6', color: sel ? '#1b64da' : '#191f28',
                        fontSize: 17, fontWeight: 800, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.35 : 1,
                      }}
                      onClick={() => { updatePuttsCount(n); setShowPuttsDropdown(false); }}>{n}</button>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* 벌타 — 누르면 해저드 · OB · 언플레이어블을 넣는 칸이 열린다 */}
        <div data-role="penalty-input" style={{ marginTop: 12 }}>
          <button type="button" data-role="penalty-toggle" aria-expanded={penOpen} style={{ ...ROW_BTN, borderTop: '1px solid #f2f4f6' }} onClick={() => setPenOpen(v => !v)}>
            <span style={{ fontWeight: 500 }}>벌타</span>
            <span data-role="penalty-summary" style={{ display: 'flex', alignItems: 'center', gap: 2, color: penaltyCount(playerScore) > 0 ? '#c8323a' : '#4e5968', fontWeight: penaltyCount(playerScore) > 0 ? 700 : 400 }}>
              {penaltySummary}<ChevronRight size={18} style={{ transform: penOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.16s ease' }} />
            </span>
          </button>
          {penOpen && (
            <div data-role="penalty-panel" style={{ padding: '4px 0 8px' }}>
              {[
                { label: '해저드', val: playerScore.hazard || 0, onDec: () => { const c = playerScore.hazard || 0; if (c > 0) updatePenalty('hazard', c - 1); }, onInc: () => updatePenalty('hazard', Math.min(5, (playerScore.hazard || 0) + 1)) },
                { label: 'OB', val: playerScore.ob || 0, onDec: () => { const c = playerScore.ob || 0; if (c > 0) updatePenalty('ob', c - 1); }, onInc: () => updatePenalty('ob', Math.min(5, (playerScore.ob || 0) + 1)) },
                { label: '언플레이어블', val: playerScore.unplayable || 0, onDec: () => { const c = playerScore.unplayable || 0; if (c > 0) updatePenalty('unplayable', c - 1); }, onInc: () => updatePenalty('unplayable', Math.min(5, (playerScore.unplayable || 0) + 1)) },
              ].map(item => (
                <div key={item.label} data-role={`penalty-${item.label}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 }}>
                  <span style={{ fontSize: 15, color: '#333d4b' }}>{item.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', background: '#f2f4f6', borderRadius: 12 }}>
                    <button aria-label={`${item.label} 줄이기`} style={{ width: 48, height: 44, border: 'none', background: 'transparent', color: '#4e5968', fontSize: 22, cursor: 'pointer' }} onClick={item.onDec}>−</button>
                    <span style={{ width: 28, textAlign: 'center', fontSize: 18, fontWeight: 800, color: item.val > 0 ? '#c8323a' : '#191f28' }}>{item.val}</span>
                    <button aria-label={`${item.label} 늘리기`} style={{ width: 48, height: 44, border: 'none', background: 'transparent', color: '#1b64da', fontSize: 22, cursor: 'pointer' }} onClick={item.onInc}>+</button>
                  </div>
                </div>
              ))}
              {penaltyCount(playerScore) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button style={SMALL_LINK} onClick={() => {
                    const cleared = { ob: 0, hazard: 0, unplayable: 0, penalties: [] };
                    // 직접 고친 스코어는 벌타 초기화로 바꾸지 않는다
                    updateFields(playerScore.strokesManual
                      ? cleared
                      : { ...cleared, strokes: calcAutoStrokes({ ...playerScore, ...cleared }, hole.par) });
                  }}>초기화</button>
                </div>
              )}
              {/* 샷별로 넣으면 구제 방식까지 기록된다는 안내 (합계로만 넣은 벌타가 없을 때) */}
              {penaltyCount(playerScore) <= (playerScore.penalties || []).length && (
                <div style={{ fontSize: 12, color: '#4e5968', lineHeight: 1.5 }}>샷 기록에서 [벌타]로 넣으면 구제 방식까지 기록돼요</div>
              )}
              {/* 어느 샷인지 모르는 벌타(여기서만 넣은 것)가 있을 때만 안내한다 */}
              {penaltyCount(playerScore) > (playerScore.penalties || []).length && (
                <div style={{ fontSize: 13, color: '#4e5968', lineHeight: 1.5 }}>
                  여기서 넣은 OB는 OB티 기준(+2타)으로 계산돼요 · 해저드는 1벌타<br />
                  샷 기록에서 [OB]·[해저드]로 넣으면 '스트로크와 거리(다시 치기)'도 고를 수 있어요
                </div>
              )}
            </div>
          )}
        </div>

        {/* 샷 기록 — 눌러야 티샷부터 입력할 수 있다 (기본은 접힘) */}
        <div data-role="shot-entry">
          <button type="button" data-role="shot-toggle" aria-expanded={shotVisible} style={ROW_BTN}
            onClick={() => (hasShotData ? scrollToTabs() : setShotOpen(!shotPref))}>
            <span style={{ fontWeight: 500 }}>샷 기록</span>
            <span data-role="shot-summary" style={{ display: 'flex', alignItems: 'center', gap: 2, color: '#4e5968' }}>
              {hasShotData ? `${shotCount}샷 기록됨` : shotVisible ? '접기' : '티샷부터'}
              <ChevronRight size={18} style={{ transform: shotVisible ? 'rotate(90deg)' : 'none', transition: 'transform 0.16s ease' }} />
            </span>
          </button>
          {!shotVisible && (
            <div data-role="shot-hint" style={{ padding: '2px 2px 4px', fontSize: 13, lineHeight: 1.5, color: '#5b6572' }}>
              샷마다 클럽 · 거리 · 결과까지 남기려면 눌러 주세요. 티샷부터 이어서 입력해요.
            </div>
          )}
        </div>
      </div>}

      {/* ── Score Input Form ── */}
      {shotVisible && <div style={{ paddingBottom: 8 }}>

        {/* ── 입력 탭: 티샷 · 필드샷 · 퍼팅 — 화면을 내려도 맨 위에 붙고, 한 단계를 마치면 다음 탭으로 넘어간다 ── */}
        <StickyTabs
          tabs={[
            ['tee', '티샷', { done: teeReady }],
            ['field', '필드샷', { disabled: !teeReady, done: teeReady && ballOnGreen }],
            ['putt', '퍼팅', { disabled: !teeReady }],
          ]}
          current={stage} onChange={setStage} label="샷 입력 단계" rolePrefix="shot-tab"
          scrollOnChange="always" anchorRef={tabsTopRef}
        />

        {stage === 'tee' && <>
        {/* 티박스 위치 — 여기서 찍어야 티샷 거리가 측정된다 */}
        <GpsShotPoint
          label="티샷 지점"
          point={gpsPoints[0] || null}
          pinPoint={gpsPin}
          onCapture={fix => setGpsPoint(0, fix)}
          onClear={() => setGpsPoint(0, null)}
        />

        {/* PAR3 전용: 핀 위치 — 선택 입력. 고르지 않아도 다음 입력이 열린다 */}
        {hole.par === 3 && (
          <div data-role="pin-position" style={{ padding:'8px 16px 4px', borderBottom:'1px solid #e5e8eb' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <span style={fIcon}>📍</span><span style={fLbl}>핀 위치</span><span style={{ fontSize:12, color:'#4e5968' }}>선택 입력</span>
            </div>
            <RadialPicker centerId="center" centerLabel="센터" dirs={PIN_DIRS} alwaysOpen
              value={Array.isArray(playerScore.pinPosition) ? playerScore.pinPosition[0] : playerScore.pinPosition}
              onChange={v => { updateField('pinPosition', v); if (v) scrollToStep('tee-distance'); }}
            />
          </div>
        )}

        {/* PAR3 전용: 거리 */}
        {hole.par === 3 && (
          <div data-step="tee-distance" style={{ padding:'8px 16px 14px', borderBottom:'1px solid #e5e8eb', animation:'fadeIn 0.18s ease-out', scrollMarginTop: 72 }}>
            <div style={{ ...fLeft, marginBottom:10 }}>
              <span style={fIcon}>↔</span><span style={fLbl}>거리</span>
              {mapDistanceTag(measuredTee, playerScore.teeDistance, null,
                () => updateFields({ teeDistance: measuredTee, teeDistanceAppliedM: measuredTee }))}
            </div>
            <SwipeDistance kind="shot" value={playerScore.teeDistance ?? null} start={measuredTee ?? 150} min={50} max={250} sliderMax={250} onChange={v=>updateField('teeDistance',v)} />
            {playerScore.teeDistance != null && <div style={{ textAlign:'center', fontSize:12, color:'#4e5968', marginTop:6, letterSpacing:'0' }}>← 슬라이드로 1{unitLabel('shot')} 단위 조정 →</div>}
          </div>
        )}

        {/* 티샷 클럽 */}
        <ClubSelector
          icon="〽"
          label="클럽"
          categories={clubs}
          value={playerScore.teeClub}
          subValue={playerScore.teeClubSub}
          onCategory={(v, hasSubs) => { updateFields({ teeClub: v, teeClubSub: null }); if (v && !hasSubs) scrollToStep('tee-shape'); }}
          onSub={v => { updateField('teeClubSub', v); if (v) scrollToStep('tee-shape'); }}
          stacked
          columns={2}
          onInteractStart={() => setTeeClubInteracting(true)}
          onInteractEnd={() => setTeeClubInteracting(false)}
          suggest={clubSuggest(0, playerScore.teeDistance, (club, sub) => { updateFields({ teeClub: club, teeClubSub: sub }); if (club) scrollToStep('tee-shape'); })}
        />

        {/* 티샷 구질 - 클럽 선택 완료 후 등장 */}
        {(
          (!playerScore.teeClub && !teeClubInteracting) ? (
          <div style={{ padding:'10px 16px', borderBottom:'1px solid #e5e8eb', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <span style={{ fontSize:13, color:'#4e5968', letterSpacing:'0' }}>클럽을 선택하면 구질 입력이 나타나요</span>
          </div>
          ) : (playerScore.teeClub && !teeClubInteracting) ? (
          <div data-step="tee-shape" style={{ padding:'8px 16px 12px', borderBottom:'1px solid #e5e8eb', animation:'fadeIn 0.18s ease-out', scrollMarginTop: 72 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <span style={fIcon}>〜</span><span style={fLbl}>구질</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {[['페이드','스트레이트','드로우'],['훅','풀','푸시','슬라이스']].map((row, ri) => (
                <div key={ri} style={{ display:'flex', gap:6 }}>
                  {row.map(s => (
                    <button key={s}
                      style={{ ...fChip, flex:1, textAlign:'center', padding:'10px 6px', fontSize:14, borderRadius:8, ...(playerScore.shotShape===s?fChipOn:{}) }}
                      onClick={()=>{ const nv=playerScore.shotShape===s?null:s; updateField('shotShape',nv); if(nv) scrollToStep(hole.par === 3 ? 'tee-result' : 'tee-fairway'); }}>{s}</button>
                  ))}
                </div>
              ))}
            </div>
          </div>
          ) : null
        )}

        {/* PAR3 전용: GIR - 클럽 선택 후 등장 (티샷 결과라 꼭 받는다) */}
        {hole.par === 3 && playerScore.teeClub && !teeClubInteracting && (() => {
          const hioSelected = playerScore.putts===0 && playerScore.girAuto===false && (playerScore.puttDetails?.length||0)===0 && playerScore.touched;
          return (
          <div data-step="tee-result" style={{ padding:'8px 16px 12px', borderBottom:'1px solid #e5e8eb', animation:'fadeIn 0.18s ease-out', scrollMarginTop: 72 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <span style={fIcon}>⚑</span><span style={fLbl}>티샷 결과</span>
            </div>
            {/* 성공 / 실패 */}
            <div style={{ display:'flex', gap:8, marginBottom:8 }}>
              {/* teeOnGreen: 티샷 결과를 따로 남긴다 — gir는 홀 확정 때 다시 계산돼 바뀐다 */}
              <button disabled={penaltyBlocksTeeOnGreen && playerScore.teeOnGreen !== true}
                style={{ ...fChipWide, flex:1, padding:'12px 8px', ...(playerScore.teeOnGreen===true || (playerScore.teeOnGreen==null && playerScore.gir===true && !playerScore.girAuto)?{ border:'2px solid #0a7f3f', color:'#0a7f3f' }:{}),
                  ...(penaltyBlocksTeeOnGreen && playerScore.teeOnGreen !== true ? { opacity:0.35, cursor:'not-allowed' } : {}) }}
                onClick={()=>{ updateFields({ gir: true, girAuto: false, teeOnGreen: true }); setStage('putt'); }}>그린 온</button>
              <button style={{ ...fChipWide, flex:1, padding:'12px 8px', ...(playerScore.teeOnGreen===false || (playerScore.teeOnGreen==null && playerScore.gir===false)?{ border:'2px solid #c8323a', color:'#c8323a' }:{}) }}
                onClick={()=>{ updateFields({ gir: false, girAuto: false, teeOnGreen: false }); setSecondShotExpanded(true); setStage('field'); }}>그린 놓침</button>
            </div>
            {/* 홀인원 풀와이드 — 벌타가 있으면 홀인원일 수 없다 */}
            <button
              disabled={penaltyBlocksTeeOnGreen && !hioSelected}
              style={{
                width:'100%', padding:'13px 16px', borderRadius:8,
                cursor: penaltyBlocksTeeOnGreen && !hioSelected ? 'not-allowed' : 'pointer',
                opacity: penaltyBlocksTeeOnGreen && !hioSelected ? 0.35 : 1,
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                border: hioSelected ? '2px solid #1b64da' : '1.5px solid #d1d6db',
                background: hioSelected
                  ? 'linear-gradient(135deg, rgba(27,100,218,0.28) 0%, rgba(27,100,218,0.08) 100%)'
                  : '#e8ebee',
                color: hioSelected ? '#1b64da' : '#4e5968',
                fontWeight: 700, fontSize: 14, letterSpacing:'0',
                animation: hioSelected ? 'holeInOnePulse 1.6s ease-in-out infinite' : 'none',
                boxShadow: hioSelected ? '0 0 20px rgba(27,100,218,0.35)' : 'none',
                transition: 'background 0.2s, border-color 0.2s, box-shadow 0.2s',
              }}
              onClick={() => {
                const freshStrokes = calcAutoStrokes({ ...playerScore, teeOnGreen: true, putts: 0 }, hole.par);
                const freshScore = { ...playerScore, gir: true, girAuto: false, teeOnGreen: true, putts: 0, strokes: freshStrokes, puttDetails: [], offGreen: [], touched: true, strokesManual: false };
                triggerChipIn(freshScore);
              }}>
              {hioSelected && <span style={{ fontSize:17 }}>⭐</span>}
              <span>홀인원</span>
              {hioSelected && <span style={{ fontSize:17 }}>⭐</span>}
            </button>
            {penaltyBlocksTeeOnGreen && playerScore.teeOnGreen !== true && teeOnGreenBlockedHint}
          </div>
        );})()}
        {hole.par === 3 && playerScore.teeClub && !teeClubInteracting && penaltyRow(0)}

        {/* FAIRWAY HIT - 클럽 선택 후 등장 (선택 입력 — 세컨샷 지형을 고르면 따로 안 눌러도 채워진다) */}
        {hole.par > 3 && playerScore.teeClub && (
          <div data-step="tee-fairway" style={{ padding:'8px 16px 12px', borderBottom:'1px solid #e5e8eb', animation:'fadeIn 0.18s ease-out', scrollMarginTop: 72 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <span style={fIcon}>⊙</span><span style={fLbl}>페어웨이 적중</span>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {/* 1온(G)이면 볼이 그린 위라 페어웨이 O는 성립하지 않는다 — G를 먼저 해제해야 고를 수 있다 */}
              <button data-role="tee-fairway-hit" disabled={!!playerScore.teeGIR} style={{ flex:1, textAlign:'center', padding:'12px', borderRadius:8, border:`1.5px solid ${playerScore.fairway===true?'#0a7f3f':'#d1d6db'}`, background:playerScore.fairway===true?'rgba(10,127,63,0.18)':'#e8ebee', color:playerScore.fairway===true?'#0a7f3f':'#4e5968', fontSize:17, fontWeight:800, cursor: playerScore.teeGIR ? 'not-allowed' : 'pointer', opacity: playerScore.teeGIR ? 0.3 : 1 }} onClick={()=>{ if (playerScore.teeGIR) return; setTeeFairway(true); scrollToStep('tee-landing'); }}>O</button>
              <button data-role="tee-fairway-miss" style={{ flex:1, textAlign:'center', padding:'12px', borderRadius:8, border:`1.5px solid ${playerScore.fairway===false?'#c8323a':'#d1d6db'}`, background:playerScore.fairway===false?'rgba(200,50,58,0.12)':'#e8ebee', color:playerScore.fairway===false?'#c8323a':'#4e5968', fontSize:17, fontWeight:800, cursor:'pointer' }} onClick={()=>{ setTeeFairway(false); scrollToStep('tee-landing'); }}>X</button>
            </div>
            {playerScore.fairwayFromLanding && playerScore.fairway === true && (
              <div data-role="tee-fairway-auto" style={{ fontSize:12, color:'#4e5968', marginTop:6, lineHeight:1.5 }}>랜딩 센터라 O 로 자동 선택 · 다르면 눌러서 바꾸세요</div>
            )}
            {playerScore.fairwayDerived && playerScore.fairway != null && (
              <div data-role="tee-fairway-derived" style={{ fontSize:12, color:'#4e5968', marginTop:6, lineHeight:1.5 }}>{playerScore.fairway ? '세컨샷 지형이 페어웨이라 O' : '세컨샷 지형이 페어웨이가 아니라 X'} 로 자동 선택 · 다르면 눌러서 바꾸세요</div>
            )}
          </div>
        )}

        {/* LANDING POINT (L/C/R/그린) — 선택 입력. 티샷이 어디로 갔는지 방향성 분석에 쓰인다.
            1온(G)은 결과라서 여기서 고른다 — 1온이면 필드샷이 없다. */}
        {hole.par > 3 && playerScore.teeClub && (
          <div data-step="tee-landing" style={{ padding:'8px 16px 12px', borderBottom:'1px solid #e5e8eb', animation:'fadeIn 0.18s ease-out', scrollMarginTop: 72 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <span style={fIcon}>⚑</span><span style={fLbl}>랜딩 위치</span>
            </div>
            {/* L / C / R 3분할 */}
            <div style={{ display:'flex', gap:8, marginBottom:8 }}>
              {[['L','레프트','#1b64da'],['C','센터','#0a7f3f'],['R','라이트','#c8323a']].map(([id,label,col])=>(
                <button key={id} style={{ flex:1, textAlign:'center', padding:'10px 4px', borderRadius:8, border:`1.5px solid ${!playerScore.teeGIR && playerScore.fairwayHit===id?col:'#d1d6db'}`, background:!playerScore.teeGIR && playerScore.fairwayHit===id?`${col}22`:'#e8ebee', color:!playerScore.teeGIR && playerScore.fairwayHit===id?col:'#4e5968', fontSize:14, fontWeight:700, cursor:'pointer' }}
                  onClick={() => { pickLanding(id); if (playerScore.fairwayHit !== id) scrollToStep('tee-next'); }}>
                  <div style={{ fontSize:14, fontWeight:800 }}>{id}</div>
                  <div style={{ fontSize:12, marginTop:2 }}>{label}</div>
                </button>
              ))}
            </div>
            {/* G 그린(1온) 풀와이드 버튼 — 벌타가 있으면 1온으로 기록할 수 없다 */}
            <button
              disabled={penaltyBlocksTeeOnGreen && !playerScore.teeGIR}
              style={{
                width:'100%', padding:'13px 16px', borderRadius:8,
                cursor: penaltyBlocksTeeOnGreen && !playerScore.teeGIR ? 'not-allowed' : 'pointer',
                opacity: penaltyBlocksTeeOnGreen && !playerScore.teeGIR ? 0.35 : 1,
                display:'flex', alignItems:'center', justifyContent:'center', gap:10,
                border: playerScore.teeGIR ? '1.5px solid #1b64da' : '1.5px solid #d1d6db',
                background: playerScore.teeGIR ? 'linear-gradient(135deg, rgba(27,100,218,0.22) 0%, rgba(27,100,218,0.08) 100%)' : '#e8ebee',
                color: playerScore.teeGIR ? '#1b64da' : '#4e5968',
                animation: playerScore.teeGIR ? 'goldPulse 1.8s ease-in-out infinite' : 'none',
                boxShadow: playerScore.teeGIR ? '0 0 18px rgba(27,100,218,0.28)' : 'none',
                transition: 'background 0.2s, border-color 0.2s, box-shadow 0.2s',
              }}
              onClick={()=>{
                if (playerScore.teeGIR) { updateFields({ teeGIR: false, fairway: null, ...landingFlagClear }); }
                else {
                  // 1온은 페어웨이 미적중으로 센다 — PGA 투어 Driving Accuracy 기준
                  // ('티샷이 페어웨이에 멈춘 비율'). 그린은 페어웨이가 아니다.
                  updateFields({ teeGIR: true, fairwayHit: null, fairway: false, ...autoSurfaceClear, ...landingFlagClear });
                  setStage('putt');   // 볼이 그린 위 — 필드샷 없이 퍼팅으로
                }
              }}>
              <span style={{ fontSize:16, fontWeight:900 }}>G</span>
              <span style={{ fontSize:14, fontWeight:700, letterSpacing:'0' }}>그린  (1온)</span>
              {playerScore.teeGIR && <span style={{ fontSize:15, marginLeft:4 }}>⛳</span>}
            </button>
            {penaltyBlocksTeeOnGreen && !playerScore.teeGIR && teeOnGreenBlockedHint}
          </div>
        )}
        {hole.par > 3 && playerScore.teeClub && penaltyRow(0)}
        </>}

        {stage === 'tee' && !teeReady && playerScore.teeClub && (
          <div style={{ padding:'8px 16px', textAlign:'center' }}>
            <span style={{ fontSize:13, color:'#4e5968', letterSpacing:'0' }}>
              {`티샷을 마치면 필드샷·퍼팅을 입력할 수 있어요 · 남은 항목: ${teeRequired.join(' · ')}`}
            </span>
          </div>
        )}
        {stage === 'tee' && teeReady && !teeComplete && hole.par > 3 && !playerScore.teeGIR && (
          <div data-role="tee-optional-note" data-step="tee-next" style={{ padding:'10px 16px 14px', textAlign:'center', scrollMarginTop: 72 }}>
            <div style={{ fontSize:13, color:'#4e5968', lineHeight:1.6, marginBottom:8, wordBreak:'keep-all' }}>
              {`선택 항목: ${teeOptionalLeft.join(' · ')} — 비워 두고 필드샷으로 넘어가도 돼요`}
            </div>
            <button type="button" data-role="go-field" onClick={() => { setStage('field'); scrollToTabs(); }}
              style={{ ...fChipWide, width:'100%', padding:'12px 8px', color:'#1b64da', border:'1.5px solid rgba(27,100,218,0.5)', fontSize:15, fontWeight:800 }}>필드샷 입력하기 ›</button>
          </div>
        )}

        {/* 1온이면 필드샷이 없다 — 필드샷 탭을 눌러 본 경우를 위한 안내 */}
        {teeReady && stage === 'field' && hole.par > 3 && playerScore.teeGIR && (
          <div data-role="field-empty" style={{ padding:'22px 16px', textAlign:'center', borderBottom:'1px solid #e5e8eb' }}>
            <span style={{ fontSize:14, color:'#4e5968', lineHeight:1.6 }}>티샷으로 그린에 올려서 필드샷이 없어요 · 퍼팅 탭에서 이어 입력하세요</span>
          </div>
        )}

        {teeReady && stage === 'field' && !playerScore.teeGIR && <>
        {/* ── 세컨샷 아코디언 헤더 ── */}
        <button onClick={() => setSecondShotExpanded(v => !v)} style={{ width:'100%', display:'flex', alignItems:'center', gap:8, minHeight:44, padding:'12px 16px 8px', background:'none', border:'none', cursor:'pointer', borderBottom: secondShotExpanded || penaltyAt(playerScore, 1) ? 'none' : '1px solid #e5e8eb' }}>
          {(() => {
            const st = turnState('second', !!playerScore.secondClub || playerScore.gir != null || extraShots.length > 0);
            const h = HDR[st];
            return (<>
          <div style={{ height:1, flex:1, background: h.line }} />
          <span style={{ fontSize:14, fontWeight:800, color: h.label, letterSpacing:'0', flexShrink:0 }}>{st === 'done' && '✓ '}{secondShotName}</span>
          <div style={{ height:1, flex:1, background: h.line }} />
          <span style={{ fontSize:13, color: h.arrow, flexShrink:0 }}>{secondShotExpanded ? '▲' : '▼'}</span>
          </>); })()}
        </button>
        {/* 접혀 있어도 이 샷에서 난 벌타(OB · 방식 · 이유)가 보이게 한다 — 펼쳐야만 보이면 기록했는지 알 수 없다 */}
        {!secondShotExpanded && penaltyAt(playerScore, 1) && (
          <div data-role="second-penalty-tag" style={{ padding:'0 16px 10px', textAlign:'center', fontSize:13, fontWeight:700, lineHeight:1.5, color:'#c8323a', borderBottom:'1px solid #e5e8eb' }}>{penaltyResultText(penaltyAt(playerScore, 1), 1)}</div>
        )}

        {secondShotExpanded && <>
        {/* 세컨샷 지점 — 티샷한 볼 앞. 티 지점과의 거리가 곧 티샷 거리다 */}
        <GpsShotPoint
          label={`${shotLabel(1)} 지점`}
          point={gpsPoints[1] || null}
          prevPoint={trustedPrevPoint(0)}
          prevLabel={shotLabel(0)}
          locked={gpsLocked(1)}
          lockedHint={gpsLockHint(1)}
          onOpenMap={() => setShowHoleMap(true)}
          pinPoint={gpsPin}
          onCapture={fix => setGpsPoint(1, fix)}
          onClear={() => setGpsPoint(1, null)}
        />

        {/* 남은 거리 */}
        <div style={{ padding:'8px 16px 14px', borderBottom:'1px solid #e5e8eb' }}>
          <div style={{ ...fLeft, marginBottom:10 }}>
            <span style={fIcon}>↔</span><span style={fLbl}>남은 거리</span>
            {mapDistanceTag(measuredSecond, playerScore.remainingDistance, playerScore.remainingSource,
              () => updateFields({ remainingDistance: measuredSecond, remainingAppliedM: measuredSecond, remainingSource: null, replayCopied: false }))}
            {replayTag(playerScore.replayCopied)}
          </div>
          <SwipeDistance kind="shot" value={playerScore.remainingDistance ?? null} start={defaultRemaining} min={1} max={SANE_REMAIN_M} sliderMax={SLIDER_REMAIN_M} onChange={v=>updateFields({ remainingDistance: v, remainingSource: null, replayCopied: false })} />
          {playerScore.remainingDistance != null && <div style={{ textAlign:'center', fontSize:12, color:'#4e5968', marginTop:6, letterSpacing:'0' }}>← 슬라이드로 1{unitLabel('shot')} 단위 조정 →</div>}
        </div>

        {/* 세컨샷 클럽 */}
        <ClubSelector
          icon="〽"
          label={titleShifted(playerScore, 1) ? '클럽' : '세컨샷 클럽'}
          categories={penaltyAt(playerScore, 0) ? AFTER_TEE_PENALTY_CLUBS : SECOND_CLUBS}
          value={playerScore.secondClub}
          subValue={playerScore.secondClubSub}
          onCategory={(v, hasSubs) => { updateFields({ secondClub: v, secondClubSub: null }); if (v && !hasSubs) scrollToStep('second-surface'); }}
          onSub={v => { updateField('secondClubSub', v); if (v) scrollToStep('second-surface'); }}
          stacked
          suggest={clubSuggest(1, playerScore.remainingDistance, (club, sub) => { updateFields({ secondClub: club, secondClubSub: sub }); if (club) scrollToStep('second-surface'); })}
        />

        {/* 지형 · 라이 — 샷마다 꼭 받는다 (지형은 Strokes Gained 기준선, 라이는 클럽 분석에 쓰인다). 바람은 선택 */}
        <SurfaceRow
          role="second-surface"
          value={surfaceIdOf(playerScore.secondSurface)}
          missing={infoRequired && !playerScore.secondSurface}
          suggest={secondSurfaceSuggest}
          auto={!!playerScore.secondSurfaceAuto}
          onChange={(v) => { setSecondSurface(v); if (v) scrollToStep('second-lie'); }}
        />
        <LieRow
          key={`lie-${holeIdx}-${activePlayer}`}
          role="second-lie"
          value={playerScore.terrainCondition}
          missing={infoRequired && !lieValue(playerScore.terrainCondition)}
          onChange={v => { updateField('terrainCondition', v); if (v) scrollToStep('second-result'); }}
        />
        <WindSection
          key={`wind-${holeIdx}-${activePlayer}`}
          enabled={!!playerScore.secondClub}
          direction={playerScore.windDirection} strength={playerScore.windStrength}
          onDir={v=>updateField('windDirection',v)} onStrength={v=>updateField('windStrength',v)}
          onReset={() => updateField('windDirection', null)}
        />
        {penaltyRow(1)}
        </>}

        {/* ── 세컨샷 온그린 체크 → 써드샷 이후 ── */}
        {/* 라이가 선택 입력이 되면서 다음 단계는 클럽 선택으로 연다. 라이만 있는
            과거 기록, 지도에서 샷을 추가한 경우도 그대로 보이게 한다. */}
        {(playerScore.secondClub || lieValue(playerScore.terrainCondition) || extraShots.length > 0 || playerScore.gir != null) && (<>
        <div ref={extraShotTopRef} style={{ scrollMarginTop: 72 }} />

        {/* 세컨샷 GIR (Par 4+). 파5 이상은 세컨샷 뒤 온그린이 GIR이
            아니라 2온이다 — 레이업을 'GIR 실패'로 누르게 하지 않도록 이름을 바꾼다.
            (GIR 값은 홀 확정 때 타수로 다시 계산된다)
            '실패'로 써드샷이 생긴 뒤에도 이 줄은 남겨 둔다 — 그린에 가 보니 온이었을 때 '성공'으로 고치면
            써드샷 이후가 지워진다. 세컨샷 벌타로 생긴 써드샷은 그린에 못 간 것이 맞으므로 줄을 숨긴다. */}
        {hole.par > 3 && (extraShots.length === 0 || !penaltyAt(playerScore, 1)) && (
          <div data-role="second-result" data-step="second-result" style={{ ...fRow, animation:'fadeIn 0.18s ease-out', scrollMarginTop: 72 }}>
            <div style={fLeft}><span style={fIcon}>⚑</span><span style={fLbl}>{penaltyAt(playerScore, 0) ? '온그린' : hole.par >= 5 ? '2온' : 'GIR'}</span></div>
            <div style={{ display:'flex', gap:6, flex:1 }}>
              <button data-role="second-result-on" style={{ ...fChipWide, flex:1, padding:'10px 8px', ...(playerScore.onGreen===true || (playerScore.gir===true && !playerScore.girAuto && playerScore.onGreen!=='chip-in') ? { border:'2px solid #0a7f3f', color:'#0a7f3f' } : {}) }}
                onClick={()=>{ updateFields({ ...fieldsWithoutShotsAfter(1), gir: true, girAuto: false, onGreen: true }); setStage('putt'); }}>성공</button>
              <button data-role="second-result-miss" style={{ ...fChipWide, flex:1, padding:'10px 8px', ...(playerScore.gir===false || (extraShots.length > 0 && playerScore.onGreen !== true) ? { border:'2px solid #c8323a', color:'#c8323a' } : {}) }}
                onClick={()=>{
                  if (extraShots.length > 0) { setExpandedExtraShot(0); return; }   // 이미 실패 — 써드샷을 또 만들지 않고 그 샷을 연다
                  setSecondShotExpanded(false); addExtraShot(hole.par >= 5 ? { onGreen: null } : { gir: false, girAuto: false, onGreen: null });
                }}>실패</button>
              <button style={{ ...fChipWide, flex:1, padding:'10px 8px', ...(playerScore.onGreen==='chip-in' ? { border:'2px solid #1b64da', color:'#1b64da' } : {}) }}
                onClick={secondShotChipIn}>칩인</button>
            </div>
          </div>
        )}

        {/* 세컨샷 온그린 (Par 3) — 파4·5와 같다: '실패' 뒤에도 남겨 두고, '성공'으로 고치면 써드샷 이후를 지운다 */}
        {hole.par === 3 && (extraShots.length === 0 || !penaltyAt(playerScore, 1)) && (
          <div data-role="second-result" data-step="second-result" style={{ ...fRow, animation:'fadeIn 0.18s ease-out', scrollMarginTop: 72 }}>
            <div style={fLeft}><span style={fIcon}>⚑</span><span style={fLbl}>온그린</span></div>
            <div style={{ display:'flex', gap:6, flex:1 }}>
              <button data-role="second-result-on" style={{ ...fChipWide, flex:1, padding:'10px 8px', ...(playerScore.onGreen===true ? { border:'2px solid #0a7f3f', color:'#0a7f3f' } : {}) }}
                onClick={()=>{ updateFields({ ...fieldsWithoutShotsAfter(1), onGreen: true }); setStage('putt'); }}>성공</button>
              <button data-role="second-result-miss" style={{ ...fChipWide, flex:1, padding:'10px 8px', ...(playerScore.onGreen===false || (extraShots.length > 0 && playerScore.onGreen !== true) ? { border:'2px solid #c8323a', color:'#c8323a' } : {}) }}
                onClick={()=>{
                  if (extraShots.length > 0) { setExpandedExtraShot(0); return; }
                  setSecondShotExpanded(false); addExtraShot({ onGreen: false });
                }}>실패</button>
              <button style={{ ...fChipWide, flex:1, padding:'10px 8px', ...(playerScore.onGreen==='chip-in' ? { border:'2px solid #1b64da', color:'#1b64da' } : {}) }}
                onClick={secondShotChipIn}>칩인</button>
            </div>
          </div>
        )}

        {/* 그린을 놓쳤으면 어느 쪽으로 빠졌는지 — 선택 입력(안 눌러도 넘어간다). 같은 칩을 다시 누르면 해제 */}
        {greenMissed(playerScore, hole.par) && !penaltyAt(playerScore, hole.par - 3) && (
          // 칩 4개가 한 줄에 들어가도록 라벨을 윗줄에 둔다 (다른 행처럼 왼쪽 라벨 130px 를 쓰면 390px 폭에서 넘친다)
          <div data-role="green-miss" style={{ padding:'10px 16px 12px', borderBottom:'1px solid #e5e8eb', animation:'fadeIn 0.18s ease-out' }}>
            <div style={{ ...fLeft, minWidth:0, marginBottom:8 }}><span style={fIcon}>⊙</span><span style={fLbl}>놓친 방향</span></div>
            <div style={{ display:'flex', gap:6 }}>
              {GREEN_MISS_DIRS.map(d => {
                const on = playerScore.greenMiss === d.id;
                return (
                  <button key={d.id} aria-pressed={on}
                    style={{ ...fChipWide, flex:1, minWidth:0, padding:'10px 2px', ...(on ? { border:'2px solid #c8323a', color:'#c8323a' } : {}) }}
                    onClick={() => updateField('greenMiss', on ? null : d.id)}>{d.label}</button>
                );
              })}
            </div>
          </div>
        )}

        {/* 써드샷 / 네번째 샷 / ... 아코디언 */}
        {extraShots.map((shot, idx) => {
          const isExtraOpen = expandedExtraShot === idx;
          const extraDone = shot.onGreen != null;
          const exState = turnState(idx, extraDone);
          const exHdr = HDR[exState];
          return (
            <React.Fragment key={idx}>
              {/* 아코디언 헤더 */}
              <button
                onClick={() => setExpandedExtraShot(isExtraOpen ? -1 : idx)}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:8, minHeight:44, padding:'12px 16px 8px', background:'none', border:'none', cursor:'pointer', borderBottom: isExtraOpen || penaltyAt(playerScore, idx + 2) ? 'none' : '1px solid #e5e8eb' }}
              >
                <div style={{ height:1, flex:1, background: exHdr.line }} />
                <span style={{ fontSize:14, fontWeight:800, color: exHdr.label, letterSpacing:'0', flexShrink:0 }}>
                  {exState === 'done' && '✓ '}{extraShotName(idx)}
                </span>
                <div style={{ height:1, flex:1, background: exHdr.line }} />
                <span style={{ fontSize:13, color: exHdr.arrow, flexShrink:0 }}>{isExtraOpen ? '▲' : '▼'}</span>
              </button>
              {!isExtraOpen && penaltyAt(playerScore, idx + 2) && (
                <div data-role={`extra-penalty-tag-${idx}`} style={{ padding:'0 16px 10px', textAlign:'center', fontSize:13, fontWeight:700, lineHeight:1.5, color:'#c8323a', borderBottom:'1px solid #e5e8eb' }}>{penaltyResultText(penaltyAt(playerScore, idx + 2), idx + 2)}</div>
              )}

              {isExtraOpen && (<>
                {/* 이 샷을 치는 지점 — 직전 지점과의 거리가 직전 샷의 거리다 */}
                <GpsShotPoint
                  label={`${extraShotName(idx)} 지점`}
                  point={gpsPoints[idx + 2] || null}
                  prevPoint={trustedPrevPoint(idx + 1)}
                  prevLabel={shotLabel(idx + 1)}
                  locked={gpsLocked(idx + 2)}
                  lockedHint={gpsLockHint(idx + 2)}
                  onOpenMap={() => setShowHoleMap(true)}
                  pinPoint={gpsPin}
                  onCapture={fix => setGpsPoint(idx + 2, fix)}
                  onClear={() => setGpsPoint(idx + 2, null)}
                />

                {/* 남은 거리 */}
                <div style={{ padding:'8px 16px 14px', borderBottom:'1px solid #e5e8eb' }}>
                  <div style={{ ...fLeft, marginBottom:10 }}>
                    <span style={fIcon}>↔</span><span style={fLbl}>남은 거리</span>
                    {mapDistanceTag(measuredExtra(idx), shot.remainingDistance, shot.remainingSource,
                      () => updateExtraShot(idx, { remainingDistance: measuredExtra(idx), remainingAppliedM: measuredExtra(idx), remainingSource: null, replayCopied: false }))}
                    {replayTag(shot.replayCopied)}
                  </div>
                  <SwipeDistance kind="shot" value={shot.remainingDistance ?? null} start={extraStartDistance(idx)} min={1} max={SANE_REMAIN_M} sliderMax={SLIDER_REMAIN_M} onChange={v => updateExtraShot(idx, { remainingDistance: v, remainingSource: null, replayCopied: false })} />
                  {shot.remainingDistance != null && <div style={{ textAlign:'center', fontSize:12, color:'#4e5968', marginTop:6, letterSpacing:'0' }}>← 슬라이드로 1{unitLabel('shot')} 단위 조정 →</div>}
                </div>

                {/* 클럽 */}
                <ClubSelector
                  icon="〽" label="클럽" categories={SECOND_CLUBS}
                  value={shot.club} subValue={shot.subClub}
                  onCategory={(v, hasSubs) => { updateExtraShot(idx, { club: v, subClub: null }); if (v && !hasSubs) scrollToStep(`extra-surface-${idx}`); }}
                  onSub={v => { updateExtraShot(idx, { subClub: v }); if (v) scrollToStep(`extra-surface-${idx}`); }}
                  stacked
                  suggest={clubSuggest(idx + 2, shot.remainingDistance, (club, sub) => { updateExtraShot(idx, { club, subClub: sub }); if (club) scrollToStep(`extra-surface-${idx}`); })}
                />

                {/* 지형 · 라이 — 샷마다 꼭 받는다. 바람은 선택 */}
                <SurfaceRow
                  role={`extra-surface-${idx}`}
                  value={surfaceIdOf(shot.surface)}
                  missing={infoRequired && !shot.surface}
                  onChange={v => { updateExtraShot(idx, { surface: v }); if (v) scrollToStep(`extra-lie-${idx}`); }}
                />
                <LieRow
                  key={`lie-${holeIdx}-${activePlayer}-${idx}`}
                  role={`extra-lie-${idx}`}
                  value={shot.lie}
                  missing={infoRequired && !lieValue(shot.lie)}
                  onChange={v => { updateExtraShot(idx, { lie: v }); if (v) scrollToStep(`extra-result-${idx}`); }}
                />
                <WindSection
                  key={`wind-${holeIdx}-${activePlayer}-${idx}`}
                  enabled={!!shot.club}
                  direction={shot.windDirection} strength={shot.windStrength}
                  onDir={v => updateExtraShot(idx, { windDirection: v })}
                  onStrength={v => updateExtraShot(idx, { windStrength: v })}
                  onReset={() => updateExtraShot(idx, { windDirection: null })}
                />

                {/* 온그린 성공 / 실패 / 칩인 — 세컨샷처럼 클럽 없이도 고를 수 있다 */}
                <div data-step={`extra-result-${idx}`} style={{ ...fRow, animation:'fadeIn 0.18s ease-out', scrollMarginTop: 72 }}>
                  <div style={fLeft}><span style={fIcon}>⚑</span><span style={fLbl}>온그린</span></div>
                  <div style={{ display:'flex', gap:6, flex:1 }}>
                    <button
                      style={{ ...fChipWide, flex:1, padding:'10px 8px', ...(shot.onGreen===true ? { border:'2px solid #0a7f3f', color:'#0a7f3f' } : {}) }}
                      onClick={() => {
                        // 이 샷이 그린에 올라갔으면 뒤에 기록된 샷은 있을 수 없다 — '실패'를
                        // 잘못 눌러 생긴 샷이 남아 타수에 더해지지 않게 그 샷과 GPS 지점을 지운다.
                        updateFields({
                          extraShots: extraShots.slice(0, idx + 1).map((s, i) => i === idx ? { ...s, onGreen: true } : s),
                          gpsPoints: gpsPoints.slice(0, idx + 3),
                        });
                        setStage('putt');
                      }}>성공</button>
                    <button
                      style={{ ...fChipWide, flex:1, padding:'10px 8px', ...(shot.onGreen===false ? { border:'2px solid #c8323a', color:'#c8323a' } : {}) }}
                      onClick={() => {
                        const updated = extraShots.map((s, i) => i === idx ? { ...s, onGreen: false } : s);
                        // 뒤에 이미 샷이 기록돼 있으면 그게 곧 이 샷의 후속타다.
                        // 여기서 또 만들면 항상 맨 뒤에 붙어서, 써드샷 실패를 눌렀는데
                        // 여섯 번째 샷이 생기는 식으로 샷 순번이 어긋난다.
                        if (idx < extraShots.length - 1) {
                          updateField('extraShots', updated);
                          setExpandedExtraShot(idx + 1);
                          return;
                        }
                        const newShot = { club:null, subClub:null, lie:[], surface:null, remainingDistance: null, windDirection:null, windStrength:null, onGreen:null };
                        updateField('extraShots', [...updated, newShot]);
                        setExpandedExtraShot(extraShots.length);
                      }}>실패</button>
                    <button
                      style={{ ...fChipWide, flex:1, padding:'10px 8px', ...(shot.onGreen==='chip-in' ? { border:'2px solid #1b64da', color:'#1b64da' } : {}) }}
                      onClick={() => {
                        // 칩인 뒤에 기록된 샷도 함께 지운다 (위 '성공'과 같은 이유)
                        const updatedShots = extraShots.slice(0, idx + 1).map((s, i) => i === idx ? { ...s, onGreen: 'chip-in' } : s);
                        const freshPlayerScore = { ...playerScore, extraShots: updatedShots, gpsPoints: gpsPoints.slice(0, idx + 3), putts: 0 };
                        const manual = !!playerScore.strokesManual;   // 직접 고친 스코어가 우선
                        const freshStrokes = manual ? playerScore.strokes : calcAutoStrokes(freshPlayerScore, hole.par);
                        const freshScore = { ...freshPlayerScore, strokes: freshStrokes, puttDetails: [], offGreen: [], touched: true, strokesManual: manual };
                        triggerChipIn(freshScore);
                      }}>칩인</button>
                  </div>
                </div>

                {penaltyRow(idx + 2)}

                {/* 삭제 */}
                <div style={{ padding:'6px 16px 10px', borderBottom:'1px solid #e5e8eb' }}>
                  <button
                    style={{ width:'100%', padding:'8px', borderRadius: 10, border:'1px solid rgba(200,50,58,0.25)', background:'transparent', color:'rgba(200,50,58,0.5)', fontSize:13, fontWeight:600, cursor:'pointer' }}
                    onClick={() => removeExtraShot(idx)}>✕ {extraShotName(idx)} 이후 삭제</button>
                </div>
              </>)}
            </React.Fragment>
          );
        })}
        </>)}

        </>}

        {/* ── 그린 밖으로 나간 퍼트 뒤의 칩 — 필드샷이므로 클럽과 온그린 결과를 여기서 받는다 ── */}
        {teeReady && stage === 'field' && offGreenList.length > 0 && (<>
          <div ref={offGreenTopRef} data-role="off-green-section" style={{ scrollMarginTop: 72 }} />
          {offGreenList.map((chip, idx) => {
            const chain = offGreenList.filter(r => r.after === chip.after);
            const nth = chain.indexOf(chip) + 1;
            const openIdx = expandedOffGreen != null ? expandedOffGreen : offGreenDefaultOpen;
            const isOpen = openIdx === idx;
            const hdr = HDR[chip.onGreen != null ? 'done' : 'active'];
            const title = `${chip.after + 1}번째 퍼트 뒤 칩${chain.length > 1 ? ` ${nth}` : ''}`;
            return (
              <React.Fragment key={`og-${chip.after}-${nth}`}>
                <button
                  data-role="off-green-header"
                  onClick={() => setExpandedOffGreen(isOpen ? -1 : idx)}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:8, minHeight:44, padding:'12px 16px 8px', background:'none', border:'none', cursor:'pointer', borderBottom: isOpen ? 'none' : '1px solid #e5e8eb' }}
                >
                  <div style={{ height:1, flex:1, background: hdr.line }} />
                  <span style={{ fontSize:14, fontWeight:800, color: hdr.label, letterSpacing:'0', flexShrink:0 }}>
                    {chip.onGreen != null && '✓ '}{title}
                  </span>
                  <div style={{ height:1, flex:1, background: hdr.line }} />
                  <span style={{ fontSize:13, color: hdr.arrow, flexShrink:0 }}>{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div data-role="off-green-card">
                    <div style={{ padding:'0 16px 6px', fontSize:13, color:'#4e5968', lineHeight:1.5 }}>
                      퍼트가 그린 밖으로 나간 뒤 친 칩 — 스코어에는 +1타, 퍼팅 수에는 들어가지 않아요
                    </div>

                    {/* 남은 거리 — 칩을 치는 자리에서 핀까지. 선택 입력(비워 둬도 된다) */}
                    <div data-role="off-green-distance" style={{ padding:'8px 16px 14px', borderBottom:'1px solid #e5e8eb' }}>
                      <div style={{ ...fLeft, marginBottom:10 }}><span style={fIcon}>↔</span><span style={fLbl}>남은 거리</span></div>
                      <SwipeDistance kind="shot" value={chip.remainingDistance ?? null} start={OFF_GREEN_START_M} min={1} max={OFF_GREEN_MAX_M} sliderMax={OFF_GREEN_MAX_M}
                        onChange={v => updateOffGreenShot(idx, { remainingDistance: v })} />
                    </div>

                    <ClubSelector
                      icon="〽" label="클럽" categories={OFF_GREEN_CLUBS}
                      value={chip.club} subValue={chip.subClub}
                      onCategory={v => updateOffGreenShot(idx, { club: v, subClub: null })}
                      onSub={v => updateOffGreenShot(idx, { subClub: v })}
                      stacked
                    />

                    {/* 지형 — 프린지는 페어웨이에 들어간다. 선택 입력 */}
                    <SurfaceRow
                      role={`off-green-surface-${idx}`}
                      value={surfaceIdOf(chip.surface)}
                      missing={false}
                      onChange={v => updateOffGreenShot(idx, { surface: v })}
                    />

                    {/* 온그린 성공 / 실패 / 칩인 — 클럽 없이도 고를 수 있다 */}
                    <div style={{ ...fRow, animation:'fadeIn 0.18s ease-out' }}>
                      <div style={fLeft}><span style={fIcon}>⚑</span><span style={fLbl}>온그린</span></div>
                      <div style={{ display:'flex', gap:6, flex:1 }}>
                        <button
                          style={{ ...fChipWide, flex:1, padding:'10px 8px', ...(chip.onGreen===true ? { border:'2px solid #0a7f3f', color:'#0a7f3f' } : {}) }}
                          onClick={() => offGreenLanded(idx)}>성공</button>
                        <button
                          style={{ ...fChipWide, flex:1, padding:'10px 8px', ...(chip.onGreen===false ? { border:'2px solid #c8323a', color:'#c8323a' } : {}) }}
                          onClick={() => offGreenMissed(idx)}>실패</button>
                        <button
                          style={{ ...fChipWide, flex:1, padding:'10px 8px', ...(chip.onGreen==='chip-in' ? { border:'2px solid #1b64da', color:'#1b64da' } : {}) }}
                          onClick={() => { if (chip.onGreen !== 'chip-in') offGreenHoledAt(idx); }}>칩인</button>
                      </div>
                    </div>

                    <div style={{ padding:'6px 16px 10px', borderBottom:'1px solid #e5e8eb' }}>
                      <button
                        style={{ width:'100%', padding:'8px', borderRadius: 10, border:'1px solid rgba(200,50,58,0.25)', background:'transparent', color:'rgba(200,50,58,0.5)', fontSize:13, fontWeight:600, cursor:'pointer' }}
                        onClick={() => removeOffGreenShot(idx)}>✕ {title} 삭제</button>
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </>)}

        {teeReady && stage === 'putt' && <>

        {/* ── 그린 ── */}
        {secHdr('그 린', null, turnState('green', !!playerScore.onGreenLanding))}

        {/* 그날의 그린 스피드 — 탭하면 바꿀 수 있다. 인사이트·리포트의 퍼팅 분석에 쓰인다 */}
        {round.players.length === 1 && (
          <button
            data-role="green-speed-bar"
            onClick={() => { setSpeedDraft(roundSpeed); setShowGreenSpeed(true); }}
            style={{ ...fRow, width:'100%', background:'none', border:'none', borderBottom:'1px solid #e5e8eb', cursor:'pointer', textAlign:'left' }}
          >
            <div style={fLeft}><span style={fIcon}>≋</span><span style={fLbl}>그린 스피드</span></div>
            <span style={{ fontSize:14, fontWeight:700, color: roundSpeed != null ? '#191f28' : '#1b64da' }}>
              {roundSpeed != null ? speedLabel(roundSpeed, readSpeedUnit()) : '설정하기'} ›
            </span>
          </button>
        )}

        {/* 그린 도착 지점 — 마지막 필드샷의 거리가 여기서 확정된다.
            퍼팅 거리는 GPS 오차(두 점 합성 ±5~10m)보다 짧아 측정 대상이 아니다. */}
        <GpsShotPoint
          label={finalPointLabel}
          point={gpsGreen}
          prevPoint={trustedPrevPoint(fieldShots - 1)}
          prevLabel={shotLabel(fieldShots - 1)}
          locked={gpsLocked(fieldShots)}
          lockedHint={gpsLockHint(fieldShots)}
          onOpenMap={() => setShowHoleMap(true)}
          pinPoint={gpsPin}
          onCapture={setGpsGreen}
          onClear={() => setGpsGreen(null)}
        />

        {/* 핀 위치 - PAR4+ 전용 (PAR3는 티샷에서 입력). 선택 입력 */}
        {/* 온그린 성공 뒤 맨 먼저 화면이 오는 자리. 고른 뒤에도 접지 않고 펼쳐 두고, 고르면 온그린 랜딩 방향으로 옮긴다. */}
        {hole.par > 3 && (
        <div ref={pinTopRef} data-role="pin-position" data-step="putt-pin" style={{ padding:'8px 16px 4px', borderBottom:'1px solid #e5e8eb', scrollMarginTop: 72 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <span style={fIcon}>📍</span><span style={fLbl}>핀 위치</span><span style={{ fontSize:12, color:'#4e5968' }}>선택 입력</span>
          </div>
          <RadialPicker centerId="center" centerLabel="센터" dirs={PIN_DIRS} alwaysOpen
            value={Array.isArray(playerScore.pinPosition) ? playerScore.pinPosition[0] : playerScore.pinPosition}
            onChange={v => { updateField('pinPosition', v); if (v) scrollToStep('putt-landing'); }}
          />
        </div>
        )}

        {/* 온그린 랜딩 방향 (12-clock) — 선택 입력. 그린 어프로치 분석에 쓰이고, 비워 두어도 퍼팅 입력은 열려 있다.
            늘 펼쳐서 보여 준다 (값이 있어도) — 펼치려고 한 번 더 누르는 게 불편하다고 해서. 고르면 화면만 아래 퍼팅 입력으로 옮긴다. */}
        <div ref={landingTopRef} data-role="landing-top" data-step="putt-landing" style={{ scrollMarginTop: 64 }}>
          <OptionalSection
            key={`landing-${holeIdx}-${activePlayer}`}
            icon="⊙" label="온그린 랜딩 방향" enabled hint={null}
            defaultOpen
            summary={playerScore.onGreenLanding ? `${playerScore.onGreenLanding}시 방향` : ''}
          >
            {() => (
              <LandingWheel value={playerScore.onGreenLanding} onChange={v=>{ updateField('onGreenLanding',v); if(v) scrollToPutting(); }} />
            )}
          </OptionalSection>
        </div>

        {/* 퍼팅 상세 */}
        <div ref={puttTopRef} data-role="putting-top" data-step="putt-top" style={{ scrollMarginTop: 64 }} />
        {secHdr('퍼 팅', null, turnState('putt', false))}

        {playerScore.putts > 0 && (<>

          {/* 퍼팅별 상세 (아코디언) — 결과 버튼 줄(PUTT_BAR)이 이 상자 안에서 화면 아래에 붙는다 */}
          <div data-role="putt-cards">
          {puttDetails.slice(0, puttVisibleCount).map((putt, puttIdx) => {
            const isOpen = expandedPutt === puttIdx;
            return (
              <React.Fragment key={puttIdx}>
                {/* 아코디언 헤더 */}
                <button
                  data-step={`putt-card-${puttIdx}`}
                  onClick={() => { const next = isOpen ? -1 : puttIdx; setExpandedPutt(next); if (next >= 0) scrollToStep(`putt-card-${puttIdx}`); }}
                  style={{
                    width:'100%', display:'flex', alignItems:'center', gap:8, scrollMarginTop: 72,
                    minHeight:44, padding:'10px 16px', background:'none', border:'none', cursor:'pointer',
                    borderBottom: isOpen || puttRowText(putt) ? 'none' : '1px solid #e5e8eb',
                  }}
                >
                  {(() => { const done = !isOpen && !!putt.holein; return (<>
                    <div style={{ height:1, flex:1, background: done ? 'rgba(27,100,218,0.55)' : '#eef1f4' }} />
                    <span style={{ fontSize:13, fontWeight:700, color: isOpen || done ? '#1b64da' : '#4e5968', letterSpacing:'0' }}>
                      PUTT {puttIdx + 1}
                    </span>
                    <div style={{ height:1, flex:1, background: done ? 'rgba(27,100,218,0.55)' : '#eef1f4' }} />
                    <span style={{ fontSize:13, color: isOpen || done ? '#1b64da' : '#5b6572' }}>{isOpen ? '▲' : '▼'}</span>
                  </>); })()}
                </button>

                {/* 접힌 퍼트의 한 줄 요약 — 거리 · 라이 · 미스 방향 · 남은 거리 · 결과 */}
                {!isOpen && puttRowText(putt) && (
                  <div data-role="putt-summary" style={{ padding:'0 16px 10px', textAlign:'center', fontSize:13, lineHeight:1.5, color:'#333d4b', borderBottom:'1px solid #e5e8eb' }}>
                    {puttRowText(putt)}
                    {putt.holein === 'success' && <span style={{ color:'#0a7f3f', fontWeight:700 }}> · 홀인</span>}
                    {putt.holein === 'offgreen' && <span style={{ color:'#a85b00', fontWeight:700 }}> · 그린 밖</span>}
                  </div>
                )}

                {/* 펼쳐진 내용 */}
                {isOpen && (<>
                  {puttIdx > 0 && puttDetails[puttIdx - 1]?.holein !== 'offgreen' && (
                    <div style={{ display:'flex', justifyContent:'flex-end', padding:'0 16px 2px' }}>
                      <button data-role="putt-undo" onClick={() => undoPutt(puttIdx)}
                        style={{ fontSize:12, color:'#4e5968', background:'none', border:'1px solid #d1d6db', borderRadius:8, padding:'0 12px', minHeight:36, cursor:'pointer' }}>↩ 되돌리기</button>
                    </div>
                  )}

                  {/* 라이 — 선택 입력. 9개를 한눈에, 복합(S자)은 접어 둔다. 고르지 않아도 거리·결과를 바로 누를 수 있다 */}
                  <div style={{ padding:'8px 16px 12px', borderBottom:'1px solid #e5e8eb' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                      <span style={fIcon}>〜</span><span style={fLbl}>라이</span>
                      {lieIdOf(putt.lie) == null && <span style={{ fontSize:12, color:'#4e5968' }}>선택 입력</span>}
                    </div>
                    <PuttLieGrid key={`lie-${holeIdx}-${activePlayer}-${puttIdx}`} value={putt.lie} onPick={(id) => { pickPuttLie(puttIdx, id); if (id) scrollToStep(`putt-distance-${puttIdx}`); }} />
                  </div>

                  <div data-step={`putt-distance-${puttIdx}`} style={{ padding:'6px 16px 12px', borderBottom:'1px solid #e5e8eb', animation:'fadeIn 0.18s ease-out', scrollMarginTop: 72 }}>
                    <div style={{ ...fLeft, marginBottom:10 }}><span style={fIcon}>↔</span><span style={fLbl}>퍼팅 거리</span></div>
                    <SwipeDistance kind="putt" value={putt.distance ?? null} start={puttDefaultDistance(puttIdx)} min={PUTT_MIN_M} max={PUTT_MAX_M} sliderMax={PUTT_MAX_M} step={PUTT_STEP_M} decimals={1} onChange={v => setPuttDistance(puttIdx, v)} />
                    {putt.distanceAuto === true && (
                      <div data-role="putt-distance-auto" style={{ textAlign:'center', fontSize:12, color:'#1b64da', marginTop:6, lineHeight:1.5 }}>직전 퍼트가 멈춘 곳에서 자동으로 넣었어요 · 다르면 고쳐 주세요</div>
                    )}
                  </div>

                  {/* 미스 위치 — 공이 멈춘 곳을 탭하면 롱·숏, 좌·우, 하이·로우사이드와 남은 거리가 정해진다 (선택 입력) */}
                  <div data-role="putt-miss" style={{ padding:'8px 16px 12px', borderBottom:'1px solid #e5e8eb' }}>
                    <PuttBoard
                      key={`board-${holeIdx}-${activePlayer}-${puttIdx}`}
                      distance={putt.distance ?? null} order={puttIdx + 1} brk={lieShape(putt.lie)} frame={puttFrame(puttIdx)}
                      miss={putt.miss ?? null} prevStops={prevStopsOf(puttIdx)}
                      onChange={(m) => placeMiss(puttIdx, m)} onHoleIn={() => holeOutAt(puttIdx)}
                    />
                  </div>

                  {/* 그린 밖 — 칩으로 이어진다. 자주 쓰지 않아 카드 안에 두고, 결과 버튼만 아래에 붙인다 */}
                  <div style={{ padding:'8px 16px 12px' }}>
                    <button type="button" data-role="off-green" onClick={() => markOffGreen(puttIdx)}
                      style={{ ...fChipWide, width:'100%', padding:'12px 0', ...(putt.holein === 'offgreen' ? { border:'2px solid #a85b00', color:'#a85b00' } : {}) }}>
                      {putt.holein === 'offgreen' ? '✓ 그린 밖으로 나갔어요 (다시 누르면 취소)' : '그린 밖으로 나갔어요'}
                    </button>
                  </div>

                  {/* 결과 — 들어갔나, 다음 퍼트로 가나. 화면 아래(탭바 바로 위)에 붙어 있어 카드가 길어도 스크롤 없이 누른다 */}
                  {(() => {
                    const miss = putt.miss ?? null;
                    const tapOk = miss != null && miss.leave <= TAP_IN_MAX_M;
                    const primaryLabel = miss == null ? '홀인 성공' : `PUTT ${puttIdx + 2} 탭인 성공`;
                    const primarySub = miss == null ? '' : tapOk ? `${fmtPutt(miss.leave, { digits: 1 })} · 평지 직선으로 기록` : `${fmtPutt(TAP_IN_MAX_M)} 이하일 때만`;
                    const primaryEnabled = miss == null || tapOk;
                    const holed = putt.holein === 'success';
                    return (
                      <div data-role="putt-actions" style={PUTT_BAR}>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:10 }}>
                          <button type="button" data-role="putt-primary" disabled={!primaryEnabled} onClick={() => (miss == null ? holeOutAt(puttIdx) : tapInAt(puttIdx))}
                            style={{ minHeight:54, padding:'0 6px', borderRadius:14, border:`1.5px solid ${primaryEnabled ? '#0a7f3f' : '#d1d6db'}`, background: primaryEnabled ? (holed ? '#eaf6ee' : '#eaf6ee') : '#f2f4f6', color: primaryEnabled ? '#0a7f3f' : '#4e5968', fontFamily:'inherit', cursor: primaryEnabled ? 'pointer' : 'not-allowed', opacity: primaryEnabled ? 1 : 0.55, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:1, wordBreak:'keep-all' }}>
                            <span style={{ fontSize:16, fontWeight:900, lineHeight:1.25 }}>{holed && miss == null ? '✓ ' : ''}{primaryLabel}</span>
                            {primarySub && <span style={{ fontSize:12, fontWeight:700, lineHeight:1.25 }}>{primarySub}</span>}
                          </button>
                          <button type="button" data-role="putt-next" onClick={() => goNextPutt(puttIdx)}
                            style={{ minHeight:54, borderRadius:14, border:'1.5px solid #1b64da', background:'#1b64da', color:'#ffffff', fontFamily:'inherit', fontSize:17, fontWeight:900, cursor:'pointer' }}>
                            PUTT {puttIdx + 2} →
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </>)}

                {/* 그린 밖으로 나간 퍼트 뒤의 칩 — 요약만. 입력·수정은 필드샷 탭의 칩 카드에서 한다 */}
                {(() => {
                  const chain = offGreenList.filter(r => r.after === puttIdx);
                  if (chain.length === 0) return null;
                  const last = chain[chain.length - 1];
                  const pending = last.onGreen !== true && last.onGreen !== 'chip-in';
                  const resultText = last.onGreen === 'chip-in' ? '칩인' : last.onGreen === true ? '온그린'
                    : last.onGreen === false ? '그린 놓침' : '결과 입력 전';
                  const clubs = chain.map(offGreenClubText).filter(Boolean);
                  const firstIdx = offGreenList.findIndex(r => r.after === puttIdx);
                  const openIdx = pending ? firstIdx + chain.length - 1 : firstIdx;
                  return (
                    <div data-role="off-green-chip" style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderBottom:'1px solid #e5e8eb', background:'rgba(168,91,0,0.05)' }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:700, color:'#a85b00' }}>그린 밖 → 칩 {chain.length}타 · {resultText}</div>
                        <div style={{ fontSize:13, color:'#4e5968', marginTop:2, lineHeight:1.5 }}>
                          {clubs.length ? clubs.join(' → ') : '클럽 미입력'} · 퍼팅 수에는 들어가지 않아요
                        </div>
                        {pending && <div style={{ fontSize:13, color:'#333d4b', marginTop:2 }}>칩이 그린에 오르면 다음 퍼트를 기록해요</div>}
                      </div>
                      <button style={{ ...fChipWide, minWidth:0, padding:'8px 12px', fontSize:14, ...(pending ? { border:'2px solid #a85b00', color:'#a85b00' } : {}) }}
                        onClick={() => openOffGreenCard(openIdx)}>{pending ? '칩 결과 입력' : '수정'}</button>
                    </div>
                  );
                })()}
              </React.Fragment>
            );
          })}
          </div>

        </>)}

        {/* 퍼팅이 0개면 카드가 없다 — 빈 화면으로 두지 않고 왜 비었는지와 다음에 할 일을 알려 준다 */}
        {!(playerScore.putts > 0) && (
          <div data-role="putts-zero-note" style={{ padding:'20px 16px 24px', textAlign:'center', borderBottom:'1px solid #e5e8eb' }}>
            <div style={{ fontSize:14, color:'#333d4b', lineHeight:1.6, marginBottom: isHoledOut(playerScore) ? 0 : 14, wordBreak:'keep-all' }}>
              {isHoledOut(playerScore)
                ? '칩인(홀인원)으로 끝난 홀이라 퍼팅이 없어요'
                : '퍼팅 수가 0개예요 · 퍼팅을 했다면 아래 버튼으로 입력하세요'}
            </div>
            {!isHoledOut(playerScore) && (
              <button type="button" data-role="putts-add" onClick={() => updatePuttsCount(1)}
                style={{ ...fChipWide, minWidth:160, padding:'12px 18px', color:'#1b64da', border:'1.5px solid rgba(27,100,218,0.5)', fontSize:15, fontWeight:800 }}>퍼팅 입력하기</button>
            )}
          </div>
        )}
        </>}

      </div>}

      {/* Scoring Bottom Bar — 이전 · 다음 홀 (코스맵 · 메모는 위쪽 머리줄로 옮겼다) */}
      <div style={{ ...styles.tabBar, background: '#ffffff', borderTop: '1px solid #f2f4f6', boxShadow: 'none' }}>
        <div style={{ display: 'flex', gap: 8, padding: '12px 20px' }}>
          <button
            data-role="prev-hole"
            style={{ width: 96, height: 56, flexShrink: 0, borderRadius: 16, border: 'none', background: '#f2f4f6', color: holeIdx === 0 ? '#8b95a1' : '#4e5968', fontSize: 16, fontWeight: 700, cursor: holeIdx === 0 ? 'default' : 'pointer' }}
            onClick={() => goToHole(holeIdx - 1)}
            disabled={holeIdx === 0}
            aria-label="이전 홀"
          >이전</button>
          {isLastHole ? (
            <button data-role="finish-round" style={{ flex: 1, height: 56, borderRadius: 16, border: 'none', background: '#1b64da', color: '#ffffff', fontSize: 17, fontWeight: 700, cursor: 'pointer' }} onClick={handleFinishClick}>라운드 완료</button>
          ) : (
            <button data-role="next-hole" style={{ flex: 1, height: 56, borderRadius: 16, border: 'none', background: '#1b64da', color: '#ffffff', fontSize: 17, fontWeight: 700, cursor: 'pointer' }} onClick={handleNext}>다음 홀</button>
          )}
        </div>
      </div>

      {/* 미입력 홀 확인 모달 */}
      {pendingFinish && (
        <div style={styles.modalOverlay} onClick={() => setPendingFinish(null)}>
          <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div style={styles.modalIcon}>📝</div>
            {playedNineOf(pendingFinish) ? (
              <>
                {/* 한쪽 9홀만 입력했으면 9홀 라운드로 저장된다 (파로 채운 18홀이 아니라) — 통계에서는 빠진다 */}
                <div style={styles.modalTitle}>9홀만 입력했어요</div>
                <div style={styles.modalText} data-role="nine-finish-note">
                  그대로 완료하면 <span style={{ whiteSpace: 'nowrap' }}>9홀 라운드로</span> 저장돼요<br/>
                  스탯·인사이트에서는 제외돼요
                </div>
              </>
            ) : (
              <>
                <div style={styles.modalTitle}>입력하지 않은 홀이 있어요</div>
                <div style={styles.modalText}>
                  {pendingMissing.map(i => `${holeNoOf(round, i)}`).join(", ")}번 홀<br/>
                  그대로 완료하면 이 홀들은 <span style={{ whiteSpace: 'nowrap' }}>파(2퍼트)로</span> 저장돼요
                </div>
              </>
            )}
            <div style={styles.modalActions}>
              <button style={styles.modalBtnCancel} onClick={() => { setPendingFinish(null); goToHole(pendingMissing[0]); }}>
                {holeNoOf(round, pendingMissing[0])}번 홀 입력하러 가기
              </button>
              <button style={styles.modalBtnPrimary} onClick={() => doFinish(pendingFinish)}>{playedNineOf(pendingFinish) ? '9홀로 완료' : '그대로 완료'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 입력 없는 홀에서 '다음' 확인 모달 */}
      {pendingSkip != null && (
        <div style={styles.modalOverlay} onClick={() => setPendingSkip(null)}>
          <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div style={styles.modalIcon}>📝</div>
            <div style={styles.modalTitle}>{holeNo}번 홀 스코어를 입력하지 않았어요</div>
            <div style={styles.modalText}>
              {isSimpleMode ? '모두 파로 기록할까요?' : '파(2퍼트)로 기록할까요?'}
              {/* 위치만 찍은 홀 — 스코어는 비어 있어도 찍은 지점은 남는다는 걸 알린다 */}
              {round.players.some(p => { const sc = hole.scores[p]; return (sc?.gpsPoints || []).some(Boolean) || sc?.gpsGreen || sc?.gpsPin; }) && (
                <><br/>찍어 둔 위치(GPS)는 어느 쪽이든 그대로 남아요</>
              )}
            </div>
            <div style={styles.modalActions}>
              <button style={styles.modalBtnCancel} onClick={() => { const to = pendingSkip; setPendingSkip(null); goToHole(to); }}>
                기록하지 않고 넘어가기
              </button>
              <button style={styles.modalBtnPrimary} onClick={() => { const to = pendingSkip; setPendingSkip(null); confirmAndGoToHole(to); }}>
                파로 기록하고 다음 홀
              </button>
            </div>
            <button style={{ ...styles.modalBtnCancel, flex:'none', width:'100%', marginTop:8 }} onClick={() => setPendingSkip(null)}>취소</button>
          </div>
        </div>
      )}

      {/* 벌타 처리 방법 선택 — 구제 방식 정식 명칭(영문 병기) + 다음 샷 번호 강조 */}
      {penaltyChoice != null && (
        <div style={styles.modalOverlay} onClick={() => setPenaltyChoice(null)}>
          <div style={{ ...styles.modalCard, maxWidth: 380, padding: '20px 14px 14px', maxHeight: '92vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ ...styles.modalIcon, fontSize: 30, marginBottom: 4 }}>⚠️</div>
            <div style={styles.modalTitle}>{shotLabel(penaltyChoice.slot)} {PENALTY_LABEL[penaltyChoice.type]}</div>
            <div style={{ ...styles.modalText, marginBottom: 14, wordBreak: 'keep-all' }}>
              {penaltyChoice.type === 'ob'
                ? <>OB 처리를 어떻게 했나요?<br/>어느 쪽이든 스코어는 +2타예요 (1벌타 + 다시 친 샷)</>
                : <>어떤 구제 방식을 썼나요?<br/>어느 방식이든 1벌타(+1타)예요</>}
            </div>
            {/* 왜 벌타가 났나 — 선택 입력. 누른 뒤 구제 방식을 고르면 함께 기록된다 */}
            {asksReason(penaltyChoice.type) && (
              <div data-role="penalty-reason-ask" style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#333d4b', marginBottom: 6, textAlign: 'left' }}>어떤 미스였나요? <span style={{ fontWeight: 500, color: '#4e5968' }}>(선택)</span></div>
                <div style={{ display:'flex', gap:6 }}>
                  {PENALTY_REASONS.map((r) => (
                    <button key={r.id} type="button" aria-pressed={penaltyChoice.reason === r.id} data-role={`penalty-ask-${r.id}`}
                      style={{ ...fChip, flex:1, textAlign:'center', padding:'9px 4px', fontSize:14, borderRadius:8, ...(penaltyChoice.reason === r.id ? fChipOn : {}) }}
                      onClick={() => setPenaltyChoice((c) => ({ ...c, reason: c.reason === r.id ? null : r.id }))}>{r.label}</button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {penaltyOptions(penaltyChoice.slot, penaltyChoice.type).map((o) => (
                <button key={o.mode} style={reliefCard} onClick={() => choosePenaltyMode(o.mode)}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={reliefKoRow}>
                      <span style={reliefKo}>{o.ko}</span>
                      {o.tag && <span style={{ ...reliefChip, ...reliefChipTag }}>{o.tag}</span>}
                    </div>
                    <div style={reliefEn}>({o.en})</div>
                    <div style={reliefMeta}>
                      <span style={reliefChip}>{o.rule}</span>
                      <span style={{ ...reliefChip, ...reliefChipPen }}>{o.penalty}</span>
                    </div>
                    <div style={reliefWhere}>{o.where}</div>
                  </div>
                  <div style={reliefNext}>
                    <span style={reliefNextLabel}>다음 샷</span>
                    <span style={reliefNextNum}>{o.next}</span>
                    <span style={reliefNextUnit}>번째 샷</span>
                  </div>
                </button>
              ))}
              <button style={{ ...styles.modalBtnCancel, flex:'none', width:'100%', marginTop:2 }}
                onClick={() => setPenaltyChoice(null)}>취소</button>
            </div>
            {penaltyChoice.type === 'hazard' && (
              <div style={reliefNote}>
                노란 말뚝(옐로 페널티구역)은 측면 구제를 쓸 수 없어요 — 후방선·스트로크와 거리 구제만 가능해요.
              </div>
            )}
            {penaltyChoice.type === 'unplayable' && (
              <div style={reliefNote}>
                벙커 안에서 선언하고 벙커 밖에서 치면 2벌타예요 — 위쪽 패널티의 언플레이어블 +를 한 번 더 눌러 주세요.
              </div>
            )}
          </div>
        </div>
      )}

      {/* '다음'/'완료' 확인 — 빠진 샷 정보와 모르는 퍼팅 수를 한 창에서 */}
      {holeCheck && (
        <div style={styles.modalOverlay} onClick={() => setHoleCheck(null)}>
          <div data-role="hole-check" data-info={checkInfo ? '1' : '0'} data-putts={checkPutts ? '1' : '0'} style={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div style={styles.modalIcon}>{checkPutts && !checkInfo ? '⛳' : '📍'}</div>
            <div style={styles.modalTitle}>{checkTitle}</div>
            <div style={styles.modalText}>
              {holeNo}번 홀{checkPutts && !checkInfo ? ` · 온그린까지 ${strokesToGreen(playerScore, hole.par)}타` : ''}
              {checkInfo && (
                <>
                  <div style={{ margin: '6px 0', color: '#191f28', fontWeight: 700, lineHeight: 1.6 }}>
                    {infoGaps.map(g => (
                      <div key={g.slot} data-role="info-ask-gap">{shortShotName(g.slot)} · {g.missing.join(' · ')}</div>
                    ))}
                  </div>
                  라이·지형·거리·클럽은 Strokes Gained와<br/>클럽 분석에 쓰여요
                </>
              )}
            </div>
            {checkPutts && (
              <div data-role="putt-ask" style={{ marginBottom: 10 }}>
                {checkInfo && <div style={{ fontSize: 14, fontWeight: 800, color: '#191f28', textAlign: 'center', marginBottom: 6 }}>퍼팅을 몇 번 했나요? <span style={{ fontSize: 13, fontWeight: 500, color: '#4e5968' }}>온그린까지 {strokesToGreen(playerScore, hole.par)}타</span></div>}
                <div style={{ display:'flex', gap:6 }}>
                  {[0, 1, 2, 3, 4, 5].map(n => (
                    <button key={n} data-role={`putt-ask-${n}`}
                      style={{ flex:1, height:48, borderRadius:10, border:'1.5px solid #b0b8c1', background:'#e8ebee', color:'#191f28', fontSize:18, fontWeight:900, cursor:'pointer' }}
                      onClick={() => goOnFromCheck(n)}>{n}</button>
                  ))}
                </div>
                {checkInfo && <div style={{ fontSize: 13, color: '#4e5968', textAlign: 'center', marginTop: 6 }}>숫자를 누르면 샷 정보는 비운 채 {holeCheck.finish ? '완료' : '다음 홀로 이동'}해요</div>}
              </div>
            )}
            <div style={styles.modalActions}>
              {checkInfo && !checkPutts && <button style={styles.modalBtnCancel} onClick={() => goOnFromCheck()}>{holeCheck.finish ? '그대로 완료' : '그대로 다음 홀'}</button>}
              {checkInfo && checkPutts && <button style={styles.modalBtnCancel} onClick={() => setHoleCheck(null)}>취소</button>}
              {checkInfo && <button data-role="info-ask-fill" style={styles.modalBtnPrimary} onClick={() => goFillShotInfo(infoGaps[0])}>입력하러 가기</button>}
              {!checkInfo && <button style={styles.modalBtnCancel} onClick={() => setHoleCheck(null)}>취소</button>}
            </div>
          </div>
        </div>
      )}

      {/* 라운드 그만두기 확인 — 라운드 수정(연필) 창의 "라운드 그만두기"에서 연다 */}
      {showExitConfirm && (
        <div style={styles.modalOverlay} onClick={()=>setShowExitConfirm(false)}>
          <div data-role="quit-confirm" style={styles.modalCard} onClick={e=>e.stopPropagation()}>
            <div style={styles.modalIcon}>⚠️</div>
            <div style={styles.modalTitle}>라운드를 그만두시겠어요?</div>
            <div style={styles.modalText}>
              {hasProgress
                ? <>아래 두 버튼은 지금까지 입력한<br/>이 라운드 기록을 <b style={{ color:'#c8323a' }}>삭제</b>해요</>
                : <>아직 입력한 스코어는 없어요<br/>아래 두 버튼은 이 라운드 세팅을 지워요</>}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <button style={styles.modalBtnCancel} onClick={()=>setShowExitConfirm(false)}>계속 기록하기</button>
              <button style={styles.modalBtnCancel} onClick={()=>{ setShowExitConfirm(false); onGoHome(); }}>기록 유지하고 홈으로</button>
              <button style={styles.modalBtnPrimary} onClick={()=>{ setShowExitConfirm(false); onGoToSetup(); }}>삭제하고 세팅 다시하기</button>
              <button style={styles.modalBtnConfirm} onClick={()=>{ setShowExitConfirm(false); onExit(); }}>삭제하고 나가기</button>
            </div>
          </div>
        </div>
      )}

      {/* 홀인 성공 모달 */}
      {showHoleInModal && holeInModalData && (
        <div style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(25,31,40,0.55)', animation:'modalFadeIn 0.25s ease-out' }}>
          <div style={{ animation:'modalSlideUp 0.38s cubic-bezier(0.16,1,0.3,1)', display:'flex', flexDirection:'column', alignItems:'center', gap:14, padding:'36px 44px', borderRadius:20, background:'rgba(255,255,255,0.97)', border:`1.5px solid ${holeInModalData.scoreName?.color ? holeInModalData.scoreName.color + '55' : 'rgba(27,100,218,0.35)'}`, boxShadow:'0 8px 48px rgba(0,0,0,0.227)', minWidth:220, textAlign:'center' }}>
            <div style={{ fontSize:32 }}>⛳</div>
            <div style={{ fontSize:14, fontWeight:700, color:'#4e5968', letterSpacing:'0', textTransform:'none' }}>홀인 성공</div>
            <div style={{ fontSize:26, fontWeight:900, color: holeInModalData.scoreName?.color || '#1b64da', letterSpacing:'0.04em' }}>
              {holeInModalData.scoreName?.name || `${holeInModalData.strokes}타`}
            </div>
            <div style={{ width:40, height:1, background:'rgba(25,31,40,0.08)' }} />
            <div style={{ fontSize:15, fontWeight:600, color:'#333d4b', letterSpacing:'0' }}>
              {holeInModalData.onCount} 온 &nbsp;/&nbsp; {holeInModalData.putts} 펏
            </div>
            <div style={{ fontSize:13, color:'#4e5968', letterSpacing:'0', marginTop:4 }}>
              {holeInModalData.isLastHole ? '라운드 완료!' : '다음 홀로 이동해요.'}
            </div>
            <button
              onClick={cancelHoleIn}
              style={{ marginTop:6, padding:'10px 22px', borderRadius:9, border:'1px solid #b0b8c1', background:'transparent', color:'#333d4b', fontSize:14, fontWeight:700, cursor:'pointer' }}
            >취소 (잘못 눌렀어요)</button>
          </div>
        </div>
      )}

      {/* 라운드 수정 모달 — 파 · 그린 스피드 */}
      {showParEditModal && (
        <div style={styles.modalOverlay} onClick={()=>setShowParEditModal(false)}>
          <div style={{ ...styles.modalCard, maxWidth:400, width:'calc(100% - 32px)', padding:'20px 16px 24px', maxHeight:'90vh', overflowY:'auto' }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ fontSize:17, fontWeight:700, color:'#191f28' }}>라운드 수정</div>
              <button style={{ background:'none', border:'none', color:'#4e5968', cursor:'pointer', padding:4 }} onClick={()=>setShowParEditModal(false)}><X size={18} /></button>
            </div>
            <div style={{ fontSize:15, fontWeight:800, color:'#191f28', marginBottom:8, textAlign:'left' }}>파</div>
            <div style={{ ...styles.parSummary, marginBottom:12 }}>
              <div style={styles.parSummaryMain}><div style={styles.parSummaryLabel}>전체 파</div><div style={styles.parSummaryValue}>{parDraft.reduce((a,b)=>a+b,0)}</div></div>
              {nines.length > 1 && (<>
                <div style={styles.parSummaryDivider} />
                <div style={styles.parSummaryNines}>
                  {nines.map(n => (
                    <div key={n.key} style={styles.parSummaryNineRow}><span style={styles.parSummaryNineLabel}>{n.label}</span><span style={styles.parSummaryNineValue}>{n.holes.reduce((a,x)=>a+parDraft[x.index],0)}</span></div>
                  ))}
                </div>
              </>)}
            </div>
            <ParTable pars={parDraft} groups={nines.map(n => ({ label:n.label, start:n.holes[0].index, end:n.holes[n.holes.length-1].index+1 }))} holeNo={(i) => holeNoOf(round, i)} onSetPar={updateParDraft} markHole={holeIdx} />
            <div style={{ fontSize:13, color:'#4e5968', marginTop:10, marginBottom:16, lineHeight:1.5 }}>* 이미 입력된 홀의 스코어는 유지돼요.<br/>* 미입력 홀은 변경된 파 기준으로 초기화돼요.</div>
            {round.players.length === 1 && (
              <div data-role="edit-green-speed" style={{ borderTop:'1px solid #e5e8eb', paddingTop:14, marginBottom:16 }}>
                <div style={{ fontSize:15, fontWeight:800, color:'#191f28', marginBottom:4, textAlign:'left' }}>그린 스피드</div>
                <div style={{ fontSize:13, color:'#4e5968', lineHeight:1.5, marginBottom:12, wordBreak:'keep-all', textAlign:'left' }}>그린이 달라졌거나 단위(미터·피트)를 바꾸고 싶을 때 여기서 바꿔요. 퍼팅 분석에 반영돼요</div>
                <GreenSpeedPicker value={parEditSpeed} onChange={setParEditSpeed} />
              </div>
            )}
            <div style={{ display:'flex', gap:8 }}>
              <button style={{ ...styles.modalBtnCancel, flex:1 }} onClick={()=>setShowParEditModal(false)}>취소</button>
              <button style={{ ...styles.memoSaveBtn, flex:2 }} onClick={saveParEdit}>저장</button>
            </div>
            {/* 라운드 그만두기 — 기록 삭제 · 세팅 다시하기는 여기서만 연다 (머리줄 왼쪽은 바로 홈으로 가는 버튼) */}
            <div data-role="quit-section" style={{ borderTop:'1px solid #e5e8eb', marginTop:20, paddingTop:14, textAlign:'left' }}>
              <button type="button" data-role="quit-round"
                style={{ width:'100%', minHeight:48, borderRadius:12, border:'1.5px solid rgba(200,50,58,0.5)', background:'transparent', color:'#c8323a', fontSize:15, fontWeight:700, cursor:'pointer' }}
                onClick={() => { setShowParEditModal(false); setShowExitConfirm(true); }}>라운드 그만두기</button>
              <div style={{ fontSize:13, color:'#4e5968', marginTop:6, lineHeight:1.5, wordBreak:'keep-all' }}>이 라운드를 지우고 나가거나, 세팅부터 다시 할 수 있어요. 잠깐 홈에 다녀올 때는 왼쪽 위 홈 버튼을 쓰면 기록이 그대로 남아요.</div>
            </div>
          </div>
        </div>
      )}

      {/* 메모 모달 */}
      {showHoleMap && (
        <HoleMapModal
          holeNo={holeNo}
          par={hole.par}
          gpsPoints={gpsPoints}
          gpsGreen={gpsGreen}
          gpsPin={gpsPin}
          fieldShots={fieldShots}
          greenOpen={!gpsLocked(fieldShots)}
          shotLabel={shotLabel}
          shotTrusted={(slot) => shotDistanceTrusted(playerScore, hole.par, slot)}
          finalLabel={isHoledOut(playerScore) ? '홀' : '그린 랜딩'}
          onSetPoint={setGpsPoint}
          onSetGreen={setGpsGreen}
          onSetPin={fix => updateGpsField('gpsPin', fix)}
          onAddShot={addShotFromMap}
          onUndoShot={lastShotIsEmpty ? undoLastShotFromMap : null}
          fillFor={mapFillFor}
          clubHintFor={clubHintFor}
          onClose={closeMapAndFill}
        />
      )}

      {showGreenSpeed && (
        <div style={styles.modalOverlay} onClick={() => setShowGreenSpeed(false)} data-role="green-speed-modal">
          <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:17, fontWeight:800, color:'#191f28', textAlign:'center', marginBottom:4 }}>그린 스피드</div>
            <div style={{ fontSize:14, color:'#4e5968', textAlign:'center', lineHeight:1.5, marginBottom:14, wordBreak:'keep-all' }}>
              오늘 그린의 빠르기를 고르면 퍼팅 분석에 반영돼요
            </div>
            <GreenSpeedPicker value={speedDraft} onChange={setSpeedDraft} />
            <div style={{ ...styles.modalActions, marginTop:16 }}>
              <button style={styles.modalBtnCancel} onClick={() => setShowGreenSpeed(false)}>취소</button>
              <button style={styles.memoSaveBtn} data-role="green-speed-save"
                onClick={() => { onUpdate({ ...round, greenSpeed: speedDraft }); setShowGreenSpeed(false); }}>저장</button>
            </div>
          </div>
        </div>
      )}

      {showMemoModal && (
        <div style={styles.modalOverlay} onClick={()=>setShowMemoModal(false)}>
          <div style={styles.memoModalCard} onClick={e=>e.stopPropagation()}>
            <div style={styles.memoModalHeader}>
              <div style={styles.memoModalTitle}>{holeNo}번 홀 메모</div>
              <div style={styles.memoModalSub}>파 {hole.par} · 이 홀에서 기억하고 싶은 내용을 적어보세요</div>
            </div>
            <textarea style={styles.memoTextarea} value={memoDraft} onChange={e=>setMemoDraft(e.target.value)} placeholder="예: 티샷이 좌측 러프로 빠짐..." maxLength={500} autoFocus rows={8} />
            <div style={styles.memoCharCount}>{memoDraft.length} / 500</div>
            <div style={styles.modalActions}>
              <button style={styles.modalBtnCancel} onClick={()=>{ setShowMemoModal(false); setMemoDraft(''); }}>취소</button>
              <button style={styles.memoSaveBtn} onClick={()=>{ updateScore('memo',memoDraft.trim()); setShowMemoModal(false); setMemoDraft(''); }}>저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Style constants ──────────────────────────────────────────────────────────

// 샷 섹션 헤더 색 — active(지금 차례) · done(입력 완료) · idle(아직)
const HDR = {
  active: { line: 'rgba(27,100,218,0.6)', label: '#b45309', arrow: '#1b64da' },
  done:   { line: 'rgba(10,127,63,0.3)', label: '#0a7f3f', arrow: '#0a7f3f' },
  idle:   { line: '#d1d6db',              label: '#4e5968', arrow: '#5b6572' },
};

// flexWrap: 좁은 폰(320px)에서 라벨(130px) 옆에 칩이 다 들어가지 않으면 칩이 아랫줄로 내려간다
const fRow = { display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', padding:'10px 16px', borderBottom:'1px solid #e5e8eb', minHeight:54, gap:'8px 12px' };
const fLeft = { display:'flex', alignItems:'center', gap:8, flexShrink:0, minWidth:130 };
const fIcon = { fontSize:15, width:18, textAlign:'center', color:'#4e5968', flexShrink:0 };
const fLbl  = { fontSize:13, fontWeight:700, color:'#4e5968', letterSpacing:'0', textTransform:'none' };

const fChip = { minHeight:44, padding:'5px 9px', borderRadius: 10, border:'1.5px solid #d1d6db', background:'#e8ebee', color:'#191f28', fontSize:13, fontWeight:600, cursor:'pointer' };
const fChipOn = { border:'2px solid #1b64da', background:'rgba(27,100,218,0.18)', color:'#1b64da' };
const fChipWide = { minWidth:52, minHeight:44, padding:'7px 12px', borderRadius:8, border:'1.5px solid #d1d6db', background:'#e8ebee', color:'#4e5968', fontSize:14, fontWeight:700, cursor:'pointer' };

// 퍼팅 결과 버튼 줄 — 카드가 화면보다 길어도 아래 탭바 바로 위에 붙어 있다 (탭바 높이 ≈ 75px + 아이폰 아래 여백).
// 줄이 속한 상자(putt-cards)가 화면에 보이는 동안만 붙고, 퍼팅 칸이 아직 아래에 있으면 상자와 함께 내려가 있다.
const PUTT_BAR = { position:'sticky', bottom:'calc(80px + env(safe-area-inset-bottom, 0px))', zIndex:20, margin:'0 -16px', padding:'10px 16px', background:'#ffffff', borderTop:'1px solid #e5e8eb', boxShadow:'0 -10px 14px -6px rgba(0,0,0,0.175)' };

// 벌타 구제 방식 카드 — 왼쪽: 정식 명칭(영문) · 근거/벌타 · 설명, 오른쪽: 다음 샷 번호 (모든 카드에서 같은 너비로 줄을 맞춘다)
const reliefCard = {
  display: 'flex', alignItems: 'stretch', gap: 12, width: '100%', boxSizing: 'border-box',
  padding: '11px 11px 11px 14px', background: '#e8ebee', border: '1px solid #cdd3d8', borderRadius: 10,
  textAlign: 'left', cursor: 'pointer', color: '#191f28', fontFamily: 'inherit',
};
const reliefKoRow = { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 };
const reliefKo = { fontSize: 17, fontWeight: 800, lineHeight: 1.25, letterSpacing: '-0.01em', color: '#191f28' };
const reliefEn = { fontSize: 14, fontWeight: 600, lineHeight: 1.3, marginTop: 2, color: '#4e5968' };
const reliefMeta = { display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7 };
const reliefChip = {
  fontSize: 13, fontWeight: 700, lineHeight: 1.2, padding: '3px 7px', borderRadius: 999,
  color: '#333d4b', background: 'rgba(25,31,40,0.032)', border: '1px solid #1b64da', whiteSpace: 'nowrap',
};
const reliefChipPen = { color: '#c8323a', background: 'rgba(200,50,58,0.1)', border: '1px solid rgba(200,50,58,0.38)' };
const reliefChipTag = { color: '#a85b00', background: 'rgba(168,91,0,0.1)', border: '1px solid rgba(168,91,0,0.38)' };
const reliefWhere = { marginTop: 7, fontSize: 14, fontWeight: 500, lineHeight: 1.5, color: '#4e5968', wordBreak: 'keep-all', textWrap: 'balance' };
const reliefNext = {
  flex: '0 0 68px', width: 68, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  gap: 1, padding: '8px 4px', borderRadius: 9, boxSizing: 'border-box',
  background: 'rgba(27,100,218,0.13)', border: '1px solid rgba(27,100,218,0.55)',
};
const reliefNextLabel = { fontSize: 13, fontWeight: 700, color: '#1b64da', letterSpacing: '0.02em' };
const reliefNextNum = { fontSize: 32, fontWeight: 900, lineHeight: 1.05, color: '#1b64da', fontVariantNumeric: 'tabular-nums' };
const reliefNextUnit = { fontSize: 13, fontWeight: 700, color: '#1b64da' };
const reliefNote = { fontSize: 13, color: '#4e5968', lineHeight: 1.6, marginTop: 10, textAlign: 'left', wordBreak: 'keep-all' };

