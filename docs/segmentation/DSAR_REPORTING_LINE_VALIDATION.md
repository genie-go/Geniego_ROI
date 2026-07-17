# DSAR — Manager Relationship Validation `REPORTING_LINE_VALIDATION` (§61)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §61 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

원문 코드명 = **`REPORTING_LINE_VALIDATION`** — `backend/src` **grep 0**. 원문 지시: *"**활성화 전에** 다음을 검증하라."*

### ★ 유일한 실 검증 지점 — `createTeam:463-469` (**REAL**)

레포에서 **매니저 지정 시점에 실제로 검증하는 유일한 코드**다. ⓑ 정정 사항이므로 정확히 인용한다.

- `createTeam:463-469` — manager 수령 → **테넌트 소속 검증 `:464` → 422** → INSERT `:466` → `promoteManager:469`
- 수정 경로 `:492-495` · 조회 `:444-445`
- `promoteManager:768-776` — 부작용으로 `app_user.team_role='manager'` + `team_id` UPDATE(`:774`) · **owner 강등 차단 `:773`**

🔴 **"team owner 실사용 인용 금지"는 시드 축에 한해 참, 쓰기경로 축에서는 거짓.** 시드 축: **`seedOrg:739` INSERT 컬럼 8개에 `manager_user_id` 부재** → **`ORG_PRESET` 시드 15팀 전부 manager NULL**. 쓰기경로 축: **REAL**.

### ★축 주의 — **`team.manager_user_id` 는 보고선이 아니라 팀당 1칸 슬롯**

- DDL `TeamPermissions.php:148`(MySQL)/`:168`(SQLite) · **`parent_team_id` 없음 → 팀 트리 자체가 없다**
- 🔴 **결여**: Relationship Type/Priority/Responsibility Scope 표현 불가(§4.6) · nullable · **effective date 0 · 이력 0 · 버전 0**

### ★ 결함 3건 — §61 이 신설되면 즉시 정면 충돌

| §76 항목 | 실측 | §61 충돌 지점 |
|---|---|---|
| Acting Manager 가 기존 Manager 덮어쓰기 | `TeamPermissions.php:492-501` 교체 시 **전임자 강등 없음** | 18번(Acting Original Manager) |
| Vacant Position 을 Active Manager 로 처리 | `promoteManager:768-776` **강등 경로 0** → `manager_user_id=NULL` 로 바꿔도 **전임자 `team_role='manager'` 잔존** → 위임 권한(`isManagerAdmin:136`·`putMemberPermissions:618`) **계속 보유** | 15번(Manager Eligibility)·20번(Interim Vacancy) |
| Manager 라는 이유만으로 Approval Authority 자동 부여 | `UserAuth.php:1064`·`TeamPermissions.php:136` | 15번 |

