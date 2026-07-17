# ADR — Approval Chain Compilation · Resolution · Override

> EPIC 06-A Part 4-5-3-1-5-3-3-3 · 원문 §30~§45 · §55~§61 · §64~§69
> 상위 결정: [`ADR_APPROVAL_CHAIN_CANONICAL_SOURCE.md`](ADR_APPROVAL_CHAIN_CANONICAL_SOURCE.md) · [`ADR_APPROVAL_ROUTE_DAG.md`](ADR_APPROVAL_ROUTE_DAG.md)
> 전사 정본: `docs/approval/APPROVAL_CHAIN_COMPILATION.md`(77) · `_APPLICABILITY_AND_SELECTION.md`(211) · `_OVERRIDE_AND_FALLBACK.md`(146+특례) · `_SECURITY_AND_GUARDS.md`(266) · `_API.md`(158) · `_TEST_PLAN.md`(80)
> 상태: **결정** · 289차(10회차) · **코드 변경 0**
> 경로: §71 은 `docs/adr/` 을 지정했으나 `docs/architecture/`(ADR 정본 83편)로 통합 — 근거는 §71 자신.

## Context

**Chain 을 고르고(§30~§37) · 겹치고(§42~§43) · 컴파일하고(§38~§39) · 못 고르면 무엇을 하는가(§44~§45).** 이 축에서 유일한 능력 기반 반전이 나왔다(D-1).

---

## D-1. ★**능력 기반 반전 — 금액 승인 게이트가 실재한다** (이름 grep 0 이었다)

`amount_threshold`·`approval_threshold`·`approval_chain` **전부 grep 0**이었으나:

```
Catalog.php:1016   private const HIGH_VALUE_KRW = 5000000.0;
Catalog.php:1103   } elseif ($price >= self::HIGH_VALUE_KRW) {
Catalog.php:1104       $requiresApproval = true; $approvalType = $approvalType ?: 'high_value';
```

**금액이 승인 필요 여부를 결정하고 `approval_type` 판별자까지 산출한다** — §30 Applicability·§14 Amount-based Route 의 실 선례다. 소비처도 실재한다(`frontend/src/pages/Writeback.jsx:170`,`:261`).

**★그러나 "Route" 는 없다 — 이것이 이 발견의 핵심이자 한계다**:
- `approval_type`(`'unregister'`|`'high_value'`)은 **승인자·경로를 하나도 선택하지 않는다** — `approvalCreate:2280` 에서 `$operation` 문자열 계산에만 쓰이고 소멸.
- **`approveQueue:2341-2360` 은 `approval_type` 으로 필터하지 않는다** → **`high_value` 건과 `unregister` 건이 동일 경로·동일 권한으로 승인된다.**
- `HIGH_VALUE_KRW` 는 **PHP 상수** — 테넌트별 설정 불가 · 버전 없음 · effective dating 없음(§46 직결).
- **`approveQueue:2343` 은 행위자를 읽지도 않는다**(`requirePro` 플랜 게이트뿐).

∴ **§30/§32/§33 구축 시 이 임계를 `APPROVAL_CHAIN_APPLICABILITY` 의 Amount Band 로 승격하고 상수를 은퇴시켜라. 신규 임계 상수 추가 금지.**

⚠️**판정 비대칭에 주의**: 같은 코드가 §30(Applicability)에선 `PARTIAL`, §32(Specificity)에선 `ABSENT` 다. **금액→Boolean 판정 능력과 특정도 채점 능력은 다르고, 채점 코드는 0이다.**

## D-2. 🔴 **정책 게이트가 이미 우회 가능하다** — §65 착수 전 선결

- `evaluatePolicy`(`:1084-1128`)가 산출한 `approval_type` 을 **`logJob:2247` 이 저장하지 않는다**(`:2252` 응답에만 실림) → **경로 판별자가 버려진다.**
- 🔴 **`approvalCreate:2259` 는 `evaluatePolicy` 를 호출조차 하지 않고** 클라이언트가 보낸 `type` 을 그대로 받아 `pending_approval` 로 적재한다 → **정책 게이트 우회.**

∴ Canonical Chain 이 서기 전이라도 **이것은 실 결함**이다. 다만 **별도 승인세션 대상**(본 세션 코드 변경 0). 등급 미부여 — 라우트 노출·프론트 호출 패턴 미확인.

## D-3. 🔴 **`approveQueue:2350` — ids 미지정 시 테넌트 전체 일괄 승인**

**기본 동작이 "전량 승인"이다.** 같은 경로에 **감사 로그가 0**이다(`Catalog` 클래스에 audit 함수 자체가 부재 — grep 0).

