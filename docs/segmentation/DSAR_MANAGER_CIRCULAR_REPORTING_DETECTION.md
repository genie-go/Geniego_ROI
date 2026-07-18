# DSAR — Manager Circular Reporting Detection & Cycle 처리 (§57 + §58)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §57·§58 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### ★★ 축 분리 필수 — **"§57 은 충족됨"은 거짓**

이 문서의 모든 판정은 **두 축을 분리**해서 읽어야 한다. 합치면 즉시 오판이다.

| 축 | 상태 |
|---|---|
| **알고리즘 축**(순환을 탐지하는 코드가 레포에 있는가) | ✅ **충족** — DFS·위상정렬 **2/6 실재** · 레포 최고 품질 |
| **Manager 도메인 적용 축**(보고선에 그 탐지가 걸려 있는가) | 🔴 **미배선** — 탐지 대상 관계가 **0개** |

🔴 **"§57 은 충족됨"이라 적으면 거짓이다.** 알고리즘이 있는 것과 Manager 도메인이 보호되는 것은 다른 명제다. 두 축을 합치면 **미달이 자동으로 "기능 유지"로 위장**된다(규칙 9).
🔴 **역방향 오판도 금지**: "Manager 축이 없으니 순환탐지도 없다"고 적으면 **레포 최고 품질 자산을 못 보고 재구현**하게 된다. **재구현 금지 · 확장하라.**

### 실재 2/6 — 정밀 실측

| §57 요구 방식 | 실재 | 증거 |
|---|---|---|
| **DFS** | ✅ | **`backend/src/Handlers/PM/Dependencies.php:79-100`** |
| **Topological Sort** | ✅ | **`backend/src/Handlers/PM/Gantt.php:104-125`** |
| Recursive CTE · Closure Table · Graph Query · Path Prefix Validation | ❌ | 전부 **grep 0** |

🔴 **★경로 접두 필수**: **`backend/src/Handlers/PM/…`** — **`backend/src/PM/` 는 존재하지 않는다**(5-3-3-1 문서 25편에 오표기 전파. 답습 금지).

#### ① `Dependencies.php:79-100` = **레포 최고 품질 · `VALIDATED_LEGACY`(알고리즘 축)**

- **반복형 DFS**(재귀 아님 — 스택 오버플로 면역) · `:81` `$visited` 배열 · `:86` 방문 시 skip
- **`:91` tenant 필터가 매 홉에 걸린다** — `WHERE tenant_id = ? AND predecessor_id = ?` → **순회 자체가 테넌트를 못 넘는다**(§59 설계의 유일한 이식 가능 선례)
- **`:32-34` 쓰기 전 차단** — `validateDependency()` 실패 시 **INSERT 이전에 422 `cycle_detected`** → 순환이 **저장된 적이 없다**
- **`:29-31` self-loop 차단** — `$pred === $succ` → 422 `self_dependency`
- 🔴 **`:84` `$depth < 10000` 은 깊이 캡이 아니라 방문 노드 예산** — `:97` `$depth++` 가 **pop 마다** 실행된다(홉이 아니라 노드 수). **§57 "Maximum Depth"로 계산하면 오판**이며, 예산 소진 시 `:99` 가 `true`(=순환 없음)를 반환해 **fail-open** 된다. Manager 도메인 이식 시 **fail-closed 로 뒤집어야 한다.**
- 🔴 **`:90-91` 이 `dep_type` 을 술어에 넣지 않아 전 타입 무차별 순회** → **§11 Manager Type 27종별 순환정책 표현 불가**. **`pm_task_dependencies` 스키마 복제 금지** — 이 결함을 물려받으면 **설계 시점에 이미 §11 이 불가능**해진다.

#### ② `Gantt.php:104-125` = Kahn 위상정렬 · **탐지는 정석 · 차단은 없음**

- `:104-118` Kahn 알고리즘(진입차수 큐) · **`:119` `count($topo) !== count($taskMap)` = 순환 판정 정석**
- **`:120-125` 500 이 아니라 부분결과 + 경고 degrade** — `:123` 잔여 노드를 best-effort 로 append. **가용성 우선 설계로 REAL**
- ⚠️ **탐지 후 차단하지 않는다** — **읽기 경로**(간트 렌더)이므로 정당하다. 🔴 **그러나 §58 "관계 활성화 차단" 선례로 인용 금지.**

