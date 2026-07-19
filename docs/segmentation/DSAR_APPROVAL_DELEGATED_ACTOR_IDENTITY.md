# DSAR — Delegated Actor Identity (06-A-03-02-03-03 · §38)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 13회차 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> GROUND_TRUTH 인용원: [DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(ⓑ allowlist). 전사 근거: [SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM](SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM.md) §38.

## 1. 원문 전사 (Canonical Contract)

**§38 Delegated Actor Identity** — Delegation을 통해 승인을 수행한 Actor의 신원을 원(原)위임자와 분리·이중보존한다. 필수 필드(원문):
- `original assignee`(원래 배정된 승인 주체) · `delegate actor`(실제 수행 위임 Actor)
- `delegation definition` · `delegation version` · `delegation chain` · `delegation scope` · `delegation period`
- `authority inherited`(위임으로 상속된 권한) · `authentication principal`(위임 Actor의 인증 주체)
- `effective actor` · `original actor` · `decision time`

원칙 계약(§5.1·§5.8·§62): Delegation 발생 시 **Original Assignee와 Effective(Delegate) Actor를 모두 보존**하며, **Original Assignee가 직접 승인한 것처럼 기록 금지.** Effective Actor 없는 Delegation은 Static Lint 차단(§62). Delegate 은닉 금지(§84).

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **Delegation 도메인 = 완전 부재.** GROUND_TRUTH §1 표: `Assignment/Authority/Delegation` 판정 **ABSENT** — 전용 클래스/테이블 0. 유일 유사어인 `onsite_assignment`은 **A/B 테스트**(`Onsite.php:86`)이며 승인 위임과 무관. "delegation"은 메뉴키·주석뿐(GROUND_TRUTH §1).
- 따라서 `original assignee`·`delegate actor`·`delegation chain/scope/period`·`authority inherited`를 데이터로 보존하는 구조체 → **no hits**.
- **재사용 substrate(Actor 재료)만 실재**: canonical actor 정본 `Mapping::actorId`(`Mapping.php:36-53`)는 단일 문자열(`user:{email}`/`apikey:{id}`)만 산출 — Original↔Effective 이중 축 없음. 승인 저장 `mapping_change_request`(`Db.php:623-634`)의 `requested_by`/approvals_json(`Mapping.php:210`)도 단일 actor 문자열만 기록. **위임 여부·원위임자 컬럼 부재.**
- 인접 개념 `X-Act-As-Tenant`(`UserAuth.php:398`, admin+`platform_growth` **단일값**)는 **effective tenant만 치환**하고 actor는 admin으로 유지 — 이는 tenant scoping이지 approval delegation이 아니며, 그 Original/Effective조차 반환값에 미보존(GROUND_TRUTH §1).

## 3. 판정 (Verdict)

- Verdict: **ABSENT(도메인 자체) · BLOCKED_PREREQUISITE(승인 결합부)**
- 선행 의존: §3.4 Assignment·Authority·Delegation Foundation **실코드 부재**(GROUND_TRUTH §0.5). Delegated Actor Identity는 (a) Delegation Resolution/Chain(§3.4)과 (b) 결합할 불변 Decision Record(§3.3)를 **모두** 전제하는데 양자 모두 부재 → Delegate가 승인할 대상도, 위임관계를 저장할 그릇도 없음.
- cover: **0**. `onsite_assignment`(A/B)·`X-Act-As-Tenant`(tenant 치환)는 **장식 오인 금지** — delegation 근거로 계상하지 말 것. Original Assignee를 직접승인으로 기록하는 실코드조차 없으므로 위반 대상 자체가 부재.

## 4. 확장·구현 방향 (설계)

- **순신규** `APPROVAL_DELEGATED_ACTOR_IDENTITY` — `original assignee`·`delegate actor`·`effective actor`·`original actor`·`authority inherited`·`delegation definition/version/chain/scope/period`·`authentication principal`·`decision time`를 데이터로 보존. Original Assignee와 Delegate를 **동시 필드로** 저장(하나로 병합 금지).
- **Golden Rule=Extend**: delegate의 `authentication principal`은 기존 canonical actor `Mapping::actorId`(`Mapping.php:36-53`)를 재사용 — 새 actor 소스 발명 금지. delegate 신원 자체는 §42 Actor Identity Snapshot으로 고정.
- **선행 필수(BLOCKED)**: Delegation Resolution/Chain(§3.4)과 불변 Decision Record(§3.3) 실구현이 선행 조건. 그 전까지 본 엔티티는 결합 대상 없이 공회전 — 실구현은 별도 승인세션.
- **Mandatory Control(§62 Lint·§84)**: Effective Actor 없는 Delegation 저장 차단·Original Assignee 직접승인 기록 금지·Delegate 은닉 금지. `delegation chain`은 §41 On-behalf-of Chain과 Circular 차단 규칙을 공유.

관련: [[DSAR_APPROVAL_ON_BEHALF_OF_CHAIN]] · [[DSAR_APPROVAL_ACTOR_IDENTITY_SNAPSHOT]] · [[DSAR_APPROVAL_IMPERSONATION_SESSION_GOVERNANCE]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