∴ `APPROVAL_CHAIN_API`(§65)의 벌크 승인은 **대상 명시를 필수(422)** 로 하고 **건별 감사**를 남긴다. **"미지정 = 전체"를 기본값으로 두지 마라.**

## D-4. **§38 Compilation 산출물을 저장할 곳이 없다** → 신설 · 단 캐시로 착각 금지

컴파일 산출물 저장소 **전무**. 그리고 **서버 캐시 계층 자체가 부재**(상위 ADR D-16) — Redis/Memcached 0 · `apcu_*` 는 `SystemMetrics.php:225-455` **지표 보고 전용** · 프론트 `g_admin_menu_tree_cache` localStorage 만.

∴ **`APPROVAL_CHAIN_COMPILATION` 은 캐시가 아니라 테이블이다.** §67 무효화 요구는 **무효화할 캐시가 없으므로** 컴파일 산출물의 **버전 무효화**(Chain Version 변경 시 재컴파일)로 구현한다. **§67 을 근거로 Redis 를 도입하지 마라** — 이 블록의 범위가 아니다.

🔴 **`topological order`(§38-13 필드) vs `Topological Sort`(§38-28 동작)** — `Gantt` 는 **동작만 있고 저장이 없다**. 필드는 신설, 동작은 추출(상위 ADR D-2/D-5).

## D-5. **§39 검증 = 추출 3 + 신규 3** (상위 ADR D-3/D-5 종속)

추출: 자기루프(`Dependencies:29-31`) · 순환(`:79-100` DFS + tenant `:91` + **쓰기 전 422 `:32-34`**) · 위상정렬(`Gantt:104-122`).
🔴 **신규**: Terminal Reachable · 고립 Node 없음 · START Node 정확히 하나. **Kahn 은 순환 탐지 전용이지 도달성·고립을 판정하지 않는다**(`:108` 이 indeg 0 노드를 전부 큐에 넣어 고아도 `$topo` 에 포함).

🔴 **`JourneyBuilder:511-518` 을 §39 선례로 쓰지 마라** — **런타임 탐지**이지 활성화 전 검증이 아니다(`:512` 주석 자인). §39 의 정합 선례는 **`Dependencies:32-34` 하나뿐**.

## D-6. **§43 Overlay 는 8단계다** (PM 브리핑 "7단계" 정정)

원문 `:2074-2081` 실측 = **8**: Base Chain Version → Tenant → Domain → Legal Entity·Organization → Program·Product·Brand → Approved Case-specific → Validation → Compilation. (PM 이 열거한 항목명 자체는 8개였고 **개수 표기만 틀렸다**.)

**§43 은 불릿 0** 이라 분모 측정기에 잡히지 않는다 → 전사에서 **8행 + 산문 2행 = 10행 특례**로 실었다(§23 = 3행 특례). **행 수가 분모를 초과하는 것이 정상**이며, 이를 기록하지 않으면 ⓔ 가 정상 전사를 **날조로 오탐**한다.

🔴 **Legal Entity·Organization Override 는 선행조건 0%**: Legal Entity **이름·능력 0**(유일 히트 `MarketingDataHub.php:181` "한국 법인 철수" = **데모 문자열**) · `'company'` scope 는 **법인이 아니라 무제한 센티넬**(`TeamPermissions::effectiveScope:258` `return null`).
🔴 **Program·Product·Brand Override**: `DATA_SCOPES` 에 `brand`/`product` 가 있으나 **`scopeChannelProduct:319-320` 이 둘 다 SKU 컬럼에 매핑**(`:312` 자인 *"브랜드=상품집합"*) → **brand 는 독립 차원이 아니다.**

∴ 8단계 중 **2단계(Legal Entity·Organization / Program·Product·Brand)는 지금 구현할 수 없다** → `BLOCKED_PREREQUISITE`. **순서는 선언하되 해당 오버레이는 no-op 로 두고, no-op 임을 응답에 명시하라**(가짜 녹색 방지).

## D-7. **§42 Override 오탐 3건** — 스칼라 선행순위를 오버레이로 오인하지 마라

`override` grep 히트는 **스칼라 선행순위 해석**이다: `Mmm.php:381-382`(override > 채널 > 전사) · `OrderHub.php:1274`(HTTP > 테넌트설정 > 정적) — **요청 단위 인메모리이지 영속 오버레이가 아니다.** `source_priority`(`DataPlatform.php:65`,`:184`)는 **데이터소스 Trust 우선순위**이지 라우트 우선순위가 아니다.

## D-8. **§44/§45 Fallback — `BLOCK_ON_NO_MATCH` 무조건** (레거시 분기 금지)

상위 ADR D-7(ROUTE_DAG) 참조. §72-10 계열 위반 **4건**(`nextNode:811-812`·`:814`·`pickWeighted:729`·`enroll:198`)이 레포에 살아 있고 **286차에 실 오발송 장애**를 냈다.

