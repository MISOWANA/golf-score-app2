import { useState } from 'react';
import { ChevronDown, GripVertical, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { COLOR } from '../stats/format.js';
import { BAG_COLOR } from './colors.js';
import DistanceField from './DistanceField';
import { shotLabelOf, fitToMeasured } from '../../engine/bagStats.js';

// 마이백의 클럽 한 줄. 접힌 줄은 이름과 캐리·토탈만, 누르면 그 자리에서 이름·거리를 고친다.
// 바깥 요소(data-club-id)가 줄과 편집 칸을 함께 감싼다 — 끌어서 순서 바꾸기가 이 요소를 기준으로 한다.

export default function ClubRow({
  club, open, onToggle, index, count,
  measured, changed = false, unset = false, onConfirm, onRename, onDistance, onFit, onMove, onDelete,
  isDragging, isDragOver,
  onDragStart, onDragEnd, onDragOver, onDrop, onGripTouchStart,
}) {
  const isPutter = club.type === 'Putter';
  const run = (club.total ?? 0) - (club.carry ?? 0);
  const [nameDraft, setNameDraft] = useState(null);
  const label = isPutter ? null : shotLabelOf(club);   // 스코어 입력의 어느 버튼으로 읽히나 (null = 읽히지 않음)
  const commitName = () => {
    if (nameDraft == null) return;
    const t = nameDraft.trim();
    setNameDraft(null);
    if (t && t !== club.name) onRename(t);
  };
  const fit = measured && !isPutter ? fitToMeasured(club, measured.median) : null;
  const diff = measured ? measured.median - (club.total ?? 0) : null;

  return (
    <div data-club-id={club.id} draggable={!open}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart?.(); }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => { e.preventDefault(); onDragOver?.(); }}
      onDrop={(e) => { e.preventDefault(); onDrop?.(); }}
      style={{
        borderBottom: `1px solid ${COLOR.line}`, opacity: isDragging ? 0.4 : 1,
        background: open ? 'rgba(201,162,40,0.06)' : 'transparent',
        boxShadow: isDragOver ? `inset 3px 0 0 ${COLOR.gold}` : 'none', transition: 'opacity 0.15s',
        scrollMarginTop: 64, scrollMarginBottom: 96,   // 위의 붙은 탭 행과 아래 메뉴에 가리지 않게
      }}>
      {/* 접힌 줄 */}
      <div style={{ display: 'flex', alignItems: 'center', minHeight: 54 }}>
        <div aria-label="순서 변경" onTouchStart={onGripTouchStart}
          style={{ width: 30, alignSelf: 'stretch', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLOR.faint, cursor: 'grab', touchAction: 'none', flexShrink: 0 }}>
          <GripVertical size={16} strokeWidth={1.6} />
        </div>
        <button type="button" data-role={`club-open-${club.id}`} aria-expanded={open} onClick={onToggle}
          style={{ flex: 1, minWidth: 0, minHeight: 54, display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: COLOR.text, textAlign: 'left', cursor: 'pointer', padding: '0 12px 0 2px' }}>
          <span style={{ fontSize: 15, fontWeight: 800, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{club.name}</span>
          <span style={{ flex: 1 }} />
          {changed && <span data-role={`club-changed-${club.id}`} style={{ fontSize: 10.5, fontWeight: 800, color: BAG_COLOR.unsaved, border: '1px solid rgba(239,138,80,0.55)', borderRadius: 999, padding: '1px 7px', whiteSpace: 'nowrap' }}>수정됨</span>}
          {unset && !isPutter && <span data-role={`club-unset-${club.id}`} style={{ fontSize: 10.5, fontWeight: 800, color: COLOR.amber, border: '1px solid rgba(230,185,74,0.45)', borderRadius: 999, padding: '1px 7px', whiteSpace: 'nowrap' }}>거리 확인 필요</span>}
          {!isPutter && (
            <span data-role={`club-values-${club.id}`} style={{ fontSize: 12.5, color: COLOR.muted, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
              캐리 <b data-role={`club-carry-${club.id}`} style={{ color: BAG_COLOR.carry }}>{club.carry ?? '–'}</b> · 토탈 <b data-role={`club-total-${club.id}`} style={{ color: BAG_COLOR.total }}>{club.total ?? '–'}</b>
            </span>
          )}
          <ChevronDown size={16} aria-hidden="true" style={{ color: COLOR.faint, flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
        </button>
      </div>

      {/* 편집 칸 */}
      {open && (
        <div data-role={`club-editor-${club.id}`} style={{ padding: '4px 12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left', animation: 'fadeIn 0.18s ease-out' }}>
          <div>
            <div style={{ fontSize: 11, color: COLOR.muted, fontWeight: 700, marginBottom: 5 }}>이름</div>
            <input type="text" aria-label="클럽 이름" data-role="club-name-input" maxLength={12}
              value={nameDraft ?? club.name}
              onFocus={() => setNameDraft(club.name)}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setNameDraft(null); e.currentTarget.blur(); } }}
              style={{ width: '100%', boxSizing: 'border-box', height: 44, borderRadius: 10, border: `1px solid ${COLOR.line}`, background: '#0b0e18', color: COLOR.text, fontSize: 15, fontWeight: 700, padding: '0 12px', outline: 'none' }} />
            {!isPutter && (
              <div data-role="club-name-hint" style={{ fontSize: 11.5, lineHeight: 1.5, marginTop: 5, color: label ? COLOR.green : COLOR.amber }}>
                {label
                  ? `스코어 입력의 ${label}로 읽혀서 클럽 추천에 쓰여요`
                  : '스코어 입력에 없는 이름이라 클럽 추천에서 빠져요 (7i · 3W · 52°처럼 쓰면 포함돼요)'}
              </div>
            )}
          </div>

          {!isPutter && unset && (
            <div data-role="club-confirm-box" style={{ borderRadius: 12, border: '1px solid rgba(230,185,74,0.45)', background: 'rgba(230,185,74,0.08)', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0, fontSize: 12, lineHeight: 1.55, color: '#c4cfe0', wordBreak: 'keep-all' }}>
                <b style={{ color: COLOR.amber }}>아직 확인하지 않은 거리</b>예요. 내 거리와 같으면 ‘맞아요’를 눌러요. 확인하기 전에는 클럽 추천에서 빠져요.
              </div>
              <button type="button" data-role="club-confirm" onClick={onConfirm}
                style={{ height: 44, padding: '0 14px', borderRadius: 10, border: `1px solid ${COLOR.amber}`, background: 'transparent', color: COLOR.amber, fontSize: 12, fontWeight: 800, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>맞아요</button>
            </div>
          )}

          {!isPutter && (
            <>
              <div data-role="club-reg-caption" style={{ fontSize: 11, color: COLOR.muted, fontWeight: 700, marginBottom: -4 }}>
                마이백에 등록한 거리 <span style={{ color: COLOR.faint, fontWeight: 500 }}>· 내가 직접 정하는 값</span>
              </div>
              <DistanceField id="carry" label="캐리" sub="CARRY" color={BAG_COLOR.carry} value={club.carry} onChange={(v) => onDistance('carry', v)} />
              <DistanceField id="total" label="토탈" sub="TOTAL" color={BAG_COLOR.total} value={club.total} onChange={(v) => onDistance('total', v)} />
              <div style={{ fontSize: 11.5, color: COLOR.faint, lineHeight: 1.5 }}>
                런(토탈 − 캐리) <b data-role="club-run" style={{ color: run < 0 ? COLOR.amber : COLOR.muted }}>{run > 0 ? '+' : run < 0 ? '−' : ''}{Math.abs(run)}m</b>
              </div>
            </>
          )}

          {measured && fit && (
            <div data-role="club-measured" style={{ borderRadius: 12, border: '1px solid rgba(243,211,107,0.4)', background: 'rgba(243,211,107,0.07)', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0, fontSize: 12, lineHeight: 1.55, color: '#c4cfe0' }}>
                <b style={{ color: BAG_COLOR.measured }}>라운드 실측</b> <b style={{ color: BAG_COLOR.measured, fontSize: 14 }}>{measured.median}m</b> <span style={{ color: COLOR.faint }}>(샷 {measured.n}개 · 공이 멈춘 곳)</span>
                <div style={{ color: diff === 0 ? COLOR.green : COLOR.muted }}>
                  {diff === 0 ? '등록한 토탈과 같아요' : `등록한 토탈보다 ${Math.abs(diff)}m ${diff > 0 ? '더 나가요' : '덜 나가요'}`}
                </div>
              </div>
              {diff !== 0 && (
                <button type="button" data-role="club-fit" onClick={() => onFit(fit)}
                  style={{ height: 44, padding: '0 12px', borderRadius: 10, border: `1px solid ${BAG_COLOR.measured}`, background: 'transparent', color: BAG_COLOR.measured, fontSize: 12, fontWeight: 800, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  토탈 {measured.median}m로
                </button>
              )}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" aria-label="위로" data-role="club-up" disabled={index === 0} onClick={() => onMove(-1)}
              style={{ width: 44, height: 44, borderRadius: 10, border: `1px solid ${COLOR.line}`, background: '#131c30', color: COLOR.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: index === 0 ? 0.35 : 1, padding: 0 }}><ArrowUp size={16} /></button>
            <button type="button" aria-label="아래로" data-role="club-down" disabled={index === count - 1} onClick={() => onMove(1)}
              style={{ width: 44, height: 44, borderRadius: 10, border: `1px solid ${COLOR.line}`, background: '#131c30', color: COLOR.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: index === count - 1 ? 0.35 : 1, padding: 0 }}><ArrowDown size={16} /></button>
            <span style={{ flex: 1 }} />
            <button type="button" aria-label={`${club.name} 삭제`} data-role="club-delete" onClick={onDelete}
              style={{ height: 44, padding: '0 14px', borderRadius: 10, border: '1px solid rgba(239,83,80,0.4)', background: 'transparent', color: COLOR.red, fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Trash2 size={14} strokeWidth={2} />삭제
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
