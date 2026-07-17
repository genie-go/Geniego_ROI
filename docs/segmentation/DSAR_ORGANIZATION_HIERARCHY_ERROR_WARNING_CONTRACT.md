# DSAR — Organization Hierarchy Error·Warning Contract (§60 + §61)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §60(Error Contract) · §61(Warning Contract) · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

### ★🔴 오탐 주의 — **"에러 코드 체계 부재"는 과장이다**

봉투(envelope) **실재 · 실배선 확인**:

| 항목 | 실측 | 판정 |
|---|---|---|
| **에러 봉투** | `AdminGrowth::fail(Response $res, string $detail, string $codeStr = 'ERROR', int $http = 400)`(`AdminGrowth.php:181-184`) → `self::json($res, null, $detail, $http, ['code' => $codeStr, 'detail' => $detail])` — **`code` + `detail` 구조 구현** | ★**`VALIDATED_LEGACY`(공용 추출·확장)** |
| **`meta` 슬롯** | `AdminGrowth::json`(`:164-179`) → `['success','data','message','error','meta']` · `meta` = `request_id`(`bin2hex(random_bytes(8))` `:172`) · `timestamp`(`gmdate('c')` `:173`) · `version`(`self::VERSION` `:174`) | `VALIDATED_LEGACY` |
| **승인 경로 실배선** | `approvalDecide` — `:1322` `fail(..., 'VALIDATION', 422)` · `:1326` `fail(..., 'NOT_FOUND', 404)` · `:1327` `fail(..., 'CONFLICT', 409)` | **REAL — 실배선 확인** |

🔴 **두 번째 에러 봉투 신설 금지.** `code`+`detail`+`meta` 봉투는 이미 존재하고 승인 경로에서 실제로 쓰인다. §60 34종은 **새 봉투가 아니라 기존 봉투의 `code` 어휘 확장**이다. 별도 응답 구조를 만들면 **중복 엔진 = 헌법 위반**.

### ★⚠️ 비대칭 주의 — §60 과 §61 의 작업량이 같지 않다

| 축 | 현행 | 함의 |
|---|---|---|
| **Error(§60)** | `fail` 이 `code`+`detail` 을 **`error` 슬롯에 채운다**(`:183`) | **어휘만 추가**하면 성립 — 가정 성립 |
| **Warning(§61)** | 🔴 **`AdminGrowth::json`(`:164-179`) 응답 본문에 warning 슬롯 자체가 없다.** 키 = `success`·`data`·`message`·`error`·`meta` **5개뿐** | 🔴 **"어휘만 추가" 가정 시 §61 작업량을 과소평가한다.** warning 은 **봉투 구조 변경**(신규 슬롯)이 선결이며, 이는 **기존 응답 계약 변경 = 전 소비자 영향** |

### ★🔴 가시성 선결 — 현 상태로 재사용 불가

`fail`(`:181`)·`json`(`:164`) 모두 **`private static`** → **`AdminGrowth` 외부에서 호출 불가**. 조직 도메인이 이 봉투를 쓰려면:

1. **가시성 승격**(`private` → `public`/`protected`) 또는 **공용 트레이트·헬퍼 클래스로 추출**이 **선결 작업**이다.
2. 🔴 **복사-붙여넣기로 두 번째 `fail` 을 만들면 봉투가 2벌 = 중복.** 추출만이 정본 경로.

### 나머지 실측

| 항목 | 실측 | 판정 |
|---|---|---|
| `ORGANIZATION_*` 에러/경고 코드 | `backend/src` grep **0**(레포 히트는 289차 스펙 문서 자신뿐) | `ABSENT` |
| 봉투 전사 표준화 | ⚠️ `AdminGrowth` 밖의 다른 핸들러가 동일 봉투를 쓰는지 **미확인**(본 조사 범위 밖) — **"전사 표준"으로 단정 금지** | **미확인** |
| degrade 선례 | `PM/Gantt:104-125` — 순환 시 **500이 아니라 부분결과 + 경고**로 degrade | `LEGACY_ADAPTER` — §61 정합 |
| HTTP 코드 관례 | 422(검증 `:1322` · `PM/Dependencies:32-34` `cycle_detected`) · 404(`:1326`) · 409(`:1327`) · 403(위임 `index.php:85-90`·`:92-96`) | `VALIDATED_LEGACY` |
| Manual Review 개념 | 조직 도메인 grep **0** · 인접 승인 = `admin_growth_approval`(status pending/approved/rejected `:1324`·`:1327`) | `LEGACY_ADAPTER` |

