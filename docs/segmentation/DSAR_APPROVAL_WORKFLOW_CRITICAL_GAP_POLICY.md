# DSAR — Critical Workflow Gap 후보 (§64)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §64 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Workflow Definition/Version 테이블 | `workflow_*`/`flow_*`/`wf_*` **grep 0** | `NOT_APPLICABLE` — §64 갭 대다수가 **판정 자체 불가**(정의가 없으면 "정의 위반"도 없다) |
| 승인 정족수 REAL | `mapping_change_request` 1종만(`Mapping::approve` Mapping.php:238-294 · `Mapping::actorId`:36 위조불가 신원 fail-closed) | `VALIDATED_LEGACY` |
| 승인 우회 실결함 | `Alerting::executeAction`(Alerting.php:601-660) — `:612` 가 `status` 를 SELECT 하고 **어디서도 판독 안 함** → `pending`·`rejected` 도 `AdAdapters::pause`(:631)/`updateBudget`(:634) 실집행 | **현재 `VACUOUS`**(`INSERT INTO action_request` grep 0 = 생산자 전무) · **생산자 배선 시 즉시 활성** |
| Tenant 격리 (승인) | `admin_growth_approval` **tenant_id 컬럼 없음** · 결정 경로 `AdminGrowth.php:1324` = `SELECT * FROM admin_growth_approval WHERE id=?` (**테넌트 술어 없음**) | 🔴 §64 #2/#9 **현행 실재 갭** |
| Kill Switch | `AdAdapters::executionEnabled`(AdAdapters.php:34) — 호출부 9곳 실배선 | `VALIDATED_LEGACY` — 재사용 강제 |
| 멱등키 | `idempotency_key` **grep 0** | `NOT_APPLICABLE` — §64 #10/#11/#12/#21 의 방어 기전 부재 |
| Audit 훼손 방어 | `audit_log`(Db.php:540-545 = `actor·action·details_json·created_at`) — **tenant 없음·해시체인 없음** | 🔴 §64 #26 방어 불가 |

**★축 주의 — §64는 "현행 결함 목록"이 아니라 "Gap 후보 심각도 정책"이다.** 원문은 "다음은 High 또는 Critical로 처리하라"고만 말한다. 즉 §64의 산출물은 **심각도 등급 부여 규칙**이지 감사 결과가 아니다. 26종 중 다수는 **Workflow Definition/Instance/Task 개념 자체가 현행에 없어**(grep 0) 갭 판정의 전제가 성립하지 않는다 — 이를 "갭 없음(양호)"으로 기록하면 **분모 소멸형 역산**이다. 아래 표의 `NOT_APPLICABLE`은 **"안전하다"가 아니라 "판정 대상이 아직 존재하지 않는다"**는 뜻이다.

**★두 번째 축 주의 — 형태 유사 함정.** JourneyBuilder(`backend/src/Handlers/JourneyBuilder.php`)는 레포 유일의 실 Flow 실행 엔진이며 순환 감지(:512)·원자적 claim(:411-418)·순회 멱등(`claimSendOnce`:672)을 갖는다. 그러나 실행 컨텍스트가 **`crm_customers`/`journey_enrollments`(`customer_id` 필수 :554)** 인 **마케팅 여정 도메인**이다. JourneyBuilder의 방어를 §64 승인 갭의 커버로 계산하면 역산이다 → `KEEP_SEPARATE_WITH_REASON`. 단 **실행 프리미티브의 재사용 근거로는 인용 가능**.

## 1. 원문 전사 + 판정 — **원문 26종**

원문 §64는 심각도를 **High 또는 Critical** 로만 규정하고 **개별 항목별 등급을 지정하지 않는다.** 아래 "심각도" 열은 원문에 없는 축이므로 **전 항목 `High|Critical`(원문 그대로)** 로 기록한다. 개별 등급을 지어내지 않는다.

