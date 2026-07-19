# DSAR — Ledger Read-time Verification (06-A-03-02-03-02)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§52 Read-time Verification (원문 전사):
- `Critical Profile`은 조회 시 Digest 검증
- 대량 목록은 `Sampling` / `Checkpoint`
- 실패 데이터를 정상처럼 반환 금지
- 응답에 `Integrity Status` 포함
- 권한 없는 사용자에 내부 Digest 노출 금지
- Critical Failure 시 읽기 제한 / Security Banner

의미: Read-time Verification은 원장 Entry를 **조회하여 사용자·다운스트림에 반환하는 시점**에 그 Entry의 무결성을 검증하는 게이트다. Critical Profile(§11 FINANCIAL_HIGH/PAYMENT_CRITICAL/LEGAL_HIGH 등)에 속한 원장은 조회할 때마다 Digest를 재검증하고, 대량 목록은 전수 대신 Sampling·Checkpoint Range로 검증한다. 핵심 계약은 **① 검증 실패 데이터를 정상인 것처럼 반환 금지**(§52 위반=silent serve of tampered data), **② 응답에 Integrity Status(VERIFIED/FAILED/…)를 명시**, **③ 권한 없는 사용자에게 내부 Digest 값을 노출 금지**(§5.7·§68 Sensitive Output Redaction), **④ Critical Failure 시 읽기 제한 또는 Security Banner** 노출이다.

## 2. 기존 구현 대조

- **조회시점 무결성 검증 게이트는 부재** — Entry를 반환하기 전 Digest를 재검증하고 Integrity Status를 응답에 실어주는 read-path 결선 전무.
- 개념별 능력 판정(GROUND_TRUTH):
  - `Critical Profile 조회 시 검증` → **ABSENT**: Profile(§11) 개념 자체가 부재. Critical 원장을 구분해 조회시 검증하는 분기 0.
  - `Sampling`·`Checkpoint` → **ABSENT**: Checkpoint Digest·Sampling 개념 부재. `SecurityAudit::verify`(`SecurityAudit.php:56-68`)는 전 행 순회 전수 검증기이지 read-path Sampling이 아니다.
  - `실패 데이터 정상 반환 금지` → **정반대(위험)**: 조회 경로에 검증 자체가 없으므로, 변조된 Entry라도 그대로 반환된다. 유일 검증기(`SecurityAudit::verify`)는 배치 배선 1개소(`AdminGrowth.php:1429`)에서만 소비되고, 일반 조회(`SecurityAudit.php:8` INSERT/SELECT만)는 무검증 반환.
  - `응답에 Integrity Status` → **PARTIAL(단일 관리 화면만)**: `AdminGrowth.php:1429`가 `SecurityAudit::verify`의 `{ok,checked,broken_at}`(`SecurityAudit.php:56-68`)를 `integrity`로 노출하는 것이 유일 사례 — 그러나 이는 관리자 대시보드 전용이지 일반 read-path의 per-record Integrity Status가 아니다.
  - `내부 Digest 비노출` → **N/A(현재 노출면 자체 부재)**: 무결성 Digest를 조회 응답에 싣는 API가 없어 노출 위험은 현재 무의미하나, 신규 설계 시 §5.7 Redaction 필수.
  - `Critical Failure 시 읽기 제한/Security Banner` → **ABSENT**: 조회 차단·Banner 결선 0.

## 3. 판정

- Verdict: **ABSENT / BLOCKED_PREREQUISITE** (verify 능력은 존재하나 read-path·Profile·Sampling·Integrity Status 결선 전무).
- 선행 의존: §3.1 Immutable Ledger·§3.2 Decision Foundation ABSENT(설계전용)·§11 Profile 부재에 종속 → 조회시 검증할 Critical 원장 Entry 대상 자체가 없어 **BLOCKED_PREREQUISITE**.
- cover: **0** (read-path 검증·Integrity Status·Sampling 전무. AdminGrowth의 integrity 노출은 배치 결과의 단일 관리 화면 표출).

## 4. 확장/구현 방향 (설계)

- 순신규 Read-time Verification 훅 — Critical Profile 소속 원장 Entry 반환 직전 Digest 재검증. 대량 목록은 Checkpoint Range·Random Sampling으로 비용 통제. 반환 payload에 per-record `Integrity Status`(VERIFIED/VERIFIED_WITH_WARNINGS/FAILED/TAMPER_DETECTED, §50) 부착.
- Golden Rule=Extend: `SecurityAudit::verify`(`SecurityAudit.php:56-68`)의 재계산+`hash_equals`(`SecurityAudit.php:63-64`) 로직을 **단건/샘플 read-path 검증기**로 이식하고, `AdminGrowth.php:1429`의 `integrity` 노출 패턴을 일반 조회 응답의 Integrity Status로 일반화.
- **★fail-open 봉쇄**: 검증 실패 Entry를 정상처럼 반환하지 않도록 fail-closed — 실패 시 데이터 대신 `LEDGER_VERIFICATION_FAILED`(§64) 또는 마스킹된 값 + Security Banner 반환. 현행 무검증 반환·`catch` no-op(`SecurityAudit.php:32`)를 개선으로 대체(무후퇴 예외).
- **★Sensitive Output Redaction**: 내부 Payload/Context/Entry Digest·Canonical Payload는 권한 없는 사용자에 비노출(§5.7·§68) — Production Log에 Canonical Payload 전체 기록 금지 원칙과 동일선.
- **★tenant 술어 강행**: read-path 검증은 `WHERE tenant_id=?`로 테넌트 격리(§5.13) — 현행 verify는 전역 단일 체인(tenant 술어 부재, GROUND_TRUTH 실위험 4).
- 장식 오인 금지 — `menu_audit_log.hash_chain`(`AdminMenu.php:169-212`)은 verify() 0이라 read-time 검증 근거 아님.

관련: [[DSAR_APPROVAL_LEDGER_COMMIT_TIME_VERIFICATION]] · [[DSAR_APPROVAL_LEDGER_PERIODIC_VERIFICATION]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].