#### 미달 3건 — **§57 후보 계산 금지**

| 코드 | 결격 |
|---|---|
| `AdminMenu::wouldCycle:540-555` | **`$visited` 없음** · `menu_tree` 에 **`tenant_id` 없음** → 테넌트 경계 없는 순회 |
| `JourneyBuilder:511-518` | **런타임 탐지이지 쓰기 전 차단 아님** · **`:512` 주석이 "작성자 JSON acyclicity 검증 없음"을 자인** |
| 🔴 **`ChannelSync.php:955-962`** | **순환 검출기가 아니다** — `$visited` 없이 **깊이만 자른다** → 순환 시 **탐지 없이 조용히 절단**. 호출자는 정상 종료로 인식 = **가짜녹색**. §57 후보로 계산 금지 |

## 1. 원문 전사 + 판정 — **원문 27종**(§57 = 16 · §58 = 11)

### §57 — Cycle 유형 **10종** (원문: *"다음 Cycle을 탐지하라."*)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | A → B → A | 관계 축 부재 → 탐지 대상 0. 알고리즘 선례 `Dependencies:79-100`(태스크 도메인) | `ABSENT`(도메인) |
| 2 | A → B → C → A | 동상 — `Dependencies` DFS 는 임의 길이 처리 가능(`:82` 스택) | `ABSENT`(도메인) |
| 3 | Subject Chain Cycle | Subject 간 보고 관계 **0**(`manager_id`·`reports_to` grep 0) | `ABSENT` |
| 4 | Position Chain Cycle | **Position 축 전역 0**(`position_idx` = PM 정렬순서) | `ABSENT` |
| 5 | Subject·Position Mixed Cycle | 양 축 모두 부재 → 혼합 그래프 정의 불가 | `ABSENT` |
| 6 | Organization Manager Cycle | Organization = **18/18 `CONTRACT_ONLY`** · `team` 에 **`parent_team_id` 없음 → 팀 트리 자체가 없다**(`TeamPermissions.php:148`) | `ABSENT` |
| 7 | Acting Assignment Cycle | Acting 축 **전역 0** | `ABSENT` |
| 8 | Temporary Assignment Cycle | Temporary Assignment 축 **0**(effective date 0 · 이력 0) | `ABSENT` |
| 9 | Matrix Relationship Cycle | 🔴 **규칙 10 적중** — `team.manager_user_id` **1칸** · `pm_projects.owner_user_id` **단일값** → **Direct/Functional/Project 병존 표현 불가** = 매트릭스가 **정의상 성립 불가** | `ABSENT` |
| 10 | Cross-Legal-Entity Supervisory Cycle | **`legal_entity` backend/src grep 0**(§60) | `ABSENT` |

### §57 — 탐지 방식 **6종** (원문: *"최소 다음 방식 중 적합한 것을 사용한다."*)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 11 | DFS | ✅ **`backend/src/Handlers/PM/Dependencies.php:79-100`** — 반복형 DFS · `:81` `$visited` · **`:91` tenant 필터 매 홉** · **`:32-34` 쓰기 전 422 차단** · `:29-31` self-loop. ⚠️`:84` 예산 소진 시 fail-open · `:90-91` `dep_type` 술어 부재 | **`VALIDATED_LEGACY`**(★**알고리즘 축 한정** · Manager 도메인 미배선) |
| 12 | Topological Sort | ✅ **`backend/src/Handlers/PM/Gantt.php:104-125`** — Kahn · `:119` 정석 판정 · `:120-125` 부분결과+경고 degrade. ⚠️**탐지 후 차단 없음**(읽기 경로) | **`VALIDATED_LEGACY`**(★**알고리즘 축 한정** · 차단 축 아님) |
| 13 | Recursive CTE | **grep 0** — `WITH RECURSIVE` 전역 0. SQLite 폴백 병행 제약상 방언 이중 작성 의무 | `ABSENT` |
| 14 | Closure Table | **grep 0** | `ABSENT` |
| 15 | Graph Query | **grep 0.** 🔴 `graph_node`/`graph_edge`(`Db.php:816-839`)는 **스토어이지 순환질의 아님** · `GraphScore.php:57-59` 화이트리스트 `['influencer','creative','sku','order']` → **422 가 조직 노드 저장을 막는다** | `ABSENT` |
| 16 | Path Prefix Validation | **grep 0** — path/materialized path 컬럼 0 | `ABSENT` |

