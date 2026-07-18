# DSAR — Domain Immutability Guard (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**DOMAIN_IMMUTABILITY_GUARD(§25)**

직접수정 금지 대상(Commit 이후 불변):
- Committed Decision Record · History · Commit · Validation Final Snapshot
- Action Snapshot · Snapshot · Evidence · Audit Event
- Ledger Entry · Link · Checkpoint
- Correction Entry · Supersession Entry

수정요청 처리 경로(직접 mutate 금지 → 명시 요청으로 전환):
- Correction · Amendment · Supersession · Redaction Request · Administrative Review · Rejected Mutation Attempt(거부 시도도 기록).

## 2. 기존 구현 대조

- **강제 계층 없음(ABSENT).** §GROUND_TRUTH ★실 위험: "DB 불변강제(Trigger/RLS/Permission) **전무**" · EXISTING_IMPLEMENTATION "Domain/Repo/DB Immutability Guard | ABSENT | 강제계층 없음(관례만)".
- **도메인 계층에 Commit-후 불변 개념 자체가 부재**: 승인 결정이 in-place UPDATE(`Mapping.php:285-289,327`) · `journey_decision_log` in-place UPDATE(`JourneyBuilder.php:60,74,1192`) → "Committed 후 수정 금지"를 강제하는 도메인 가드가 없고, 오히려 수정이 정상 경로.
- 유일 근접 자산 `SecurityAudit.php`(`:8` INSERT/SELECT만·`:56-68` verify)는 **감사 로그** 불변 관례일 뿐 Decision Record/Snapshot/Evidence 도메인 객체의 Commit-후 불변 가드가 아님.
- 선행 §3.1 Decision Core **ABSENT**(`approval_decision` 0) → 보호할 "Committed Decision Record/History/Commit/Snapshot" 도메인 엔티티 자체가 존재하지 않음.

## 3. 판정
- Verdict: **ABSENT** (강제 계층 전무 · 선행 부재 → **BLOCKED_PREREQUISITE**)
- 선행 의존: §3.1 Decision Core / §3.2 Actions / §3.3 Runtime 전부 ABSENT → 보호 대상 도메인 객체 부재
- cover: **0**

## 4. 확장/구현 방향 (설계)

- **순신규 4계층 중 도메인 계층**: DOMAIN(§25) → REPOSITORY(§26) → DATABASE(§27) 3중 강제의 최상단. 도메인 객체가 Commit 상태 진입 시 setter/mutator 를 봉쇄(불변 값객체·상태전이 명시)하고, 모든 변경 요청을 Correction/Amendment/Supersession/Redaction/Administrative Review 명시 커맨드로만 수용.
- **★Rejected Mutation Attempt 기록**: 직접수정 시도도 거부하되 감사 이벤트로 남긴다 → SecurityAudit append-only 패턴(`:27,48-52,56-68`) 재사용해 시도 자체를 불변 기록.
- **재사용 substrate**: 서버UTC(`Db.php:438`·`SecurityAudit.php:24`·`Mapping.php:285,315`) → recorded_at · SHA-256(SecurityAudit `:27`) → 변경 전/후 digest.
- **무후퇴 전환**: 현행 in-place UPDATE(`Mapping.php:288`·`JourneyBuilder.php:1192`)를 도메인 가드 하에서 append-Correction 경로로 전환 — 과거 결정 소실(현 결함) 해소. 단 실 전환은 Decision Core 신설 후 별도 승인세션.
- **선행 요건**: Decision Core(불변 Decision Record/Snapshot/Evidence 엔티티) 신설 선행 → 그 전엔 가드가 보호할 대상이 없어 BLOCKED_PREREQUISITE. 도메인 가드 단독으론 불충분 → Repository(§26)·Database(§27) 가드와 3중 강제 필수(현재는 관례조차 DB 미강제).

관련: [[DSAR_APPROVAL_DECISION_REPOSITORY_IMMUTABILITY_GUARD]] · [[DSAR_APPROVAL_DECISION_DATABASE_IMMUTABILITY_GUARD]] · [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].
