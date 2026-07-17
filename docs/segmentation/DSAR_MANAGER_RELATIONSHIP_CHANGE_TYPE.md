# DSAR — Manager Relationship Change Type (§14)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §14(816-830) · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

> **분할 고지(규칙 3)**: 측정기 §14 분모 = **32**(필수 필드 19 + Change Type 13). 본 편은 **Change Type 13종**만 전사한다. 필수 필드 19종은 [DSAR_MANAGER_RELATIONSHIP_VERSION.md](DSAR_MANAGER_RELATIONSHIP_VERSION.md). **19 + 13 = 32 로 측정기와 일치.**

## 0. 현행 실측 (file:line)

### 대전제 — **13종 전부 `CONTRACT_ONLY`. 이유는 두 겹이다.**

1. **변경을 기록할 버전 엔티티가 없다** — `effective_to`·`valid_to`·`valid_from` **grep 0**(★`valid_to` 유일 히트 `Onsite.php:396` 은 `'invalid_token'` **부분일치 위양성**) · optimistic lock `version` **grep 0** · `previous_version_id` **0**.
2. **변경될 관계 엔티티 자체가 없다**(§13) — `manager_id`·`reports_to`·`supervisor_id`·`acting`·`vacan`·`deputy` **전부 0** · **git 삭제 이력 0** → **팬텀도 유물도 아니다 — 존재한 적이 없다.**

🔴 **`ensureTables` 는 백필을 하지 않는다** — `CREATE TABLE IF NOT EXISTS` + `try{ALTER}catch{}` 뿐. **`backend/migrations/` 는 172차 정지**(21파일) → 신규 스키마의 마이그레이션 경로 없음. **⇒ 아래 13종 중 어느 것도 "과거 데이터를 소급 분류"하는 수단을 갖지 못한다.**

### ★현행에서 실제로 "일어나는" 변경 = **기록 없이 덮어쓰기**

| 현행 행위 | 코드 | 기록되는 변경 유형 |
|---|---|---|
| 팀 매니저 지정 | `TeamPermissions.php:463-469`(검증 `:464` 422 → INSERT `:466` → `promoteManager:469`) | **없음** — `team_create` 감사로그 문자열뿐(`:470`) |
| 팀 매니저 **교체** | `:492-495` → UPDATE `:500` → `promoteManager:501` | **없음** — 🔴**전임자 강등 없음**(§76 실사례 1) · 감사로그는 `'manager'` **한 단어**(`:495` `$changes[] = 'manager'`) — **누가→누구로인지 없다** |
| 팀 매니저 **해제**(공석) | `:492-495` (`$newMgr = null`) | **없음** — 🔴**`:501` 이 `$newMgr !== null` 일 때만 호출** → **강등 경로 0** → 전임자 `team_role='manager'` **잔존**(§76 실사례 2) |

★**규칙 10 적중**: 위 3행이 Change Type 을 **"기록하지 않는" 것은 정책이 아니라 기록할 자리가 없어서**다.

