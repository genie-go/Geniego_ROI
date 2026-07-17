# CANONICAL DSAR — Authorization Audit & Evidence (Audit Log·Tamper-Evidence·Hash Chain·Retention·SIEM Export)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-7 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> **★★스펙 미수령 — 설계 자율 판단(사용자 명시 승인)**: 상세 스펙 미제공(파트 번호·이름만 5-1 §1 명시). **구조·Entity·분류는 실측 + 5-1~5-6 산출 + 도메인 판단으로 자율 설계** · **정본 스펙 수령 시 재정합** · **§요구 부재 → 완료 조건 판정 불가·§53/§59 없음**(RP-001 정합).
> 정본 쌍: 본 문서(Audit/Evidence/Hash Chain/Retention/SIEM) + [`CANONICAL_DSAR_AUTHORIZATION_ACCESS_REVIEW_COMPLIANCE.md`](CANONICAL_DSAR_AUTHORIZATION_ACCESS_REVIEW_COMPLIANCE.md)(Access Review/Compliance).
> ADR: [`../architecture/ADR_DSAR_REBATE_AUTHORIZATION_AUDIT_ACCESS_REVIEW.md`](../architecture/ADR_DSAR_REBATE_AUTHORIZATION_AUDIT_ACCESS_REVIEW.md).
> 선행: **5-1**(Audit Event 24 · Evidence 계약 · "Authorization Decision Audit 누락=Critical") · 5-4(Post-Action Review) · 5-5(만료 세션 정리 Job 부재) · 5-6(PDP Decision 기록).
> **범위**: 감사·증적만 — 전체 Certification=**5-8**.

---

## 0. 실측 요약 — ★tamper-evident 감사가 이미 있다

| 스펙 요구 | 현행 실측(코드 근거) | 분류 |
|---|---|---|
| **★Hash Chain(tamper-evident) 감사** | ✅ **REAL** — **`menu_audit_log.hash_chain CHAR(64)`**([AdminMenu.php:128](../../backend/src/Handlers/AdminMenu.php)/143) · 주석 **"모든 mutation 에 audit_log 기록 + hash_chain (tamper-evident)"**(:18) · **"audit_log + hash_chain (N-152-A tamper-evident)"**(:166) · **직전 해시 조회로 실 체인 계산**: `SELECT hash_chain FROM menu_audit_log ORDER BY id DESC LIMIT 1`(:216) | **★VALIDATED_LEGACY — 감사 정본(재사용)** |
| **★풍부한 감사 필드** | ✅ **REAL** — menu_audit_log: id · menu_id · action · **old_value JSON** · **new_value JSON** · **changed_by** · **changed_by_role** · **reason** · **ip_address** · **user_agent** · **request_id** · **hash_chain** · created_at · `KEY idx_audit_menu`(AdminMenu.php:123-131) | **★VALIDATED_LEGACY — Evidence 필드 정본** |
| **감사 계통 수** | ⚠️ **13 파일**에 감사 구현 산재 — `audit_log`(id·actor·action·**details_json**·created_at·[AdminGrowth.php:157-158](../../backend/src/Handlers/AdminGrowth.php)·**단순**) · **`menu_audit_log`**(위·**최고 수준**) · `dsar_audit_log`(id·tenant_id·…·[Dsar.php:213-215](../../backend/src/Handlers/Dsar.php)) · auth_audit_log 등 | **CONSOLIDATION_REQUIRED**(스키마 편차 큼) |
| **★SIEM Export** | ✅ **REAL** — **IBM QRadar LEEF 2.0**(`'LEEF:2.0|GeniegoROI|ROI-Platform|1.0|' . action . "|\t" . implode("\t", $attrs)`·[Compliance.php:225](../../backend/src/Handlers/Compliance.php)/234-235) · **RFC 5424 Syslog**(PRI=facility(local0=16)*8+severity·:238) · **282차 R3** | **VALIDATED_LEGACY(재사용)** |
| **Authorization Decision 감사** | ❌ **부재** — Decision 기록 구조 자체가 없음(5-1 §29·5-6) | **NOT_APPLICABLE → 신설** |
| **Access Review** | ❌ **부재(grep 0)** | **NOT_APPLICABLE → 짝 문서** |
| **감사 보존기간 정책** | ❌ **부재** — retention/archival 정책 미발견 | **NOT_APPLICABLE → 신설** |
| **만료 세션 정리 Job** | ❌ **부재**(5-5 관찰 위임) | **NOT_APPLICABLE → 짝 문서 §5** |

