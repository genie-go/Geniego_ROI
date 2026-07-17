# DSAR — Organization Hierarchy 최소 Static Lint (§58)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §58 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

### ★정직 등급 — 전건 `CONTRACT_ONLY`

**조직 도메인 실 코드 0 → 28종 Lint 는 전건 `CONTRACT_ONLY`(계약만 · 실코드 0).** 이는 5-3-1(Lint 19 + Guard 30)·5-3-2(Lint 28 + Guard 37)가 **전부 `CONTRACT_ONLY` 였던 것의 연장**이며, 3개 블록 누적 **Lint 75 + Guard 91 = 166종 전건 계약만**이다. 🔴 **이 문서를 "린트 명세 완비"로 읽지 마라 — 집행체 0이다.**

### ★등급 어휘 3단 (신설 Lint 를 어디에 배치할지의 정확한 어휘)

| 등급 | 정의 | 현행 실측 자산 | 한계 |
|---|---|---|---|
| `WIRED(pre-commit·로컬)` | 커밋 전 로컬 훅 | `.githooks/pre-commit`(13,606 B · 실행권한 O) · `.githooks/baseline.json` | ★**`core.hooksPath` 는 클론별 로컬 설정**. 본 작업 클론에서는 `git config core.hooksPath` = `.githooks` **설정 확인됨** — 그러나 **미설정 클론(신규 clone 기본값)에서는 미실행**. 개발자가 `--no-verify` 로 우회 가능. **집행 보장 아님.** |
| `WIRED(CI·탐지)` | CI 잡에서 탐지·보고 | `.github/workflows/security-scan.yml` `repo-guards` 잡(`:57`·`runs-on :59`) · push+PR+schedule+dispatch 트리거(`:33-40`) · **규칙 SSOT = `tools/scan_secrets.sh`**(`:70` 주석 *"pre-commit 과 같은 스크립트"* · 호출 `:82` `bash tools/scan_secrets.sh --range`) | 🔴 **정규식을 CI YAML 로 복사 금지** — SSOT 이원화. 스크립트 호출만 하라. |
| 🔴 `ENFORCED(예방)` | 위반이 **머지될 수 없음** | ★**현행 레포에 이 등급이 없다.** 브랜치 보호 + required status check **미설정**(G-06b) | → `repo-guards` 는 **빨간 X 를 남길 뿐 머지를 막지 않는다. 탐지일 뿐 예방이 아니다.** |

🔴 **§58 원문의 "차단하라"는 현행 레포에서 미충족이다.** 28종 전부를 `WIRED(CI·탐지)` 로 구현해도 원문이 요구하는 **차단(prevention)** 에 도달하지 못한다. **원문 충족의 선결조건 = 브랜치 보호 + required check(G-06b) 설정**이며, 이는 코드가 아니라 **레포 설정 작업**이다.

### 조직 도메인 Lint 대상 자산 실측

| 항목 | 실측 | 판정 |
|---|---|---|
| Organization Unit / Type / Version | `organization_unit`·`org_unit`·`hierarch` **grep 0** | `ABSENT` |
| Tenant 컬럼 관례 | 도메인 테이블 대다수 `tenant_id` 보유 · ★**`menu_tree` 는 tenant 없음**(`AdminMenu.php:108-117`, 전역 단일 트리) · `channel_registry` 도 tenant 없음(`ChannelRegistry.php:32-49`) | 선례 혼재 — 조직은 tenant 필수 |
| Self-loop / Cycle 차단 선례 | ★**`PM/Dependencies`**: self-loop `:29-31` · 반복 DFS+visited+tenant+깊이 10000 `:79-100` · **쓰기 전 422 차단** `:32-34` · **`menu_tree`**: `wouldCycle(:540-555)` 자기참조 즉시 차단 `:542` + `$depth<100` 하드캡 `:545` · 이동 시 검사 후 UPDATE `:487-503` | `LEGACY_ADAPTER` — 런타임 가드이지 **Static Lint 아님** |
| Path Index | Closure/Nested Set(`lft`/`rgt`)/Path 컬럼 **0** | `ABSENT` |
| Hierarchy Version Hash | immutable hash 선례 = `schema_migrations.checksum`(`Migrate.php:50` `hash('sha256',$sql)`) · 해시체인 = `menu_audit_log.hash_chain`(`AdminMenu.php:128`) — **조직 도메인 0** | `ABSENT` |
| Snapshot 불변 | `menu_defaults`(`AdminMenu.php:120`) **immutable_hash 없음** · `pm_baseline`(`PM\Enterprise.php:55`) | `PARTIAL` — 스냅샷은 있으나 불변성 강제 없음 |
| 이름 기반 Join | ★**실사례 존재**: `seedOrg` 가 **동명 skip 으로 멱등**(`TeamPermissions.php:725-753`) · `sso_group_role_map` 은 **그룹이 엔티티가 아니라 평문 문자열**(`EnterpriseAuth.php:70`·`:84` `group_name IN (?)`) | 🔴 **현행 관례가 §58 #27 위반 방향** |
| 중복 Registry 생성 | `seedOrg` 동명 skip=멱등·트랜잭션·감사(`:747`) | `PARTIAL` — 멱등은 있으나 Lint 아님 |

