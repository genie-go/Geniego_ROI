# DSAR — Authorization Recovery Action (Part 3-20 §7·§17)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_HEALING_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC) — APPROVAL_RECOVERY_ACTION

Recovery Workflow(§15) 6단계 Execution에서 실제로 집행되는 **개별 복구 액션의 원자 단위**.
Remediation Plan(§7)이 계획한 조치를 멱등·검증가능·감사가능하게 실행한다. 하나의 action은 정확히
하나의 부작용을 갖고, 실행 전후 상태를 캡처한다.

| Action 유형 | 부작용 | 등급(§7) |
|-------------|--------|----------|
| Cache Rebuild / Trust Cache Refresh | 파생 캐시 재생성(비가역 아님) | AUTO |
| Config Reload / Cert Reload / Metadata Sync | 설정·인증서·메타 재적재 | AUTO |
| Policy Revalidation | 정책 재평가·상태 갱신 | AUTO |
| Session Cleanup / Expired Assignment Cleanup | 만료 세션·할당 제거 | AUTO |
| Critical Policy/Role/Global Permission 삭제 | 비가역 권한 축소 | **MANUAL** |

각 action은 실행 결과(성공/실패/부분)·근거·타임스탬프를 불변 기록으로 남기며, 실패 시 §15의
Verification 단계로 신호를 되돌린다. action은 스스로 등급을 승격/강등할 수 없다.

## 2. Substrate 매핑

| SPEC 요소 | 현존 substrate | 상태 |
|-----------|----------------|------|
| authz recovery action 스키마 | (없음) | ABSENT — grep 0 |
| Session Cleanup 원형 | inline session GC(`UserAuth.php:989`) | PARTIAL(계획外 즉시 GC) |
| action 요청 레코드 원형 | Alerting action_request(`Alerting.php:610-657`·`Db.php:592`) | 광고용·producer 없음 |
| 집행 후 감사 | `SecurityAudit.php:14-68` | 재사용 후보 |

## 3. 설계 계약

- **순신설**: authz 복구 액션 도메인은 grep 0. 개별 action 타입은 신규 정의한다.
- **action_request producer 신설**: 기존 Alerting action_request 테이블/레코드(`Alerting.php:610-657`·
  `Db.php:592`)는 광고 actuation용이며 **producer가 전무**하다. 재사용하려면 authz 전용 producer를
  신설해야 하며, 현 상태의 죽은 스켈레톤을 작동 액션으로 오인 금지(`Alerting.php:660` executeAction 포함).
- **멱등·원자성**: 각 action은 재실행 안전(멱등)하고 단일 부작용. 부분실패 시 명시적 상태 반환.
- **등급 봉인**: AUTO만 자동 집행. MANUAL은 §15 5단계 승인 없이는 Execution 진입 불가(fail-closed).
- **불변 결과**: 실행 결과는 `SecurityAudit.php:56-68` 해시체인으로 tamper-evident 기록.

## 4. KEEP_SEPARATE

- `Alerting.php:660`·`:610-657` — 광고 actuation 스켈레톤(producer 없음). authz action으로 흡수 금지.
- `AutoCampaign.php:930-933` — 마케팅 액션. authz 복구 아님.
- `ClaudeAI.php:3753` — AI 힌트. 복구 액션 아님.

## 5. 판정

**ABSENT** (authz 복구 액션 grep 0). Session Cleanup만 inline GC(`UserAuth.php:989`)에 부분 원형이
있고, Alerting action_request(`Alerting.php:610-657`·`Db.php:592`)는 광고용·producer 부재로 재사용 시
producer 신설 필수. 순신설. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(§7·§15 선행).
