# DSAR — Operational Readiness Index (Part 3-25 §30)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_25_FINAL_INTEGRATION_OPERATIONAL_READINESS_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OPERATIONAL_READINESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OPSREADY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OPSREADY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)
Part 3-25 §30은 Operational Readiness 도메인의 **인덱스 전략(Index)**을 규정한다. §29 제약 테이블 위에서 조회 성능·무결성 검증을 지탱할 인덱스 6종을 요구한다:
- **Release Index** — 릴리스 버전·시각·상태 조회.
- **Certification Index** — 인증 대상·판정·유효기간 조회.
- **Readiness Index** — 준비도 게이트·스코어·차단 사유 조회.
- **Deployment Index** — 배포 단위·리전·롤백 상태 조회.
- **Snapshot Index** — 구성/증거 스냅샷 digest 조회.
- **Risk Index** — 리스크 등록·심각도·완화 상태 조회.

## 2. Substrate 매핑
| SPEC 인덱스 | 현행 substrate | 인용 | 상태 |
|---|---|---|---|
| Release Index | 거버넌스 릴리스 테이블 부재 | — | ABSENT |
| Certification Index | 인증 테이블 부재 | — | ABSENT |
| Readiness Index | 준비도 테이블 부재 | — | ABSENT |
| Deployment Index | 배포 거버넌스 테이블 부재 | — | ABSENT |
| Snapshot Index | 스냅샷 테이블 부재 | — | ABSENT |
| Risk Index | 리스크 등록 테이블 부재 | — | ABSENT |
| (기반) DB 설정 로드 | env 기반 접속 | `backend/src/Db.php:43-48` | env only |

## 3. 설계 계약
- 6개 인덱스 전부는 §29(DB Constraint)에서 신설되는 제약 테이블에 **종속**한다. 대상 테이블이 부재하므로 인덱스는 정의 대상 자체가 없다.
- 현 DB는 env 기반 접속(`Db.php:43-48`)만 존재하며, 릴리스/인증/준비도/배포/스냅샷/리스크 어느 거버넌스 테이블도 grep 0.
- 신설 시: 각 인덱스는 테넌트 스코프 컬럼을 선도 키(leading key)로 두어 격리(`Db.php:81-84` 술어)와 정렬 로컬리티를 동시에 확보. Snapshot/Certification Index는 SecurityAudit digest(`SecurityAudit.php:25-31`) 컬럼을 커버링 인덱스로 포함해 무결성 조회를 O(log n)로 낮춘다.
- Release Index는 migration 락(`Db.php:157-163`)의 단조 버전 패턴과 정렬 규칙을 일치시켜 버전 역행 조회를 배제.

## 4. 판정
**ABSENT.**
- 거버넌스 테이블/인덱스 전무(6종 모두 grep 0). 현 DB=env 설정 로드(`Db.php:43-48`)에 그침.
- 순신설이며 §29 제약 테이블에 **종속**(테이블 신설이 선행되지 않으면 인덱스 정의 불가).
- 코드 변경 0 · NOT_CERTIFIED · 선행 Part1~3-24 및 §29 인증 후 실행 가능.
