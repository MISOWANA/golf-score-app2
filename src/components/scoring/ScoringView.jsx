import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, Edit3, Home, Flag } from 'lucide-react';
import styles from '../../styles/styles';

// ─── Constants ────────────────────────────────────────────────────────────────

const CLOCK_HOURS = Array.from({ length: 12 }, (_, i) => {
  const hour = i + 1;
  const angle = (hour * 30 - 90) * (Math.PI / 180);
  const KEY = { 12: 'LONG', 6: 'SHORT', 9: 'LEFT', 3: 'RIGHT' };
  return { hour, label: KEY[hour] || String(hour), isKey: [3,6,9,12].includes(hour), cx: 50 + 40 * Math.cos(angle), cy: 50 + 40 * Math.sin(angle) };
});

const TERRAIN_OPTIONS = [
  { id: 'flat',     label: '평지' },
  { id: 'uphill',   label: '오르막' },
  { id: 'downhill', label: '내리막' },
  { id: 'hook',     label: '훅' },
  { id: 'slice',    label: '슬라이스' },
];

const LIE_GRID = [
  null,      'uphill', null,
  'slice',   'flat',   'hook',
  null,      'downhill', null,
];

const PUTT_LIE_OPTIONS = [
  { id: 'flat',         label: '평지' },
  { id: 'uphill',       label: '오르막' },
  { id: 'downhill',     label: '내리막' },
  { id: 'break-left',   label: '슬라이스' },
  { id: 'break-right',  label: '훅' },
  { id: 'grain-with',   label: '순결' },
  { id: 'grain-against',label: '역결' },
];

const PIN_OPTIONS = [
  { id: 'front',  label: '프론트' },
  { id: 'back',   label: '백' },
  { id: 'center', label: '센터' },
  { id: 'left',   label: '레프트' },
  { id: 'right',  label: '라이트' },
];

const SECOND_CLUBS = [
  { id: 'wood',   label: 'WOOD' },
  { id: 'hybrid', label: 'HYBRID' },
  { id: 'iron',   label: 'IRON' },
  { id: 'wedge',  label: 'WEDGE' },
];

const WEDGE_OPTIONS = [48, 50, 52, 54, 56, 58, 60, 62];

const CLUB_SUBS = {
  driver: [],
  wood:   [{ id: '3w', label: '3W' }, { id: '5w', label: '5W' }, { id: '7w', label: '7W' }, { id: '9w', label: '9W' }],
  hybrid: [{ id: '2h', label: '2H' }, { id: '3h', label: '3H' }, { id: '4h', label: '4H' }, { id: '5h', label: '5H' }],
  iron:   [{ id: '2i', label: '2i' }, { id: '3i', label: '3i' }, { id: '4i', label: '4i' }, { id: '5i', label: '5i' }, { id: '6i', label: '6i' }, { id: '7i', label: '7i' }, { id: '8i', label: '8i' }, { id: '9i', label: '9i' }],
  wedge:  [
    { id: 'P',  label: 'P'   },
    { id: '48', label: '48°' },
    { id: '50', label: '50°' },
    { id: '52', label: '52°' },
    { id: '54', label: '54°' },
    { id: '56', label: '56°' },
    { id: '58', label: '58°' },
    { id: '60', label: '60°' },
    { id: '62', label: '62°' },
  ],
};

const COMPASS_LABELS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
const toCompassLabel = (deg) => deg == null ? '—' : COMPASS_LABELS[Math.round(deg / 22.5) % 16];

