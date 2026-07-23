# GeniegoROI Claude Code Implementation Specification

# CCIS Part032 — Workflow Engine, BPMN, Business Rules & Decision Automation Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Workflow Engine·BPMN·Business Rule·Decision Automation 표준을 수립한다.

> ★**성격(스코프 분리 — "워크플로 엔진 실재" vs "형식 BPM 엔진 부재")**: MEA 060 Hyperautomation(PARTIAL)의
> **스코프 분리(D-2)**를 승계한다. ★**실재 축(워크플로 substrate)**: `JourneyBuilder`(정본 워크플로 캔버스·
> **nodes/edges 그래프**·trigger_type·enrollments·current_node **상태**·node 실행로그·MEA 054 워크플로 엔진
> 실재)·`RuleEngine`(정본 **IF-THEN** 룰 스토어+평가기·조건 metric op value·액션 alert/webhook/pause_channel/
> reorder·rule_log·**중복0 SSOT 규율**)·`Decisioning`/`AutoRecommend`(의사결정)·**`action_request`+
> `agent_mode`**(승인 워크플로·Human Task)·cron 스케줄러(Part019·Timer)·`Alerting`(SLA/에스컬레이션)·
> `omni_outbox`(Retry Queue·DLQ replay·Part028) 가 강하게 실재한다. ★**부재 축(형식 BPM)**: 명세의 **BPMN
> 2.0(XML 프로세스)·DMN(Decision Table/DRG)·Saga Orchestration·형식 Compensation·BPM 엔진(Camunda/Flowable/
> Zeebe)**는 **부재**(grep 0). Part001 §4 에 따라 실측 → BPMN/DMN/Saga 엔진 부재증명 → 실 워크플로 substrate
> 성문화했다. ★**"워크플로 엔진은 있다(JourneyBuilder). BPMN 표준 엔진이 없을 뿐이다"** — 두 명제를 스코프
> 분리로 둘 다 참으로 둔다(060 D-2). (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 워크플로 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| Workflow Architecture | Event→Engine→Decision→Task | ★**대응물** — Trigger→`JourneyBuilder`(nodes/edges)→`RuleEngine`/`Decisioning`→액션. 엔진/업무로직 분리 |
| Workflow Engine | 실행/스케줄/상태/재시도/보상 | ★**실재(비-BPMN)** — `JourneyBuilder`(nodes/edges·enrollments·current_node·node logs). 형식 BPMN 엔진 아님 |
| BPMN 2.0 | XML 프로세스 요소 | **부재**(grep 0). nodes/edges JSON 그래프로 대체(BPMN XML 아님) |
| Process Versioning | Process ID/Version/Status | **부분** — `journeys.status`(draft/active)·수정 이력. 형식 BPMN 버전 인스턴스 격리 아님 |
| Business Rule Engine | RuleSet/Priority/Condition/Action | ★**실재** — `RuleEngine` IF-THEN(metric op value·alert/webhook/pause_channel/reorder·rule_log·테넌트격리) |
| DMN | Decision Table/Tree/DRG | **부재(대응물)** — `Decisioning`/`AutoRecommend`(통계/규칙 의사결정). 형식 DMN 테이블/DRG 아님 |
| Decision Table | 조건→결정 매트릭스 | **부분** — `RuleEngine` 조건·`Decisioning` 규칙. 형식 Decision Table 로더 아님 |
| Approval Workflow | Single/Multi/Parallel/Sequential | ★**대응물** — `action_request`+`agent_mode` 승인·high-value 게이트(₩5M↑ 무승인 차단·289차). 형식 다단 승인 부분 |
| Human Task | Assign/Delegate/Escalate | ★**대응물** — `action_request`(사람 승인)·`Alerting` 에스컬레이션. 형식 Task 할당/위임 부분 |
| SLA Management | Due/Escalation/Timeout | **부분** — `Alerting`(임계/에스컬레이션)·cron 마감. 형식 SLA 정책 엔진 부분 |
| Event-driven Workflow | Order/Payment/Shipment 트리거 | ★**부분 준수** — `JourneyBuilder.trigger_type`·pixel/webhook 이벤트·`EventNorm`. 형식 이벤트버스 아님(Part018) |
| Saga Pattern | Orchestration/Choreography | **부재**(grep 0). 분산 트랜잭션 Saga 없음(단일 모놀리스·DB 트랜잭션) |
| Compensation | 보상 트랜잭션 | **부분(도메인)** — 환불(`ReturnsPortal`)·정산 정정·재시도. 형식 Saga Compensation 아님 |
| Timer | Delay/Deadline/Retry Interval | ★**실재** — cron 스케줄러(Part019)·`omni_outbox` 재시도 간격·daypart(RuleEngine) |
| State Machine | 상태 정의 | **부분** — `journeys.status`·enrollment status·정산/주문 status. 형식 상태머신 프레임워크 아님 |
| Workflow Queue | Async/Retry/DLQ | ★**실재** — `omni_outbox`(attempts+backoff)·DLQ replay(`/v39x/admin/dlq/replay`·Part028) |
| Process Monitoring | Running/Failed/SLA 위반 | **부분** — journey stats(entered/completed)·rule_log·`Alerting`. 형식 프로세스 모니터 부분 |
| Business Metrics | 완료시간/승인율/성공률 | **부분** — journey 통계·`Reports`. 형식 워크플로 KPI 부분 |
| Logging | Process/Instance/Task/Trace ID | **부분** — `journey_node_logs`·rule_log·`SecurityAudit`. Trace ID 부재(Part023) |
| Security(RBAC/승인권한/격리/감사) | 권한 워크플로 | ★**준수** — RBAC·`action_request` 승인권한·테넌트 격리·`SecurityAudit` |
| Disaster Recovery | Resume/Queue/State 복구 | **부분** — `omni_outbox` 재큐·DLQ replay·DB 백업. 형식 프로세스 resume 부분 |
| Compliance | ISO9001/27001/변경이력 | **부분** — `SecurityAudit`·변경 이력. 형식 인증 아님 |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Workflow First/Process Driven/Rule Before Code/Event/Human-in-Loop/Idempotent/Compensatable/Versioned) | **부분(substrate 강·형식 BPM 부재)** | ★Rule Before Code(`RuleEngine`)·Human-in-Loop(`action_request`)·Idempotent(`omni_outbox`)·Event. Compensatable(Saga)/Versioned(BPMN) 부재 |
| §4 Workflow Architecture | **★대응물** | Trigger→JourneyBuilder→RuleEngine/Decisioning→액션. 엔진/로직 분리 |
| §5 Workflow Engine | **★실재(비-BPMN)** | `JourneyBuilder` nodes/edges·enrollments·current_node·node logs |
| §6 BPMN 2.0 | **부재** | XML 프로세스 없음. nodes/edges JSON 그래프로 대체 |
| §7 Process Versioning | **부분** | journeys.status·수정 이력. BPMN 버전 인스턴스 격리 아님 |
| §8 Business Rule Engine | **★실재** | `RuleEngine` IF-THEN·조건/액션/rule_log·테넌트격리·중복0 SSOT |
| §9~§10 DMN/Decision Table | **부재(대응물)** | `Decisioning`/`AutoRecommend`·`RuleEngine` 조건. 형식 DMN/DRG 아님 |
| §11 Approval Workflow | **★대응물** | `action_request`+`agent_mode`·high-value 게이트(289차). 다단 승인 부분 |
| §12 Human Task | **★대응물** | `action_request`(사람 승인)·`Alerting` 에스컬레이션. 할당/위임 부분 |
| §13 SLA Management | **부분** | `Alerting`·cron 마감. 형식 SLA 엔진 부분 |
| §14 Event-driven Workflow | **부분 준수** | `JourneyBuilder.trigger_type`·pixel/webhook·`EventNorm`. 이벤트버스 아님 |
| §15 Saga Pattern | **부재** | 분산 트랜잭션 Saga 없음(단일 모놀리스·DB 트랜잭션) |
| §16 Compensation | **부분(도메인)** | 환불/정산 정정/재시도. 형식 Saga Compensation 아님 |
| §17 Timer | **★실재** | cron(Part019)·`omni_outbox` 간격·daypart |
| §18 State Machine | **부분** | journeys/enrollment/주문 status. 형식 상태머신 프레임워크 아님 |
| §19 Workflow Queue | **★실재** | `omni_outbox`(attempts+backoff)·DLQ replay |
| §20~§21 Monitoring/Metrics | **부분** | journey stats·rule_log·`Alerting`·`Reports`. 형식 프로세스 모니터 부분 |
| §22 Logging | **부분** | `journey_node_logs`·rule_log·`SecurityAudit`. Trace ID 부재 |
| §23 Security | **★준수** | RBAC·`action_request` 승인권한·테넌트 격리·`SecurityAudit` |
| §24 Disaster Recovery | **부분** | `omni_outbox` 재큐·DLQ replay·DB 백업. 프로세스 resume 부분 |
| §25 Compliance | **부분** | `SecurityAudit`·변경 이력. 형식 인증 아님 |
| §26~§27 PHP/Claude(Engine/BPMN Parser/Rule Engine/State Machine/DTO) | **부분** | ★`JourneyBuilder`·`RuleEngine`·이벤트 트리거·큐. BPMN Parser/Decision Table Loader 부재 |
| §28~§29 검증(workflow:status/rules:list 등) | **대상 없음** | artisan 없음. `/v424/rules`·`/api/journey`·`action_request` API 로 대체 |

