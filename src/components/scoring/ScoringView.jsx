import React, { useState, useRef, useEffect } from 'react';
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

function RadialPicker({ centerId, centerLabel, dirs, value, onChange, onOpen }) {
  const raw = Array.isArray(value) ? value[0] || null : value || null;
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [value]);

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
      <button
        onClick={() => { setOpen(v => { if (!v && onOpen) onOpen(); return !v; }); }}
        style={{
          width:'100%', display:'flex', alignItems:'center', justifyContent:'center',
          gap:6, padding:'10px 16px', borderRadius:10, cursor:'pointer',
          background: open ? 'rgba(201,162,40,0.07)' : hasSelection ? 'rgba(201,162,40,0.12)' : 'rgba(255,255,255,0.03)',
          border:`1px solid ${open || hasSelection ? 'rgba(201,162,40,0.4)' : '#1b2238'}`,
          transition:'background 0.15s, border-color 0.15s',
        }}
      >
        <span style={{ fontSize:14, fontWeight:700, color: open || hasSelection ? '#c9a228' : '#8896b0' }}>
          {selLabel || centerLabel}
        </span>
        {!open && selIcon && <span style={{ color:'#c9a228' }}>{selIcon}</span>}
        <span style={{ fontSize:9, color: open || hasSelection ? '#c9a228' : '#4d5a78', marginLeft:4 }}>{open ? '▲' : '▼'}</span>
      </button>

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
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginTop:8 }}>
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
  const holeInCbRef = useRef(null);

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

  const calcAutoStrokes = (score, par) => {
    const field = (par > 3 ? 1 : 0) + (score.extraShots?.length || 0);
    return 1 + field + (score.putts || 0) + (score.ob || 0) + (score.hazard || 0);
  };

  // teeClub + 퍼팅 홀인 성공까지 완료된 경우에만 auto-calc, 미완료 시 수동 스코어 유지
  const finalizeScore = (s, par) => {
    const puttComplete = Array.isArray(s.puttDetails) && s.puttDetails.some(p => p?.holein === 'success');
    if (!s.teeClub || !puttComplete) return { ...s, touched: true };
    const autoStrokes = calcAutoStrokes(s, par);
    const autoGir = (autoStrokes - (s.putts || 0)) <= par - 2;
    return { ...s, strokes: autoStrokes, gir: autoGir, girAuto: true, touched: true };
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

  const updateOnGreen = (val) => {
    const updated = { ...round };
    updated.holes = [...round.holes];
    updated.holes[holeIdx] = { ...hole, scores: { ...hole.scores, [activePlayer]: { ...playerScore, onGreen: val, touched: true } } };
    onUpdate(updated);
  };

  const extraShotTopRef = useRef(null);
  const prevExtraShotsLenRef = useRef(0);

  const scrollDown = () => setTimeout(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }), 80);

  const goToHole = (idx) => { if (idx >= 0 && idx < 18) { setHoleIdx(idx); onUpdate({ ...round, currentHole: idx }); } };

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
  const teeComplete = !!(playerScore.teeClub && playerScore.shotShape &&
    (hole.par === 3 ? !playerScore.girAuto : playerScore.fairwayHit != null));
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

  const clubs = hole.par === 3
    ? [{ id: 'hybrid', label: 'HYBRID' }, { id: 'iron', label: 'IRON' }, { id: 'wedge', label: 'WEDGE' }]
    : [{ id: 'driver', label: 'DRIVER' }, { id: 'wood', label: 'WOOD' }, { id: 'hybrid', label: 'HYBRID' }, { id: 'iron', label: 'IRON' }];

  const secHdr = (label, onDelete) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px 6px' }}>
      <div style={{ height: 1, flex: 1, background: '#252f4a' }} />
      <span style={{ fontSize: 11, fontWeight: 700, color: '#6e84a8', letterSpacing: '0.2em' }}>{label}</span>
      <div style={{ height: 1, flex: 1, background: '#252f4a' }} />
      {onDelete && (
        <button onClick={onDelete} style={{ fontSize: 9, color: '#ef5350', background: 'none', border: '1px solid rgba(239,83,80,0.3)', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', flexShrink: 0 }}>✕ 삭제</button>
      )}
    </div>
  );

  const extraShots = playerScore.extraShots || [];

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
  const extraShotName = (idx) => EXTRA_SHOT_NAMES[idx] ?? `${idx + 3}번째 샷`;

  const addExtraShot = () => {
    const newIdx = extraShots.length;
    const prevDist = newIdx === 0
      ? (playerScore.remainingDistance || 150)
      : (extraShots[newIdx - 1].remainingDistance || 150);
    const initDist = Math.ceil(prevDist / 2);
    updateField('extraShots', [...extraShots, { club: null, subClub: null, lie: [], remainingDistance: initDist, windDirection: null, windStrength: null, onGreen: null }]);
    setExpandedExtraShot(newIdx);
  };

  const removeExtraShot = (fromIdx) => {
    updateField('extraShots', extraShots.slice(0, fromIdx));
    setExpandedExtraShot(Math.max(0, fromIdx - 1));
    if (fromIdx === 0) setSecondShotExpanded(true);
  };

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
    const delta = n - (playerScore.putts || 2);
    const newStrokes = Math.max(1, (playerScore.strokes || hole.par) + delta);
    const newDetails = Array.from({ length: n }, (_, i) => puttDetails[i] || { distance: null, aimDistance: null, lie: [] });
    const ag = calculateGir(newStrokes, n, hole.par);
    const girFields = ag !== null ? { gir: ag, girAuto: true } : {};
    updateFields({ putts: n, puttDetails: newDetails, strokes: newStrokes, ...girFields });
  };

  const updatePenalty = (field, newVal) => {
    const oldVal = playerScore[field] || 0;
    const delta = newVal - oldVal;
    const newStrokes = Math.max(1, (playerScore.strokes || hole.par) + delta);
    updateFields({ [field]: newVal, strokes: newStrokes });
  };

  const updatePutt = (idx, key, val) =>
    updateField('puttDetails', puttDetails.map((p, i) => i === idx ? { ...p, [key]: val } : p));

  useEffect(() => {
    const firstEmpty = puttDetails.findIndex(p =>
      p.distance == null && p.aimDistance == null && (p.lie == null || p.lie === '')
    );
    setExpandedPutt(firstEmpty >= 0 ? firstEmpty : 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puttDetails.length]);

  useEffect(() => { setShotPage(0); setTeeExpanded(true); setSecondShotExpanded(true); setExpandedExtraShot(0); prevExtraShotsLenRef.current = 0; }, [holeIdx]);

  useEffect(() => {
    if (extraShots.length > prevExtraShotsLenRef.current && extraShotTopRef.current) {
      setTimeout(() => extraShotTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    }
    prevExtraShotsLenRef.current = extraShots.length;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraShots.length]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (teeComplete) { setTeeExpanded(false); setShotPage(hole.par === 3 && playerScore.gir === true ? 1 : 0); } }, [teeComplete]);

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
                {holes.map((h,li) => { const i=offset+li; const ic=i===holeIdx; const pc=h.par===3?(ic?'#ff8844':'#c96820'):h.par===5?(ic?'#5dd49a':'#2ea868'):(ic?'#c9a228':'#8896b0'); const pb=ic?(h.par===3?'rgba(200,80,20,0.22)':h.par===5?'rgba(61,184,122,0.18)':'#1a2235'):'transparent'; return <button key={i} style={{ ...styles.holeNavParCell, background: pb, color: pc, fontWeight: (h.par===3||h.par===5)?'800':'700', border:'none', cursor:'pointer', padding:0 }} onClick={()=>goToHole(i)}>{h.par}</button>; })}
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
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 16px 16px', borderBottom:'1px solid #0e1320', background:'linear-gradient(180deg, rgba(255,255,255,0.025) 0%, transparent 100%)' }}>
        {/* 좌측: HOLE + PAR + 파대비 */}
        <div>
          <div style={{ fontSize:10, fontWeight:700, color:'#c9a228', letterSpacing:'0.28em', marginBottom:5, textTransform:'uppercase' }}>HOLE {holeIdx+1}</div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ fontSize:32, fontWeight:900, lineHeight:1, letterSpacing:'-0.02em', color: isPar5?'#3db87a': hole.par===3?'#5b9cf6':'#e8edf8' }}>PAR {hole.par}</div>
            {(() => {
              const diff = playerScore.strokes - hole.par;
              if (diff === 0 || !playerScore.touched) return null;
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
        {scoreName && (
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

      {/* 총 타수 */}
      {/* 스코어 */}
      <div style={{ padding:'6px 16px 12px', borderBottom:'1px solid #0e1320' }}>
        <div style={{ display:'flex', alignItems:'center', marginBottom:6 }}>
          <div style={{ flex:1 }} />
          <span style={{ fontSize:13, color:'#c4cfe0', fontWeight:700, letterSpacing:'0.12em' }}>스코어</span>
          <div style={{ flex:1, display:'flex', justifyContent:'flex-end' }}>
            <button style={{ fontSize:9, color:'#4d5a78', background:'none', border:'1px solid #1b2238', borderRadius:4, padding:'2px 7px', cursor:'pointer' }}
              onClick={()=>updateScore('strokes', hole.par)}>초기화</button>
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
            <span style={{ fontSize:28, fontWeight:900, color:scoreName?.color||'#e8edf8', letterSpacing:'-0.02em' }}>{playerScore.strokes}</span>
          </div>
        </div>
      </div>

      {/* 퍼팅 개수 */}
      <div style={{ padding:'6px 16px 10px', borderBottom:'1px solid #0e1320' }}>
        <div style={{ display:'flex', alignItems:'center', marginBottom:6 }}>
          <div style={{ flex:1 }} />
          <span style={{ fontSize:13, color:'#c4cfe0', fontWeight:700, letterSpacing:'0.12em' }}>퍼팅</span>
          <div style={{ flex:1, display:'flex', justifyContent:'flex-end' }}>
            <button style={{ fontSize:9, color:'#4d5a78', background:'none', border:'1px solid #1b2238', borderRadius:4, padding:'2px 7px', cursor:'pointer' }}
              onClick={()=>updatePuttsCount(2)}>초기화</button>
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
            const label = n === 4
              ? (curVal < 4 ? '4' : curVal >= 10 ? '10' : `${curVal}+`)
              : String(n);
            return (
              <button key={n}
                style={{
                  flex:1, background: sel ? `rgba(${r},${g},${b},0.32)` : 'transparent',
                  border:'none', borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  color: sel ? `rgb(${r},${g},${b})` : 'rgba(232,237,248,0.45)',
                  fontSize: n === 4 && curVal >= 10 ? 14 : 18, fontWeight:900, cursor:'pointer',
                  boxShadow: sel ? `inset 0 0 0 2px rgba(${r},${g},${b},0.7)` : 'none',
                }}
                onClick={() => {
                  if (n === 4) {
                    if (curVal < 4) updatePuttsCount(4);
                    else if (curVal < 10) updatePuttsCount(curVal + 1);
                  } else {
                    updatePuttsCount(n);
                  }
                }}>{label}</button>
            );
          })}
        </div>
      </div>

      {/* 해저드 / OB */}
      <div style={{ display:'flex', gap:8, padding:'8px 16px', borderBottom:'1px solid #0e1320' }}>
        {[
          { label:'해저드', val:playerScore.hazard||0, color:'#ef5350', onDec:()=>{ const c=playerScore.hazard||0; if(c>0) updatePenalty('hazard',c-1); }, onInc:()=>updatePenalty('hazard',Math.min(5,(playerScore.hazard||0)+1)) },
          { label:'OB',    val:playerScore.ob||0,     color:'#ef5350', onDec:()=>{ const c=playerScore.ob||0;     if(c>0) updatePenalty('ob',c-1);     }, onInc:()=>updatePenalty('ob',    Math.min(5,(playerScore.ob||0)+1))   },
        ].map(item => (
          <div key={item.label} style={{ flex:1 }}>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.15em', color:'#4d5a78', textAlign:'center', marginBottom:4 }}>{item.label}</div>
            <div style={{ position:'relative', display:'flex', height:42, borderRadius:10, overflow:'hidden', background:'#131c30', boxShadow:'inset 0 0 0 1px rgba(255,255,255,0.06)' }}>
              <button style={{ flex:1, background:'transparent', border:'none', color:'rgba(61,184,122,0.45)', fontSize:20, fontWeight:700, cursor:'pointer' }} onClick={item.onDec}>−</button>
              <button style={{ flex:1, background:'transparent', border:'none', color:'rgba(239,83,80,0.45)', fontSize:20, fontWeight:700, cursor:'pointer' }} onClick={item.onInc}>+</button>
              <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
                <span style={{ fontSize:20, fontWeight:900, color: item.val > 0 ? item.color : '#e8edf8', lineHeight:1 }}>{item.val}</span>
              </div>
            </div>
          </div>
        ))}
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

        {/* ── 티샷 아코디언 ── */}
        <button
          onClick={() => setTeeExpanded(v => !v)}
          style={{
            width:'100%', display:'flex', alignItems:'center', gap:8,
            padding:'12px 16px 8px', background:'none', border:'none', cursor:'pointer',
            borderBottom: teeExpanded ? 'none' : '1px solid #0e1320',
          }}
        >
          <div style={{ height:1, flex:1, background: teeComplete && !teeExpanded ? 'rgba(201,162,40,0.55)' : '#252f4a' }} />
          <span style={{ fontSize:12, fontWeight:800, color: teeComplete && !teeExpanded ? '#c9a228' : '#8fb0cc', letterSpacing:'0.18em', flexShrink:0 }}>티 샷</span>
          <div style={{ height:1, flex:1, background: teeComplete && !teeExpanded ? 'rgba(201,162,40,0.55)' : '#252f4a' }} />
          <span style={{ fontSize:11, color: teeComplete && !teeExpanded ? '#c9a228' : '#5a6a88', flexShrink:0 }}>{teeExpanded ? '▲' : '▼'}</span>
        </button>

        {teeExpanded && <>
        {/* PAR3 전용: 핀 위치 */}
        {hole.par === 3 && (
          <div style={{ padding:'8px 16px 4px', borderBottom:'1px solid #0e1320' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <span style={fIcon}>📍</span><span style={fLbl}>핀 위치</span>
            </div>
            <RadialPicker centerId="center" centerLabel="센터" dirs={PIN_DIRS}
              value={Array.isArray(playerScore.pinPosition) ? playerScore.pinPosition[0] : playerScore.pinPosition}
              onChange={v => { updateField('pinPosition', v); if (v) scrollDown(); }}
              onOpen={scrollDown}
            />
          </div>
        )}

        {/* PAR3 전용: 거리 (핀 위치 선택 후) */}
        {hole.par === 3 && playerScore.pinPosition && (
          <div style={{ padding:'8px 16px 14px', borderBottom:'1px solid #0e1320', animation:'fadeIn 0.18s ease-out' }}>
            <div style={{ ...fLeft, marginBottom:10 }}><span style={fIcon}>↔</span><span style={fLbl}>거리</span></div>
            <SwipeDistance value={playerScore.teeDistance||150} min={50} max={250} onChange={v=>updateField('teeDistance',v)} />
            <div style={{ textAlign:'center', fontSize:9, color:'#4d5a78', marginTop:6, letterSpacing:'0.1em' }}>← 슬라이드로 1m 단위 조정 →</div>
          </div>
        )}

        {/* 티샷 클럽 (PAR3: 핀 위치 선택 후, PAR4+: 항상) */}
        {(hole.par > 3 || playerScore.pinPosition) && (
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
        )}

        {/* 티샷 구질 - 클럽 선택 완료 후 등장 (PAR3: 핀 위치 선택 후) */}
        {(hole.par > 3 || playerScore.pinPosition) && (
          (!playerScore.teeClub && !teeClubInteracting) ? (
          <div style={{ padding:'10px 16px', borderBottom:'1px solid #0e1320', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <span style={{ fontSize:10, color:'#2e3d56', letterSpacing:'0.12em' }}>클럽을 선택하면 구질 입력이 나타납니다</span>
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
        {hole.par === 3 && playerScore.teeClub && playerScore.shotShape && !teeClubInteracting && (
          <div style={{ ...fRow, animation:'fadeIn 0.18s ease-out' }}>
            <div style={fLeft}>
              <span style={fIcon}>⚑</span>
              <span style={fLbl}>GIR</span>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button style={{ ...fChipWide, padding:'10px 24px', ...(playerScore.gir===true && !playerScore.girAuto?{ border:'2px solid #3db87a', color:'#3db87a' }:{}) }}
                onClick={()=>{ updateGir(true); setShotPage(1); }}>성공</button>
              <button style={{ ...fChipWide, padding:'10px 24px', ...(playerScore.gir===false?{ border:'2px solid #ef5350', color:'#ef5350' }:{}) }}
                onClick={()=>{ updateGir(false); setSecondShotExpanded(true); setShotPage(0); scrollDown(); }}>실패</button>
            </div>
          </div>
        )}

        {/* FAIRWAY HIT - 구질 선택 후 등장 */}
        {hole.par > 3 && playerScore.teeClub && playerScore.shotShape && (
          <div style={{ padding:'8px 16px 12px', borderBottom:'1px solid #0e1320', animation:'fadeIn 0.18s ease-out' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <span style={fIcon}>⊙</span><span style={fLbl}>FAIRWAY HIT</span>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button style={{ flex:1, textAlign:'center', padding:'12px', borderRadius:8, border:`1.5px solid ${playerScore.fairway===true?'#3db87a':'#252f4a'}`, background:playerScore.fairway===true?'rgba(61,184,122,0.18)':'#1a2235', color:playerScore.fairway===true?'#3db87a':'#8896b0', fontSize:16, fontWeight:800, cursor:'pointer' }} onClick={()=>{ updateScore('fairway',true); scrollDown(); }}>O</button>
              <button style={{ flex:1, textAlign:'center', padding:'12px', borderRadius:8, border:`1.5px solid ${playerScore.fairway===false?'#ef5350':'#252f4a'}`, background:playerScore.fairway===false?'rgba(239,83,80,0.12)':'#1a2235', color:playerScore.fairway===false?'#ef5350':'#8896b0', fontSize:16, fontWeight:800, cursor:'pointer' }} onClick={()=>{ updateScore('fairway',false); scrollDown(); }}>X</button>
            </div>
          </div>
        )}

        {/* LANDING POINT (L/C/R) - 페어웨이 힛 선택 후 등장 */}
        {hole.par > 3 && playerScore.teeClub && playerScore.shotShape && playerScore.fairway != null && (
          <div style={{ padding:'8px 16px 12px', borderBottom:'1px solid #0e1320', animation:'fadeIn 0.18s ease-out' }}>
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
        </>}

        {/* ── 페이지 네이션 ── */}
        <div style={{ display:'flex', margin:'8px 16px 0', borderRadius:10, overflow:'hidden', border:'1px solid #1b2238', background:'#0a0e1a' }}>
          {[['필드샷', 0], ['퍼팅', 1]].map(([label, pg]) => (
            <button key={pg} onClick={() => teeComplete && setShotPage(pg)}
              style={{ flex:1, padding:'12px 0', border:'none', cursor: teeComplete ? 'pointer' : 'default', background: teeComplete && shotPage===pg ? 'rgba(201,162,40,0.12)' : 'transparent', color: !teeComplete ? '#1a2535' : shotPage===pg ? '#c9a228' : '#4d5a78', fontSize:13, fontWeight:700, letterSpacing:'0.12em', borderBottom: `2px solid ${teeComplete && shotPage===pg ? '#c9a228' : 'transparent'}`, transition:'color 0.15s, background 0.15s' }}
            >{label}</button>
          ))}
        </div>
        {!teeComplete && (
          <div style={{ padding:'8px 16px', textAlign:'center' }}>
            <span style={{ fontSize:10, color:'#1e2d3d', letterSpacing:'0.1em' }}>티샷 완료 후 입력 가능합니다</span>
          </div>
        )}

        {teeComplete && shotPage === 0 && <>
        {/* ── 세컨샷 아코디언 헤더 ── */}
        <button onClick={() => setSecondShotExpanded(v => !v)} style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'12px 16px 8px', background:'none', border:'none', cursor:'pointer', borderBottom: secondShotExpanded ? 'none' : '1px solid #0e1320' }}>
          <div style={{ height:1, flex:1, background: !secondShotExpanded && playerScore.secondClub ? 'rgba(201,162,40,0.55)' : '#252f4a' }} />
          <span style={{ fontSize:12, fontWeight:800, color: !secondShotExpanded && playerScore.secondClub ? '#c9a228' : '#8fb0cc', letterSpacing:'0.18em', flexShrink:0 }}>세컨샷 ( 2nd )</span>
          <div style={{ height:1, flex:1, background: !secondShotExpanded && playerScore.secondClub ? 'rgba(201,162,40,0.55)' : '#252f4a' }} />
          <span style={{ fontSize:11, color: !secondShotExpanded && playerScore.secondClub ? '#c9a228' : '#5a6a88', flexShrink:0 }}>{secondShotExpanded ? '▲' : '▼'}</span>
        </button>

        {secondShotExpanded && <>
        {/* 남은 거리 */}
        <div style={{ padding:'8px 16px 14px', borderBottom:'1px solid #0e1320' }}>
          <div style={{ ...fLeft, marginBottom:10 }}><span style={fIcon}>↔</span><span style={fLbl}>남은 거리</span></div>
          <SwipeDistance value={playerScore.remainingDistance||150} min={1} max={300} onChange={v=>updateField('remainingDistance',v)} />
          <div style={{ textAlign:'center', fontSize:9, color:'#4d5a78', marginTop:6, letterSpacing:'0.1em' }}>← 슬라이드로 1m 단위 조정 →</div>
        </div>

        {/* 세컨샷 라이 */}
        <div style={{ padding:'8px 16px 4px', borderBottom:'1px solid #0e1320' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <span style={fIcon}>▲</span><span style={fLbl}>세컨샷 라이</span>
          </div>
          <RadialPicker centerId="flat" centerLabel="평지" dirs={LIE_DIRS}
            value={Array.isArray(playerScore.terrainCondition) ? playerScore.terrainCondition[0] : playerScore.terrainCondition}
            onChange={v => { updateField('terrainCondition', v); if (v) scrollDown(); }}
            onOpen={scrollDown}
          />
        </div>

        {/* 세컨샷 클럽 */}
        {playerScore.terrainCondition && (
        <ClubSelector
          icon="〽"
          label="세컨샷 클럽"
          categories={SECOND_CLUBS}
          value={playerScore.secondClub}
          subValue={playerScore.secondClubSub}
          onCategory={v => { updateFields({ secondClub: v, secondClubSub: null }); if (v) scrollDown(); }}
          onSub={v => updateField('secondClubSub', v)}
          stacked
        />
        )}

        {/* 바람 */}
        {playerScore.terrainCondition && (
        <div style={{ padding:'8px 16px 14px', borderBottom:'1px solid #0e1320', animation:'fadeIn 0.18s ease-out' }}>
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
        )}
        </>}

        {/* ── 세컨샷 온그린 체크 → 써드샷 이후 ── */}
        {playerScore.terrainCondition && (<>
        <div ref={extraShotTopRef} />

        {/* 세컨샷 GIR (추가 샷 없을 때, Par 4+) */}
        {extraShots.length === 0 && hole.par > 3 && (
          <div style={{ ...fRow, animation:'fadeIn 0.18s ease-out' }}>
            <div style={fLeft}><span style={fIcon}>⚑</span><span style={fLbl}>GIR</span></div>
            <div style={{ display:'flex', gap:8 }}>
              <button style={{ ...fChipWide, padding:'10px 24px', ...(playerScore.gir===true && !playerScore.girAuto ? { border:'2px solid #3db87a', color:'#3db87a' } : {}) }}
                onClick={()=>{ updateGir(true); setShotPage(1); }}>성공</button>
              <button style={{ ...fChipWide, padding:'10px 24px', ...(playerScore.gir===false ? { border:'2px solid #ef5350', color:'#ef5350' } : {}) }}
                onClick={()=>{ updateGir(false); setSecondShotExpanded(false); addExtraShot(); }}>실패</button>
            </div>
          </div>
        )}

        {/* 세컨샷 온그린 (추가 샷 없을 때, Par 3) */}
        {extraShots.length === 0 && hole.par === 3 && (
          <div style={{ ...fRow, animation:'fadeIn 0.18s ease-out' }}>
            <div style={fLeft}><span style={fIcon}>⚑</span><span style={fLbl}>온그린</span></div>
            <div style={{ display:'flex', gap:8 }}>
              <button style={{ ...fChipWide, padding:'10px 24px', ...(playerScore.onGreen===true ? { border:'2px solid #3db87a', color:'#3db87a' } : {}) }}
                onClick={()=>{ updateOnGreen(true); setShotPage(1); }}>성공</button>
              <button style={{ ...fChipWide, padding:'10px 24px', ...(playerScore.onGreen===false ? { border:'2px solid #ef5350', color:'#ef5350' } : {}) }}
                onClick={()=>{ updateOnGreen(false); setSecondShotExpanded(false); addExtraShot(); }}>실패</button>
            </div>
          </div>
        )}

        {/* 써드샷 / 네번째 샷 / ... 아코디언 */}
        {extraShots.map((shot, idx) => {
          const isExtraOpen = expandedExtraShot === idx;
          const extraDone = shot.onGreen != null;
          return (
            <React.Fragment key={idx}>
              {/* 아코디언 헤더 */}
              <button
                onClick={() => setExpandedExtraShot(isExtraOpen ? -1 : idx)}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'12px 16px 8px', background:'none', border:'none', cursor:'pointer', borderBottom: isExtraOpen ? 'none' : '1px solid #0e1320' }}
              >
                <div style={{ height:1, flex:1, background: !isExtraOpen && extraDone ? 'rgba(201,162,40,0.55)' : '#252f4a' }} />
                <span style={{ fontSize:12, fontWeight:800, color: !isExtraOpen && extraDone ? '#c9a228' : '#8fb0cc', letterSpacing:'0.18em', flexShrink:0 }}>
                  {extraShotName(idx)}
                </span>
                <div style={{ height:1, flex:1, background: !isExtraOpen && extraDone ? 'rgba(201,162,40,0.55)' : '#252f4a' }} />
                <span style={{ fontSize:11, color: !isExtraOpen && extraDone ? '#c9a228' : '#5a6a88', flexShrink:0 }}>{isExtraOpen ? '▲' : '▼'}</span>
              </button>

              {isExtraOpen && (<>
                {/* 남은 거리 */}
                <div style={{ padding:'8px 16px 14px', borderBottom:'1px solid #0e1320' }}>
                  <div style={{ ...fLeft, marginBottom:10 }}><span style={fIcon}>↔</span><span style={fLbl}>남은 거리</span></div>
                  <SwipeDistance value={shot.remainingDistance||150} min={1} max={300} onChange={v => updateExtraShot(idx, { remainingDistance: v })} />
                  <div style={{ textAlign:'center', fontSize:9, color:'#4d5a78', marginTop:6, letterSpacing:'0.1em' }}>← 슬라이드로 1m 단위 조정 →</div>
                </div>

                {/* 라이 */}
                <div style={{ padding:'8px 16px 4px', borderBottom:'1px solid #0e1320' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span style={fIcon}>▲</span><span style={fLbl}>라이</span>
                  </div>
                  <RadialPicker centerId="flat" centerLabel="평지" dirs={LIE_DIRS}
                    value={Array.isArray(shot.lie) ? shot.lie[0] : shot.lie}
                    onChange={v => { updateExtraShot(idx, { lie: v }); if (v) scrollDown(); }}
                    onOpen={scrollDown}
                  />
                </div>

                {/* 클럽 — 라이 선택 후 노출 */}
                {shot.lie && (Array.isArray(shot.lie) ? shot.lie.length > 0 : true) && (
                <ClubSelector
                  icon="〽" label="클럽" categories={SECOND_CLUBS}
                  value={shot.club} subValue={shot.subClub}
                  onCategory={v => { updateExtraShot(idx, { club: v, subClub: null }); if (v) scrollDown(); }}
                  onSub={v => updateExtraShot(idx, { subClub: v })}
                  stacked
                />
                )}

                {/* 바람 — 클럽 선택 후 노출 */}
                {shot.club && (
                <div style={{ padding:'8px 16px 14px', borderBottom:'1px solid #0e1320', animation:'fadeIn 0.18s ease-out' }}>
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
                    direction={shot.windDirection} strength={shot.windStrength}
                    onDir={v => updateExtraShot(idx, { windDirection: v })}
                    onStrength={v => updateExtraShot(idx, { windStrength: v })}
                  />
                </div>
                )}

                {/* 온그린 성공 / 실패 — 클럽 선택 후 노출 */}
                {shot.club && (
                <div style={{ ...fRow, animation:'fadeIn 0.18s ease-out' }}>
                  <div style={fLeft}><span style={fIcon}>⚑</span><span style={fLbl}>온그린</span></div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button
                      style={{ ...fChipWide, padding:'10px 24px', ...(shot.onGreen===true ? { border:'2px solid #3db87a', color:'#3db87a' } : {}) }}
                      onClick={() => { updateExtraShot(idx, { onGreen: true }); setShotPage(1); }}>성공</button>
                    <button
                      style={{ ...fChipWide, padding:'10px 24px', ...(shot.onGreen===false ? { border:'2px solid #ef5350', color:'#ef5350' } : {}) }}
                      onClick={() => {
                        const updated = extraShots.map((s, i) => i === idx ? { ...s, onGreen: false } : s);
                        const newShot = { club:null, subClub:null, lie:[], remainingDistance: Math.ceil((shot.remainingDistance||150) / 2), windDirection:null, windStrength:null, onGreen:null };
                        updateField('extraShots', [...updated, newShot]);
                        setExpandedExtraShot(extraShots.length);
                      }}>실패</button>
                  </div>
                </div>
                )}

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
        {secHdr('그 린')}

        {/* 핀 위치 - PAR4+ 전용 (PAR3는 티샷에서 입력) */}
        {hole.par > 3 && (
        <div style={{ padding:'8px 16px 4px', borderBottom:'1px solid #0e1320' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <span style={fIcon}>📍</span><span style={fLbl}>핀 위치</span>
          </div>
          <RadialPicker centerId="center" centerLabel="센터" dirs={PIN_DIRS}
            value={Array.isArray(playerScore.pinPosition) ? playerScore.pinPosition[0] : playerScore.pinPosition}
            onChange={v => { updateField('pinPosition', v); if (v) scrollDown(); }}
            onOpen={scrollDown}
          />
        </div>
        )}

        {playerScore.pinPosition && (<>
        {/* 온그린 랜딩 (12-clock) */}
        <div style={{ padding:'8px 16px 16px', borderBottom:'1px solid #0e1320', animation:'fadeIn 0.18s ease-out' }}>
          <div style={{ ...fLeft, marginBottom:12 }}>
            <span style={fIcon}>⊙</span>
            <span style={fLbl}>온그린 랜딩</span>
            {playerScore.onGreenLanding && <span style={{ fontSize:10, color:'#c9a228', marginLeft:6 }}>{playerScore.onGreenLanding}시 방향</span>}
          </div>
          <ClockDial12 value={playerScore.onGreenLanding} onChange={v=>{ updateField('onGreenLanding',v); if(v) scrollDown(); }} />
          <div style={{ textAlign:'center', fontSize:9, color:'#4d5a78', marginTop:10, lineHeight:1.6 }}>
            12시=롱 · 6시=숏 · 9시=레프트 · 3시=라이트 (핀 기준)
          </div>
        </div>

        {/* 퍼팅 상세 — 온그린 랜딩 선택 후 노출 */}
        {playerScore.onGreenLanding && (<>
        {secHdr('퍼 팅')}

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
                    <RadialPicker centerId="flat" centerLabel="평지" dirs={PUTT_LIE_DIRS}
                      value={Array.isArray(putt.lie) ? putt.lie[0] : putt.lie}
                      onChange={v => { updatePutt(puttIdx, 'lie', v); if (v) scrollDown(); }}
                      onOpen={scrollDown}
                    />
                  </div>
                  {putt.lie && (Array.isArray(putt.lie) ? putt.lie.length > 0 : true) && (<>
                  <div style={{ padding:'6px 16px 12px', borderBottom:'1px solid #0e1320', animation:'fadeIn 0.18s ease-out' }}>
                    <div style={{ ...fLeft, marginBottom:10 }}><span style={fIcon}>↔</span><span style={fLbl}>퍼팅 거리</span></div>
                    <SwipeDistance value={putt.distance||5} min={0.5} max={30} step={0.5} decimals={1} onChange={v => updateField('puttDetails', puttDetails.map((p, i) => i === puttIdx ? { ...p, distance: v, aimDistance: v } : p))} />
                  </div>
                  <div style={{ padding:'6px 16px 12px', borderBottom:'1px solid #0e1320', animation:'fadeIn 0.18s ease-out' }}>
                    <div style={{ ...fLeft, marginBottom:10 }}><span style={fIcon}>🎯</span><span style={fLbl}>조준 거리</span></div>
                    <SwipeDistance value={putt.aimDistance||5} min={0.5} max={30} step={0.5} decimals={1} onChange={v=>updatePutt(puttIdx,'aimDistance',v)} />
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
                          const puttsUsed = puttIdx + 1;
                          const freshStrokes = calcAutoStrokes({ ...playerScore, putts: puttsUsed }, hole.par);
                          const newDetails = Array.from({ length: puttsUsed }, (_, i) =>
                            i === puttIdx ? { ...puttDetails[i], holein: 'success' } : (puttDetails[i] || { distance: null, aimDistance: null, lie: [] })
                          );
                          const freshScore = { ...playerScore, putts: puttsUsed, strokes: freshStrokes, puttDetails: newDetails, touched: true };
                          holeInCbRef.current = () => {
                            if (isLastHole) {
                              const u = { ...round }; u.holes = [...round.holes];
                              const lh = u.holes[holeIdx]; const us = {};
                              round.players.forEach(p => {
                                const s = p === activePlayer ? freshScore : lh.scores[p];
                                us[p] = finalizeScore(s, lh.par);
                              });
                              u.holes[holeIdx] = { ...lh, scores: us }; onUpdate(u); setTimeout(() => onFinish(), 50);
                            } else {
                              confirmAndGoToHole(holeIdx + 1, freshScore);
                            }
                          };
                          const onCount = freshStrokes - puttsUsed;
                          setHoleInModalData({
                            isLastHole,
                            scoreName: getScoreName(freshStrokes, hole.par),
                            strokes: freshStrokes,
                            putts: puttsUsed,
                            onCount,
                          });
                          setShowHoleInModal(true);
                          setTimeout(() => { setShowHoleInModal(false); holeInCbRef.current?.(); }, 2500);
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
                        }}
                      >실패</button>
                    </div>
                  </div>
                  </>)}
                </>)}
              </React.Fragment>
            );
          })}

        </>)}
        </>)}

        </>)}
        </>}

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
                round.players.forEach(p => { us[p] = finalizeScore(lh.scores[p], lh.par); });
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
const fIcon = { fontSize:14, width:18, textAlign:'center', color:'#7888a8', flexShrink:0 };
const fLbl  = { fontSize:11, fontWeight:700, color:'#8ca4bc', letterSpacing:'0.15em', textTransform:'uppercase' };

const fChip = { padding:'5px 9px', borderRadius:6, border:'1.5px solid #252f4a', background:'#1a2235', color:'#e8edf8', fontSize:11, fontWeight:600, cursor:'pointer' };
const fChipOn = { border:'2px solid #c9a228', background:'rgba(201,162,40,0.18)', color:'#c9a228' };
const fChipWide = { minWidth:52, padding:'7px 12px', borderRadius:8, border:'1.5px solid #252f4a', background:'#1a2235', color:'#8896b0', fontSize:13, fontWeight:700, cursor:'pointer' };

const fMiniBtn = { width:32, height:32, borderRadius:7, border:'1px solid #252f4a', background:'#111827', color:'#e8edf8', fontSize:18, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' };

const fPenBox = { flex:1, minHeight:64, background:'#1a2235', border:'1px solid #252f4a', borderRadius:10, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4, padding:'8px 10px' };
const fPenLbl = { fontSize:9, color:'#8896b0', fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase' };
