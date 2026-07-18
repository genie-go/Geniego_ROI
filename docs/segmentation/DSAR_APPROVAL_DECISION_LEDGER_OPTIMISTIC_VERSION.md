# DSAR — Ledger Optimistic Version (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§44 LEDGER_OPTIMISTIC_VERSION

- **Expected Version 검증 대상**: Decision Ledger Version · Partition Version · Head Version · Expected Last Sequence · Decision Record/Commit Version Reference · Integrity Policy/Definition Version.
- ★ **Mismatch 시 Head 덮어쓰기 금지** → 재조회 · 재검증 · 재시도(retry with full revalidation).

## 2. 기존 구현 대조

- 코드 기반 판정: **ABSENT** — 낙관적 버전(version/CAS) 검증 전무.
- 부재:
  - **version / CAS = 0**(EXISTING_IMPLEMENTATION §2 "Optimistic Version ABSENT" 재확인).
  - SecurityAudit lastHash 조회(`SecurityAudit.php:35-41` ORDER BY id DESC)는 최신 해시를 읽어 다음 prev 로 쓸 뿐 **Expected Version 검증/CAS 없음** — 동시 INSERT 시 두 워커가 같은 lastHash 를 읽어 체인 분기 가능(§4 실 위험 5).
  - 승인 결정 in-place UPDATE(`Mapping.php:285-289,327`)에도 version 컬럼/조건부 UPDATE(WHERE version=:expected) 없음 — lost update 방지 장치 부재.
  - §44 검증 대상(Ledger/Partition/Head Version·Expected Last Sequence)이 되는 원장 로우 자체가 부재(§15/§16/§20 ABSENT).
- 유사물 없음: 조건부 UPDATE 클레임(`Omnichannel.php:429-441`)은 status='queued' 가드일 뿐 단조 version 검증이 아님.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §44 는 §15 Ledger·§16 Partition·§20 Head·§19 Sequence·§3.1 Decision Record Version 을 검증 대상으로 요구(전부 ABSENT). BLOCKED_PREREQUISITE.
- cover: **0**(version/CAS/Expected Version 검증 전무).

## 4. 확장/구현 방향 (설계)

- 순신규(표준 CAS 패턴): §20 Ledger Head 갱신을 `UPDATE ... SET current_entry=..., head_version=head_version+1 WHERE head_version=:expected` 형태의 **조건부 UPDATE(CAS)** 로 구현 — Expected Head Version·Expected Last Sequence mismatch 시 0-row affected → 재조회·재검증·재시도(Head 덮어쓰기 금지).
- 확장 substrate: 조건부 UPDATE 자체는 `Omnichannel.php:429-441`(status 가드 조건부 UPDATE)의 실사례가 있으므로 SQL 패턴은 재사용 — status 가드를 version 가드로 승격.
- Fencing 이중 게이트(Mandatory): §43 fencing token + §44 Expected Version 을 Head Update 에 동시 적용 — 낙관적 버전은 논리적 경합을, fencing 은 좀비 워커(만료 리스)를 각각 차단(두 축 상호보완).
- 무후퇴: 승인 in-place UPDATE(`Mapping.php:288`)의 lost-update 위험도 별도 세션에서 version 가드로 보강 후보(이번엔 설계만) — 기존 동작 회귀 금지(§68 Regression Gate).

관련: [[DSAR_APPROVAL_DECISION_LEDGER_FENCING_TOKEN]] · [[DSAR_APPROVAL_DECISION_LEDGER_CONFLICT]] · [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].