---

## 4. 확립된 표준 (신규 워크플로 코드가 따를 정본)

- ★**워크플로 정본 = `JourneyBuilder`**(nodes/edges 그래프·trigger_type·enrollments·current_node·node logs). 신규 자동화 플로우는 이 캔버스 확장(중복 워크플로 엔진 신설 금지·헌법 V4 워크플로=JourneyBuilder). ★**BPMN XML 이식 금지**(nodes/edges JSON 유지).
- ★**규칙 정본 = `RuleEngine`**(IF-THEN·metric op value·alert/webhook/pause_channel/reorder). 크로스도메인 자동화는 이 엔진 확장. ★**중복0 규율**: 도메인 전용 룰(PriceOpt repricer·SupplyChain risk·AutoCampaign 가드레일)은 각 영역 유지·크로스도메인만 RuleEngine. ★**inert 이중 enforcement 금지**(빈도캡 SSOT=CRM::isMarketingSendAllowed·RuleEngine 중복 메트릭 제거).
- ★**의사결정 = `Decisioning`/`AutoRecommend`** 확장(중복 엔진 금지). ★근거/신뢰도 표시(V4 Explainable)·근거없는 결론 금지.
- ★**승인/Human Task 정본 = `action_request`+`agent_mode`**. 자동집행은 승인정책 경유·**high-value 게이트**(₩5M↑ 무승인 송출 차단·289차)·직접 publish 우회 금지(서버측 강제).
- ★**Timer/Queue = cron 스케줄러 + `omni_outbox`**(Part019/028). 비동기=attempts+backoff·DLQ replay. **Kafka/Camunda 이식 금지**.
- ★**정직 미산출·거짓 트리거 0**: `RuleEngine` 은 실데이터 조건 평가→실 액션(거짓 트리거 0). 테넌트 격리 절대·`SecurityAudit` 기록. 자격증명 게이트(pause_channel 등).

