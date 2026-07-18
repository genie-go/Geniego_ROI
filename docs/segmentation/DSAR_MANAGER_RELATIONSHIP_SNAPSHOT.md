# DSAR — Manager Relationship Snapshot (§54 · §55 Snapshot 원칙 반영)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §54·§55 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)
> Snapshot Type 축(§54 10종) = [DSAR_MANAGER_RELATIONSHIP_SNAPSHOT_TYPE.md](DSAR_MANAGER_RELATIONSHIP_SNAPSHOT_TYPE.md)

## 0. 현행 실측 (file:line)

### ★대전제 — `Actor Authorization Snapshot` = **`ABSENT`**

**승인 시점의 권한을 동결하는 코드가 0건이다.** `Mapping::approve:238-294` 는 승인 시각(`:285` `gmdate('c')`)과 actor 문자열만 남기고, **그 시점의 권한·조직·관계를 한 바이트도 저장하지 않는다**.

| 항목 | 실측 | 판정 |
|---|---|---|
| `MANAGER_RELATIONSHIP_SNAPSHOT` | **grep 0** | `ABSENT` |
| Actor Authorization Snapshot | **권한 동결 코드 0** | `ABSENT` |
| `approvals_json`(`Mapping.php:285`) | `{user, ts}` **2키 JSON 배열**뿐 | 🔴 **인덱스·as-of 질의 불가** |

### 🔴 ★§54 검색 최우선 오염원 — `snapshot` grep 최다 히트가 **CCTV JPEG 프레임**

| 히트 | 실제 정체 |
|---|---|
| `routes.php:271` `wms/cameras/{id}/snapshot` · `WmsCctv.php:45` | **창고 CCTV 정지영상** — `snapshot` grep 최다 히트 |
| `menu_defaults.snapshot_data`(`AdminMenu.php:120`/`:139`) | 메뉴 트리 기본값 |
| `pm_baseline.snapshot_json`(`PM/Enterprise.php:55`/`:62`) | PM 프로젝트 베이스라인 |

**어느 것도 관계 스냅샷이 아니다.**

### 🔴 ★`pm_baseline.captured_at` 은 **DB 컬럼이 아니다** — 규칙 7(존재증명도 이름이 아니라 능력으로)

- **DDL 실측**(`PM/Enterprise.php:53-55` MySQL / `:62` SQLite): `id`·`tenant_id`·`project_id`·`name`·`bac`·`snapshot_json`·`created_at` — **`captured_at` 컬럼 없음**
- `captured_at` 은 **`snapshot_json` 내부 JSON 키**(`PM/Enterprise.php:360` — `$snapshot = ['captured_at' => self::now(), …]`)
- → **인덱스 불가 · as-of 질의 불가** → **`KV_ONLY`**
- ★`as_of` grep 2건 = **응답 타임스탬프**(`PgSettlement.php:279`·`AttributionEngine.php:666`)이지 as-of 질의 아님

### 🔴 ★§55 "현재 Manager 관계로 과거 Snapshot 대체 금지"의 **정면 반례가 실재한다**

| 반례 | file:line | 동작 |
|---|---|---|
| 재초대 | `AgencyPortal.php:304` | `UPDATE agency_client_link SET status='pending', invited_at=?, **revoked_at=NULL**, …` |
| 재승인 | `AgencyPortal.php:381` | `UPDATE agency_client_link SET status='approved', scope_json=?, approved_at=?, **revoked_at=NULL**, …` |

→ **이전 해지 시각이 소거된다 = 이력 물리적 소멸.** "언제 해지됐었는가"를 복원할 방법이 없다. **현재 상태가 과거를 덮어쓰는 정확한 안티패턴** — §55 항목 2 의 반례이며, **관계 테이블 설계 시 이 패턴 복제 절대 금지**.

### ★`immutable_hash` 선례 — **2건 실재 · ⓑ 브리핑이 지목한 쪽이 열등하다**