## 1. 원문 전사 + 판정 — **원문 28종**

원문(§58) 전제: *"이번 블록에서는 다음을 차단하라."*

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Tenant 없는 Organization Unit | Unit 부재 · ⚠️선례 혼재(`menu_tree`·`channel_registry` 는 tenant 없는 전역 테이블) | `CONTRACT_ONLY` |
| 2 | Organization Type 없는 Unit | Type 부재. `TEAM_TYPES` 17종(`TeamPermissions.php:44-49`)은 **평면 문자열 카탈로그** | `CONTRACT_ONLY` |
| 3 | Active Version 없는 Active Unit | 엔티티 `version` = `menu_defaults.version` 1건뿐 · optimistic lock `version` grep 0 | `CONTRACT_ONLY` |
| 4 | Active Hierarchy에 Root 없음 | Hierarchy 부재. `menu_tree` root = `parent_id IS NULL` 암묵(`:272` `ORDER BY COALESCE(parent_id,"")`) — 검증 없음 | `CONTRACT_ONLY` |
| 5 | 허용되지 않은 Multiple Root | 동상 · Multiple Root 허용 정책 개념 자체가 부재 | `CONTRACT_ONLY` |
| 6 | Self-loop Edge | 조직 엣지 부재 · 런타임 선례 실재(`PM/Dependencies.php:29-31`·`AdminMenu.php:542`) — **정적 검사는 0** | `CONTRACT_ONLY` |
| 7 | 금지된 Cycle | 동상 · `graph_edge`(`Db.php:816-839`)는 **순환 방어 없음** | `CONTRACT_ONLY` |
| 8 | Source·Target 없는 Edge | `graph_edge` 는 `src_type`/`src_id`→`dst_type`/`dst_id` 보유하나 **NOT NULL 강제·정적 검사 미확인** · 조직 엣지 부재 | `CONTRACT_ONLY` |
| 9 | Cross-Tenant Edge | 조직 엣지 부재. `graph_edge` 는 tenant_id 보유하나 **행 내 src/dst tenant 일치 검사 없음**(단일 tenant 컬럼) | `CONTRACT_ONLY` |
| 10 | Cross-Tenant Membership | Membership 부재 | `CONTRACT_ONLY` |
| 11 | 다른 Tenant Workspace Binding | Workspace 부재 | `CONTRACT_ONLY` |
| 12 | Legal Entity 없는 Financial Unit | 양쪽 부재 | `CONTRACT_ONLY` |
| 13 | 중첩된 Primary Parent | Primary Parent 부재 · `app_user.parent_user_id` 는 **nullable 단일 컬럼**(다중 표현 불가) | `CONTRACT_ONLY` |
| 14 | 중첩된 Primary Legal Entity | Legal Entity 부재 | `CONTRACT_ONLY` |
| 15 | 종료된 Node에 Active Edge | 종료 상태·조직 엣지 부재 | `CONTRACT_ONLY` |
| 16 | 종료된 Unit에 Active Membership | 양쪽 부재 | `CONTRACT_ONLY` |
| 17 | 유효기간 없는 Temporary Unit | Temporary Unit·유효기간 부재 · ★`effective_to`/`valid_to` **grep 0** → 폐구간 모델 자체가 신규 | `CONTRACT_ONLY` |
| 18 | Effective Period가 역전됨 | 폐구간 부재(시작만 있는 `kr_fee_rule.effective_from` `Db.php:898` 1건) → **역전 판정 불가** | `CONTRACT_ONLY` |
| 19 | Parent·Child Type Constraint 위반 | Type·Constraint 양쪽 부재 | `CONTRACT_ONLY` |
| 20 | Maximum Depth 초과 | 조직 부재 · 런타임 깊이캡 선례(`PM/Dependencies` 10000 · `AdminMenu.php:545` 100 · `ChannelSync.php:954-963` guard<10) — **값 3종 불일치 · 정적 검사 0** | `CONTRACT_ONLY` |
| 21 | Orphan Node | 조직 부재 · ⚠️레포에 고아 실사례 존재(`PolicyTreeEditor.jsx` import 0) — 다른 축 | `CONTRACT_ONLY` |
| 22 | Unreachable Node | 조직 부재 | `CONTRACT_ONLY` |
| 23 | Path Index 누락 | Path Index 부재 | `CONTRACT_ONLY` |
| 24 | Hierarchy Version Hash 누락 | Hierarchy Version 부재. 해시 선례 = `schema_migrations.checksum`·`menu_audit_log.hash_chain` | `CONTRACT_ONLY` |
| 25 | Active Version 직접 수정 | 버전 부재 · 🔴**현행 관례가 정반대**: `menu_defaults` 최신 1건 조회(`:584-590`) · `kr_fee_rule` 최신승(`Pnl.php:454`) · `updated_at` 덮어쓰기 | `CONTRACT_ONLY` |
| 26 | Snapshot 직접 수정 | `menu_defaults`·`pm_baseline` 에 **immutable_hash·수정 차단 없음** | `CONTRACT_ONLY` |
| 27 | Organization 이름 기반 Join | 🔴**현행 관례가 위반 방향**: `seedOrg` 동명 skip(`:725-753`) · `sso_group_role_map.group_name` 평문 문자열 룩업(`EnterpriseAuth.php:84`) · `team` UNIQUE 키가 이름 기반 | `CONTRACT_ONLY`(관례 역행 경고) |
| 28 | 기존 Organization Registry 중복 생성 | Registry 부재. `ORG_PRESET`+`seedOrg` 는 실배선(`routes.php:1589`·`:2570`) → **두 번째 레지스트리 신설이 이 Lint 의 1호 대상** | `CONTRACT_ONLY` |

