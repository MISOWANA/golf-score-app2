// 화면 이동과 브라우저 기록(뒤로가기)을 맞춘다.
//
// 이 앱은 화면을 주소가 아니라 상태(view)로 바꾼다. 브라우저 기록을 따로 쌓지 않으면 뒤로가기(안드로이드 Back · iOS 가장자리 스와이프)가
// 앱 밖으로 나가 버린다 — 라운드를 입력하다 실수로 한 번 밀면 앱이 꺼진다. 그래서 화면을 옮길 때 기록도 같이 쌓는다.
//
// 모양: 홈이 바닥(depth 0)이고 그 위에 최대 두 단계만 쌓는다 (홈 → 스탯 → 리포트 …).
// 아래 메뉴로 화면을 옮겨 다니는 건 쌓지 않고 지금 기록을 바꿔치기한다 — 메뉴를 열 번 눌렀다고 뒤로가기를 열 번 눌러야 하면 안 된다.
//
// planNav(cur, next, depth) → { op, depth, back? }
//   op 'push'     새 기록을 쌓는다 (depth + 1)
//   op 'replace'  지금 기록을 바꿔치기한다 (depth 그대로, 로그인·홈이면 0)
//   op 'root'     홈으로 — 쌓인 기록을 한꺼번에 되감는다 (back 칸). 되감은 뒤의 홈 기록이 그대로 바닥이 된다
export const MAX_DEPTH = 2;

// 아래 메뉴(BottomTabBar)로 오가는 화면 — 설정은 홈에서 여는 화면이라 메뉴 화면처럼 바꿔치기한다
const SIDE_TABS = ['history', 'stats', 'insights', 'mybag', 'settings'];

export function planNav(cur, next, depth = 0) {
  if (next === cur) return { op: 'replace', depth };
  if (next === 'login' || cur === 'login') return { op: 'replace', depth: 0 };
  if (next === 'home') return depth > 0 ? { op: 'root', depth: 0, back: depth } : { op: 'replace', depth: 0 };
  // 메뉴 화면 → 다른 메뉴 화면
  if (SIDE_TABS.includes(cur) && SIDE_TABS.includes(next)) return { op: 'replace', depth };
  // 라운드 흐름 — 설정 화면은 시작하는 순간 기록 화면으로 바뀌고, 라운드가 끝나면 리포트로 바뀐다 (뒤로가면 홈)
  if (cur === 'setup' && next === 'scoring') return { op: 'replace', depth };
  if (cur === 'scoring' && (next === 'analysis' || next === 'setup')) return { op: 'replace', depth };
  if (depth >= MAX_DEPTH) return { op: 'replace', depth };
  return { op: 'push', depth: depth + 1 };
}

// 뒤로가기로 돌아온 기록이 가리키는 화면을 지금 상태에 맞게 고른다 — 로그아웃했거나 라운드가 이미 끝났으면 홈으로 보낸다
//   target  기록에 적힌 화면 · ctx { loggedIn, hasRound(진행 중인 라운드), hasSelected(리포트로 볼 라운드가 골라져 있음) }
export function resolvePop(target, { loggedIn, hasRound, hasSelected }) {
  if (!loggedIn) return 'login';
  if (target === 'login') return 'home';
  if (target === 'scoring' && !hasRound) return 'home';
  if (target === 'analysis' && !hasSelected) return 'home';
  return target;
}
