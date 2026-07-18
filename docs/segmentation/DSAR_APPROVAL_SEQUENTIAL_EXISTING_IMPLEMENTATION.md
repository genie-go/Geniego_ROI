# DSAR — Sequential Approval State Machine: 기존 구현 전수조사 (ⓑ)

> EPIC 06-A-03-01 Sequential Approval State Machine Foundation · 289차 13회차 · **능력 기반 재실증**(이름·주석 아닌 코드 정독) · 읽기 전용 · 코드 변경 0.
> 방식: grep 전수 + 지목 파일 직접 정독(2 에이전트 병렬). 규율: "status 컬럼 존재 ≠ State Machine".

## 0. 결론 (Verdict up front)

**명시적 State Machine · Transition Definition · 다단 순차 승인(Stage/Level/Step) · Sequence Number ordering · Fencing Token · Deadlock Detection · Simulation · Replay 는 전부 ABSENT.**

현존하는 것은 (1) `SET status='next' WHERE status='current'` 형태의 **하드코딩 상태 전이**(전이 정의 테이블·엔진 없음), (2) 큐 소비자용 **CAS/SKIP LOCKED 동시성 primitive**, (3) **단발/정족수 승인 3종**(순차 아님), (4) **JourneyBuilder = 마케팅 그래프 순회 상태머신**(승인 무관·단 가장 성숙한 패턴 참조원).

## 1. 선행 5군 재검증 (§3)

| 군 | 판정 | 근거 |
|---|---|---|
| §3.1 Approval Chain/Workflow | **ABSENT** | `approval_chain/chain_level/chain_stage/chain_resolution/approval_workflow` 라이브 0. 실존=도메인 특화 승인값(`Catalog.php:2300` approvalCreate·`:395` requiresHighValueApproval) |
| §3.2 Authority Matrix | **ABSENT** | `authority_matrix/approval_authority` 0. `TeamPermissions.php:120,136` roleOf/isManagerAdmin=정적 role 서열(매트릭스 아님) |
| §3.3 Delegation | **ABSENT** | `approval_delegation/delegation_resolution` 0 |
| §3.4 **Assignment** | **ABSENT** | `approval_work_item/assignment/queue/assignment_claim/lease` 0. substrate=catalog_writeback_job 승인큐·omni_outbox claim/lease(둘 다 KEEP_SEPARATE·상이 도메인). ★**Step Activation의 assignee 연결이 해석될 실체 없음** |
| §3.5 Identity/Org/Security | **PARTIAL** | Tenant Isolation Guard(`UserAuth.php:403-406`)·`SecurityAudit::verify():56-68` PRESENT · Canonical Identity/Employment/Position/Org Hierarchy/Reporting Line/Legal Entity/SoD/Actor Snapshot ABSENT(`parent_user_id`=owner 계정트리 `UserAuth.php:156-157,296,1225-1227`·`EnterpriseAuth.php:307-310`=SAML XML 오탐) |

★트랩: `legacy_v338_pkg/archives/**` 하위 Go gateway 아카이브는 **죽은 코드**(.clineignore·라이브 아님) — approval_chain 등 유일 이름 매치이나 실 구현 아님.

## 2. 상태 전이 3종 — State Machine인가 하드코딩인가?

### `catalog_writeback_job` — 하드코딩 전이 (State Machine ABSENT)
- 스키마 `status VARCHAR(30) DEFAULT 'queued'`(자유문자열·허용상태/전이제약 없음·`Catalog.php:80`). 전이 전부 인라인 조건부 UPDATE:
  - 승인 `SET status='queued' WHERE status='pending_approval'`(`Catalog.php:2397`) · 선점 `SET status='processing' WHERE id=? AND status IN('queued','awaiting_credentials')`(`:1726`) · 복구 `SET status='queued' WHERE status='processing' AND updated_at<now-600s`(`:1700`) · 재부활(`:1710`).
- **전이 정의 테이블·전이 함수·guard 레지스트리 없음**(WHERE 절=암묵 precondition·산재). §66=**VALIDATED_LEGACY**(정형화 시 CONSOLIDATION_REQUIRED).

### `admin_growth_approval` — 하드코딩 단발 전이
- `status VARCHAR(20) DEFAULT 'pending'`(`AdminGrowth.php:146`). `pending→approved|rejected` 단일결정 인라인 UPDATE(`:1330`)·이미처리 409 가드(`:1327`)·후속 ref_type별 if/elseif 분기(`:1334-1341`·집행엔진 아님). §66=**CONSOLIDATION_REQUIRED**.

### `mapping_change_request` — Maker-Checker M-of-N 정족수 (★순차 아님)
- `status = count(approvals) >= required_approvals ? approved : pending`(`Mapping.php:287`)·approvals_json push(`:285`)·재승인409(`:262`)·자기승인차단(`:268`)·동일승인자dedup(`:279`). **동일 레벨 N명 병렬 정족수**(승인자 간 순서·단계·의존성 없음) → 다단 순차의 반례 아님. §66=**VALIDATED_LEGACY**(별 개념).

**판정**: 3종 모두 `status=next` 임의변경(하드코딩). 명시적 State Machine + Transition Definition **ABSENT**.

## 3. 다단 순차 승인 (Stage/Level/Step) — ABSENT
`current_step/current_stage/current_level/step_order/stage_order/sequence_no/approval_stage/approval_level/approval_step` backend 전체 **no matches**. 존재 승인=단발 또는 단일레벨 정족수. Stage/Level/Step 인스턴스·단계전이·단계완료→다음활성화 **없음**.

