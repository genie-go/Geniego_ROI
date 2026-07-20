# DSAR — Approval Mesh Region (Part 3-24 §2·§7)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_24_UNIVERSAL_GOVERNANCE_MESH_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_GOVERNANCE_MESH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_MESH_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_MESH_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC §2·§7 Regional Node)

`APPROVAL_MESH_REGION`은 Mesh 노드를 **지리·장애도메인 단위로 묶는 리전 그룹**이다. 계약상 역할:

- 복수 노드를 리전으로 그룹화하여, 리전 로컬 정책 결정·리전 간 정책 세대 동기화(§7)를 관장한다.
- 리전 장애 격리(한 리전 장애가 타 리전 authz를 마비시키지 않음)와 리전별 데이터 레지던시 경계를 제공한다.
- Registry(§DSAR_REGISTRY)에 리전을 membership 단위로 등록한다.

리전은 **복수 노드가 물리적으로 분산되어 존재할 때만** 의미를 갖는 상위 그룹핑 계약이다.

## 2. 실존 substrate 매핑 (PRESENT / PARTIAL / ABSENT)

| 계약 요소 | 라이브 substrate | 판정 | 근거(허용목록) |
|---|---|---|---|
| 복수 리전(장애도메인) | 없음 | **ABSENT** | 단일 호스트 배포(`deploy.sh:5-6`·`:19`) |
| 리전 간 정책 동기화(§7) | 없음 | **ABSENT** | 메시지버스/consensus 전무(`composer.json:6-13`) |
| prod/demo "분리" | 형제 스키마(리전 아님) | **ABSENT(오판주의)** | `AdminPlans.php:58`·`Db.php:136-154` — 동일 호스트 내 형제 스키마 |
| 리전 레지스트리 등록 | 없음 | **ABSENT** | grep 0 |

라이브 배포는 단일 원격 호스트로의 rsync(`deploy.sh:5-6`)이며, prod/demo는 **리전이 아니라 동일 호스트 위의 형제 스키마**(`AdminPlans.php:58`·`Db.php:136-154`)다. 장애 격리·데이터 레지던시·리전 간 동기화 계약을 만족하는 물리 대상이 전무하다.

### ★ 죽은 인프라·동음이의 — PRESENT 오판 금지

- **죽은 terraform 단일리전**(`infra/aws/terraform/main.tf`)·오토스케일 정의(`infra/aws/terraform/autoscaling.tf`)는 라이브에 **무연결**이다. IaC 파일 존재가 "리전 mesh 가동"의 근거가 될 수 없다 → **Multi-Region PRESENT 금지**.
- **geo region 동음이의**: 채널/광고 도메인의 지리 "region"(마켓·타깃 지역)은 authz mesh 리전과 무관하다. 명칭 충돌을 흡수하지 말 것.

## 3. 설계 계약 (규칙)

- **R1 (리전=복수노드 상위)**: 리전은 §DSAR_NODE가 복수·분산 존재할 때만 성립. 노드 substrate 부재 시 리전 계약은 BLOCKED_PREREQUISITE.
- **R2 (장애 격리)**: 리전 장애 시 타 리전은 최신 알려진 epoch로 deny-by-default 지속 운영. 미지 상태를 허용으로 승격 금지.
- **R3 (데이터 레지던시)**: 리전 경계는 테넌트 데이터 레지던시 경계를 넘지 않으며, 공용 스코프는 `__shared__` 명시로만 교차.
- **R4 (IaC≠런타임)**: terraform/k8s 정의 파일 존재는 리전 substrate 근거가 아니다. 라이브 연결 증거(런타임 노드 보고)만 PRESENT 판정 근거.
- **R5 (중복 금지)**: 리전 동기화는 §DSAR_REGISTRY epoch 계약을 재사용하며, 별도 리전 정책 저장소를 난립시키지 않는다.

## 4. KEEP_SEPARATE

해당 있음(동음이의): 채널/광고 도메인의 geo "region"은 마케팅 지역 개념으로 **분리 유지**. authz mesh 리전 계약과 병합·흡수 금지. 죽은 `infra/aws/terraform/main.tf` 단일리전 정의도 라이브 substrate로 취급하지 않는다.

## 5. 판정 (NOT_CERTIFIED)

`APPROVAL_MESH_REGION`은 **ABSENT(단일 호스트·형제 스키마·리전 아님)** — 순신설. `deploy.sh:5-6` 단일 rsync 대상·`AdminPlans.php:58` 형제 스키마는 리전이 아니며, 죽은 terraform 단일리전(`infra/aws/terraform/main.tf`)·geo region 동음이의는 **PRESENT 금지**. 노드 substrate 부재로 상위 리전 계약은 **BLOCKED_PREREQUISITE** · 코드 변경 0 · **NOT_CERTIFIED**.
