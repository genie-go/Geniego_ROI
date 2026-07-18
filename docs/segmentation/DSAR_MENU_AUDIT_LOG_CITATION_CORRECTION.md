# ⓔ 인용검증 정정 레지스트리 — `menu_audit_log.hash_chain` 오염 (289차·10~11회차)

> **성격**: 289차 EPIC 06-A 5-3-2/5-3-3-1/5-3-3-2/5-3-3-3 설계정본 다수가 `menu_audit_log.hash_chain` 을 *"tamper-evident 정본 · 재사용 강제 · 이식 선례"* 로 인용했으나 **거짓**임이 정의부 Read 로 재증명됐다. 본 문서는 **확정사실 + 정정 규칙 + 잔여 오염 인용 레지스트리**를 영속 기록한다(scratchpad 휘발 방지). **코드 변경 0 · 판정(verdict) 무변 · 근거만 교체.**

---

## 1. ★확정사실 (정의부 Read 로 재증명 — 이대로 인용하라)

| 축 | `menu_audit_log`(`AdminMenu.php`) | `security_audit_log`(`backend/src/SecurityAudit.php`) |
|---|---|---|
| **체인(prev)** | ✅ **재구성 가능** — `lastHash():216` 이 직전 행 `hash_chain` 을 읽어 `:194` `'prev'` 로 투입. **전용 `prev_hash` 컬럼 없이도 정당한 체이닝** | ✅ `:25`→`:38`(없으면 `'GENESIS'` `:39`) · **`prev_hash` 컬럼에도 저장**(`:29-31`,`:51`) |
| **preimage ts 저장** | 🔴 **영구 소실** — `:195` `'ts'=>date('c')` 가 preimage 에 들어가나 INSERT 컬럼목록(`:199-203`)에 **`created_at` 없음** → `:129` **DB DEFAULT `CURRENT_TIMESTAMP`** 가 채움(다른 시계·다른 포맷) → **행에서 preimage 재계산 불가** | ✅ `:24` `$now=gmdate(…)` 를 **INSERT 에 명시 전달**(`:31`) → `created_at`(`:51` VARCHAR(32)·DB DEFAULT 아님)에 저장 → `verify()` 가 `:63` 에서 그대로 재계산 |
| **검증기** | 🔴 **없음** — `hash_equals` 레포 전수 24히트 중 **`AdminMenu` 0건** | ✅ **`verify():56-68`** — `:63` 이 `$r['created_at']` 로 재계산 · `:64` `hash_equals` + `prev_hash` 교차검증 |
| **tenant** | 🔴 DDL(`:123-131`)에 **없음** · `lastHash():216` 에 tenant 술어 0 | ✅ `:27` 해시에 tenant 포함 · `:49` 컬럼 有 (⚠️ 단 `lastHash():38`·`verify():59` 는 tenant 술어 없음 = 전역 단일 체인 — 이식 시 `WHERE tenant_id=?` 필수) |

### ★핵심 명제 (셋)
1. **두 구현을 가르는 것은 오직 하나 — preimage 의 타임스탬프를 저장하는가.** *"prev_hash 컬럼 유무"* 는 **진짜 구분축이 아니다**(menu 는 컬럼 없이도 `lastHash()` 로 체인을 정상 연결).
2. **"체인이 있다"가 "변조를 탐지할 수 있다"를 보증하지 않는다.** `menu_audit_log.hash_chain` 은 검증기가 없고 preimage ts 가 소실되어 **재계산이 불가능** → **검증 불가능한 장식**이다.
3. **`AdminMenu.php:18` 의 `hash_chain (tamper-evident)` 은 주석이다** — 코드가 tamper-evidence 를 **제공하지 않는다**. 이 주석을 근거로 인용하면 규칙#3(주석≠근거) 위반 + 가짜 녹색 상속.

### ★`schema_migrations.checksum` — 층위가 다르다 (③)
문서 다수가 *"검증 `Migrate.php:63-64`"* 로 인용하나 **`Migrate.php:63` 은 `INSERT INTO schema_migrations (filename, checksum)`** 이지 검증이 아니다(`hash_equals` 0히트). **단** `checksum` 컬럼 + preimage(**디스크의 마이그레이션 파일**)가 남아 **재계산은 가능** → `menu_audit_log`(재계산 자체 불가)와 **결함 층위가 다르다 — 균질화 금지**.

