# DSAR — Governance Mesh Controller (Part 3-24 §3·§4)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_24_UNIVERSAL_GOVERNANCE_MESH_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_GOVERNANCE_MESH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_MESH_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_MESH_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §3·§4)

Governance Mesh Controller는 인가(authorization) 정책의 **다중 평면(plane) 조정자**로서, 단일 프로세스 안에서 지역적으로 판단되던 정책 결정을 Global → Regional → Domain → Tenant → Local의 5-plane 위계로 확장·조정하는 논리적 컨트롤 플레인이다. SPEC이 요구하는 계약 표면은 다음과 같다.

- **Global/Region/Tenant Coordination**: 전역 정책 소스, 지역 오버레이, 테넌트 로컬 결정의 우선순위·병합 규칙을 정의하는 조정자.
- **Policy Propagation**: 상위 plane의 정책 변경을 하위 plane으로 전파(단방향 push 계약).
- **Config Sync**: plane 간 설정 정합성 수렴(convergence) 보장.
- **Health Monitoring**: 각 plane의 도달성·정책 신선도(freshness)·수렴 지연 관측.
- **Plane 정의**: Global / Regional / Domain / Tenant / Local Plane 각각의 책임 경계.

## 2. Substrate 매핑 (현행 실체)

| SPEC 계약 (mesh) | 현행 substrate | 실체 판정 |
|---|---|---|
| Mesh Controller (조정 프로세스) | 단일 웹 프로세스 진입점 `backend/public/index.php:69` (미들웨어 auth) | ABSENT — 조정자 없음, 단일 프로세스 |
| Local Plane PDP | `backend/src/Handlers/TeamPermissions.php:695-700`(로컬 권한 판정)·`:704-711` | PRESENT(로컬 단일 노드 한정) |
| Global/Regional/Domain/Tenant Plane | (grep 0) | ABSENT-greenfield |
| Policy Propagation | (상위→하위 전파 경로 부재) | ABSENT |
| Config Sync (plane 간) | 단일 DB 연결 `backend/src/Db.php:63-87` | ABSENT(분산 아님·단일 저장) |
| Health Monitoring (plane) | 프로세스 메트릭 `backend/src/Handlers/SystemMetrics.php:32`(단일노드) | ABSENT(plane 수렴 관측 없음) |

**판정 근거**: mesh controller에 해당하는 조정자 코드는 grep 0. 인가 결정은 요청을 처리하는 단일 프로세스(`index.php:69`) 내부 로컬 PDP(`TeamPermissions.php:695-700`)에서만 종결되며, plane 위계·전파·수렴이라는 계약 표면 자체가 존재하지 않는다.

## 3. 설계 계약 (신설 시)

- **읽기 우선(Read-first) 위계**: Local → Tenant → Domain → Regional → Global 순으로 유효 정책을 해석하되, 로컬 PDP(`TeamPermissions.php:695-700`)의 fail-closed 판정을 무후퇴로 보존한다(상위 plane 부재 시 로컬 결정이 정본).
- **단방향 전파**: Policy Propagation은 상위→하위 push만 허용, 하위가 상위를 오염시키지 않는다.
- **테넌트 격리 절대**: Tenant Plane 경계는 데이터 헌법의 테넌트 격리를 상속하며, cross-tenant 정책 누출은 설계상 금지.
- **수렴 관측**: Health Monitoring은 SystemMetrics(`SystemMetrics.php:32`) 확장으로 흡수, 신규 관측 엔진 난립 금지.
- **감사**: plane 전파 이벤트는 기존 append-only 해시체인(`backend/src/SecurityAudit.php:27`) 정본에 기록, 별도 원장 신설 금지.

## 4. KEEP_SEPARATE

- 마케팅 채널 동기화 `backend/src/Handlers/ChannelSync.php:12`·`:19` — 외부 커머스 채널 sync이지 인가 정책 plane 조정이 아니다.
- 라이브커머스 `backend/src/Handlers/LiveCommerce.php:1205`·WMS `backend/src/Handlers/Wms.php:2071` — 도메인 데이터 흐름, mesh controller 아님.
- 인프라 `infra/docker-compose.yml`·`infra/aws/terraform/main.tf` — 죽은/미배선 인프라 선언, PRESENT로 오인 금지(단일노드 배포 `deploy.sh:5-6` 정본).

## 5. 판정

**ABSENT — greenfield 순신설.** Governance Mesh Controller의 5-plane 조정 표면은 grep 0으로 전무하다. 현행은 단일 프로세스(`index.php:69`) + 로컬 PDP(`TeamPermissions.php:695-700`)만의 단일노드 인가 구조다. 본 DSAR은 설계 명세이며 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행 plane foundation 부재). 실 구현은 별도 승인 세션에서 로컬 PDP fail-closed 무후퇴 보존을 전제로 진행한다.
