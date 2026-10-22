// 마이백 화면의 '숫자 색 약속' — 같은 뜻의 숫자는 어느 탭에서나 같은 색이다.
//   carry     내가 마이백에 등록한 캐리 거리
//   total     내가 마이백에 등록한 토탈 거리
//   measured  라운드에서 잰 실제 거리(실측)
//   unsaved   아직 저장하지 않은 변경 (숫자의 뜻이 아니라 상태라서 위 세 색과 겹치지 않게 주황)
import { COLOR } from '../stats/format.js';

export const BAG_COLOR = {
  carry: COLOR.green,
  total: '#7db4e6',
  measured: COLOR.goldHi,
  unsaved: COLOR.orange,
};
