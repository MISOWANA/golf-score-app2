// 리포트 이미지 그리기 (canvas) — 라운드 요약 카드를 한 장의 PNG 로 만든다. 공유·저장용.
// 내용은 reportImageModel.js 가 정하고, 여기서는 위치와 글씨만 다룬다. 이미지에는 점수·요약만 들어가고
// 위치(GPS)·사용자 이름은 들어가지 않는다.

const W = 1080;
const PAD = 64;
const FONT = '"Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
const C = {
  bgTop: '#0b0e18', bgBottom: '#111a2c', card: '#141d30', line: '#243050',
  text: '#e8edf8', sub: '#a9b8d6', muted: '#7f93b3', gold: '#c9a228', goldHi: '#f3d36b',
  good: '#3db87a', bad: '#ef5350', flat: '#8896b0',
};
const toneColor = (t) => (t === 'good' ? C.good : t === 'bad' ? C.bad : C.flat);

const font = (weight, size) => `${weight} ${size}px ${FONT}`;

// 글자를 maxWidth 안에서 줄바꿈한다. 공백 기준으로 나누고, 한 단어가 넘치면 글자 단위로 자른다.
export function wrapLines(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  const push = () => { if (line) { lines.push(line); line = ''; } };
  String(text ?? '').split(/(\s+)/).forEach((token) => {
    if (!token) return;
    if (ctx.measureText(line + token).width <= maxWidth) { line += token; return; }
    if (/^\s+$/.test(token)) { push(); return; }
    push();
    // 단어 하나가 한 줄보다 길면 글자 단위
    let chunk = '';
    for (const ch of token) {
      if (ctx.measureText(chunk + ch).width > maxWidth && chunk) { lines.push(chunk); chunk = ''; }
      chunk += ch;
    }
    line = chunk;
  });
  push();
  return lines.map((l) => l.trimEnd());
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// 한 구역을 그리고 다음 y 를 돌려준다
function drawModel(ctx, m) {
  let y = PAD;
  ctx.textBaseline = 'alphabetic';

  // 브랜드 · 날짜
  ctx.fillStyle = C.gold; ctx.font = font(800, 26); ctx.textAlign = 'left';
  ctx.fillText('BIRDIE BUDDY', PAD, y + 22);
  ctx.fillStyle = C.muted; ctx.font = font(500, 26); ctx.textAlign = 'right';
  ctx.fillText(m.dateText, W - PAD, y + 22);
  ctx.textAlign = 'left';
  y += 70;

  // 코스 이름 · 종류
  ctx.fillStyle = C.text; ctx.font = font(800, 50);
  const titleLines = wrapLines(ctx, m.title, W - PAD * 2).slice(0, 2);
  titleLines.forEach((l, i) => ctx.fillText(l, PAD, y + 44 + i * 60));
  y += 44 + (titleLines.length - 1) * 60;
  ctx.fillStyle = C.sub; ctx.font = font(500, 28);
  ctx.fillText(m.kind, PAD, y + 44);
  y += 70;

  // 큰 점수 · 파 대비 · 전반/후반
  ctx.fillStyle = C.text; ctx.font = font(900, 150);
  ctx.fillText(String(m.score), PAD, y + 120);
  const scoreW = ctx.measureText(String(m.score)).width;
  ctx.fillStyle = m.diff > 0 ? C.bad : m.diff < 0 ? C.good : C.flat; ctx.font = font(800, 64);
  ctx.fillText(`(${m.diffText})`, PAD + scoreW + 24, y + 118);
  ctx.fillStyle = C.muted; ctx.font = font(500, 26);
  ctx.fillText(`파 ${m.par}`, PAD + scoreW + 28, y + 60);
  if (m.front != null && m.back != null) {
    ctx.textAlign = 'right'; ctx.fillStyle = C.sub; ctx.font = font(600, 30);
    ctx.fillText(`전반 ${m.front}  ·  후반 ${m.back}`, W - PAD, y + 118);
    ctx.textAlign = 'left';
  }
  y += 160;

  // 한 줄 총평
  ctx.fillStyle = C.text; ctx.font = font(700, 34);
  const head = wrapLines(ctx, m.headline, W - PAD * 2);
  head.forEach((l, i) => ctx.fillText(l, PAD, y + 34 + i * 50));
  y += head.length * 50 + 28;

  // 개인 기록 갱신 — 금색 알약, 한 줄에 다 안 들어가면 다음 줄로
  if (m.records.length) {
    let x = PAD;
    m.records.forEach((t) => {
      ctx.font = font(800, 28);
      const w = ctx.measureText(t).width + 44;
      if (x + w > W - PAD && x > PAD) { x = PAD; y += 58; }
      ctx.fillStyle = 'rgba(201,162,40,0.2)'; roundRect(ctx, x, y, w, 46, 23); ctx.fill();
      ctx.strokeStyle = 'rgba(201,162,40,0.65)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = C.goldHi; ctx.fillText(t, x + 22, y + 32);
      x += w + 12;
    });
    y += 74;
  }

  if (m.empty) {
    ctx.fillStyle = C.muted; ctx.font = font(500, 28);
    wrapLines(ctx, '입력한 홀이 없어 분석할 내용이 적어요.', W - PAD * 2).forEach((l, i) => ctx.fillText(l, PAD, y + 28 + i * 42));
    return y + 80;
  }

  // 잃은 타수
  if (m.loss.length) {
    ctx.font = font(700, 26); ctx.fillStyle = C.muted;
    ctx.fillText('잃은 타수', PAD, y + 34);
    let x = PAD + ctx.measureText('잃은 타수').width + 22;
    m.loss.forEach((t) => {
      ctx.font = font(800, 28);
      const w = ctx.measureText(t).width + 36;
      ctx.fillStyle = 'rgba(239,83,80,0.14)'; roundRect(ctx, x, y + 6, w, 44, 22); ctx.fill();
      ctx.strokeStyle = 'rgba(239,83,80,0.5)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = C.bad; ctx.fillText(t, x + 18, y + 38);
      x += w + 12;
    });
    y += 78;
  }

  // 평균 대비
  if (m.compare.length) {
    ctx.fillStyle = C.muted; ctx.font = font(700, 26);
    ctx.fillText(m.compareTitle, PAD, y + 28);
    y += 48;
    const gap = 12;
    const cw = (W - PAD * 2 - gap * (m.compare.length - 1)) / m.compare.length;
    m.compare.forEach((c, i) => {
      const x = PAD + i * (cw + gap);
      ctx.fillStyle = C.card; roundRect(ctx, x, y, cw, 128, 18); ctx.fill();
      ctx.textAlign = 'center';
      ctx.fillStyle = C.muted; ctx.font = font(700, 24); ctx.fillText(c.label, x + cw / 2, y + 36);
      ctx.fillStyle = C.text; ctx.font = font(800, 34); ctx.fillText(c.value, x + cw / 2, y + 80);
      ctx.fillStyle = toneColor(c.tone); ctx.font = font(800, 24); ctx.fillText(c.delta, x + cw / 2, y + 113);
      ctx.textAlign = 'left';
    });
    y += 128 + 36;
  }

  // 잘한 점 · 아쉬운 점
  const list = (title, color, items) => {
    if (!items.length) return;
    ctx.fillStyle = color; ctx.font = font(800, 30);
    ctx.fillText(title, PAD, y + 30);
    y += 52;
    items.forEach((t) => {
      ctx.font = font(600, 30);
      const lines = wrapLines(ctx, t, W - PAD * 2 - 36);
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(PAD + 8, y + 18, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.text;
      lines.forEach((l, i) => ctx.fillText(l, PAD + 36, y + 28 + i * 42));
      y += lines.length * 42 + 10;
    });
    y += 18;
  };
  list('잘한 점', C.good, m.strengths);
  list('아쉬운 점', C.bad, m.issues);

  // 다음 포커스
  if (m.focus) {
    ctx.font = font(600, 28);
    const lines = wrapLines(ctx, m.focus, W - PAD * 2 - 56);
    const h = 74 + lines.length * 42;
    ctx.fillStyle = 'rgba(201,162,40,0.12)'; roundRect(ctx, PAD, y, W - PAD * 2, h, 20); ctx.fill();
    ctx.strokeStyle = 'rgba(201,162,40,0.45)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = C.gold; ctx.font = font(800, 28); ctx.fillText('다음 포커스', PAD + 28, y + 46);
    ctx.fillStyle = C.text; ctx.font = font(600, 28);
    lines.forEach((l, i) => ctx.fillText(l, PAD + 28, y + 90 + i * 42));
    y += h + 28;
  }
  return y;
}

// 이미지가 쓰는 글꼴이 준비되도록 기다린다 (없으면 대체 글꼴로 그려진다)
async function ensureFonts() {
  try {
    if (!document.fonts?.load) return;
    await Promise.all([500, 600, 700, 800, 900].map((w) => document.fonts.load(`${w} 30px "Noto Sans KR"`, '가나다ABC123')));
  } catch { /* 글꼴을 못 불러와도 대체 글꼴로 그린다 */ }
}

// 모델 → PNG Blob. 내용의 높이를 먼저 재고(안 보이는 큰 캔버스에 한 번 그려 본다), 그 높이의 캔버스에 배경과 함께 다시 그린다.
export async function renderReportImage(model) {
  await ensureFonts();
  const scratch = document.createElement('canvas');
  scratch.width = W; scratch.height = 3600;
  const endY = drawModel(scratch.getContext('2d'), model);
  const H = Math.ceil(endY + 90);

  const out = document.createElement('canvas');
  out.width = W; out.height = H;
  const o = out.getContext('2d');
  const grad = o.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, C.bgTop); grad.addColorStop(1, C.bgBottom);
  o.fillStyle = grad; o.fillRect(0, 0, W, H);
  const glow = o.createRadialGradient(W, 0, 10, W, 0, 520);   // 오른쪽 위 금색 번짐
  glow.addColorStop(0, 'rgba(201,162,40,0.22)'); glow.addColorStop(1, 'rgba(201,162,40,0)');
  o.fillStyle = glow; o.fillRect(0, 0, W, H);

  drawModel(o, model);

  o.fillStyle = C.line; o.fillRect(PAD, H - 70, W - PAD * 2, 2);
  o.fillStyle = C.muted; o.font = font(600, 24); o.textAlign = 'left';
  o.fillText('Birdie Buddy · 골프 라운드 분석', PAD, H - 28);

  return new Promise((resolve, reject) => {
    out.toBlob((b) => (b ? resolve(b) : reject(new Error('이미지를 만들지 못했어요'))), 'image/png');
  });
}
