# DSAR — Unified Authorization Fabric Static Lint (Part 3-16 §27)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_16_UNIFIED_AUTHORIZATION_FABRIC_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FABRIC_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FABRIC_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FABRIC_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC) — 정책/배포 정의를 배포 전 정적 검증할 6종 룰

Static Lint(§27)는 authz 패브릭의 **정책 정의·배포 매니페스트·라우팅 설정**을 배포 파이프라인(build/CI) 시점에 검사해, 런타임 이전에 구성 결함을 차단한다. 6종 룰:

| 룰 | 탐지 대상 | 근거 |
|----|-----------|------|
| `MISSING_REGION_REPLICATION` | 정책이 일부 리전에만 배포(불완전 복제) | 가용성 |
| `MISSING_CACHE_VERSION` | 정책 번들에 캐시 버전 태그 누락 | 일관성 |
| `HARDCODED_ENDPOINT` | 노드/리전 엔드포인트 하드코딩 | 이식성 |
| `MISSING_FAILOVER` | 리전/노드 장애 시 failover 경로 미정의 | 복원력 |
| `MISSING_ROUTING_RULE` | 요청→PDP 라우팅 규칙 공백 | 정확성 |
| `TENANT_LEAKAGE` | 정책이 테넌트 경계를 넘어 매칭 | 격리 |

## 2. Substrate 매핑 — 현 라이브에서 lint가 검사할 대상의 존부

| Lint 룰 요구 입력 | 현 라이브 substrate | 실체 판정 |
|-------------------|--------------------|-----------|
| 리전 복제 매니페스트 | — | ABSENT(단일 docroot 배포) |
| 캐시 버전 태그 | — | ABSENT(정책 캐시 계층 부재) |
| 엔드포인트 설정 | 배포 스크립트 `deploy.ps1`·`deploy.sh`·`.github/workflows/deploy.yml` | 단일 원격 호스트 대상(패브릭 엔드포인트 아님) |
| Failover 토폴로지 | `infra/aws/terraform/*`·`infra/docker-compose.yml` | 존재 시에도 죽은/미가동 인프라 → PRESENT 주장 금지 |
| 라우팅 규칙 | 라우트 등록 파일의 `$register` 배선(버전 접두 `/v{NNN}`) | 단일 프로세스 라우팅(패브릭 라우팅 아님) |
| 테넌트 경계 | `backend/public/index.php:614-619` | **PRESENT — Tenant Leakage lint의 유일 실 baseline** |

## 3. 설계 계약 — 신설 시 준수할 불변식

- **Tenant Leakage 유일 baseline**: 6종 중 실제 검사 가능한 baseline이 존재하는 유일 룰은 Tenant Leakage다. 현 멀티테넌트 격리 강제(`index.php:614-619`)가 런타임 격리의 SSOT이며, 정적 lint는 이 격리 계약을 정책 정의 층에서 선검증하도록 확장한다(대체 아님).
- **죽은 인프라 = PRESENT 아님**: `infra/aws/terraform/*`·`infra/docker-compose.yml`에 리전/failover 리소스 정의가 있더라도 미가동·미배포이면 Static Lint의 실 검사 대상 substrate로 인정하지 않는다. Failover/Region Replication 룰의 baseline은 **ABSENT**로 확정(반날조).
- **하드코딩 엔드포인트**: 현 배포는 단일 원격 호스트(`deploy.sh` rsync 대상)로, 다중 리전 엔드포인트 추상화가 없어 Hardcoded Endpoint 룰이 검사할 "추상화 위반"의 기준선 자체가 미형성.
- **CI 통합 지점**: Static Lint는 `.github/workflows/deploy.yml` 빌드 페이즈에 신규 게이트로 삽입될 후보이나, 검사 대상(정책 매니페스트)이 없으므로 게이트 추가는 no-op → 선행 패브릭 산출물 필요.

## 4. 판정

**ABSENT (순신설).** Fabric Static Lint 6종은 전부 미존재. Tenant Leakage만이 현 멀티테넌트 격리(`index.php:614-619`)라는 실 런타임 baseline을 가지며, 나머지 5종(Region Replication·Cache Version·Hardcoded Endpoint·Failover·Routing Rule)은 검사 대상 패브릭 산출물이 없어 baseline이 ABSENT다. `infra/aws/terraform/*`·`infra/docker-compose.yml`의 인프라 정의는 죽은/미가동으로 PRESENT 주장 금지. 실 구현은 정책 배포 매니페스트·리전 토폴로지 신설 후 별도 세션(BLOCKED_PREREQUISITE). 코드 변경 0 · NOT_CERTIFIED.
