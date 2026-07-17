# DSAR — Manager Relationship Snapshot Type (§54)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §54(Snapshot Type 축) · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)
> 필수 필드 축(§54 27종) = [DSAR_MANAGER_RELATIONSHIP_SNAPSHOT.md](DSAR_MANAGER_RELATIONSHIP_SNAPSHOT.md)

## 0. 현행 실측 (file:line)

### ★대전제 — **Snapshot Type 은 "찍는 계기(trigger)" 축이다**

Snapshot Type 10종은 **"언제 관계를 동결하는가"**를 열거한다. 실측 결과 **10종 전량 `ABSENT`** 이며, 부재의 원인이 **두 층**으로 갈린다:

| 층 | 의미 | 해당 |
|---|---|---|
| **계기 자체가 없다** | 그 사건이 레포에 발생하지 않는다 | 3·4·5·6·8·9·10 (7종) |
| **계기는 있으나 찍지 않는다** | 사건은 실재하는데 동결 코드가 0 | 1·2·7 (3종) |

★**후자 3종이 더 위험하다** — 사건이 실제로 흐르고 있는데 **그 시점의 권한·관계가 아무 데도 남지 않는다**. "나중에 Snapshot 만 붙이면 된다"가 성립하지 않는다(과거는 이미 소실됨 · `ensureTables` 는 백필하지 않는다).

### ★분모 주의

측정기 **§54 = 37**(불릿 37) = **필수 필드 27 + Snapshot Type 10**. 본 편은 **Type 10 담당**. `27 + 10 = 37` 로 측정기와 정합.

### 🔴 ★오염원 — `snapshot` grep 최다 히트는 **CCTV JPEG 프레임**

`routes.php:271` `wms/cameras/{id}/snapshot` · `WmsCctv.php:45`. Type 축 검색 시 **최우선 오염원**. 능력축(계기 훅 존재 여부·동결 코드)으로만 논증하라.