---

## 2. 정정 규칙 (R-E11)

`menu_audit_log.hash_chain` 을 인용한 문장을 유형별로:

- **[FALSE — 반드시 정정]** *"tamper-evident / 위변조 탐지 / 재사용 선례(강) / 검증 선례 / immutable_hash 정본 / :18 주석"* → 검증 불가능(verify 0·preimage ts 소실) 명기 + **진짜 검증 선례 = `SecurityAudit.php:verify():56-68`(preimage ts 명시 저장 `:31`/`:63`)** 로 재지목.
- **[PARTIAL — 보강]** *"SHA-256 prev-chain 알고리즘만 이식 · 스키마 복제 금지(tenant 없음)"* → **쓰기 체인은 실재하나 검증측 부재** 명기. 완전한 검증형 선례 = `SecurityAudit`. tenant 반례 지적은 **유지**.
- **[TRUE — 무변]** *"`menu_audit_log` 는 tenant_id 없음 → 복제 금지"* / *"`old_value`/`new_value`/`reason`/`ip`/`ua`/`request_id` 필드 선례"* → 실측 참, **그대로 둔다**.

### ★판정(verdict) 무변 원칙
정정은 **근거만** 바꾼다. 도메인 impl 부재는 그대로이므로 `CONTRACT_ONLY`/`LEGACY_ADAPTER`/`ABSENT` 등 판정은 **유지**한다. 🔴 *"menu_audit_log 인용 = 무조건 격하"* 로 밀면 **분자를 과소하게 만드는 반대 방향 오류**(④ 교훈). 판정을 지탱하는 다리가 **`pm_audit_log`(필드·저장 패턴)** 이면 hash_chain 을 빼도 무너지지 않는다.

### 분자 계상 확인 선행
정정 전 **분자 계상 여부부터** 판별하라 — 측정기는 **`## 1. 원문 전사` 절의 번호행만** 센다. §0 실측표·산문·요약절은 분자 무관(근거 정정은 하되 cover 불변). `node tools/measure_06a_coverage.mjs --block=<532|5331|5332|5333>` 가 정본.

---

## 3. 진행 상태 (11회차 시점)

### ✅ 완료
- **10회차**: 자기오염 16편(`docs/approval/` 14 + `ADR_APPROVAL_CHAIN_CANONICAL_SOURCE` D-18 + `_VERSIONING` D-3) 근거 교체·판정 무변. cover 재판정 **532 51→50 · 5331 18→17 · 5332 9→9**(분모 4개 불변).
- **11회차**: `DSAR_MANAGER_RELATIONSHIP_SNAPSHOT.md`(①-a) 비교표 축을 *"prev_hash 컬럼"*→*"preimage ts 저장"* 으로 정정(§0 표·분자 무관·cover 불변).
- **④ 재량 2건 종결**: `DSAR_ORGANIZATION_HIERARCHY_API_CONTRACT` #45 Audit · `DSAR_ORGANIZATION_HIERARCHY_EVIDENCE` #33 audit reference = **VALIDATED_LEGACY 유지**(격하 안 함). 근거 = 판정을 지탱하는 다리가 `pm_audit_log`(tenant+entity+diff_json) 필드 패턴이라 hash_chain 을 빼도 무너지지 않음. **−2 는 반대 방향 오류**. cover 5331=17 확정.
- **①-b**: `ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md` D-10(`:102-107`) = **이미 정정 완료**(menu 격하 + SecurityAudit 승격) — objective 확인 후 무변.

### 🔴 잔여 (다음 회차 — 유형별)
- **[FALSE 잔여]** 아래 §4 레지스트리의 `tamper-evident`/`위변조 탐지`/`✔tamper-evident`/`재사용 선례(강)`/`:18 주석` 표기 라인.
- **[PARTIAL 잔여]** *"알고리즘만 이식"* 계열 ~40행(대부분 tenant 반례는 이미 정확) — SecurityAudit 검증측 보강.
- 정정 후 `measure_06a_coverage.mjs` 재실행하여 cover 불변(또는 계상행이면 재판정) 확인.

