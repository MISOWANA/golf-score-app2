// careerApplicable: false → 단일 라운드 전용 (InsightsView 다중 라운드 분석 시 제외)
export const ROUND_RULES = [
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
      recommendationTemplate: '퍼팅은 스코어 개선 효율이 가장 높습니다. 10m 이내 거리 감각 훈련을 권장합니다.',
      tags: ['putting', 'improvement'],
    },
  },
  {
    id: 'R005', scope: 'round', priority: 30, enabled: true, careerApplicable: true,
    conditions: [{ field: 'threePuttCount', operator: 'gte', value: 3 }],
    result: {
      insightType: 'three_putt_pattern', severity: 'warning',
      title: '3퍼트 반복 — 롱 퍼트 거리 감각 부족',
      summaryTemplate: '3퍼트 {threePuttCount}회 발생했습니다.',
      recommendationTemplate: '롱 퍼트 후 2m 이내로 붙이는 드릴을 연습하세요. 거리 조절이 방향보다 중요합니다.',
      tags: ['putting', 'three_putt', 'pattern'],
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

  // ═══ 페어웨이 ══════════════════════════════════════════════════════════════
  {
    id: 'R007', scope: 'round', priority: 35, enabled: true, careerApplicable: true,
    conditions: [{ field: 'fairwayHitRate', operator: 'gte', value: 0.6 }],
    result: {
      insightType: 'fairway_consistent', severity: 'positive',
      title: '티샷 일관성 우수',
      summaryTemplate: '페어웨이 적중률 {fairwayHitRatePct}% — 드라이버 방향성이 좋습니다.',
      recommendationTemplate: '현재 티샷 루틴을 유지하세요.',
      tags: ['tee_shot', 'fairway'],
    },
  },
  {
    id: 'R008', scope: 'round', priority: 40, enabled: true, careerApplicable: true,
    conditions: [{ field: 'fairwayHitRate', operator: 'lt', value: 0.3 }],
    result: {
      insightType: 'fairway_poor', severity: 'warning',
      title: '티샷 방향성 불안정',
      summaryTemplate: '페어웨이 적중률 {fairwayHitRatePct}% — 드라이버 정확도 개선이 필요합니다.',
      recommendationTemplate: '클럽 속도를 10% 줄이고 정확도를 높이는 것이 스코어에 더 도움이 됩니다.',
      tags: ['tee_shot', 'improvement'],
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

  // ═══ 전후반 페이스 ════════════════════════════════════════════════════════
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
];
