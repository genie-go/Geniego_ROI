# DSAR — 기능 회귀 게이트 (§61 · §63-38)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> 기존 구현 실측: [DSAR_APPROVAL_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_EXISTING_IMPLEMENTATION.md)

## §0. 본 블록의 회귀 판정 — **코드변경 0 = 회귀 0**

| 축 | 실측 |
|---|---|
| `backend/` 변경 | **0**(`git status --porcelain backend/` = 빈 결과) |
| `frontend/` 변경 | **0** |
| 산출 | **문서만**(DSAR 54 + SPEC 원문 + REQ + ADR + PM) |

> **회귀 0 은 검증된 것이 아니라 구조적으로 성립한다** — 실행 코드를 건드리지 않았다.
> ⚠️ **단 이것을 "안전을 검증했다"로 읽지 말 것.** 아래 §2 의 보존 대상은 **본 블록이 검증한 것이 아니라 통합 세션이 검증해야 할 목록**이다.

## §1. 🔴 보존 목록에 팬텀을 넣지 않는다 (1-8 GOLDEN-GAP-01 계승)

**289차 ① 실측 교훈**: 5-1 회귀게이트가 `tools/guard_headerless_getjson.mjs`(당시 **호출처 0**)를
**"보존 대상(회귀 0 검증 대상)"에 등재**했다 → **실행되지 않는 것은 회귀할 수 없으므로 회귀 0 검증이 공허하게 참**이었다.

> **그러므로 아래 목록의 각 항목에 `is_effective`(실효 여부)를 명시한다.**
> **`is_effective = false` 인 항목을 보존 대상으로 세면 그 게이트는 스스로를 속인다.**

## §2. 보존 대상 (통합 세션이 회귀 0 을 증명해야 하는 것)

| 보존 대상 | `is_effective` | 근거 | 검증 방법 |
|---|---|---|---|
| **`Mapping::approve` maker-checker**(자기승인 403 · dedup 409 · pending 409 · 정족수) | ✅ **true** | Mapping.php:238-294 · **289차 데모 E2E 실증**(propose→self-approve 403 → 타 actor 승인 pending → 재승인 409) | **동일 E2E 재현**(임시 키 2개 · 데모) |
| **`Mapping::actorId` 위조불가 신원** | ✅ **true** | Mapping.php:36-53 · 289차 실증(`requested_by="apikey:16"`) | 헤더 위조 시도 → `apikey:{id}` 불변 확인 |
| **`Mapping::apply` 실행 전 게이트** | ✅ **true** | Mapping.php:309(`status!=='approved'`) | pending 건 apply 시도 → 거부 |
| **`FeedTemplate` 상태전이 강제**(역행 차단 · `must_approve_first` 409) | ✅ **true** | FeedTemplate.php:248-285 | draft→published 직행 시도 → 409 |
| **`AgencyPortal` 매 요청 approved 재검증 fail-closed** | ✅ **true** | AgencyPortal.php:365-384 · :427 | revoke 후 접근 시도 → 차단 |
| **208차 IDOR 차단**(타 테넌트 승인/실행) | ✅ **true** | Alerting.php tenantOf · `WHERE ... AND tenant_id=?` | 타 테넌트 id 로 decide/execute → 404 |
| **`AdminGrowth` ref pending 재사용 dedup** | ✅ **true** | AdminGrowth.php:1292 | 동일 ref 2회 생성 → 1건 |
| **`Catalog` writeback 승인 큐**(`pending_approval`→`queued`) | ✅ **true** | Catalog.php:2258-2277 · :2341-2364 | 큐 전이 동작 |
| `audit_log` 승인 기록 4경로 | ✅ **true** | Alerting.php:597 · :655 · Mapping.php:291 · AdminGrowth.php:1342 | 승인 후 행 증가 |
| **`api_key` RBAC · 미들웨어 tenant 주입** | ✅ **true** | Db.php:942-955 · index.php:591-593 | 키 없이 호출 → 401 |
| ~~`Alerting::executeAction` 승인 게이트~~ | 🔴 **false — 등재 금지** | **게이트 자체가 없음**(:612 status 미판독) | **보존할 것이 없다** |
| ~~`Alerting` 정족수~~ | 🔴 **false — 등재 금지** | `required_approvals` **DB 컬럼 없음** · `:562` 리터럴 · `:572-599` 1회→approved | **보존할 것이 없다** |
| ~~`catalog_writeback_approval` 테이블~~ | 🔴 **false — 등재 금지** | **읽는 코드 0**(고아) | **실행 안 되는 건 회귀 못 함** |
| ~~`TeamPermissions::ACTIONS['approve']`~~ | 🔴 **false — 등재 금지** | **검사 호출부 grep 0** | 동상 |
| ~~팬텀 승인 라우트 6개~~ | 🔴 **false — 등재 금지** | 501 템플릿 폴백(routes.php:1868 · :1943~2059) | 동상 |

