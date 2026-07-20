# DSAR — Operational Readiness Performance (Part 3-25 §31)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_25_FINAL_INTEGRATION_OPERATIONAL_READINESS_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OPERATIONAL_READINESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OPSREADY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OPSREADY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)
Part 3-25 §31은 Operational Readiness 도메인의 **성능 목표(Performance SLO)**를 규정한다:
- **Platform Validation** ≤ 10분 — 통합 플랫폼 검증 전체 소요.
- **Production Readiness** ≤ 30분 — 프로덕션 준비도 게이트 평가.
- **Deployment Validation** ≤ 15분 — 배포 후 검증.
- **Go-Live Checklist** ≤ 5분 — 컷오버 직전 체크리스트 실행.
- **Availability** ≥ 99.999% — 플랫폼 가용성.

## 2. Substrate 매핑
| SPEC SLO | 현행 substrate | 인용 | 상태 |
|---|---|---|---|
| Platform Validation ≤10분 | 측정 framework 부재 | — | ABSENT |
| Production Readiness ≤30분 | 준비도 오케스트레이터 부재 | — | ABSENT |
| Deployment Validation ≤15분 | CI 배포 검증(부분) | `.github/workflows/deploy.yml:126-144` | CI only |
| Go-Live Checklist ≤5분 | 체크리스트 엔진 부재 | — | ABSENT |
| Availability ≥99.999% | health 핸들러(측정 대상만) | `backend/src/Handlers/Health.php:27-45` | probe only |

## 3. 설계 계약
- 5개 SLO 전부는 **측정 대상 framework가 부재**하다. 현재 관측 가능한 것은 health probe(`Health.php:27-45`)와 CI 배포 파이프라인의 검증 스텝(`deploy.yml:126-144`)뿐이며, 이는 SLO를 계측·집계·게이트하는 오케스트레이션이 아니다.
- **Platform/Production/Deployment Validation**: 각 검증 단계의 시작·종료 타임스탬프를 SecurityAudit(`SecurityAudit.php:25-31`)에 봉인해 감사가능한 경과시간 원장을 구성. 신설 오케스트레이터가 이 원장에서 소요를 파생.
- **Go-Live Checklist ≤5분**: 항목별 체크는 health(`Health.php:27-45`) probe를 하위 신호로 재사용하되, 체크리스트 상태기계 자체는 순신설.
- **Availability ≥99.999%**: health probe(`Health.php:27-45`)를 원신호로 삼고, 롤링 윈도 집계·SLO 소진(error budget) 계산은 신설.
- 본 도메인은 **RP-track**(Readiness Performance) 조건: 측정 framework 신설이 선행되어야 SLO 판정 자체가 성립.

## 4. 판정
**ABSENT.**
- 측정 대상 framework 부재. 관측 substrate=health probe(`Health.php:27-45`)·CI 검증(`deploy.yml:126-144`)에 국한.
- 5개 SLO 전부 순신설·RP-track 조건(측정 framework 선행).
- 코드 변경 0 · NOT_CERTIFIED · 선행 Part1~3-24 인증 후 실행 가능.
