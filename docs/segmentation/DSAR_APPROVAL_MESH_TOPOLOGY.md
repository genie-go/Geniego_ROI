# DSAR — Mesh Topology Manager (Part 3-24 §5)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_24_UNIVERSAL_GOVERNANCE_MESH_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_GOVERNANCE_MESH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_MESH_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_MESH_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §5)

Mesh Topology Manager는 인가 거버넌스 메시를 구성하는 **노드 그래프의 형상(topology)을 관리**하는 계약이다. SPEC이 요구하는 표면:

- **토폴로지 원소**: Node / Cluster / Region / Zone / Gateway / Federation Endpoint.
- **동적 멤버십**: Dynamic Join / Leave / Auto Discovery / Registration — 노드가 메시에 자율 합류·이탈하고, 서로를 발견·등록.
- **형상 정합성**: 노드 상태(도달성·역할)의 일관된 그래프를 유지하고 Federation Endpoint를 통해 외부 메시와 연합.

## 2. Substrate 매핑 (현행 실체)

| SPEC 계약 (topology) | 현행 substrate | 실체 판정 |
|---|---|---|
| Node/Cluster/Region/Zone | (grep 0) | ABSENT-greenfield |
| 실제 배포 노드 | 단일 DB 노드 `backend/src/Db.php:63-87`(단일 연결)·기본 호스트 `:120` | 단일노드(형상 아님) |
| 배포 형상 | 단일 서버 rsync `deploy.sh:5-6`·`:19` | 단일노드(cluster/region 없음) |
| Gateway/Federation Endpoint | (grep 0) | ABSENT |
| Auto Discovery/Registration | (노드 발견·등록 경로 부재) | ABSENT |
| Health/도달성 (노드) | `backend/src/Handlers/SystemMetrics.php:32`(프로세스 단일) | 단일노드 관측(그래프 아님) |

**판정 근거**: topology를 표상하는 노드 그래프·클러스터·리전·존·게이트웨이·연합 엔드포인트 코드는 grep 0. 실제 실행 substrate는 단일 DB 노드(`Db.php:63-87`, 기본 호스트 `:120`)와 단일 서버 배포(`deploy.sh:5-6`)뿐이다. 동적 join/leave·auto discovery가 성립할 다중 노드 자체가 없다.

## 3. 설계 계약 (신설 시)

- **단일노드 무후퇴 원점**: 초기 토폴로지는 단일 Node(현행 `Db.php:63-87`) = Region=Zone=Cluster의 축약 그래프로 정의하고, 확장 시에도 단일노드 fail-closed 인가가 후퇴하지 않아야 한다.
- **정적 등록 우선**: Auto Discovery 이전에 명시적 Registration(선언적 노드 목록)을 정본으로 하고, 자율 발견은 후속 단계 옵션으로 격리한다(비인증 노드 합류 금지).
- **Federation Endpoint 경계**: 외부 연합은 명시적 권한 내에서만. 테넌트 격리·인증 경계를 넘는 연합은 설계상 금지.
- **형상 감사**: 노드 join/leave·registration 이벤트는 기존 append-only 해시체인(`backend/src/SecurityAudit.php:27`)에 기록, 별도 원장 신설 금지.

## 4. KEEP_SEPARATE

- **★죽은 terraform `infra/aws/terraform/main.tf`·`infra/docker-compose.yml`** — 미배선·미배포 인프라 선언. 다중노드/클러스터 토폴로지의 **실체(PRESENT)로 오인 금지**. 실 배포 정본은 단일 서버 `deploy.sh:5-6`.
- 마케팅 채널 동기화 `backend/src/Handlers/ChannelSync.php:12`·`:19` — 외부 채널 sync 토폴로지가 아닌 커머스 연동, mesh node 아님.
- WMS `backend/src/Handlers/Wms.php:2071`·라이브커머스 `backend/src/Handlers/LiveCommerce.php:1205` — 도메인 흐름, topology 원소 아님.

## 5. 판정

**ABSENT — greenfield 순신설.** Mesh Topology Manager의 Node/Cluster/Region/Zone/Gateway/Federation 및 동적 멤버십 계약은 grep 0으로 전무하다. 실 substrate는 단일 DB 노드(`Db.php:63-87`)·단일 서버 배포(`deploy.sh:5-6`)의 단일노드다. `infra/aws/terraform/main.tf`는 죽은 선언으로 PRESENT 아님. 본 DSAR은 설계 명세 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(다중노드 substrate 부재). 실 구현은 별도 승인 세션에서 단일노드 무후퇴를 전제로 진행한다.
