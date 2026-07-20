# DSAR — Runtime SoD Enforcement: 충돌 드리프트 (APPROVAL_SOD_DRIFT)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_10_RUNTIME_SOD_ENFORCEMENT_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_SOD_ENFORCEMENT_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_SOD_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_SOD_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_SOD_DRIFT`(SPEC §2·§27)는 **선언된 SoD 통제(Rule/Matrix)와 실제 런타임 강제 상태가 시간이 지나며 벌어지는 편차(Drift)를 탐지**하는 엔티티다. SPEC §27은 5종 드리프트를 지정한다.

| 드리프트 종류 | SPEC §27 의미 |
|---|---|
| Rule Drift | Conflict Rule 정의가 승인 baseline에서 이탈(비인가 변경·비활성화) |
| Matrix Drift | Conflict Matrix(Left/Right/Severity/Strategy)가 정본에서 이탈 |
| Runtime Drift | 매 요청 Runtime Evaluation(§22)의 실 강제 결과가 선언 규칙과 불일치 |
| Scope Drift | 동일 Dataset/Org/Tenant(§12) 충돌 판정 범위가 이탈 |
| Assignment Drift | Assignment(§4) 상태가 마지막 Static SoD 평가 이후 상충 조합으로 표류 |

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| substrate | 판정 | 근거(GT) |
|---|---|---|
| SoD 전용 Drift 스키마·탐지 코드경로 | **ABSENT(grep 0)** | GT② §2 "SoD 전용 …Drift… grep 0" · ADR §2.2 |
| baseline 비교 대상이 될 Conflict Rule/Matrix/Registry | **ABSENT(순신규)** | GT① §1·§3 · GT② §2 "SoD Registry/Conflict Rule/Conflict Matrix ABSENT" |
| 불변 baseline 스냅샷 기록 기반(재활용) | PARTIAL | `SecurityAudit.php:14-33`·`:56-69`(append-only 해시체인·GT① §F) — Drift 증거·baseline 고정에 재활용 |
| Assignment 상태 원천(재활용) | PARTIAL | `UserAuth.php:263-316`(세션 단일 team_role) — Assignment Drift 판정엔 다중 활성역할 스냅샷 선행 필요(ADR §D-4) |

Drift는 "선언 baseline"과 "실 강제"의 **두 상태 모두**를 전제하는데, SoD 축에서는 baseline(Rule/Matrix)조차 부재하므로 Drift는 전면 순신규다.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **필드(안)**: `drift_id`·`tenant_id`·`drift_type`(Rule/Matrix/Runtime/Scope/Assignment)·`baseline_ref`(SecurityAudit 해시)·`observed_state`·`delta`·`detected_at`·`severity`(SPEC §15 Low~Regulatory).
- **상태**: DETECTED → REVIEWED → (REMEDIATED | ACCEPTED_EXCEPTION). ACCEPTED 시 §18 Exception 워크플로 연동.
- **제약**: SPEC §36 — Matrix Integrity·Snapshot Integrity·Tenant Isolation·Immutable Conflict Rule을 baseline 무결성 근거로 사용. 테넌트 격리는 `index.php:614-619`(X-Tenant-Id 서버도출 강제·GT① §E) 원칙 준수 — 드리프트 판정은 auth_tenant 스코프 내로 한정.
- **증거**: 탐지 이벤트는 `SecurityAudit.php:14-33` 불변체인에 append(ADR §D-5).

## 4. KEEP_SEPARATE (동음이의 흡수금지)

- **Drift ≠ Model Drift**: `ModelMonitor.php`(model drift)는 ML 모델 성능 편차이지 SoD 규칙/매트릭스 이탈이 아니다(GT② B-6). 개명·흡수 금지.
- **Drift ≠ Anomaly**: `AnomalyDetection.php`(마케팅 이상탐지·GT② B-6)와 무관.
- **"conflict" 41파일 흡수금지**: 409 Conflict·ChannelSync/MenuPricingSync data sync conflict(GT② B-1)를 SoD Drift 신호로 오인 금지.

## 5. 판정 (NOT_CERTIFIED · ABSENT-순신규 · 선행의존)

**APPROVAL_SOD_DRIFT = ABSENT(순신규).** SoD Drift 스키마·탐지·baseline 비교 전부 grep 0(GT② §2). baseline이 될 Conflict Rule/Matrix가 선행 부재하므로 Drift는 그 위에만 성립 — **선행 의존**: Conflict Matrix·Rule Registry(ADR §D-2)·Conflict Snapshot(ADR §D-4) 신설 후. 재활용: SecurityAudit 불변체인(baseline 고정·증거)·cross-tenant 격리. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(Part 1~3-9 인증 후 RP-track).
