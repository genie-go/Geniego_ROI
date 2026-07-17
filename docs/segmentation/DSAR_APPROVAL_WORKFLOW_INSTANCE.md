# DSAR — Workflow Instance (§31)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §31 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 승인 워크플로 인스턴스 테이블 | `TABLE IF NOT EXISTS (workflow_\|flow_\|wf_)` **backend/src grep 0** | `NOT_APPLICABLE`(부재 → 신설) |
| **최근접 실 인스턴스 = `journey_enrollments`** | `JourneyBuilder.php:42-47`(MySQL DDL) / `:68`(SQLite DDL) — 레포 유일 실 Flow **실행 컨텍스트** | `LEGACY_ADAPTER`(실행 프리미티브 재사용) |
| 현재 노드 커서 | `journey_enrollments.current_node VARCHAR(80)` :44 — **단일 컬럼 커서** | 부분 충족(§31 `current node references` **복수** 요구 미달) |
| 인스턴스 상태 | `status VARCHAR(20) DEFAULT 'active'` :45 — 실사용 어휘 = `active`/`waiting`/`processing`/`completed`/`exited` | 부분 충족(25종 대비 5종) |
| 원자적 선점(claim) | `JourneyBuilder.php:415-418` 조건부 UPDATE + `rowCount()!==1 → skip`(:425) | `VALIDATED_LEGACY`(확장) |
| 타이머/대기 컬럼 | `resume_at`/`wait_until`/`last_run_at` ALTER :80-83 (206차 delay + 255차 이벤트 절대기한 **분리 설계**) | `VALIDATED_LEGACY` |
| lock version(낙관적 잠금) | `lock_version`·`optimistic` **backend/src grep 0** — SQLite 폴백 호환이 **명시적 설계 제약** | `NOT_APPLICABLE` |
| 부모/루트 인스턴스 | `parent_*`/`root_*`·Sub-workflow(`sub_journey`/`call_activity`) **grep 0** | `NOT_APPLICABLE` |
| 테넌트 격리 | `journey_enrollments.tenant_id NOT NULL DEFAULT 'demo'` :43 · 전 쿼리 `AND tenant_id=:t` | `VALIDATED_LEGACY` |
| workspace/organization/legal_entity | **grep 0**(테넌트 단일 축만 존재) | `NOT_APPLICABLE` |
| environment | `Db::envLabel()`(278차) 존재하나 **인스턴스 행에 미기록** | `NOT_APPLICABLE` |
| 완료/시작 시각 | `entered_at`·`completed_at` :45 | `VALIDATED_LEGACY` |
| `expires_at` | **부재** — `wait_until`(:83)은 **노드 단위 이벤트 기한**이지 인스턴스 수명 아님 | `NOT_APPLICABLE` |

**★축 주의 — 형태 유사 ≠ 의미 동일.** `journey_enrollments` 는 **마케팅 여정 등록**이다. "실행 컨텍스트"라는 **능력**이 §31 Instance 와 겹치므로 실행 프리미티브(claim·resume_at·순환감지) 재사용 근거로는 인용 가능하나, **행 자체를 승인 인스턴스로 계산하면 역산**이다.

### 🔴 최대 설계 리스크 — enrollment 컨텍스트 일반화 (실측으로 정정된 형태)

ⓑ 요약은 "`customer_id` 필수 :554"로 기록돼 있으나, **실측 결과 제약의 형태가 다르다. 정직하게 정정한다**:

| 층 | 실측 | 결론 |
|---|---|---|
| DDL | `customer_id INT`(:44) / `customer_id INTEGER`(:68) — **NOT NULL 아님. nullable** | 스키마는 이미 비-고객 허용 |
| 수동 등록 | `:204` `':cid'=>(int)($b['customer_id'] ?? 0) ?: null` + `session_id` 컬럼(:44) | **null 등록 실제로 가능** |
| 자동 등록 생산자 | `:287`·`:294`·`:336`·`:358`·`:375` — **전부 `crm_customers`/`segment_members` 키** | 실 진입 경로는 100% 고객 |
| 런타임 | `:554` `$cid=(int)($enr['customer_id'] ?? 0)` → `:557` `if ($cid > 0 && self::eventOccurred(...))` | **`customer_id=0`이면 event-mode wait 가 영구 미발생** — 타임아웃 분기로만 탈출 |

→ **선결 과제는 스키마 마이그레이션(NOT NULL 제거)이 아니라 ① 진입 생산자의 비-고객 주체(승인요청/케이스) 수용 ② `eventOccurred` 의 고객 전제 일반화** 다. 이 정정은 리스크를 **낮추지 않는다** — DDL 한 줄이 아니라 **생산자 5개소 + 이벤트 조회 축**이 대상이므로 오히려 범위가 넓다.