## 1. 원문 전사 + 판정 — **원문 10종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | APPROVAL_REQUEST | 🔴 **계기는 실재 · 동결 0** — `Mapping::propose` 가 `mapping_change_request` INSERT(`Mapping.php:209-210`) 하나 저장하는 것은 `requested_by`(actor 문자열)·`created_at` 뿐. **요청 시점의 권한·조직·관계 저장 0** | `ABSENT` |
| 2 | APPROVAL_CASE | Case 개념 0 — Request/Case 미분화(§51 #6) | `ABSENT` |
| 3 | MANAGER_RESOLUTION | 🔴 **계기 자체가 없다** — Resolver 부재 확정(`resolveApprover`·`approval_chain`·`routeApproval` **grep 0** · `approver` 2건은 **에러 메시지 문자열** `Mapping.php:248`,`:280`). **해석하지 않으므로 해석 시점도 없다** | `ABSENT` |
| 4 | APPROVAL_CHAIN_BUILD | 체인 개념 0(`approval_chain` grep 0) · 승인 경로 4개 전량 **"호출자가 곧 승인자"** | `ABSENT` |
| 5 | TASK_ASSIGNMENT | 승인 Task 개념 0 · 🔴 `pm_task_assignees`(migration `…168_005` · `role ENUM('owner','contributor','reviewer','observer')`)는 **PM 태스크 배정**이며 승인 도메인 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 6 | TASK_CLAIM | Claim 개념 **전역 0**(Task 가 없으므로 선점도 없다) | `ABSENT` |
| 7 | APPROVAL_DECISION | 🔴 **계기는 실재 · 동결 0 · 가장 심각** — `Mapping::approve:285` 가 `approvals_json[] = ["user"=>$actor, "ts"=>gmdate('c')]` **2키만** 기록. **"그가 그때 승인할 자격이 있었는가"를 사후 재구성 불가**. 인접 결정 경로도 동일: `Catalog::approveQueue:2341`(🔴**행위자를 읽지도 않음**) · `AgencyPortal::approveAgency:370` · `Alerting::decideAction:591-595`(**단일 결정 즉시 approved**) | `ABSENT` |
| 8 | REPORTING_LINE_CHANGE | 🔴 **계기 자체가 없다** — 보고선 0(`manager_id`·`reports_to` grep 0 · **git 삭제 이력도 0**). ⚠️ 인접 변경 훅 = `promoteManager:768-776`(`app_user.team_role='manager'`+`team_id` UPDATE `:774`) — 🔴 **덮어쓰기이며 이력 0 · 전임자 강등 경로 0**(§76 실재 결함) | `ABSENT` |
| 9 | RECONCILIATION | 🔴 **이중 공허**(§66) — 비교쌍의 **좌변(source)·우변(canonical) 양쪽 부재**. HRIS/ERP/IdP manager 소스 **0개** · Canonical 관계 모델 **0**. **양변 부재 → 자동 MATCH = 가짜녹색**(288차 `ok=>true` 위장과 동형) | `VACUOUS` |
| 10 | AUDIT_RECONSTRUCTION | 🔴 **재구성 대상이 0** — as-of 질의 **전역 0**(`as_of` 2건은 응답 타임스탬프 `PgSettlement.php:279`·`AttributionEngine.php:666`) · `approvals_json` **인덱스 불가** · 🔴 `AgencyPortal.php:304`·`:381` **`revoked_at=NULL` 이 이력을 물리적으로 소멸**시킴 | `ABSENT` |

**실측 개수: 10 / 10 전사.** (측정기 §54 분모 **37** = 필드 27 + Type 10 · 본 편 Type **10** · 전사 **10** — **분해 후 정합**)
원문 Type 목록이 `AUDIT_RECONSTRUCTION` 으로 끝나며 **`evidence` 로 끝나지 않는다**(`:1999`) → **규칙 4 반대편향 회피 — `evidence` 추가하지 않음**(필수 필드 축은 `evidence` 로 끝나므로 별편에서 전사됨 · **두 축을 섞지 말 것**).

커버리지 = **`VALIDATED_LEGACY` 0** · `ABSENT` 8 · `KEEP_SEPARATE_WITH_REASON` 1(5) · `VACUOUS` 1(9).

## 2. 규칙

- 🔴 **Type 10종 = 전량 `ABSENT`(9번은 `VACUOUS`).** **커버 0.** Type 은 ENUM 후보이지 현행 자산의 매핑 대상이 **아니다**.
- ★**부재의 층을 구분해 보고하라.** 1·2·7 은 **계기가 실재하는데 동결하지 않는 것**이고, 3·4·5·6·8·10 은 **계기 자체가 없는 것**이다. 전자를 후자와 같이 "나중에 붙이면 됨"으로 다루면 **그 사이 흐른 승인의 권한 근거가 영구 소실**된다.
  - 🔴 **`ensureTables` 는 테이블 생성만 하고 데이터 변환·백필을 하지 않는다** → **소급 Snapshot 생성 수단 없음**. Snapshot 은 **시행일 이후 전방(forward-only)** 으로만 축적된다.
- 🔴 **`APPROVAL_DECISION`(7) 이 최우선.** 승인은 **지금 실제로 일어나고 있고**(`Mapping::approve` REAL · `catalog_writeback_job` 경로 REAL) **그 시점 권한이 하나도 안 남는다**. Type 신설 시 이것부터.
- 🔴 **`RECONCILIATION`(9) 을 "source 측만 만들면 된다"로 축소 금지** — **Canonical 선언이 §66 에 선행**(5-3-3-1 D-14 동형). 양변 부재 상태로 Reconciliation 을 배선하면 **비교할 게 없어 항상 MATCH = 가짜녹색**이 된다.
- 🔴 **`TASK_ASSIGNMENT`(5) 에 `pm_task_assignees` 를 매핑 금지** — 형태 유사(N:N + role ENUM)·**도메인 상이**(PM 태스크 배정 ≠ 승인 Task). **형태만 이식 · 값·의미·소유자는 신규.**
- 🔴 **`REPORTING_LINE_CHANGE`(8) 훅을 `promoteManager:768-776` 에 걸지 마라 —** 이 경로는 **덮어쓰기이며 전임자 강등이 없다**(교체 시 전임자 `team_role='manager'` 잔존 → 위임 권한 `isManagerAdmin:136`·`putMemberPermissions:618` 계속 보유). **결함 위에 Snapshot 을 얹으면 "잘못된 상태를 정확히 기록"할 뿐**이다. 강등 경로 신설이 **선결**.
- 🔴 **`MANAGER_RESOLUTION`(3)·`APPROVAL_CHAIN_BUILD`(4) 는 §51 Candidate·후속 블록 Approval Chain 이 선행**한다(원문 `:1861` — *"최종 Approval Chain 생성은 다음 블록에서 구현한다"*). **본 블록에서 배선 금지.**
- ★**Type 을 `VARCHAR` 자유문자열로 두지 마라** — 규칙 11 의 교훈: `ChannelRegistry.php:36`,`:46` `group_type` 이 **`VARCHAR(40)`/`VARCHAR(20)` 자유 문자열 · ENUM/CHECK 없음 · `in_array` 화이트리스트 0** 이라 **주석의 "열거"가 강제력이 없고**, 실값 `support` 가 주석에 누락된 stale 이 됐다. **제약은 코드로 강제**(MySQL ENUM / SQLite CHECK / `in_array` 게이트)하고, **MySQL·SQLite 두 방언을 수기로 중복 작성**해야 한다.
  - ⚠️ 단 **MySQL ENUM 의 함정**도 실측됨: `pm_audit_log.entity_type` 이 ENUM 이라 **신규 엔터티 기록 시 enum 위반 → INSERT 예외**(`PM/Enterprise.php:65-66` 주석 자인 · 대응 `:67` `isMysql` 분기 ALTER) → 값 추가(additive)가 **의무**. Type ENUM 채택 시 **10종 확장 절차를 함께 정의**하라.
