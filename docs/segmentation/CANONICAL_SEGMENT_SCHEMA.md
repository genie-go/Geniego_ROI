# Canonical Segment Schema — Entity Model, Definition, Version, ID & Scope

> **EPIC 06-A Part 2** (1/5) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거: [`SEGMENTATION_PLATFORM_INVENTORY.md`](SEGMENTATION_PLATFORM_INVENTORY.md)(Part 1 실코드 인벤토리) · [`SEGMENT_ARCHITECTURE_BASELINE.md`](SEGMENT_ARCHITECTURE_BASELINE.md)(Option E)
> 형제: [`CANONICAL_SEGMENT_DSL.md`](CANONICAL_SEGMENT_DSL.md) · [`CANONICAL_SEGMENT_OPERATOR_REGISTRY.md`](CANONICAL_SEGMENT_OPERATOR_REGISTRY.md) · [`CANONICAL_SEGMENT_RULE_ENGINE.md`](CANONICAL_SEGMENT_RULE_ENGINE.md) · [`CANONICAL_SEGMENT_GOVERNANCE.md`](CANONICAL_SEGMENT_GOVERNANCE.md) · ADR=[`../architecture/ADR_CANONICAL_SEGMENT_DSL.md`](../architecture/ADR_CANONICAL_SEGMENT_DSL.md)
> **성격**: 이 문서는 **목표 계약(target contract)** 이다. 실 구현은 후속 승인 세션(verify+배포승인). 현 정본 엔진 `crm_segments`+`crm_segment_members`(`CRM.php:64-98,1530-1619`)를 **확장**하며 재구현·교체하지 않는다.

---

## 0. 현행 대비 원칙 (무후퇴·확장)

| 현행(Part 1 실측) | Canonical 목표 | 전환방식 |
|---|---|---|
| `crm_segments`(rules TEXT, member_count) | `SEGMENT`+`SEGMENT_DEFINITION`+`SEGMENT_VERSION` 논리분리 | **컬럼 추가**(테이블 유지, 비파괴) |
| `crm_segment_members` | `SEGMENT_MEMBERSHIP`+`SEGMENT_SNAPSHOT` | 컬럼 추가 + 스냅샷 신설 |
| version/snapshot/evaluated_at 부재 | Version·Snapshot·Evaluation-Time | **신규 필드**(기존 행은 v1로 승격) |
| int PK id | UUID/ULID segment_id 병행 | 기존 int 유지 + canonical id 컬럼 추가 |

**핵심**: Canonical Schema 도입은 **기존 int id·rules 컬럼을 삭제하지 않고** canonical 필드를 병행 추가하는 확장이다(EPIC05 Canonical Customer Profile이 crm_customers 확장한 것과 동일 패턴).

---

## 1. Canonical Segment Entity Model (§4)

기존 동등 엔티티가 있으면 신설하지 않는다(→열 "현 매핑").

| Canonical Entity | 책임 | 현 매핑 | 상태 |
|---|---|---|---|
| `SEGMENT` | 논리 세그먼트(불변 identity) | crm_segments.id | 확장 |
| `SEGMENT_DEFINITION` | 정의 컨테이너(current pointer) | crm_segments.rules | 확장 |
| `SEGMENT_VERSION` | 불변 정의 리비전 | **신규** | 신설(비파괴) |
| `SEGMENT_RULE_GROUP` | 논리 그룹(AND/OR/NOT) | (DSL 내부) | DSL 구조화 |
| `SEGMENT_RULE` | 단일 술어 | rules[] 요소 | DSL 구조화 |
| `SEGMENT_REFERENCE` | 참조(Attr/Event/Metric/Model/Segment) | (암묵) | 명시화 |
| `SEGMENT_DEPENDENCY` | 버전별 의존성 스냅샷 | **신규** | 신설 |
| `SEGMENT_VALIDATION_RESULT` | 검증 결과 | **신규** | 신설 |
| `SEGMENT_LOGICAL_PLAN` | 벤더중립 실행계획 | **신규** | 신설 |
| `SEGMENT_PHYSICAL_PLAN` | 어댑터 계획 | (refreshSegmentMembers SQL) | 형식화 |
| `SEGMENT_EVALUATION` | 평가 실행 기록 | **신규** | 신설 |
| `SEGMENT_MEMBERSHIP` | 포함 고객 | crm_segment_members | 확장 |
| `SEGMENT_SNAPSHOT` | 시점 고정 멤버셋 | **신규** | 신설(SEG-H4) |
| `COHORT_DEFINITION` | 코호트 정의 | cohortRetention(즉석) | 형식화 |
| `HOLDOUT_DEFINITION` | 홀드아웃 정의 | **부재** | 신설 |
| `EXPERIMENT_ASSIGNMENT_POLICY` | 배정정책 | **부재** | 신설 |
| `SEGMENT_APPROVAL` | 승인기록 | **부재** | 신설 |
| `SEGMENT_CHANGE_REQUEST` | 변경요청 | **부재** | 신설 |