## 1. 원문 전사 + 판정 — **원문 25종**(필수 필드)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | workflow_instance_id | 부재 · 인접 = `journey_enrollments.id`(:43) | `NOT_APPLICABLE` |
| 2 | workflow_definition_id | 부재 — **정의 테이블 자체 grep 0** · 인접 = `journey_id`(:44) | `NOT_APPLICABLE` |
| 3 | workflow_version_id | 부재 — 버전 개념 grep 0(`journeys` 는 **in-place 수정**) | `NOT_APPLICABLE` |
| 4 | approval_request_id | 부재 · 인접 = `mapping_change_request`(Mapping.php:238-294) | `LEGACY_ADAPTER` |
| 5 | approval_case_id | 부재 — Case 개념 전무 | `NOT_APPLICABLE` |
| 6 | parent_workflow_instance_id | 부재(Sub-workflow grep 0) | `NOT_APPLICABLE` |
| 7 | root_workflow_instance_id | 부재 | `NOT_APPLICABLE` |
| 8 | tenant_id | `journey_enrollments.tenant_id`(:43) **실재·전 쿼리 격리** | `VALIDATED_LEGACY` |
| 9 | workspace_id | **grep 0** | `NOT_APPLICABLE` |
| 10 | organization_id | **grep 0**(TeamPermissions 조직팀은 별 축) | `NOT_APPLICABLE` |
| 11 | legal_entity_id | **grep 0** | `NOT_APPLICABLE` |
| 12 | environment | `Db::envLabel()` 존재 · **행 미기록** | `NOT_APPLICABLE` |
| 13 | current state | `status`(:45) — 어휘 5종 | 부분 → `NOT_APPLICABLE`(25종 축 부재) |
| 14 | current node references | `current_node`(:44) — **단수 스칼라. 복수 references 불가** | `NOT_APPLICABLE` |
| 15 | active token count | **Token 개념 grep 0**(§33) | `NOT_APPLICABLE` |
| 16 | active task count | Task 개념 grep 0(§36) | `NOT_APPLICABLE` |
| 17 | suspended 여부 | 부재 — `status='waiting'` 은 타이머 대기이지 **중단 아님** | `NOT_APPLICABLE` |
| 18 | cancellation requested 여부 | 부재 — `exit` 노드(:623)는 **즉시 종료**(요청/수락 2단 아님) | `NOT_APPLICABLE` |
| 19 | started_at | `entered_at`(:45) | `VALIDATED_LEGACY` |
| 20 | last_transition_at | `last_run_at`(:82) — **패스 실행 시각**이지 전이 시각 아님(전이 기록 자체가 §34 결번) | `KEEP_SEPARATE_WITH_REASON` |
| 21 | completed_at | `completed_at`(:45) | `VALIDATED_LEGACY` |
| 22 | expires_at | 부재 · `wait_until`(:83)은 **노드 단위** 기한 | `NOT_APPLICABLE` |
| 23 | lock version | **grep 0** · 현행 동시성 = **조건부 UPDATE + rowCount CAS**(:415-425) | `NOT_APPLICABLE`(★아래 규칙 참조) |
| 24 | status | `status`(:45) — #13 `current state` 와 **원문상 별 항목**. 현행은 **한 컬럼이 둘을 겸함** | 부분 → `NOT_APPLICABLE` |
| 25 | evidence | 부재 · 인접 = `journey_node_logs`(:48-52) **노드 단위 로그** | `LEGACY_ADAPTER` |

**실측 개수: 25 / 25 전사.** 커버리지 = 부재 20 · `VALIDATED_LEGACY` 3(tenant_id·started_at·completed_at) · `LEGACY_ADAPTER` 2 · 별도 1(`last_transition_at`).

★ **원문 #13 `current state` 와 #24 `status` 는 별 항목이다.** 개수 맞추기를 위해 병합하지 않았다. 현행 `journey_enrollments.status` 단일 컬럼이 둘을 겸하는 것은 **현행의 미분화**이지 원문 축의 중복이 아니다. 신설 시 두 축을 분리할지는 §31 원문이 판단 근거를 주지 않으므로 **미확정으로 남긴다**(지어내지 않음).

## 2. 규칙

- 🔴 **Flow 실행 엔진 신설 금지** — `JourneyBuilder` 의 실행 프리미티브(원자적 claim :415-418 · 순환 감지 :512 · `wait` event-mode 재폴링 :565-570)를 재사용한다. **단 enrollment 컨텍스트 일반화가 선결**(위 실측 표의 4층 전부).
- 🔴 **`lock version` 을 낙관적 잠금 컬럼으로 신설하지 마라.** `lock_version`/`optimistic`/분산락/`GET_LOCK` 전부 grep 0 이고, 이는 누락이 아니라 **SQLite 폴백 호환이라는 명시적 설계 제약**의 결과다. §31 이 `lock version` 을 요구하나 **현행 동시성 모델(조건부 UPDATE + rowCount CAS)과 충돌**한다 → **컬럼은 두되 CAS 술어(`WHERE ... AND lock_version=:v`)로 구현**해야 제약을 위반하지 않는다. 다른 동시성 모델 도입 = 제약 위반.
- 🔴 **`current node references`(복수)를 `current_node`(단수) 위에 얹지 마라.** 단일 커서 → 다중 토큰은 §33 Token 신설 없이 불가능하다. 복수 커서를 콤마 문자열로 우겨넣는 것은 스키마 위장이다.
- 🔴 **25종 상태를 "있다고 가정"하고 배선 금지** — 현행 실사용 어휘는 5종(`active`/`waiting`/`processing`/`completed`/`exited`)뿐이다. 상세는 [DSAR_APPROVAL_WORKFLOW_INSTANCE_STATUS.md](DSAR_APPROVAL_WORKFLOW_INSTANCE_STATUS.md).
- `tenant_id` 는 `VALIDATED_LEGACY` — **단, 승인 도메인의 현행 격리는 깨져 있다**: `admin_growth_approval` = **tenant_id 없음 · 전역 조회 · 결정 경로도 격리 없음**(`AdminGrowth.php:1324` `WHERE id=?`). Instance 신설 시 `tenant_id NOT NULL` + 전 조회 술어 강제로 **이 결함을 승계하지 마라**.
- `evidence` 는 `journey_node_logs`(:48-52)에 위임하되, 그 테이블은 **노드 단위**이고 `source_node_id`/`target_node_id`/`edge_id` 가 **없다** → 인스턴스 수명 증적으로는 불충분(§34 참조).
