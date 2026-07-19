# DSAR — Actor Identity Snapshot (06-A-03-02-03-03 · §42)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 13회차 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> GROUND_TRUTH 인용원: [DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(ⓑ allowlist). 전사 근거: [SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM](SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM.md) §42.

## 1. 원문 전사 (Canonical Contract)

**§42 ACTOR_IDENTITY_SNAPSHOT** — Decision 시점 Actor 신원의 불변 스냅샷. 필수 필드(원문):
- `principal` · `canonical subject` · `original principal` · `effective actor` · `actor type`
- `account status` · `subject status` · `employment status`
- `tenant membership` · `legal entity membership` · `organization membership`
- `role assignments` · `position incumbencies`
- `identity AAL` · `profile version`
- `captured_at` · `immutable digest`

원칙 계약(§5.6·§42·§84): Snapshot은 Decision 시점의 신원 상태를 **불변 고정**하며, **현재 상태로 과거 Snapshot 덮어쓰기 금지**(Snapshot Setter/Update Repository 금지 — §62 Lint). 과거 Decision을 현재 Identity로 재해석 없이 재현.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **불변 Actor Identity Snapshot = 부재.** 현재 승인 시 저장되는 신원 근거는 **email 문자열만** — `Mapping.php:210` approvals_json(승인자 = actor 문자열). GROUND_TRUTH §1: canonical actor 정본 `Mapping::actorId`(`Mapping.php:36-53`)도 `user:{email}`/`apikey:{id}` 단일 문자열이며 `principal`↔`canonical subject`↔`original/effective actor` 축 분리 없음.
- 부재 필드 다수(GROUND_TRUTH §1): `Person↔Account 분리` **ABSENT**(app_user 단일 테이블)·`Employment/Position` **ABSENT**(team_role만·`TeamPermissions.php:120-136`)·`계정 상태` PARTIAL(`is_active=1`만·locked/disabled 세분 없음·`UserAuth.php:248,260`). 따라서 `employment status`·`position incumbencies`·`legal entity membership`·`identity AAL`·`profile version`을 담을 자료 자체가 없음.
- **불변성 결여**: 승인 감사가 저장되는 `audit_log`(`Mapping.php:60`)는 비체인(GROUND_TRUTH §1 마지막 행) — SecurityAudit 해시체인(`SecurityAudit.php:14-33`)과 분리되어, 승인 신원 근거가 **불변 봉인되지 않는다.** Snapshot을 과거값으로 고정·재현하는 계층 → **no hits**.

## 3. 판정 (Verdict)

- Verdict: **ABSENT(불변 Snapshot) · PARTIAL(현행 = email 문자열만)**
- 근거: 현재는 승인자를 `Mapping.php:210` approvals_json에 **email/actor 문자열로만** 기록 → §42의 principal/canonical subject/status/membership/role/position/AAL/profile version 축 전무·`captured_at`/`immutable digest`로 봉인되지 않음. 과거 Decision 재현 시 현재 app_user 상태로 재조회할 수밖에 없어 §5.6 위반 소지.
- cover: **부분(문자열만)**. 재사용 substrate = canonical actor 산출(`Mapping::actorId`)·불변 체인 primitive(`SecurityAudit.php:27`)이나, Snapshot Aggregate 자체는 부재.

## 4. 확장·구현 방향 (설계)

- **순신규** `APPROVAL_ACTOR_IDENTITY_SNAPSHOT` — §42 열거 필드를 Decision 시점에 **캡처하여 불변 저장**. `effective actor`/`original principal`은 §38·§39·§41과 연동(가장/위임 시 이중값). `captured_at`=Trusted Time(UTC·`SecurityAudit.php:24` 패턴)·`immutable digest`=§44 Actor Identity Digest.
- **Golden Rule=Extend**: `principal`/`canonical subject`는 기존 `Mapping::actorId`(`Mapping.php:36-53`)를 canonical 소스로 재사용 — email 문자열은 **Reference로만**(§5.2 Email로 Person 식별 금지). 새 신원 테이블 발명 대신 app_user·team_role(`TeamPermissions.php:120-136`)를 Canonical Adapter로 투영.
- **Mandatory Control(§62·§84)**: Snapshot **Setter/Update Repository 금지**(불변). 현재 상태로 과거 Snapshot 덮어쓰기 차단. 비활성/퇴직 재해석 방지를 위해 §55 Commit-time Revalidation과 쌍으로 생성.
- **선행 필수(BLOCKED)**: 불변 Decision Record(§3.3)·Canonical Subject/Employment/Position(§3.1) 실구현이 선행. `employment status`/`position incumbencies`/`identity AAL`은 선행 Foundation 없이는 채울 수 없음 → 이번 차수=설계.

관련: [[DSAR_APPROVAL_AUTHENTICATION_SNAPSHOT]] · [[DSAR_APPROVAL_ACTOR_IDENTITY_DIGEST]] · [[DSAR_APPROVAL_DELEGATED_ACTOR_IDENTITY]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
