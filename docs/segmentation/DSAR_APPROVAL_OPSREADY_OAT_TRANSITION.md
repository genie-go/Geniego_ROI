# DSAR — Operational Acceptance Test + Service Transition (Part 3-25 §11·§12)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_25_FINAL_INTEGRATION_OPERATIONAL_READINESS_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OPERATIONAL_READINESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OPSREADY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OPSREADY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §11 OAT · §12 Service Transition)
**§11 OAT(Operational Acceptance Test)**: 운영 환경에서 릴리스가 인수 가능한지 판정하는 비기능 검증 배터리. 축: **Functional / Security / Performance / Failover / Backup / Recovery / Compliance Test**. 각 테스트는 PASS 임계·증거 산출·게이트 판정을 계약한다.
**§12 Service Transition**: 개발→운영 인수인계 거버넌스. 축: **Ownership Transfer / Support Team / SLA / Runbook / Documentation**. 서비스 소유권·지원조직·SLA 약정·운영 런북·문서 완비를 전환 완료 조건으로 명시한다. 두 절 모두 인수 결정(accept/reject)과 승인 게이트를 산출한다.

## 2. Substrate 매핑
| SPEC 요소 | 현행 substrate | 상태 | 근거 |
|---|---|---|---|
| CI 검증(빌드전 게이트) | CI 사전 검증/스모크 스텝 | PARTIAL(부분 검증) | `deploy.yml:37-75` |
| CI 배포후 처리 게이트 | CI 배포 게이트 스텝 | PARTIAL | `deploy.yml:126-144` |
| Approval 게이트 | 알림/승인 실행 경로 | PARTIAL | `Alerting.php:601-656`·`:642-650`·`:684-686` |
| Functional/Security/Perf/Failover/Backup/Recovery/Compliance OAT | — | ABSENT(grep 0) | 순신설 |
| Ownership/Support/SLA/Runbook/Documentation 전환 | — | ABSENT(grep 0) | 순신설 |

## 3. 설계 계약
- **OAT(§11)**: 현행 CI(`deploy.yml:37-75`의 사전 검증, `:126-144`의 배포후 게이트)는 **경량 스모크/구문 검증** 수준이며, Security/Performance/Failover/Backup/Recovery/Compliance 인수 테스트 배터리는 **grep 0**. OAT 프레임워크는 각 축의 PASS 임계·증거 산출·게이트를 순신설로 정의한다(코드 0).
- **Approval 배선**: OAT/전환 승인 게이트는 현행 승인 실행 경로(`Alerting.php:601-656`, 정족수/조건 처리 `:642-650`, 결과 처리 `:684-686`)를 **substrate로 재사용**하도록 계약하되, 이는 알림/액션 승인이며 인수 승인으로의 확장은 순신설 배선을 요한다.
- **Service Transition(§12)**: Ownership Transfer·Support Team·SLA·Runbook·Documentation 전환 거버넌스 전부 **전무(grep 0)**. 순신설 설계 명세로만 존재. 코드 변경 0.

## 4. KEEP_SEPARATE
- CI 스모크/구문 검증(`deploy.yml:37-75`·`:126-144`)은 **배포 파이프라인 게이트**이지 운영 인수 테스트(OAT) 배터리가 아니다. 동일시 금지.
- 승인 실행 경로(`Alerting.php:601-656`)는 **알림/액션 승인**이지 서비스 전환 인수 승인 엔진이 아니다. 재사용 substrate일 뿐 동일시 금지.

## 5. 판정
**ABSENT**. OAT(Functional/Security/Performance/Failover/Backup/Recovery/Compliance)와 Service Transition(Ownership/Support/SLA/Runbook/Documentation) 엔진 grep 0. 현행은 CI 경량 검증(`deploy.yml:37-75`·`:126-144`)과 알림/액션 승인(`Alerting.php:601-656`·`:642-650`·`:684-686`)뿐이며 재사용 substrate에 그친다. 순신설 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