| 선례 | tenant_id | **preimage ts 저장 = 검증 가능성**(★진짜 구분축) | 검증기 | 판정 |
|---|---|---|---|---|
| **`security_audit_log`**(`backend/src/SecurityAudit.php:48-52`) | ✅ **있음**(`:49`) · **해시 preimage 에 포함**(`:27`) | ✅ **`created_at` 에 preimage `$now` 를 명시 저장**(`:31`) → `verify()` 가 `:63` 에서 그대로 재계산 | ✅ **`verify():56-68`** — `hash_equals`(`:64`)+`prev_hash` 교차검증(`:64`) · **실 소비자 `AdminGrowth.php:1429`** | ★**정본 선례** |
| `menu_audit_log`(`AdminMenu.php:123-131`) | 🔴 **없음** | 🔴 **미저장** — preimage `'ts'=date('c')`(`:195`)가 INSERT 컬럼목록(`:199-203`)에 **없어** `created_at DB DEFAULT`(`:129`)가 덮음 → **행에서 preimage 재계산 불가** | 🔴 **없음**(`hash_equals` 레포 0히트) | 열등 — **체인 자체는 실재**(`lastHash():216` 이 직전 `hash_chain` 을 `'prev'` `:194` 로 투입)**하나 검증 불가능한 장식** |
| `schema_migrations.checksum`(`Migrate.php:63`) | — | ⚠️ preimage=**디스크의 마이그레이션 파일** → 재계산은 가능하나 **검증기 0**(`:63` 은 INSERT) | 🔴 **없음** | DDL 체크섬(도메인 무관·**층위 상이**) |

🔴 **ⓑ 브리핑 정정** — ⓑ 는 `menu_audit_log.hash_chain` 을 immutable_hash 선례로 지목했으나, **`SecurityAudit` 이 모든 축에서 우월**하다(tenant_id 보유 + **preimage ts 저장** + **실동작 검증기 `verify()`**). ⓑ 는 `SecurityAudit` 을 **언급하지 않았다**. 🔴 **★구분축 정정(10회차)**: 초판이 든 *"prev_hash 컬럼 유무"* 는 **진짜 구분축이 아니다** — `menu_audit_log` 는 전용 컬럼 없이도 `lastHash():216` 으로 체인을 **정상 연결**한다. 두 구현을 가르는 것은 오직 **preimage 타임스탬프를 저장하는가**(→ 재계산·검증 가능성)뿐이다.

🔴 **★`menu_audit_log` 는 검증 자체가 불가능하다**(ⓑ 미지적): 해시 preimage(`AdminMenu.php:183-196`)가 **`'ts' => date('c')`(`:195`)를 포함**하는데, 저장되는 `created_at` 은 **DB `DEFAULT CURRENT_TIMESTAMP`**(`:129`)다 → **다른 시계·다른 포맷** → **행에서 preimage 를 재구성할 수 없다** → `hash_chain` 은 **검증 불가능한 장식**이다. §55 항목 14 "Immutable Hash 검증"의 선례로 삼으면 **가짜 녹색을 상속**한다.

⚠️ **`SecurityAudit` 의 잠복 결함 2건**(등급 미부여 · 이식 시 선결):
1. **`lastHash():38`·`verify():59` 에 tenant 술어 없음** → 체인이 **전 테넌트 전역 단일**. 테넌트별 체인으로 이식하려면 **`WHERE tenant_id=?` 필수**(없으면 A 테넌트 쓰기가 B 테넌트 체인을 이동시킨다).
2. `:31` 이 `actor` 를 **`substr(…,0,190)` 로 잘라 저장**하나 `:27` 해시는 **원본 전체**를 넣는다 → **actor 190자 초과 시 `verify()` 가 영구 실패**. 실 발생 여부 미검증.

## 1. 원문 전사 + 판정 — **원문 27종**(필수 필드)

