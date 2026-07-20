# DSAR — Authorization Fabric Drift Detection (Part 3-16 §22)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_16_UNIFIED_AUTHORIZATION_FABRIC_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FABRIC_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FABRIC_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FABRIC_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §22)

APPROVAL_FABRIC_DRIFT는 하나의 논리적 authorization fabric이 **복수 substrate**(region·edge cache·정책 버전·실행 context·배포 configuration)에 걸쳐 물리적으로 산재할 때, 각 substrate가 보유한 **effective authorization 상태의 시간적/공간적 편차(drift)**를 탐지·정량화·경보하는 계약이다. 계약이 규정하는 drift 5종:

- **Policy Drift** — 동일 정책이 substrate별로 서로 다른 버전/내용으로 relive.
- **Region Drift** — 지역 substrate 간 effective decision 불일치.
- **Version Drift** — 배포 파이프라인 지연으로 substrate별 정책 버전 skew.
- **Context Drift** — 실행 context(tenant/role/scope 해석)의 substrate 간 divergence.
- **Configuration Drift** — 인가 게이트 구성(bypass 목록·RBAC 임계·플랜 게이트)의 substrate 간 불일치.

계약의 완료 정의는 (a) substrate별 authorization snapshot을 canonical 형태로 정규화, (b) baseline 대비 diff 산출, (c) drift 심각도 등급화(INFO/WARN/CRITICAL), (d) drift 이벤트를 append-only 감사에 기록.

## 2. Substrate 매핑 (현행 라이브 실측)

| SPEC drift 축 | 현행 라이브 substrate | 비교 가능 여부 | 근거 |
|---|---|---|---|
| Policy/Version | 단일 in-process 미들웨어 인가(bypass 목록·Bearer 검증·RBAC) | **불가** — substrate가 1개, 버전 스냅샷 개념 없음 | `backend/public/index.php:69-622` |
| Configuration | bypass 경로 목록·RBAC 롤/스코프 판정 인라인 | **불가** — 구성이 코드 리터럴, snapshot 미기록 | `backend/public/index.php:99-122`, `:423-461`, `:573`, `:583-598` |
| Context | 요청시점 tenant/role 해석 → `auth_key`/`auth_role`/`auth_tenant` 속성 주입 | **불가** — 단일 프로세스, 비교 대상 무 | `backend/public/index.php:600-606`, `:608-612`, `:614-619` |
| Region/Multi-substrate | 없음 (단일 PHP/MySQL 모놀리스) | **불가** | `backend/src/Db.php:116-166`, `:120`, `:127` |
| Drift 이벤트 기록 | append-only 해시체인 감사(정본) — drift 이벤트 종류 부재 | 기록 substrate만 존재, drift 생산자 없음 | `backend/src/SecurityAudit.php:4-33`, `:35-40` |

라이브 authz는 **단일 PHP/MySQL 모놀리스**이며 fabric 상태 비교·스냅샷·baseline 개념이 코드에 존재하지 않는다. 따라서 5종 drift 전부 탐지 대상 substrate 쌍(pair)이 성립하지 않는다.

## 3. 설계 계약 (신설 대상)

1. **Fabric Snapshot Canonicalizer** — 각 substrate의 effective authorization 구성(bypass 목록·RBAC 임계·플랜 게이트·tenant 해석 규칙)을 순서 독립적 canonical 직렬화로 환원. 현행 in-process 인가 상태(`index.php:69-622`)는 단일 snapshot source가 되며, 다중 substrate는 미래 배포 topology(`deploy.ps1`·`deploy.sh`·`.github/workflows/deploy.yml`·`infra/aws/terraform/*`·`infra/docker-compose.yml`)에서 파생.
2. **Baseline Registry** — canonical snapshot의 정본 baseline을 버전과 함께 보관. 신설(현행 부재).
3. **Drift Diff Engine** — snapshot ↔ baseline diff → drift 축별 분류·심각도 등급. 신설.
4. **Drift Audit Sink** — drift 이벤트를 append-only 해시체인 감사(`SecurityAudit.php:4-33`)에 append. 기존 감사 append 계약 재사용(무회귀), drift 이벤트 타입만 신규.

## 4. KEEP_SEPARATE

- **ModelMonitor / PriceOpt / AbTesting drift** — "drift/consistency/snapshot" grep 히트는 전부 **마케팅 ML**(모델 성능 drift·가격 최적화·A/B) 도메인으로, authorization fabric drift와 **무관한 false positive**다. 개념·데이터·수명주기가 다르므로 병합 금지. 참조 도메인 예: `backend/src/Handlers/ChannelSync.php:12-25`, `backend/src/Handlers/AttributionEngine.php:1754-1791` — 인가 fabric 아님(KEEP_SEPARATE).
- **Reconciliation(§25)** 과의 관계 — Reconciliation은 substrate 간 비교 기반 정합 복구로, 본 §22 Drift 탐지 결과를 소비하는 하류 계약이다. 두 계약은 별도 신설이며 Drift는 "탐지·경보"까지, Reconciliation은 "비교·수렴"까지로 책임 경계를 분리한다.

## 5. 판정

**ABSENT (fabric drift 탐지 전무).** 라이브 authz는 단일 substrate 모놀리스로, drift를 정의하기 위한 다중 substrate·snapshot·baseline이 코드에 존재하지 않는다. "drift" grep 히트는 마케팅 ML false positive이며 authz fabric이 아니다. 본 계약은 코드 변경 0의 설계 명세이며, 실 구현은 선행 fabric substrate 분리를 전제로 하는 BLOCKED_PREREQUISITE. NOT_CERTIFIED.
