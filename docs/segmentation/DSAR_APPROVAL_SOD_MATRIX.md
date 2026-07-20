# DSAR — Runtime SoD Enforcement: 충돌 매트릭스 (APPROVAL_SOD_MATRIX)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_10_RUNTIME_SOD_ENFORCEMENT_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_SOD_ENFORCEMENT_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_SOD_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_SOD_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_SOD_MATRIX`는 개별 Rule을 집계해 **어떤 좌·우 개체 쌍이 상충하는지를 조회 가능한 매트릭스**로 보관하는 엔티티(SPEC §2 3번)다.

- **Matrix 저장 필드(SPEC §14)**: Left Entity · Right Entity · Conflict Type · Severity · Resolution Strategy.
- **심각도 등급(SPEC §15)**: Low · Medium · High · Critical · Regulatory.
- Runtime Evaluator(SPEC §22)가 매 요청 활성 역할·권한 조합을 Matrix에 대조해 상충 여부를 판정한다. Matrix는 무결성 제약 대상(SPEC §36 Matrix Integrity).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 개념 축 | 판정 | 근거(GT file:line) |
|---|---|---|
| Conflict Matrix(상충 쌍 매트릭스) | **ABSENT** | GT② §2 "SoD Registry / Conflict Rule / Conflict Matrix = ABSENT"; `conflict.?matrix\|toxic` → SAML `SPSSODescriptor` 오탐만(GT② §2) |
| Severity 등급 체계(SoD 전용) | **ABSENT** | GT② §2·§5 — SoD 충돌 이벤트 전용 스키마 0 |
| 매트릭스를 대조할 Runtime Evaluator | **ABSENT(grep 0)** | GT② §2 "인가 게이트는 RBAC 스코프이지 동시보유 역할 충돌 판정 아님"(`index.php:572-611`) |
| 매트릭스 대조를 삽입할 PEP(재활용원) | PRESENT | `index.php:572-611`·`UserAuth.php:1134-1147`·`Wms.php:557-590`(GT① §C·ADR D-1) |
| 매트릭스 무결성 기록 기반(재활용) | PRESENT | `SecurityAudit.php:14-33`·`:56-69` hash_equals 변조탐지(GT① §F) |

acl_permission(menu×action)은 존재하나 GT② §2가 "SoD 매트릭스 아님"으로 명시 — 흡수 대상 아님. Matrix는 순신규.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·불변버전/테넌트격리)

- **행 구조(SPEC §14)**: (Left Entity, Right Entity, Conflict Type, Severity, Resolution Strategy). Rule(§2-2)의 집계 뷰.
- **Severity(SPEC §15)**: Low/Medium/High/Critical/Regulatory 5단. Risk Engine(SPEC §17)이 Critical Permission·Financial/Compliance Impact로 승격.
- **무결성 제약**: SPEC §36 Matrix Integrity — 변조 방지. Digest Validation(§36)·SecurityAudit 체인(`SecurityAudit.php:14-33`)으로 append 기록(ADR D-5).
- **불변버전**: 규칙 원자가 불변(SPEC §36 Immutable Conflict Rule)이므로 매트릭스도 버전 스냅샷 보관(ADR D-2).
- **테넌트 격리**: SPEC §36 Tenant Isolation · `index.php:614-619` 재활용(GT① §E).
- **성능(SPEC §38)**: Conflict Lookup ≤ 5ms · Cache Hit ≥ 97% · Runtime Conflict Evaluation ≤ 10ms.
- **색인(SPEC §37)**: Severity·Status 축 인덱스로 조회 가속.

## 4. KEEP_SEPARATE (동음이의 흡수금지)

- **"conflict" 41파일 전부 SoD 무관**(GT② B-1): HTTP 409 Conflict·ChannelSync/MenuPricingSync 데이터 sync conflict·merge/scheduling conflict. Matrix가 이를 상충 쌍으로 적재 금지. ★"conflict" grep 히트를 SoD Matrix로 오인 금지.
- **acl_permission**(GT② §2): menu×action 인가 매트릭스지 SoD 상충 매트릭스 아님.
- **비즈 동음이의**(GT② B-6): `ModelMonitor.php`(model drift)·`AnomalyDetection.php`(마케팅)·`PgSettlement.php`(정산 recon) = SoD Drift/Recon(SPEC §27·§29) 아님.
- **menu_audit_log**(GT② B-7): `AdminMenu.php:123-140` = 메뉴 거버넌스 체인, SoD 충돌 증거·매트릭스 아님.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: **ABSENT(순신규)**. Conflict Matrix·Severity 전용 구조 grep 0(GT② §2). 코드 변경 0 · NOT_CERTIFIED.
- **재활용(Extend)**: 매트릭스 대조는 PEP 게이트에 삽입(ADR D-1), 무결성 기록은 SecurityAudit 체인, 격리는 cross-tenant. 대체 아님.
- **선행의존**: BLOCKED_PREREQUISITE — Matrix는 Rule(§2-2)의 집계로서 Registry(§1) 하위. 최대 공백=Conflict Matrix·Runtime Evaluator 부재(ADR §2.3). Part 1~3-9 인증 후 실 구현(ADR §4).
