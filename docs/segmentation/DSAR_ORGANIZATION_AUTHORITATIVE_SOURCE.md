# DSAR — Organization Authoritative Source (§6)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §6(Authoritative Source 후보) · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `authoritative_source` 컬럼 | `authoritative_source`/`source_priority` **backend/src grep 0** | `NOT_APPLICABLE`(부재 → 신설) |
| 소스 다중화·우선순위 | 개념 전무 — 조직 데이터의 출처가 **1개(`ORG_PRESET` 시딩 또는 수기 CRUD)**뿐이라 우선순위가 성립할 여지 없음 | `NOT_APPLICABLE` |
| **실 유입 경로(유일)** | `seedOrg`(TeamPermissions.php:725-753) — owner/admin 만(:728) · 동명 skip 멱등(:738) · 트랜잭션(:736·:746) · 감사(:747) | **`MANUAL_GOVERNED` 의 사실상 선례** |
| **SSO/SCIM 스택** | ★**`EnterpriseAuth` REAL** — OIDC Authorization Code + id_token RS256/JWKS · SAML ds:Signature(C14N+RSA-SHA256) · 어설션 리플레이 방어(:56) · SCIM 2.0 **Users CRUD** · KEK 회전 · 라우트 routes.php:915-932 + `$register` :2383-2400 **양쪽 배선** | `LEGACY_ADAPTER`(**확장 강제 대상**) |
| **SCIM Groups** | ★**GET 전용**(`scimListGroups` EnterpriseAuth.php:417-423 · routes.php:932 — Groups 는 GET 1개, Users 는 CRUD 5개) → 내부 `team` 을 SCIM Group 으로 **투영해 내보낼 뿐 IdP→내부 인입 경로 없음** | **인입 0** |
| **IdP 그룹 표현** | `sso_group_role_map(tenant_id, group_name, role)`(:70·:72) · 해석 `roleForGroups:78-85` · 어설션 `groups` 수신 :374 → **그룹이 엔티티가 아니라 평문 문자열** · `group_name IN (?)` 단순 룩업(:84) · **부모-자식·중첩그룹·그룹ID 없음** — 수신하되 저장하지 않고 롤 1개로 즉시 소모 | `KV_ONLY` |
| ERP/HRIS 커넥터 | **0** — ★능력축 증명: `ChannelRegistry.php:12`,`:79` `group_type` = sales/marketing/logistics/pg/messaging · `sync_kind` = commerce/ad/messaging/none + analytics(:112)·cs(:116)·esp(:121)·review(:125) → **`erp`·`finance`·`hr` 값이 열거에 없다** · `backend/migrations/` 전량 grep 0 · git log 전 이력 히트는 **289차 스펙 문서 자신뿐** | `NOT_APPLICABLE` |
| SSO/SCIM 회귀 커버리지 | `tools/e2e/` 3종(smoke.mjs·render.mjs·scenarios.mjs) `organization\|hierarchy\|org_unit\|sso\|scim` grep **0** | **테스트 0** |

**★내 초판 브리핑이 뒤집힌 지점** — "SSO/SCIM 은 `ABSENT` 일 것"이라 예측했으나 **`EnterpriseAuth` 는 REAL 스택**이다. `EXTERNAL_DIRECTORY` 를 부재로 밀면 오판이며, 동시에 **"SCIM 이 있으니 조직 출처가 있다"고 계산해도 역산**이다 — Groups 인입이 0이기 때문이다. **이름이 아니라 능력으로 판단하라.**

