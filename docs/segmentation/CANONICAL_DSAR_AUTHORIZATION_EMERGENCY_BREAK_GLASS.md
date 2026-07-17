# CANONICAL DSAR — Emergency Access & Break Glass (Emergency Operator·Break Glass Session·Post-Action Review·Kill Switch 연동·Audit)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-5 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> **★★스펙 미수령 — 설계 자율 판단(사용자 명시 승인)** · 정본 스펙 수령 시 재정합 · **§요구 부재 → 완료 조건 판정 불가·§53/§59 없음**.
> 정본 쌍: [`CANONICAL_DSAR_AUTHORIZATION_JIT_TIME_BOUND_PRIVILEGE.md`](CANONICAL_DSAR_AUTHORIZATION_JIT_TIME_BOUND_PRIVILEGE.md)(JIT/Time-Bound) + 본 문서.
> ADR: [`../architecture/ADR_DSAR_REBATE_EMERGENCY_BREAK_GLASS_JIT.md`](../architecture/ADR_DSAR_REBATE_EMERGENCY_BREAK_GLASS_JIT.md).
> 선행: **5-1**(EMERGENCY_OPERATOR Subject Type · **BREAK_GLASS Action** · §4.2 "Break Glass 는 후속 전용 정책으로만 제한적 허용") · 5-4(Impersonation/Act-As Blast Radius) · **1-4 §23 Emergency Disable**.
> **범위**: 비상 접근만 — Runtime PDP=5-6 · Audit/Access Review=5-7 · Certification=5-8.

---

## 0. 실측 요약 — ★Break Glass 는 완전 부재

| 스펙 요구 | 현행 실측 | 분류 |
|---|---|---|
| **Break Glass** | ❌ **부재(grep 0)** — `break_glass`/`breakGlass` 전무 | **NOT_APPLICABLE → 신설** |
| **Emergency Access** | ❌ **부재(grep 0)** — `emergency_access` 전무 | **NOT_APPLICABLE → 신설** |
| **EMERGENCY_OPERATOR Subject** | ❌ 부재(5-1 §7 확정) | **NOT_APPLICABLE → 신설** |
| **Incident Registry** | ❌ **부재(grep 0)**(1-4 실측과 일관) | **NOT_APPLICABLE → 신설**(Reference 만) |
| **★비상 복구 인접(273차)** | ✅ **REAL** — **SMS OTP 기반 최고관리자 접속키 복구**(UserAuth·273차) = **"관리자가 잠겼을 때의 복구 경로"** | **참조(Break Glass 인접·다만 인증 복구이지 권한 상승 아님)** |
| **★Kill Switch(반대 방향)** | ✅ **REAL** — AutoCampaign kill-switch 정직성(플랫폼 push 실패 시 DB 상태 미변경·502·AutoCampaign.php:473/602-609·233차) | **참조(1-4 §23 Emergency Disable 인접)** |
| **Emergency Disable(Program 차단)** | 📄 **1-4 §23 설계 완료**(차단 범위 5축 독립·선실행+사후승인+Review Deadline·`provider_disable_result` 실 기록) | **연동(반대 방향)** |
| **Time-bound 원형** | ✅ **REAL** — Impersonation **2h**(짝 문서 §0) · MFA OTP 만료 · **SCIM 즉시 deprovision** | **재사용** |
| **사후 검토(Post-Action Review)** | ❌ 부재 | **NOT_APPLICABLE → 신설** |

**★결론(정직)**: **Break Glass·Emergency Access·EMERGENCY_OPERATOR·Incident Registry 전부 부재**. 실 인접 = **273차 접속키 복구**(인증 복구·권한 상승 아님) · **Kill Switch/Emergency Disable**(반대 방향 — **권한을 여는 게 아니라 닫는 것**) · Impersonation 2h/SCIM deprovision(Time-bound 원형). **★1-4 §23 Emergency Disable 과 본 문서 Break Glass 는 방향이 반대**(닫기 vs 열기)이며 **혼동 금지**.

