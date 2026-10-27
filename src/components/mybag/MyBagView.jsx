import { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, Plus } from 'lucide-react';
import { loadClubsByUser, saveClubsForUser, userIdsOf } from '../../db.js';
import styles from '../../styles/styles';
import StickyTabs from '../ui/StickyTabs';
import { Card, Takeaway, Hint } from '../stats/widgets.jsx';
import { COLOR } from '../stats/format.js';
import { BAG_COLOR } from './colors.js';
import ClubRow from './ClubRow';
import BagSetupWizard from './BagSetupWizard';
import { nowMs } from '../../engine/clock.js';
import { bagCoverage } from '../../engine/clubRecommend.js';
import { buildClubDistanceStats } from '../../engine/clubDistance.js';
import { BAG_LIMIT, MIN_MEASURED_SHOTS, MISMATCH_M, TYPE_ORDER, bagComposition, measuredByClub, registeredVsMeasured } from '../../engine/bagStats.js';
import { fmtShot, displayShot, unitInfo, unitLabel } from '../../engine/units.js';

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

// 아직 거리를 적지 않은 클럽 — 새로 추가한 클럽(임시 거리)이거나 토탈이 0이다. 퍼터는 거리표·클럽 줄이 따로 빼므로 여기서 가리지 않는다.
const noDistance = (c) => !!c.unset || !(c.total > 0);

