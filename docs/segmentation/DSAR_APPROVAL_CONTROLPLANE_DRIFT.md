# DSAR — Authorization Control Drift (Part 3-19 §26)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_19_AUTONOMOUS_CONTROL_PLANE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_CONTROL_PLANE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_CONTROLPLANE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_CONTROLPLANE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)
Authorization Control Drift란 **선언된 인가 제어면(Control Plane)의 의도 상태**와 **실제 런타임에서 관측되는 유효 상태** 사이의 발산(divergence)을 지속 탐지·분류·경보하는 거버넌스 계약이다. 본 Part 3-19 §26은 인가 제어의 다섯 드리프트 차원을 정의한다.

| 드리프트 차원 | 정의 | 의도-런타임 발산 예 |
|---|---|---|
| Configuration Drift | 선언 정책/스코프 설정과 실제 적용 설정의 불일치 | app_setting 미러가 최신 정책 버전을 뒤따르지 못함 |
| Region Drift | 리전별 제어면 배포 상태의 편차 | 운영/데모 리전 간 정책 버전 스큐 |
| Cluster Drift | 노드/프로세스군 간 유효 정책의 불균질 | php-fpm 풀 재적재 지연으로 일부 워커가 구 정책 유지 |
| Version Drift | 배포 버전과 활성 버전의 격차 | 마이그레이션 적용본과 코드 기대본의 스큐 |
| Runtime Drift | 부팅 후 시간 경과에 따른 상태 이탈 | 캐시된 권한 판정이 갱신 이벤트를 흡수하지 못함 |

## 2. Substrate 매핑
| 계약 요구 | 현행 substrate | file:line | 판정 |
|---|---|---|---|
| 제어 상태 변경 감사 흐름 | SecurityAudit append-only | `SecurityAudit.php:14-64` | 부분 원천(변경 기록만, 드리프트 판정 부재) |
| 선언 설정 저장소 | app_setting | `Db.php:308-321` | 원천값 존재(의도 상태 비교 미구현) |
| 정책 미러 스냅샷 | AdminPlans 플랜 미러 | `AdminPlans.php:53-72` | 미러만(드리프트 비교 없음) |
| 헬스 관측면 | Health probe | `Health.php:56-67` | 가용성만(제어 발산 미탐지) |

## 3. 설계 계약
- **DriftDetector(신설)**: 의도 상태(선언 설정)와 유효 상태(런타임 관측)를 주기적으로 대조하여 차원별 드리프트 레코드를 산출한다. 자체 판정 로직을 두지 않고 **Reconciliation(§29) 비교 결과를 입력으로** 소비한다 — 드리프트=Reconciliation 발산의 시간축 파생.
- **분류**: 각 드리프트는 {차원, 심각도, 최초관측ts, 지속시간, 예상원인}으로 정규화한다. append-only 감사 흐름(`SecurityAudit.php:56`)에 위임하여 물리 삭제 없이 누적한다.
- **경보 게이트**: 심각도 임계 초과 시에만 경보. 임계 미만은 관측 로그로만 유지(경보 폭주 억제).
- **선행 의존**: Control Plane/Snapshot 부재(§29 판정)로 인해 유효 상태 대조 대상이 미완 → 본 엔진은 BLOCKED_PREREQUISITE.

## 4. KEEP_SEPARATE
- **ML 모델 드리프트**는 인가 제어 드리프트와 도메인이 다르다. `ModelMonitor.php:17-19`·`:42-44`가 관장하는 feature/prediction drift를 인가 제어면으로 흡수 금지 — 별개 엔진 유지.
- 재무/재고 reconcil 계열(§29 참조)도 본 드리프트 엔진과 분리.

## 5. 판정
**ABSENT** — control drift 관련 코드 grep 0. 현행은 변경 감사(`SecurityAudit.php:14-64`)·설정 저장(`Db.php:308-321`)·플랜 미러(`AdminPlans.php:53-72`)뿐으로 의도-런타임 대조 및 드리프트 분류 엔진 부재. Reconciliation(§29) 비교 기반 위에 순신설 필요. 선행 부재로 BLOCKED_PREREQUISITE. NOT_CERTIFIED.