## 1. 원문 전사 + 판정 — **원문 13종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | INITIAL | 최초 버전 개념 0 · `menu_defaults.version` 은 🔴리터럴 `'baseline'` 고정 = **버전이 아니라 라벨**(`AdminMenu.php:309`) → **선례로 인용 금지** | `CONTRACT_ONLY` |
| 2 | MANAGER_CHANGE | 🔴**교체는 실재하나 변경 유형이 기록되지 않는다** — `TeamPermissions.php:492-495`·UPDATE `:500` · 감사로그 `$changes[] = 'manager'`(`:495`) = **한 단어 · 이전/이후 값 없음** | `CONTRACT_ONLY` |
| 3 | TYPE_CHANGE | §11 Manager Type 27종 표현 수단 0 · `team.team_type VARCHAR(48)` 은 **무검증 대입**(`createTeam:461`)이며 **팀 유형이지 관계 유형 아님** | `CONTRACT_ONLY` |
| 4 | SCOPE_CHANGE | `data_scope` **`UNIQUE(tenant_id,subject_type,subject_id)`(`TeamPermissions.php:164`) = 단일행이 스키마로 강제** → scope 변경 이력 표현 불가(규칙 10 — 정책이 아니라 UNIQUE 가 금지) | `CONTRACT_ONLY` |
| 5 | PRIORITY_CHANGE | 🔴**Priority 축 자체가 0** — `team.manager_user_id` 는 **팀당 1칸**(`:148`) → 우선순위를 매길 복수 관계가 애초에 없다 | `CONTRACT_ONLY` |
| 6 | ACTING_ASSIGNMENT | 🔴**`acting` grep 0** · 🔴**`UserAdmin::impersonate:466-525` 를 여기 매핑 금지** — 주석이 **"대행"을 6회**(`:466`,`:492`,`:525`) 쓰지만 **권한 대행이 아니라 신원 위장 열람**(관리자 2시간 토큰 `:492` · 관리자 계정 대행 차단 `:487`) · 기간부 Assignment·original manager 참조·covered scope **전무** | `CONTRACT_ONLY` |
| 7 | TEMPORARY_ASSIGNMENT | 🔴**`interim` 1건 = 지오리프트 중간결과**(`AttributionEngine.php:672` `$rj['interim']`) · `deputy`/`substitute`/`stand_in` **0** · 기간부 배정 축 0 | `CONTRACT_ONLY` |
| 8 | RESTORATION | 복원 대상(이전 버전)이 0 · 🔴**`AgencyPortal.php:304`·`:381` 이 `revoked_at=NULL` 로 이력을 소거** = **§55 정면 반례이지 복원 아님** | `CONTRACT_ONLY` |
| 9 | CORRECTION | 🔴**§40 Retroactive Correction 집행 수단 부재** — `ensureTables` **백필 안 함** · `backend/migrations/` **172차 정지** · 🔴`Migrate` 이름 겹침(**DDL 적용기이지 도메인 데이터 이행기가 아니다**) | `CONTRACT_ONLY` |
| 10 | TRANSFER | 소속 이동 이력 0 — `app_user.team_id` **단일 컬럼 = 1인 1팀**(이력·유효기간 0) · `promoteManager:774` 가 `team_id` 를 **덮어쓸 뿐**(이전 소속 소멸) | `CONTRACT_ONLY` |
| 11 | REORGANIZATION | 🔴**팀 트리 자체가 없다** — `team` DDL 에 **`parent_team_id` 없음**(`:146-150`) · `ORG_PRESET` 은 **열거+시딩이며 계층 링크 0** · ★`seedOrg:739` INSERT 컬럼 8개에 `manager_user_id` **부재** → **시드 15팀 전부 manager NULL** | `CONTRACT_ONLY` |
| 12 | TERMINATION | 🔴**`is_active` = 계정 상태이지 고용 상태가 아니다**(base DDL `Db.php:1106` · 소비처 전부 **인증 게이트** `UserAuth.php:248`,`:805`,`:2455`) · `terminated`·`deleted_at` **전역 0** · 관계 종료 축 0 | `CONTRACT_ONLY` |
| 13 | MIGRATION | 이행 출처가 0 — **manager 데이터를 싣는 외부 소스 0개**(SCIM `manager` **전역 0** · `sso_config` DDL `EnterpriseAuth.php:45-54` = `email_attr`·`name_attr` **2슬롯뿐 · `manager_attr` 없음**) → **`VACUOUS` 이전에 무대상** | `CONTRACT_ONLY` |

**실측 개수: 13 / 13 전사** (측정기 §14 분모 32 = 필수 필드 19 + 본 편 13 · **분할 후 합계 일치**).
커버리지 = `CONTRACT_ONLY` 13. **`VALIDATED_LEGACY` 0 — 커버 0종.**

## 2. 규칙

