import { useRef, useState } from 'react';
import { ChevronLeft, Check, Plus, X } from 'lucide-react';
import styles from '../../styles/styles';
import { COLOR } from '../stats/format.js';
import { BAG_COLOR } from './colors.js';
import DistanceField from './DistanceField';
import { saveClubsForUser } from '../../db.js';
import { nowMs } from '../../engine/clock.js';
import { bagCoverage } from '../../engine/clubRecommend.js';
import { shotLabelOf } from '../../engine/bagStats.js';
import {
  CATALOG, CATEGORIES, ALL_TYPES, CATEGORY_LABEL, CATEGORY_TITLE, BAG_LIMIT, DEFAULT_SELECTION, NAME_MAX,
  guessCategory, suggestDistance, checkNewClub, readableInScoring, toBagClubs,
} from '../../engine/clubCatalog.js';
import { fmtShot, displayShot, unitLabel } from '../../engine/units.js';

// 마이백 처음 등록 — ① 가진 클럽 고르기 → ② 클럽마다 거리 맞추기 → ③ 완료.
//
// ①은 우드·하이브리드·아이언·웨지를 넓은 범위로 보여 준다 (9W · 2H · 1I처럼 잘 쓰지 않는 클럽, 46°~64° 웨지까지).
//    없는 클럽은 끄고, 목록에 없는 클럽(특이한 각 등)은 '직접 추가'에서 종류를 골라 넣는다.
// ②는 제안 거리에서 시작한다. 내 거리와 같으면 ✓만 눌러도 되고, 확인하지 않은 클럽은 거리를 확인하기 전까지 클럽 추천에서 뺀다.
// 저장은 ②에서 '등록하기'를 누를 때 한 번 — 마이백이 쓰는 클럽 배열 그대로 saveClubsForUser 에 넣는다.
//
// onBack: 왼쪽 위 ← (1단계에서만) · onLater: 있으면 1단계 아래에 '나중에 할게요' · onDone(clubs): ③에서 완료를 눌렀을 때
// bottomOffset: 아래 고정 막대가 화면 아래 메뉴를 피할 높이(px) — 마이백 안에서는 메뉴 높이, 전체 화면 위에서는 0

const STEPS = [[1, '클럽 선택'], [2, '거리 입력'], [3, '완료']];

const chipBase = {
  minWidth: 62, height: 44, padding: '0 14px', borderRadius: 12, cursor: 'pointer', fontSize: 15, fontWeight: 800,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, boxSizing: 'border-box',
};

// 화면에 보이는 숫자끼리 뺀 런 (캐리·토탈이 야드로 보일 때도 서로 맞게)
const runOf = (d) => (displayShot(d.total) ?? 0) - (displayShot(d.carry) ?? 0);