## 1-A. 원문 전사 + 판정 — Error Contract **원문 34종** (§60)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | ORGANIZATION_REGISTRY_NOT_FOUND | Registry 부재 · 인접 = `ORG_PRESET` 15단위 열거(`TeamPermissions.php:706-722`) | `NOT_APPLICABLE` |
| 2 | ORGANIZATION_UNIT_NOT_FOUND | Unit 부재 · 봉투 선례 `fail(...,'NOT_FOUND',404)` | `NOT_APPLICABLE` |
| 3 | ORGANIZATION_UNIT_VERSION_NOT_FOUND | 엔티티 version 부재 | `NOT_APPLICABLE` |
| 4 | ORGANIZATION_UNIT_INACTIVE | 부재 · `team.status` 컬럼 존재(`TeamPermissions.php:145-151`) — 팀 축 | `NOT_APPLICABLE` |
| 5 | ORGANIZATION_UNIT_RETIRED | retire 상태 부재 | `NOT_APPLICABLE` |
| 6 | ORGANIZATION_TYPE_NOT_FOUND | Type 부재 · `TEAM_TYPES` 17종(`:44-49`)은 평면 문자열 | `NOT_APPLICABLE` |
| 7 | ORGANIZATION_RELATIONSHIP_TYPE_NOT_FOUND | 관계 타입 부재 · `graph_edge.edge_label`(`Db.php:816-839`)은 마케팅 귀속 | `NOT_APPLICABLE` |
| 8 | ORGANIZATION_HIERARCHY_NOT_FOUND | Hierarchy 부재 | `NOT_APPLICABLE` |
| 9 | ORGANIZATION_HIERARCHY_VERSION_NOT_FOUND | 부재 | `NOT_APPLICABLE` |
| 10 | ORGANIZATION_HIERARCHY_VERSION_INACTIVE | 부재 | `NOT_APPLICABLE` |
| 11 | ORGANIZATION_HIERARCHY_IMMUTABLE | 불변 강제 부재(`menu_defaults` immutable_hash 없음) | `NOT_APPLICABLE` |
| 12 | ORGANIZATION_HIERARCHY_ROOT_MISSING | root 검증 부재(`menu_tree` root = `parent_id IS NULL` 암묵) | `NOT_APPLICABLE` |
| 13 | ORGANIZATION_HIERARCHY_MULTIPLE_ROOTS | 부재 | `NOT_APPLICABLE` |
| 14 | ORGANIZATION_GRAPH_NODE_NOT_FOUND | 조직 노드 부재 · `graph_node` 는 마케팅(`KEEP_SEPARATE_WITH_REASON`) | `NOT_APPLICABLE` |
| 15 | ORGANIZATION_GRAPH_EDGE_NOT_FOUND | 동상 | `NOT_APPLICABLE` |
| 16 | ORGANIZATION_GRAPH_SELF_LOOP | 조직 부재 · 선례 `PM/Dependencies:29-31`·`AdminMenu.php:542` | `NOT_APPLICABLE` |
| 17 | ORGANIZATION_GRAPH_CYCLE | 조직 부재 · ★선례 코드 문자열 실재 = `cycle_detected` 422(`PM/Dependencies:32-34`) | `NOT_APPLICABLE` |
| 18 | ORGANIZATION_GRAPH_ORPHAN_NODE | 부재 | `NOT_APPLICABLE` |
| 19 | ORGANIZATION_GRAPH_UNREACHABLE_NODE | 부재 | `NOT_APPLICABLE` |
| 20 | ORGANIZATION_GRAPH_MAX_DEPTH_EXCEEDED | 부재 · 깊이캡 3종 불일치(10000/100/10) | `NOT_APPLICABLE` |
| 21 | ORGANIZATION_PRIMARY_PARENT_CONFLICT | Primary Parent 부재 | `NOT_APPLICABLE` |
| 22 | ORGANIZATION_TENANT_MISMATCH | 조직 축 부재 · 요청 축 강제는 REAL(`index.php:585`·`:600`) — 🔴 커버 계산 금지 | `NOT_APPLICABLE` |
| 23 | ORGANIZATION_WORKSPACE_MISMATCH | Workspace 부재 | `NOT_APPLICABLE` |
| 24 | ORGANIZATION_LEGAL_ENTITY_MISMATCH | Legal Entity 부재 | `NOT_APPLICABLE` |
| 25 | ORGANIZATION_LEGAL_ENTITY_BINDING_MISSING | 부재 | `NOT_APPLICABLE` |
| 26 | ORGANIZATION_COUNTRY_BINDING_MISSING | ★Country→Region 매핑 코드 **0건** · `Geo`(`Geo.php:23-53`)는 국가→**언어** | `NOT_APPLICABLE` |
| 27 | ORGANIZATION_EFFECTIVE_PERIOD_INVALID | 폐구간 부재(`effective_to` grep 0) → 판정 불가 | `NOT_APPLICABLE` |
| 28 | ORGANIZATION_PATH_RESOLUTION_FAILED | 경로 부재 | `NOT_APPLICABLE` |
| 29 | ORGANIZATION_PATH_INDEX_MISMATCH | Path Index 부재 | `NOT_APPLICABLE` |
| 30 | ORGANIZATION_SNAPSHOT_MISSING | 조직 스냅샷 부재 | `NOT_APPLICABLE` |
| 31 | ORGANIZATION_SNAPSHOT_INVALID | 해시 검증 능력 부재 | `NOT_APPLICABLE` |
| 32 | ORGANIZATION_FUTURE_CHANGE_ACTIVATION_FAILED | Future-dated 부재 | `NOT_APPLICABLE` |
| 33 | ORGANIZATION_RECONCILIATION_FAILED | Reconciliation 부재 · 집행 수단도 없음(`ensureTables` 백필 없음) | `NOT_APPLICABLE` |
| 34 | ORGANIZATION_RUNTIME_BLOCKED | Kill Switch·차단 상태 부재 | `NOT_APPLICABLE` |

