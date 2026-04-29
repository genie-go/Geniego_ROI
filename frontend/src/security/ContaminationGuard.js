/**
 * 🛡️ Production Contamination Guard (PCG)
 * ─────────────────────────────────────────
 * 운영 환경에 데모/목/가상 데이터가 절대 유입되지 않도록 
 * 실시간 감시하는 방어 계층입니다.
 * 
 * ┌─────────────────────────────────────────────────┐
 * │ 동작 방식:                                        │
 * │ 1. _isDemo=false(운영)에서 자동 활성화             │
 * │ 2. GlobalDataContext state 변경 시 데이터 검사     │
 * │ 3. 오염 감지 시 즉시 데이터 제거 + 콘솔 경고       │
 * │ 4. 개발 환경에서는 빌드 시 정적 분석 실행          │
 * └─────────────────────────────────────────────────┘
 */

// ══════════════════════════════════════════════════════
//  1. 환경 감지
// ══════════════════════════════════════════════════════
const _isDemo = (() => {
  try {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    return host.includes('roidemo') || host.includes('demo') ||
           (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DEMO_MODE === 'true');
  } catch { return false; }
})();

// ══════════════════════════════════════════════════════
//  2. 오염 마커 패턴 (데모/목/가상 데이터 식별자)
// ══════════════════════════════════════════════════════
const CONTAMINATION_MARKERS = [
  // ID 프리픽스
  /^CR-\d{3}$/,        // 크리에이터 시드 ID
  /^RV-\d{3}$/,        // UGC 리뷰 시드 ID
  /^KC-\d{3}$/,        // 카카오 캠페인 시드 ID
  /^CT-\d{3}$/,        // 콘텐츠 시드 ID
  /^ORD-[A-Z]\d{3}$/,  // 주문 시드 ID
  /^INV-\d{4}$/,       // 재고 시드 ID

  // 문자열 마커
  /demo_/i, /mock_/i, /test_/i, /seed_/i, /fake_/i, /sample_/i,
  /__demo/i, /__test/i, /tmp_/i,
];

// 브랜드명 패턴 (시드 데이터에서만 사용되는 특정 값)
const BRAND_MARKERS = [
  '뷰티해나', '민지뷰티', '스킨케어주의', '럭셔리수진', '틱톡예나',
  '남자뷰티 현우', '약사언니', '헤어요정 지수',
  '뷰티민지', 'SkinCareLab', 'TikTok뷰티', 'Dr.Skin', '글로우업', 'MakeupPro',
];

// ══════════════════════════════════════════════════════
//  3. 데이터 검사 엔진
// ══════════════════════════════════════════════════════

/**
 * 단일 값이 오염 마커를 포함하는지 검사
 * @param {*} value - 검사할 값
 * @returns {{ contaminated: boolean, marker: string|null }}
 */
function checkValue(value) {
  if (value == null) return { contaminated: false, marker: null };

  const str = String(value);

  // ID 패턴 검사
  for (const pattern of CONTAMINATION_MARKERS) {
    if (pattern.test(str)) {
      return { contaminated: true, marker: str };
    }
  }

  // 브랜드명 검사
  for (const brand of BRAND_MARKERS) {
    if (str.includes(brand)) {
      return { contaminated: true, marker: brand };
    }
  }

  return { contaminated: false, marker: null };
}

/**
 * 배열 데이터셋을 심층 검사
 * @param {Array} dataset - 검사할 데이터 배열
 * @param {string} datasetName - 데이터셋 이름 (로깅용)
 * @returns {{ clean: boolean, violations: Array }}
 */
function auditDataset(dataset, datasetName) {
  if (!Array.isArray(dataset)) return { clean: true, violations: [] };

  const violations = [];

  for (let i = 0; i < dataset.length; i++) {
    const item = dataset[i];
    if (typeof item !== 'object' || item === null) continue;

    // 1차: id, name 필드 우선 검사
    const priorityFields = ['id', 'name', 'handle', 'product', 'title', 'channel'];
    for (const field of priorityFields) {
      if (item[field]) {
        const result = checkValue(item[field]);
        if (result.contaminated) {
          violations.push({
            dataset: datasetName,
            index: i,
            field,
            value: item[field],
            marker: result.marker,
          });
        }
      }
    }

    // 2차: 모든 문자열 필드 검사 (1차에서 걸리지 않은 경우)
    if (violations.length === 0) {
      for (const [key, val] of Object.entries(item)) {
        if (typeof val === 'string' && val.length > 0 && !priorityFields.includes(key)) {
          const result = checkValue(val);
          if (result.contaminated) {
            violations.push({
              dataset: datasetName,
              index: i,
              field: key,
              value: val,
              marker: result.marker,
            });
          }
        }
      }
    }
  }

  return { clean: violations.length === 0, violations };
}

// ══════════════════════════════════════════════════════
//  4. 실시간 가드 (운영 환경 전용)
// ══════════════════════════════════════════════════════

