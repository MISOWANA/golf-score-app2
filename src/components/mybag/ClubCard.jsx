import React from 'react';
import { Trash2, Edit3, Check, X } from 'lucide-react';
import styles from '../../styles/styles';
import Stepper from './Stepper';

export default function ClubCard({
  club, isEditing, editingName, onEditingNameChange,
  onStartEdit, onSaveEdit, onCancelEdit,
  onUpdate, onDelete, canDelete
}) {
  const renderName = () => {
    if (isEditing) {
      return (
        <div style={styles.clubNameEditWrap}>
          <input
            style={styles.clubNameInput}
            value={editingName}
            onChange={(e) => onEditingNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveEdit();
              if (e.key === 'Escape') onCancelEdit();
            }}
            maxLength={12}
            autoFocus
          />
          <button style={styles.clubNameActionBtn} onClick={onSaveEdit} aria-label="저장">
            <Check size={16} strokeWidth={2.5} />
          </button>
          <button
            style={{ ...styles.clubNameActionBtn, color: '#8b8574' }}
            onClick={onCancelEdit}
            aria-label="취소"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>
      );
    }
    return (
      <button style={styles.clubNameTappable} onClick={onStartEdit}>
        <span style={styles.clubName}>{club.name}</span>
        <Edit3 size={12} strokeWidth={2} style={{ color: '#b8b0a0' }} />
      </button>
    );
  };

  if (club.type === 'Putter') {
    return (
      <div style={styles.clubCard}>
        <div style={styles.clubCardHeader}>
          {renderName()}
          {canDelete && !isEditing && (
            <div style={styles.clubCardHeaderRight}>
              <button
                style={styles.clubDeleteBtn}
                onClick={onDelete}
                aria-label="클럽 삭제"
              >
                <Trash2 size={14} strokeWidth={2} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const run = (club.total ?? 0) - (club.carry ?? 0);

  return (
    <div style={styles.clubCard}>
      <div style={styles.clubCardHeader}>
        {renderName()}
        <div style={styles.clubCardHeaderRight}>
          {run > 0 && !isEditing && (
            <div style={styles.clubRunBadge}>런 +{run}m</div>
          )}
          {canDelete && !isEditing && (
            <button
              style={styles.clubDeleteBtn}
              onClick={onDelete}
              aria-label="클럽 삭제"
            >
              <Trash2 size={14} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      <div style={styles.clubFieldRow}>
        <div style={styles.clubFieldLabel}>
          <span style={styles.clubFieldLabelMain}>캐리</span>
          <span style={styles.clubFieldLabelSub}>Carry</span>
        </div>
        <Stepper
          value={club.carry ?? 0}
          suffix="m"
          onDecrement={() => onUpdate('carry', -5)}
          onIncrement={() => onUpdate('carry', 5)}
          canDecrement={(club.carry ?? 0) > 0}
          canIncrement={(club.carry ?? 0) < 350}
        />
      </div>

      <div style={styles.clubFieldRow}>
        <div style={styles.clubFieldLabel}>
          <span style={styles.clubFieldLabelMain}>토탈</span>
          <span style={styles.clubFieldLabelSub}>Total</span>
        </div>
        <Stepper
          value={club.total ?? 0}
          suffix="m"
          onDecrement={() => onUpdate('total', -5)}
          onIncrement={() => onUpdate('total', 5)}
          canDecrement={(club.total ?? 0) > (club.carry ?? 0)}
          canIncrement={(club.total ?? 0) < 350}
          highlight
        />
      </div>
    </div>
  );
}
