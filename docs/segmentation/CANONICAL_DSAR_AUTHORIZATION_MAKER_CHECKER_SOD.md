# CANONICAL DSAR — Maker-Checker & Segregation of Duties (Maker/Checker·SoD Rule·Conflict Matrix·Toxic Combination·Enforcement)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> **★★스펙 미수령 — 설계 자율 판단(사용자 명시 승인)**: 상세 스펙 미제공(파트 번호·이름만 5-1 §1 명시). **구조·Entity·분류는 실측 + 5-1/5-2/5-3 산출 + 도메인 판단으로 자율 설계** · **정본 스펙 수령 시 재정합** · **§요구 부재 → 완료 조건 판정 불가·§53/§59 없음**(RP-001 정합: 번호·이름 추정 없음·세부 자율 명시).
> 정본 쌍: 본 문서(Maker-Checker/SoD) + [`CANONICAL_DSAR_AUTHORIZATION_DELEGATION_IMPERSONATION.md`](CANONICAL_DSAR_AUTHORIZATION_DELEGATION_IMPERSONATION.md)(Delegation/Impersonation/Act-As).
> ADR: [`../architecture/ADR_DSAR_REBATE_MAKER_CHECKER_SOD_DELEGATION_IMPERSONATION.md`](../architecture/ADR_DSAR_REBATE_MAKER_CHECKER_SOD_DELEGATION_IMPERSONATION.md).
> 선행: **5-3 §7 관찰 2건 위임 수령**(Mapping::approve 중복/자기 승인 방지 부재) · **5-2 Escalation Guard 8종**(SELF_ASSIGNMENT 포함) · 5-1(Action approve/execute 분리).
> **범위**: Maker-Checker·SoD 만 — Break Glass/JIT=5-5 · Runtime PDP=5-6 · Audit/Access Review=5-7 · Certification=5-8.

---

## 0. 실측 요약 — ★승인 2계통이 서로 다르다(5-3 기술 정정 포함)

| 스펙 요구 | 현행 실측(코드 근거) | 분류 |
|---|---|---|
| **Maker-Checker(자기 승인 방지)** | ❌ **부재 — 2계통 모두** | **NOT_APPLICABLE → 신설** |
| **★`mapping_change_request` 승인** | ⚠️ **정족수 REAL·가드 부재** — `required_approvals DEFAULT 2`(Db.php:634) + `count($approvals) >= required_approvals`(Mapping.php:214) · **but `$approvals[] = ["user"=>$actor,...]` 에 dedup 없음**(:212) · **`requested_by` 와 `$actor` 미비교**(:167) | **MIGRATION_REQUIRED(§5 판정)** |
| **★`action_request` 승인 — 5-3 기술 정정** | ⚠️ **정족수 자체가 없다** — `$status = $decision === "approve" ? "approved" : "rejected";`([Alerting.php:593](../../backend/src/Handlers/Alerting.php)) = **단일 승인 즉시 확정**. `approvals_json` 은 **이력 배열일 뿐 정족수 판정에 미사용**(:591) | **★5-3 기술 정정 · 신설** |
| **테넌트 격리(IDOR)** | ✅ **REAL(2계통 모두)** — `WHERE id=? AND tenant_id=?`(Alerting.php:582/595 · Mapping.php:202/215) · 208차 P0 | **VALIDATED_LEGACY(재사용)** |
| **승인 이력 기록** | ✅ **REAL** — action_request: `["actor"=>$actor,"decision"=>$decision,"ts"=>...]`(Alerting.php:591) · mapping: `["user"=>$actor,"ts"=>...]`(Mapping.php:212) · audit(Mapping.php:218) | **재사용(Maker/Checker 식별 기반)** |
| **Action 분리(approve ≠ execute)** | ✅ **REAL** — `TeamPermissions::ACTIONS` 에 **`approve` 와 `execute` 가 이미 별개**(TeamPermissions.php:39) | **VALIDATED_LEGACY(SoD 기반·5-1 §11)** |
| **admin master/sub 분리** | ✅ **REAL** — 286차: `requireMasterAdmin2`=메뉴트리/부여/요금/DB/쿠폰쓰기 **master 전용** · `requireSubAdminMenu`=부여경로만 | **VALIDATED_LEGACY(SoD 인접)** |
| **SoD Rule / Conflict Matrix** | ❌ **부재(grep 0)** — `segregation`/`maker_checker` 전무 | **NOT_APPLICABLE → 신설** |
| **Toxic Combination 탐지** | ❌ 부재 | **NOT_APPLICABLE → 신설** |
| **Delegation** | ❌ 부재 | **NOT_APPLICABLE → 짝 문서** |