### ★인접 관찰 (코드변경 0)
- **[관찰] 이 저장소에는 "권한을 여는 비상 경로"가 없다** — 있는 것은 **닫는 경로**(Kill Switch·Emergency Disable·SCIM deprovision·강제 세션 종료)와 **인증 복구**(273차 접속키). **★이는 결함이 아니라 보수적 설계**로 볼 수 있다(Break Glass 는 본질적으로 **위험을 여는 기능**이라, 없으면 그 위험도 없다). → **Rebate 도입 시에도 "Break Glass 를 만들 것인가" 자체가 정책 결정**이며, **만들지 않는 선택도 유효**하다(§6).
- **[관찰] 273차 접속키 복구는 Break Glass 가 아니다** — **인증 수단 복구**(SMS OTP)이지 **권한 상승**이 아니다. 최고관리자가 **원래 갖고 있던 권한**을 되찾는 것. **동명이의로 Break Glass REAL 로 표기 금지**(5-2·5-3 오탐 클래스 정합).

---

## 1. Canonical Entity (10) — 자율 설계

BREAK_GLASS_POLICY · BREAK_GLASS_REQUEST · BREAK_GLASS_SESSION · EMERGENCY_OPERATOR_REGISTRY · EMERGENCY_TRIGGER · POST_ACTION_REVIEW · BREAK_GLASS_ACTION_LOG · INCIDENT_REFERENCE · BREAK_GLASS_RECONCILIATION · BREAK_GLASS_AUDIT_EVENT.

## 2. Break Glass Policy (§1) — ★도입 여부 자체가 정책 결정

- **Policy(§1)**: break_glass_policy_id · **enabled**(★기본 **false**) · **eligible_operator_roles** · **max_duration**(★**≤1h** 권장·짝 문서 §2) · **allowed_actions**(화이트리스트·기본 최소) · **prohibited_actions** · **require_reason**(필수) · **require_ticket** · **require_second_person**(4-eyes·5-4) · **post_action_review_required**(필수) · **review_deadline** · **notification_targets** · evidence.
- **★§6 도입 여부 결정 지침(자율)**: **Break Glass 는 본질적으로 "모든 통제를 우회하는 문"** 이다. 현행에 없다는 것은 **그 위험도 없다**는 뜻. 도입 판단 기준:
  - **필요 조건**: ①정상 경로로 **복구 불가능한 장애**가 실재하는가 ②그 장애가 **금전/고객 영향**을 유발하는가 ③**대안**(SCIM deprovision·강제 종료·Kill Switch·Emergency Disable·JIT)으로 **해결 불가**한가.
  - **★대안이 있으면 만들지 마라** — 현행은 **닫는 경로가 이미 충실**하다(Kill Switch·Emergency Disable·SCIM 즉시 deprovision·강제 세션 종료). **여는 경로의 필요성이 입증되기 전까지 `enabled=false` 유지**.

## 3. Break Glass Request (§2) · Session (§3)

- **Request(§2)**: request_id · operator · **emergency_trigger · reason(필수·자유 서술) · ticket_reference · incident_reference · requested_actions · requested_duration(≤ max)** · requested_at · **second_person_approval**(가능 시) · evidence.
- **Session(§3)**: session_id · request · **token(★전용 접두 권장 — 현행 `imp_` 패턴 계승)** · started_at · **expires_at(≤1h)** · **수행 Action 전량 로그**(§5) · terminated_at · termination_reason · evidence.
- **★선실행 허용 + 사후 승인(1-4 §23 Emergency Disable 패턴 계승)**: 진짜 비상은 **승인을 기다릴 수 없다** → **선실행 가능하되 ①사유 필수 ②전량 로그 ③즉시 통지 ④review_deadline 내 사후 승인 ⑤미승인 시 Access Review 차단**(1-4 §23 "긴급 차단은 신속 실행하되 사후 승인·Review Deadline·Audit 강제" 와 동일 규율).

## 4. Emergency Trigger (§4) · Action Log (§5) · Post-Action Review (§6)

