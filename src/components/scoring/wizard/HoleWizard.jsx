import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, X } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_LABELS = ['CLUB', 'DISTANCE', 'LIE', 'DIRECTION', 'PUTT'];

const CLUBS_PAR3 = [
  { id: 'iron',   label: '아이언',      sub: 'Iron' },
  { id: 'hybrid', label: '하이브리드',  sub: 'Hybrid' },
];

const CLUBS_ALL = [
  { id: 'driver', label: '드라이버',    sub: 'Driver' },
  { id: 'wood',   label: '페어웨이우드', sub: 'F.Wood' },
  { id: 'hybrid', label: '하이브리드',  sub: 'Hybrid' },
  { id: 'iron',   label: '아이언',      sub: 'Iron' },
];

const LIES = [
  { id: 'up',    label: 'UP',    desc: '오르막', color: '#3db87a', pos: 'top' },
  { id: 'hook',  label: 'HOOK',  desc: '좌경사', color: '#c9a228', pos: 'left' },
  { id: 'flat',  label: 'FLAT',  desc: '평지',   color: '#8896b0', pos: 'center' },
  { id: 'slice', label: 'SLICE', desc: '우경사', color: '#ef5350', pos: 'right' },
  { id: 'down',  label: 'DOWN',  desc: '내리막', color: '#6b7c9a', pos: 'bottom' },
];

// 12-hour clock positions: angle 0 = 3 o'clock, so hour*30-90 puts 12 at top
const CLOCK_HOURS = Array.from({ length: 12 }, (_, i) => {
  const hour = i + 1;
  const angle = (hour * 30 - 90) * (Math.PI / 180);
  const KEY_LABELS = { 12: 'LONG', 6: 'SHORT', 9: 'HOOK', 3: 'SLICE' };
  return {
    hour,
    cx: 50 + 40 * Math.cos(angle),
    cy: 50 + 40 * Math.sin(angle),
    label: KEY_LABELS[hour] || String(hour),
    isKey: [3, 6, 9, 12].includes(hour),
  };
});

// Miss direction → greenMiss field mapping
const MISS_TO_GREEN = {
  12: null,
  1: 'long', 2: 'right',
  3: 'right', 4: 'right',
  5: 'short', 6: 'short',
  7: 'short', 8: 'left',
  9: 'left', 10: 'left',
  11: 'long',
};

// ─── Derive standard score fields from wizard data ────────────────────────────

export function wizardToScoreFields(wizardData, par, existingScore) {
  const { teeClub, remainingDistance, lieCondition, missDirection, putts, puttDistance, puttAimedDistance, strokes } = wizardData;

  const gir = missDirection === 12;
  const greenMiss = gir ? null : (MISS_TO_GREEN[missDirection] ?? null);
  const fairway = par > 3 ? (lieCondition === 'flat') : null;
  const fairwayHit = lieCondition === 'flat' ? 'C' : lieCondition === 'hook' ? 'L' : lieCondition === 'slice' ? 'R' : null;

  return {
    // preserve ob, hazard, memo from existing score
    ob:      existingScore?.ob      ?? 0,
    hazard:  existingScore?.hazard  ?? 0,
    memo:    existingScore?.memo    ?? '',
    shotShape: null,
    // standard fields derived from wizard
    strokes: Math.max(putts + (gir ? 1 : 1), strokes),
    putts,
    fairway,
    fairwayHit,
    gir,
    girAuto: true,
    greenMiss,
    touched: true,
    // new wizard fields
    teeClub,
    remainingDistance,
    lieCondition,
    missDirection,
    puttDistance,
    puttAimedDistance,
  };
}

// ─── Touch Slider (range input replacement) ───────────────────────────────────

