import { fmtPuttMeters } from './format.js';

// 핀 기준 위치를 말로 — y: + 핀 너머(롱) · x: + 오른쪽(라이트). 컴포넌트 파일에는 컴포넌트만 둔다.
export const alongText = (y) => `${y >= 0 ? '롱' : '숏'} ${fmtPuttMeters(Math.abs(y), 1)}`;
export const acrossText = (x) => `${x >= 0 ? '라이트' : '레프트'} ${fmtPuttMeters(Math.abs(x), 1)}`;
