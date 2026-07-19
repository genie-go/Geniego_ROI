# DSAR — Ledger Tamper Response Policy (06-A-03-02-03-02)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> 인용 규율: file:line은 [`DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

§46 **Tamper Response Action** (원문 전사) — 분류·봉인된 Tamper에 대해 시스템이 취하는 대응 행동 14종:

- `LOG_ONLY`
- `WARNING`
- `BLOCK_LEDGER_APPEND`
- `BLOCK_DECISION_COMMIT`
- `BLOCK_AFFECTED_CASE` / `BLOCK_AFFECTED_RESOURCE`
- `BLOCK_TENANT_APPROVAL`
- `RESTRICT_READ`
- `REQUIRE_MANUAL_REVIEW`
- `TRIGGER_RECONCILIATION` / `TRIGGER_RECONSTRUCTION`
- `ESCALATE_SECURITY_INCIDENT`
- `PRESERVE_FORENSIC_SNAPSHOT`
- `ACTIVATE_KILL_SWITCH`
- `CUSTOM`

**기본 매핑**(원문 전사):
- **Critical Entry Mismatch** → `BLOCK_DECISION_COMMIT`(Commit 차단)
- **Chain Break** → `BLOCK_LEDGER_APPEND`(Partition Append 차단)
- **Head Mismatch** → Head 갱신 차단 + Commit 차단
- **Audit/Evidence Mismatch** → `REQUIRE_MANUAL_REVIEW` + `ESCALATE_SECURITY_INCIDENT`
- **Weak Algorithm** → 신규 Commit 차단 + Migration 요구
- **Legacy Untrusted** → `WARNING`/`REQUIRE_MANUAL_REVIEW` + Canonical Digest 별도 생성

원문 제약(§5.13): **Canonical Serialization·Strong Algorithm·Previous Digest/Sequence/Tenant Binding·Entry/Head Verification·Critical Tamper Alert·Verification Audit·Weak Algorithm Rejection은 고객설정으로 비활성 불가.** `ACTIVATE_KILL_SWITCH`는 광범위·CATASTROPHIC 상황의 최종 안전장치.

의미: Response Policy는 (Severity × Category)(§45) → Action 매핑을 **데이터로 선언**하여, 탐지된 변조가 즉시 쓰기·읽기·워크플로를 차단하도록 강제한다. §5.11(실패를 Warning으로 무시 금지)의 집행 계층 — Critical 불일치를 `LOG_ONLY`/`WARNING`으로 흘려보내는 것을 정책적으로 금지한다.

## 2. 기존 구현 대조

- **Tamper Response 정책·집행 부재** — Severity/Category → Action 매핑, write/read/workflow 차단 집행, Kill Switch 전무.
- **현행 유일 유사물 = 반응 없음** — `SecurityAudit::verify`(`SecurityAudit.php:56-68`)는 `{ok:false, broken_at}`를 **반환만** 한다. `AdminGrowth.php:1429` 소비처는 `integrity` 상태 노출뿐, 어떤 차단(Append/Commit/Read/Workflow)도 트리거하지 않는다 → **탐지 후 무대응**.
- **★실 위험 = fail-open + Warning 오취급** (GROUND_TRUTH 5절):
  - `SecurityAudit.php:32` `catch` no-op fail-open → 검증 실패를 삼켜 대응은커녕 탐지도 무력화(체인 silent reset). §46 기본매핑의 정반대(차단 대신 통과).
  - verify 실패를 상태값으로만 취급 → §5.11 위배 창(CRITICAL을 `WARNING`처럼 처리).
  - `SecurityAudit.php:39-40` GENESIS-on-error → 조용한 체인분기로 `CHAIN_BREAK` 대응(`BLOCK_LEDGER_APPEND`) 자체가 발동 안 됨.
- **차단 대상 부재** — `BLOCK_LEDGER_APPEND`/`BLOCK_DECISION_COMMIT`이 걸 대상(§3.1 Ledger Append·§3.2 Decision Commit)이 ABSENT(GROUND_TRUTH 1절)라 집행점 없음.
- **장식 오인 금지** — `menu_audit_log`(`AdminMenu.php:169-212`, verify 0)는 대응 트리거 소스로 계상 금지.

## 3. 판정

- Verdict: **ABSENT / BLOCKED_PREREQUISITE**
- cover: **0** — Response Action·차단 집행·Kill Switch 전무. 현행은 탐지결과를 반환만 하고 무대응이며, 오히려 fail-open으로 §46 기본매핑에 역행.
- 선행 의존: §44 Detection·§45 Classification/Incident(상위 입력)·§3.1 Ledger Append·§3.2 Decision Commit(차단 집행점) 종속. 순신규.

## 4. 확장/구현 방향 (설계)

- **순신규 Response Policy 매핑 테이블** — (Severity, Category, Profile) → Action을 §11 Profile의 `write/read block policy`·`incident escalation`으로 데이터 선언. §46 기본매핑을 default로 고정: Critical Entry Mismatch→`BLOCK_DECISION_COMMIT`, Chain Break→`BLOCK_LEDGER_APPEND`, Head Mismatch→Head갱신+Commit 차단, Audit/Evidence Mismatch→`REQUIRE_MANUAL_REVIEW`+`ESCALATE_SECURITY_INCIDENT`, Weak Algorithm→신규 Commit 차단+Migration 요구, Legacy Untrusted→`WARNING`/Manual Review+Canonical 별도생성.
- **★실위험 정면 치료(무후퇴 예외=개선)**: `SecurityAudit.php:32` fail-open catch를 **fail-closed**로 전환 — 검증 실패=대응 트리거(최소 `REQUIRE_MANUAL_REVIEW`+`ESCALATE_SECURITY_INCIDENT`). `:39` GENESIS-on-error도 정상 GENESIS와 "오류 폴백 GENESIS"를 구분하여 `CHAIN_BREAK`로 승격.
- **§5.13 불가침 집행**: Critical Tamper Alert·Weak Algorithm Rejection·Entry/Head Verification 기반 차단은 고객설정으로 비활성 불가 — 정책 테이블에 "disable 불가" 플래그를 하드 인바리언트로 고정.
- **`ESCALATE_SECURITY_INCIDENT`·`PRESERVE_FORENSIC_SNAPSHOT`**: §3.3 Security Event Framework(`SecurityAudit` 재사용)·`MediaHost.php:88-102` 내용주소 CAS(Forensic snapshot 봉인)로 조립.
- **`ACTIVATE_KILL_SWITCH`**: CATASTROPHIC(다수 Entry·Cross-Tenant·Algorithm Downgrade 결합) 시 테넌트 승인 전면 차단(`BLOCK_TENANT_APPROVAL` 상위). 집행 대상은 선행 Ledger/Decision 실구현 종속(RP-002 별도 승인세션).

관련: [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_LEDGER_TAMPER_CLASSIFICATION]] · [[DSAR_APPROVAL_LEDGER_TAMPER_INCIDENT]] · [[DSAR_APPROVAL_LEDGER_TAMPER_EVIDENCE]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].