**★결론(정직)**: **Maker-Checker 는 2계통 모두 부재**다. 그리고 **5-3 기술을 정정한다** — `action_request` 는 `approvals_json` 을 갖지만 **정족수 판정에 쓰지 않는다**(`$decision === "approve" ? "approved" : "rejected"`·Alerting.php:593) → **단일 승인 즉시 확정**. 즉 **정족수 REAL 은 `mapping_change_request` 하나뿐**이고, **두 계통의 승인 강도가 다르다**. 실 인접 = IDOR 차단(2계통) · 승인 이력(actor/decision/ts) · **approve≠execute Action 분리** · admin master/sub 분리. **부재 = Maker-Checker · SoD Rule · Conflict Matrix · Toxic Combination · dedup · exclude_requester**.

### ★인접 관찰 — 5-3 §7 위임 2건 판정 (자율·미확정·미수정)

**[판정 1] `Mapping::approve()` 중복 승인** — `$approvals[] = ["user"=>$actor, "ts"=>gmdate('c')];`(:212) 에 dedup 이 없어 **동일인 2회 호출 시 `required_approvals` DEFAULT 2 를 혼자 충족 → approved**(:214).
- **자율 판정**: **결함 후보(의도로 보기 어려움)** — `required_approvals DEFAULT **2**` 를 둔 설계 의도가 "**2명의 서로 다른 승인자**"인 것은 명백한데, dedup 이 없으면 그 의도가 **무력화**된다. Quorum 을 둔 목적 자체가 상실.
- **단 P0 단정 금지(FP 규약)**: 실 영향 판정에 필요 = ①approve 엔드포인트 **호출 권한**(누가 호출 가능한가·5-1 §PEP 100+ 분산) ②`mapping_change_request` **실 운영 사용 여부**(미사용이면 무증상) ③`self::actor()` 해석(동일인 식별 가능 여부). **PM 코드 재증명 후 등급 확정**.
- **권장 해소**: `$approvals` 에 **동일 `user` 존재 시 거부**(`AUTHORIZATION_DUPLICATE_APPROVAL`) — **정족수 로직은 그대로 재사용**.

**[판정 2] `Mapping::approve()` 자기 승인** — `requested_by`(:167)와 `$actor` 미비교 → **요청자 본인 승인 가능**.
- **자율 판정**: **결함 후보** — Maker-Checker 의 정의상 위반. 단 **`required_approvals` 가 2 이므로 요청자 1명만으로는 승인 미완**(판정 1 의 dedup 부재와 **결합될 때만** 단독 확정 가능). 즉 **판정 1+2 결합 = 요청자 혼자 2회 승인 → approved**(가장 위험한 조합).
- **권장 해소**: `exclude_requester=true` 정책(§3) — 단 **1인 테넌트**(레거시 단독회원·5-2 team_role fail-open 맥락)에서는 **승인자가 요청자뿐**일 수 있어 **교착** 가능 → **Quorum Policy 에 `allow_self_approve_when_sole_approver` 예외를 명시적 정책으로**(암묵 허용 금지·감사 기록 필수).

**[관찰 3·신규] `action_request` 는 정족수가 없다** — 단일 승인 즉시 `approved`(Alerting.php:593). **광고 예산/캠페인 액션을 1명이 승인**하는 구조. **의도 여부 불명**(policy_id 기반 자동화 액션이라 경량 승인 설계일 수 있음) → **PM 재증명 대상** · 본 세션 미수정.

---

## 1. Canonical Entity (12) — 자율 설계

