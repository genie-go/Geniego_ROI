# DSAR — Approval Mesh Registry (Part 3-24 §1·§2)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_24_UNIVERSAL_GOVERNANCE_MESH_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_GOVERNANCE_MESH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_MESH_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_MESH_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC §1)

`APPROVAL_MESH_REGISTRY`는 Universal Governance Mesh의 **중앙 권위 레지스트리**다. 계약상 역할:

- Mesh를 구성하는 모든 authz 노드(§DSAR_NODE)·리전(§DSAR_REGION)·클러스터(§DSAR_CLUSTER)의 **membership·health·정책버전(policy epoch)** 을 단일 정본으로 보유한다.
- 각 노드가 로컬에서 내리는 authorization 결정이 **동일 정책 세대(epoch)** 를 참조하도록, 정책 배포(Policy Distribution)의 source-of-truth를 제공한다.
- 노드 join/leave, 정책 개정, epoch 증분을 **append-only 이력**으로 기록하여 사후 감사 가능성을 보장한다.

즉 Registry는 "누가 Mesh에 속하며, 지금 유효한 authz 정책 세대가 무엇인가"에 대한 유일한 권위원(權威源)이다.

## 2. 실존 substrate 매핑 (PRESENT / PARTIAL / ABSENT)

| 계약 요소 | 라이브 substrate | 판정 | 근거(허용목록) |
|---|---|---|---|
| Mesh 중앙 레지스트리(노드/리전/클러스터 membership) | 없음 | **ABSENT** | grep 0 — 단일 PHP/MySQL 모놀리스(`Db.php:9`) |
| 분산 정책 배포 채널(message bus/service mesh) | 없음 | **ABSENT** | `composer.json:6-13` 메시지버스/k8s/consensus 의존 전무 |
| 정책 세대(epoch) 버전 테이블 | 부분 유사(플랜 미러) | **PARTIAL** | `AdminPlans.php:53-72` 정책성 데이터의 단일서버 미러(`:56`,`:58`,`:59-62`) |
| 정책 개정 append-only 이력 | 부분(감사해시체인) | **PARTIAL** | `SecurityAudit.php:29-31`·`:38`(append-only 해시체인, authz-mesh용 아님) |
| 노드 로컬 PDP(정책 소비 지점) | 존재하나 비-mesh | **PARTIAL** | `TeamPermissions.php:695-700`·`:704-711`(단일프로세스 로컬 권한판정) |

라이브는 단일 호스트(`Db.php:20-21`·`:120`)에 prod/demo 형제 스키마(`AdminPlans.php:58`)를 두는 모놀리스이며, **Registry가 관장할 "복수 노드"라는 물리 대상 자체가 존재하지 않는다.** 정책 배포 프로토타입에 가장 근접한 것은 AdminPlans의 서버-내부 미러(`AdminPlans.php:53-72`)뿐이며, 이는 동일 서버·동일 PDO(`Db.php:63-87`) 위의 단일노드 구조다.

## 3. 설계 계약 (규칙)

- **R1 (단일 권위)**: 임의 시점에 유효한 authz 정책 epoch는 Registry가 정하는 값 하나뿐이며, 노드는 자체 epoch를 발명할 수 없다.
- **R2 (append-only)**: membership·epoch 변경은 오직 추가만 가능하고, 물리 삭제/재작성 금지. 감사 기저는 기존 append-only 해시체인 계약(`SecurityAudit.php:29-31`·`:50`·`:51`·`:63-64`)을 확장 대상으로 삼는다(신규 병렬 체인 금지).
- **R3 (fail-secure)**: Registry 조회 불가 시 노드는 최신 알려진 epoch로 **거부 우선**(deny-by-default) 판정하며, 미지 상태를 "허용"으로 승격하지 않는다.
- **R4 (테넌트 격리)**: Registry 엔트리는 테넌트 경계를 넘어 공유되지 않으며, 공용 스코프는 명시적 `__shared__` 표기로만 읽는다.
- **R5 (중복 엔진 금지)**: 정책 세대·감사 이력은 기존 `AdminPlans`(정책 데이터)·`SecurityAudit`(이력) 계약을 확장하며, 별도 registry 엔진을 난립시키지 않는다.

## 4. KEEP_SEPARATE

해당 없음. 본 §는 authz 거버넌스 전용 레지스트리 계약이며, 마케팅·그래프·저니 도메인과의 명명 충돌 요소를 포함하지 않는다.

## 5. 판정 (NOT_CERTIFIED)

`APPROVAL_MESH_REGISTRY`는 **ABSENT-greenfield(grep 0)** — 순신설 대상. 라이브의 근접물(AdminPlans 서버-내부 미러·SecurityAudit 해시체인)은 단일노드 substrate이며 Mesh 중앙 레지스트리가 아니다. 죽은 terraform/k8s/Postgres/Redis(`infra/`)는 라이브 무연결이므로 **Mesh/Cluster PRESENT로 오판 금지**. 코드 변경 0 · 선행(노드/리전/클러스터 substrate) 부재로 **BLOCKED_PREREQUISITE · NOT_CERTIFIED**.
