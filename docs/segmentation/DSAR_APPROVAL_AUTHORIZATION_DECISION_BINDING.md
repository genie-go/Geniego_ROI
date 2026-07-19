# DSAR — Authorization Decision Binding (§38)

> EPIC **06-A-03-02-03-04 Part 1** · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세** · 인용원=GROUND_TRUTH([`DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION.md)) 전용.

## 1. 원문 전사 (Canonical Contract)

§38 `APPROVAL_AUTHORIZATION_DECISION_BINDING` 필수 필드 (원문 전사):

- `decision` ↔ `decision command (+digest)`
- `instance` · `slot`
- `approval case (+version)`
- `resource (+version)`
- `action`
- `effective actor`
- `authentication session`
- `definition version` · `policy set version`
- `bound` / `expires`
- `immutable digest`

의미: Decision Binding은 인가 판정(§24 Decision)을 **그 판정이 성립한 구체 맥락**(어떤 Decision Command·instance·slot·approval case version·resource version·action·effective actor·authentication session·definition/policy set version)에 결속한다. §5.11(Context Reuse 제한)의 구현 근거로, 이 결속 덕분에 **다른 Command/Slot/Resource/Version/Action에 판정을 재사용하지 못한다**. §39 Commit Binding이 Commit 직전 이 결속을 재검증한다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **판정↔맥락 결속 구조체는 부재** — GROUND_TRUTH §1 표 **Authorization Decision/Snapshot/Evidence/Digest = ABSENT**. 판정을 `slot`·`resource version`·`approval case version`·`session`에 결속하고 그 밖 재사용을 차단하는 데이터 결합 전무.
- 실존하는 유사 substrate(★결속 아님·부분 신호):
  - **tenant 강제주입**(`index.php:590-593,600`) — 인증키 tenant로 X-Tenant-Id 무조건 덮어쓰기(위조 원천차단)는 tenant 축의 부분 결속이나, resource version·slot·session·definition version 결속은 없음.
  - **authentication session 축**: 세션 기반 admin 게이트(`UserAdmin.php:33-62`)·requireAdminUser(`UserAuth.php:2920`)는 세션→plan 재검증하나 **매요청 재평가**이지 판정을 특정 session에 결속·재사용하는 구조가 아니다.
  - **Maker-Checker**(`Mapping.php:238-292`·`Alerting.php:598-658`)는 승인 case에 정족수/자기승인차단을 적용하나, `approval case (+version)`·`resource (+version)`·`decision command digest`에 판정을 결속하는 binding 레코드는 부재.
- `decision command (+digest)`/`slot`/`approval case (+version)`/`resource (+version)` 결속 → **no hits**. 선행 §3.2 Decision Command/Slot·§3.3 Resource Version 부재로 결속 대상 축 다수 순신규.
- `definition version`/`policy set version` 결속 → **no hits**(**Versioned Policy = ABSENT**).

## 3. 판정

- **Verdict: ABSENT** (판정↔맥락 결속 데이터 전무). tenant 강제주입(`index.php:600`)·세션 재검증(`UserAdmin.php:33-62`)은 **개별 축의 부분 신호일 뿐 통합 binding 아님**.
- **선행 의존: BLOCKED_PREREQUISITE** — 결속 축(decision command·slot·approval case version·resource version·definition/policy set version)이 §3.2/§3.3 선행 부재로 다수 미존재. §3.1 Actor Identity Foundation(직전 블록)의 effective actor·authentication session만 부분 결합 가능.
- **cover: 0** (인가 decision binding 전무). 부분 축(tenant/session)은 흡수 substrate로 KEEP_SEPARATE 아님 — binding 데이터에 이관.

## 4. 확장/구현 방향 (설계)

- **Golden Rule=Extend**: 순신규 `approval_authorization_decision_binding` — §24 Decision을 `decision command (+digest)`·`instance`·`slot`·`approval case (+version)`·`resource (+version)`·`action`·`effective actor`·`authentication session`·`definition version`·`policy set version`에 결속하고 `bound`/`expires`·`immutable digest` 부여. tenant 강제주입(`index.php:600`)·세션 재검증(`UserAdmin.php:33-62`·`UserAuth.php:2920`)의 부분 축을 이 binding으로 통합.
- **재사용 차단(§5.11·§65 Security)**: 결속된 축 중 하나라도 다르면(Resource IDOR·Version Downgrade·Action Substitution·Replay·다른 Slot/Resource/Action 재사용) 판정 재사용 금지 — 현재 매요청 재평가라 재사용 자체는 없으나, 판정 캐싱·재사용 도입 시 이 binding이 IDOR/downgrade 방어선. effective actor는 §5.5(Actor ID 직접신뢰 금지)에 따라 Canonical Principal 사용(하드코딩 user-id authz 부재=긍정, GROUND_TRUTH §2).
- **Digest 앵커**: `immutable digest`는 §37 Digest(앞 블록 Crypto Policy) 재사용. 실 배선(binding 생성·재사용 검증)은 선행 Decision Command/Slot/Resource Version 신설 후 별도 승인세션. Part 1=결속 계약 설계만.

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_AUTHORIZATION_COMMIT_BINDING]] · [[DSAR_APPROVAL_AUTHORIZATION_VALIDITY]] · [[DSAR_APPROVAL_AUTHORIZATION_DIGEST]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
