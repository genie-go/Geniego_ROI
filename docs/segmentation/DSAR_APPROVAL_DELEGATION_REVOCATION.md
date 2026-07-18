# DSAR — Approval Delegation Revocation (§44 기록 항목)

> EPIC 06-A-01 Delegation Foundation · 289차 13회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §44 Revocation(1858-1875) · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · ADR: [ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md) · 포맷 exemplar: [DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md)
> **분모 측정기 실측**: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md --sec=44` → **Revocation 기록 항목 11**(불릿11·번호0·육안 금지·측정기 산출). 닫는 문장 "완료된 Decision Snapshot은 유지한다"는 불릿 아님 → 분모 밖(§2 verbatim 명기).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Delegation Revocation 경로 | 🔴 Delegation revoke 개념 **전무**(ⓑ §1·§4 §59) — Delegation 엔티티 자체 부재이므로 "위임을 철회한다"는 상태전이·핸들러 0 | `ABSENT`(신설) |
| `revoke` grep 인접 | `AgencyPortal.php:304,381` `revoked_at` · API 키 revoke(자격/토큰 폐기) — 🔴**Delegation revoke 아님**(ⓑ §2.3·§0 grep 오염 레지스트리) | `KEEP_SEPARATE_WITH_REASON` |
| 🔴 `revoked_at` in-place 소거 반례 | `AgencyPortal.php:304,381` — 재요청/승인 시 `revoked_at=NULL` **in-place 소거**(과거 철회 상태를 현재로 덮어씀·이력 보존 없음). §44 "완료된 Decision Snapshot 유지"의 **정면 반례** — 복제 금지 | `BLOCKED_HISTORICAL_INTEGRITY_RISK` |
| 영향 Task 3필드(active/claimed/pending) | 🔴 Approval Task/Assignment/Claim 도메인 **미구현**(EPIC 06-A-02 대상·§0 상세구현 제외 목록) — 철회 시 영향 산정 대상 없음 | `ABSENT` |
| evidence 정본 | `SecurityAudit::verify():56-68`(preimage ts 저장·`hash_equals`·`prev_hash` 체인·tenant) — 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER`(확장 대상) |

★**Delegation Revocation 자체가 부재**하므로 기록 항목 단위 커버는 원천 불가. 아래는 원문 전사(신설 명세)이며 현행 대조는 "부재/인접/선행"을 기록한다. `VALIDATED_LEGACY` 0 (cover 0).

## 1. 원문 전사 + 판정 — **§44 기록 항목 11종**

| # | 원문 기록 항목 | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | revoked_by | 🔴 Delegation revoke 경로 부재 → 철회 주체 기록 컬럼 0. `AgencyPortal revoked_at`은 대행사 접근권 철회(Delegation revoke 아님·ⓑ §2.3) | `ABSENT` |
| 2 | revoked_at | 🔴 Delegation 철회 시각 컬럼 부재. 인접 `AgencyPortal.php:304,381 revoked_at`은 **in-place 소거 안티패턴**(§0·§2 참조·복제 금지) — 불변 append 아님 | `ABSENT` |
| 3 | revocation reason | 🔴 철회 사유 기록 부재(Delegation revoke 전무) | `ABSENT` |
| 4 | immediate 여부 | 🔴 즉시/예약 철회 구분 부재 — 철회 상태전이 자체 0 | `ABSENT` |
| 5 | affected active tasks | 🔴 Approval Task 도메인 미구현(06-A-02)·활성 Task 집합 산정 불가 | `ABSENT` |
| 6 | affected claimed tasks | 🔴 Task Claim 도메인 미구현(06-A-02)·Claim 엔티티 0 | `ABSENT` |
| 7 | affected pending decisions | 🔴 Approval Decision(§3.1) 부재 — pending decision 집합 없음(Decision 시점 재검증 5.11 미구현) | `ABSENT` |
| 8 | migration policy | 🔴 Delegation 철회 시 미완료 Task 원복/이관 정책 부재 — 이관 대상 도메인 0 | `ABSENT` |
| 9 | notification reference | 🔴 발송 인프라(Postfix/OpenDKIM·NaverSms SENS)는 실재하나([[reference_mail_sms_infra]]) **Delegation revoke 트리거 참조 없음** — 철회 알림 연결 0 | `ABSENT` |
| 10 | reconciliation reference | 🔴 Delegation Reconciliation(§43) 엔티티 부재 → 참조 대상 없음 | `ABSENT` |
| 11 | evidence | 🔴 정본 = `SecurityAudit::verify():56-68`(검증형 근거·확장 대상)·`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 11 / 11 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 1(evidence) · `ABSENT` 10.

> 🔴 **커버 0.** Delegation Revocation 경로가 통째로 부재하므로 어떤 기록 항목도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 1건(evidence=SecurityAudit)은 **확장 대상 인접 자산**이지 커버가 아니다.

## 2. 원문 verbatim 명기 + "완료 Decision Snapshot 유지" 원칙

> **§44 Revocation 시 기록**(무수정):
> revoked_by / revoked_at / revocation reason / immediate 여부 / affected active tasks / affected claimed tasks / affected pending decisions / migration policy / notification reference / reconciliation reference / evidence
>
> **완료된 Decision Snapshot은 유지한다.**

- 🔴 **"완료된 Decision Snapshot은 유지한다" = SecurityAudit 불변성으로 구현하라** — 철회는 과거 결재 근거(Decision Snapshot)를 **소급 삭제/변경하지 않는다**. 정본 = `SecurityAudit::verify():56-68` 해시체인 확장(변조 시 `broken_at` 반환·`hash_equals`·`prev_hash`). `menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]).
- 🔴 **`AgencyPortal.php:304,381 revoked_at=NULL` in-place 소거 반례를 복제 금지**(`BLOCKED_HISTORICAL_INTEGRITY_RISK`) — 재요청 시 과거 철회 상태를 현재로 덮어써 이력이 소실된다. Delegation 철회는 이 안티패턴을 **모범이 아니라 반례**로 기록하고, 철회를 **불변 append**(이력 보존·과거 Snapshot 대체 금지·§40 정합)로 동결하라.

## 3. 규칙

- 🔴 **Delegation Revocation 은 신설이나, `revoke` 인접(AgencyPortal·API키)을 재사용 금지** — 그것은 접근권/토큰 폐기이지 승인 권한 위임의 철회가 아니다(ⓑ §2.3). 별도 신설.
- 🔴 **영향 Task 3필드(active/claimed/pending)는 EPIC 06-A-02 Assignment/Claim/Decision 선행** — 본 블록에서 Task 재검증/원복을 상세구현하지 않는다(§0 제외 목록). 철회 시 migration policy 는 06-A-02 이후.
- 🔴 **evidence 를 `menu_audit_log.hash_chain` 으로 구현 금지** — 정본 = `SecurityAudit::verify()` 확장(중복 엔진 금지).
