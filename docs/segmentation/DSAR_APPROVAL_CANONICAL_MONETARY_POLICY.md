# DSAR — Canonical Monetary Policy (06-A-03-02-03-02 · §18)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> 인용원 = [`DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH allowlist)에 한함.

## 1. 원문 전사 (Canonical Contract)

§18 Monetary Policy(원문 전사):
- amount는 **minor unit**(예: cents) 또는 **normalized decimal** 중 하나로 canonical 표현
- `currency code` 필수 동반 · `currency precision version` · `rounding mode` · `source amount representation` · `monetary policy version`
- 금지: **Binary Float · Locale-formatted amount · Currency 없는 Amount · Scale 임의 제거 · 과거 Amount 재해석 · 반올림 후 원본 유실**

의미: 통화 금액은 승인·정산·결제 의사결정의 핵심으로, 반올림·스케일·통화누락으로 인한 무결성 왜곡이 곧 금전 리스크다. amount는 통화코드·정밀도 버전·반올림모드와 **불가분 결합**되어야 하며, 부동소수점 표현이나 로케일 포맷(`₩5,000,000`·`5.000.000`)을 Digest 입력으로 쓰지 못한다. 과거 금액을 현재 정밀도로 조용히 재해석하는 것을 금지한다(§5.8·§57 덮어쓰기 금지와 동종).

## 2. 기존 구현 대조

- **canonical monetary 정규화 정책은 부재.** minor unit/normalized decimal·currency precision version·rounding mode·monetary policy version 선언 전무(no hits).
- **Decimal Utility 부재**(GROUND_TRUTH §4). 무결성 해시경로(`SecurityAudit.php:27`)에는 금액 필드를 canonical monetary로 처리하는 단계가 없다 — `details` JSON에 섞이면 §17 Number Policy 부재와 동일한 float/scale 비결정성에 노출.
- currency code 동반 강제·과거 amount 재해석 금지·반올림 후 원본 보존 가드 → no hits. (본 DSAR는 무결성 canonical 관점 판정에 한함 — P&L/VAT 등 도메인 금액 계산 로직은 GROUND_TRUTH 인용 대상 아니므로 단정 보류.)

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §17 Number Policy·§13 Canonicalization Policy **ABSENT** + Platform Decimal Utility·Currency Precision Registry **ABSENT** → **BLOCKED_PREREQUISITE**. 결합 대상 amount 필드를 담을 §3.2 Decision Foundation(amount·currency context §25)도 ABSENT.
- cover: **0** (무결성 canonical monetary 표현 전무).

## 4. 확장/구현 방향 (설계)

- 순신규 Monetary Policy 데이터 선언(§18) + §17 Number Policy와 **공유하는 단일 Decimal 유틸**: amount를 `minor_unit` 또는 `normalized_decimal`로 고정하고 `currency_code`·`currency_precision_version`·`rounding_mode`·`monetary_policy_version`을 canonical envelope에 **불가분 결합**(§5.4 문자열 임의연결 금지 — 필드 경계 보존 envelope).
- 금지 집행: Binary Float amount·Locale amount는 §62 Static Lint(Floating Point Monetary Digest 차단), currency 없는 amount·scale 임의제거는 §63 Runtime Guard(`CANONICAL_MONETARY_INVALID`).
- 과거 재해석 금지: `source amount representation`+`monetary policy version`을 Entry에 고정(§5.8) — 정밀도/반올림 정책이 바뀌어도 과거 Entry의 원본 표현·Digest 불변, 신규는 §57 Rotation Foundation 경로.
- Golden Rule=Extend: Decimal 유틸은 §17과 단일 구현 공유(중복 §67 금지). 금액을 무결성 대상에 넣는 첫 소비자는 선행 §3.2 Decision Foundation(§25 Context Digest amount)·§34/§35 Correction/Supersession value digest.

관련: [[DSAR_APPROVAL_CANONICAL_NUMBER_POLICY]] · [[DSAR_APPROVAL_CANONICAL_TIMESTAMP_POLICY]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].
