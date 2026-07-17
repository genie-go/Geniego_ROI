# ADR — Approval Workflow Definition, Execution Engine, Task, Timer, Idempotency & Reconciliation Foundation (EPIC 06-A Part 4-5-3-1-5-3-2)

- **일자**: 289차 (2026-07-17)
- **상태**: Accepted (Approval Workflow Execution Engine 계약 명세 확정. **비파괴 — 코드변경 0**). 실 Definition/Instance/Task/Token 스토어·`approval` 노드·공용 추출·CI 가드 구현은 **후속 승인 세션**(Golden Workflow Dataset + Conformance + Legacy Equivalence + verify + 배포승인).
- **근거**: 스펙 원문 [`SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md`](../segmentation/SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §0~§85 · 산출 84편 [`DSAR_APPROVAL_WORKFLOW_*`](../segmentation/) · Part 1(승인 지형 실측) · 5-3-1 ADR([`ADR_DSAR_REBATE_APPROVAL_FOUNDATION`](ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md) 계열).
- **선행 정본**: [`ADR_CANONICAL_SEGMENT_DSL`](ADR_CANONICAL_SEGMENT_DSL.md)(Condition 평가 = Part 2 Canonical RuleEngine 확장이지 신규 아님).

---

## 0. 맥락 — 이 ADR이 뒤집은 전제

**8회차 예측은 "워크플로 엔진 자체가 부재"였다. 전수조사가 뒤집었다.**
BPMN/Temporal/Camunda/Flowable/Zeebe/StepFunctions `backend/src` **grep 0** 은 사실이나, **그 입도에서 멈춘 판단**이었다. `JourneyBuilder` 는 레포 유일의 **실 Flow 실행 엔진**이다(§71).

> ★**부재증명은 이름이 아니라 능력으로 하라.** 이 오판을 그대로 밀었다면 결론은 **"실행 엔진 신설"** — 즉 **두 번째 엔진**이었고, 이는 헌법(중복 엔진 금지)·무후퇴 위반이다.

**대칭 오류도 같이 봉인한다**: 능력이 있다고 **요구 충족으로 계산**하는 것(JourneyBuilder 순환감지 `:512` 를 §16 Graph Validation 커버로 세는 것)은 **역산**이다. 시점·범위·결과·미탐지 4축이 다르다(§16).

---

## 1. 결정 (핵심)

### D-1. Flow 실행 엔진 = **신설 금지** → `JourneyBuilder` 확장이 유일 합리해
`JourneyBuilder::advanceEnrollment`(`JourneyBuilder.php:498-700+`)가 이미 보유: 노드 13종 · `delay`(:527)/`wait`(:548 date|event|timeout) 타이머 · **원자적 claim**(:411-418) · **순회 멱등** `claimSendOnce`(정의 :450-461 · 호출 :679) · **순환 감지**(:512 · 런타임 방어만) · 노드 감사 `journey_node_logs`(:48-52,:69) · **cron 배선 REAL**(`journey_cron.php:29-35` */5). → 요구 실행 프리미티브 중 **`approval` 노드 하나만 결번**(grep 0 · `JourneyBuilder.php`·`JourneyBuilderConstants.js` 양쪽).

### D-2. ★**enrollment 컨텍스트 일반화가 선결** — 범위는 DDL 한 줄이 아니다 (실측 정정)
초판 브리핑의 "`customer_id` **필수**(:554)" 는 **실측과 다르다**:
- DDL은 **nullable** — `customer_id INT`(:44 MySQL)/`INTEGER`(:68 SQLite). **NOT NULL 아님**. 수동 등록은 null 실제 허용(`:204` `?: null` + `session_id` 컬럼).
- **진짜 제약 2겹**: ① 자동 진입 **생산자 5개소**(:287·:294·:336·:358·:375)가 전부 `crm_customers`/`segment_members` 키 ② `:551`→`:556` `if ($cid > 0 && eventOccurred(...))` → **`customer_id=0` 이면 event-mode wait 가 영구 미발생**(타임아웃 분기로만 탈출).

> ∴ **리스크는 좁아지지 않고 넓어진다.** 비-고객 승인(예산·가격·배포)을 태우려면 **생산자 5개소 + 이벤트 조회 축 일반화**가 선결이며, 미이행 시 `BLOCKED_MIGRATION_RISK`.

### D-3. 승인 **정의(Definition) = 신설 불가피**
현행 4종 전부 "누가·몇 명·어떤 순서"가 **코드 상수**: `Mapping` INSERT 리터럴 `2`(:209-210 · 리터럴은 execute 인자 :210) · `Alerting` 응답 하드코딩 `2`(:562) · `AdminGrowth` 단일결재 암묵. **워크플로 정의 테이블**(`workflow_*`/`flow_*`/`wf_*`) **grep 0**. 정의·step·조건부 라우팅·역할 바인딩 전부 부재.
- **결번의 핵심 = Financial Threshold**(§59 #7): 리터럴 `2` 는 **금액 무관 고정** → **1만원 매핑과 1억원 예산이 동일 승인 강도**.

### D-4. 정족수·Maker-Checker = **신설 금지 · 위치 이동**
`Mapping.php:245-290` 5단 규율(위조불가 신원 fail-closed `actorId` → 자기승인 403 → 승인자 dedup 409 → 비-pending 409 → 정족수)을 **공용 트레이트/서비스로 추출**. **재작성 시 289차 G-01이 닫은 우회로(익명 2회 = 정족수)를 다시 연다.** **신규 작성이 아니라 위치 이동이다.** `EquivalenceProof` 선행 없이 통합 금지(286차 rank 맵 붕괴 재현).

### D-5. 승인 지형 = **"중복 4벌"이 아니라 ~~"1 REAL + 3 미달"~~ → ★"2 REAL + 2 미달"** (289차 10회차 정정)

> 🔴🔴 **초판 정정 — 이 표의 4번째 행이 틀렸다.** 초판은 **테이블 `catalog_writeback_approval`** 을 보고 "고아"라 판정했으나, **승인 능력은 그 테이블이 아니라 `catalog_writeback_job.status='pending_approval'` 경로에 살아 있다.** **테이블은 죽었고 능력은 살아 있다** — 289차 5-3-3-2 에서 최초 발견, **5-3-3-3 ⓑ §3.3 이 정의부 Read 로 독립 재확인**.
>
> **왜 무거운 오류인가**: D-5 는 사실 기술이 아니라 **"어느 쪽으로 통합할 것인가"의 근거**다. 분모가 1이냐 2냐에 따라 통합 방향이 달라진다. 그리고 틀린 값이 정본에 자리잡으면 이후 인용이 전부 그것을 복제한다(289차 ② "351 사건" 패턴).

| 구현 | 판정 | 근거 |
|---|---|---|
| `mapping_change_request` | **REAL** | 4중 방어 정의부 확인 — 위조불가 신원 fail-closed(`Mapping.php:246-250`) · 자기승인 403(`:268-271`) · 승인자 dedup(`:278-283`) · **정족수 `:287`(레포 유일 실집행)**. ⚠️**단 집행 `apply:296-299` 는 `actorId` 가 아니라 `actor()`(`:299`) 사용** → 집행 단계는 신원 fail-closed 가 아니며 **승인자=집행자 차단이 없다** |
| ★**`catalog_writeback_job` status=`pending_approval`** | ★**REAL** (초판 누락) | 정책게이트 `evaluatePolicy`(`:2247`) → `approvalCreate:2275` → `approveQueue:2341`(tenant 스코프 `:2350`) → **집행 `processWritebackQueue:2362`**. 282차 근본수정으로 실배선. 🔴**단 `:2343` 은 행위자를 읽지 않고**(`requirePro` 플랜 게이트뿐) · **감사 0**(클래스에 audit 함수 부재) · 🔴**`:2350` ids 미지정 시 테넌트 전체 일괄 승인** |
| `action_request` | **VACUOUS** | `INSERT INTO action_request` **grep 0 = 생산자 전무** · 정족수 **컬럼 없음** · `Alerting:562` 리터럴 2 = 장식 · `listActionRequests`는 `required_approvals:2` 응답하나 `decideAction`은 **1명에 approved = 계약 위반 이미 존재**. ★추가 실측: **`requested_by` 컬럼도 없다**(`Db.php:592-600`) → **자기승인 차단이 구조적으로 불가능** |
| `admin_growth_approval` | **BLOCKED_CROSS_TENANT** | DDL(`AdminGrowth.php:142-149`)에 **`tenant_id` 컬럼 없음** · 조회 전역(:641·:1306) · 결정 무격리(:1324 `WHERE id=?`). ★추가: `requested_by`·`decided_by` **양쪽 있는데 비교 코드 0**(`:1324-1331`) |
| ~~`catalog_writeback_approval`~~ | **고아 테이블**(승인 경로 아님) | CREATE 2회(`Catalog.php:86`,`:126`) + **자인 주석 `:2269-2272`** 뿐 · INSERT/SELECT **0**. ★**이것은 4번째 승인 경로가 아니라 위 2번째 경로의 사용되지 않는 잔해다** — 별개 항목으로 세면 안 된다 |

> 🔴 **미달을 "중복"이라 부르면 통합 결과가 자동으로 "기능 유지"로 위장된다.** 통합 = 신설이 아니라 **`Mapping::approve`+`actorId` 공용 추출 후 흡수**. **4번째 Foundation 신설 금지(AL-19).**
>
> ★**정정 후에도 "중복이 아니라 부재"라는 결론은 강화된다**: 스키마 4종이 **전부 다르고**(`required_approvals` 는 `Mapping` 에만 · `requested_by` 는 `action_request` 에 없음 · `tenant_id` 는 `admin_growth` 에 없음) 의미론도 4종이다. **어느 쪽으로 통합해도 한쪽은 후퇴 아니면 신설이다.**
>
> ★**5번째 승인 축이 초판에 누락됐다**: `app_user.agent_mode`(`'recommend'|'approval'|'auto'`) — `AdAdapters::agentMode:42-49`(owner 행 판독) → `canAutoExecute:55` · `AutoCampaign:349`,`:1239` **실소비**. **워크플로가 아니라 자동집행을 억제하는 이진 게이트**이므로 통합 대상은 아니나, "승인 지형"을 셀 때 빠뜨리지 마라.

### D-6. ★**순서 절대** — `executeAction` 상태 게이트 → `action_request` 생산자 배선
`Alerting::executeAction`(`Alerting.php:601-660`)은 `:612` 에서 `status` 를 **SELECT 하고 어디서도 판독하지 않는다**(죽은 읽기) → `pending`·`rejected` 도 `AdAdapters::pause`(:631)/`updateBudget`(:634) **실집행**. 287차 가짜집행 수정의 부작용(실집행을 붙이며 게이트 미부착). **현재 VACUOUS(생산자 0)이나 생산자 배선 시 즉시 활성.**
> **뒤집으면 승인 우회가 즉시 활성화된다.** `executeAction` 을 **참조 구현으로 삼지 마라** — 차단 요구의 **실물 반례**다.
- 🟠 **`actor_type` 부재** → `apikey:`/`user:` 가 정족수에 **동등 계수** → **API 키 2개로 Maker-Checker 충족 가능**(스펙 §20 위배).

### D-7. 실행 인프라 = **신설 금지 · 통일** (조건부 UPDATE + rowCount CAS)
레포 최고 성숙 자산: `Omnichannel::claimBatch`(:394-423 · stale lease 900s 회수 → `FOR UPDATE SKIP LOCKED`+claim_id → 조건부 UPDATE 폴백) · `claimConditional`(:427-447 SQLite/MySQL<8 2단 폴백) · CAS 확립 4곳(Catalog:1683 · ChannelSync:6136-6153 · JourneyBuilder:411 · Omnichannel:427).
- 🔴 **optimistic lock(`version`)·분산락·`GET_LOCK` 전부 grep 0** · `flock` 은 `stock_sync_cron.php:54` 유일.
- ★**SQLite 폴백 호환이 명시적 설계 제약**(`Db.php`) → **다른 동시성 모델 도입 = 제약 위반**.
- ★**정정(§55 실측)**: 진짜 충돌은 **SQL 문법이 아니다**(`WHERE version=:v` 는 SQLite 에서 동작). 실제 제약은 **마이그레이션 경로** — `backend/migrations/` 가 172차에서 멈추고 이후 self-healing `ensureTables` 의존 → **한쪽 백엔드만 적용 시 폴백 발동 순간 stale 차단이 무음 소실**(환경별 상이한 정합성). 도입 결정은 5-3-2 권한 밖 → `CONTRACT_ONLY`.

### D-8. **`Claim` 형태 유사 함정** — 잡 선점 ≠ Human Task 클레임
`claim*` 5계열은 **워커의 잡/메시지 선점**이지 **사람의 Task 배정/클레임이 아니다**(주체·대상·목적·인가·해제 5축 상이). §38 `VALIDATED_LEGACY` **0건** — **패턴 재사용 근거로만** 인용한다.
- ★**heartbeat 부재** → 승인은 **사람 시간 척도**라 lease TTL 900s 모델 부적합(`claimBatch:394-399` 는 워커 생존과 무관하게 900s 초과 작업을 **강제 회수·중복 실행**). ★**fencing 부재** → 만료 후 되살아난 워커의 부수효과를 멱등 마커 없는 경로(예산 증액)에서 못 막음.

### D-9. 멱등 = **5-3-2가 채울 결번** → `claimSendOnce` 자연키 선점 마커 채택
`idempotency_key` **grep 0**. 현행 3패턴은 **전부 서버 도출 자연키**이지 **호출자 제시 키가 아니다**(§53 필드 `request payload hash`/`duplicate count`/`expiry` 의 존재가 그 증거 — 자연키 방식엔 불필요한 축). **이 차이를 뭉개면 결번이 정의상 소멸한다.**
- 채택: `claimSendOnce`(정의 :450-461 · 호출 :679) 자연키 선점 마커가 승인 결정에 가장 정합.
- 인접 `dedup_key`(`Db.php:257-281` · `uq_rve_dedup` :1034)는 **적재 중복 차단**이라 승인 결정 멱등에 **부적격**.
- Paddle `notification_id` UNIQUE 멱등(**`processed=1` 일 때만 skip**, `processed=0` 재처리 허용 · 272차)은 **채택 강제 + 단순화 금지**(되돌리면 기능 후퇴). 단 **`paddle_events` 에 tenant_id 없음**(:99).

### D-10. 상태머신 = **없다** → §63 State Mapping 이 §61 Reconciliation 보다 **선행**
`UPDATE ... SET status=` **155건 / 44파일** · **전이 규칙 선언 0**(전부 호출 지점 인라인) · 전이 가드 **4곳뿐**(`FeedTemplate::transition`:248-285 · `Mapping::apply`:309 · `Catalog::approveQueue`:2341 · `AdminGrowth::launch`:1155) → **155건 중 151건 무가드**.
- ★**가드 ≠ 선언을 코드로 증명**: `FeedTemplate::transition(…, string $from, string $to)`(:249)는 **전이 쌍을 호출자에게서 인자로 받는다**(:267 `'draft','submitted'`). 가드는 "현재 status == 넘겨받은 from" 만 검사할 뿐(:258) **합법 전이 집합을 알지 못한다**.
- 🔴 **§61 비교의 오른쪽 변이 없다**: 23개 비교가 전부 `X vs Canonical` 인데 **Canonical State 미선언** → **대사는 항상 MATCH 반환 = 가짜녹색 순수형**(288차 `ok=>true` 위장과 동형). ∴ **§63 → §61 순서 강제.**
- ⚠️ **§70 감사 이벤트를 먼저 만들면 155곳에 감사 호출을 뿌리게 된다**(새 병) → **전이 중앙화 선결**.

### D-11. 통지 = **"배선만"은 거짓** (초판 판정 정정 · PM 직접 실측)
- **`Alerting::dispatch` 는 실재하지 않는다**(`function dispatch(` **grep 0**). 이 이름은 `Alerting.php:472-474` **주석**에만 남은 **역사적 명칭**(282차 수정으로 소멸). → CLAUDE.md 기지 트랩(`ClaudeAI.php` "killswitch 내장" **주석은 실효와 불일치**)과 **동형**. **주석을 API 근거로 삼지 마라.**
- 실 진입점 = **`Alerting::pushEvent`(:917) 만 `public`**. `dispatchNotifications`(:445 · 폴백 체인 :471-497 보유)·`sendSlack`(:736)·`sendEmail`(:810)·`sendWebhook`(:937)은 **전부 `private`** → **가시성 승격 선결**.
- `pushEvent` **그대로 재사용 불가**: **반환 `void` + 예외 삼킴**(:934) → **발송 실패 무음**(승인 통지는 감사 대상) · **`tenant === 'demo'` → no-op**(:919) → **데모 승인 통지 검증 불가**(배포 전 E2E 사각) · **`notification_channel` = `tenant_id` PRIMARY KEY = 테넌트당 1행**(:911-912) · `email_to` **단일 주소** · locale 한국어 하드코딩(:927) → **승인자 개인 통지(recipient resolution) 구조적 불가**.
- ∴ 정정된 판정 = **`pushEvent` 배선 + 가시성 승격 + 발송결과 반환/감사 + recipient resolution 신설**. §29 실측 **필수 10종 현행 충족 0**.
> 🔴 **"완비 → 배선만"으로 닫으면 분모를 Channel 축으로 갈아끼우는 역산이다.**
- **보존**(재구현 금지): `notification_channel` SSOT(:911) · 폴백 체인(:471-497 · 282차 "알림 통지 죽음" 수정분) · `min_severity` 게이트 · `Genie\Crypto` 자격 복호(`nDec` :915). ⚠️282차 트랩: 정책은 `slack.enabled` 만 보고 URL 은 다른 테이블 → **무발송**. **실발송 검증 필수.**

### D-12. Event/Signal = **웹훅 발신 전용** → 승인 이벤트 재사용 금지
`OpenPlatform::emit`(:311-328)은 `webhook_endpoint` 조회 → `insertDelivery` = **outbound 전용 · 방향이 반대**. **구독 0이면 no-op**(:319) + **예외 절대 미전파**(:325) = **"소실되어도 정상"이 계약** → 승인 의미론과 **정면 충돌**.
- 🔴 **범용 이벤트 버스·in-process dispatcher·구독 기전 grep 0** — 내부는 전부 직접 static 호출.
- ★**§20 의 결번은 상태가 아니라 발신이다**: `REQUEST_SUBMITTED`·`DECISION_RECORDED` 는 대응 UPDATE/INSERT 가 실재하나(`Mapping.php:209-210`·:238-294) **발신 0** — **"상태는 바뀌나 아무도 깨어나지 않는다."**

### D-13. Retry/DLQ = `AdAdapters:1221` 공식 채택 · **4번째 공식 금지**
🔴 **백오프 3공식 병존**: `AdAdapters::retryDeliveryDlq`(:1187-1228 · maxAttempts 5 · `600*2^n` · **86400s 캡** :1221) / `OpenPlatform`(:466-471 `min(60,2^n)`분) / `Omnichannel`(:365 attempts<3 · **백오프 없음**).
- ★**현행 DLQ는 "재시도 큐"이지 "Dead Letter 관리 체계"가 아니다**: `ad_delivery_dlq` **1개뿐**(나머지는 원 테이블 `status='failed'` 잔류)이며 **`:1193`이 `pending`만 조회 → `failed`는 영구 종착**(되살아날 경로 없음). §48 Next Action 8종 **전부 부재**. `replay allowed` **기본 false**(외부 멱등 확인 부재 → 자동 리플레이 = 중복 집행).
- ✅ **계승 강제**(유이한 `VALIDATED_LEGACY`): **defer≠실패**(`Omnichannel:349-350,362-363` quiet_hours/sto_defer 는 attempts 미증가) · **honest pending**(`ChannelSync:6172-6173`·`Catalog:1712` 어댑터 부재 시 재시도 미소모). 승인에서 이를 어기면 **"승인자 부재 → 재시도 소진 → failed = 승인이 조용히 죽는다."**
- ★**§47 최대 위험 = 실패 과다 계수** = **가짜 녹색의 거울상(가짜 적색)**. defer 를 실패로 계수하면 정상 동작이 장애로 보고된다.

### D-14. Timer = **DB 컬럼 + cron 폴링** · 해상도 상한 `*/5`
타이머 서비스·지연큐 부재. `journey_enrollments.resume_at`/`wait_until`(:80-82 · 206차 delay + 255차 이벤트 절대기한 **분리 설계**) · `sms_campaigns.scheduled_at`+`runScheduledQueue`(`SmsMarketing.php:367` · **ISO8601 문자열 사전식 비교**).
- **폴링 해상도 상한 = cron `*/5`** → **5분 미만 기한은 선언되나 지켜지지 않는다.**
- 🔴 **catch-up/missed timer 정책 부재** → cron 정지 후 재개 시 `resume_at <= now` **일괄 통과**(:529). 승인에서는 **기한 만료 일괄 자동거절**로 직결. **"현행이 그러니 그대로"는 역산.**
- ★**`resume_at` 은 절대 시각** → pause 3일 후 재개 시 대기 타이머 **일제 발화**(thundering herd) · 경과분 미저장 → 잔여 시간 복원 불가 → §50 `timer recalculation` 필수.
- **타임존 축 3벌 병존** → **4번째 축 신설 금지 · `RuleEngine::DEFAULT_TZ`(:35) 축 채택**(`crm_customer_prefs.tz_offset` INT `PreferenceCenter.php:84` / SmsMarketing ISO8601 :367 / JourneyBuilder `gmdate` **UTC 고정** :538).

### D-15. Token = **개념 자체 부재** · `split` 을 `FORK` 로 승격 금지
`workflow_token|token_id|parent_token|fork_ref|join_ref` **grep 0**. 능력 축에서도 부재: `current_node` **스칼라 1개**(:44) · `nextNode(...): string` **단일 반환**(:786).
- ★**`split`(:614-621)은 `pickWeighted`(:618) = 가중 확률 택일** → **배타 분기이지 parallel fork 아님**. `FORK` 로 승격 시 **A/B 테스트 재현성 붕괴**(무후퇴 위반).
- §33 Token Type **`LEGACY_ADAPTER` 조차 0** — 현행 커서를 `PRIMARY` 로 명명해 **"1/8 커버"로 세는 것 금지**.
- **§34 결번 실증**: `nextNode` 반환값이 루프 변수에 대입될 뿐 **기록되지 않고 버려진다** · `journey_node_logs`(:48-52)에 `source_node_id`/`target_node_id`/`edge_id` **구조적 부재** · **`journeys.edges` JSON 에 엣지 id 자체가 없다**(`from`+`when` 매칭 :789,:796) → §33 "동일 Token×Edge 중복 금지" 를 **걸 대상이 없다** → **`edge_id` 부여 선결**.

### D-16. 인가·권한 = **신설 금지 · 배선** (권한 모델 2벌 금지)
- 🔴 **`acl_permission` 의 `approve` 동작 = 부여되나 판독 0**: `TeamPermissions::ACTIONS`(:39)에 `approve` 존재 · 마케팅/영업/물류/재무팀 템플릿이 실제 부여(:708-717) · **`acl_permission` 을 읽는 외부 코드 grep 0** · 승인 3핸들러 어디도 인가 미검증 → §37 `authorization precheck` 는 **신설이 아니라 배선**이다. 새 권한 축 신설 = **권한 모델 2벌 = AL-19 위반**.
- `TeamPermissions::scopeSql*` 는 **외부 6곳 실배선 REAL**(`AdPerformance:26`·`Wms:1291`·`OrderHub:261`·`Catalog:981-983`) → `candidate role/group/organization` 해석은 여기 위임, **재구현 금지**.
- **함정**: `acl_permission` = **메뉴 게이팅**(menu_key=프론트 경로 · **레코드 권한 아님**) · **`PlanPolicy` fail-open**(`PlanPolicy.php:12` 자인) → **승인 게이트 기반 부적격**.

### D-17. 재사용 강제 · 신설 금지 목록 (게이트 통과가 신설을 정당화하지 않는다)
| 축 | 정본 | 판정 |
|---|---|---|
| 실행 엔진 | `JourneyBuilder` | 확장(`approval` 노드) |
| 정족수/Maker-Checker | `Mapping::approve`+`actorId`(:245-290) | 공용 추출(위치 이동) |
| 킬스위치 | `AdAdapters::executionEnabled`(:34-40 · **호출부 9곳 실배선 REAL**) | 재사용 강제 |
| 에러 봉투 | `AdminGrowth::fail`(:181-184 `code`+`detail`+`meta` · `approvalDecide` 실배선 :1322/:1326/:1327) | `VALIDATED_LEGACY` · **두 번째 봉투 신설 금지** |
| 암호화 | `Genie\Crypto`(:108-121 AES-256-GCM · 키버전 · **fail-closed 평문거부**) | `VALIDATED_LEGACY` · 신규 암호화 경로 금지 |
| 표현식 | `RuleEngine`(:24 · 화이트리스트 `OPS` :33 · `switch` :435-437 · **eval 미사용**) | Part 2 Canonical DSL 확장 · **표현식 엔진 신설 금지** |
| 감사 스키마 선례 | `journey_node_logs`(**tenant_id 보유** :69 · 조회 술어 실배선 :248) | 선례 채택(단 마케팅 도메인 → **커버 계산 금지**) |
- ★**§68 비대칭 경고**: `AdminGrowth::json`(:164-179)에 **warning 슬롯 자체가 없다** → "어휘만 추가" 가정 시 **작업량 과소평가**. `fail`/`json` 이 **`private static`** → **`Mapping::approve`+`actorId` 공용 추출과 같은 리팩터에 묶어라.**
- **`audit_log` 는 §70 저장소로 부적격**: MySQL판(`Db.php:540-545`)·SQLite판(`AdminGrowth.php:157-159`) **양쪽 동일하게 `actor·action·details_json·created_at` 4컬럼 = tenant 없음·해시체인 없음** → **신설이 정답이며 중복 신설이 아니다**.

### D-18. 외부 Workflow Engine = **전제 미성립** → §73 17/17 `CONTRACT_ONLY`
BPMN/Temporal/Camunda/Flowable/Zeebe/StepFunctions grep 0 · **전용 브로커 부재** · **스케줄링 = OS cron 단일 수단**(앱 내 cron 표현식 파서 grep 0 → `CRON_REFERENCE` 를 "OS cron 이 있으니 커버"로 계산 금지 — **구동 수단 ≠ 선언 타입**) · SQLite 폴백 제약. 외부 엔진 도입 시에도 **Canonical 계약 생략 금지**(§73 말미).

---

## D-19. ★**Approval Chain ↔ Workflow Engine 경계 확정** (289차 10회차 · 5-3-3-3 §70 Step 2 · §72-18)

> **왜 여기 쓰는가** — 5-3-3-3 §71 은 `ADR_APPROVAL_CHAIN_WORKFLOW_BOUNDARY.md` **신설**을 지정했다. **신설하지 않는다.** 그 질문(*"Approval Chain 은 어디서 끝나고 Workflow Engine 은 어디서 시작하나"*)은 **D-1·D-3·D-18 이 이미 답한 질문**이며, 별도 문서를 만들면 **같은 질문에 대한 두 번째 결정 거처**가 생겨 둘이 갈라지는 순간 정본을 알 수 없게 된다. 근거 = 5-3-3-3 §71 자신: *"기존 동일 목적 문서가 있으면 새로 중복 생성하지 말고 통합하라."*
> **다른 4편**(`CANONICAL_SOURCE`·`ROUTE_DAG`·`VERSIONING`·`COMPILATION`)은 **새 질문에 답하므로 신설했다** — `docs/architecture/` 에 있다.

### 경계

| 축 | 담당 | 결정 |
|---|---|---|
| **Flow 실행**(노드 순회·타이머·claim·멱등·cron) | **`JourneyBuilder` 확장** | **D-1 유지** — 5-3-3-3 ⓑ 가 이 결정을 **뒤집지 않았다**. 실행 프리미티브 중 `approval` 노드 하나만 결번. **선결 = D-2**(enrollment 컨텍스트 일반화 · 미이행 시 `BLOCKED_MIGRATION_RISK`) |
| **Chain·Route 정의**(무엇을·누가·어떤 순서로) | **신규 Canonical SoT** | **D-3("정의 = 신설 불가피") 확정**. 상세 = [`ADR_APPROVAL_CHAIN_CANONICAL_SOURCE.md`](ADR_APPROVAL_CHAIN_CANONICAL_SOURCE.md) D-1 |

**두 결정은 모순되지 않는다** — 실행과 정의는 다른 질문이고, D-3 이 이미 신설을 예고했다.

### §72-18 은 발동하지 않는다 (5-3-3-3 ⓑ 부재증명)

5-3-3-3 §72-18(*"Workflow Engine 과 별도 Route Source of Truth 를 만들지 마라"*)과 §6(*"기존 Workflow Definition 이 **범용 DAG 를 제공한다면**"*)은 **양쪽 다 전건이 거짓**이다. 후보 3종 전부 탈락:
- **`JourneyBuilder`** — **정의 계층이 비어 있다**(`createJourney:135`/`updateJourney:153-154` 무검증 `json_encode` · `:512` 주석이 acyclicity 미검증 자인) · **`journeys.edges` JSON 에 엣지 id 가 없다**(`:126` 시드에 `id` 키 부재 → `:789`,`:796` 이 `from`+`when` 매칭) · **`customer_id` 하드 전제**(`:551`,`:556`,`:822`) · version/effective 0.
- **`graph_node`/`graph_edge`** — **DAG 가 아니라 그래프 스토어**(`upsertEdge:107-148` acyclicity 검사 없음) · **순회기 0**(`GraphScore:193~297` 하드코딩 3-hop) · 판독자 4종 하드와이어 · **내부 생산자 0(VACUOUS 미배제)**.
- **`pm_task_dependencies`** — **DAG "검증기"이지 "엔진"이 아님**(노드 타입 0·조건 0·실행기 0) · 도메인 = PM 일정 의존.

∴ **`APPROVAL_ROUTE_*` 신규 SoT 구축은 §72-18 위반이 아니다.** 🔴**재조사 금지** — 뒤집으려면 위 3후보의 정의부 실측을 반증하라.

### D-1 을 이행할 때의 추가 제약 (5-3-3-3 ⓑ 신규 실측)

1. 🔴 **`JourneyBuilder` 의 정의 저장 방식을 Approval 로 답습하지 마라.** 무검증 JSON 저장이 §39 검증 38항목이 걸릴 자리를 통째로 없앴다. Approval Route 는 **Relational Adjacency List + 쓰기 전 검증**.
2. 🔴 **§72-10 계열 위반 4건이 `JourneyBuilder` 에 살아 있다** — `nextNode:811-812`(무라벨 위치 폴백 존치 · `:810` 주석 자인) · `:814`(분기 없으면 첫 후보) · `pickWeighted:729`(첫 키 폴백) · `enroll:198`(`$nodes[0]['id'] ?? 'trigger_1'` = 위치+리터럴 폴백). **286차 실 오발송 장애가 이 계열**(주석 `:801-803`). **`approval` 노드 추가 시 이 분기들을 상속하지 마라.**
   - ★**초판 브리핑 정정**: *"286차가 위치 폴백을 제거"* 는 **부분 오류** — `:809` `if ($hasLabeled) return ''` 는 **라벨 그래프에만** 적용된다. **§22 `BLOCK_ON_NO_MATCH` 는 조건부로만 확립됐다.**
3. 🔴 **§72-11 위반도 실재** — `nextNode:799` **첫 일치 즉시 return** → 다중 일치 무탐지·무기록.
4. ⚠️ **`split` 은 확률이 아니라 결정론이다**(`pickWeighted:725-734` = enrollId 해시 기반 · 주석 `:610-611` 자인). 결론(배타 택일 · parallel fork 아님)은 유효하고 **§4.7 "Chain Selection 은 결정론적"의 선례로 승격**된다.
5. 🔴 **`evalCondition` 의 fail 방향을 이식하지 마라**(정의 `:818` · `:844` `?? null` · `:850` `if ($a===null) return false`) — 마케팅에선 안전하나 **승인에선 미추적 신호가 곧 우회**다.

### 커버리지 (측정기 산출 · 손으로 박은 값 아님)

| 블록 | 편수 | 분모 | cover |
|---|---|---|---|
| 5-3-2(이 ADR) | 84 | 1408 | 51 (3.62%) |
| 5-3-3-1 | 70 | 1427 | 18 (1.26%) |
| 5-3-3-2 | 81 | 1546 | 9 (0.58%) |
| **5-3-3-3** | **16** | **1817** | **0 (0.00%)** |

**네 블록 연속 단조 감소이며 5-3-3-3 에서 처음으로 정확히 0이다.** 우연이 아니라 방향이 있다 — 실행 엔진(5-3-2)엔 `JourneyBuilder` 라는 인접 자산이 있었고, 조직·보고라인으로 갈수록 인접 자산이 사라지다가, **Chain 정의에 이르러선 하나도 없다.**

---

## 2. 정직 등급 (허구 전환 금지)

- **실 코드·테이블·노드 = 0건.** 산출 84편 전부 **계약 명세**다. 5-3-1과 동일하게 **"구축 완료"가 아니라 "계약 명세 확정"**.
- **§82 검증 게이트 실 코드 통과 0/34**(33 `CONTRACT_ONLY` + 1 `NOT_APPLICABLE`). **§65 Lint 28 / §66 Guard 37 전건 `CONTRACT_ONLY`.**
- **§64 Critical Gap 26/26 `NOT_APPLICABLE`** — 🔴 **이 숫자를 "갭 0 = 양호"로 읽지 마라.** **판정 대상 개념 자체가 부재**하다는 뜻이며, 신설 시 26종이 **즉시 High/Critical 로 활성화**된다.
- **가드 등급 3단 분리**(정확한 어휘):
  | 등급 | 현행 |
  |---|---|
  | `WIRED(pre-commit·로컬)` | `.githooks/pre-commit:50`(`scan_secrets.sh --staged`)·`:195-204`(G15). **`core.hooksPath` 미설정 클론에선 미실행** |
  | `WIRED(CI·탐지)` | `security-scan.yml` `repo-guards`(:57·:82 `--range`) · 규칙 SSOT `tools/scan_secrets.sh`(**정규식 CI 복사 금지**) |
  | `ENFORCED(예방)` | 🔴 **현행 레포에 이 등급 없음** — 브랜치 보호 + required check 미설정(G-06b) → **탐지일 뿐 예방 아님**. §65/§66 원문의 "차단하라" **미충족** |

**원문에 없어 비워 둔 축**(지어내지 않음): §35 `value type` **열거 없음** · §36 `status` **enum 없음**(§41 Result Type 14종 복사 = 가장 유혹적인 날조 경로 → 명시 금지) · §55 **필수 필드 축 없음** · §64 항목별 High/Critical 세분 없음 · §67 HTTP 상태 매핑 없음. **§31 #13 `current state` vs #24 `status` 분리 여부 = 원문 근거 없음 → 미확정.**

---

## 3. 무후퇴·영구 규칙

1. **정본 재구현 금지 · 확장만. 기능후퇴 0.** `EquivalenceProof` 선행 없이 통합 금지.
2. **순서 절대**: `executeAction` 상태 게이트 **→** `action_request` 생산자 배선. **뒤집으면 승인 우회 즉시 활성.**
3. **순서 절대**: §63 State Mapping **→** §61 Reconciliation. (Canonical State 없이 대사하면 **항상 MATCH = 가짜녹색**.)
4. **순서 절대**: enrollment 컨텍스트 일반화(생산자 5개소 + 이벤트 축) **→** `approval` 노드.
5. **형태 유사를 커버로 계산 금지**(역산): `journeys` 노드 13종 · `claim*` 5계열 · `pm_tasks` · `AdAdapters::pause`(광고 집행 정지 ≠ 워크플로 일시정지) · Walmart `WM_QOS.CORRELATION_ID` · `DELEGATION_EXCEEDED`(권한 상한 ≠ Task 대결) · OS cron.
6. **`evalCondition` 을 승인에 그대로 이식 금지**: 빈 catch(:834,:842) → null(:844) → **보수적 false**(:850). 마케팅에선 안전(발송 안 함)이나 **승인에선 방향이 반대 — 평가 불능이 곧 통과** → §16 #11(Mandatory Node 우회)을 코드로 구현하는 셈.
7. **`nextNode:799` 첫 일치 return** → **다중 일치 무탐지·무기록** = §18 `multiple match behavior` 최대 무음 구멍.
8. **`nextNode:801-809` 위치 폴백 제거(286차)는 사고 후 확립된 의미론** → §18 `BLOCK_ON_NO_MATCH` 로 **승격**(`VALIDATED_LEGACY`). 원 사고: "조건 불충족 고객을 엉뚱한 분기로 **오발송**". 승인 등가 = **반려를 승인 경로로 라우팅**.
9. **오탐 재플래그 금지**: `pause()` 킬스위치 면제 = **279차 D-P1 의도된 설계** · `ClaudeAI.php` "killswitch 내장" **주석은 실효와 불일치** · `Approvals.jsx:576` `required_approvals` = **매핑 1회 후 참조 0**(dead field) · `AdminGrowth::fail` 에러 봉투 실재("체계 부재"는 **과장**).
10. **주석을 API/실효 근거로 삼지 마라** — `Alerting::dispatch` 팬텀(D-11)이 실증.
11. **SQLite 폴백 호환 유지** — 신규 lease/락·MySQL 전용 ENUM·`FOR UPDATE SKIP LOCKED` 단독 의존 금지.
12. **테넌트 격리 절대** — `admin_growth_approval`(tenant 컬럼 없음)·`paddle_events`(:99) 백필이 선결. **§57 차단#4(Tenant 변경 Migration)은 비교 축이 없어 구현 불가.**
13. **내부 상태변경만으로 완료 선언 금지**(SEG-H2/H5 계열).

---

## 4. 신규 결함 (이 블록에서 확정 · **미수정** · 별도 승인 세션)

| ID | 내용 | 근거 | 등급 |
|---|---|---|---|
| **WF-D1** | `Alerting::executeAction` 승인 우회 — `:612` status **죽은 읽기** → `pending`·`rejected` 실집행 | `Alerting.php:601-660` | 🔴 현재 **VACUOUS**(생산자 0) · **생산자 배선 시 즉시 활성** |
| **WF-D2** | `actor_type` 부재 → **API 키 2개로 Maker-Checker 충족 가능** | 스펙 §20 위배 | 🟠 |
| **WF-D3** | ★**`Mapping::approve` lost update** — `:262` status 검사·`:274-283` dedup 을 **읽고**, `:288` `UPDATE … WHERE id=? AND tenant_id=?` 에 **status/version 가드 없음** | `Mapping.php:255-295`(**PM 직접 재증명**) | 🟠 **정족수 우회 아님**(append=배열 통째 덮어쓰기 → **과소 계수** = fail-safe 방향). 실 해악 = ①**승인 기록 무음 소실**(승인자는 200 수신 → 감사·증명 무결성) ②`applied`→`approved` **상태 역행**(현행 apply 는 멱등 upsert 라 피해 낮음). **G-01이 닫지 못한 잔여** · §36/§42 `lock version` 요구가 겨냥하는 결번의 실증 |
| **WF-D4** | `admin_growth_approval` **tenant_id 컬럼 없음** → 전역 조회·무격리 결정 | `AdminGrowth.php:142-149`·:641·:1306·:1324 | 🔴 |
| **WF-D5** | `acl_permission` `approve` **부여되나 판독 0** → 승인 3핸들러 인가 미검증 | `TeamPermissions.php:39`,:708-717 | 🟠 |
| **WF-D6** | `paddle_events` **tenant_id 없음** | `Paddle.php:99` | 🟠(기지·재확인) |

---

## 5. 결과

- **채택**: D-1~D-18. 산출 84편 = `docs/segmentation/DSAR_APPROVAL_WORKFLOW_*.md`. **코드변경 0 · 배포 없음 · master 미접촉 · 06-A `NOT_CERTIFIED` 불변.**
- **후속 승인 세션 입력**: 선결 3순서(D-6 게이트 · D-10 State Mapping · D-2 enrollment 일반화) → 공용 추출(`Mapping::approve`+`actorId`+`AdminGrowth::fail`/`json` 가시성) → Definition 스토어 → `approval` 노드 → 통지 배선(가시성 승격+recipient resolution) → Lint/Guard `ENFORCED` 승격(**브랜치 보호 선결 = 사용자 결정 G-06b**).
- **전제**: Golden Workflow Dataset + Operator/Node Conformance + Legacy Equivalence Proof + verify + **배포 승인**.

> ★**이 ADR의 최대 산출은 결정이 아니라 뒤집힌 예측이다.** "엔진 부재"(8회차)·"통지 완비"(9회차 초판) 둘 다 **실측이 뒤집었다.** 전자는 두 번째 엔진을, 후자는 **팬텀 메서드 배선**을 낳을 뻔했다. **부재증명은 이름이 아니라 능력으로. 주석은 실효가 아니다.**