function RangeSlider({ value, min, max, step = 1, onChange, color = '#c9a228' }) {
  const trackRef = useRef(null);
  const dragging = useRef(false);

  const pct = ((value - min) / (max - min)) * 100;

  const valueFromX = (clientX) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return value;
    const p = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round((min + p * (max - min)) / step) * step;
  };

  const onTouchStart = (e) => { dragging.current = true; onChange(valueFromX(e.touches[0].clientX)); };
  const onTouchMove  = (e) => { if (dragging.current) { e.preventDefault(); onChange(valueFromX(e.touches[0].clientX)); } };
  const onTouchEnd   = ()  => { dragging.current = false; };
  const onMouseDown  = (e) => {
    dragging.current = true;
    onChange(valueFromX(e.clientX));
    const move = (me) => dragging.current && onChange(valueFromX(me.clientX));
    const up   = ()   => { dragging.current = false; window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  return (
    <div style={{ position: 'relative', height: 44, display: 'flex', alignItems: 'center' }}>
      <div
        ref={trackRef}
        style={{ width: '100%', height: 8, borderRadius: 4, background: '#1a2235', border: '1px solid #252f4a', position: 'relative', touchAction: 'none', cursor: 'pointer' }}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
      >
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: color, borderRadius: 4 }} />
        <div style={{
          position: 'absolute', left: `${pct}%`, top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 32, height: 32, borderRadius: '50%',
          background: color, border: '3px solid #0b0e18',
          boxShadow: `0 2px 10px ${color}66`,
          pointerEvents: 'none',
        }} />
      </div>
    </div>
  );
}

// ─── Ruler Scroll (Step B) ────────────────────────────────────────────────────

