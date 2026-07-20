# DSAR — Go-Live Checklist & Readiness Gate (Part 3-25 §2·§17)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_25_FINAL_INTEGRATION_OPERATIONAL_READINESS_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OPERATIONAL_READINESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OPSREADY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OPSREADY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC) — Go-Live Checklist Manager (§17)
Part 3-25 §17은 **Go-Live 승인 게이트**를 단일 거버넌스 오브젝트로 정의한다. 계약 표면(10 Readiness 도메인):
- **Infrastructure Ready** / **Security Ready** / **Compliance Ready** / **Monitoring Ready** / **Backup Ready** / **Recovery Ready** / **Documentation Ready** / **Team Ready** / **Business Ready** / **Executive Ready**.
- 각 항목 **PASS/FAIL/N-A** + 증거 링크 + 승인자.
- **Fail-closed 게이트** — 하나라도 FAIL이면 Go-Live 차단; Executive Ready는 최종 sign-off.
- **재사용** — §22 Operational Risk의 open Critical과 연동(Critical 있으면 자동 FAIL).

## 2. Substrate 매핑 (현존 요소 → Go-Live 체크리스트 계약)

| Readiness 도메인 | 현존 substrate | 상태 |
|---|---|---|
| Infrastructure/Monitoring Ready | `Health.php:27-45`·`:56-70`, `SystemMetrics.php:60-83` | PARTIAL — 상태 probe만, PASS/FAIL 게이트 아님 |
| Security Ready | `SecurityAudit.php:25-31`·`:60-64` (감사 원장) | INDIRECT — 증거 원천, 체크리스트 아님 |
| Compliance Ready | `Compliance.php:50-128` | PARTIAL — 상태만, Ready 판정 없음 |
| Documentation Ready | `docs/V389_OPERATIONS_GUIDE_CHECKLIST.md`·`docs/onboarding/CHANNEL_ONBOARDING_CHECKLIST_TEMPLATE.md`·`docs/DEPLOY_AWS_PRODUCTION.md` | INDIRECT — 절차 문서, 실행 게이트 아님 |
| Backup/Recovery Ready | 없음 | ABSENT (grep 0) |
| Team/Business/Executive Ready | 없음 | ABSENT (grep 0) |
| 통합 Go-Live Checklist Manager | 없음 | ABSENT (checklist manager grep 0 · checklist glob 0) |

## 3. 설계 계약 (순신설 오브젝트)
- **GoLiveChecklist** — {checklist_id, items[10 도메인], status(PASS/FAIL/N-A), evidence_ref, approver} 단일 SoT.
- **증거 링크** — Security는 `SecurityAudit.php:25-31`, Infra/Monitoring은 `Health.php:27-45`+`SystemMetrics.php:60-83`, Compliance는 `Compliance.php:50-128` 참조(읽기 전용).
- **문서 게이트** — Documentation Ready는 `docs/V389_OPERATIONS_GUIDE_CHECKLIST.md`·`docs/onboarding/CHANNEL_ONBOARDING_CHECKLIST_TEMPLATE.md` 존재/서명 확인.
- **Fail-closed** — 임의 FAIL 또는 §22 open Critical → 전체 Go-Live 차단. Executive Ready = 최종 sign-off(maker-checker 준거).
- **RUNBOOK 부재** — RUNBOOK glob 0; 별도 운영 런북은 본 계약 밖(문서 신설 시 중복 금지 검토).

## 4. KEEP_SEPARATE (혼입 금지)
- **LiveCommerce go-live**(`LiveCommerce.php:248-249`) — 라이브 방송 송출 개시지 **플랫폼 Go-Live readiness 아님**. 명명만 유사, 병합 금지.
- ML risk(`Risk.php:12`)·PM RAID(`PM/Enterprise.php:14`)는 Readiness 게이트 아님.

## 5. 판정
**ABSENT — go-live checklist manager grep 0 · checklist glob 0.** Health/SystemMetrics·SecurityAudit·Compliance·배포 docs(`docs/V389_OPERATIONS_GUIDE_CHECKLIST.md` 등)가 **증거 원천**으로 존재하나 10 Readiness 도메인 PASS/FAIL 게이트·Executive sign-off·Backup/Recovery/Team/Business Ready는 전무. LiveCommerce go-live는 도메인이 달라 KEEP_SEPARATE. **순신설 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.**
