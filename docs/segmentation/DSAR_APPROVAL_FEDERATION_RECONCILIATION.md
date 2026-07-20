# DSAR — Authorization Federation Reconciliation Governance (Part 3-18 §27)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_18_FEDERATION_CROSS_DOMAIN_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FEDERATION_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FEDERATION_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FEDERATION_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC) — APPROVAL_FEDERATION_RECONCILIATION(§27)

Federation Reconciliation Governance는 **연합 도메인 간 인가 상태를 비교하여 불일치를 산출하고, 수렴 방향(convergence)을 결정**하는 계약이다. §24 Drift가 "벌어짐을 관측"이라면 §27 Reconciliation은 "무엇이 기준이고 무엇을 맞출지"를 다룬다. §27은 5개 비교 대상을 정의한다.

- **Local Domain** — 로컬 PDP가 보유한 인가 상태(정책·역할·scope).
- **Remote Domain** — 원격 파트너가 보유·주장하는 인가 상태.
- **Shared Metadata** — 양측이 공유하기로 한 role/scope/capability 카탈로그.
- **Snapshot** — 특정 시점 합의된 상태 스냅샷(reconciliation의 기준선).
- **Decision** — 개별 인가 결정 결과의 양측 대조(같은 입력에 같은 verdict가 나오는가).

계약상 Reconciliation은 **비교 → 차이 분류(local-only/remote-only/conflict) → 수렴 정책 적용(deny 우선·최신 스냅샷 우선 등) → 감사**의 파이프라인이며, 자동 mutation은 승인 정책 하에서만 허용(무단 원격 변경 금지).

## 2. Substrate 매핑

| SPEC 개념(§27) | 현행 substrate | 상태 |
|---|---|---|
| Local Domain 인가 상태 | 로컬 PDP(`TeamPermissions.php:695`) | 존재 — 비교 좌변 substrate |
| Remote Domain 인가 상태 | 부재(원격 도메인 없음) | **ABSENT — 비교 우변 미완** |
| Snapshot/Decision 대조 기록 | `SecurityAudit.php:14-67` | 감사 채널 재사용 가능 |
| Shared Metadata 카탈로그 비교기 | 부재 | **ABSENT** |
| 수렴(convergence) 정책 엔진 | 부재 | **ABSENT** |

## 3. 설계 계약

- **ReconciliationInput** — `{local: PDPState, remote: PDPState|null, shared_metadata, baseline_snapshot}`. local은 `TeamPermissions.php:695` 로컬 PDP에서 도출.
- **DiffClassification** — 각 비교 항목을 `local_only | remote_only | conflict | in_sync`로 분류. conflict는 §26 Revalidation·상위 승인으로 에스컬레이션.
- **Convergence Policy** — 기본 deny-우선 + 최신 합의 Snapshot 우선. 원격 상태로의 수렴이 로컬 mutation을 요구하면 **승인 정책 게이트 통과 후에만** 반영(자동 무단 변경 금지).
- **감사·fail-closed** — 모든 비교/수렴 결정을 `SecurityAudit.php:14-67`에 append. remote=null(원격 부재)이면 reconciliation은 local baseline drift 관측(§24 입력)까지만 수행하고 수렴 판정 보류.

## 4. KEEP_SEPARATE

- DataTrust(`DataPlatform.php:281`)·GraphScore(`GraphScore.php:31`)·PriceOpt(`PriceOpt.php:1496`·`:1583`) — 데이터 정합/그래프/가격 도메인. Federation 인가 상태 reconciliation과 무관. 통합 금지.
- `TeamPermissions.php:695`는 **로컬 PDP(비교 좌변)로만 재사용**하며, 이를 remote 비교 로직으로 확장 오용하지 말 것.

## 5. 판정

**ABSENT** — federation reconciliation(Local/Remote/Shared Metadata/Snapshot/Decision 비교 및 수렴) grep 0. 현행은 로컬 PDP(`TeamPermissions.php:695`) 단일 좌변만 존재하고 **원격 도메인 부재로 비교 대상 자체가 미완**. §27 전체 순신설, §24 Drift·§26 Revalidation의 기반 비교 계층. **NOT_CERTIFIED · BLOCKED_PREREQUISITE**(원격 도메인·연합 토폴로지 부재).
