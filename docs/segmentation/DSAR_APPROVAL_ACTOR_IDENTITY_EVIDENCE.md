# DSAR — Actor Identity Evidence (06-A-03-02-03-03 · §46)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 13회차 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> GROUND_TRUTH 인용원: [DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(ⓑ allowlist). 전사 근거: [SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM](SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM.md) §46.

## 1. 원문 전사 (Canonical Contract)

**§46 Identity Evidence** — 승인 Decision을 수행한 Actor가 "그 시점에 실제 누구였는가"를 사후 반박불가로 재현하는 신원 증거 레코드. 필수 참조(원문 전사):
- `principal registry ref` · `canonical subject binding ref` · `actor identity profile ref`
- `employment ref` · `role ref` · `position ref`
- `tenant membership ref` · `legal entity membership ref` · `organization membership ref`
- `delegation ref` · `impersonation ref`
- `actor identity snapshot`(§42) · `actor identity digest`(§44)
- `immutable digest`

의미: Identity Evidence는 §42 Actor Identity Snapshot(그 시점 상태 포착)과 §44 Actor Identity Digest(앞 단계 Canonical Crypto Policy로 산출한 결정론적 해시)를 묶어, Decision 시점의 Principal↔Canonical Subject↔Employment/Role/Position/Membership↔Delegation/Impersonation 결선을 **불변 증거로 고정**한다. 핵심 계약: 증거는 **현재 상태 재조회가 아니라 포착 시점의 참조·스냅샷·digest**여야 하며(§5.6 Immutable Snapshot), 저장 substrate는 변조탐지 가능한 불변체인이어야 한다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **신원 증거 레코드(참조·스냅샷·digest 결선)는 부재** — `principal registry ref`/`canonical subject binding ref`/`actor identity profile ref`/`employment·role·position ref`/`immutable digest`를 하나의 증거체로 묶는 구조 전무. 선행 §3.1 Canonical Identity(Person↔Account 분리 **ABSENT** — app_user 단일 테이블, `UserAuth.php:229-264`)·Employment/Position(**ABSENT** — team_role만, `TeamPermissions.php:120-136`)이 없어 참조할 대상 자체가 미형성.
- **실존하는 재사용 substrate**:
  - **Canonical actor 정본** — `Mapping.php:36-53` `actorId()`(api_key→`apikey:{id}`·세션→`user:{email}`·미확인 null). 증거의 actor 축 재료이나 **문자열 1개**이지 profile/subject/employment 참조 결선이 아님.
  - **불변 감사체인** — `SecurityAudit.php:14-33`(append-only sha256·`:27` prev_hash·preimage에 actor 포함). **Evidence 저장 substrate의 유일한 실 불변체인**이자 §44 digest·§46 immutable digest의 CANONICAL 패턴. 단 승인경로에는 미사용(`Mapping.php:29` 표에서 "승인경로 미사용").
  - maker-checker 승인 substrate — `Mapping.php:186-190,210,246-250,268,279,287`(propose→requested_by·자기승인차단 `:268`·정족수 2 `:287`)·저장 `Db.php:623-634`(mapping_change_request). 승인자 식별은 있으나 신원 증거 결선 아님.
- **★현재 승인 감사=비체인 audit_log 문자열** — 승인 감사가 SecurityAudit 해시체인이 아니라 **비체인 `audit_log`**(`Mapping.php:60`·`Alerting.php:28`)에 문자열로만 기록. 즉 승인 identity evidence가 변조탐지 불가한 평면 로그에 저장 → **§46이 요구하는 immutable digest 없음**.
- Snapshot/Profile/Digest 결선(`actor identity snapshot`·`actor identity digest`) → **no hits**. `Decisioning.php:12,36`은 ad-insights ingest이지 decision evidence 아님(장식 오인 금지).

## 3. 판정 (Verdict)

- Verdict: **ABSENT(신원 증거 결선체) · PARTIAL-substrate(불변체인·actor 재료 실재)**. 태스크 규율상 **Evidence Verdict = ABSENT/PARTIAL**: 승인 identity evidence는 비체인 audit_log 문자열(`Mapping.php:60`·`Alerting.php:28`)일 뿐, §42 snapshot·§44 digest·불변 저장이 없다.
- 선행 의존: §46은 §42 Snapshot·§44 Digest·§13 Principal Registry·§14 Canonical Subject Binding·§15 Identity Profile을 참조 — 전부 미형성. 승인 결합부는 **BLOCKED_PREREQUISITE**(§3.3 Decision Foundation·§3.4 Assignment/Authority/Delegation 부재로 증거를 결합할 불변 Decision Record 대상 없음).
- cover: **0**(신원 증거 결선 전무). 단 저장 substrate=`SecurityAudit`(`SecurityAudit.php:14-33`)와 actor 정본=`Mapping::actorId`(`Mapping.php:36-53`)가 실재하므로 실 엔진은 "발명 아닌 조립".

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_actor_identity_evidence` — Decision commit 트랜잭션 내에서 §42 snapshot + §44 digest + principal/subject/profile/employment/role/position/membership/delegation/impersonation ref를 **한 증거체로 원자적 append**. 비동기 생성 금지(§71 Snapshot 비동기 금지).
- **Golden Rule=Extend**: 저장 substrate는 순신규 발명 금지 — `SecurityAudit`(`SecurityAudit.php:14-33`·`:27` prev_hash)의 append-only sha256 체인을 **CANONICAL 불변 저장으로 재사용**하되, 승인 identity evidence를 **비체인 `audit_log`(`Mapping.php:60`·`Alerting.php:28`)에서 불변체인으로 승격**. 이것이 §46의 immutable digest 요건을 실집행한다.
- **actor 축**: `Mapping::actorId`(`Mapping.php:36-53`)를 canonical actor 정본으로 참조하되, 증거는 문자열 `user:{email}`이 아니라 **canonical subject binding ref로 확장**(§5.2 Email만으로 Person 식별 금지 — 선행 §14 신설 후). 현재 Person↔Account 미분리(app_user 단일)·Employment/Position 부재는 선행조건으로 표기.
- **impersonation 증거**: `UserAdmin.php:472-534`의 member impersonation은 **Original Principal 미보존**(`Mapping.php`/GT 표 `:33`) → §46 evidence는 impersonation ref로 Original Principal+Effective Actor 이중보존을 강제(§5.8 은닉 금지). 실 구현 = 별도 승인 세션. 본 문서 코드 변경 0.

관련: [[DSAR_APPROVAL_AUTHENTICATION_EVIDENCE]] · [[DSAR_APPROVAL_IDENTITY_CONFLICT]] · [[DSAR_APPROVAL_IDENTITY_DRIFT]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
