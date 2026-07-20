# DSAR — Authorization Federation Database Constraint (Part 3-18 §33)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_18_FEDERATION_CROSS_DOMAIN_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FEDERATION_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FEDERATION_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FEDERATION_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC §33 Database Constraint)

Federation 데이터의 **무결성을 스키마·제약(DB constraint) 수준에서 강제**하는 계약이다. 애플리케이션 검증에 앞서 저장소 자체가 위반을 거부해야 한다. 계약 요소:

- **Immutable Trust History** — trust 상태 전이 이력은 append-only, UPDATE/DELETE 물리 차단.
- **Immutable Federation Contract** — 발효된 federation 계약 레코드는 불변, 개정은 신규 버전 append.
- **Metadata Version Integrity** — 도메인 메타데이터의 버전 단조증가·동시성 충돌 방지(optimistic concurrency).
- **Certificate Chain Integrity** — 인증서 체인의 참조 무결성·만료/폐기 상태 일관성.
- **Tenant Isolation** — 모든 federation 레코드는 소유 tenant에 귀속, cross-tenant 유출 불가.
- **Cross-Domain Reference Validation** — 파트너/신뢰/정책 레코드의 FK가 실존·유효 도메인만 참조.

## 2. 실존 substrate 매핑

| 계약 구성요소 | 판정 | 근거(허용목록) |
|---|---|---|
| Immutable Trust History | **ABSENT** | grep 0 — trust 이력 테이블 없음. 불변 이력 substrate는 감사 체인만 존재 `SecurityAudit.php:14-67` |
| Immutable Federation Contract | **ABSENT** | grep 0 — federation 계약 테이블 없음 |
| Metadata Version Integrity | **PARTIAL** | SSO 메타데이터 컬럼 실재 `EnterpriseAuth.php:43-54`, 버전 단조/락 제약은 부재 |
| Certificate Chain Integrity | **ABSENT** | grep 0 — 인증서 체인 테이블/제약 없음 |
| Tenant Isolation | **PRESENT** | `index.php:619`(요청시점 tenant 해석·주입)·`AgencyPortal.php:432`(위임 범위 tenant 게이트) |
| Cross-Domain Reference Validation | **ABSENT** | grep 0 — cross-domain FK 대상 테이블 자체 부재 |
| 불변 substrate(재사용) | PRESENT | `SecurityAudit.php:14-67` 해시체인 append·`:43-52` 체인 계산·`:56` 기록 |
| 스키마 자가치유 기반 | PRESENT | `Db.php:942-958` ensureTables self-healing·`:27` PDO 싱글톤 |

federation/trust/certificate 테이블은 grep 0 — 현 DB는 PDO 싱글톤(`Db.php:27`) 위 self-healing `ensureTables`(`Db.php:942-958`)로만 스키마를 관리하며 sso_config/agency/partner/api_key 계열만 실재한다. 불변성의 유일한 실 substrate는 SecurityAudit 해시체인(`SecurityAudit.php:14-67`)이고, Tenant Isolation은 `index.php:619`로 실재한다.

## 3. 설계 계약 (규칙)

1. **불변은 감사 체인으로 EXTEND**: Trust History/Contract 불변은 신규 UPDATE 트리거를 난립시키지 말고 `SecurityAudit.php:14-67` append-only 해시체인에 이벤트를 기록하고 `:43-52` 계산·`:56` 기록 경로를 재사용한다.
2. **Metadata Version은 optimistic concurrency**: `EnterpriseAuth.php:43-54` SSO 메타 컬럼을 버전 컬럼으로 확장하되 단조증가·CAS 제약을 DB에 명시(재구현 금지).
3. **Tenant Isolation 정합**: 모든 federation 레코드 tenant 컬럼은 `index.php:619` 해석 결과·`AgencyPortal.php:432` 게이트와 동일 SSOT를 따른다.
4. **Cross-Domain Ref는 Fail-closed FK**: 참조 대상 도메인이 active 미등록이면 삽입 거부(Unknown=Deny).
5. **self-healing 정합**: 신규 제약은 `Db.php:942-958` ensureTables 규약에 편입, 마이그레이션 172 이후 관례를 깨지 않는다.

## 4. 판정

**NOT_CERTIFIED · BLOCKED_PREREQUISITE(PARTIAL).** Tenant Isolation은 PRESENT(`index.php:619`·`AgencyPortal.php:432`), 불변 substrate는 감사 해시체인으로 실재(`SecurityAudit.php:14-67`), SSO 메타 컬럼(`EnterpriseAuth.php:43-54`)은 버전 무결성의 부분 기반이다. 그러나 Immutable Trust History/Immutable Federation Contract/Certificate Chain Integrity/Cross-Domain Reference Validation은 **순신설(ABSENT·grep 0)** — 대상 테이블 자체가 self-healing DB(`Db.php:942-958`)에 부재하다. 코드 변경 0 — 실 제약 구현은 선행 §1 Registry·§4 Trust 승인 후 별도 세션.
