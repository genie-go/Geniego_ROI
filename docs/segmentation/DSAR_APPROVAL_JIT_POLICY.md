# DSAR — JIT Access Governance: 상승 정책 (APPROVAL_JIT_POLICY)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_9_JIT_ACCESS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_JIT_ACCESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_JIT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_JIT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_JIT_POLICY`(SPEC §1-3 Elevation Policy·§7 Approval Workflow의 정책 측면)는 어떤 상승 요청이 **누구의·몇 단계 승인**으로 grant되는지, 최대 기간·회수 조건을 규정하는 정책 레코드다. 승인 유형(SPEC §7): Auto·Single·Dual·Multi-stage·Risk-based·Compliance·Executive Approval. 모든 승인 결정은 Immutable Version으로 저장한다(SPEC §7). 정책은 Zero Standing Privilege(ADR §D-3)를 강제한다 — High-risk 권한은 상시 보유 금지, JIT grant로만 획득.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| substrate | 판정 | 근거(GT 등장 file:line) | 재활용 방식 |
|---|---|---|---|
| Elevation Policy(권한상승 정책) | **ABSENT** | GT② §2 "Elevation Policy — ABSENT"·권한상승 결재 경로 0 | 순신규 |
| maker-checker 정족수 엔진 | PRESENT | `Alerting.php:642-650`(정족수2·`count($distinct)>=2`)·self 재승인 차단 `:634-640`·승인자 서버도출 `:600-606`·approved-only 집행 `:684-686` | 승인 상태머신 패턴 재사용(ADR §D-2, 개명 금지) |
| `required_approvals` 정책 컬럼 선례 | PRESENT | `mapping_change_request` `Db.php:623-636`(`required_approvals INT DEFAULT 2` 실존)·소비 `Mapping.php:209,:287,:527` | 정책기반 승인단계 수 컬럼 동형 참고 |
| Break-Glass 정책 | **PARTIAL(오근접)** | `UserAuth.php:793`(env 마스터로그인)·`:995`(`auth.breakglass` 감사)·MFA 우회 `:945` | 시한부 emergency grant+사후검토로 승격(ADR §D-4) — 현행은 사후검토/티켓/자동회수 없음(GT② §2) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거)

- **정책 필드**: 대상 Role/Permission/Scope·승인 유형(SPEC §7)·최대 기간·회수 조건(SPEC §14 Auto Revocation)·Risk 임계(SPEC §6).
- **승인 단계**(SPEC §7): Risk Level에 따라 Auto→Single→Dual→Multi-stage 자동 상향(Risk-based). self 재승인 금지·정족수 강제는 `Alerting.php:642-650` 패턴 재사용.
- **불변성**(SPEC §33): Immutable Approval — 승인 결정 버전 불변, 위조 차단은 승인자 서버도출(`Alerting.php:600-606`) 패턴.
- **Break-Glass 정책**(SPEC §9): Incident Ticket 필수·Business Justification 필수·Maximum Duration·Continuous Monitoring·Automatic Review. 현행 env 백도어(무기한 admin 세션)를 시한부+사후검토로 승격(ADR §D-4).
- **테넌트 격리·다국어**: 정책은 테넌트 스코프, 승인 유형·거부 사유 라벨은 i18n.
- **에러/경고 계약**(SPEC §30·§31): `JIT_POLICY_BLOCKED`·`JIT_APPROVAL_REQUIRED`·High Risk Elevation 경고.

## 4. KEEP_SEPARATE (동음이의 흡수금지)

| 근접물 | 근거(GT 등장 file:line) | 분리 사유 |
|---|---|---|
| `action_request` 마케팅 결재 | `Alerting.php:571`(대상=캠페인 예산/라이트백)·테이블 `Db.php:592-600` | 마케팅 행위 결재 — 권한상승 정책 아님(GT② B-1) |
| plan/feature 게이팅 | `UserAuth.php:364`(requirePlan)·`:77`(requireFeaturePlan)·`PlanPolicy.php` | 구독 등급 접근 — 시한부 상승 정책 아님(GT② B-3) |
| MFA 정책 | `UserAuth.php:930`(mfa_policy)·`AdminMfaGate.jsx` | 2단계 인증 강화 — JIT 정책 아님(GT② B-6) |
| 광고 킬스위치 | `AdAdapters.php:22`·`:36`(`AD_EXECUTION_DISABLED`)·`AutoCampaign.php:447`(pause-all) | 광고 집행 차단 — break-glass와 무관(GT② B-7) |

## 5. 판정 (NOT_CERTIFIED · 재활용-substrate/ABSENT-governance · 선행의존)

- **판정 = ABSENT-governance / 재활용-substrate.** Elevation Policy는 grep 0(GT② §2)·순신규. Break-Glass는 PARTIAL(오근접) — 인증 백도어는 실재하나 시한부 grant·사후검토는 부재(ADR §D-4, 정직 분리).
- **재활용**: maker-checker 정족수(`Alerting.php:642-650`)·`required_approvals` 컬럼(`Db.php:623-636`)을 대체 아닌 **확장**. action_request/plan 게이팅으로 개명 금지(ADR §D-6).
- **선행 의존**: Part 1~3-8 인증 후 실 구현(BLOCKED_PREREQUISITE). 코드 변경 0 · NOT_CERTIFIED.
