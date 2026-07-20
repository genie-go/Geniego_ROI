# DSAR — Authorization Universal Governance Mesh: Database Constraint (Part 3-24 §30)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_24_UNIVERSAL_GOVERNANCE_MESH_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_GOVERNANCE_MESH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_MESH_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_MESH_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)
§30은 Universal Governance Mesh의 **데이터베이스 제약(Database Constraint)** 6종을 정의한다. Mesh 위상(topology)·동기화(synchronization)·정책 버전·신뢰 체인의 위·변조 불가능성(Immutability)과 테넌트/리전 격리를 DB 계층에서 강제해야 한다.

| # | Constraint | 계약 요건 |
|---|-----------|-----------|
| C-1 | Immutable Topology History | mesh 위상 변경 이력은 append-only. UPDATE/DELETE 금지, 해시 링크 |
| C-2 | Immutable Synchronization Log | region 간 정책 동기화 로그 append-only·재정렬 불가 |
| C-3 | Policy Version Integrity | 정책 버전 단조 증가·이전 버전 불변·다이제스트 봉인 |
| C-4 | Trust Chain Integrity | node ↔ node 신뢰 서명 체인 무결성(rogue node 삽입 차단) |
| C-5 | Tenant Isolation | 모든 mesh 레코드에 tenant 스코프 강제·교차 접근 불가 |
| C-6 | Region Isolation | region 경계 넘는 레코드 노출 차단·리전 스코프 강제 |

## 2. Substrate 매핑(현행 실측 → 계약)
| 계약 | 현행 substrate | 실측 | 판정 |
|------|----------------|------|------|
| C-5 Tenant Isolation | 요청 시점 테넌트 강제 주입(`backend/public/index.php:98`), 공개경로/스코프 처리(`:116-121`) | 실재·라이브 격리 | **PARTIAL(격리 기반 존재)** |
| C-1/C-2/C-4 Immutable | SecurityAudit 해시체인 append-only(`backend/src/SecurityAudit.php:27`·검증 `:51`) | 유일 실 append-only 무결성 원천 | **PARTIAL(체인 확장 기반)** |
| C-3 Policy Version | 정책 버전 전용 무결성 테이블 | grep 0 | **ABSENT(순신설)** |
| C-6 Region Isolation | region 개념 자체 부재(단일 DB 호스트 `backend/src/Db.php:120`) | grep 0 | **ABSENT(순신설)** |

## 3. 설계 계약
- **C-5 Tenant Isolation**: `index.php:98`의 X-Tenant 주입을 SoT로 재사용. mesh 신설 테이블 전체에 `tenant_id NOT NULL` + 애플리케이션 게이트 이중화(`:116-121` 스코프 처리 패턴 준수). 신규 물리 격리 컬럼 규약만 추가, 기존 게이트 무변경(Extend).
- **C-1/C-2/C-4 Immutable**: 위상·동기화·신뢰 이벤트를 `SecurityAudit.php:27` 해시체인에 **한 줄로 흡수**(별도 체인 엔진 신설 금지). `SecurityAudit.php:51` verify()를 mesh 무결성 검증 정본으로 승격. preimage에 topology/sync/trust digest 포함.
- **C-3 Policy Version Integrity**: 정책 버전 단조성은 신설 `authz_policy_version` 제약(version 단조 증가 트리거 + 이전 행 immutable)으로 설계하되, 다이제스트는 SecurityAudit 체인에 앵커(anchor). 순신설이나 무결성 원천은 기존 체인에 종속.
- **C-6 Region Isolation**: 현 DB=PDO 싱글톤 단일 호스트(`Db.php:20-21`·`:120`)이므로 리전 분산 substrate 부재. region 스코프 컬럼·제약은 **BLOCKED_PREREQUISITE**(멀티 리전 substrate 선행). 설계만 명세, 물리 제약 미생성.

## 4. 판정
**PARTIAL**. Tenant Isolation(`index.php:98`·`:116-121`)과 Immutable(SecurityAudit 해시체인 `SecurityAudit.php:27`·`:51`)은 실 격리·실 무결성 기반이 존재하여 확장 가능. Immutable Topology History·Immutable Synchronization Log·Trust Chain Integrity·Region Isolation은 mesh 위상/리전 substrate 부재로 **순신설**이며, C-6은 단일 호스트(`Db.php:120`)로 **BLOCKED_PREREQUISITE**. 코드 변경 0 · NOT_CERTIFIED. 선행 Part 1~3-23 인증 후 실 제약 생성 착수.
