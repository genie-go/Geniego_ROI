# DSAR — APPROVAL_AUTH_FABRIC 통합 골격 (Part 3-16 §0·§1·§2)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_16_UNIFIED_AUTHORIZATION_FABRIC_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FABRIC_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FABRIC_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FABRIC_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

APPROVAL_AUTH_FABRIC = Part 1~3-15에서 개별 설계된 인가 구성요소(Permission Engine·Role Registry·Scoped/Dynamic/Service Role·Effective Role Resolution·Assignment·Decision Core·Immutable Ledger·Audience/Eligibility 등)를 **단일 논리 인가 패브릭**으로 통합하는 최상위 골격이다. SPEC §0(개념)·§1(Control/Data Plane 분리 원칙)·§2(통합 계약)이 정의하는 요구는 다음과 같다.

- (C1) **Plane 분리**: 정책 저작·배포(Control Plane)와 런타임 결정·집행(Data Plane)은 물리적으로 분리되고 독립 배포·독립 스케일된다.
- (C2) **분산 결정**: PDP는 다중 노드/리전에서 동일 정책 스냅샷으로 결정 등가성(decision equivalence)을 보장한다.
- (C3) **통합 무중복**: Part 1~3-15의 엔티티는 패브릭 안에서 **단일 표준 모델**로 정규화되며, 동일 개념의 병렬 엔진을 신설하지 않는다(Extend, not Replace).
- (C4) **테넌트 격리 절대**: 모든 패브릭 결정은 테넌트 경계를 넘지 못한다.

## 2. 실존 substrate 매핑 (PRESENT / PARTIAL / ABSENT)

| 패브릭 요소 | 상태 | 허용목록 근거 |
|---|---|---|
| 멀티테넌트 격리 (유일 실 substrate) | **PRESENT** | `backend/public/index.php:614-619` (테넌트 경계 주입) |
| in-process PEP (요청 진입 집행) | **PRESENT(단일노드)** | `backend/public/index.php:69-622` |
| in-process PDP (권한 판정) | **PRESENT(단일노드)** | `backend/src/Handlers/TeamPermissions.php:695-701` |
| 단일 DB substrate | **PRESENT(단일노드)** | `backend/src/Db.php:63-87`, `:120` |
| proto 정책 배포 유사물(sibling 미러) | **PARTIAL** | `backend/src/Handlers/AdminPlans.php:53-72` (product-config 미러·버전/카나리/롤백 없음) |
| Control/Data Plane 분리 | **ABSENT (grep 0)** | — (in-process 미분리, 근거 없음) |
| 분산 PDP / multi-region / mesh | **ABSENT (grep 0)** | — |
| 정책 배포 파이프라인(버전·카나리·롤백) | **ABSENT (grep 0)** | — |

★ 죽은 terraform(`infra/aws/terraform/*` blue-green/autoscaling)은 라이브 authz와 무연결 — PRESENT 근거로 인용하지 않는다.

## 3. 설계 계약 (규칙)

1. **골격 편입 규칙**: 라이브 authz는 단일 PHP/MySQL 모놀리스(PEP `index.php:69-622` + PDP `TeamPermissions.php:695-701`)이다. 패브릭 도입은 이 모놀리스를 **분해 대상**으로 삼되, 현 결정 등가성을 무후퇴로 보존한다(§C3).
2. **단일 substrate 승격**: 유일한 실 substrate인 멀티테넌트 격리(`index.php:614-619`)를 패브릭 전 계층의 격리 불변식(§C4)으로 승격한다. 신규 격리 엔진 신설 금지.
3. **proto 재사용**: sibling 미러(`AdminPlans.php:53-72`)는 배포 파이프라인의 **원형(proto)**으로만 참조하며, 버전/카나리/롤백 부재를 Control Plane 신설(§3, 별도 DSAR)에서 보강한다.
4. **통합 무중복(§C3)**: Part 1~3-15 엔티티는 본 패브릭이 유일한 상위 통합층이며, 하위 DSAR가 정의한 표준 모델을 재정의하지 않는다.

## 4. KEEP_SEPARATE

- 마케팅 아웃바운드·채널 동기화(`backend/src/Handlers/ChannelSync.php:12-25`)는 인가 패브릭이 아니라 채널 집행 도메인 — 패브릭에 흡수하지 않는다.
- 데이터 반출(`backend/src/Handlers/DataExport.php:11`, `:26`)·귀속 엔진(`backend/src/Handlers/AttributionEngine.php:1754-1791`)은 인가 결정 경로가 아님 — KEEP_SEPARATE.

## 5. 판정

- **NOT_CERTIFIED · BLOCKED_PREREQUISITE**: Fabric 통합 골격(Control/Data Plane 분리·분산 결정·multi-region/cloud/mesh)은 **전부 ABSENT(grep 0)**.
- **재활용 substrate**: 멀티테넌트 격리(`index.php:614-619`)=유일 실체 · in-process PEP+PDP(`index.php:69-622`·`TeamPermissions.php:695-701`)=분리 대상 · sibling 미러(`AdminPlans.php:53-72`)=유일 proto 배포유사물(PARTIAL).
- **선행 의존**: Part 1~3-15 표준 모델 확정 + Control Plane(§3)·Data Plane(§4) DSAR 선행. 본 골격은 통합층 정의(무중복)만 수립하며 코드 배선 0.
