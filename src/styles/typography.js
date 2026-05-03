/**
 * Typography system — LIV Golf inspired
 * Hierarchy: Display → Stat → Heading → Body → Label
 */
import { palette, typography as t } from './theme.js';

const font = t.fontBase;

export const textStyles = {
  // ── Display (hero scores, totals) ───────────────────────────────────────
  displayXL: {
    fontFamily: font,
    fontSize: '72px',
    fontWeight: '800',
    letterSpacing: '-0.04em',
    lineHeight: 1,
    color: palette.textPrimary,
  },
  displayLG: {
    fontFamily: font,
    fontSize: t.displaySize,
    fontWeight: t.displayWeight,
    letterSpacing: t.displayTracking,
    lineHeight: 1,
    color: palette.textPrimary,
  },
  displayMD: {
    fontFamily: font,
    fontSize: '48px',
    fontWeight: '800',
    letterSpacing: '-0.03em',
    lineHeight: 1,
    color: palette.textPrimary,
  },

  // ── Stat numbers (tiles, panels) ────────────────────────────────────────
  statXL: {
    fontFamily: font,
    fontSize: t.statXL,
    fontWeight: t.statWeight,
    letterSpacing: t.statTracking,
    lineHeight: 1,
    color: palette.textPrimary,
  },
  statLG: {
    fontFamily: font,
    fontSize: t.statLG,
    fontWeight: t.statWeight,
    letterSpacing: t.statTracking,
    lineHeight: 1,
    color: palette.textPrimary,
  },
  statMD: {
    fontFamily: font,
    fontSize: t.statMD,
    fontWeight: t.statWeight,
    letterSpacing: '-0.02em',
    lineHeight: 1,
    color: palette.textPrimary,
  },
  statSM: {
    fontFamily: font,
    fontSize: t.statSM,
    fontWeight: t.statWeight,
    letterSpacing: '-0.01em',
    lineHeight: 1,
    color: palette.textPrimary,
  },

  // ── Headings ────────────────────────────────────────────────────────────
  h1: {
    fontFamily: font,
    fontSize: t.h1Size,
    fontWeight: t.h1Weight,
    letterSpacing: t.h1Tracking,
    lineHeight: 1.2,
    color: palette.textPrimary,
  },
  h2: {
    fontFamily: font,
    fontSize: t.h2Size,
    fontWeight: t.h2Weight,
    letterSpacing: t.h2Tracking,
    lineHeight: 1.3,
    color: palette.textPrimary,
  },
  h3: {
    fontFamily: font,
    fontSize: t.h3Size,
    fontWeight: t.h3Weight,
    letterSpacing: t.h3Tracking,
    lineHeight: 1.3,
    color: palette.textPrimary,
  },

  // ── Body ────────────────────────────────────────────────────────────────
  bodyLG: {
    fontFamily: font,
    fontSize: t.bodyLG,
    fontWeight: t.bodyWeight,
    lineHeight: 1.5,
    color: palette.textPrimary,
  },
  bodyMD: {
    fontFamily: font,
    fontSize: t.bodyMD,
    fontWeight: t.bodyWeight,
    lineHeight: 1.5,
    color: palette.textPrimary,
  },
  bodySM: {
    fontFamily: font,
    fontSize: t.bodySM,
    fontWeight: t.bodyWeight,
    lineHeight: 1.5,
    color: palette.textSecondary,
  },
  bodyStrong: {
    fontFamily: font,
    fontSize: t.bodyMD,
    fontWeight: t.bodyStrong,
    lineHeight: 1.4,
    color: palette.textPrimary,
  },

  // ── Label (uppercase overlines, metadata) ────────────────────────────────
  labelLG: {
    fontFamily: font,
    fontSize: t.labelLG,
    fontWeight: t.labelWeight,
    letterSpacing: t.labelTracking,
    textTransform: 'uppercase',
    lineHeight: 1,
    color: palette.textSecondary,
  },
  labelMD: {
    fontFamily: font,
    fontSize: t.labelMD,
    fontWeight: t.labelWeight,
    letterSpacing: t.labelTracking,
    textTransform: 'uppercase',
    lineHeight: 1,
    color: palette.textSecondary,
  },
  labelSM: {
    fontFamily: font,
    fontSize: t.labelSM,
    fontWeight: t.labelWeight,
    letterSpacing: t.labelTracking,
    textTransform: 'uppercase',
    lineHeight: 1,
    color: palette.textMuted,
  },
  labelGold: {
    fontFamily: font,
    fontSize: t.labelSM,
    fontWeight: t.labelWeight,
    letterSpacing: t.labelTracking,
    textTransform: 'uppercase',
    lineHeight: 1,
    color: palette.gold,
  },
};

export default textStyles;