MAKER_CHECKER_POLICY · MAKER_RECORD · CHECKER_RECORD · SOD_RULE · SOD_CONFLICT_MATRIX · TOXIC_COMBINATION · SOD_VIOLATION · SOD_EXCEPTION · SOD_EXCEPTION_APPROVAL · SOD_ENFORCEMENT_POINT · SOD_RECONCILIATION · SOD_AUDIT_EVENT.

## 2. Maker-Checker Policy (§1) · Maker/Checker Record (§2)

- **Policy(§1)**: maker_checker_policy_id · target(resource_type + action) · **exclude_requester**(기본 true) · **distinct_approver_required**(기본 true) · **min_distinct_approvers** · **allow_self_approve_when_sole_approver**(기본 false·예외 시 감사 필수) · required_checker_role · required_checker_scope · **checker_min_privilege** · evidence.
- **Maker(§2a)**: 요청자 · 요청 시각 · 요청 사유 · **on_behalf_of**(위임 시·짝 문서). **현행 REAL**: `requested_by`(Mapping.php:167).
- **Checker(§2b)**: 승인자 · 승인 시각 · decision · **maker 와 동일인 여부 검사 결과** · **기 승인자 중복 여부 검사 결과** · evidence. **현행 REAL(이력만)**: `["actor"=>$actor,"decision"=>...,"ts"=>...]`(Alerting.php:591) · `["user"=>$actor,"ts"=>...]`(Mapping.php:212).
- **★핵심 규칙(§7 판정 반영)**: **①동일인 중복 승인 거부**(`AUTHORIZATION_DUPLICATE_APPROVAL`) **②요청자 승인 거부**(`AUTHORIZATION_SELF_APPROVAL_BLOCKED`) — **둘 다 현행 부재** · **정족수 로직(required_approvals)은 재사용**.

## 3. SoD Rule (§3) · Conflict Matrix (§4) · Toxic Combination (§5)

- **SoD Rule(§3)**: sod_rule_id · **rule_name · conflicting_action_a · conflicting_action_b · scope · severity · enforcement_mode**(BLOCK / WARN / REQUIRE_EXCEPTION) · evidence.
- **★Conflict Matrix(§4) — Rebate 도메인 자율 설계**:

| Action A | Action B | 사유 | Severity |
|---|---|---|---|
| **APPROVE_PAYOUT** | **EXECUTE_PAYOUT** | 승인자가 집행하면 **무단 송금** | **CRITICAL**(5-1 §43 명시) |
| **APPROVE_SETTLEMENT** | **EXECUTE_SETTLEMENT** | 동상 | CRITICAL |
| **CREATE_VERSION / UPDATE** | **APPROVE_VERSION / ACTIVATE** | 작성자=활성화자 → **자기 변경 자기 승인**(1-4 §34·5-1 §34 "작성자≠활성화 담당자 분리 Hook") | HIGH |
| **MANAGE_FUNDING** | **APPROVE**(Funding 변경) | 자금 구조 변경 자기 승인 | CRITICAL |
| **ASSIGN_ROLE** | **APPROVE**(자신의 Role) | **자기 권한 상향**(5-2 SELF_ASSIGNMENT Guard) | CRITICAL |
| **MANAGE_POLICY** | **VIEW_AUDIT / EXPORT_AUDIT** | 정책 변경자가 감사 은폐 | HIGH |
| **USE_PROVIDER_CREDENTIAL** | **ROTATE_CREDENTIAL** | 자격증명 오남용 후 흔적 제거 | HIGH |
| **MANAGE_CLAIM** | **APPROVE_CLAIM** | 청구 작성자 자기 승인 | HIGH |
| **IMPERSONATE** | **APPROVE / EXECUTE**(대행 중) | 대행 세션으로 승인·집행 | **CRITICAL**(짝 문서 §4) |

