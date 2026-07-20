# DSAR — Authorization Control Revalidation (Part 3-19 §28)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_19_AUTONOMOUS_CONTROL_PLANE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_CONTROL_PLANE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_CONTROLPLANE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_CONTROLPLANE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)
Authorization Control Revalidation이란 **제어면 상태를 바꾸는 이벤트가 발생할 때마다 기존 유효 인가 부여를 자동으로 재검증**하는 거버넌스 계약이다. 변경이 조용히 부여를 무효화·과대화하는 것을 방지한다. §28은 네 트리거를 정의한다.

| 트리거 | 재검증 촉발 사유 |
|---|---|
| Configuration 변경 | 스코프/파라미터 설정 갱신 시 영향받는 부여 재판정 |
| Policy 변경 | 정책 규칙 개정 시 기존 허용/거부의 정합 재확인 |
| Region 변경 | 리전 제어면 재배포 시 리전 로컬 부여의 유효성 재확인 |
| Cluster 변경 | 노드/워커군 갱신 시 캐시된 판정의 재발급 |

## 2. Substrate 매핑
| 계약 요구 | 현행 substrate | file:line | 판정 |
|---|---|---|---|
| 정책 변경 이벤트 원천 | AdminPlans 플랜 갱신 | `AdminPlans.php:157` | 변경 이벤트 proto(재검증 미연동) |
| 설정 변경 지점 | AdminPlans 설정 반영 | `AdminPlans.php:180` | 쓰기 지점(재판정 트리거 없음) |
| 미러 반영 후처리 | AdminPlans 미러 갱신 | `AdminPlans.php:209` | 미러 갱신만(부여 재검증 부재) |
| 재검증 감사 흐름 | SecurityAudit | `SecurityAudit.php:14-64` | 기록 가능(트리거·엔진 부재) |

## 3. 설계 계약
- **RevalidationEngine(순신설)**: 위 4트리거 이벤트를 구독하여 영향 범위 내 유효 부여 집합을 재판정한다. AdminPlans의 변경 쓰기 지점(`AdminPlans.php:157`·`:180`·`:209`)은 **변경 이벤트 proto 참고만** — 여기에 재검증을 배선하는 것이 아니라, 재검증 엔진이 이 변경을 이벤트로 수신한다.
- **재발급 정책**: 재판정 결과가 기존과 달라진 부여는 갱신·회수하고, 변화 없는 부여는 재검증 타임스탬프만 갱신(멱등).
- **추적성**: 모든 재검증 사이클을 append-only 감사(`SecurityAudit.php:56`)에 근거 첨부.
- **선행 의존**: Control Plane 이벤트 버스·유효 부여 인덱스 부재 → 트리거 구독 대상 미완 → BLOCKED_PREREQUISITE.

## 4. KEEP_SEPARATE
- 재검증은 **인가 부여 재판정** 전용이다. 마이그레이션 스키마 재적용(`migrate.php:9-15`)이나 팀 권한 저수준 조회(`TeamPermissions.php:695-701`)를 본 엔진으로 대체 금지 — 이들은 substrate이지 재검증 엔진이 아니다.
- ML 재학습(`ModelMonitor.php:42-44`)과 무관.

## 5. 판정
**ABSENT** — 변경 이벤트 기반 부여 재검증 코드 부재. AdminPlans 미러 저장(`AdminPlans.php:157`·`:180`·`:209`)은 변경 이벤트 proto로 참고만 할 뿐 재검증 엔진 없음. 순신설 필요. 트리거 원천(Control Plane 이벤트) 부재로 BLOCKED_PREREQUISITE. NOT_CERTIFIED.
