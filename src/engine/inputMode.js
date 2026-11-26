// 라운드 입력 모드 — 라운드를 시작하기 전에 고른다 (새 라운드 설정 화면).
//   'simple'   간단 입력: 스코어와 퍼팅 수만 받는다 (벌타 · 샷 기록 구역을 보이지 않는다)
//   'detailed' 세부 입력: 지금까지의 스코어 입력 화면 그대로 (샷 기록은 "샷 기록" 줄을 눌러 연다)
//
// 라운드에는 round.inputMode 로 남는다. 이 값이 없는 예전 라운드(진행 중 · 완료 · 백업 복원 모두)는 'detailed' 로 본다 —
// 예전 화면이 그대로 열리게. 동반자 라운드(플레이어 2명 이상)는 따로 간편 스코어 화면을 쓰므로 이 값을 저장하지 않는다
// (동반자인지는 어디서나 players.length 로만 판단한다).
// 사용자가 마지막으로 고른 모드는 사용자 설정(prefs.defaultInputMode)에 남아 다음 라운드에 미리 골라 둔다.
//
// 모드는 화면에 무엇을 보일지만 정한다. 계산(스코어 자동 계산 · 통계 · 인사이트)은 모드를 보지 않는다 —
// 간단 모드에서 숨긴 샷 기록도 지우지 않고, 그 홀의 스코어는 원래 방식대로 계산된다.

export const INPUT_MODES = ['simple', 'detailed'];

export const isInputMode = (v) => INPUT_MODES.includes(v);

// 이 라운드의 입력 모드 — 없거나 알 수 없는 값이면 'detailed'
export const inputModeOf = (round) => (round?.inputMode === 'simple' ? 'simple' : 'detailed');

export const INPUT_MODE_INFO = {
  simple: { label: '간단 입력', desc: '스코어와 퍼팅만 빠르게' },
  detailed: { label: '세부 입력', desc: '샷마다 클럽·거리·결과까지' },
};

export const inputModeLabel = (mode) => INPUT_MODE_INFO[mode]?.label ?? null;
