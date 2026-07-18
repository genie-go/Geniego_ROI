# DSAR — Organization Workspace Binding (§22)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §22 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| **Workspace** | `tenant_kv (tenant_id, skey, sval, updated_at)` · **PK(tenant_id, skey)** — MySQL `WorkspaceState.php:59` / SQLite `:61`(재확인) | **`KV_ONLY`** |
| ★**`workspace_id`** | **backend/src 전역 grep 0**(재확인) — **워크스페이스 축 자체가 없다. 테넌트당 KV 1벌.** | `ABSENT` |
| 키 화이트리스트 | `KEYS` **12개**(`:28-33`): `calendar_events`·`feedback_entries`·`approval_cfg`·`catalog_price_rules`·`catalog_inventory`·`catalog_schedules`·`catalog_category_map`·`wms_combine`·`wms_bundle`·`wms_toll`·`orderhub_routing_rules`·`reviews_escalated`. 주석 `:27` *"허용 키(시스템 설정 오염 차단)"* | 🔴 **Binding Type 아님** |
| 크기 캡 | `MAX_BYTES = 524288`(`:34`) — 키당 512KB | 관찰 사실 |
| 테넌트 해석 | `tenant(Request)`(`:43-48`) — 미들웨어 `auth_tenant` 우선 · `''` = 미인증 | `VALIDATED_LEGACY`(격리) |
| 데모 | `isDemo`(`:50-53`) `strncmp(strtolower($t),'demo',4)===0` **substring 판정** → write skip | 관찰 사실(술어 SSOT 부재 12벌 중 1) |
| `ORGANIZATION_WORKSPACE_BINDING` | **grep 0** | `ABSENT` |

### ★축 주의 1 — KV 12키를 Workspace Binding Type 8종으로 매핑 금지
`KEYS` 12개는 **오염 차단용 키 화이트리스트**(`:27` 주석이 목적을 명시)이지 워크스페이스 종류가 아니다. `approval_cfg` 가 `APPROVAL_WORKSPACE` 처럼 **보이나** 이는 **승인 설정 JSON 1개 슬롯**이지 조직↔워크스페이스 바인딩이 아니다. 형태 유사를 커버로 계산하면 **역산**이다.

### ★축 주의 2 — 원문 말미 요구는 "충족"이 아니라 "대상 부재"
원문: `Workspace가 다른 Tenant의 Organization에 연결되지 않도록 하라.`
현행은 PK 의 첫 컬럼이 `tenant_id` 이고 조회 술어가 `tenant()` 단일 축이므로 **크로스테넌트 연결이 구조적으로 불가**하다. 그러나 이는 **가드가 있어서가 아니라 workspace 축이 없어서**다. **위반 대상이 없는 상태를 충족으로 기록하면 역산이다.**

### ★축 주의 3 — `primary 여부` 는 현행에서 정의상 무의미
PK(tenant_id, skey) = **테넌트당 KV 정확히 1벌** → 후보가 복수일 수 없어 primary 를 고를 대상이 없다. **"primary 가 항상 참"이 아니라 "선택 문제가 존재하지 않는다".**

## 1. 원문 전사 + 판정 — **원문 23종**(필수 필드 15 + Workspace Binding Type 8)

### 1-1. `ORGANIZATION_WORKSPACE_BINDING` 필수 필드 — **원문 15종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | workspace binding id | 부재 | `NOT_APPLICABLE` |
| 2 | organization unit | 부재 — `org_unit`/`organization_unit` **전역 0** | `NOT_APPLICABLE` |
| 3 | **workspace id** | ★**`workspace_id` backend/src grep 0.** `tenant_kv` 에 워크스페이스 축 없음(PK = tenant_id + skey) | `NOT_APPLICABLE` |
| 4 | tenant id | **실재** — `tenant_kv.tenant_id`(`WorkspaceState.php:59`/`:61`) · 해석 `:43-48` | `LEGACY_ADAPTER`(식별자 재사용) |
| 5 | binding type | 부재 — 🔴 `KEYS` 12키(`:28-33`)는 **키 화이트리스트이지 바인딩 타입 아님** | `NOT_APPLICABLE` |
| 6 | primary 여부 | 부재 — PK 가 테넌트당 1벌을 강제하므로 **선택 문제 자체가 없음** | `NOT_APPLICABLE` |
| 7 | operational scope | 부재 — `data_scope`(`TeamPermissions.php:160-166`)는 **평면 단일 차원 필터**(`:277` `if ($sc['scope_type'] !== $dimension) return null;`)이지 워크스페이스 바인딩 아님 | `NOT_APPLICABLE` |
| 8 | approval workflow scope | 부재 — 인접 = `approval_cfg` KV 키(`:29`) = **설정 JSON 1슬롯** · 워크플로 스코프 아님 | `NOT_APPLICABLE` |
| 9 | role assignment scope | 부재 — `team_role`(owner>manager>member `TeamPermissions.php:17`)은 **테넌트 평면**이며 워크스페이스 축 없음 | `NOT_APPLICABLE` |
| 10 | reporting scope | 부재 | `NOT_APPLICABLE` |
| 11 | inherited 여부 | 부재 — 🔴 `TeamPermissions.php:230` 주석의 *"팀 스코프 상속"* 은 **상속이 아니라 폴백**(`:253-254` user 에 없으면 team **1회** 조회 · 단일 홉 · 비재귀) | `NOT_APPLICABLE` |
| 12 | valid_from | 부재 — `tenant_kv` 는 `updated_at` **덮어쓰기**(현재상태 전용) | `NOT_APPLICABLE` |
| 13 | valid_to | 부재 — **`valid_to`/`effective_to` grep 0** | `NOT_APPLICABLE` |
| 14 | status | 부재 | `NOT_APPLICABLE` |
| 15 | evidence | 부재 | `NOT_APPLICABLE` |

