# DSAR — Authorization Fabric Reconciliation (Part 3-16 §25)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_16_UNIFIED_AUTHORIZATION_FABRIC_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FABRIC_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FABRIC_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FABRIC_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §25)

APPROVAL_FABRIC_RECONCILIATION은 §22 Drift가 탐지한 편차를 소비하여, **분리된 fabric plane 간 인가 상태를 비교·수렴(converge)**시키는 계약이다. 비교 대상 4 plane:

- **Control Plane** — 정책·부여의 정본(source of truth) 상태.
- **Data Plane** — 실제 요청을 인가하는 실행 지점의 effective 상태.
- **Cache** — 인가 결정 캐시 계층의 상태.
- **Snapshot** — 특정 시점 fabric 상태의 baseline.

완료 정의는 (a) 각 plane의 authorization 상태를 canonical 형태로 수집, (b) plane 쌍(pair)별 diff 산출, (c) 정본(Control Plane) 기준 수렴 액션(재적용/무효화/재동기) 결정, (d) 수렴 결과 감사 기록. Reconciliation은 Drift(탐지)의 하류이며 "비교→수렴"까지 책임진다.

## 2. Substrate 매핑 (현행 라이브 실측)

| SPEC plane | 현행 라이브 대응 | 비교 가능 여부 | 근거 |
|---|---|---|---|
| Control Plane | 정책/게이트 정본이 코드 리터럴로 인라인, 별도 plane 미분리 | **불가** | `backend/public/index.php:99-122`, `:583-598`, `backend/src/Handlers/TeamPermissions.php:695-701` |
| Data Plane | 인가 실행이 같은 in-process 미들웨어에서 발생(Control과 동일 프로세스) | **불가** — Control/Data 미분리 | `backend/public/index.php:69-622`, `:423-461`, `:600-606` |
| Cache | 인가 결정 캐시 계층 부재 | **불가** — 비교 대상 없음 | `backend/public/index.php:600-606`, `:608-612`, `:614-619` |
| Snapshot | 시점 baseline 스냅샷 미기록 | **불가** | `backend/src/Db.php:116-166`, `:414-427`, `:469-517` |
| 수렴 결과 기록 | append-only 해시체인 감사(정본) | 기록 sink만 존재, 수렴 생산자 없음 | `backend/src/SecurityAudit.php:4-33`, `:8`, `:27`, `:35-40` |

현행 authz는 Control Plane과 Data Plane이 **동일한 in-process 미들웨어**(`index.php:69-622`)에서 미분리 상태로 실행되며, RBAC/스코프 판정 역시 인라인(`TeamPermissions.php:695-701` 참조 지점 포함)이다. plane이 물리적으로 하나이므로 비교할 두 plane 자체가 성립하지 않는다.

## 3. 설계 계약 (신설 대상 — 순신설)

1. **Plane State Collector** — Control/Data/Cache/Snapshot 각 plane의 effective authorization 상태를 canonical 직렬화로 수집. 현행 단일 in-process 상태(`index.php:69-622`·`TeamPermissions.php:695-701`)는 Control=Data 동일값으로 seed(미분리 사실을 명시적으로 표현).
2. **Pairwise Diff Engine** — plane 쌍별 diff. §22 Drift Diff Engine과 diff 표현 스키마 공유(중복 엔진 금지, 표현 계약 재사용).
3. **Convergence Planner** — 정본(Control) 기준 수렴 액션(재적용/무효화/재동기) 산출. 외부 상태 변경은 승인 정책 존중.
4. **Reconciliation Audit Sink** — 수렴 결과를 append-only 해시체인 감사(`SecurityAudit.php:4-33`, `:35-40`)에 append. 기존 append 계약 재사용, 이벤트 타입 신규.

전 구성요소 순신설이며 plane 물리 분리를 선행 전제로 한다.

## 4. KEEP_SEPARATE

- §22 Drift와의 경계 — Drift는 "편차 탐지·경보"까지, Reconciliation은 "plane 비교·정본 수렴"까지. 두 계약은 diff 표현 스키마만 공유하고 엔진은 각자 신설(중복 인텔리전스 금지 원칙 준수).
- 마케팅 ML의 데이터 정합/reconciliation(예: 채널 데이터 dedup·귀속 정합)은 별개 도메인이다(`ChannelSync.php:12-25`·`AttributionEngine.php:1754-1791`, KEEP_SEPARATE). authz plane reconciliation과 병합 금지.

## 5. 판정

**ABSENT (비교 대상 plane 부재).** 현행 in-process 미분리 인가(`index.php:69-622`·`TeamPermissions.php:695-701`)에서는 Control Plane과 Data Plane이 동일 프로세스이고 Cache/Snapshot plane이 없어, 비교할 plane 쌍 자체가 성립하지 않는다. 본 계약은 코드 변경 0의 순신설 설계 명세이며 BLOCKED_PREREQUISITE(plane 물리 분리 선행 전제). NOT_CERTIFIED.