∴ **Approval 에는 레거시 그래프가 없다** — 무라벨 호환 분기를 두지 마라. **No Match → 명시 오류(fail-closed)**, 첫 후보·위치·리터럴 폴백 전부 금지.

## D-9. **§40 Conflict — 전 후보 평가 후 `FAIL_ON_MULTIPLE`**

`nextNode:799` **첫 일치 즉시 return** → 다중 일치 **무탐지·무기록**(§72-11 위반이 마케팅 도메인에 실재). ∴ 조건 평가는 **전 후보를 돌고** 다중 일치 시 Conflict 를 **생성·기록**한다. 첫 일치 단축 금지.

## D-10. **§57↔§58 코드 12건 중복 · §55/§56/§57 삼중 중복 11건** — 원문 구조 문제

원문이 세 계층(Gap 후보 / Static Lint / Runtime Guard)의 관계를 명시하지 않아 같은 규칙이 2~3회 등장한다(`_VERSION_NOT_FOUND`·`_INACTIVE`·`_MULTIPLE_MATCH`·`_NO_MATCH`·`_FALLBACK_CYCLE`·`Active Version 직접 수정`·`Route Cycle`·`History 덮어쓰기` 등).

**결정**: 분모는 **배타 계수 그대로 두되**(원문 항목이므로), **구현은 단일 오류 코드 테이블 + 단일 규칙 SSOT** 로 한다. **계층마다 규칙을 복제하면 레포의 기존 병("규칙 SSOT 부재")을 재생산한다.**

## D-11. **§56 Static Lint 부착 지점 = `deploy.yml` verify job** (PM 브리핑 정정 · 유리한 방향)

PM 초판 브리핑은 CI 를 *"EN locale 가드 → build → SCP"* 라 기술했다. **낡았다.** 실제 `deploy.yml:37-75` 에 **`verify` job 의 GATE 1~5**(팬텀 정적자산 · 라우트 등록 정합 + PHP 구문 · rules-of-hooks + no-undef · 빌드 · E2E)가 있고 **`deploy` 가 `needs: verify`**(`:79`)로 걸려 있다.

∴ **§56 은 신규 CI 를 만들 필요가 없다 — 기존 verify job 에 GATE 를 추가하라.** 🔴 단 **CI 배포는 inert**(시크릿 미등록 → 빌드까지만)이므로 **"CI 가 통과했으니 배포됐다"는 거짓**이다.

## D-12. 🔴 **§68 을 "eval 0 이니 안전"으로 REAL 처리하지 마라**

`eval`/`create_function`/`system` 이 `backend/src` 0 인 것은 **맞다**. 그러나 **`WmsCctv.php:563-564` `shell_exec` · `:635` `proc_open(['/bin/sh','-c',$cmd])` 가 실재**하고 **차단 게이트는 0**이다. 세 함수의 부재는 **우연이지 게이트의 결과가 아니다**(규칙 7).

∴ §68 "임의 코드 실행 금지"는 **`RuleEngine` 화이트리스트 방식의 명시 채택**으로 충족하는 것이지, "위험 함수가 없더라"로 충족되지 않는다.

## D-13. **§61 Audit — Chain 감사는 `SecurityAudit` 확장** · 현행 4경로 중 1곳은 무감사

현행: `Mapping:213`,`:291` · `Alerting:597`,`:655` · `AdminGrowth:201` — **3경로**. 🔴**`Catalog::approveQueue` 감사 0**(클래스에 audit 함수 부재).
🔴 **`Alerting::audit:28-31` 의 INSERT 는 `audit_log(actor,action,details_json,created_at)` 4컬럼 — `tenant_id` 가 없다** → **Alerting 승인 감사는 테넌트 귀속 불가**.
🔴 **인가 결정 로그 0** — 403 은 `makeJson` **즉시 반환**(`index.php:566`,`:576`). `auth_audit_log` 는 **관리행위 로그**이지 인가결정 로그가 아니다.

∴ **감사 정본 = `SecurityAudit`**(tenant 포함 해시 + `verify()` 검증기). 4번째 감사 스토어를 만들지 마라(레포 기존 병 = 감사 스토어 3+벌).

## D-14. **§60 Evidence = `VACUOUS` 선례를 답습하지 마라**

`Alerting:564-565` 의 `dry_run_diff`·`rollback_plan` 은 **투영만** — `action_json` 에서 읽는데 **생산자가 0**이라 **항상 null** 이다. `Mapping::validateValue:203` 의 검증 결과는 **미보존**.

