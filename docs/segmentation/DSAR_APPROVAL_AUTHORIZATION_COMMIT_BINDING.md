# DSAR — Authorization Commit Binding (§39)

> EPIC **06-A-03-02-03-04 Part 1** · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세** · 인용원=GROUND_TRUTH([`DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION.md)) 전용.

## 1. 원문 전사 (Canonical Contract)

§39 `APPROVAL_AUTHORIZATION_COMMIT_BINDING` (Commit 시 검증) 원문 전사:

Commit 직전 아래 **동일성 재검증**:
- 동일 `Tenant` · `Effective Actor` · `Session`(또는 재인증)
- 동일 `Command Digest` · `Slot` · `Case Version`
- 동일 `Resource` / `Version` · `Action`
- 동일 `Definition Version` · `Policy Set Version`(또는 Revalidation 완료)
- `미만료`
- `Mandatory Obligation 충족` · `Constraint 위반 없음` · `Challenge 완료`
- `Exception/Override 유효` · `Kill Switch 비활성` · `Critical Drift 없음`

필드: `validation result` · `revalidation required/decision` · `obligation/constraint/challenge/exception/override/drift result` · `validated`/`committed` · `immutable digest`.

의미: Commit Binding은 §5.10(Validation↔Commit 분리)의 핵심 — Validation 시 PERMIT였어도 **Commit 직전에 tenant/actor/session/command digest/slot/case version/resource version/action/definition/policy set version이 여전히 동일하고 미만료·obligation 충족·constraint 미위반·challenge 완료·exception/override 유효·kill switch 비활성·critical drift 없음**을 재검증한 뒤에만 실제 부수효과를 확정한다. Validation과 Commit 사이 변경(TOCTOU)을 차단한다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **인가 Commit-time 재검증 binding은 부재** — Validation↔Commit을 분리해 commit 직전 동일성·미만료·obligation/constraint/challenge/drift를 재검증하는 구조체 전무(GROUND_TRUTH §1 **Authorization Decision/Snapshot/Evidence/Digest = ABSENT**).
- 실존하는 유사 substrate(★Maker-Checker=정족수 검증 유사 substrate):
  - **Mapping approve**(`Mapping.php:238-292`) — 자기승인차단·dedup·**정족수 충족 검증**·fail-closed actor. commit 시점 정족수 재확인은 commit binding의 obligation/constraint 축과 유사 substrate이나, `command digest`·`resource version`·`definition version` 동일성 재검증·drift/kill switch 검증은 없음.
  - **Alerting decideAction**(`Alerting.php:598-658`) — 정족수2·fail-closed. 동일하게 authorization decision 결합 부재.
- **부분 재검증 신호**: agency 위임 격리(`index.php:74-104`)는 `agency_client_link.status='approved'`를 **매요청 재검증**(fail-closed)해 commit-time 재확인과 유사하나, 이는 위임 승인상태 확인이지 판정 binding 재검증이 아니다.
- `Command Digest`/`Case Version`/`Resource Version`/`Definition Version`/`Policy Set Version` 동일성 재검증 → **no hits**(선행 §3.2/§3.3 + Versioned Policy 부재).
- `Kill Switch 비활성`/`Critical Drift 없음`/`Challenge 완료`/`Exception·Override 유효` → **no hits**(대응 기능 전부 순신규).

## 3. 판정

- **Verdict: ABSENT** (Commit-time 인가 재검증 binding 전무). **Maker-Checker(`Mapping.php:238-292`·`Alerting.php:598-658`)=PRESENT-substrate**(정족수/자기승인차단 검증)이나 authorization decision 동일성·버전·drift/kill switch 결합 부재 → 유사 substrate.
- **선행 의존: BLOCKED_PREREQUISITE** — 재검증 대상 축(command digest·case version·resource version·definition/policy set version·obligation/constraint/challenge/exception/override/drift/kill switch)이 §3.2/§3.3 선행 및 후속 Part 기능 부재로 다수 미존재.
- **cover: 0** (인가 commit binding 전무). Maker-Checker 정족수 검증은 흡수 substrate(Authority/Dual-Control 일반화 대상)로 이관, commit binding 대체로 계상 안 함.

## 4. 확장/구현 방향 (설계)

- **Golden Rule=Extend**: 순신규 `approval_authorization_commit_binding` — Commit 직전 원문 12축 동일성+미만료+obligation/constraint/challenge/exception/override/drift/kill switch를 재검증하고 `validation result`·`revalidation decision`·각 result·`validated`/`committed`·`immutable digest` 기록. **Maker-Checker 정족수 검증(`Mapping.php:238-292`·`Alerting.php:598-658`)을 이 재검증 파이프라인의 obligation/dual-control 축으로 일반화**(별도 승인엔진 신설 금지).
- **TOCTOU 방어(§5.10·§65 Concurrency)**: Validation Allow를 무조건 Commit 재사용하지 않도록 commit 직전 재검증 필수 — 현재 인가 경로는 매요청 재평가라 명시적 Validation↔Commit 분리 자체가 없음(향후 판정 캐싱 도입 시 필수 방어선). 동일 Slot 동시 Commit·Revalidation↔Original 경합은 §65 Concurrency 테스트 대상.
- **성능 예외 금지(§64)**: 성능 이유로 tenant/resource version/policy version/commit binding 검증 제거 금지. 실 배선(commit 재검증 지점·drift/kill switch 조회)은 선행 Decision/Snapshot/Version·후속 Kill Switch/Drift Foundation 신설 후 별도 승인세션. Part 1=재검증 계약 설계만.

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_AUTHORIZATION_DECISION_BINDING]] · [[DSAR_APPROVAL_AUTHORIZATION_VALIDITY]] · [[DSAR_APPROVAL_AUTHORIZATION_EXPIRATION]] · [[DSAR_APPROVAL_AUTHORIZATION_DIGEST]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
