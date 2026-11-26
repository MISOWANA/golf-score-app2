// 새 라운드 설정에서 '라운드 시작하기'가 막힌 이유를 문장으로 돌려준다.
// 비어 있으면 시작할 수 있다. OUT·IN 코스 이름은 필수가 아니다 — 비우면 'OUT'·'IN'으로 저장된다
// (GolfScoringApp.startNewRound).
import { isInputMode } from './inputMode.js';

const norm = (n) => String(n ?? '').trim().toLowerCase();

// inputMode: 고른 입력 모드('simple' | 'detailed' — engine/inputMode.js). 1인 라운드만 고른다 — 동반자 라운드는 늘 간편 스코어다.
export function setupBlockers({ courseName, players, teeBox, inputMode }) {
  const out = [];
  if (!String(courseName ?? '').trim()) out.push('골프장 이름을 입력해 주세요');
  const names = players ?? [];
  if (names.some((p) => !String(p ?? '').trim())) out.push('플레이어 이름을 모두 입력해 주세요');
  // 스코어를 플레이어 이름으로 구분해 저장하므로 같은 이름이 둘이면 서로 덮어쓴다
  const filled = names.map(norm).filter(Boolean);
  if (new Set(filled).size !== filled.length) out.push('플레이어 이름이 겹쳐요 (예: 철수A, 철수B)');
  if (!teeBox) out.push('TEE BOX를 선택해 주세요');
  if (names.length <= 1 && !isInputMode(inputMode)) out.push('입력 모드를 골라 주세요');
  return out;
}