> ★분모 주의: **측정기 §54 = 37**(불릿 37). 이는 **필수 필드 27 + Snapshot Type 10** 의 합이다. 본 편은 **필수 필드 27** 담당 · Type 10 은 [별편](DSAR_MANAGER_RELATIONSHIP_SNAPSHOT_TYPE.md). **27 + 10 = 37 로 측정기와 정합.**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | manager_relationship_snapshot_id | 부재 | `ABSENT` |
| 2 | snapshot type | 부재 — [별편](DSAR_MANAGER_RELATIONSHIP_SNAPSHOT_TYPE.md) 10종 전량 `ABSENT` | `ABSENT` |
| 3 | tenant | ★**인접 REAL** — `Mapping::tenantId` 가 미들웨어 `auth_tenant`(**위조불가** · `Mapping.php:33` 주석) 사용 · `pm_audit_log.tenant_id NOT NULL`(migration `20260526_168_008:7`) · `security_audit_log.tenant_id`(`SecurityAudit.php:49`) | `LEGACY_ADAPTER` |
| 4 | subordinate subject | 하급자 축 0 · 직원 아이덴티티 = `app_user.id`+`email` 뿐 | `ABSENT` |
| 5 | subordinate position | Position 전역 0 | `ABSENT` |
| 6 | subordinate organization | `ORGANIZATION_*` **backend 전역 grep 0** | `CONTRACT_ONLY` |
| 7 | manager subject | Manager 관계 축 0 · `team.manager_user_id` = **팀당 1칸**(`TeamPermissions.php:148`) · 🔴 **시점·이력 0** | `ABSENT` |
| 8 | manager position | Position 0 | `ABSENT` |
| 9 | manager organization | `ORGANIZATION_*` 0 | `CONTRACT_ONLY` |
| 10 | relationship type | Type 표현 수단 0(§4.6 Type/Priority/Responsibility Scope 전부 불가) | `ABSENT` |
| 11 | relationship version | ★**엔티티 `version` = `menu_defaults.version` 1건**이며 유일 생산자 `AdminMenu.php:309` 가 **리터럴 `'baseline'` 고정 = 버전이 아니라 라벨** · optimistic lock `version` grep 0 | `NAME_ONLY` |
| 12 | reporting line version | 보고선 자체가 0 | `ABSENT` |
| 13 | supervisory hierarchy version | 계층 0(`parent_team_id` 없음) | `ABSENT` |
| 14 | assignment reference | Assignment 0 · 🔴 `UserAdmin::impersonate:466-525` 는 **권한 대행이 아니라 신원 위장 열람**(§29 Acting Manager 로 계산하면 심각한 오판) | `ABSENT` |
| 15 | assignment scope | 인접 = `data_scope` — 🔴 **`UNIQUE(tenant_id,subject_type,subject_id)`(`TeamPermissions.php:164`) = 단일행 스키마 강제**(규칙 10) · 시점 0 | `LEGACY_ADAPTER` |
| 16 | source system | §3.4 외부 소스 **42항목 전량 부재** — HRIS·ERP·Directory 소스 히트 0 · **커넥터 카탈로그 행 0 · fetcher 0 · 정규화 테이블 0** | `ABSENT` |
| 17 | source version | 소스가 0개 → 버전 무대상 | `ABSENT` |
| 18 | legal entity relationship | Legal Entity 0 · `ceo_name` = **프로필 평문 문자열**(`UserAuth.php:306-307`) | `ABSENT` |
| 19 | organization path | Path/Closure Table/Path Prefix **전부 0**(§57 6방식 중 실재 2 = DFS·Topological Sort **둘 다 PM 태스크 도메인**) | `ABSENT` |
| 20 | supervisory path | 상동 · 감독 경로 0 | `ABSENT` |
| 21 | availability state | `on_leave`·`out_of_office`·`vacan`·`acting` **전량 0** · 🔴 `is_active` = **계정 상태**(base DDL `Db.php:1106`)이며 **`NOT NULL DEFAULT 1` → 미지가 자동 "가용" = fail-open** | `ABSENT` |
| 22 | eligibility result | 적격 판정 술어 0 — `Mapping::approve:287` 은 **정족수(숫자)만** | `ABSENT` |
| 23 | effective_at | 🔴 **§38 Business/System Time 이중 시간축 = 전례 0** · `effective_to`/`valid_from`/`valid_to` grep 0 · `kr_fee_rule.effective_from`(`Db.php:898`)은 **컬럼 有·질의 無**(읽기 4개소 전부 최신승 — `Pnl.php:454`·`KrChannel.php:102`,`:151`,`:459`) | `ABSENT` |
| 24 | captured_at | 🔴 **`pm_baseline.captured_at` 은 DB 컬럼이 아니라 `snapshot_json` 내부 JSON 키**(`PM/Enterprise.php:360` · DDL 은 `created_at` `:55`/`:62`) → **인덱스·as-of 질의 불가**(§0) | `KV_ONLY` |
| 25 | immutable_hash | ★**선례 2건** — **`security_audit_log`**(`SecurityAudit.php:27`,`:48-51` · **검증기 `verify():56-68`** · 소비자 `AdminGrowth.php:1429`) **정본** · `menu_audit_log`(`AdminMenu.php:128`) 🔴**tenant_id 없음 + 검증기 없음 + preimage 재구성 불가**(§0) | `LEGACY_ADAPTER` |
| 26 | status | 스냅샷 상태 축 0 | `ABSENT` |
| 27 | evidence | 근거 저장 축 0 · 인접 `pm_audit_log.diff_json`(migration `20260526_168_008:13`)+3인덱스(`:17-19`)+append-only(`:2-3`) | `LEGACY_ADAPTER` |

