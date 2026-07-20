# DSAR — PDP/PEP Governance: 정책 응답 (APPROVAL_POLICY_RESPONSE)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_12_PDP_PEP_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_PDP_PEP_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_POLICY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_POLICY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_POLICY_RESPONSE`는 PDP가 PEP에게 반환하는 **결정 응답 객체**(SPEC §2)다. 결정유형(SPEC §9)과 결정론적 출력(SPEC §4) 계약을 규정한다.

- **결정 응답 = Decision Type(§9)** + Evidence/Explain 참조(SPEC §16·§23). PEP는 이 응답을 우회할 수 없다(SPEC §5).
- **Deterministic 출력(§4 말미)**: 동일 입력→동일 응답. Decision Pipeline 10단계 Decision Generation의 산출(SPEC §8).
- 응답은 Snapshot(§22)·Evidence(§23)·Digest(§24)로 봉인된다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 요소 | 판정 | 근거(GT file:line) |
|---|---|---|
| 결정론적 응답(proto) | **PARTIAL·미배선** | `effectiveForUser` 결정론적 산출(clamp) `TeamPermissions.php:393-421`·`:407-416` (GT①§C·ADR D-1) |
| 응답=Decision Type | **PARTIAL** | MFA/Challenge `UserAuth.php:929-964`·Read-only `:1128` 실집행 응답 (GT①§F·②§2) |
| PEP 우회불가(응답 강제) | **PARTIAL(이원분산)** | 중앙 PEP `index.php:69`·`:572-619`·`:78-89`; 분산 `requireTeamWrite` `UserAuth.php:1134`·`guardWarehouse` `Wms.php:557` — PDP 미경유 각자 판정 (GT②§2 PEP 행) |
| Evidence(응답 증거) | **PARTIAL** | SecurityAudit 해시체인 `SecurityAudit.php:12-53`·`:56-68`; auth_audit_log `UserAuth.php:4174-4197`·`:4203`(문자열 detail·rule/scope trace 없음) (GT①§G) |
| Explain(Why Permit/Deny) | **ABSENT** | 런타임 결정 설명 생성기 부재. `$violations` `TeamPermissions.php:656-674`는 위임 위반 나열만 (GT②§2 Explain 행) |
| 통합 Response 객체(Decision Generation) | **ABSENT** | Decision Generation·통합 응답 계약 부재 (GT②§2 Pipeline 행) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **결정론(Determinism)**: `effectiveForUser`(`:393-421`)의 clamp 결정성을 응답 계약으로 승격 — 동일 Request+Context+Policy Version→동일 Response(ADR D-1).
- **응답 필드**: {decision_type(SPEC §9), obligations(MFA/Approval), evidence_ref(§23), snapshot_ref(§22)}. 현행 MFA/Challenge/Read-only(`UserAuth.php:929-964`·`:1128`)를 decision_type enum에 매핑.
- **PEP 강제 계약**: 분산 PEP(`requireTeamWrite` `:1134`·`guardWarehouse` `Wms.php:557`)를 PDP Response 소비로 재배선 — PEP는 PDP 우회 불가(SPEC §5·ADR D-2).
- **Evidence 봉인**: 응답 증거는 SecurityAudit 해시체인(`SecurityAudit.php:12-53`) 확장 — 현행 문자열 detail을 구조화된 Evaluation Chain/Rule Trace/Scope Trace로 확장(ADR D-5).
- **Explain 신설**: Why Permit/Deny(SPEC §16)는 `$violations`(`TeamPermissions.php:656-674`) 패턴 확장으로 순신규(ADR D-3).
- **테넌트 격리**: 응답은 X-Tenant-Id(`index.php:619`) 스코프 내 유효(ADR D-7).

## 4. KEEP_SEPARATE (마케팅 policy 흡수금지)

- `Decisioning.php:432`(recommendations)·`RuleEngine.php:24`·`AutoRecommend` = 마케팅 의사결정 응답 — authz Decision Response 아님 (GT②§C-1).
- `action_request.policy_id`(`Db.php:576`·`routes.php:439-445`)·maker-checker(`Mapping.php:269`) = 알림 액션정책 응답 — authz PDP 응답 아님 (GT②§C-2).
- `PgSettlement`(`routes.php:655`)·`Connectors.php:902`(reconcil) = ops/finance 결과 — authz Reconciliation 아님 (GT②§C-3).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **재활용(Extend)**: 결정론적 응답 = `effectiveForUser`(`:393-421`) 승격; 응답 Decision Type = MFA/Challenge(`:929-964`)·Read-only(`:1128`); Evidence = SecurityAudit 체인(`:12-68`)·auth_audit_log(`:4174`) 확장(GT①§C·F·G·ADR 2.1).
- **순신규(ABSENT)**: Decision Explain(Why Permit/Deny)·통합 Response 객체·Decision Generation 파이프라인(GT②§2·ADR D-3).
- **정직 분리(ADR D-8)**: SecurityAudit는 문자열 detail만 기록·rule/scope trace 미기록(실재 과장 회피). Explain grep 0은 실측 부재(부재 과장 회피).
- **선행의존**: BLOCKED_PREREQUISITE — Part 1~3-11 인증 후 실 구현. ERRE(3-7) 산출이 응답 핵심 입력. 마케팅 decision 흡수 금지.
- **판정**: NOT_CERTIFIED · 코드 변경 0 · 설계 명세.
