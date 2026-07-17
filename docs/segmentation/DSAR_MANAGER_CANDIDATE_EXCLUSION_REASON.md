# DSAR — Candidate Exclusion Reason (§52)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §52 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### 🔴 ★축 주의 — **"Candidate 배제" ≠ "승인 시점 검증"**(형태 유사·의미 상이)

현행 `Mapping::approve` 에 **3개의 실 술어**가 있다. 전부 **REAL 이고 실집행된다**. 그러나 이들은 **후보를 배제하지 않는다** — **이미 승인 버튼을 누른 호출자를 사후에 거절**한다.

| 축 | §52 원문 | 현행 `Mapping` |
|---|---|---|
| **시점** | 후보 **집합 생성 시** | 승인 **요청 도착 시** |
| **대상** | 후보 Subject(복수) | 호출자 1인 |
| **결과** | `exclusion_reasons[]` 누적 → 후보 목록에서 제외 | HTTP 403/409 즉시 반환 |
| **선행 조건** | 후보 집합이 존재해야 함 | 없음 |

★**§51 실측: Manager Candidate = `ABSENT`(후보 계산 코드 0).** → **배제할 후보 집합이 존재하지 않는다.** 따라서 §52 23종 전부 **"Candidate Exclusion 으로서는 `ABSENT`"**이며, 아래 3건은 **이식 가능한 인접 술어(`LEGACY_ADAPTER`)**로만 기록한다. 이를 커버로 계산하면 갭이 정의상 소멸한다(규칙 9).

### 실 술어 3건 (전부 `Mapping::approve:238-294` · REAL)

| 술어 | file:line | 동작 |
|---|---|---|
| 신원 미확인 차단 | `Mapping.php:246-250` | `actorId()===null` → **403 fail-closed** (`"approver identity unresolved"`) |
| 자기승인 차단 | `Mapping.php:268-271` | `requested_by === $actor` → **403** (`"self-approval is not allowed (maker-checker)"`) |
| 동일 행위자 재승인 차단 | `Mapping.php:278-283` | `approvals_json[].user === $actor` → **409** (`"already approved by this approver"`) |

**⚠️ 4번째 가드 실재**(`:262-265`) — `status !== 'pending'` → **409**. 이는 **Case 상태 가드**이며 §52 23종 **어느 항목에도 대응하지 않는다**(배제 사유가 아니라 요청 상태). 분모에 넣지 않는다.

### 🔴 ★ⓑ 브리핑 정정 — `:268-271` 은 `SELF` 가 아니라 `SAME_SUBJECT_AS_REQUESTER` 다

ⓑ 는 `Mapping.php:268-271` → **`SELF`** 로 매핑했으나 **실측상 오매핑**이다:
- `:268` 이 비교하는 것은 `requested_by`(제안자) **vs** `$actor`(승인자) — 즉 **"요청자와 같은 Subject"** = `SAME_SUBJECT_AS_REQUESTER`.
- `SELF` 는 **후보 매니저 = 하급자 본인**(자기 자신을 관리) 축이다. 원문 §56:2026 이 이를 **`subordinate subject = manager subject`** 로 별도 정의하고, §56:2031 이 **"Manager Candidate와 Requester가 같고 Self-approval 금지"** 를 **분리 항목**으로 둔다. **§56:2034 원문이 명시: "Self-reporting과 Self-approval은 다른 개념이므로 별도 Error·Audit Event로 관리하라."**
→ **`SELF` 는 대응 코드 0**(하급자 축 자체가 없다). 실 대응은 **3종이 아니라 여전히 3종이되 항목이 다르다**.

### 🔴 ★ⓑ 브리핑 정정 — "현행 4종 부분 대응" → **실측 3종**