- **Trigger(§4, 8)**: SYSTEM_OUTAGE · **AUTHORIZATION_LOCKOUT**(전 관리자 잠김) · DATA_CORRUPTION · **SECURITY_INCIDENT** · FRAUD_IN_PROGRESS · **FINANCIAL_LOSS_IMMINENT** · REGULATORY_ORDER · OTHER. **★Trigger 없는 Break Glass 금지**.
- **Action Log(§5)**: **Break Glass 세션의 모든 Action 을 전량 기록**(대상 Resource · 변경 전/후 Reference · 시각 · 결과). **★일반 세션보다 강한 로깅**(Obligation LOG_SENSITIVE_ACCESS·5-1 §30) · **로그 실패 시 Action 차단**(로그 없는 비상 접근 = 사후 검증 불가).
- **Post-Action Review(§6)**: review_id · session · **reviewer(≠operator·Maker-Checker·5-4)** · **review_deadline** · 검토 결과(JUSTIFIED / UNJUSTIFIED / PARTIALLY_JUSTIFIED) · 후속 조치 · evidence. **★필수 · 미검토 시 해당 operator 의 Break Glass 자격 정지** · **UNJUSTIFIED = 보안 사고로 처리**.

## 5. Kill Switch 연동 (§7) — ★방향 구별

| 방향 | 기능 | 현행 | 문서 |
|---|---|---|---|
| **닫기(권한/집행 차단)** | Kill Switch · **Emergency Disable** · SCIM deprovision · 강제 세션 종료 | ✅ **REAL/설계 완료** | AutoCampaign(233차) · **1-4 §23** · EnterpriseAuth.php:400 · UserAdmin.php:365 |
| **열기(권한 상승)** | **Break Glass** | ❌ **부재** | **본 문서(신설·기본 OFF)** |
| **복구(인증)** | 273차 접속키 복구(SMS OTP) | ✅ REAL | UserAuth(273차) |

**★혼동 금지**: **1-4 §23 Emergency Disable = Program 을 닫는 것** · **본 문서 Break Glass = 사람에게 권한을 여는 것**. **273차 접속키 복구 = 인증 복구**(권한 상승 아님·§0 관찰).
**★Break Glass 중에도 Kill Switch 는 우선**(5-1 §45 "Kill Switch 활성" Guard) — **비상 권한이 비상 차단을 무력화하면 안 된다**.

## 6. Reconciliation (§8) · Guard/Error (§9)

- **Reconciliation(§8, 5)**: Break Glass 세션 ↔ Action Log 전량 · 세션 ↔ **사후 검토 완료 여부**(deadline 경과 = Critical) · Trigger ↔ Incident Reference · 수행 Action ↔ allowed_actions 화이트리스트 · **Break Glass 중 승인 행위**(5-4 SoD: `IMPERSONATE × APPROVE/EXECUTE` 와 동일 규율 → **Break Glass 중 승인·집행 금지 권장**).
- **Guard(§9a, 7)**: BREAK_GLASS_DISABLED(기본) · **BREAK_GLASS_NO_REASON** · BREAK_GLASS_NO_TRIGGER · **BREAK_GLASS_ACTION_NOT_WHITELISTED** · **BREAK_GLASS_EXPIRED**(≤1h) · **BREAK_GLASS_REVIEW_OVERDUE** · **KILL_SWITCH_OVERRIDES_BREAK_GLASS**.
- **Error(§9b, 5)**: `AUTHORIZATION_BREAK_GLASS_DISABLED` · `AUTHORIZATION_BREAK_GLASS_REASON_REQUIRED` · `AUTHORIZATION_BREAK_GLASS_ACTION_RESTRICTED` · `AUTHORIZATION_BREAK_GLASS_EXPIRED` · `AUTHORIZATION_BREAK_GLASS_REVIEW_REQUIRED`.

## 7. Emergency Matrix — 현행

| 통제 | 현행 | 근거 |
|---|---|---|
| **Break Glass(권한 열기)** | ❌ **부재(grep 0)** | — |
| **Emergency Operator** | ❌ 부재 | 5-1 §7 |
| **Incident Registry** | ❌ 부재 | 1-4 실측 |
| **Kill Switch(닫기)** | ✅ **REAL** — push 실패 시 상태 미변경·502 | AutoCampaign.php:602-609(233차) |
| **Emergency Disable(Program 닫기)** | 📄 설계 완료(선실행+사후승인+review_deadline) | 1-4 §23 |
| **SCIM 즉시 deprovision** | ✅ **REAL** — 세션 즉시 삭제 | EnterpriseAuth.php:400/413 |
| **강제 세션 종료** | ✅ REAL | UserAdmin.php:365 |
| **접속키 복구(인증)** | ✅ REAL — SMS OTP | UserAuth(273차) |
| **사후 검토** | ❌ 부재 | — |
