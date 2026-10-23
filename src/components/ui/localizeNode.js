import { Children, Fragment, cloneElement, isValidElement } from 'react';
import { getUnit, localizeText } from '../../engine/units.js';

// 화면에 놓을 글(문자열 · <p>…</p> 같은 요소 묶음) 속 "80m" 같은 미터 표기를 현재 거리 단위로 바꾼다.
// 설명 문구(InfoNote)와 한 줄 해석(Takeaway · Hint)처럼 글 속에 거리가 박혀 있는 곳에서 쓴다 — 단위가 미터이면 그대로 돌려준다.
// 숫자가 계산된 값이면 이 함수 대신 fmtShot / fmtPutt 를 쓴다 (engine/units.js).
// opts.abbr: 좁은 칸의 짧은 이름표용 — '120-153야드' 대신 '120-153yd' (engine/units.js localizeText)
export default function localizeNode(node, opts) {
  if (getUnit() === 'm') return node;
  return walk(node, opts);
}

function walk(node, opts) {
  if (typeof node === 'string') return localizeText(node, undefined, opts);
  if (Array.isArray(node)) return Children.map(node, (n) => walk(n, opts));
  if (isValidElement(node) && node.props?.children != null && (typeof node.type === 'string' || node.type === Fragment)) {
    return cloneElement(node, undefined, walk(node.props.children, opts));
  }
  return node;
}