---

## 5. 의도적 미적용 + 사유 (정직 보고)

1. **BPMN 2.0(XML 프로세스 정의·BPMN Parser)** — 안 함. `JourneyBuilder` nodes/edges JSON 그래프가 워크플로 정본. BPMN 표준 엔진=런타임(Camunda/Flowable) 도입.
2. **DMN(Decision Table/DRG·Decision Table Loader)** — 안 함. `Decisioning`/`AutoRecommend`/`RuleEngine` 조건이 의사결정. 형식 DMN 미도입.
3. **Saga Pattern(Orchestration/Choreography)·형식 Compensation** — 안 함. **단일 모놀리스**(Part025)라 분산 트랜잭션 Saga 불요. 보상=도메인 환불/정정/재시도.
4. **BPM 엔진(Camunda/Flowable/Zeebe)** — 안 함. `JourneyBuilder`+`RuleEngine`+`action_request`+cron 이 워크플로 substrate. BPM 엔진=인프라 도입.
5. **형식 State Machine 프레임워크·Process Versioning(인스턴스 격리)·이벤트버스** — 부분. status 컬럼·journey 수정 이력·pixel/webhook/`EventNorm` 트리거가 대응물.
6. **artisan `workflow:*`/`rules:*` 명령** — 없음(Slim). `/v424/rules`·`/api/journey`·`action_request` API 로 대체.

