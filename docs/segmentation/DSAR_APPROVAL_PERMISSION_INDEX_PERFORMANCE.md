# DSAR — Permission Engine DB 제약·Index·Performance (EPIC 06-A-03-02-03-04 Part 2 · §95·§96·§97)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **전수조사 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)
- **규율**: 코드/DB 0 · BLOCKED_PREREQUISITE(RP-002) · 반날조(file:line은 상위 2문서만) · Permission≠Role≠Authority · Golden Rule · Part1 D-2 재플래그 금지 · MySQL+SQLite 폴백 호환 유지

---

## ① 목적

§95(DB 제약)·§96(Index)·§97(Performance)의 데이터 계층 설계 정본이다. Permission 저장체가 **무결성(제약)·조회 성능(인덱스)·저지연 판정(캐시/사전계산)**을 갖되, **성능을 이유로 보안 검증을 제거하지 않는다**는 것이 핵심 규율이다. 기존 저장소의 MySQL 주 + SQLite 폴백 이중 호환을 유지한다.

## ② 핵심 항목/열거

### §95 DB 제약 (무결성)

| # | 제약 |
|---|---|
| 1 | Permission Code + Registry Unique(코드 중복 금지) |
| 2 | Definition Version Unique |
| 3 | Active Version Overlap 방지(동시 활성 버전 중복 금지) |
| 4 | Valid From < Valid To(유효기간 정합) |
| 5 | Tenant Not Null(모든 grant/정의 tenant 귀속) |
| 6 | Self Dependency 금지 |
| 7 | Self Hierarchy Edge 금지 |
| 8 | Cross-Tenant FK 차단 |
| 9 | Immutable Version Update 방지 |
| 10 | Immutable Snapshot Update 방지 |
| 11 | Immutable Evidence Update 방지 |
| 12 | Immutable Audit Update 방지 |

### §96 Index

- Registry/Definition: (tenant, canonical_code, version) · active projection 부분 인덱스.
- Grant: (tenant, subject, permission, status, valid_to) · revocation/expiration 조회용.
- Deny: (tenant, subject, permission) Explicit Deny 우선조회 인덱스.
- Scope: (subject_type, subject_id, scope_type) — data_scope 조회 인덱스.
- Snapshot/Evidence: (tenant, digest) · (correlation_id).
- Resolution 캐시: (tenant, subject, version) 키.

### §97 Performance

| 기법 | 목적 |
|---|---|
| Active Projection | 활성 정의/grant만 투영해 조회 축소 |
| Precompiled Graph | Hierarchy/Group 그래프 사전 컴파일 |
| Transitive Closure | 상속 권한 이행폐쇄 사전계산 |
| Deny First | Deny 집합 먼저 평가(단락) |
| Cache Stampede 방지 | 무효화 시 동시 재계산 폭주 방어 |
| Event-driven Invalidation | grant/version 변경 이벤트로 캐시 무효화 |
| High-risk Fresh / Low-risk Short Cache | 고위험 권한=항상 신선·저위험=짧은 TTL |

## ③ substrate 매핑 (§92 + file:line · 없으면 ABSENT)

- **Unique 제약 선례** — `TeamPermissions.php` acl_permission UNIQUE `uq_acl :170`(tenant×subject×menu_key). §95 #1(Code+Registry Unique)의 정형화 대상 substrate.
- **Tenant Not Null·격리(#5/#8) 선례** — `index.php:619`(tenant 강제주입)·acl_permission `tenant_id`(`:152-171`). Cross-Tenant FK 차단은 설계로 신설.
- **Scope Index substrate(#96)** — `data_scope`(`:160-171,218-322`)·`scopeSql :286-293`·`scopeChannelProduct :315-322` (subject_type×subject_id×scope_type 조회 패턴).
- **Resolution 사전계산 대상** — `effectiveForUser :366`·`effectiveScope :236-265` = 현행 **온디맨드 계산·미영속·미캐시** → §97 Active Projection/캐시의 신설 지점.
- **MySQL+SQLite 이중 호환** — acl_permission MySQL `:152-159` / SQLite `:169-170`, data_scope `:171-172`. 신설 제약/인덱스도 양 백엔드 호환 필수.
- **Version Unique·Active Overlap 방지·Valid From/To·Immutable Version/Snapshot/Evidence/Audit Update 방지·Precompiled Graph·Transitive Closure·Event-driven Invalidation·캐시 키** — **ABSENT(순신규)**.

## ④ 설계 원칙

- 🔴 **성능 이유로 보안 검증 제거 금지**: Active Projection/캐시/사전계산을 도입해도 **Deny·Tenant·Resource Version·Grant Status·Expiration 검증을 우회하지 않는다**. 캐시는 이 검증들의 결과를 담을 뿐 대체하지 않음.
- **Deny First**: 성능 최적화(단락)와 보안(Deny 우선)이 일치 — Deny 집합을 먼저 평가.
- **불변 append-only**: Version/Snapshot/Evidence/Audit는 DB 레벨에서 Update 차단(트리거/제약)·정정은 신 레코드.
- **낙관적 정합(SQLite 호환)**: 분산락/`GET_LOCK` 대신 조건부 UPDATE + rowCount CAS 패턴(저장소 확립 관용). Active Version Overlap은 부분 유니크/CAS로.
- **캐시 키에 Version+Tenant 필수**: 무효화 누락·크로스테넌트 오염 방지(§89 #36과 짝).
- **고위험 신선/저위험 단TTL**: 위험도별 캐시 정책 — Revocation은 즉시 반영(이벤트 무효화).

## ⑤ Gap

- Version/Snapshot/Evidence/Audit 불변 테이블·Precompiled Graph·Transitive Closure·Resolution 캐시 = **전부 순신규**.
- 현행 Effective-Set는 미영속·미캐시(`effectiveForUser` 온디맨드) → 성능 계층 자체가 ABSENT.
- BLOCKED_PREREQUISITE(RP-002): Snapshot/Evidence 저장체는 Part 1 Decision Core 선행 필요.
- ★MySQL+SQLite 폴백 호환은 하드 제약 — 신설 제약/인덱스/캐시는 양 백엔드에서 검증. "있다고 가정" 배선 금지.