## 1. 원문 전사 + 판정 — **원문 10종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | HRIS | 부재 — `hris`/`workday`/`payroll` backend/src grep 0 · 커넥터 열거(`group_type`/`sync_kind`)에 **hr 값 없음** = 능력축 부재 | `NOT_APPLICABLE` |
| 2 | ERP | 부재 — 헌법 Vol2(docs/DATA_SOURCE_ARCHITECTURE_CONSTITUTION.md:71)가 ERP 를 12분류로 정의하나 **이름만 있고 커넥터·수집·정규화 어느 층도 없다** · `procurement`/`treasury` grep 0 · ★`po_*` = **Price Optimization**(PriceOpt.php:38-146)이지 Purchase Order 아님 | `NAME_ONLY`(헌법 이름만·실코드 0) |
| 3 | FINANCE_MASTER | 부재 — `sync_kind`/`group_type` 열거에 `finance` 없음 · `cost_center`/`profit_center` grep 0 · `ORG_PRESET` '재무팀'(:717)은 **권한 프리셋이지 마스터 소스 아님** | `NOT_APPLICABLE` |
| 4 | TENANT_ADMIN | ★**실 선례 — `seedOrg`(:725-753)가 정확히 이것**: owner/admin 게이트(`isOwnerAdmin` :728 → 403) · tenant 스코프(:730) · 감사(:747). 단 **`authoritative_source` 로 기록되지 않는다**(출처 컬럼 자체 부재) → 능력은 있고 **선언이 없다** | `PARTIAL` |
| 5 | PLATFORM_ADMIN | 부재(조직 출처) · 인접 `X-Act-As-Tenant` 는 ★**하드코딩 스위치** — `authedTenant`(UserAuth.php:397-400) admin **AND** 헤더값이 **정확히 `'platform_growth'`** 일 때만 · **임의 테넌트 임퍼소네이트 구조적 불가**(286차 사고 수정 결과) → 조직 데이터 기입 경로 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 6 | CRM | 부재 — ★**CRM Account Hierarchy = ABSENT**: `crm_customers` 전 컬럼(CRM.php:48-56/:77-83)에 account/company/parent/hierarchy **전무**. `app_user.company` 는 **문자열 1개** | `NOT_APPLICABLE` |
| 7 | EXTERNAL_DIRECTORY | ★**부분 실재 — 부재로 밀면 오판**: `EnterpriseAuth` OIDC/SAML/SCIM 실배선(routes.php:915-932 + :2383-2400). **단 조직 출처로는 미성립** — SCIM **Groups GET 전용**(:417-423) = 투영만 · IdP 그룹은 **평문 문자열**(`sso_group_role_map` :70) · 중첩그룹·그룹ID·부모자식 **없음** · 수신 즉시 롤 1개로 소모(:374→:78-85) | `PARTIAL`(인증 REAL · **조직 인입 0**) |
| 8 | MANUAL_GOVERNED | ★**실 선례 — `seedOrg` 가 governed manual 그 자체**(권한게이트+멱등+트랜잭션+감사). 단 **거버넌스 메타(출처·승인·근거)를 남기지 않는다** · 이후 팀 CRUD 도 출처 미기록 | `PARTIAL` |
| 9 | MIGRATED | 부재 — ★**제약 2 직격**: `ensureTables` 는 **테이블 생성만 하고 데이터 변환·백필을 하지 않는다** · `backend/migrations/` **172차 정지**(최신 `20260527_172_002_coupon_tables.sql`) → **이행 집행 수단이 현재 없다** · 인접 `schema_migrations.checksum`(Migrate.php:50 `hash('sha256',$sql)`·:63-64·:145) = **immutable_hash 선례** | `NOT_APPLICABLE` |
| 10 | CUSTOM | 부재 — 출처 확장점 없음 · 인접 `TEAM_TYPES` 말미 `'custom'`(TeamPermissions.php:48)은 **팀 유형 자유입력**(주석 :43)이지 출처 아님 | `NOT_APPLICABLE` |

**실측 개수: 10 / 10 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · 부분 3(`TENANT_ADMIN`·`EXTERNAL_DIRECTORY`·`MANUAL_GOVERNED`) · 도메인 상이 1 · 이름만 1 · 부재 5.

## 2. 규칙

- 🔴 **IdP 커넥터 신설 = 두 번째 엔진 = 헌법 위반.** OIDC/SAML/SCIM 은 `EnterpriseAuth` 가 **이미 REAL** 이다(리플레이 방어 :56 · JWKS · C14N 서명검증 · KEK 회전). **`EnterpriseAuth` 확장 강제** — 새 클래스 금지.
- 🔴 **"SCIM 이 있으니 EXTERNAL_DIRECTORY 커버" = 역산.** 능력축으로 보면 **Groups 는 GET 전용**(:417-423 · routes.php:932)이라 **IdP→내부 조직 인입 경로가 0**이다. 조직 출처가 되려면 **Groups POST/PUT/PATCH/DELETE 신설 + 그룹 엔티티화**가 필요하며, 이는 `EnterpriseAuth` **확장**으로만 한다.
- 🔴 **`sso_group_role_map` 을 조직 계층으로 계산 금지.** 그룹이 **엔티티가 아니라 평문 문자열**이고(`group_name` :70), `IN (?)` 단순 룩업(:84) 후 **롤 1개로 즉시 소모**된다. 중첩그룹·그룹ID·부모자식이 **없다** → 계층 정보는 수신 단계에서 이미 소실된다.
- 🔴 **ERP/HRIS 를 "헌법에 있으니 존재"로 계산 금지.** 헌법 Vol2:71 은 **이름만** 정의한다. 능력축 증명 = `group_type`(ChannelRegistry.php:12·:79)·`sync_kind` 열거에 **`erp`·`finance`·`hr` 값이 없다** · migrations 전량 grep 0. **이름 ≠ 능력**(규율 8).
- 🔴 **주석·헌법·인계서를 근거로 삼지 마라 — 정의부를 Read 하라.** ERP 부재는 헌법 문언이 아니라 **`ChannelRegistry` 열거 정의부**가 증명한다.
- `authoritative_source` 신설 시 **`seedOrg` 경로에 `MANUAL_GOVERNED`(또는 `TENANT_ADMIN`)를 기입**하라 — 현행 유일 유입 경로이며, 출처 미기록 상태로 두면 신규 소스 추가 시 **선행 데이터가 출처 불명**이 된다.
- 출처 우선순위 도입 시 **`MIGRATED` 백필이 불가능함을 전제**하라(제약 2). 소급 출처 부여는 **기본값 선언**으로 해결하고, 데이터 변환에 의존하는 설계를 하지 마라.
- ⚠️ **회귀 커버리지 0** — `tools/e2e/` 에 `sso|scim|org` 시나리오가 **없다**(grep 0). SCIM 확장 시 **회귀 테스트 동반이 완료 조건**(헌법 Vol2 §14).
