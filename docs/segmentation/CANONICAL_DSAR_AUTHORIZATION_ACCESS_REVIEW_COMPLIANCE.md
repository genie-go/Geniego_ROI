# CANONICAL DSAR — Access Review & Compliance (Access Review Campaign·Certification·Orphan/Dormant·Compliance Mapping·Hygiene Job)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-7 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> **★★스펙 미수령 — 설계 자율 판단(사용자 명시 승인)** · 정본 스펙 수령 시 재정합 · **§요구 부재 → 완료 조건 판정 불가·§53/§59 없음**.
> 정본 쌍: [`CANONICAL_DSAR_AUTHORIZATION_AUDIT_EVIDENCE.md`](CANONICAL_DSAR_AUTHORIZATION_AUDIT_EVIDENCE.md)(Audit/Evidence/Hash Chain/SIEM) + 본 문서.
> ADR: [`../architecture/ADR_DSAR_REBATE_AUTHORIZATION_AUDIT_ACCESS_REVIEW.md`](../architecture/ADR_DSAR_REBATE_AUTHORIZATION_AUDIT_ACCESS_REVIEW.md).
> 선행: 5-1(Critical Gap → **"Access Review 차단"** 을 전 블록이 참조) · 5-2(Assignment) · 5-4(Toxic Combination·Post-Action Review) · 5-5(만료 세션 정리 Job 부재).
> **범위**: 접근 검토·컴플라이언스만 — Certification=**5-8**.

---

## 0. 실측 요약 — ★전 블록이 참조한 "Access Review" 가 실은 없다

| 스펙 요구 | 현행 실측 | 분류 |
|---|---|---|
| **Access Review** | ❌ **부재(grep 0)** — `access_review`/`accessReview` 전무 | **NOT_APPLICABLE → 신설** |
| **★전 블록의 참조** | ⚠️ 5-1~5-6 의 **Critical Gap 대응이 전부 "Access Review 차단"** 으로 귀결(5-1 §43 · 5-2 · 5-3 · 5-4 · R1~R5 도 동일) — **그런데 그 Access Review 가 부재** | **★설계 순환 참조(본 문서 §2 해소)** |
| **Compliance 인접** | ✅ **REAL** — `Compliance.php`(**LEEF 2.0 · RFC 5424 Syslog** SIEM 반출·282차) · **`GdprConsent`** · **`Dsar`**(5경로·`/v424/dsar/*`) · 헌법 Vol1~5·No-PII | **재사용** |
| **Post-Action Review** | ❌ 부재(5-4 확정) | **NOT_APPLICABLE → 신설** |
| **Orphan/Dormant 탐지** | △ **부분 REAL** — api_key `last_used_at`·`use_count`(Db.php:950-952) = **미사용 탐지 원재료** · **자동 비활성화는 부재**(5-1 §37) | **재사용 + 신설** |
| **만료 세션 정리 Job** | ❌ **부재**(5-5 관찰 위임) — `DELETE FROM user_session` 는 **deprovision/강제종료 경로만** | **NOT_APPLICABLE → §5 신설** |
| **★SCIM 자동 deprovision** | ✅ **REAL** — `if ($active === 0) DELETE FROM user_session WHERE user_id=?`(EnterpriseAuth.php:400/413) = **IdP 연동 시 자동 정리** | **재사용(Review 의 자동화 원형)** |
| **Toxic Combination 탐지** | ❌ 부재(5-4) | **NOT_APPLICABLE → §3** |

**★결론(정직)**: **Access Review 는 완전 부재**다. **그런데 5-1~5-6 의 Critical Gap 대응이 전부 "Access Review 차단"으로 귀결**한다 — **즉 앞선 6개 블록이 존재하지 않는 기능에 의존하는 설계 순환**이 있었다. 본 문서가 **그 순환을 해소**한다(§2). 실 인접 = **SIEM 반출**(282차) · **GdprConsent·Dsar** · **api_key last_used_at/use_count**(Dormant 원재료) · **SCIM 자동 deprovision**(자동화 원형).

### ★인접 관찰 (코드변경 0)

**[관찰 1·설계 순환 참조 — 자기 지적]** 5-1 §43 이 Critical Gap 18종의 대응을 **"Access Review 차단"** 으로 정의했고, 5-2·5-3·5-4·R1~R5 도 이를 인용했다. **그러나 Access Review 는 부재(grep 0)** — **존재하지 않는 기능에 의존한 설계**였다. **★해소(자율 판단)**: "Access Review 차단"의 **실질은 두 가지로 분해**된다 — **①즉시 차단(Runtime Guard·5-6 PDP)** = 지금 이 요청을 막는 것 · **②사후 검토(Access Review·본 문서)** = 왜 그런 권한이 있었는지 주기 점검. **Critical Gap 의 1차 대응은 ①(Runtime Guard)이어야 하고, Access Review 는 2차(재발 방지)**다. **앞선 블록의 "Access Review 차단" 표기는 "Runtime Guard 차단 + Access Review 등재"로 읽어야 한다** — 본 문서에서 정정.

