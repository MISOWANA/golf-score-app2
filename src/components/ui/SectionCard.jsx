/**
 * SectionCard — LIV Golf Design System
 *
 * A content container with optional title, subtitle, and action.
 * props:
 *   title      — section label (uppercase overline style)
 *   action     — right-side link/button text
 *   onAction   — callback for action click
 *   accent     — 'gold' | 'green' | none — left accent bar variant
 *   noPad      — skip internal padding (for table-style content)
 *   style      — override wrapper style
 *
 * Reused in: HomeView, AnalysisView, InsightsView, StatsView, MyBagView
 */
import React from 'react';
import { palette, radii, shadows } from '../../styles/theme.js';

const accentColors = {
  gold:  palette.gold,
  green: palette.greenAccent,
  none:  'transparent',
};

export default function SectionCard({
  title,
  subtitle,
  action,
  onAction,
  accent = 'none',
  noPad = false,
  style,
  children,
}) {
  const hasHeader = title || action;
  const accentColor = accentColors[accent] || 'transparent';

  return (
    <div style={{ marginBottom: '24px', ...style }}>
      {hasHeader && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
        }}>
          <div>
            {title && (
              <span style={{
                fontSize: '10px',
                fontWeight: '700',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: palette.textSecondary,
              }}>
                {title}
              </span>
            )}
            {subtitle && (
              <p style={{
                fontSize: '12px',
                color: palette.textMuted,
                marginTop: '2px',
              }}>
                {subtitle}
              </p>
            )}
          </div>
          {action && (
            <button
              type="button"
              onClick={onAction}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '12px',
                fontWeight: '600',
                color: palette.gold,
                cursor: 'pointer',
                letterSpacing: '0.04em',
              }}
            >
              {action}
            </button>
          )}
        </div>
      )}

      <div style={{
        background: palette.surface1,
        borderRadius: radii.sm,
        border: `1px solid ${palette.border}`,
        borderLeft: accent !== 'none'
          ? `3px solid ${accentColor}`
          : `1px solid ${palette.border}`,
        overflow: 'hidden',
        boxShadow: shadows.sm,
        padding: noPad ? '0' : '0',
      }}>
        {noPad ? children : (
          <div style={{ padding: '16px' }}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
