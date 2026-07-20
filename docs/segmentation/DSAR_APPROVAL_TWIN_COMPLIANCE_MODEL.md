# DSAR — Authorization Digital Twin Compliance Model (Part 3-22 §13)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_22_DIGITAL_TWIN_PREDICTIVE_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_DIGITAL_TWIN_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_TWIN_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_TWIN_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §13 — Compliance Prediction)

Authorization Digital Twin의 **컴플라이언스 모델(Compliance Model)**은 인가 통제(authorization controls)의 규제 준수 상태를 트윈 위에서 사전 예측하여, 감사 시점 이전에 준수 열화·통제 공백을 포착하는 예측 계층이다. §14 행동 baseline·§12 위험 신호를 입력으로 받아 **감사 준비도**를 판정한다. 본 §13은 5개 준수 축을 계약한다:

- **Audit Readiness** — 감사 대응 준비도·evidence 완결성·추적 가능성 예측.
- **Compliance Score** — 통제 준수율의 종합 점수화 및 추세 예측.
- **Evidence Coverage** — 요구 통제별 evidence 수집 커버리지·공백 탐지.
- **Regulation Drift** — 규제 요건 변화 대비 현행 통제의 정합 이탈 예측.
- **Control Coverage** — 요구 통제 대비 실 구현 통제의 매핑 커버리지·미구현 공백.

## 2. Substrate 매핑 (관측 소스 → Compliance 예측 축)

| Compliance 축 | 실 관측 baseline(현행) | file:line | 상태 |
|---|---|---|---|
| Audit Readiness / Compliance Score | Compliance readiness 산출 | `Compliance.php:133-151` | readiness 실재·예측 ABSENT |
| Evidence Coverage(무결성 근거) | append-only 해시체인 evidence | `SecurityAudit.php:27`·`:56-67` | evidence 실재·커버리지 예측 ABSENT |
| Evidence 검증 정본 | 감사 evidence 검증 | `SecurityAudit.php:118-153` | 검증 실재·예측모델 ABSENT |
| Control Coverage 이벤트원 | 인가 감사 이벤트 로그 | `UserAuth.php:4165` | 이벤트 실재·통제매핑 ABSENT |
| Compliance 판정 부가 경로 | Compliance 처리 지점 | `Compliance.php:267` | 처리 실재·drift 예측 ABSENT |

**compliance prediction 자체는 grep 0 — 완전 부재(ABSENT-greenfield)**. `Compliance.php:133-151` readiness와 `SecurityAudit.php:27` evidence가 baseline이며, 준수도 예측·evidence 공백 탐지·regulation drift 판정은 순신설이다.

## 3. 설계 계약 (Compliance Model 신설 명세)

- **CM-1 baseline 소비**: 컴플라이언스 모델은 `Compliance.php:133-151` readiness와 `SecurityAudit.php:27`·`:56-67` evidence를 **읽기 전용**으로 소비. readiness 산출·evidence write 경로 변경 금지 — 무후퇴.
- **CM-2 evidence 정본 검증**: Evidence Coverage 판정은 `SecurityAudit.php:118-153` 검증을 정본으로 하며, tamper-evident append-only 특성을 위조 근거로 삼지 않는다(장식적 체인 오인 금지).
- **CM-3 근거 표기**: Compliance Score·drift 예측은 근거 통제·evidence 링크·신뢰도를 명시(Explainable). 근거 없는 준수 결론 금지.
- **CM-4 예측≠집행**: 준수 열화 예측 시 자동 통제 변경을 임의 집행하지 않고 경고·감사 회부(승인정책 존중).
- **CM-5 미검증 제외**: 표본/evidence 부족 준수 예측은 READY 전달 금지(WARNING/BLOCKED). 테넌트 격리 절대.

## 4. KEEP_SEPARATE (혼입 금지 경계)

- **ML risk 예측**(`Risk.php:31`) — churn/fraud 마케팅 리스크로 규제 준수 예측 아님.
- **ML drift 감시**(`ModelMonitor.php:18-19`·`:201-337`) — ML 모델 성능 드리프트 모니터링으로 **regulation drift**(규제 요건 정합 이탈)와 이름만 유사하고 도메인이 다름. 기법 참조는 가능하나 compliance substrate로 흡수 금지.
- **SPC anomaly**(`AnomalyDetection.php:49`) — 통계 이상탐지로 준수 통제 커버리지 모델 아님.

이들을 compliance substrate로 통합하면 도메인 오염 — Compliance Model은 인가 통제·evidence만 소비한다. AI 챗봇/추론 계층(`ClaudeAI.php:18`)도 판정 주체가 아니라 설명 표면일 뿐, 준수 판정 정본은 evidence·readiness baseline이다.

## 5. 판정

**ABSENT (greenfield · compliance prediction grep 0)**. Compliance readiness(`Compliance.php:133-151`·`:267`)·SecurityAudit evidence(`SecurityAudit.php:27`·`:56-67`·`:118-153`)·인가 이벤트(`UserAuth.php:4165`)는 실재하나 준수도 예측기는 순신설. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행 §13 substrate 계약 미확정). KEEP_SEPARATE: ML drift(`ModelMonitor.php:18-19`)는 regulation drift가 아님 — 참조 경계로 고정.