/**
 * 운영 환경에서 Context state 변경 시 자동 호출되는 가드
 * 오염 데이터가 감지되면 즉시 빈 배열로 교체하고 경고 로그 기록
 * 
 * @param {string} key - state 키 (예: 'creators', 'ugcReviews')
 * @param {Array} data - 변경되는 데이터
 * @param {Function} setter - React setState 함수
 * @returns {boolean} true if data is clean, false if contaminated
 */
export function guardProductionState(key, data, setter) {
  // 데모 환경에서는 가드 비활성화
  if (_isDemo) return true;

  // 빈 배열은 항상 안전
  if (!Array.isArray(data) || data.length === 0) return true;

  const { clean, violations } = auditDataset(data, key);

  if (!clean) {
    // 🚨 오염 감지 → 즉시 제거
    console.error(
      `\n🚨 [PCG] CONTAMINATION DETECTED in "${key}"!\n` +
      `   Violations: ${violations.length}\n` +
      violations.map(v =>
        `   ⛔ [${v.index}].${v.field} = "${v.value}" (marker: "${v.marker}")`
      ).join('\n') +
      `\n   ⚡ Action: Data purged → empty array\n`
    );

    // 즉시 빈 배열로 교체
    if (typeof setter === 'function') {
      setter([]);
    }

    // 오염 이벤트 기록
    try {
      const log = JSON.parse(localStorage.getItem('__pcg_violations__') || '[]');
      log.push({
        ts: new Date().toISOString(),
        key,
        count: violations.length,
        samples: violations.slice(0, 3).map(v => `${v.field}=${v.marker}`),
      });
      // 최근 50건만 유지
      if (log.length > 50) log.splice(0, log.length - 50);
      localStorage.setItem('__pcg_violations__', JSON.stringify(log));
    } catch { /* localStorage unavailable */ }

    return false;
  }

  return true;
}

// ══════════════════════════════════════════════════════
//  5. localStorage 오염 스캔 (앱 시작 시 1회 실행)
// ══════════════════════════════════════════════════════

/**
 * 운영 환경에서 localStorage에 데모 데이터가 잔류하지 않는지 검사
 * geniego_demo_ 프리픽스 키가 운영에서 발견되면 즉시 삭제
 */
export function scanLocalStorageContamination() {
  if (_isDemo) return; // 데모에서는 정상

  try {
    const demoKeys = Object.keys(localStorage).filter(k =>
      k.startsWith('geniego_demo_')
    );

    if (demoKeys.length > 0) {
      console.warn(
        `\n⚠️ [PCG] localStorage contamination detected!\n` +
        `   Found ${demoKeys.length} demo keys in production:\n` +
        demoKeys.map(k => `   🗑️ ${k}`).join('\n') +
        `\n   ⚡ Action: All demo keys purged\n`
      );

      demoKeys.forEach(k => localStorage.removeItem(k));
    }
  } catch { /* ignore */ }
}

// ══════════════════════════════════════════════════════
//  6. 빌드 타임 정적 검사용 유틸리티
// ══════════════════════════════════════════════════════

/**
 * CI/CD 파이프라인에서 호출 가능한 전체 검사 함수
 * 반환값이 false면 빌드 실패 처리 권장
 */
export function runFullContaminationAudit(allDatasets) {
  let totalViolations = 0;
  const results = {};

  for (const [name, data] of Object.entries(allDatasets)) {
    const { clean, violations } = auditDataset(data, name);
    results[name] = { clean, violationCount: violations.length };
    totalViolations += violations.length;
  }

  return {
    passed: totalViolations === 0,
    totalViolations,
    results,
  };
}

// ══════════════════════════════════════════════════════
//  7. React Hook — useContaminationGuard
// ══════════════════════════════════════════════════════

/**
 * React 컴포넌트에서 사용하는 오염 방지 훅
 * state 변경 시 자동으로 검사하고 오염 데이터를 차단
 * 
 * @example
 * const { guardedSetter } = useContaminationGuard('creators', setCreators);
 * guardedSetter(newData); // 오염 데이터면 자동 차단
 */
export function createGuardedSetter(key, setter) {
  if (_isDemo) return setter; // 데모에서는 원본 setter 반환

  return (data) => {
    if (guardProductionState(key, data, setter)) {
      setter(data); // 안전한 경우만 실행
    }
    // 오염 시 guardProductionState가 이미 빈 배열로 교체
  };
}

// ══════════════════════════════════════════════════════
//  8. 앱 시작 시 자동 실행
// ══════════════════════════════════════════════════════

if (!_isDemo && typeof window !== 'undefined') {
  // 운영 환경 부팅 시 localStorage 오염 스캔
  scanLocalStorageContamination();

  // 콘솔에 가드 활성 로그
  console.log(
    '%c🛡️ [PCG] Production Contamination Guard — ACTIVE',
    'color: #22c55e; font-weight: 900; font-size: 12px;'
  );
}

export default {
  guardProductionState,
  scanLocalStorageContamination,
  runFullContaminationAudit,
  createGuardedSetter,
  auditDataset,
  checkValue,
};