**실측 개수: 28 / 28 전사.** 판정 = **`CONTRACT_ONLY` 28 / 28.** **`WIRED` 0 · `ENFORCED` 0 · 커버(`VALIDATED_LEGACY`) 0.**

## 2. 규칙

- 🔴 **28종 전건 `CONTRACT_ONLY` — 집행체 0.** 5-3-1(19)·5-3-2(28)에 이어 3개 블록 연속 동일. **"명세 완비 = 린트 작동"으로 읽으면 가짜 녹색**이다(288차 systemic 사례와 동형).
- 🔴 **`ENFORCED(예방)` 등급을 참칭 금지.** 신설 Lint 를 `repo-guards` 에 넣어도 등급은 **`WIRED(CI·탐지)`** 다. **`ENFORCED` 를 주장하려면 브랜치 보호 + required status check(G-06b) 설정이 선결**이며, 그 전까지 §58 원문의 "차단하라"는 **미충족**으로 명시하라.
- 🔴 **규칙 SSOT 이원화 금지.** `tools/scan_secrets.sh` 패턴을 따라 **스크립트 1벌 + pre-commit/CI 양쪽이 호출**. **정규식을 `security-scan.yml` 로 복사하지 마라**(`:70` 주석이 SSOT 를 명시).
- **`WIRED(pre-commit·로컬)` 를 방어선으로 계산 금지.** `core.hooksPath` 는 **클론별 로컬 설정**(본 클론엔 설정됨 · 신규 클론 기본 미설정) + `--no-verify` 우회 가능 → **보조 수단**.
- 🔴 **런타임 가드를 Static Lint 로 계산 금지**(#6/#7/#20). `PM/Dependencies`·`menu_tree.wouldCycle` 는 **요청 시점 검사**다. §59(Runtime Guard)의 자산이지 §58 커버가 아니다. **대칭 오류 금지 — 능력 존재 ≠ 요구 충족.**
- **#20 깊이캡 값 통일 선결**: 현행 3종 불일치(10000 / 100 / 10). 조직 도입 시 **Maximum Depth 상수 SSOT 1벌**을 정하라 — 5-3-2 "백오프 3공식"·"타임존 3벌"·16번 `isDemo` 12벌과 **동형 = 술어 SSOT 부재**의 재발 방지.
- 🔴 **#25/#27 은 "미래 위반"이 아니라 현행 관례가 이미 그 방향이다.** 최신승 덮어쓰기(`Pnl.php:454`·`AdminMenu.php:584-590`)와 이름 기반 멱등(`seedOrg`·`sso_group_role_map`)을 **조직 도메인에 답습하면 Lint 는 설계 시점에 이미 실패**한다.
- 🔴 **#28 자기적용**: 이 Lint 자신이 **`ORG_PRESET`/`seedOrg` 를 폐기하고 새 레지스트리를 만드는 행위**를 막아야 한다. 정본 = **기존 확장**(`team` 에 구조 링크 추가), 신설 금지.
- **마이그레이션 제약 상속**: `backend/migrations/` **172차 정지** → 조직 스키마 DDL Lint 는 마이그레이션 파일이 아니라 **`ensureTables` 코드**를 대상으로 삼아야 한다. 또한 **MySQL/SQLite 두 방언 수기 중복**(`CRM.php:48` vs `:77`) → **양쪽 동시 검사 의무**.
