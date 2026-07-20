# DSAR — Operational Risk Register & 운영 리스크 거버넌스 (Part 3-25 §2·§22)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_25_FINAL_INTEGRATION_OPERATIONAL_READINESS_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OPERATIONAL_READINESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OPSREADY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OPSREADY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC) — Operational Risk Manager (§22)
Part 3-25 §22는 **운영 리스크 레지스터**를 단일 거버넌스 오브젝트로 정의한다. 계약 표면:
- **리스크 분류 5축** — Deployment Risk / Configuration Risk / Capacity Risk / Compliance Risk / Operational Risk.
- **심각도 4단계** — Low / Medium / High / Critical (likelihood × impact 산정).
- **완화(Mitigation)·소유자(Owner)·상태(Open/Mitigating/Closed)** 추적.
- **Go-Live 게이트 연동** — Critical 미해소 리스크 존재 시 Go-Live 차단(§17 체크리스트와 연계).
- **감사 증거** — 리스크 상태 전이는 append-only 원장에 기록.

## 2. Substrate 매핑 (현존 요소 → Operational Risk 계약)

| Risk 계약 요소 | 현존 substrate | 상태 |
|---|---|---|
| Deployment Risk 관측 | 배포 절차 문서 `docs/DEPLOY_AWS_PRODUCTION.md` | INDIRECT — 절차만, 리스크 레지스터 아님 |
| Configuration/Capacity 신호 | `SystemMetrics.php:127-351` (자원/처리 지표) | PARTIAL — 원시 신호만, 리스크 판정 없음 |
| Compliance Risk 원천 | `Compliance.php:50-128` (컴플라이언스 상태) | PARTIAL — 상태만, 리스크화·심각도 없음 |
| Operational Risk 원장 | `SecurityAudit.php:25-31` (append-only) | INDIRECT — 보안 이벤트만 |
| 심각도(L/M/H/Crit) 산정 | 없음 | ABSENT (grep 0) |
| 통합 Risk Register | 없음 | ABSENT (operational risk 거버넌스 grep 0) |

## 3. 설계 계약 (순신설 오브젝트)
- **OperationalRiskRegister** — {risk_id, category(5축), likelihood, impact, severity(파생), mitigation, owner, status} 단일 SoT.
- **Severity 파생** — likelihood×impact 매트릭스에서 Low/Med/High/Crit 산출(임의 숫자 금지 — 규칙 기반 파생).
- **신호 연동(읽기 전용)** — Capacity/Config는 `SystemMetrics.php:127-351`, Compliance는 `Compliance.php:50-128`에서 참조; 원천 코드 불변.
- **Go-Live Gate 연동** — open Critical 존재 시 §17 Go-Live Checklist가 fail-closed(별도 §17 DSAR와 계약 상호참조).
- **증거 append** — 상태 전이는 `SecurityAudit.php:25-31` 원장 참조 기록(중복 원장 신설 금지).

## 4. KEEP_SEPARATE (혼입 금지)
- **PM RAID/리스크 로그**(`PM/Enterprise.php:14`, `:17`) — 프로젝트 관리 도메인의 RAID이지 **운영(operational) 리스크 레지스터 아님**. 인용만, 병합 금지.
- **ML 예측 리스크**(`Risk.php:12`) — 모델/스코어 리스크지 운영 배포 리스크 아님. KEEP_SEPARATE.

## 5. 판정
**ABSENT — operational risk 거버넌스 grep 0.** Capacity/Config 신호(`SystemMetrics.php:127-351`)·Compliance 상태(`Compliance.php:50-128`)·감사 원장(`SecurityAudit.php:25-31`)은 리스크의 **원천 신호**로 존재하나 5축 분류·L/M/H/Crit 심각도·통합 Register·Go-Live 게이트 연동은 전무. PM RAID·ML risk는 도메인이 달라 KEEP_SEPARATE. **순신설 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.**