ⓑ/PM 이 **4종**이라 했으나 §52 항목에 대응하는 술어는 **3건**(`SAME_SUBJECT_AS_REQUESTER`·`DUPLICATE_CANDIDATE`·`AUTHORIZATION_FAILED`)이다. 4번째로 셌을 가능성이 있는 `:262-265` 상태가드는 **§52 축 밖**이다. **3 + 20 = 23** 으로 분모는 맞으나 **항목명이 다르다**(규칙 2 — 개수 일치가 정합을 보장하지 않는다).

### ⚠️ 관찰(등급 미부여) — **actor 3분기가 dedup·자기승인 차단을 우회시킬 수 있다**

`Mapping::actorId:36-53` = **3분기**:
- `apikey:{id}` (`:41` — `auth_key` 미들웨어 속성)
- `user:{email}` (`:47` — `UserAuth::authedUser` JOIN 도출)
- **`user:#{id}` 폴백** (`:49` — 이메일 공백 시)
- 미확인 → `null`(`:52`) → 403 fail-closed

🔴 **동일 자연인이 API키 경로와 세션 경로로 접근하면 actor 문자열이 다르다**(`apikey:7` vs `user:a@b.com`) → `:279` dedup 과 `:268` 자기승인 차단이 **경로 전환만으로 우회 가능**하다. 이메일이 공백이면 같은 사람이 `user:{email}`·`user:#{id}` 두 문자열을 가질 수도 있다.

**실 경합 경로 미검증** — 동일 테넌트에서 한 사람이 api_key 와 세션을 동시 보유하는 실 구성이 존재하는지 확인하지 못했다. → **등급 미부여** · 아래 §2 에 **라이브 확인 선결**로 등재.