| # | 원문 항목명 | 현행 대조 (file:line) | 판정 |
|---|---|---|---|
| 1 | 승인된 Workflow Version 없이 Instance 실행 | Workflow Version 개념 grep 0 | `NOT_APPLICABLE` |
| 2 | 다른 Tenant Workflow Definition 사용 | Definition 부재 · **인접 실재 갭**: `admin_growth_approval` tenant_id 없음(AdminGrowth.php:1324 전역 조회) | `NOT_APPLICABLE`(Definition) · 🔴 인접 갭 실재 |
| 3 | Production Instance에서 Sandbox Workflow Version 실행 | Environment Scope 개념 부재 | `NOT_APPLICABLE` |
| 4 | Start Node가 없는 Active Workflow | Node 개념 부재(§12 전 30종 `NOT_APPLICABLE`) | `NOT_APPLICABLE` |
| 5 | Terminal Node에 도달할 수 없는 Workflow | 동상 · JourneyBuilder는 **작성자 JSON acyclicity 검증 없음**(:512 주석 자인 = 런타임 방어만) | `NOT_APPLICABLE` · `KEEP_SEPARATE_WITH_REASON`(JourneyBuilder) |
| 6 | Mandatory Approval Task 우회 경로 | Task 부재 · **인접 실결함**: `Alerting::executeAction`(:601-660) 승인 우회 = **§64 #6의 교과서적 실례**(단 `VACUOUS`) | `NOT_APPLICABLE`(Task) · 🔴 인접 갭 실재 |
| 7 | Approval Requirement 없는 Approval Task | Requirement 테이블 부재 · **인접**: `action_request` 정족수 **컬럼 없음** · `Alerting:562` 리터럴 `2` = 장식 | `NOT_APPLICABLE` · 🔴 인접 갭 실재 |
| 8 | Candidate 검증 없는 Human Task Assignment | Assignment/Candidate 개념 부재 | `NOT_APPLICABLE` |
| 9 | 다른 Tenant 사용자의 Task Claim | Task Claim 부재 · **인접 실자산**: `Omnichannel::claimBatch`(:394-423 `FOR UPDATE SKIP LOCKED`+claim_id·stale lease 900s) — **잡 큐 도메인** | `NOT_APPLICABLE` · `LEGACY_ADAPTER`(claim 프리미티브) |
| 10 | 중복 Task Completion | 멱등키 grep 0 · **인접**: `claimSendOnce(enrollment_id,node_id)`(JourneyBuilder.php:672) 자연키 선점 마커 | `NOT_APPLICABLE` · `LEGACY_ADAPTER` |
| 11 | 중복 Workflow Transition | Transition 개념 부재 · **전이 규칙 선언 0**(`UPDATE ... SET status=` 155건/44파일이 전부 호출지점 인라인) | `NOT_APPLICABLE` |
| 12 | 동일 Event 중복 처리로 Node 반복 진입 | 범용 이벤트 버스 grep 0 · **인접**: `raw_vendor_event.uq_rve_dedup` UNIQUE(Db.php:1017-1034) · Paddle `notification_id` UNIQUE(**`processed=1`일 때만 skip**) | `NOT_APPLICABLE` · `LEGACY_ADAPTER`(dedup 선례) |
| 13 | Approval Decision 없이 Approval Task 완료 | Task/Decision 분화 부재 | `NOT_APPLICABLE` |
| 14 | Workflow 완료 상태인데 Mandatory Requirement 미충족 | Requirement 부재 · **인접 계약 위반 이미 존재**: `listActionRequests`는 `required_approvals:2` 응답하나 `decideAction`은 **1명에 approved** | `NOT_APPLICABLE` · 🔴 인접 갭 실재 |
| 15 | Workflow 완료 전에 Approval Execution Binding 생성 | Execution Binding 개념 부재 | `NOT_APPLICABLE` |
| 16 | Cancelled Workflow의 Active Task 지속 | Cancel 상태 전이 부재 | `NOT_APPLICABLE` |
| 17 | Paused Workflow에서 Worker 실행 지속 | Pause 개념 부재 · **인접**: `AdAdapters::executionEnabled`(:34) 킬스위치 9곳 실배선 | `NOT_APPLICABLE` · `VALIDATED_LEGACY`(킬스위치) |
| 18 | Financial System Task의 무제한 Retry | **백오프 3공식 병존**: `AdAdapters::retryDeliveryDlq`(:1187-1228 maxAttempts 5 · `600*2^n` **86400s 캡**) · `OpenPlatform`(:466-471 `min(60,2^n)`분) · `Omnichannel`(:365 attempts<3 · **백오프 없음**) | `LEGACY_ADAPTER` — **AdAdapters:1221 공식 채택 권고** |
| 19 | External Callback 인증·Tenant 검증 누락 | Paddle HMAC 서명(:1073) REAL이나 **테넌트 검증 부재**(`paddle_events` tenant_id 없음 :99) · 범용 인바운드 `Webhooks.php:22-27` = **opt-in**(시크릿 미설정 벤더 수신 허용 + `verified=false`) | 🔴 **인접 갭 실재**(§64 #19 그대로) |
| 20 | Workflow Migration으로 Mandatory Node 우회 | Migration 개념 부재 | `NOT_APPLICABLE` |
| 21 | Replay로 Financial Side Effect 중복 실행 | Replay 개념 부재 · 멱등키 grep 0 | `NOT_APPLICABLE` |
| 22 | Workflow Instance와 Approval Case 상태 불일치 | Instance/Case 양쪽 부재 | `NOT_APPLICABLE` |
| 23 | External Engine과 Canonical State의 Critical Drift | 외부 엔진 미도입(BPMN/Temporal 등 부재) | `NOT_APPLICABLE` |
| 24 | Secret이 Workflow Variable 또는 Audit에 저장 | Variable 부재 · **인접 방어 REAL**: `tools/scan_secrets.sh` 규칙 SSOT + `.githooks/pre-commit:50`(`--staged`) + `security-scan.yml` `repo-guards` 잡(:57, :82 `--range`) | `NOT_APPLICABLE`(Workflow Variable) · `VALIDATED_LEGACY`(레포 스캔) — **한계는 §65 참조** |
| 25 | Script Task로 Authorization·Approval 우회 | Script Task 미도입 = **현 시점 최선의 상태** | `NOT_APPLICABLE` — **도입 금지가 정답**(§65 "Production Script Task" 차단과 짝) |
| 26 | Workflow Definition 직접 수정으로 실행 이력 훼손 | Definition 부재 · **인접**: `audit_log`(Db.php:540-545)에 **tenant 없음·해시체인 없음** → 이력 훼손 탐지 불가 | `NOT_APPLICABLE` · 🔴 인접 갭 실재 |

**실측 개수: 26 / 26 전사.** 커버리지 = `NOT_APPLICABLE` 26 (전 항목 — Workflow Definition/Instance/Task/Node/Transition 개념이 현행 grep 0이므로 **26종 전부가 원문 축 그대로는 판정 불가**) · 그중 **인접 도메인에서 동일 클래스 결함이 실재하는 것 7건**(#2·#6·#7·#14·#19·#24·#26) · **인접 실자산 재사용 가능 5건**(#9·#10·#12·#17·#18).

🔴 **이 표의 `NOT_APPLICABLE` 26/26 을 "갭 0 = 양호"로 읽지 마라.** 정반대다: **§64 전 항목이 판정 불가**라는 것은 승인 워크플로 실행 엔진이 **아직 존재하지 않는다**는 뜻이며, 5-3-2가 신설할 때 **26종 전부가 즉시 High/Critical 후보로 활성화**된다.

## 2. 규칙

- **심각도 정책**: §64의 26종은 탐지 시 **High 또는 Critical** 로 처리한다(원문 그대로). 원문이 개별 등급을 지정하지 않았으므로 **항목별 High/Critical 세분은 지어내지 않는다** — 5-3-2 구현 시 별도 승인 하에 확정한다.
- 🔴 **`NOT_APPLICABLE` ≠ 안전.** 26/26 부재는 "방어가 완비되어 위반이 없다"가 아니라 **"방어 대상 개념이 없다"**이다. 신설과 동시에 26종 가드가 **선행 또는 동시** 배선되어야 한다. "엔진 먼저·가드 나중"은 §64 전체를 무방비로 여는 것이다.
- 🔴 **`Alerting::executeAction`(Alerting.php:601-660)을 참조 구현으로 삼지 마라.** `:612` 의 죽은 `status` 읽기 = **§64 #6(Mandatory Approval Task 우회)의 살아있는 실례**. 현재 `VACUOUS`(생산자 0)이나 **`action_request` 첫 생산자를 배선하는 순간 즉시 활성 결함**이 된다. → **생산자 배선 전에 `:612` 판독 결함부터 닫아라**(별도 승인 세션).
- 🟠 **§64 #7·#14의 근본 원인 = `actor_type` 부재.** `apikey:{id}`/`user:{email}` 이 정족수에 **동등 계수**되어 **API 키 2개로 Maker-Checker 충족 가능**(스펙 §20 위배). 정족수 신설 시 `actor_type` 분리가 **선결**이다.
- 🔴 **§64 #2/#9 Tenant 격리는 신설 시점에 결정하라.** `admin_growth_approval`(tenant_id 없음)·`paddle_events`(tenant_id 없음 :99)의 전례를 복제하지 마라. **Canonical 승인 테이블 전 축에 tenant_id NOT NULL + 전 조회 술어에 테넌트 강제**.
- **§64 #18 Retry**: 신설 금지·**`AdAdapters::retryDeliveryDlq`(AdAdapters.php:1187-1228) 공식 채택**(maxAttempts 5 · `600*2^n` · 86400s 캡). 4번째 백오프 공식을 만들면 병존이 3→4로 악화된다.
  - ★**defer ≠ 실패 규율 보존**(`Omnichannel:349,362` quiet_hours/sto_defer 는 attempts 미증가) · ★**honest pending 보존**(`ChannelSync:6173`·`Catalog:1712` 어댑터 부재 시 재시도 미소모). Financial System Task 의 Retry 한도는 **이 두 규율을 깨지 않는 선에서** 적용한다.
- **§64 #25 Script Task**: **도입하지 않는 것이 방어다.** §65 "Production Script Task" 차단과 짝이며, 프로덕션 차단 전제 없이 Script Task를 도입하면 §64 #25가 곧바로 Critical 로 성립한다.
- 🔴 **§64 #23(External Engine Drift) 예방 = 외부 엔진 미도입 유지.** 설계 결론 1에 따라 Flow 실행 엔진은 **신설 금지 · `JourneyBuilder` 에 `approval` 노드 추가**로 해결한다. 외부 BPMN/Temporal 도입은 §64 #23을 **정의상 새로 만드는 행위**다.
- **§64 #26 Audit 훼손**: `audit_log`(Db.php:540-545)는 **tenant·해시체인 부재**로 훼손 탐지가 불가하다. 승인 감사를 이 테이블에 얹으면 §64 #26이 **설계상 미방어**로 확정된다 → §70 참조.
- 🔴 **26종 "있다고 가정"하고 배선 금지.** 부재는 부재로 기록했다.
