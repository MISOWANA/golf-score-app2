import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import styles from '../../styles/styles';
import HistoryCard from './HistoryCard';

export default function HistoryView({ rounds, onBack, onSelect, onDelete }) {
  const [pendingDelete, setPendingDelete] = useState(null);

  return (
    <div style={styles.container}>
      <header style={styles.pageHeader}>
        <button style={styles.iconBack} onClick={onBack}>
          <ChevronLeft size={22} />
        </button>
        <div style={styles.pageTitle}>History</div>
        <div style={{ width: 40 }} />
      </header>

      {rounds.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📖</div>
          <div style={styles.emptyTitle}>기록된 라운드가 없습니다</div>
          <div style={styles.emptySub}>첫 라운드를 시작해보세요</div>
        </div>
      ) : (
        <div style={styles.historyList}>
          {rounds.map(r => (
            <HistoryCard
              key={r.id}
              round={r}
              onSelect={() => onSelect(r.id)}
              onDelete={() => setPendingDelete(r)}
            />
          ))}
        </div>
      )}

      {pendingDelete && (
        <div style={styles.modalOverlay} onClick={() => setPendingDelete(null)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalIcon}>🗑️</div>
            <div style={styles.modalTitle}>라운드 삭제</div>
            <div style={styles.modalText}>
              {pendingDelete.courseName} 라운드를<br/>삭제하시겠습니까?
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
                onClick={() => {
                  onDelete(pendingDelete.id);
                  setPendingDelete(null);
                }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