## 1. 원문 전사 + 판정 — **원문 23종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | SELF | 🔴 **대응 코드 0** — `:268-271` 은 요청자 대조이지 하급자 대조가 아니다(§0 정정) · 하급자 축 자체가 부재 | `ABSENT` |
| 2 | SAME_SUBJECT_AS_REQUESTER | `Mapping.php:268-271` **REAL** — `requested_by===$actor` → 403 maker-checker. **단 승인시점 검증**(후보 배제 아님) | `LEGACY_ADAPTER` |
| 3 | TERMINATED | `terminated`·`deleted_at` **전역 0** · 🔴 `is_active` = **계정 상태**(base DDL `Db.php:1106`) — 소비처 전부 인증 게이트(`UserAuth.php:248`,`:805`) | `ABSENT` |
| 4 | INACTIVE | 상동 — 🔴 **§41 지원 상태 8종 중 표현 가능 2종(1/0)** · `NOT NULL DEFAULT 1` → **미지가 자동으로 "가용" = fail-open** | `ABSENT` |
| 5 | SUSPENDED | 🔴 `suspend` grep = **말장난 1건**(`WorkspaceState.php:12` **"belt-and-suspenders"**) · Suspension 개념 **전역 0** · `locked_until` ≠ 고용 정지(`UserAuth.php:3335` = **무차별 대입 스로틀** · 키가 `ident` · 분 단위 자동해제) | `ABSENT` |
| 6 | SECURITY_BLOCKED | 보안 차단 축 0 | `ABSENT` |
| 7 | POSITION_VACANT | `vacan` **grep 0** · 🔴 §76 실재 결함 — `promoteManager:768-776` **강등 경로 0** → `manager_user_id=NULL` 로 바꿔도 전임자 `team_role='manager'` 잔존 → 위임 권한 계속 보유 | `ABSENT` |
| 8 | ASSIGNMENT_EXPIRED | Assignment·유효기간 축 0(`valid_from`·`valid_to` grep 0) | `ABSENT` |
| 9 | RELATIONSHIP_EXPIRED | 관계·effective date 0 | `ABSENT` |
| 10 | WRONG_TENANT | ★**인접 REAL 다수** — `Mapping::tenantId` 가 미들웨어 `auth_tenant`(**위조불가** · `Mapping.php:33` 주석) 사용 · `:252` 조회에 `AND tenant_id=?` · `createTeam:464` **테넌트 소속 검증 422**. **단 후보 배제가 아니라 행 스코프** | `LEGACY_ADAPTER` |
| 11 | WRONG_LEGAL_ENTITY | Legal Entity 0 · `business_unit_id` = **Trustpilot 자격증명**(무관) | `ABSENT` |
| 12 | WRONG_COUNTRY | 🔴 `region` 3축 전부 무관 — 광고 인구통계(`Db.php:681`) · **Amazon Ads 엔드포인트 na·eu·fe**(`Connectors.php:2704-2710`) · **WMS 시·도**(`Wms.php:129`) · `APAC`/`EMEA`/`LATAM` 0 | `ABSENT` |
| 13 | WRONG_ORGANIZATION | `ORGANIZATION_*` **backend 전역 grep 0** | `CONTRACT_ONLY` |
| 14 | WRONG_SCOPE | 인접 = `effectiveScope():258` · 🔴 ⚠️ `ORG_PRESET` **`'재무팀' => 'company'`(`:717`) = 무제한 센티넬**(법인 아님) → 8팀 scope 실효 없음 | `LEGACY_ADAPTER` |
| 15 | WRONG_MANAGER_TYPE | Manager Type(§11 27종) 표현 수단 0 — `team.manager_user_id` = **팀당 1칸**(`TeamPermissions.php:148`) | `ABSENT` |
| 16 | OUTSIDE_EFFECTIVE_PERIOD | 🔴 **as-of 질의 전역 0** · `as_of` 2건은 **응답 타임스탬프**(`PgSettlement.php:279`·`AttributionEngine.php:666`) | `ABSENT` |
| 17 | CONFLICT_OF_INTEREST_REFERENCE | 이해충돌 축 0 · 🔴 `DELEGATION_EXCEEDED`(`TeamPermissions:645`) = **권한 부여 상한**(Manager 대결 아님) | `ABSENT` |
| 18 | CIRCULAR_RELATIONSHIP | 🔴 **규칙 10 적중** — recursive manager query 가 **0개라서 순환도 0**. 순환탐지 자체는 §57 6방식 중 **2 실재**(`PM/Dependencies.php:79-100` DFS+tenant 필터`:91`+**쓰기 전 차단 `:32-34`** · `PM/Gantt.php:104-125` Kahn) **단 태스크 도메인** | `KEEP_SEPARATE_WITH_REASON` |
| 19 | DUPLICATE_CANDIDATE | `Mapping.php:278-283` **REAL** — `approvals_json[].user===$actor` → 409. 🔴 **단 "이미 승인한 사람" dedup 이지 "중복 후보" dedup 이 아니다**(§53 참조) · ⚠️ actor 3분기 우회 관찰(§0) | `LEGACY_ADAPTER` |
| 20 | UNAVAILABLE_REFERENCE | 가용성 축 0(`on_leave`·`out_of_office` 0) | `ABSENT` |
| 21 | AUTHORIZATION_FAILED | `Mapping.php:246-250` **REAL** — 신원 미확인 → **403 fail-closed**(`actorId():52` null). ★**289차 G-01 이 `'unknown'` 폴백을 제거**(종전 익명 승인 2회 = 정족수 충족) | `LEGACY_ADAPTER` |
| 22 | MANUAL_EXCLUSION | 수동 배제 축 0 | `ABSENT` |
| 23 | OTHER | 자유 사유 축 0 | `ABSENT` |

**실측 개수: 23 / 23 전사.** (측정기 분모 23 · 원문 대조 23 · 전사 23 — **3자 일치**)
🔴 **단 ⓑ 항목명 매핑은 불일치** — ⓑ "현행 4종" → **실측 3종** · ⓑ `SELF` → **실측 `SAME_SUBJECT_AS_REQUESTER`**(§0).
원문이 `OTHER` 로 끝나며 **`evidence` 로 끝나지 않는다**(`:1932`) → **규칙 4 반대편향 회피 — `evidence` 추가하지 않음.**

