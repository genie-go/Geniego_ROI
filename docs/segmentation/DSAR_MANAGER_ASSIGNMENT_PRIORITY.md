# DSAR — Manager Assignment Priority (§35)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §35 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

★**분모 주의 — §35 는 번호목록 16개다**(측정기: 불릿 **0** · 번호 **16**). **불릿만 세면 0 이 나온다.**
★**축 주의 — §35 는 필드 축이 아니라 "해석 순서" 축**이다. 원문(`:1372`)이 *"이 우선순위를 하드코딩하지 말고 Tenant·Domain별 Versioned Policy로 관리하라"* 로 **요구를 닫는다** — 즉 16단계 목록은 **후보**이고, 진짜 요구는 **정책화**다.

| 항목 | 실측 | 판정 |
|---|---|---|
| 우선순위 해석기 | 🔴 **승인자 후보를 계산하는 코드가 레포에 없다** — `resolveApprover`·`approval_chain`·`routeApproval` **grep 0** · `approver` 2건 = **에러 메시지 문자열**(`Mapping.php:248`,`:280`) | `ABSENT` |
| 유일 인접 대응물 | **`required_approvals`** — 컬럼 실재 · `Mapping.php:287` 이 정족수 판정에 **실사용**. 🔴**그러나 유일 생산자 `:210` 이 리터럴 `2` 하드코딩**(`->execute([...,2,$now])`) — 요청자·금액·위험도 **무엇에도 반응 안 함** | **`NAME_ONLY`** |
| Versioned Policy 선례 | 🔴 **엔티티 `version` = `menu_defaults.version` 1건뿐이며 유일 생산자 `AdminMenu.php:309` 가 리터럴 `'baseline'` 고정** = **버전이 아니라 라벨** · optimistic lock `version` **grep 0** | `NAME_ONLY` |
| 정책 저장 계층 | Tenant·Domain별 정책 테이블 **0** · 정책 평가 인접 선례 = `Catalog::evaluatePolicy`→`requires_approval`(`:2247`) — **불리언 게이트이지 순서 정책 아님** | `LEGACY_ADAPTER` |

### 🔴 규칙 7 위반 경보 — **"컬럼이 있다 → 요건 모델이 있다"**

`required_approvals` 는 **우선순위가 아니라 정족수 상수**다. 컬럼의 존재가 요건 모델의 존재를 증명하지 않는다.
★**`menu_defaults.version = 리터럴 'baseline'`(`AdminMenu.php:309`)과 정확히 동형**이다 — 둘 다 **모델을 표현할 컬럼은 있으나 생산자가 상수 하나만 쓴다**. 이런 컬럼을 근거로 §35 를 "부분 커버"라 적으면 **분모를 상수 축으로 갈아끼우는 역산**이다.
> `approvals_json`(`Mapping.php:285`) = `{user, ts}` **2키 JSON 배열** → **인덱스·as-of 질의 불가** → 우선순위 이력 재구성 **불가**.

