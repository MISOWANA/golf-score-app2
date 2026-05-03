import React from 'react';
import { Trash2, Edit3, Check, X, GripVertical } from 'lucide-react';
import styles from '../../styles/styles';
import Stepper from './Stepper';

export default function ClubCard({
  club, isEditing, editingName, onEditingNameChange,
  onStartEdit, onSaveEdit, onCancelEdit,
  onUpdate, onDelete, canDelete,
  isDragging, isDragOver,
  onDragStart, onDragEnd, onDragOver, onDrop,
  onGripTouchStart,
}) {
  const cardStyle = {
    ...styles.clubCard,
    opacity: isDragging ? 0.4 : 1,
    borderLeft: isDragOver ? '3px solid #c9a228' : '3px solid transparent',
    transition: 'opacity 0.15s, border-left-color 0.12s',
    boxSizing: 'border-box',
  };

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
            style={{ ...styles.clubNameActionBtn, color: '#4d5a78' }}
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

  const gripHandle = !isEditing && (
    <div
      style={styles.clubGripHandle}
      onTouchStart={onGripTouchStart}
      aria-label="순서 변경"
    >
      <GripVertical size={16} strokeWidth={1.5} />
    </div>
  );

  if (club.type === 'Putter') {
    return (
      <div
        data-club-id={club.id}
        draggable={!isEditing}
        style={cardStyle}
        onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart?.(); }}
        onDragEnd={onDragEnd}
        onDragOver={(e) => { e.preventDefault(); onDragOver?.(); }}
        onDrop={(e) => { e.preventDefault(); onDrop?.(); }}
      >
        <div style={styles.clubCardHeader}>
          {gripHandle}
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
    <div
      data-club-id={club.id}
      draggable={!isEditing}
      style={cardStyle}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart?.(); }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => { e.preventDefault(); onDragOver?.(); }}
      onDrop={(e) => { e.preventDefault(); onDrop?.(); }}
    >
      <div style={styles.clubCardHeader}>
        {gripHandle}
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
