# DSAR — RBAC Analytics & Governance Dashboard: 데이터베이스 제약 계약 (Part 3-11 §40)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_11_RBAC_ANALYTICS_GOVERNANCE_DASHBOARD_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_RBAC_ANALYTICS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ANALYTICS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ANALYTICS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §40은 RBAC Analytics 저장계층에 5개 DB 제약을 요구한다 — **Immutable Snapshot**(스냅샷 불변), **KPI Formula Version**(산식 버전 고정), **Tenant Isolation**(테넌트 격리), **Dataset Integrity**(데이터셋 무결성), **Digest Validation**(다이제스트 검증). 대시보드는 원천 통제(Part 1~3-10)를 무변경·읽기전용 파생하므로(ADR D-1), 파생 산출물이 사후 변조·재계산되지 않음을 DB 수준에서 강제해야 한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 제약(§40) | 판정 | 근거·재활용 앵커 |
|---|---|---|
| Immutable Snapshot | **ABSENT(authz 전용)** / PARTIAL(패턴) | authz 권한상태 스냅샷 테이블 grep 0(GT② §2). 추가전용 이력 패턴만 실존 — `AccessReview.php:62-81`(access_review_item)·SecurityAudit append-only `SecurityAudit.php:14-33` |
| KPI Formula Version | **ABSENT** | authz KPI 정의·산식 버전 컬럼 부재. Evidence에 KPI Formula/Analytics Version 저장은 SPEC §28 요구뿐(코드0) |
| Tenant Isolation | **PARTIAL** | X-Tenant-Id 서버도출 격리 `index.php:614-619`(ADR D-6 참조)·SecurityAudit 테넌트 스코프 조회 `SecurityAudit.php:71-83`·`:93-110`. authz 대시보드 전용 격리 제약은 ABSENT |
| Dataset Integrity | **PARTIAL(소스)** | 원천 데이터소스만 실존 — `TeamPermissions.php:10`(acl_permission)·`security_audit_log`·`api_key`·`UserAuth.php:2039`(auth_audit_log). 파생 데이터셋 무결성 제약 ABSENT |
| Digest Validation | **PARTIAL(재활용 가능)** | tamper-evident 해시체인 `SecurityAudit.php:14-33`·`:27`(prev_hash→hash_chain)·검증 `SecurityAudit.php:56-68`(verify·broken_at). authz digest 전용 테이블은 ABSENT |

## 3. 설계 계약 (항목·기준 — SPEC 근거)

| # | 계약 항목 | 강제 기준 |
|---|---|---|
| C-1 | Immutable Snapshot | 스냅샷 행 INSERT 후 UPDATE/DELETE 금지(추가전용). `access_review_item` 추가전용 패턴(`AccessReview.php:62-81`) 확장 |
| C-2 | KPI Formula Version | KPI 행에 formula_version·analytics_version NOT NULL. 산식 변경 시 신규 버전 삽입(덮어쓰기 금지·SPEC §28 Evidence 연동) |
| C-3 | Tenant Isolation | 전 analytics 테이블 tenant_id NOT NULL + 서버도출값만 기입(`index.php:614-619`). 클라이언트 tenant 신뢰 금지 |
| C-4 | Dataset Integrity | 스냅샷은 source dataset 참조 FK + digest 컬럼 보유. 소스=authz 정본(`TeamPermissions.php:10`·`security_audit_log`)만 허용 |
| C-5 | Digest Validation | Digest는 metrics+snapshot+evidence 해시(`SecurityAudit.php:27` 체인 방식)·검증은 `SecurityAudit.php:56-68` verify 확장. 불일치 시 BLOCKED |

## 4. KEEP_SEPARATE / 선행의존

- **KEEP_SEPARATE**: 마케팅 analytics 데이터셋(`performance_metrics`/`channel_orders`/`attribution_*`)의 제약·테이블 흡수 절대 금지(ADR D-2·GT② §4). `AttributionEngine.php:1754`(ensureCacheTable)는 attribution 전용 — 스키마 차용 아닌 신설.
- **선행의존**: authz immutable snapshot 테이블은 순신규. SecurityAudit 체인(`SecurityAudit.php:14-33`)·access_review_item(`AccessReview.php:62-81`) 재활용은 substrate 확장이며 실 스키마 DDL은 RP-track.

## 5. 판정 (NOT_CERTIFIED · RP-track 실구현 조건 · 선행의존)

- **판정**: DB Constraint 5종 = ABSENT(authz immutable snapshot 테이블·전용 index 부재) / PARTIAL(SecurityAudit 해시체인·access_review_item 추가전용·X-Tenant-Id 격리 재활용 가능).
- **RP-track 실구현 조건**: C-1~C-5 DDL 신설 + Digest Validation을 `SecurityAudit::verify`(`:56-68`) 확장으로 배선 + Tenant Isolation 회귀. Part 1~3-10 인증 후(BLOCKED_PREREQUISITE).
- 현 단계 코드 변경 0 · NOT_CERTIFIED. 마케팅 스키마 흡수 금지.
