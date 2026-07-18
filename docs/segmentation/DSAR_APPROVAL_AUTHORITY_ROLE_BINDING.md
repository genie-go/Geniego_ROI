# DSAR — Role Authority Binding (§17)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §17(1040-1063) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §3 · 포맷 exemplar: [DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_AUTHORITY_ROLE_BINDING` 엔티티 | `role_authority`·`authority_binding` grep **0** — Role↔Authority 결속 개념 부재(ⓑ §3) | `NOT_APPLICABLE`(부재→신설) |
| "Canonical Role ID + Version" | 🔴 **부재** — 권한 축은 `roleRank`(기계 신원 api-key API 등급 · `index.php:554` viewer<connector<analyst<admin)와 `team_role`(owner>manager>member) **2벌 분열 · 양방향 매핑 0 · 완전 직교**(ⓑ §3) | `LEGACY_ADAPTER`(인접 · 단 Canonical ID 아님) |
| role_version 축 | 🔴 불변 prev-링크 버전체인 선례 0 — version 컬럼 6개(`menu_defaults.version` 등) **전부 하드코딩/서술 태그**(ⓑ §5) | `ABSENT` |
| `acl_permission.approve` | 실재하나 **소비처가 `scopeSql` 데이터-행 필터뿐 · approve 비트로 승인 가부 판정하는 핸들러 0**(장식 · `TeamPermissions.php:39`·ⓑ §3) | `LEGACY_ADAPTER` |

★**엔티티 전체가 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다. Role Binding 이 결속할 상위 `authority_matrix_entry_id`(§16) 자체도 미신설이다.

## 1. 원문 전사 + 판정 — **원문 16종**(필수 필드 16)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | role_authority_binding_id | 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 2 | authority_matrix_entry_id | 결속 대상 Authority Matrix Entry(§16) 미신설 → FK 없음 | `NOT_APPLICABLE` |
| 3 | role_id | 🔴 인접 = `roleRank`(`index.php:554` · api-key API 등급)·`team_role`(owner>manager>member) — **판정축이 HTTP 메서드**(`:568`)·두 축 매핑 0·직교(ⓑ §3). **이름 문자열이지 Canonical Role ID 아님**(§65 "Role 이름 문자열 판정" gap) | `LEGACY_ADAPTER` |
| 4 | role_version | 🔴 roleRank/team_role 에 버전 개념 0 · 불변 prev-링크 버전체인 선례 0(ⓑ §5) | `ABSENT` |
| 5 | required role scope | 인접 = 4승인경로 진입 게이트(analyst+ / requirePro / requirePlan('admin')) = **역할 등급 문턱**이나 Authority scope 아님(ⓑ §2·§3) | `LEGACY_ADAPTER` |
| 6 | required assignment type | 🔴 assignment 타입 분류(direct/inherited/delegated) 0 — `createTeamMember:1226` 등은 parent 를 **최상위 owner 하드고정**(ⓑ §3) · 위임 유형 표현 없음 | `ABSENT` |
| 7 | tenant restriction | 🔴 Tenant 마스터 부재 · `api_key.tenant_id`=FK 없는 VARCHAR(100)(`Db.php:944`) · Cross-Tenant 차단은 REAL(`index.php:600`)이나 strict fail-closed 기본 OFF(`:585`)(ⓑ §7) | `BLOCKED_CROSS_TENANT` |
| 8 | legal entity restriction | 🔴 Legal Entity 엔티티 0(`biz_no`/`corp_reg`/`tax_id` grep 0 · ⓑ §4) | `ABSENT` |
| 9 | organization restriction | 🔴 조직 엔티티 부재 확정(5-3-3-1 · `organization_unit` 0) — restriction 걸 대상 없음 | `ABSENT` |
| 10 | environment restriction | 인접 = `Db::envLabel()`(`Db.php:56` prod/demo 라벨 · 실 격리)이나 **배포 환경 라벨이지 Authority 환경 스코프 아님** | `LEGACY_ADAPTER` |
| 11 | inherited role allowed 여부 | 🔴 역할 상속 메커니즘 0 — team_role 계층은 서열이지 role 상속 아님 · composite/inherited role 표현 없음 | `ABSENT` |
| 12 | composite role policy | 🔴 복합 역할(다중 role 조합) 개념 0 | `ABSENT` |
| 13 | valid_from | 인접 = `kr_fee_rule.effective_from`(open-interval · 수수료 도메인 · `Db.php:898`·ⓑ §5 FLIP) — 권한/승인 엔티티엔 없음 | `LEGACY_ADAPTER` |
| 14 | valid_to | 🔴 `valid_to`/`effective_to` grep 0(오탐 `Onsite.php:396` invalid_token 제외) → 폐구간 신규(ⓑ §5) | `ABSENT` |
| 15 | status | 인접 = 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인 · ⓑ §5) | `LEGACY_ADAPTER` |
| 16 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·preimage ts 저장·검증기 · ⓑ §5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]] · verify() 0) | `LEGACY_ADAPTER` |

**실측 개수: 16 / 16 전사(§17 측정기 `--sec=17` = 16 일치).** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 6 · `BLOCKED_CROSS_TENANT` 1 · `ABSENT` 7 · `NOT_APPLICABLE` 2 · `KEEP_SEPARATE_WITH_REASON` 0.

> 🔴 **커버 0.** Role Binding 엔티티가 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 6건(role_id=roleRank/team_role · required role scope=진입 게이트 · environment restriction=Db::envLabel · valid_from=kr_fee_rule · status · evidence=SecurityAudit)은 **확장 대상 인접 자산**이지 커버가 아니다.

## 2. 규칙

- 🔴 **Role 이름이 아니라 Canonical Role ID 와 Version 을 사용하라**(원문 §17 말미 명령). 현행 `roleRank`(`index.php:554`)는 **이름 문자열**이며 §65 "Role 이름 문자열 판정" gap 을 그대로 구현한다. Role Binding 신설 시 이름 대신 Canonical Role ID + role_version(불변 버전체인)을 참조 축으로 삼아라 — roleRank 문자열을 role_id 로 직결하지 마라.
- 🔴 **`roleRank`(기계 api-key 등급)와 `team_role`(사람 조직 서열)을 하나로 뭉개지 마라** — 두 축은 판정 목적(HTTP 메서드 게이트 vs 조직 권한)이 다르고 매핑 0·직교다(ⓑ §3). Role Binding 의 role_id 를 어느 한 축으로 강제 캐스팅하면 나머지 축 경로(세션토큰 app_user·`auth_role` 미설정)가 조용히 무권한 처리된다.
- 🔴 **`acl_permission.approve` 비트를 재구현하지 마라** — 이미 시드·존재하나 소비처가 데이터-행 필터뿐인 장식 비트다(ⓑ §3). Role Binding 이 승인 가부를 판정하려면 **이 비트를 실제 소비하는 판정기**로 확장하라(중복 권한 테이블 신설 금지).
- 🔴 **`role_version` 을 하드코딩 태그로 두지 마라** — version 컬럼 6개가 전부 서술 태그로 끝난 선례(ⓑ §5)를 반복하지 말고 불변 prev-링크 버전체인으로. 승인시점 role_version 을 보존하지 못하면 §55 Actor Authorization Snapshot 부재를 상속한다.