★**준수하는 실 원칙**: **워크플로 엔진 실재(JourneyBuilder nodes/edges·상태·enrollments)·IF-THEN 룰(RuleEngine·중복0·거짓 트리거 0)·Human-in-Loop 승인(action_request·high-value 게이트)·Timer/Queue(cron·omni_outbox·DLQ)·테넌트 격리·SecurityAudit·정직 미산출·단일 엔진(난립 금지)**.

---

## 6. Claude Code 구현 규칙

1. 자동화 플로우=`JourneyBuilder`(nodes/edges) 확장(중복 워크플로 엔진 금지·BPMN XML 이식 금지).
2. 크로스도메인 규칙=`RuleEngine`(IF-THEN) 확장. ★도메인 전용 룰은 각 영역 유지(중복0)·**inert 이중 enforcement 금지**(SSOT 확인).
3. 의사결정=`Decisioning`/`AutoRecommend` 확장(근거/신뢰도 표시). 승인/Human Task=`action_request`+`agent_mode`·high-value 게이트·서버측 강제.
4. Timer/비동기=cron(Part019)+`omni_outbox`(attempts+backoff·DLQ replay). Kafka/Camunda/Flowable 이식 금지.
5. ★거짓 트리거 0(실데이터 조건→실 액션)·테넌트 격리 절대·`SecurityAudit` 기록·자격증명 게이트(pause_channel 등).
6. BPMN 2.0/DMN/Saga/BPM 엔진을 "명세에 있다"는 이유로 이식하지 않는다(JourneyBuilder+RuleEngine+action_request 로 커버·단일 모놀리스). 형식 BPM=엔진 도입 결정 후.

---

## 7. Completion Criteria

- [x] 워크플로 스택 **실측**(BPMN2.0/DMN/Saga/Camunda 부재·`JourneyBuilder` nodes/edges·`RuleEngine` IF-THEN·`action_request` 승인·cron·`omni_outbox` DLQ 실재)
- [x] 명세 §3~§29 **섹션별 매핑·판정**(BPMN/DMN/Saga 엔진 부재 증명·워크플로 substrate 강함)
- [x] 실 워크플로(JourneyBuilder+RuleEngine+Decisioning+action_request+cron+omni_outbox) 성문화(§4)
- [x] ★스코프 분리(060 D-2 "워크플로 엔진 실재 vs BPM 엔진 부재")·중복0·거짓 트리거 0·Human-in-Loop 승인·테넌트 격리 명시
- [x] 의도적 미적용 + 사유(§5) — BPMN2.0/DMN/Saga/BPM엔진/State Machine 프레임워크
- [x] Claude Code 규칙(§6) · `/v424/rules`·`/api/journey`·`action_request` 실 경로 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 **워크플로 엔진(JourneyBuilder)+IF-THEN 룰(RuleEngine)+승인
> (action_request)+Timer/Queue(cron·omni_outbox)** substrate 의 성문화이지 BPMN 2.0/DMN/Saga/Camunda 이식이
> 아니다. ★**스코프 분리(MEA 060 D-2)**: "워크플로 엔진은 실재한다(JourneyBuilder). 형식 BPM 표준 엔진이 없을
> 뿐이다" — 두 명제를 둘 다 참으로 둔다.

---

## 다음 Part

**CCIS Part033 — Notification Platform, Omnichannel Messaging & Communication** — ★사전 실측 예고: 형식 통합 Notification Platform(단일 추상화 계층)은 **부분**이나, 발송 실체는 **`Omnichannel`(옴니채널 outbox·attempts+backoff)·`NotifyEngine`·Email(Postfix+OpenDKIM·`Mailer`/`SmtpClient`)·SMS(`NaverSms` SENS)·`WebPush`(APNs/FCM·HKDF)·Kakao 알림톡/친구톡(`KakaoChannel`)·`WhatsApp`·`Line`·`InstagramDM`·`Alerting`(Slack)·템플릿·`PreferenceCenter`(수신동의)·빈도캡 SSOT(`CRM::isMarketingSendAllowed`)**로 강하게 실재. Part033 도 실측→형식 플랫폼 계층 판정→실 발송 스택 성문화. ★203차 발송 인프라(SPF/DKIM/DMARC DNS 미완)·빈도캡 단일 SSOT 승계.
