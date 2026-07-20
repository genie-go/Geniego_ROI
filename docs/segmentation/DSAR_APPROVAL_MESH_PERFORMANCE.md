# DSAR — Authorization Universal Governance Mesh: Performance (Part 3-24 §32)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_24_UNIVERSAL_GOVERNANCE_MESH_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_GOVERNANCE_MESH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_MESH_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_MESH_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)
§32는 Universal Governance Mesh의 **성능 목표(Performance SLO)**를 정의한다.

| # | 지표 | 목표 |
|---|------|------|
| P-1 | Node Registration | ≤ 5초 |
| P-2 | Policy Distribution | ≤ 10초(전 리전 수렴) |
| P-3 | Region Sync | ≤ 5초 |
| P-4 | Consensus | ≤ 2초 |
| P-5 | Availability | ≥ 99.999% |

## 2. Substrate 매핑(현행 실측 → 계약)
| 계약 | 현행 substrate | 실측 | 판정 |
|------|----------------|------|------|
| P-1~P-4 mesh 지표 | node/region/consensus 런타임 | mesh 부재(grep 0) | **ABSENT(측정 대상 없음)** |
| PDP 지연 근사 | 로컬 권한 판정(`backend/src/Handlers/TeamPermissions.php:695-700`) | 인프로세스 로컬 PDP만 | 로컬 근사만 |
| 시스템 지표 수집 | 시스템 메트릭 수집기(`backend/src/Handlers/SystemMetrics.php:32`) | 단일 호스트 메트릭 | 관측 기반 부분 존재 |
| 분산 수렴 substrate | 메시지 버스 부재(`backend/composer.json:6-13`)·단일 DB 호스트(`backend/src/Db.php:120`) | 분산 없음 | 부재 |

## 3. 설계 계약
- **측정 대상 부재**: P-1~P-4는 mesh 노드/리전/합의 런타임을 전제하나 해당 substrate가 grep 0이다. 현재 권한 판정은 로컬 인프로세스 PDP(`TeamPermissions.php:695-700`) 단일 홉으로, 분산 등록/배포/동기화/합의 경로 자체가 없어 지표가 정의되지 않는다.
- **관측 기반**: SLO 계측기는 신규 mesh 계측기가 아니라 기존 `SystemMetrics.php:32` 수집 계층을 확장해 노드/리전 지표를 흡수하도록 설계(계측기 난립 금지).
- **P-5 Availability 99.999%**: 단일 DB 호스트(`Db.php:120`)·단일 PDO 커넥션은 다중 리전 리던던시가 없어 five-nines를 구조적으로 충족 불가. 멀티 리전 substrate 선행 없이는 SLO 성립 불가.
- **RP-track 조건부**: 본 성능 계약은 mesh substrate(§30 테이블·메시지 버스)가 물리 존재할 때만 벤치 대상. 그 전까지 로컬 PDP 지연·`SystemMetrics.php:32` 관측치는 **참고치**일 뿐 SLO 판정 근거로 쓰지 않는다.

## 4. 판정
**ABSENT**. 측정 대상 mesh(node/region/consensus)가 부재하고(grep 0), 현행은 로컬 PDP(`TeamPermissions.php:695-700`)와 시스템 메트릭 수집(`SystemMetrics.php:32`)만 존재한다. 분산 substrate 부재(`composer.json:6-13`)·단일 호스트(`Db.php:120`)로 P-2/P-3/P-5는 구조적으로 미성립. 코드 변경 0 · NOT_CERTIFIED · **RP-track 조건**(substrate 물리 존재 시 벤치). 선행 Part 1~3-23 및 §30 인증 후 계측 착수.
