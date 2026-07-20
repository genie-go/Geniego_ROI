# DSAR — Runtime SoD Enforcement: SoD 레지스트리 (APPROVAL_SOD_REGISTRY)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_10_RUNTIME_SOD_ENFORCEMENT_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_SOD_ENFORCEMENT_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_SOD_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_SOD_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_SOD_REGISTRY`는 Part 3-10 Canonical Entity 목록의 최상위 등록소(SPEC §2 첫 항목)로, 조직의 모든 SoD 통제 자산을 **중앙에서 등록·색인·조회**하는 거버넌스 레지스트리다.

- **구현 목표 근거**: SPEC §1-1 "SoD Registry" — Conflict Rule Registry(§1-2)·Conflict Matrix(§1-3) 위에서 이들을 총괄 등록.
- **색인 요구(SPEC §37)**: Conflict Rule·Role·Permission·Scope·Transaction·Workflow·Severity·Status 8축 인덱스를 구축해 Runtime Lookup ≤ 5ms(SPEC §38)를 지지한다.
- 역할: 개별 Rule/Matrix/Conflict 엔티티의 소유권·버전·상태(Status)·테넌트 소속을 등록하는 카탈로그층. 실 평가는 Runtime Evaluator가 수행하고, Registry는 그 평가가 참조할 자산의 **정본 목록·색인**을 제공한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 개념 축 | 판정 | 근거(GT file:line) |
|---|---|---|
| SoD Registry / Conflict Rule / Conflict Matrix 등록소 | **ABSENT** | GT② §2 "SoD Registry / Conflict Rule / Conflict Matrix = ABSENT" — `toxic\|conflict.?matrix\|sod\|segregation` → SAML `SPSSODescriptor` 오탐만 |
| 상충 자산 전용 색인(Role×Role 등) | **ABSENT(grep 0)** | GT② §2 "role×role/perm×perm 상충 전용 구조 0" |
| 등록 대상이 될 유일 실 통제(재활용원) | PRESENT | Mapping self-approval dual-control `Mapping.php:268-271`(GT① §A) |
| 감사·증거 기록 기반(Registry 변경 이력용 재활용) | PRESENT | `SecurityAudit.php:14-33`·`:56-69` 해시체인 append-only(GT① §F) |
| 검토·증거 저장 패턴(추가전용 카탈로그 선례) | PRESENT | `AccessReview.php:66-80`·`:219-224` justification 필수(`:192` fail-secure)(GT① §F) |

Registry 자체는 순신규다. 다만 등록·이력화의 **불변 기록 기반**(SecurityAudit 해시체인)과 **추가전용 카탈로그 선례**(access_review_item)를 재활용(Extend)한다.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·불변버전/테넌트격리)

- **등록 엔티티**: SPEC §2 20종(RULE·MATRIX·ROLE_CONFLICT·PERMISSION_CONFLICT·SCOPE_CONFLICT·CONTEXT_CONFLICT·TRANSACTION_CONFLICT·SESSION·RUNTIME·EXCEPTION·OVERRIDE·COMPENSATING_CONTROL·SNAPSHOT·EVIDENCE·DIGEST·ANALYTICS·DRIFT·SIMULATION·REVALIDATION·RECONCILIATION)를 등록.
- **색인 필드(SPEC §37)**: Conflict Rule / Role / Permission / Scope / Transaction / Workflow / Severity / Status.
- **불변성**: SPEC §36 "Immutable Conflict Rule" — 등록된 Rule은 불변 버전으로 보관(ADR D-2). 갱신은 새 버전 추가.
- **테넌트 격리**: SPEC §36 "Tenant Isolation" — 등록소는 테넌트별 격리. 재활용 기반 `index.php:614-619`(X-Tenant-Id 서버도출 강제)로 위조 차단(GT① §E).
- **무결성**: SPEC §36 Digest Validation — 등록 자산 변경은 SecurityAudit 불변체인(`SecurityAudit.php:14-33`)에 기록(ADR D-5).

## 4. KEEP_SEPARATE (동음이의 흡수금지)

- **"conflict" 41파일 전부 SoD 무관**(GT② B-1): HTTP 409 Conflict·ChannelSync/MenuPricingSync 데이터 sync conflict·merge/scheduling conflict. Registry가 이들을 SoD 자산으로 등록해서는 안 된다.
- **위임상한 클램프**(GT② B-4): `TeamPermissions.php:599-621`·`:642-658` = 권한상승 방지이지 SoD 자산 아님 — 등록 대상 아님.
- **menu_audit_log**(GT② B-7): `AdminMenu.php:123-140` 메뉴 거버넌스 체인 — SoD 충돌 증거 아님. SecurityAudit(범용)과 별개 관심사.
- **acl_permission**(GT② §2): menu×action 매트릭스지 SoD 상충 매트릭스 아님.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: **ABSENT(순신규)**. SoD Registry·색인 전용 구조는 grep 0(GT② §2). 코드 변경 0 · NOT_CERTIFIED.
- **재활용(Extend)**: SecurityAudit 해시체인(변경 이력)·access_review_item(추가전용 카탈로그 선례)·cross-tenant 격리. 대체 아님.
- **선행의존**: BLOCKED_PREREQUISITE — Part 1~3-9 인증 완료 후 실 구현(ADR §4). Registry는 RULE/MATRIX/Conflict 엔티티가 확정되어야 등록 대상이 생기므로, 본 시리즈 나머지 DSAR의 상위 골격이다.
