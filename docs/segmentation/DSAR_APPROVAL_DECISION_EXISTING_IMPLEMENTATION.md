# DSAR — Decision Processing Core: 기존 구현 전수조사 (ⓑ)

> EPIC 06-A-03-02-01 Decision Processing Core Governance · 289차 13회차 · **능력 기반 재실증**(이름·주석 아닌 코드 정독) · 읽기 전용 · 코드 변경 0.
> 방식: grep 전수 + 지목 파일 직접 정독(2 에이전트 병렬). 규율: "`status=approved` UPDATE ≠ Decision Record".

## 0. 결론 (Verdict up front)

**승인 결정 처리 = 4개 핸들러에 산재한 in-place `status` 컬럼 단일 UPDATE.** Decision Processing Core가 요구하는 **불변 Decision Record · Command→Validation→Commit 분리 · 원자적 Commit · Decision Outbox · Idempotency/Replay/Fencing 방어**는 **거의 전부 ABSENT**. 별도 Decision Record 테이블·상태기계·트랜잭셔널 Commit 없음.

## 1. 선행 6군 재검증 (§3)

| 군 | 판정 | 근거 |
|---|---|---|
| §3.1 Approval | **ABSENT** | chain/stage/level/resolution/workflow 0. 근접=`agency_client_link` 이진상태(`AgencyPortal.php:20,80,381`) |
| §3.2 Authority | **ABSENT** | `authority` backend/src 0파일. `TeamPermissions.assignableMap`(:604,628)=메뉴 RBAC 상한(≠승인 authority) |
| §3.3 Delegation | **ABSENT** | `DELEGATION_EXCEEDED`(`TeamPermissions.php:614-647`)=RBAC 부여상한 오탐(위임정의/기간/재귀/스냅샷 0) |
| §3.4 Assignment | **ABSENT** | work_item/assignment/claim/lease 0. omni_outbox claim/lease/lock 패턴은 comms 전용(설계 원형 참조만) |
| §3.5 Sequential | **ABSENT** | `sequential` 0파일. 전이=하드코딩 직접 UPDATE(`AgencyPortal.php:381,400`). ★6군 중 가장 치명적 부재 |
| §3.6 Identity/Security | **PARTIAL** | Tenant Guard(`index.php` auth_tenant·49핸들러 WHERE tenant_id)·`SecurityAudit::verify():56-68`(실동작 해시체인·created_at preimage 보존·검증가능) PRESENT · Position/Org Hierarchy/Legal Entity/Actor Snapshot/SoD ABSENT |

★정정: 과거 "parent_user_id=owner 붕괴"는 **286차에 치유**(`UserAuth.php:403-406`·하위계정 owner tenant 정상상속·교차테넌트 불가). 결함 아님·다층 조직계층이 애초 부재일 뿐. **재플래그 금지.** `app_user`(tenant/parent/team_role owner|manager|member `UserAuth.php:155-157,296`)=Canonical Identity 정본(직위·발령·SoD는 별도 신설).

## 2. 개념별 판정 (§1 구현범위)