## 1. 원문 전사 + 판정 — **원문 16종**(번호목록)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Explicit Active Acting Manager for requested scope | `acting` **전역 0** · 🔴`UserAdmin::impersonate:466-525` = **신원 위장 열람**(권한 대행 아님) · "requested scope" 를 표현할 Scope 축도 부재(§34) | `ABSENT` |
| 2 | Explicit Active Interim Manager | 🔴 `interim` 1건 = **지오리프트 중간결과**(`AttributionEngine.php:672`) · `vacan`/`deputy`/`substitute`/`stand_in` **전부 0** | `ABSENT` |
| 3 | Explicit Active Temporary Manager | **전역 0** · 유효기간 축 부재(§38 이중 시간축 **전례 0**) | `ABSENT` |
| 4 | Primary Direct Manager | `team.manager_user_id`(`TeamPermissions.php:148`) = **팀당 1칸** · 🔴**규칙 10** — "primary" 가 성립하려면 secondary 가 표현 가능해야 하는데 **칸이 하나**다 | `PARTIAL` |
| 5 | Primary Position Supervisor | Position 축 **전역 0** · `supervisor_id` **0** · `position_idx` = **PM 태스크 정렬순서**(무관) | `ABSENT` |
| 6 | Administrative Manager | 🔴 `admin_level`(master\|sub `UserAuth.php:171`) ≠ Administrative Manager — **콘솔 특권**이며 보고선 아님 | `ABSENT` |
| 7 | Functional Manager for matching domain | Direct/Functional 구분 수단 **0** · 도메인 매칭 축 부재 | `ABSENT` |
| 8 | Project or Program Manager for matching resource | `pm_projects.owner_user_id` — 🔴**`WHERE owner_user_id` grep 0 = 판독 술어 0**(저장된 라벨) · Program = **주석 팬텀**(`Enterprise.php:13` · 규칙 8) | `NAME_ONLY` |
| 9 | Regional or Country Manager for matching geography | 🔴 `wms_warehouses.manager VARCHAR(120)`(`Wms.php:62`/`:112`) = **시설 담당자 자유텍스트** · FK 0 · **판독 술어 0** · `region`·`country` 와 동일 테이블 공존이 **오독 유발**(§14 함정) | `NAME_ONLY` |
| 10 | Brand Manager for matching brand | 🔴 `catalog_brand`(`Catalog.php:151-169`) = `id·tenant_id·name·code·created_at·updated_at`+`UNIQUE(tenant_id,name)` — **관리자 필드 없음**. **명부는 REAL·매니저는 ABSENT**(규칙 9) | `ABSENT` |
| 11 | Cost Center or Profit Center Manager for matching financial scope | Cost/Profit Center **전역 0** · `budget_amount` = **프로젝트 예산액**(권한 아님) | `ABSENT` |
| 12 | Dotted-line or Matrix Manager | **단일값 강제**(`manager_user_id` 1칸) → 병존 표현 불가(규칙 10) | `ABSENT` |
| 13 | Organization Owner | `isTenantOwner`(`AgencyPortal.php:370`)·`team_role='owner'`(`UserAuth.php:168`)·owner 강등 차단(`promoteManager:773`) **실재하나** — 🔴**테넌트/팀 owner 이지 조직 owner 아님**(`ORGANIZATION_*` backend grep 0 · §3.1 **18/18 `CONTRACT_ONLY`**) | `PARTIAL` |
| 14 | Missing Manager Fallback | **폴백 대상 자체가 없다** — `manager_user_id` **nullable** 이고 `seedOrg:739` INSERT 8컬럼에 부재해 **ORG_PRESET 15팀 전부 NULL** 인데 **NULL 을 처리하는 경로가 0** | `ABSENT` |
| 15 | Manual Review | 수동 검토 큐 선례 **REAL** — `catalog_writeback_job` status=`pending_approval`(`approvalCreate:2275` → `approveQueue:2341` → 집행 `processWritebackQueue:2362`) · `mapping_change_request` status=`pending`(`Mapping.php:209`) | `LEGACY_ADAPTER` |
| 16 | Block | fail-closed 선례 **REAL** — `DENY_SCOPE`(`TeamPermissions.php:251`) · `'__deny__'`→`AND 1=0`(`:277`·`:288`) · 신원 미확인 403(`Mapping.php:246-250`) · 자기승인 차단 403(`:268-271`) | `LEGACY_ADAPTER` |

**실측 개수: 16 / 16 전사** (**측정기 분모 16 과 일치** · 불릿 0 · 번호 16).
커버리지 = `ABSENT` 10 · `PARTIAL` 2 · `NAME_ONLY` 2 · `LEGACY_ADAPTER` 2 · **`VALIDATED_LEGACY` 0**.

## 2. 규칙

- 🔴 **원문의 진짜 요구는 16단계가 아니라 `:1372` "하드코딩하지 말라"다.** 16단계를 `switch`/`if` 사다리로 구현하면 **목록은 100% 전사되고 요구는 0% 충족**된다. 정책은 **Tenant·Domain 별 행(row)** 이어야 하며 코드는 **해석기**여야 한다.
- 🔴 **`required_approvals` 를 §35 대응물로 계산 금지**(규칙 7). **정족수(몇 명)** 와 **우선순위(누가 먼저)** 는 다른 축이다. `Mapping.php:210` 의 리터럴 `2` 는 **`menu_defaults.version='baseline'`(`AdminMenu.php:309`)과 동형인 상수**이며, 두 사례 모두 **"컬럼 존재 = 모델 존재" 오독의 표본**이다.
- ★**Versioned Policy 에는 본 레포에 이식 가능한 선례가 없다.** `menu_defaults.version` 은 **라벨**이고, optimistic lock `version` 은 **grep 0**, `pm_baseline.captured_at` 은 🔴**DB 컬럼이 아니라 `snapshot_json` 내부 JSON 키**(`backend/src/Handlers/PM/Enterprise.php:360` · DDL 은 `created_at` `:55`/`:62`)라 **인덱스 불가·as-of 질의 불가**(`KV_ONLY`). **버전 저장 계층은 신규 설계**다.
- 🔴 **§35 를 §38(Effective Period) 없이 구현 불가.** 1~3위(Acting/Interim/Temporary)와 "Active" 술어 전체가 **valid_from/valid_to 를 전제**하는데 `valid_from`·`valid_to`·`effective_to` **전역 grep 0** 이다. 시점 축이 없으면 **1~3위가 영구히 빈 분기**가 되고 우선순위는 **4위부터 시작**한다 — 이는 조용한 오답이다.
- ★**14위 Missing Manager Fallback 이 현행에서 가장 시급한 분기다.** 시드 15팀 전부 `manager_user_id` NULL(`seedOrg:739`)이므로 **실 데이터에서 지배적 경로**가 된다. 이를 "예외"로 설계하면 **정상 경로가 예외 처리기**가 된다.
- ★**15·16위만 이식 가능하다.** Manual Review 는 `Mapping::approve` 를 참조 구현으로 삼아라 — 🔴`Catalog::approveQueue` 는 **행위자를 읽지도 않으며**(`:2343` `requirePro` = **구독 플랜** 게이트) maker-checker 를 갖지 않는다(규칙 9).
- 16종 **"있다고 가정"하고 배선 금지**.
