import { withCategory } from './category.js';

// careerApplicable: false → 단일 라운드 전용 (InsightsView 다중 라운드 분석 시 제외)
// 3퍼트 계열은 '퍼트 거리'로 구분한 원인(거리감 / 숏퍼트 / 중거리 / 가까운 거리 / 판단 보류)으로 나눠 말한다.
// 거리 기록이 없으면 거리감이라고 단정하지 않는다.
const RAW_ROUND_RULES = [
  // ═══ GIR ══════════════════════════════════════════════════════════════════
  {
    id: 'R001', scope: 'round', priority: 10, enabled: true, careerApplicable: true,
    conditions: [{ field: 'girRate', operator: 'gte', value: 0.5 }],
    result: {
      insightType: 'gir_excellent', severity: 'positive',
      title: '아이언 정확도 우수',
      summaryTemplate: 'GIR {girCount}회 ({girRatePct}%) — 그린 적중률이 탁월합니다.',
      recommendationTemplate: 'GIR 50% 이상은 싱글 수준의 아이언 정확도입니다.',
      tags: ['gir', 'iron'],
    },
  },
  {
    id: 'R002', scope: 'round', priority: 15, enabled: true, careerApplicable: true,
    conditions: [{ field: 'girRate', operator: 'lt', value: 0.25 }],
    result: {
      insightType: 'gir_poor', severity: 'critical',
      title: 'GIR 부족 — 아이언 연습 필요',
      summaryTemplate: 'GIR {girCount}회 ({girRatePct}%) — 그린 적중률이 낮습니다.',
      recommendationTemplate: '아이언 거리 정확도와 방향성을 집중 연습하세요. 풀 샷 전에 항상 타겟 클럽을 확인하세요.',
      tags: ['gir', 'iron', 'improvement'],
    },
  },

  // ═══ 퍼팅 ════════════════════════════════════════════════════════════════
  {
    id: 'R003', scope: 'round', priority: 20, enabled: true, careerApplicable: true,
    conditions: [{ field: 'avgPutts', operator: 'lte', value: 1.7 }],
    result: {
      insightType: 'putting_excellent', severity: 'positive',
      title: '퍼팅 탁월',
      summaryTemplate: '홀당 평균 {avgPuttsStr} 퍼트 — 퍼팅이 매우 좋았습니다.',
      recommendationTemplate: '퍼팅 루틴을 유지하세요.',
      tags: ['putting', 'excellent'],
    },
  },
  {
    id: 'R004', scope: 'round', priority: 25, enabled: true, careerApplicable: true,
    conditions: [{ field: 'avgPutts', operator: 'gte', value: 2.2 }],
    result: {
      insightType: 'putting_poor', severity: 'warning',
      title: '퍼팅 효율 저하',
      summaryTemplate: '홀당 평균 {avgPuttsStr} 퍼트 — 퍼팅이 스코어의 발목을 잡았습니다.',
      recommendationTemplate: '퍼팅은 스코어 개선 효율이 가장 높습니다. 3퍼트 원인(거리감 / 숏퍼트)을 퍼트 거리 기록으로 구분해 연습 방향을 정하세요.',
      tags: ['putting', 'improvement'],
    },
  },

  // ── 3퍼트: 원인별 ──
  {
    id: 'R005', scope: 'round', priority: 30, enabled: true, careerApplicable: true,
    conditions: [{ field: 'threePuttLagTotal', operator: 'gte', value: 2 }],
    result: {
      insightType: 'three_putt_lag_pattern', severity: 'warning', category: 'putting',
      title: '3퍼트 반복 — 롱 퍼트 거리감',
      summaryTemplate: '3퍼트 {threePuttCount}회 중 {threePuttLagTotal}회가 롱 퍼트를 2m 이상 남긴 거리감 문제였습니다 (퍼트 거리 기록 기준).',
      recommendationTemplate: '6m 이상 롱 퍼트는 홀이 아니라 1m 원 안에 세우는 드릴(10·15·20m 각 5개)을 연습하세요. 방향보다 거리 조절이 먼저입니다.',
      tags: ['putting', 'three_putt', 'lag', 'pattern'],
    },
  },
  {
    id: 'R030', scope: 'round', priority: 30, enabled: true, careerApplicable: true,
    conditions: [{ field: 'threePuttShortTotal', operator: 'gte', value: 2 }],
    result: {
      insightType: 'three_putt_short_pattern', severity: 'warning', category: 'putting',
      title: '3퍼트 반복 — 숏퍼트 미스',
      summaryTemplate: '3퍼트 {threePuttCount}회 중 {threePuttShortTotal}회가 1.5m 이내 숏퍼트를 놓쳐서 생겼습니다 (퍼트 거리 기록 기준).',
      recommendationTemplate: '거리감이 아니라 마무리 문제입니다. 1m 게이트·1.5m 원형 드릴처럼 짧은 퍼트를 같은 루틴으로 반복하세요.',
      tags: ['putting', 'three_putt', 'short_putt', 'pattern'],
    },
  },
  {
    id: 'R031', scope: 'round', priority: 31, enabled: true, careerApplicable: true,
    conditions: [{ field: 'threePuttMid', operator: 'gte', value: 2 }],
    result: {
      insightType: 'three_putt_mid_pattern', severity: 'warning', category: 'putting',
      title: '3퍼트 반복 — 중거리 퍼트',
      summaryTemplate: '3퍼트 {threePuttCount}회 중 {threePuttMid}회가 3~6m 중거리 구간이었습니다.',
      recommendationTemplate: '거리감 문제도 숏퍼트 문제도 아닌 구간입니다. 라인 읽기를 한 번에 확정하고 홀 주변 60cm 원에 세우는 속도를 우선하세요.',
      tags: ['putting', 'three_putt', 'mid_putt', 'pattern'],
    },
  },
  {
    id: 'R032', scope: 'round', priority: 31, enabled: true, careerApplicable: true,
    conditions: [{ field: 'threePuttClose', operator: 'gte', value: 2 }],
    result: {
      insightType: 'three_putt_close_pattern', severity: 'warning', category: 'putting',
      title: '3퍼트 반복 — 가까운 거리에서 시작',
      summaryTemplate: '3퍼트 {threePuttCount}회 중 {threePuttClose}회가 3m 이내에서 시작했습니다.',
      recommendationTemplate: '가까운 거리에서의 3퍼트는 거리감보다 속도(너무 강하게 침)와 라인 읽기 문제입니다. 홀 뒤 30cm를 넘기지 않는 속도로 치세요.',
      tags: ['putting', 'three_putt', 'close_putt', 'pattern'],
    },
  },
  {
    id: 'R033', scope: 'round', priority: 33, enabled: true, careerApplicable: true,
    conditions: [{ field: 'threePuttUnknown', operator: 'gte', value: 2 }],
    result: {
      insightType: 'three_putt_cause_unknown', severity: 'neutral', category: 'data',
      title: '3퍼트 원인 판단 보류 — 퍼트 거리 기록 필요',
      summaryTemplate: '3퍼트 {threePuttCount}회 중 {threePuttUnknown}회는 퍼트 거리가 기록되지 않아 거리감인지 숏퍼트 미스인지 구분할 수 없습니다.',
      recommendationTemplate: '퍼트마다 거리(m)를 입력하면 3퍼트를 거리감 / 숏퍼트 / 중거리로 나눠 보여드립니다.',
      tags: ['putting', 'three_putt', 'data'],
    },
  },
  {
    id: 'R034', scope: 'round', priority: 29, enabled: true, careerApplicable: true,
    conditions: [{ field: 'threePuttCount', operator: 'gte', value: 2 }],
    result: {
      insightType: 'three_putt_summary', severity: 'neutral', category: 'putting',
      title: '3퍼트 원인 분포',
      summaryTemplate: '3퍼트 {threePuttCount}회 — 거리감 {threePuttLag} · 숏퍼트 미스 {threePuttShort} · 둘 다 {threePuttBoth} · 중거리 {threePuttMid} · 가까운 거리 {threePuttClose} · 판단 보류 {threePuttUnknown}',
      recommendationTemplate: '판단 보류는 퍼트 거리가 기록되지 않은 3퍼트입니다. 거리를 기록한 만큼 원인이 구분됩니다.',
      tags: ['putting', 'three_putt', 'summary'],
    },
  },
  {
    id: 'R006', scope: 'round', priority: 22, enabled: true, careerApplicable: false,
    conditions: [{ field: 'onePuttCount', operator: 'gte', value: 6 }],
    result: {
      insightType: 'one_putt_streak', severity: 'positive',
      title: '원 퍼트 다수 — 쇼트 퍼트 능력 우수',
      summaryTemplate: '원 퍼트 {onePuttCount}회 — 쇼트 퍼트 능력이 뛰어났습니다.',
      recommendationTemplate: '이 감각을 다음 라운드에도 유지하세요.',
      tags: ['putting', 'one_putt'],
    },
  },
  {
    id: 'R035', scope: 'round', priority: 26, enabled: true, careerApplicable: true,
    conditions: [{ field: 'fourPuttCount', operator: 'gte', value: 1 }],
    result: {
      insightType: 'four_putt_round', severity: 'critical', category: 'putting',
      title: '4퍼트 이상 발생',
      summaryTemplate: '4퍼트 이상 {fourPuttCount}회 — 한 홀에서 퍼팅만으로 큰 손실이 났습니다.',
      recommendationTemplate: '긴 퍼트는 2퍼트를 목표로 하고, 첫 퍼트 후 남은 짧은 퍼트는 루틴을 지켜 마무리하세요.',
      tags: ['putting', 'three_putt', 'damage'],
    },
  },
  {
    id: 'R036', scope: 'round', priority: 24, enabled: true, careerApplicable: true,
    conditions: [{ field: 'lagGreatCount', operator: 'gte', value: 2 }],
    result: {
      insightType: 'lag_putting_strength', severity: 'positive', category: 'putting',
      title: '롱 퍼트 거리 컨트롤 강점',
      summaryTemplate: '8m 이상 롱 퍼트를 1m 이내로 붙여 마무리한 경우가 {lagGreatCount}회 있었습니다.',
      recommendationTemplate: '롱 퍼트 거리감이 강점입니다. 이 감각으로 첫 퍼트 후 2퍼트를 안정적으로 이어가세요.',
      tags: ['putting', 'long_putt', 'distance_control'],
    },
  },
  {
    id: 'R037', scope: 'round', priority: 27, enabled: true, careerApplicable: true,
    conditions: [{ field: 'birdieChanceMissedCount', operator: 'gte', value: 2 }],
    result: {
      insightType: 'birdie_chances_missed', severity: 'warning', category: 'putting',
      title: '3m 이내 버디 기회를 놓침',
      summaryTemplate: '그린을 잡고 첫 퍼트가 3m 이내였지만 버디를 만들지 못한 홀이 {birdieChanceMissedCount}개였습니다.',
      recommendationTemplate: '가까운 버디 퍼트는 라인 확인에 시간을 쓰고 홀을 확실히 노리세요. 놓칠 때 홀 뒤 50cm 이내로 속도를 맞추면 파가 안전합니다.',
      tags: ['putting', 'birdie_chance'],
    },
  },
  {
    id: 'R038', scope: 'round', priority: 28, enabled: true, careerApplicable: true,
    conditions: [
      { field: 'girRate',  operator: 'gte', value: 0.4 },
      { field: 'avgPutts', operator: 'gte', value: 2.1 },
    ],
    result: {
      insightType: 'gir_high_putts_high', severity: 'warning', category: 'putting',
      title: '그린은 잡는데 퍼팅에서 샌다',
      summaryTemplate: 'GIR {girRatePct}%인데 홀당 평균 {avgPuttsStr} 퍼트 — 어프로치 성과를 퍼팅이 깎고 있습니다.',
      recommendationTemplate: '온그린 후 첫 퍼트의 거리 컨트롤(2퍼트 확률)과 1.5m 이내 마무리를 나눠 점검하세요.',
      tags: ['putting', 'gir', 'improvement'],
    },
  },
  {
    id: 'R039', scope: 'round', priority: 21, enabled: true, careerApplicable: true,
    conditions: [
      { field: 'girRate',  operator: 'lt',  value: 0.3 },
      { field: 'avgPutts', operator: 'lte', value: 1.8 },
    ],
    result: {
      insightType: 'putting_carried_score', severity: 'positive', category: 'putting',
      title: '퍼팅이 스코어를 지켜줌',
      summaryTemplate: 'GIR은 {girRatePct}%였지만 홀당 {avgPuttsStr} 퍼트로 스코어를 지켰습니다.',
      recommendationTemplate: '퍼팅에 기대지 않으려면 그린 적중률을 올리는 것이 다음 단계입니다.',
      tags: ['putting', 'gir', 'strength'],
    },
  },
  {
    id: 'R040', scope: 'round', priority: 45, enabled: true, careerApplicable: false,
    conditions: [
      { field: 'puttHoleCount',    operator: 'gte', value: 6 },
      { field: 'puttDistCoverage', operator: 'lt',  value: 0.5 },
    ],
    result: {
      insightType: 'putt_distance_coverage_low', severity: 'neutral', category: 'data',
      title: '퍼트 거리 기록이 적어요',
      summaryTemplate: '퍼트를 한 {puttHoleCount}개 홀 중 퍼트 거리가 기록된 홀은 {puttDistCoveragePct}%입니다.',
      recommendationTemplate: '퍼트 거리를 입력하면 3퍼트 원인(거리감 / 숏퍼트), 성공률 거리구간, 어프로치 근접도 분석이 정확해집니다.',
      tags: ['putting', 'data'],
    },
  },

  // ═══ 페어웨이 ══════════════════════════════════════════════════════════════
  // fairwayHitRate는 "기록된" 홀 대비 적중률(fairwayRecordedCount 분모)이라, 기록 자체가
  // 없으면 표본 부족으로 R007/R008이 뜨지 않게 최소 표본(3홀)을 요구한다.
  {
    id: 'R007', scope: 'round', priority: 35, enabled: true, careerApplicable: true,
    conditions: [
      { field: 'fairwayHitRate', operator: 'gte', value: 0.6 },
      { field: 'fairwayRecordedCount', operator: 'gte', value: 3 },
    ],
    result: {
      insightType: 'fairway_consistent', severity: 'positive',
      title: '티샷 일관성 우수',
      summaryTemplate: '페어웨이 적중률 {fairwayHitRatePct}% ({fairwayRecordedCount}홀 기록) — 드라이버 방향성이 좋습니다.',
      recommendationTemplate: '현재 티샷 루틴을 유지하세요.',
      tags: ['tee_shot', 'fairway'],
    },
  },
  {
    id: 'R008', scope: 'round', priority: 40, enabled: true, careerApplicable: true,
    conditions: [
      { field: 'fairwayHitRate', operator: 'lt', value: 0.3 },
      { field: 'fairwayRecordedCount', operator: 'gte', value: 3 },
    ],
    result: {
      insightType: 'fairway_poor', severity: 'warning',
      title: '티샷 방향성 불안정',
      summaryTemplate: '페어웨이 적중률 {fairwayHitRatePct}% ({fairwayRecordedCount}홀 기록) — 드라이버 정확도 개선이 필요합니다.',
      recommendationTemplate: '클럽 속도를 10% 줄이고 정확도를 높이는 것이 스코어에 더 도움이 됩니다.',
      tags: ['tee_shot', 'improvement'],
    },
  },
  {
    id: 'R008B', scope: 'round', priority: 39, enabled: true, careerApplicable: false,
    conditions: [
      { field: 'fairwayHoleCount', operator: 'gte', value: 3 },
      { field: 'fairwayRecordedCount', operator: 'lt', value: 3 },
    ],
    result: {
      insightType: 'fairway_no_data', severity: 'neutral',
      title: '티샷 방향 기록 부족',
      summaryTemplate: '드라이버 홀 {fairwayHoleCount}개 중 페어웨이 적중 기록이 {fairwayRecordedCount}개뿐입니다.',
      recommendationTemplate: '티샷 방향이나 세부 설정이 없는 경우에는 티샷 상세 기록이 필요합니다.',
      tags: ['tee_shot', 'data'],
    },
  },
  {
    id: 'R041', scope: 'round', priority: 41, enabled: true, careerApplicable: true,
    conditions: [
      { field: 'teeMissRightCount', operator: 'gte', value: 3 },
      { field: 'teeMissLeftCount',  operator: 'lte', value: 1 },
    ],
    result: {
      insightType: 'tee_right_bias', severity: 'warning', category: 'tee',
      title: '티샷이 오른쪽으로 치우침',
      summaryTemplate: '티샷 미스 중 우측이 {teeMissRightCount}회, 좌측은 {teeMissLeftCount}회였습니다.',
      recommendationTemplate: '한쪽으로만 빠지면 목표선을 반대로 조정하는 것이 가장 쉬운 보정입니다. 우측 위험이 있다면 타깃을 왼쪽 페어웨이 끝으로 잡으세요.',
      tags: ['tee_shot', 'right', 'pattern'],
    },
  },
  {
    id: 'R042', scope: 'round', priority: 41, enabled: true, careerApplicable: true,
    conditions: [
      { field: 'teeMissLeftCount',  operator: 'gte', value: 3 },
      { field: 'teeMissRightCount', operator: 'lte', value: 1 },
    ],
    result: {
      insightType: 'tee_left_bias', severity: 'warning', category: 'tee',
      title: '티샷이 왼쪽으로 치우침',
      summaryTemplate: '티샷 미스 중 좌측이 {teeMissLeftCount}회, 우측은 {teeMissRightCount}회였습니다.',
      recommendationTemplate: '좌측 위험이 있다면 타깃을 오른쪽 페어웨이 끝으로 잡고, 그립 압력을 점검하세요.',
      tags: ['tee_shot', 'left', 'pattern'],
    },
  },
  {
    id: 'R043', scope: 'round', priority: 36, enabled: true, careerApplicable: true,
    conditions: [
      { field: 'girAfterFairwayN', operator: 'gte', value: 3 },
      { field: 'girAfterMissN',    operator: 'gte', value: 3 },
      { field: 'girFairwayGap',    operator: 'gte', value: 0.3 },
    ],
    result: {
      insightType: 'fairway_gir_link', severity: 'neutral', category: 'tee',
      title: '페어웨이가 그린 적중률을 좌우',
      summaryTemplate: '페어웨이를 지키면 GIR {girAfterFairwayRatePct}%, 놓치면 {girAfterMissRatePct}% — 티샷 위치가 어프로치 성공에 직결됩니다.',
      recommendationTemplate: '거리를 조금 줄이더라도 페어웨이를 지키는 전략이 GIR에 가장 효율적인 개선입니다.',
      tags: ['tee_shot', 'gir', 'fairway'],
    },
  },
  {
    id: 'R044', scope: 'round', priority: 66, enabled: true, careerApplicable: true,
    conditions: [{ field: 'driverPenaltyCount', operator: 'gte', value: 2 }],
    result: {
      insightType: 'driver_penalty_pattern', severity: 'critical', category: 'penalty',
      title: '드라이버 티샷 페널티 반복',
      summaryTemplate: '드라이버 티샷에서 페널티가 {driverPenaltyCount}회 났습니다.',
      recommendationTemplate: '위험 지역이 있는 홀에서는 드라이버를 쓰지 않는 규칙을 정하세요. 우드·유틸리티로 20~30m를 줄이는 대신 OB 확률을 크게 낮춥니다.',
      tags: ['penalty', 'tee_shot', 'driver', 'pattern'],
    },
  },

  // ═══ 페널티 ═══════════════════════════════════════════════════════════════
  {
    id: 'R009', scope: 'round', priority: 45, enabled: true, careerApplicable: true,
    conditions: [{ field: 'totalOB', operator: 'gte', value: 3 }],
    result: {
      insightType: 'ob_pattern', severity: 'critical',
      title: 'OB 다수 — 위험 관리 필요',
      summaryTemplate: 'OB {totalOB}회 발생했습니다.',
      recommendationTemplate: 'OB가 많을 때는 드라이버를 내려놓고 안전 클럽으로 전략을 바꾸세요. 1타를 잃더라도 OB 1회 = 최소 2타 손실입니다.',
      tags: ['penalty', 'ob', 'pattern'],
    },
  },
  {
    id: 'R010', scope: 'round', priority: 48, enabled: true, careerApplicable: true,
    conditions: [{ field: 'holesWithPenalty', operator: 'gte', value: 4 }],
    result: {
      insightType: 'penalty_holes_many', severity: 'critical',
      title: '페널티 홀 반복',
      summaryTemplate: '{holesWithPenalty}개 홀에서 페널티가 발생했습니다.',
      recommendationTemplate: '페널티가 많을 때는 전략을 수비적으로 전환하세요.',
      tags: ['penalty', 'pattern'],
    },
  },
  {
    id: 'R011', scope: 'round', priority: 18, enabled: true, careerApplicable: false,
    conditions: [
      { field: 'totalPenalties', operator: 'eq',  value: 0 },
      { field: 'holeCount',      operator: 'gte', value: 9 },
    ],
    result: {
      insightType: 'clean_round', severity: 'positive',
      title: '클린 라운드 — 무페널티',
      summaryTemplate: '이번 라운드 페널티 없이 플레이했습니다.',
      recommendationTemplate: '페널티 없는 클린 플레이는 스코어 관리의 가장 강력한 기반입니다.',
      tags: ['penalty', 'clean', 'positive'],
    },
  },
  {
    id: 'R045', scope: 'round', priority: 47, enabled: true, careerApplicable: true,
    conditions: [{ field: 'penaltyStrokes', operator: 'gte', value: 4 }],
    result: {
      insightType: 'penalty_cost', severity: 'warning', category: 'penalty',
      title: '페널티로 잃은 타수',
      summaryTemplate: 'OB·해저드·언플레이어블로 총 {penaltyStrokes}타를 잃었습니다 (OB 1회 = 2타 기준).',
      recommendationTemplate: '페널티 홀을 따로 복기해 같은 위험 지역을 다시 만났을 때 쓸 안전 루트를 정해 두세요.',
      tags: ['penalty', 'cost'],
    },
  },
  {
    id: 'R046', scope: 'round', priority: 49, enabled: true, careerApplicable: true,
    conditions: [{ field: 'approachPenaltyCount', operator: 'gte', value: 2 }],
    result: {
      insightType: 'approach_penalty_pattern', severity: 'warning', category: 'penalty',
      title: '어프로치 구간 페널티 반복',
      summaryTemplate: '세컨 샷 이후 구간에서 페널티가 난 홀이 {approachPenaltyCount}개입니다.',
      recommendationTemplate: '그린 주변 위험 지역이 반복되면 핀보다 그린 중앙을 목표로 하고, 보수적인 클럽 선택으로 방어하세요.',
      tags: ['penalty', 'approach', 'pattern'],
    },
  },
  {
    id: 'R047', scope: 'round', priority: 50, enabled: true, careerApplicable: true,
    conditions: [{ field: 'totalHazard', operator: 'gte', value: 3 }],
    result: {
      insightType: 'hazard_pattern', severity: 'warning', category: 'penalty',
      title: '해저드 반복',
      summaryTemplate: '해저드 페널티 {totalHazard}회 — 같은 유형의 위험 지역이 반복됩니다.',
      recommendationTemplate: '해저드 앞에서는 캐리 거리에 여유가 없다면 레이업하고, 페널티구역 경계를 목표선에 두지 마세요.',
      tags: ['penalty', 'hazard', 'pattern'],
    },
  },
  {
    id: 'R048', scope: 'round', priority: 50, enabled: true, careerApplicable: true,
    conditions: [{ field: 'totalUnplayable', operator: 'gte', value: 2 }],
    result: {
      insightType: 'unplayable_pattern', severity: 'warning', category: 'penalty',
      title: '언플레이어블 반복',
      summaryTemplate: '언플레이어블 선언이 {totalUnplayable}회 있었습니다.',
      recommendationTemplate: '깊은 러프·나무 아래로 들어가기 전에 클럽을 낮추거나 안전한 쪽으로 방향을 바꾸는 것이 1벌타를 아낍니다.',
      tags: ['penalty', 'unplayable', 'pattern'],
    },
  },

  // ═══ 숏게임 · 전환 ════════════════════════════════════════════════════════
  {
    id: 'R049', scope: 'round', priority: 38, enabled: true, careerApplicable: true,
    conditions: [
      { field: 'scrambleAttempts', operator: 'gte', value: 4 },
      { field: 'scrambleRate',     operator: 'gte', value: 0.5 },
    ],
    result: {
      insightType: 'scramble_strong', severity: 'positive', category: 'shortgame',
      title: '스크램블링 강점',
      summaryTemplate: '그린을 놓친 {scrambleAttempts}홀 중 {scrambleSaves}홀에서 파 이상 ({scrambleRatePct}%)을 지켰습니다.',
      recommendationTemplate: '그린 주변 칩샷을 홀 가까이 붙이는 능력이 스코어를 지키고 있습니다.',
      tags: ['short_game', 'scramble', 'strength'],
    },
  },
  {
    id: 'R050', scope: 'round', priority: 58, enabled: true, careerApplicable: true,
    conditions: [
      { field: 'scrambleAttempts', operator: 'gte', value: 4 },
      { field: 'scrambleRate',     operator: 'lte', value: 0.2 },
    ],
    result: {
      insightType: 'scramble_weak', severity: 'warning', category: 'shortgame',
      title: '그린 미스 후 파 세이브가 어려움',
      summaryTemplate: '그린을 놓친 {scrambleAttempts}홀 중 파 이상은 {scrambleSaves}홀 ({scrambleRatePct}%)뿐입니다.',
      recommendationTemplate: '그린 주변에서는 첫 퍼트(또는 칩샷)를 2m 안에 남기는 것을 목표로 하고, 라이에 맞는 샷을 고르는 루틴을 만드세요.',
      tags: ['short_game', 'scramble', 'improvement'],
    },
  },
  {
    id: 'R051', scope: 'round', priority: 59, enabled: true, careerApplicable: true,
    conditions: [
      { field: 'girCount',     operator: 'gte', value: 5 },
      { field: 'girBirdieCount', operator: 'eq', value: 0 },
    ],
    result: {
      insightType: 'gir_no_birdie', severity: 'neutral', category: 'approach',
      title: '그린은 잡는데 버디로 이어지지 않음',
      summaryTemplate: '그린을 {girCount}번 잡았지만 버디 이상은 없었습니다.',
      recommendationTemplate: '온그린 후 첫 퍼트의 거리(근접도)가 3m 이내인지 확인해 보세요. 핀과 멀다면 어프로치 목표 위치를 조정하세요.',
      tags: ['gir', 'approach', 'conversion'],
    },
  },
  {
    id: 'R052', scope: 'round', priority: 37, enabled: true, careerApplicable: true,
    conditions: [{ field: 'upAndDownCount', operator: 'gte', value: 2 }],
    result: {
      insightType: 'up_and_down_strong', severity: 'positive', category: 'shortgame',
      title: '업앤다운 다수',
      summaryTemplate: '그린을 놓치고도 원 퍼트로 파를 지킨 홀이 {upAndDownCount}개입니다.',
      recommendationTemplate: '칩샷 거리 조절이 좋았습니다. 홀 가까이 붙이는 감각을 유지하세요.',
      tags: ['short_game', 'scramble'],
    },
  },

  // ═══ 파별 성적 ════════════════════════════════════════════════════════════
  {
    id: 'R012', scope: 'round', priority: 50, enabled: true, careerApplicable: true,
    conditions: [
      { field: 'par3AvgDiff', operator: 'gt',  value: 1  },
      { field: 'par3Count',   operator: 'gte', value: 3  },
    ],
    result: {
      insightType: 'par3_weakness', severity: 'warning',
      title: '파3 홀 약세',
      summaryTemplate: '파3 홀 평균 {par3AvgDiffStr}타 — 파3에서 스코어 손실이 큽니다.',
      recommendationTemplate: '파3에서는 그린 중앙을 목표로 하여 큰 미스를 방지하세요.',
      tags: ['par3', 'weakness'],
    },
  },
  {
    id: 'R013', scope: 'round', priority: 28, enabled: true, careerApplicable: true,
    conditions: [
      { field: 'par5AvgDiff', operator: 'lte', value: 0  },
      { field: 'par5Count',   operator: 'gte', value: 2  },
    ],
    result: {
      insightType: 'par5_strength', severity: 'positive',
      title: '파5 홀 강세',
      summaryTemplate: '파5 홀 평균 {par5AvgDiffStr}타 — 파5 기회를 잘 활용하고 있습니다.',
      recommendationTemplate: '파5 버디 전략(3온 공략)을 계속 유지하세요.',
      tags: ['par5', 'strength'],
    },
  },
  {
    id: 'R014', scope: 'round', priority: 55, enabled: true, careerApplicable: true,
    conditions: [
      { field: 'par5AvgDiff', operator: 'gt',  value: 1.5 },
      { field: 'par5Count',   operator: 'gte', value: 2   },
    ],
    result: {
      insightType: 'par5_wasted', severity: 'warning',
      title: '파5 기회 활용 부족',
      summaryTemplate: '파5 홀 평균 {par5AvgDiffStr}타 — 파5에서 스코어를 줄이지 못하고 있습니다.',
      recommendationTemplate: '파5에서는 3온 후 2퍼트를 목표로 하세요. 2온을 무리하게 노리다 손실이 커질 수 있습니다.',
      tags: ['par5', 'improvement'],
    },
  },
  {
    id: 'R053', scope: 'round', priority: 52, enabled: true, careerApplicable: true,
    conditions: [
      { field: 'par4AvgDiff', operator: 'gte', value: 1.0 },
      { field: 'par4Count',   operator: 'gte', value: 4   },
    ],
    result: {
      insightType: 'par4_weakness', severity: 'warning', category: 'score',
      title: '파4 홀에서 손실이 큼',
      summaryTemplate: '파4 홀 평균 {par4AvgDiffStr}타 ({par4Count}홀) — 라운드 손실의 대부분이 파4에서 나왔습니다.',
      recommendationTemplate: '파4는 티샷 위치와 어프로치 클럽 선택이 결과를 좌우합니다. 티샷 목표를 페어웨이 넓은 쪽으로 잡고 보기를 목표로 운영해 보세요.',
      tags: ['par4', 'weakness'],
    },
  },
  {
    id: 'R054', scope: 'round', priority: 34, enabled: true, careerApplicable: true,
    conditions: [
      { field: 'par3AvgDiff', operator: 'lte', value: 0 },
      { field: 'par3Count',   operator: 'gte', value: 3 },
    ],
    result: {
      insightType: 'par3_strength', severity: 'positive', category: 'score',
      title: '파3 홀 강세',
      summaryTemplate: '파3 홀 평균 {par3AvgDiffStr}타 — 파3를 안정적으로 지켰습니다.',
      recommendationTemplate: '파3 공략 방식(그린 중앙 목표, 클럽 선택)을 다른 홀에도 적용해 보세요.',
      tags: ['par3', 'strength'],
    },
  },

  // ═══ 그린 방향 패턴 ═══════════════════════════════════════════════════════
  {
    id: 'R015', scope: 'round', priority: 60, enabled: true, careerApplicable: true,
    conditions: [
      { field: 'greenMissRightRate', operator: 'gte', value: 0.5 },
      { field: 'greenMissTotal',     operator: 'gte', value: 4   },
    ],
    result: {
      insightType: 'green_miss_right_pattern', severity: 'warning',
      title: '그린 우측 미스 반복',
      summaryTemplate: '그린 미스 중 우측 {greenMissRightRatePct}% ({greenMissRight}회) — 우측 미스가 반복됩니다.',
      recommendationTemplate: '우측 반복 미스는 열린 페이스 또는 스탠스 정렬 문제일 수 있습니다. 어드레스 시 정렬을 재확인하세요.',
      tags: ['green_miss', 'pattern', 'right'],
    },
  },
  {
    id: 'R016', scope: 'round', priority: 60, enabled: true, careerApplicable: true,
    conditions: [
      { field: 'greenMissLeftRate', operator: 'gte', value: 0.5 },
      { field: 'greenMissTotal',    operator: 'gte', value: 4   },
    ],
    result: {
      insightType: 'green_miss_left_pattern', severity: 'warning',
      title: '그린 좌측 미스 반복',
      summaryTemplate: '그린 미스 중 좌측 {greenMissLeftRatePct}% ({greenMissLeft}회) — 좌측 미스가 반복됩니다.',
      recommendationTemplate: '좌측 반복 미스는 닫힌 페이스 또는 오버스윙 신호일 수 있습니다.',
      tags: ['green_miss', 'pattern', 'left'],
    },
  },
  {
    id: 'R017', scope: 'round', priority: 62, enabled: true, careerApplicable: true,
    conditions: [
      { field: 'greenMissShortRate', operator: 'gte', value: 0.5 },
      { field: 'greenMissTotal',     operator: 'gte', value: 4   },
    ],
    result: {
      insightType: 'green_miss_short_pattern', severity: 'warning',
      title: '어프로치 짧음 반복',
      summaryTemplate: '그린 미스 중 숏 {greenMissShortRatePct}% ({greenMissShort}회) — 지속적으로 짧게 치고 있습니다.',
      recommendationTemplate: '한 클럽 더 잡는 습관을 들이세요. 핀 방향으로 튀는 것보다 짧은 게 더 위험합니다.',
      tags: ['green_miss', 'pattern', 'short'],
    },
  },

  // ═══ 티샷 패턴 ═══════════════════════════════════════════════════════════
  {
    id: 'R018', scope: 'round', priority: 65, enabled: true, careerApplicable: true,
    conditions: [{ field: 'sliceCount', operator: 'gte', value: 3 }],
    result: {
      insightType: 'slice_pattern', severity: 'critical',
      title: '슬라이스 반복',
      summaryTemplate: '슬라이스 {sliceCount}회 — 드라이버 방향성에 문제가 있습니다.',
      recommendationTemplate: '슬라이스는 아웃-인 궤도 + 열린 페이스 조합입니다. 그립을 강하게 쥐고 인-아웃 궤도를 의식하세요.',
      tags: ['tee_shot', 'slice', 'pattern'],
    },
  },
  {
    id: 'R019', scope: 'round', priority: 65, enabled: true, careerApplicable: true,
    conditions: [{ field: 'hookCount', operator: 'gte', value: 3 }],
    result: {
      insightType: 'hook_pattern', severity: 'critical',
      title: '훅 반복',
      summaryTemplate: '훅 {hookCount}회 — 좌측 미스가 반복됩니다.',
      recommendationTemplate: '훅은 닫힌 페이스 또는 인-아웃 과잉 궤도입니다. 그립 강도와 백스윙 궤도를 점검하세요.',
      tags: ['tee_shot', 'hook', 'pattern'],
    },
  },

  // ═══ 전후반 페이스 · 흐름 ═════════════════════════════════════════════════
  {
    id: 'R020', scope: 'round', priority: 70, enabled: true, careerApplicable: false,
    conditions: [{ field: 'backFade', operator: 'gte', value: 5 }],
    result: {
      insightType: 'back_nine_fade', severity: 'warning',
      title: '후반 체력/집중력 저하',
      summaryTemplate: '후반이 전반보다 {backFade}타 더 많습니다.',
      recommendationTemplate: '후반 1번 홀(10번)에서 의식적으로 안전한 코스 관리를 하세요. 체력이 스코어에 영향을 줍니다.',
      tags: ['pace', 'stamina'],
    },
  },
  {
    id: 'R021', scope: 'round', priority: 32, enabled: true, careerApplicable: false,
    conditions: [{ field: 'backFade', operator: 'lte', value: -3 }],
    result: {
      insightType: 'back_nine_strong', severity: 'positive',
      title: '후반 강세',
      summaryTemplate: '후반이 전반보다 {backFadeAbs}타 적습니다. 후반 집중력이 강점입니다.',
      recommendationTemplate: '후반에 더 좋아지는 패턴을 살려 전반부터 안정적으로 운영해보세요.',
      tags: ['pace', 'positive'],
    },
  },
  {
    id: 'R055', scope: 'round', priority: 71, enabled: true, careerApplicable: false,
    conditions: [
      { field: 'holeCount',        operator: 'gte', value: 9   },
      { field: 'firstThreeAvgDiff', operator: 'gte', value: 1.0 },
    ],
    result: {
      insightType: 'slow_start', severity: 'warning', category: 'pace',
      title: '초반 3홀이 무거움',
      summaryTemplate: '첫 3홀 평균 {firstThreeAvgDiffStr}타 — 몸이 풀리기 전에 스코어를 잃었습니다.',
      recommendationTemplate: '1번 홀 전에 짧은 웨지부터 풀스윙 순으로 워밍업하고, 초반 홀은 보기 플레이를 목표로 안전하게 운영하세요.',
      tags: ['pace', 'start'],
    },
  },
  {
    id: 'R056', scope: 'round', priority: 33, enabled: true, careerApplicable: false,
    conditions: [
      { field: 'holeCount',        operator: 'gte', value: 9   },
      { field: 'firstThreeAvgDiff', operator: 'lte', value: 0 },
    ],
    result: {
      insightType: 'strong_start', severity: 'positive', category: 'pace',
      title: '초반 3홀 안정적인 출발',
      summaryTemplate: '첫 3홀 평균 {firstThreeAvgDiffStr}타 — 좋은 출발이었습니다.',
      recommendationTemplate: '초반 루틴(워밍업·첫 홀 클럽 선택)을 기록해 두고 다음 라운드에도 반복하세요.',
      tags: ['pace', 'start', 'positive'],
    },
  },
  {
    id: 'R057', scope: 'round', priority: 34, enabled: true, careerApplicable: false,
    conditions: [
      { field: 'holeCount',       operator: 'gte', value: 12 },
      { field: 'lastThreeAvgDiff', operator: 'lte', value: 0 },
      { field: 'firstThreeAvgDiff', operator: 'gt', value: 0.5 },
    ],
    result: {
      insightType: 'strong_finish', severity: 'positive', category: 'pace',
      title: '마지막 3홀 강한 마무리',
      summaryTemplate: '마지막 3홀 평균 {lastThreeAvgDiffStr}타 — 초반 부진을 만회하며 마무리했습니다.',
      recommendationTemplate: '끝까지 집중력을 유지한 점이 좋았습니다.',
      tags: ['pace', 'finish', 'positive'],
    },
  },
  {
    id: 'R058', scope: 'round', priority: 72, enabled: true, careerApplicable: true,
    conditions: [{ field: 'bogeyStreakMax', operator: 'gte', value: 3 }],
    result: {
      insightType: 'bogey_streak', severity: 'warning', category: 'recovery',
      title: '연속 보기 이상 구간',
      summaryTemplate: '보기 이상이 최대 {bogeyStreakMax}홀 연속으로 이어졌습니다.',
      recommendationTemplate: '실수가 이어질 때는 다음 홀 티샷 전에 호흡·루틴을 한 번 끊고, 한 홀 동안만 안전한 클럽 선택으로 흐름을 되돌리세요.',
      tags: ['streak', 'recovery', 'mental'],
    },
  },
  {
    id: 'R059', scope: 'round', priority: 36, enabled: true, careerApplicable: true,
    conditions: [{ field: 'parStreakMax', operator: 'gte', value: 4 }],
    result: {
      insightType: 'par_streak', severity: 'positive', category: 'recovery',
      title: '파 이상 연속 구간',
      summaryTemplate: '파 이상이 최대 {parStreakMax}홀 연속으로 이어졌습니다.',
      recommendationTemplate: '이 구간의 루틴과 전략을 기억해 두세요. 좋은 흐름의 공통점이 가장 좋은 연습 목표입니다.',
      tags: ['streak', 'positive'],
    },
  },
  {
    id: 'R060', scope: 'round', priority: 37, enabled: true, careerApplicable: true,
    conditions: [{ field: 'bounceBackCount', operator: 'gte', value: 2 }],
    result: {
      insightType: 'bounce_back', severity: 'positive', category: 'recovery',
      title: '더블 이후 바로 회복',
      summaryTemplate: '더블보기 이상 직후 파 이상으로 되돌린 홀이 {bounceBackCount}번 있었습니다.',
      recommendationTemplate: '큰 실수 뒤에 흔들리지 않는 멘탈이 강점입니다.',
      tags: ['recovery', 'mental', 'streak'],
    },
  },
  {
    id: 'R061', scope: 'round', priority: 61, enabled: true, careerApplicable: true,
    conditions: [{ field: 'birdieThenBogeyCount', operator: 'gte', value: 2 }],
    result: {
      insightType: 'birdie_then_bogey', severity: 'neutral', category: 'recovery',
      title: '버디 직후 보기 이상',
      summaryTemplate: '버디 다음 홀에서 보기 이상을 한 경우가 {birdieThenBogeyCount}번 있었습니다.',
      recommendationTemplate: '좋은 홀 직후에는 공격적인 첫 샷이 나오기 쉽습니다. 버디 다음 홀은 평소 루틴과 안전한 타깃을 먼저 확인하세요.',
      tags: ['recovery', 'mental', 'streak'],
    },
  },

  // ═══ 빅 넘버 / 회복 ══════════════════════════════════════════════════════
  {
    id: 'R022', scope: 'round', priority: 75, enabled: true, careerApplicable: true,
    conditions: [{ field: 'triplePlusCount', operator: 'gte', value: 2 }],
    result: {
      insightType: 'triple_plus_pattern', severity: 'critical',
      title: '빅 넘버 반복 — 위기 관리 필요',
      summaryTemplate: '트리플 이상 {triplePlusCount}회 발생했습니다.',
      recommendationTemplate: '빅 넘버는 대개 연속 실수에서 옵니다. 첫 실수 후 즉각 수비 전환하는 규칙을 만드세요.',
      tags: ['damage', 'triple', 'pattern'],
    },
  },
  {
    id: 'R023', scope: 'round', priority: 35, enabled: true, careerApplicable: true,
    conditions: [{ field: 'recoveryCount', operator: 'gte', value: 3 }],
    result: {
      insightType: 'recovery_ability', severity: 'positive',
      title: '회복 능력 우수',
      summaryTemplate: '불리한 상황에서 {recoveryCount}번 회복에 성공했습니다.',
      recommendationTemplate: '정신력과 쇼트게임이 스코어를 지켰습니다.',
      tags: ['recovery', 'mental'],
    },
  },
  {
    id: 'R024', scope: 'round', priority: 18, enabled: true, careerApplicable: false,
    conditions: [
      { field: 'birdieCount',      operator: 'eq',  value: 0   },
      { field: 'doubleOrWorseRate', operator: 'lt', value: 0.2 },
    ],
    result: {
      insightType: 'conservative_stable', severity: 'neutral',
      title: '안정형 라운드 — 버디 없이 큰 실수도 없음',
      summaryTemplate: '버디는 없었지만 더블 이상도 {doubleCount}개로 적었습니다.',
      recommendationTemplate: '안정성은 확보됐습니다. 이제 적극적으로 버디 찬스를 노려보세요.',
      tags: ['score', 'conservative'],
    },
  },
  {
    id: 'R062', scope: 'round', priority: 19, enabled: true, careerApplicable: false,
    conditions: [
      { field: 'holeCount',        operator: 'gte', value: 9 },
      { field: 'doubleCount',      operator: 'eq',  value: 0 },
      { field: 'triplePlusCount',  operator: 'eq',  value: 0 },
      { field: 'birdieCount',      operator: 'gte', value: 1 },
    ],
    result: {
      insightType: 'no_double_round', severity: 'positive', category: 'score',
      title: '더블 이상 없는 라운드',
      summaryTemplate: '더블보기 이상 없이 마쳤고 버디도 {birdieCount}개 잡았습니다.',
      recommendationTemplate: '큰 실수 없이 스코어를 쌓는 패턴입니다. 이 운영 방식을 기준으로 삼으세요.',
      tags: ['score', 'clean', 'positive'],
    },
  },
  {
    id: 'R063', scope: 'round', priority: 17, enabled: true, careerApplicable: true,
    conditions: [{ field: 'birdieCount', operator: 'gte', value: 3 }],
    result: {
      insightType: 'birdie_rush', severity: 'positive', category: 'score',
      title: '버디 3개 이상',
      summaryTemplate: '버디 {birdieCount}개 — 스코어를 줄일 기회를 잘 살렸습니다.',
      recommendationTemplate: '버디 홀의 공통점(티샷 위치·클럽·퍼트 거리)을 복기해 보세요.',
      tags: ['score', 'birdie'],
    },
  },
  {
    id: 'R064', scope: 'round', priority: 64, enabled: true, careerApplicable: false,
    conditions: [{ field: 'offGreenPuttCount', operator: 'gte', value: 2 }],
    result: {
      insightType: 'putt_off_green_pattern', severity: 'warning', category: 'putting',
      title: '퍼트가 그린 밖으로 나간 홀',
      summaryTemplate: '퍼트가 그린 밖으로 나가 칩으로 다시 올린 홀이 {offGreenPuttCount}개 있었습니다.',
      recommendationTemplate: '그린 가장자리 핀이나 큰 경사에서는 홀 뒤 거리보다 그린 안에 세우는 속도를 우선하세요. 이런 홀은 퍼팅 수가 아니라 퍼팅 손실로 잡힙니다.',
      tags: ['putting', 'green_reading'],
    },
  },
];

export const ROUND_RULES = RAW_ROUND_RULES.map(withCategory);
