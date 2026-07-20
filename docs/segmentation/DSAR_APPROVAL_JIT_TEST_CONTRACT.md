# DSAR — JIT Access Governance: 테스트 계약 (Part 3-9 §36)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_9_JIT_ACCESS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_JIT_ACCESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_JIT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_JIT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §36은 5개 테스트 카테고리를 규정한다.

| 카테고리 | 항목 |
|---|---|
| Unit | Eligibility · Risk Evaluation · Approval · Session · Revocation |
| Integration | RBAC · Dynamic Role · Effective Resolution Engine · Workflow · Audit |
| Performance | 100K Active Sessions · 1M Requests · 10M Runtime Events |
| Security | Privilege Escalation · Session Hijacking · Approval Bypass · Scope Expansion · Runtime Tampering |
| Regression | Authorization · Assignment · Policy · Audit · Compliance |

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| §36 테스트 대상 | 실존 substrate(테스트 앵커 후보) | 판정 |
|---|---|---|
| Unit·Eligibility | 파생분류 선례 `AccessReview.php:87-122`(휴면/만료·임의값 금지) | **PARTIAL(선례)** |
| Unit·Approval | maker-checker `Alerting.php:642-650`·집행게이트 `:684-686`·fail-closed `:600-606` | **PARTIAL(재활용)** |
| Unit·Session | 만료게이트 `UserAuth.php:249-284`·발급 `:986,:990` | **PARTIAL(세션축)** |
| Unit·Revocation | is_active=0 revoke 재사용 `AccessReview.php:210-214`·즉시회수 `UserAdmin.php:344`·키 `Keys.php:135` | **PARTIAL(재활용)** |
| Unit·Risk Evaluation | 권한상승 risk 0(GT② §2) — 테스트 대상 부재 | **ABSENT** |
| Integration·Audit | SecurityAudit 해시체인 `SecurityAudit.php:12-53`·verify `:56-68`·`auth.breakglass` `UserAuth.php:997-999` | **PRESENT(증거체인)** |
| Integration·ERRE | Effective Resolution Engine(3-7)에 JIT grant 결합(ADR §4) — 미구현 | **ABSENT(선행)** |
| Security·Approval Bypass | approved-only 집행 `Alerting.php:684-686`·self 재승인 차단 `:634-640` | **PARTIAL(재활용)** |
| Security·Privilege Escalation | impersonate 상승차단 가드 `UserAdmin.php:466-469`(admin 대행 금지) | **PARTIAL(하향대행)** |
| Regression·Authorization | 289차 P1~P5 보안수정(writeGuard 서버강제·세션토큰 hash-only, ADR D-7) | **PRESENT(재활용)** |

핵심: 테스트 대상 elevation 엔진(Request/Risk/Grant Ledger)이 **ABSENT**이므로 Unit/Integration 대부분은 실 구현 후 조건. 재활용 앵커는 maker-checker(`Alerting.php:642-686`)·SecurityAudit 체인(`SecurityAudit.php:12-68`)·AccessReview 파생/revoke(`AccessReview.php:87-122,:210-214`).

## 3. 설계 계약 (항목·기준 — SPEC 근거)

| 카테고리 | 대표 케이스(설계) | 근거 |
|---|---|---|
| Unit | Eligibility 8항 통과/차단·Risk LOW~CRITICAL 4등급·Approval 정족수·Session 발급/만료·Revocation 즉시성 | §5·§6·§7·§11·§14 |
| Integration | RBAC/Dynamic Role/ERRE에 JIT grant 합산 투영·Workflow 다단 승인·Audit 체인 append | §36·ADR §4·D-1 |
| Performance | 100K 세션·1M 요청·10M 이벤트 하 §35 상한 유지 | §35·§36 |
| Security | 상승/세션탈취/승인우회/스코프확장/런타임변조 5종 침투 차단(§28 Runtime Guard) | §28·§36 |
| Regression | Authorization·Assignment·Policy·Audit·Compliance 무후퇴 100%(ADR D-7 무후퇴) | §37·ADR §4 |

- **무날조 원칙**: 재활용 앵커(maker-checker·SecurityAudit·AccessReview)는 테스트가 실 동작을 검증하되, 마케팅/정적검토 도메인 케이스를 elevation 케이스로 위장 금지(가짜녹색 회피, ADR D-6).

## 4. KEEP_SEPARATE / 선행의존

- `action_request`/`mapping_change_request` 결재 테스트(`Db.php:592-600`·`:623-636`)는 마케팅/매핑 회귀 — elevation 테스트 스위트로 흡수 금지(GT② B-1).
- impersonation 테스트(`UserAdmin.php:451,:466-469`)는 하향 대행 검증 — 상향 elevation 침투테스트 아님(GT② B-2·ADR D-7).
- 선행: Integration·ERRE(3-7) 결합·Performance는 grant 엔진 신설 후 성립(ADR §4).

## 5. 판정 (NOT_CERTIFIED · RP-track 실구현 조건 · 선행의존)

- **NOT_CERTIFIED · 코드 0**. §36 전 카테고리는 **실 구현(RP-track) 조건**. 현 단계 실행 가능한 테스트 대상 엔진 ABSENT.
- 재활용 앵커만 실 substrate로 존재(maker-checker `Alerting.php:642-686`·SecurityAudit `SecurityAudit.php:12-68`·AccessReview `AccessReview.php:87-122,:210-214`) — 이들은 KEEP_SEPARATE 도메인 검증이며 elevation 테스트로 개명 금지.
- BLOCKED_PREREQUISITE(Part 1~3-8 인증·grant 원장 신설 선행).
