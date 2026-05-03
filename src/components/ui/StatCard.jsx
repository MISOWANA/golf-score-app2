/**
 * StatCard — LIV Golf Design System
 *
 * Displays a single stat with label, large value, and optional sub-text.
 * Numbers are the visual star — maximum size and contrast.
 *
 * props:
 *   label    — uppercase label
 *   value    — primary number/text
 *   sub      — secondary caption
 *   accent   — 'gold' | 'green' | 'red' — value color
 *   size     — 'lg' (30px) | 'md' (22px) | 'sm' (18px)
 *   style    — override card style
 *
 * Reused in: AnalysisView key stats grid, StatsView, InsightsView
 */
import React from 'react';
import { palette, radii, shadows } from '../../styles/theme.js';

const valueColors = {
  default: palette.textPrimary,
  gold:    palette.gold,
  green:   palette.greenAccent,
  red:     palette.error,
};

const valueSizes = {
  lg: '30px',
  md: '24px',
  sm: '20px',
};

export default function StatCard({
  label,
  value,
  sub,
  accent = 'default',
  size = 'lg',
  style,
}) {
  return (
    <div style={{
      background: palette.surface1,
      border: `1px solid ${palette.border}`,
      borderRadius: radii.sm,
      padding: '18px 14px',
      textAlign: 'center',
      boxShadow: shadows.sm,
      ...style,
    }}>
      {label && (
        <div style={{
          fontSize: '10px',
          fontWeight: '700',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: palette.textSecondary,
          marginBottom: '10px',
        }}>
          {label}
        </div>
      )}

      <div style={{
        fontFamily: "'Noto Sans KR', sans-serif",
        fontSize: valueSizes[size],
        fontWeight: '800',
        letterSpacing: '-0.03em',
        lineHeight: 1,
        color: valueColors[accent] || palette.textPrimary,
      }}>
        {value}
      </div>

      {sub && (
        <div style={{
          fontSize: '11px',
          color: palette.textMuted,
          marginTop: '8px',
          fontWeight: '500',
        }}>
          {sub}
        </div>
      )}
    </div>
  );
}