∴ Evidence 는 **생산자를 먼저 배선하고 필드를 만든다**. 순서를 뒤집으면 `action_request` 와 같은 **표시-미집행 장식**이 된다.
★**오탐**: `lineage` 레포 유일 히트 = `DataPlatform.php:313-345` **데이터소스 계보**.

## D-15. **§66 Index — `data_scope` UNIQUE 완화가 파급된다**

`pm_task_dependencies` 의 `UNIQUE(tenant,pred,succ,dep_type)` + 양방향 인덱스(`migrations/20260526_168_004:12-14`)가 **엣지 리스트 인덱싱 정본 선례**다.
🔴 `graph_node` 는 **인덱스·UNIQUE 0**(`Db.php:816-824` = id PK 뿐) — 선례로 쓰지 마라.
🔴 `data_scope` 의 `UNIQUE(tenant_id,subject_type,subject_id)`(`TeamPermissions.php:164`)를 확장하려면 **완화가 선결이고 기존 5개 직접 호출처로 파급**된다(`AdPerformance:26` · `Wms:1291` · `Catalog:981`,`:982`,`:983` + `OrderHub:261` 래퍼).

## D-16. **§69 테스트 — 러너 신설이 선행 항목이다**

PHPUnit 스위트 없음 · `npm test` 없음. 실재 = `tools/e2e/smoke.mjs`(476줄). **원문 어디에도 "러너를 세우라"가 없다** → **별도 계상**.
- `:42` 가 `/api/v423/approvals` 를 **HTTP 상태만** 확인 · **승인 의미론 테스트 0**. 스모크는 2계층(`GET_ENDPOINTS` 500 스윕 `:148` / `CONTRACT` 키 회귀 가드 10건 `:80-91`,`:173-174`)인데 **승인은 1계층에만** 있다.
- ⚠️`:148` 이 **503 을 실패에서 제외**(`r.s !== 503`)하고 `:139` 백오프 재시도 → **레이트리밋에 회귀가 은폐될 구조적 여지**.
- §69 Regression 11항 중 **4항은 보호할 기존 기능이 0**(Multi-Level·Manager·Finance·Legal) → **회귀 테스트가 성립하지 않는다.**

## D-17. **§65 API = `/api` 접두 필수** (배선 사망 방지)

★**신규 실배선은 `/api` 접두 필수** — nginx SPA HTML 폴백이 **가짜 200 착시**를 만든다(핸들러 미배선인데 200 이 온다). 라우트 정본 = `backend/src/routes.php`(1636줄) · **핸들러 추가 시 여기 등록 필수**(자동발견 아님). 공개 엔드포인트는 **`index.php:60-89` 바이패스 목록 + `/api/...` 별칭 변형 양쪽** 등록.

🔴 **레이트리밋은 fail-open 이며 `api_key` 트래픽만 덮는다**(`index.php:508-551` · 주석 `:509-510`+코드 `:515` 자인 · `:550` fail-open) → **SPA/세션 경로 미도달**. §68 Rate Limit 요구를 이것으로 충족했다고 하지 마라.

---

## 무후퇴

1. **`approval_type` 을 산출하고 버리는 패턴 복제 금지**(D-2) · **`evaluatePolicy` 미호출 경로 복제 금지**.
2. **"미지정 = 전체 승인" 기본값 금지**(D-3).
3. **§72-10 계열 4건 복제 금지**(D-8) · **§72-11 첫 일치 단축 금지**(D-9).
4. **계층마다 규칙 복제 금지**(D-10) — 단일 규칙 SSOT.
5. **"eval 0 이니 안전" 논거 금지**(D-12).
6. **4번째 감사 스토어 금지**(D-13) — `SecurityAudit` 확장.
7. **생산자 없는 Evidence 필드 금지**(D-14) — `action_request` 답습 금지.
8. **§67 을 근거로 Redis 도입 금지**(D-4) — 범위 밖.
9. **`graph_node` 를 인덱싱 선례로 쓰지 마라**(D-15).
10. **`HIGH_VALUE_KRW` 를 남겨둔 채 새 임계 상수 추가 금지**(D-1) — 승격 후 은퇴.

## 미결

| # | 미결 | 사유 |
|---|---|---|
| U-1 | §34 권한 축 확정 | 상위 ADR D-13 — `$roleRank` ↔ `team_role` 매핑 0. 제품 결정 필요 |
| U-2 | Amount Band 경계값·통화 | `HIGH_VALUE_KRW` 는 KRW 단일 상수. 다통화 시 환율 as-of 가 선결(VERSIONING ADR D-1: 환율은 **저장 계층부터 부재**) |
| U-3 | §43 8단계 중 2단계 no-op 해제 시점 | Legal Entity·Organization / Program·Product·Brand 선행조건 0%(D-6) |
| U-4 | 테스트 러너 선정 | D-16 — 원문 범위 밖 |
