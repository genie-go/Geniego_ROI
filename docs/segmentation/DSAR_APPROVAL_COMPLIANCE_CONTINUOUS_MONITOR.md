# DSAR — Continuous Compliance Monitor (Part 3-17 §8)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_17_COMPLIANCE_REGULATORY_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_COMPLIANCE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_COMPLIANCE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_COMPLIANCE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC §8 — Continuous Compliance Monitor)

인가 지형의 변경을 **실시간**으로 감지하고 컴플라이언스 규칙(§7)을 재평가하는 연속 감시기를 규정한다. 감시 대상 이벤트:
- **Policy 변경** · **Permission 변경** · **Role 변경** · **Assignment 변경**
- **Runtime 결정**(PEP 게이트 통과/거부)
- **Threat/Risk 신호**

각 이벤트에서 관련 통제·규칙을 재평가하여 posture drift·신규 위반을 즉시 표면화하고, 고심각 위반은 forward(alert)한다.

## 2. Substrate 매핑

| SPEC 요구 | 현행 substrate | 상태 |
|---|---|---|
| audit event 통합 수집 | `Compliance.php:143-190`(audit 통합)·`:149-161`·`:163-175`·`:177-187` | 존재(배치성) |
| 고심각 forward | `Compliance.php:430-461`(forward)·`:438-439` · `UserAuth.php:4193-4195` | 존재(부분) |
| append-only 감사 소스 | `SecurityAudit.php:14-68`(append)·`:35-41`·`:56-68`·`:71-153`(verify) | 정본 존재 |
| 실시간 룰 재평가 | — | **ABSENT** |
| Threat/Risk 연동 | `Risk.php:12`·`:31`·`:149-152`(KEEP_SEPARATE) | 별 도메인 |

## 3. 설계 계약

1. `ContinuousMonitor::onEvent(evt)` — audit 이벤트 스트림(`Compliance.php:143-190`) 구독, 이벤트 유형별로 영향 통제·규칙 집합 결정.
2. 변경 이벤트 → §7 `ComplianceRuleEngine::evaluate` 재호출 → verdict delta 산출.
3. 신규 Mandatory 위반 → `Compliance.php:430-461` forward 경로 재사용(순신설 아닌 확장) + `SecurityAudit` append.
4. posture drift 지표(직전 스냅 대비)를 §9 Assessment에 push.
5. 실시간 룰평가 루프는 **순신설**(현행은 조회시점 배치 집계).

## 4. KEEP_SEPARATE

- `Risk.php`·`AnomalyDetection.php:2-6`·`ModelMonitor.php` — Threat/Risk·이상탐지·모델감시 신호원. 감시 **입력**으로만 참조, 컴플라이언스 로직 흡수 금지.

## 5. 판정

**PARTIAL** — 현행 audit event 통합(`Compliance.php:143-190`)·고심각 forward(`:430-461`·`UserAuth.php:4193-4195`)·append-only 정본(`SecurityAudit.php:71-153`)이 substrate로 존재하나, 이는 **조회시점 배치 집계**이다. 변경 이벤트 실시간 구독·룰 재평가·drift 표면화는 부재. → substrate **확장 + 실시간 룰평가 순신설**. 코드 변경 0 · BLOCKED_PREREQUISITE(선행: §7 규칙 엔진·§6 매핑).
