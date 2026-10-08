import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Edit3, Home, Flag, Map as MapIcon } from 'lucide-react';
import styles from '../../styles/styles';
import GpsShotPoint from './GpsShotPoint';
import HoleMapModal from './HoleMapModal';
import { fieldShotCount as countFieldShots, isHoledOut, par3TeeOnGreen, pinDistances, saneRemaining, shotDistanceTrusted, SANE_REMAIN_M } from '../../engine/geo.js';
import { penaltyAt, phantomStrokes, strokeNumberOf, shotTitle, titleShifted } from '../../engine/penalties.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const CLOCK_HOURS = Array.from({ length: 12 }, (_, i) => {
  const hour = i + 1;
  const angle = (hour * 30 - 90) * (Math.PI / 180);
  const KEY = { 12: 'LONG', 6: 'SHORT', 9: 'LEFT', 3: 'RIGHT' };
  return { hour, label: KEY[hour] || String(hour), isKey: [3,6,9,12].includes(hour), cx: 50 + 40 * Math.cos(angle), cy: 50 + 40 * Math.sin(angle) };
});

const TERRAIN_OPTIONS = [
  { id: 'flat',           label: '평지' },
  { id: 'uphill',         label: '오르막' },
  { id: 'downhill',       label: '내리막' },
  { id: 'hook',           label: '훅' },
  { id: 'slice',          label: '슬라이스' },
  { id: 'uphill-slice',   label: '오르막 슬라이스' },
  { id: 'uphill-hook',    label: '오르막 훅' },
  { id: 'downhill-slice', label: '내리막 슬라이스' },
  { id: 'downhill-hook',  label: '내리막 훅' },
];

const LIE_GRID = [
  null,      'uphill', null,
  'slice',   'flat',   'hook',
  null,      'downhill', null,
];

const PUTT_LIE_OPTIONS = [
  { id: 'flat',           label: '평지' },
  { id: 'uphill',         label: '오르막' },
  { id: 'downhill',       label: '내리막' },
  { id: 'hook',           label: '훅' },
  { id: 'slice',          label: '슬라이스' },
  { id: 'uphill-slice',   label: '오르막 슬라이스' },
  { id: 'uphill-hook',    label: '오르막 훅' },
  { id: 'downhill-slice', label: '내리막 슬라이스' },
  { id: 'downhill-hook',  label: '내리막 훅' },
];

const PIN_OPTIONS = [
  { id: 'front',  label: '프론트' },
  { id: 'back',   label: '백' },
  { id: 'center', label: '센터' },
  { id: 'left',   label: '레프트' },
  { id: 'right',   label: '라이트' },
  { id: 'back left',  label: '백 레프트' },
  { id: 'front left',  label: '프론트 레프트' },
  { id: 'back right',  label: '백 라이트' },
  { id: 'front right',  label: '프론트 라이트' },
];


const SECOND_CLUBS = [
  { id: 'wood',   label: 'WOOD' },
  { id: 'hybrid', label: 'HYBRID' },
  { id: 'iron',   label: 'IRON' },
  { id: 'wedge',  label: 'WEDGE' },
];

// 티샷 벌타 뒤 다음 샷 — 다시 친 티샷이면 드라이버, 드롭 후면 아이언·웨지일 수 있다.
const AFTER_TEE_PENALTY_CLUBS = [{ id: 'driver', label: 'DRIVER' }, ...SECOND_CLUBS];

const WEDGE_OPTIONS = [48, 50, 52, 54, 56, 58, 60, 62];

const CLUB_SUBS = {
  driver: [],
  wood:   [{ id: '3W', label: '3W' }, { id: '5W', label: '5W' }, { id: '7W', label: '7W' }, { id: '9W', label: '9W' }],
  hybrid: [{ id: '2H', label: '2H' }, { id: '3H', label: '3H' }, { id: '4H', label: '4H' }, { id: '5H', label: '5H' }],
  iron:   [{ id: '2I', label: '2I' }, { id: '3I', label: '3I' }, { id: '4I', label: '4I' }, { id: '5I', label: '5I' }, { id: '6I', label: '6I' }, { id: '7I', label: '7I' }, { id: '8I', label: '8I' }, { id: '9I', label: '9I' }],
  wedge:  [
    { id: '48', label: '48°' },
    { id: '50', label: '50°' },
    { id: '52', label: '52°' },
    { id: '54', label: '54°' },
    { id: '56', label: '56°' },
    { id: '58', label: '58°' },
    { id: '60', label: '60°' },
    { id: '62', label: '62°' },
    { id: 'P',  label: 'P'   },
  ],
};

const COMPASS_LABELS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
const toCompassLabel = (deg) => deg == null ? '—' : COMPASS_LABELS[Math.round(deg / 22.5) % 16];

const getNavLabelFontSize = (text) => {
  const len = (text || '').length;
  if (len <= 3) return '11px'; if (len <= 5) return '9px'; if (len <= 7) return '8px'; if (len <= 10) return '7px'; return '6px';
};

// ─── Sub-components ───────────────────────────────────────────────────────────

// value가 null이면 '미입력'으로 보여주고 아무것도 저장하지 않는다. 눈대중 기본값을
// 그대로 저장하면 실제와 다른 거리가 통계에 섞이기 때문 — 입력하지 않은 거리는
// 비워 두는 편이 낫다. start는 처음 조작할 때의 출발값(가운데를 탭하면 이 값으로 입력).
//
// 손가락 동작 구분: 가로로 끌면 값 조절, 세로로 밀면 화면 스크롤(touch-action: pan-y),
// 거의 움직이지 않고 떼면 탭. 예전에는 이 칸 위에서 스크롤 자체가 막혀 있었고,
// 세로로 민 동작이 탭으로 처리돼 스크롤하려다 기본값이 저장됐다.
const TAP_SLOP = 8;    // 이 안에서 떼면 탭
const DRAG_START = 6;  // 가로로 이만큼 움직이면 끌기 시작

