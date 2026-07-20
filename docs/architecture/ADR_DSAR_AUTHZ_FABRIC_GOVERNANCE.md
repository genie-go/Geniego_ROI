# ADR — Unified Enterprise Authorization Fabric Foundation

- **Status**: PROPOSED · NOT_CERTIFIED · BLOCKED_PREREQUISITE (설계 명세 · 코드 변경 0)
- **EPIC**: 06-A-03-02-03-04 Part 3-16
- **Date**: 2026-07-20
- **상위 SPEC**: `docs/spec/EPIC_06A_PART3_16_UNIFIED_AUTHORIZATION_FABRIC_SPEC.md` (canonical 원문 verbatim · Version 1.0)
- **Ground-Truth**: `DSAR_APPROVAL_FABRIC_EXISTING_IMPLEMENTATION.md`(①) · `DSAR_APPROVAL_FABRIC_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②)
- **선행 계보**: Part 1~3-15 전체 — 본 Part는 그 통합 fabric 층(Control/Data Plane 분리·정책 배포·분산 결정)

---

## 1. Context

Part 3-16은 지금까지 설계한 모든 authz 구성요소(RBAC/ABAC/ReBAC/Scoped/Dynamic Role/JIT/SoD/PDP/PEP/PIP/PAP/Zero Trust/AI Governance/Observability/Compliance/Runtime Authorization)를 **Unified Enterprise Authorization Fabric(UEAF)** — Authorization Control Plane + Distributed Data Plane 구조 — 로 통합한다.

**★현 실측(2 스레드 상호검증·GT①②)**: 라이브 authz는 **단일 PHP/MySQL 모놀리스**다(`Db.php:63-87`·`index.php:23`·`:686`·`composer.json:5-13`). PEP(`index.php:69-622`)와 PDP(`TeamPermissions.php:695-701`)가 **동일 요청 프로세스 in-process**. Control/Data Plane 분리·Global Policy Distribution·Distributed Decision·Multi-Region·Multi-Cloud·Hybrid·Service Mesh·Cross-Cluster Sync·Global Context Distribution·Decision Cache·Fabric Sync/Health/Routing/Failover/Consistency·Snapshot/Evidence(native)/Digest/Analytics/Drift/Simulation·Guard/Lint = **전부 grep 0(ABSENT)**. 유일 실 substrate=멀티테넌트 격리(`index.php:614-619`). 유일 PARTIAL 배포유사물=`AdminPlans::mirrorPlanTablesToSibling`(`:53-72`·product-config 미러). ★2스택 함정: `infra/aws/terraform/*`는 라이브(MySQL/PHP)와 무연결 죽은 Postgres/ECS 스캐폴딩 — PRESENT 근거 금지.

## 2. Ground-Truth 판정 (2 스레드 상호검증)

### 2.1 실존 substrate (GT①)
- **멀티테넌트 격리(유일 실체·은행급)**: `index.php:614-619`(X-Tenant-Id 서버도출 강제)·`:608-612`·`:600-606`·`:99-122`·`:423-461`.
- **단일 모놀리스 확정**: `Db.php:63-87`·`:120`·`:127`·`index.php:23`·`:686`·`composer.json:5-13`(클러스터/큐/mesh 의존 전무).
- **in-process PEP+PDP(미분리)**: `index.php:69-622`·`:573`·`:583-598`·`TeamPermissions.php:695-701`.
- **정책 배포 proto(PARTIAL)**: `AdminPlans.php:53-72`·`:64-70`·`:157`·`:180`·`:209`·`:539`·`:717`(product-config 미러·버전/카나리/롤백 없음).
- **단일노드 헬스·배포**: `SystemMetrics.php:32`·`:60-100`·`:67-76`·`Health.php:13-26`·`deploy.ps1:1-39`·`deploy.sh:1-21`·`.github/workflows/deploy.yml:77-159`.
- **Evidence 재활용 참고**: `SecurityAudit.php:4-33`·`:8`·`:27`·`:35-40`.

### 2.2 거버넌스 계층 (GT②)
Fabric Registry·Control/Data Plane 분리·Global Distribution·Distributed Decision·Multi-Region/Cloud/Hybrid·Service Mesh·Cross-Cluster Sync·Global Context Distribution·Decision Cache·Fabric Sync/Health/Routing/Failover/Consistency·Snapshot/Evidence(native)/Digest/Analytics/Drift/Simulation·Guard/Lint = **grep 0**. ★KEEP_SEPARATE: 커머스 sync(`ChannelSync.php:12-25`)·데이터 export(`DataExport.php:11`)·계산캐시(`AttributionEngine.php:1754-1791`)·**죽은 terraform(blue-green/autoscaling·PRESENT 오판 금지)**·"fabricated" false positive.

### 2.3 종합
**판정 = ABSENT-fabric(단일노드 모놀리스) / PARTIAL-substrate(멀티테넌트 격리·sibling 미러·단일노드 헬스·배포) / KEEP_SEPARATE(커머스 sync·데이터 export·계산캐시·죽은 terraform).**

## 3. Decision

### D-1. 단일노드 in-process를 Control/Data Plane으로 분리 (Extend, 대체 아님)
현 in-process PEP(`index.php:69-622`)+PDP(`TeamPermissions.php:695-701`)를 **Stateless Control Plane(정책 lifecycle/배포/버전·§3)** 과 **Region별 독립 Data Plane(PDP 실행·PEP 집행·Context Resolution·Decision Cache·§4)** 로 분리 신설. 현 단일노드 집행 경로는 유지·병행(무후퇴)·Data Plane의 첫 노드로 편입.

### D-2. AdminPlans sibling 미러를 Global Policy Distribution의 proto로 승격
`AdminPlans::mirrorPlanTablesToSibling`(`:53-72`)를 Versioned/Canary/Blue-Green/Progressive/Emergency Rollback(§5) 배포의 **개념 proto**로만 참조. ★현행은 product-config 풀테이블 DELETE+INSERT(버전/롤백/카나리 없음)이므로 authz 정책 배포엔진은 **순신설**. 미러 로직 흡수·개명 금지.

### D-3. 멀티테넌트 격리는 Fabric Tenant Isolation의 유일 실체 (재발명 금지·KEEP)
`index.php:614-619`(X-Tenant-Id 서버도출 강제·fail-closed)는 §31 Tenant Isolation·Cross-Region Validation의 baseline. **재구현 금지·확장만**. Multi-Region/Multi-Cloud 확장 시에도 이 서버도출 격리를 리전간 전파.

### D-4. 단일노드 헬스를 Fabric Health의 baseline로 확장
`SystemMetrics.php:60-100`·`Health.php:13-26`(단일노드 self probe)를 Cluster/Region/Cache/PDP/PEP/Sync Status 모니터링(§14)의 baseline로 확장. ★현행은 리전/클러스터/geo 없음 — fabric health는 노드간 집계로 순신설.

### D-5. Fabric Evidence/Snapshot/Immutable History는 SecurityAudit 해시체인 확장
Immutable Distribution History·Snapshot·Version Integrity(§31)·Fabric Evidence(§19)는 SecurityAudit 해시체인(`SecurityAudit.php:4-33`) 확장. ★현행은 단일노드 감사(노드간 배포증거·동기화 이력 없음) — fabric-native evidence는 신설.

### D-6. Part 1~3-15와의 관계 (통합 대상·무중복)
UEAF는 RBAC/ABAC/ReBAC/Scoped/Dynamic/JIT/SoD/PDP/PEP/PIP/PAP/Zero Trust/AI Governance/Observability/Compliance(Part 1~3-15)를 **통합·배포·분산 실행**하는 fabric 층이다. 각 통제 엔진 재구현 금지(중복 금지). Fabric은 정책 분배·라우팅·failover·일관성만 담당·결정/집행은 기존 통제.

### D-7. ★KEEP_SEPARATE (커머스 sync·데이터 export·죽은 terraform 흡수·오판 금지)
- **커머스 sync**: `ChannelSync.php:12-25`(주문/재고 sync)·commerce/stock sync cron·connector sync(`Db.php:469-517`)는 커머스 데이터 sync — authz Fabric Sync(§13) 아님.
- **데이터 export**: `DataExport.php:11`(BigQuery/Snowflake/S3)의 클라우드 자격증명은 export 대상 — Multi-Cloud authz(§8) 아님.
- **계산캐시**: `AttributionEngine.php:1754-1791`(attribution_model_cache)·api rate_limit은 authz Decision Cache(§12) 아님.
- **★죽은 terraform**: `infra/aws/terraform/*`(Postgres/ECS·blue-green/autoscaling/multi-az)·`infra/docker-compose.yml`은 라이브(MySQL/PHP)와 무연결 죽은 스캐폴딩. Control Plane/Global Distribution/Multi-Region PRESENT 근거로 **절대 인용 금지**(legacy_v338_pkg 마이크로서비스 아카이브 동류).

### D-8. 정직 분리
- **실재 과신 회피**: 라이브 authz=단일 모놀리스(in-process). Control/Data Plane 분리·정책 배포·분산 결정·multi-region/cloud/mesh 전부 부재. blue-green은 죽은 terraform(default false·미완성).
- **부재 과장 회피**: fabric 골격 grep 0은 실측 부재(그린필드). 유일 실체=멀티테넌트 격리·유일 proto=sibling 미러.
- **오판 회피**: 커머스 sync·데이터 export·계산캐시·죽은 terraform은 authz fabric 아님. "fabricated numbers"는 false positive.

## 4. Consequences

- **긍정**: 일관 정책 적용·중앙 의사결정·분산 실행·멀티클라우드/테넌트 격리·고가용성(RTO≤30초)·글로벌 확장. 단일노드 모놀리스를 fabric으로 확장.
- **비용**: 대규모 신규(Fabric Registry·Control/Data Plane 분리·Global Distribution·Distributed Decision·Multi-Region/Cloud/Hybrid·Service Mesh·Cross-Cluster Sync·Global Context Distribution·Decision Cache·Fabric Sync/Health/Routing/Failover/Consistency·Snapshot/Evidence/Digest/Analytics/Drift/Simulation·Guard/Lint). 단일노드→분산 전환은 인프라 대개편.
- **선행 의존**: Part 1~3-15 인증 후 실 구현(BLOCKED_PREREQUISITE). Fabric은 최상위 통합층이라 하위 통제 전부 선행.
- **무후퇴**: 멀티테넌트 격리·AdminPlans 미러·단일노드 헬스·배포·SecurityAudit·Part1~3-15 유지·병행. Extend-only.

## 5. Compliance / Certification

- **NOT_CERTIFIED**: 코드 변경 0. SPEC은 사용자 제공 canonical 원문 verbatim(Version 1.0).
- 하위 per-entity DSAR은 본 ADR + GT①② 등장 `파일:라인`만 인용(반날조·허용목록 밖 0).
- Completion Gate·Performance(PDP≥99.999%·Cross-Region Sync≤5초·Decision≤20ms·Cache Hit≥99%·Failover≤30초·Distribution≤60초)·Fabric Validation(ISO 27001/SOC2/NIST Zero Trust/CIS/PCI DSS)·Regression은 실 구현 세션(RP-track) 조건.

---
**요약**: Unified Enterprise Authorization Fabric = ABSENT-fabric(단일노드 모놀리스·Control/Data Plane 분리·Global Distribution·Distributed Decision·Multi-Region/Cloud/Hybrid·Service Mesh·Cross-Cluster Sync·Global Context Distribution·Decision Cache·Fabric Sync/Health/Routing/Failover/Consistency·Snapshot/Evidence/Digest/Analytics/Drift/Simulation·Guard/Lint 순신규) / PARTIAL(멀티테넌트 격리·sibling 미러·단일노드 헬스·배포·SecurityAudit) / KEEP_SEPARATE(커머스 sync·데이터 export·계산캐시·죽은 terraform). Extend: in-process PEP+PDP→Control/Data Plane 분리·sibling 미러→proto distribution·멀티테넌트 격리→Fabric Isolation(유일 실체·재발명 금지)·단일노드 헬스→Fabric Health·SecurityAudit→Fabric Evidence·Part1~3-15 통합(무중복). 코드0·NOT_CERTIFIED·선행의존. **커머스 sync·데이터 export·죽은 terraform(blue-green/autoscaling) 흡수·PRESENT 오판 금지.**
