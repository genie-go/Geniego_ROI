# DSAR — JIT Access Governance: 세션 연장·갱신 (APPROVAL_JIT_EXTENSION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_9_JIT_ACCESS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_JIT_ACCESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_JIT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_JIT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

APPROVAL_JIT_EXTENSION은 만료 전 상승 grant의 유효 기간을 **재승인을 거쳐 연장·갱신**한다. SPEC §16(Session Extension) 조건: Remaining Time 확인·재승인·재위험평가·재인증 — **Extension도 새로운 Version 생성**. SPEC §17(Renewal): Manual Renewal·Policy Renewal·Approval Renewal. 무제한 상시 연장은 Zero Standing Privilege(ADR §D-3) 위반이므로 매 연장은 신규 승인·위험재평가·불변 버전을 강제한다. 관련 오류 `JIT_EXTENSION_DENIED`(SPEC §30)·경고 `Extension Required`(§31).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| substrate | 판정 | 근거(파일:라인) | JIT 매핑 |
|---|---|---|---|
| maker-checker 재승인 상태머신(재활용 대상) | PRESENT | `Alerting.php:598`·정족수2 `:642-650`·approved-only `:684-686`(GT① D·ADR §2.1) | 재승인 상태머신(재활용) |
| 재인증(MFA) substrate | PARTIAL | `UserAuth.php:930`(GT② B-6) | 재인증(§16) |
| SecurityAudit 불변 버전 체인 | PRESENT | `SecurityAudit.php:12-53`·verify `:56-68`(GT① 4-F·ADR §2.1) | Immutable Version 저장 |
| **Session Extension(만료전 연장) 워크플로** | **ABSENT** | GT②/GT① — 세션은 신규 30일 재발급(`UserAuth.php:986`)뿐·연장 개념 grep 0 | 순신규 |
| **Renewal(Manual/Policy/Approval)** | **ABSENT** | GT②/GT① — grant 갱신 경로 0 | 순신규 |
| 재위험평가(Risk re-eval) | **ABSENT** | GT② §2 — 권한상승 risk scoring 0 | 순신규 |

> **정직 경계**: 현행에는 **세션 연장(extension) 개념 자체가 부재**하다 — 세션은 만료 시 신규 30일 재발급(`UserAuth.php:986`)이며 "잔여시간 확인 → 재승인 → 재위험평가 → 재인증 → 새 버전" 폐루프는 GT 기준 ABSENT. 본 엔티티는 **순신규(ABSENT)** 이며, 재사용 가능한 부품은 maker-checker 재승인 상태머신(`Alerting.php:642-650`)·재인증 MFA(`UserAuth.php:930`)·불변 버전 체인(`SecurityAudit.php:12-53`)에 국한된다.

## 3. 설계 계약 (필드·상태·제약)

- **연장 조건**(SPEC §16): Remaining Time 확인 → 재승인 → 재위험평가 → 재인증. 각 연장은 **새 Immutable Version**(SPEC §16·§33) — 원 grant 변조 없이 버전 append.
- **Renewal 유형**(SPEC §17): Manual·Policy·Approval Renewal. Standing Assignment로 승격 불가(SPEC §10) — 연장도 시한부 유지.
- **재활용(Extend)**: 재승인은 `Alerting.php:598`·`:642-650`·`:684-686`(self 재승인 차단·정족수·approved-only 집행) maker-checker를 **패턴 재사용**하되 action_request(마케팅)와 별개 테이블·경로(KEEP_SEPARATE, ADR §D-2·GT② B-1). 재인증은 MFA(`UserAuth.php:930`) 재사용. 버전은 SecurityAudit 체인(`SecurityAudit.php:12-53`)에 불변 기록.
- **거부·격리**: 재위험 상승·정책 위반 → `JIT_EXTENSION_DENIED`(SPEC §30) fail-secure. 테넌트 격리(SPEC §33)·성능 Approval 처리 ≤ 200ms(§35).

## 4. KEEP_SEPARATE (동음이의 흡수금지)

| 근접물 | 근거 | 분리 사유 |
|---|---|---|
| action_request maker-checker | `Alerting.php:642-650,:684-686`·`Db.php:592-600`(GT② B-1) | 마케팅 결재 — elevation 연장 결재로 개명 금지 |
| mapping_change_request 정족수 | `Db.php:623-636`·`Mapping.php:209,:287,:527`(GT② B-1) | 매핑 거버넌스 정족수 — elevation 아님 |
| 세션 30일 재발급 | `UserAuth.php:986`(GT① 4-D) | 신규 세션 발급 — grant 연장 아님 |
| 구독 갱신(체험판/plan) | `UserAuth.php:541,:141`(GT① A) | 구독 수명 — elevation 갱신 아님 |

## 5. 판정

- **NOT_CERTIFIED · BLOCKED_PREREQUISITE**: 코드 변경 0. Session Extension·Renewal·재위험평가는 **ABSENT(순신규)** — 본 엔티티는 5편 중 재활용 substrate가 가장 얕다. 재사용 부품은 maker-checker 재승인·MFA 재인증·불변 버전에 국한.
- **재활용/ABSENT 분리**: 재활용=`Alerting.php:598,:642-650,:684-686`(재승인)·`UserAuth.php:930`(재인증)·`SecurityAudit.php:12-53`(불변버전). ABSENT=연장 워크플로·Renewal·재위험평가(GT §2). KEEP_SEPARATE=action_request/mapping_change_request(GT② B-1).
- **선행 의존**: Part 1~3-8 인증 후 실 구현. Session·Grant Ledger·Approval(선행 DSAR) 확정 후 그 위에 연장 레이어 결합. 재승인은 maker-checker 패턴 재사용하되 별개 경로 유지(무중복).
