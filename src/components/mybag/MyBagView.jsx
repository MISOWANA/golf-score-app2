import { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, Plus } from 'lucide-react';
import { loadClubsByUser, saveClubsForUser, userIdsOf } from '../../db.js';
import styles from '../../styles/styles';
import StickyTabs from '../ui/StickyTabs';
import { Card, Takeaway, Hint } from '../stats/widgets.jsx';
import { COLOR } from '../stats/format.js';
import ClubRow from './ClubRow';
import { nowMs } from '../../engine/clock.js';
import { bagCoverage } from '../../engine/clubRecommend.js';
import { buildClubDistanceStats } from '../../engine/clubDistance.js';
import { BAG_LIMIT, TYPE_ORDER, bagComposition, bagGaps, measuredByClub } from '../../engine/bagStats.js';

const DEFAULT_CLUBS = [
  { id: 'driver', name: 'Driver', type: 'Wood', carry: 200, total: 215 },
  { id: 'wood3', name: '3W', type: 'Wood', carry: 180, total: 195 },
  { id: 'wood5', name: '5W', type: 'Wood', carry: 170, total: 180 },
  { id: 'hybrid4', name: '4H', type: 'Hybrid', carry: 160, total: 170 },
  { id: 'iron5', name: '5i', type: 'Iron', carry: 155, total: 160 },
  { id: 'iron6', name: '6i', type: 'Iron', carry: 145, total: 150 },
  { id: 'iron7', name: '7i', type: 'Iron', carry: 135, total: 140 },
  { id: 'iron8', name: '8i', type: 'Iron', carry: 125, total: 130 },
  { id: 'iron9', name: '9i', type: 'Iron', carry: 115, total: 120 },
  { id: 'wedge46', name: '46°', type: 'Wedge', carry: 100, total: 105 },
  { id: 'wedge52', name: '52°', type: 'Wedge', carry: 85, total: 90 },
  { id: 'wedge56', name: '56°', type: 'Wedge', carry: 70, total: 75 },
  { id: 'wedge60', name: '60°', type: 'Wedge', carry: 55, total: 60 },
  { id: 'putter', name: 'Putter', type: 'Putter' },
];

const CLUB_TYPE_DEFAULTS = {
  Wood: { name: '새 우드', carry: 250, total: 260 },
  Hybrid: { name: '새 하이브리드', carry: 220, total: 230 },
  Iron: { name: '새 아이언', carry: 150, total: 155 },
  Wedge: { name: '새 웨지', carry: 90, total: 92 },
};

const CLUB_NAME_SUGGESTIONS = {
  Wood: ['Driver', '2W', '3W', '4W', '5W', '7W', '9W'],
  Hybrid: ['1H', '2H', '3H', '4H', '5H', '6H', '7H'],
  Iron: ['1I', '2I', '3I', '4I', '5I', '6I', '7I', '8I', '9I'],
  Wedge: ['46°', '48°', '50°', '52°', '54°', '56°', '58°', '60°', '62°', '64°'],
};

const TYPE_TITLE = {
  Wood: 'WOODS · 우드', Hybrid: 'HYBRIDS · 하이브리드', Iron: 'IRONS · 아이언', Wedge: 'WEDGES · 웨지', Putter: 'PUTTER · 퍼터',
};
const TYPE_ADD_LABEL = { Wood: '우드', Hybrid: '하이브리드', Iron: '아이언', Wedge: '웨지' };
const TABS = [['clubs', '클럽'], ['chart', '거리표']];