## 1. 원문 전사 + 판정 — **원문 23종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Tenant 일치 | ✅ **인접 REAL** — **`createTeam:464` 테넌트 소속 검증 → 422**(manager 수령 경로). 🔴 그러나 **팀 매니저 컬럼 한정**이며 보고선 아님 · 수정경로 `:492-495` 동형 검증 여부는 **본 전사에서 미확인** | `PARTIAL` |
| 2 | Subject 존재 | ✅ 인접 = 동일 `:464`(존재+소속 동시 검증). Subject = `app_user` 뿐 | `PARTIAL` |
| 3 | Position 존재 | **Position 축 전역 0**(`position_idx` = PM 태스크 정렬순서 — 오염원) | `ABSENT` |
| 4 | Organization 존재 | **`ORGANIZATION_*` backend 전역 grep 0** · `DSAR_ORGANIZATION_*` 70편은 **문서**이며 ADR §2 가 *"실 코드·테이블·노드 = 0건"* **자인**. 🔴 문서 존재를 구현 존재로 계산하면 역산 | `CONTRACT_ONLY` |
| 5 | Employment 상태 | 🔴 **`is_active` = 계정 상태이지 고용 상태가 아니다** — **base DDL `Db.php:1106`** · 소비처 전부 **인증 게이트**(`UserAuth.php:248`,`:805`,`:2455`·`routes.php:2776`). **사유·시각·이력 컬럼 0** · `terminated`·`on_leave`·`deleted_at` **전역 0** | `ABSENT` |
| 6 | Position Incumbency 상태 | Position 축 0 → 재직 상태 표현 불가 | `ABSENT` |
| 7 | Relationship Type 유효 | 🔴 **규칙 10** — `team.manager_user_id` **단일 컬럼**이라 Type 자체를 담을 슬롯이 없다. §11 Manager Type 27종 표현 불가 | `ABSENT` |
| 8 | Effective Period 유효 | **`effective_to`/`valid_to`/`valid_from` grep 0** · manager 관계에 **effective date 0** | `ABSENT` |
| 9 | Source Reference 유효 | 🔴 **manager 보유 소스 = 0개**(§62) → 참조 무결성 검증 대상 없음 | `ABSENT` |
| 10 | Primary Count 제한 | 🔴 **규칙 10 정면 적중** — `team.manager_user_id` **1칸**이라 Primary 가 항상 ≤1. **제한이 아니라 표현 불가.** 유사 선례: `data_scope` **`UNIQUE(tenant_id,subject_type,subject_id)` `:164` = 단일행이 스키마로 강제**(정책이 아니라 UNIQUE 가 금지) | `ABSENT` |
| 11 | Self-reporting 없음 | §56 참조 — **7항목 전부 비교 두 변 중 최소 한 변 부재**. `Mapping.php:268-271` 자기승인 차단은 **Self-approval 축**(원문이 분리 명시) | `ABSENT` |
| 12 | Circular Reporting 없음 | §57 참조 — **알고리즘 축 충족**(`Dependencies.php:79-100` DFS · `Gantt.php:104-125` Kahn) · **Manager 도메인 미배선** | `ABSENT`(도메인) |
| 13 | Cross-Tenant 정책 | §59 참조 — 평면 격리 REAL(`index.php:600`)이나 **관계 축 부재**. 인접 = `:464` | `PARTIAL` |
| 14 | Cross-Legal-Entity 정책 | §60 참조 — **`legal_entity` 전역 0** · 🔴 `DATA_SCOPES` `'company'` = **무제한 센티넬**(`effectiveScope():258` `return null`) | `ABSENT` |
| 15 | Manager Eligibility | 🔴 **적격 술어 0.** `promoteManager:773` owner 강등 차단은 **REAL 이나 가드이지 자격 판정 아님**. **`Mapping::approve` 도 정족수(숫자)뿐 — 적격 술어 0.** 🔴 현행은 정반대: **Manager 라는 이유만으로 Approval Authority 자동 부여**(`UserAuth.php:1064`·`TeamPermissions.php:136`) | `ABSENT` |
| 16 | Organization Path 유효 | **`parent_team_id` 없음 → 팀 트리 자체가 없다**(`TeamPermissions.php:148`) · path/materialized path 컬럼 0 | `ABSENT` |
| 17 | Supervisory Path 생성 가능 | 감독 경로 축 0. 순회 알고리즘 선례만 존재(`Dependencies.php:79-100` · 태스크 도메인) | `ABSENT` |
| 18 | Acting Original Manager 존재 | **Acting 축 전역 0.** 🔴 **`UserAdmin::impersonate:466-525` 대입 금지** — 주석이 "대행" 6회(`:466`,`:492`,`:525`)나 **권한 대행이 아니라 신원 위장 열람**(관리자 2시간 토큰 `:492`) · original manager 참조·기간부 Assignment **전무**. 🔴 현행 결함: `TeamPermissions.php:492-501` 교체 시 **전임자 강등 없음** | `ABSENT` |
| 19 | Temporary End Date 존재 | Temporary Assignment 축 0 · 종료일 컬럼 0 | `ABSENT` |
| 20 | Interim Vacancy 존재 | **`vacan` grep 0** · `interim` 1건은 **지오리프트 중간결과**(`AttributionEngine.php:672`). 🔴 현행 결함: `promoteManager:768-776` **강등 경로 0** → 공석 전환해도 **전임자 `team_role='manager'` 잔존 · 위임 권한 계속 보유** | `ABSENT` |
| 21 | Co-manager Policy 존재 | 🔴 **규칙 10** — 1칸 슬롯이라 Co-manager Group 표현 불가(§56 5번과 동일 근거) | `ABSENT` |
| 22 | Historical Version Hash 유효 | 🔴 **manager 관계 버전 0** · `version` grep = `menu_defaults.version` 1건이며 **유일 생산자 `AdminMenu.php:309` 이 리터럴 `'baseline'` 고정 = 버전이 아니라 라벨**. **인접 알고리즘 선례** = `menu_audit_log.hash_chain`(`AdminMenu.php:128` SHA-256 prev-chain · 생성 `:182-197` · `lastHash():214-219`) · `schema_migrations.checksum`(`Migrate.php:50`) | `ABSENT`(알고리즘 선례 有) |
| 23 | Active Version Immutable | **optimistic lock `version` grep 0** · 불변 강제 0. 🔴 **정면 반례 실재**: `AgencyPortal.php:304`·`:381` 이 `revoked_at=NULL` 로 이력을 **물리적으로 소거** | `ABSENT` |

**실측 개수: 23 / 23 전사.** (측정기 분모 23 · 원문 대조 23 · 전사 23 — **일치**)
커버리지 = **`VALIDATED_LEGACY` 0** · `PARTIAL` 3(1·2·13) · `CONTRACT_ONLY` 1(4) · `ABSENT` 19.

> ★ 규칙 4 확인: **원문이 `evidence` 로 끝나지 않는다**(23번 = `Active Version Immutable`) → **추가하지 않았다.**
> ★ 코드명 `REPORTING_LINE_VALIDATION` 은 §61 머리의 **식별자**이며 불릿 항목이 아니다 → 분모 23 에 불포함(측정기와 일치).