const getNavLabelFontSize = (text) => {
  const len = (text || '').length;
  if (len <= 3) return '11px'; if (len <= 5) return '9px'; if (len <= 7) return '8px'; if (len <= 10) return '7px'; return '6px';
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SwipeDistance({ value, min = 1, max = 300, onChange, step = 1, decimals = 0, unit = 'm' }) {
  const startX = useRef(null);
  const startVal = useRef(value);
  const [active, setActive] = useState(false);
  const clamp = v => parseFloat(Math.max(min, Math.min(max, Math.round(v / step) * step)).toFixed(decimals));

  const handleStart = (x) => { startX.current = x; startVal.current = value; setActive(true); };
  const handleMove  = (x) => { onChange(clamp(startVal.current + (x - startX.current) / 4 * step)); };
  const handleEnd   = () => setActive(false);

  const display = decimals > 0 ? Number(value).toFixed(decimals) : value;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button style={fMiniBtn} onClick={() => onChange(clamp(value - step))}>−</button>
      <div
        style={{ flex: 1, textAlign: 'center', padding: '8px 0', cursor: 'ew-resize', touchAction: 'none', userSelect: 'none', background: active ? 'rgba(201,162,40,0.06)' : 'transparent', borderRadius: 8, transition: 'background 0.15s' }}
        onTouchStart={e => handleStart(e.touches[0].clientX)}
        onTouchMove={e => { e.preventDefault(); handleMove(e.touches[0].clientX); }}
        onTouchEnd={handleEnd}
        onMouseDown={e => {
          handleStart(e.clientX);
          const move = (me) => handleMove(me.clientX);
          const up   = () => { handleEnd(); window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
          window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
        }}
      >
        <span style={{ fontSize: 34, fontWeight: 900, color: '#e8edf8', lineHeight: 1 }}>{display}</span>
        <span style={{ fontSize: 13, color: '#8896b0', marginLeft: 4 }}>{unit}</span>
      </div>
      <button style={fMiniBtn} onClick={() => onChange(clamp(value + step))}>+</button>
    </div>
  );
}

function WindCompass({ direction, onChange }) {
  const ref = useRef(null);
  const [dragging, setDragging] = useState(false);
  const lastBearing = useRef(direction ?? 0);

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
        style={{ position: 'relative', width: 210, height: 210, margin: '0 auto', touchAction: 'none', cursor: 'crosshair', userSelect: 'none' }}
        onPointerDown={e => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
          onChange(getBearing(e.clientX, e.clientY));
        }}
        onPointerMove={e => {
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
          onChange(getBearing(e.clientX, e.clientY));
        }}
        onPointerUp={e => {
          setDragging(false);
          e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={e => {
          setDragging(false);
        }}
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
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#3d4d65', letterSpacing: '0.1em', pointerEvents: 'none' }}>
            드래그로 방향 설정
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
              <button style={{ fontSize:9, color:'#4d5a78', background:'none', border:'1px solid #1b2238', borderRadius:4, padding:'2px 7px', cursor:'pointer' }}
                onClick={() => onStrength(0)}>초기화</button>
            )}
          </div>
        </div>
        <SwipeDistance value={strength ?? 0} min={0} max={20} step={0.1} decimals={1} unit="m/s" onChange={onStrength} />
      </div>
    </div>
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
  const [openId, setOpenId] = useState(null);
  const [hoveredSub, setHoveredSub] = useState(null);
  const isDragging = useRef(false);
  const hoveredSubRef = useRef(null);

  const btnChip = stacked
    ? { ...fChip, padding:'10px 8px', fontSize:13, borderRadius:8, width:'100%', textAlign:'center' }
    : { ...fChip, width:'100%', textAlign:'center' };

  const handlePointerDown = (e, c) => {
    const subs = CLUB_SUBS[c.id] || [];
    if (subs.length === 0) {
      onCategory(value === c.id ? null : c.id);
      return;
    }
    e.preventDefault();
    if (value === c.id && openId === c.id) {
      onCategory(null);
      setOpenId(null);
      return;
    }
    onCategory(c.id);
    setOpenId(c.id);
    hoveredSubRef.current = null;
    setHoveredSub(null);
    isDragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging.current) return;
    const els = document.elementsFromPoint(e.clientX, e.clientY);
    let found = null;
    for (const el of els) {
      if (el.dataset && el.dataset.subId) { found = el.dataset.subId; break; }
    }
    if (found !== hoveredSubRef.current) {
      hoveredSubRef.current = found;
      setHoveredSub(found);
    }
  };

  const handlePointerUp = (e) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const sub = hoveredSubRef.current;
    hoveredSubRef.current = null;
    setHoveredSub(null);
    setOpenId(null);
    if (sub) onSub(sub === subValue ? null : sub);
  };

  const handlePointerCancel = () => {
    isDragging.current = false;
    hoveredSubRef.current = null;
    setHoveredSub(null);
    setOpenId(null);
  };

  const buttons = (
    <div style={{ display:'flex', gap: stacked ? 6 : 5, flex: stacked ? undefined : 1 }}>
      {categories.map(c => {
        const isSelected = value === c.id;
        const subs = CLUB_SUBS[c.id] || [];
        const isOpen = openId === c.id;
        const selectedSub = isSelected && subValue != null ? subs.find(s => s.id === subValue) : null;
        const displayLabel = selectedSub ? selectedSub.label : c.label;
        return (
          <div key={c.id} style={{ position:'relative', flex:1 }}>
            <button
              style={{
                ...btnChip,
                touchAction: 'none',
                userSelect: 'none',
                ...(isSelected ? fChipOn : {}),
                border: `${selectedSub ? '2px' : '1.5px'} solid ${isSelected ? '#c9a228' : '#252f4a'}`,
                ...(selectedSub ? {
                  fontWeight: 900,
                  fontSize: stacked ? 14 : 13,
                  boxShadow: '0 0 8px rgba(201,162,40,0.45)',
                  color: '#f0c93a',
                } : {}),
              }}
              onPointerDown={(e) => handlePointerDown(e, c)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}>
              {displayLabel}
            </button>

            {isSelected && isOpen && subs.length > 0 && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                zIndex: 200,
                background: '#0d1425',
                borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.65), 0 0 0 1px rgba(201,162,40,0.28)',
                padding: '5px',
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
                minWidth: '100%',
                animation: 'slideUp 0.18s cubic-bezier(0.34,1.56,0.64,1) both',
              }}>
                {subs.map((s, i) => {
                  const isHov = hoveredSub === s.id;
                  const isSel = subValue === s.id;
                  return (
                    <div
                      key={s.id}
                      data-sub-id={s.id}
                      style={{
                        ...fChip,
                        width: '100%',
                        textAlign: 'center',
                        fontSize: 11,
                        padding: '7px 4px',
                        borderRadius: 7,
                        border: `${isHov ? '2px' : '1.5px'} solid ${isHov ? '#f0c93a' : isSel ? '#c9a228' : '#252f4a'}`,
                        background: isHov ? 'rgba(240,201,58,0.22)' : isSel ? 'rgba(201,162,40,0.18)' : '#1a2235',
                        color: isHov ? '#f0c93a' : isSel ? '#c9a228' : '#e8edf8',
                        fontWeight: isHov ? 800 : isSel ? 700 : 600,
                        transform: isHov ? 'scale(1.04)' : 'scale(1)',
                        transition: 'transform 0.07s, background 0.07s, border-color 0.07s',
                        animation: `fadeIn 0.12s ease-out ${i * 0.025}s both`,
                        cursor: 'default',
                      }}>
                      {s.label}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
        {buttons}
      </div>
    );
  }

  return (
    <div style={{ ...fRow, position:'relative' }}>
      <div style={fLeft}>
        <span style={fIcon}>{icon}</span>
        <span style={fLbl}>{label}</span>
      </div>
      {buttons}
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

function RadialPicker({ centerId, centerLabel, dirs, value, onChange }) {
  // dirs: [{ id, label, pos: 'up'|'down'|'left'|'right' }]
  const raw = Array.isArray(value) ? value[0] || null : value || null;
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(null);
  const isDragging = useRef(false);
  const hoveredRef = useRef(null);
  const centerRef = useRef(null);

  const getHoverId = (clientX, clientY) => {
    if (!centerRef.current) return centerId;
    const r = centerRef.current.getBoundingClientRect();
    const dx = clientX - (r.left + r.width / 2);
    const dy = clientY - (r.top + r.height / 2);
    if (Math.hypot(dx, dy) < 32) return centerId;
    const a = Math.atan2(dy, dx) * 180 / Math.PI;
    let pos;
    if (a > -45  && a <= 45)  pos = 'right';
    else if (a > 45 && a <= 135) pos = 'down';
    else if (a > -135 && a <= -45) pos = 'up';
    else pos = 'left';
    return dirs.find(d => d.pos === pos)?.id ?? centerId;
  };

  const onDown = (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    isDragging.current = true;
    hoveredRef.current = centerId;
    setHovered(centerId);
    setOpen(true);
  };
  const onMove = (e) => {
    if (!isDragging.current) return;
    const h = getHoverId(e.clientX, e.clientY);
    if (h !== hoveredRef.current) { hoveredRef.current = h; setHovered(h); }
  };
  const onUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const sel = hoveredRef.current;
    hoveredRef.current = null; setHovered(null); setOpen(false);
    onChange(sel === raw ? null : sel);
  };
  const onCancel = () => {
    isDragging.current = false; hoveredRef.current = null; setHovered(null); setOpen(false);
  };

  const selLabel = raw === centerId ? centerLabel : (dirs.find(d => d.id === raw)?.label ?? null);
  const isCtrHov = open && hovered === centerId;

  return (
    <div style={{ position:'relative', height:130, display:'flex', alignItems:'center', justifyContent:'center' }}>
      {dirs.map(d => {
        const { tx, ty } = RADIAL_POS[d.pos];
        const isHov = hovered === d.id;
        const isSel = raw === d.id;
        return (
          <div key={d.id} style={{
            position:'absolute', top:'50%', left:'50%',
            transform: open
              ? `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(${isHov ? 1.1 : 1})`
              : 'translate(-50%, -50%) scale(0)',
            opacity: open ? 1 : 0,
            transition: open
              ? 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1), opacity 0.14s ease, background 0.1s, box-shadow 0.1s'
              : 'transform 0.14s ease, opacity 0.1s ease',
            width:82, height:36, padding:0, borderRadius:8, fontSize:12, fontWeight:700,
            display:'flex', alignItems:'center', justifyContent:'center', gap:4,
            pointerEvents:'none', zIndex:8,
            border:`1.5px solid ${isHov ? '#c9a228' : isSel ? 'rgba(201,162,40,0.55)' : '#252f4a'}`,
            background: isHov ? 'rgba(201,162,40,0.28)' : isSel ? 'rgba(201,162,40,0.12)' : '#131d35',
            color: isHov ? '#c9a228' : isSel ? 'rgba(201,162,40,0.8)' : '#8896b0',
            boxShadow: isHov ? '0 0 14px rgba(201,162,40,0.45)' : 'none',
          }}>
            {d.label}{d.icon && d.icon}
          </div>
        );
      })}

      <button
        ref={centerRef}
        style={{
          position:'relative', zIndex:10,
          width:82, height:36, padding:0, borderRadius:8, fontSize:12, fontWeight:700,
          touchAction:'none', userSelect:'none', cursor:'pointer',
          border:`1.5px solid ${isCtrHov ? '#c9a228' : raw ? '#c9a228' : '#252f4a'}`,
          background: isCtrHov ? 'rgba(201,162,40,0.28)' : raw ? 'rgba(201,162,40,0.18)' : '#1a2235',
          color: (isCtrHov || raw) ? '#c9a228' : '#8896b0',
          transition:'border-color 0.1s, background 0.1s, color 0.1s',
        }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onCancel}
      >
        {open ? centerLabel : (selLabel || centerLabel)}
      </button>
    </div>
  );
}

const LIE_DIRS = [
  { id:'uphill',   label:'오르막',   pos:'up'    },
  { id:'slice',    label:'슬라이스', pos:'left',  icon: <SliceIcon /> },
  { id:'downhill', label:'내리막',   pos:'down'  },
  { id:'hook',     label:'훅',       pos:'right', icon: <HookIcon /> },
];
const PIN_DIRS = [
  { id:'back',  label:'백',    pos:'up'    },
  { id:'left',  label:'레프트', pos:'left'  },
  { id:'front', label:'프론트', pos:'down'  },
  { id:'right', label:'라이트', pos:'right' },
];
const PUTT_LIE_DIRS = [
  { id:'uphill',      label:'오르막',   pos:'up'    },
  { id:'break-left',  label:'슬라이스', pos:'left',  icon: <SliceIcon /> },
  { id:'downhill',    label:'내리막',   pos:'down'  },
  { id:'break-right', label:'훅',       pos:'right', icon: <HookIcon /> },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ScoringView({ round, onUpdate, onFinish, onGoHome, onExit, onGoToSetup }) {
  const [holeIdx, setHoleIdx] = useState(round.currentHole || 0);
  const [activePlayer, setActivePlayer] = useState(round.players[0]);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [memoDraft, setMemoDraft] = useState('');
  const [showParEditModal, setShowParEditModal] = useState(false);
  const [parDraft, setParDraft] = useState([...round.pars]);

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
          updatedScores[p] = { ...ps, strokes: newPar, putts: inf.putts, fairway: newPar > 3 ? true : null, gir: inf.gir };
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

  const handleBackClick = () => { if (hasProgress) setShowExitConfirm(true); else onGoToSetup(); };

  const calculateGir = (strokes, putts, par) => {
    if (strokes == null || putts == null) return null;
    return (strokes - putts) <= par - 2;
  };

  const inferStatsFromStrokes = (strokes, par) => {
    if (strokes === 1) return { putts: 0, fairway: par > 3 ? true : null, gir: true };
    if (strokes === par - 2) return { putts: 0, fairway: par > 3 ? true : null, gir: true };
    const diff = strokes - par;
    let putts, fairway, gir;
    if (diff <= -1) { putts = 1; fairway = par > 3 ? true : null; gir = true; }
    else if (diff === 0) { putts = 2; fairway = par > 3 ? true : null; gir = true; }
    else if (diff === 1) { putts = 2; fairway = par > 3 ? true : null; gir = false; }
    else { putts = 2; fairway = par > 3 ? false : null; gir = false; }
    if (putts >= strokes) putts = Math.max(0, strokes - 1);
    return { putts, fairway, gir };
  };

  // updateScore handles strokes/putts with auto-inference; other fields use updateField
  const updateScore = (field, value) => {
    const updated = { ...round };
    updated.holes = [...round.holes];
    let np = { ...playerScore, [field]: value, touched: true };
    if (field === 'strokes') {
      const inf = inferStatsFromStrokes(value, hole.par);
      np.putts = inf.putts;
      if (hole.par > 3 && !playerScore.touched) np.fairway = inf.fairway;
      np.gir = inf.gir; np.girAuto = true;
    }
    if (field === 'putts') {
      const ag = calculateGir(np.strokes, value, hole.par);
      if (ag !== null) { np.gir = ag; np.girAuto = true; }
    }
    if (field === 'gir') np.girAuto = false;
    updated.holes[holeIdx] = { ...hole, scores: { ...hole.scores, [activePlayer]: np } };
    onUpdate(updated);
  };

  const updateField = (field, value) => {
    const updated = { ...round };
    updated.holes = [...round.holes];
    updated.holes[holeIdx] = { ...hole, scores: { ...hole.scores, [activePlayer]: { ...playerScore, [field]: value, touched: true } } };
    onUpdate(updated);
  };

  const updateFields = (fields) => {
    const updated = { ...round };
    updated.holes = [...round.holes];
    updated.holes[holeIdx] = { ...hole, scores: { ...hole.scores, [activePlayer]: { ...playerScore, ...fields, touched: true } } };
    onUpdate(updated);
  };

  const updateLandingPoint = (side) => {
    const updated = { ...round };
    updated.holes = [...round.holes];
    updated.holes[holeIdx] = {
      ...hole,
      scores: { ...hole.scores, [activePlayer]: { ...playerScore, fairwayHit: side, touched: true } },
    };
    onUpdate(updated);
  };

  const updateGir = (val) => {
    const updated = { ...round };
    updated.holes = [...round.holes];
    updated.holes[holeIdx] = { ...hole, scores: { ...hole.scores, [activePlayer]: { ...playerScore, gir: val, girAuto: false, touched: true } } };
    onUpdate(updated);
  };

  const goToHole = (idx) => { if (idx >= 0 && idx < 18) { setHoleIdx(idx); onUpdate({ ...round, currentHole: idx }); } };

  const confirmAndGoToHole = (idx) => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const updated = { ...round };
    updated.holes = [...round.holes];
    const ch = updated.holes[holeIdx];
    const us = {}; round.players.forEach(p => { us[p] = { ...ch.scores[p], touched: true }; });
    updated.holes[holeIdx] = { ...ch, scores: us };
    updated.currentHole = idx; setHoleIdx(idx); onUpdate(updated);
  };

  const getScoreName = (strokes, par) => {
    if (!strokes) return null;
    if (strokes === 1) return { name: '🏆 HOLE IN ONE', color: '#c9a228', isHoleInOne: true };
    const diff = strokes - par;
    if (diff <= -3) return { name: 'Albatross', color: '#e8c84e' };
    if (diff === -2) return { name: 'Eagle', color: '#c9a228' };
    if (diff === -1) return { name: 'Birdie', color: '#3db87a' };
    if (diff === 0)  return { name: 'Par', color: '#8896b0' };
    if (diff === 1)  return { name: 'Bogey', color: '#6b7c9a' };
    if (diff === 2)  return { name: 'Double', color: '#ef5350' };
    return { name: `+${diff}`, color: '#c62828' };
  };

  const scoreName = getScoreName(playerScore.strokes, hole.par);
  const isLastHole = holeIdx === 17;
  const isPar3AtPar = hole.par === 3 && playerScore.touched && playerScore.strokes === 3;
  const isPar5 = hole.par === 5;

  const clubs = hole.par === 3
    ? [{ id: 'iron', label: 'IRON' }, { id: 'hybrid', label: 'HYBRID' }]
    : [{ id: 'driver', label: 'DRIVER' }, { id: 'wood', label: 'WOOD' }, { id: 'hybrid', label: 'HYBRID' }, { id: 'iron', label: 'IRON' }];

  const secHdr = (label, onDelete) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px 6px' }}>
      <div style={{ height: 1, flex: 1, background: '#1b2238' }} />
      <span style={{ fontSize: 10, fontWeight: 700, color: '#4d5a78', letterSpacing: '0.22em' }}>{label}</span>
      <div style={{ height: 1, flex: 1, background: '#1b2238' }} />
      {onDelete && (
        <button onClick={onDelete} style={{ fontSize: 9, color: '#ef5350', background: 'none', border: '1px solid rgba(239,83,80,0.3)', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', flexShrink: 0 }}>✕ 삭제</button>
      )}
    </div>
  );

  const extraShots = playerScore.extraShots || [];

  const addExtraShot = () =>
    updateField('extraShots', [...extraShots, { club: null, subClub: null, lie: [], remainingDistance: 150, windDirection: null, windStrength: null }]);

  const removeExtraShot = (idx) =>
    updateField('extraShots', extraShots.filter((_, i) => i !== idx));

  const updateExtraShot = (idx, patch) =>
    updateField('extraShots', extraShots.map((s, i) => i === idx ? { ...s, ...patch } : s));

  const puttDetails = (() => {
    const raw = playerScore.puttDetails;
    return Array.from({ length: playerScore.putts || 0 }, (_, i) =>
      (raw && raw[i]) || (i === 0
        ? { distance: playerScore.puttDistance || null, aimDistance: playerScore.puttAimedDistance || null }
        : { distance: null, aimDistance: null })
    );
  })();

  const updatePuttsCount = (n) => {
    const newDetails = Array.from({ length: n }, (_, i) => puttDetails[i] || { distance: null, aimDistance: null, lie: [] });
    updateFields({ putts: n, puttDetails: newDetails });
  };

  const updatePutt = (idx, key, val) =>
    updateField('puttDetails', puttDetails.map((p, i) => i === idx ? { ...p, [key]: val } : p));

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
        const c = round.holes.filter(h => round.players.every(p => h.scores[p].touched)).length;
        return (
          <div style={styles.progressBar}>
            <div style={styles.progressText}><span style={styles.progressNumber}>{c}</span><span style={styles.progressTotal}> / 18 holes</span></div>
            <div style={styles.progressTrack}><div style={{ ...styles.progressFill, width: `${(c/18)*100}%` }} /></div>
          </div>
        );
      })()}

      {/* Running Score */}
      {(() => {
        const th = round.holes.filter(h => h.scores[activePlayer]?.touched);
        const ps = th.reduce((s,h) => s+(h.scores[activePlayer]?.strokes||0), 0);
        const pp = th.reduce((s,h) => s+h.par, 0);
        const pu = th.reduce((s,h) => s+(h.scores[activePlayer]?.putts||0), 0);
        const pd = ps-pp;
        const ft = round.holes.slice(0,9).filter(h=>h.scores[activePlayer]?.touched);
        const bt = round.holes.slice(9).filter(h=>h.scores[activePlayer]?.touched);
        const fd = ft.reduce((s,h)=>s+h.scores[activePlayer].strokes,0)-ft.reduce((s,h)=>s+h.par,0);
        const bd = bt.reduce((s,h)=>s+h.scores[activePlayer].strokes,0)-bt.reduce((s,h)=>s+h.par,0);
        const fmt=(d,has)=>!has?'—':d===0?'E':d>0?`+${d}`:`${d}`;
        const fmtC=(d,has)=>!has?'#4d5a78':d>0?'#ef5350':d<0?'#3db87a':'#8896b0';
        return (
          <div style={styles.runningScore}>
            <div style={styles.runningScoreMain}>
              <div style={styles.runningScoreLabel}>{round.players.length>1?activePlayer:'SCORE'}</div>
              <div style={styles.runningScoreValues}>
                <span style={styles.runningScoreNumber}>{ps}</span>
                <span style={{ ...styles.runningScoreDiff, color: fmtC(pd,th.length>0) }}>{fmt(pd,th.length>0)}</span>
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
                {holes.map((h,li) => { const i=offset+li; const ic=i===holeIdx; const pc=h.par===3?(ic?'#ff8844':'#c96820'):h.par===5?(ic?'#5dd49a':'#2ea868'):(ic?'#c9a228':'#8896b0'); const pb=ic?(h.par===3?'rgba(200,80,20,0.22)':h.par===5?'rgba(61,184,122,0.18)':'#1a2235'):'transparent'; return <div key={i} style={{ ...styles.holeNavParCell, background: pb, color: pc, fontWeight: (h.par===3||h.par===5)?'800':'700' }}>{h.par}</div>; })}
              </div>
            </div>
            <div style={{ ...styles.holeNavTableRow, borderBottom: 'none' }}>
              <div style={styles.holeNavRowLabel}>SCORE</div>
              <div style={styles.holeNavTableCells}>
                {holes.map((h,li) => {
                  const i=offset+li; const done=round.players.every(p=>h.scores[p].touched); const ic=i===holeIdx;
                  const psc=h.scores[activePlayer]; const diff=psc.strokes-h.par; const hio=done&&psc.strokes===1;
                  let ms={};
                  if(done) { if(hio) ms={...styles.markerHoleInOne}; else if(diff<=-2) ms={...styles.markerEagle}; else if(diff===-1) ms={...styles.markerBirdie}; else if(diff===0) ms={...styles.markerPar}; else if(diff===1) ms={...styles.markerBogey}; else ms={...styles.markerDouble}; }
                  return (
                    <button key={i} style={{ ...styles.holeNavScoreCell, background: ic?'#1a2235':'transparent' }} onClick={()=>goToHole(i)}>
                      <span style={{ ...styles.scoreMarker, ...ms, color: hio?'#0b0e18':done?(diff<=-1?'#3db87a':diff>=1?'#ef5350':'#e8edf8'):(ic?'#c9a228':'#4d5a78'), fontWeight: done?'700':'500' }}>
                        {hio&&<span style={styles.holeInOneStar}>★</span>}{psc.strokes}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Hole Header */}
      <div style={styles.holeHeader}>
        <div>
          <div style={styles.holeLabel}>HOLE {holeIdx+1}</div>
          <div style={{ ...styles.holePar, color: isPar5?'#3db87a':styles.holePar.color }}>PAR {hole.par}</div>
          {isPar5 && <div style={{ display:'inline-block', marginTop:6, fontSize:10, fontWeight:700, color:'#3db87a', background:'rgba(61,184,122,0.12)', border:'1px solid rgba(61,184,122,0.4)', padding:'3px 10px', borderRadius:3, letterSpacing:'0.08em' }}>찬스홀</div>}
        </div>
        {scoreName && (
          <div style={{ ...styles.scoreName, color: isPar3AtPar?'#fff':(scoreName.isHoleInOne?'#fff':scoreName.color), borderColor: isPar3AtPar?'#c04a10':scoreName.color, background: isPar3AtPar?'linear-gradient(135deg,#c04a10 0%,#7a2000 100%)':scoreName.isHoleInOne?'linear-gradient(135deg,#e8c84e 0%,#c9a228 50%,#7a611a 100%)':'transparent', boxShadow: isPar3AtPar?'0 2px 12px rgba(180,60,0,0.45)':scoreName.isHoleInOne?'0 2px 12px rgba(201,162,40,0.5)':'none', fontWeight:(isPar3AtPar||scoreName.isHoleInOne)?'800':'600', opacity:playerScore.touched?1:0.35, animation:scoreName.isHoleInOne&&playerScore.touched?'holeInOnePulse 2s ease-in-out infinite':'none' }}>
            {isPar3AtPar?'PAR 3 !':scoreName.name}
          </div>
        )}
      </div>

      {/* Player Tabs */}
      {round.players.length > 1 && (
        <div style={styles.playerTabs}>
          {round.players.map(p => {
            const psc=hole.scores[p];
            return (
              <button key={p} style={{ ...styles.playerTab, background: activePlayer===p?'#c9a228':'transparent', color: activePlayer===p?'#0b0e18':'#8896b0', borderColor: activePlayer===p?'#c9a228':'#252f4a' }} onClick={()=>setActivePlayer(p)}>
                {p}<span style={{ ...styles.playerTabScore, background: psc.touched?'#0b0e18':'#252f4a', opacity: psc.touched?1:0.7 }}>{psc.strokes}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Score Input Form ── */}
      <div style={{ paddingBottom: 8 }}>

        {/* ── 티샷 ── */}
        {secHdr('티 샷')}

        {/* 총 타수 */}
        <div style={{ padding:'8px 16px 12px', borderBottom:'1px solid #0e1320' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <span style={fIcon}>🏌️</span><span style={fLbl}>총 타수</span>
          </div>
          <div style={{ position:'relative', display:'flex', height:56, borderRadius:10, overflow:'hidden', background:'linear-gradient(to right, rgba(61,184,122,0.18), rgba(239,83,80,0.18))', boxShadow:'inset 0 0 0 1px rgba(255,255,255,0.07)' }}>
            <button
              style={{ flex:1, background:'transparent', border:'none', color:'rgba(61,184,122,0.4)', fontSize:22, fontWeight:700, cursor:'pointer' }}
              onClick={()=>updateScore('strokes',Math.max(1,playerScore.strokes-1))}>−</button>
            <button
              style={{ flex:1, background:'transparent', border:'none', color:'rgba(239,83,80,0.4)', fontSize:22, fontWeight:700, cursor:'pointer' }}
              onClick={()=>updateScore('strokes',playerScore.strokes+1)}>+</button>
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
              <span style={{ fontSize:28, fontWeight:900, color:scoreName?.color||'#e8edf8', letterSpacing:'-0.02em' }}>{playerScore.strokes}</span>
            </div>
          </div>
        </div>

        {/* 티샷 클럽 */}
        <ClubSelector
          icon="〽"
          label="클럽"
          categories={clubs}
          value={playerScore.teeClub}
          subValue={playerScore.teeClubSub}
          onCategory={v => updateFields({ teeClub: v, teeClubSub: null })}
          onSub={v => updateField('teeClubSub', v)}
          stacked
        />

        {/* 티샷 구질 */}
        <div style={{ padding:'8px 16px 12px', borderBottom:'1px solid #0e1320' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <span style={fIcon}>〜</span><span style={fLbl}>구질</span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {[['페이드','스트레이트','드로우'],['훅','풀','푸시','슬라이스']].map((row, ri) => (
              <div key={ri} style={{ display:'flex', gap:6 }}>
                {row.map(s => (
                  <button key={s}
                    style={{ ...fChip, flex:1, textAlign:'center', padding:'10px 6px', fontSize:13, borderRadius:8, ...(playerScore.shotShape===s?fChipOn:{}) }}
                    onClick={()=>updateField('shotShape', playerScore.shotShape===s?null:s)}>{s}</button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* FAIRWAY HIT */}
        {hole.par > 3 && (
          <div style={{ padding:'8px 16px 12px', borderBottom:'1px solid #0e1320' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <span style={fIcon}>⊙</span><span style={fLbl}>FAIRWAY HIT</span>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button style={{ flex:1, textAlign:'center', padding:'12px', borderRadius:8, border:`1.5px solid ${playerScore.fairway===true?'#3db87a':'#252f4a'}`, background:playerScore.fairway===true?'rgba(61,184,122,0.18)':'#1a2235', color:playerScore.fairway===true?'#3db87a':'#8896b0', fontSize:16, fontWeight:800, cursor:'pointer' }} onClick={()=>updateScore('fairway',true)}>O</button>
              <button style={{ flex:1, textAlign:'center', padding:'12px', borderRadius:8, border:`1.5px solid ${playerScore.fairway===false?'#ef5350':'#252f4a'}`, background:playerScore.fairway===false?'rgba(239,83,80,0.12)':'#1a2235', color:playerScore.fairway===false?'#ef5350':'#8896b0', fontSize:16, fontWeight:800, cursor:'pointer' }} onClick={()=>updateScore('fairway',false)}>X</button>
            </div>
          </div>
        )}

        {/* LANDING POINT (L/C/R) */}
        {hole.par > 3 && (
          <div style={{ padding:'8px 16px 12px', borderBottom:'1px solid #0e1320' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <span style={fIcon}>⚑</span><span style={fLbl}>LANDING POINT</span>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {[['L','레프트','#c9a228'],['C','센터','#3db87a'],['R','라이트','#ef5350']].map(([id,label,col])=>(
                <button key={id} style={{ flex:1, textAlign:'center', padding:'10px 4px', borderRadius:8, border:`1.5px solid ${playerScore.fairwayHit===id?col:'#252f4a'}`, background:playerScore.fairwayHit===id?`${col}22`:'#1a2235', color:playerScore.fairwayHit===id?col:'#8896b0', fontSize:13, fontWeight:700, cursor:'pointer' }}
                  onClick={()=>updateLandingPoint(playerScore.fairwayHit===id?null:id)}>
                  <div style={{ fontSize:12, fontWeight:800 }}>{id}</div>
                  <div style={{ fontSize:10, marginTop:2 }}>{label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── 세컨샷 ── */}
        {secHdr('세 컨 샷')}

        {/* 남은 거리 */}
        <div style={{ padding:'8px 16px 14px', borderBottom:'1px solid #0e1320' }}>
          <div style={{ ...fLeft, marginBottom:10 }}><span style={fIcon}>↔</span><span style={fLbl}>남은 거리</span></div>
          <SwipeDistance value={playerScore.remainingDistance||150} min={1} max={300} onChange={v=>updateField('remainingDistance',v)} />
          <div style={{ textAlign:'center', fontSize:9, color:'#4d5a78', marginTop:6, letterSpacing:'0.1em' }}>← 슬라이드로 1m 단위 조정 →</div>
        </div>

        {/* 세컨샷 클럽 */}
        <ClubSelector
          icon="〽"
          label="세컨샷 클럽"
          categories={SECOND_CLUBS}
          value={playerScore.secondClub}
          subValue={playerScore.secondClubSub}
          onCategory={v => updateFields({ secondClub: v, secondClubSub: null })}
          onSub={v => updateField('secondClubSub', v)}
          stacked
        />

        {/* 세컨샷 라이 */}
        <div style={{ padding:'8px 16px 4px', borderBottom:'1px solid #0e1320' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <span style={fIcon}>▲</span><span style={fLbl}>세컨샷 라이</span>
          </div>
          <RadialPicker centerId="flat" centerLabel="평지" dirs={LIE_DIRS}
            value={Array.isArray(playerScore.terrainCondition) ? playerScore.terrainCondition[0] : playerScore.terrainCondition}
            onChange={v => updateField('terrainCondition', v)}
          />
        </div>

        {/* 바람 */}
        <div style={{ padding:'8px 16px 14px', borderBottom:'1px solid #0e1320' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={fIcon}>💨</span><span style={fLbl}>바람</span>
              {playerScore.windDirection != null && <span style={{ fontSize:12, fontWeight:700, color:'#c9a228', marginLeft:6 }}>{toCompassLabel(playerScore.windDirection)} {playerScore.windDirection}°</span>}
              {playerScore.windStrength != null && playerScore.windStrength > 0 && <span style={{ fontSize:10, color:'#c9a228', marginLeft:4 }}>{Number(playerScore.windStrength).toFixed(1)}m/s</span>}
            </div>
            {playerScore.windDirection != null && (
              <button style={{ fontSize:9, color:'#4d5a78', background:'none', border:'1px solid #1b2238', borderRadius:4, padding:'2px 7px', cursor:'pointer' }}
                onClick={() => updateField('windDirection', null)}>초기화</button>
            )}
          </div>
          <WindInput direction={playerScore.windDirection} strength={playerScore.windStrength}
            onDir={v=>updateField('windDirection',v)} onStrength={v=>updateField('windStrength',v)} />
        </div>

        {/* ── 추가 샷 ── */}
        {extraShots.map((shot, idx) => (
          <React.Fragment key={idx}>
            {secHdr(`${idx + 3}번 째 샷`, () => removeExtraShot(idx))}

            {/* 남은 거리 */}
            <div style={{ padding:'8px 16px 14px', borderBottom:'1px solid #0e1320' }}>
              <div style={{ ...fLeft, marginBottom:10 }}><span style={fIcon}>↔</span><span style={fLbl}>남은 거리</span></div>
              <SwipeDistance value={shot.remainingDistance||150} min={1} max={300} onChange={v => updateExtraShot(idx, { remainingDistance: v })} />
              <div style={{ textAlign:'center', fontSize:9, color:'#4d5a78', marginTop:6, letterSpacing:'0.1em' }}>← 슬라이드로 1m 단위 조정 →</div>
            </div>

            {/* 클럽 */}
            <ClubSelector
              icon="〽"
              label="클럽"
              categories={SECOND_CLUBS}
              value={shot.club}
              subValue={shot.subClub}
              onCategory={v => updateExtraShot(idx, { club: v, subClub: null })}
              onSub={v => updateExtraShot(idx, { subClub: v })}
              stacked
            />

            {/* 라이 */}
            <div style={{ padding:'8px 16px 4px', borderBottom:'1px solid #0e1320' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                <span style={fIcon}>▲</span><span style={fLbl}>라이</span>
              </div>
              <RadialPicker centerId="flat" centerLabel="평지" dirs={LIE_DIRS}
                value={Array.isArray(shot.lie) ? shot.lie[0] : shot.lie}
                onChange={v => updateExtraShot(idx, { lie: v })}
              />
            </div>

            {/* 바람 */}
            <div style={{ padding:'8px 16px 14px', borderBottom:'1px solid #0e1320' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={fIcon}>💨</span><span style={fLbl}>바람</span>
                  {shot.windDirection != null && <span style={{ fontSize:12, fontWeight:700, color:'#c9a228', marginLeft:6 }}>{toCompassLabel(shot.windDirection)} {shot.windDirection}°</span>}
                  {shot.windStrength > 0 && <span style={{ fontSize:10, color:'#c9a228', marginLeft:4 }}>{Number(shot.windStrength).toFixed(1)}m/s</span>}
                </div>
                {shot.windDirection != null && (
                  <button style={{ fontSize:9, color:'#4d5a78', background:'none', border:'1px solid #1b2238', borderRadius:4, padding:'2px 7px', cursor:'pointer' }}
                    onClick={() => updateExtraShot(idx, { windDirection: null })}>초기화</button>
                )}
              </div>
              <WindInput
                direction={shot.windDirection}
                strength={shot.windStrength}
                onDir={v => updateExtraShot(idx, { windDirection: v })}
                onStrength={v => updateExtraShot(idx, { windStrength: v })}
              />
            </div>
          </React.Fragment>
        ))}

        <div style={{ padding:'8px 16px 10px', borderBottom:'1px solid #0e1320' }}>
          <button
            style={{ width:'100%', padding:'11px', borderRadius:9, border:'1.5px dashed #252f4a', background:'transparent', color:'#4d5a78', fontSize:12, fontWeight:700, cursor:'pointer', letterSpacing:'0.08em' }}
            onClick={addExtraShot}>+ 샷 추가</button>
        </div>

        {/* ── 그린 ── */}
        {secHdr('그 린')}

        {/* GIR */}
        <div style={fRow}>
          <div style={fLeft}>
            <span style={fIcon}>⚑</span>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={fLbl}>GIR</span>
              {playerScore.girAuto && <span style={{ fontSize:9, color:'#c9a228', fontWeight:700, letterSpacing:'0.1em', background:'rgba(201,162,40,0.12)', border:'1px solid rgba(201,162,40,0.3)', borderRadius:3, padding:'1px 5px' }}>AUTO</span>}
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button style={{ ...fChipWide, ...(playerScore.gir===true?{ border:'2px solid #3db87a', color:'#3db87a' }:{}) }} onClick={()=>updateGir(true)}>✓ 온</button>
            <button style={{ ...fChipWide, ...(playerScore.gir===false?{ border:'2px solid #ef5350', color:'#ef5350' }:{}) }} onClick={()=>updateGir(false)}>✗ 오프</button>
          </div>
        </div>

        {/* 온그린 랜딩 (12-clock) */}
        <div style={{ padding:'8px 16px 16px', borderBottom:'1px solid #0e1320' }}>
          <div style={{ ...fLeft, marginBottom:12 }}>
            <span style={fIcon}>⊙</span>
            <span style={fLbl}>온그린 랜딩</span>
            {playerScore.onGreenLanding && <span style={{ fontSize:10, color:'#c9a228', marginLeft:6 }}>{playerScore.onGreenLanding}시 방향</span>}
          </div>
          <ClockDial12 value={playerScore.onGreenLanding} onChange={v=>updateField('onGreenLanding',v)} />
          <div style={{ textAlign:'center', fontSize:9, color:'#4d5a78', marginTop:10, lineHeight:1.6 }}>
            12시=롱 · 6시=숏 · 9시=레프트 · 3시=라이트 (핀 기준)
          </div>
        </div>

        {/* ── 퍼팅 ── */}
        {secHdr('퍼 팅')}

        {/* 퍼팅 횟수 */}
        <div style={{ padding:'8px 16px 12px', borderBottom:'1px solid #0e1320' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <span style={fIcon}>○</span><span style={fLbl}>퍼팅 횟수</span>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            {[0,1,2,3,4].map(n => (
              <button key={n} style={{ flex:1, height:46, borderRadius:8, border:`2px solid ${playerScore.putts===n?'#c9a228':'#252f4a'}`, background:playerScore.putts===n?'rgba(201,162,40,0.2)':'#1a2235', color:playerScore.putts===n?'#c9a228':'#e8edf8', fontSize:18, fontWeight:800, cursor:'pointer' }}
                onClick={()=>updatePuttsCount(n)}>{n}</button>
            ))}
          </div>
        </div>

        {playerScore.putts > 0 && (<>

          {/* 핀 위치 */}
          <div style={{ padding:'8px 16px 4px', borderBottom:'1px solid #0e1320' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <span style={fIcon}>📍</span><span style={fLbl}>핀 위치</span>
            </div>
            <RadialPicker centerId="center" centerLabel="센터" dirs={PIN_DIRS}
              value={Array.isArray(playerScore.pinPosition) ? playerScore.pinPosition[0] : playerScore.pinPosition}
              onChange={v => updateField('pinPosition', v)}
            />
          </div>



          {/* 퍼팅별 거리 */}
          {puttDetails.map((putt, puttIdx) => (
            <React.Fragment key={puttIdx}>
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 16px 4px' }}>
                <div style={{ height:1, flex:1, background:'#151e32' }} />
                <span style={{ fontSize:9, fontWeight:700, color:'#3d4d65', letterSpacing:'0.18em' }}>PUTT {puttIdx + 1}</span>
                <div style={{ height:1, flex:1, background:'#151e32' }} />
              </div>
              <div style={{ padding:'6px 16px 12px', borderBottom:'1px solid #0e1320' }}>
                <div style={{ ...fLeft, marginBottom:10 }}><span style={fIcon}>↔</span><span style={fLbl}>퍼팅 거리</span></div>
                <SwipeDistance value={putt.distance||3} min={0.5} max={30} step={0.5} decimals={1} onChange={v=>updatePutt(puttIdx,'distance',v)} />
              </div>
              <div style={{ padding:'6px 16px 12px', borderBottom:'1px solid #0e1320' }}>
                <div style={{ ...fLeft, marginBottom:10 }}><span style={fIcon}>🎯</span><span style={fLbl}>조준 거리</span></div>
                <SwipeDistance value={putt.aimDistance||3} min={0.5} max={30} step={0.5} decimals={1} onChange={v=>updatePutt(puttIdx,'aimDistance',v)} />
              </div>
              <div style={{ padding:'8px 16px 4px', borderBottom:'1px solid #0e1320' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                  <span style={fIcon}>〜</span><span style={fLbl}>라이</span>
                </div>
                <RadialPicker centerId="flat" centerLabel="평지" dirs={PUTT_LIE_DIRS}
                  value={Array.isArray(putt.lie) ? putt.lie[0] : putt.lie}
                  onChange={v => updatePutt(puttIdx, 'lie', v)}
                />
              </div>
            </React.Fragment>
          ))}

        </>)}

        {/* 페널티 */}
        <div style={{ display:'flex', gap:8, padding:'12px 16px', marginBottom:4 }}>
          <div style={fPenBox}>
            <span style={fPenLbl}>OB</span>
            <div style={{ position:'relative', display:'flex', height:52, width:'100%', borderRadius:8, overflow:'hidden', background:'linear-gradient(to right, rgba(61,184,122,0.18), rgba(239,83,80,0.18))', boxShadow:'inset 0 0 0 1px rgba(255,255,255,0.07)' }}>
              <button style={{ flex:1, background:'transparent', border:'none', color:'rgba(61,184,122,0.5)', fontSize:26, fontWeight:700, cursor:'pointer' }}
                onClick={()=>{ const c=playerScore.ob||0; if(c>0) updateScore('ob',c-1); }}>−</button>
              <button style={{ flex:1, background:'transparent', border:'none', color:'rgba(239,83,80,0.5)', fontSize:26, fontWeight:700, cursor:'pointer' }}
                onClick={()=>updateScore('ob',Math.min(5,(playerScore.ob||0)+1))}>+</button>
              <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
                <span style={{ fontSize:26, fontWeight:900, color:(playerScore.ob||0)>0?'#ef5350':'#e8edf8', letterSpacing:'-0.02em' }}>{playerScore.ob||0}</span>
              </div>
            </div>
          </div>
          <div style={fPenBox}>
            <span style={fPenLbl}>해저드</span>
            <div style={{ position:'relative', display:'flex', height:52, width:'100%', borderRadius:8, overflow:'hidden', background:'linear-gradient(to right, rgba(61,184,122,0.18), rgba(239,83,80,0.18))', boxShadow:'inset 0 0 0 1px rgba(255,255,255,0.07)' }}>
              <button style={{ flex:1, background:'transparent', border:'none', color:'rgba(61,184,122,0.5)', fontSize:26, fontWeight:700, cursor:'pointer' }}
                onClick={()=>{ const c=playerScore.hazard||0; if(c>0) updateScore('hazard',c-1); }}>−</button>
              <button style={{ flex:1, background:'transparent', border:'none', color:'rgba(239,83,80,0.5)', fontSize:26, fontWeight:700, cursor:'pointer' }}
                onClick={()=>updateScore('hazard',Math.min(5,(playerScore.hazard||0)+1))}>+</button>
              <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
                <span style={{ fontSize:26, fontWeight:900, color:(playerScore.hazard||0)>0?'#c9a228':'#e8edf8', letterSpacing:'-0.02em' }}>{playerScore.hazard||0}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

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

          {/* 공백 */}
          <div />

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
              onClick={() => {
                const u = { ...round }; u.holes = [...round.holes];
                const lh = u.holes[holeIdx]; const us = {};
                round.players.forEach(p => { us[p] = { ...lh.scores[p], touched: true }; });
                u.holes[holeIdx] = { ...lh, scores: us }; onUpdate(u); setTimeout(() => onFinish(), 50);
              }}
            >
              <Flag size={20} strokeWidth={2} />
              <span style={{ ...styles.tabBarLabel, fontWeight: '700' }}>완료</span>
            </button>
          ) : (
            <button
              style={{ ...styles.tabBarBtn, color: '#e8edf8' }}
              onClick={() => confirmAndGoToHole(holeIdx + 1)}
            >
              <ChevronRight size={20} strokeWidth={2} />
              <span style={{ ...styles.tabBarLabel, fontWeight: '500' }}>다음</span>
            </button>
          )}

        </div>
      </div>

      {/* Exit 확인 모달 */}
      {showExitConfirm && (
        <div style={styles.modalOverlay} onClick={()=>setShowExitConfirm(false)}>
          <div style={styles.modalCard} onClick={e=>e.stopPropagation()}>
            <div style={styles.modalIcon}>⚠️</div>
            <div style={styles.modalTitle}>라운드를 나가시겠어요?</div>
            <div style={styles.modalText}>현재까지 입력한 스코어는<br/>저장되지 않습니다</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <button style={styles.modalBtnCancel} onClick={()=>setShowExitConfirm(false)}>계속 하기</button>
              <button style={styles.modalBtnPrimary} onClick={()=>{ setShowExitConfirm(false); onGoToSetup(); }}>세팅 다시하기</button>
              <button style={styles.modalBtnConfirm} onClick={()=>{ setShowExitConfirm(false); onExit(); }}>홈으로 나가기</button>
            </div>
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
                          <button style={{ ...styles.parTapZone, right:0, opacity:p<6?1:0.3 }} onClick={()=>p<6&&updateParDraft(hi,p+1)} />
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

const fRow = { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px', borderBottom:'1px solid #0e1320', minHeight:54, gap:12 };
const fLeft = { display:'flex', alignItems:'center', gap:8, flexShrink:0, minWidth:130 };
const fIcon = { fontSize:14, width:18, textAlign:'center', color:'#8896b0', flexShrink:0 };
const fLbl  = { fontSize:11, fontWeight:700, color:'#8896b0', letterSpacing:'0.15em', textTransform:'uppercase' };

const fChip = { padding:'5px 9px', borderRadius:6, border:'1.5px solid #252f4a', background:'#1a2235', color:'#e8edf8', fontSize:11, fontWeight:600, cursor:'pointer' };
const fChipOn = { border:'2px solid #c9a228', background:'rgba(201,162,40,0.18)', color:'#c9a228' };
const fChipWide = { minWidth:52, padding:'7px 12px', borderRadius:8, border:'1.5px solid #252f4a', background:'#1a2235', color:'#8896b0', fontSize:13, fontWeight:700, cursor:'pointer' };

const fMiniBtn = { width:32, height:32, borderRadius:7, border:'1px solid #252f4a', background:'#111827', color:'#e8edf8', fontSize:18, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' };

const fPenBox = { flex:1, minHeight:64, background:'#1a2235', border:'1px solid #252f4a', borderRadius:10, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4, padding:'8px 10px' };
const fPenLbl = { fontSize:9, color:'#8896b0', fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase' };
