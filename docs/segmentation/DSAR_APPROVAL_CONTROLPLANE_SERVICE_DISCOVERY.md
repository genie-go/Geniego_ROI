# DSAR — Authorization Service Discovery (Part 3-19 §16)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_19_AUTONOMOUS_CONTROL_PLANE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_CONTROL_PLANE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_CONTROLPLANE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_CONTROLPLANE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §16 — APPROVAL_SERVICE_DISCOVERY)

Authorization Service Discovery는 **분산된 인가 결정점(PDP)·정책 저장소·집행점(PEP)이 서로를 동적으로 발견·연결**하기 위한 제어면 구성요소다. 계약 표면:

- **Kubernetes Discovery** — 서비스/엔드포인트 오브젝트 기반 PDP 발견.
- **Consul Registry** — KV/헬스체크 기반 서비스 등록·발견.
- **DNS-based Discovery** — SRV/A 레코드 기반 조회.
- **Service Mesh Registry** — 사이드카·mTLS 기반 서비스 아이덴티티.
- **Static Registration** — 정적 매니페스트 기반 고정 등록(최소 형태).

## 2. Substrate 매핑

| SPEC 계약 | 현행 substrate | 상태 |
|---|---|---|
| K8s/Consul/DNS/Mesh registry | (grep 0 — 부재) | **ABSENT** |
| 단일 실행 유닛(발견 불필요) | `backend/public/index.php:23` · `backend/composer.json:2-12` | 단일 모놀리스 |
| 프로세스-내 라우팅(≠service discovery) | `backend/public/index.php:610` | PRESENT(무관 계층) |
| 헬스 엔드포인트(≠registry 헬스체크) | `backend/src/Handlers/Health.php:56-67` · `:102-103` | PRESENT(무관 계층) |

현행은 **단일 Slim/PHP 모놀리스**(`composer.json:2-12`·`index.php:23`)로, PDP/정책저장소/PEP가 **하나의 프로세스 내부에 인라인**되어 있다. 라우팅은 프로세스-내 디스패치(`index.php:610`)이며 서비스 경계를 넘는 발견이 없다. `Health.php:56-67`의 헬스 엔드포인트는 로드밸런서 프로브용이지 서비스 레지스트리 헬스체크 substrate가 아니다. 따라서 Service Discovery는 **구조적으로 불필요·부재**.

## 3. 설계 계약 (순신설·조건부)

1. **DiscoveryContract** — {mode(k8s|consul|dns|mesh|static), pdpEndpoints[], healthProbe, ttl}. 다중-프로세스 분화가 실제 발생할 때만 유효.
2. **Static-first** — 모놀리스 유지 동안 유일하게 정합한 형태는 **Static Registration**(단일 인-프로세스 PDP를 명시 매니페스트로 고정). K8s/Consul/Mesh는 아키텍처 분화 선행 조건 충족 전 BLOCKED.
3. **Fail-closed** — PDP 미발견 시 인가는 거부(Unknown≠Allow).
4. **감사 연동** — 등록/해제 이벤트는 `SecurityAudit.php:14-64` 체인 기록·`verify()`(`:56`) 검증.
5. **테넌트 격리 불변** — discovery가 테넌트 경계 해석을 우회하지 못함.

## 4. KEEP_SEPARATE (경계·중복 금지)

- **죽은 terraform / docker-compose** — `infra/aws/terraform/autoscaling.tf`·`infra/docker-compose.yml`: default-off·**라이브 무연결**. 다중 서비스/오토스케일 환상을 주지만 실 배포는 단일 모놀리스다. **service discovery substrate로 인용 절대 금지.**
- `index.php:610` 프로세스-내 라우팅 — service discovery 아님(계층 혼동 금지).
- `Health.php:56-67`·`:102-103` — LB 프로브. registry 헬스체크 아님.

## 5. 판정

**ABSENT** — Kubernetes/Consul/DNS/Service Mesh registry grep 0. 현행은 단일 모놀리스(`index.php:23`·`composer.json:2-12`)로 PDP/PEP가 인-프로세스 인라인되어 service discovery가 구조적으로 불필요. 죽은 terraform·docker-compose는 라이브 무연결. 순신설 설계이며 다중-프로세스 분화 선행 전까지 Static Registration만 조건부 정합. 코드 변경 0·NOT_CERTIFIED·BLOCKED_PREREQUISITE.