## 2. 규칙

- 🔴 **§61 은 "활성화 **전**" 검증이다 — 런타임 탐지로 대체 금지.** 유일 정합 선례 = **`Dependencies.php:32-34`**(INSERT 이전 422). 🔴 **`JourneyBuilder:511-518` 형태 금지** — 런타임 탐지이며 **`:512` 주석이 "작성자 JSON acyclicity 검증 없음"을 자인**한다.
- 🔴 **23항목 중 20항목이 "검증기 부재"가 아니라 "검증 대상 부재"다.** 검증기부터 만들면 **양변 부재 → 자동 PASS = 가짜녹색**(288차 ChannelSync `ok=>true` 위장 14채널 18개소와 동형). **Canonical 선언(Subject·Position·Organization·Relationship) → 관계 저장 → §61** 순서 강제.
- 🔴 **1·2·13번을 "됐다"로 계산 금지 — `PARTIAL` 이다.** `createTeam:464` 는 **REAL 이나 `team.manager_user_id` 컬럼 지정 경로 한정**이며 **보고선 관계가 아니다**. 🔴 **수정 경로 `:492-495` 에 동일 검증이 걸려 있는지는 본 전사에서 미확인**(자진신고) — 배선 전 필수 확인.
- 🔴 **7·10·21번은 "현행이 이미 만족"이 아니라 "표현 수단 없음"이다**(규칙 10 3연속 적중). 다중 관계 테이블을 도입하는 순간 **3항목이 동시에 실 요구로 전환**된다. **단일 컬럼 확장으로 §4.6 을 닫으려는 시도 금지.**
- 🔴 **15번(Manager Eligibility)은 현행 결함의 정반대를 요구한다.** 현행은 **Manager 라는 이유만으로 Approval Authority 자동 부여**(`UserAuth.php:1064`·`TeamPermissions.php:136`)다. §61 배선 시 **이 자동 상속 경로를 끊지 않으면** 적격 판정이 **장식**이 된다. 🔴 규칙 10 주의: `Mapping::approve` 가 Manager 권한 자동상속을 **안 하는 것은 §29 준수가 아니라 상속할 Manager 관계가 없어서**다.
- 🔴 **18·20번은 강등 경로 신설이 선결.** `promoteManager:768-776` 에 **강등이 없어** 전임자가 `team_role='manager'` 를 유지한 채 위임 권한(`isManagerAdmin:136`·`putMemberPermissions:618`)을 계속 보유한다 → **Acting/Interim 을 얹으면 "전·현임 동시 권한 보유"가 즉시 실현**된다. **§61 검증 이전에 상태 전이(승격↔강등)가 원자적이어야 한다.**
- 🔴 **22번 hash chain: `AdminMenu.php:128` 알고리즘만 이식 · 스키마 복제 금지** — **`menu_audit_log` 에 `tenant_id` 없음** · **`lastHash():214-219` 에 tenant 술어 없음** → 테넌트별 체인 시 **`WHERE tenant_id=?` 필수**. 스키마 축 선례는 **`pm_audit_log`**(migration `20260526_168_008:7` `tenant_id NOT NULL` · `diff_json :13` · 3인덱스 `:17-19` · append-only 주석 `:2-3`).
- 🔴 **23번: `AgencyPortal.php:304`·`:381` 의 `revoked_at=NULL` 소거 패턴 복제 절대 금지** — §55 "과거 Snapshot 대체 금지"의 정면 반례다. 🔴 **`pm_baseline.captured_at` 도 선례 금지** — DB 컬럼이 아니라 `snapshot_json` **내부 JSON 키**(`backend/src/Handlers/PM/Enterprise.php:360` · DDL 은 `created_at` `:55`/`:62`) → **인덱스 불가·as-of 질의 불가**(`KV_ONLY`). `approvals_json`(`Mapping.php:285` `{user, ts}` 2키 JSON 배열)도 동형.
- **회귀 커버리지 0 — 배선 시 신설 의무.** `tools/e2e/render.mjs:37` 이 `/team`·`/team-members`·`/user-management` 를 포함하나 **마운트 크래시만 검사**(`:17` 스스로 한계 자인). 🔴 **`smoke.mjs:84` `keys:['team','roas']` 는 Meta Ads 캠페인 계약키**(조직 team 아님 — 이름 함정) · `scenarios.mjs` 매니저 0.
- 🔴 **가드 등급 주의**: pre-commit 은 **`WIRED(로컬)`**(`core.hooksPath`=`.githooks` 는 본 클론만 · 신규 클론 기본 미설정 · `--no-verify` 우회 가능) → **보장 아님**. **`ENFORCED(예방)` = 현행 부재**(브랜치 보호+required check 미설정 G-06b) → §61 을 "CI 가 막아준다"로 닫으면 미충족.
