export const HOLE_RULES = [
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
  {
    id: 'H014', scope: 'hole', priority: 80, enabled: true,
    conditions: [{ field: 'puttCategory', operator: 'eq', value: 'three_putt_plus' }],
    result: {
      insightType: 'three_putt', severity: 'warning',
      title: '3퍼트',
      summaryTemplate: '{holeNumber}번 홀에서 3퍼트 이상을 기록했습니다.',
      recommendationTemplate: '첫 퍼트를 2m 이내로 붙이는 것이 목표입니다. 롱 퍼트 거리 감각을 키우세요.',
      tags: ['putting', 'three_putt'],
    },
  },
  {
    id: 'H015', scope: 'hole', priority: 85, enabled: true,
    conditions: [
      { field: 'puttCategory', operator: 'eq', value: 'three_putt_plus' },
      { field: 'gir',          operator: 'eq', value: true },
    ],
    result: {
      insightType: 'gir_three_putt', severity: 'warning',
      title: 'GIR 후 3퍼트 — 기회 낭비',
      summaryTemplate: '{holeNumber}번 홀에서 그린을 잡고도 3퍼트로 스코어를 잃었습니다.',
      recommendationTemplate: '그린 안착 후 첫 퍼트의 방향과 거리에 집중하세요.',
      tags: ['putting', 'gir', 'waste'],
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
];
