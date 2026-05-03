import React, { useState, useEffect } from 'react';
import { ChevronLeft, Plus } from 'lucide-react';
import { loadClubsByUser, saveClubsForUser } from '../../db.js';
import styles from '../../styles/styles';
import ClubCard from './ClubCard';

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

export default function MyBagView({ currentUser, onBack }) {
  const [clubs, setClubs] = useState(DEFAULT_CLUBS);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const savedClubs = await loadClubsByUser(currentUser.userId);
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
        } else {
          setClubs(DEFAULT_CLUBS);
        }
      } catch (e) {
        console.error('Load clubs failed', e);
        setClubs(DEFAULT_CLUBS);
      }
    };
    load();
  }, [currentUser.userId]);

  const saveClubs = async (updated) => {
    setClubs(updated);
    try {
      await saveClubsForUser(currentUser.userId, updated);
    } catch (e) {
      console.error('Save clubs failed', e);
    }
  };

  const updateField = (id, field, delta) => {
    const updated = clubs.map(c => {
      if (c.id !== id) return c;
      const curr = c[field] ?? 0;
      let next = Math.max(0, Math.min(350, curr + delta));

      const newClub = { ...c, [field]: next };

      if (field === 'carry' && newClub.total !== undefined && next > newClub.total) {
        newClub.total = next;
      }
      if (field === 'total' && newClub.carry !== undefined && next < newClub.carry) {
        newClub.carry = next;
      }

      return newClub;
    });
    saveClubs(updated);
  };

  const addClub = (type) => {
    const defaults = CLUB_TYPE_DEFAULTS[type];
    const usedNames = clubs.filter(c => c.type === type).map(c => c.name);
    const suggestions = CLUB_NAME_SUGGESTIONS[type] || [];
    const nextName = suggestions.find(s => !usedNames.includes(s)) || defaults.name;

    const newClub = {
      id: `${type.toLowerCase()}_${Date.now()}`,
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
  };

  const requestDeleteClub = (id) => {
    const club = clubs.find(c => c.id === id);
    if (!club) return;
    setPendingDelete(club);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    saveClubs(clubs.filter(c => c.id !== pendingDelete.id));
    setPendingDelete(null);
  };

  const cancelDelete = () => {
    setPendingDelete(null);
  };

  const startEditName = (club) => {
    setEditingId(club.id);
    setEditingName(club.name);
  };

  const saveEditName = () => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    const updated = clubs.map(c =>
      c.id === editingId ? { ...c, name: trimmed } : c
    );
    saveClubs(updated);
    setEditingId(null);
    setEditingName('');
  };

  const cancelEditName = () => {
    setEditingId(null);
    setEditingName('');
  };

  const grouped = {
    Wood: clubs.filter(c => c.type === 'Wood'),
    Hybrid: clubs.filter(c => c.type === 'Hybrid'),
    Iron: clubs.filter(c => c.type === 'Iron'),
    Wedge: clubs.filter(c => c.type === 'Wedge'),
    Putter: clubs.filter(c => c.type === 'Putter'),
  };

  const totalCount = clubs.length;
  const overLimit = totalCount > 14;

  return (
    <div style={styles.container}>
      <header style={styles.pageHeader}>
        <button style={styles.iconBack} onClick={onBack}>
          <ChevronLeft size={22} />
        </button>
        <div style={styles.pageTitle}>My Bag</div>
        <div style={{ width: 40 }} />
      </header>

      <div style={styles.bagBanner}>
        <div style={styles.bagBannerIcon}>🏌️</div>
        <div>
          <div style={styles.bagBannerLabel}>내 클럽 구성</div>
          <div style={styles.bagBannerValue}>
            {totalCount}
            <span style={styles.bagBannerSub}>
              {' / 14 clubs'}
              {overLimit && ' · 규정 초과'}
            </span>
          </div>
        </div>
      </div>

      <div style={styles.bagHint}>
        캐리 · 토탈 거리 설정 · 클럽명 탭하여 수정 · 하단 + 버튼으로 추가
      </div>

      {Object.entries(grouped).map(([type, typeClubs]) => {
        const labelMap = {
          Wood: 'WOODS · 우드',
          Hybrid: 'HYBRIDS · 하이브리드',
          Iron: 'IRONS · 아이언',
          Wedge: 'WEDGES · 웨지',
          Putter: 'PUTTER · 퍼터'
        };
        const canAdd = type !== 'Putter';
        const showSection = typeClubs.length > 0 || canAdd;
        if (!showSection) return null;

        return (
          <div key={type} style={styles.section}>
            <div style={styles.sectionHeaderRow}>
              <div style={styles.sectionTitle}>{labelMap[type]}</div>
              {canAdd && (
                <button
                  style={styles.sectionAddBtn}
                  onClick={() => addClub(type)}
                  aria-label={`${type} 추가`}
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span>추가</span>
                </button>
              )}
            </div>
            {typeClubs.length === 0 ? (
              <div style={styles.emptyClubList}>
                아직 등록된 클럽이 없습니다
              </div>
            ) : (
              <div style={styles.clubList}>
                {typeClubs.map(club => (
                  <ClubCard
                    key={club.id}
                    club={club}
                    isEditing={editingId === club.id}
                    editingName={editingName}
                    onEditingNameChange={setEditingName}
                    onStartEdit={() => startEditName(club)}
                    onSaveEdit={saveEditName}
                    onCancelEdit={cancelEditName}
                    onUpdate={(field, delta) => updateField(club.id, field, delta)}
                    onDelete={() => requestDeleteClub(club.id)}
                    canDelete={true}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {clubs.filter(c => c.type !== 'Putter' && c.carry && c.total).length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>DISTANCE CHART · 거리 분포</div>
          <div style={styles.distanceChartLegend}>
            <div style={styles.distanceLegendItem}>
              <span style={{ ...styles.distanceLegendDot, background: '#3db87a' }} />
              <span>캐리</span>
            </div>
            <div style={styles.distanceLegendItem}>
              <span style={{ ...styles.distanceLegendDot, background: '#0e1c14' }} />
              <span>토탈</span>
            </div>
          </div>
          <div style={styles.distanceChart}>
            {clubs
              .filter(c => c.type !== 'Putter' && c.carry && c.total)
              .sort((a, b) => b.total - a.total)
              .map(club => {
                const maxDist = Math.max(...clubs.filter(c => c.type !== 'Putter' && c.total).map(c => c.total));
                const totalPct = (club.total / maxDist) * 100;
                const carryPct = (club.carry / maxDist) * 100;
                return (
                  <div key={club.id} style={styles.distanceRow}>
                    <div style={styles.distanceLabel}>{club.name}</div>
                    <div style={styles.distanceBarTrack}>
                      <div style={{
                        ...styles.distanceBarFillTotal,
                        width: `${totalPct}%`,
                      }} />
                      <div style={{
                        ...styles.distanceBarFillCarry,
                        width: `${carryPct}%`,
                      }} />
                    </div>
                    <div style={styles.distanceValues}>
                      <div style={styles.distanceValueCarry}>{club.carry}</div>
                      <div style={styles.distanceValueTotal}>{club.total}m</div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {pendingDelete && (
        <div style={styles.modalOverlay} onClick={cancelDelete}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalIcon}>🗑️</div>
            <div style={styles.modalTitle}>{pendingDelete.name} 삭제</div>
            <div style={styles.modalText}>
              이 클럽을 백에서 제거하시겠습니까?
            </div>
            <div style={styles.modalActions}>
              <button style={styles.modalBtnCancel} onClick={cancelDelete}>
                취소
              </button>
              <button style={styles.modalBtnConfirm} onClick={confirmDelete}>
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
