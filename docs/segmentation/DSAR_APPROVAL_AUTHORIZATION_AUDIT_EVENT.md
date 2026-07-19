# DSAR — Authorization Audit Event (§36)

> EPIC **06-A-03-02-03-04 Part 1** · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세** · 인용원=GROUND_TRUTH([`DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION.md)) 전용.

## 1. 원문 전사 (Canonical Contract)

§36 `APPROVAL_AUTHORIZATION_AUDIT_EVENT` 이벤트 enum (원문 전사·38종):

- `REGISTRY_CREATED` / `REGISTRY_ACTIVATED`
- `POLICY_CREATED` / `POLICY_UPDATED` / `POLICY_ACTIVATED` / `POLICY_SUSPENDED` / `POLICY_DEPRECATED`
- `DEFINITION_CREATED` / `VERSION_CREATED`
- `REQUESTED`
- `EVALUATION_STARTED` / `EVALUATION_COMPLETED`
- `PERMITTED` / `CONDITIONAL_PERMIT` / `DENIED` / `EXPLICIT_DENY` / `DEFAULT_DENY`
- `CHALLENGE_ISSUED` / `CHALLENGE_COMPLETED`
- `EXCEPTION_REQUESTED` / `EXCEPTION_APPROVED` / `EXCEPTION_REVOKED`
- `OVERRIDE_REQUESTED` / `OVERRIDE_EXECUTED` / `OVERRIDE_REVIEWED`
- `SNAPSHOT_CREATED` / `EVIDENCE_CREATED`
- `REVALIDATION_REQUESTED`
- `DRIFT_DETECTED`
- `CACHE_HIT` / `CACHE_MISS` / `CACHE_INVALIDATED`
- `KILL_SWITCH_ACTIVATED`
- `RUNTIME_BLOCKED`
- `RECONCILIATION_STARTED` / `RECONCILIATION_COMPLETED`
- `MIGRATION_STARTED` / `MIGRATION_COMPLETED`

의미: Authorization Audit Event는 인가 수명주기 전 구간(등록소/정책 생성·평가 시작/종료·PERMIT/DENY 판정·challenge·exception·override·snapshot/evidence 생성·revalidation·drift·cache·kill switch·runtime block·reconciliation·migration)의 사건을 **표준 이벤트 코드로 append**하는 감사 스트림이다. §35 Evidence(판정 근거 봉투)와 달리 **시간순 사건 로그**이며, 무결성(§37 Digest·해시체인)과 결합되어 조작 탐지 가능해야 한다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **인가 전용·표준 38종 이벤트 감사 스트림은 부재** — GROUND_TRUTH §1 표에서 판정 결과가 `audit append만`으로 기록될 뿐, `EVALUATION_STARTED/COMPLETED`·`EXPLICIT_DENY`·`DEFAULT_DENY`·`KILL_SWITCH_ACTIVATED`·`DRIFT_DETECTED` 같은 표준 이벤트 코드 체계 전무.
- 실존하는 유사 substrate(★유사·해시체인 아님):
  - **Maker-Checker append 감사** — 승인 판정이 append되나(Mapping approve `Mapping.php:238-292`·Alerting decideAction `Alerting.php:598-658`), 이는 **비체인 append**이지 무결성 해시체인·인가 전용 이벤트 taxonomy가 아니다.
  - `alert_policy`(`Db.php:558`) 등 정책 테이블은 존재하나 이벤트 감사 스트림이 아님.
- **★비체인 substrate**: 위 audit append는 `PERMITTED`/`DENIED`에 대응하는 사건 기록의 substrate이나 **prev_hash/hash 체인·불변 강제·인가 전용 아님** — 조작 탐지 불가(비 tamper-evident). `menu_audit_log.hash_chain`(`AdminMenu.php:123-143,200-218`)은 체인 형태이나 verify() 0(289차 정정·[[reference_menu_audit_log_not_tamper_evident]])이므로 실 무결성 근거로 계상 금지.
- `CHALLENGE_ISSUED`/`EXCEPTION_*`/`OVERRIDE_*`/`REVALIDATION_REQUESTED`/`RECONCILIATION_*`/`MIGRATION_*` → **no hits**(대응 기능 전부 순신규 후속 Part).
- `CACHE_HIT/MISS/INVALIDATED` → **no hits**(§49 Cache Foundation 부재와 연쇄).

## 3. 판정

- **Verdict: ABSENT** (인가 전용 표준 38종 이벤트·무결성 감사 스트림 전무). Maker-Checker append(`Mapping.php:238-292`·`Alerting.php:598-658`)는 **PRESENT-substrate이나 비체인·비 tamper-evident·인가 전용 아님**.
- **선행 의존: BLOCKED_PREREQUISITE** — 이벤트 대부분이 순신규 기능(Evaluation/Challenge/Exception/Override/Drift/Cache/Kill Switch/Reconciliation/Migration)의 사건이라, 해당 기능 부재로 이벤트 발생원 자체가 아직 없음.
- **cover: 0** (인가 감사 이벤트 taxonomy·해시체인 전무). audit append는 KEEP_SEPARATE(승인 이벤트)로 유지하되 인가 감사 스트림 대체로 계상 안 함.

## 4. 확장/구현 방향 (설계)

- **Golden Rule=Extend**: 순신규 `approval_authorization_audit_event` 스트림 — 38종 이벤트 코드로 인가 수명주기 사건을 append. 기존 audit append(`Mapping.php:238-292`·`Alerting.php:598-658`)를 **canonical event로 정규화·흡수**(별도 감사 엔진 신설 금지)하되, 승인 도메인 로그는 KEEP_SEPARATE로 병존.
- **무결성 결합(★핵심)**: audit append가 현재 비체인이므로, 인가 감사 이벤트는 §37 Digest 정책(앞 블록 03-02 Canonical Crypto Policy·[[DSAR_APPROVAL_DECISION_INTEGRITY_REGISTRY]])의 SHA-256 해시체인+verify를 재사용해 **tamper-evident append-only**로 설계. 유일한 실 append-only 해시체인=`SecurityAudit::verify`(앞 블록 GROUND_TRUTH)를 CANONICAL 패턴으로 재사용, `menu_audit_log` 장식 체인은 근거 배제.
- **Default Deny 관측(§5.2)**: `DEFAULT_DENY`·`EXPLICIT_DENY`·`RUNTIME_BLOCKED`·`KILL_SWITCH_ACTIVATED`를 반드시 이벤트로 기록해 fail-closed 판정을 감사 가능하게 설계 — 현재 통과/차단만 있고 사건화 미흡(`index.php:568-578` write 게이트 차단 시 감사 이벤트 부재).
- **수정 금지(§60)**: Audit Event는 수정 API 금지·append-only·물리삭제 금지(무후퇴 예외=개선: `media_gc_cron` 류 물리 DELETE 대상에서 인가 감사 제외). 실 배선은 후속 Part. Part 1=설계만.

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_AUTHORIZATION_EVIDENCE]] · [[DSAR_APPROVAL_AUTHORIZATION_DIGEST]] · [[DSAR_APPROVAL_DECISION_INTEGRITY_REGISTRY]] · [[reference_menu_audit_log_not_tamper_evident]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
