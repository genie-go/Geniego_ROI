# DSAR — Auto-Remediation Engine (Part 3-20 §7)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_HEALING_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)

`Auto-Remediation Engine`은 지속 거버넌스가 탐지한 **가역·저위험 이탈**만 자동 교정하는 계약이다. Safety Guardrail로 파괴적 행위를 **원천 차단**한다.

- **자동 허용(가역)**: Cache Rebuild · Config Reload · Policy Revalidation · Session Cleanup · Expired Assignment Cleanup · Cert Reload · Trust Cache Refresh · Metadata Sync.
- **자동 금지(★Safety Guardrail)**: Critical Policy 삭제 · Role 삭제 · Compliance 항목 삭제 · SoD 규칙 삭제 · Global Permission 삭제. → **전부 Manual Approval 강제**.

모든 자동 교정은 사전 근거·사후 감사기록·롤백 계획(§8)을 필수로 한다.

## 2. Substrate 매핑

| SPEC 액션 | 현행 substrate | 관계 | 인용 |
|---|---|---|---|
| Expired Assignment Cleanup | 만료 탐지 | 탐지만(자동교정 아님) | `AccessReview.php:87`,`:210-215` |
| Session Cleanup | inline 세션 GC | 유사 패턴(수동/인라인) | `UserAuth.php:989`,`:4261` |
| 교정 기록 | append-only 해시체인 | 감사 기록 원천 | `SecurityAudit.php:56-68` |
| 자동 교정 오케스트레이션 | — | ABSENT(grep 0) | 없음 |

현행에는 remediation 오케스트레이터가 없다(remediat grep 0). `AccessReview.php:87`·`:210-215`는 만료·이탈을 **탐지만** 하고, `UserAuth.php:989`·`:4261`은 세션 정리를 인라인으로 수행할 뿐 정책 기반 자동 교정 루프가 아니다.

## 3. 설계 계약

- **분류 게이트**: 모든 이탈은 먼저 `가역/비가역` 분류. 비가역·Critical은 즉시 Manual Approval 경로(§8·maker-checker)로 전환.
- **자동 실행 조건**: (1) 가역 액션 목록 내 (2) 신뢰도/영향 반경 임계 이하 (3) Guardrail 위반 아님 — 셋 모두 충족 시에만.
- **삭제 절대 금지**: 어떤 자동 액션도 Policy/Role/Compliance/SoD/Global Permission을 삭제하지 않는다(정리는 만료·비활성 표시까지, 물리 삭제는 금지).
- **감사**: 실행 전후 상태를 `SecurityAudit.php:56-68`에 append. 실패 시 롤백(§8) + WARNING.
- **무후퇴·Fail-closed**: 판단 불가·근거 부족 시 자동 실행 금지 → 경고만.

## 4. KEEP_SEPARATE

- `Alerting.php:660`,`:672-675` — 광고 자동집행 스켈레톤(★죽은 스켈레톤, action_request 생산자 부재). 경보 알림 채널로만 참조, remediation 집행 로직으로 오인·재사용 금지.
- `AnomalyDetection.php:3` — 데이터 이상탐지. 신호원 후보이나 엔진 분리.

## 5. 판정

**ABSENT** — auto-remediation은 grep 0. 기반 신호는 `AccessReview.php:87`·`:210-215`(탐지)·`UserAuth.php:989`·`:4261`(inline session GC)에 존재하나 정책 기반 자동 교정 오케스트레이션은 부재. **순신설**. ★Safety Guardrail(삭제 자동금지)·Alerting 죽은 스켈레톤 재사용 금지 준수. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
