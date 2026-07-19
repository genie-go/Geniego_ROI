# DSAR — Ledger Entry Verification (06-A-03-02-03-02 · §39)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★ 실존 `SecurityAudit::verify`(CANONICAL_VERIFICATION_ENGINE)를 14단계 순서로 **확장**. file:line 인용은 GROUND_TRUTH 등재분만.

## 1. 원문 전사 (Canonical Contract)

§39 Entry Verification 순서 (원문 전사, 14단계):

①`Integrity Version 존재` ②`Algorithm 허용` ③`Canonicalization Version` ④`Field Set Version` ⑤`Source Aggregate 조회` ⑥`Canonical Projection 재생성` ⑦`Payload Digest 재계산` ⑧`Context Digest 재계산` ⑨`Reference Digest 재계산` ⑩`Previous Entry Digest 확인` ⑪`Entry Digest 재계산` ⑫`Stored Digest 비교` ⑬`Sequence/Tenant/Partition Binding` ⑭`Result 기록`.

의미: Entry Verification은 단일 Ledger Entry의 무결성을 절차적으로 재실증한다. 먼저 Entry에 고정된 Integrity Version(§5.8)·Algorithm(§5.6 허용 여부)·Canonicalization Version·Field Set Version이 유효한지 확인하고(①~④), Source Aggregate를 조회해(⑤) §13~§22 Canonical Projection을 재생성한 뒤(⑥) Payload/Context/Reference Digest를 각각 재계산한다(⑦~⑨). 이어 Previous Entry Digest를 확인하고(⑩·§5.9) Entry Digest를 재계산해(⑪) Stored Digest와 **Constant-time 비교**(⑫·§84)한 뒤 Sequence/Tenant/Partition Binding을 검증하고(⑬·§5.13) 결과를 Immutable 기록한다(⑭·§5.12). 관련 Digest 정의: §24(Payload)·§25(Context)·§26(Entry)·§27(Genesis).

## 2. 기존 구현 대조

- **실 Entry 검증 골격 = `SecurityAudit::verify`(`SecurityAudit.php:56-68`)** — §39 14단계 중 핵심 3단계(⑪ Entry Digest 재계산 `SecurityAudit.php:63` · ⑫ Stored Digest 비교 `hash_equals` `SecurityAudit.php:64` · ⑩ Previous Entry Digest 확인 `prev_hash === $prev` `SecurityAudit.php:64`)를 **실제 수행**한다. ⑫의 `hash_equals`는 timing-safe 비교(§84 Constant-time 준수). ⑭ Result 기록은 반환 `{ok, checked, broken_at}` 수준(별도 immutable result 테이블 아님).
- **부재 단계(①~⑨·⑬)**:
  - ①~④ Version 게이트 — Integrity/Algorithm/Canonicalization/Field Set Version이 Entry에 고정·조회되지 않음. 현행 preimage는 알고리즘을 `'sha256'`로 하드코딩(§5.5 위반), 버전 개념 없음 → **no hits**.
  - ⑤~⑥ Source Aggregate 조회·Canonical Projection 재생성 — 현행 verify는 원장 행 자체의 preimage를 raw로 재조립(`SecurityAudit.php:63`은 저장된 컬럼 `tenant·actor·action·details·created_at`를 다시 `|`-concat)할 뿐, 별도 Source Aggregate를 재조회해 Canonical Projection을 재생성하는 단계가 없다(§5.3 Canonicalization 부재).
  - ⑦~⑨ Payload/Context/Reference Digest 분리 재계산 — 현행은 단일 preimage 하나만 재계산. Payload·Context·Reference Digest 계층 분리(§24·§25·§26) 없음.
  - ⑬ Sequence/Tenant/Partition Binding — verify에 tenant 술어 없음(전역 단일 체인 `SecurityAudit.php:59` 계열)·Sequence/Partition 개념 부재.
