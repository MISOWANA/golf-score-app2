import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronDown, RotateCcw } from 'lucide-react';
import styles from '../../styles/styles';
import HistoryCard from './HistoryCard';
import HistoryFilterBar from './HistoryFilterBar';
import { filterHistory, isFiltered, roundYears } from '../../engine/historyFilter.js';
import { isNineHoleRound } from '../../engine/nines.js';
import { myPlayer } from '../../engine/players.js';
import { TRASH_KEEP_DAYS, trashDaysLeft } from '../../engine/trash.js';

const UNDO_MS = 8000;
const FILTER_MIN_ROUNDS = 4;   // 이만큼 쌓이기 전에는 찾기 줄을 보이지 않는다

// 휴지통 한 줄 — 어느 라운드인지 알아볼 만큼만: 코스 · 날짜 · 타수 · 지운 지 며칠
function TrashRow({ row, userName, onRestore, onPurge }) {
  const [confirming, setConfirming] = useState(false);
  const round = row.round;
  const me = myPlayer(round, userName);
  const total = round.holes.reduce((s, h) => s + (h.scores?.[me]?.strokes || 0), 0);
  const left = trashDaysLeft(row.deletedAt);
  return (
    <div data-role="trash-row" style={{ padding: '10px 12px', borderRadius: 12, background: '#111827', border: '1px solid #1b2238', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#e8edf8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{round.courseName}</div>
          <div style={{ fontSize: 13, color: '#8896b0' }}>
            {new Date(round.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })} · {total}타 · {left}일 뒤 사라져요
          </div>
        </div>
        {!confirming && (
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button type="button" data-role="trash-restore" onClick={() => onRestore(round.id)}
              style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid rgba(61,184,122,0.5)', background: 'rgba(61,184,122,0.12)', color: '#3db87a', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>복원</button>
            <button type="button" data-role="trash-purge" onClick={() => setConfirming(true)}
              style={{ padding: '8px 10px', borderRadius: 10, border: '1.5px solid #2c3a5c', background: 'transparent', color: '#8896b0', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>삭제</button>
          </div>
        )}
      </div>
      {confirming && (
        <div data-role="trash-confirm" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, color: '#ef5350', flex: '1 1 140px' }}>영구 삭제하면 되돌릴 수 없어요</span>
          <button type="button" onClick={() => setConfirming(false)}
            style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid #2c3a5c', background: 'transparent', color: '#e8edf8', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>취소</button>
          <button type="button" data-role="trash-purge-confirm" onClick={() => onPurge(round.id)}
            style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid transparent', background: '#ef5350', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>영구 삭제</button>
        </div>
      )}
    </div>
  );
}

// 히스토리 — 지운 라운드는 휴지통에 7일 보관한다. 지운 직후에는 "되돌리기" 안내가 잠깐 뜬다.
//   onDelete(id)          휴지통으로 보낸다 (Promise)
//   trash                 휴지통 행들 [{ round, deletedAt }]
//   onRestore · onPurge   휴지통에서 되살리기 · 영구 삭제
export default function HistoryView({ rounds, onBack, onSelect, onDelete, userName, trash = [], onRestore, onPurge }) {
  const [pendingDelete, setPendingDelete] = useState(null);
  const [undo, setUndo] = useState(null);                 // 방금 지운 라운드 { id, courseName } — 되돌리기 안내
  const [trashOpen, setTrashOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [year, setYear] = useState(null);
  const [kind, setKind] = useState('all');             // 'all' | 'full'(18홀) | 'nine'(9홀)
  const [sort, setSort] = useState('recent');          // 'recent' | 'old' | 'best'
  const years = useMemo(() => roundYears(rounds), [rounds]);
  const showKinds = useMemo(() => rounds.some(isNineHoleRound) && rounds.some((r) => !isNineHoleRound(r)), [rounds]);
  const filters = { query, year, kind, sort };
  const filtered = isFiltered(filters);
  const shownRounds = useMemo(() => filterHistory(rounds, userName, { query, year, kind, sort }), [rounds, userName, query, year, kind, sort]);
  const clearFilters = () => { setQuery(''); setYear(null); setKind('all'); };

  useEffect(() => {
    if (!undo) return undefined;
    const t = setTimeout(() => setUndo(null), UNDO_MS);
    return () => clearTimeout(t);
  }, [undo]);

  const confirmDelete = async () => {
    const target = pendingDelete;
    setPendingDelete(null);
    await onDelete(target.id);
    setUndo({ id: target.id, courseName: target.courseName });
  };

  const undoDelete = async () => {
    const target = undo;
    setUndo(null);
    await onRestore(target.id);
  };

  return (
    <div style={styles.container}>
      <header style={styles.pageHeader}>
        <button style={styles.iconBack} onClick={onBack} aria-label="뒤로">
          <ChevronLeft size={22} />
        </button>
        <div style={styles.pageTitle}>History</div>
        <div style={{ width: 44 }} />
      </header>

      {rounds.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📖</div>
          <div style={styles.emptyTitle}>기록된 라운드가 없습니다</div>
          <div style={styles.emptySub}>첫 라운드를 시작해보세요</div>
        </div>
      ) : (
        <>
          {rounds.length >= FILTER_MIN_ROUNDS && (
            <HistoryFilterBar query={query} onQuery={setQuery} year={year} onYear={setYear} years={years}
              kind={kind} onKind={setKind} showKinds={showKinds} sort={sort} onSort={setSort}
              shown={shownRounds.length} total={rounds.length} filtered={filtered} onClear={clearFilters} />
          )}
          {shownRounds.length === 0 ? (
            <div data-role="history-empty-result" style={{ textAlign: 'center', padding: '36px 16px', color: '#a9b8d6', fontSize: 15, lineHeight: 1.7 }}>
              조건에 맞는 라운드가 없어요
              <div><button type="button" onClick={clearFilters} style={{ marginTop: 10, minHeight: 44, padding: '0 18px', borderRadius: 12, border: '1.5px solid rgba(201,162,40,0.6)', background: 'transparent', color: '#e6c35a', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>조건 지우기</button></div>
            </div>
          ) : (
            <div style={styles.historyList}>
              {shownRounds.map(r => (
                <HistoryCard
                  key={r.id}
                  round={r}
                  userName={userName}
                  onSelect={() => onSelect(r.id)}
                  onDelete={() => setPendingDelete(r)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {trash.length > 0 && (
        <div data-role="trash" style={{ marginTop: 18 }}>
          <button type="button" data-role="trash-toggle" aria-expanded={trashOpen} onClick={() => setTrashOpen((o) => !o)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '11px 14px', borderRadius: 12, border: '1px solid #1b2238', background: 'rgba(255,255,255,0.03)', color: '#a9b8d6', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            <span>휴지통 {trash.length}개 <span style={{ fontSize: 13, color: '#8aa0c4', fontWeight: 500 }}>· {TRASH_KEEP_DAYS}일 보관</span></span>
            <ChevronDown size={18} style={{ transform: trashOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>
          {trashOpen && (
            <div style={{ marginTop: 10 }}>
              {trash.map((row) => <TrashRow key={row.id} row={row} userName={userName} onRestore={onRestore} onPurge={onPurge} />)}
            </div>
          )}
        </div>
      )}

      {pendingDelete && (
        <div style={styles.modalOverlay} onClick={() => setPendingDelete(null)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalIcon}>🗑️</div>
            <div style={styles.modalTitle}>라운드 삭제</div>
            <div style={styles.modalText}>
              {pendingDelete.courseName} 라운드를<br/>삭제하시겠습니까?<br/>
              <span style={{ fontSize: 13, color: '#8896b0' }}>휴지통에 {TRASH_KEEP_DAYS}일 보관돼서 되돌릴 수 있어요</span>
            </div>
            <div style={styles.modalActions}>
              <button
                style={styles.modalBtnCancel}
                onClick={() => setPendingDelete(null)}
              >
                취소
              </button>
              <button
                style={styles.modalBtnConfirm}
                onClick={confirmDelete}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {undo && (
        <div role="status" data-role="undo-toast"
          style={{ position: 'fixed', left: 16, right: 16, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 14px', borderRadius: 14, background: '#1b2744', border: '1px solid #2c3a5c', boxShadow: '0 8px 28px rgba(0,0,0,0.5)' }}>
          <span style={{ fontSize: 14, color: '#e8edf8', minWidth: 0, lineHeight: 1.4, wordBreak: 'keep-all', overflowWrap: 'anywhere' }}>{undo.courseName} 라운드를 삭제했어요</span>
          <button type="button" data-role="undo-delete" onClick={undoDelete}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 10, border: 'none', background: '#c9a228', color: '#0b0e18', fontSize: 14, fontWeight: 800, cursor: 'pointer', flexShrink: 0 }}>
            <RotateCcw size={14} />되돌리기
          </button>
        </div>
      )}
    </div>
  );
}
