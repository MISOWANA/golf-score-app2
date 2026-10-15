import { withCategory } from './category.js';

// 홀 단위 인사이트 룰. 조건은 모두 AND. priority가 작을수록 앞에 나온다.
// 퍼트 거리·샷 단위 지표(puttCause, firstPuttDist, teePenalty …)는 metrics.buildDerivedHoleMetrics가 만든다.
// 3퍼트는 원인을 퍼트 거리로 구분하며, 거리 기록이 없으면 어느 쪽이라고 단정하지 않는다.
const RAW_HOLE_RULES = [
  // ═══ 스코어 ═══════════════════════════════════════════════════════════════
  {
    id: 'H001', scope: 'hole', priority: 10, enabled: true,
    conditions: [{ field: 'scoreCategory', operator: 'eq', value: 'hole_in_one' }],
    result: {
      insightType: 'hole_in_one', severity: 'positive',
      title: '홀인원!',
      summaryTemplate: '{holeNumber}번 홀에서 홀인원을 기록했습니다!',
      recommendationTemplate: '골프 인생 최고의 순간을 기억하세요.',
      tags: ['score', 'milestone'],
    },
  },
  {
    id: 'H002', scope: 'hole', priority: 20, enabled: true,
    conditions: [{ field: 'scoreCategory', operator: 'in', value: ['eagle', 'albatross'] }],
    result: {
      insightType: 'eagle_plus', severity: 'positive',
      title: '이글 이상',
      summaryTemplate: '{holeNumber}번 홀(파{par})에서 {scoreToPar}타를 기록했습니다.',
      recommendationTemplate: '이 홀의 공략 전략을 기억해두세요.',
      tags: ['score', 'eagle'],
    },
  },
  {
    id: 'H003', scope: 'hole', priority: 30, enabled: true,
    conditions: [{ field: 'scoreCategory', operator: 'eq', value: 'birdie' }],
    result: {
      insightType: 'birdie', severity: 'positive',
      title: '버디',
      summaryTemplate: '{holeNumber}번 홀에서 버디를 잡았습니다.',
      recommendationTemplate: '무엇이 잘 됐는지 기억해두세요.',
      tags: ['score', 'birdie'],
    },
  },
  {
    id: 'H004', scope: 'hole', priority: 40, enabled: true,
    conditions: [
      { field: 'scoreCategory',    operator: 'eq', value: 'par' },
      { field: 'girResultCategory', operator: 'eq', value: 'no_gir_save' },
    ],
    result: {
      insightType: 'par_save', severity: 'positive',
      title: '파 세이브',
      summaryTemplate: '{holeNumber}번 홀에서 그린을 놓쳤지만 파를 지켰습니다.',
      recommendationTemplate: '쇼트게임 능력이 빛났습니다.',
      tags: ['recovery', 'short_game'],
    },
  },
  {
    id: 'H005', scope: 'hole', priority: 44, enabled: true,
    conditions: [
      { field: 'scoreCategory', operator: 'eq', value: 'par'      },
      { field: 'gir',           operator: 'eq', value: true       },
      { field: 'puttCategory',  operator: 'eq', value: 'two_putt' },
    ],
    result: {
      insightType: 'textbook_par', severity: 'positive',
      title: '교과서 파',
      summaryTemplate: '{holeNumber}번 홀에서 GIR + 2퍼트로 깔끔하게 파를 기록했습니다.',
      recommendationTemplate: '안정적인 플레이를 유지하세요.',
      tags: ['score', 'gir', 'clean'],
    },
  },
  {
    id: 'H006', scope: 'hole', priority: 50, enabled: true,
    conditions: [
      { field: 'scoreCategory', operator: 'eq', value: 'bogey' },
      { field: 'hasPenalty',    operator: 'eq', value: false   },
    ],
    result: {
      insightType: 'bogey_clean', severity: 'neutral',
      title: '보기 (페널티 없음)',
      summaryTemplate: '{holeNumber}번 홀에서 페널티 없이 보기를 기록했습니다.',
      recommendationTemplate: '어프로치 또는 퍼팅 개선으로 파 세이브 비율을 높여보세요.',
      tags: ['score', 'bogey'],
    },
  },
  {
    id: 'H007', scope: 'hole', priority: 60, enabled: true,
    conditions: [
      { field: 'scoreCategory', operator: 'eq', value: 'double' },
      { field: 'hasPenalty',    operator: 'eq', value: false    },
    ],
    result: {
      insightType: 'double_no_penalty', severity: 'warning',
      title: '더블보기 (페널티 없음)',
      summaryTemplate: '{holeNumber}번 홀에서 페널티 없이 더블보기를 기록했습니다.',
      recommendationTemplate: '퍼팅 또는 어프로치를 점검하세요.',
      tags: ['score', 'double'],
    },
  },
  {
    id: 'H008', scope: 'hole', priority: 70, enabled: true,
    conditions: [{ field: 'scoreCategory', operator: 'eq', value: 'triple_plus' }],
    result: {
      insightType: 'triple_plus', severity: 'critical',
      title: '트리플 이상 — 빅 넘버',
      summaryTemplate: '{holeNumber}번 홀에서 파+{scoreToPar}를 기록했습니다.',
      recommendationTemplate: '연속 실수를 끊는 것이 핵심입니다. 실수 직후 무리한 회복 시도를 피하세요.',
      tags: ['score', 'damage', 'critical'],
    },
  },
  {
    id: 'H009', scope: 'hole', priority: 33, enabled: true,
    conditions: [
      { field: 'par',        operator: 'eq',  value: 5 },
      { field: 'scoreToPar', operator: 'lte', value: 0 },
    ],
    result: {
      insightType: 'par5_birdie_plus', severity: 'positive',
      title: '파5 기회 활용',
      summaryTemplate: '{holeNumber}번 파5 홀에서 파 이상을 기록했습니다.',
      recommendationTemplate: '파5 버디 전략을 꾸준히 유지하세요.',
      tags: ['par5', 'opportunity'],
    },
  },
  {
    id: 'H010', scope: 'hole', priority: 65, enabled: true,
    conditions: [
      { field: 'par',        operator: 'eq',  value: 3 },
      { field: 'scoreToPar', operator: 'gte', value: 2 },
    ],
    result: {
      insightType: 'par3_double_plus', severity: 'warning',
      title: '파3 더블 이상',
      summaryTemplate: '{holeNumber}번 파3 홀에서 더블 이상을 기록했습니다.',
      recommendationTemplate: '파3에서는 핀보다 그린 중앙을 목표로 하여 큰 미스를 방지하세요.',
      tags: ['par3', 'damage'],
    },
  },
  {
    id: 'H011', scope: 'hole', priority: 44, enabled: true,
    conditions: [
      { field: 'par', operator: 'eq', value: 3 },
      { field: 'gir', operator: 'eq', value: true },
    ],
    result: {
      insightType: 'par3_gir', severity: 'positive',
      title: '파3 원온',
      summaryTemplate: '{holeNumber}번 파3 홀에서 원온에 성공했습니다.',
      recommendationTemplate: '버디 퍼트에 집중하세요.',
      tags: ['par3', 'gir'],
    },
  },

  // ═══ 퍼팅 ═════════════════════════════════════════════════════════════════
  {
    id: 'H012', scope: 'hole', priority: 25, enabled: true,
    conditions: [
      { field: 'puttCategory',  operator: 'eq', value: 'one_putt' },
      { field: 'scoreCategory', operator: 'eq', value: 'birdie'   },
    ],
    result: {
      insightType: 'birdie_putt', severity: 'positive',
      title: '버디 퍼트 성공',
      summaryTemplate: '{holeNumber}번 홀에서 버디 퍼트를 넣었습니다.',
      recommendationTemplate: '퍼팅 자신감을 유지하세요.',
      tags: ['putting', 'birdie'],
    },
  },
  {
    id: 'H013', scope: 'hole', priority: 38, enabled: true,
    conditions: [
      { field: 'puttCategory',  operator: 'eq', value: 'one_putt' },
      { field: 'scoreCategory', operator: 'eq', value: 'par'      },
    ],
    result: {
      insightType: 'one_putt_par', severity: 'positive',
      title: '원 퍼트 파 세이브',
      summaryTemplate: '{holeNumber}번 홀에서 원 퍼트로 파를 지켰습니다.',
      recommendationTemplate: '쇼트 퍼트 집중력이 훌륭합니다.',
      tags: ['putting', 'save'],
    },
  },

  // ── 3퍼트 이상: 원인을 퍼트 거리로 구분한다 (거리 기록이 없으면 판단 보류) ──
  {
    id: 'H014', scope: 'hole', priority: 80, enabled: true,
    conditions: [
      { field: 'puttCategory', operator: 'eq', value: 'three_putt_plus' },
      { field: 'puttCause',    operator: 'eq', value: 'unknown' },
    ],
    result: {
      insightType: 'three_putt_unknown', severity: 'warning', category: 'putting',
      title: '3퍼트 — 원인 판단 보류',
      summaryTemplate: '{holeNumber}번 홀에서 {threePuttPrefix}3퍼트가 났습니다. {puttCauseDetail}',
      recommendationTemplate: '{puttCauseAdvice}',
      tags: ['putting', 'three_putt', 'data'],
    },
  },
  {
    id: 'H034', scope: 'hole', priority: 79, enabled: true,
    conditions: [
      { field: 'puttCause',      operator: 'eq', value: 'lag' },
      { field: 'puttConfidence', operator: 'eq', value: 'measured' },
    ],
    result: {
      insightType: 'three_putt_lag', severity: 'warning', category: 'putting',
      title: '3퍼트 — 거리감 (롱 퍼트)',
      summaryTemplate: '{holeNumber}번 홀 {threePuttPrefix}3퍼트 (퍼트 {puttLine}): {puttCauseDetail}',
      recommendationTemplate: '{puttCauseAdvice}',
      tags: ['putting', 'three_putt', 'lag', 'distance_control'],
    },
  },
  {
    id: 'H035', scope: 'hole', priority: 81, enabled: true,
    conditions: [
      { field: 'puttCause',      operator: 'eq', value: 'lag' },
      { field: 'puttConfidence', operator: 'eq', value: 'inferred' },
    ],
    result: {
      insightType: 'three_putt_lag_likely', severity: 'warning', category: 'putting',
      title: '3퍼트 — 거리감 가능성 (남은 거리 미기록)',
      summaryTemplate: '{holeNumber}번 홀 {threePuttPrefix}3퍼트: {puttCauseDetail}',
      recommendationTemplate: '{puttCauseAdvice}',
      tags: ['putting', 'three_putt', 'lag', 'data'],
    },
  },
  {
    id: 'H036', scope: 'hole', priority: 79, enabled: true,
    conditions: [{ field: 'puttCause', operator: 'eq', value: 'short' }],
    result: {
      insightType: 'three_putt_short', severity: 'warning', category: 'putting',
      title: '3퍼트 — 숏퍼트 미스',
      summaryTemplate: '{holeNumber}번 홀 {threePuttPrefix}3퍼트 (퍼트 {puttLine}): {puttCauseDetail}',
      recommendationTemplate: '{puttCauseAdvice}',
      tags: ['putting', 'three_putt', 'short_putt'],
    },
  },
  {
    id: 'H037', scope: 'hole', priority: 78, enabled: true,
    conditions: [{ field: 'puttCause', operator: 'eq', value: 'both' }],
    result: {
      insightType: 'three_putt_both', severity: 'critical', category: 'putting',
      title: '3퍼트 이상 — 거리감 + 숏퍼트 미스',
      summaryTemplate: '{holeNumber}번 홀 {threePuttPrefix}3퍼트 이상 (퍼트 {puttLine}): {puttCauseDetail}',
      recommendationTemplate: '{puttCauseAdvice}',
      tags: ['putting', 'three_putt', 'lag', 'short_putt'],
    },
  },
  {
    id: 'H038', scope: 'hole', priority: 82, enabled: true,
    conditions: [{ field: 'puttCause', operator: 'eq', value: 'mid' }],
    result: {
      insightType: 'three_putt_mid', severity: 'warning', category: 'putting',
      title: '3퍼트 — 중거리 퍼트 (라인·속도)',
      summaryTemplate: '{holeNumber}번 홀 {threePuttPrefix}3퍼트 (퍼트 {puttLine}): {puttCauseDetail}',
      recommendationTemplate: '{puttCauseAdvice}',
      tags: ['putting', 'three_putt', 'mid_putt'],
    },
  },
  {
    id: 'H039', scope: 'hole', priority: 82, enabled: true,
    conditions: [{ field: 'puttCause', operator: 'eq', value: 'close' }],
    result: {
      insightType: 'three_putt_close', severity: 'warning', category: 'putting',
      title: '3퍼트 — 가까운 거리에서 시작',
      summaryTemplate: '{holeNumber}번 홀 {threePuttPrefix}3퍼트 (퍼트 {puttLine}): {puttCauseDetail}',
      recommendationTemplate: '{puttCauseAdvice}',
      tags: ['putting', 'three_putt', 'close_putt'],
    },
  },
  {
    id: 'H040', scope: 'hole', priority: 77, enabled: true,
    conditions: [{ field: 'putts', operator: 'gte', value: 4 }],
    result: {
      insightType: 'four_putt', severity: 'critical', category: 'putting',
      title: '4퍼트 이상',
      summaryTemplate: '{holeNumber}번 홀에서 {putts}퍼트를 기록했습니다. {puttLineSuffix}',
      recommendationTemplate: '한 번 크게 남기면 연쇄로 이어집니다. 긴 퍼트는 2퍼트 목표, 짧은 퍼트는 루틴을 지켜 반드시 마무리하세요.',
      tags: ['putting', 'three_putt', 'damage'],
    },
  },

  // ── 퍼팅 · 긍정/기회 ──
  {
    id: 'H041', scope: 'hole', priority: 36, enabled: true,
    conditions: [{ field: 'longPuttMade', operator: 'eq', value: true }],
    result: {
      insightType: 'long_putt_made', severity: 'positive', category: 'putting',
      title: '롱 퍼트 성공',
      summaryTemplate: '{holeNumber}번 홀에서 {firstPuttDistStr} 롱 퍼트를 한 번에 넣었습니다.',
      recommendationTemplate: '이때의 속도 감각(스트로크 크기)을 기억해 두세요.',
      tags: ['putting', 'long_putt'],
    },
  },
  {
    id: 'H042', scope: 'hole', priority: 37, enabled: true,
    conditions: [{ field: 'lagGreat', operator: 'eq', value: true }],
    result: {
      insightType: 'lag_putt_great', severity: 'positive', category: 'putting',
      title: '롱 퍼트 거리 컨트롤 훌륭',
      summaryTemplate: '{holeNumber}번 홀에서 {firstPuttDistStr} 롱 퍼트를 {leaveDistStr}만 남기고 마무리했습니다.',
      recommendationTemplate: '롱 퍼트에서는 이 감각 그대로 1m 원 안에 세우는 데 집중하세요.',
      tags: ['putting', 'long_putt', 'distance_control'],
    },
  },
  {
    id: 'H043', scope: 'hole', priority: 66, enabled: true,
    conditions: [{ field: 'birdieChanceMissed', operator: 'eq', value: true }],
    result: {
      insightType: 'birdie_chance_missed', severity: 'neutral', category: 'putting',
      title: '버디 기회 놓침 (3m 이내)',
      summaryTemplate: '{holeNumber}번 홀에서 그린을 잡고 첫 퍼트가 {firstPuttDistStr}였지만 버디로 이어지지 못했습니다 (퍼트 {puttLine}).',
      recommendationTemplate: '3m 이내 첫 퍼트는 공격적으로 홀을 노리되, 놓쳤을 때를 대비해 홀 뒤 50cm 안으로 속도를 맞추세요.',
      tags: ['putting', 'birdie_chance'],
    },
  },
  {
    id: 'H044', scope: 'hole', priority: 46, enabled: true,
    conditions: [{ field: 'approachClose', operator: 'eq', value: true }],
    result: {
      insightType: 'approach_close', severity: 'positive', category: 'approach',
      title: '어프로치 근접',
      summaryTemplate: '{holeNumber}번 홀에서 온그린 후 첫 퍼트가 {firstPuttDistStr} — 핀 가까이 붙였습니다.',
      recommendationTemplate: '이 클럽·라인 선택을 기억해 두세요.',
      tags: ['approach', 'gir', 'proximity'],
    },
  },
  {
    id: 'H045', scope: 'hole', priority: 56, enabled: true,
    conditions: [{ field: 'approachFar', operator: 'eq', value: true }],
    result: {
      insightType: 'approach_far_green', severity: 'neutral', category: 'approach',
      title: '그린은 잡았지만 핀과 멂',
      summaryTemplate: '{holeNumber}번 홀에서 온그린 후 첫 퍼트가 {firstPuttDistStr}로 길었습니다.',
      recommendationTemplate: '핀이 먼 위치에서는 2퍼트가 목표입니다. 첫 퍼트는 홀 옆 1m 원 안에 세우는 데 집중하세요.',
      tags: ['approach', 'gir', 'proximity', 'putting'],
    },
  },
  {
    id: 'H046', scope: 'hole', priority: 41, enabled: true,
    conditions: [{ field: 'upAndDown', operator: 'eq', value: true }],
    result: {
      insightType: 'up_and_down', severity: 'positive', category: 'shortgame',
      title: '업앤다운 성공',
      summaryTemplate: '{holeNumber}번 홀에서 그린을 놓치고도 원 퍼트로 파 이상을 지켰습니다.',
      recommendationTemplate: '그린 주변 칩샷을 홀 가까이 붙이는 감각이 좋았습니다.',
      tags: ['short_game', 'scramble'],
    },
  },
  {
    id: 'H047', scope: 'hole', priority: 19, enabled: true,
    conditions: [{ field: 'chipIn', operator: 'eq', value: true }],
    result: {
      insightType: 'chip_in', severity: 'positive', category: 'shortgame',
      title: '칩인',
      summaryTemplate: '{holeNumber}번 홀에서 그린 밖에서 바로 홀인했습니다.',
      recommendationTemplate: '좋은 샷이었습니다. 이 라이·클럽 선택을 기억해 두세요.',
      tags: ['short_game', 'chip_in'],
    },
  },
  {
    id: 'H048', scope: 'hole', priority: 69, enabled: true,
    conditions: [{ field: 'shortGameFail', operator: 'eq', value: true }],
    result: {
      insightType: 'short_game_fail', severity: 'warning', category: 'shortgame',
      title: '그린 주변에서 파 세이브 실패',
      summaryTemplate: '{holeNumber}번 홀에서 그린을 놓친 뒤 {putts}퍼트로 파 세이브에 실패했습니다.',
      recommendationTemplate: '그린 주변에서는 홀을 직접 노리기보다 첫 퍼트를 2m 안에 남기는 낮은 구르는 샷을 먼저 고려하세요.',
      tags: ['short_game', 'scramble'],
    },
  },

  // ═══ 페널티 ═══════════════════════════════════════════════════════════════
  {
    id: 'H016', scope: 'hole', priority: 90, enabled: true,
    conditions: [{ field: 'obCount', operator: 'gte', value: 1 }],
    result: {
      insightType: 'ob', severity: 'critical',
      title: 'OB 발생',
      summaryTemplate: '{holeNumber}번 홀에서 OB {obCount}회가 발생했습니다.',
      recommendationTemplate: 'OB가 잦은 홀에서는 드라이버 대신 페어웨이 우드 또는 유틸리티로 안전하게 공략하세요.',
      tags: ['penalty', 'ob'],
    },
  },
  {
    id: 'H017', scope: 'hole', priority: 95, enabled: true,
    conditions: [{ field: 'obCount', operator: 'gte', value: 2 }],
    result: {
      insightType: 'multi_ob', severity: 'critical',
      title: 'OB 2회 이상',
      summaryTemplate: '{holeNumber}번 홀에서 OB {obCount}회로 큰 스코어 손실이 발생했습니다.',
      recommendationTemplate: 'OB가 반복되면 즉시 클럽을 낮추고 안전 루트를 선택하세요.',
      tags: ['penalty', 'ob', 'critical'],
    },
  },
  {
    id: 'H018', scope: 'hole', priority: 88, enabled: true,
    conditions: [{ field: 'hazardCount', operator: 'gte', value: 1 }],
    result: {
      insightType: 'hazard', severity: 'warning',
      title: '해저드 페널티',
      summaryTemplate: '{holeNumber}번 홀에서 해저드 페널티 {hazardCount}회가 발생했습니다.',
      recommendationTemplate: '해저드 앞에서는 핀보다 안전 지점을 목표로 하세요.',
      tags: ['penalty', 'hazard'],
    },
  },
  {
    id: 'H033', scope: 'hole', priority: 89, enabled: true,
    conditions: [{ field: 'unplayableCount', operator: 'gte', value: 1 }],
    result: {
      insightType: 'unplayable', severity: 'warning',
      title: '언플레이어블',
      summaryTemplate: '{holeNumber}번 홀에서 언플레이어블 {unplayableCount}회로 1벌타를 받았습니다.',
      recommendationTemplate: '나무·러프 깊은 곳에서는 무리한 탈출보다 안전하게 페어웨이로 빼는 선택이 더 싸게 먹힙니다.',
      tags: ['penalty', 'unplayable'],
    },
  },
  {
    id: 'H019', scope: 'hole', priority: 55, enabled: true,
    conditions: [
      { field: 'hasPenalty', operator: 'eq',  value: true },
      { field: 'scoreToPar', operator: 'lte', value: 1   },
    ],
    result: {
      insightType: 'penalty_recovery', severity: 'positive',
      title: '페널티 후 선방',
      summaryTemplate: '{holeNumber}번 홀에서 페널티에도 불구하고 보기 이내로 마무리했습니다.',
      recommendationTemplate: '페널티 후 침착한 회복은 큰 손실을 막는 핵심입니다.',
      tags: ['penalty', 'recovery'],
    },
  },
  {
    id: 'H020', scope: 'hole', priority: 62, enabled: true,
    conditions: [
      { field: 'hasPenalty', operator: 'eq',  value: true },
      { field: 'scoreToPar', operator: 'gte', value: 2   },
    ],
    result: {
      insightType: 'penalty_compound', severity: 'critical',
      title: '페널티 + 더블 이상 — 복합 손실',
      summaryTemplate: '{holeNumber}번 홀에서 페널티와 더블 이상이 겹쳤습니다.',
      recommendationTemplate: '페널티 직후 무리한 공략이 스코어를 키웁니다. 즉시 수비적 플레이로 전환하세요.',
      tags: ['penalty', 'compound', 'critical'],
    },
  },
  {
    id: 'H049', scope: 'hole', priority: 91, enabled: true,
    conditions: [{ field: 'driverPenalty', operator: 'eq', value: true }],
    result: {
      insightType: 'driver_penalty', severity: 'critical', category: 'penalty',
      title: '드라이버 티샷에서 페널티',
      summaryTemplate: '{holeNumber}번 홀에서 드라이버 티샷이 {teePenaltyTypeLabel} 페널티로 이어졌습니다.',
      recommendationTemplate: '이 홀은 드라이버 대신 우드·유틸리티로 페어웨이를 먼저 확보하는 전략을 고려하세요.',
      tags: ['penalty', 'tee_shot', 'driver'],
    },
  },
  {
    id: 'H050', scope: 'hole', priority: 92, enabled: true,
    conditions: [{ field: 'teePenaltyNonDriver', operator: 'eq', value: true }],
    result: {
      insightType: 'tee_penalty_other_club', severity: 'warning', category: 'penalty',
      title: '티샷 페널티 (드라이버 외 클럽)',
      summaryTemplate: '{holeNumber}번 홀에서 {teeClub} 티샷이 {teePenaltyTypeLabel} 페널티가 됐습니다.',
      recommendationTemplate: '클럽을 낮췄는데도 페널티가 났다면 클럽보다 방향·정렬(타깃 라인)을 먼저 점검하세요.',
      tags: ['penalty', 'tee_shot'],
    },
  },
  {
    id: 'H051', scope: 'hole', priority: 87, enabled: true,
    conditions: [{ field: 'approachPenalty', operator: 'eq', value: true }],
    result: {
      insightType: 'approach_penalty', severity: 'warning', category: 'penalty',
      title: '어프로치 구간 페널티',
      summaryTemplate: '{holeNumber}번 홀에서 세컨 샷 이후 {penaltyTypeLabel} 페널티가 났습니다.',
      recommendationTemplate: '그린 앞뒤에 위험 지역이 있다면 핀보다 그린 중앙·안전 구간을 목표로 하고 한 클럽 여유를 두세요.',
      tags: ['penalty', 'approach'],
    },
  },
  {
    id: 'H052', scope: 'hole', priority: 93, enabled: true,
    conditions: [{ field: 'penaltyEvents', operator: 'gte', value: 2 }],
    result: {
      insightType: 'penalty_multi', severity: 'critical', category: 'penalty',
      title: '한 홀에서 페널티 2회 이상',
      summaryTemplate: '{holeNumber}번 홀에서 페널티가 {penaltyEvents}회 났습니다.',
      recommendationTemplate: '첫 페널티 뒤에는 만회하려 하지 말고 한 타를 더 잃더라도 가장 안전한 위치로 보내는 것이 총 타수를 줄입니다.',
      tags: ['penalty', 'damage', 'critical'],
    },
  },
  {
    id: 'H053', scope: 'hole', priority: 57, enabled: true,
    conditions: [{ field: 'obForwardCount', operator: 'gte', value: 1 }],
    result: {
      insightType: 'ob_tee_choice', severity: 'neutral', category: 'penalty',
      title: 'OB — OB티 선택',
      summaryTemplate: '{holeNumber}번 홀 OB 후 지정된 특설티(OB티)에서 쳤습니다 (2벌타 상당, 다음 샷 4번째).',
      recommendationTemplate: '스트로크와 거리(1벌타 + 다시 치기)와 타수는 같지만 위치가 앞으로 가므로 코스에 특설티가 있으면 유리합니다.',
      tags: ['penalty', 'ob', 'relief'],
    },
  },
  {
    id: 'H054', scope: 'hole', priority: 57, enabled: true,
    conditions: [{ field: 'obReplayCount', operator: 'gte', value: 1 }],
    result: {
      insightType: 'ob_stroke_distance', severity: 'neutral', category: 'penalty',
      title: 'OB — 스트로크와 거리',
      summaryTemplate: '{holeNumber}번 홀 OB 후 직전 샷 지점에서 다시 쳤습니다 (1벌타 + 다시 친 샷).',
      recommendationTemplate: '다시 치는 샷은 같은 클럽을 반복하기보다 안전한 클럽으로 페어웨이를 먼저 확보하는 편이 낫습니다.',
      tags: ['penalty', 'ob', 'relief'],
    },
  },

  // ═══ GIR / 그린 ═══════════════════════════════════════════════════════════
  {
    id: 'H021', scope: 'hole', priority: 45, enabled: true,
    conditions: [
      { field: 'gir',        operator: 'eq',  value: true },
      { field: 'scoreToPar', operator: 'lte', value: 0   },
    ],
    result: {
      insightType: 'gir_success', severity: 'positive',
      title: 'GIR 성공',
      summaryTemplate: '{holeNumber}번 홀에서 규정 타수 내 그린을 적중했습니다.',
      recommendationTemplate: 'GIR을 꾸준히 유지하면 스코어 안정성이 높아집니다.',
      tags: ['gir', 'iron'],
    },
  },
  {
    id: 'H022', scope: 'hole', priority: 42, enabled: true,
    conditions: [{ field: 'girResultCategory', operator: 'eq', value: 'no_gir_save' }],
    result: {
      insightType: 'short_game_save', severity: 'positive',
      title: '쇼트게임 세이브',
      summaryTemplate: '{holeNumber}번 홀에서 그린을 놓쳤지만 파 이상을 기록했습니다.',
      recommendationTemplate: '어프로치와 칩샷 능력이 강점입니다.',
      tags: ['gir', 'short_game'],
    },
  },
  {
    id: 'H023', scope: 'hole', priority: 67, enabled: true,
    conditions: [
      { field: 'gir',        operator: 'eq',  value: false },
      { field: 'scoreToPar', operator: 'gte', value: 2    },
    ],
    result: {
      insightType: 'no_gir_double', severity: 'critical',
      title: 'GIR 실패 + 더블 이상',
      summaryTemplate: '{holeNumber}번 홀에서 그린을 놓치고 더블 이상을 기록했습니다.',
      recommendationTemplate: 'GIR 미스 후 핀보다 파 세이브 가능한 위치를 목표로 하세요.',
      tags: ['gir', 'damage'],
    },
  },
  {
    id: 'H024', scope: 'hole', priority: 52, enabled: true,
    conditions: [{ field: 'greenMissDirection', operator: 'eq', value: 'short' }],
    result: {
      insightType: 'green_miss_short', severity: 'neutral',
      title: '그린 숏 미스',
      summaryTemplate: '{holeNumber}번 홀에서 그린을 짧게 놓쳤습니다.',
      recommendationTemplate: '클럽 선택이 문제일 수 있습니다. 같은 상황에서 한 클럽 더 잡는 것을 고려하세요.',
      tags: ['gir', 'green_miss', 'short'],
    },
  },
  {
    id: 'H025', scope: 'hole', priority: 53, enabled: true,
    conditions: [{ field: 'greenMissDirection', operator: 'eq', value: 'long' }],
    result: {
      insightType: 'green_miss_long', severity: 'neutral',
      title: '그린 오버',
      summaryTemplate: '{holeNumber}번 홀에서 그린을 오버했습니다.',
      recommendationTemplate: '핀보다 그린 중앙을 목표로 하면 오버를 줄일 수 있습니다.',
      tags: ['gir', 'green_miss', 'long'],
    },
  },
  {
    id: 'H026', scope: 'hole', priority: 54, enabled: true,
    conditions: [{ field: 'greenMissDirection', operator: 'in', value: ['left', 'right'] }],
    result: {
      insightType: 'green_miss_lateral', severity: 'neutral',
      title: '그린 좌우 미스',
      summaryTemplate: '{holeNumber}번 홀에서 그린을 {greenMissDirection} 방향으로 놓쳤습니다.',
      recommendationTemplate: '같은 방향 반복 미스라면 정렬 또는 스윙 패스를 점검하세요.',
      tags: ['gir', 'green_miss', 'lateral'],
    },
  },
  {
    id: 'H059', scope: 'hole', priority: 34, enabled: true,
    conditions: [{ field: 'par5TwoOn', operator: 'eq', value: true }],
    result: {
      insightType: 'par5_two_on', severity: 'positive', category: 'approach',
      title: '파5 2온 성공',
      summaryTemplate: '{holeNumber}번 파5 홀에서 두 번째 샷으로 그린에 올렸습니다.',
      recommendationTemplate: '2온이 가능한 날의 컨디션·클럽 선택을 기록해 두세요.',
      tags: ['par5', 'approach', 'opportunity'],
    },
  },

  // ═══ 티샷 ═════════════════════════════════════════════════════════════════
  {
    id: 'H027', scope: 'hole', priority: 75, enabled: true,
    conditions: [{ field: 'teeMissCategory', operator: 'eq', value: 'severe_left' }],
    result: {
      insightType: 'tee_hook', severity: 'critical',
      title: '훅 — 심각한 좌측 미스',
      summaryTemplate: '{holeNumber}번 홀에서 훅으로 좌측으로 크게 벗어났습니다.',
      recommendationTemplate: '훅은 클럽 페이스가 닫힌 채 임팩트됩니다. 그립과 백스윙 오버스윙을 점검하세요.',
      tags: ['tee_shot', 'hook'],
    },
  },
  {
    id: 'H028', scope: 'hole', priority: 75, enabled: true,
    conditions: [{ field: 'teeMissCategory', operator: 'eq', value: 'severe_right' }],
    result: {
      insightType: 'tee_slice', severity: 'critical',
      title: '슬라이스 — 심각한 우측 미스',
      summaryTemplate: '{holeNumber}번 홀에서 슬라이스로 우측으로 크게 벗어났습니다.',
      recommendationTemplate: '슬라이스는 아웃-인 궤도의 신호입니다. 임팩트 시 페이스 방향을 확인하세요.',
      tags: ['tee_shot', 'slice'],
    },
  },
  {
    id: 'H029', scope: 'hole', priority: 72, enabled: true,
    conditions: [
      { field: 'teeMissCategory', operator: 'in',  value: ['miss_left', 'miss_right'] },
      { field: 'hasPenalty',      operator: 'eq',  value: false },
    ],
    result: {
      insightType: 'tee_rough', severity: 'warning',
      title: '티샷 러프',
      summaryTemplate: '{holeNumber}번 홀에서 티샷이 페어웨이를 벗어났습니다.',
      recommendationTemplate: '러프에서는 무리한 공략보다 그린 주변 안착을 목표로 하세요.',
      tags: ['tee_shot', 'rough'],
    },
  },
  {
    id: 'H030', scope: 'hole', priority: 38, enabled: true,
    conditions: [
      { field: 'teeMissCategory', operator: 'eq',  value: 'fairway' },
      { field: 'par',             operator: 'gte', value: 4         },
    ],
    result: {
      insightType: 'fairway_hit', severity: 'positive',
      title: '페어웨이 안착',
      summaryTemplate: '{holeNumber}번 홀에서 티샷이 페어웨이에 안착했습니다.',
      recommendationTemplate: '좋은 위치에서 두 번째 샷을 공략할 수 있습니다.',
      tags: ['tee_shot', 'fairway'],
    },
  },
  {
    id: 'H056', scope: 'hole', priority: 64, enabled: true,
    conditions: [{ field: 'fairwayGoodNoGreen', operator: 'eq', value: true }],
    result: {
      insightType: 'fairway_then_green_miss', severity: 'warning', category: 'approach',
      title: '페어웨이에서 그린을 놓침',
      summaryTemplate: '{holeNumber}번 홀은 티샷이 페어웨이에 안착했지만 그린을 놓쳐 보기 이상이 됐습니다.',
      recommendationTemplate: '좋은 위치에서는 핀보다 그린 중앙을 목표로 하고, 남은 거리에 맞는 클럽을 한 번 더 확인하세요.',
      tags: ['approach', 'gir', 'fairway'],
    },
  },
  {
    id: 'H057', scope: 'hole', priority: 43, enabled: true,
    conditions: [{ field: 'roughSave', operator: 'eq', value: true }],
    result: {
      insightType: 'rough_save', severity: 'positive', category: 'recovery',
      title: '러프에서 파 세이브',
      summaryTemplate: '{holeNumber}번 홀에서 티샷이 페어웨이를 벗어났지만 파 이상으로 막았습니다.',
      recommendationTemplate: '러프에서의 클럽 선택과 안전한 공략 경로를 기억해 두세요.',
      tags: ['recovery', 'tee_shot'],
    },
  },
  {
    id: 'H058', scope: 'hole', priority: 35, enabled: true,
    conditions: [{ field: 'driveOnGreen', operator: 'eq', value: true }],
    result: {
      insightType: 'drive_on_green', severity: 'positive', category: 'tee',
      title: '티샷 1온 성공',
      summaryTemplate: '{holeNumber}번 홀(파{par})에서 티샷으로 그린에 올렸습니다.',
      recommendationTemplate: '1온이 가능한 홀은 위험 지역 위치를 확인한 뒤 같은 전략을 반복하세요.',
      tags: ['tee_shot', 'opportunity'],
    },
  },

  // ═══ 안정성 / 회복 ════════════════════════════════════════════════════════
  {
    id: 'H031', scope: 'hole', priority: 48, enabled: true,
    conditions: [{ field: 'recoveryCategory', operator: 'eq', value: 'full_recovery' }],
    result: {
      insightType: 'full_recovery', severity: 'positive',
      title: '완전 회복',
      summaryTemplate: '{holeNumber}번 홀에서 불리한 상황에서도 파 이상을 기록했습니다.',
      recommendationTemplate: '위기 상황에서의 회복 능력은 핸디캡을 줄이는 핵심입니다.',
      tags: ['recovery', 'mental'],
    },
  },
  {
    id: 'H032', scope: 'hole', priority: 68, enabled: true,
    conditions: [{ field: 'damageCategory', operator: 'eq', value: 'catastrophic' }],
    result: {
      insightType: 'catastrophic_hole', severity: 'critical',
      title: '재해 홀 — 큰 스코어 손실',
      summaryTemplate: '{holeNumber}번 홀에서 연속 실수로 큰 스코어 손실이 발생했습니다.',
      recommendationTemplate: '다음 홀로 넘어갈 때 이 홀을 완전히 잊으세요. 첫 샷에만 집중하세요.',
      tags: ['damage', 'mental', 'critical'],
    },
  },
  {
    id: 'H060', scope: 'hole', priority: 99, enabled: true,
    conditions: [{ field: 'hasMemo', operator: 'eq', value: true }],
    result: {
      insightType: 'memo_note', severity: 'neutral', category: 'data',
      title: '내가 남긴 메모',
      summaryTemplate: '{holeNumber}번 홀 메모: {memoShort}',
      recommendationTemplate: '메모를 다음 라운드 같은 홀 전략에 반영해 보세요.',
      tags: ['memo', 'data'],
    },
  },
];

export const HOLE_RULES = RAW_HOLE_RULES.map(withCategory);