- 🔴 **13종 전부 `CONTRACT_ONLY` 이며 `ABSENT` 가 아니다.** 본 명세가 계약을 선언하나 **실 코드·테이블·집행 0건**이다. 🔴**문서 존재를 구현 존재로 계산하면 역산**(§3.1 18/18 `CONTRACT_ONLY` 와 동형 — `ORGANIZATION_*` backend 전역 grep 0 인데 문서 70편이 존재하는 상황).
- 🔴 **`MANAGER_CHANGE` 를 "현행 `TeamPermissions.php:492-501` 이 이미 한다"로 계산 금지**(규칙 9 — **"중복 없음" ≠ "기능 충족"**). 현행은 **덮어쓰기**이며 ① 변경 유형 없음 ② 이전/이후 값 없음(`$changes[] = 'manager'` 한 단어 `:495`) ③ **전임자 강등 없음** ④ 시점 없음.
- 🔴 **`ACTING_ASSIGNMENT` 에 `UserAdmin::impersonate:466-525` 를 매핑 금지.** 주석의 "대행" 6회는 **신원 위장 열람**이다. **§29 Acting Manager 로 계산하면 심각한 오판.**
  - 🔴 **`대행` 한글 grep 대량 히트도 전부 비즈니스 도메인** — 배송대행/구매대행(`ClaudeAI.php`·`MarketingDataHub.php:115`) · 광고**대행사**(`AdminGrowth.php:871`·`TeamPermissions.php:718` `'외부 대행사'` 팀 프리셋) · 결제**대행**(PG). **직무대리 0건.**
  - 🔴 **`proxy` 7건 전부 HTTP 프록시**(`Connectors.php:3875`,`:3911` · `WmsCctv.php:799` HLS · `AdminMenu.php:21`·`Handlers/PM/Events.php:17` nginx 주석 · `UserAuth.php:3344` `X-Real-IP`).
- 🔴 **`CORRECTION`/`MIGRATION` 설계 시 집행 수단을 먼저 결정하라.** `ensureTables` 는 **백필을 하지 않고**, `backend/migrations/` 는 **172차 정지**다. **"Change Type 컬럼을 넣으면 과거가 분류된다"는 역산.**
- 🔴 **`RESTORATION` 설계에 `AgencyPortal.php:304`·`:381` 패턴 복제 절대 금지** — `revoked_at=NULL` 소거는 **복원이 아니라 이력의 물리적 소멸**이며 **§55 정면 반례**다. Version 행은 **append-only** · `effective_to` **폐쇄**로만 종료하라.
- 🔴 **`REORGANIZATION` 은 팀 트리 부재가 선결**이다. `team` 에 `parent_team_id` 가 **없다** → 조직 계층 자체를 표현 못 한다. 🔴**`ORG_PRESET` 을 계층 근거로 인용 금지**(열거+시딩 · 링크 0 · ★시드는 manager 도 비운다 `:739`).
- 🔴 **`TERMINATION` 에 `is_active` 재사용 금지** — **계정 상태이지 고용 상태가 아니다**. ★**§41 지원 상태 8종 중 표현 가능 2종**(1/0)이며 **`UNKNOWN` 조차 표현 불가**(`NOT NULL DEFAULT 1` → **미지가 자동으로 "가용" = fail-open**). 🔴**`locked_until` ≠ 고용 정지**(`UserAuth.php:3335` = 무차별 대입 스로틀 · 키가 `ident` · 분 단위 자동 해제) · 🔴**`suspend` grep = 말장난 1건**(`WorkspaceState.php:12` **"belt-and-suspenders"**).
  - ★**단 `is_active` 집행은 REAL** — 로그인 차단(`:805`) · 재활성화 우회 방어(`:854-856`) · 비활성 시 **세션 즉시 폐기**(`:1381`·`EnterpriseAuth.php:400`,`:413`) · owner 잠금 방지(`:398`,`:411`). **확장 지점이지 대체물이 아니다.**
- 🔴 13종 **"있다고 가정"하고 배선 금지.**
