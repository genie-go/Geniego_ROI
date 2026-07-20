# DSAR — Authorization Integrity Validator (Part 3-20 §12)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_HEALING_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §12 — Authorization Integrity Validator)

APPROVAL_INTEGRITY_VALIDATION은 인가 상태의 5개 무결성 축을 지속 검증하여, 위·변조·드리프트·유실을 탐지하고 §11 Healing·§16 Recovery로 라우팅한다.

| 무결성 축 | 정의 | 검증 계약 |
|-----------|------|-----------|
| Policy Integrity | 정책 규칙 집합의 위·변조 부재 | 정책 스냅샷 해시 대조 |
| Permission Integrity | 부여된 권한과 정책 파생물 정합 | effective permission 재계산 대비 |
| Role Integrity | 역할 그래프(위계/합성) 무손상 | 역할 정의 해시·순환 부재 |
| Snapshot Integrity | 스냅샷 불변성·연속성 | 버전 체인·타임스탬프 단조성 |
| Evidence Integrity | 감사 증거의 append-only·tamper-evident | 해시체인 verify |

## 2. Substrate 매핑

| 무결성 축 | 현행 substrate | 판정 |
|-----------|----------------|------|
| Evidence Integrity | SecurityAudit verify (`SecurityAudit.php:56-68`)·이벤트 append(`SecurityAudit.php:14`)·클래스 정의(`SecurityAudit.php:14-68`) | **PARTIAL(실재)** |
| Policy Integrity | 없음 (grep 0) | ABSENT(순신설) |
| Permission Integrity | 없음 (grep 0) | ABSENT(순신설) |
| Role Integrity | 없음 (grep 0) | ABSENT(순신설) |
| Snapshot Integrity | 없음 (grep 0) | ABSENT(순신설) |

## 3. 설계 계약

- Integrity Validator는 5축 Validator 인터페이스로 표준화하되, **Evidence Integrity 축은 신규 해시체인을 만들지 않고 `SecurityAudit::verify()`(`SecurityAudit.php:56-68`)를 유일 정본으로 위임**한다(중복 체인 금지).
- Policy/Permission/Role/Snapshot Integrity는 **순신설**. 각 축은 known-good 기준선(baseline) 해시를 SoT에서 산출하고, 불일치 시 read-only 경보→§11 Healing 계획→§16 승인 순으로 라우팅한다(자동 변조복구는 승인 게이트 필수).
- Validator는 비파괴 검증만 수행하며, 어떤 config·권한도 직접 수정하지 않는다(탐지와 집행 분리).

## 4. KEEP_SEPARATE (흡수 금지)

- 감사 증거 무결성은 **오직 SecurityAudit verify** 정본에만 있다. AccessReview 등 다른 경로의 justification/서명(`AccessReview.php:188-194`)은 리뷰 근거이지 tamper-evident 체인이 아니므로 Evidence Integrity 정본으로 승격하지 말 것.
- DB 스키마 self-heal(`Db.php:585-590`)은 물리 스키마 계층이며 authz 무결성 검증과 무관하다. 흡수 금지.

## 5. 판정

**PARTIAL** — Evidence Integrity는 `SecurityAudit.php:56-68` verify로 실재하나, Policy/Permission/Role/Snapshot Integrity 4축은 grep 0으로 부재이며 순신설이다. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
