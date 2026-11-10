// @vitest-environment jsdom
// 점검에서 나온 화면 다듬기를 고정한다 — 신뢰도 배지 · 제목 정렬 · 안내 한 줄 · 다음 장 · 홈 누적 라운드 · 스코어카드 색 · 3퍼트/벌타 문장
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import ConfidenceBadge from './insights/ConfidenceBadge.jsx';
import KoEnTitle from './ui/KoEnTitle.jsx';
import ExcludedNote from './stats/ExcludedNote.jsx';
import { NextChapter } from './insights/Chapter.jsx';
import { StatsPanel } from './home/HomeCards.jsx';
import ScorecardTable from './analysis/ScorecardTable.jsx';
import OverviewTab from './stats/OverviewTab.jsx';
import { buildStatsReport } from '../engine/statsReport.js';
import { makeFullRound, played } from '../test/fixtures.js';
import styles from '../styles/styles';

afterEach(cleanup);
const ME = '테스터';

describe('신뢰도 배지', () => {
  it('큰 숫자 옆(full)에서는 "신뢰도 높음", 좁은 행에서는 짧게 두되 이름은 "신뢰도"로 붙는다', () => {
    const { container } = render(<><ConfidenceBadge tier="high" full /><ConfidenceBadge tier="mid" /></>);
    const [big, small] = container.querySelectorAll('[data-role="conf-badge"]');
    expect(big.textContent).toBe('신뢰도 높음');
    expect(small.textContent).toBe('중간');
    expect(small.getAttribute('aria-label')).toBe('신뢰도 중간');
    expect(small.getAttribute('title')).toBe('신뢰도 중간');
    expect(big.getAttribute('data-tier')).toBe('high');
  });
});

describe('섹션 제목 — 부모의 가운데 정렬을 물려받지 않는다', () => {
  it('제목은 왼쪽 정렬이고, 영문 이름 줄은 없다', () => {
    const { container } = render(<div style={{ textAlign: 'center' }}><KoEnTitle en="STRENGTHS" ko="잘한 점" /></div>);
    expect(container.querySelector('[data-role="title-ko"]').style.textAlign).toBe('left');
    expect(container.querySelector('[data-role="title-en"]')).toBeNull();
  });
});

describe('집계 제외 안내', () => {
  it('9홀 제외는 한 줄 문장이다 — 상자 없이 작은 글씨, 이유 괄호는 뺐다', () => {
    const { container } = render(<ExcludedNote nineCount={1} />);
    const note = container.querySelector('[data-role="excluded-note"]');
    expect(note.textContent).toBe('9홀 라운드 1개는 집계에서 제외돼요');
    expect(note.style.border).toBe('');
    expect(note.style.background).toBe('');
    expect(parseInt(note.style.fontSize, 10)).toBeGreaterThanOrEqual(12);
  });

  it('여러 명이 함께 한 라운드는 이유까지 말한다', () => {
    render(<ExcludedNote multiCount={2} />);
    expect(screen.getByText(/함께 기록한 라운드 2개는 집계에서 제외돼요 \(1인 라운드만 분석\)/)).toBeTruthy();
  });

  it('제외된 라운드가 없으면 아무것도 그리지 않는다', () => {
    const { container } = render(<ExcludedNote />);
    expect(container.firstChild).toBeNull();
  });
});