**Entity Registry 등재**: 위 엔티티는 [`../entities/CANONICAL_ENTITY_REGISTRY.md`](../entities/CANONICAL_ENTITY_REGISTRY.md)(EPIC01-B)의 Segment 계열로 CE ID 부여 대상. 신설 전 CE Registry 조회 의무.

---

## 2. Segment ID 정책 (§5)

| 규칙 | 명세 |
|---|---|
| 형식 | ULID(정렬가능) 권장, `segment_id` 컬럼(기존 int `id` 병행 유지) |
| Tenant | `tenant_id` **별도 필드**(id에 인코딩 금지) |
| Display 분리 | `name` ≠ `segment_id` |
| 재사용 금지 | 삭제/아카이브 후 id 재사용 금지 |
| 복제 | 복제 시 **새 segment_id**(definition만 복사) |
| Version 유지 | Version 변경 시 segment_id 불변, `segment_version_id` 만 신규 |
| Cross-workspace 복사 | Scope 정책 명시(Template↔Instance 구분) |

**식별자 계층**: `segment_id`(불변) · `definition_id`(정의 컨테이너) · `segment_version_id`(리비전) · `rule_id`/`group_id`(DSL 노드) · `dependency_id`. 외부 채널 audience id(Meta CA 등)는 **별도**(Destination 영역, Part 3) — segment_id 를 외부 PK로 사용 금지(EPIC01 식별자 정책).

---

## 3. `SEGMENT_DEFINITION` 필수 필드 (§6)

```
segment_id, definition_id, tenant_id, workspace_id, brand_id,
owner_type, owner_id, name, description,
segment_type, evaluation_mode, purpose,
canonical_definition(=DSL JSON), schema_version, definition_version,
status, approval_status, sharing_scope, data_classification,
created_by, updated_by, created_at, updated_at,
effective_from, effective_to, archived_at, deleted_at
```

**현행 매핑**: crm_segments 는 tenant_id·name·description·rules·created/updated 만 보유 → workspace_id/brand_id/owner/segment_type/evaluation_mode/purpose/schema_version/status/approval/sharing/data_classification/effective_* **신규 컬럼 추가**(비파괴). 기존 행은 `schema_version='legacy-v0'`, `evaluation_mode='batch'`, `status='active'`, `purpose='crm'`, `sharing_scope='tenant'` 로 백필.

- `segment_type`(§SEGMENT_TYPE_REGISTRY): STATIC/DYNAMIC/RULE_BASED/QUERY_BASED/EVENT_BASED/METRIC_BASED/MODEL_BASED/MANUAL_UPLOAD/IMPORTED/COMPOSITE/NESTED. **현행=RULE_BASED**(JSON 술어→SQL).
- `evaluation_mode`: REAL_TIME/NEAR_REAL_TIME/BATCH/SCHEDULED/ON_DEMAND/MATERIALIZED/VIRTUAL. **현행=BATCH(materialized)**.
- `purpose`: ANALYTICS/CRM/EMAIL/SMS/PUSH/RETARGETING/ADVERTISING/PERSONALIZATION/RECOMMENDATION/AUTOMATION/SUPPRESSION/EXPERIMENT/HOLDOUT/COMPLIANCE.
- `data_classification`: EPIC Data Classification Registry 참조(멤버는 PII 포함 → RESTRICTED).

---

## 4. `SEGMENT_VERSION` Schema (§7)

```
segment_version_id, segment_id, version_number, previous_version_id,
definition_hash, canonical_definition, dependency_snapshot,
schema_version, operator_registry_version,
customer_schema_version, event_registry_version, metric_registry_version,
model_registry_version, consent_policy_version, suppression_policy_version,
change_type, change_reason, created_by, created_at,
validated_at, approved_at, published_at, effective_from, effective_to,
status, rollback_target_version
```

