# DSAR — Approval Authority Snapshot (§55 필수 필드 · §56 Snapshot 원칙 병합)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §55(2243-2285 필수 필드)·§56(2305-2322 Snapshot 원칙) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §5 · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)
> Snapshot Type 축(§55 13종) = [DSAR_APPROVAL_AUTHORITY_SNAPSHOT_TYPE.md](DSAR_APPROVAL_AUTHORITY_SNAPSHOT_TYPE.md)

## 0. 현행 실측 (file:line)

### ★대전제 — `Actor Authorization Snapshot` = **`ABSENT`**(ⓑ §5 CONFIRM)

**승인 시점의 권한을 동결하는 코드가 0건이다.** 승인 3~4경로 전부 시각과 actor 문자열만 남기고, **그 시점의 권한·역할·플랜·조직·한도를 한 바이트도 저장하지 않는다** → **as-of 재구성 불가**.

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_AUTHORITY_SNAPSHOT` | **grep 0** | `ABSENT` |
| Actor Authorization Snapshot | **권한 동결 코드 0** | `ABSENT` |
| `approvals_json`(`Mapping.php:285`) | `{user, ts}` **2키 JSON 배열**뿐 | 🔴 **인덱스·as-of 질의 불가** |
| action_request(`Alerting:591`) | `{actor, decision, ts}` **3키** | 🔴 동결 0 |
| admin_growth(`AdminGrowth:142-149`) | `decided_by`·`decided_at` **2컬럼**(tenant_id 없음) | 🔴 동결 0 |

### 🔴 ★`captured_at` 은 **DB 컬럼이 아니다** — 규칙 7(존재증명은 이름이 아니라 능력으로)

- **DDL 실측**(`PM/Enterprise.php:53-55` MySQL / `:62` SQLite): `id`·`tenant_id`·`project_id`·`name`·`bac`·`snapshot_json`·`created_at` — **`captured_at` 컬럼 없음**
- `captured_at` 은 **`snapshot_json` 내부 JSON 키**(`PM/Enterprise.php:360` — `['captured_at' => self::now(), …]`)
- → **인덱스 불가 · as-of 질의 불가**. 스냅샷 시점축을 JSON 키로 두면 원문 요구(as-of 재구성)를 만족 못 한다.

### 🔴 ★§56 원칙 2 "Current Authority로 과거 Snapshot 대체 금지"의 **정면 반례가 실재한다**

| 반례 | file:line | 동작 |
|---|---|---|
| 재초대 | `AgencyPortal.php:304` | `UPDATE agency_client_link SET status='pending', invited_at=?, **revoked_at=NULL**, …` |
| 재승인 | `AgencyPortal.php:381` | `UPDATE agency_client_link SET status='approved', scope_json=?, approved_at=?, **revoked_at=NULL**, …` |

→ **이전 해지 시각이 소거된다 = 이력 물리적 소멸.** "언제 해지됐었는가"를 복원할 방법이 없다. **현재 상태가 과거를 덮어쓰는 정확한 안티패턴** = §56 원칙 2 의 반례 · **관계/스냅샷 테이블 설계 시 이 패턴 복제 절대 금지**(`BLOCKED_HISTORICAL_INTEGRITY_RISK`).

### ★`immutable_hash` 선례 — **`SecurityAudit` 이 정본 · `menu_audit_log` 금지**

| 선례 | tenant_id | **preimage ts 저장 = 검증 가능성** | 검증기 | 판정 |
|---|---|---|---|---|
| **`security_audit_log`**(`SecurityAudit.php:48-52`) | ✅ **있음**·해시 preimage 에 포함(`:27`) | ✅ `created_at` 에 preimage 명시 저장(`:31`) → `verify():63` 재계산 | ✅ **`verify():56-68`** — `hash_equals`(`:64`)+`prev_hash` 교차 · 실 소비자 `AdminGrowth.php:1429` | ★**정본** |
| `menu_audit_log`(`AdminMenu.php:123-131`) | 🔴 **없음** | 🔴 preimage `'ts'=date('c')`(`:195`)가 INSERT 컬럼목록에 없어 `created_at` DEFAULT(`:129`)가 덮음 → **행에서 재계산 불가** | 🔴 **없음** | 열등 — **검증 불가능한 장식** |

🔴 **`menu_audit_log.hash_chain` 인용 금지**([[reference_menu_audit_log_not_tamper_evident]]) — preimage 재구성 불가 = 검증 불가능. §55 `immutable_hash`·§56 원칙 15 의 선례로 삼으면 **가짜 녹색을 상속**.
⚠️ **`SecurityAudit` 잠복 결함 2건**(이식 시 선결): ① `lastHash():38`·`verify():59` **tenant 술어 없음** → 전 테넌트 전역 단일 체인(테넌트별 체인 시 `WHERE tenant_id=?` 필수) · ② `:31` actor `substr(…,0,190)` 저장 vs `:27` 해시 원본 전체 → **actor 190자 초과 시 `verify()` 영구 실패**.

## 1. 원문 전사 + 판정 — **원문 41종**(필수 필드)

> ★분모 주의: **측정기 §55 = 54**(불릿 54) = **필수 필드 41 + Snapshot Type 13**. 본 편은 **필수 필드 41** 담당 · Type 13 은 [별편](DSAR_APPROVAL_AUTHORITY_SNAPSHOT_TYPE.md). **41 + 13 = 54 로 측정기와 정합.** §56 원칙 15(측정기 `--sec=56`)는 아래 **§1-b** 에 병합 전사.

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | approval_authority_snapshot_id | 엔티티 부재 → PK 없음 | `ABSENT` |
| 2 | snapshot_type | [별편](DSAR_APPROVAL_AUTHORITY_SNAPSHOT_TYPE.md) 13종 전량 미시드(DECISION_COMMIT `LEGACY_ADAPTER`·AUDIT_RECONSTRUCTION `ABSENT`·나머지 `NOT_APPLICABLE`) | `ABSENT` |
| 3 | approval_request_id | 🔴 인접 = `mapping_change_request.id`(`Mapping.php:209`) 실재하나 **스냅샷이 참조·동결하지 않음** | `ABSENT` |
| 4 | approval_request_version_id | Request 버전 축 0 · 불변 prev-링크 버전체인 선례 0(ⓑ §5) | `ABSENT` |
| 5 | approval_case_id | 🔴 **Case 개념 부재** — Request/Case 미분화(ⓑ §2) | `ABSENT` |
| 6 | approval_case_version_id | Case·version 둘 다 부재 | `ABSENT` |
| 7 | approval_item_id | Item 개념 0 | `ABSENT` |
| 8 | approval_requirement_id | 🔴 요건 모델 부재 — `required_approvals` 유일 생산자 = 리터럴 `2`(`Mapping.php:209`)+`DEFAULT 2`(`Db.php:634`) = **요건이 아니라 상수**(ⓑ §1) | `ABSENT` |
| 9 | chain_resolution_level_id | Chain/level 개념 0(`approval_chain` grep 0·ⓑ §3) | `ABSENT` |
| 10 | subject_id | ★**인접** — `app_user.id`(승인자 신원 실재)이나 **시점 미동결**(승인 후 role/plan 변경 시 재구성 불가) | `LEGACY_ADAPTER` |
| 11 | role_id | ★**인접** — `roleRank`(`index.php:554` viewer<connector<analyst<admin · **api-key API 등급**)·`team_role`(owner>manager>member) **2축 직교**(ⓑ §3) · 문자열·**시점 미동결** | `LEGACY_ADAPTER` |
| 12 | position_id | 🔴 Position 전역 0 | `ABSENT` |
| 13 | organization_id | 🔴 `ORGANIZATION_*` backend grep 0 | `ABSENT` |
| 14 | legal_entity_id | 🔴 Legal Entity 0(`biz_no`/`corp_reg`/`tax_id` 0) | `ABSENT` |
| 15 | authority_matrix_id | 🔴 Authority Matrix 엔티티 미구축(신설 대상 · [별편 MATRIX](DSAR_APPROVAL_AUTHORITY_MATRIX.md)) | `BLOCKED_PREREQUISITE` |
| 16 | authority_matrix_version_id | Matrix·version 선행 전제 미충족 | `BLOCKED_PREREQUISITE` |
| 17 | matrix_entry_id | Matrix Entry 엔티티 선행 미구축 | `BLOCKED_PREREQUISITE` |
| 18 | authority_definition_id | Authority Definition 엔티티 선행 미구축 | `BLOCKED_PREREQUISITE` |
| 19 | authority_version_id | Authority Version 엔티티 선행 미구축 | `BLOCKED_PREREQUISITE` |
| 20 | authority_type | 🔴 Authority Type(§7) 자체 0 | `ABSENT` |
| 21 | authority_domain | 🔴 Authority Domain(§8) 자체 0 | `ABSENT` |
| 22 | action | 승인 action 축 미보존 · 인접 `action_json`(`Alerting`)은 **집행 파라미터**(pause/updateBudget)이지 authority action 아님 | `ABSENT` |
| 23 | resource | 인접 = `acl_permission` scopeSql 데이터-행 필터 — Authority 리소스 동결 아님 | `ABSENT` |
| 24 | original_amount | 🔴 금액축 부재 — 유일 = `HIGH_VALUE_KRW=5000000.0` 상수(`Catalog.php:1016` · **boolean 만**·ⓑ §4) | `ABSENT` |
| 25 | original_currency | 통화 스코프 0(`currency_scope`/`allowed_currency` 0) | `ABSENT` |
| 26 | converted_amount | 금액축 부재 → 변환 결과 동결 불가 | `ABSENT` |
| 27 | comparison_currency | 비교통화 축 0 | `ABSENT` |
| 28 | fx_reference | 🔴 **환율 저장계층 부재** — `app_setting` KV 단일행 덮어쓰기(`Connectors.php:1790`,`:1804-1805`)·`rate_date` 컬럼 없음 → as-of 환율 동결 불가(24h TTL 가드 `:1794-1796`는 있으나 과거환율 조회 불가) | `ABSENT` |
| 29 | amount_band | Amount Band(§24) 0 | `ABSENT` |
| 30 | limit_period | 도메인 authority 한도 0 · 인접 = `AutoCampaign:843-889` 예산 기간(마케팅 도메인·승인 아님·ⓑ §4) | `ABSENT` |
| 31 | utilization reference | 인접 = `AutoCampaign::periodSpentToDate:855`(마케팅 예산 누적·승인 아님) | `ABSENT` |
| 32 | remaining authority | 잔여 한도 축 0(monetary authority 부재) | `ABSENT` |
| 33 | eligibility result | 🔴 적격 판정 술어 0 — `Mapping::approve:287` 은 **정족수(숫자)만**·`acl_permission.approve`=장식(소비 핸들러 0·ⓑ §3) | `ABSENT` |
| 34 | conflict result | 충돌 탐지/해소(§53/§54) 전 부재(ⓑ §6) | `ABSENT` |
| 35 | resolution result | Resolution(§50/§51) 부재 | `ABSENT` |
| 36 | policy versions | 승인 정책엔진 부재 — `RuleEngine`=마케팅 세그 DSL(승인 아님) · 정책 버전축 0 | `ABSENT` |
| 37 | effective_at | 🔴 `effective_to`/`valid_from`/`valid_to` grep 0(오탐 `Onsite.php:396` 제외) · 승인 엔티티 dating 0(ⓑ §5) | `ABSENT` |
| 38 | captured_at | 🔴 인접 = `pm_baseline.captured_at` = **`snapshot_json` 내부 JSON 키**(`PM/Enterprise.php:360`·DDL 은 `created_at` `:55`/`:62`) → **인덱스·as-of 질의 불가**(§0) | `LEGACY_ADAPTER` |
| 39 | immutable_hash | ★**정본 선례 = `SecurityAudit::verify():56-68`**(`:27` 해시·`:63` 재계산·`:64` `hash_equals`+prev · 소비자 `AdminGrowth.php:1429`) · 🔴`menu_audit_log.hash_chain` 인용 금지(§0) | `LEGACY_ADAPTER` |
| 40 | status | 스냅샷 상태 축 0 | `ABSENT` |
| 41 | evidence | 인접 = `pm_audit_log.diff_json`(migration `20260526_168_008:13`)+append-only(`:2-3`)+3인덱스(`:17-19`) — 근거 저장 패턴 실재 | `LEGACY_ADAPTER` |

**실측 개수: 41 / 41 전사.** (측정기 §55 분모 **54** = 필드 41 + Type 13 · 본 편 필드 **41** · 전사 **41** — **분해 후 정합**)
원문 필수 필드가 `evidence` 로 **끝난다**(`:2285`) → 규칙 4 충족(Type 축은 `AUDIT_RECONSTRUCTION` 으로 끝나며 [별편]에서 전사 · **두 축 미혼합**).

커버리지 = **`VALIDATED_LEGACY` 0** · `ABSENT` 31 · `LEGACY_ADAPTER` 5(10·11·38·39·41) · `BLOCKED_PREREQUISITE` 5(15~19).

> 🔴 **커버 0.** Snapshot 엔티티가 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 5건은 **확장 대상 인접 자산**(immutable_hash=SecurityAudit·evidence=pm_audit_log·subject/role=app_user/roleRank·captured_at=JSON키)이지 커버가 아니다 — **전부 승인시점 미동결**. `BLOCKED_PREREQUISITE` 5건은 **Authority Matrix/Version 선행 구축이 전제**(matrix/authority 엔티티가 아직 신설 명세 단계).

## 1-b. §56 Snapshot 원칙 전사 + 판정 — **원문 15종**(측정기 `--sec=56` = 15)

> 측정기 **§56 = 15**(불릿 15 · 별도 섹션). §55(54)와 **합산하지 않는다** — §56 은 원칙 축이므로 본 편에 병합하되 분모는 독립. 아래 15항은 §1 필드축과 1:1 근접 대응.

| # | 원문 원칙 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Snapshot 생성 후 직접 수정 금지 | ★append-only 선례 = `SecurityAudit`(`:8` UPDATE/DELETE 코드경로 없음)·`pm_audit_log`(`20260526_168_008:2-3`) — **이식 대상** | `LEGACY_ADAPTER` |
| 2 | Current Authority로 과거 Snapshot 대체 금지 | 🔴 **정면 반례** `AgencyPortal.php:304`,`:381` `revoked_at=NULL` **in-place 소거**(이력 물리적 소멸·§0) — 복제 절대 금지 | `BLOCKED_HISTORICAL_INTEGRITY_RISK` |
| 3 | Matrix Version 저장 | Authority Matrix Version 엔티티 미구축(선행 전제) | `BLOCKED_PREREQUISITE` |
| 4 | Authority Version 저장 | Authority Version 엔티티 미구축 · version 6컬럼 전부 하드코딩 태그(ⓑ §5) | `BLOCKED_PREREQUISITE` |
| 5 | Matrix Entry 저장 | Matrix Entry 엔티티 미구축 | `BLOCKED_PREREQUISITE` |
| 6 | Actor Role·Position Version 저장 | 🔴 Position 0·Role 시점 미동결(인접 roleRank/team_role 문자열만·§1 #11) | `ABSENT` |
| 7 | Legal Entity·Organization Scope 저장 | 🔴 Legal Entity 0·`ORGANIZATION_*` 0(§1 #13·#14) | `ABSENT` |
| 8 | Original·Converted Amount 저장 | 🔴 금액축 부재(HIGH_VALUE_KRW boolean 상수만·§1 #24·#26) | `ABSENT` |
| 9 | FX Reference 저장 | 🔴 환율 저장계층 부재(KV 덮어쓰기·rate_date 없음·§1 #28) | `ABSENT` |
| 10 | Limit Period 저장 | 도메인 authority 한도 0(인접 AutoCampaign 마케팅·§1 #30) | `ABSENT` |
| 11 | Utilization Reference 저장 | 승인 누적사용량 축 0(§1 #31) | `ABSENT` |
| 12 | Remaining Authority 저장 | 잔여 한도 축 0(§1 #32) | `ABSENT` |
| 13 | Allow·Deny Rule 저장 | 🔴 explicit deny 표현 0 — `acl_permission`=allow-only(ⓑ §6) | `ABSENT` |
| 14 | Conflict Resolution 저장 | 충돌 해소(§54) 부재(§1 #34) | `ABSENT` |
| 15 | Immutable Hash 검증 | ★정본 = `SecurityAudit::verify():56-68`(`hash_equals`+prev 교차) · 🔴`menu_audit_log` 검증기 없음·인용 금지(§0) | `LEGACY_ADAPTER` |

**실측 개수: 15 / 15 전사.** (측정기 §56 분모 **15** · 전사 **15** — 정합)
§56 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 2(1·15) · `BLOCKED_HISTORICAL_INTEGRITY_RISK` 1(2) · `BLOCKED_PREREQUISITE` 3(3~5) · `ABSENT` 9(6~14).

## 2. 규칙

- 🔴 **§55 필드 41 + §56 원칙 15 = 커버 0.** `Actor Authorization Snapshot` 부재는 **승인 감사의 근본 공백** — 현재는 "누가 승인했다"만 남고 **"그가 그때 승인할 자격이 있었는가"를 사후 재구성할 수단이 없다**([별편] AUDIT_RECONSTRUCTION `ABSENT`).
- 🔴 **`approvals_json`(`Mapping.php:285`) 확장으로 §55 를 해결하려 하지 마라.** `{user, ts}` 2키 JSON 배열은 **인덱스·as-of 질의 원천 불가** — `pm_baseline.captured_at` 과 **정확히 동형의 KV 함정**이다. Snapshot 은 **컬럼을 가진 테이블**이어야 한다.
- 🔴 **§56 원칙 2 정면 반례 `AgencyPortal revoked_at=NULL`(`:304`,`:381`) 패턴을 스냅샷 테이블에 복제하면 §56 이 설계 시점에 이미 위반**된다. 변경은 **UPDATE 가 아니라 새 행 INSERT**(`BLOCKED_HISTORICAL_INTEGRITY_RISK`).
- ★**원칙 15 / 필드 39 "Immutable Hash 검증" → `SecurityAudit::verify():56-68` 를 정본 선례로 삼으라**(`hash_equals`+prev 연결·실 소비자 `AdminGrowth.php:1429`). 🔴 **`menu_audit_log` 를 선례로 삼지 마라** — tenant_id 없음+검증기 없음+**preimage 재구성 불가**(`'ts'`(`:195`) vs DB DEFAULT(`:129`)) = 검증 불가능한 장식(가짜 녹색 상속). **스키마 복제 금지·알고리즘만 이식**(테넌트별 체인 시 `WHERE tenant_id=?` 필수).
- 🔴 **`BLOCKED_PREREQUISITE` 10건(필드 15~19 · 원칙 3~5)은 Authority Matrix/Version 선행 구축이 전제.** matrix/authority 엔티티가 미구축인 상태로 스냅샷에 version 컬럼만 붙이면 **참조 무결성 없는 빈 FK** — §47~§54 Resolution·Matrix 편 완료가 선결.
- 🔴 **금액/통화/FX/한도 축(필드 24~32 · 원칙 8~12)은 저장계층부터 부재**(ⓑ §4). Snapshot 플래그가 실제 능력을 초과 선언하면 §65 "Amount 가 Limit 초과인데 승인 성공" gap 을 구조적으로 유발한다. **환율은 세율(`kr_fee_rule.effective_from` 컬럼 有)과 달리 저장계층부터 신설**(§27 대조).
- 🔴 **Migration 제약** — `backend/migrations/` 172차 정지 → 신규 스키마는 `ensureTables` 경로. `ensureTables` 는 백필하지 않으므로 **Snapshot 은 시행일 이후 전방(forward-only)으로만 축적** — "과거도 복원된다"로 오표기 금지.
- 🔴 **코드 변경 0 유지** — 실 결함(high_value 라우팅 갭·1인 결재 3경로·Actor Auth Snapshot 부재·`revoked_at=NULL` 이력소멸)은 **별도 승인세션**(Golden Rule + verify + 배포승인).
