# DSAR — Authorization Observability & Forensics: 정책 추적 (APPROVAL_POLICY_TRACE)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_14_AUTHORIZATION_OBSERVABILITY_FORENSICS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OBSERVABILITY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OBS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OBS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_POLICY_TRACE`(SPEC §2·§12)는 하나의 인가 결정에 대해 **정책 평가 과정을 규칙 단위로 추적**하는 관측 엔티티다. SPEC §12는 추적 대상으로 다음 6요소를 규정한다.

| SPEC §12 요소 | 의미 |
|---|---|
| Evaluated Policy | 평가된 정책(어떤 정책이 결정에 개입했는가) |
| Applied Rule | 실제 적용(적중)된 규칙 |
| Denied Rule | 거부를 유발한 규칙 |
| Skipped Rule | 우선순위/조건으로 건너뛴 규칙 |
| Rule Priority | 규칙 우선순위(평가 순서) |
| Decision Reason | 최종 결정 사유(왜 허용/거부) |

목적은 SPEC §0의 "왜 이 요청이 허용/거부되었는가"에 규칙 단위로 즉답하는 것이다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §12 요소 | 판정 | 근거(GT 인용) |
|---|---|---|
| Evaluated/Applied/Denied/Skipped Rule·Priority | **ABSENT** | 구조화 policy trace grep 0(GT② §2 "Policy/Permission/Session/Resource Trace = ABSENT(grep 0)"). 규칙 단위 evaluated/applied/denied 기록 substrate 전무 |
| Decision Reason | **PARTIAL(평문)** | 감사행 detail이 평문 TEXT(`UserAuth.php:4165` detail TEXT)·구조화 결정사유 아님. 결정 컨텍스트 스냅샷 없음(GT② §2 Runtime Context PARTIAL) |
| 결정 연결(정책 평가→결정) | **ABSENT** | login→session→approval→decision 연결키 부재·`auth_audit_log`는 flat append(`UserAuth.php:4190`) |
| 무결성 앵커(재활용) | **PRESENT** | `SecurityAudit.php:14-33`(append-only)·`:56-68`(verify)=유일 tamper-evident. policy trace 증거는 이 위에 **참조**(AccessReview `:225` 선례) |

★현행 `effectiveScope`(`TeamPermissions.php:236`)·effective route(`routes.php:1605`)는 **현재 상태 산출**이지 규칙별 평가 trace가 아니다.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **필드**(SPEC §3 Authorization Event Model 상속 + §12): Event ID·Correlation ID·Trace ID·Span ID·Policy Version·Decision·`evaluated_policy[]`·`applied_rule[]`·`denied_rule[]`·`skipped_rule[]`·`rule_priority`·`decision_reason`·Risk/Trust Score.
- **불변성**: policy trace 레코드는 Immutable Event Store(SPEC §18 Append Only/Immutable) 위에 append·`SecurityAudit` 해시체인(`SecurityAudit.php:25-27` prev→sha256)에 참조 연결.
- **무결성 검증**: `verify`(`SecurityAudit.php:56-68` broken_at) 패턴을 policy trace 증거체인에 적용.
- **테넌트 격리**: 조회·집계는 테넌트 fail-closed(`Compliance.php:176`) 재사용. Cross-tenant policy trace 열람 금지.
- **오류 계약**(SPEC §30): `TRACE_NOT_FOUND`·`EVENT_CORRUPTED`.

## 4. KEEP_SEPARATE (마케팅 trace 흡수금지)

- **마케팅 "decision"** — `Decisioning.php:12`·`:36`(ingestAdInsights)의 "decision"은 광고 인사이트이지 authz 정책결정 아님(GT② §5 B-2). 정책 trace로 흡수 금지.
- **마케팅 percentile/touch trace** — `AttributionEngine.php:1522`·`:1546`·`:1553`(p5/p95 부트스트랩)·`Attribution.php` attribution_touch는 마케팅 관측(GT② §5 B-2). KEEP_SEPARATE.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정 = ABSENT(구조화 policy trace) / PARTIAL(평문 decision reason)**. Evaluated/Applied/Denied/Skipped/Priority 순신규.
- **재활용(흡수 아님·참조/확장)**: `SecurityAudit.php:14-68`(Immutable Event Store 앵커·verify)·감사행 확장(`UserAuth.php:4165` detail→구조화 trace 컬럼, ADR D-2)·테넌트 격리(`Compliance.php:176`).
- **선행 의존**: BLOCKED_PREREQUISITE — Part 3-12 PDP 결정이 관측 대상(ADR D-6). 실 엔진 구현은 Part 1~3-13 인증 후 RP-track. 코드 변경 0 · NOT_CERTIFIED.

---
### file:line 인용 목록 (전체)
`SecurityAudit.php:14-33` · `SecurityAudit.php:25-27` · `SecurityAudit.php:56-68` · `UserAuth.php:4165` · `UserAuth.php:4190` · `TeamPermissions.php:236` · `routes.php:1605` · `AccessReview.php:225` · `Compliance.php:176` · `Decisioning.php:12` · `Decisioning.php:36` · `AttributionEngine.php:1522` · `AttributionEngine.php:1546` · `AttributionEngine.php:1553`