- **확장 델타(GROUND_TRUTH §5)**: ①Canonicalization 없이 재계산(§5.3 위반) ②tenant 술어 없음(§39⑬ Tenant Binding 미달) ③gap 무탐지 ④Head-CAS/Checkpoint 부재. 특히 ⑥ Canonical Projection 재생성이 §39의 정확성 축인데 현행은 raw concat(`SecurityAudit.php:27`) 재현이라 환경/언어/직렬화 차이에 취약.
- **결합 대상 부재** — 선행 §3.1 Immutable Ledger·§3.2 Decision Foundation ABSENT. `ledger_entry`·Source Aggregate(Decision Record/Snapshot/Evidence)·Field Set 테이블 전무 → ⑤~⑨가 조회·재생성할 대상 자체가 없다.
- 장식 오인 금지: `menu_audit_log`(`AdminMenu.php:169-212`)는 preimage `ts`(`AdminMenu.php:195`)가 INSERT 컬럼(`AdminMenu.php:199-203`)에서 누락돼 DB DEFAULT가 덮음 → **재계산(⑪) 불가**·verify() 0 → Entry Verification 대상 아님.

## 3. 판정

- Verdict: **검증기 패턴 PRESENT·확장 / 실 Ledger Entry·Field Set·Source Aggregate 부재로 적용 BLOCKED_PREREQUISITE** — ⑩⑪⑫(재계산+prev+Constant-time 비교)는 `SecurityAudit.php:63-64`에 실재하므로 Entry Verification 핵심은 확장 대상. 그러나 ①~⑨·⑬(Version 게이트·Source Aggregate·Canonical Projection·Digest 계층·Binding)은 선행 Ledger/Field Set/Projection 부재로 적용 불가.
- 선행 의존: §3.1 Immutable Ledger·§3.2 Decision Foundation ABSENT. §3.3 Platform Security(SHA-256 `SecurityAudit.php:27`·서버UTC `SecurityAudit.php:24`)만 PRESENT.
- cover: **0** (14단계 중 ⑩⑪⑫만 실존, 그마저 Canonicalization·Tenant Binding 미비. SecurityAudit 순차검증은 KEEP_SEPARATE).

## 4. 확장/구현 방향 (설계)

- **Golden Rule=Extend**: `SecurityAudit::verify`(`SecurityAudit.php:56-68`)의 ⑪ 재계산·⑫ `hash_equals`(`SecurityAudit.php:64`, Constant-time 유지)·⑩ prev 확인을 14단계 절차의 척추로 재사용. 나머지 11단계를 그 앞뒤로 삽입.
- **확장 델타 반영**:
  1. **⑥ Canonical Projection 재생성**(§5.3) — raw concat(`SecurityAudit.php:27`) 재현을 §13~§22 Canonical Projection으로 대체(무후퇴 예외=개선). ①~④ Version 게이트가 이 Projection의 알고리즘·정규화·필드셋 버전을 결정.
  2. **⑬ Sequence/Tenant/Partition Binding**(§5.13·§39⑬) — verify에 `WHERE tenant_id=?`+Sequence/Partition 술어 추가(현행 전역 단일 체인 `SecurityAudit.php:59` 계열). Cross-Tenant Chain 차단.
  3. **⑦~⑨ Digest 계층 분리** — 단일 preimage를 Payload(§24)·Context(§25)·Reference Digest로 분리 재계산 후 ⑪ Entry Digest로 결합.
  4. **⑭ Immutable Result** — 반환값 수준을 넘어 §50 Verification Result를 append-only 기록(자기 무결성 §5.12).
- **재사용 substrate(§3.3)**: SHA-256(`SecurityAudit.php:27`)·서버UTC(`SecurityAudit.php:24`)·내용주소 CAS(`MediaHost.php:88-102`, Reference/Attachment Digest ⑨). Digest·재계산은 "발명 아닌 조립".
- **구현 순서**: 선행 Immutable Ledger·Field Set·Canonical Projection 실구현 → Source Aggregate 조회(⑤) 배선 → 14단계 조립. 이번 차수=설계(코드 0). 실 구현=별도 승인세션.
- `journey_decision_log`(`JourneyBuilder.php:1192`, in-place UPDATE·append-only 아님)은 Entry Verification 대상 원장으로 계상 금지.

관련: [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_LEDGER_CHAIN_VERIFICATION]] · [[DSAR_APPROVAL_LEDGER_RANGE_VERIFICATION]] · [[DSAR_APPROVAL_LEDGER_REFERENCE_VERIFICATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].