| 개념 | 판정 | 증거 |
|---|---|---|
| Decision Record(불변) | **ABSENT** | 결정=요청행 가변컬럼 덮어씀: `Mapping.php:288` UPDATE approvals_json/status · `AdminGrowth.php:1330` UPDATE status/decided_by · `Alerting.php:594` UPDATE action_request. append-only 결정원장 0 |
| Decision Command | **PARTIAL** | body `{decision}`만(`Alerting.php:578`·`AdminGrowth.php:1320`)·명령 레코드 영속화 없이 즉시 적용 |
| Command Envelope | **ABSENT** | 서명/봉투 없음·Bearer 미들웨어 한겹 |
| Decision Instance | **ABSENT** | "인스턴스"=요청행 |
| Decision Slot(단일 유효결정) | **PARTIAL** | 상태가드 409(`Mapping.php:262`·`AdminGrowth.php:1327`·pending 중복방지 `:1292`)·**DB UNIQUE 없음**·앱레벨 의존 |
| Decision State Machine | **PARTIAL** | 암묵 pending→approved/rejected만·형식 상태기계/전이표 0 |
| Decision Transition | **PARTIAL** | 상태컬럼 단일 UPDATE+사전가드·전이로그/엔티티 0 |
| Validation Pipeline | **PARTIAL** | 인라인만(enum `AdminGrowth.php:1321`·자기승인차단 `Mapping.php:268`·dedup `:278`·정족수 `:287`)·분리 파이프라인 아님 |
| Decision Commit(원자적) | **ABSENT** | 트랜잭션 0(`beginTransaction` no match). `Mapping.php` read(:273)-modify-write(:288) 비원자·FOR UPDATE 없음 → **TOCTOU** |
| Idempotency | **ABSENT**(결정)/PRESENT(웹훅) | 결정 멱등키 0. `Paddle.php:343-368` UNIQUE(notification_id)만(웹훅) |
| Replay Protection | **ABSENT** | nonce/one-time/expiry 0(결정). `oauth_nonce`(`Connectors.php:3642`)=OAuth용 |
| Lock/Lease | **ABSENT**(결정)/PRESENT(아웃박스) | omni_outbox claim_id+15분 리스+SKIP LOCKED(`Omnichannel.php:390-448`)=메시지 발송 |
| Fencing Token | **ABSENT** | claim_id(`Omnichannel.php:392` random_bytes)=마커·단조 fencing 아님. 결정 도메인 0 |
| Optimistic Version | **ABSENT** | version 컬럼 0. `WHERE status='pending'`(`Catalog.php:2397`)=CAS-lite·버전기반 아님 |
| Duplicate Prevention | **PARTIAL** | 상태가드+dedup(`Mapping.php:278-283`)+pending중복방지·비원자라 경합 시 이중통과 가능 |
| Decision Outbox(트랜잭셔널) | **ABSENT** | 결정 커밋과 동일 txn 아웃박스 0. omni_outbox=메시지·`Alerting::executeAction` 아웃박스 없이 직접 `AdAdapters::pause`(:631) |
| Inbox Dedup | **PARTIAL** | `paddle_events` UNIQUE(웹훅)·결정 인바운드 0 |
| Snapshot | **ABSENT** | `payload_json`(`AdminGrowth.php:1294`)·`action_json`(`Alerting.php:612`)=요청 스냅샷·결정시점 불변 아님 |
| Evidence | **PARTIAL** | approvals_json 승인자+ts 누적(`Mapping.php:285`·`Alerting.php:591`) |
| Audit | **PRESENT** | `self::audit→audit_log`(`Mapping.php:291`·`AdminGrowth.php:1342`·`Alerting.php:597,655`). ⚠audit_log는 tamper-evident 아님·정본=`SecurityAudit::verify` |
| Conflict | **PARTIAL** | 종결후 재결정 409·동시쓰기 충돌(버전/락) 없음 |
| Drift/Reconciliation/Simulation | **ABSENT** | 결정 드리프트/정합/시뮬 0(`Alerting.php:564` dry_run_diff=저장 프리뷰) |
| Actor Resolution(Canonical) | **PARTIAL·불균일** | CANONICAL: `Mapping.php:36-53` actorId(api_key/session email·미확인 fail-closed null·`:247` 403) · 세션: `AdminGrowth.php:197` · ★**위조가능**: `Alerting.php:33-35` actor()=`X-User-Email` 헤더/`?actor=` 쿼리 → **클라이언트 승인자 위조** |

