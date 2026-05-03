/**
 * AppButton — LIV Golf Design System
 *
 * variants: primary | secondary | ghost | danger | gold
 * sizes:    lg | md | sm
 *
 * Reused in: every view (SetupView, ScoringView, AnalysisView, modals, etc.)
 */
import React from 'react';
import { palette, radii } from '../../styles/theme.js';

const base = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  fontFamily: "'Noto Sans KR', sans-serif",
  fontWeight: '700',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  borderRadius: radii.xs,
  border: 'none',
  cursor: 'pointer',
  transition: 'opacity 0.15s ease, transform 0.1s ease',
  userSelect: 'none',
  WebkitTapHighlightColor: 'transparent',
};

const sizes = {
  lg: { width: '100%', padding: '16px 20px', fontSize: '13px' },
  md: { flex: 1, padding: '14px 18px', fontSize: '13px' },
  sm: { padding: '10px 16px', fontSize: '12px' },
};

const variants = {
  primary: {
    background: palette.gold,
    color: palette.textInverse,
    border: 'none',
  },
  secondary: {
    background: 'transparent',
    color: palette.textPrimary,
    border: `1px solid ${palette.borderMid}`,
  },
  ghost: {
    background: 'transparent',
    color: palette.textSecondary,
    border: 'none',
  },
  danger: {
    background: palette.error,
    color: '#ffffff',
    border: 'none',
  },
  gold: {
    background: 'transparent',
    color: palette.gold,
    border: `1px solid ${palette.gold}`,
  },
  dark: {
    background: palette.surface2,
    color: palette.textPrimary,
    border: `1px solid ${palette.borderMid}`,
  },
};

export default function AppButton({
  children,
  variant = 'primary',
  size = 'lg',
  style,
  disabled,
  onClick,
  type = 'button',
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...base,
        ...sizes[size],
        ...variants[variant],
        opacity: disabled ? 0.4 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}