### §58 — Cycle 처리 **11종** (원문: *"Cycle 탐지 시 다음을 수행하라."*)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 17 | 관계 활성화 차단 | ✅ **`Dependencies.php:32-34`** — `validateDependency` 실패 → **INSERT 전 422 `cycle_detected`**. **레포 유일의 "쓰기 전 차단" 선례** · 단 태스크 선후행 도메인 | **`VALIDATED_LEGACY`**(★알고리즘/집행형태 축 한정) |
| 18 | 영향 Subject 계산 | 영향 계산 코드 **0** — `Dependencies` 는 **bool 만 반환**(`:79` 시그니처 `: bool`) · **순환 경로도 영향 노드도 호출자에 전달 안 함** | `ABSENT` |
| 19 | 영향 Approval Task 계산 | Approval Task 축 **0**(승인은 노드가 아니라 핸들러 메서드) | `ABSENT` |
| 20 | 영향 Approval Chain Reference 계산 | `approval_chain` **grep 0** | `ABSENT` |
| 21 | Source System 표시 | 외부 Source **42항목 전부 부재**(HRIS·ERP·IdP·SCIM manager = 0) → 표시할 출처 자체가 없다(§62) | `ABSENT` |
| 22 | Conflict 생성 | Conflict 엔티티 **0** | `ABSENT` |
| 23 | Manual Review 생성 | Manual Review 엔티티 **0** | `ABSENT` |
| 24 | High 또는 Critical Audit Event 생성 | 🔴 **ⓑ 브리핑 정정** — `Dependencies.php:48-54` auditLog 는 **성공 경로 전용**이다. **`:32-34` 가 422 로 조기 반환하므로 순환 탐지 시 감사 이벤트는 발생하지 않는다.** 게다가 severity(High/Critical) 컬럼·인자 **부재**(`:48-54` = tenant/actor/entity/action/diff/ip/ua) | `ABSENT` |
| 25 | 관련 Cache 무효화 | 순환 판정 결과 캐시 **0**(매 요청 DFS 재실행) → 무효화 대상 없음 | `NOT_APPLICABLE` |
| 26 | 신규 Manager Resolution 차단 | **Manager Resolver 자체가 `ABSENT`**(`resolveApprover`/`routeApproval` grep 0) → 차단할 해석기가 없다 | `ABSENT` |
| 27 | 기존 Approval Snapshot 유지 | 🔴 **Snapshot 축 0** · `Actor Authorization Snapshot` **`ABSENT`**. 🔴**`AgencyPortal.php:304`·`:381` 이 `revoked_at=NULL` 로 이전 해지 시각을 소거** = **"과거 Snapshot 유지"의 정면 반례가 실재**. ⚠️`snapshot` grep 최다 히트 = **CCTV JPEG 프레임**(`WmsCctv.php:45`) — 검색 최우선 오염원 | `ABSENT` |

**실측 개수: 27 / 27 전사.** (측정기 분모 §57=16 · §58=11 · 합 27 · 원문 대조 27 · 전사 27 — **일치**)
커버리지 = **알고리즘 축 `VALIDATED_LEGACY` 3**(11·12·17) · **Manager 도메인 축 커버 0** · `ABSENT` 23 · `NOT_APPLICABLE` 1.

> 🔴 **§58 실재는 2가 아니라 1이다.** ⓑ 브리핑은 *"실재 2(관계 활성화 차단 `Dependencies:32-34` · Audit Event `:48-54`)"* 라 했으나, **정의부 Read 결과 `:32-34` 가 `:48` 이전에 반환**하므로 **순환 경로에서 감사 이벤트는 발생하지 않는다**(규칙 3 — 숫자를 조용히 맞추지 않고 다르다고 적는다).

## 2. 규칙