**★결론(정직)**: **tamper-evident 감사(hash chain)가 이미 REAL** — `menu_audit_log`(N-152-A)가 **hash_chain + old/new value + changed_by_role + reason + ip + user_agent + request_id** 를 갖춘 **감사 정본**이다. **SIEM Export(LEEF 2.0 · RFC 5424 Syslog)도 REAL**(282차). 문제는 **13 파일에 감사가 산재**하고 **스키마 편차가 크다**는 것(`audit_log` 는 actor/action/details_json 뿐 · menu_audit_log 는 12필드+체인). **부재 = Authorization Decision 감사 · Access Review · 보존기간 정책**.

### ★인접 관찰 (코드변경 0·근거 기록만)

**[관찰 1·선행설계 R3 기술 정밀화] "hash-chain 부재"는 부정확했다** — 선행설계 **R3(Accrual/Ledger) §49** 에서 **"hash-chain Ledger 부재(4-5-1-1 확정) → 신설"** 이라 기술했으나, **본 블록 실측 결과 `menu_audit_log.hash_chain` 이 REAL**이며 **직전 해시를 조회해 실제 체인을 계산**한다(AdminMenu.php:216). **정확한 기술**: **hash-chain 패턴은 REAL(감사 로그·N-152-A)** · **금전 원장(ledger)에는 부재**. → **R3 의 hash-chain 은 "신설"이 아니라 "menu_audit_log 패턴을 금전 원장으로 확장"** 이 정합(Golden Rule=Extend · 중복 구현 금지). **정직 표기: R3 기술을 본 블록에서 정밀화**.

**[관찰 2] 감사 스키마 편차가 크다 — 통합의 딜레마**: `audit_log`(AdminGrowth·**5필드**: id·actor·action·details_json·created_at) vs `menu_audit_log`(**12필드+hash_chain**). **★5-1 이 "audit_log 12파일 = 도메인별 KEEP_SEPARATE(스키마 상이)"** 라 판정했는데, **본 블록에서 그 판정을 재검토**한다: **스키마가 다른 이유가 "도메인 요구 차이"가 아니라 "구현 시점·투자 차이"로 보인다**(menu_audit_log=N-152-A 전용 설계 · audit_log=범용 간이). → **★자율 판정: KEEP_SEPARATE 는 유지하되(테이블 통합은 회귀 위험) `menu_audit_log` 를 감사 **표준 스키마**로 승격하고 신규 감사는 그 수준을 따른다**(하향 평준화 금지). **PM 재증명 전 확정 금지**.

**[관찰 3] `audit_log` 에 tenant_id 가 없다** — `audit_log(id, actor, action, details_json, created_at)`(AdminGrowth.php:158)에 **tenant 컬럼이 없다**. AdminGrowth 는 플랫폼 관리자 도메인이라 **의도일 수 있으나**, **멀티테넌트 감사 조회 시 테넌트 격리 불가**. **★FP 규약상 PM 재증명 전 P0 단정 금지**(실 확인 필요=이 테이블이 테넌트별 조회에 쓰이는지·플랫폼 전용인지) · **비파괴 미수정** → **짝 문서 §Access Review 판정 대상**.

---

## 1. Canonical Entity (12) — 자율 설계

AUTHORIZATION_AUDIT_LOG · AUDIT_SCHEMA_STANDARD · HASH_CHAIN_LINK · HASH_CHAIN_VERIFICATION · AUDIT_EVIDENCE · AUDIT_RETENTION_POLICY · AUDIT_ARCHIVAL · SIEM_EXPORT_CONFIG · SIEM_EXPORT_RUN · AUDIT_COVERAGE · AUDIT_RECONCILIATION · AUDIT_INTEGRITY_ALERT.

## 2. ★Audit Schema Standard (§1) — menu_audit_log 승격