export default function BagSetupWizard({ currentUser, onBack, onLater = null, onDone, bottomOffset = 0 }) {
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState(() => new Set(DEFAULT_SELECTION));
  const [customs, setCustoms] = useState([]);          // 직접 추가한 클럽 [{ key, id, name, type, custom: true }]
  const [dist, setDist] = useState({});                // { [key]: { carry, total, confirmed } } — 건드린 클럽만
  const [openKey, setOpenKey] = useState(null);        // ②에서 편집 칸이 열린 클럽
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addType, setAddType] = useState(null);
  const [addTypeTouched, setAddTypeTouched] = useState(false);   // 종류를 사용자가 직접 골랐으면 이름으로 짐작해서 덮어쓰지 않는다
  const [addError, setAddError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [savedClubs, setSavedClubs] = useState(null);
  const seqRef = useRef(0);

  const entries = [...CATALOG, ...customs];
  const picked = entries.filter((e) => selected.has(e.key));
  const pickedWithDistance = picked.filter((e) => e.type !== 'Putter');
  const overLimit = picked.length > BAG_LIMIT;
  const getDist = (e) => dist[e.key] ?? { ...suggestDistance(e.type, e.name), confirmed: false };
  const confirmedCount = pickedWithDistance.filter((e) => getDist(e).confirmed).length;
  const unconfirmedCount = pickedWithDistance.length - confirmedCount;

  const toggle = (key) => {
    setNotice('');
    setSelected((s) => { const next = new Set(s); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  };
  const removeCustom = (e) => {
    setNotice('');
    setCustoms((cs) => cs.filter((c) => c.key !== e.key));
    setSelected((s) => { const next = new Set(s); next.delete(e.key); return next; });
  };

  // ── 직접 추가
  const closeAdd = () => { setAddOpen(false); setAddName(''); setAddType(null); setAddTypeTouched(false); setAddError(''); };
  const onAddName = (v) => {
    setAddName(v); setAddError('');
    if (!addTypeTouched) setAddType(guessCategory(v));
  };
  const submitAdd = () => {
    const r = checkNewClub(addName, addType, entries);
    if (!r.ok) {
      if (r.reason === 'name') setAddError('클럽 이름을 적어 주세요');
      else if (r.reason === 'type') setAddError('우드 · 하이브리드 · 아이언 · 웨지 중 어느 종류인지 골라 주세요');
      else if (r.reason === 'long') setAddError(`이름은 ${NAME_MAX}글자까지예요`);
      else if (r.dup.type !== addType) setAddError(`${r.dup.name}은(는) 이미 ${CATEGORY_LABEL[r.dup.type]}에 있는 이름이에요`);
      else {   // 같은 종류에 이미 있다 — 목록의 그 클럽을 켜 준다
        setSelected((s) => new Set(s).add(r.dup.key));
        setNotice(`${r.dup.name}은(는) 이미 목록에 있어서 선택만 켰어요`);
        closeAdd();
      }
      return;
    }
    seqRef.current += 1;
    const entry = { key: `${r.type}:${r.name}`, id: `${r.type.toLowerCase()}_${nowMs()}_${seqRef.current}`, name: r.name, type: r.type, custom: true };
    setCustoms((cs) => [...cs, entry]);
    setSelected((s) => new Set(s).add(entry.key));
    setNotice(`${r.name}을(를) ${CATEGORY_LABEL[r.type]}에 넣었어요`);
    closeAdd();
  };

  // ── 거리 맞추기
  const setField = (e, field, v) => setDist((d) => ({ ...d, [e.key]: { ...(d[e.key] ?? { ...suggestDistance(e.type, e.name) }), [field]: v, confirmed: true } }));
  const toggleConfirm = (e) => setDist((d) => ({ ...d, [e.key]: { ...(d[e.key] ?? { ...suggestDistance(e.type, e.name) }), confirmed: !(d[e.key]?.confirmed) } }));
  const confirmAll = () => setDist((d) => {
    const next = { ...d };
    pickedWithDistance.forEach((e) => { next[e.key] = { ...(d[e.key] ?? { ...suggestDistance(e.type, e.name) }), confirmed: true }; });
    return next;
  });

  const register = async () => {
    if (saving) return;
    setSaving(true); setSaveError(false);
    const bag = toBagClubs(picked, dist);
    try {
      await saveClubsForUser(currentUser.userId, bag);
      setSavedClubs(bag);
      setStep(3);
    } catch (err) {
      console.error('Register clubs failed', err);
      setSaveError(true);
    }
    setSaving(false);
  };

  // ── 공통 조각
  const barBottom = `calc(${bottomOffset}px + env(safe-area-inset-bottom, 0px) + 12px)`;
  const bar = (children) => (
    <>
      <div aria-hidden="true" style={{ height: 150 }} />
      <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 520, boxSizing: 'border-box', bottom: barBottom, zIndex: 40, padding: '0 16px' }}>
        <div style={{ borderRadius: 18, background: 'rgba(14,20,34,0.96)', border: '1px solid rgba(201,162,40,0.45)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', padding: '10px 12px' }}>
          {children}
        </div>
      </div>
    </>
  );
  const primaryBtn = (props, label) => (
    <button type="button" {...props}
      style={{ width: '100%', height: 50, borderRadius: 14, border: 'none', background: `linear-gradient(180deg, ${COLOR.goldHi} 0%, ${COLOR.gold} 100%)`, color: '#0b0e18', fontSize: 16, fontWeight: 900, cursor: props.disabled ? 'default' : 'pointer', opacity: props.disabled ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
      {label}
    </button>
  );
  const header = (
    <header style={styles.pageHeader}>
      {step === 3 ? <div style={{ width: 44 }} /> : (
        <button style={styles.iconBack} onClick={step === 2 ? () => setStep(1) : onBack} aria-label={step === 2 ? '클럽 다시 고르기' : '뒤로'} data-role="wizard-back">
          <ChevronLeft size={22} />
        </button>
      )}
      <div style={styles.pageTitle}>내 클럽 등록</div>
      <div style={{ width: 44 }} />
    </header>
  );
  const stepper = (
    <ol data-role="wizard-stepper" aria-label="등록 단계" style={{ listStyle: 'none', margin: '0 2px 16px', padding: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
      {STEPS.map(([n, label], i) => (
        <li key={n} aria-current={step === n ? 'step' : undefined} style={{ display: 'contents' }}>
          {i > 0 && <span aria-hidden="true" style={{ flex: 1, height: 1, background: COLOR.line }} />}
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 800, color: step === n ? COLOR.goldHi : step > n ? COLOR.green : COLOR.faint, whiteSpace: 'nowrap' }}>
            <b style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, lineHeight: 1, background: step === n ? COLOR.gold : step > n ? COLOR.green : '#1f2842', color: step === n || step > n ? '#0b0e18' : COLOR.muted }}>
              {step > n ? <Check size={11} strokeWidth={3.4} /> : n}
            </b>
            {label}
          </span>
        </li>
      ))}
    </ol>
  );

  // ─────────────── ① 클럽 고르기
  if (step === 1) {
    return (
      <div data-role="wizard-step1">
        {header}
        {stepper}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, margin: '0 2px 16px' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 21, fontWeight: 900, lineHeight: 1.35 }}>가지고 있는 클럽을<br />골라 주세요</div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: COLOR.muted, marginTop: 6, wordBreak: 'keep-all' }}>없는 클럽은 꺼 두고, 잘 안 쓰는 클럽도 골라요. 고른 클럽만 마이백에 들어가요.</div>
          </div>
          <span data-role="pick-count" style={{ flexShrink: 0, padding: '4px 10px', borderRadius: 999, border: `1px solid ${overLimit ? COLOR.red : COLOR.green}`, color: overLimit ? COLOR.red : COLOR.green, fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap' }}>
            {picked.length} / {BAG_LIMIT}개
          </span>
        </div>
        {overLimit && <div data-role="over-limit" style={{ fontSize: 14, color: COLOR.red, margin: '-8px 2px 14px', lineHeight: 1.5 }}>규정은 클럽 최대 {BAG_LIMIT}개예요. 그래도 등록은 할 수 있어요.</div>}

        {ALL_TYPES.map((type) => {
          const list = entries.filter((e) => e.type === type);
          const on = list.filter((e) => selected.has(e.key)).length;
          return (
            <div key={type} data-role={`group-${type}`} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 2px 8px' }}>
                <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.12em', color: COLOR.slate }}>{CATEGORY_TITLE[type]}</span>
                <span data-role={`group-count-${type}`} style={{ fontSize: 13, color: COLOR.faint, fontVariantNumeric: 'tabular-nums' }}>{on} / {list.length}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {list.map((e) => {
                  const isOn = selected.has(e.key);
                  const readable = e.type === 'Putter' || readableInScoring(e);
                  return (
                    <span key={e.key} style={{ display: 'inline-flex', gap: 2, alignItems: 'center' }}>
                      <button type="button" aria-pressed={isOn} data-role={`club-chip-${e.type}-${e.name}`} onClick={() => toggle(e.key)}
                        style={{
                          ...chipBase,
                          border: `${e.custom ? '1.5px dashed' : '1.5px solid'} ${isOn ? COLOR.gold : '#252f4a'}`,
                          background: isOn ? 'rgba(201,162,40,0.16)' : '#1a2235',
                          color: isOn ? COLOR.goldHi : COLOR.faint,
                        }}>
                        {isOn && <Check size={13} strokeWidth={3} aria-hidden="true" />}{e.name}{!readable && <sup aria-label="스코어 입력에 없는 클럽" style={{ fontSize: 12, marginLeft: 1 }}>*</sup>}
                      </button>
                      {e.custom && (
                        <button type="button" aria-label={`${e.name} 삭제`} data-role={`custom-del-${e.key}`} onClick={() => removeCustom(e)}
                          style={{ width: 32, height: 44, border: 'none', background: 'none', color: COLOR.faint, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <X size={15} />
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div data-role="scoring-footnote" style={{ fontSize: 13, color: COLOR.faint, lineHeight: 1.6, margin: '-4px 2px 14px', wordBreak: 'keep-all' }}>
          * 표시 클럽은 스코어 입력에 없어서 마이백에는 담기지만 클럽 추천에서는 빠져요.
        </div>

        {notice && <div role="status" data-role="add-done" style={{ fontSize: 14, color: COLOR.green, margin: '0 2px 10px', lineHeight: 1.5 }}>{notice}</div>}

        {!addOpen ? (
          <button type="button" data-role="add-open" onClick={() => { setNotice(''); setAddOpen(true); }}
            style={{ width: '100%', height: 48, borderRadius: 14, border: '1.5px dashed rgba(201,162,40,0.55)', background: 'rgba(201,162,40,0.06)', color: COLOR.goldHi, fontSize: 15, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Plus size={16} strokeWidth={2.6} />클럽 직접 추가
          </button>
        ) : (
          <div data-role="add-panel" style={{ padding: 14, borderRadius: 16, background: 'rgba(201,162,40,0.06)', border: '1px solid rgba(201,162,40,0.35)' }}>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>클럽 직접 추가</div>
            <label htmlFor="bag-add-name" style={{ display: 'block', fontSize: 13, color: COLOR.muted, fontWeight: 700, marginBottom: 5 }}>이름</label>
            <input id="bag-add-name" data-role="add-name" type="text" maxLength={NAME_MAX} value={addName} placeholder="예: 47° · 4W · 1I · SW"
              onChange={(ev) => onAddName(ev.target.value)}
              onKeyDown={(ev) => { if (ev.key === 'Enter') submitAdd(); }}
              style={{ width: '100%', boxSizing: 'border-box', height: 44, borderRadius: 10, border: `1px solid ${COLOR.line}`, background: '#0b0e18', color: COLOR.text, fontSize: 16, fontWeight: 700, padding: '0 12px', outline: 'none' }} />

            <div style={{ fontSize: 13, color: COLOR.muted, fontWeight: 700, margin: '12px 0 6px' }}>어느 종류예요?</div>
            <div role="radiogroup" aria-label="클럽 종류" style={{ display: 'flex', gap: 6 }}>
              {CATEGORIES.map((t) => (
                <button key={t} type="button" role="radio" aria-checked={addType === t} data-role={`add-type-${t}`}
                  onClick={() => { setAddType(t); setAddTypeTouched(true); setAddError(''); }}
                  style={{ flex: 1, minWidth: 0, height: 44, borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap', padding: 0,
                    border: `1.5px solid ${addType === t ? COLOR.gold : '#252f4a'}`, background: addType === t ? 'rgba(201,162,40,0.16)' : '#1a2235', color: addType === t ? COLOR.goldHi : COLOR.muted }}>
                  {CATEGORY_LABEL[t]}
                </button>
              ))}
            </div>

            {addName.trim() && addType && !addTypeTouched && (
              <div data-role="add-guess" style={{ fontSize: 13, color: COLOR.muted, marginTop: 6, lineHeight: 1.5 }}>이름을 보고 {CATEGORY_LABEL[addType]}로 골라 뒀어요. 다르면 바꿔 주세요.</div>
            )}
            {addName.trim() && addType && (
              <div data-role="add-hint" style={{ fontSize: 13, lineHeight: 1.5, marginTop: 6, color: readableInScoring({ name: addName.trim(), type: addType }) ? COLOR.green : COLOR.amber, wordBreak: 'keep-all' }}>
                {readableInScoring({ name: addName.trim(), type: addType })
                  ? `스코어 입력의 ${shotLabelOf({ name: addName.trim(), type: addType })}로 읽혀서 클럽 추천에 쓰여요`
                  : '스코어 입력에 없는 클럽이라 마이백에는 담기지만 클럽 추천에서는 빠져요'}
              </div>
            )}
            {addError && <div role="alert" data-role="add-error" style={{ fontSize: 14, color: COLOR.red, marginTop: 8, lineHeight: 1.5 }}>{addError}</div>}

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button type="button" data-role="add-cancel" onClick={closeAdd}
                style={{ flex: 1, height: 44, borderRadius: 12, border: `1px solid ${COLOR.line}`, background: 'transparent', color: COLOR.muted, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>취소</button>
              <button type="button" data-role="add-submit" onClick={submitAdd}
                style={{ flex: 1.4, height: 44, borderRadius: 12, border: 'none', background: `linear-gradient(180deg, ${COLOR.goldHi} 0%, ${COLOR.gold} 100%)`, color: '#0b0e18', fontSize: 15, fontWeight: 900, cursor: 'pointer' }}>추가</button>
            </div>
          </div>
        )}

        {bar(
          <>
            {primaryBtn({ 'data-role': 'wizard-next', disabled: pickedWithDistance.length === 0, onClick: () => { setNotice(''); setOpenKey(null); setStep(2); } },
              <>다음 · 거리 입력<span style={{ fontSize: 14, fontWeight: 700, opacity: 0.7 }}>({picked.length}개)</span></>)}
            {onLater && (
              <button type="button" data-role="wizard-later" onClick={onLater}
                style={{ width: '100%', height: 40, border: 'none', background: 'none', color: COLOR.muted, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>나중에 할게요</button>
            )}
          </>
        )}
      </div>
    );
  }

  // ─────────────── ② 거리 맞추기
  if (step === 2) {
    return (
      <div data-role="wizard-step2">
        {header}
        {stepper}
        <div style={{ margin: '0 2px 12px' }}>
          <div style={{ fontSize: 21, fontWeight: 900, lineHeight: 1.35 }}>클럽마다 거리를<br />맞춰 주세요</div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: COLOR.muted, marginTop: 6, wordBreak: 'keep-all' }}>제안 거리에서 시작해요. 내 거리와 같으면 ✓만 눌러도 돼요.</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 2px 14px' }}>
          <span data-role="dist-progress" style={{ fontSize: 14, fontWeight: 800, color: COLOR.text }}>
            확인 <span style={{ color: COLOR.green }}>{confirmedCount}</span> / {pickedWithDistance.length}
          </span>
          <span style={{ flex: 1 }} />
          <button type="button" data-role="confirm-all" onClick={confirmAll} disabled={unconfirmedCount === 0}
            style={{ height: 36, padding: '0 12px', borderRadius: 999, border: '1px solid rgba(61,184,122,0.5)', background: 'rgba(61,184,122,0.08)', color: COLOR.green, fontSize: 14, fontWeight: 800, cursor: 'pointer', opacity: unconfirmedCount === 0 ? 0.4 : 1 }}>
            전부 맞아요
          </button>
        </div>

        {CATEGORIES.map((type) => {
          const list = pickedWithDistance.filter((e) => e.type === type);
          if (list.length === 0) return null;
          return (
            <div key={type} data-role={`dist-group-${type}`} style={{ marginBottom: 12, borderRadius: 18, background: 'rgba(201,162,40,0.06)', border: '1px solid rgba(201,162,40,0.18)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 14px 4px', fontSize: 13, fontWeight: 800, letterSpacing: '0.12em', color: COLOR.slate }}>{CATEGORY_TITLE[type]}</div>
              {list.map((e) => {
                const d = getDist(e);
                const isOpen = openKey === e.key;
                const readable = readableInScoring(e);
                return (
                  <div key={e.key} data-role={`dist-row-${e.type}-${e.name}`} style={{ borderTop: `1px solid ${COLOR.line}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', minHeight: 56 }}>
                      <button type="button" data-role={`dist-open-${e.type}-${e.name}`} aria-expanded={isOpen} onClick={() => setOpenKey(isOpen ? null : e.key)}
                        style={{ flex: 1, minWidth: 0, minHeight: 56, display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: COLOR.text, textAlign: 'left', cursor: 'pointer', padding: '0 4px 0 14px' }}>
                        <span style={{ fontSize: 16, fontWeight: 800 }}>{e.name}{!readable && <sup style={{ fontSize: 12 }}>*</sup>}</span>
                        {!d.confirmed && <span style={{ fontSize: 12, fontWeight: 700, color: COLOR.faint, border: '1px solid #2a3556', borderRadius: 999, padding: '1px 7px', whiteSpace: 'nowrap' }}>제안값</span>}
                        <span style={{ flex: 1 }} />
                        <span style={{ fontSize: 14, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', color: d.confirmed ? COLOR.muted : COLOR.faint }}>
                          캐리 <b style={{ color: BAG_COLOR.carry }}>{fmtShot(d.carry, { unit: false })}</b> · 토탈 <b style={{ color: BAG_COLOR.total }}>{fmtShot(d.total, { unit: false })}</b>
                        </span>
                      </button>
                      <button type="button" data-role={`dist-check-${e.type}-${e.name}`} aria-pressed={!!d.confirmed} aria-label={`${e.name} 거리 확인`} onClick={() => toggleConfirm(e)}
                        style={{ width: 44, height: 44, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 }}>
                        <span style={{ width: 26, height: 26, borderRadius: '50%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${d.confirmed ? COLOR.green : '#34405f'}`, background: d.confirmed ? COLOR.green : 'transparent', color: '#0b0e18' }}>
                          {d.confirmed && <Check size={14} strokeWidth={3.2} />}
                        </span>
                      </button>
                    </div>
                    {isOpen && (
                      <div data-role="dist-editor" style={{ padding: '2px 12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <DistanceField id="carry" label="캐리" sub="CARRY" color={BAG_COLOR.carry} value={d.carry} onChange={(v) => setField(e, 'carry', v)} />
                        <DistanceField id="total" label="토탈" sub="TOTAL" color={BAG_COLOR.total} value={d.total} onChange={(v) => setField(e, 'total', v)} />
                        <div style={{ fontSize: 13, color: COLOR.faint, lineHeight: 1.5 }}>
                          런(토탈 − 캐리) <b style={{ color: runOf(d) < 0 ? COLOR.amber : COLOR.muted }}>{runOf(d) > 0 ? '+' : runOf(d) < 0 ? '−' : ''}{Math.abs(runOf(d))}{unitLabel('shot')}</b>
                          {!readable && <span style={{ color: COLOR.amber }}> · 스코어 입력에 없는 클럽이라 추천에서는 빠져요</span>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {saveError && <div role="alert" data-role="save-error" style={{ fontSize: 14, color: COLOR.red, margin: '4px 2px 10px' }}>저장하지 못했어요. 잠시 뒤에 다시 눌러 주세요.</div>}

        {bar(
          <>
            {primaryBtn({ 'data-role': 'wizard-register', disabled: saving, onClick: register }, saving ? '등록하는 중…' : '등록하기')}
            <div data-role="unconfirmed-note" style={{ textAlign: 'center', fontSize: 13, color: unconfirmedCount > 0 ? COLOR.amber : COLOR.green, margin: '8px 0 2px', lineHeight: 1.5, wordBreak: 'keep-all' }}>
              {unconfirmedCount > 0
                ? `확인하지 않은 ${unconfirmedCount}개는 마이백에서 거리를 확인하면 클럽 추천에 들어가요`
                : '모든 클럽의 거리를 확인했어요'}
            </div>
          </>
        )}
      </div>
    );
  }

  // ─────────────── ③ 완료
  const cover = bagCoverage(savedClubs ?? []);
  const confirmedSaved = (savedClubs ?? []).filter((c) => c.type !== 'Putter' && !c.unset).length;
  const unconfirmedSaved = (savedClubs ?? []).filter((c) => c.type !== 'Putter' && c.unset).length;
  return (
    <div data-role="wizard-step3">
      {header}
      {stepper}
      <div style={{ textAlign: 'center', padding: '28px 8px 8px' }}>
        <span style={{ width: 64, height: 64, borderRadius: 20, margin: '0 auto', background: 'rgba(61,184,122,0.14)', border: '1px solid rgba(61,184,122,0.4)', color: COLOR.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Check size={30} strokeWidth={2.6} />
        </span>
        <div style={{ fontSize: 22, fontWeight: 900, marginTop: 16 }}>마이백에 등록했어요</div>
        <div data-role="done-summary" style={{ fontSize: 14, color: COLOR.text, marginTop: 8, lineHeight: 1.6 }}>
          클럽 {(savedClubs ?? []).length}개 · 클럽 추천에 쓰는 클럽 <b style={{ color: COLOR.green }}>{cover.usable}</b>개
        </div>
        <div data-role="done-note" style={{ fontSize: 14, color: unconfirmedSaved > 0 ? COLOR.amber : COLOR.muted, marginTop: 8, lineHeight: 1.65, wordBreak: 'keep-all' }}>
          {unconfirmedSaved > 0
            ? `거리를 확인하지 않은 ${unconfirmedSaved}개 클럽은 마이백에서 거리를 확인하면 추천에 들어가요.`
            : `거리를 확인한 ${confirmedSaved}개 클럽으로 스코어 입력에서 남은 거리에 맞는 클럽을 추천해 드려요.`}
        </div>
      </div>
      {bar(primaryBtn({ 'data-role': 'done-close', onClick: () => onDone?.(savedClubs ?? []) }, '완료'))}
    </div>
  );
}
