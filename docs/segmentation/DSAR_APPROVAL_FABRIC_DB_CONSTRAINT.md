# DSAR — Database Constraint 계약 (Part 3-16 §31)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_16_UNIFIED_AUTHORIZATION_FABRIC_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FABRIC_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FABRIC_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FABRIC_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC §31)

Unified Enterprise Authorization Fabric 의 데이터 계층은 5개 불변식(Constraint)을 DB 레벨에서 강제해야 한다:

- **C-1 Immutable Distribution History** — 정책·클러스터·리전 간 분배(distribution) 이력은 append-only. UPDATE/DELETE 경로 부재.
- **C-2 Immutable Snapshot** — 정책 스냅샷은 발행 후 변경 불가. 버전 봉인.
- **C-3 Version Integrity** — Policy Version / Cache Version 단조 증가·중복 불가·참조 무결성(FK).
- **C-4 Tenant Isolation** — 모든 fabric 레코드는 tenant 경계 밖 접근 불가.
- **C-5 Cross-Region Validation** — 리전 간 복제 레코드의 정합성 체크섬·digest 검증.

## 2. 라이브 substrate 매핑

| SPEC 계약 | 실 substrate | 상태 |
|---|---|---|
| C-4 Tenant Isolation | 인증 키 tenant_id 로 `X-Tenant-Id` 무조건 덮어쓰기 `index.php:614-619`; auth context 주입 `:608-612`; strict fail-closed `:600-606` | **PRESENT(재사용)** |
| C-1/C-2 Immutable | SecurityAudit append-only 해시체인 `SecurityAudit.php:4-33`(prev_hash→hash_chain `:27`, UPDATE/DELETE 경로 없음 `:8`) | **PRESENT(확장 기반)** |
| C-3 Version Integrity | 단일 MySQL 노드 `Db.php:63-87`·기본 DB명 `geniego_roi` `:66` | 일반 스키마만·fabric 버전 테이블 ABSENT |
| C-1 Distribution History | (fabric distribution 테이블) | **ABSENT** |
| C-2 Snapshot | (fabric snapshot 테이블) | **ABSENT** |
| C-5 Cross-Region Validation | (다중 리전 substrate) | **ABSENT — 라이브=단일 호스트** |

## 3. 설계 계약(신설 시)

- C-4 는 신규 fabric 테이블에 `tenant_id NOT NULL` 컬럼 + 전 쿼리 tenant 술어를 강제하고, 기존 `index.php:614-619` 의 tenant 주입 불변식을 데이터 계층까지 연장한다(신규 예외 경로 금지).
- C-1/C-2 는 `SecurityAudit.php:4-33` 의 append-only + 해시체인 패턴(genesis→prev_hash 연쇄, verify 시 변조 탐지)을 distribution/snapshot 테이블로 **확장**한다. 별도 tamper-evident 엔진 신설 금지(중복).
- C-3 은 version 컬럼 UNIQUE + 단조성 트리거/애플리케이션 게이트. 현 단일 DB(`Db.php:63-87`) 위에서 정의.
- C-5 는 다중 리전 substrate 가 실재할 때만 의미. 현재 죽은 terraform(`infra/aws/terraform/*`) 은 PRESENT 아님 — 인프라 신설 전 계약 미발효.

## 4. 판정

**PARTIAL.** Tenant Isolation(C-4) 은 멀티테넌트 격리로 라이브 실재(`index.php:614-619`·`:608-612`·`:600-606`), Immutable(C-1/C-2) 은 SecurityAudit 해시체인 `SecurityAudit.php:4-33` 을 확장 기반으로 재사용 가능. 나머지 Distribution History·Snapshot 테이블·Cross-Region Validation 은 fabric 테이블 자체가 없어 **순신설**. 라이브 authz 는 단일 PHP/MySQL 모놀리스(`Db.php:63-87`·`:120`·`:127`)이므로 리전 제약은 substrate 부재로 정의만 존재.

NOT_CERTIFIED · 코드 변경 0 · 실 제약 신설은 선행 Part1~3-15 인증 + RP-track 세션 조건.
