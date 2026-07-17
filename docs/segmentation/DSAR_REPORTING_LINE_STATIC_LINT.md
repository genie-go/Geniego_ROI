# DSAR — 최소 Static Lint (§69)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §69 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### ★정직 등급 — **24종 전건 `CONTRACT_ONLY`**

Manager 도메인 **실 코드 0**. 아래 24종은 **계약 명세일 뿐 오늘 아무것도 차단하지 않는다.**

**누적 집계 — 네 블록 연속 실 코드 0**

| 블록 | Lint | Guard | 소계 |
|---|---:|---:|---:|
| 5-3-1 (Organization) | 19 | 30 | 49 |
| 5-3-2 (Approval Workflow) | 28 | 37 | 65 |
| 5-3-3-1 (Organization Hierarchy) | 28 | 24 | 52 |
| **누적 (3블록)** | **75** | **91** | **166** |
| **5-3-3-2 (본 블록)** | **24** | **25**(§70) | **49** |
| **누적 (4블록)** | **99** | **116** | **215** |

🔴 **166종 전건 계약만 → 본 블록 49종을 더해 215종 · 네 블록 연속 실 코드 0.** `ORGANIZATION_*` backend 전역 grep **0** · ADR §2 가 *"실 코드·테이블·노드 = 0건 · 계약 명세 확정"* 자인. **문서 존재를 구현 존재로 계산하면 역산이다**(규칙 8).

### ★등급 어휘 3단 — **원문 "차단하라"는 미충족**

| 등급 | 실체 | 실측 |
|---|---|---|
| `WIRED(pre-commit·로컬)` | `.githooks/pre-commit` | ★`core.hooksPath` = `.githooks` — **본 클론에는 설정됨**(`git config --get core.hooksPath` 실측) · **신규 클론 기본 미설정** · `--no-verify` 우회 가능 → **보장 아님** |
| `WIRED(CI·탐지)` | `security-scan.yml` `repo-guards` 잡(`:57`) | 규칙 SSOT = **`tools/scan_secrets.sh`**(`:70` 주석 *"pre-commit 과 같은 스크립트"* · 호출 `:82`) — 🔴**정규식을 CI 로 복사 금지**(SSOT 이원화) |
| 🔴 `ENFORCED(예방)` | **현행 레포에 없음** | 브랜치 보호 + required check **미설정**(G-06b) → CI 가 빨개도 **머지 가능** |

🔴 **§69 원문의 "차단하라"(block)는 `ENFORCED(예방)` 을 요구한다. 현행 최고 등급은 `WIRED(CI·탐지)` = 사후 탐지다.** Lint 24종을 구현하더라도 **브랜치 보호가 없으면 "차단"이 아니라 "경고"**다. **Lint 작성 ≠ 차단 달성 — 이 둘을 같은 완료로 계산하면 가짜 녹색이다.**

### 인접 실측 (Lint 대상 축의 현행 부재 증명)

- `manager_id`·`reports_to`·`supervisor_id`·`acting`·`vacan`·`deputy` **전부 0** · git 삭제 이력 **0**
- `team.manager_user_id` = **팀당 1칸 · nullable · effective date 0 · 이력 0**(DDL `TeamPermissions.php:148` MySQL / `:168` SQLite · `parent_team_id` 없음 → **팀 트리 자체가 없다**)
- `team.team_type VARCHAR(48)` **무검증 대입**(`createTeam:461`) — ENUM/CHECK/`in_array` **0**