- **불변성(§3.5)**: PUBLISHED/ACTIVE 버전은 직접 수정 금지 → 새 version 생성 후 Draft→Validate→Review→Publish.
- **definition_hash**: canonical_definition 정규화 해시(중복정의·무변경 재발행 탐지).
- **registry_version 고정**: 평가 시 사용한 Operator/Customer-schema/Event/Metric/Model/Consent/Suppression 레지스트리 버전을 버전에 **핀 고정** → 과거 캠페인 재현성(SEG-H4 해소).
- **현행 매핑**: 기존 crm_segments 는 버전 개념 없음 → 최초 도입 시 각 세그먼트를 `version_number=1, status=ACTIVE, schema_version='legacy-v0'` 로 승격, 이후 편집은 신규 버전.

---

## 5. Segment Version 상태 레지스트리 (§8)

`DRAFT → VALIDATING → {INVALID | VALID} → REVIEW_REQUIRED → APPROVED → PUBLISHED → ACTIVE → SUPERSEDED`; 분기 `ROLLED_BACK`/`DEPRECATED`/`ARCHIVED`/`BLOCKED`/`DELETED`.

| 상태 | 의미 | 발송/자동화 사용 |
|---|---|---|
| DRAFT/VALIDATING/INVALID | 편집중·검증중·검증실패 | 불가 |
| VALID/REVIEW_REQUIRED/APPROVED | 검증됨·검토대기·승인됨 | 불가(미발행) |
| **PUBLISHED/ACTIVE** | 발행·현행 | **가능**(자동화는 추가 게이트) |
| SUPERSEDED | 후속버전에 대체 | 재현용 참조만 |
| ROLLED_BACK/DEPRECATED/ARCHIVED/BLOCKED/DELETED | 롤백·폐기·보관·차단·삭제 | 불가 |

---

## 6. Audience 상태 레지스트리 (Part 1 §7, Part 3 상세)

Audience/Destination 는 본 스키마와 **분리**(§3.2). 상태: `DRAFT/PREVIEW/READY/APPROVAL_REQUIRED/APPROVED/BUILDING/BUILT/SYNC_PENDING/SYNCING/SYNCED/PARTIAL_SYNC/FAILED/REMOVAL_PENDING/REMOVING/REMOVED/EXPIRED/BLOCKED/ARCHIVED`. **현행=Audience Snapshot 엔티티 부재**(AdAdapters 즉석 업로드) → Part 3(Audience Builder & Snapshot Governance) 대상. 본 문서는 Segment↔Audience 경계만 정의.

---

## 7. Scope Contract (§10)

평가/실행 Context는 **서버 Actor Context**로 강제(Client 지정 무시):
`tenant_id`(필수) · `workspace_id` · `brand_id` · `environment`(prod/demo) · optional `store_id`/`region_id`/`source_account_id` · `customer_profile_scope` · `allowed_sharing_scope`.

- **현행 실측**: crm_segments/members 는 `tenant_id` 강제(✔), workspace/brand 없음 → 신규 컬럼(단일 workspace 테넌트는 `default` 백필).
- **격리 규칙**: 모든 평가 쿼리에 tenant predicate 강제(현행 refreshSegmentMembers 준수). Cross-tenant/cross-workspace 참조는 Runtime Guard 차단(→[`CANONICAL_SEGMENT_GOVERNANCE.md`](CANONICAL_SEGMENT_GOVERNANCE.md) §Runtime Guard). 286차 platform_growth act-as 하이재킹 클래스 회귀 방지.

---

## 8. Segment Schema Matrix (§87)

| Entity | Canonical ID | Scope | Versioned | Status set | Owner | Store | Consumer | Risk |
|---|---|---|---|---|---|---|---|---|
| SEGMENT | segment_id(ULID) | tenant/ws/brand | via VERSION | §5 | crm_segments(확장) | 발송/자동화 | — |
| SEGMENT_VERSION | segment_version_id | 상속 | 불변 | §5 | 신규 | 재현/감사 | 스냅샷 미도입 시 재현불가 |
| SEGMENT_MEMBERSHIP | (segment_version_id,customer_profile_id) | tenant | effective_from/to | Part1 §5 | crm_segment_members(확장) | 발송루프 | PII(RESTRICTED) |
| SEGMENT_SNAPSHOT | audience_snapshot_id | tenant | 불변 | §6 | 신규 | 재현/Reconcile | 부재→Part3 |
| COHORT_DEFINITION | cohort_id | tenant | version | §COHORT | 형식화 | 리텐션리포트 | TZ/환불 미보정 |

---

## 9. 완료 조건 대응 (본 문서 담당)
§93의 1(Entity Model)·2(Definition/Version Schema)·부분 10(Nested/Composite는 DSL 문서). 나머지는 형제 문서. **코드변경 0** — 스키마는 목표계약이며 실 컬럼 추가·마이그레이션은 후속 승인 세션(Shadow Compare + verify + 배포승인, §Governance Migration).