**§60 실측 개수: 34 / 34 전사.** 판정 = `NOT_APPLICABLE` 34 / 34(코드 어휘 축). **단 봉투 축 = `VALIDATED_LEGACY`** — `AdminGrowth::fail` 확장.

## 1-B. 원문 전사 + 판정 — Warning Contract **원문 17종** (§61)

🔴 **전건 공통 제약**: `AdminGrowth::json`(`:164-179`) 에 **warning 슬롯이 없다** → 17종 전부 **어휘 이전에 봉투 구조 선결**.

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | ORGANIZATION_SOURCE_WARNING | Source of Truth 개념 부재(§57 #25 = 현행 "불명확") | `NOT_APPLICABLE` |
| 2 | ORGANIZATION_VERSION_WARNING | 엔티티 version 부재 | `NOT_APPLICABLE` |
| 3 | ORGANIZATION_HIERARCHY_WARNING | Hierarchy 부재 | `NOT_APPLICABLE` |
| 4 | ORGANIZATION_GRAPH_WARNING | 조직 그래프 부재 | `NOT_APPLICABLE` |
| 5 | ORGANIZATION_CYCLE_RISK_WARNING | ★"risk"(차단 아닌 경고) 선례 = `PM/Gantt:104-125` 순환 시 **부분결과+경고 degrade** | `NOT_APPLICABLE`(패턴 선례 유효) |
| 6 | ORGANIZATION_ORPHAN_WARNING | 부재 | `NOT_APPLICABLE` |
| 7 | ORGANIZATION_EFFECTIVE_DATE_WARNING | 부재 | `NOT_APPLICABLE` |
| 8 | ORGANIZATION_RETROACTIVE_CHANGE_WARNING | Retroactive 부재 | `NOT_APPLICABLE` |
| 9 | ORGANIZATION_FUTURE_CHANGE_WARNING | Future-dated 부재 | `NOT_APPLICABLE` |
| 10 | ORGANIZATION_LEGAL_ENTITY_WARNING | 부재 | `NOT_APPLICABLE` |
| 11 | ORGANIZATION_MATRIX_WARNING | `matrix_` grep 0 | `NOT_APPLICABLE` |
| 12 | ORGANIZATION_MEMBERSHIP_WARNING | Membership 부재 | `NOT_APPLICABLE` |
| 13 | ORGANIZATION_POSITION_WARNING | `position_unit` grep 0 | `NOT_APPLICABLE` |
| 14 | ORGANIZATION_PATH_WARNING | 경로 부재 | `NOT_APPLICABLE` |
| 15 | ORGANIZATION_SNAPSHOT_WARNING | 조직 스냅샷 부재 | `NOT_APPLICABLE` |
| 16 | ORGANIZATION_RECONCILIATION_WARNING | 부재 | `NOT_APPLICABLE` |
| 17 | ORGANIZATION_MANUAL_REVIEW_REQUIRED | Manual Review 부재 · 인접 = `admin_growth_approval` pending/approved/rejected(`:1321`·`:1327`) — 승인 대기이지 "검토 요청 경고" 아님 | `NOT_APPLICABLE` |

**§61 실측 개수: 17 / 17 전사.** 판정 = `NOT_APPLICABLE` 17 / 17.

**§60 + §61 합계: 51 / 51 전사.**

## 2. 규칙

- 🔴 **"에러 코드 체계 부재"로 인용 금지 — 과장이다.** `AdminGrowth::fail`(`:181-184`)이 `code`+`detail`+`meta` 봉투를 구현하고 `approvalDecide`(`:1322`/`:1326`/`:1327`)에 **실배선**되어 있다. → **`VALIDATED_LEGACY`(공용 추출·확장)** · 🔴 **두 번째 봉투 신설 금지.**
- 🔴 **가시성 승격이 선결.** `fail`(`:181`)·`json`(`:164`) 은 **`private static`** → 현 상태로 조직 도메인이 재사용 불가. **정본 경로 = `public`/`protected` 승격 또는 공용 트레이트·헬퍼로 추출.** 🔴 **복사-붙여넣기 = 봉투 2벌 = 중복.**
- 🔴 **§60 과 §61 의 작업량을 같다고 가정하지 마라(비대칭).**
  - §60 = `error` 슬롯 실재 → **어휘 34종 추가**로 성립.
  - §61 = ★**`json`(`:164-179`) 에 warning 슬롯 자체가 없다**(키 5개: `success`·`data`·`message`·`error`·`meta`) → **봉투 구조 변경이 선결**이며 **기존 응답 계약 변경 = 전 소비자 영향**. "어휘 17종만 추가"로 산정하면 **과소평가**.
  - 후보 경로: `meta` 하위에 `warnings[]` 추가(비파괴 · 기존 5키 불변) vs 최상위 `warnings` 신설(계약 변경). **비파괴 우선 = `meta.warnings[]` 권장** — 단 결정은 구현 승인세션 몫.
- **HTTP 코드는 기존 관례 재사용**: 422(검증·`cycle_detected` `PM/Dependencies:32-34`) · 404 · 409(`:1327`) · 403(권한·`index.php:85-96`). **새 코드 체계 발명 금지.**
- **§61 #5 는 degrade 정책과 짝이다**: `PM/Gantt:104-125` 가 정본 선례 — **순환 시 500이 아니라 부분결과 + 경고**. §59 Runtime Guard 의 "차단"과 §61 의 "경고"는 **상충이 아니라 계층**(쓰기 = 차단 / 읽기 = degrade+경고)이며, 이 분리를 설계에 명시하라.
- ⚠️ **"전사 표준 봉투"로 단정 금지.** `AdminGrowth` 밖 핸들러들의 봉투 일치 여부는 **미확인**(본 조사 범위 밖). 추출 시 **다른 핸들러의 기존 응답 형태를 깨지 않는지 확인이 선결**.
- 🔴 **51종 "있다고 가정"하고 배선 금지.** 전건 `NOT_APPLICABLE` — 조직 도메인 실 코드 0.
- **`ORGANIZATION_*` 접두 유지**(원문 어휘 그대로). #34 `ORGANIZATION_RUNTIME_BLOCKED`·§61 #17 `ORGANIZATION_MANUAL_REVIEW_REQUIRED` 만 서술형 — 원문대로 전사했으며 **정규화하지 마라**.