- **★표준 스키마(자율·menu_audit_log 정본 승격)**: id · **tenant_id**(★관찰 3 반영·audit_log 에 부재) · **resource_type · resource_id**(menu_id 일반화) · **action** · **old_value / new_value**(JSON·**민감 원문 금지**→Reference) · **actor**(changed_by) · **actor_role**(changed_by_role) · **reason** · **ip_address** · **user_agent** · **request_id**(5-1 Context 연결) · **hash_chain** · created_at · `KEY idx_*`.
- **현행 대비**:

| 필드 | `menu_audit_log` | `audit_log` | 표준 |
|---|---|---|---|
| actor | ✅ changed_by | ✅ actor | ✅ |
| **actor_role** | ✅ changed_by_role | ❌ | ✅ **필수** |
| **old/new value** | ✅ JSON | △ details_json | ✅ **필수** |
| **reason** | ✅ | ❌ | ✅ **필수** |
| **ip / user_agent** | ✅ | ❌ | ✅ |
| **request_id** | ✅ | ❌ | ✅(상관관계) |
| **hash_chain** | ✅ **CHAR(64)** | ❌ | ✅ **필수** |
| **tenant_id** | ❌(menu 전역) | **❌**(관찰 3) | ✅ **필수** |

- **★규칙**: **신규 감사는 표준 스키마 이상**(하향 평준화 금지) · **기존 테이블은 통합하지 않는다**(KEEP_SEPARATE·회귀 위험) · **점진 상향**(신규 컬럼 추가는 멱등 ALTER 패턴 재사용).

## 3. ★Hash Chain (§2) — N-152-A 정본

- **Link(§2a)**: audit_id · **prev_hash · entry_hash · algo · sealed_at** · evidence. **★현행 정본**: `hash_chain CHAR(64)`(SHA-256 추정) · **직전 해시 조회**(`SELECT hash_chain FROM menu_audit_log ORDER BY id DESC LIMIT 1`·AdminMenu.php:216) → **append 시 이전 해시를 물어 체인**.
- **Verification(§2b)**: 주기 검증 Job · **체인 단절 = `AUTHORIZATION_AUDIT_CHAIN_BROKEN`(Critical)** · 검증 결과 기록. **★현행 부재**(체인은 쓰지만 **검증 Job 미발견**) → 신설.
- **★적용 확대(자율 권장)**: **Rebate 금전 원장**(선행설계 R3 §49) · **Authorization Decision 감사**(§4) · Role Assignment(5-2) · 승인(5-3) · Break Glass(5-5) → **menu_audit_log 패턴 재사용**(신규 hash-chain 구현 금지·§0 관찰 1).
- **한계 정직**: hash chain 은 **append-only 무결성**을 주지만 **전량 삭제·테이블 교체는 못 막는다** → **SIEM 외부 반출**(§5)과 **병행**해야 실효.

## 4. Authorization Decision Audit (§3) — 부재→신설

- **★5-1 §43 "Authorization Decision Audit 누락 = Critical Gap"** · 5-6 에서 **Decision 기록 구조 자체가 부재** 확정.
- **Decision Audit**: 5-1 Audit Event 24 중 **ACCESS_ALLOWED / ACCESS_DENIED / CONDITIONAL_ACCESS_ALLOWED / STEP_UP_REQUIRED / FIELD_MASKING_APPLIED / EXPORT_RESTRICTED / POLICY_CONFLICT_DETECTED / AUTHORIZATION_DRIFT_DETECTED** 를 **표준 스키마 + hash_chain** 으로 기록.
- **★볼륨 문제(자율 판단)**: **1,448 라우트 × 전 요청**을 감사하면 폭증 → **①ALLOW 는 샘플링/집계 ②DENY 는 전량 ③고위험(금전·Credential·PII·Production)은 전량**(5-1 §30 `LOG_SENSITIVE_ACCESS` Obligation) **④CONDITIONAL/STEP_UP/MASKING 은 전량**. **★DENY 를 샘플링하면 안 된다**(공격 탐지 불가).
- **★"감사 실패 시 Action 차단"**(5-5 Break Glass 규칙 계승) — 최소 **고위험 Action 에 한해** 적용(전 요청에 적용 시 가용성 위험).