## 4. 동시성 primitive

| Primitive | 판정 | 증거 |
|---|---|---|
| CAS 조건부 UPDATE(affected rows 소유) | **PRESENT** | `Catalog.php:1726-1730`·`JourneyBuilder.php:415-425`·`ChannelSync.php:6148` |
| `FOR UPDATE SKIP LOCKED` | **PRESENT** | `Omnichannel.php:405`(MySQL8)·폴백 조건부UPDATE `:429-441` |
| claim_id/claimed_at | **PRESENT** | omni_outbox `Omnichannel.php:97,410,418`·해제 `:560` |
| Idempotency Key | **PARTIAL** | Paddle UNIQUE(notification_id) `Paddle.php:343-348`·journey_node_sent UNIQUE(tenant,enrollment,node) `JourneyBuilder.php:454,482,490`. **범용 idempotency-key 미들웨어/헤더 없음** |
| Fencing Token(단조증가) | **ABSENT** | `fencing` no hits — ★실위험 |
| 낙관적 락(version CAS) | **ABSENT**(워크플로) | `menu_defaults.version`=스냅샷 라벨·`ModelMonitor.version`=모델버전(CAS-on-version 없음) |
| Transition Lease | **PARTIAL** | claimed_at+stale TTL 회수(시간기반)=`Omnichannel.php:395-399`(900s)·`Catalog.php:1700`(600s)·`JourneyBuilder.php:396`(1800s). **리스토큰/펜싱 없음·시간만료 회수만** |

## 5. 워크플로 엔진 — ABSENT (전무)
`camunda/temporal/bpmn/saga/state_machine/CREATE TRIGGER` **0건**. 진행=PHP 핸들러 인라인 SQL UPDATE + cron 폴링. 선언적 워크플로 정의 없음. 전용 핸들러 클래스(`*{Workflow,Approval,StateMachine,Sequence,Orchestrat}*.php`) **No files**.

## 6. JourneyBuilder — 상태머신 유사(그래프 순회)·승인 무관 → KEEP_SEPARATE
- cursor=`journey_enrollments.current_node`(`JourneyBuilder.php:44,68,504`) · 상태 active/waiting/processing/completed+resume_at/wait_until(`:82`) · pause/resume=delay노드 resume_at→cron 픽업(`:403`) · 원자적 선점 CAS(`:415-425`)·stale(30분) 회수(`:396`) · 멱등발송 journey_node_sent UNIQUE(`:446-490`)·미발송 시 releaseSendOnce(`:463`).
- **성격**: 노드/엣지 그래프 순회(edges 기반 다음노드)이지 승인 단계전이 아님·마케팅 전용. §66=**KEEP_SEPARATE**(단 상태머신/멱등/리스 패턴의 **가장 성숙한 참조 구현** — 설계 시 인용가치 높음).
- 승인/잡 도메인의 current_step/stage/sequence/step_order = ABSENT. 큐 순서=`ORDER BY id ASC`(FIFO 처리순·`Catalog.php:1716`·`Omnichannel.php:405`)·승인 시퀀싱 아님.

## 7. §66 잠정 태그 요약

| 자산 | §66 태그 | 근거 |
|---|---|---|
| catalog_writeback_job 상태전이 | **VALIDATED_LEGACY**(+CONSOLIDATION) | 하드코딩 전이+CAS·상태머신이 정형화할 후보 |
| admin_growth_approval 단발승인 | **CONSOLIDATION_REQUIRED** | pending→approved·승인 SoT로 흡수 |
| mapping_change_request M-of-N | **VALIDATED_LEGACY** | 정족수+maker-checker·순차 아님(별 개념) |
| CAS/SKIP LOCKED/claim | **CANONICAL** | Transition Lock/Lease 구현의 검증된 기반 |
| journey_enrollments 상태머신 | **KEEP_SEPARATE** | 마케팅 그래프순회·승인무관·패턴 참조정본 |
| Paddle/journey_node_sent 멱등 | **VALIDATED_LEGACY** | UNIQUE-constraint 멱등·범용 idempotency-key 확장후보 |
| DLQ replay(`routes.php:1927-1932`) | **KEEP_SEPARATE** | 데드레터 재처리·상태머신 리플레이 아님 |

## 8. 06-A-03-01 착수 판정

- **실·재사용(확장·재생성 금지)**: CAS/SKIP LOCKED 동시성(CANONICAL)·하드코딩 전이 3종의 정형화 대상(catalog/admin_growth/mapping)·JourneyBuilder 상태머신/멱등/리스 패턴(참조정본·KEEP_SEPARATE)·SecurityAudit::verify(감사무결)·Tenant Guard.
- **진짜 부재(순신규)**: State Machine·Transition Def/Instance·Stage/Level/Step Instance·Sequence ordering·Guard/Precondition/Dependency 레지스트리·Current Resolution·Fencing Token·Deadlock Detection·Simulation·Replay·범용 Idempotency·Cursor(승인).
- **★실 위험**: ①Fencing Token 부재(stale worker overwrite 이론창) ②범용 Idempotency Key 부재(도메인별 UNIQUE만) ③낙관적 version CAS 부재.
- **선행 5군 중 4군(Approval/Authority/Delegation/Assignment) ABSENT** → 다단 Stage/Level/Step이 참조할 Chain·Assignment SoT 없음·Step→assignee 링크 공회전 → **구현 BLOCKED_PREREQUISITE**. 실 엔진=선행 신설 후 별도 승인세션(RP-002).

정본 결정=[[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]]. per-entity 판정=§73 DSAR 세트(ⓒ).
