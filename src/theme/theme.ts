/**
 * LIV Golf 스타일 기반 디자인 시스템
 * 프리미엄 스포츠 브랜드 감성
 */

// ============================================
// 버전 A: 원형 (대담한 검정 + 골드)
// ============================================
export const themePremium = {
  colors: {
    // Primary colors
    primary: '#000000',        // 순검정 배경
    primaryDark: '#0a0a0a',    // 더 어두운 검정
    primaryLight: '#1a1a1a',   // 라이트 검정
    
    // Accent colors - 프리미엄 골드/브론즈
    accent: '#d4af37',         // 고급스러운 골드
    accentLight: '#e8d4a8',    // 라이트 골드
    accentDark: '#a89a3f',     // 다크 골드
    
    // Secondary colors
    secondary: '#2d5016',      // 딥 그린 (골프 필드)
    secondaryLight: '#4a7c2f', // 밝은 그린
    
    // Neutral colors
    white: '#ffffff',
    cream: '#f5f1e8',          // 따뜻한 크림
    gray700: '#2a2a2a',
    gray600: '#404040',
    gray500: '#666666',
    gray400: '#999999',
    gray300: '#cccccc',
    gray200: '#e0e0e0',
    gray100: '#f0f0f0',
    
    // Semantic colors
    success: '#4a7c2f',        // 그린
    warning: '#c9a961',        // 앰버
    error: '#d9534f',          // 레드
    info: '#3498db',           // 블루
    
    // Component specific
    background: '#000000',
    surface: '#1a1a1a',
    border: '#333333',
    text: '#ffffff',
    textSecondary: '#cccccc',
    textTertiary: '#999999',
    disabled: '#555555',
    
    // Data visualization
    score_excellent: '#d4af37', // 골드 - 최고
    score_good: '#4a7c2f',      // 그린 - 좋음
    score_normal: '#3498db',    // 블루 - 보통
    score_poor: '#e67e22',      // 오렌지 - 나쁨
    score_worst: '#d9534f',     // 레드 - 최악
  },
  
  typography: {
    fontFamily: {
      base: "'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    fontSize: {
      // Display sizes (숫자 강조용)
      display1: '56px',  // 대형 스코어
      display2: '48px',  // 중형 숫자
      display3: '40px',  // 통계 제목
      
      // Heading sizes
      h1: '32px',        // 화면 제목
      h2: '24px',        // 섹션 제목
      h3: '20px',        // 서브 제목
      h4: '16px',        // 카드 제목
      
      // Body sizes
      body1: '16px',     // 본문
      body2: '14px',     // 부가 텍스트
      body3: '13px',     // 라벨
      
      // Small sizes
      caption: '12px',   // 캡션
      tiny: '11px',      // 매우 작은 텍스트
      label: '12px',     // 라벨
    },
    fontWeight: {
      thin: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 900,
    },
    lineHeight: {
      tight: 1.1,
      normal: 1.5,
      relaxed: 1.75,
      loose: 2,
    },
  },
  
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    xxl: '24px',
    xxxl: '32px',
    huge: '40px',
  },
  
  radius: {
    none: '0',
    sm: '2px',
    md: '4px',
    lg: '8px',
    xl: '12px',
    xxl: '16px',
    full: '9999px',
  },
  
  shadows: {
    none: 'none',
    xs: '0 1px 2px rgba(0, 0, 0, 0.3)',
    sm: '0 2px 4px rgba(0, 0, 0, 0.4)',
    md: '0 4px 8px rgba(0, 0, 0, 0.5)',
    lg: '0 8px 16px rgba(0, 0, 0, 0.6)',
    xl: '0 12px 24px rgba(0, 0, 0, 0.7)',
    premium: '0 10px 30px rgba(212, 175, 55, 0.15), 0 4px 12px rgba(0, 0, 0, 0.3)',
  },
  
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