**[관찰 2] Dormant 탐지 원재료는 이미 있다** — api_key 의 **`last_used_at`·`use_count`**(Db.php:950-952)가 **미사용 키 탐지의 실 원재료**다. **5-1 §37 "사용되지 않는 Account 비활성화"** 를 **새 추적 필드 없이** 구현 가능. **★단 인간 Subject(app_user)에는 last_used_at 이 없다**(세션 created_at 만) → **Dormant User 탐지는 세션 이력 기반**이 되어야 한다.

---

## 1. Canonical Entity (12) — 자율 설계

ACCESS_REVIEW_CAMPAIGN · REVIEW_ITEM · REVIEW_DECISION · REVIEWER_ASSIGNMENT · CERTIFICATION_RECORD · ORPHAN_DETECTION · DORMANT_DETECTION · HYGIENE_JOB · COMPLIANCE_CONTROL_MAPPING · COMPLIANCE_EVIDENCE_PACK · REVIEW_RECONCILIATION · REVIEW_AUDIT_EVENT.

## 2. ★Access Review Campaign (§1) — 설계 순환 해소

- **★§2 원칙(관찰 1 해소)**: **Critical Gap 의 1차 대응 = Runtime Guard 즉시 차단(5-6)** · **Access Review = 2차(사후 주기 검토·재발 방지)**. **앞선 블록의 "Access Review 차단" 은 "Guard 차단 + Review 등재"로 정정**.
- **Campaign(§1)**: campaign_id · **scope**(tenant / Role / 고위험 Permission / Toxic Combination / Break Glass 사용자) · **trigger**(PERIODIC / **CRITICAL_GAP_DETECTED** / INCIDENT / ROLE_CHANGE / **SOD_VIOLATION** / AUDIT_FINDING) · period · **reviewer 지정 규칙** · due_at · status · evidence.
- **Review Item(§1b)**: item_id · campaign · **subject · granted_role/permission · scope · 부여 근거**(5-2 assigned_by/reason/approval — **★현행 부재라 "근거 없음"이 다수일 것**) · **last_used**(§4 Dormant) · **risk_level** · 관련 Violation(5-4) · evidence.
- **Decision(§1c)**: **CERTIFY**(유지) · **REVOKE** · **MODIFY_SCOPE** · **REQUIRE_JUSTIFICATION** · **ESCALATE** · defer(사유 필수·기한). **★REVOKE 는 실제 회수까지 확인**(5-5 "권한 회수 = Grant REVOKED + 세션 종료 + 캐시 무효화" · **Review 가 REVOKE 했는데 권한이 남아 있으면 Review 는 무의미**).
- **★Reviewer 규칙(5-4 Maker-Checker 계승)**: **reviewer ≠ 검토 대상 subject**(자기 권한 자기 승인 금지) · **reviewer ≠ 부여자**(assigned_by) 권장 · sensitive Role 은 **상위 검토자**.

## 3. Orphan (§3) · Dormant (§4) · Toxic (§5) 탐지

- **Orphan(§3)**: 소유자 없는 Grant — **퇴사/비활성 계정의 Role** · **삭제된 Team/Tenant 참조** · **존재하지 않는 Resource 의 Permission**. **★현행 정본 재사용**: **SCIM `active === 0` → 세션 즉시 삭제**(EnterpriseAuth.php:400) = **IdP 연동 시 자동 해소** · **비 SCIM 경로는 수동**(→ Review 대상).
- **Dormant(§4)**: 장기 미사용 Grant. **★현행 원재료**: api_key **`last_used_at` · `use_count`**(Db.php:950-952) → **N일 미사용 키 = Dormant** → **5-1 §37 "사용되지 않는 Account 비활성화"** 구현 가능(**새 필드 불필요**). **★인간 Subject 는 `last_used_at` 부재**(관찰 2) → **세션 이력 기반 추정** 필요.
- **Toxic(§5)**: 5-4 Toxic Combination(PAYOUT_APPROVER+PAYOUT_OPERATOR 등) · **5-1 §43 "동일 사용자에게 모든 고위험 권한 집중"** → **Campaign trigger**.

## 4. Certification (§6) · Compliance Mapping (§7)

