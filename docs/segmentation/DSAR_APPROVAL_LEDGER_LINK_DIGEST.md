# DSAR — Ledger Link Digest (06-A-03-02-03-02)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> file:line 인용원 = [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] GROUND_TRUTH allowlist 한정.

## 1. 원문 전사 (Canonical Contract)

§31 Ledger Link Digest 필수 필드 (원문 전사):
- `source entry id` + `source entry digest`
- `target entry id` + `target entry digest`
- `link type` · `direction`
- `tenant`
- `link policy version`
- `created_at`

규율(원문 전사): **Cross-Tenant Link는 Digest 이전 차단.**

의미: Link Digest는 두 Entry 간 관계(Correction·Supersession·Reversal·Reference·Sequential 등)를 **양쪽 entry digest를 함께 봉인**하여, 링크가 가리키는 대상 Entry가 나중에 변조·교체되면 링크 digest 재계산 불일치로 탐지되게 한다. link type·direction·link policy version을 고정하고, 서로 다른 테넌트의 Entry를 잇는 Cross-Tenant Link는 digest 산출 이전 단계에서 차단한다(§5.13 Tenant Binding).

## 2. 기존 구현 대조

- **Ledger Link Digest 부재.** 두 Entry를 잇고 양쪽 digest를 봉인하는 link 구조 → **no hits**. `SecurityAudit`는 previous 1방향 prev_hash 체인(`SecurityAudit.php:27,39-40`)만 있고, Correction/Supersession/Reference 등 **명시적 관계 링크** 개념이 없다.
- `link type`/`direction`/`link policy version`/`source·target entry digest 쌍` → **no hits**. 링크가 가리킬 Correction/Supersession/Reversal target entry 자체가 §3.1 Ledger 부재로 존재하지 않는다.
- Cross-Tenant Link 차단 게이트 → 부재. verify에 tenant 술어가 없어(`SecurityAudit.php:56-68`, GROUND_TRUTH §5 위험 4) 전역 단일 체인이므로 tenant 경계 자체가 링크 판정에 반영되지 않는다.
- 근접 자산: `MediaHost`(`MediaHost.php:93`) 내용주소 digest는 파일↔레코드 참조에 재사용 가능하나(§33 Attachment), Entry↔Entry 관계 링크는 아니다.

## 3. 판정

- Verdict: **ABSENT** (Entry↔Entry 관계 링크·양방향 digest 봉인·Cross-Tenant 차단 전무)
- 선행 의존: §31 Link는 §26 Entry Digest 쌍과 §34 Correction·§35 Supersession target을 전제 — 전부 ABSENT. Ledger/Decision Core(§3.1/§3.2) ABSENT.
- cover: **0** (link digest row 0. prev_hash 1방향 체인은 관계 링크가 아님).

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_ledger_link_digest` — §31 전 필드. source/target entry id+digest·link type(Correction/Supersession/Reversal/Reference/Sequential …)·direction·tenant·link policy version을 canonical 결합해 Digest Envelope(§23·purpose=`LEDGER_LINK`)로 봉인.
- ★핵심 델타: 양쪽 entry digest를 링크 digest에 포함 → target Entry 변조 시 링크 재계산 불일치로 §44 CORRECTION/SUPERSESSION_TARGET_CHANGED 탐지. 현행 prev_hash 1방향 체인(`SecurityAudit.php:27`)은 관계 링크를 표현 못하므로 순신규.
- ★Cross-Tenant Link 차단: link 생성 전 source·target의 tenant 일치를 강제(§5.13) — 현행 verify tenant 술어 부재(`SecurityAudit.php:56-68`, GROUND_TRUTH §5 위험 4)를 링크 계층에서 선차단. Cross-Tenant는 digest 산출 이전 거부(§44 CROSS_TENANT_CHAIN).
- 재사용 substrate(발명 아닌 조립): SHA-256(`SecurityAudit.php:27`·`MediaHost.php:93`)·서버 UTC `created_at`(`Db.php:438`·`SecurityAudit.php:24`)·재계산 시각 저장 패턴(`SecurityAudit.php:31`).
- ★Correction/Supersession/Reversal target 링크(§34/§35)는 target entry digest 봉인으로 "무엇을 정정/대체했는가"를 불변 고정 — target 부재(§3.1 ABSENT) 해소 후 조립.
- 선행 조립: Decision Core → Ledger/Entry(§15/§17) → Entry Digest(§26) → 본 Link Digest + Correction/Supersession Digest(§34/§35). 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_LEDGER_ENTRY_DIGEST]] · [[DSAR_APPROVAL_LEDGER_HASH_CHAIN]] · [[DSAR_APPROVAL_DIGEST_ENVELOPE]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].