**실측 개수: 15 / 15 전사.**

### 1-2. Workspace Binding Type — **원문 8종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | PRIMARY_WORKSPACE | 부재 — workspace 축 없음 | `NOT_APPLICABLE` |
| 2 | OPERATIONAL_WORKSPACE | 부재 · 인접 = 운영 데이터 KV 키군(`wms_*`·`orderhub_routing_rules`·`reviews_escalated` `:32`, 279차 감사로 서버 영속화) — **키이지 워크스페이스 아님** | `NOT_APPLICABLE` |
| 3 | FINANCE_WORKSPACE | 부재 — 🔴 `ORG_PRESET` **'재무팀'**(`TeamPermissions.php:717`)의 `'scope' => 'company'` 를 재무 경계로 읽지 마라. **`'company'` 는 무제한 센티넬**(`effectiveScope():258` `if ($st==='company') return null; // 전사 = 무제한`) — **경계를 긋는 게 아니라 지운다** | `NOT_APPLICABLE` |
| 4 | APPROVAL_WORKSPACE | 부재 · 인접 = `approval_cfg` KV 키(`:29`) | `LEGACY_ADAPTER`(설정 슬롯) |
| 5 | AUDIT_WORKSPACE | 부재 — 감사 선례는 존재하나(`menu_audit_log.hash_chain` `AdminMenu.php:128` — 🔴 쓰기 체인만 실재 · `verify()` 0 · preimage ts(`:195`) 소실 → tamper-evident 아님 · 검증형 정본 = `SecurityAudit::verify():56-68` · `pm_audit_log`) **워크스페이스 축이 아니다** | `NOT_APPLICABLE` |
| 6 | REPORTING_WORKSPACE | 부재 | `NOT_APPLICABLE` |
| 7 | READ_ONLY_REFERENCE | 부재(워크스페이스) · ★**실 effect 선례 = `agency_client_link`** (`AgencyPortal.php:89` `defaultScope()` `['write'=>false,…]` → `index.php:92-96` write 미허가 시 403). **`data_scope` 에는 없는 능력** | `LEGACY_ADAPTER`(effect 선례) |
| 8 | CUSTOM | 부재 | `NOT_APPLICABLE` |

**실측 개수: 8 / 8 전사.**

**총 실측 개수: 23 / 23 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · 부재 21 · 어댑터 2.

## 2. 규칙

- 🔴 **`tenant_kv` 를 Workspace 로 계산 금지.** PK(tenant_id, skey) 는 **테넌트당 KV 1벌**이며 `workspace_id` 는 **전역 grep 0** 이다. 워크스페이스는 **축이 없는 것**이지 "기본 워크스페이스 1개가 있는 것"이 아니다. 후자로 읽으면 §22 갭이 정의상 소멸한다.
- 🔴 **`KEYS` 12키 ↔ Binding Type 8종 매핑 금지.** 개수도 도메인도 무관하며(12 vs 8) 목적이 **오염 차단**(`:27`)이다.
- 🔴 **`scope='company'` 를 재무/법인 경계로 읽지 마라 — 무제한 센티넬이다**(`TeamPermissions.php:258`). `FINANCE_WORKSPACE` 를 `ORG_PRESET` 재무팀에 매핑하면 **의미가 정반대**가 된다. 상세는 [DSAR_ORGANIZATION_LEGAL_ENTITY_BINDING.md](DSAR_ORGANIZATION_LEGAL_ENTITY_BINDING.md) §0.
- 🔴 **"크로스테넌트 연결 불가 = 원문 말미 요구 충족" 으로 기록 금지.** 가드가 아니라 **축 부재**다.
- **워크스페이스 도입 시 `tenant_kv` 재구현 금지·확장만.** 키 화이트리스트(`:28-33`)·512KB 캡(`:34`)·데모 write skip(`:50-53`)·`tenant()` 술어(`:43-48`)는 **보존 대상**. 별도 KV 스토어 신설 = 두 번째 엔진 = 헌법 위반.
- **워크스페이스 축 추가는 PK 확장 문제다** — `PRIMARY KEY(tenant_id, skey)` → 워크스페이스 축 편입 시 **기존 행의 기본 워크스페이스 귀속 백필이 필요**하나, 🔴 **`ensureTables` 는 테이블 생성만 하고 데이터 변환·백필을 하지 않는다**(§20 제약 2). **집행 수단이 현재 없다** — 백필 경로를 함께 설계하지 않으면 무후퇴 불가.
- **`inherited 여부` 설계 시 `TeamPermissions` 의 폴백을 상속으로 오인 금지**(`:253-254` 단일 홉·비재귀 · **부모 팀 컬럼 자체가 없어 구조적 불가**). 규율 10 적중 사례 — **주석을 근거 삼지 마라, 정의부를 Read 하라.**
- **MySQL/SQLite 두 방언 동시 작성 의무**(`WorkspaceState.php:59` vs `:61` 패턴).