---

## 4. 잔여 오염 인용 레지스트리 (grep `menu_audit_log` · SecurityAudit/검증불가 미포함분)

> 생성: `grep -rn "menu_audit_log\|AdminMenu.php:128" docs/segmentation docs/architecture --include=*.md | grep -iE "이식|선례|immutable" | grep -viE "SecurityAudit|장식|검증 불가|반례로 등재"`
> **유형**: F=FALSE(검증 능력 주장) · P=PARTIAL(알고리즘 이식) · T=TRUE(tenant 반례·필드, 무변).

**F(반드시 정정)** — `DSAR_APPROVAL_RESOURCE_SNAPSHOT:19`(위변조 탐지·★재사용 선례) · `DSAR_APPROVAL_STATUS_HISTORY:19,62,72`(✔tamper-evident) · `DSAR_APPROVAL_DECISION:58`(재사용 가능한 유일 선례) · `DSAR_APPROVAL_RESOURCE_SNAPSHOT:87`(tamper-evident 엔진) · `DSAR_ORGANIZATION_HIERARCHY_AUDIT_EVENT:105`(:18 주석) · `DSAR_ORGANIZATION_GRAPH_VALIDATION:76`(:18) · `DSAR_ORGANIZATION_HIERARCHY_VERSION:15`(:18) · `DSAR_ORGANIZATION_UNIT_VERSION:15`(:18) · `DSAR_ORGANIZATION_SNAPSHOT_TYPE:47`(tamper-evident 선례) · `DSAR_APPROVAL_FOUNDATION_STATIC_LINT:37`(AL-13 선례) · `DSAR_APPROVAL_REQUEST_VERSION:58` · `DSAR_APPROVAL_CASE_VERSION:50`.

**P(보강)** — `DSAR_REPORTING_LINE_*`(EVIDENCE·VALIDATION·VERSION·REGISTRY·DEFINITION·API_CONTRACT·RUNTIME_GUARDS·RECONCILIATION·ERROR_WARNING·FUNCTION_REGRESSION_GATE·INDEX_PERFORMANCE·EXISTING_IMPLEMENTATION·STATIC_LINT) · `DSAR_MANAGER_*`(ELIGIBILITY_PROFILE·EFFECTIVE_PERIOD·ASSIGNMENT·CONFLICT·CONFLICT_RESOLUTION·CHANGE_IMPACT·CIRCULAR_REPORTING_DETECTION·RELATIONSHIP_VERSION·MISSING_MANAGER_POLICY) · `DSAR_ORGANIZATION_*`(HIERARCHY·HIERARCHY_VERSION·UNIT_VERSION·GRAPH_NODE·GRAPH_EDGE·GRAPH_PATH·GRAPH_VALIDATION·SNAPSHOT·SNAPSHOT_TYPE·SCOPE_BINDING·LIFECYCLE_EVENT·OWNER·RETROACTIVE_CHANGE·RUNTIME_GUARDS·HIERARCHY_RECONCILIATION·STATIC_LINT·WORKSPACE_BINDING) · `DSAR_SUPERVISORY_*`(HIERARCHY·HIERARCHY_VERSION·GRAPH_NODE·PATH) · `DSAR_HISTORICAL_MANAGER_RECONSTRUCTION` · `DSAR_ADMINISTRATIVE_MANAGER` · `DSAR_APPROVAL_WORKFLOW_*`(CATALOG·TEMPLATE·DEFINITION·VARIABLE_TYPE·VERSION) · `ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION:90,138`.

**T(무변)** — 위 파일들 중 *"tenant_id 없음 → 복제 금지"* / `old_value`·`reason`·`request_id` 필드 선례 표기 라인. `ADR_*:209,228` 테넌트 격리 반례 목록. `ADR_APPROVAL_CHAIN_CANONICAL_SOURCE:180`·`_VERSIONING:130`(이미 인용 금지 명문화 = 정본).

> ★정본 canon = 위 2개 ADR + `ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP` D-10. 파생 문서는 이 canon 을 따르도록 근거 교체하되 판정 무변.