> ★**"보존 대상 10 · 등재 금지 5"** — 등재 금지 5건은 **보호할 동작이 없다**.
> **이것을 보존 목록에 넣으면 통합 세션이 "회귀 0"을 공허하게 참으로 만든다.**

## §3. 통합 세션(별도) 회귀 게이트 절차

1. **CHANGE_GATE 5중 게이트** + **인가·승인 도메인이므로 `/security-review` 필수**
2. **Legacy Equivalence 최우선**(1-9) — **기존 정상 승인 업무를 유지**하면서 결함만 제거
3. **회귀 고위험 지점** — 🔴 **수치는 여기서 읽지 말고 재측정**: `node tools/measure_authz_surface.mjs`([SSOT](./AUTHZ_SURFACE_MEASUREMENT_SSOT.md))
   ① 승인 상태 Enum **6벌**(Mapping/Alerting/AdminGrowth/Catalog/AgencyPortal/FeedTemplate) — 통합 시 **각 도메인 현행 동작 보존이 최우선**
   ② `EquivalenceProof` 선행 없이 3계통 통합 금지 — **286차 rank 맵 붕괴**(starter=growth=pro=1) 재현 위험
   ③ 승인자 JSON 키 불일치(`Mapping`=`user` ↔ `Alerting`=`actor`) — 통합 시 **기존 행 파싱 깨짐**
4. **`npm run e2e` · `e2e:render` 배포 전후** + `.githooks/pre-commit`(G2·G9·G10·G11·G12·G13·G14·**G15**) + CI `repo-guards`
5. **php -l** — 로컬 PHP **8.1.34**(운영 동일 버전 · 289차 설치)
6. **배포 = 사용자 명시 승인 후**(운영·데모 동반) · **헤드리스 role 별 실검증**(286차 act-as 하이재킹)

## §4. ★순서 의존성 — 뒤집으면 즉시 사고

| 순서 | 근거 |
|---|---|
| **① `Alerting::executeAction` 상태 게이트** | 현재 `INSERT INTO action_request` **grep 0 → VACUOUS**(도달 불가) |
| **② `action_request` 생산자 배선** | **①보다 먼저 하면 승인 우회가 즉시 활성**(pending/rejected 도 실 광고 API 집행) |

> **289차 G-01 이 같은 논리로 처리됐다** — 운영 `api_key` **0**(노출 0) 시점에 수정했기에 회귀 위험이 0이었다.
> **잠복 결함은 노출되기 전에 고치는 것이 가장 싸다.**

## §5. 규칙

**본 블록 회귀 0**(코드변경 0). 위 게이트는 **통합 세션용 계약**이다.
🔴 **`is_effective = false` 항목을 보존 목록에 등재 금지** — 1-8 GOLDEN-GAP-01 의 재현이다.
🔴 **"회귀 0"을 "안전 검증됨"으로 서술 금지** — 본 블록은 **아무것도 실행하지 않았으므로 아무것도 검증하지 않았다.**