## 1. 원문 전사 + 판정 — **원문 24종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Tenant 없는 Manager Relationship | Relationship 축 0. ⚠️선례 경고: **`menu_audit_log`·`menu_tree` 에 `tenant_id` 없음** · `admin_growth_approval` 에도 **없음**(`AdminGrowth.php:142-149`) → **테넌트 누락은 이 레포의 재발 패턴** | `CONTRACT_ONLY` |
| 2 | Relationship Type 없는 Manager Relationship | Type 축 0 — `team.manager_user_id` 는 Type 표현 수단 자체가 없다(§4.6 불가) | `CONTRACT_ONLY` |
| 3 | subordinate·manager 모두 없는 관계 | 관계 엔티티 0 | `CONTRACT_ONLY` |
| 4 | Self-reporting 관계 | 자기참조 검사 선례 = `Dependencies.php:29-31`(self-loop 422) — **PM 도메인 · 이식 가능한 알고리즘** | `CONTRACT_ONLY` |
| 5 | 금지된 Circular Reporting | 순환탐지 선례 = `Handlers/PM/Dependencies.php:79-100`(반복형 DFS + `$visited` + tenant 필터 `:91` + **쓰기 전 차단 `:32-34`** 422 `cycle_detected`) — ★**경로 접두 `backend/src/Handlers/PM/`**(`backend/src/PM/` 는 존재하지 않는다) | `CONTRACT_ONLY` |
| 6 | 동일 기간 Primary Direct Manager 중복 | **기간 축 0** → 중복 판정 불가. `manager_user_id` 단일 칸은 **우연한 1개**(규칙 10) | `CONTRACT_ONLY` |
| 7 | 동일 기간 Primary Position Supervisor 중복 | Position·Supervisor 축 0 | `CONTRACT_ONLY` |
| 8 | Effective Period 역전 | `effective_from` 선례 = `kr_fee_rule.effective_from`(`Db.php:898`) — 🔴**컬럼 有·질의 無**(`WHERE effective_from <= :as_of` **전역 0**) · `effective_to` **grep 0** → 역전 검사 대상 자체가 없다 | `CONTRACT_ONLY` |
| 9 | Acting Manager 종료일 누락 | Acting 축 0. 🔴**`UserAdmin::impersonate:466-525` 를 Acting 선례로 계산 금지** — 주석이 "대행"을 6회 쓰나 **권한 대행이 아니라 신원 위장 열람** | `CONTRACT_ONLY` |
| 10 | Temporary Manager 종료일 누락 | Temporary 축 0 | `CONTRACT_ONLY` |
| 11 | Interim Manager Vacancy Reference 누락 | Interim·Vacancy 양축 0(`interim` 1건 = `AttributionEngine.php:672` 지오리프트 중간결과) | `CONTRACT_ONLY` |
| 12 | Co-manager Policy 누락 | Co-manager 축 0 · 단일 컬럼이라 복수 표현 불가 | `CONTRACT_ONLY` |
| 13 | Cross-Tenant 일반 Manager 관계 | 관계 축 0. ⚠️**tenant 검증 선례는 실재**: `createTeam:464` 가 manager 의 테넌트 소속을 검증하고 **422** 반환 → **이식 가능한 유일한 실 게이트** | `CONTRACT_ONLY` |
| 14 | 허용 근거 없는 Cross-Legal-Entity 관계 | **Legal Entity 축 0**(`ceo_name` = `app_user` 프로필 평문 문자열 `UserAuth.php:306-307` · FK·감독관계 전무) · **`DATA_SCOPES 'company'` = 무제한 센티넬이지 법인 아님** | `CONTRACT_ONLY` |
| 15 | 종료된 Manager Subject | 고용 종료 개념 0 · 🔴`is_active` = **계정 상태**(base DDL `Db.php:1106`)이지 고용 상태 아님 | `CONTRACT_ONLY` |
| 16 | 종료된 Manager Position | Position 축 0(`position_idx` = **PM 태스크 정렬순서** — 이름 함정) | `CONTRACT_ONLY` |
| 17 | Vacant Position의 Incumbent 사용 | 🔴 **§68 #10 과 짝** — 오늘 **`PARTIAL` 로 실재하는 결함**(`promoteManager:768-776` 강등 경로 0)이나, **Lint 로 잡을 대상(Position 엔티티)이 없어** 정적 검사로는 표현 불가 | `CONTRACT_ONLY` |
| 18 | Active Reporting Line Version 직접 수정 | Version 축 0 · **immutability 강제 선례 0**(`schema_migrations.checksum` `Migrate.php:50` 은 DDL 축) | `CONTRACT_ONLY` |
| 19 | Manager Relationship History 덮어쓰기 | 🔴 **덮어쓰기 성향이 실재하는 축** — `AgencyPortal.php:304`·`:381` 이 `revoked_at=NULL` 로 **이전 해지 시각을 물리 소거** = §55 정면 반례. **신설 시 재현 위험 High** | `CONTRACT_ONLY` |
| 20 | Reporting Line Snapshot 직접 수정 | Snapshot 축 0. ★검색 오염 주의: `snapshot` grep **최다 히트가 CCTV JPEG 프레임**(`routes.php:271`·`WmsCctv.php:45`) · `pm_baseline.captured_at` 은 **DB 컬럼이 아니라 `snapshot_json` 내부 JSON 키**(`Handlers/PM/Enterprise.php:360`) → **인덱스·as-of 질의 불가** | `CONTRACT_ONLY` |
| 21 | Source Priority 누락 | **정렬할 소스가 0개** — HRIS/ERP/Directory/IdP/SCIM manager 전부 `ABSENT` · `sso_config` DDL(`EnterpriseAuth.php:45-54`) = `email_attr`·`name_attr` **2슬롯뿐 · `manager_attr` 없음** | `CONTRACT_ONLY` |
| 22 | 승인 경로 적격성 없는 Manager를 Approval Candidate로 사용 | 🔴 **Candidate 계산 코드가 레포에 없다**(`resolveApprover`/`approval_chain`/`routeApproval` grep 0 · `approver` 2건은 **에러 메시지 문자열** `Mapping.php:248`,`:280`) · 승인 4경로 전량 **"호출자가 곧 승인자"** | `CONTRACT_ONLY` |
| 23 | 이름·이메일 기반 Manager Join | ⚠️**이 패턴이 실재하는 인접 축**: `wms_warehouses.manager VARCHAR(120)`(`Wms.php:62`/`:112` · 쓰기 `:290`,`:299`,`:313`) = **자유텍스트 · FK 0 · 판독 술어 0** → `NAME_ONLY`. `pm_projects.owner_user_id` 도 **무검증 자유문자열**(`Projects.php:112-117` `validId()` 없음 · `app_user` FK 없음) | `CONTRACT_ONLY` |
| 24 | 기존 Manager Registry 중복 생성 | Registry 0 → 중복 대상 0. 🔴**단 "중복 없음"을 정합의 증거로 읽지 마라**(규칙 9) — 축의 부재다 | `CONTRACT_ONLY` |