// 마이백 — 내 클럽 구성과 클럽별 캐리·토탈 거리. 스코어 입력의 클럽 추천이 이 거리를 쓴다.
//   rounds: 1인 라운드 (최신이 앞) — 라운드에서 잰 실제 거리와 견주는 데 쓴다. 없어도 된다.
export default function MyBagView({ currentUser, onBack, rounds = [] }) {
  const [clubs, setClubs] = useState(DEFAULT_CLUBS);
  const [isSaved, setIsSaved] = useState(false);     // 사용자가 저장한 적이 있는 구성인가 (아니면 기본값을 보고 있다)
  const [tab, setTab] = useState('clubs');
  const [openId, setOpenId] = useState(null);         // 편집 칸이 열린 클럽 (하나만)
  const [pendingDelete, setPendingDelete] = useState(null);
  const [pendingReset, setPendingReset] = useState(false);

  // drag-to-reorder state
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  // refs for touch reorder (avoids stale closure in event listeners)
  const clubsRef = useRef(clubs);
  const touchDragRef = useRef({ id: null, lastOverId: null });
  const saveClubsRef = useRef(null);
  const scrollToRef = useRef(null);   // { id, block } — 편집 칸이 열린 뒤 그 클럽 자리로 화면을 옮긴다
  // 로드가 끝나기 전에 사용자가 이미 편집했거나(같은 마운트) 화면을 벗어났으면
  // (다른 마운트) 뒤늦게 도착한 로드 결과가 그 편집을 덮어쓰지 않게 막는 가드.
  const userEditedRef = useRef(false);

  useEffect(() => { clubsRef.current = clubs; }, [clubs]);

  useEffect(() => {
    let cancelled = false;
    userEditedRef.current = false;
    const load = async () => {
      try {
        const savedClubs = await loadClubsByUser(userIdsOf(currentUser));
        if (cancelled || userEditedRef.current) return;
        if (savedClubs && Array.isArray(savedClubs)) {
          const migrated = savedClubs.map(c => {
            if (c.type === 'Putter') {
              return { id: c.id, name: c.name, type: 'Putter' };
            }
            if (c.carry !== undefined && c.total !== undefined) return c;
            const defaultClub = DEFAULT_CLUBS.find(d => d.id === c.id);
            return {
              ...c,
              carry: defaultClub?.carry ?? (c.avg ? c.avg - 10 : 140),
              total: c.avg ?? defaultClub?.total ?? 150,
            };
          });
          setClubs(migrated);
          setIsSaved(true);
        } else {
          setClubs(DEFAULT_CLUBS);
          setIsSaved(false);
        }
      } catch (e) {
        if (cancelled || userEditedRef.current) return;
        console.error('Load clubs failed', e);
        setClubs(DEFAULT_CLUBS);
        setIsSaved(false);
      }
    };
    load();
    return () => { cancelled = true; };
  // aliases는 userId가 같으면 바뀌지 않는다 (프로필 단위로 함께 움직임)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.userId]);

  const saveClubs = async (updated) => {
    userEditedRef.current = true;
    setClubs(updated);
    setIsSaved(true);
    try {
      await saveClubsForUser(currentUser.userId, updated);
    } catch (e) {
      console.error('Save clubs failed', e);
    }
  };

  // keep ref in sync so touch handlers can call it without stale closure
  useEffect(() => { saveClubsRef.current = saveClubs; });

  // 클럽을 추가했거나 거리표에서 눌러 편집 칸이 열리면 그 자리로, 줄을 눌러 열면 화면 안으로만 옮긴다
  useEffect(() => {
    const want = scrollToRef.current;
    if (!want || tab !== 'clubs') return;
    scrollToRef.current = null;
    document.querySelector(`[data-club-id="${want.id}"]`)?.scrollIntoView?.({ block: want.block });
  }, [tab, openId]);

  // ── touch drag: document-level listeners ─────────────────────────────────
  useEffect(() => {
    const onTouchMove = (e) => {
      if (!touchDragRef.current.id) return;
      e.preventDefault();
      const touch = e.touches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const card = el?.closest('[data-club-id]');
      const overId = card?.dataset.clubId;
      if (!overId || overId === touchDragRef.current.id) return;
      const current = clubsRef.current;
      const dragClub = current.find(c => c.id === touchDragRef.current.id);
      const overClub = current.find(c => c.id === overId);
      if (dragClub?.type === overClub?.type) {
        touchDragRef.current.lastOverId = overId;
        setDragOverId(overId);
      }
    };

    const onTouchEnd = () => {
      const { id: fromId, lastOverId: toId } = touchDragRef.current;
      if (fromId && toId) {
        const current = clubsRef.current;
        const fromClub = current.find(c => c.id === fromId);
        const toClub = current.find(c => c.id === toId);
        if (fromClub && toClub && fromClub.type === toClub.type) {
          const updated = current.filter(c => c.id !== fromId);
          const toIdx = updated.findIndex(c => c.id === toId);
          updated.splice(toIdx, 0, fromClub);
          saveClubsRef.current(updated);
        }
      }
      touchDragRef.current = { id: null, lastOverId: null };
      setDragId(null);
      setDragOverId(null);
    };

    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    return () => {
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  // ── HTML5 drag handlers ───────────────────────────────────────────────────
  const handleDragStart = (id) => setDragId(id);

  const handleDragEnd = () => {
    setDragId(null);
    setDragOverId(null);
  };

  const handleDragOver = (id) => {
    if (!dragId || id === dragId) return;
    const dragClub = clubs.find(c => c.id === dragId);
    const overClub = clubs.find(c => c.id === id);
    if (dragClub?.type !== overClub?.type) return;
    setDragOverId(id);
  };

  const handleDrop = () => {
    if (!dragId || !dragOverId) return;
    const fromClub = clubs.find(c => c.id === dragId);
    const toClub = clubs.find(c => c.id === dragOverId);
    if (fromClub && toClub && fromClub.type === toClub.type) {
      const updated = clubs.filter(c => c.id !== dragId);
      const toIdx = updated.findIndex(c => c.id === dragOverId);
      updated.splice(toIdx, 0, fromClub);
      saveClubs(updated);
    }
    setDragId(null);
    setDragOverId(null);
  };

  const handleGripTouchStart = (id) => {
    touchDragRef.current = { id, lastOverId: null };
    setDragId(id);
  };

  // ── other club operations ─────────────────────────────────────────────────
  // 토탈이 캐리보다 짧을 수 있다 (백스핀·역경사·젖은 그린). 둘은 독립적으로 조정한다.
  const setDistance = (id, field, value) => {
    saveClubs(clubs.map(c => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const fitClub = (id, fit) => {
    saveClubs(clubs.map(c => (c.id === id ? { ...c, carry: fit.carry, total: fit.total } : c)));
  };

  const renameClub = (id, name) => {
    saveClubs(clubs.map(c => (c.id === id ? { ...c, name } : c)));
  };

  // 같은 종류 안에서 한 칸 위(-1)·아래(1)로
  const moveClub = (id, dir) => {
    const club = clubs.find(c => c.id === id);
    if (!club) return;
    const sameType = clubs.map((c, i) => [c, i]).filter(([c]) => c.type === club.type).map(([, i]) => i);
    const pos = sameType.findIndex(i => clubs[i].id === id);
    const target = sameType[pos + dir];
    if (target == null) return;
    const next = [...clubs];
    const from = sameType[pos];
    [next[from], next[target]] = [next[target], next[from]];
    saveClubs(next);
  };

  const addClub = (type) => {
    const defaults = CLUB_TYPE_DEFAULTS[type];
    const usedNames = clubs.filter(c => c.type === type).map(c => c.name);
    const suggestions = CLUB_NAME_SUGGESTIONS[type] || [];
    const nextName = suggestions.find(s => !usedNames.includes(s)) || defaults.name;

    const newClub = {
      id: `${type.toLowerCase()}_${nowMs()}`,
      name: nextName,
      type,
      carry: defaults.carry,
      total: defaults.total,
    };

    const lastOfTypeIdx = clubs.map(c => c.type).lastIndexOf(type);
    const insertIdx = lastOfTypeIdx === -1 ? clubs.length : lastOfTypeIdx + 1;
    const updated = [
      ...clubs.slice(0, insertIdx),
      newClub,
      ...clubs.slice(insertIdx),
    ];
    saveClubs(updated);
    // 바로 이름·거리를 맞출 수 있게 편집 칸을 열고 그 자리로 간다
    scrollToRef.current = { id: newClub.id, block: 'center' };
    setOpenId(newClub.id);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    saveClubs(clubs.filter(c => c.id !== pendingDelete.id));
    if (openId === pendingDelete.id) setOpenId(null);
    setPendingDelete(null);
  };

  const confirmReset = () => {
    saveClubs(DEFAULT_CLUBS);
    setOpenId(null);
    setPendingReset(false);
  };

  // 거리표의 클럽을 누르면 클럽 탭에서 그 클럽의 편집 칸을 연다
  const jumpToClub = (id) => {
    scrollToRef.current = { id, block: 'center' };
    setOpenId(id);
    setTab('clubs');
  };

  // 줄을 눌러 열면 편집 칸이 화면 밖으로 밀리지 않게 안으로만 옮긴다. 이미 열린 줄이면 접는다.
  const toggleClub = (id) => {
    if (openId === id) { setOpenId(null); return; }
    scrollToRef.current = { id, block: 'nearest' };
    setOpenId(id);
  };

  const grouped = Object.fromEntries(TYPE_ORDER.map(t => [t, clubs.filter(c => c.type === t)]));
  const comp = bagComposition(clubs);
  const coverage = bagCoverage(clubs);
  const gapInfo = bagGaps(clubs);
  const distanceStats = useMemo(() => buildClubDistanceStats(rounds), [rounds]);
  const measured = measuredByClub(clubs, distanceStats);

  const statusTake = (() => {
    if (!isSaved) return { tone: 'info', text: '지금은 기본 거리예요. 내 거리로 한 번 맞추면 스코어 입력에서 남은 거리에 맞는 클럽을 추천해 줘요.' };
    if (coverage.usable === 0) return { tone: 'warn', text: '추천에 쓸 수 있는 클럽이 없어요. 클럽 이름과 캐리·토탈 거리를 확인해 주세요.' };
    return {
      tone: 'good',
      text: `클럽 추천이 켜져 있어요 · 추천에 쓰는 클럽 ${coverage.usable}개`
        + (coverage.skipped.length > 0 ? ` · 제외: ${coverage.skipped.join(', ')}` : ''),
    };
  })();

  const withDistance = clubs.filter(c => c.type !== 'Putter' && c.carry != null && c.total != null);
  const maxDist = Math.max(1, ...withDistance.map(c => Math.max(c.total, c.carry ?? 0)), ...Object.values(measured).map(m => m.median));
  const hasMeasured = withDistance.some(c => measured[c.id]);
  const chartRows = [...withDistance].sort((a, b) => b.total - a.total);

  return (
    <div style={styles.container}>
      <header style={styles.pageHeader}>
        <button style={styles.iconBack} onClick={onBack}>
          <ChevronLeft size={22} />
        </button>
        <div style={styles.pageTitle}>My Bag</div>
        <div style={{ width: 40 }} />
      </header>

      {/* 구성 요약 — 클럽 수 · 종류별 개수 · 저장 상태 */}
      <div data-role="bag-summary" style={styles.bagScope}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={styles.bagScopeLabel}>내 클럽 구성</div>
          <div style={styles.bagScopeValue}>
            <span data-role="bag-count">{comp.total}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: comp.overLimit ? COLOR.red : COLOR.muted }}>/ {BAG_LIMIT}개{comp.overLimit ? ' · 규정 초과' : ''}</span>
          </div>
          <div style={{ fontSize: 11.5, color: COLOR.muted, marginTop: 3, lineHeight: 1.4, wordBreak: 'keep-all' }}>{comp.text}</div>
        </div>
        <span data-role="bag-saved" style={{ flexShrink: 0, alignSelf: 'flex-start', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999, border: `1px solid ${isSaved ? COLOR.green : COLOR.amber}`, color: isSaved ? COLOR.green : COLOR.amber }}>
          {isSaved ? '저장됨' : '기본값'}
        </span>
      </div>
      <Takeaway bare tone={statusTake.tone} id="bag-status">{statusTake.text}</Takeaway>
      {comp.overLimit && <Takeaway bare tone="warn" id="bag-over">클럽이 {comp.total}개예요. 규정은 최대 {BAG_LIMIT}개까지예요.</Takeaway>}

      <div style={{ height: 10 }} />
      <StickyTabs variant="underline" tabs={TABS} current={tab} onChange={setTab} label="마이백 보기" rolePrefix="bag-tab" />

      {tab === 'clubs' && (
        <div data-role="bag-page-clubs">
          <div style={{ fontSize: 12, color: COLOR.muted, textAlign: 'center', margin: '2px 0 14px', lineHeight: 1.5 }}>
            클럽을 눌러 이름과 거리를 고쳐요 · ⋮⋮을 끌어 순서를 바꿔요
          </div>

          {TYPE_ORDER.map((type) => {
            const list = grouped[type];
            const canAdd = type !== 'Putter';
            return (
              <Card key={type} id={`bag-${type.toLowerCase()}`} title={TYPE_TITLE[type]}
                right={canAdd && (
                  <button type="button" onClick={() => addClub(type)} aria-label={`${type} 추가`}
                    style={{ height: 36, padding: '0 12px', borderRadius: 999, border: '1px solid rgba(201,162,40,0.5)', background: 'rgba(201,162,40,0.1)', color: COLOR.goldHi, fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                    <Plus size={14} strokeWidth={2.6} /><span>{TYPE_ADD_LABEL[type]} 추가</span>
                  </button>
                )}>
                {list.length === 0 ? (
                  <Hint>아직 등록된 클럽이 없어요</Hint>
                ) : (
                  <div style={{ margin: '0 -14px -14px', overflow: 'hidden', borderRadius: '0 0 18px 18px' }}>
                    {list.map((club, i) => (
                      <ClubRow
                        key={club.id}
                        club={club}
                        open={openId === club.id}
                        onToggle={() => toggleClub(club.id)}
                        index={i} count={list.length}
                        measured={measured[club.id]}
                        onRename={(name) => renameClub(club.id, name)}
                        onDistance={(field, v) => setDistance(club.id, field, v)}
                        onFit={(fit) => fitClub(club.id, fit)}
                        onMove={(dir) => moveClub(club.id, dir)}
                        onDelete={() => setPendingDelete(club)}
                        isDragging={dragId === club.id}
                        isDragOver={dragOverId === club.id}
                        onDragStart={() => handleDragStart(club.id)}
                        onDragEnd={handleDragEnd}
                        onDragOver={() => handleDragOver(club.id)}
                        onDrop={() => handleDrop(club.id)}
                        onGripTouchStart={() => handleGripTouchStart(club.id)}
                      />
                    ))}
                  </div>
                )}
              </Card>
            );
          })}

          <button type="button" data-role="bag-reset" onClick={() => setPendingReset(true)}
            style={{ width: '100%', height: 44, background: 'none', border: 'none', color: COLOR.faint, fontSize: 12, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>
            기본 구성으로 되돌리기
          </button>
        </div>
      )}

      {tab === 'chart' && (
        <div data-role="bag-page-chart">
          <div style={{ fontSize: 12, color: COLOR.muted, textAlign: 'center', margin: '2px 0 14px', lineHeight: 1.5 }}>
            거리별로 클럽이 어떻게 놓였는지 봐요 · 누르면 거리를 고쳐요
          </div>

          <Card id="bag-chart" title="DISTANCE · 거리 분포">
            {chartRows.length === 0 ? <Hint>캐리·토탈 거리가 있는 클럽이 없어요</Hint> : (
              <>
                <div style={{ display: 'flex', gap: 14, fontSize: 11, color: COLOR.muted, marginBottom: 10 }}>
                  <span><i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: COLOR.green, marginRight: 5 }} />캐리</span>
                  <span><i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#2a4a3a', marginRight: 5 }} />토탈</span>
                  {hasMeasured && <span><i style={{ display: 'inline-block', width: 3, height: 10, borderRadius: 1, background: COLOR.goldHi, marginRight: 5, verticalAlign: 'middle' }} />라운드 실측</span>}
                </div>
                {chartRows.map((club) => {
                  const m = measured[club.id];
                  const pct = (v) => `${Math.max(0, Math.min(100, (v / maxDist) * 100))}%`;
                  return (
                    <button key={club.id} type="button" data-role={`bag-chart-${club.id}`} onClick={() => jumpToClub(club.id)}
                      style={{ width: '100%', minHeight: 44, display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', borderBottom: `1px solid ${COLOR.line}`, padding: '4px 0', color: COLOR.text, cursor: 'pointer', textAlign: 'left' }}>
                      <span style={{ width: 52, fontSize: 13, fontWeight: 800, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{club.name}</span>
                      <span style={{ flex: 1, minWidth: 0, position: 'relative', height: 10, borderRadius: 5, background: COLOR.track }}>
                        <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: pct(club.total), borderRadius: 5, background: '#2a4a3a' }} />
                        <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: pct(club.carry), borderRadius: 5, background: COLOR.green }} />
                        {m && <span data-role="bag-chart-measured" style={{ position: 'absolute', top: -3, bottom: -3, left: `calc(${pct(m.median)} - 1.5px)`, width: 3, borderRadius: 1.5, background: COLOR.goldHi }} />}
                      </span>
                      <span style={{ width: 62, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                        <span style={{ display: 'block', fontSize: 10.5, color: COLOR.green }}>{club.carry}</span>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 900 }}>{club.total}m</span>
                      </span>
                    </button>
                  );
                })}
              </>
            )}
          </Card>

          <Card id="bag-gap" title="GAPPING · 클럽 간격">
            {gapInfo.count < 3 ? (
              <Takeaway bare tone="info" id="gap-take">토탈 {60}m 이상인 클럽이 3개 이상이면 클럽 사이의 간격을 알려드려요.</Takeaway>
            ) : (
              <>
                {gapInfo.wide.map((g) => (
                  <Takeaway key={`w-${g.longer}-${g.shorter}`} bare tone="warn" id="gap-take">
                    {g.longer}와 {g.shorter} 사이가 {g.gap}m나 벌어져 있어요 ({g.from}m → {g.to}m). 그 사이 거리를 칠 클럽이 없어요.
                  </Takeaway>
                ))}
                {gapInfo.overlap.map((g) => (
                  <Takeaway key={`o-${g.longer}-${g.shorter}`} bare tone="info" id="gap-take">
                    {g.longer}와 {g.shorter}는 토탈 거리 차이가 {g.gap}m뿐이에요. 한 클럽을 줄여도 괜찮을 수 있어요.
                  </Takeaway>
                ))}
                {gapInfo.wide.length === 0 && gapInfo.overlap.length === 0 && (
                  <Takeaway bare tone="good" id="gap-take">클럽 사이 거리 간격이 고르게 벌어져 있어요.</Takeaway>
                )}
              </>
            )}
          </Card>
        </div>
      )}

      {pendingDelete && (
        <div style={styles.modalOverlay} onClick={() => setPendingDelete(null)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalIcon}>🗑️</div>
            <div style={styles.modalTitle}>{pendingDelete.name} 삭제</div>
            <div style={styles.modalText}>
              이 클럽을 백에서 제거하시겠습니까?
            </div>
            <div style={styles.modalActions}>
              <button style={styles.modalBtnCancel} onClick={() => setPendingDelete(null)}>
                취소
              </button>
              <button style={styles.modalBtnConfirm} onClick={confirmDelete}>
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingReset && (
        <div style={styles.modalOverlay} onClick={() => setPendingReset(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalIcon}>↺</div>
            <div style={styles.modalTitle}>기본 구성으로 되돌릴까요?</div>
            <div style={styles.modalText}>
              지금 클럽 구성과 거리가 기본 14개 클럽으로 바뀌어요.
            </div>
            <div style={styles.modalActions}>
              <button style={styles.modalBtnCancel} onClick={() => setPendingReset(false)}>
                취소
              </button>
              <button style={styles.modalBtnConfirm} onClick={confirmReset}>
                되돌리기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