## 5. Retention (§4) · Archival (§4b) · SIEM Export (§5)

- **Retention(§4)**: retention_policy_id · **audit_type · retention_period · legal_basis · archival_after · deletion_after · legal_hold** · evidence. **★현행 부재** → 신설. **★금전/세무 감사는 법정 보존**(선행설계 R5 "Erasure=익명화+보존" 정합) · **DSAR 삭제 요청에도 감사 원장 물리 삭제 금지**(PII 만 익명화).
- **Archival(§4b)**: 콜드 보관 · **hash chain 연속성 유지**(아카이브 경계에서 체인 단절 금지) · 복원 절차.
- **★SIEM Export(§5) — 282차 정본 재사용**: **IBM QRadar LEEF 2.0**(Compliance.php:225/234-235) · **RFC 5424 Syslog**(:238·PRI=local0*8+severity) → **Authorization 감사도 동일 포맷으로 반출**(중복 Exporter 신설 금지). **★외부 반출이 hash chain 의 한계를 보완**(§2 정직) — 내부 전량 삭제해도 SIEM 에 사본.
- **Export 규칙**: **Credential·Token·PII 원문 반출 금지**(5-1 §48 Evidence 계약 계승) · 반출 실패 시 재시도·**누락 감지**.

## 6. Coverage (§6) · Reconciliation (§7) · Guard/Error (§8)

- **Coverage(§6)**: **감사 대상 Action ↔ 실 감사 기록** 매핑 — **5-1 Audit Event 24 전수** · **미감사 Action = Gap**. **★현행은 13 파일 산재라 Coverage 파악 불가**(5-6 의 "1,448 라우트 Coverage 불가"와 동일 구조).
- **Reconciliation(§7, 7)**: **Audit Log ↔ Authorization Decision**(5-1 §41 `AUDIT_DECISION_MISMATCH`) · **hash chain 무결성**(체인 검증) · Audit ↔ SIEM Export(누락) · Retention ↔ 실 보존 · **Role 변경 ↔ 감사 기록**(5-2) · **승인 ↔ 감사**(5-3) · **Break Glass Action ↔ 전량 로그**(5-5).
- **Guard(§8a, 7)**: **AUDIT_MISSING**(고위험 Action 무감사) · **AUDIT_CHAIN_BROKEN**(Critical) · AUDIT_WRITE_FAILED · **AUDIT_CONTAINS_SECRET**(Credential/PII 혼입) · RETENTION_VIOLATION · **AUDIT_DELETED_UNDER_LEGAL_HOLD** · SIEM_EXPORT_LAGGING.
- **Error(§8b, 6)**: `AUTHORIZATION_AUDIT_MISSING` · `AUTHORIZATION_AUDIT_CHAIN_BROKEN` · `AUTHORIZATION_AUDIT_WRITE_FAILED` · `AUTHORIZATION_AUDIT_SECRET_LEAK` · `AUTHORIZATION_AUDIT_RETENTION_VIOLATION` · `AUTHORIZATION_AUDIT_EXPORT_FAILED`.

## 7. Audit Matrix — 현행

| 감사 계통 | 필드 | hash_chain | tenant | 수준 | 근거 |
|---|---|---|---|---|---|
| **`menu_audit_log`** | **12필드**(old/new value·actor·**actor_role**·reason·ip·ua·request_id) | ✅ **CHAR(64)·실 체인** | ❌(menu 전역) | **★최고·표준 승격** | AdminMenu.php:123-131/166/216 |
| `audit_log` | **5필드**(actor·action·details_json) | ❌ | **❌**(관찰 3) | 간이 | AdminGrowth.php:157-158 |
| `dsar_audit_log` | tenant_id 포함 | ❌ | ✅ | 중간 | Dsar.php:213-215 |
| (그 외 10 파일) | 편차 | — | — | — | 13 파일 |
| **SIEM Export** | **LEEF 2.0 · RFC 5424 Syslog** | — | — | ✅ **REAL** | Compliance.php:225/234-238(282차) |
| **Authorization Decision 감사** | — | — | — | ❌ **부재** | 5-1 §43 Critical |
| **Retention 정책 · 체인 검증 Job** | — | — | — | ❌ 부재 | — |
