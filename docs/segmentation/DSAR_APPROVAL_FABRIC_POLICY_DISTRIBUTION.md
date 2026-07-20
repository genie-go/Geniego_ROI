# DSAR — Approval Policy Distribution (Part 3-16 §5)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_16_UNIFIED_AUTHORIZATION_FABRIC_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FABRIC_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FABRIC_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FABRIC_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의(SPEC)

**APPROVAL_POLICY_DISTRIBUTION**은 인가 정책(authz policy)의 원본(source-of-truth)을 다수의 PEP/PDP 노드에 **안전하게·검증 가능하게·롤백 가능하게** 전파하는 계약이다. 하위 5개 능력을 포함한다.

| 능력 | 계약 요지 |
|------|-----------|
| Versioned Distribution | 모든 정책은 불변 version id(monotonic·content-hash)를 가지며, 노드는 자신이 적용 중인 version을 보고한다. |
| Canary Distribution | 신규 정책은 소수 노드/트래픽에 먼저 적용되어 관측 후 전면 확산. |
| Blue-Green Distribution | 구·신 정책 세트를 동시 보유, 원자적 스위치로 전환. |
| Progressive Rollout | 확산 비율을 단계적(예: 1%→10%→50%→100%)으로 증대, 각 단계 게이트 통과 필수. |
| Emergency Rollback | 임의 시점에 직전 known-good version으로 즉시·전역 되돌리기. |

라이브 authz는 **단일 PHP/MySQL 모놀리스**(in-process PEP `backend/public/index.php:69-622` + PDP `backend/src/Handlers/TeamPermissions.php:695-701`)이므로 "정책을 노드에 배포"하는 개념 자체가 성립하지 않는다. 정책은 코드/DB에 직접 상주하며 배포는 `deploy.ps1`/`deploy.sh`/`.github/workflows/deploy.yml`의 dist 파일 스왑으로 이뤄진다(정책 version/canary/rollback 없음).

## 2. 실존 substrate 매핑

| 능력 | 상태 | 근거(허용목록) |
|------|------|----------------|
| Versioned Distribution | ABSENT | authz 정책 version id/보고 개념 grep 0 |
| Canary Distribution | ABSENT | 노드 부분확산 경로 없음(단일 프로세스) |
| Blue-Green Distribution | ABSENT(오판주의) | 죽은 terraform blue-green(`infra/aws/terraform/*`·default false·미완성)은 라이브 배포 아님 |
| Progressive Rollout | ABSENT | 단계 게이트 전무 |
| Emergency Rollback | ABSENT | 정책 롤백 경로 없음(전면 dist 스왑만) |
| 개념 proto(product-config 미러) | PARTIAL | `backend/src/Handlers/AdminPlans.php:53-72`·`:64-70`·`:157` |

**유일 proto 서술** — `AdminPlans::mirrorPlanTablesToSibling`(`AdminPlans.php:53-72`)은 운영↔형제(데모) DB로 **플랜/제품-config 테이블을 미러링**한다(`:64-70` 대상 테이블 집합, `:157` 미러 호출 지점). 이는 "한 원본을 다른 노드로 전파"라는 형태적 유사성만 있을 뿐 **version id·canary·progressive·rollback이 전무**하며 대상은 authz 정책이 아니라 product-config다. 개념 proto로만 참조하고 fabric 능력으로 **흡수 금지**.

## 3. 설계 계약(규칙)

- **R-5.1** 모든 정책은 content-hash 기반 immutable version을 가진다. 노드는 적용 version을 `SystemMetrics`(`backend/src/Handlers/SystemMetrics.php:60-100`) 유사 헬스 채널로 보고해야 한다(신설 대상).
- **R-5.2** Canary/Progressive 단계 전환은 **관측 게이트(error-rate·deny-spike)** 통과를 전제로 하며 실패 시 자동 정지.
- **R-5.3** Emergency Rollback은 승인 없이 즉시 실행 가능해야 하나 `SecurityAudit`(`backend/src/SecurityAudit.php:4-33`) append-only 로그에 actor·from/to version이 기록되어야 한다.
- **R-5.4** 분산 전파가 실재하기 전까지 정책 SoT는 단일 DB(`backend/src/Db.php:116-166`)로 유지하며, 미러(`AdminPlans.php:53-72`)를 authz 정책 채널로 확대 재사용하지 않는다(격리 원칙).

## 4. KEEP_SEPARATE

- **죽은 terraform blue-green/autoscaling**(`infra/aws/terraform/*`, `infra/docker-compose.yml`): 미완성·default false. authz 정책 배포와 무관 — Blue-Green 능력의 PRESENT 근거로 오판 금지.
- **dist 스왑 배포**(`deploy.ps1`/`deploy.sh`/`.github/workflows/deploy.yml`): 프론트/코드 산출물 배포 파이프라인이지 정책 distribution fabric 아님.

## 5. 판정

**NOT_CERTIFIED · BLOCKED_PREREQUISITE.** APPROVAL_POLICY_DISTRIBUTION 5능력 전부 ABSENT. 유일 형태 proto는 `AdminPlans.php:53-72`의 product-config 미러(version/canary/rollback 부재·개념 proto만·흡수 금지). blue-green은 죽은 terraform이며 라이브 배포 아님. 선행(다중 PEP/PDP 노드·정책 version substrate) 부재로 실구현 불가 — 순신설 대상.
