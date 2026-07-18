# DSAR — Approval Authority Reconciliation (§63)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §63(2522-2577) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §7 · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)
>
> **★분모 분할(§63 측정기 정합)**: §63 은 두 목록으로 구성 — **비교 대상 23 + 필수필드 24 = 47**. `measure_spec_denominator.mjs --sec=63` 실측 **47**(불릿 47·번호 0)과 정합. 상태 열거형 25종은 [문서2 `DSAR_APPROVAL_AUTHORITY_RECONCILIATION_STATUS.md`](DSAR_APPROVAL_AUTHORITY_RECONCILIATION_STATUS.md)(§64)로 분리한다.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_AUTHORITY_RECONCILIATION` 엔티티 | `authority_reconciliation`·`approval_authority` grep **0** — Authority 정의 vs 실제 부여 **대사(reconciliation) 코드 전무**(ⓑ §7) | `NOT_APPLICABLE`(부재→신설) |
| 대사 **기준(canonical)** | 🔴 **Tenant 마스터 테이블 부재** — `api_key.tenant_id`=FK 없는 VARCHAR(100)(`Db.php:944`)·열거는 `SELECT DISTINCT` ~30개소 역추론(ⓑ §7) → **대사 기준 자체가 없음** | `BLOCKED_PREREQUISITE`(권위 tenant/Canonical 선행) |
| 대사 **원천(source)** | 🔴 ERP DOA Matrix / Finance Spreadsheet / HRIS Job Level = **전부 존재조차 안 함**(`doa_matrix`·`authority_matrix`·`job_grade_threshold` grep 0 · ⓑ §1) — 대조할 좌변이 없음 | `ABSENT` |
| 유일 인접 "누적 대사" 선례 | `AutoCampaign.php:843-889` 예산 상한+기간+누적차감(`periodSpentToDate:855`) — **마케팅 도메인·승인 워크플로 아님**(ⓑ §4 FLIP) | `LEGACY_ADAPTER`(확장 참조 · 커버 아님) |

★**엔티티 전체가 부재하고, 대사의 좌변(source)·우변(canonical)이 양쪽 다 없으므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "부재 깊이 / 인접 자산"을 기록한다. `VALIDATED_LEGACY` 는 한 건도 성립하지 않는다(커버 0).

## 1. 원문 전사 + 판정 — **원문 47종**(비교 대상 23 + 필수필드 24)

### 1.1 비교 대상 (23) — §63 "다음을 비교하라"

| # | 비교 대상(원문) | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | ERP DOA Matrix vs Canonical Authority | 🔴 좌변 ERP DOA Matrix **존재조차 안 함**(`doa_matrix` grep 0·ⓑ §1) · 우변 Canonical 부재 | `ABSENT` |
| 2 | Finance Spreadsheet vs Canonical Matrix | 🔴 좌변 Finance Spreadsheet 부재 · `authority_matrix` grep 0(ⓑ §1) | `ABSENT` |
| 3 | HRIS Job Level vs Authority Binding | 🔴 좌변 HRIS Job Level 부재(`job_grade_threshold`·`position_threshold` 0·ⓑ §1) · Authority Binding 축 부재 | `ABSENT` |
| 4 | Role Assignment vs Role Authority | 🔴 Role Authority 축 부재 · `roleRank`(api-key)↔`team_role` **양방향 매핑 0**(ⓑ §3.2 `index.php:554`) | `ABSENT` |
| 5 | Position Incumbent vs Position Authority | 🔴 Position 엔티티·Position Authority 전무(`position_threshold` 0·ⓑ §1) | `ABSENT` |
| 6 | Organization Owner vs Organization Authority | 🔴 Organization Authority 부재 · owner 판별은 `parent_user_id IS NULL`뿐(ⓑ §3) — Authority 아님 | `ABSENT` |
| 7 | Legal Entity Officer vs Legal Entity Authority | 🔴 Legal Entity 엔티티 0(`legal_entity_limit`·`biz_no`/`corp_reg`/`tax_id` grep 0·ⓑ §1) | `ABSENT` |
| 8 | Cost Center Owner vs Cost Center Authority | 🔴 `cost_center_limit` grep 0 · Cost Center 축 전무(ⓑ §1) | `ABSENT` |
| 9 | Budget Owner vs Budget Authority | 🔴 `budget_limit` 0(ⓑ §1) · 인접 AutoCampaign 예산은 **마케팅 페이싱**이지 Budget Authority 아님 | `ABSENT` |
| 10 | Program Owner vs Program Authority | 🔴 `program_limit` grep 0 · Program Authority 축 전무(ⓑ §1) | `ABSENT` |
| 11 | Approval Chain Level vs Authority Requirement | 🔴 Chain Level 부재 · `required_approvals`=**리터럴 상수 2**(`Mapping.php:209`·`Db.php:634`·ⓑ §1) — 요건 모델 아님 | `ABSENT` |
| 12 | Resolved Participant vs Authority Candidate | 🔴 후보 도출(§47)·Resolution(§50) **전 항목 코드 부재**(ⓑ §6) | `ABSENT` |
| 13 | Task Assignee vs Authority Resolution | 🔴 Task/Resolution 축 부재(§50/§51 ABSENT·ⓑ §6) | `ABSENT` |
| 14 | Claim Actor vs Authority Snapshot | 🔴 Actor Authorization Snapshot **ABSENT** — 승인시점 권한/역할/플랜 미보존(ⓑ §5) | `ABSENT` |
| 15 | Decision Actor vs Authority Snapshot | 🔴 동일 — `Mapping:285`{user,ts}·`Alerting:591`{actor,decision,ts}·admin_growth decided_by만(ⓑ §5) · as-of 재구성 불가 | `ABSENT` |
| 16 | Decision Amount vs Authority Limit | 🔴 Authority Limit 부재 — `HIGH_VALUE_KRW`(`Catalog.php:1016`)는 **필요여부 boolean만** 켬(한도 미집행·ⓑ §4) | `ABSENT` |
| 17 | Decision Currency vs Currency Scope | 🔴 `currency_scope`·`allowed_currency` 0 · 통화는 변환 전용(`fxToKrw:1749`·ⓑ §4) | `ABSENT` |
| 18 | Decision Date vs Effective Period | 🔴 `effective_to`/`valid_to`/`valid_from` 0 — 승인/권한 엔티티에 effective dating 없음(ⓑ §5·§57) | `ABSENT` |
| 19 | Cumulative Usage vs Limit | **인접 실재** = `AutoCampaign.php:843-889` 기간 내 누적지출(`periodSpentToDate:855`)→상한 비교(ⓑ §4 FLIP) — **마케팅 도메인·승인 아님** | `LEGACY_ADAPTER` |
| 20 | Current Matrix Version vs Case Snapshot | 🔴 Matrix Version·Case Snapshot **양변 부재** · 불변 prev-링크 버전체인 선례 0(ⓑ §5) | `ABSENT` |
| 21 | Future Version vs Scheduled Activation | 🔴 Future-Dated **ABSENT** — 로컬 미래 effective_from 예약 0(ⓑ §5·§58) | `ABSENT` |
| 22 | External BPM Threshold vs Canonical Threshold | 🔴 External BPM 부재(`BPMN`·`bpm` grep 0) · Canonical Threshold 부재 | `ABSENT` |
| 23 | Manual Override vs Approved Exception Reference | 🔴 Exception Reference·Override 레코드 축 부재 — override 표현 자체가 없음(ⓑ §6 explicit-deny 구조 부재와 동형) | `ABSENT` |

🔴 **23/23 대조 불가** — 대조기가 없어서가 아니라 **대조할 양변이 없기 때문**이다. #19만 예외적으로 인접 누적차감 로직이 실재하나(마케팅), 이는 **확장 참조 대상**이지 승인 Authority 대사가 아니다. **비교 대상 = 22 `ABSENT` + 1 `LEGACY_ADAPTER`.**

### 1.2 필수 필드 (24) — §63 필수 필드 목록

`APPROVAL_AUTHORITY_RECONCILIATION`

| # | 필드(원문) | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | approval_authority_reconciliation_id | 엔티티 부재 → PK 없음(grep 0) | `ABSENT` |
| 2 | approval_request_id | 승인 request가 4계통 blob 분산 · canonical request id 없음(ⓑ §2) | `ABSENT` |
| 3 | approval_case_id | Case 축 부재 | `ABSENT` |
| 4 | approval_item_id | Item 축 부재 | `ABSENT` |
| 5 | subject_id | Subject Binding 부재 | `ABSENT` |
| 6 | authority_matrix_id | Authority Matrix 부재(`authority_matrix` grep 0·ⓑ §1) | `ABSENT` |
| 7 | authority_matrix_version_id | 불변 버전체인 선례 0(ⓑ §5) | `ABSENT` |
| 8 | authority_definition_id | Authority Definition 부재 | `ABSENT` |
| 9 | authority_version_id | version 컬럼 6종 전부 하드코딩 태그(ⓑ §5) — Authority 버전 아님 | `ABSENT` |
| 10 | comparison_type | 위 비교 23종 열거형 미존재 | `ABSENT` |
| 11 | source_state | 좌변 원천(ERP/Finance/HRIS) 전부 부재(ⓑ §1) | `ABSENT` |
| 12 | canonical_state | 🔴 Canonical SSOT 부재 · Tenant 마스터 부재로 기준 불성립(ⓑ §7) | `ABSENT` |
| 13 | amount | 금액축 부재 — `HIGH_VALUE_KRW` 상수만(ⓑ §4) | `ABSENT` |
| 14 | currency | 통화 스코프 0 · 변환 전용(ⓑ §4) | `ABSENT` |
| 15 | difference | 대사 산출물 축 부재 | `ABSENT` |
| 16 | affected task | Task 축 부재 | `ABSENT` |
| 17 | affected decision | Decision 테이블 부재(ⓑ §5) | `ABSENT` |
| 18 | severity | 승인 도메인 severity 부재 | `ABSENT` |
| 19 | detected_at | 탐지 시각 축 부재 | `ABSENT` |
| 20 | resolution | 해소 축 부재 · Reconciliation은 탐지이지 자동교정 아님(설계 원칙) | `ABSENT` |
| 21 | resolved_by | 인접 = 결재 actor 관례(`self::actor` `Alerting` · `decided_by` admin_growth `:142-149`) — **actor 개념은 있으나 authority actor 아님**(ⓑ §2·§5) | `LEGACY_ADAPTER` |
| 22 | resolved_at | 해소 시각 축 부재(승인 도메인) | `ABSENT` |
| 23 | status | 대사 상태 열거형 부재 → [Reconciliation Status 문서](DSAR_APPROVAL_AUTHORITY_RECONCILIATION_STATUS.md)(§64·25종) 참조 | `ABSENT` |
| 24 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·preimage ts·검증기·ⓑ §5) 확장 대상 · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

🔴 **필드 24/24 미충족** — **22 `ABSENT` + 2 `LEGACY_ADAPTER`**(resolved_by·evidence). 커버 0/24.

**실측 개수: 47 / 47 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 3 · `ABSENT` 44.

> 🔴 **커버 0.** Reconciliation 엔티티가 통째로 부재하고 대사의 양변(source·canonical)이 양쪽 다 없으므로 어떤 항목도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 3건(#19 Cumulative=AutoCampaign · resolved_by=actor 관례 · evidence=SecurityAudit)은 **확장 참조 대상 인접 자산**이지 커버가 아니다.

## 2. 규칙

- 🔴 **Canonical 기준을 선결하라 (BLOCKED_PREREQUISITE)** — Reconciliation 은 "정의된 Authority" vs "실제 부여된 Authority"를 대사한다. 그러나 **Tenant 마스터 테이블조차 없어**(`api_key.tenant_id`=FK 없는 VARCHAR·ⓑ §7) **대사 기준(canonical) 자체가 부재**하다. 대사 엔진을 짜기 전에 ① 권위 tenant 참조 ② Canonical Authority Matrix/Definition(§12·§7)를 **선행 신설**해야 한다. 기준 없는 대사는 좌변만 있는 뺄셈이다.
- 🔴 **좌변 원천(ERP/Finance/HRIS)이 "있다"고 가정하고 어댑터를 배선하지 마라**(287차 죽은 스켈레톤 · 288차 가짜녹색) — ERP DOA Matrix·Finance Spreadsheet·HRIS Job Level 은 **존재조차 안 한다**(ⓑ §1). 수집 경로가 확정되기 전 대시보드에 "Authority 정합 OK" 를 표시하면 좌변이 빈 대사를 통과로 위장하는 것이다.
- 🔴 **#19 Cumulative Usage 를 "구현됨"으로 세지 마라** — `AutoCampaign` 예산 누적차감은 **마케팅 페이싱**이며 승인 Authority 한도 대사가 아니다(ⓑ §4). 재구현 금지·페이싱 패턴은 **참조만**.
- 🔴 **evidence 를 `menu_audit_log` 로 배선 금지** — 정본은 `SecurityAudit::verify()`(preimage ts 저장·재검증기)이며 `menu_audit_log.hash_chain` 은 verify() 0·preimage 소실로 **검증 불가능한 장식**이다([[reference_menu_audit_log_not_tamper_evident]]).
- 🔴 **Reconciliation 은 탐지이지 교정이 아니다** — 불일치를 자동으로 맞추면 어느 쪽이 진실인지 잃는다(§57 Retroactive `AgencyPortal.php:304`,`:381` in-place 소거 반례·ⓑ §5). 산출은 **Mismatch 레코드(append-only)** 이며 교정은 별도 결정.
- 실 구현·실 결함(Actor Auth Snapshot 부재·high_value 라우팅 갭·1인 결재 3경로)은 **별도 승인 세션**(Golden Rule + verify + 배포 승인). 본 문서 **코드변경 0**.