- **★현행 기반(재사용)**: `TeamPermissions::ACTIONS` 에 **`approve` 와 `execute` 가 이미 별개**(TeamPermissions.php:39) → **SoD 를 Action 수준에서 표현 가능**(Action 이 하나였다면 불가). admin **master/sub 분리**(286차)도 SoD 인접.
- **Toxic Combination(§5)**: 단일 Subject 가 **동시 보유 시 위험한 Role/Permission 집합**(예: PAYOUT_APPROVER + PAYOUT_OPERATOR · ACCESS_ADMIN + FINANCE_REVIEWER · SECURITY_ADMIN + AUDITOR). **★5-1 §43 "동일 사용자에게 모든 고위험 권한 집중" = Critical Gap** 정합. **부여 시점(5-2 Assignment)과 평가 시점(5-6) 양쪽에서 탐지**.

## 4. SoD Violation (§6) · Exception (§7) · Enforcement (§8)

- **Violation(§6)**: violation_id · subject · rule · **detected_at · detection_point**(ASSIGNMENT / REQUEST / DECISION / PERIODIC) · conflicting_grants · severity · **status**(OPEN/EXCEPTED/RESOLVED) · resolution · evidence.
- **Exception(§7)**: exception_id · rule · subject · **business_justification · compensating_control · approved_by · valid_from/to · review_at** · evidence. **★무기한 예외 금지**(valid_to 필수) · **상위 승인 필수** · **보상 통제 필수**(예: 사후 검토·추가 감사) · **1인 테넌트 예외**(§0 판정 2)는 여기서 **명시 정책으로만**.
- **Enforcement Point(§8, 4)**: **①Assignment 시점**(5-2 — Role 부여 시 Toxic Combination 차단) **②Request 시점**(요청자 기록) **③Decision 시점**(dedup + exclude_requester 검사·**본 파트 핵심**) **④주기 점검**(Access Review=5-7). **★현행은 ③이 부재**(§0 판정 1·2).

## 5. Reconciliation (§9) · Lint/Guard (§10) · Error (§11)

- **Reconciliation(§9, 6)**: **Maker ↔ Checker 동일인 여부**(전 승인 건 소급 점검) · **승인자 중복 여부** · Role 조합 ↔ Toxic Combination · SoD Exception ↔ 만료 · **required_approvals ↔ 실 distinct 승인자 수**(★현행 불일치 가능·§0 판정 1) · Impersonation 세션의 승인 행위(짝 문서).
- **Lint(§10, 8)**: 승인 핸들러에 **dedup 검사 없음** · **exclude_requester 검사 없음** · SoD Rule 없는 고위험 Action 쌍(approve/execute) · Toxic Combination 미정의 · **정족수 없는 금전 승인**(★`action_request` 클래스·§0 관찰 3) · SoD Exception 무기한 · 보상 통제 없는 Exception · Maker/Checker 미기록.
- **Guard(§10b, 6)**: DUPLICATE_APPROVAL · SELF_APPROVAL · SOD_VIOLATION · TOXIC_COMBINATION · EXCEPTION_EXPIRED · IMPERSONATED_APPROVAL(짝 문서).
- **Error(§11, 6)**: `AUTHORIZATION_DUPLICATE_APPROVAL` · `AUTHORIZATION_SELF_APPROVAL_BLOCKED` · `AUTHORIZATION_SOD_VIOLATION` · `AUTHORIZATION_TOXIC_COMBINATION` · `AUTHORIZATION_SOD_EXCEPTION_REQUIRED` · `AUTHORIZATION_IMPERSONATED_APPROVAL_BLOCKED`.

## 6. Maker-Checker Matrix — 현행

| 승인 계통 | 정족수 | Maker 기록 | Checker 기록 | dedup | exclude_requester | IDOR | 근거 |
|---|---|---|---|---|---|---|---|
| **`mapping_change_request`** | ✅ **required_approvals DEFAULT 2** | ✅ **requested_by** | ✅ `["user","ts"]` | **❌ 부재(판정 1)** | **❌ 부재(판정 2)** | ✅ | Db.php:634 · Mapping.php:167/212/214 |
| **`action_request`** | **❌ 없음(단일 승인 즉시 approved)** | ❌ 없음 | ✅ `["actor","decision","ts"]` | ❌ | ❌ | ✅ | **Alerting.php:593**(★5-3 정정) · :591/582 |
| (Rebate 승인) | — | — | — | — | — | — | **NOT_APPLICABLE(신설)** |
