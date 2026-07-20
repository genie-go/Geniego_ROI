# DSAR — Authorization Remediation Plan (Part 3-20 §7)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_HEALING_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC) — APPROVAL_REMEDIATION_PLAN

Anomaly Event(§6)를 입력으로 받아 **어떤 조치를 어떤 안전등급으로 수행할지 계획**하는 불변 산출물.
조치 자체가 아니라 계획(plan)이며, 자동 가능/자동 금지를 강제 분류한다.

| 등급 | Remediation Action | 안전등급 |
|------|--------------------|----------|
| 자동 가능 | Cache Rebuild / Config Reload / Policy Revalidation | AUTO |
| 자동 가능 | Session Cleanup / Expired Assignment Cleanup | AUTO |
| 자동 가능 | Cert Reload / Trust Cache Refresh / Metadata Sync | AUTO |
| **자동 금지** | Critical Policy 삭제 · Role 삭제 · Compliance 규칙 삭제 | **MANUAL(승인 필수)** |
| **자동 금지** | SoD 규칙 삭제 · Global Permission 삭제 | **MANUAL(승인 필수)** |

**Safety Guardrail(강행)**: 파괴적·비가역(삭제/권한 축소로 인한 서비스 차단) 조치는 자동 집행 금지.
반드시 Recovery Workflow(§15)의 maker-checker 승인 단계를 경유한다.

## 2. Substrate 매핑

| SPEC 요소 | 현존 substrate | 상태 |
|-----------|----------------|------|
| remediation plan 스키마 | (없음) | ABSENT — remediat grep 0 |
| 탐지 입력 | AccessReview 탐지(`AccessReview.php:87`) | 재사용 후보 |
| Session Cleanup 원형 | inline session GC(`UserAuth.php:989`) | PARTIAL(계획 없는 즉시 GC) |
| 승인 단계 | maker-checker 정족수(`Mapping.php:240`) | 재사용 후보(§15에서 결선) |
| append-only 기록 | `SecurityAudit.php:14-68` | 재사용 후보 |

## 3. 설계 계약

- **순신설**: remediation 도메인은 grep 0. plan은 anomaly event를 참조하는 불변 레코드로 신설.
- **자동/수동 강제 분류**: AUTO 조치만 자동 파이프라인 진입. MANUAL은 plan 단계에서 승인 요구 플래그를
  강제하고 §15로 위임. plan이 등급을 결정하며 executor가 등급을 재정의할 수 없다(fail-closed).
- **Session Cleanup 정합**: 기존 inline GC(`UserAuth.php:989`)를 plan 하에 계획적 조치로 승격하되
  즉시삭제 side-effect는 AUTO 안전조치 범위(비가역 권한삭제 아님)로 한정.
- **멱등·근거**: 모든 plan action은 멱등적이고 근거(anomaly event id·baseline)를 명시한다.

## 4. KEEP_SEPARATE

- `Alerting.php:660` executeAction — **광고 actuation**용 죽은 스켈레톤. producer가 INSERT하는 곳이
  전무(`routes.php:443-452` dangle)하며 작동 remediation이 아니다. authz remediation으로 흡수·전용 금지.
- `AutoCampaign.php:892`·`:917`·`:930-933` — 마케팅 캠페인 자동화. authz 조치 아님.
- `AnomalyDetection.php:3`·`:49` — 마케팅 SPC. 입력원으로도 사용 금지.

## 5. 판정

**ABSENT** (remediat grep 0). 기반 후보는 AccessReview 탐지(`AccessReview.php:87`)와
inline session GC(`UserAuth.php:989`)뿐. Alerting(`Alerting.php:660`)은 광고용 죽은 스켈레톤으로
remediation 취급 금지. Safety Guardrail(자동삭제 금지) 명시. 순신설. 코드 변경 0 · NOT_CERTIFIED ·
BLOCKED_PREREQUISITE.
