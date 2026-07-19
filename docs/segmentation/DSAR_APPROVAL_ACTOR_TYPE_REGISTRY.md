# DSAR — Actor Type Registry (06-A-03-02-03-03 · §8)

> EPIC 06-A-03-02-03-03 · 289차 13회차 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> GROUND_TRUTH 인용원: [DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(ⓑ allowlist). 전사 근거: [SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM](SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM.md) §8.
> **★이 도메인은 순수 부재가 아니다 — 재료(apikey:/user: 접두 문자열)가 실재하나 Type 열거·게이트가 없다.**

## 1. 원문 전사 (Canonical Contract)

§8 ACTOR_TYPE enum (원문 전사·17종):

| # | Actor Type | # | Actor Type |
|---|---|---|---|
| 1 | `HUMAN_INTERNAL` | 10 | `SERVICE_ACCOUNT` |
| 2 | `HUMAN_EXTERNAL` | 11 | `SYSTEM_ACTOR` |
| 3 | `EMPLOYEE` | 12 | `ROBOT_ACTOR` |
| 4 | `CONTRACTOR` | 13 | `BATCH_ACTOR` |
| 5 | `PARTNER_USER` | 14 | `INTEGRATION_ACTOR` |
| 6 | `CUSTOMER_USER` | 15 | `WORKFLOW_ENGINE_ACTOR` |
| 7 | `DELEGATED_HUMAN` | 16 | `ERP_ACTOR` |
| 8 | `ADMINISTRATIVE_ACTOR` | 17 | `CUSTOM` |
| 9 | `SUPPORT_ACTOR` | | |

필드(원문 전사): `human` 여부 · `interactive` 여부 · `authentication required` · `approval action allowed` · `allowed action types` · `impersonation allowed` · `delegation allowed` · `MFA requirement` · `maximum assurance level`.

의미: Actor Type Registry는 승인을 수행하는 주체를 **사람/서비스/시스템/로봇/배치/통합/워크플로우/ERP로 분류**하고, 각 Type이 interactive/authentication/approval을 허용하는지, impersonation/delegation이 가능한지, MFA·최대 assurance를 무엇으로 요구하는지를 데이터로 선언한다. §5.9(Service/System Actor는 사람처럼 승인 불가)의 근거 테이블이다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **actor_type 열거 자체가 부재**(`actor_type` grep 0). 현행은 `apikey:` / `user:` **접두 문자열**로만 암묵 구분(`Mapping.php:41,47,49`).
- 실존하는 **의미상 대응 재료**(Type 아님·접두 문자열):
  - **`user:{email}`** — `Mapping.php:36-53`(세션 도출). 원문 **#1 `HUMAN_INTERNAL`**(또는 팀 컨텍스트에 따라 EMPLOYEE)에 의미상 대응. 세션=`UserAuth.php:229-264`.
  - **`apikey:{id}`** — `Mapping.php:36-53`(api_key 도출). 원문 **#10 `SERVICE_ACCOUNT`** 또는 **#14 `INTEGRATION_ACTOR`**에 의미상 대응. api_key=`Db.php:942-955`.
  - **`system`/`admin` 혼재** — `Alerting::actor`(`Alerting.php:33-36`) `'unknown'` 폴백·`AdminGrowth`류 admin 리터럴. 원문 **#8 `ADMINISTRATIVE_ACTOR`**/**#11 `SYSTEM_ACTOR`**에 대응하나 위조가능·미분류.
  - **impersonation actor** — `UserAdmin.php:472-534`(admin→user 대행 세션). 원문 **#9 `SUPPORT_ACTOR`**/**#8 `ADMINISTRATIVE_ACTOR`**에 대응하나 Original Principal 미보존.
  - **team_role** — `TeamPermissions.php:120-136`(owner/manager/member). 조직 역할이나 actor **type**이 아님.
- `human`/`interactive`/`approval action allowed`/`impersonation·delegation allowed`/`MFA requirement`/`maximum assurance level` 필드 → **no hits**.

## 3. 판정 (Verdict)

- Verdict: **PARTIAL (PRESENT-substrate)** — apikey:/user:/system/admin 혼재 접두가 HUMAN_INTERNAL·SERVICE_ACCOUNT·ADMINISTRATIVE/SUPPORT/SYSTEM_ACTOR에 **의미상 대응하나 Type 열거·판정 게이트 부재**.
- 선행 의존: Actor Type의 `approval action allowed`/`allowed action types`는 §3.3 Decision Foundation의 Action Type과 결합 시 완성 → 그 결합부는 **BLOCKED_PREREQUISITE**. 그러나 Type 분류·인증필요·impersonation허용 축은 substrate 위에 **즉시 조립 가능**.
- cover: **부분** — 17종 중 `HUMAN_INTERNAL`(user:)·`SERVICE_ACCOUNT`(apikey:) 2종이 **암묵 재료로 실재**(위 §2 citation), 나머지 15종(EMPLOYEE~ERP_ACTOR) 및 모든 필드는 부재.

## 4. 확장/구현 방향 (설계)

- 순신규 `actor_type` 레지스트리 — 17종 enum + 필드. **현재 apikey:/user:/system/admin 혼재를 Type으로 정규 분류**: `user:`→HUMAN_INTERNAL/EMPLOYEE·`apikey:`→SERVICE_ACCOUNT/INTEGRATION_ACTOR·admin 대행→ADMINISTRATIVE_ACTOR/SUPPORT_ACTOR·자동집행→SYSTEM_ACTOR/BATCH_ACTOR.
- **Golden Rule=Extend**: `Mapping::actorId`(`Mapping.php:36-53`)의 접두 도출을 **actor_type 판정의 입력으로 승격** — 신규 신원도출기 신설 금지. 접두 문자열은 이미 존재하므로 열거형+게이트만 추가.
- **Mandatory Control(§5.9)**: `SERVICE_ACCOUNT`/`SYSTEM_ACTOR`/`ROBOT_ACTOR`/`BATCH_ACTOR`/`INTEGRATION_ACTOR`는 `approval action allowed=false` 기본(명시 System Decision Policy+제한 Action Scope 예외만). `HUMAN_INTERNAL`만 `human=true·interactive=true·MFA requirement` 적용.
- **실위험(현행 실결함)**: actor_type 게이트 부재로 `apikey:{id}`(서비스계정)와 `user:{email}`(사람)이 `Mapping::approve`에서 **동등 정족수 1로 계수**(`Mapping.php:285-287`) → **API 키 2개로 Maker-Checker 우회 가능**. Actor Type Registry의 `approval action allowed`+`maximum assurance level`이 이를 데이터로 차단. **"Service Account 차단"을 Type 게이트 신설 전 표시 금지**(가짜녹색).

관련: [[DSAR_APPROVAL_PRINCIPAL_REGISTRY]] · [[DSAR_APPROVAL_ACTOR_IDENTITY_PROFILE]] · [[DSAR_APPROVAL_ACTOR_IDENTITY_ASSURANCE_DEFINITION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
