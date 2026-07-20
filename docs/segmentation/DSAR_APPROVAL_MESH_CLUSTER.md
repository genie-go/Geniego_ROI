# DSAR — Approval Mesh Cluster (Part 3-24 §2·§5)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_24_UNIVERSAL_GOVERNANCE_MESH_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_GOVERNANCE_MESH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_MESH_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_MESH_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC §2·§5)

`APPROVAL_MESH_CLUSTER`는 리전 내 노드를 **정족수·합의 단위로 묶는 클러스터**다. 계약상 역할:

- 리전 내 복수 노드 위에서 정책 결정의 **합의(consensus)·정족수(quorum)** 를 관장하여, 단일 노드 장애가 결정 정합성을 깨지 않도록 한다(§5 결정 실행).
- 클러스터 리더십·멤버십(join/leave)·health를 관리하고 Registry(§DSAR_REGISTRY)에 클러스터를 등록한다(§2).
- 클러스터 로컬 정책 epoch의 원자적 전환(atomic rollover)을 보장한다.

클러스터는 **복수 노드 + 합의 런타임(consensus)이 존재할 때만** 성립하는 계약이다.

## 2. 실존 substrate 매핑 (PRESENT / PARTIAL / ABSENT)

| 계약 요소 | 라이브 substrate | 판정 | 근거(허용목록) |
|---|---|---|---|
| 복수 노드 클러스터 | 없음 | **ABSENT** | 단일 프로세스(`Db.php:20-21`) |
| 합의/정족수 런타임(k8s/consensus) | 없음 | **ABSENT** | `composer.json:6-13` k8s/consensus 의존 전무 |
| 리더십/멤버십 프로토콜 | 없음 | **ABSENT** | grep 0 |
| 정책 epoch 원자 전환 | 부분(단일 트랜잭션) | **PARTIAL** | `Db.php:434-440`·`:519-527`(단일 DB 트랜잭션, 클러스터 합의 아님) |
| 클러스터 Registry 등록 | 없음 | **ABSENT** | grep 0 |

라이브는 단일 PHP 프로세스가 단일 MySQL(`Db.php:20-21`·`:120`)에 붙는 모놀리스다. "원자성"에 근접한 것은 단일 DB 트랜잭션(`Db.php:434-440`)뿐이며, 이는 **로컬 트랜잭션**이지 분산 노드 간 합의가 아니다. 정족수·리더십·멤버십 프로토콜은 전무하다.

### ★ 죽은 인프라 — PRESENT 오판 금지

- **죽은 terraform ECS cluster**(`infra/aws/terraform/autoscaling.tf`)는 라이브에 **무연결**이다. "cluster"라는 리소스명이 IaC에 존재한다는 사실은 authz Cluster substrate 근거가 될 수 없다 → **Cluster PRESENT 금지**.
- docker-compose(`infra/docker-compose.yml`) 역시 라이브 배포(`deploy.sh` rsync 단일 호스트)와 무연결이며 합의 클러스터가 아니다.

## 3. 설계 계약 (규칙)

- **R1 (클러스터=합의 상위)**: 클러스터는 §DSAR_NODE 복수 + 합의 런타임 존재 시에만 성립. 둘 다 부재이므로 BLOCKED_PREREQUISITE.
- **R2 (합의 정합)**: 정책 epoch 전환은 정족수 합의로만 확정. 단일 DB 트랜잭션(`Db.php:434-440`)은 노드-내 원자성일 뿐 클러스터 합의를 대체하지 못한다.
- **R3 (장애 시 deny)**: 정족수 미달 시 클러스터는 결정을 거부 우선으로 내리며, 미지 상태를 허용으로 승격하지 않는다.
- **R4 (IaC≠런타임)**: terraform ECS cluster·docker-compose 파일 존재는 substrate 근거가 아니다. 라이브 런타임 증거만 PRESENT 근거.
- **R5 (중복 금지)**: 클러스터 정책 저장·전환은 §DSAR_REGISTRY epoch·기존 트랜잭션 계약을 재사용하며 별도 저장 엔진 난립 금지.

## 4. KEEP_SEPARATE

해당 있음: 죽은 `infra/aws/terraform/autoscaling.tf`(ECS cluster)·`infra/docker-compose.yml`은 라이브 무연결 IaC로 **분리 유지**하며 authz Cluster substrate로 취급 금지.

## 5. 판정 (NOT_CERTIFIED)

`APPROVAL_MESH_CLUSTER`는 **ABSENT(단일 프로세스·합의/정족수 전무)** — 순신설. `Db.php:20-21`·`composer.json:6-13`에 k8s/consensus 의존이 전무하며, 근접물인 단일 DB 트랜잭션(`Db.php:434-440`)은 클러스터 합의가 아니다. 죽은 terraform ECS cluster(`infra/aws/terraform/autoscaling.tf`)는 **PRESENT 금지**. 노드·합의 substrate 부재로 **BLOCKED_PREREQUISITE** · 코드 변경 0 · **NOT_CERTIFIED**.
