# DSAR — Authorization Evidence (§35)

> EPIC **06-A-03-02-03-04 Part 1** · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세** · 인용원=GROUND_TRUTH([`DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION.md)) 전용.

## 1. 원문 전사 (Canonical Contract)

§35 `APPROVAL_AUTHORIZATION_EVIDENCE` 필수 필드 (원문 전사):

- `decision command / record`
- `actor identity snapshot reference` · `authentication snapshot reference`
- `context snapshot reference` · `resource snapshot reference` · `action snapshot reference`
- `definition version` · `policy set version`
- `evaluated policy references`
- `effect`
- `reason references` · `obligation fulfillment references` · `constraint references`
- `challenge result`
- `exception` · `override`
- `evaluation trace`
- `authorization digest`
- `immutable digest`

의미: Authorization Evidence는 하나의 인가 판정(§24 Decision)이 **왜·무엇을 근거로 그런 Effect가 나왔는지**를 재현 가능하게 결합·불변 저장하는 증거 레코드다. §5.9(Allow도 Evidence — Deny만 기록 금지)의 실체로, actor identity/authentication/context/resource/action **snapshot 참조**(원본이 아닌 시점 스냅샷)·적용 policy 참조·definition/policy set version·reason/obligation/constraint·challenge 결과·evaluation trace·`authorization digest`를 한 봉투에 묶는다. §24 Decision·§34 Decision Snapshot·§37 Digest·§36 Audit Event와 결합되어 Ledger에 append된다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **인가 판정 전용 evidence 레코드(불변·snapshot 참조 결합)는 부재** — GROUND_TRUTH §1 표에서 **Authorization Decision/Snapshot/Evidence/Digest = ABSENT**(`판정결과 불변저장/evidence/ledger 결합 부재(audit append만)`). 판정이 나온 근거를 `evaluated policy references`·`definition/policy set version`·`snapshot reference`로 묶는 구조체 전무.
- 실존하는 유사 substrate(evidence 아님):
  - **감사 append 로그** — Maker-Checker 승인 경로가 판정 사실을 append하나(Mapping approve `Mapping.php:238-292`·Alerting decideAction `Alerting.php:598-658`), 이는 승인 이벤트 기록이지 **`evaluated policy references`·`snapshot reference`·`evaluation trace`·`authorization digest`를 결합한 인가 증거가 아니다.**
  - **중앙 RBAC 게이트**(`index.php:553-603`) — write 메서드 게이트(`index.php:568-578`)·tenant 강제주입(`index.php:600`)이 매요청 판정하나 판정 근거를 evidence로 남기지 않는다(통과/차단만·근거 스냅샷 미보존).
- `actor identity snapshot reference`/`authentication snapshot reference`/`resource snapshot reference`(시점 스냅샷 참조) → **no hits**. 선행 §3.1 Identity/Authentication Snapshot·§3.3 Resource Version 상당수 부재로 참조 대상 자체가 아직 순신규.
- `evaluation trace`(어떤 policy를 어떤 순서로 평가했는지 추적) → **no hits**. 인가규칙이 코드 상수라 trace 생성 지점 부재(GROUND_TRUTH §1 **Versioned Policy = ABSENT**·Policy Set/Combining Algorithm 주석만 `UserAuth.php:332-333`).
- `authorization digest`/`immutable digest`(증거 무결성) → **no hits**(§37 Digest 부재와 연쇄).

## 3. 판정

- **Verdict: ABSENT** (인가 판정 evidence 레코드·snapshot 참조 결합 전무). audit append(`Mapping.php:238-292`·`Alerting.php:598-658`)는 **유사 substrate이나 evidence 대체 아님** — 승인 이벤트 로그이지 판정 근거 봉투가 아니다.
- **선행 의존: BLOCKED_PREREQUISITE** — Evidence는 §24 Decision·§34 Snapshot·§37 Digest와 §3.1 Identity Snapshot·§3.3 Resource Version을 참조로 묶는 상위 결합체. 참조 대상(Decision/Snapshot/Digest) 자체가 순신규이고 선행 Resource Version이 부재해 상위결합 공회전.
- **cover: 0** (인가 evidence 데이터 선언 전무). Maker-Checker append 로그는 KEEP_SEPARATE(승인 이벤트 감사)로 유지하되 evidence 대체로 계상하지 않는다.

## 4. 확장/구현 방향 (설계)

- **Golden Rule=Extend**: 순신규 `approval_authorization_evidence` 레코드 — §24 Decision 1건마다 `evaluated policy references`·`definition version`·`policy set version`·actor identity/authentication/context/resource/action **snapshot reference**·reason/obligation/constraint 참조·challenge 결과·`evaluation trace`·`authorization digest`를 결합해 append. **원본이 아닌 snapshot 참조**로 결합(§5.8 Immutable Snapshot·현재 Role/Resource 재조회 금지).
- **Allow도 Evidence(§5.9)**: 현재 Deny 위주 idiom(DENY_SCOPE `TeamPermissions.php:234`)만 존재 → PERMIT/CONDITIONAL_PERMIT도 어떤 policy/context로 허용됐는지 evidence 필수 기록. 중앙 RBAC 통과 판정(`index.php:568-578`)도 evidence 생성 지점으로 편입 설계.
- **Digest 결합(§37 위임)**: `authorization digest`는 §37 Digest 정책(앞 블록 03-02 Canonical Crypto Policy·[[DSAR_APPROVAL_DECISION_INTEGRITY_REGISTRY]])을 재사용해 산출하고 Ledger Entry에 결합. 현재 판정 digest 전무 → §37에서 정의한 digest를 evidence의 무결성 앵커로 사용.
- **API 제약(§60)**: Evidence는 **수정 API 금지**(§60 Decision/Snapshot/Evidence/Audit 수정 금지)·append-only. 실 배선(evidence 생성 지점·snapshot 참조 조립)은 선행 Decision/Snapshot/Digest 신설 후 별도 승인세션. Part 1=Canonical Contract 설계만.

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_AUTHORIZATION_DIGEST]] · [[DSAR_APPROVAL_AUTHORIZATION_AUDIT_EVENT]] · [[DSAR_APPROVAL_AUTHORIZATION_DECISION_BINDING]] · [[DSAR_APPROVAL_DECISION_INTEGRITY_REGISTRY]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
