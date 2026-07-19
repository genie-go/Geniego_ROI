# DSAR — Ledger Head Verification (06-A-03-02-03-02 · §41)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★ 현행 Head-CAS/Head Digest 부재 — `SecurityAudit::verify`의 순차 마지막행 조회는 Head Verification이 아님. file:line 인용은 GROUND_TRUTH 등재분만.

## 1. 원문 전사 (Canonical Contract)

§41 Head Verification (원문 전사):

`Head가 마지막 Entry 지시` · `Head Sequence=Max` · `Head Entry Digest` · `Head Digest 재계산` · `Head Version 단조증가` · `Previous Head Reference` · `Partition/Ledger Head 관계` · `Fencing Token 이상無`.

의미: Head Verification은 원장의 최신 상태 포인터(Ledger Head)가 실제 마지막 Entry와 일치하는지 검증한다. Head가 지시하는 Entry가 진짜 마지막 Entry인지, Head Sequence가 Max Sequence와 같은지, Head가 담은 Entry Digest가 그 Entry의 Digest와 일치하는지, Head Digest 자체를 재계산해 저장값과 맞는지, Head Version이 단조증가(§30)하는지, Previous Head Reference가 정확한지, Partition Head와 Ledger Head의 관계가 정합한지, 그리고 동시성 제어의 Fencing Token에 이상이 없는지를 검사한다. §30 정의상 **Head Digest ≠ Entry Digest**이며, Head는 동시 Append 시 체인 분기를 막는 CAS(Compare-And-Swap) 앵커다(§5.13 Head Verification 필수·비활성 불가).

## 2. 기존 구현 대조

- **★현행 Head 개념 부재 = ABSENT** — GROUND_TRUTH §5-3: `SecurityAudit`은 **Head-CAS/tx경계 부재**. `SecurityAudit::lastHash()`(`SecurityAudit.php:39-40`)는 `ORDER BY id DESC`로 마지막 행의 해시를 조회할 뿐, 이는 §41이 요구하는 Head Digest·Head Version·Fencing Token을 담은 별도 Head 레코드가 아니다. 마지막 Entry "조회"이지 Head "검증"이 아니다.
- **부재 항목(전항)**:
  - **Head Digest 재계산·Head↔마지막 Entry 지시** — Head 레코드 자체가 없어 §30 Head Digest(tenant·ledger·partition·current entry/sequence·current entry digest·previous head digest·head version·fencing token)를 재계산·대조할 대상 부재 → **no hits**.
  - **Head Sequence=Max** — 논리 Sequence 개념 부재(물리 `id`에 의존, `SecurityAudit.php:39`). Max Sequence 대조 불가.
  - **Head Version 단조증가·Previous Head Reference** — Head Version 개념 전무.
  - **Fencing Token 이상無** — GROUND_TRUTH §5-3: 동시 INSERT 체인분기 이론창(§30 Head Digest·§41 Head Verification 미달). Fencing Token·CAS·tx경계 부재 → `SecurityAudit.php:39` DESC 조회는 두 동시 쓰기가 같은 prev를 읽는 race에 무방비.
  - **Partition/Ledger Head 관계** — Partition 개념 부재.
- **확장 델타(GROUND_TRUTH §5)**: ④**Head-CAS/Checkpoint 개념 부재**가 이 문서의 핵심 결함. 추가로 ①Canonicalization 없이 재계산(§5.3) ②tenant 술어 없음(전역 단일 체인) ③gap 무탐지.
- **결합 대상 부재** — 선행 §3.1 Immutable Ledger ABSENT. `ledger_head`·`fencing_token`·Partition 테이블 전무.
- 장식 오인 금지: `menu_audit_log.lastHash()`(`AdminMenu.php:214-218`)도 동일하게 마지막 해시 조회일 뿐 Head Digest 아님·verify() 0.

## 3. 판정

- Verdict: **ABSENT** — Head Digest·Head Version·Fencing Token·Partition Head를 담은 Head 레코드가 전무. `SecurityAudit::lastHash`(`SecurityAudit.php:39-40`)의 `ORDER BY id DESC` 마지막행 조회는 §41 Head Verification의 어느 항목도 충족하지 못한다(조회≠검증·CAS 부재). 선행 Ledger Head 실체 없이는 적용 불가 → **BLOCKED_PREREQUISITE**.
- 선행 의존: §3.1 Immutable Ledger(Head·Sequence·Partition·Fencing Token) ABSENT·§3.2 Decision Foundation ABSENT. §3.3 Platform Security(SHA-256 `SecurityAudit.php:27`·서버UTC `SecurityAudit.php:24`)만 substrate PRESENT.
- cover: **0** (Head Digest 계층 전무. lastHash 마지막행 조회는 KEEP_SEPARATE — Head Verification 대체 아님. Head-CAS는 현행 최대 취약점).

## 4. 확장/구현 방향 (설계)

- **순신규(Head 계층 신설)**: §30 `APPROVAL_LEDGER_HEAD_DIGEST`(tenant·ledger·partition·current entry/sequence·current entry digest·previous head digest·head version·fencing token ref·updated_at)를 신설. Head Digest ≠ Entry Digest 원칙 준수(§30).
- **확장 델타 반영(Head-CAS 신설이 핵심 교정)**:
  1. **Head-CAS/tx경계**(§5.13·§41 Fencing Token) — 현행 `lastHash` DESC 조회(`SecurityAudit.php:39-40`)의 동시 INSERT 체인분기 이론창을 Head Version 단조증가 + Fencing Token 기반 Compare-And-Swap으로 닫음. Append는 "읽은 Head Version == 저장 Head Version"일 때만 성공(무후퇴 예외=개선).
  2. **Head↔마지막 Entry·Max Sequence 대조** — 논리 Sequence 신설 후 Head Sequence=Max 검증.
  3. **Head Digest 재계산**(§5.3 Canonicalization) — raw concat(`SecurityAudit.php:27`)이 아니라 Canonical Envelope로 Head Digest 재계산·`hash_equals` 비교(`SecurityAudit.php:64` 패턴 재사용, Constant-time).
  4. **Tenant/Partition Binding**(§5.13) — Head를 `tenant_id`·`partition`별로 분리(현행 전역 단일 체인). Partition Head↔Ledger Head 관계 검증.
- **재사용 substrate(§3.3)**: `hash_equals`(`SecurityAudit.php:64`)·SHA-256(`SecurityAudit.php:27`)·서버UTC(`SecurityAudit.php:24`). Head Digest 재계산·비교는 검증기 패턴을 그대로 조립.
- **선행 substrate 확인**: Platform §3.4 트랜잭션 PDO(`Omnichannel.php:404-415`)·SKIP LOCKED(`Omnichannel.php:405,429-441`)가 Head-CAS의 tx경계·잠금 기반으로 재사용 가능.
- **구현 순서**: 선행 Immutable Ledger의 Head·Sequence·Partition·Fencing Token 실구현 → Head Digest 재계산기 조립 → §41 8항 검증. 이번 차수=설계(코드 0). 실 구현=별도 승인세션.

관련: [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_LEDGER_CHAIN_VERIFICATION]] · [[DSAR_APPROVAL_LEDGER_RANGE_VERIFICATION]] · [[DSAR_APPROVAL_LEDGER_CHECKPOINT_VERIFICATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].
