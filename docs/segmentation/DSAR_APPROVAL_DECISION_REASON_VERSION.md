# DSAR — Approval Decision Reason Version (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§37 REASON_VERSION 필수 필드:
- `version_id` · `definition id` · `version_number` · `previous_version_id`
- `localized labels`
- `applicability snapshot` · `requirement snapshot` · `severity snapshot`
- `effective_from` / `effective_to`
- `immutable_hash`
- `status` · `evidence`

★ 과거 Decision은 당시 Reason Version을 유지해야 한다(사후 사유 정의 변경이 과거 결정의 근거를 오염시키면 안 됨).

## 2. 기존 구현 대조

- 사유의 버전·`immutable_hash`·`localized labels snapshot`·`applicability/requirement/severity snapshot`을 관리하는 자산 → **no hits**.
- 실존 사유는 버전 개념 없는 단일 자유텍스트 값(`Handlers/ReturnsPortal.php:36`) — `version_number`/`previous_version_id`/`effective_from·to` 전무.
- 불변 해시 인프라 자체는 인접 도메인에 존재하나 사유에 결합되어 있지 않음: `SecurityAudit::verify()`(`Handlers/SecurityAudit.php:56,64`)는 감사 체인 검증 정본이지 사유 버전 해시가 아님(재사용 후보이지 사유용 실존 아님).
- Reason Definition(§36) 자체가 ABSENT이므로 그 버전(§37)은 논리적으로도 존재 불가.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §36 Reason Definition(ABSENT — Version은 `definition id` 종속) · §3.1 Decision Core(ABSENT — 과거 Record에 결합할 Version Snapshot 대상 없음) → **BLOCKED_PREREQUISITE**.
- cover: **0** (버전·불변해시·스냅샷 전무).

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_decision_reason_version` — `version_number`/`previous_version_id`/`immutable_hash`/`effective_from·to` + `applicability/requirement/severity snapshot`를 불변 레코드로.
- 재사용: 불변 해시 계산·검증은 `SecurityAudit::verify()`(`SecurityAudit.php:56,64`) 패턴을 사유 버전 해시로 확장(엔진 난립 금지 — 새 해시 엔진 신설 X).
- ★핵심 불변식: Decision Record가 사유를 참조할 때 `reason code`가 아니라 **당시 `version_id`를 스냅샷**해야 함(§52 Action Snapshot의 `reason definition/version` 필드). 사후 사유 라벨/심각도 변경이 과거 거절 근거를 바꾸지 못하도록.
- `localized labels`는 15개국 i18n 정책과 결합하되 버전별 스냅샷으로 고정(라벨 변경이 과거 감사 재구성 시 표시를 흔들지 않도록).
- 실위험: 버전 없이 사유 Definition을 in-place 수정하면(현행 in-place UPDATE 관행 `AdminGrowth.php:1330`) 과거 결정의 사유 의미가 소급 변조 — §58 Critical Gap(Record 수정·Mandatory Control 제거).

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
