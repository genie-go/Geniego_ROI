# DSAR — Authorization Control Plane Test Matrix (Part 3-19 §38)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_19_AUTONOMOUS_CONTROL_PLANE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_CONTROL_PLANE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_CONTROLPLANE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_CONTROLPLANE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의(SPEC) — APPROVAL_CONTROL_PLANE_TEST_MATRIX

Authorization Control Plane 인증을 위한 테스트 계층은 다음과 같다. 각 계층은 대상 컴포넌트가 실존할 때에만 실행 가능하다(RP-track 조건).

- **Unit**: Orchestrator·Scheduler·Rollout·Rollback·Feature Flag 각 단위 로직.
- **Integration**: Fabric·Federation·Compliance·Zero Trust·AI Governance·Observability 연동.
- **Performance**: 500 Regions·50K Nodes·5M Config·100 Concurrent Rollouts 부하.
- **Security**: Unauthorized Deployment·Config Injection·Rollback Abuse·Split-Brain·Cross-Tenant.
- **Compliance**: ISO27001·NIST 800-53·SOC2·PCI·CIS 매핑.
- **Regression**: 무후퇴 회귀 전수.

## 2. 실존 substrate 매핑

| 테스트 계층 | 판정 | 근거(허용목록) |
|---|---|---|
| 라이브 테스트 하네스 | **부재(공식)** | 리포 내 구성된 lint/test 스크립트 없음(CLAUDE.md 명시)·`backend/composer.json:2-12` 에 test 스위트 없음 |
| Unit(Orchestrator/Scheduler/Rollout/Rollback/Feature Flag) | **미구현** | 대상 컴포넌트 전부 ABSENT(grep 0); 스키마 rollback 근사만 `backend/bin/migrate.php:9-15` |
| Integration(Fabric/Federation/Compliance/Zero Trust/AI Gov/Observability) | **미구현** | 연동 대상 부재; 단일 모놀리스 `backend/public/index.php:23` |
| Performance(500 Regions·50K Nodes·5M Config·100 Rollouts) | **미구현** | 다중 리전/노드 계층 없음 `composer.json:2-12` |
| Security — Cross-Tenant | **라이브 표적** | tenant 격리 `backend/public/index.php:610`(회귀 검증 대상 실존) |
| Security — Config Injection | **라이브 표적(근사)** | 무결성 verify `SecurityAudit.php:56`(변조 탐지 대상 실존) |
| Security — Unauthorized Deployment/Rollback Abuse/Split-Brain | **미구현** | 배포·롤백·리전 조정 컴포넌트 부재 |
| Regression 기준선(가용성) | **부분 근사** | 헬스 스모크 `backend/src/Handlers/Health.php:56-67`·`:102-103`; 플랜 게이트 `backend/src/Handlers/AdminPlans.php:53-72`(`:56-58`) |

**판정 근거**: control plane 컴포넌트가 부재(grep 0)하므로 Unit·Integration·Performance·Regression 대부분이 **미구현**이다. 단, Security 계층 중 **Cross-Tenant** 는 tenant 격리(`index.php:610`)라는 라이브 표적이, **Config Injection** 은 무결성 verify(`SecurityAudit.php:56`)라는 라이브 표적이 실존하므로 이 두 항목은 현행 코드에 대한 회귀 검증으로 즉시 정의 가능하다.

## 3. 설계 계약(규칙)

- **R1 (대상 선행)**: Unit/Integration/Performance 는 §35~§37 및 오케스트레이션 컴포넌트 신설 후에만 작성·실행한다. 대상 부재 테스트를 pass 로 표기 금지.
- **R2 (Cross-Tenant 회귀 상시)**: `index.php:610` tenant 격리는 신규 control-plane 작업마다 cross-tenant 침투 회귀를 필수 포함한다. fail-closed 검증.
- **R3 (Config Injection 회귀 상시)**: `SecurityAudit.php:56` verify 기반 변조 탐지 테스트를 config 무결성 회귀에 포함한다. verify 우회 시 실패로 처리.
- **R4 (Regression 기준선)**: 헬스 스모크(`Health.php:56-67`·`:102-103`)·플랜 게이트(`AdminPlans.php:53-72`·`:56-58`)는 무후퇴 회귀 기준선으로 유지하고, control-plane 도입이 이를 후퇴시키지 않음을 검증한다.
- **R5 (Compliance 매핑 문서화)**: ISO27001/NIST/SOC2/PCI/CIS 매핑은 실 컴포넌트 인증 전까지 문서 매핑에 한정하고, 미구현 대상에 준수(green) 주장 금지.

## 4. KEEP_SEPARATE

Performance 계층의 500 Regions·50K Nodes 부하 시나리오는 미가동 IaC(`infra/aws/terraform/autoscaling.tf`·`infra/aws/terraform/codedeploy_bluegreen.tf`·`infra/docker-compose.yml`)를 테스트 근거로 인용하지 않는다. CI 배포 파이프라인(`.github/workflows/deploy.yml`·`deploy.sh`)은 배포 스모크 범위이며 control-plane 테스트 매트릭스와 별개로 유지.

## 5. 판정

**NOT_CERTIFIED · BLOCKED_PREREQUISITE · 미구현.** control plane 부재로 Unit/Integration/Performance/Regression 대부분이 미구현이며, Security 중 Cross-Tenant(`index.php:610`)·Config Injection(`SecurityAudit.php:56`)만 라이브 표적으로 즉시 회귀 정의 가능하다. 전 계층 인증은 RP-track 조건으로, 대상 컴포넌트 신설 후 별도 승인 세션에서 진행한다. 코드 변경 0.