커버리지 = **`VALIDATED_LEGACY` 0** · `ABSENT` 16 · `LEGACY_ADAPTER` 5(2·10·14·19·21) · `CONTRACT_ONLY` 1(13) · `KEEP_SEPARATE_WITH_REASON` 1(18).

## 2. 규칙

- 🔴 **§52 전체 = Candidate Exclusion 으로서 `ABSENT`.** 후보 집합이 없으면 배제도 없다. **`LEGACY_ADAPTER` 5건을 "5/23 충족"으로 집계 금지**(규칙 9 — 미달을 중복이라 부르면 통합 결과가 자동으로 "기능 유지"로 위장된다).
- 🔴 **`SELF` 와 `SAME_SUBJECT_AS_REQUESTER` 를 합치지 마라.** 원문 §56:2034 이 **"Self-reporting과 Self-approval은 다른 개념이므로 별도 Error·Audit Event로 관리하라"** 고 명시한다. `Mapping:268-271` 은 후자 전용이다.
- ★**선결 — 라이브 확인 필수**: `actorId()` 3분기(`:41`/`:47`/`:49`)로 **동일 자연인이 복수 actor 문자열을 갖는 실 구성이 존재하는지** 확인하라. 존재한다면 `DUPLICATE_CANDIDATE`·`SAME_SUBJECT_AS_REQUESTER` 술어를 **후보 엔진에 그대로 이식하는 순간 우회 결함까지 상속**한다. **확인 전 이식 금지.**
  - 교정 방향(설계 제안 · 코드변경 0): 후보 동일성은 **actor 문자열이 아니라 `app_user.id`(canonical subject)** 로 판정. `apikey:{id}` → 소유 user 로 해석하는 계층이 **선결**.
- 🔴 **`is_active` 를 `TERMINATED`/`INACTIVE`/`SUSPENDED` 3종에 매핑 금지.** 계정 상태이며 **1/0 두 값뿐**(§41 8종 중 2종) · `NOT NULL DEFAULT 1` 이라 **`UNKNOWN` 조차 표현 불가 = fail-open**. 3종을 하나의 불리언에 접으면 **미지가 자동으로 "적격"** 이 된다.
  - ✅ 단 **집행은 REAL** — 로그인 차단(`:805`)·재활성화 우회 방어(`:854-856`)·비활성 시 **세션 즉시 폐기**(`:1381`·`EnterpriseAuth.php:400`). **확장 지점은 `is_active` 가 아니라 신규 employment 상태 컬럼.**
  - ★**SCIM `active` 인입 경로는 REAL**(`EnterpriseAuth.php:389-400` PUT/PATCH 양형식 · `:394` `filter_var BOOLEAN`) → **§41 Termination/Suspended 의 유일한 확장 지점**. 🔴 단 **SCIM `manager` PATCH 는 침묵 no-op**(`scimUpdateUser:391-396` 이 `'active'` 경로만 분기 → **200 + 정상 리소스 반환**하며 저장 0 = 가짜 녹색).
- 🔴 **`CIRCULAR_RELATIONSHIP` 에 `pm_task_dependencies` 스키마 복제 금지** — `:90-91` 이 `dep_type` 을 술어에 안 넣어 **전 타입 무차별 순회** → §11 Manager Type 27종별 순환정책 표현 불가. **알고리즘(DFS+`$visited`+tenant 필터 매 홉+쓰기 전 422)만 이식.**
  - 🔴 **`ChannelSync.php:955-962` 를 순환 검출기로 계산 금지** — `$visited` 없이 **깊이만 자른다** → 순환 시 **탐지 없이 조용히 절단**.
  - ★**경로 접두**: `backend/src/Handlers/PM/…` (**`backend/src/PM/` 는 존재하지 않는다**).
- ★**23종을 "있다고 가정"하고 배선 금지**(규칙 12 — 실증 못 하면 미확인).
