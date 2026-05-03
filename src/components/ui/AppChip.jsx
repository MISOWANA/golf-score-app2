/**
 * AppChip — LIV Golf Design System
 *
 * Compact toggle/filter/tag pill.
 * variants: default | active | success | warning | error | gold
 *
 * Reused in: fairway hit, GIR, shot shape toggles, filter tabs
 */
import React from 'react';
import { palette, radii } from '../../styles/theme.js';

const base = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '4px',
  fontFamily: "'Noto Sans KR', sans-serif",
  fontWeight: '700',
  fontSize: '11px',
  letterSpacing: '0.06em',
  padding: '6px 12px',
  borderRadius: radii.xs,
  border: '1px solid',
  cursor: 'pointer',
  transition: 'all 0.12s ease',
  userSelect: 'none',
  WebkitTapHighlightColor: 'transparent',
  whiteSpace: 'nowrap',
};

const variants = {
  default: {
    background: 'transparent',
    color: palette.textSecondary,
    borderColor: palette.borderMid,
  },
  active: {
    background: palette.gold,
    color: palette.textInverse,
    borderColor: palette.gold,
  },
  success: {
    background: palette.greenBg,
    color: palette.greenAccent,
    borderColor: palette.greenAccent,
  },
  warning: {
    background: palette.goldBg,
    color: palette.gold,
    borderColor: palette.gold,
  },
  error: {
    background: 'rgba(239,83,80,0.12)',
    color: palette.error,
    borderColor: palette.error,
  },
  gold: {
    background: palette.goldBg,
    color: palette.gold,
    borderColor: palette.goldMuted,
  },
  muted: {
    background: palette.surface2,
    color: palette.textMuted,
    borderColor: palette.border,
  },
};

export default function AppChip({
  children,
  variant = 'default',
  style,
  onClick,
  active,
}) {
  const resolvedVariant = active ? 'active' : variant;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...base,
        ...variants[resolvedVariant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}