**실측 개수: 24 / 24 전사.**
측정기 분모 **24** · 원문 대조 **24** · 전사 **24** — **3자 일치.**
판정 분포: **`CONTRACT_ONLY` 24 / 24 (100%)** — **실 코드 0.**

## 2. 규칙

- 🔴 **24종 전건 `CONTRACT_ONLY`.** 이 문서는 **오늘 아무것도 차단하지 않는다.** 어떤 보고서도 "Lint 24종 확보"를 **차단 능력 확보**로 계산해서는 안 된다.
- 🔴 **"차단"을 주장하려면 `ENFORCED(예방)` 이 선결이다.** 현행 최고 등급은 `WIRED(CI·탐지)`(`security-scan.yml:57` `repo-guards`)이며, **브랜치 보호 + required check 미설정(G-06b)** 상태에서는 CI 실패가 머지를 막지 못한다. **Lint 신설 ≠ 원문 준수.**
- 🔴 **pre-commit 을 보장으로 계산 금지.** `core.hooksPath=.githooks` 는 **본 클론에만 설정**돼 있고, 신규 클론은 기본 미설정이며, `--no-verify` 로 우회된다.
- 🔴 **규칙 SSOT 이원화 금지.** 신규 Lint 규칙은 **`tools/scan_secrets.sh` 패턴**을 따라 **스크립트 1벌을 pre-commit·CI 양쪽이 호출**하게 하라. 정규식을 워크플로 YAML 에 복사하는 순간 두 벌이 갈라진다.
- **#5 순환 Lint 의 참조 구현은 `backend/src/Handlers/PM/Dependencies.php:79-100` 하나뿐이다.** 나머지 3건은 전부 미달: `AdminMenu::wouldCycle:540-555`(`$visited` 없음) · `JourneyBuilder:511-518`(런타임 탐지이지 쓰기 전 차단 아님) · 🔴**`ChannelSync.php:955-962` 는 순환 검출기가 아니다**(깊이만 자름 → 순환 시 **조용히 절단**) — **후보 계산 금지**.
  - 🔴 **`pm_task_dependencies` 스키마 복제 금지** — `:90-91` 이 `dep_type` 을 술어에 넣지 않아 **전 타입 무차별 순회**한다. 이 결함을 물려받으면 **§11 Manager Type 27종별 순환정책이 설계 시점에 이미 불가능**해진다. **알고리즘만 이식하고 스키마는 새로 설계하라.**
- **#13 의 유일한 실 선례 = `createTeam:464`**(manager 테넌트 소속 검증 → 422). Cross-Tenant Lint 는 이 게이트를 **확장**하라(신설 금지).
- 🔴 **본 문서는 코드변경 0.** 실 Lint 구현·브랜치 보호 설정은 **별도 승인세션**.
