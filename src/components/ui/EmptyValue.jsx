// 값이 아직 없을 때 큰 숫자 자리에 놓는 표시 — 굵은 글자 "—" 대신 양 끝이 옅어지는 가는 막대.
// 거리 칸(SwipeDistance) · 그린 스피드 · 지도 거리처럼 30px 안팎의 숫자가 들어갈 자리에서 쓴다. 단위 글자는 값이 있을 때만 붙인다.
// 숫자 한 줄을 대신하는 한 줄짜리 블록이다 — height 는 숫자 줄보다 조금 낮게 잡아, 가는 막대와 아래 안내 글 사이가 벌어져 보이지 않게 한다.
export default function EmptyValue({ width = 30, height = 28, label = '미입력' }) {
  return (
    <span role="img" aria-label={label} data-role="empty-value"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height }}>
      <span aria-hidden="true"
        style={{
          display: 'block', width, height: 3, borderRadius: 2,
          background: 'linear-gradient(90deg, rgba(110,132,168,0.1), rgba(110,132,168,0.75) 30%, rgba(110,132,168,0.75) 70%, rgba(110,132,168,0.1))',
        }} />
    </span>
  );
}
