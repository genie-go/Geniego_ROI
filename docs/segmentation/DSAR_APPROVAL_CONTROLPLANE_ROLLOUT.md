# DSAR — Authorization Rollout Manager (Part 3-19 §19)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_19_AUTONOMOUS_CONTROL_PLANE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_CONTROL_PLANE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_CONTROLPLANE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_CONTROLPLANE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §19 — APPROVAL_ROLLOUT)

Authorization Rollout Manager는 **인가(authz) 정책·룰·롤 정의의 변경분을 점진적으로 활성화**하는 제어면(Control Plane) 구성요소다. 대상은 코드가 아니라 **런타임 인가 구성(config)**이다. 계약 표면:

- **Canary Rollout** — 신규 authz 정책을 소수 트래픽/주체에 먼저 적용, 위반율·거부율 관측 후 승격.
- **Percentage Rollout** — 활성화 비율을 0→N%로 단계 증가(가중 게이트).
- **Region / Tenant / Department Rollout** — 스코프 차원(리전·테넌트·부서)별 선택적 활성화. 테넌트 격리 원칙과 정합해야 한다.
- **Progressive Gate** — 각 단계는 관측 지표가 SLO 내일 때만 다음 단계로 전진, 아니면 자동 정지(→ §20 Rollback로 위임).

## 2. Substrate 매핑

| SPEC 계약 | 현행 substrate | 상태 |
|---|---|---|
| authz config canary/percentage 활성화 | (grep 0 — 부재) | **ABSENT** |
| region/tenant/department 스코프 rollout | (grep 0 — 부재) | **ABSENT** |
| 코드 아티팩트 배포(≠authz config) | `deploy.sh` · `.github/workflows/deploy.yml` | PRESENT(무관 계층) |
| 단일 실행 유닛(모놀리스) | `backend/composer.json:2-12` · `backend/public/index.php:23` | 단일 프로세스 |

현행 시스템의 유일한 "rollout" 개념은 **코드 아티팩트 배포**(`deploy.sh`, `deploy.yml` — dist swap + fpm reload)뿐이다. 이는 빌드 산출물 교체이지 **인가 구성의 점진 활성화가 아니다**. authz 정책은 배포 즉시 100% 전면 적용되며 canary/percentage/scope 게이트가 존재하지 않는다.

## 3. 설계 계약 (순신설)

1. **RolloutPlan** — {policyRef, strategy(canary|percentage|region|tenant|department), steps[], guardMetrics[], abortOn}. append-only, 불변 스냅샷.
2. **RolloutStep** — {stepIndex, scopeSelector, targetFraction, holdWindow, promoteCriteria}. 각 단계 승격은 명시적 관측 통과 후에만.
3. **Guard 연동** — SecurityAudit append-only 체인(`backend/src/SecurityAudit.php:14-64`)에 각 단계 전이 기록, `verify()`(`:56`)로 사후 감사.
4. **Abort → Rollback** — guardMetrics 위반 시 §20 Rollback Manager로 위임(자기집행 금지·승인정책 존중).
5. **테넌트 격리** — scopeSelector는 테넌트 경계를 넘지 못함(Fail-closed).

## 4. KEEP_SEPARATE (경계·중복 금지)

- **죽은 terraform blue-green** — `infra/aws/terraform/codedeploy_bluegreen.tf`: default-off·라이브 무연결 인프라. **authz Rollout의 substrate가 아니며 PRESENT로 인용 절대 금지.** 이는 (가상의) 코드 blue-green이지 authz config rollout이 아니다.
- `infra/aws/terraform/autoscaling.tf` — 동일. dead infra·KEEP_SEPARATE.
- 코드 배포(`deploy.sh`·`deploy.yml`) — 배포 계층. authz Rollout이 재구현하지 않고 상위에 얹힘.

## 5. 판정

**ABSENT** — authz config rollout(canary/percentage/region/tenant/department) grep 0. 현행은 코드 배포(`deploy.sh`·`deploy.yml`) 및 단일 모놀리스(`composer.json:2-12`·`index.php:23`)만 존재. 죽은 terraform은 라이브 무연결. **순신설 설계**·코드 변경 0·NOT_CERTIFIED·BLOCKED_PREREQUISITE(선행 Control Plane foundation 부재).