**실측 개수: 27 / 27 전사.** (측정기 §54 분모 **37** = 필드 27 + Type 10 · 본 편 필드 **27** · 전사 **27** — **분해 후 정합**)
원문이 `evidence` 로 **끝난다**(`:1986`) → 규칙 4 충족.

커버리지 = **`VALIDATED_LEGACY` 0** · `ABSENT` 20 · `LEGACY_ADAPTER` 4(3·15·25·27) · `CONTRACT_ONLY` 2(6·9) · `NAME_ONLY` 1(11) · `KV_ONLY` 1(24).

## 2. 규칙

### §54 구조

- 🔴 **§54 전체 = `ABSENT`.** 27필드 중 **커버 0**. `Actor Authorization Snapshot` 부재는 **승인 감사의 근본 공백**이다 — 현재는 "누가 승인했다"만 남고 **"그가 그때 승인할 자격이 있었는가"를 사후 재구성할 수단이 없다**.
- 🔴 **`approvals_json`(`Mapping.php:285`) 확장으로 §54 를 해결하려 하지 마라.** `{user, ts}` 2키 JSON 배열은 **인덱스·as-of 질의가 원천 불가** — `pm_baseline.captured_at` 과 **정확히 동형의 KV 함정**이다. Snapshot 은 **컬럼을 가진 테이블**이어야 한다.
- 🔴 **`snapshot` grep 결과를 신뢰하지 마라 — 최다 히트가 CCTV JPEG**(`WmsCctv.php:45`). 능력축(시점 컬럼·as-of 질의·불변성)으로만 논증하라.

### §55 Snapshot 원칙 반영 (14항목 · 전량 `ABSENT` — 상세 전사는 본 §1 필드축과 1:1 대응)