describe('다음 장 버튼', () => {
  it('숫자만 덩그러니 있지 않고 "다음 장" 뒤에 번호 배지와 장 이름이 온다', () => {
    const { container } = render(<NextChapter current="next" onGo={() => {}} />);
    const btn = container.querySelector('[data-role="next-chapter"]');
    expect(btn.textContent).toMatch(/^다음 장6기록$/);
    expect(btn.querySelector('[aria-hidden="true"]').textContent).toBe('6');
  });

  it('마지막 장에는 없다', () => {
    const { container } = render(<NextChapter current="records" onGo={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('홈 — 누적 라운드와 핸디캡 안내', () => {
  const hc = { index: -2, delta: null, count: 3, used: 1 };

  it('9홀 라운드가 있으면 누적 라운드 옆에 "9홀 N회 포함"을 적는다 (평균·핸디캡에서는 빠지므로)', () => {
    render(<StatsPanel loading={false} totalRounds={9} nineCount={1} avgScore="74.6" handicap={hc} />);
    expect(screen.getByText('9홀 1회 포함')).toBeTruthy();
  });

  it('9홀 라운드가 없으면 적지 않는다', () => {
    const { container } = render(<StatsPanel loading={false} totalRounds={8} nineCount={0} avgScore="74.6" handicap={hc} />);
    expect(container.querySelector('[data-role="home-nine-note"]')).toBeNull();
  });

  it('핸디캡 설명은 실제로 쓴 라운드 수를 말한다 (3라운드면 "3R 중 낮은 1R", "최근 20R 중 낮은 8R" 이 아니다)', () => {
    const { container } = render(<StatsPanel loading={false} totalRounds={3} avgScore="74" handicap={hc} />);
    expect(container.querySelector('[data-role="handicap-sub"]').textContent).toBe('3R 중 낮은 1R');
  });
});

describe('결과 스코어카드 — 글자색은 팔레트 색이다 (어두운 배경 위 짙은 회색이 아니다)', () => {
  const round = () => {
    const r = makeFullRound(1, ME);
    // 1번 홀 파 · 2번 홀 보기 · 3번 홀 버디(파3 에서 2타) · 4번 홀 더블(파5 에서 7타)
    const set = (i, strokes) => { r.holes[i].scores[ME] = played(r.holes[i].par, { strokes, putts: 2 }); };
    set(0, r.holes[0].par); set(1, r.holes[1].par + 1); set(2, r.holes[2].par - 1); set(3, r.holes[3].par + 2);
    return r;
  };

  const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`; };

  it('파 · 보기 · 버디 · 더블 숫자가 입력 화면과 같은 팔레트 색이고, 옛 색(#3a3a3a · #b8410a)은 없다', () => {
    const { container } = render(<ScorecardTable round={round()} player={ME} />);
    const markers = [...container.querySelectorAll('span')].filter((s) => s.style.width === '26px');   // 홀마다 하나 (scoreMarker)
    expect(markers.length).toBeGreaterThanOrEqual(4);
    const [par, bogey, birdie, dbl] = markers.slice(0, 4).map((m) => m.style.color);
    expect(par).toBe(rgb(styles.markerPar.color));
    expect(bogey).toBe(rgb(styles.markerBogey.color));
    expect(birdie).toBe(rgb(styles.markerBirdie.color));
    expect(dbl).toBe(rgb(styles.markerDouble.color));
    expect(markers.map((m) => m.style.color).join(' ')).not.toMatch(/58, 58, 58|184, 65, 10/);
  });

  it('입력하지 않은 홀의 "—" 만 흐리게 보이고, 그래도 글자 대비 4.5:1 이상인 색이다', () => {
    const r = round();
    delete r.holes[4].scores[ME].strokes;
    const { container } = render(<ScorecardTable round={r} player={ME} />);
    const dash = [...container.querySelectorAll('span')].find((s) => s.textContent.trim() === '—' && s.style.width === '26px');
    expect(dash).toBeTruthy();
    expect(dash.style.color).toBe(rgb('#4e5968'));   // #8896b0 on #111827 ≈ 5.4:1
  });
});

describe('스탯 종합 — 3퍼트와 벌타 문장', () => {
  const rounds = () => [1, 2, 3].map((i) => makeFullRound(i, ME));

  it('벌타가 없으면 "벌타보다 더" 처럼 없는 것과 견주지 않고, "−0.0타" 대신 "0타"를 보인다', () => {
    const report = buildStatsReport(rounds());
    expect(report.leaks.penaltyStrokesPerRound).toBeLessThan(0.15);
    expect(report.leaks.threePutt.extraStrokesPerRound).toBeGreaterThanOrEqual(0.15);
    const { container } = render(<OverviewTab report={report} onGo={() => {}} />);
    const text = container.textContent;
    expect(text).toMatch(/3퍼트로 라운드당 [\d.]+타를 잃어요\. 벌타로는 거의 잃지 않아요/);
    expect(text).not.toMatch(/벌타보다/);
    expect(container.querySelector('[data-role="leak-penalty-strokes"]').textContent).toBe('0타');
  });
});