## 3. 승인 결정 4핸들러 = in-place UPDATE (불변 Record/원자 Commit/Outbox 아님)
- `Mapping::approve`(:238-293): read approvals_json(:273)→append→단일 UPDATE(:288)·트랜잭션 없음(비원자 R-M-W)·정족수 maker-checker(:287)는 실재.
- `AdminGrowth::approvalDecide`(:1313-1344): 단일 UPDATE status(:1330)+ref_type별 후속 UPDATE(:1336).
- `Alerting::decideAction`(:572-599)/`executeAction`(:601-665): 단일 UPDATE(:594)·집행은 별도호출 `AdAdapters::pause`(:631) 후 UPDATE status(:653)·**결정↔집행 비원자·무아웃박스**.
- `Catalog::approveQueue`(:2383-2407): bulk UPDATE status='queued'(:2397)+즉시 processWritebackQueue(:2404)·**승인자 미기록**.

## 4. §65 잠정 태그

| 부품 | §65 태그 | 근거 |
|---|---|---|
| `Mapping::actorId`+maker-checker | **CANONICAL** | 위조불가 신원·fail-closed·정족수·Actor Resolution/Validation 정본 후보 |
| Paddle 웹훅 UNIQUE 멱등 | **VALIDATED_LEGACY** | 견고하나 웹훅 국한·Decision Idempotency로 일반화(별도 세션) |
| omni_outbox claim/lease/SKIP LOCKED | **KEEP_SEPARATE** | 메시지 발송 전용·Decision Outbox와 혼동 금지·설계 원형만 참조 |
| AdminGrowth::approvalDecide | **CONSOLIDATION_REQUIRED** | Mapping 패턴 통합(actor/원자성/불변 record 결여) |
| **Alerting::decideAction/executeAction** | **BLOCKED_SECURITY** | `actor()` 헤더 위조(:33-35)→canonical actor 전 신뢰 불가·비원자·무아웃박스 |
| Catalog::approveQueue | **CONSOLIDATION_REQUIRED** | 승인자 감사 부재·상태가드만 bulk UPDATE |
| SecurityAudit::verify·Tenant Guard·app_user | **재사용 substrate** | 감사무결·격리·신원 정본 |
| `Decisioning.php`(:36,235,432) | **KEEP_SEPARATE** | 마케팅 집계 결정엔진(광고/세그/추천)·승인 무관·이름충돌 |

## 5. ★실 위험 (별도 수정세션 후보 — 이번엔 설계만)
1. **`Alerting::actor` X-User-Email/쿼리 위조**(`:33-35`) → action_request 승인/집행 감사 스푸핑(BLOCKED_SECURITY·라이브 재증명 권장).
2. **Decision Record 불변성 부재** — in-place UPDATE로 과거 결정 소실·Correction/Reversal 불가.
3. **`Mapping::approve` TOCTOU** — 트랜잭션/FOR UPDATE 없는 approvals_json read-modify-write → 동시 승인 경합.
4. **Decision 도메인 Outbox/Idempotency/Replay/Fencing 전무** → 재전달/재시도/double-click 중복 결정 방어 산발.
5. **Commit 직전 재검증 부재**(Actor/Authority/Assignment).

## 6. 06-A-03-02-01 착수 판정
- **실·재사용(확장·재생성 금지)**: Mapping::actorId(Canonical·CANONICAL)·Paddle 멱등(일반화)·omni_outbox 아웃박스/claim 패턴(참조원형·KEEP_SEPARATE)·SecurityAudit::verify·Tenant Guard.
- **진짜 부재(순신규)**: Decision Record/Instance/Envelope/Commit·State Machine·Transition·Validation Pipeline(분리)·Idempotency·Replay·Lock/Lease·Fencing·Optimistic Version·Outbox·Snapshot·Drift·Reconciliation·Simulation·Decision Slot(DB unique).
- **선행 6군 중 5군(Approval/Authority/Delegation/Assignment/Sequential) ABSENT** → Validation Pipeline이 재검증할 대상(권한/단계커서/work-item/위임)이 없어 **공회전** → 구현 BLOCKED_PREREQUISITE. 실 엔진=선행 신설 후 별도 승인세션(RP-002).

정본 결정=[[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]]. per-entity 판정=§72 DSAR 세트(ⓒ).