- 🔴 **`Dependencies.php:79-100` 재구현 금지 · 확장하라.** 레포 최고 품질(반복형 DFS + `$visited` + **매 홉 tenant 필터** + **쓰기 전 차단**)이며, 이를 두고 새 순환탐지기를 만들면 **중복 엔진 = 헌법 위반**.
- 🔴 **그러나 `pm_task_dependencies` 스키마는 복제 금지.** `:90-91` 이 `dep_type` 을 술어에 넣지 않는 결함을 물려받으면 **§11 Manager Type 27종별 순환정책이 설계 시점에 이미 불가능**해진다. **이식 대상 = 알고리즘(순회 형태·`$visited`·tenant 술어·쓰기 전 차단) · 이식 금지 = 스키마·무차별 순회.**
- 🔴 **`:84` 예산 소진 시 fail-open 을 그대로 이식 금지.** `:99` 가 `true`(순환 없음)를 반환한다 → Manager 도메인에서는 **예산 소진 = 판정 불가 = `BLOCKED_CIRCULAR_REPORTING` fail-closed** 로 뒤집어라. 미지를 "안전"으로 읽는 것은 **`is_active NOT NULL DEFAULT 1` 이 미지를 "가용"으로 읽는 fail-open 과 동형**.
- 🔴 **`ChannelSync.php:955-962` 를 순환탐지 선례로 인용 금지**(`$visited` 없이 깊이만 자름 = **탐지 없이 조용히 절단**). `AdminMenu::wouldCycle:540-555`(`$visited` 없음·tenant 없음)·`JourneyBuilder:511-518`(런타임 탐지) 도 동일.
- **탐지와 차단은 다른 축이다.** `Gantt:104-125` 는 **탐지 O · 차단 X**(읽기 경로로 정당). §58 17번은 **쓰기 경로 차단**을 요구하므로 **`Dependencies:32-34` 형태만** 선례다.
- 🔴 **§58 24번(Audit Event)은 신설이다.** `Dependencies:48-54` 를 참조 구현으로 삼되 **① 조기 반환 이전에 감사 · ② severity 인자 추가**가 필수. 현행을 그대로 이식하면 **순환이 탐지돼도 로그가 남지 않는다**.
  - **hash chain 선례 = `AdminMenu.php:128`**(SHA-256 prev-chain · 생성 `:182-197` · `lastHash():214-219`). 🔴 **`menu_audit_log` 에 `tenant_id` 없음 · `lastHash()` 에 tenant 술어 없음 → 스키마 복제 금지 · 알고리즘만 이식 · 테넌트별 체인 시 `WHERE tenant_id=?` 필수.** 🔴 **단 쓰기 체인만 실재하고 검증기(`verify()`)가 0**이며 preimage `ts`(`:195`)가 INSERT 컬럼에 없어 `created_at` DB DEFAULT 가 덮어 재계산 불가 → tamper-evident 아님(검증형 정본 = `SecurityAudit::verify():56-68`). **`pm_audit_log`**(migration `20260526_168_008:7` `tenant_id NOT NULL` + `diff_json :13` + 3인덱스 `:17-19` + append-only 주석 `:2-3`)가 **스키마 축 선례**.
- 🔴 **18번(영향 Subject 계산)은 `bool` 반환 확장이 선결.** 현행 `validateDependency(): bool` 은 **순환 경로를 버린다** → §58 18~20 은 **경로·영향집합을 반환하는 시그니처**를 요구한다. bool 을 유지한 채 18~20 을 "구현"하면 VACUOUS.
- 🔴 **Cycle 유형 10종을 "있다고 가정"하고 배선 금지.** 1~10 전부 **탐지 대상 관계가 0개**다 → 관계 신설 **이전**에 탐지기를 붙이면 **양변 부재 → 자동 PASS = 가짜녹색**(288차 `ok=>true` 위장·5-3-3-1 D-14 동형).
- **9번(Matrix Cycle)은 §4.6 Multi-manager 선언에 의존.** 단일값 컬럼(`team.manager_user_id`·`pm_projects.owner_user_id`)이 유지되는 한 매트릭스 순환은 **정의상 발생 불가** → 다중 관계 도입 시 **9번이 즉시 활성 요구로 전환**된다.
- **§59·§60 과의 순서**: `:91` tenant 술어는 **Cross-Tenant 순환(§59)을 순회 단계에서 이미 봉쇄**하는 형태다 — Manager 도메인 이식 시 **이 술어를 빠뜨리면 §59 6번(Cross-Tenant Supervisory Path)이 동시에 뚫린다.**
