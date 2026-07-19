# DSAR — Approval Role Index / Constraint / Performance (EPIC 06-A-03-02-03-04 Part 3-1 · Role Registry Foundation)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2) 실 구현 부재
- **불변**: Role ≠ Permission ≠ Authority ≠ Job Title ≠ Plan · Golden Rule · 폐기 admin_roles 재부활 금지 · 289차 P1~P4 재플래그 금지 · 반날조(file:line은 상위 ADR·전수조사 2문서만·없으면 ABSENT)

---

## 1. 목적

§63(DB 제약)·§64(Index)·§65(Performance)의 **Role Registry 데이터 무결성 제약·인덱스·성능 전략**을 정의한다. 제약은 잘못된 상태를 스키마 레벨에서 원천 차단하고, 인덱스/성능은 authz 핫패스(Role 해석)를 감당하되 **무결성 검증을 성능 이유로 제거하지 않는다**. 현행 저장소는 `app_user.team_role`·`api_key.role`·`admin_level` 등 flat 컬럼만 있고 Registry 제약·전용 인덱스가 부재하다(순신규).

## 2. 열거 / 항목

### 2.1 §63 DB 제약

| 제약 |
|---|
| Role Code + Registry + Tenant **Unique** |
| Namespace **Unique** |
| Version **Unique**(Role별 버전 유일) |
| Active Version **Overlap 방지**(동시 활성 1) |
| Valid From **<** Valid To |
| Tenant / Registry / Type / Category / Risk / Criticality **Not Null** |
| Business / Technical / Security Owner **필수** |
| Active Role은 **Active Permission Version만** 참조(BLOCKED·Part 2) |
| **Self Replacement 금지**(Alias/Replacement self-loop 차단) |
| **Cross-Tenant FK 차단** |
| Immutable **Version/Snapshot/Evidence/Audit Update 방지**(트리거/권한) |
| **Invalid Lifecycle Transition 차단**(허용 전이표 외 금지) |

### 2.2 §64 Index

| 인덱스 |
|---|
| (tenant_id, registry_code, role_code) — 핫패스 해석 |
| (namespace) — 네임스페이스 조회 |
| (role_code, version) — 버전 조회 |
| (tenant_id, status) — Active Role Projection |
| (risk, criticality) — 위험/중요도 필터 |
| (business_owner / technical_owner / security_owner) — Owner 역조회 |
| (review_due_at / certification_due_at) — 기한 배치 |

### 2.3 §65 Performance

| 전략 |
|---|
| **Active Role Projection**(활성만 사전 투영) |
| **Role Code Lookup Cache** |
| **Prejoined Permission Mapping**(해석 시 조인 절감·Part 2 결합) |
| **Tenant-isolated Cache**(캐시 키에 tenant 필수) |
| **Event-driven Invalidation**(정의/버전 변경 시 무효화) |

## 3. substrate 매핑 (§5.2)

| Canonical 제약/인덱스축 | §5.2 태그 | 실 substrate (file:line) |
|---|---|---|
| flat role 컬럼(제약·인덱스 부재) | **PARTIAL → 정형화** | `app_user.team_role`(`UserAuth.php:188`)·`admin_level`(`:191`)·`api_key.role`(`Keys.php:63,119`) |
| tenant 격리(데이터 행필터·정의격리 아님) | **PARTIAL** | data_scope 9dims(`TeamPermissions.php:41,218-322`) · team(`TeamPermissions.php:145-151`) |
| Role Code Unique / Namespace Unique | **ABSENT → 신설** | 값 'admin' 3중복 미차단(`TeamPermissions.php:132`·`AdminMenu.php:247`·`Keys.php:95`) |
| Version/Active Overlap/Valid From<To 제약 | **ABSENT** | 버전 개념 부재 |
| Owner Not Null | **ABSENT** | Owner 컬럼 부재 |
| Active Permission Version FK | **BLOCKED_PREREQUISITE** | Part 2 이후 |
| Immutable Snapshot/Evidence/Audit 방지 | **ABSENT** | Snapshot/digest 부재 · Evidence=auth_audit_log 변경로그만 |
| Lifecycle Transition 제약 | **ABSENT** | 하드코딩 enum(런타임 전이 없음) |
| Active Role Projection/Cache | **PARTIAL** | FE `teamRolePolicy.js` 미러 · 서버 캐시 계약 부재 |

## 4. 설계 원칙

1. **무결성 제약을 성능 이유로 제거 금지** — Version/Owner/Permission Version/Lifecycle 검증은 성능 최적화(캐시/프로젝션) 하류가 아니라 스키마 제약으로 강제(§65 note).
2. **Unique로 값충돌 원천 차단** — 값 'admin' 3중복은 Role Code+Registry+Tenant Unique·Namespace Unique로 스키마 레벨 차단(런타임 가드만으로 두지 않음).
3. **Cross-Tenant FK 차단** — Registry 정의 격리를 FK 제약으로 강제(데이터 행필터 data_scope와 별개축).
4. **Immutable = 스키마·권한으로 봉인** — Snapshot/Evidence/Audit/Historical Version은 UPDATE 트리거/권한 회수로 물리적 수정 불가(Append-only).
5. **Tenant-isolated Cache** — 캐시 키에 tenant 필수(Cross-Tenant Cache Poisoning 방지·§59 가드와 정합).
6. **Prejoined Permission Mapping은 Part 2 결합** — BLOCKED_PREREQUISITE.

## 5. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Active Permission Version FK·Prejoined Mapping은 Part 2 이후.
- **Gap(순신규)**: Unique/Overlap/Valid-range/Not-Null/Owner/Immutable/Lifecycle 제약·전용 인덱스·Projection/Cache 전략 전무.
- **PARTIAL**: flat role 컬럼·data_scope tenant 행필터·FE 미러가 존재하나 Registry 제약/인덱스 아님.
- **판정**: NOT_CERTIFIED · 실 DDL/인덱스 = Registry 신설 + Part 2 + 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_ROLE_API_CONTRACT]] · [[DSAR_APPROVAL_ROLE_TEST_STRATEGY]] · [[DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ROLE_REGISTRY_FOUNDATION]]