- ★**원칙 1 "Snapshot 생성 후 직접 수정 금지"** → append-only 선례 = `pm_audit_log`(주석 `20260526_168_008:2-3`) · `security_audit_log`(`SecurityAudit.php:8` — **UPDATE/DELETE 코드경로 없음**). **이식 대상.**
- 🔴 **원칙 2 "현재 Manager 관계로 과거 Snapshot 대체 금지" — 정면 반례 실재.** `AgencyPortal.php:304`·`:381` 의 **`revoked_at=NULL`** 이 이력을 물리적으로 소멸시킨다(§0). **이 패턴을 관계 테이블에 복제하면 §55 가 설계 시점에 이미 위반**된다. 관계 변경은 **UPDATE 가 아니라 새 행 INSERT**.
- 🔴 **원칙 3~7(Reporting Line·Manager Relationship·Organization Hierarchy·Position·Employment Version 저장)** → **버전 축이 레포에 0개**. 유일 `version` 은 `menu_defaults.version` = **리터럴 `'baseline'` 라벨**(`AdminMenu.php:309`) · optimistic lock `version` grep 0. **"컬럼만 붙이면 된다"가 아니라 버전 개념 자체가 신규.**
- 🔴 **원칙 8 "Acting·Temporary·Interim 상태 저장"** → `acting` 0 · `interim` 1건은 **지오리프트 중간결과**(`AttributionEngine.php:672`) · `대행` 한글 히트는 **전부 비즈니스 도메인**(배송/구매대행·광고대행사·결제대행) · `proxy` 7건 전부 **HTTP 프록시**. **직무대리 0건.**
- 🔴 **원칙 9 "Legal Entity Crossing 저장"** → Legal Entity 0 · `DATA_SCOPES 'company'` = **무제한 센티넬**(법인 아님).
- **원칙 10~13(Availability·Eligibility·Source Priority·Resolution 근거 저장)** → §1 #21·#22·#17·#27 과 동일 판정 = 전량 `ABSENT`. ★**§62 Source Priority 는 "미구현"이 아니라 정렬할 대상이 0개**(manager 보유 소스 = 0).
- ★**원칙 14 "Immutable Hash 검증"** → **`SecurityAudit` 을 정본 선례로 삼으라**(`verify():56-68` — `hash_equals` + prev 연결 검사 + 실 소비자 `AdminGrowth.php:1429`).
  - 🔴 **`menu_audit_log` 를 선례로 삼지 마라** — tenant_id 없음 + 검증기 없음 + **preimage 재구성 불가**(`'ts'`(`:195`) vs DB `DEFAULT CURRENT_TIMESTAMP`(`:129`)) = **검증 불가능한 장식**.
  - 🔴 **두 선례 모두 스키마 복제 금지 · 알고리즘만 이식.** 테넌트별 체인 시 `lastHash()`·`verify()` 에 **`WHERE tenant_id=?` 필수**(현행 `SecurityAudit.php:38`·`:59` 무술어 = 전역 단일 체인).
  - ★**해시 preimage 는 저장된 컬럼만으로 재구성 가능해야 한다**(`SecurityAudit.php:63` 이 정확히 이 규율을 지킨다). 이를 어기면 검증기가 있어도 **영구 실패**한다.
- 🔴 **"시점 컬럼만 붙이면 된다"는 일반화가 깨지는 지점**: 세율(`kr_fee_rule.effective_from`)은 **컬럼 有·질의 無** → 교정이 **질의 계층**(과거 복원 가능)이나, 환율(`fxToKrw` `Connectors.php:1749`)은 **컬럼도 이력도 無** — `app_setting` KV **단일행 덮어쓰기**(`:1804-1805`) → **복원할 게 없다 · 저장 계층 신설**. Snapshot 축은 **환율형**(무에서 신설)이다.
- 🔴 **Migration 제약** — `backend/migrations/` **21파일 · 172차 정지** → 신규 스키마는 `ensureTables` 경로. ★**`ensureTables` 는 테이블 생성만 하고 데이터 변환·백필을 하지 않는다** → **과거 관계의 소급 Snapshot 생성 수단이 없다**. **Snapshot 은 시행일 이후 전방(forward-only)으로만 축적 가능** — 이를 "과거도 복원된다"로 오표기 금지.