- **Certification Record(§6)**: certification_id · campaign · subject · **certified_grants · revoked_grants · certifier · certified_at · next_review_at** · evidence. **★Certification 은 "그 시점의 정당성 확인"** — **무기한 유효 아님**(next_review_at 필수).
- **Compliance Mapping(§7)**: control_id · **framework**(내부 헌법 / GDPR / 개인정보보호법 등) · **요구 사항 · 대응 Control · Evidence 위치 · 검증 방법** · owner · evidence.
- **★현행 재사용**: **`Compliance.php`**(SIEM LEEF/Syslog 반출·282차) · **`GdprConsent`** · **`Dsar`**(5경로 `/v424/dsar/*`) · **헌법 Vol1~5**(Vol3 Trust READY · Vol4 Explainable · No-PII · 테넌트 격리) · `.githooks/baseline.json`.
- **★법률 자동 확정 금지**(선행 Privacy 파트 계승) — 법적 요구 매핑은 **`LEGAL_REVIEW_REQUIRED`** 로 표기 · **본 문서는 프레임워크만 제공**.

## 5. ★Hygiene Job (§8) — 5-5 위임 해소

- **Job(§8)**: job_id · **job_type · schedule · 대상 · 처리 정책 · dry-run · 결과** · evidence.
- **★5-5 위임 판정(자율)**: **만료 세션 정리 Job 부재** — `DELETE FROM user_session` 는 **deprovision(EnterpriseAuth.php:400/413)·강제종료(UserAdmin.php:365) 경로만**이고 **주기 정리가 없다** → **`user_session` 에 만료 행 누적**.
  - **판정: 기능 결함 아님 · 위생 이슈**(만료는 조회 시점 검증으로 처리되므로 **보안 영향 없음**).
  - **단 부작용**: ①테이블 비대 ②**만료 토큰이 DB 에 남아 유출 시 재사용 시도 가능**(단 만료 검증이 있어 무효) ③Dormant/Review 분석 노이즈.
  - **권장**: **주기 cron 으로 `expires_at < now()` 정리**(현행 cron 인프라 재사용 — SMS/Kakao 예약 드레인 워커·shelf_rank_cron·media_gc_cron 선례) · **삭제 전 감사 집계**(Review 입력 보존).
- **Job 후보(자율)**: ①만료 세션 정리 ②**Dormant api_key 비활성화**(last_used_at 기반) ③Orphan Grant 탐지 ④**hash chain 검증**(짝 문서 §2b) ⑤SIEM Export 누락 감지 ⑥Campaign 자동 생성(주기).

## 6. Reconciliation (§9) · Guard/Error (§10)

- **Reconciliation(§9, 6)**: **Review REVOKE ↔ 실 회수**(★Review 가 REVOKE 했는데 권한 잔존 = Review 무의미) · Campaign ↔ 미검토 Item(due 초과) · Certification ↔ next_review_at 경과 · Dormant 탐지 ↔ 실 사용 이력 · **Toxic Combination ↔ 현 Assignment**(5-4) · Compliance Control ↔ Evidence 존재.
- **Guard(§10a, 6)**: **REVIEW_OVERDUE** · **CERTIFICATION_EXPIRED** · **REVIEWER_IS_SUBJECT**(자기 검토) · REVIEW_REVOKE_NOT_APPLIED · **CRITICAL_GAP_WITHOUT_REVIEW** · COMPLIANCE_EVIDENCE_MISSING.
- **Error(§10b, 5)**: `AUTHORIZATION_REVIEW_OVERDUE` · `AUTHORIZATION_CERTIFICATION_EXPIRED` · `AUTHORIZATION_REVIEWER_CONFLICT` · `AUTHORIZATION_REVOKE_NOT_ENFORCED` · `AUTHORIZATION_COMPLIANCE_EVIDENCE_MISSING`.

## 7. Access Review Matrix — 현행

| 항목 | 현행 | 근거 |
|---|---|---|
| **Access Review** | ❌ **부재(grep 0)** — 그런데 **5-1~5-6 이 전부 이것에 의존**(설계 순환·관찰 1) | — |
| Post-Action Review | ❌ 부재 | 5-4 |
| **Dormant 원재료** | ✅ **REAL** — api_key `last_used_at`·`use_count` | Db.php:950-952 |
| **Orphan 자동 해소(IdP)** | ✅ **REAL** — SCIM `active===0` → 세션 삭제 | EnterpriseAuth.php:400/413 |
| **SIEM 반출** | ✅ **REAL** — LEEF 2.0·RFC 5424 | Compliance.php:225/238(282차) |
| **Privacy 인접** | ✅ REAL — GdprConsent · Dsar(`/v424/dsar/*`) | — |
| **만료 세션 정리 Job** | ❌ 부재(**위생 이슈**·보안 영향 없음) | 5-5 위임 판정 |
| Toxic Combination 탐지 | ❌ 부재 | 5-4 |
| Certification · Compliance Mapping | ❌ 부재 | — |
