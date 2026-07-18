# DSAR — Approval Delegation Evidence Contract (§56)

> EPIC 06-A-01 Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §56 · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · ADR(예정): `ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md`
> **분모 = 측정기 산출**(`measure_spec_denominator.mjs --sec=56` → 58 = 필수필드 48 + 저장금지 10). "Vacation/Medical Leave 사유 최소 Category만"은 산문 지침(불릿 아님·미계수)이나 §3에서 신설로 명기한다.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_DELEGATION_EVIDENCE` 엔티티 | Delegation Evidence 레코더 grep **0**(ⓑ §2.5) — Delegation 개념 부재로 증거 대상 없음 | `NOT_APPLICABLE`(엔티티 부재) |
| Evidence/immutable_hash 정본 | 🔴 **REAL** = `SecurityAudit::verify():56-68`(`:27` tenant 해시·`:31` preimage ts 저장·`:63` 재계산·`hash_equals`+`prev_hash`)(ⓑ §2.5) — 검증형 무결성 정본 | `LEGACY_ADAPTER`(immutable_hash·recorded_at·audit reference 인접 실재) |
| 🔴 menu_audit_log.hash_chain | **인용 금지** — 검증 불가능한 장식([[reference_menu_audit_log_not_tamper_evident]]) | 정본 아님 |
| tenant_id 격리 | Tenant Isolation Guard REAL(`index.php:600`·strict 기본 OFF `:585`)(ⓑ §3.4) | `LEGACY_ADAPTER` |
| Approval/Authority/Delegation 참조 필드 | Approval Foundation 커버 0(ⓑ §3.1)·Authority Foundation ABSENT(ⓑ §3.2)·Delegation 엔티티 부재 → 참조 대상 미존재 | `BLOCKED_PREREQUISITE` |
| lineage | 🔴 데이터 계보(lineage) 저장계층 grep 0(ⓑ §5) | `ABSENT` |
| 저장금지 항목 | No-PII 데이터헌법(`docs/DATA_INTELLIGENCE_CONSTITUTION.md`)·v418.1 aggregation-only 설계로 **이미 준수**(PII 미저장) | `LEGACY_ADAPTER`(기존 무-PII 설계 준수) |

★**Evidence 엔티티가 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 58종 전사(신설 명세)이며 현행 대조는 "인접 무결성자산/선행부재 깊이/No-PII 준수"를 기록한다. **`VALIDATED_LEGACY` 금지**(§58) — 커버 0.

---

## 1. 원문 전사 + 판정 — **원문 58종**(필수필드 48 + 저장금지 10)

### 필수필드 (48)

| # | 원문 필드 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | evidence_id | Evidence 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 2 | tenant_id | 🔴 Tenant Guard REAL(`index.php:600`·strict OFF `:585`·ⓑ §3.4) | `LEGACY_ADAPTER` |
| 3 | approval_request_id | Approval Request 범용 테이블 0(ⓑ §3.1) | `BLOCKED_PREREQUISITE` |
| 4 | approval_request_version_id | Approval 버전체계 부재 | `BLOCKED_PREREQUISITE` |
| 5 | approval_case_id | Approval Case 0(ⓑ §3.1) | `BLOCKED_PREREQUISITE` |
| 6 | approval_case_version_id | 동일 | `BLOCKED_PREREQUISITE` |
| 7 | approval_item_id | Approval Item 0 | `BLOCKED_PREREQUISITE` |
| 8 | approval_requirement_id | Approval Requirement 0 | `BLOCKED_PREREQUISITE` |
| 9 | approval_chain_resolution_id | Chain Resolution 커버 0(5-3-3-3) | `BLOCKED_PREREQUISITE` |
| 10 | approval_chain_resolution_level_id | 동일 | `BLOCKED_PREREQUISITE` |
| 11 | delegation registry | Delegation Registry 부재 | `BLOCKED_PREREQUISITE` |
| 12 | delegation type | Delegation Type 부재 | `BLOCKED_PREREQUISITE` |
| 13 | delegation definition | Delegation Definition 부재 | `BLOCKED_PREREQUISITE` |
| 14 | delegation version | 불변 버전체인 선례 0(ⓑ §2.5) | `BLOCKED_PREREQUISITE` |
| 15 | delegator subject | Delegator 관계 엔티티 부재(RBAC user는 인접이나 위임관계 아님) | `BLOCKED_PREREQUISITE` |
| 16 | delegator role | `team_role` flat enum 3값(상급자 반환 0·ⓑ §3.3) — 위임 role 참조 아님 | `BLOCKED_PREREQUISITE` |
| 17 | delegator position | 🔴 Position 엔티티 0(`position_idx`=Gantt 오탐·ⓑ §3.3) | `BLOCKED_PREREQUISITE` |
| 18 | delegate subject | Delegate 관계 엔티티 부재 | `BLOCKED_PREREQUISITE` |
| 19 | delegate role | 동일(team_role flat) | `BLOCKED_PREREQUISITE` |
| 20 | delegate position | Position 0 | `BLOCKED_PREREQUISITE` |
| 21 | original authority definition | 🔴 Authority Foundation ABSENT(ⓑ §3.2) | `BLOCKED_PREREQUISITE` |
| 22 | original authority version | Authority Version 부재 | `BLOCKED_PREREQUISITE` |
| 23 | original authority resolution | Authority Resolution 부재 | `BLOCKED_PREREQUISITE` |
| 24 | delegate own authority resolution | 동일 — Delegate 자체 권한 해석기 부재 | `BLOCKED_PREREQUISITE` |
| 25 | scope references | Delegation Scope 엔티티 부재 | `BLOCKED_PREREQUISITE` |
| 26 | resource | Resource Scope 부재 | `BLOCKED_PREREQUISITE` |
| 27 | action | Action Binding 부재(`acl_permission` allow-only 장식) | `BLOCKED_PREREQUISITE` |
| 28 | organization | Org Unit/Hierarchy 0(ⓑ §3.3) | `BLOCKED_PREREQUISITE` |
| 29 | legal entity | Legal Entity void(`biz_no`/`corp_reg`/`tax_id` grep 0·ⓑ §3.3) | `BLOCKED_PREREQUISITE` |
| 30 | geography | Geographic Binding 부재(`Geo` IP→ISO는 Authority 스코프 아님) | `BLOCKED_PREREQUISITE` |
| 31 | original amount | 🔴 금액축 부재(`HIGH_VALUE_KRW` boolean만·ⓑ §3.2) | `BLOCKED_PREREQUISITE` |
| 32 | original currency | 통화 스코프 저장계층 0 | `BLOCKED_PREREQUISITE` |
| 33 | delegated ceiling | Monetary Binding 부재(§18 신설 대상) | `BLOCKED_PREREQUISITE` |
| 34 | delegated currency | Currency Binding 부재 | `BLOCKED_PREREQUISITE` |
| 35 | period | Delegation Period 부재(`valid_to` grep 0·ⓑ §2.1) | `BLOCKED_PREREQUISITE` |
| 36 | acceptance | 수락 개념 부재(manager 일방 치환 `TeamPermissions:652`·ⓑ §2.1) | `BLOCKED_PREREQUISITE` |
| 37 | approval | Approval Foundation 커버 0 | `BLOCKED_PREREQUISITE` |
| 38 | re-delegation chain | 🔴 재위임 경로 grep 0(ⓑ §2.1) | `BLOCKED_PREREQUISITE` |
| 39 | conflict result | Delegation Conflict 엔티티 부재 | `BLOCKED_PREREQUISITE` |
| 40 | resolution result | Delegation Resolution 부재 | `BLOCKED_PREREQUISITE` |
| 41 | snapshot | 🔴 Delegation Snapshot 엔티티 0 — 무결성 패턴 정본=SecurityAudit(§2 참조) | `BLOCKED_PREREQUISITE` |
| 42 | simulation | Delegation Simulation 부재 | `BLOCKED_PREREQUISITE` |
| 43 | reconciliation | Reconciliation 소스(HRIS/Calendar/ERP) 존재조차 안 함(ⓑ §1) | `BLOCKED_PREREQUISITE` |
| 44 | effective_at | Delegation Period(§20) 부재로 유효시점 미결정. 인접 `kr_fee_rule.effective_from`(수수료 도메인·ⓑ §2.1) — Delegation 아님 | `BLOCKED_PREREQUISITE` |
| 45 | recorded_at | 🔴 REAL = SecurityAudit preimage ts 저장(`:31`·ⓑ §2.5) | `LEGACY_ADAPTER` |
| 46 | immutable_hash | 🔴 REAL = SecurityAudit `hash_equals`+`prev_hash`(`:63`·ⓑ §2.5)·menu_audit_log.hash_chain 인용 금지 | `LEGACY_ADAPTER` |
| 47 | lineage | 🔴 데이터 계보 저장계층 grep 0(ⓑ §5) | `ABSENT` |
| 48 | audit reference | 🔴 REAL = SecurityAudit / pm_audit_log(검증형 감사 정본) | `LEGACY_ADAPTER` |

### 저장금지 (10) — No-PII 데이터헌법 준수

| # | 원문 저장금지 항목 | 현행 대조 | 판정 |
|---|---|---|---|
| 49 | Password | No-PII 데이터헌법 + 자격증명 평문노출 회피 설계로 미저장 준수([[feedback_credentials_handling]]) | `LEGACY_ADAPTER`(준수) |
| 50 | Access Token | 자격증명 미노출/미저장 준수 | `LEGACY_ADAPTER`(준수) |
| 51 | Credential Secret | 동일 | `LEGACY_ADAPTER`(준수) |
| 52 | 전체 HR Medical Data | HRIS 엔티티 자체 부재(ⓑ §1)·No-PII 헌법 | `LEGACY_ADAPTER`(준수) |
| 53 | 상세 건강 사유 | 최소 Category만(§3 신설 지침) — 상세 사유 미저장 | `LEGACY_ADAPTER`(준수) |
| 54 | 전체 Calendar Body | Calendar OOO 소스 부재(`sharedCalendarEvents`=콘텐츠 캘린더 오탐·ⓑ §1) | `LEGACY_ADAPTER`(준수) |
| 55 | 전체 Email Body | Email 기반 Delegate 소스 부재·No-PII 헌법 | `LEGACY_ADAPTER`(준수) |
| 56 | 불필요한 PII | 🔴 No-PII 데이터헌법(aggregation-only·v418.1)·PII 미저장 설계 | `LEGACY_ADAPTER`(준수) |
| 57 | Bank Account 전체 값 | 결제 원문 미저장 설계 | `LEGACY_ADAPTER`(준수) |
| 58 | 민감한 Security Secret | 자격증명/시크릿 미저장·평문노출 회피 | `LEGACY_ADAPTER`(준수) |

**실측 개수: 58 / 58 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 14(필수 4 = tenant_id·recorded_at·immutable_hash·audit reference · 저장금지 10) · `BLOCKED_PREREQUISITE` 42(필수 3~44) · `ABSENT` 1(lineage) · `NOT_APPLICABLE` 1(evidence_id). 합 = 14+42+1+1 = 58.

> 🔴 **커버 0.** Evidence 엔티티가 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 14건은 **확장/준수 대상 인접 자산**(무결성=SecurityAudit·tenant=Tenant Guard·저장금지 10=No-PII 헌법 준수)이지 Delegation Evidence 커버가 아니다.

## 2. 규칙 — No-PII 데이터헌법 연계

- 🔴 **immutable_hash / recorded_at / audit reference 를 신규 해시체인으로 재구현하지 마라** — `SecurityAudit::verify():56-68`(preimage ts·`hash_equals`·`prev_hash`·tenant)가 검증형 정본이다(ⓑ §2.5). Delegation Evidence Snapshot은 이 검증기를 **확장**하라. 🔴`menu_audit_log.hash_chain` 인용 금지 — 검증 불가능한 장식([[reference_menu_audit_log_not_tamper_evident]]).
- 🔴 **tenant_id 를 느슨한 VARCHAR 로 두지 마라** — Tenant Guard(`index.php:600`)를 확장하되 strict 기본 ON(현재 `:585` OFF)으로 Cross-Tenant Evidence 유출을 fail-closed 로(§5.4).
- 🔴 **approval/authority/delegation 참조 43필드는 선행조건이다** — Approval Foundation(§3.1 커버 0)·Authority Foundation(§3.2 ABSENT)·Delegation 엔티티 신설이 **선행**돼야 참조 대상이 생긴다. 이 필드들을 "구현"하려면 선행 엔티티가 선결이며 임의 FK 를 만들지 마라.
- 🔴 **저장금지 10항은 No-PII 데이터헌법의 반영이다**([`docs/DATA_INTELLIGENCE_CONSTITUTION.md`](../DATA_INTELLIGENCE_CONSTITUTION.md)) — "데이터는 많이가 아니라 정확·활용가능하게" + v418.1 aggregation-only(PII 미저장) 설계를 상속하라. Password/Token/Credential/HR Medical/Calendar Body/Email Body/PII/Bank/Security Secret 을 Evidence 에 저장하는 순간 헌법 위반이다.
- 🔴 **Vacation / Medical Leave 사유는 최소 Category 만 저장하라(신설)** — 원문 산문 지침. 상세 건강 사유·전체 사유 텍스트 저장 금지, 열거형 Category(예: `MEDICAL`/`PARENTAL`/`TRAVEL`) 만 보존. 이는 §3.3 HRIS 소스 부재(ⓑ §1) 하에서 신설 시 기본값이다.
- 🔴 **lineage 는 ABSENT — 신규 계보 저장계층 신설** — 데이터 계보 저장계층이 grep 0(ⓑ §5)이므로 Evidence lineage 는 새로 설계하되, 무결성은 SecurityAudit 검증기와 일체화하라(중복 엔진 금지).
