# DSAR — Authorization Digest (§37)

> EPIC **06-A-03-02-03-04 Part 1** · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세** · 인용원=GROUND_TRUTH([`DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION.md)) 전용. **앞 블록(03-02) Canonical Crypto Policy 재사용.**

## 1. 원문 전사 (Canonical Contract)

§37 `APPROVAL_AUTHORIZATION_DIGEST` (앞 블록 Hash Chain 정책) 입력 필드 (원문 전사):

- `tenant` · `decision`
- `request snapshot digest` · `context snapshot digest`
- `subject snapshot digest` · `resource snapshot digest` · `action snapshot digest` · `environment snapshot digest`
- `definition version` · `policy set version`
- `evaluated policy digest`
- `combining algorithm`
- `effect` · `result`
- `reason digest` · `obligation digest` · `advice digest` · `constraint digest` · `challenge digest` · `exception digest` · `override digest`
- `decided at` · `valid until`
- **`Ledger Entry 결합`**

의미: Authorization Digest는 하나의 인가 판정(§24 Decision)의 전 입력·출력(tenant·subject/resource/action/environment/context/request **snapshot digest**·definition/policy set version·evaluated policy·combining algorithm·effect·result·reason/obligation/advice/constraint/challenge/exception/override digest·유효기간)을 **정규 직렬화 후 앞 블록 03-02의 Canonical Crypto Policy(SHA-256 해시체인)로 요약**해 산출하는 무결성 앵커다. §35 Evidence의 `authorization digest`·§34 Snapshot의 `snapshot digest`가 이를 참조하며, **Ledger Entry에 결합**되어 판정의 사후 변조를 탐지 가능하게 한다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **인가 판정 digest는 부재** — GROUND_TRUTH §1 표 **Authorization Decision/Snapshot/Evidence/Digest = ABSENT**. 판정 입력/출력을 정규 직렬화·해시해 무결성 앵커로 남기는 구조 전무.
- **★앞 블록(03-02) Canonical Crypto Policy 재사용 대상**: 유일한 실 append-only 해시체인·SHA-256 요약·verify는 **앞 블록 03-02 Decision Integrity GROUND_TRUTH의 `SecurityAudit`**(prev_hash 체인·GENESIS·verify — [[DSAR_APPROVAL_DECISION_INTEGRITY_REGISTRY]] 참조)이다. 이는 감사트레일이지 인가 판정 digest가 아니므로, digest 산출 **정책만 재사용**하고 KEEP_SEPARATE.
- 현재 인가 경로(중앙 RBAC `index.php:553-603`·TeamPermissions `TeamPermissions.php:120-322`·Maker-Checker `Mapping.php:238-292`·`Alerting.php:598-658`)는 판정 후 **digest를 남기지 않는다** — 통과/차단 사실만 있고 입력 스냅샷 요약·무결성 앵커 전무.
- `evaluated policy digest`/`combining algorithm` digest → **no hits**(Policy Set/Combining Algorithm 주석만 `UserAuth.php:332-333`·GROUND_TRUTH §1 **Versioned Policy = ABSENT**).
- `Ledger Entry 결합` → **no hits**(판정결과 ledger 결합 부재·audit append만).

## 3. 판정

- **Verdict: ABSENT** (인가 판정 digest·Ledger 결합 전무). 단, **digest 산출 정책의 재사용 substrate는 PRESENT**(앞 블록 03-02 Canonical Crypto Policy — SHA-256 해시체인+verify).
- **선행 의존: BLOCKED_PREREQUISITE** — Digest는 §24 Decision·§34 Snapshot·§35 Evidence의 무결성 앵커로, 참조 대상 자체가 순신규. 앞 블록 03-02 Integrity Foundation(Canonical Serialization·Digest Envelope·Hash Chain)이 실 결합점.
- **cover: 0** (인가 digest 데이터 산출 전무). 앞 블록 SecurityAudit 해시체인은 **정책 재사용원**이지 인가 digest 구현 대체 아님(KEEP_SEPARATE).

## 4. 확장/구현 방향 (설계)

- **Golden Rule=Extend / 중복 금지**: 순신규 `authorization digest`는 **별도 crypto 엔진 신설 없이** 앞 블록 03-02의 Canonical Crypto Policy(정규 직렬화 → SHA-256 → 해시체인 → verify)를 그대로 재사용. `SecurityAudit` 패턴을 CANONICAL로 참조하되 감사트레일과 판정 digest는 KEEP_SEPARATE.
- **입력 정본화**: digest 입력에 `subject/resource/action/environment/context/request snapshot digest`·`definition version`·`policy set version`·`evaluated policy digest`·`combining algorithm`·`effect`·`result`·`valid until`을 **정규 직렬화 순서 고정**으로 포함(§65 Testing: 동일 Context→동일 Digest 결정성). 현행 판정에 digest 입력 대상(snapshot/version) 상당수 순신규.
- **Ledger 결합**: 산출된 digest를 §35 Evidence·§36 Audit Event·Ledger Entry에 앵커로 결합 — 사후 변조/downgrade(§65 Security: Policy/Definition Version Downgrade·Snapshot/Evidence/Digest Mutation) 탐지. 현재 판정 digest 부재로 이 방어선 전무.
- **성능 예외 금지(§64)**: 성능 이유로 digest·commit binding 검증 제거 금지. 실 산출 배선은 선행 Snapshot/Evidence/Decision 신설 후 별도 승인세션. Part 1=digest 입력 계약·crypto policy 재사용 방향 설계만.

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_AUTHORIZATION_EVIDENCE]] · [[DSAR_APPROVAL_AUTHORIZATION_AUDIT_EVENT]] · [[DSAR_APPROVAL_AUTHORIZATION_COMMIT_BINDING]] · [[DSAR_APPROVAL_DECISION_INTEGRITY_REGISTRY]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
