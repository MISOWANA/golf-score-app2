/**
 * 타이포그래피 설정
 * 데이터가 잘 보이는 것을 우선으로 설계
 */

import { theme } from './theme';

// ============================================
// 타이포그래피 믹스인 스타일
// ============================================

export const typography = {
  // Display: 큰 숫자들 (스코어, 핸디캡, 랭킹)
  display1: {
    fontSize: theme.typography.fontSize.display1,
    fontWeight: theme.typography.fontWeight.extrabold,
    lineHeight: theme.typography.lineHeight.tight,
    letterSpacing: '-0.02em',
  },
  
  display2: {
    fontSize: theme.typography.fontSize.display2,
    fontWeight: theme.typography.fontWeight.extrabold,
    lineHeight: theme.typography.lineHeight.tight,
    letterSpacing: '-0.01em',
  },
  
  display3: {
    fontSize: theme.typography.fontSize.display3,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.normal,
    letterSpacing: '0',
  },
  
  // Heading: 섹션 제목
  h1: {
    fontSize: theme.typography.fontSize.h1,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.normal,
    letterSpacing: '-0.005em',
  },
  
  h2: {
    fontSize: theme.typography.fontSize.h2,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.normal,
    letterSpacing: '0',
  },
  
  h3: {
    fontSize: theme.typography.fontSize.h3,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.normal,
    letterSpacing: '0',
  },
  
  h4: {
    fontSize: theme.typography.fontSize.h4,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.normal,
    letterSpacing: '0',
  },
  
  // Body: 본문
  body1: {
    fontSize: theme.typography.fontSize.body1,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.relaxed,
    letterSpacing: '0',
  },
  
  body2: {
    fontSize: theme.typography.fontSize.body2,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.normal,
    letterSpacing: '0',
  },
  
  body3: {
    fontSize: theme.typography.fontSize.body3,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.normal,
    letterSpacing: '0',
  },
  
  // Caption: 작은 텍스트
  caption: {
    fontSize: theme.typography.fontSize.caption,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.normal,
    letterSpacing: '0.02em',
  },
  
  label: {
    fontSize: theme.typography.fontSize.label,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.normal,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  
  // Special: 숫자 전용 (타이포그래피 개선)
  monospaceNumber: {
    fontSize: theme.typography.fontSize.body1,
    fontWeight: theme.typography.fontWeight.extrabold,
    lineHeight: theme.typography.lineHeight.tight,
    fontFamily: "'SF Mono', Monaco, Courier, monospace",
    letterSpacing: '-0.01em',
  },
};

// ============================================
// CSS-in-JS 헬퍼 (style 객체)
// ============================================

export const getTypographyStyle = (type: keyof typeof typography) => {
  return typography[type];
};

// React에서 사용할 조합된 스타일
export const textStyles = {
  scoreNumber: {
    ...typography.display1,
    color: theme.colors.accent,
  },
  
  holescore: {
    ...typography.display2,
    color: theme.colors.text,
  },
  
  sectionTitle: {
    ...typography.h2,
    color: theme.colors.text,
  },
  
  cardTitle: {
    ...typography.h4,
    color: theme.colors.text,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  
  label: {
    ...typography.label,
    color: theme.colors.textTertiary,
  },
  
  statValue: {
    ...typography.display3,
    color: theme.colors.accent,
  },
};

export default typography;
