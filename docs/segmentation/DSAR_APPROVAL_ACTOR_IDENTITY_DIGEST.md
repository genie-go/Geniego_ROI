# DSAR — Actor Identity Digest (06-A-03-02-03-03 · §44)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 13회차 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> GROUND_TRUTH 인용원: [DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(ⓑ allowlist). 전사 근거: [SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM](SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM.md) §44.

## 1. 원문 전사 (Canonical Contract)

**§44 Actor Identity Digest** — Actor Identity Snapshot(§42)의 독립 Digest. 필수 Canonical 입력(원문):
- `tenant` · `canonical subject` · `actor type`
- `account status` · `subject status` · `employment status`
- `tenant membership` · `legal entity membership` · `organization membership`
- `role refs` · `position refs`
- `profile version` · `AAL` · `captured time`

원칙 계약(§44·§84): Digest는 위 Canonical 입력만 대상으로 하며 **앞 단계 Canonicalization·Hash Policy 사용**(Display Name·현재 직책명 금지·Reference는 Stable Identifier로만). 즉 preimage는 raw concat이 아닌 정규화된 Canonical Payload여야 한다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **Actor Identity Digest = 부재.** 신원 스냅샷(§42) 자체가 ABSENT이므로 그것을 봉인하는 digest 대상이 없음 → **no hits**. 현재 승인 신원 근거는 email 문자열(`Mapping.php:210`)뿐이며 digest로 고정되지 않음.
- **재사용 substrate(digest 산출 primitive)는 실재**: `SecurityAudit.php:14-33`의 append-only sha256 — `:27` prev_hash preimage에 **actor를 포함**(GROUND_TRUTH §1). 재계산 verify `:56-68`·GENESIS `:39`. 이는 CANONICAL 해시 패턴이나, **입력이 raw preimage(actor 문자열 concat)** 이지 §42 신원필드의 Canonical Projection이 아님.
- **Canonicalization 계층 부재(앞 블록 GROUND_TRUTH 재확인)**: 06-A-03-02-03-02 블록에서 이미 판정 — ksort/NFC/RFC8785 canonical serializer 부재. 따라서 SecurityAudit 체인조차 canonical 입력을 쓰지 않으므로, Actor Identity Digest를 그대로 얹으면 동일 결함 상속.

## 3. 판정 (Verdict)

- Verdict: **BLOCKED_PREREQUISITE(digest 대상 Snapshot 부재) · PRESENT-substrate(sha256 primitive 실재)**
- 근거: 소스 Aggregate(§42 Actor Identity Snapshot)가 ABSENT → digest가 봉인할 불변 대상 없음. digest 알고리즘 substrate(`SecurityAudit.php:27` sha256·verify `:56-68`)만 PRESENT하나, Canonical 입력 정규화 계층은 앞 블록에서도 부재로 확정.
- cover: **0**(Actor Identity Digest 엔티티·Canonical Projection 전무). SecurityAudit는 감사 체인 패턴으로 KEEP_SEPARATE — actor preimage를 포함하나 신원필드 digest 대체 아님.

## 4. 확장·구현 방향 (설계)

- **순신규** `APPROVAL_ACTOR_IDENTITY_DIGEST` — 입력=§44 열거 필드(§42 Snapshot의 Canonical Projection). `canonical subject`/`role refs`/`position refs`는 **Stable Identifier로만**(Display Name·직책명 금지·§84). Sequence/Previous Digest 미포함(그 결합은 Ledger Entry Digest·Hash Chain에서).
- **Golden Rule=Extend**: 해시 산출은 `SecurityAudit.php:27` sha256 + 재계산-verify(`:56-68`) 패턴을 일반화 재사용(신규 해시 엔진 난립 금지). **★단, preimage는 raw concat이 아니라 앞 블록(06-A-03-02-03-02) Canonical Crypto Policy** — Digest Envelope·Hash Algorithm Policy·Canonical JSON/정규화 — 를 **선(先)적용**해야 §44 충족. 그렇지 않으면 SecurityAudit의 raw preimage 결함 상속.
- **Mandatory Control**: AAL·employment/position은 선행 Foundation(§3.1·§12) 없이 채울 수 없으므로, 그 전까지 digest 입력이 불완전 → 부분 입력으로 digest 확정 금지(Manual Review/Candidate 보류).
- **선행 필수(BLOCKED)**: §42 Actor Identity Snapshot 실구현 + 앞 블록 Canonical Crypto Policy 확정이 선행 조건. 이번 차수=설계 명세.

관련: [[DSAR_APPROVAL_ACTOR_IDENTITY_SNAPSHOT]] · [[DSAR_APPROVAL_AUTHENTICATION_CONTEXT_DIGEST]] · [[DSAR_APPROVAL_DIGEST_ENVELOPE]] · [[DSAR_APPROVAL_HASH_ALGORITHM_POLICY]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