function SwipeDistance({ value, start, min = 1, max = 300, onChange, step = 1, decimals = 0, unit = 'm' }) {
  const startPos = useRef(null);       // { x, y }
  const startVal = useRef(value);
  const modeRef = useRef(null);        // null(아직 모름) | 'drag' | 'scroll'
  const [active, setActive] = useState(false);
  const clamp = v => parseFloat(Math.max(min, Math.min(max, Math.round(v / step) * step)).toFixed(decimals));
  const empty = value == null;
  const base = empty ? (start ?? min) : value;

  const handleStart = (x, y) => { startPos.current = { x, y }; startVal.current = base; modeRef.current = null; setActive(true); };
  const handleMove  = (x, y) => {
    if (!startPos.current || modeRef.current === 'scroll') return;
    const dx = x - startPos.current.x;
    const dy = y - startPos.current.y;
    if (modeRef.current == null) {
      // 세로 움직임이 먼저 크면 스크롤로 보고 이 동작은 끝까지 값을 건드리지 않는다.
      if (Math.abs(dy) > TAP_SLOP && Math.abs(dy) >= Math.abs(dx)) { modeRef.current = 'scroll'; setActive(false); return; }
      if (Math.abs(dx) < DRAG_START) return;
      modeRef.current = 'drag';
    }
    onChange(clamp(startVal.current + dx / 4 * step));
  };
  const handleEnd = (x, y) => {
    setActive(false);
    const p = startPos.current;
    startPos.current = null;
    // 떼는 위치로 한 번 더 확인한다 — 스크롤 중에는 움직임 이벤트가 오지 않는 브라우저가 있다.
    const isTap = modeRef.current == null && p && Math.hypot(x - p.x, y - p.y) < TAP_SLOP;
    modeRef.current = null;
    if (empty && isTap) onChange(clamp(base));   // 미입력 칸을 탭 → 출발값으로 입력
  };
  const handleCancel = () => { setActive(false); startPos.current = null; modeRef.current = null; };

  const display = empty ? '—' : (decimals > 0 ? Number(value).toFixed(decimals) : value);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button style={fMiniBtn} onClick={() => onChange(clamp(base - step))}>−</button>
      <div
        style={{ flex: 1, textAlign: 'center', padding: '8px 0', cursor: 'ew-resize', touchAction: 'pan-y', userSelect: 'none', background: active ? 'rgba(201,162,40,0.06)' : 'transparent', borderRadius: 8, transition: 'background 0.15s' }}
        onTouchStart={e => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={e => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
        // 탭 뒤에 따라오는 가짜 마우스 이벤트로 두 번 입력되지 않게 막는다.
        onTouchEnd={e => { e.preventDefault(); const t = e.changedTouches[0]; handleEnd(t.clientX, t.clientY); }}
        onTouchCancel={handleCancel}
        onMouseDown={e => {
          handleStart(e.clientX, e.clientY);
          const move = (me) => handleMove(me.clientX, me.clientY);
          const up   = (ue) => { handleEnd(ue.clientX, ue.clientY); window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
          window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
        }}
      >
        <span style={{ fontSize: 34, fontWeight: 900, color: empty ? '#4d5a78' : '#e8edf8', lineHeight: 1 }}>{display}</span>
        <span style={{ fontSize: 13, color: '#8896b0', marginLeft: 4 }}>{unit}</span>
        {empty && (
          <div style={{ fontSize: 11, color: '#8896b0', marginTop: 4 }}>미입력 · 탭하면 {clamp(base)}{unit}부터</div>
        )}
      </div>
      <button style={fMiniBtn} onClick={() => onChange(clamp(base + step))}>+</button>
    </div>
  );
}

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
          <circle cx="50" cy="50" r="48" fill="#0b0e18" stroke="#1b2238" strokeWidth="1.5" />
          <circle cx="50" cy="50" r="44" fill="none" stroke="#111827" strokeWidth="0.5" />

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
                stroke={isMajor ? '#6b7c9a' : isMinor ? '#3d4d65' : '#1b2238'}
                strokeWidth={isMajor ? 1.5 : isMinor ? 1 : 0.6}
              />
            );
          })}

          {/* Cardinal labels */}
          {[['N', 0, '#ef5350'], ['E', 90, '#4d5a78'], ['S', 180, '#4d5a78'], ['W', 270, '#4d5a78']].map(([l, a, col]) => {
            const rad = (a - 90) * Math.PI / 180;
            const r = 31;
            return (
              <text key={l} x={50 + r * Math.cos(rad)} y={50 + r * Math.sin(rad)}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="7.5" fontWeight="bold" fill={col}
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
            <polygon points="50,9 45,24 55,24" fill="#c9a228" />
            <rect x="48.5" y="24" width="3" height="20" fill="#c9a228" rx="1" />
            <line x1="50" y1="50" x2="50" y2="70" stroke="rgba(201,162,40,0.28)" strokeWidth="2" strokeLinecap="round" />
          </g>

          {/* Center */}
          <circle cx="50" cy="50" r="4" fill={direction != null ? '#c9a228' : '#252f4a'} stroke="#0b0e18" strokeWidth="1.5" />
        </svg>

        {direction == null && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#6e84a8', letterSpacing: '0.1em', pointerEvents: 'none' }}>
            탭해서 방향 설정
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10, minHeight: 26 }}>
        {direction != null ? (<>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#c9a228' }}>{toCompassLabel(direction)}</span>
          <span style={{ fontSize: 11, color: '#4d5a78' }}>{direction}°</span>
        </>) : (
          <span style={{ fontSize: 10, color: '#3d4d65' }}>방향 미설정</span>
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
          <div style={{ fontSize: 9, color: '#8896b0', letterSpacing: '0.18em', textTransform: 'uppercase' }}>바람 세기</div>
          <div style={{ flex:1, display:'flex', justifyContent:'flex-end' }}>
            {strength > 0 && (
              <button style={{ fontSize:10, color:'#8896b0', background:'none', border:'1px solid #252f4a', borderRadius:4, padding:'3px 8px', cursor:'pointer' }}
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
// 전에는 회색으로 두되 눌러서 펼칠 수는 있다(막지 않는다). 클럽을 고르면 금색
// 테두리로 바뀌어 "이제 이것도 입력할 수 있다"를 알린다. 입력한 값은 접힌
// 상태에서도 헤더에 요약한다.
// children(close) — 선택이 끝나면 섹션을 접을 수 있도록 close를 넘긴다.
function OptionalSection({ icon, label, enabled, summary, children }) {
  const [open, setOpen] = useState(false);
  const hasValue = !!summary;
  const accent = enabled ? '#c9a228' : '#4d5a78';
  return (
    <div style={{ padding:'8px 16px', borderBottom:'1px solid #0e1320' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width:'100%', display:'flex', alignItems:'center', gap:8, padding:'10px 12px', borderRadius:9,
          cursor:'pointer', textAlign:'left',
          border:`1.5px solid ${enabled ? '#c9a228' : '#252f4a'}`,
          background: enabled ? (open || hasValue ? 'rgba(201,162,40,0.12)' : 'rgba(201,162,40,0.05)') : 'transparent',
        }}
      >
        <span style={{ ...fIcon, color: accent }}>{icon}</span>
        <span style={{ ...fLbl, color: enabled ? '#e8c45a' : '#4d5a78' }}>{label}</span>
        <span style={{ flex:1, minWidth:0, fontSize:12, fontWeight:700, color:'#c9a228', marginLeft:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {hasValue ? summary
            : <span style={{ color: enabled ? '#8896b0' : '#4d5a78', fontWeight:600 }}>
                {enabled ? '선택 입력' : '클럽 선택 후 입력'}
              </span>}
        </span>
        <span style={{ fontSize:12, fontWeight:800, color: accent }}>{open ? '접기 ▴' : '펼치기 ▾'}</span>
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
            <button style={{ fontSize:10, color:'#8896b0', background:'none', border:'1px solid #252f4a', borderRadius:4, padding:'3px 8px', cursor:'pointer' }}
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

function LieSection({ label = '라이', enabled, value, onChange }) {
  return (
    <OptionalSection icon="▲" label={label} enabled={enabled} summary={lieText(value)}>
      {(close) => (
        <RadialPicker centerId="flat" centerLabel="평지" dirs={LIE_DIRS} alwaysOpen
          value={lieValue(value)}
          onChange={v => { onChange(v); if (v) close(); }}
        />
      )}
    </OptionalSection>
  );
}

function ClockDial12({ value, onChange }) {
  return (
    <div style={{ position: 'relative', width: '100%', paddingTop: '90%', maxWidth: 280, margin: '0 auto' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid #252f4a', background: '#111827' }} />
        {[0,90].map(deg => <div key={deg} style={{ position: 'absolute', left: '50%', top: '50%', width: '80%', height: 1, background: '#1b2238', transform: `translate(-50%, -50%) rotate(${deg}deg)` }} />)}
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '22%', height: '22%', borderRadius: '50%', background: 'radial-gradient(circle, #173a22 0%, #0e1c14 100%)', border: '2px solid #1a3028', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, zIndex: 2 }}>⛳</div>
        {CLOCK_HOURS.map(({ hour, cx, cy, label, isKey }) => {
          const sel = value === hour;
          const BTN = isKey ? 46 : 36;
          return (
            <button key={hour} style={{ position: 'absolute', left: `calc(${cx}% - ${BTN/2}px)`, top: `calc(${cy}% - ${BTN/2}px)`, width: BTN, height: BTN, borderRadius: '50%', border: `2px solid ${sel ? '#c9a228' : isKey ? '#252f4a' : '#1b2238'}`, background: sel ? '#c9a228' : isKey ? '#1a2235' : '#0d1320', color: sel ? '#0b0e18' : isKey ? '#e8edf8' : '#4d5a78', fontSize: isKey ? 8 : 10, fontWeight: 700, cursor: 'pointer', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 2, lineHeight: 1.1, textAlign: 'center' }}
              onClick={() => onChange(value === hour ? null : hour)}>{label}</button>
          );
        })}
      </div>
    </div>
  );
}

function MultiChips({ options, value = [], onChange }) {
  const toggle = id => onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id]);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map(o => {
        const sel = value.includes(o.id);
        return (
          <button key={o.id} style={{ flex:'1 1 calc(33% - 6px)', padding: '9px 6px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign:'center', border: `1.5px solid ${sel ? '#c9a228' : '#252f4a'}`, background: sel ? 'rgba(201,162,40,0.18)' : '#1a2235', color: sel ? '#c9a228' : '#8896b0' }}
            onClick={() => toggle(o.id)}>{o.label}</button>
        );
      })}
    </div>
  );
}

function ClubSelector({ icon, label, categories, value, subValue, onCategory, onSub, stacked }) {
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { if (!value) setExpandedId(null); }, [value]);

  const btnChip = stacked
    ? { ...fChip, padding:'10px 8px', fontSize:13, borderRadius:8, width:'100%', textAlign:'center' }
    : { ...fChip, width:'100%', textAlign:'center' };

  const handleCategory = (c) => {
    const subs = CLUB_SUBS[c.id] || [];
    if (subs.length === 0) {
      onCategory(value === c.id ? null : c.id);
      return;
    }
    if (value === c.id) {
      setExpandedId(prev => prev === c.id ? null : c.id);
    } else {
      onCategory(c.id);
      setExpandedId(c.id);
    }
  };

  const handleSub = (subId) => {
    onSub(subId === subValue ? null : subId);
    setExpandedId(null);
  };

  const expandedSubs = (expandedId && expandedId === value) ? (CLUB_SUBS[expandedId] || []) : [];

  const categoryRow = (
    <div style={{ display:'flex', gap: stacked ? 6 : 5, flex: stacked ? undefined : 1 }}>
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
              border: `${selectedSub ? '2px' : '1.5px'} solid ${isSelected ? '#c9a228' : '#252f4a'}`,
              ...(selectedSub ? { fontWeight:900, fontSize: stacked ? 14 : 13, boxShadow:'0 0 8px rgba(201,162,40,0.45)', color:'#f0c93a' } : {}),
            }}
            onClick={() => handleCategory(c)}
          >
            {displayLabel}
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
              padding:'9px 4px', borderRadius:7, textAlign:'center',
              fontSize:12, fontWeight: isSel ? 700 : 500, cursor:'pointer',
              border:`1.5px solid ${isSel ? '#c9a228' : '#252f4a'}`,
              background: isSel ? 'rgba(201,162,40,0.18)' : '#1a2235',
              color: isSel ? '#c9a228' : '#e8edf8',
            }}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );

  if (stacked) {
    return (
      <div style={{ padding:'8px 16px 12px', borderBottom:'1px solid #0e1320' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <span style={fIcon}>{icon}</span>
          <span style={fLbl}>{label}</span>
        </div>
        {categoryRow}
        {subRow}
      </div>
    );
  }

  return (
    <div style={{ padding:'10px 16px', borderBottom:'1px solid #0e1320', minHeight:54 }}>
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

const RADIAL_POS = {
  up:    { tx:   0, ty: -56 },
  down:  { tx:   0, ty:  56 },
  left:  { tx: -96, ty:   0 },
  right: { tx:  96, ty:   0 },
};

// alwaysOpen: 접기 버튼 없이 선택지만 보인다 (바깥 섹션이 접기를 맡을 때).
// openWhenEmpty: false면 선택이 없어도 접힌 채 시작한다 (건너뛸 수 있는 선택 입력).
function RadialPicker({ centerId, centerLabel, dirs, value, onChange, onOpen, placeholder, alwaysOpen, openWhenEmpty = true }) {
  const raw = Array.isArray(value) ? value[0] || null : value || null;
  // 아직 선택이 없으면 펼친 상태로 시작한다 — 필드에서 입력 차례마다 "열기"를
  // 한 번 더 누르지 않게 하려는 것. 선택이 끝나면 접혀서 결과만 남고, 사용자가
  // 직접 접은 경우에는(값 변화가 없으므로) 그대로 접힌 채 유지된다.
  const [openState, setOpen] = useState(raw == null && openWhenEmpty);
  const open = alwaysOpen || openState;

  useEffect(() => { setOpen(raw == null && openWhenEmpty); }, [raw, openWhenEmpty]);

  const selDir = dirs.find(d => d.id === raw);
  const selLabel = raw === centerId ? centerLabel : (selDir?.label ?? null);
  const selIcon = selDir?.icon ?? null;
  const hasSelection = raw != null;

  const handleSelect = (id) => {
    onChange(id === raw ? null : id);
    setOpen(false);
  };

  const allOptions = [{ id: centerId, label: centerLabel, icon: null }, ...dirs];

  return (
    <div style={{ width:'100%' }}>
      {!alwaysOpen && <button
        onClick={() => { setOpen(v => { if (!v && onOpen) onOpen(); return !v; }); }}
        style={{
          width:'100%', display:'flex', alignItems:'center', justifyContent:'center',
          gap:6, padding:'10px 16px', borderRadius:10, cursor:'pointer',
          background: open ? 'rgba(201,162,40,0.07)' : hasSelection ? 'rgba(201,162,40,0.12)' : 'rgba(255,255,255,0.03)',
          border:`1.5px solid ${open || hasSelection ? 'rgba(201,162,40,0.4)' : '#3a4e72'}`,
          transition:'background 0.15s, border-color 0.15s',
        }}
      >
        <span style={{ fontSize:14, fontWeight:700, color: open || hasSelection ? '#c9a228' : '#8896b0' }}>
          {hasSelection ? (selLabel || centerLabel) : (placeholder || centerLabel)}
        </span>
        {!open && selIcon && <span style={{ color:'#c9a228' }}>{selIcon}</span>}
        <span style={{ fontSize:9, color: open || hasSelection ? '#c9a228' : '#4d5a78', marginLeft:4 }}>{open ? '▲' : '▼'}</span>
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
                width:'100%', padding: isCompound ? '7px 4px' : '11px 6px', borderRadius:8, cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:2,
                fontSize: isCompound ? 10 : 13, fontWeight: isSel ? 700 : 500, lineHeight: isCompound ? 1.3 : 1,
                border:`1.5px solid ${isSel ? '#c9a228' : '#252f4a'}`,
                background: isSel ? 'rgba(201,162,40,0.18)' : '#131d35',
                color: isSel ? '#c9a228' : '#8896b0',
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
const PUTT_LIE_DIRS = [
  { id:'uphill',             label:'오르막',          pos:'up'    },
  { id:'break-left',         label:'슬라이스',        pos:'left',  icon: <SliceIcon /> },
  { id:'downhill',           label:'내리막',          pos:'down'  },
  { id:'break-right',        label:'훅',              pos:'right', icon: <HookIcon /> },
  { id:'uphill-break-left',  label:'오르막\n슬라이스', pos:'ul'   },
  { id:'uphill-break-right', label:'오르막\n훅',      pos:'ur'    },
  { id:'downhill-break-left',label:'내리막\n슬라이스', pos:'dl'   },
  { id:'downhill-break-right',label:'내리막\n훅',     pos:'dr'    },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ScoringView({ round, onUpdate, onFinish, onGoHome, onExit, onGoToSetup }) {
  const [holeIdx, setHoleIdx] = useState(round.currentHole || 0);
  const [activePlayer, setActivePlayer] = useState(round.players[0]);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [pendingFinish, setPendingFinish] = useState(null);   // 미입력 홀 확인 중인 완료 라운드
  const [pendingSkip, setPendingSkip] = useState(null);       // 입력 없는 홀에서 '다음' — 이동할 홀 번호
  const [obChoiceSlot, setObChoiceSlot] = useState(null);     // OB 처리(OB티/다시 치기)를 고르는 중인 샷
  const [puttAsk, setPuttAsk] = useState(null);               // 퍼팅 수를 모른 채 '다음'/'완료' — { next } 또는 { finish: true }
  const finishingRef = useRef(false);                          // 완료 버튼 연타 방지
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [memoDraft, setMemoDraft] = useState('');
  const [showParEditModal, setShowParEditModal] = useState(false);
  const [parDraft, setParDraft] = useState([...round.pars]);
  const [expandedPutt, setExpandedPutt] = useState(0);
  const [expandedExtraShot, setExpandedExtraShot] = useState(0);
  const [shotPage, setShotPage] = useState(0);
  const [teeClubInteracting, setTeeClubInteracting] = useState(false);
  const [teeExpanded, setTeeExpanded] = useState(true);
  const [secondShotExpanded, setSecondShotExpanded] = useState(true);
  const [showHoleInModal, setShowHoleInModal] = useState(false);
  const [holeInModalData, setHoleInModalData] = useState(null);
  const [showPuttsDropdown, setShowPuttsDropdown] = useState(false);
  const [showHoleMap, setShowHoleMap] = useState(false);
  const holeInCbRef = useRef(null);
  // 홀인/칩인 모달이 화면에 그려지기 전 빠른 연속 탭으로 완료 콜백이 두 번
  // 실행(저장/이동 중복)되는 것을 막는 가드.
  const holeInModalPendingRef = useRef(false);

  const openParEdit = () => { setParDraft([...round.pars]); setShowParEditModal(true); };

  const updateParDraft = (idx, val) => { const u = [...parDraft]; u[idx] = val; setParDraft(u); };

  const saveParEdit = () => {
    const updated = { ...round, pars: [...parDraft] };
    updated.holes = round.holes.map((h, i) => {
      const newPar = parDraft[i];
      const newHole = { ...h, par: newPar };
      const updatedScores = {};
      round.players.forEach(p => {
        const ps = h.scores[p];
        if (!ps.touched) {
          const inf = inferStatsFromStrokes(newPar, newPar);
          updatedScores[p] = { ...ps, strokes: newPar, putts: inf.putts, fairway: null, gir: inf.gir };
        } else {
          updatedScores[p] = { ...ps };
        }
      });
      newHole.scores = updatedScores;
      return newHole;
    });
    onUpdate(updated);
    setShowParEditModal(false);
  };

  const hole = round.holes[holeIdx];
  const playerScore = hole.scores[activePlayer];

  const hasProgress = round.holes.some(h => round.players.some(p => h.scores[p]?.touched === true));

  // 진행률·누적 스코어·홀 표에서 '끝난 홀'로 셀지. 새 라운드는 확정(confirmed —
  // '다음'·홀인으로 끝낸)한 홀만 센다: 티샷 클럽만 골라도 그 홀이 끝난 홀로 잡혀
  // 진행률이 먼저 오르고 누적 스코어에 미리 들어가던 문제. 예전 진행 중 라운드는
  // 확정 기록이 없으므로 입력한(touched) 홀 기준 그대로 둔다.
  const doneFor = (h, p) => (round.trackConfirm ? h.scores[p]?.confirmed === true : h.scores[p]?.touched === true);

  const handleBackClick = () => { if (hasProgress) setShowExitConfirm(true); else onGoToSetup(); };

  const calculateGir = (strokes, putts, par) => {
    if (strokes == null || putts == null) return null;
    return (strokes - putts) <= par - 2;
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
    const hasPenalty = ob + hazard > 0;
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
    //   않으므로 여기서 1타씩 더한다(phantomStrokes). 제자리에서 다시 친 OB는 그 샷이
    //   다음 샷으로 기록되므로 더하지 않는다.
    // 해저드 1회 = 벌타 1타뿐 — 드롭 후 이어 치는 샷은 사용자가 다음 샷으로 기록한다.
    const field = effectiveTeeGIR ? 0 : baseField + phantomStrokes(score) + (score.extraShots?.length || 0);
    return 1 + field + (score.putts || 0) + ob + hazard;
  };

  // ─── 스코어 자동 계산 ───────────────────────────────────────────────────────
  // 상세 입력 홀(티샷 클럽을 고른 홀)은 스코어 칸이 샷 기록으로 계산된다:
  // 샷 수 + 퍼팅 수 + 벌타. 퍼팅을 아직 입력하지 않았으면 기본 2퍼트로 본다.
  // 사용자가 −/+로 직접 고치면(strokesManual) 그 값을 그대로 둔다 — 상세 입력으로
  // 표현 못 하는 상황(규칙 적용 등)을 바로잡을 방법이 그것뿐이다.
  // 예전에는 퍼팅 '홀인 성공'을 눌러야만 계산돼서, 위쪽 퍼팅 수만 고르고 넘기면
  // 샷 기록과 다른 기본 파가 저장됐다.
  const autoScoreOn = (s) => round.players.length === 1 && !!s.teeClub && !s.strokesManual;
  const withAutoStrokes = (s) => (autoScoreOn(s) ? { ...s, strokes: calcAutoStrokes(s, hole.par) } : s);

  // 퍼팅 수를 알고 있는지 — 위쪽 퍼팅 수를 골랐거나, 퍼팅 홀인 성공·실패를 눌렀거나,
  // 칩인·홀인원으로 끝났거나, 이미 확정한 홀.
  const puttsKnown = (s) => !!(s.puttsManual || s.confirmed || isHoledOut(s)
    || (Array.isArray(s.puttDetails) && s.puttDetails.some(p => p?.holein === 'success' || p?.holein === 'fail')));
  // 상세 입력 중이고 퍼팅을 아직 모르는 홀. 스코어를 2퍼트로 가정해 보여주면 GIR을
  // 놓치는 순간 보기로 보이지만 1퍼트로 막을 수도 있다 — 그래서 스코어 대신
  // '온그린까지 N타 · 퍼팅 남음'을 보여주고, 퍼팅을 입력하면 확정한다.
  // (저장값은 2퍼트 기준 예상치로 계속 갱신해 둔다 — 중간에 앱이 꺼져도 남도록.)
  const scorePending = (s) => autoScoreOn(s) && !puttsKnown(s);
  const strokesToGreen = (s, par) => calcAutoStrokes({ ...s, putts: 0 }, par);

  // 홀 확정 — 상세 입력 홀은 스코어·GIR을 샷 기록으로 다시 계산한다(칩인·홀인원 포함).
  // confirmed: 이 홀을 '다음'/홀인으로 끝냈다는 표시. 진행률과 누적 스코어는 확정된
  // 홀만 센다 — 입력 중인 홀이 미리 끝난 홀로 잡히지 않게.
  const finalizeScore = (s, par) => {
    if (!s.teeClub || s.strokesManual) return { ...s, touched: true, confirmed: true };
    const autoStrokes = calcAutoStrokes(s, par);
    const autoGir = (autoStrokes - (s.putts || 0)) <= par - 2;
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
        // 유효 범위(퍼팅 < 스코어)를 벗어날 때만 클램프한다.
        const maxPutts = Math.max(0, value - 1);
        if ((playerScore.putts || 0) > maxPutts) np.putts = maxPutts;
        if (girIsAuto) {
          const ag = calculateGir(value, np.putts, hole.par);
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
      const ag = calculateGir(np.strokes, value, hole.par);
      if (ag !== null) { np.gir = ag; np.girAuto = true; }
    }
    if (field === 'gir') np.girAuto = false;
    np = { ...np, ...extra };
    updated.holes[holeIdx] = { ...hole, scores: { ...hole.scores, [activePlayer]: np } };
    onUpdate(updated);
  };

  // 상세 입력 필드를 바꾸는 경로는 모두 여기를 지난다 — 스코어 자동 계산을 함께 반영한다.
  const updateField = (field, value) => updateFields({ [field]: value });

  const updateFields = (fields) => {
    const updated = { ...round };
    updated.holes = [...round.holes];
    updated.holes[holeIdx] = { ...hole, scores: { ...hole.scores, [activePlayer]: withAutoStrokes({ ...playerScore, ...fields, touched: true }) } };
    onUpdate(updated);
  };

  const updateOnGreen = (val) => updateFields({ onGreen: val });

  const extraShotTopRef = useRef(null);
  const prevExtraShotsLenRef = useRef(0);
  const shotPageTimeoutRef = useRef(null);

  const scrollDown = () => setTimeout(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }), 80);

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

  const goToHole = (idx) => { if (idx >= 0 && idx < 18) { setHoleIdx(idx); onUpdate({ ...round, currentHole: idx }); } };

  // ─── '다음' / '완료' ─────────────────────────────────────────────────────────
  // '다음'은 이 홀을 확정한다(입력 안 한 플레이어는 파·기본값으로). 다만 홀 전체에
  // 아무 입력이 없으면 실수로 넘긴 것일 수 있어 파로 기록할지 먼저 묻는다.
  // 홀 번호 칸을 눌러 이동하는 건 둘러보기라 확정하지 않는다.
  const holeUntouched = (idx) => round.players.every(p => round.holes[idx].scores[p]?.touched !== true);

  // 상세 입력 중인데 퍼팅 수를 모르면 2퍼트로 가정하지 않고 퍼팅 수를 먼저 묻는다.
  const handleNext = () => {
    if (holeUntouched(holeIdx)) { setPendingSkip(holeIdx + 1); return; }
    if (scorePending(playerScore)) { setPuttAsk({ next: holeIdx + 1 }); return; }
    confirmAndGoToHole(holeIdx + 1);
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
    if (scorePending(playerScore)) { setPuttAsk({ finish: true }); return; }
    finishWith(null);
  };

  // 퍼팅 수를 고르면 그 수로 스코어를 계산해 확정하고 넘어간다.
  const confirmWithPutts = (n) => {
    const ask = puttAsk;
    setPuttAsk(null);
    if (!ask) return;
    const details = Array.from({ length: n }, (_, i) => puttDetails[i] || { distance: null, aimDistance: null, lie: [] });
    const fresh = withAutoStrokes({ ...playerScore, putts: n, puttDetails: details, puttsManual: true, touched: true });
    if (ask.finish) finishWith(fresh); else confirmAndGoToHole(ask.next, fresh);
  };

  // freshScore: 현재 플레이어의 최신 스코어 객체 (setState 배치 전 최신값을 직접 전달할 때 사용)
  const confirmAndGoToHole = (idx, freshScore) => {
    setTimeout(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }), 120);
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

  const triggerChipIn = (freshScore) => {
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
      putts: 0,
      onCount: freshScore.strokes,
    });
  };

  // 세컨샷이 바로 홀에 들어간 경우 (파3 그린 놓친 뒤 칩인, 파4 세컨샷 이글 등).
  // 세컨샷 결과는 onGreen에 'chip-in'으로 남긴다 — 써드샷 이후의 칩인과 같은 표기.
  const secondShotChipIn = () => {
    const base = { ...playerScore, onGreen: 'chip-in', putts: 0, puttDetails: [] };
    triggerChipIn({ ...base, strokes: calcAutoStrokes(base, hole.par), touched: true, strokesManual: false });
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
    if (strokes === 1) return { name: '🏆 HOLE IN ONE', color: '#c9a228', textColor: '#fff', bg: 'linear-gradient(135deg,#e8c84e 0%,#c9a228 50%,#7a611a 100%)', shadow: '0 2px 12px rgba(201,162,40,0.5)', anim: 'holeInOnePulse 2s ease-in-out infinite', fw: '800' };
    const diff = strokes - par;
    if (diff <= -3) return { name: 'Albatross', color: '#e8c84e', bg: 'rgba(232,200,78,0.12)', shadow: '0 2px 16px rgba(232,200,78,0.4)', anim: 'albatrossGlow 1.8s ease-in-out infinite', fw: '800' };
    if (diff === -2) return { name: 'Eagle',     color: '#c9a228', bg: 'rgba(201,162,40,0.1)',  shadow: '0 2px 10px rgba(201,162,40,0.35)', anim: 'eagleGlow 2.2s ease-in-out infinite',     fw: '700' };
    if (diff === -1) return { name: 'Birdie',    color: '#3db87a', bg: 'rgba(61,184,122,0.08)', shadow: '0 2px 6px rgba(61,184,122,0.25)',   anim: 'birdieGlow 2.8s ease-in-out infinite',   fw: '600' };
    if (diff === 0)  return { name: 'Par',        color: '#8896b0' };
    if (diff === 1)  return { name: 'Bogey',      color: '#e57373', bg: 'rgba(239,83,80,0.06)',  shadow: '0 2px 5px rgba(239,83,80,0.2)',   anim: 'bogeyRed 3.5s ease-in-out infinite',  fw: '600' };
    if (diff === 2)  return { name: 'Double',     color: '#ef5350', bg: 'rgba(239,83,80,0.09)',  shadow: '0 2px 8px rgba(239,83,80,0.3)',   anim: 'doubleRed 3s ease-in-out infinite',   fw: '700' };
    if (diff === 3)  return { name: 'Triple',     color: '#e53935', bg: 'rgba(229,57,53,0.12)',  shadow: '0 2px 10px rgba(229,57,53,0.4)',  anim: 'tripleRed 2.5s ease-in-out infinite', fw: '700' };
    if (diff === 4)  return { name: 'Quadruple',  color: '#c62828', bg: 'rgba(198,40,40,0.15)',  shadow: '0 2px 12px rgba(198,40,40,0.5)',  anim: 'quadRed 2s ease-in-out infinite',     fw: '800' };
    if (diff === 5)  return { name: 'Quintuple',  color: '#b71c1c', bg: 'rgba(183,28,28,0.17)',  shadow: '0 2px 14px rgba(183,28,28,0.55)', anim: 'quadRed 1.9s ease-in-out infinite',   fw: '800' };
    if (diff === 6)  return { name: 'Sextuple',   color: '#b71c1c', bg: 'rgba(183,28,28,0.18)',  shadow: '0 2px 15px rgba(183,28,28,0.58)', anim: 'quadRed 1.8s ease-in-out infinite',   fw: '800' };
    if (diff === 7)  return { name: 'Septuple',   color: '#b71c1c', bg: 'rgba(183,28,28,0.19)',  shadow: '0 2px 16px rgba(183,28,28,0.62)', anim: 'quadRed 1.7s ease-in-out infinite',   fw: '800' };
    if (diff === 8)  return { name: 'Octuple',    color: '#b71c1c', bg: 'rgba(183,28,28,0.20)',  shadow: '0 2px 17px rgba(183,28,28,0.65)', anim: 'quadRed 1.6s ease-in-out infinite',   fw: '800' };
    if (diff === 9)  return { name: 'Nonuple',    color: '#b71c1c', bg: 'rgba(183,28,28,0.21)',  shadow: '0 2px 18px rgba(183,28,28,0.68)', anim: 'quadRed 1.5s ease-in-out infinite',   fw: '800' };
    if (diff === 10) return { name: 'Decuple',    color: '#b71c1c', bg: 'rgba(183,28,28,0.22)',  shadow: '0 2px 20px rgba(183,28,28,0.72)', anim: 'quadRed 1.4s ease-in-out infinite',   fw: '800' };
    return                   { name: `+${diff}`,  color: '#b71c1c', bg: 'rgba(183,28,28,0.22)',  shadow: '0 2px 20px rgba(183,28,28,0.72)', anim: 'quadRed 1.4s ease-in-out infinite',   fw: '800' };
  };

  const scoreName = getScoreName(playerScore.strokes, hole.par);
  // 티샷에서 OB·해저드가 났으면 그것으로 티샷 결과가 정해진다.
  const teeComplete = !!(playerScore.teeClub && playerScore.shotShape && (penaltyAt(playerScore, 0) ||
    (hole.par === 3 ? (playerScore.teeOnGreen != null || !playerScore.girAuto) : (playerScore.fairwayHit != null || playerScore.teeGIR))));
  const teeShotSummary = [
    `${playerScore.strokes}타`,
    hole.par === 3 && playerScore.teeDistance ? `${playerScore.teeDistance}m` : null,
    playerScore.teeClub
      ? (playerScore.teeClubSub
          ? `${playerScore.teeClub.toUpperCase()} ${playerScore.teeClubSub}`
          : playerScore.teeClub.toUpperCase())
      : null,
    playerScore.shotShape,
    hole.par > 3 ? (playerScore.fairway === true ? 'FW·O' : playerScore.fairway === false ? 'FW·X' : null) : null,
    hole.par > 3 && playerScore.fairwayHit ? playerScore.fairwayHit : null,
  ].filter(Boolean).join('  ');

  const isLastHole = holeIdx === 17;
  const isPar3AtPar = hole.par === 3 && playerScore.touched && playerScore.strokes === 3;
  const isPar5 = hole.par === 5;
  const isSimpleMode = round.players.length > 1;

  const clubs = hole.par === 3
    ? [{ id: 'hybrid', label: 'HYBRID' }, { id: 'iron', label: 'IRON' }, { id: 'wedge', label: 'WEDGE' }]
    : [{ id: 'driver', label: 'DRIVER' }, { id: 'wood', label: 'WOOD' }, { id: 'hybrid', label: 'HYBRID' }, { id: 'iron', label: 'IRON' }];

  const secHdr = (label, onDelete, state = 'idle') => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px 6px' }}>
      <div style={{ height: 1, flex: 1, background: HDR[state].line }} />
      <span style={{ fontSize: 11, fontWeight: 800, color: HDR[state].label, letterSpacing: '0.2em' }}>
        {state === 'done' && '✓ '}{label}
      </span>
      <div style={{ height: 1, flex: 1, background: HDR[state].line }} />
      {onDelete && (
        <button onClick={onDelete} style={{ fontSize: 9, color: '#ef5350', background: 'none', border: '1px solid rgba(239,83,80,0.3)', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', flexShrink: 0 }}>✕ 삭제</button>
      )}
    </div>
  );

  const extraShots = playerScore.extraShots || [];

  // ─── 지금 입력 차례인 섹션 ──────────────────────────────────────────────────
  // 헤더 색: 지금 차례 = 금색, 입력을 마친 샷 = 초록 ✓, 아직 차례가 아닌 샷 = 회색.
  // 예전에는 '접힌 + 완료' 헤더를 금색으로 칠해서, 그린을 입력하는 중에도 티샷이
  // 강조돼 티샷 차례로 착각하게 만들었다.
  const currentTurn = (() => {
    // 랜딩 방향은 선택 입력이라, 그린 지점을 찍었어도 퍼팅 차례로 본다.
    if (shotPage === 1) return (playerScore.onGreenLanding || playerScore.gpsGreen) ? 'putt' : 'green';
    if (!teeComplete) return 'tee';
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
  const measuredKey = [holeIdx, activePlayer, ...measuredRemaining.map((d) => roundM(d) ?? '')].join('|');
  useEffect(() => {
    const patch = {};
    if (measuredSecond != null && measuredSecond !== playerScore.remainingAppliedM) {
      patch.remainingDistance = measuredSecond;
      patch.remainingAppliedM = measuredSecond;
    }
    let extrasChanged = false;
    const nextExtras = extraShots.map((shot, k) => {
      const d = measuredExtra(k);
      if (d != null && d !== shot.remainingAppliedM) {
        extrasChanged = true;
        return { ...shot, remainingDistance: d, remainingAppliedM: d };
      }
      return shot;
    });
    if (extrasChanged) patch.extraShots = nextExtras;
    if (Object.keys(patch).length > 0) updateGpsFields(patch);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measuredKey]);

  // 직전 샷 거리를 보여줄 기준 지점. 벌타 홀에서 멈춘 자리가 불확실한 샷(티샷 →
  // OB티 등)은 거리를 보여주지 않는다 — 복기·클럽 통계와 같은 기준.
  const trustedPrevPoint = (slot) => (shotDistanceTrusted(playerScore, hole.par, slot) ? (gpsPoints[slot] || null) : null);

  const setGpsPoint = (slot, fix) => {
    const next = [...gpsPoints];
    while (next.length <= slot) next.push(null);
    next[slot] = fix;
    updateGpsField('gpsPoints', next);
  };

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
      extraShots: [...extraShots, { club: null, subClub: null, lie: [], remainingDistance: null, windDirection: null, windStrength: null, onGreen: null }],
      ...extraFields,
    });
    setExpandedExtraShot(newIdx);
  };

  const removeExtraShot = (fromIdx) => {
    // 삭제한 샷의 GPS 지점도 함께 버린다. 남겨두면 나중에 같은 자리에 샷을 다시
    // 추가했을 때 지웠던 좌표가 "✓ 기록됨" 상태로 되살아난다.
    // (슬롯 0=티샷, 1=세컨샷이므로 익스트라샷 idx의 슬롯은 idx+2)
    updateFields({
      extraShots: extraShots.slice(0, fromIdx),
      gpsPoints: gpsPoints.slice(0, fromIdx + 2),
    });
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
      clearTimeout(shotPageTimeoutRef.current);
      updateFields({ teeGIR: false });
      setShotPage(0);
      return;
    }
    if (extraShots.length === 0 && hole.par === 3 && par3TeeOnGreen(playerScore)) {
      updateFields({ teeOnGreen: false, gir: false, girAuto: false });
      setShotPage(0);
      return;
    }
    if (extraShots.length === 0) {
      // 파5 이상 세컨샷 뒤 샷 추가는 레이업이라 GIR 실패가 아니다 (폼의 '2온 실패'와 같게)
      addExtraShot(hole.par >= 5 ? {} : hole.par > 3 ? { gir: false, girAuto: false } : { onGreen: false });
      return;
    }
    const lastIdx = extraShots.length - 1;
    updateField('extraShots', [
      ...extraShots.map((s, i) => i === lastIdx ? { ...s, onGreen: false } : s),
      { club: null, subClub: null, lie: [], remainingDistance: null,
        windDirection: null, windStrength: null, onGreen: null },
    ]);
    setExpandedExtraShot(extraShots.length);
  };

  // 잘못 눌렀을 때를 위한 되돌리기. 아무것도 입력되지 않은 마지막 샷만 지운다.
  const lastShotIsEmpty = extraShots.length > 0 && (() => {
    const last = extraShots[extraShots.length - 1];
    return !last.club && last.onGreen == null && !gpsPoints[extraShots.length + 1];
  })();
  const undoLastShotFromMap = () => removeExtraShot(extraShots.length - 1);

  const puttDetails = (() => {
    const raw = playerScore.puttDetails;
    return Array.from({ length: playerScore.putts || 0 }, (_, i) =>
      (raw && raw[i]) || (i === 0
        ? { distance: playerScore.puttDistance || null, aimDistance: playerScore.puttAimedDistance || null }
        : { distance: null, aimDistance: null })
    );
  })();

  // 퍼팅 거리 슬라이더의 시작값. 첫 퍼팅은 5m, 이후는 직전 퍼팅 거리의 절반
  // (0.5m 단위, 최소 0.5m) — 5m를 놓치면 보통 그보다 훨씬 짧게 남는다.
  // 직전 퍼팅도 입력 전이면 그 시작값을 기준으로 이어서 줄인다.
  const puttDefaultDistance = (idx) => {
    if (idx <= 0) return 5;
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
    const newDetails = Array.from({ length: clamped }, (_, i) => puttDetails[i] || { distance: null, aimDistance: null, lie: [] });
    // GIR을 사용자가 직접 선택한 뒤에는(girAuto:false) 퍼팅 수 변경이 그 선택을 덮어쓰지 않는다.
    // 스코어 자동 계산 중이면 GIR은 홀을 확정할 때 샷 기록으로 다시 계산한다.
    const ag = !autoScoreOn(playerScore) && playerScore.girAuto !== false ? calculateGir(playerScore.strokes, clamped, hole.par) : null;
    const girFields = ag !== null ? { gir: ag, girAuto: true } : {};
    updateFields({ putts: clamped, puttDetails: newDetails, puttsManual: true, ...girFields });
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
    const hasPenalty = (newScore.ob || 0) > 0 || (newScore.hazard || 0) > 0;
    const extra = hasPenalty && playerScore.teeGIR ? { teeGIR: false } : {};
    const newStrokes = calcAutoStrokes({ ...newScore, ...extra }, hole.par);
    updateFields({ [field]: newVal, penalties, ...extra, strokes: newStrokes, strokesManual: false });
  };

  // ─── 샷별 벌타 ──────────────────────────────────────────────────────────────
  // 샷 결과에서 [OB]·[해저드]를 누르면 그 샷의 벌타로 기록한다 (penalties.js 참고).
  // 한 샷에는 벌타가 하나뿐이다. 위쪽 합계 칸도 함께 올린다.
  // 벌타가 난 샷은 그린에 가지 못한 것이므로 결과를 맞추고 다음 샷 자리를 연다.
  const emptyShot = () => ({ club: null, subClub: null, lie: [], remainingDistance: null, windDirection: null, windStrength: null, onGreen: null });

  const addShotPenalty = (slot, type, mode = null) => {
    const old = penaltyAt(playerScore, slot);
    const rest = (playerScore.penalties || []).filter(p => p.slot !== slot);
    const counts = {
      ob: Math.max(0, (playerScore.ob || 0) - (old?.type === 'ob' ? 1 : 0)),
      hazard: Math.max(0, (playerScore.hazard || 0) - (old?.type === 'hazard' ? 1 : 0)),
    };
    // 위쪽 합계 칸에 이미 넣어 둔(어느 샷인지 모르는) 같은 벌타가 있으면 그것을 이 샷의
    // 벌타로 본다 — 위에서 OB +1을 누른 뒤 티샷 [OB]를 또 눌러도 두 번 세지 않게.
    const unclaimed = counts[type] - rest.filter(p => p.type === type).length;
    if (unclaimed <= 0) counts[type] += 1;
    const fields = { penalties: [...rest, { slot, type, mode }], ...counts, strokesManual: false };
    if (slot === 0) {
      // 티샷 벌타 — 페어웨이 미적중, 1온·온그린 아님. 다음 샷(세컨샷 자리)은 늘 있다.
      if (hole.par > 3) Object.assign(fields, { fairway: false, teeGIR: false });
      else Object.assign(fields, { teeOnGreen: false, gir: false, girAuto: false });
      clearTimeout(shotPageTimeoutRef.current);
    } else if (slot === 1) {
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
    // 제자리에서 다시 치기 — 다시 친 샷은 같은 자리에서 친다. 그 자리를 찍어 뒀으면 옮겨 적는다.
    if (type === 'ob' && mode === 'replay' && gpsPoints[slot] && !gpsPoints[slot + 1]) {
      const pts = [...gpsPoints];
      while (pts.length <= slot + 1) pts.push(null);
      pts[slot + 1] = gpsPoints[slot];
      fields.gpsPoints = pts;
    }
    updateFields(fields);
    // 다음 샷으로 화면을 옮긴다
    if (slot === 0) { setShotPage(0); setSecondShotExpanded(true); }
    else if (slot === 1) { setSecondShotExpanded(false); setExpandedExtraShot(0); }
    else setExpandedExtraShot(slot - 1);
  };

  const removeShotPenalty = (slot) => {
    const p = penaltyAt(playerScore, slot);
    if (!p) return;
    const fields = {
      penalties: (playerScore.penalties || []).filter(x => x.slot !== slot),
      [p.type]: Math.max(0, (playerScore[p.type] || 0) - 1),
      strokesManual: false,
    };
    // 벌타 때문에 만든 다음 샷이 아직 비어 있으면 함께 지운다 (잘못 누른 경우)
    const nextIdx = slot - 1;   // 다음 샷(slot+1)의 익스트라샷 번호
    const ns = slot >= 1 && nextIdx === extraShots.length - 1 ? extraShots[nextIdx] : null;
    if (ns && !ns.club && ns.onGreen == null && !gpsPoints[slot + 1]) {
      fields.extraShots = extraShots.slice(0, nextIdx);
      fields.gpsPoints = gpsPoints.slice(0, slot + 1);
    }
    updateFields(fields);
  };

  // OB 처리 선택 창의 두 버튼
  const chooseOb = (mode) => { const slot = obChoiceSlot; setObChoiceSlot(null); if (slot != null) addShotPenalty(slot, 'ob', mode); };
  const chooseObForward = () => chooseOb('forward');
  const chooseObReplay = () => chooseOb('replay');

  // [OB]·[해저드] 버튼 한 줄. OB는 처리 방식(OB티/다시 치기)을 고른 뒤 기록한다.
  const penaltyRow = (slot) => {
    const p = penaltyAt(playerScore, slot);
    const chip = (active) => ({
      flex: 1, padding: '9px 6px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
      fontSize: 12, fontWeight: 700,
      border: `1.5px solid ${active ? '#ef5350' : '#252f4a'}`,
      background: active ? 'rgba(239,83,80,0.14)' : '#1a2235',
      color: active ? '#ef5350' : '#8896b0',
    });
    return (
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 16px 10px', borderBottom:'1px solid #0e1320' }}>
        <span style={{ ...fLbl, minWidth: 40 }}>벌타</span>
        <button style={chip(p?.type === 'ob')}
          onClick={() => (p?.type === 'ob' ? removeShotPenalty(slot) : setObChoiceSlot(slot))}>
          {p?.type === 'ob' ? `OB · ${p.mode === 'replay' ? '다시 치기' : slot === 0 ? 'OB티' : '2벌타 드롭'} ✕` : 'OB'}
        </button>
        <button style={chip(p?.type === 'hazard')}
          onClick={() => (p?.type === 'hazard' ? removeShotPenalty(slot) : addShotPenalty(slot, 'hazard'))}>
          {p?.type === 'hazard' ? '해저드 ✕' : '해저드'}
        </button>
      </div>
    );
  };

  const updatePutt = (idx, key, val) =>
    updateField('puttDetails', puttDetails.map((p, i) => i === idx ? { ...p, [key]: val } : p));

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
  const isPuttEmpty = (p) =>
    p.distance == null && p.aimDistance == null &&
    (p.lie == null || p.lie === '' || (Array.isArray(p.lie) && p.lie.length === 0));

  useEffect(() => {
    const firstEmpty = puttDetails.findIndex(isPuttEmpty);
    setExpandedPutt(firstEmpty >= 0 ? firstEmpty : 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holeIdx, puttDetails.length]);

  useEffect(() => {
    clearTimeout(shotPageTimeoutRef.current);
    setShotPage(0); setTeeExpanded(true); setSecondShotExpanded(true); setExpandedExtraShot(0); prevExtraShotsLenRef.current = 0; setShowPuttsDropdown(false);
  }, [holeIdx]);

  useEffect(() => {
    if (extraShots.length > prevExtraShotsLenRef.current && extraShotTopRef.current) {
      setTimeout(() => extraShotTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    }
    prevExtraShotsLenRef.current = extraShots.length;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraShots.length]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (teeComplete) { setTeeExpanded(false); setShotPage((hole.par === 3 && par3TeeOnGreen(playerScore)) || playerScore.teeGIR ? 1 : 0); } }, [teeComplete]);

  useEffect(() => { if (shotPage === 1) scrollDown(); }, [shotPage]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.scoringHeader}>
        <button style={styles.iconBack} onClick={handleBackClick}><ChevronLeft size={22} /></button>
        <div style={styles.scoringCourse}>{round.courseName}</div>
        <button style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: '#8896b0', borderRadius: 8 }} onClick={openParEdit}>
          <Edit3 size={18} strokeWidth={2} />
        </button>
      </header>

      {/* Progress */}
      {(() => {
        const c = round.holes.filter(h => round.players.every(p => doneFor(h, p))).length;
        return (
          <div style={styles.progressBar}>
            <div style={styles.progressText}><span style={styles.progressNumber}>{c}</span><span style={styles.progressTotal}> / 18 holes</span></div>
            <div style={styles.progressTrack}><div style={{ ...styles.progressFill, width: `${(c/18)*100}%` }} /></div>
          </div>
        );
      })()}

      {/* Running Score */}
      {isSimpleMode ? (() => {
        const fmt=(d,has)=>!has?'—':d===0?'E':d>0?`+${d}`:`${d}`;
        const fmtC=(d,has)=>!has?'#4d5a78':d>0?'#ef5350':d<0?'#3db87a':'#8896b0';
        return (
          <div style={{ ...styles.runningScore, flexDirection:'column', gap:0, padding:'8px 16px' }}>
            {round.players.map((player, pi) => {
              const th = round.holes.filter(h => doneFor(h, player));
              const ps = th.reduce((s,h) => s+(h.scores[player]?.strokes||0), 0);
              const pp = th.reduce((s,h) => s+h.par, 0);
              const pd = ps-pp;
              const ft = round.holes.slice(0,9).filter(h=>doneFor(h, player));
              const bt = round.holes.slice(9).filter(h=>doneFor(h, player));
              const fd = ft.reduce((s,h)=>s+h.scores[player].strokes,0)-ft.reduce((s,h)=>s+h.par,0);
              const bd = bt.reduce((s,h)=>s+h.scores[player].strokes,0)-bt.reduce((s,h)=>s+h.par,0);
              const isLast = pi === round.players.length - 1;
              return (
                <div key={player} style={{ display:'flex', alignItems:'center', gap:8, paddingTop:6, paddingBottom:6, borderBottom: isLast?'none':'1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ width:20, height:20, borderRadius:'50%', background:'#1b2a45', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span style={{ fontSize:10, fontWeight:800, color:'#c9a228' }}>{pi+1}</span>
                  </div>
                  <span style={{ flex:1, fontSize:12, fontWeight:700, color:'#c4cfe0', minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{player}</span>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ textAlign:'center', minWidth:28 }}>
                      <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.1em', color:'#4d5a78', marginBottom:1 }}>{round.outCourseName||'OUT'}</div>
                      <div style={{ fontSize:12, fontWeight:800, color: fmtC(fd,ft.length>0) }}>{fmt(fd,ft.length>0)}</div>
                    </div>
                    <div style={{ textAlign:'center', minWidth:28 }}>
                      <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.1em', color:'#4d5a78', marginBottom:1 }}>{round.inCourseName||'IN'}</div>
                      <div style={{ fontSize:12, fontWeight:800, color: fmtC(bd,bt.length>0) }}>{fmt(bd,bt.length>0)}</div>
                    </div>
                    <div style={{ display:'flex', alignItems:'baseline', gap:2, minWidth:60, justifyContent:'flex-end' }}>
                      <span style={{ fontSize:22, fontWeight:900, color:'#e8edf8', lineHeight:1 }}>{ps||0}</span>
                      {th.length > 0 && <span style={{ fontSize:13, fontWeight:800, color: fmtC(pd,true), lineHeight:1 }}>({fmt(pd,true)})</span>}
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
        const ft = round.holes.slice(0,9).filter(h=>doneFor(h, activePlayer));
        const bt = round.holes.slice(9).filter(h=>doneFor(h, activePlayer));
        const fd = ft.reduce((s,h)=>s+h.scores[activePlayer].strokes,0)-ft.reduce((s,h)=>s+h.par,0);
        const bd = bt.reduce((s,h)=>s+h.scores[activePlayer].strokes,0)-bt.reduce((s,h)=>s+h.par,0);
        const fmt=(d,has)=>!has?'—':d===0?'E':d>0?`+${d}`:`${d}`;
        const fmtC=(d,has)=>!has?'#4d5a78':d>0?'#ef5350':d<0?'#3db87a':'#8896b0';
        return (
          <div style={styles.runningScore}>
            <div style={styles.runningScoreMain}>
              <div style={styles.runningScoreLabel}>SCORE</div>
              <div style={styles.runningScoreValues}>
                <span style={styles.runningScoreNumber}>{ps}</span>
                {th.length > 0 && <span style={{ ...styles.runningScoreDiff, color: fmtC(pd,true) }}>({fmt(pd,true)})</span>}
              </div>
            </div>
            <div style={styles.runningScoreDivider} />
            <div style={styles.runningScoreStats}>
              <div style={styles.runningScoreStat}>
                <span style={{ ...styles.runningScoreStatLabel, fontSize: (round.outCourseName||'OUT').length>5?'7px':'9px' }}>{round.outCourseName||'OUT'}</span>
                <span style={{ ...styles.runningScoreStatValue, color: fmtC(fd,ft.length>0) }}>{fmt(fd,ft.length>0)}</span>
              </div>
              <div style={styles.runningScoreStat}>
                <span style={{ ...styles.runningScoreStatLabel, fontSize: (round.inCourseName||'IN').length>5?'7px':'9px' }}>{round.inCourseName||'IN'}</span>
                <span style={{ ...styles.runningScoreStatValue, color: fmtC(bd,bt.length>0) }}>{fmt(bd,bt.length>0)}</span>
              </div>
              <div style={styles.runningScoreStat}>
                <span style={styles.runningScoreStatLabel}>PUTTS</span>
                <span style={styles.runningScoreStatValue}>{pu||'—'}</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Hole Navigator */}
      <div style={styles.holeNavigator}>
        {[
          { label: round.outCourseName||'OUT', holes: round.holes.slice(0,9), offset:0 },
          { label: round.inCourseName||'IN',   holes: round.holes.slice(9,18), offset:9 },
        ].map(({ label, holes, offset }) => (
          <div key={label} style={styles.holeNavTable}>
            <div style={styles.holeNavTableRow}>
              <div style={{ ...styles.holeNavRowLabel, ...styles.holeNavRowLabelHeader, fontSize: getNavLabelFontSize(label) }}>{label}</div>
              <div style={styles.holeNavTableCells}>
                {holes.map((h,li) => { const i=offset+li; const ic=i===holeIdx; return <button key={i} style={{ ...styles.holeNavHoleCell, background: ic?'#c9a228':'transparent', color: ic?'#0b0e18':'#8896b0' }} onClick={()=>goToHole(i)}>{i+1}</button>; })}
              </div>
            </div>
            <div style={styles.holeNavTableRow}>
              <div style={styles.holeNavRowLabel}>PAR</div>
              <div style={styles.holeNavTableCells}>
                {holes.map((h,li) => { const i=offset+li; const ic=i===holeIdx; const pc=h.par===3?(ic?'#ff8844':'#c96820'):h.par===5?(ic?'#5dd49a':'#2ea868'):(ic?'#c9a228':'#8896b0'); const pb=ic?(h.par===3?'rgba(200,80,20,0.22)':h.par===5?'rgba(61,184,122,0.18)':'#1a2235'):'transparent'; return <button key={i} style={{ ...styles.holeNavParCell, background: pb, color: pc, fontWeight: (h.par===3||h.par===5)?'800':'700', border:'none', cursor:'pointer', padding:0 }} onClick={()=>goToHole(i)}>{h.par}</button>; })}
              </div>
            </div>
            {isSimpleMode ? round.players.map((player, pi) => {
              const isLastPlayer = pi === round.players.length - 1;
              const shortName = player.length > 4 ? player.slice(0,4) : player;
              return (
                <div key={player} style={{ ...styles.holeNavTableRow, borderBottom: isLastPlayer ? 'none' : '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ ...styles.holeNavRowLabel, color:'#8fb0cc', fontSize:9, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{shortName}</div>
                  <div style={styles.holeNavTableCells}>
                    {holes.map((h,li) => {
                      const i=offset+li; const done=doneFor(h, player); const ic=i===holeIdx;
                      const psc=h.scores[player]; const diff=psc.strokes-h.par; const hio=done&&psc.strokes===1;
                      let ms={};
                      if(done) { if(hio) ms={...styles.markerHoleInOne}; else if(diff<=-2) ms={...styles.markerEagle}; else if(diff===-1) ms={...styles.markerBirdie}; else if(diff===0) ms={...styles.markerPar}; else if(diff===1) ms={...styles.markerBogey}; else ms={...styles.markerDouble}; }
                      return (
                        <button key={i} style={{ ...styles.holeNavScoreCell, background: ic?'#1a2235':'transparent' }} onClick={()=>goToHole(i)}>
                          <span style={{ ...styles.scoreMarker, ...ms, color: hio?'#0b0e18':done?(diff<=-1?'#3db87a':diff>=1?'#ef5350':'#e8edf8'):(ic?'#c9a228':'#4d5a78'), fontWeight: done?'700':'500' }}>
                            {hio&&<span style={styles.holeInOneStar}>★</span>}{!done && scorePending(psc) ? '·' : psc.strokes}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }) : (
            <div style={{ ...styles.holeNavTableRow, borderBottom: 'none' }}>
              <div style={styles.holeNavRowLabel}>SCORE</div>
              <div style={styles.holeNavTableCells}>
                {holes.map((h,li) => {
                  const i=offset+li; const done=round.players.every(p=>doneFor(h, p)); const ic=i===holeIdx;
                  const psc=h.scores[activePlayer]; const diff=psc.strokes-h.par; const hio=done&&psc.strokes===1;
                  let ms={};
                  if(done) { if(hio) ms={...styles.markerHoleInOne}; else if(diff<=-2) ms={...styles.markerEagle}; else if(diff===-1) ms={...styles.markerBirdie}; else if(diff===0) ms={...styles.markerPar}; else if(diff===1) ms={...styles.markerBogey}; else ms={...styles.markerDouble}; }
                  return (
                    <button key={i} style={{ ...styles.holeNavScoreCell, background: ic?'#1a2235':'transparent' }} onClick={()=>goToHole(i)}>
                      <span style={{ ...styles.scoreMarker, ...ms, color: hio?'#0b0e18':done?(diff<=-1?'#3db87a':diff>=1?'#ef5350':'#e8edf8'):(ic?'#c9a228':'#4d5a78'), fontWeight: done?'700':'500' }}>
                        {hio&&<span style={styles.holeInOneStar}>★</span>}{!done && scorePending(psc) ? '·' : psc.strokes}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            )}
          </div>
        ))}
      </div>

      {/* Hole Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 16px 16px', borderBottom:'1px solid #0e1320', background:'linear-gradient(180deg, rgba(255,255,255,0.025) 0%, transparent 100%)' }}>
        {/* 좌측: HOLE + PAR + 파대비 */}
        <div>
          <div style={{ fontSize:10, fontWeight:700, color:'#c9a228', letterSpacing:'0.28em', marginBottom:5, textTransform:'uppercase' }}>HOLE {holeIdx+1}</div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ fontSize:32, fontWeight:900, lineHeight:1, letterSpacing:'-0.02em', color: isPar5?'#3db87a': hole.par===3?'#5b9cf6':'#e8edf8' }}>PAR {hole.par}</div>
            {(() => {
              const diff = playerScore.strokes - hole.par;
              if (diff === 0 || !playerScore.touched || scorePending(playerScore)) return null;
              const under = diff < 0;
              return (
                <div style={{
                  display:'flex', alignItems:'center', justifyContent:'center',
                  height:28, padding:'0 10px',
                  fontSize:13, fontWeight:800, letterSpacing:'0.04em',
                  alignSelf:'center',
                  color: under?'#3db87a':'#ef5350',
                  background: under?'rgba(61,184,122,0.1)':'rgba(239,83,80,0.1)',
                  border:`1px solid ${under?'rgba(61,184,122,0.3)':'rgba(239,83,80,0.3)'}`,
                  borderRadius:6,
                }}>
                  {under ? diff : `+${diff}`}
                </div>
              );
            })()}
          </div>
        </div>

        {/* 우측: 스코어명 */}
        {/* 퍼팅 입력 전에는 스코어 이름(버디·보기…)을 붙이지 않는다 — 아직 정해지지 않았다 */}
        {scorePending(playerScore) && (
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.14em', color:'#8896b0', border:'1.5px solid #3a4e72', borderRadius:6, padding:'6px 12px' }}>
            진행 중
          </div>
        )}
        {scoreName && !scorePending(playerScore) && (
          <div style={{
            fontSize:11, fontWeight: isPar3AtPar?'800':(scoreName.fw||'700'),
            letterSpacing:'0.14em', textTransform:'uppercase',
            color: isPar3AtPar?'#fff':(scoreName.textColor||scoreName.color),
            background: isPar3AtPar?'linear-gradient(135deg,#c04a10 0%,#7a2000 100%)':(scoreName.bg||'transparent'),
            border:`1.5px solid ${isPar3AtPar?'#c04a10':scoreName.color}`,
            borderRadius:6, padding:'6px 12px',
            boxShadow: isPar3AtPar?'0 2px 12px rgba(180,60,0,0.45)':(playerScore.touched&&scoreName.shadow?scoreName.shadow:'none'),
            opacity: playerScore.touched?1:0.3,
            animation: playerScore.touched&&scoreName.anim?scoreName.anim:'none',
          }}>
            {isPar3AtPar?'PAR 3 !':scoreName.name}
          </div>
        )}
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
              <div key={player} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8, padding:'6px 10px', borderRadius:10, background:'#0d1525', border:'1px solid #1b2744' }}>
                <div style={{ width:26, height:26, borderRadius:'50%', background:'#1b2a45', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ fontSize:11, fontWeight:800, color:'#c9a228' }}>{pi+1}</span>
                </div>
                <span style={{ flex:1, fontSize:13, fontWeight:600, color:'#c4cfe0', minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{player}</span>
                <span style={{ fontSize:10, fontWeight:700, color: sn?.color||'#4d5a78', minWidth:24, textAlign:'center' }}>{diffLabel}</span>
                <div style={{ display:'flex', alignItems:'center', background:'#131c30', borderRadius:8, overflow:'hidden', height:38 }}>
                  <button style={{ width:38, height:38, background:'transparent', border:'none', color:'rgba(61,184,122,0.55)', fontSize:20, fontWeight:700, cursor:'pointer', flexShrink:0 }}
                    onClick={() => updatePlayerStrokes(player, Math.max(1, ps.strokes - 1))}>−</button>
                  <span style={{ width:34, textAlign:'center', fontSize:20, fontWeight:900, color: sn?.color||'#e8edf8', lineHeight:1 }}>{ps.strokes}</span>
                  <button style={{ width:38, height:38, background:'transparent', border:'none', color:'rgba(239,83,80,0.55)', fontSize:20, fontWeight:700, cursor:'pointer', flexShrink:0 }}
                    onClick={() => updatePlayerStrokes(player, Math.min(20, ps.strokes + 1))}>+</button>
                </div>
              </div>
            );
          })}

          {/* 이전/다음 홀 네비게이션 */}
          <div style={{ display:'flex', gap:8, marginTop:4 }}>
            <button
              disabled={holeIdx === 0}
              style={{ flex:1, height:46, borderRadius:10, border:'1px solid #1b2744', background:'transparent', color: holeIdx===0?'#252f4a':'#c4cfe0', fontSize:14, fontWeight:700, cursor: holeIdx===0?'default':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}
              onClick={() => goToHole(holeIdx - 1)}>
              ‹ 이전
            </button>
            {isLastHole ? (
              <button
                style={{ flex:1, height:46, borderRadius:10, border:'none', background:'#c9a228', color:'#0b0e18', fontSize:14, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}
                onClick={handleFinishClick}>
                🏁 라운드 완료
              </button>
            ) : (
              <button
                style={{ flex:1, height:46, borderRadius:10, border:'none', background:'#1b2a45', color:'#e8edf8', fontSize:14, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}
                onClick={handleNext}>
                다음 홀 ›
              </button>
            )}
          </div>
        </div>
      )}

      {!isSimpleMode && <>
      {/* 스코어 */}
      <div style={{ padding:'6px 16px 12px', borderBottom:'1px solid #0e1320' }}>
        <div style={{ display:'flex', alignItems:'center', marginBottom:6 }}>
          <div style={{ flex:1 }}>
            {/* 상세 입력 홀: 샷 기록으로 계산 중이면 '자동', 직접 고쳤으면 '직접 입력' */}
            {playerScore.teeClub && !isSimpleMode && (
              playerScore.strokesManual
                ? <span style={{ fontSize:10, fontWeight:700, color:'#c9a228' }}>직접 입력</span>
                : <span style={{ fontSize:10, fontWeight:700, color:'#3db87a' }}>샷 기록으로 자동 계산</span>
            )}
          </div>
          <span style={{ fontSize:13, color:'#c4cfe0', fontWeight:700, letterSpacing:'0.12em' }}>스코어</span>
          <div style={{ flex:1, display:'flex', justifyContent:'flex-end' }}>
            {playerScore.teeClub ? (
              // 상세 입력 홀에서 직접 고친 값을 버리고 샷 기록 계산으로 되돌린다
              playerScore.strokesManual && (
                <button style={{ fontSize:10, color:'#8896b0', background:'none', border:'1px solid #252f4a', borderRadius:4, padding:'3px 8px', cursor:'pointer' }}
                  onClick={()=>updateFields({ strokesManual: false })}>자동 계산</button>
              )
            ) : (
              <button style={{ fontSize:10, color:'#8896b0', background:'none', border:'1px solid #252f4a', borderRadius:4, padding:'3px 8px', cursor:'pointer' }}
                onClick={()=>updateScore('strokes', hole.par, { strokesManual: false })}>초기화</button>
            )}
          </div>
        </div>
        <div style={{ position:'relative', display:'flex', height:56, borderRadius:10, overflow:'hidden', background:'linear-gradient(to right, rgba(61,184,122,0.18), rgba(239,83,80,0.18))', boxShadow:'inset 0 0 0 1px rgba(255,255,255,0.07)' }}>
          <button
            style={{ flex:1, background:'transparent', border:'none', color:'rgba(61,184,122,0.4)', fontSize:22, fontWeight:700, cursor:'pointer' }}
            onClick={()=>updateScore('strokes',Math.max(1,playerScore.strokes-1))}>−</button>
          <button
            style={{ flex:1, background:'transparent', border:'none', color:'rgba(239,83,80,0.4)', fontSize:22, fontWeight:700, cursor:'pointer' }}
            onClick={()=>updateScore('strokes',Math.min(20,playerScore.strokes+1))}>+</button>
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
            {scorePending(playerScore) ? (
              // 퍼팅 전: 2퍼트로 가정한 스코어 대신 그린까지 친(칠) 타수만 보여준다
              <div style={{ textAlign:'center', lineHeight:1.2 }}>
                <div style={{ fontSize:17, fontWeight:900, color:'#e8edf8' }}>온그린까지 {strokesToGreen(playerScore, hole.par)}타</div>
                <div style={{ fontSize:11, fontWeight:700, color:'#8896b0', marginTop:2 }}>퍼팅 남음</div>
              </div>
            ) : (
              <span style={{ fontSize:28, fontWeight:900, color:scoreName?.color||'#e8edf8', letterSpacing:'-0.02em' }}>{playerScore.strokes}</span>
            )}
          </div>
        </div>
      </div>

      {/* 퍼팅 개수 */}
      <div style={{ padding:'6px 16px 10px', borderBottom:'1px solid #0e1320' }}>
        <div style={{ display:'flex', alignItems:'center', marginBottom:6 }}>
          <div style={{ flex:1 }} />
          <span style={{ fontSize:13, color:'#c4cfe0', fontWeight:700, letterSpacing:'0.12em' }}>퍼팅</span>
          <div style={{ flex:1, display:'flex', justifyContent:'flex-end' }}>
            <button style={{ fontSize:10, color:'#8896b0', background:'none', border:'1px solid #252f4a', borderRadius:4, padding:'3px 8px', cursor:'pointer' }}
              onClick={()=>{ updatePuttsCount(2); setShowPuttsDropdown(false); }}>초기화</button>
          </div>
        </div>
        <div style={{ position:'relative', display:'flex', height:46, borderRadius:10, overflow:'hidden', background:'linear-gradient(to right, rgba(61,184,122,0.22), rgba(239,83,80,0.22))', boxShadow:'inset 0 0 0 1px rgba(255,255,255,0.07)' }}>
          {[0,1,2,3,4].map((n, i) => {
            const t = n / 4;
            const r = Math.round(61 + (239-61)*t);
            const g = Math.round(184 + (83-184)*t);
            const b = Math.round(122 + (80-122)*t);
            const sel = n === 4 ? playerScore.putts >= 4 : playerScore.putts === n;
            const curVal = playerScore.putts;
            const disabled = n > maxPuttsAllowed;
            const label = n === 4
              ? (curVal < 4 ? '4' : `${curVal}+`)
              : String(n);
            return (
              <button key={n}
                disabled={disabled}
                style={{
                  flex:1, background: sel ? `rgba(${r},${g},${b},0.32)` : 'transparent',
                  border:'none', borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  color: sel ? `rgb(${r},${g},${b})` : 'rgba(232,237,248,0.45)',
                  fontSize: 18, fontWeight:900,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.35 : 1,
                  boxShadow: sel ? `inset 0 0 0 2px rgba(${r},${g},${b},0.7)` : 'none',
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

        {showPuttsDropdown && (() => {
          // 스코어가 높아 퍼팅 8개를 넘어야 하는 경우도 선택 가능하도록 상한까지 확장
          const upper = Math.max(8, Math.min(maxPuttsAllowed, 15));
          const options = Array.from({ length: Math.max(0, upper - 4) }, (_, i) => i + 5);
          return (
            <div style={{ display:'flex', gap:6, marginTop:6, flexWrap:'wrap' }}>
              {options.map(n => {
                const disabled = n > maxPuttsAllowed;
                const sel = playerScore.putts === n;
                return (
                  <button key={n}
                    disabled={disabled}
                    style={{
                      flex:1, height:38, borderRadius:8,
                      border: `2px solid ${sel ? '#ef5350' : '#1b2238'}`,
                      background: sel ? 'rgba(239,83,80,0.18)' : '#161c2c',
                      color: sel ? '#ef5350' : 'rgba(232,237,248,0.7)',
                      fontSize:16, fontWeight:800,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      opacity: disabled ? 0.35 : 1,
                    }}
                    onClick={() => { updatePuttsCount(n); setShowPuttsDropdown(false); }}>{n}</button>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* 패널티 */}
      <div style={{ padding:'6px 16px 10px', borderBottom:'1px solid #0e1320' }}>
        <div style={{ display:'flex', alignItems:'center', marginBottom:6 }}>
          <div style={{ flex:1 }} />
          <span style={{ fontSize:13, color:'#c4cfe0', fontWeight:700, letterSpacing:'0.12em' }}>패널티</span>
          <div style={{ flex:1, display:'flex', justifyContent:'flex-end' }}>
            {((playerScore.ob||0) > 0 || (playerScore.hazard||0) > 0) && (
              <button style={{ fontSize:10, color:'#8896b0', background:'none', border:'1px solid #252f4a', borderRadius:4, padding:'3px 8px', cursor:'pointer' }}
                onClick={()=>{ updateFields({ ob:0, hazard:0, penalties: [], strokes: calcAutoStrokes({...playerScore, ob:0, hazard:0, penalties: []}, hole.par), strokesManual: false }); }}>초기화</button>
            )}
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {[
            { label:'해저드', val:playerScore.hazard||0, onDec:()=>{ const c=playerScore.hazard||0; if(c>0) updatePenalty('hazard',c-1); }, onInc:()=>updatePenalty('hazard',Math.min(5,(playerScore.hazard||0)+1)) },
            { label:'OB',    val:playerScore.ob||0,     onDec:()=>{ const c=playerScore.ob||0;     if(c>0) updatePenalty('ob',c-1);     }, onInc:()=>updatePenalty('ob',    Math.min(5,(playerScore.ob||0)+1))   },
          ].map(item => (
            <div key={item.label} style={{ flex:1 }}>
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.15em', color:'#4d5a78', textAlign:'center', marginBottom:4 }}>{item.label}</div>
              <div style={{ position:'relative', display:'flex', height:46, borderRadius:10, overflow:'hidden', background:'#131c30', boxShadow:'inset 0 0 0 1px rgba(255,255,255,0.06)' }}>
                <button style={{ flex:1, background:'transparent', border:'none', color:'rgba(61,184,122,0.45)', fontSize:20, fontWeight:700, cursor:'pointer' }} onClick={item.onDec}>−</button>
                <button style={{ flex:1, background:'transparent', border:'none', color:'rgba(239,83,80,0.45)', fontSize:20, fontWeight:700, cursor:'pointer' }} onClick={item.onInc}>+</button>
                <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
                  <span style={{ fontSize:22, fontWeight:900, color: item.val > 0 ? '#ef5350' : '#4d5a78', lineHeight:1 }}>{item.val}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* 어느 샷인지 모르는 벌타(위쪽 칸으로만 넣은 것)가 있을 때만 안내한다 */}
        {(playerScore.ob||0) + (playerScore.hazard||0) > (playerScore.penalties || []).length && (
          <div style={{ fontSize:11, color:'#8896b0', textAlign:'center', marginTop:6, lineHeight:1.5 }}>
            여기서 넣은 OB는 OB티 기준(+2타)으로 계산돼요 · 해저드는 1벌타<br/>
            샷 아래 [OB]·[해저드]로 기록하면 '제자리에서 다시 치기'도 고를 수 있어요
          </div>
        )}
      </div>

      </>}

      {/* ── Score Input Form ── */}
      {!isSimpleMode && <div style={{ paddingBottom: 8 }}>

        {/* ── 티샷 아코디언 ── */}
        <button
          onClick={() => setTeeExpanded(v => !v)}
          style={{
            width:'100%', display:'flex', alignItems:'center', gap:8,
            padding:'12px 16px 8px', background:'none', border:'none', cursor:'pointer',
            borderBottom: teeExpanded ? 'none' : '1px solid #0e1320',
          }}
        >
          {(() => { const h = HDR[turnState('tee', teeComplete)]; return (<>
          <div style={{ height:1, flex:1, background: h.line }} />
          <span style={{ fontSize:12, fontWeight:800, color: h.label, letterSpacing:'0.18em', flexShrink:0 }}>{turnState('tee', teeComplete) === 'done' && '✓ '}티 샷</span>
          <div style={{ height:1, flex:1, background: h.line }} />
          <span style={{ fontSize:11, color: h.arrow, flexShrink:0 }}>{teeExpanded ? '▲' : '▼'}</span>
          </>); })()}
        </button>

        {teeExpanded && <>
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
          <div style={{ padding:'8px 16px 4px', borderBottom:'1px solid #0e1320' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <span style={fIcon}>📍</span><span style={fLbl}>핀 위치</span>
            </div>
            <RadialPicker centerId="center" centerLabel="센터" placeholder="선택 입력" dirs={PIN_DIRS} openWhenEmpty={false}
              value={Array.isArray(playerScore.pinPosition) ? playerScore.pinPosition[0] : playerScore.pinPosition}
              onChange={v => updateField('pinPosition', v)}
            />
          </div>
        )}

        {/* PAR3 전용: 거리 */}
        {hole.par === 3 && (
          <div style={{ padding:'8px 16px 14px', borderBottom:'1px solid #0e1320', animation:'fadeIn 0.18s ease-out' }}>
            <div style={{ ...fLeft, marginBottom:10 }}><span style={fIcon}>↔</span><span style={fLbl}>거리</span></div>
            <SwipeDistance value={playerScore.teeDistance ?? null} start={150} min={50} max={250} onChange={v=>updateField('teeDistance',v)} />
            <div style={{ textAlign:'center', fontSize:10, color:'#6e84a8', marginTop:6, letterSpacing:'0.06em' }}>← 슬라이드로 1m 단위 조정 →</div>
          </div>
        )}

        {/* 티샷 클럽 */}
        <ClubSelector
          icon="〽"
          label="클럽"
          categories={clubs}
          value={playerScore.teeClub}
          subValue={playerScore.teeClubSub}
          onCategory={v => { updateFields({ teeClub: v, teeClubSub: null }); if (v) scrollDown(); }}
          onSub={v => updateField('teeClubSub', v)}
          stacked
          onInteractStart={() => setTeeClubInteracting(true)}
          onInteractEnd={() => setTeeClubInteracting(false)}
        />

        {/* 티샷 구질 - 클럽 선택 완료 후 등장 */}
        {(
          (!playerScore.teeClub && !teeClubInteracting) ? (
          <div style={{ padding:'10px 16px', borderBottom:'1px solid #0e1320', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <span style={{ fontSize:11, color:'#6e84a8', letterSpacing:'0.08em' }}>클럽을 선택하면 구질 입력이 나타납니다</span>
          </div>
          ) : (playerScore.teeClub && !teeClubInteracting) ? (
          <div style={{ padding:'8px 16px 12px', borderBottom:'1px solid #0e1320', animation:'fadeIn 0.18s ease-out' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <span style={fIcon}>〜</span><span style={fLbl}>구질</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {[['페이드','스트레이트','드로우'],['훅','풀','푸시','슬라이스']].map((row, ri) => (
                <div key={ri} style={{ display:'flex', gap:6 }}>
                  {row.map(s => (
                    <button key={s}
                      style={{ ...fChip, flex:1, textAlign:'center', padding:'10px 6px', fontSize:13, borderRadius:8, ...(playerScore.shotShape===s?fChipOn:{}) }}
                      onClick={()=>{ const nv=playerScore.shotShape===s?null:s; updateField('shotShape',nv); if(nv) scrollDown(); }}>{s}</button>
                  ))}
                </div>
              ))}
            </div>
          </div>
          ) : null
        )}

        {/* PAR3 전용: GIR - 구질 선택 후 등장 */}
        {hole.par === 3 && playerScore.teeClub && playerScore.shotShape && !teeClubInteracting && (() => {
          const hioSelected = playerScore.putts===0 && playerScore.girAuto===false && (playerScore.puttDetails?.length||0)===0 && playerScore.touched;
          return (
          <div style={{ padding:'8px 16px 12px', borderBottom:'1px solid #0e1320', animation:'fadeIn 0.18s ease-out' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <span style={fIcon}>⚑</span><span style={fLbl}>GIR</span>
            </div>
            {/* 성공 / 실패 */}
            <div style={{ display:'flex', gap:8, marginBottom:8 }}>
              {/* teeOnGreen: 티샷 결과를 따로 남긴다 — gir는 홀 확정 때 다시 계산돼 바뀐다 */}
              <button style={{ ...fChipWide, flex:1, padding:'12px 8px', ...(playerScore.teeOnGreen===true || (playerScore.teeOnGreen==null && playerScore.gir===true && !playerScore.girAuto)?{ border:'2px solid #3db87a', color:'#3db87a' }:{}) }}
                onClick={()=>{ updateFields({ gir: true, girAuto: false, teeOnGreen: true }); setShotPage(1); }}>성공</button>
              <button style={{ ...fChipWide, flex:1, padding:'12px 8px', ...(playerScore.teeOnGreen===false || (playerScore.teeOnGreen==null && playerScore.gir===false)?{ border:'2px solid #ef5350', color:'#ef5350' }:{}) }}
                onClick={()=>{ updateFields({ gir: false, girAuto: false, teeOnGreen: false }); setSecondShotExpanded(true); setShotPage(0); scrollDown(); }}>실패</button>
            </div>
            {/* 홀인원 풀와이드 */}
            <button
              style={{
                width:'100%', padding:'13px 16px', borderRadius:8, cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                border: hioSelected ? '2px solid #c9a228' : '1.5px solid #252f4a',
                background: hioSelected
                  ? 'linear-gradient(135deg, rgba(201,162,40,0.28) 0%, rgba(201,162,40,0.08) 100%)'
                  : '#1a2235',
                color: hioSelected ? '#c9a228' : '#8896b0',
                fontWeight: 700, fontSize: 13, letterSpacing:'0.08em',
                animation: hioSelected ? 'holeInOnePulse 1.6s ease-in-out infinite' : 'none',
                boxShadow: hioSelected ? '0 0 20px rgba(201,162,40,0.35)' : 'none',
                transition: 'background 0.2s, border-color 0.2s, box-shadow 0.2s',
              }}
              onClick={() => {
                const freshStrokes = calcAutoStrokes({ ...playerScore, teeOnGreen: true, putts: 0 }, hole.par);
                const freshScore = { ...playerScore, gir: true, girAuto: false, teeOnGreen: true, putts: 0, strokes: freshStrokes, puttDetails: [], touched: true, strokesManual: false };
                triggerChipIn(freshScore);
              }}>
              {hioSelected && <span style={{ fontSize:16 }}>⭐</span>}
              <span>홀인원</span>
              {hioSelected && <span style={{ fontSize:16 }}>⭐</span>}
            </button>
          </div>
        );})()}
        {hole.par === 3 && playerScore.teeClub && playerScore.shotShape && !teeClubInteracting && penaltyRow(0)}

        {/* FAIRWAY HIT - 구질 선택 후 등장 */}
        {hole.par > 3 && playerScore.teeClub && playerScore.shotShape && (
          <div style={{ padding:'8px 16px 12px', borderBottom:'1px solid #0e1320', animation:'fadeIn 0.18s ease-out' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <span style={fIcon}>⊙</span><span style={fLbl}>FAIRWAY HIT</span>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {/* 1온(G)이면 볼이 그린 위라 페어웨이 O는 성립하지 않는다 — G를 먼저 해제해야 고를 수 있다 */}
              <button disabled={!!playerScore.teeGIR} style={{ flex:1, textAlign:'center', padding:'12px', borderRadius:8, border:`1.5px solid ${playerScore.fairway===true?'#3db87a':'#252f4a'}`, background:playerScore.fairway===true?'rgba(61,184,122,0.18)':'#1a2235', color:playerScore.fairway===true?'#3db87a':'#8896b0', fontSize:16, fontWeight:800, cursor: playerScore.teeGIR ? 'not-allowed' : 'pointer', opacity: playerScore.teeGIR ? 0.3 : 1 }} onClick={()=>{ if (playerScore.teeGIR) return; updateFields({ fairway: true, fairwayHit: playerScore.fairwayHit || 'C' }); scrollDown(); }}>O</button>
              <button style={{ flex:1, textAlign:'center', padding:'12px', borderRadius:8, border:`1.5px solid ${playerScore.fairway===false?'#ef5350':'#252f4a'}`, background:playerScore.fairway===false?'rgba(239,83,80,0.12)':'#1a2235', color:playerScore.fairway===false?'#ef5350':'#8896b0', fontSize:16, fontWeight:800, cursor:'pointer' }} onClick={()=>{ updateFields({ fairway: false, ...(playerScore.fairwayHit === 'C' ? { fairwayHit: null } : {}) }); scrollDown(); }}>X</button>
            </div>
          </div>
        )}

        {/* LANDING POINT (L/C/R/그린) — 페어웨이 O/X와 함께 보인다. O를 누르면 C로
            자동 기록돼 티샷이 바로 끝나고, 1온이면 O/X 없이 G만 눌러도 된다. */}
        {hole.par > 3 && playerScore.teeClub && playerScore.shotShape && (
          <div style={{ padding:'8px 16px 12px', borderBottom:'1px solid #0e1320', animation:'fadeIn 0.18s ease-out' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <span style={fIcon}>⚑</span><span style={fLbl}>LANDING POINT</span>
            </div>
            {/* L / C / R 3분할 */}
            <div style={{ display:'flex', gap:8, marginBottom:8 }}>
              {[['L','레프트','#c9a228'],['C','센터','#3db87a'],['R','라이트','#ef5350']].map(([id,label,col])=>(
                <button key={id} style={{ flex:1, textAlign:'center', padding:'10px 4px', borderRadius:8, border:`1.5px solid ${!playerScore.teeGIR && playerScore.fairwayHit===id?col:'#252f4a'}`, background:!playerScore.teeGIR && playerScore.fairwayHit===id?`${col}22`:'#1a2235', color:!playerScore.teeGIR && playerScore.fairwayHit===id?col:'#8896b0', fontSize:13, fontWeight:700, cursor:'pointer' }}
                  onClick={()=>{ clearTimeout(shotPageTimeoutRef.current); updateFields({ teeGIR: false, fairwayHit: playerScore.fairwayHit===id?null:id }); }}>
                  <div style={{ fontSize:12, fontWeight:800 }}>{id}</div>
                  <div style={{ fontSize:10, marginTop:2 }}>{label}</div>
                </button>
              ))}
            </div>
            {/* G 그린(1온) 풀와이드 버튼 */}
            <button
              style={{
                width:'100%', padding:'13px 16px', borderRadius:8, cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:10,
                border: playerScore.teeGIR ? '1.5px solid #c9a228' : '1.5px solid #252f4a',
                background: playerScore.teeGIR ? 'linear-gradient(135deg, rgba(201,162,40,0.22) 0%, rgba(201,162,40,0.08) 100%)' : '#1a2235',
                color: playerScore.teeGIR ? '#c9a228' : '#8896b0',
                animation: playerScore.teeGIR ? 'goldPulse 1.8s ease-in-out infinite' : 'none',
                boxShadow: playerScore.teeGIR ? '0 0 18px rgba(201,162,40,0.28)' : 'none',
                transition: 'background 0.2s, border-color 0.2s, box-shadow 0.2s',
              }}
              onClick={()=>{
                if (playerScore.teeGIR) { clearTimeout(shotPageTimeoutRef.current); updateFields({ teeGIR: false, fairway: null }); setShotPage(0); }
                else {
                  // 1온은 페어웨이 미적중으로 센다 — PGA 투어 Driving Accuracy 기준
                  // ('티샷이 페어웨이에 멈춘 비율'). 그린은 페어웨이가 아니다.
                  updateFields({ teeGIR: true, fairwayHit: null, fairway: false });
                  clearTimeout(shotPageTimeoutRef.current);
                  shotPageTimeoutRef.current = setTimeout(() => setShotPage(1), 2000);
                }
              }}>
              <span style={{ fontSize:15, fontWeight:900 }}>G</span>
              <span style={{ fontSize:12, fontWeight:700, letterSpacing:'0.06em' }}>그린  (1온)</span>
              {playerScore.teeGIR && <span style={{ fontSize:14, marginLeft:4 }}>⛳</span>}
            </button>
          </div>
        )}
        {hole.par > 3 && playerScore.teeClub && playerScore.shotShape && penaltyRow(0)}
        </>}

        {/* ── 페이지 네이션 ── */}
        <div style={{ display:'flex', margin:'8px 16px 0', borderRadius:10, overflow:'hidden', border:'1px solid #1b2238', background:'#0a0e1a' }}>
          {[['필드샷', 0], ['퍼팅', 1]].map(([label, pg]) => (
            <button key={pg} onClick={() => teeComplete && setShotPage(pg)}
              style={{ flex:1, padding:'12px 0', border:'none', cursor: teeComplete ? 'pointer' : 'default', background: teeComplete && shotPage===pg ? 'rgba(201,162,40,0.12)' : 'transparent', color: !teeComplete ? '#3d4d65' : shotPage===pg ? '#c9a228' : '#8896b0', fontSize:13, fontWeight:700, letterSpacing:'0.12em', borderBottom: `2px solid ${teeComplete && shotPage===pg ? '#c9a228' : 'transparent'}`, transition:'color 0.15s, background 0.15s' }}
            >{label}</button>
          ))}
        </div>
        {!teeComplete && (
          <div style={{ padding:'8px 16px', textAlign:'center' }}>
            <span style={{ fontSize:11, color:'#6e84a8', letterSpacing:'0.06em' }}>티샷 완료 후 입력 가능합니다</span>
          </div>
        )}

        {teeComplete && shotPage === 0 && !playerScore.teeGIR && <>
        {/* ── 세컨샷 아코디언 헤더 ── */}
        <button onClick={() => setSecondShotExpanded(v => !v)} style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'12px 16px 8px', background:'none', border:'none', cursor:'pointer', borderBottom: secondShotExpanded ? 'none' : '1px solid #0e1320' }}>
          {(() => {
            const st = turnState('second', !!playerScore.secondClub || playerScore.gir != null || extraShots.length > 0);
            const h = HDR[st];
            return (<>
          <div style={{ height:1, flex:1, background: h.line }} />
          <span style={{ fontSize:12, fontWeight:800, color: h.label, letterSpacing:'0.18em', flexShrink:0 }}>{st === 'done' && '✓ '}{secondShotName}</span>
          <div style={{ height:1, flex:1, background: h.line }} />
          <span style={{ fontSize:11, color: h.arrow, flexShrink:0 }}>{secondShotExpanded ? '▲' : '▼'}</span>
          </>); })()}
        </button>

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
        <div style={{ padding:'8px 16px 14px', borderBottom:'1px solid #0e1320' }}>
          <div style={{ ...fLeft, marginBottom:10 }}>
            <span style={fIcon}>↔</span><span style={fLbl}>남은 거리</span>
            {measuredSecond != null && <span style={{ fontSize:9, fontWeight:800, color:'#3db87a', marginLeft:6, padding:'1px 5px', borderRadius:4, border:'1px solid rgba(61,184,122,0.4)' }}>GPS 실측</span>}
          </div>
          <SwipeDistance value={playerScore.remainingDistance ?? null} start={defaultRemaining} min={1} max={SANE_REMAIN_M} onChange={v=>updateField('remainingDistance',v)} />
          <div style={{ textAlign:'center', fontSize:10, color:'#6e84a8', marginTop:6, letterSpacing:'0.06em' }}>← 슬라이드로 1m 단위 조정 →</div>
        </div>

        {/* 세컨샷 클럽 */}
        <ClubSelector
          icon="〽"
          label={titleShifted(playerScore, 1) ? '클럽' : '세컨샷 클럽'}
          categories={penaltyAt(playerScore, 0) ? AFTER_TEE_PENALTY_CLUBS : SECOND_CLUBS}
          value={playerScore.secondClub}
          subValue={playerScore.secondClubSub}
          onCategory={v => { updateFields({ secondClub: v, secondClubSub: null }); if (v) scrollDown(); }}
          onSub={v => updateField('secondClubSub', v)}
          stacked
        />

        {/* 라이·바람 — 기본 접힘, 세컨샷 클럽을 고르면 금색으로 활성화 */}
        <LieSection
          key={`lie-${holeIdx}-${activePlayer}`}
          label="세컨샷 라이"
          enabled={!!playerScore.secondClub}
          value={playerScore.terrainCondition}
          onChange={v => updateField('terrainCondition', v)}
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
        <div ref={extraShotTopRef} />

        {/* 세컨샷 GIR (추가 샷 없을 때, Par 4+). 파5 이상은 세컨샷 뒤 온그린이 GIR이
            아니라 2온이다 — 레이업을 'GIR 실패'로 누르게 하지 않도록 이름을 바꾼다.
            (GIR 값은 홀 확정 때 타수로 다시 계산된다) */}
        {extraShots.length === 0 && hole.par > 3 && (
          <div style={{ ...fRow, animation:'fadeIn 0.18s ease-out' }}>
            <div style={fLeft}><span style={fIcon}>⚑</span><span style={fLbl}>{penaltyAt(playerScore, 0) ? '온그린' : hole.par >= 5 ? '2온' : 'GIR'}</span></div>
            <div style={{ display:'flex', gap:6, flex:1 }}>
              <button style={{ ...fChipWide, flex:1, padding:'10px 8px', ...(playerScore.onGreen===true || (playerScore.gir===true && !playerScore.girAuto && playerScore.onGreen!=='chip-in') ? { border:'2px solid #3db87a', color:'#3db87a' } : {}) }}
                onClick={()=>{ updateFields({ gir: true, girAuto: false, onGreen: true }); setShotPage(1); }}>성공</button>
              <button style={{ ...fChipWide, flex:1, padding:'10px 8px', ...(playerScore.gir===false ? { border:'2px solid #ef5350', color:'#ef5350' } : {}) }}
                onClick={()=>{ setSecondShotExpanded(false); addExtraShot(hole.par >= 5 ? { onGreen: null } : { gir: false, girAuto: false, onGreen: null }); }}>실패</button>
              <button style={{ ...fChipWide, flex:1, padding:'10px 8px', ...(playerScore.onGreen==='chip-in' ? { border:'2px solid #c9a228', color:'#c9a228' } : {}) }}
                onClick={secondShotChipIn}>칩인</button>
            </div>
          </div>
        )}

        {/* 세컨샷 온그린 (추가 샷 없을 때, Par 3) */}
        {extraShots.length === 0 && hole.par === 3 && (
          <div style={{ ...fRow, animation:'fadeIn 0.18s ease-out' }}>
            <div style={fLeft}><span style={fIcon}>⚑</span><span style={fLbl}>온그린</span></div>
            <div style={{ display:'flex', gap:6, flex:1 }}>
              <button style={{ ...fChipWide, flex:1, padding:'10px 8px', ...(playerScore.onGreen===true ? { border:'2px solid #3db87a', color:'#3db87a' } : {}) }}
                onClick={()=>{ updateOnGreen(true); setShotPage(1); }}>성공</button>
              <button style={{ ...fChipWide, flex:1, padding:'10px 8px', ...(playerScore.onGreen===false ? { border:'2px solid #ef5350', color:'#ef5350' } : {}) }}
                onClick={()=>{ setSecondShotExpanded(false); addExtraShot({ onGreen: false }); }}>실패</button>
              <button style={{ ...fChipWide, flex:1, padding:'10px 8px', ...(playerScore.onGreen==='chip-in' ? { border:'2px solid #c9a228', color:'#c9a228' } : {}) }}
                onClick={secondShotChipIn}>칩인</button>
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
                style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'12px 16px 8px', background:'none', border:'none', cursor:'pointer', borderBottom: isExtraOpen ? 'none' : '1px solid #0e1320' }}
              >
                <div style={{ height:1, flex:1, background: exHdr.line }} />
                <span style={{ fontSize:12, fontWeight:800, color: exHdr.label, letterSpacing:'0.18em', flexShrink:0 }}>
                  {exState === 'done' && '✓ '}{extraShotName(idx)}
                </span>
                <div style={{ height:1, flex:1, background: exHdr.line }} />
                <span style={{ fontSize:11, color: exHdr.arrow, flexShrink:0 }}>{isExtraOpen ? '▲' : '▼'}</span>
              </button>

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
                <div style={{ padding:'8px 16px 14px', borderBottom:'1px solid #0e1320' }}>
                  <div style={{ ...fLeft, marginBottom:10 }}>
                    <span style={fIcon}>↔</span><span style={fLbl}>남은 거리</span>
                    {measuredExtra(idx) != null && <span style={{ fontSize:9, fontWeight:800, color:'#3db87a', marginLeft:6, padding:'1px 5px', borderRadius:4, border:'1px solid rgba(61,184,122,0.4)' }}>GPS 실측</span>}
                  </div>
                  <SwipeDistance value={shot.remainingDistance ?? null} start={extraStartDistance(idx)} min={1} max={SANE_REMAIN_M} onChange={v => updateExtraShot(idx, { remainingDistance: v })} />
                  <div style={{ textAlign:'center', fontSize:10, color:'#6e84a8', marginTop:6, letterSpacing:'0.06em' }}>← 슬라이드로 1m 단위 조정 →</div>
                </div>

                {/* 클럽 */}
                <ClubSelector
                  icon="〽" label="클럽" categories={SECOND_CLUBS}
                  value={shot.club} subValue={shot.subClub}
                  onCategory={v => { updateExtraShot(idx, { club: v, subClub: null }); if (v) scrollDown(); }}
                  onSub={v => updateExtraShot(idx, { subClub: v })}
                  stacked
                />

                {/* 라이·바람 — 기본 접힘, 클럽을 고르면 금색으로 활성화 */}
                <LieSection
                  key={`lie-${holeIdx}-${activePlayer}-${idx}`}
                  enabled={!!shot.club}
                  value={shot.lie}
                  onChange={v => updateExtraShot(idx, { lie: v })}
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
                <div style={{ ...fRow, animation:'fadeIn 0.18s ease-out' }}>
                  <div style={fLeft}><span style={fIcon}>⚑</span><span style={fLbl}>온그린</span></div>
                  <div style={{ display:'flex', gap:6, flex:1 }}>
                    <button
                      style={{ ...fChipWide, flex:1, padding:'10px 8px', ...(shot.onGreen===true ? { border:'2px solid #3db87a', color:'#3db87a' } : {}) }}
                      onClick={() => {
                        // 이 샷이 그린에 올라갔으면 뒤에 기록된 샷은 있을 수 없다 — '실패'를
                        // 잘못 눌러 생긴 샷이 남아 타수에 더해지지 않게 그 샷과 GPS 지점을 지운다.
                        updateFields({
                          extraShots: extraShots.slice(0, idx + 1).map((s, i) => i === idx ? { ...s, onGreen: true } : s),
                          gpsPoints: gpsPoints.slice(0, idx + 3),
                        });
                        setShotPage(1);
                      }}>성공</button>
                    <button
                      style={{ ...fChipWide, flex:1, padding:'10px 8px', ...(shot.onGreen===false ? { border:'2px solid #ef5350', color:'#ef5350' } : {}) }}
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
                        const newShot = { club:null, subClub:null, lie:[], remainingDistance: null, windDirection:null, windStrength:null, onGreen:null };
                        updateField('extraShots', [...updated, newShot]);
                        setExpandedExtraShot(extraShots.length);
                      }}>실패</button>
                    <button
                      style={{ ...fChipWide, flex:1, padding:'10px 8px', ...(shot.onGreen==='chip-in' ? { border:'2px solid #c9a228', color:'#c9a228' } : {}) }}
                      onClick={() => {
                        // 칩인 뒤에 기록된 샷도 함께 지운다 (위 '성공'과 같은 이유)
                        const updatedShots = extraShots.slice(0, idx + 1).map((s, i) => i === idx ? { ...s, onGreen: 'chip-in' } : s);
                        const freshPlayerScore = { ...playerScore, extraShots: updatedShots, gpsPoints: gpsPoints.slice(0, idx + 3), putts: 0 };
                        const freshStrokes = calcAutoStrokes(freshPlayerScore, hole.par);
                        const freshScore = { ...freshPlayerScore, strokes: freshStrokes, puttDetails: [], touched: true, strokesManual: false };
                        triggerChipIn(freshScore);
                      }}>칩인</button>
                  </div>
                </div>

                {penaltyRow(idx + 2)}

                {/* 삭제 */}
                <div style={{ padding:'6px 16px 10px', borderBottom:'1px solid #0e1320' }}>
                  <button
                    style={{ width:'100%', padding:'8px', borderRadius:7, border:'1px solid rgba(239,83,80,0.25)', background:'transparent', color:'rgba(239,83,80,0.5)', fontSize:11, fontWeight:600, cursor:'pointer' }}
                    onClick={() => removeExtraShot(idx)}>✕ {extraShotName(idx)} 이후 삭제</button>
                </div>
              </>)}
            </React.Fragment>
          );
        })}
        </>)}

        </>}

        {teeComplete && shotPage === 1 && <>

        {/* ── 그린 ── */}
        {secHdr('그 린', null, turnState('green', !!(playerScore.onGreenLanding || playerScore.gpsGreen)))}

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
          onCapture={fix => updateGpsField('gpsGreen', fix)}
          onClear={() => updateGpsField('gpsGreen', null)}
        />

        {/* 핀 위치 - PAR4+ 전용 (PAR3는 티샷에서 입력). 선택 입력 */}
        {hole.par > 3 && (
        <div style={{ padding:'8px 16px 4px', borderBottom:'1px solid #0e1320' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <span style={fIcon}>📍</span><span style={fLbl}>핀 위치</span>
          </div>
          <RadialPicker centerId="center" centerLabel="센터" placeholder="선택 입력" dirs={PIN_DIRS} openWhenEmpty={false}
            value={Array.isArray(playerScore.pinPosition) ? playerScore.pinPosition[0] : playerScore.pinPosition}
            onChange={v => updateField('pinPosition', v)}
          />
        </div>
        )}

        {/* 온그린 랜딩 (12-clock) — 선택 입력, 기본 접힘. 고르지 않아도 퍼팅이 열린다 */}
        <OptionalSection
          key={`landing-${holeIdx}-${activePlayer}`}
          icon="⊙" label="온그린 랜딩" enabled
          summary={playerScore.onGreenLanding ? `${playerScore.onGreenLanding}시 방향` : ''}
        >
          {(close) => (<>
            <ClockDial12 value={playerScore.onGreenLanding} onChange={v=>{ updateField('onGreenLanding',v); if(v) close(); }} />
            <div style={{ textAlign:'center', fontSize:11, color:'#8896b0', marginTop:10, lineHeight:1.6 }}>
              12시=롱 · 6시=숏 · 9시=레프트 · 3시=라이트 (핀 기준)
            </div>
          </>)}
        </OptionalSection>

        {/* 퍼팅 상세 */}
        {secHdr('퍼 팅', null, turnState('putt', false))}

        {playerScore.putts > 0 && (<>

          {/* 퍼팅별 상세 (아코디언) */}
          {puttDetails.map((putt, puttIdx) => {
            const isOpen = expandedPutt === puttIdx;
            const lieLabel = putt.lie
              ? (putt.lie === 'flat' ? '평지' : PUTT_LIE_DIRS.find(d => d.id === putt.lie)?.label ?? putt.lie)
              : null;
            return (
              <React.Fragment key={puttIdx}>
                {/* 아코디언 헤더 */}
                <button
                  onClick={() => { const next = isOpen ? -1 : puttIdx; setExpandedPutt(next); if (next >= 0) scrollDown(); }}
                  style={{
                    width:'100%', display:'flex', alignItems:'center', gap:8,
                    padding:'10px 16px', background:'none', border:'none', cursor:'pointer',
                    borderBottom: isOpen ? 'none' : '1px solid #0e1320',
                  }}
                >
                  {(() => { const done = !isOpen && !!putt.holein; return (<>
                    <div style={{ height:1, flex:1, background: done ? 'rgba(201,162,40,0.55)' : '#151e32' }} />
                    <span style={{ fontSize:11, fontWeight:700, color: isOpen || done ? '#c9a228' : '#4d5a78', letterSpacing:'0.18em' }}>
                      PUTT {puttIdx + 1}
                    </span>
                    <div style={{ height:1, flex:1, background: done ? 'rgba(201,162,40,0.55)' : '#151e32' }} />
                    <span style={{ fontSize:11, color: isOpen || done ? '#c9a228' : '#5a6a88' }}>{isOpen ? '▲' : '▼'}</span>
                  </>); })()}
                </button>

                {/* 펼쳐진 내용 */}
                {isOpen && (<>
                  <div style={{ padding:'8px 16px 4px', borderBottom:'1px solid #0e1320' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                      <span style={fIcon}>〜</span><span style={fLbl}>라이</span>
                    </div>
                    {/* 라이는 선택 입력 — 고르지 않아도 거리·홀인을 바로 누를 수 있다 */}
                    <RadialPicker centerId="flat" centerLabel="평지" placeholder="선택 입력" dirs={PUTT_LIE_DIRS} openWhenEmpty={false}
                      value={Array.isArray(putt.lie) ? putt.lie[0] : putt.lie}
                      onChange={v => updatePutt(puttIdx, 'lie', v)}
                    />
                  </div>
                  <div style={{ padding:'6px 16px 12px', borderBottom:'1px solid #0e1320', animation:'fadeIn 0.18s ease-out' }}>
                    <div style={{ ...fLeft, marginBottom:10 }}><span style={fIcon}>↔</span><span style={fLbl}>퍼팅 거리</span></div>
                    <SwipeDistance value={putt.distance ?? null} start={puttDefaultDistance(puttIdx)} min={0.5} max={30} step={0.5} decimals={1} onChange={v => updateField('puttDetails', puttDetails.map((p, i) => i === puttIdx ? { ...p, distance: v, aimDistance: v } : p))} />
                  </div>
                  <div style={{ padding:'6px 16px 12px', borderBottom:'1px solid #0e1320', animation:'fadeIn 0.18s ease-out' }}>
                    <div style={{ ...fLeft, marginBottom:10 }}><span style={fIcon}>🎯</span><span style={fLbl}>조준 거리</span></div>
                    <SwipeDistance value={putt.aimDistance ?? null} start={putt.distance ?? puttDefaultDistance(puttIdx)} min={0.5} max={30} step={0.5} decimals={1} onChange={v=>updatePutt(puttIdx,'aimDistance',v)} />
                  </div>
                  {/* 홀인 */}
                  <div style={{ padding:'8px 16px 12px', borderBottom:'1px solid #0e1320', animation:'fadeIn 0.18s ease-out' }}>
                    <div style={{ ...fLeft, marginBottom:8 }}>
                      <span style={fIcon}>⛳</span><span style={fLbl}>홀인</span>
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button
                        style={{ ...fChipWide, flex:1, padding:'10px 0', ...(putt.holein==='success'?{ border:'2px solid #3db87a', color:'#3db87a' }:{}) }}
                        onClick={() => {
                          if (holeInModalPendingRef.current) return;
                          holeInModalPendingRef.current = true;
                          const puttsUsed = puttIdx + 1;
                          const freshStrokes = calcAutoStrokes({ ...playerScore, putts: puttsUsed }, hole.par);
                          const newDetails = Array.from({ length: puttsUsed }, (_, i) =>
                            i === puttIdx ? { ...puttDetails[i], holein: 'success' } : (puttDetails[i] || { distance: null, aimDistance: null, lie: [] })
                          );
                          const freshScore = { ...playerScore, putts: puttsUsed, strokes: freshStrokes, puttDetails: newDetails, touched: true, strokesManual: false };
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
                          const onCount = freshStrokes - puttsUsed;
                          openHoleInModal({
                            isLastHole,
                            scoreName: getScoreName(freshStrokes, hole.par),
                            strokes: freshStrokes,
                            putts: puttsUsed,
                            onCount,
                          });
                        }}
                      >성공</button>
                      <button
                        style={{ ...fChipWide, flex:1, padding:'10px 0', ...(putt.holein==='fail'?{ border:'2px solid #ef5350', color:'#ef5350' }:{}) }}
                        onClick={() => {
                          const newPutts = Math.max(playerScore.putts || 0, puttIdx + 2);
                          const newDetails = Array.from({ length: newPutts }, (_, i) =>
                            i === puttIdx ? { ...puttDetails[i], holein: 'fail' } : (puttDetails[i] || { distance: null, aimDistance: null, lie: [] })
                          );
                          updateFields({ putts: newPutts, puttDetails: newDetails });
                          setExpandedPutt(puttIdx + 1);
                          scrollDown();
                        }}
                      >실패</button>
                    </div>
                  </div>
                </>)}
              </React.Fragment>
            );
          })}

        </>)}
        </>}

      </div>}

      {/* Scoring Bottom Bar */}
      <div style={styles.tabBar}>
        <div style={styles.tabBarInner}>

          {/* 이전 홀 */}
          <button
            style={{ ...styles.tabBarBtn, color: holeIdx === 0 ? '#252f4a' : '#e8edf8' }}
            onClick={() => goToHole(holeIdx - 1)}
            disabled={holeIdx === 0}
          >
            <ChevronLeft size={20} strokeWidth={holeIdx === 0 ? 1.5 : 2} />
            <span style={{ ...styles.tabBarLabel, fontWeight: '500' }}>이전</span>
          </button>

          {/* 홀 지도 */}
          <button
            style={{ ...styles.tabBarBtn, color: (gpsPoints.some(Boolean) || gpsGreen) ? '#c9a228' : '#4d5a78' }}
            onClick={() => setShowHoleMap(true)}
          >
            <MapIcon size={20} strokeWidth={1.8} />
            <span style={{ ...styles.tabBarLabel, fontWeight: '500' }}>지도</span>
          </button>

          {/* 홈 */}
          <button
            style={{ ...styles.tabBarBtn, ...styles.tabBarBtnHome, color: '#e8edf8' }}
            onClick={onGoHome}
          >
            <Home size={24} strokeWidth={1.8} />
          </button>

          {/* 메모 */}
          <button
            style={{ ...styles.tabBarBtn, color: playerScore.memo ? '#c9a228' : '#4d5a78', position: 'relative' }}
            onClick={() => { setMemoDraft(playerScore.memo || ''); setShowMemoModal(true); }}
          >
            <Edit3 size={20} strokeWidth={1.8} />
            <span style={{ ...styles.tabBarLabel, fontWeight: playerScore.memo ? '700' : '500' }}>메모</span>
            {playerScore.memo && (
              <div style={{ position: 'absolute', top: 8, right: 'calc(50% - 12px)', width: 5, height: 5, borderRadius: '50%', background: '#c9a228' }} />
            )}
          </button>

          {/* 다음 홀 / 라운딩 완료 */}
          {isLastHole ? (
            <button
              style={{ ...styles.tabBarBtn, color: '#c9a228' }}
              onClick={handleFinishClick}
            >
              <Flag size={20} strokeWidth={2} />
              <span style={{ ...styles.tabBarLabel, fontWeight: '700' }}>완료</span>
            </button>
          ) : (
            <button
              style={{ ...styles.tabBarBtn, color: '#e8edf8' }}
              onClick={handleNext}
            >
              <ChevronRight size={20} strokeWidth={2} />
              <span style={{ ...styles.tabBarLabel, fontWeight: '500' }}>다음</span>
            </button>
          )}

        </div>
      </div>

      {/* 미입력 홀 확인 모달 */}
      {pendingFinish && (() => {
        const missing = untouchedHoles(pendingFinish);
        return (
          <div style={styles.modalOverlay} onClick={() => setPendingFinish(null)}>
            <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
              <div style={styles.modalIcon}>📝</div>
              <div style={styles.modalTitle}>입력하지 않은 홀이 있어요</div>
              <div style={styles.modalText}>
                {missing.map(i => `${i + 1}`).join(', ')}번 홀<br/>
                그대로 완료하면 이 홀들은 파(2퍼트)로 저장돼요
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <button style={styles.modalBtnCancel} onClick={() => { setPendingFinish(null); goToHole(missing[0]); }}>
                  {missing[0] + 1}번 홀 입력하러 가기
                </button>
                <button style={styles.modalBtnPrimary} onClick={() => doFinish(pendingFinish)}>그대로 완료</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 입력 없는 홀에서 '다음' 확인 모달 */}
      {pendingSkip != null && (
        <div style={styles.modalOverlay} onClick={() => setPendingSkip(null)}>
          <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div style={styles.modalIcon}>📝</div>
            <div style={styles.modalTitle}>{holeIdx + 1}번 홀 스코어를 입력하지 않았어요</div>
            <div style={styles.modalText}>
              {isSimpleMode ? '모두 파로 기록할까요?' : '파(2퍼트)로 기록할까요?'}
              {/* 위치만 찍은 홀 — 스코어는 비어 있어도 찍은 지점은 남는다는 걸 알린다 */}
              {round.players.some(p => { const sc = hole.scores[p]; return (sc?.gpsPoints || []).some(Boolean) || sc?.gpsGreen || sc?.gpsPin; }) && (
                <><br/>찍어 둔 위치(GPS)는 어느 쪽이든 그대로 남아요</>
              )}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <button style={styles.modalBtnPrimary} onClick={() => { const to = pendingSkip; setPendingSkip(null); confirmAndGoToHole(to); }}>
                파로 기록하고 다음 홀
              </button>
              <button style={styles.modalBtnCancel} onClick={() => { const to = pendingSkip; setPendingSkip(null); goToHole(to); }}>
                기록하지 않고 넘어가기
              </button>
              <button style={styles.modalBtnCancel} onClick={() => setPendingSkip(null)}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* OB 처리 선택 — OB티로 이동(앞으로 나가서 치기) / 제자리에서 다시 치기 */}
      {obChoiceSlot != null && (
        <div style={styles.modalOverlay} onClick={() => setObChoiceSlot(null)}>
          <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div style={styles.modalIcon}>⚠️</div>
            <div style={styles.modalTitle}>{shotLabel(obChoiceSlot)} OB</div>
            <div style={styles.modalText}>다음 샷을 어디서 쳤나요?<br/>스코어는 둘 다 +2타예요</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <button style={styles.modalBtnPrimary} onClick={chooseObForward}>
                {obChoiceSlot === 0 ? 'OB티로 이동' : '앞으로 나가서 치기 (2벌타 드롭)'}
                <div style={obChoiceSub}>다음 샷 = {strokeNumberOf(playerScore, obChoiceSlot) + 3}번째 샷</div>
              </button>
              <button style={styles.modalBtnCancel} onClick={chooseObReplay}>
                제자리에서 다시 치기
                <div style={obChoiceSub}>다시 친 샷 = {strokeNumberOf(playerScore, obChoiceSlot) + 2}번째 샷 · 클럽·위치도 기록</div>
              </button>
              <button style={styles.modalBtnCancel} onClick={() => setObChoiceSlot(null)}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 퍼팅 수를 모른 채 '다음'/'완료' — 2퍼트로 가정하지 않고 물어본다 */}
      {puttAsk && (
        <div style={styles.modalOverlay} onClick={() => setPuttAsk(null)}>
          <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div style={styles.modalIcon}>⛳</div>
            <div style={styles.modalTitle}>퍼팅을 몇 번 했나요?</div>
            <div style={styles.modalText}>{holeIdx + 1}번 홀 · 온그린까지 {strokesToGreen(playerScore, hole.par)}타</div>
            <div style={{ display:'flex', gap:6, marginBottom:10 }}>
              {[0, 1, 2, 3, 4, 5].map(n => (
                <button key={n}
                  style={{ flex:1, height:48, borderRadius:10, border:'1.5px solid #3a4e72', background:'#1a2235', color:'#e8edf8', fontSize:18, fontWeight:900, cursor:'pointer' }}
                  onClick={() => confirmWithPutts(n)}>{n}</button>
              ))}
            </div>
            <button style={styles.modalBtnCancel} onClick={() => setPuttAsk(null)}>취소</button>
          </div>
        </div>
      )}

      {/* Exit 확인 모달 */}
      {showExitConfirm && (
        <div style={styles.modalOverlay} onClick={()=>setShowExitConfirm(false)}>
          <div style={styles.modalCard} onClick={e=>e.stopPropagation()}>
            <div style={styles.modalIcon}>⚠️</div>
            <div style={styles.modalTitle}>라운드를 그만두시겠어요?</div>
            <div style={styles.modalText}>아래 두 버튼은 지금까지 입력한<br/>이 라운드 기록을 <b style={{ color:'#ef5350' }}>삭제</b>합니다</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
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
        <div style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.78)', animation:'modalFadeIn 0.25s ease-out' }}>
          <div style={{ animation:'modalSlideUp 0.38s cubic-bezier(0.16,1,0.3,1)', display:'flex', flexDirection:'column', alignItems:'center', gap:14, padding:'36px 44px', borderRadius:20, background:'rgba(8,14,26,0.97)', border:`1.5px solid ${holeInModalData.scoreName?.color ? holeInModalData.scoreName.color + '55' : 'rgba(201,162,40,0.35)'}`, boxShadow:'0 8px 48px rgba(0,0,0,0.65)', minWidth:220, textAlign:'center' }}>
            <div style={{ fontSize:32 }}>⛳</div>
            <div style={{ fontSize:13, fontWeight:700, color:'#8896b0', letterSpacing:'0.2em', textTransform:'uppercase' }}>홀인 성공</div>
            <div style={{ fontSize:26, fontWeight:900, color: holeInModalData.scoreName?.color || '#c9a228', letterSpacing:'0.04em' }}>
              {holeInModalData.scoreName?.name || `${holeInModalData.strokes}타`}
            </div>
            <div style={{ width:40, height:1, background:'rgba(255,255,255,0.1)' }} />
            <div style={{ fontSize:14, fontWeight:600, color:'#c4cfe0', letterSpacing:'0.08em' }}>
              {holeInModalData.onCount} 온 &nbsp;/&nbsp; {holeInModalData.putts} 펏
            </div>
            <div style={{ fontSize:11, color:'#4d5a78', letterSpacing:'0.12em', marginTop:4 }}>
              {holeInModalData.isLastHole ? '라운드 완료!' : '다음 홀로 이동합니다.'}
            </div>
            <button
              onClick={cancelHoleIn}
              style={{ marginTop:6, padding:'10px 22px', borderRadius:9, border:'1px solid #3a4e72', background:'transparent', color:'#c4cfe0', fontSize:13, fontWeight:700, cursor:'pointer' }}
            >취소 (잘못 눌렀어요)</button>
          </div>
        </div>
      )}

      {/* 파 수정 모달 */}
      {showParEditModal && (
        <div style={styles.modalOverlay} onClick={()=>setShowParEditModal(false)}>
          <div style={{ ...styles.modalCard, maxWidth:400, width:'calc(100% - 32px)', padding:'20px 16px 24px', maxHeight:'90vh', overflowY:'auto' }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ fontSize:16, fontWeight:700, color:'#e8edf8' }}>파 수정</div>
              <button style={{ background:'none', border:'none', color:'#8896b0', cursor:'pointer', padding:4 }} onClick={()=>setShowParEditModal(false)}><X size={18} /></button>
            </div>
            <div style={{ ...styles.parSummary, marginBottom:12 }}>
              <div style={styles.parSummaryMain}><div style={styles.parSummaryLabel}>TOTAL PAR</div><div style={styles.parSummaryValue}>{parDraft.reduce((a,b)=>a+b,0)}</div></div>
              <div style={styles.parSummaryDivider} />
              <div style={styles.parSummaryNines}>
                <div style={styles.parSummaryNineRow}><span style={styles.parSummaryNineLabel}>{round.outCourseName||'OUT'}</span><span style={styles.parSummaryNineValue}>{parDraft.slice(0,9).reduce((a,b)=>a+b,0)}</span></div>
                <div style={styles.parSummaryNineRow}><span style={styles.parSummaryNineLabel}>{round.inCourseName||'IN'}</span><span style={styles.parSummaryNineValue}>{parDraft.slice(9).reduce((a,b)=>a+b,0)}</span></div>
              </div>
            </div>
            <div style={styles.parTableHint}>← 왼쪽 탭: -1 · 오른쪽 탭: +1 →</div>
            {[{label:round.outCourseName||'OUT',start:0,end:9},{label:round.inCourseName||'IN',start:9,end:18}].map(({label,start,end})=>(
              <div key={label} style={styles.parTable}>
                <div style={styles.parTableRow}>
                  <div style={{ ...styles.parTableLabel, ...styles.parTableLabelHeader }}>{label}</div>
                  <div style={styles.parTableCells}>{parDraft.slice(start,end).map((_,li)=><div key={li} style={styles.parTableHoleCell}>{start+li+1}</div>)}</div>
                  <div style={{ ...styles.parTableTotal, ...styles.parTableTotalHeader }}>TOT</div>
                </div>
                <div style={{ ...styles.parTableRow, borderBottom:'none' }}>
                  <div style={styles.parTableLabel}>PAR</div>
                  <div style={styles.parTableCells}>
                    {parDraft.slice(start,end).map((p,li)=>{
                      const hi=start+li;
                      return (
                        <div key={hi} style={styles.parTableParCell}>
                          <div style={{ ...styles.parTableParValue, background:p===3?'rgba(61,184,122,0.15)':p===4?'#0e1c14':p===5?'#c9a228':'#ef5350', color:p===3?'#3db87a':p===4?'#e8edf8':'#0b0e18', outline:hi===holeIdx?'2px solid #c9a228':'none', outlineOffset:1 }}>{p}</div>
                          <button style={{ ...styles.parTapZone, left:0, opacity:p>3?1:0.3 }} onClick={()=>p>3&&updateParDraft(hi,p-1)} />
                          <button style={{ ...styles.parTapZone, right:0, opacity:p<7?1:0.3 }} onClick={()=>p<7&&updateParDraft(hi,p+1)} />
                        </div>
                      );
                    })}
                  </div>
                  <div style={styles.parTableTotal}>{parDraft.slice(start,end).reduce((a,b)=>a+b,0)}</div>
                </div>
              </div>
            ))}
            <div style={{ fontSize:11, color:'#4d5a78', marginTop:10, marginBottom:16, lineHeight:1.5 }}>* 이미 입력된 홀의 스코어는 유지됩니다.<br/>* 미입력 홀은 변경된 파 기준으로 초기화됩니다.</div>
            <div style={{ display:'flex', gap:8 }}>
              <button style={{ ...styles.modalBtnCancel, flex:1 }} onClick={()=>setShowParEditModal(false)}>취소</button>
              <button style={{ ...styles.memoSaveBtn, flex:2 }} onClick={saveParEdit}>저장</button>
            </div>
          </div>
        </div>
      )}

      {/* 메모 모달 */}
      {showHoleMap && (
        <HoleMapModal
          holeNo={holeIdx + 1}
          par={hole.par}
          gpsPoints={gpsPoints}
          gpsGreen={gpsGreen}
          gpsPin={gpsPin}
          fieldShots={fieldShots}
          shotLabel={shotLabel}
          shotTrusted={(slot) => shotDistanceTrusted(playerScore, hole.par, slot)}
          finalLabel={isHoledOut(playerScore) ? '홀' : '그린 랜딩'}
          onSetPoint={setGpsPoint}
          onSetGreen={fix => updateGpsField('gpsGreen', fix)}
          onSetPin={fix => updateGpsField('gpsPin', fix)}
          onAddShot={addShotFromMap}
          onUndoShot={lastShotIsEmpty ? undoLastShotFromMap : null}
          onClose={() => setShowHoleMap(false)}
        />
      )}

      {showMemoModal && (
        <div style={styles.modalOverlay} onClick={()=>setShowMemoModal(false)}>
          <div style={styles.memoModalCard} onClick={e=>e.stopPropagation()}>
            <div style={styles.memoModalHeader}>
              <div style={styles.memoModalTitle}>HOLE {holeIdx+1} 메모</div>
              <div style={styles.memoModalSub}>PAR {hole.par} · 이 홀에서 기억하고 싶은 내용을 적어보세요</div>
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
  active: { line: 'rgba(201,162,40,0.6)', label: '#e8c45a', arrow: '#c9a228' },
  done:   { line: 'rgba(61,184,122,0.3)', label: '#3db87a', arrow: '#3db87a' },
  idle:   { line: '#252f4a',              label: '#6e84a8', arrow: '#5a6a88' },
};

const fRow = { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px', borderBottom:'1px solid #0e1320', minHeight:54, gap:12 };
const fLeft = { display:'flex', alignItems:'center', gap:8, flexShrink:0, minWidth:130 };
const fIcon = { fontSize:14, width:18, textAlign:'center', color:'#7888a8', flexShrink:0 };
const fLbl  = { fontSize:11, fontWeight:700, color:'#8ca4bc', letterSpacing:'0.15em', textTransform:'uppercase' };

const fChip = { padding:'5px 9px', borderRadius:6, border:'1.5px solid #252f4a', background:'#1a2235', color:'#e8edf8', fontSize:11, fontWeight:600, cursor:'pointer' };
const fChipOn = { border:'2px solid #c9a228', background:'rgba(201,162,40,0.18)', color:'#c9a228' };
const fChipWide = { minWidth:52, padding:'7px 12px', borderRadius:8, border:'1.5px solid #252f4a', background:'#1a2235', color:'#8896b0', fontSize:13, fontWeight:700, cursor:'pointer' };

const obChoiceSub = { fontSize: 12, fontWeight: 600, marginTop: 3, opacity: 0.85 };

const fMiniBtn = { width:32, height:32, borderRadius:7, border:'1px solid #252f4a', background:'#111827', color:'#e8edf8', fontSize:18, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' };

const fPenBox = { flex:1, minHeight:64, background:'#1a2235', border:'1px solid #252f4a', borderRadius:10, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4, padding:'8px 10px' };
const fPenLbl = { fontSize:9, color:'#8896b0', fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase' };
