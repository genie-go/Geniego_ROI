# DSAR — Approval Decision Action Version (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§9 ACTION_VERSION 필수 필드 (원문 전사):
- `version_id` · `definition id` · `version_number` · `previous_version_id`
- `version_type` · `change_summary`
- 스냅샷: `eligibility snapshot` · `reason policy snapshot` · `comment policy snapshot` · `attachment policy snapshot` · `target policy snapshot` · `effect snapshot` · `outcome mapping snapshot` · `assignment effect snapshot` · `claim/lease effect snapshot` · `sequential effect snapshot`
- `effective_from` / `effective_to`
- `created_by` · `reviewed_by` · `approved_by` · `activated_at`
- `immutable_hash` · `status` · `evidence`

§9 VERSION_TYPE enum: `INITIAL` / `ELIGIBILITY_CHANGE` / `REASON_POLICY_CHANGE` / `COMMENT_POLICY_CHANGE` / `ATTACHMENT_POLICY_CHANGE` / `TARGET_POLICY_CHANGE` / `EFFECT_CHANGE` / `OUTCOME_CHANGE` / `SECURITY_CHANGE` / `CORRECTION` / `MIGRATION`.

의미: Action Version은 Definition(§8)의 각 변경을 불변(immutable_hash)·스냅샷 기반으로 버전화한다. 과거 Decision은 당시 활성 Version을 유지해야 하며(§37 Reason Version과 동형), Reconciliation(§55)은 `Action Version ↔ Applied Effect`를 대조한다.

## 2. 기존 구현 대조

- **액션 정의의 버전 계보(immutable version chain) 부재** — `version_id`·`version_number`·`previous_version_id`·`immutable_hash`를 액션 정의에 부여하는 구조 전무.
- 유일한 불변해시 인접자산은 승인이 아니라 감사체인(`SecurityAudit::verify():56,64`) — 이는 Action Version이 아니라 이벤트 무결성 검증. 액션 정의 스냅샷 버전과 무관.
- `Mapping::approve/apply`(`Handlers/Mapping.php:238-331`)의 approvals_json은 **인스턴스 승인 기록**이지 정의 버전이 아니다(어떤 Definition Version으로 판정됐는지 스냅샷 미보존).
- `version_type`(11종)·`change_summary`·정책 스냅샷(eligibility/reason/comment/attachment/target/effect/outcome) → **no hits**.
- `created_by`/`reviewed_by`/`approved_by`/`activated_at` (버전 라이프사이클 서명) → **no hits**(액션 정의 자체가 부재하므로 그 버전도 부재).
- 결과: 액션 로직이 핸들러 코드 배포로만 바뀌며, 과거 Decision이 어떤 액션 규격으로 처리됐는지 재구성(§52 Snapshot·§55 Reconciliation) 불가능.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: Action Definition(§8) ABSENT — 버전화할 정의 자체가 부재. 나아가 스냅샷 대상인 Eligibility(§12)·Effect(§13)·Outcome(§14)·Sequential Effect(§47)도 전부 ABSENT이므로 스냅샷 필드는 참조 대상 없음.
- cover: **0** (액션 정의 버전·불변해시·스냅샷 전무 · 인접 불변체인은 감사이벤트용 `SecurityAudit::verify()`뿐으로 목적 상이).

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_decision_action_version` — Definition(§8) 신설 이후 착수. INITIAL부터 버전 계보를 강제하고 `immutable_hash`로 봉인, 각 변경에 VERSION_TYPE 부여.
- 확장 기반: `SecurityAudit::verify()`(`:56,64`)의 해시체인 검증 패턴을 Action Version `immutable_hash` 무결성 검증에 재사용(엔진 난립 금지 — 새 해시엔진 신설 대신 기존 검증기 확장).
- Mandatory Control(무후퇴): 과거 Decision은 반드시 판정 시점 Action Version을 스냅샷 보존 — 정책 변경이 소급 적용되면 감사 무결성 붕괴(§58 High "Action Version 없음"). Reason Version(§37)과 동일 규율.
- 실위험: 현재 액션 로직이 배포로만 바뀌므로 `Alerting::executeAction`(`Alerting.php:653`) 집행 규칙이 언제 바뀌었는지 추적 불가 — Version 신설 전까지 액션 규격 변경은 감사공백. 최소한 `change_summary`+`immutable_hash`+`created_by`를 우선 강제.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
