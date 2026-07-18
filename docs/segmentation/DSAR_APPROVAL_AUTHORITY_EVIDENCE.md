# DSAR — Approval Authority Evidence Contract (§70)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0 (문서만)**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §70(2810-2860 필수필드·2864-2874 저장금지) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md)(§5) · 인접 판정 정본: [DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md)
> **측정기 분모(육안 금지)**: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md --sec=70` → **§70 = 62(bullet 62·number 0)** = 필수필드 **51** + 저장금지 **11**.

## 0. 헤더 — 분할 분모 명기

| 측정기 하위군 | 원문 줄범위 | 항목 수 | 판정 대상 |
|---|---|---|---|
| §70 필수필드 (`APPROVAL_AUTHORITY_EVIDENCE`) | 2810-2860 | **51** | Evidence 레코드 필드 |
| §70 저장금지 (No-PII) | 2864-2874 | **11** | 저장 금지 항목 |
| **측정기 합계(`--sec=70`)** | 2804-2877 | **62** | — |

★**핵심 사실(ⓑ §5)**: Authority 개념 부재라 **Evidence 레코드 엔티티가 없다**. 승인 3경로가 남기는 것은 `Mapping:285`{user,ts}·`Alerting:591`{actor,decision,ts}·`admin_growth` decided_by/decided_at 2컬럼뿐 — **as-of 재구성 불가**. 따라서 필드 대부분은 저장처가 없어 `ABSENT`이며, **불변해시·감사참조·기록시각**만 정본 `SecurityAudit::verify()`로 `LEGACY_ADAPTER`, `tenant_id`는 `BLOCKED_CROSS_TENANT`이다. **`VALIDATED_LEGACY` 사용 0(커버 0).**

## 1. 데이터 헌법 No-PII 연계 (저장금지 11항의 근거)

- **최상위 데이터 헌법**([`docs/DATA_INTELLIGENCE_CONSTITUTION.md`](../DATA_INTELLIGENCE_CONSTITUTION.md)): **수집≠사용 · No-PII(불필요 PII 저장 금지) · 모든 데이터 출처(Source/Credential/Sync/Quality/Trust) 기록 · 테넌트 격리 절대.**
- **자격증명 처리 원칙**([[feedback_credentials_handling]]): credentials 평문 노출 회피(응답/commit/log). 세션 자격증명이 override.
- §70 "다음을 저장하지 마라"(2864-2874)는 위 헌법의 Evidence 레코드 적용 사례다. **현행은 Evidence 레코드 자체가 부재하여 이들을 저장할 표면이 없음(부재에 의한 자명 준수) + No-PII 헌법이 상위 강제** → `LEGACY_ADAPTER`(준수·확장 시 상속) 로 표기. **신규 Evidence 신설 시 이 금지 목록을 스키마 게이트로 상속 필수.**

---

## 2. §70 필수필드 — 원문 51 전사 + 판정

원문 verbatim(2810-2860).

| # | 원문 필드 (verbatim) | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | evidence_id | Evidence 엔티티 부재 → PK 없음(ⓑ §5) | `ABSENT` |
| 2 | tenant_id | 🔴 Tenant 마스터 부재 · `api_key.tenant_id`=FK 없는 VARCHAR(100)(`Db.php:944`) · Cross-tenant 차단은 REAL이나 strict 기본 OFF(`index.php:585,600`·ⓑ §7) | `BLOCKED_CROSS_TENANT` |
| 3 | approval_request_id | Authority approval request 엔티티 부재(승인 4경로는 서로 다른 상태머신·ⓑ §2) | `ABSENT` |
| 4 | approval_request_version_id | 요청 버전체인 0(ⓑ §5) | `ABSENT` |
| 5 | approval_case_id | Case 엔티티 부재 | `ABSENT` |
| 6 | approval_case_version_id | 동상 | `ABSENT` |
| 7 | approval_item_id | Item 엔티티 부재 | `ABSENT` |
| 8 | approval_requirement_id | 🔴 요건 모델 부재 — `required_approvals`=리터럴 상수 2(`Mapping.php:209`·`Db.php:634`·ⓑ §1) | `ABSENT` |
| 9 | approval_chain_resolution_id | §47~§54 Candidate·Resolution 전 ABSENT(ⓑ §6) | `ABSENT` |
| 10 | resolution_level_id | Resolution 레벨 개념 없음 | `ABSENT` |
| 11 | subject_id | Authority Subject 개념 없음(승인자=진입게이트 통과자·ⓑ §3) | `ABSENT` |
| 12 | role_id | 인접=`acl_permission`/`team_role`이나 승인시점 role 미보존(§55 ABSENT·ⓑ §5) | `ABSENT` |
| 13 | role_version | 🔴 role 버전 스냅샷 0 | `ABSENT` |
| 14 | position_id | Position 계층 부재(ⓑ §3) | `ABSENT` |
| 15 | position_version | 동상 | `ABSENT` |
| 16 | organization_id | Organization 승인축 부재 | `ABSENT` |
| 17 | legal_entity_id | 🔴 Legal Entity 0(registry doc §1-12) | `ABSENT` |
| 18 | authority_registry | Registry 엔티티 부재(ⓑ §1) | `ABSENT` |
| 19 | authority_type | Authority Type 축 0 | `ABSENT` |
| 20 | authority_domain | Authority Domain 축 0 | `ABSENT` |
| 21 | authority_definition | Definition 엔티티 0 | `ABSENT` |
| 22 | authority_version | 불변 버전체인 선례 0(ⓑ §5) | `ABSENT` |
| 23 | authority_matrix | 🔴 DOA/Authority Matrix Table 없음(ⓑ §1) | `ABSENT` |
| 24 | authority_matrix_version | 동상 | `ABSENT` |
| 25 | matrix_entry | Matrix Entry 부재 | `ABSENT` |
| 26 | binding references | Binding 축 부재 | `ABSENT` |
| 27 | action | Action 권한 매칭 축 부재(HTTP메서드 등급만·ⓑ §3) | `ABSENT` |
| 28 | resource | 인접=scopeSql 데이터-행 필터(ⓑ §3) — Authority 리소스 스코프 아님 | `ABSENT` |
| 29 | original amount | 🔴 금액축 부재 — 유일=`HIGH_VALUE_KRW` 상수 boolean(ⓑ §1·§4) | `ABSENT` |
| 30 | original currency | 통화 스코프 0(ⓑ §4) | `ABSENT` |
| 31 | converted amount | 환산금액 저장 안 됨(변환 전용 `fxToKrw:1749`) | `ABSENT` |
| 32 | comparison currency | 비교통화 스코프 0 | `ABSENT` |
| 33 | fx reference | 🔴 환율 저장계층 부재 — `app_setting` KV 단일행 덮어쓰기·`rate_date`/as-of 없음(`Connectors.php:1790,1804`·ⓑ §4) → fx 참조 기록 불가(24h TTL은 신선도만) | `ABSENT` |
| 34 | amount band | Amount Band 부재(ⓑ §4) | `ABSENT` |
| 35 | threshold | 임계 축 부재(ⓑ §4) | `ABSENT` |
| 36 | limit period | 인접(마케팅)=`AutoCampaign:855`(ⓑ §4) — 승인 한도기간 아님 | `ABSENT` |
| 37 | utilization reference | 인접=`AutoCampaign` 누적차감(마케팅·ⓑ §4) — 승인 utilization 아님 | `ABSENT` |
| 38 | remaining authority | 잔여 권한 산출축 부재 | `ABSENT` |
| 39 | eligibility result | §45/§46 Eligibility=BLOCKED_PREREQUISITE(ⓑ §3) | `ABSENT` |
| 40 | allow rules | 인접=`acl_permission` allow-only이나 승인판정 미소비(ⓑ §3) | `ABSENT` |
| 41 | deny rules | 🔴 explicit deny 표현 자체 없음(ⓑ §6) | `ABSENT` |
| 42 | conflict result | §53/§54 충돌 탐지/해소 전 ABSENT(ⓑ §6) | `ABSENT` |
| 43 | resolution result | §50/§51 Resolution ABSENT(ⓑ §6) | `ABSENT` |
| 44 | snapshot reference | §55 Actor Auth Snapshot ABSENT(ⓑ §5) | `ABSENT` |
| 45 | simulation reference | §61 Simulation 0(registry doc §1-16) | `ABSENT` |
| 46 | reconciliation reference | §63 Reconciliation ABSENT(ⓑ §7) | `ABSENT` |
| 47 | effective_at | 인접=`kr_fee_rule.effective_from`(수수료/VAT open-interval dating·ⓑ §4·§5) — **승인/권한 엔티티엔 없음** | `ABSENT` |
| 48 | recorded_at | **정본** — `SecurityAudit.php` `created_at` 명시 저장(preimage ts·`:29-31`)·검증에 사용(`verify():63`·ⓑ §5) | `LEGACY_ADAPTER` |
| 49 | immutable_hash | **정본** — `SecurityAudit::verify():56-68`(tenant 포함 해시 `:27`·`hash_equals`+prev 교차 `:64`·ⓑ §5). 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]·verify 0·preimage ts 소실) | `LEGACY_ADAPTER` |
| 50 | lineage | 🔴 데이터 계보(lineage) 추적 부재 — Evidence 산출 소스 체인 기록 0 | `ABSENT` |
| 51 | audit reference | **정본** — 감사 참조 = `SecurityAudit`(security_audit_log 해시체인) + `pm_audit_log`(PM 액션 감사)(ⓑ §5) | `LEGACY_ADAPTER` |

**§70 필수필드 실측 = 51 / 51 전사.** 판정: `LEGACY_ADAPTER` **3**(48·49·51) · `BLOCKED_CROSS_TENANT` **1**(2) · `ABSENT` **47** · `VALIDATED_LEGACY` **0**.

---

## 3. §70 저장금지 — 원문 11 전사 + 판정

원문 verbatim(2864-2874) "다음을 저장하지 마라." **판정 = No-PII 헌법·자격증명 원칙이 이미 강제하는 금지(부재에 의한 자명 준수) → `LEGACY_ADAPTER`(준수·상속 대상).** 신설 Evidence 스키마는 이 목록을 게이트로 상속해야 한다.

| # | 원문 저장금지 항목 (verbatim) | 현행 준수 근거 | 판정 |
|---|---|---|---|
| 1 | Password | No-PII 헌법 · Evidence 레코드 부재로 저장표면 0 · 자격증명 평문노출 회피([[feedback_credentials_handling]]) | `LEGACY_ADAPTER`(준수) |
| 2 | Access Token | 동상 · OAuth/커넥터 토큰은 자격증명 저장소 격리(Evidence로 유입 금지) | `LEGACY_ADAPTER`(준수) |
| 3 | Credential Secret | 자격증명 원칙 · Data Constitution Credential 기록은 참조만 | `LEGACY_ADAPTER`(준수) |
| 4 | Bank Account 전체 값 | No-PII(불필요 PII 금지) | `LEGACY_ADAPTER`(준수) |
| 5 | Card Number | No-PII · PCI 성격 원문 저장 금지 | `LEGACY_ADAPTER`(준수) |
| 6 | 급여 원문 | No-PII · 민감정보 원문 금지 | `LEGACY_ADAPTER`(준수) |
| 7 | 민감 HR 평가 | No-PII | `LEGACY_ADAPTER`(준수) |
| 8 | 전체 ERP Payload | 데이터 헌법 — 참조·정규화만(원문 대량 저장 금지) | `LEGACY_ADAPTER`(준수) |
| 9 | 전체 FX Provider Secret | 자격증명 원칙 · FX는 rate 값만(`Connectors.php`) provider secret 미저장 | `LEGACY_ADAPTER`(준수) |
| 10 | 내부 Fraud Model 원문 | 내부 모델 원문 비노출 원칙 | `LEGACY_ADAPTER`(준수) |
| 11 | 불필요한 PII | No-PII 최상위 원칙(데이터 헌법 핵심) | `LEGACY_ADAPTER`(준수) |

**§70 저장금지 실측 = 11 / 11 전사.** 판정: `LEGACY_ADAPTER`(준수) **11** · `VALIDATED_LEGACY` **0**.

> ⚠️ **저장금지 11항의 `LEGACY_ADAPTER`는 "커버"가 아니라 "금지 준수(prohibition compliance)"다.** Evidence 레코드가 부재하여 저장할 표면이 없고 + No-PII 헌법이 상위 강제하므로 자명 준수일 뿐, Authority 기능이 구축돼서가 아니다. 코드 커버리지 산정에서 필수필드(51)와 분리 집계한다.

---

## 4. 커버리지 (문서2 = §70, 하위군 분리)

| 판정 | 필수필드(51) | 저장금지(11) | 합계(62) |
|---|---|---|---|
| `VALIDATED_LEGACY` | 0 | 0 | **0** |
| `LEGACY_ADAPTER` | 3(정본 SecurityAudit) | 11(No-PII 준수) | **14** |
| `BLOCKED_CROSS_TENANT` | 1 | 0 | **1** |
| `ABSENT` | 47 | 0 | **47** |

> 🔴 **커버 0.00%.** 필수필드 51 중 실제 Evidence 저장이 존재하는 필드는 0이다(`VALIDATED_LEGACY` 0). `LEGACY_ADAPTER` 필수필드 3(immutable_hash·audit reference·recorded_at)은 **확장 대상 정본 `SecurityAudit`**이지 Evidence 커버가 아니며, 저장금지 11의 `LEGACY_ADAPTER`는 **금지 준수**로 커버 개념과 무관하다.

## 5. 규칙

- 🔴 **Evidence 신설 시 `immutable_hash`는 `SecurityAudit::verify()` 패턴을 확장하라 — 재구현 금지.** 🔴 `menu_audit_log.hash_chain`은 verify() 0·preimage ts 소실로 **변조탐지 불가**([[reference_menu_audit_log_not_tamper_evident]]) → 인용·복제 금지.
- 🔴 **`tenant_id`(BLOCKED_CROSS_TENANT)를 느슨한 VARCHAR로 상속하지 마라** — Tenant 마스터 부재(ⓑ §7)를 물려받지 말고 권위 tenant 참조 선결. strict fail-closed 기본 ON 권장(§66).
- 🔴 **`fx reference`(ABSENT)를 24h TTL 캐시값으로 채우지 마라** — 신선도 가드는 as-of 이력이 아니다(ⓑ §4). fx 참조를 기록하려면 rate_date 저장계층 신설이 선행.
- 🔴 **저장금지 11항을 스키마 게이트로 상속하라** — No-PII 헌법·자격증명 원칙(데이터 헌법). Evidence에 Password/Token/Card/급여/PII 원문 유입은 §2 데이터 헌법 위반.
- 🔴 **`lineage`(ABSENT) 신설 필수** — Evidence 산출 소스 체인이 없으면 XAI(근거 표시)·감사 재구성이 불가(Data Trust 헌법 Volume 3 Lineage 부록).