// 거리표의 열 너비(px) — 머리글과 모든 줄이 같은 값을 써서 숫자 열이 위아래로 맞는다
const CHART_COL = { name: 44, carry: 34, total: 40, meas: 42, gap: 6 };

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
//   registerLeaveGuard: 앱이 내려 주는 등록 함수 — 저장 안 한 거리 변경이 있을 때 아래 메뉴로 다른 화면에 가려는 것을
//     이 화면이 붙잡을 수 있게, (proceed) => true | false 모양의 확인 함수를 등록한다 (false 면 확인 창을 띄우고 proceed 는 나중에).
//
// 거리(캐리·토탈) 고치기는 '초안'이다 — 저장을 눌러야 저장되고, 그때부터 클럽 추천에 쓰인다.
// 이름·추가·삭제·순서는 지금처럼 바로 저장한다. 초안은 클럽 id 별 덮어쓰기(draft)로만 들고 있어서
// 구성을 바로 저장할 때 섞여 들어가지 않는다.
export default function MyBagView({ currentUser, onBack, rounds = [], registerLeaveGuard = null }) {
  const [clubs, setClubs] = useState(DEFAULT_CLUBS);
  const [isSaved, setIsSaved] = useState(false);     // 사용자가 저장한 적이 있는 구성인가 (아니면 기본값을 보고 있다)
  const [loaded, setLoaded] = useState(false);       // 저장된 구성을 다 읽었나 — 읽기 전에는 기본 구성이 잠깐 보이지 않게 비워 둔다
  const [wizardOff, setWizardOff] = useState(false);  // 처음 등록 화면을 '나중에' 한 상태 (기본 구성을 둘러본다)
  const [tab, setTab] = useState('clubs');
  const [openId, setOpenId] = useState(null);         // 편집 칸이 열린 클럽 (하나만)
  const [pendingDelete, setPendingDelete] = useState(null);
  const [pendingReset, setPendingReset] = useState(false);
  const [draft, setDraft] = useState({});             // { [클럽 id]: { carry, total } } — 저장 전 거리. 저장된 값과 같아지면 지운다
  const [flash, setFlash] = useState(false);          // 저장 직후 잠깐 '저장했어요'를 보인다
  const [pendingLeave, setPendingLeave] = useState(null);   // 저장 안 한 변경이 있는데 떠나려 할 때 { proceed }
  const flashTimerRef = useRef(null);
  const dirtyRef = useRef(false);

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
  useEffect(() => { dirtyRef.current = Object.keys(draft).length > 0; }, [draft]);
  useEffect(() => () => clearTimeout(flashTimerRef.current), []);

  // 저장 안 한 변경이 있으면 아래 메뉴로 다른 화면에 가려는 것도 붙잡는다 (앱이 이 함수를 불러 준다)
  useEffect(() => {
    if (!registerLeaveGuard) return undefined;
    registerLeaveGuard((proceed) => {
      if (!dirtyRef.current) return true;
      setPendingLeave({ proceed });
      return false;
    });
    return () => registerLeaveGuard(null);
  }, [registerLeaveGuard]);

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
              // 옛 형식에 평균(avg)도 없었다면 채워 넣은 값은 임시값 — 사용자가 적은 거리가 아니다
              ...(c.avg == null ? { unset: true } : {}),
            };
          });
          setClubs(migrated);
          setIsSaved(true);
        } else {
          setClubs(DEFAULT_CLUBS);
          setIsSaved(false);
        }
        setLoaded(true);
      } catch (e) {
        if (cancelled || userEditedRef.current) return;
        console.error('Load clubs failed', e);
        setClubs(DEFAULT_CLUBS);
        setIsSaved(false);
        setLoaded(true);
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
  // 거리 고치기 — 저장하지 않고 초안에만 둔다. 저장된 값과 같아지면 초안에서 뺀다.
  // 토탈이 캐리보다 짧을 수 있다 (백스핀·역경사·젖은 그린). 둘은 독립적으로 조정한다.
  const editDistance = (id, fields) => {
    const base = clubs.find(c => c.id === id);
    if (!base) return;
    setDraft((d) => {
      const cur = { carry: base.carry, total: base.total, ...d[id], ...fields };
      const next = { ...d };
      if (cur.carry === base.carry && cur.total === base.total) delete next[id];
      else next[id] = { carry: cur.carry, total: cur.total };
      return next;
    });
  };
  const setDistance = (id, field, value) => editDistance(id, { [field]: value });
  const fitClub = (id, fit) => editDistance(id, { carry: fit.carry, total: fit.total });

  // 제안값·임시값 그대로가 내 거리라고 확인한다 — 이 클럽만 바로 저장한다 (다른 클럽의 거리 초안은 건드리지 않는다).
  // 거리를 고치는 중인 클럽은 확인 칸이 안 보인다(고쳐서 저장하면 확인된다) — 그래서 이 클럽의 초안은 없다.
  const confirmClub = (id) => saveClubs(clubs.map(c => (c.id === id ? { ...c, unset: false } : c)));

  const saveDrafts = async () => {
    const merged = clubs.map(c => (draft[c.id] ? { ...c, ...draft[c.id], unset: false } : c));
    setDraft({});
    await saveClubs(merged);
    setFlash(true);
    clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setFlash(false), 1800);
  };

  const discardDrafts = () => setDraft({});

  // 뒤로 가기 — 저장 안 한 거리 변경이 있으면 먼저 묻는다
  const goBack = () => {
    if (dirtyRef.current) setPendingLeave({ proceed: onBack });
    else onBack();
  };
  const leaveWithSave = async () => {
    const { proceed } = pendingLeave;
    setPendingLeave(null);
    await saveDrafts();
    proceed();
  };
  const leaveWithoutSave = () => {
    const { proceed } = pendingLeave;
    setPendingLeave(null);
    setDraft({});
    proceed();
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
      unset: true,   // 들어간 거리는 임시값 — 사용자가 거리를 고쳐 저장하기 전까지 추천과 실측 비교에서 뺀다
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
    setDraft((d) => { const next = { ...d }; delete next[pendingDelete.id]; return next; });
    if (openId === pendingDelete.id) setOpenId(null);
    setPendingDelete(null);
  };

  const confirmReset = () => {
    saveClubs(DEFAULT_CLUBS);
    setDraft({});
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

  // 화면에 보이는 클럽 = 저장된 구성(clubs) 위에 거리 초안을 덮은 것. 클럽 추천은 저장된 값만 쓴다(coverage).
  const shown = clubs.map(c => (draft[c.id] ? { ...c, ...draft[c.id], unset: false } : c));
  const dirtyCount = Object.keys(draft).length;
  const dirty = dirtyCount > 0;
  const grouped = Object.fromEntries(TYPE_ORDER.map(t => [t, shown.filter(c => c.type === t)]));
  const comp = bagComposition(clubs);
  const coverage = bagCoverage(clubs);
  const distanceStats = useMemo(() => buildClubDistanceStats(rounds), [rounds]);
  const measured = measuredByClub(shown, distanceStats);
  const actual = registeredVsMeasured(shown, measured);

  const statusTake = (() => {
    if (dirty) return { tone: 'warn', text: `거리를 ${dirtyCount}개 고쳤어요. 아래 저장을 눌러야 클럽 추천에 반영돼요.` };
    if (!isSaved) return { tone: 'info', text: '지금은 기본 거리예요. 내 거리로 한 번 맞추면 스코어 입력에서 남은 거리에 맞는 클럽을 추천해 줘요.' };
    if (coverage.usable === 0) return { tone: 'warn', text: '추천에 쓸 수 있는 클럽이 없어요. 클럽 이름과 캐리·토탈 거리를 확인해 주세요.' };
    return {
      tone: 'good',
      text: `클럽 추천이 켜져 있어요 · 추천에 쓰는 클럽 ${coverage.usable}개`
        + (coverage.skipped.length > 0 ? ` · 제외: ${coverage.skipped.join(', ')}` : ''),
    };
  })();

  // 거리표 — 거리를 적은 클럽은 먼 순으로, 아직 안 적은 새 클럽(unset)은 맨 아래에 '미입력'으로 따로 둔다
  const withDistance = shown.filter(c => c.type !== 'Putter' && c.carry != null && c.total != null);
  const chartRows = withDistance.filter(c => !noDistance(c)).sort((a, b) => b.total - a.total);
  const unsetRows = withDistance.filter(noDistance);
  const maxDist = Math.max(1, ...chartRows.map(c => Math.max(c.total, c.carry ?? 0)), ...chartRows.filter(c => measured[c.id]).map(c => measured[c.id].median));
  const hasMeasured = chartRows.some(c => measured[c.id]);

  // 처음 등록 — 저장한 적 없는 사용자는 가진 클럽을 고르는 등록 화면부터 본다. '나중에 할게요'를 누르면 기본 구성을 둘러본다.
  const handleWizardDone = (bag) => {
    userEditedRef.current = true;
    setClubs(bag);
    setIsSaved(true);
    setDraft({});
    setOpenId(null);
    setTab('clubs');
  };
  if (!loaded) {
    return (
      <div style={styles.container}>
        <header style={styles.pageHeader}>
          <button style={styles.iconBack} onClick={goBack} aria-label="뒤로"><ChevronLeft size={22} /></button>
          <div style={styles.pageTitle}>My Bag</div>
          <div style={{ width: 44 }} />
        </header>
      </div>
    );
  }
  if (!isSaved && !wizardOff) {
    return (
      <div style={styles.container}>
        <BagSetupWizard currentUser={currentUser} onBack={goBack} onLater={() => setWizardOff(true)} onDone={handleWizardDone} bottomOffset={64} />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.pageHeader}>
        <button style={styles.iconBack} onClick={goBack} aria-label="뒤로">
          <ChevronLeft size={22} />
        </button>
        <div style={styles.pageTitle}>My Bag</div>
        <div style={{ width: 44 }} />
      </header>

      {/* 구성 요약 — 클럽 수 · 종류별 개수 · 저장 상태 */}
      <div data-role="bag-summary" style={styles.bagScope}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={styles.bagScopeLabel}>내 클럽 구성</div>
          <div style={styles.bagScopeValue}>
            <span data-role="bag-count">{comp.total}</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: comp.overLimit ? COLOR.red : COLOR.muted }}>/ {BAG_LIMIT}개{comp.overLimit ? ' · 규정 초과' : ''}</span>
          </div>
          <div style={{ fontSize: 13, color: COLOR.muted, marginTop: 3, lineHeight: 1.4, wordBreak: 'keep-all' }}>{comp.text}</div>
        </div>
        <span data-role="bag-saved" style={{ flexShrink: 0, alignSelf: 'flex-start', fontSize: 13, fontWeight: 800, padding: '3px 10px', borderRadius: 999, border: `1px solid ${dirty ? BAG_COLOR.unsaved : isSaved ? COLOR.green : COLOR.amber}`, color: dirty ? BAG_COLOR.unsaved : isSaved ? COLOR.green : COLOR.amber }}>
          {dirty ? '저장 필요' : isSaved ? '저장됨' : '기본값'}
        </span>
      </div>
      <Takeaway bare tone={statusTake.tone} id="bag-status">{statusTake.text}</Takeaway>
      {!isSaved && (
        <button type="button" data-role="bag-register-start" onClick={() => setWizardOff(false)}
          style={{ width: '100%', height: 46, margin: '6px 0 4px', borderRadius: 14, border: '1px solid rgba(201,162,40,0.55)', background: 'rgba(201,162,40,0.1)', color: COLOR.goldHi, fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
          내 클럽 등록하기
        </button>
      )}
      {comp.overLimit && <Takeaway bare tone="warn" id="bag-over">클럽이 {comp.total}개예요. 규정은 최대 {BAG_LIMIT}개까지예요.</Takeaway>}

      <div style={{ height: 10 }} />
      <StickyTabs variant="underline" tabs={TABS} current={tab} onChange={setTab} label="마이백 보기" rolePrefix="bag-tab" />

      {tab === 'clubs' && (
        <div data-role="bag-page-clubs">
          <div style={{ fontSize: 14, color: COLOR.muted, textAlign: 'center', margin: '2px 0 14px', lineHeight: 1.5 }}>
            클럽을 눌러 이름과 거리를 고쳐요 · ⋮⋮을 끌어 순서를 바꿔요
          </div>

          {TYPE_ORDER.map((type) => {
            const list = grouped[type];
            const canAdd = type !== 'Putter';
            return (
              <Card key={type} id={`bag-${type.toLowerCase()}`} title={TYPE_TITLE[type]}
                right={canAdd && (
                  <button type="button" onClick={() => addClub(type)} aria-label={`${type} 추가`}
                    style={{ height: 36, padding: '0 12px', borderRadius: 999, border: '1px solid rgba(201,162,40,0.5)', background: 'rgba(201,162,40,0.1)', color: COLOR.goldHi, fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
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
                        changed={!!draft[club.id]}
                        unset={noDistance(club)}
                        onRename={(name) => renameClub(club.id, name)}
                        onDistance={(field, v) => setDistance(club.id, field, v)}
                        onFit={(fit) => fitClub(club.id, fit)}
                        onConfirm={() => confirmClub(club.id)}
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
            style={{ width: '100%', height: 44, background: 'none', border: 'none', color: COLOR.faint, fontSize: 14, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>
            기본 구성으로 되돌리기
          </button>
        </div>
      )}

      {tab === 'chart' && (
        <div data-role="bag-page-chart">
          <div style={{ fontSize: 14, color: COLOR.muted, textAlign: 'center', margin: '2px 0 14px', lineHeight: 1.5 }}>
            클럽별 거리를 한눈에 봐요 · 숫자는 모두 {unitInfo().name}({unitLabel('shot')}) · 누르면 거리를 고쳐요
          </div>

          <Card id="bag-chart" title="DISTANCE · 거리 분포">
            {chartRows.length === 0 && unsetRows.length === 0 ? <Hint>아직 캐리·토탈 거리가 입력된 클럽이 없어요</Hint> : (
              <>
                {chartRows.length > 0 && (
                  <>
                    {/* 범례 — 색마다 '무슨 숫자인지'를 글로 적는다 */}
                    <div data-role="bag-legend" style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 12, padding: '10px 12px', borderRadius: 12, background: '#0f1524', border: `1px solid ${COLOR.line}` }}>
                      {[
                        { key: 'carry', color: BAG_COLOR.carry, name: '캐리', text: '내가 마이백에 등록한 캐리 · 공이 떨어지는 곳', dim: false, mark: <i style={{ display: 'block', width: 12, height: 5, borderRadius: 2, background: BAG_COLOR.carry }} /> },
                        { key: 'total', color: BAG_COLOR.total, name: '토탈', text: '내가 마이백에 등록한 토탈 · 굴러서 멈추는 곳', dim: false, mark: <i style={{ display: 'block', width: 12, height: 5, borderRadius: 2, background: BAG_COLOR.total }} /> },
                        {
                          key: 'measured', color: BAG_COLOR.measured, name: '실측', dim: !hasMeasured,
                          text: hasMeasured
                            ? `라운드에서 잰 실제 거리 · 공이 멈춘 곳 (클럽마다 ${MIN_MEASURED_SHOTS}샷 이상일 때)`
                            : `라운드 기록이 아직 없어요 · 클럽마다 ${MIN_MEASURED_SHOTS}샷 이상 쌓이면 나타나요`,
                          mark: <i style={{ display: 'block', width: 3, height: 12, borderRadius: 1.5, background: BAG_COLOR.measured }} />,
                        },
                        ...(dirty ? [{ key: 'unsaved', color: BAG_COLOR.unsaved, name: '●', text: '아직 저장하지 않은 거리', dim: false, mark: <i style={{ display: 'block', width: 7, height: 7, borderRadius: '50%', background: BAG_COLOR.unsaved }} /> }] : []),
                      ].map((l) => (
                        <div key={l.key} data-role={`bag-legend-${l.key}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, lineHeight: 1.45, opacity: l.dim ? 0.55 : 1 }}>
                          <span aria-hidden="true" style={{ width: 14, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>{l.mark}</span>
                          <span style={{ minWidth: 0, wordBreak: 'keep-all' }}>
                            {l.key !== 'unsaved' && <b style={{ color: l.color, marginRight: 6 }}>{l.name}</b>}
                            <span style={{ color: '#c4cfe0' }}>{l.text}</span>
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* 열 머리글 — 숫자 열이 어느 데이터인지 위에서 한 번 더 */}
                    <div data-role="bag-chart-head" style={{ display: 'flex', alignItems: 'flex-end', gap: CHART_COL.gap, paddingBottom: 4 }}>
                      <span style={{ width: CHART_COL.name, flexShrink: 0 }} />
                      <span style={{ flex: 1, minWidth: 0 }} />
                      <span style={{ width: CHART_COL.carry + CHART_COL.total + CHART_COL.gap, flexShrink: 0, textAlign: 'center', fontSize: 12, fontWeight: 700, color: COLOR.muted, letterSpacing: '0.04em', borderBottom: `1px solid ${COLOR.line}`, paddingBottom: 2 }}>마이백 등록</span>
                      {hasMeasured && <span style={{ width: CHART_COL.meas, flexShrink: 0, textAlign: 'center', fontSize: 12, fontWeight: 700, color: BAG_COLOR.measured, letterSpacing: '0.04em', borderBottom: `1px solid ${COLOR.line}`, paddingBottom: 2 }}>라운드</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: CHART_COL.gap, paddingBottom: 4, borderBottom: `1px solid ${COLOR.line}` }}>
                      <span style={{ width: CHART_COL.name, flexShrink: 0 }} />
                      <span style={{ flex: 1, minWidth: 0 }} />
                      <span style={{ width: CHART_COL.carry, flexShrink: 0, textAlign: 'right', fontSize: 13, fontWeight: 800, color: BAG_COLOR.carry }}>캐리</span>
                      <span style={{ width: CHART_COL.total, flexShrink: 0, textAlign: 'right', fontSize: 13, fontWeight: 800, color: BAG_COLOR.total }}>토탈</span>
                      {hasMeasured && <span style={{ width: CHART_COL.meas, flexShrink: 0, textAlign: 'right', fontSize: 13, fontWeight: 800, color: BAG_COLOR.measured }}>실측</span>}
                    </div>
                  </>
                )}

                {chartRows.map((club) => {
                  const m = measured[club.id];
                  const pct = (v) => `${Math.max(0, Math.min(100, (v / maxDist) * 100))}%`;
                  return (
                    <button key={club.id} type="button" data-role={`bag-chart-${club.id}`} onClick={() => jumpToClub(club.id)}
                      style={{ width: '100%', minHeight: 46, display: 'flex', alignItems: 'center', gap: CHART_COL.gap, background: 'none', border: 'none', borderBottom: `1px solid ${COLOR.line}`, padding: '4px 0', color: COLOR.text, cursor: 'pointer', textAlign: 'left' }}>
                      <span style={{ width: CHART_COL.name, flexShrink: 0, position: 'relative', fontSize: 14, fontWeight: 800, overflow: 'visible', whiteSpace: 'nowrap' }}>
                        {draft[club.id] && <i data-role={`bag-chart-unsaved-${club.id}`} aria-label="저장 전" style={{ position: 'absolute', left: -9, top: '50%', marginTop: -3, width: 6, height: 6, borderRadius: '50%', background: BAG_COLOR.unsaved }} />}
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>{club.name}</span>
                      </span>
                      <span style={{ flex: 1, minWidth: 0, position: 'relative', height: 16 }}>
                        <span style={{ position: 'absolute', left: 0, right: 0, top: 1, height: 5, borderRadius: 3, background: COLOR.track }} />
                        <span style={{ position: 'absolute', left: 0, right: 0, top: 9, height: 5, borderRadius: 3, background: COLOR.track }} />
                        <span data-role={`bag-chart-carry-bar-${club.id}`} style={{ position: 'absolute', left: 0, top: 1, height: 5, width: pct(club.carry), borderRadius: 3, background: BAG_COLOR.carry }} />
                        <span data-role={`bag-chart-total-bar-${club.id}`} style={{ position: 'absolute', left: 0, top: 9, height: 5, width: pct(club.total), borderRadius: 3, background: BAG_COLOR.total }} />
                        {m && <span data-role="bag-chart-measured" style={{ position: 'absolute', top: -2, bottom: -2, left: `calc(${pct(m.median)} - 1.5px)`, width: 3, borderRadius: 1.5, background: BAG_COLOR.measured }} />}
                      </span>
                      <span data-role={`bag-chart-carry-${club.id}`} style={{ width: CHART_COL.carry, flexShrink: 0, textAlign: 'right', fontSize: 14, fontWeight: 800, color: BAG_COLOR.carry, fontVariantNumeric: 'tabular-nums' }}>{fmtShot(club.carry, { unit: false })}</span>
                      <span data-role={`bag-chart-total-${club.id}`} style={{ width: CHART_COL.total, flexShrink: 0, textAlign: 'right', fontSize: 15, fontWeight: 900, color: BAG_COLOR.total, fontVariantNumeric: 'tabular-nums' }}>{fmtShot(club.total, { unit: false })}</span>
                      {hasMeasured && (
                        <span data-role={`bag-chart-meas-${club.id}`} style={{ width: CHART_COL.meas, flexShrink: 0, textAlign: 'right', fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }}>
                          {m ? (
                            <>
                              <span style={{ display: 'block', fontSize: 15, fontWeight: 900, color: BAG_COLOR.measured }}>{fmtShot(m.median, { unit: false })}</span>
                              <span style={{ display: 'block', fontSize: 12, color: COLOR.faint }}>{m.n}샷</span>
                            </>
                          ) : <span style={{ fontSize: 14, color: COLOR.faint }}>–</span>}
                        </span>
                      )}
                    </button>
                  );
                })}

                {unsetRows.map((club) => (
                  <button key={club.id} type="button" data-role={`bag-chart-${club.id}`} onClick={() => jumpToClub(club.id)}
                    style={{ width: '100%', minHeight: 46, display: 'flex', alignItems: 'center', gap: CHART_COL.gap, background: 'none', border: 'none', borderBottom: `1px solid ${COLOR.line}`, padding: '4px 0', color: COLOR.text, cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ width: CHART_COL.name, flexShrink: 0, fontSize: 14, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{club.name}</span>
                    <span data-role={`bag-chart-unset-${club.id}`} style={{ flex: 1, minWidth: 0, fontSize: 13, color: COLOR.amber, wordBreak: 'keep-all' }}>거리를 확인하지 않았어요 · 눌러서 입력</span>
                  </button>
                ))}
              </>
            )}
          </Card>

          {/* 내가 적은 거리와 라운드 실측이 다른 클럽 — 클럽 사이가 비었는지·겹치는지는 판정하지 않는다(어떤 간격이 맞는지는 사람마다 다르다).
              기본값을 보고 있을 때는 비교할 '내 거리'가 없어 숨긴다. */}
          {isSaved && (
            <Card id="bag-actual" title="ACTUAL · 등록 거리 vs 실제 거리" info={<>
              <p>라운드에서 같은 클럽을 {MIN_MEASURED_SHOTS}번 이상 치고 거리를 기록하면, 공이 멈춘 거리의 중앙값(실측)을 내가 적은 토탈과 견줘요.</p>
              <p>{fmtShot(MISMATCH_M)} 이상 다른 클럽만 보여요. 어느 쪽이 맞는지는 날씨와 라이에 따라 달라서 앱이 정하지 않아요. 클럽 추천은 내가 적은 거리로 계산해요.</p>
            </>}>
              {!hasMeasured ? (
                <Hint id="actual-empty">같은 클럽으로 {MIN_MEASURED_SHOTS}번 이상 친 거리가 쌓이면, 내가 적은 거리와 실제로 나간 거리를 비교해 드려요.</Hint>
              ) : actual.rows.length === 0 ? (
                <Takeaway bare tone="info" id="actual-same">실측이 있는 클럽 {actual.compared}개가 모두 등록한 거리와 비슷해요.</Takeaway>
              ) : (
                <>
                  <Takeaway bare tone="info" id="actual-take">등록한 거리와 실제로 나간 거리가 다른 클럽이에요. 누르면 그 클럽에서 실측에 맞출 수 있어요.</Takeaway>
                  {actual.rows.map((r) => {
                    const diff = displayShot(r.median) - displayShot(r.club.total);
                    return (
                      <button key={r.club.id} type="button" data-role={`bag-actual-${r.club.id}`} onClick={() => jumpToClub(r.club.id)}
                        style={{ width: '100%', minHeight: 48, display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', borderBottom: `1px solid ${COLOR.line}`, padding: '6px 0', color: COLOR.text, cursor: 'pointer', textAlign: 'left' }}>
                        <span style={{ width: 52, flexShrink: 0, fontSize: 14, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.club.name}</span>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: COLOR.muted, lineHeight: 1.4 }}>
                          등록 <b style={{ color: BAG_COLOR.total }}>{fmtShot(r.club.total, { unit: false })}</b> → 실제 <b style={{ color: BAG_COLOR.measured }}>{fmtShot(r.median, { unit: false })}</b>
                          <span style={{ color: COLOR.faint }}> · {r.n}샷</span>
                        </span>
                        <span data-role={`bag-actual-diff-${r.club.id}`} style={{ flexShrink: 0, fontSize: 15, fontWeight: 900, color: BAG_COLOR.measured, fontVariantNumeric: 'tabular-nums' }}>
                          {diff > 0 ? '+' : '−'}{Math.abs(diff)}{unitLabel('shot')}
                        </span>
                      </button>
                    );
                  })}
                </>
              )}
            </Card>
          )}
        </div>
      )}

      {/* 저장 막대 — 거리를 고친 게 있을 때만. 저장한 직후에는 잠깐 '저장했어요' */}
      {(dirty || flash) && (
        <>
          <div aria-hidden="true" style={{ height: 76 }} />
          <div data-role="bag-savebar" style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 520, boxSizing: 'border-box', bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))', zIndex: 40, padding: '0 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 10px 10px 16px', borderRadius: 16, background: 'rgba(14,20,34,0.96)', border: `1px solid ${dirty ? 'rgba(239,138,80,0.65)' : 'rgba(61,184,122,0.6)'}`, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
              {dirty ? (
                <>
                  <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <div data-role="bag-dirty" style={{ fontSize: 14, fontWeight: 800, color: COLOR.text }}>거리 {dirtyCount}개 변경됨</div>
                    <div style={{ fontSize: 13, color: COLOR.muted, marginTop: 1 }}>저장해야 클럽 추천에 반영돼요</div>
                  </div>
                  <button type="button" data-role="bag-discard" onClick={discardDrafts}
                    style={{ height: 44, padding: '0 14px', borderRadius: 12, border: `1px solid ${COLOR.line}`, background: 'transparent', color: COLOR.muted, fontSize: 14, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>취소</button>
                  <button type="button" data-role="bag-save" onClick={saveDrafts}
                    style={{ height: 44, padding: '0 22px', borderRadius: 12, border: 'none', background: `linear-gradient(180deg, ${COLOR.goldHi} 0%, ${COLOR.gold} 100%)`, color: '#0b0e18', fontSize: 15, fontWeight: 900, cursor: 'pointer', flexShrink: 0 }}>저장</button>
                </>
              ) : (
                <div data-role="bag-flash" style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 800, color: COLOR.green, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓ 저장했어요</div>
              )}
            </div>
          </div>
        </>
      )}

      {pendingLeave && (
        <div style={styles.modalOverlay} onClick={() => setPendingLeave(null)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalIcon}>💾</div>
            <div style={styles.modalTitle}>저장하지 않은 변경이 있어요</div>
            <div style={styles.modalText}>거리를 {dirtyCount}개 고쳤지만 아직 저장하지 않았어요.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button data-role="leave-save" style={{ ...styles.modalBtnConfirm, width: '100%', flex: 'none' }} onClick={leaveWithSave}>저장하고 나가기</button>
              <button data-role="leave-discard" style={{ ...styles.modalBtnCancel, width: '100%', flex: 'none' }} onClick={leaveWithoutSave}>저장 안 하고 나가기</button>
              <button data-role="leave-stay" style={{ ...styles.modalBtnCancel, width: '100%', flex: 'none', borderColor: 'transparent', background: 'transparent' }} onClick={() => setPendingLeave(null)}>계속 편집</button>
            </div>
          </div>
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
