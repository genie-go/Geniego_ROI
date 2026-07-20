# DSAR — Authorization Observability & Forensics: 증거 보관연속성 (APPROVAL_CHAIN_OF_CUSTODY)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_14_AUTHORIZATION_OBSERVABILITY_FORENSICS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OBSERVABILITY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OBS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OBS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_CHAIN_OF_CUSTODY`(SPEC §2)는 증거의 전 생애를 불변 기록하는 보관연속성 엔티티다. SPEC §10은 기록 대상을 **Evidence 생성·접근·복사·Export·보존·폐기** 6종으로 규정하고 "모든 행위는 불변(Immutable)으로 기록한다"를 불변조건으로 명시한다. 이는 법정 수준 포렌식(ADR §1·ISO 27037/NIST SP 800-61)에서 증거의 무결성 연쇄를 보증하기 위한 것으로, 누가·언제·어떤 증거를 접근/복사/반출했는지를 위·변조 불가능하게 남긴다. Chain of Custody는 §9 Evidence Chain(증거 자체의 해시연쇄)과 구별되며 **증거에 대한 행위 이력**을 다룬다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §10 행위 | 판정 | 실존 근거(GT ①②/ADR) |
|---|---|---|
| Evidence Export 기록(반출 감사) | **PARTIAL(불일치)** | `siemPush`는 반출을 logAudit 기록(`Compliance.php:508`)하나, `auditExport`는 자기 export를 감사 미기록(`Compliance.php:265-300`) — GT②§4·ADR D-4 custody 단절 |
| Evidence 생성/접근/복사/보존/폐기 기록 | **ABSENT(순신규)** | GT②§2 "증거 생성/접근/복사/export/보존/폐기 불변기록 substrate 전무" · GT①§3 |
| 보존(Retention)/폐기 정책 | **ABSENT** | retention/purge/legal-hold grep 0(`Compliance.php`) — GT②§4. 로그 DELETE 경로 없음은 append-only 부수효과일 뿐 정책 아님 |
| Legal-hold | **ABSENT** | GT②§2·ADR D-4 순신규 |
| 불변 기록 앵커(§10 Immutable) | **PRESENT(재활용 기반)** | `SecurityAudit.php:14-33`(append-only·UPDATE/DELETE 부재)·`:56-68`(verify)를 custody 기록의 불변 기반으로 승격 — ADR D-1·D-4 |
| 반출 이력 재사용 패턴 | **PRESENT** | `Compliance.php:508`(siemPush 반출 logAudit) — ADR D-4 "그 패턴 일반화" |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·불변/해시체인/테넌트격리)

- **custody 이벤트 필드**(SPEC §10): `action`∈{생성, 접근, 복사, Export, 보존, 폐기}·행위자(subject)·`timestamp`(UTC)·대상 증거 참조(§26 Chain Position)·사유. 상위 Authorization Event Model(§3) Correlation/Trace ID 연계.
- **불변 기록**(SPEC §10·§33 Immutable Event): 모든 custody 행위는 `SecurityAudit.php:14-33` append-only 해시체인 위에 기록하고 `:56-68` verify로 무결성 검증(ADR D-1). UPDATE/DELETE 경로 신설 금지.
- **Export custody 일반화**(ADR D-4): 현행 반출 감사 불일치(`Compliance.php:508` 기록 vs `:265-300` 미기록)를 해소하도록, 모든 Evidence Export는 반출 전 custody 기록을 강제(fail-secure). `AccessReview.php:192-194`(justification 필수·증거 없는 결정 차단) 선례를 반출 사유 강제에 확장.
- **Retention/Legal-hold**(SPEC §10·§18 Long-term Retention): 보존·폐기 정책과 legal-hold(폐기 동결)를 순신설(GT②§4·ADR D-4). 폐기는 정책 승인 + custody 기록 후에만.
- **테넌트 격리**(SPEC §33): `Compliance.php:176` fail-closed 테넌트 스코프 재사용(ADR D-7).

## 4. KEEP_SEPARATE / 부수갭 (custody 단절·수정 아님)

- **★부수갭(custody 단절 실측)**: `Compliance.php:265-300`(auditExport)이 자기 export 액션을 감사 기록하지 않아 증거 접근/반출의 chain of custody가 끊긴다(대조: `siemPush` `Compliance.php:508` 반출 logAudit). 이는 본 엔티티가 신설로 해소할 **갭 근거이며 수정 대상 아님**(GT②§4·ADR D-8 갭≠결함·라이브 결함 여부 별도 판단·재플래그 금지).
- **KEEP_SEPARATE**(GT②§5): ops `audit_log`(`Compliance.php:176-187`·`:177`)는 성장/알림 운영 감사이지 authz 증거 custody 아님(collectAuditEvents가 테넌트 스코프에서 명시 배제 `:176`). 마케팅 감사(OrderHub/attribution touch)·인프라 `SystemMetrics.php:1-60`도 범위 밖. 흡수 금지.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: **ABSENT(순신규 골격) / PARTIAL(Export 기록 불일치) / PRESENT(불변 앵커 재활용)**. Chain of Custody 6행위·Retention·Legal-hold 전체가 그린필드(GT②§2). 불변 기록 기반은 `SecurityAudit.php:14-68`에 실존하고, 반출 custody 패턴은 `Compliance.php:508`에 선례가 있으나 auditExport에서 단절(`:265-300`).
- **재활용(Extend·흡수 아님)**: SecurityAudit append-only/verify 승격 + siemPush 반출 로깅 패턴 일반화 + AccessReview justification 강제 선례.
- **선행의존**: BLOCKED_PREREQUISITE — Part 1~3-13 인증 후 RP-track 실구현. 코드 변경 0 · NOT_CERTIFIED · custody 단절은 설계로만 해소(수정 아님).