function RulerScroll({ value, onChange, onConfirm }) {
  const PX = 18;          // px per 5m step
  const MIN = 50, MAX = 300, STEP = 5;
  const startX  = useRef(null);
  const startVal = useRef(value);
  const valRef  = useRef(value);
  const trackRef = useRef(null);
  valRef.current = value;

  const applyOffset = (v) => {
    if (!trackRef.current) return;
    const steps = (v - MIN) / STEP;
    trackRef.current.style.transform = `translateX(${-steps * PX}px)`;
  };

  useEffect(() => { applyOffset(value); }, [value]);

  const fromDrag = (clientX) => {
    const dx = clientX - startX.current;
    const delta = Math.round(-dx / PX) * STEP;
    return Math.max(MIN, Math.min(MAX, startVal.current + delta));
  };

  const onTouchStart = (e) => { startX.current = e.touches[0].clientX; startVal.current = valRef.current; };
  const onTouchMove  = (e) => { e.preventDefault(); onChange(fromDrag(e.touches[0].clientX)); };
  const onTouchEnd   = ()  => { setTimeout(() => onConfirm(valRef.current), 120); };
  const onMouseDown  = (e) => {
    startX.current = e.clientX; startVal.current = valRef.current;
    const move = (me) => onChange(fromDrag(me.clientX));
    const up   = ()   => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const ticks = [];
  for (let v = MIN; v <= MAX; v += STEP) ticks.push(v);

  return (
    <div>
      {/* Current value display */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <span style={{ fontSize: 64, fontWeight: 800, color: '#e8edf8', lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: 20, color: '#8896b0', marginLeft: 8 }}>m</span>
      </div>

      {/* Ruler */}
      <div
        style={{ width: '100%', height: 72, overflow: 'hidden', position: 'relative', touchAction: 'none', cursor: 'ew-resize' }}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
      >
        {/* Center marker */}
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: '#c9a228', zIndex: 2, transform: 'translateX(-50%)' }} />

        {/* Edge fades */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 80, background: 'linear-gradient(to right, #0b0e18, transparent)', zIndex: 3, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, background: 'linear-gradient(to left, #0b0e18, transparent)', zIndex: 3, pointerEvents: 'none' }} />

        {/* Tick track — translateX controlled via DOM ref */}
        <div
          ref={trackRef}
          style={{ position: 'absolute', left: '50%', top: 14, display: 'flex', alignItems: 'flex-end', willChange: 'transform' }}
        >
          {ticks.map(v => {
            const isMajor = v % 25 === 0;
            const isSel   = v === value;
            return (
              <div key={v} style={{ width: PX, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: 52 }}>
                {isMajor && (
                  <div style={{ fontSize: 9, color: isSel ? '#c9a228' : '#4d5a78', marginBottom: 2, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {v}
                  </div>
                )}
                <div style={{ width: isSel ? 2 : 1, height: isMajor ? 28 : 16, background: isSel ? '#c9a228' : isMajor ? '#6b7c9a' : '#252f4a', borderRadius: 1 }} />
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ textAlign: 'center', fontSize: 11, color: '#4d5a78', marginTop: 8, marginBottom: 20 }}>
        ← 드래그로 조정 (5m 단위) · 손 떼면 자동 이동
      </div>

      <button
        style={btnPrimary}
        onClick={() => onConfirm(value)}
      >
        {value}m 확인 →
      </button>
    </div>
  );
}

// ─── Step A: Club Selector ────────────────────────────────────────────────────

function StepClub({ par, value, onSelect }) {
  const [pending, setPending] = useState(false);
  const clubs = par === 3 ? CLUBS_PAR3 : CLUBS_ALL;

  const handle = (id) => {
    if (pending) return;
    setPending(true);
    setTimeout(() => onSelect(id), 200);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {clubs.map(c => (
        <button
          key={c.id}
          style={{
            ...btnClub,
            border: `2px solid ${value === c.id ? '#c9a228' : '#252f4a'}`,
            background: value === c.id ? 'rgba(201,162,40,0.15)' : '#1a2235',
            color: value === c.id ? '#c9a228' : '#e8edf8',
            transform: value === c.id ? 'scale(1.02)' : 'scale(1)',
          }}
          onClick={() => handle(c.id)}
        >
          <span style={{ fontSize: 17, fontWeight: 800 }}>{c.label}</span>
          <span style={{ fontSize: 12, color: '#8896b0', fontWeight: 500 }}>{c.sub}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Step C: Lie Condition ────────────────────────────────────────────────────

function StepLie({ value, onSelect }) {
  const [pending, setPending] = useState(false);

  const handle = (id) => {
    if (pending) return;
    setPending(true);
    setTimeout(() => onSelect(id), 200);
  };

  const mk = (id) => {
    const lie = LIES.find(l => l.id === id);
    const sel = value === id;
    return (
      <button
        style={{
          ...btnLie,
          border: `2px solid ${sel ? lie.color : '#252f4a'}`,
          background: sel ? `${lie.color}22` : '#1a2235',
          color: sel ? lie.color : '#e8edf8',
        }}
        onClick={() => handle(id)}
      >
        <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.06em' }}>{lie.label}</span>
        <span style={{ fontSize: 10, color: sel ? lie.color : '#8896b0', marginTop: 2 }}>{lie.desc}</span>
      </button>
    );
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: 'auto auto auto', gap: 10 }}>
      <div />  {mk('up')}    <div />
      {mk('hook')} {mk('flat')} {mk('slice')}
      <div />  {mk('down')}  <div />
    </div>
  );
}

// ─── Step D: Clock-Dial Direction ─────────────────────────────────────────────

function StepDirection({ value, onSelect }) {
  const [pending, setPending] = useState(false);

  const handle = (h) => {
    if (pending) return;
    setPending(true);
    setTimeout(() => onSelect(h), 200);
  };

  return (
    <div>
      <div style={{ position: 'relative', width: '100%', paddingTop: '100%', maxWidth: 300, margin: '0 auto' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          {/* Outer ring */}
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid #252f4a', background: '#111827' }} />

          {/* Cardinal crosshairs */}
          {[0, 90].map(deg => (
            <div key={deg} style={{
              position: 'absolute', left: '50%', top: '50%',
              width: '80%', height: 1, background: '#1b2238',
              transform: `translate(-50%, -50%) rotate(${deg}deg)`,
            }} />
          ))}

          {/* Green center */}
          <div style={{
            position: 'absolute', left: '50%', top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '24%', height: '24%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #173a22 0%, #0e1c14 100%)',
            border: '2px solid #1a3028',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, zIndex: 2,
          }}>
            ⛳
          </div>

          {/* Hour buttons */}
          {CLOCK_HOURS.map(({ hour, cx, cy, label, isKey }) => {
            const sel = value === hour;
            const BTN = isKey ? 48 : 40;
            return (
              <button
                key={hour}
                style={{
                  position: 'absolute',
                  left:   `calc(${cx}% - ${BTN / 2}px)`,
                  top:    `calc(${cy}% - ${BTN / 2}px)`,
                  width:  BTN, height: BTN,
                  borderRadius: '50%',
                  border: `2px solid ${sel ? '#c9a228' : isKey ? '#252f4a' : '#1b2238'}`,
                  background: sel ? '#c9a228' : isKey ? '#1a2235' : '#0d1320',
                  color: sel ? '#0b0e18' : isKey ? '#e8edf8' : '#4d5a78',
                  fontSize: isKey ? 8 : 10,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 1,
                  transition: 'all 0.12s',
                  letterSpacing: '0.02em',
                  padding: 2,
                  lineHeight: 1.1,
                  textAlign: 'center',
                }}
                onClick={() => handle(hour)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ textAlign: 'center', fontSize: 11, color: '#4d5a78', marginTop: 14, lineHeight: 1.6 }}>
        12시 = 롱 (LONG) · 6시 = 숏 (SHORT)<br />
        9시 = 훅 · 3시 = 슬라이스 · 12시 = 온그린
      </div>
    </div>
  );
}

// ─── Step E: Putt Detail ─────────────────────────────────────────────────────

function StepPutt({ data, par, onChange, onComplete }) {
  const { putts, puttDistance, puttAimedDistance, strokes } = data;

  // keep strokes >= putts+1 (can't putt more than total strokes)
  const safeSetPutts = (n) => {
    const newStrokes = strokes < n + 1 ? n + 1 : strokes;
    onChange({ putts: n, strokes: newStrokes });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Strokes counter */}
      <div>
        <div style={fieldLabel}>총 타수 (스코어)</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button style={stepperBtn} onClick={() => onChange({ strokes: Math.max(1, strokes - 1) })}>−</button>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 40, fontWeight: 800, color: '#e8edf8' }}>{strokes}</div>
          <button style={stepperBtn} onClick={() => onChange({ strokes: strokes + 1 })}>+</button>
        </div>
      </div>

      {/* Putt count */}
      <div>
        <div style={fieldLabel}>퍼트 수</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[0, 1, 2, 3, 4].map(n => (
            <button
              key={n}
              style={{
                flex: 1, minHeight: 60,
                borderRadius: 8,
                border: `2px solid ${putts === n ? '#c9a228' : '#252f4a'}`,
                background: putts === n ? 'rgba(201,162,40,0.18)' : '#1a2235',
                color: putts === n ? '#c9a228' : '#e8edf8',
                fontSize: 22, fontWeight: 800,
                cursor: 'pointer', transition: 'all 0.12s',
              }}
              onClick={() => safeSetPutts(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Putt distance sliders */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={fieldLabel}>실제 퍼트 거리</div>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#e8edf8' }}>{puttDistance}m</span>
        </div>
        <RangeSlider value={puttDistance} min={1} max={30} step={1} onChange={v => onChange({ puttDistance: v })} color="#c9a228" />
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={fieldLabel}>조준 거리</div>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#e8edf8' }}>{puttAimedDistance}m</span>
        </div>
        <RangeSlider value={puttAimedDistance} min={1} max={30} step={1} onChange={v => onChange({ puttAimedDistance: v })} color="#3db87a" />
      </div>

      {/* Hole Out */}
      <button style={btnHoleOut} onClick={onComplete}>
        🏌️ 홀 아웃 · 저장
      </button>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function HoleWizard({ hole, par, holeNumber, initialData, onComplete, onClose }) {
  const [step, setStep] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [dir, setDir] = useState('forward');

  const [data, setData] = useState(() => ({
    teeClub:          initialData?.teeClub          ?? null,
    remainingDistance: initialData?.remainingDistance ?? 150,
    lieCondition:     initialData?.lieCondition     ?? null,
    missDirection:    initialData?.missDirection    ?? null,
    puttDistance:     initialData?.puttDistance     ?? 3,
    puttAimedDistance: initialData?.puttAimedDistance ?? 3,
    putts:            initialData?.putts            ?? 2,
    strokes:          initialData?.strokes          ?? par,
  }));

  const advance = (updates = {}) => {
    setData(prev => ({ ...prev, ...updates }));
    setDir('forward');
    setAnimKey(k => k + 1);
    setStep(s => s + 1);
  };

  const goBack = () => {
    if (step === 0) return;
    setDir('backward');
    setAnimKey(k => k + 1);
    setStep(s => s - 1);
  };

  const handleComplete = () => {
    onComplete(data);
  };

  const animName = dir === 'forward' ? 'wizardSlideRight' : 'wizardSlideLeft';

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0b0e18',
      zIndex: 9000,
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Noto Sans KR', -apple-system, sans-serif",
      overflowY: 'auto',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid #1b2238',
        flexShrink: 0,
      }}>
        <button style={{ background: 'none', border: 'none', color: '#8896b0', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }} onClick={goBack} disabled={step === 0}>
          <ChevronLeft size={22} style={{ opacity: step === 0 ? 0.2 : 1 }} />
        </button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#c9a228', fontWeight: 700, letterSpacing: '0.2em' }}>
            HOLE {holeNumber} · PAR {par}
          </div>
          <div style={{ fontSize: 12, color: '#8896b0', marginTop: 2, letterSpacing: '0.12em' }}>
            STEP {step + 1} / 5 · {['티샷 클럽', '남은 거리', '라이 상태', '샷 방향', '퍼트 입력'][step]}
          </div>
        </div>

        <button style={{ background: 'none', border: 'none', color: '#4d5a78', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }} onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      {/* Step dots */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', padding: '10px 0', flexShrink: 0 }}>
        {STEP_LABELS.map((_, i) => (
          <div key={i} style={{
            width: i === step ? 24 : 8,
            height: 8,
            borderRadius: 4,
            background: i < step ? '#3db87a' : i === step ? '#c9a228' : '#252f4a',
            transition: 'all 0.2s ease',
          }} />
        ))}
      </div>

      {/* Step content (animated) */}
      <div
        key={animKey}
        style={{
          flex: 1,
          padding: '16px 20px 32px',
          animation: `${animName} 0.25s cubic-bezier(0.4, 0, 0.2, 1)`,
          overflowY: 'auto',
        }}
      >
        {step === 0 && (
          <StepClub
            par={par}
            value={data.teeClub}
            onSelect={club => advance({ teeClub: club })}
          />
        )}
        {step === 1 && (
          <RulerScroll
            value={data.remainingDistance}
            onChange={v => setData(d => ({ ...d, remainingDistance: v }))}
            onConfirm={v => advance({ remainingDistance: v })}
          />
        )}
        {step === 2 && (
          <StepLie
            value={data.lieCondition}
            onSelect={lie => advance({ lieCondition: lie })}
          />
        )}
        {step === 3 && (
          <StepDirection
            value={data.missDirection}
            onSelect={dir => advance({ missDirection: dir })}
          />
        )}
        {step === 4 && (
          <StepPutt
            data={data}
            par={par}
            onChange={updates => setData(d => ({ ...d, ...updates }))}
            onComplete={handleComplete}
          />
        )}
      </div>
    </div>
  );
}

// ─── Shared inline styles ─────────────────────────────────────────────────────

const btnClub = {
  width: '100%', minHeight: 72, padding: '18px 20px',
  borderRadius: 12, cursor: 'pointer',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  transition: 'all 0.15s',
};

const btnLie = {
  minHeight: 72, padding: '14px 8px',
  borderRadius: 10, cursor: 'pointer',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.15s',
};

const btnPrimary = {
  width: '100%', padding: '16px',
  background: '#c9a228', color: '#0b0e18',
  border: 'none', borderRadius: 10,
  fontSize: 16, fontWeight: 800, cursor: 'pointer',
  letterSpacing: '0.04em', minHeight: 56,
};

const btnHoleOut = {
  width: '100%', padding: '22px 16px',
  background: 'linear-gradient(135deg, #c9a228 0%, #e8c84e 50%, #c9a228 100%)',
  color: '#0b0e18', border: 'none', borderRadius: 14,
  fontSize: 20, fontWeight: 800, cursor: 'pointer',
  letterSpacing: '0.06em', minHeight: 72,
  boxShadow: '0 4px 20px rgba(201,162,40,0.45)',
};

const stepperBtn = {
  width: 56, height: 56, borderRadius: 10,
  border: '1px solid #252f4a', background: '#1a2235',
  color: '#e8edf8', fontSize: 24, fontWeight: 800,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', flexShrink: 0,
};

const fieldLabel = {
  fontSize: 10, letterSpacing: '0.2em',
  color: '#8896b0', textTransform: 'uppercase',
  fontWeight: 700, marginBottom: 8,
};
