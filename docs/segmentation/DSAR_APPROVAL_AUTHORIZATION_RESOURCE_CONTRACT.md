# DSAR — Authorization Resource Contract (06-A-03-02-03-04 · §16)

> EPIC 06-A-03-02-03-04 Part 1 Authorization Registry Foundation · §16 Resource Contract · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> ★ file:line 인용 = [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]](GROUND_TRUTH) allowlist 등재분만. 지어내기 금지.

## 1. 원문 전사 (Canonical Contract)

§16 Resource Contract — 필수 필드 (원문 전사):
- `resource type` / `resource id` / **`resource version`**
- `tenant` · `legal entity` · `owning org`
- `owner/creator subject`
- `lifecycle/approval state`
- `classification` · `sensitivity`
- `amount` · `currency`
- `customer/vendor/contract/payment/settlement/claim/rebate/project/cost center`
- `source system`
- `resource snapshot/digest`
- **`Resource ID만 저장·Version 생략 금지·Mutable Resource는 Version/Snapshot 결합.`**

의미: Resource Contract는 "무엇에(resource)" 인가 판정하는지를 **버전·소유·상태·금액이 결합된 정규 리소스 참조**로 봉인한다. §5.6(Resource·Action 명시·"접근가능" 모호 금지 — Resource/Version 포함)·§5.11(Resource/Version 하나라도 다르면 Decision 재사용 금지)의 실체다. ★핵심: Resource ID만으로는 부족 — mutable resource는 판정 시점의 version/snapshot을 결합해 Validation↔Commit 사이 리소스 변경(state/amount)을 탐지(§39 Commit Binding·§48 Resource Version Drift)해야 한다.

## 2. 기존 구현 대조

- **★resource version/snapshot 결합 부재(핵심 갭)**:
  - 현재 인가 계층은 리소스를 `WHERE tenant_id=?` 행필터로만 격리 — 리소스 **버전**을 판정에 결합하는 구조 전무. `resource version`·`resource snapshot`·`resource digest` → **no hits**(인가 결합체로서). Validation 시점 리소스와 Commit 시점 리소스의 version 변경 탐지 불가.
  - 결과: 고위험 Approval에서 "검토 시 금액 ₩1M → 승인 직전 ₩5M로 변조"류 TOCTOU를 인가 계층이 잡지 못함(리소스 version binding 없음).
- **data_scope 행필터 = resource scope substrate**:
  - `TeamPermissions.php:236-322`(effectiveScope/scopeSql·DENY_SCOPE fail-closed `:234`) = subject의 resource **접근 범위**(행 필터) substrate. §16 `owning org`·`tenant` scope의 1차 흡수 대상이나, resource type/id/version 단위 계약이 아니라 SQL WHERE 필터.
  - `subjectScope catch→null`(`TeamPermissions.php:211,224`)은 조건부 fail-open — effectiveScope(`TeamPermissions.php:251` DENY_SCOPE)로 부분 보완.
- **tenant / owning org substrate**:
  - `index.php:590-593,600` 인증키 tenant_id 강제주입 = `tenant` binding(리소스 cross-tenant IDOR 방어). §16 `tenant` 필드의 SoT.
  - `index.php:74-104` agency 위임 격리 = client tenant 리소스 접근을 approved 링크로만 허용(`owning org` 경계 부분).
- **amount/currency**:
  - 인가 판정에 `amount`/`currency`를 결합하는 계약 부재 → no hits(인가 결합체로서). 금액 임계 승인(high_value ₩5M)은 도메인 핸들러 게이트로만 존재(289차 13회차 catalog high_value 라우팅갭 수정)하고 인가 Resource Contract로 정형화되지 않음.
- **owner/creator subject · lifecycle/approval state**:
  - 인가 계층에 `owner/creator subject`·`lifecycle/approval state`를 리소스 계약으로 결합 → no hits. 승인 상태는 도메인별(Mapping approve `:238-292`·Alerting decideAction `:598-658`)로 산재하나 canonical resource state 아님.
- **classification/sensitivity/source system/resource snapshot**: 인가 결합 → no hits.

## 3. 판정

- Verdict: **PARTIAL** — data_scope 행필터(`TeamPermissions.php:236-322`)·tenant 강제주입(`index.php:600`)이 resource **scope** substrate로 실재, resource **type/id/version/owner/state/amount 결합 계약**은 부재.
- ★**Resource Version 부재 = 핵심 갭** — 인가 판정이 리소스 버전에 무결합 → §39 Commit Binding·§48 Drift·§5.11 재사용 제한의 실 기반이 없음. Mutable resource TOCTOU를 인가 계층이 방어 불가.
- cover: **substrate ~25%** (tenant/org scope 행필터는 실재·재사용. resource type/id/version/owner/state/amount/snapshot 결합은 0).
- 선행 의존: `resource version`·`resource snapshot`은 §3.3 Governance Foundation(Resource+Version) 신설에 종속 — 상당수 부재(GROUND_TRUTH §0.7). 상위 결합 공회전.

## 4. 확장/구현 방향 (설계)

- Resource Contract 순신규 — `resource type`·`resource id`·**`resource version`**(mutable resource 필수·생략 금지)·`tenant`·`owning org`·`owner/creator subject`·`lifecycle/approval state`·`amount`·`currency`·`resource snapshot/digest`를 판정 입력으로 결합. Decision(§24)/Commit Binding(§39)이 resource version을 검증.
- Golden Rule=Extend:
  - `TeamPermissions.php:236-322` data_scope(effectiveScope/scopeSql·DENY_SCOPE `:234`)를 resource **scope** 계약(owning org/tenant 행필터)의 substrate로 흡수 — 재구현 금지, resource type/version 축을 추가.
  - `index.php:600` tenant 강제주입 = resource `tenant` binding SoT 보존(IDOR 방어 무후퇴).
- ★Resource Version 결합(핵심): §3.3 Resource+Version 신설 후, mutable resource(승인 대상 카탈로그/정산/계약)에 version/snapshot을 결합해 Validation↔Commit version drift(§48)를 탐지. amount/currency를 resource contract에 결합해 high_value 임계(₩5M) 승인을 인가 계층에서 정형화(현행 도메인 핸들러 게이트를 canonical resource amount로 승격).
- fail-open 보완: `subjectScope catch→null`(`TeamPermissions.php:211,224`)의 조건부 fail-open을 resource contract 레벨 Default Deny(§5.2)로 봉인.
- 실 resource version/snapshot 결합·TOCTOU 방어 배선 = §3.3 신설 후 별도 승인세션(이번 Part=계약 명세·코드 0).

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_AUTHORIZATION_SUBJECT_CONTRACT]] · [[DSAR_APPROVAL_AUTHORIZATION_ACTION_CONTRACT]] · [[DSAR_APPROVAL_AUTHORIZATION_CONTEXT]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
