# DSAR — JIT Access Governance: 상승 재검증 (APPROVAL_JIT_REVALIDATION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_9_JIT_ACCESS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_JIT_ACCESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_JIT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_JIT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_JIT_REVALIDATION`(SPEC §22)은 이미 발급된 활성 JIT 상승을 **변경 이벤트 발생 시점에 재검증**하는 트리거 기반 엔티티다. SPEC §22가 명시하는 재검증 Trigger 5종:

| Trigger | 의미 |
|---|---|
| Policy Update | 상승 정책 개정 → 기존 grant 재적격 판정 |
| Risk Score Change | 요청자/세션 위험 상승 → 유지 가부 재판정 |
| Organization Change | 조직 이동/이탈 → membership 재확인 |
| Device Change | 디바이스 변경 → Device Trust 재평가 |
| Session Change | 세션 컨텍스트 변화 → 재인증 요구 |

재검증은 SPEC §12 Continuous Validation(주기 검증)과 상보적이나 **트리거(이벤트) 구동**이라는 점이 다르며, 실패 시 즉시 권한 회수(§14)로 연결된다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| substrate | 판정 | 근거(GT file:line) |
|---|---|---|
| elevation 재검증 트리거 엔진 | **ABSENT** | GT② §2 "Auto-expiry revocation engine = ABSENT(권한축)"·"Session-bound entitlement projection ABSENT" |
| 능동 재검증 워커(cron) | ABSENT | `backend/bin/` = alerts_cron·optimize_cron·oauth_refresh_cron 3종만·"세션/권한/키 만료 능동회수 워커 ABSENT"(GT② B-9) |
| 만료 lazy 게이트(요청시점 재확인) | PARTIAL | 세션 `UserAuth.php:249-284`·lazy purge `:989`·즉시회수 `UserAdmin.php:344`(GT① §4-D) — 시간축만, 트리거 아님 |
| 정적 재검토 선례(Part 3-8) | PRESENT(별개엔진) | AccessReview `AccessReview.php:87-122` 파생분류·`:210-214` revoke 재사용(GT① §4-E) — 주기 재인증, 트리거 아님 |
| org 변경 감지원(SSO) | PARTIAL | SSO 그룹→역할 `EnterpriseAuth.php:487` 영속 매핑(GT① §2-F) — 변경 트리거 배선 없음 |

→ **트리거 기반 재검증은 순신규(ABSENT)**. 재검증은 요청시점 lazy 만료(시간축)와 달리 정책/위험/조직/디바이스/세션 변경 **이벤트**에 반응해야 하나 그 이벤트 구동 배선이 전무.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **입력**: 활성 grant 집합 + 변경 이벤트(§22 Trigger 5종). 각 이벤트는 해당 grant의 Eligibility(§5)·Risk(§6) 재평가를 요구.
- **출력**: 재검증 결과 `REVALIDATED / REVOKED / RE-AUTH_REQUIRED`. 실패 → Auto Revocation(§14)·Runtime Guard(§28) 차단. Session Change 시 재인증 요구(§16 Extension의 재인증과 정합).
- **상태 전이**: 트리거 수신 → 재평가 → (통과)유지 / (실패)즉시회수. 재검증 결과는 SecurityAudit 불변 체인(`SecurityAudit.php:12-53`, GT① §4-F)에 증거 기록·justification 필수(AccessReview `AccessReview.php:62-80` append-only 선례).
- **제약**: Tenant Isolation(§33). 파생·임의값 금지. 능동 워커 신설(GT② B-9 Auto-Revocation 신설대상)이 필요 — lazy 게이트만으로는 이벤트 즉시 반응 불가.
- **선행 의존**: Grant Ledger(TTL)·Risk Evaluation(§6)·Session-entitlement(§12) 실 구현 후에만 재검증 대상·판정근거 성립.

## 4. KEEP_SEPARATE (동음이의 흡수금지)

| 근접물 | 근거(GT) | 분리 사유 |
|---|---|---|
| Part 3-8 Certification 주기재검토 | ADR D-5·GT② B-10 | 정적 배정 **주기** 재인증(`AccessReview.php`) — JIT는 동적 상승 **트리거** 재검증. 엔진 분리(중복 금지) |
| 세션 만료/유휴 로그아웃 | GT② B-4(`UserAuth.php:304`·`:206`) | 세션 수명 만료이지 grant 재검증 아님 |
| plan/feature 게이팅 | GT② B-3(`UserAuth.php:364`·`:77`) | 구독 등급 접근 재판정 — 시한부 상승 재검증 아님 |
| MFA/OTP 재인증 | GT② B-6(`UserAuth.php:930`) | 2단계 인증 강화 — JIT 재검증 트리거 아님 |

→ Revalidation은 **순신규**이며, Certification(주기·정적)·세션수명·plan게이팅·MFA와 이름만 유사. 특히 3-8 Certification과 상보 분리(ADR D-5): 재검증=이벤트 구동 동적 상승 확인, Certification=주기 정적 배정 재검토.

## 5. 판정 (NOT_CERTIFIED · ABSENT-순신규 · 선행의존)

- **판정 = ABSENT(순신규)**. 트리거 기반 elevation 재검증은 grep 0(GT② §2·B-9). 재활용 substrate = lazy 만료 게이트(시간축)·AccessReview 파생분류·SecurityAudit 체인 — **확장(Extend)** 대상이지 재검증 엔진 실재 아님.
- **핵심 공백**: 능동 회수/재검증 워커 부재(GT② B-9) + Session-entitlement projection 부재(GT② §2) → 이벤트 즉시 재검증 불가능.
- **선행 의존**: Grant Ledger·Risk·Session-entitlement 실 구현 후(BLOCKED_PREREQUISITE, ADR §4). ERRE(3-7) effective 계산에 JIT grant 결합 필요(ADR §4).
- **NOT_CERTIFIED**: 코드 변경 0. 본 DSAR은 계약 확정용 설계 명세.