// ============================================
// 버전 B: 실용형 (부드러운 다크 + 크림)
// ============================================
export const themePractical = {
  colors: {
    // Primary colors
    primary: '#1a1a1a',        // 어두운 다크
    primaryDark: '#0f0f0f',    // 더 어두운 다크
    primaryLight: '#2a2a2a',   // 라이트 다크
    
    // Accent colors - 따뜻한 크림/골드
    accent: '#c9a961',         // 따뜻한 골드
    accentLight: '#dcc89f',    // 라이트 골드
    accentDark: '#a68349',     // 다크 골드
    
    // Secondary colors
    secondary: '#3d6b2f',      // 자연스러운 그린
    secondaryLight: '#5a8f47', // 밝은 그린
    
    // Neutral colors
    white: '#ffffff',
    cream: '#f5f1e8',          // 따뜻한 크림
    gray700: '#3a3a3a',
    gray600: '#505050',
    gray500: '#727272',
    gray400: '#999999',
    gray300: '#b0b0b0',
    gray200: '#d4d4d4',
    gray100: '#eeeeee',
    
    // Semantic colors
    success: '#5a8f47',        // 그린
    warning: '#d4a574',        // 앰버
    error: '#c74c48',          // 레드
    info: '#4a90e2',           // 블루
    
    // Component specific
    background: '#f5f1e8',     // 라이트 배경
    surface: '#ffffff',        // 카드 배경
    surfaceDark: '#faf8f3',    // 다크 모드 카드
    border: '#e0dcd2',
    text: '#1a1a1a',
    textSecondary: '#505050',
    textTertiary: '#878787',
    disabled: '#b0b0b0',
    
    // Data visualization
    score_excellent: '#c9a961', // 골드 - 최고
    score_good: '#5a8f47',      // 그린 - 좋음
    score_normal: '#4a90e2',    // 블루 - 보통
    score_poor: '#e67e22',      // 오렌지 - 나쁨
    score_worst: '#c74c48',     // 레드 - 최악
  },
  
  typography: {
    fontFamily: {
      base: "'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    fontSize: {
      // Display sizes (숫자 강조용)
      display1: '56px',  // 대형 스코어
      display2: '48px',  // 중형 숫자
      display3: '40px',  // 통계 제목
      
      // Heading sizes
      h1: '32px',        // 화면 제목
      h2: '24px',        // 섹션 제목
      h3: '20px',        // 서브 제목
      h4: '16px',        // 카드 제목
      
      // Body sizes
      body1: '16px',     // 본문
      body2: '14px',     // 부가 텍스트
      body3: '13px',     // 라벨
      
      // Small sizes
      caption: '12px',   // 캡션
      tiny: '11px',      // 매우 작은 텍스트
      label: '12px',     // 라벨
    },
    fontWeight: {
      thin: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 900,
    },
    lineHeight: {
      tight: 1.1,
      normal: 1.5,
      relaxed: 1.75,
      loose: 2,
    },
  },
  
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    xxl: '24px',
    xxxl: '32px',
    huge: '40px',
  },
  
  radius: {
    none: '0',
    sm: '2px',
    md: '4px',
    lg: '8px',
    xl: '12px',
    xxl: '16px',
    full: '9999px',
  },
  
  shadows: {
    none: 'none',
    xs: '0 1px 2px rgba(26, 26, 26, 0.1)',
    sm: '0 2px 4px rgba(26, 26, 26, 0.15)',
    md: '0 4px 8px rgba(26, 26, 26, 0.2)',
    lg: '0 8px 16px rgba(26, 26, 26, 0.25)',
    xl: '0 12px 24px rgba(26, 26, 26, 0.3)',
    premium: '0 10px 30px rgba(201, 169, 97, 0.12), 0 4px 12px rgba(26, 26, 26, 0.1)',
  },
  
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

// ============================================
// 🎯 최종 추천: 실용형 (Practical)
// ============================================
// 이유:
// 1. 눈 피로 감소 - 밝은 배경이 보기 편함
// 2. 골프 기록 앱에 적합 - 데이터가 명확
// 3. 스코어링 입력 시 집중도 높음
// 4. 다크 모드 대비 시인성 우수
// 5. 모바일에서 배터리 소비 더 적음
export const theme = themePractical;

export default theme;
