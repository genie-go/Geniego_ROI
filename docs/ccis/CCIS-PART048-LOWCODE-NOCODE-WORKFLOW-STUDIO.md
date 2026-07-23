# GeniegoROI Claude Code Implementation Specification

# CCIS Part048 — Enterprise Low-Code, No-Code, Workflow Studio & Citizen Development Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Enterprise Low-Code·No-Code·Workflow Studio·Citizen Development 표준을 수립한다.

> ★**성격(스코프 분리 — "도메인 특화 시각 빌더" 실재 vs "범용 Low-Code 플랫폼" 사업범위 밖)**: 이 저장소는
> **마케팅/커머스 ROI SaaS**이지 **범용 Low-Code/No-Code 앱 개발 플랫폼이 아니다**. 명세가 다루는 **범용
> Application Builder·No-Code Screen/UI Builder(drag&drop)·Form Builder(dynamic form)·Component
> Marketplace·Extension SDK·Citizen Development governance·Runtime Sandbox(사용자 코드 실행)**는 이 제품의
> **사업 범위 밖(out of scope)**이라 **부재**한다(grep 0). ★결함이 아니라 정직한 비적용(MEA 064 "out of
> scope"·Part035~047 어휘·**Part032 060 D-2 스코프 분리** 재적용). ★**실재 축(도메인 특화 시각 빌더)**:
> **`JourneyBuilder`**(nodes/edges **워크플로 캔버스**·trigger_type·publish·Visual Workflow Studio 유사·
> Part032)·**`RuleEngine`**(IF-THEN **규칙 디자이너**·metric op value·rule_log·Rule Designer 유사)·
> **`WebPopupCampaign`**(팝업 A/B 빌더)·**`CreativeStudio`/`CreativeStore`**(크리에이티브 빌더)·**`FeedTemplate`**
> (피드/폼 템플릿)·**`action_request`**(승인 빌더 대응)·**Workflow Template**(JourneyBuilder trigger) 는
> 실재한다. ★★**핵심(보안 강점)**: **`RuleEngine`은 선언형(metric·op·value)이지 임의 코드 실행이 아니다** →
> **사용자 코드 실행 Sandbox 부재는 결함이 아니라 공격표면 제거(강점)**다(임의 코드 주입면 0). Part001 §4 에
> 따라 실측 → 범용 Low-Code 플랫폼/Component Marketplace 부재증명 → JourneyBuilder+RuleEngine 성문화했다.
> ★정본=**Part032(워크플로/BPMN·060 D-2)** 승계·"워크플로/규칙 시각 빌더 실재 vs 범용 플랫폼 부재". (문서 차수
> — 코드 무변경.)

---

## 2. 실측 — 현행 시각 빌더 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| Low-Code Platform Architecture | User→Studio→Designer→Runtime→Services | **부분(도메인)** — `JourneyBuilder`(디자인)→저장→cron/`omni_outbox`(런타임). 범용 플랫폼 아님 |
| Application Builder | App ID/Version/독립 배포 | **부재(out of scope)** — 범용 앱 빌더 없음. 앱=고정 SaaS 페이지(109 lazy·135 route) |
| No-Code Builder(Screen/Drag&Drop) | 코드 없이 화면 설계 | **부재(out of scope)** — 화면 빌더 없음. UI=React 페이지(개발자) |
| Visual Workflow Studio | Canvas/Node/Publish/Validation | ★**실재** — `JourneyBuilder`(nodes/edges 캔버스·status draft/active·trigger_type) |
| Form Builder | Dynamic Form/Validation/조건 | **부분(대응물)** — `FeedTemplate`·설정 폼(고정). Dynamic Form 빌더 아님 |
| Rule Designer | Decision/Business Rule/Simulation | ★**실재** — `RuleEngine`(IF-THEN·metric op value·rule_log)·`PriceOpt`(시뮬·po_simulations) |
| UI Builder | Layout/Widget/Theme/Responsive | **부재(out of scope)** — UI 빌더 없음. 반응형=React(개발자·Part frontend) |
| Component Marketplace | Official/Custom/Shared 컴포넌트 | **부재(out of scope)** — 컴포넌트 마켓 없음 |
| Runtime Engine | Workflow/Rule/Dynamic Rendering | ★**부분 준수** — cron/`omni_outbox`(워크플로 실행)·`RuleEngine`(규칙 평가). Dynamic Rendering 아님 |
| Workflow Template | Approval/HR/Procurement/AI Workflow | **부분** — `JourneyBuilder` trigger_type·마케팅 자동화 템플릿. HR/Procurement 템플릿 부재(도메인 밖) |
| Citizen Development | Business User Builder/Guided/Safe Deploy | **부분** — `JourneyBuilder`/`RuleEngine`(현업 시각 설정). 형식 Citizen Dev 거버넌스 부분 |
| Approval Builder | Step/Condition/Escalation/Parallel | **부분(대응물)** — `action_request`+`agent_mode`·high-value 게이트. 시각 승인 빌더 부분 |
| Process Automation | Trigger/Timer/Event/API/Notification | ★**실재** — `RuleEngine`(트리거·액션)·cron(Timer)·`omni_outbox`(이벤트)·`OpenPlatform`(API/webhook) |
| Governance | Design/Publish Review/Cert/Runtime Policy | **부분** — `action_request`(승인)·`SecurityAudit`. 형식 Design Review/Cert 부분 |
| Extension SDK | Custom Widget/Action/Connector/Plugin | **부재(out of scope)** — SDK 없음. 커넥터=핸들러(개발자·Part028) |
| Runtime Sandbox(사용자 코드) | 격리 실행 | ★**부재(보안 강점)** — 사용자 코드 실행 없음(`RuleEngine`=선언형·**임의 코드 주입면 0**) |
| Monitoring | Runtime/Workflow/Rule/Builder Activity | **부분** — journey stats·rule_log·`SystemMetrics`. Builder Activity 부분 |
| Logging | Application/Workflow/User ID | **부분** — `journey_node_logs`·rule_log·`SecurityAudit`. Trace ID 부재 |
| Security(RBAC/Builder Perm/Sandbox/격리) | 사용자 코드 격리 | ★**준수** — RBAC·`TeamPermissions`·**Sandbox 불필요(임의 코드 없음)**·테넌트 격리 |
| Compliance | Low-Code 배포 정책 | **부분** — `SecurityAudit`·`action_request`·테넌트 격리 |
| Disaster Recovery | App/Workflow/Rule 복구 | **부분** — DB 백업(journeys/rules)·`omni_outbox` 재큐 |
| Performance(Component/Runtime/Rule Cache) | 런타임 최적화 | **부분** — 인덱스·HTTP 캐시. Workflow Compilation 부분 |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Visual by Design/Config over Coding/Reusable/Business Driven/Governed/Secure Runtime/Tenant Isolated) | **부분(도메인 빌더축)** | ★Config over Coding(`JourneyBuilder`/`RuleEngine`)·Business Driven·Secure Runtime(임의 코드 없음)·Tenant Isolated. 범용 Visual/Reusable 부분 |
| §4 Low-Code Architecture | **부분(도메인)** | `JourneyBuilder`→cron/`omni_outbox`. 범용 플랫폼 아님 |
| §5 Application Builder | **부재(out of scope)** | 범용 앱 빌더 없음(고정 SaaS 페이지) |
| §6 No-Code Builder | **부재(out of scope)** | 화면 빌더 없음(React 개발자) |
| §7 Visual Workflow Studio | **★실재** | `JourneyBuilder`(nodes/edges·publish) |
| §8 Form Builder | **부분(대응물)** | `FeedTemplate`·설정 폼(고정). Dynamic 빌더 아님 |
| §9 Rule Designer | **★실재** | `RuleEngine`(IF-THEN)·`PriceOpt`(시뮬) |
| §10 UI Builder | **부재(out of scope)** | UI 빌더 없음(React) |
| §11 Component Marketplace | **부재(out of scope)** | 컴포넌트 마켓 없음 |
| §12 Runtime Engine | **부분 준수** | cron/`omni_outbox`·`RuleEngine`. Dynamic Rendering 아님 |
| §13 Workflow Template | **부분** | `JourneyBuilder` trigger(마케팅). HR/Procurement 도메인 밖 |
| §14 Citizen Development | **부분** | `JourneyBuilder`/`RuleEngine`(현업 설정). 형식 거버넌스 부분 |
| §15 Approval Builder | **부분(대응물)** | `action_request`·high-value 게이트. 시각 빌더 부분 |
| §16 Process Automation | **★실재** | `RuleEngine`·cron·`omni_outbox`·`OpenPlatform` |
| §17 Governance | **부분** | `action_request`·`SecurityAudit`. Design Review/Cert 부분 |
| §18 Extension SDK | **부재(out of scope)** | SDK 없음(커넥터=핸들러) |
| §19 Monitoring | **부분** | journey stats·rule_log·`SystemMetrics` |
| §20 Logging | **부분** | `journey_node_logs`·rule_log·`SecurityAudit` |
| §21 Security | **★준수(Sandbox 불필요)** | RBAC·`TeamPermissions`·**임의 코드 없음(Sandbox 불요)**·테넌트 격리 |
| §22 Compliance | **부분** | `SecurityAudit`·`action_request` |
| §23 Disaster Recovery | **부분** | DB 백업·`omni_outbox` 재큐 |
| §24 Performance | **부분** | 인덱스·캐시. Compilation 부분 |
| §25~§26 PHP/Claude(App Builder/Workflow Studio/Rule Engine/Runtime/Marketplace Service) | **부분** | ★`JourneyBuilder`·`RuleEngine`·cron 런타임. App/UI Builder/Marketplace/SDK 부재 |
| §27~§28 검증(lowcode:health/workflow:runtime/component:marketplace) | **대상 없음** | artisan 없음·범용 플랫폼 없음. `/api/journey`·`/v424/rules`·cron 로 대체 |

---

## 4. 확립된 표준 (신규 시각 빌더 코드가 따를 정본)

- ★**워크플로 시각 빌더 정본 = `JourneyBuilder`**(nodes/edges 캔버스·trigger_type·publish·Part032). 신규 자동화 플로우는 이 캔버스 확장(중복 워크플로 엔진 신설 금지). 런타임=cron/`omni_outbox`.
- ★**규칙 디자이너 정본 = `RuleEngine`**(IF-THEN·metric op value·액션·rule_log·Part032). ★**선언형(코드 아님)** — 신규 규칙은 이 엔진 확장(중복 금지·중복 메트릭 inert enforcement 금지). 시뮬레이션=`PriceOpt`(po_simulations).
- ★★**임의 사용자 코드 실행 금지(보안 강점)**: `RuleEngine`은 선언형(metric·op·value·화이트리스트 액션)이지 임의 코드가 아니다. ★**Runtime Sandbox 신설 금지** — 사용자 코드 실행면(eval/코드 주입)을 만들지 않는 것이 정본(공격표면 0·은행급 보안).
- ★**폼/템플릿 = `FeedTemplate`·설정 폼**(고정 스키마). Dynamic Form 빌더 신설 금지(도메인 밖).
- ★**승인 빌더 = `action_request`+`agent_mode`**·high-value 게이트(Part032/042). Process Automation=`RuleEngine`+cron+`omni_outbox`.
- ★**거버넌스·정직**: publish 승인=`action_request`·감사=`SecurityAudit`·테넌트 격리 절대·정직 미산출(거짓 트리거 0·RuleEngine 실데이터 조건).
- ★**사업범위 원칙**: **범용 Low-Code 플랫폼(App/UI Builder/Component Marketplace/Extension SDK/Citizen Dev governance)은 이 제품 범위 밖** — 제품결정 없이 선이식 금지. 도메인 특화 시각 빌더(JourneyBuilder/RuleEngine)만 확장.

---

## 5. 의도적 미적용 + 사유 (정직 보고 — 범용 Low-Code 플랫폼 out of scope)

1. **범용 Application Builder·No-Code Screen/UI Builder(drag&drop)·Form Builder(dynamic)** — 안 함. **사업 범위 밖**(범용 앱 개발 플랫폼 아님·마케팅/커머스 ROI SaaS). UI=React 페이지(개발자).
2. **Component Marketplace·Extension SDK(Custom Widget/Plugin)** — 안 함. **사업 범위 밖**. 커넥터/기능=핸들러(개발자·Part028).
3. **Runtime Sandbox(사용자 코드 실행)** — ★**의도적 부재(보안 강점)**. `RuleEngine`은 선언형(metric·op·value)이지 임의 코드가 아니다. **코드 실행면을 만들지 않는 것이 정본**(공격표면 0·eval/주입 방지).
4. **HR/Procurement 등 범용 Workflow Template·형식 Citizen Development 거버넌스** — 부분. `JourneyBuilder`(마케팅 자동화 도메인)·`action_request` 승인이 대응물. 범용 업무 템플릿 도메인 밖.
5. **`JourneyBuilder`/`RuleEngine` 을 범용 Low-Code 플랫폼으로 오흡수 금지** — 도메인 특화 시각 빌더(마케팅 워크플로/규칙)이지 임의 앱 빌더 아님(060 D-2 스코프 분리).
6. **artisan `lowcode:*`/`workflow:runtime`/`component:marketplace` 명령** — 없음(Slim·범용 플랫폼 없음). `/api/journey`·`/v424/rules`·cron 로 대체.

★**준수하는 실 원칙**: **도메인 시각 빌더(JourneyBuilder 캔버스·RuleEngine 규칙 디자이너)·선언형(임의 코드 없음=보안 강점)·cron/omni_outbox 런타임·action_request 승인·SecurityAudit 감사·거짓 트리거 0·테넌트 격리·정직 미산출·단일 엔진(난립 금지)**. ★**out of scope 정직 선언**: 범용 Low-Code 플랫폼/UI Builder/Component Marketplace/Sandbox 는 이 제품 범위 밖이며 부재는 결함이 아니다(Sandbox 부재는 보안 강점).

---

## 6. Claude Code 구현 규칙

1. 워크플로 시각 빌더=`JourneyBuilder`(nodes/edges) 확장(중복 엔진 금지). 런타임=cron/`omni_outbox`.
2. 규칙 디자이너=`RuleEngine`(IF-THEN·선언형) 확장(중복 금지·inert enforcement 금지). 시뮬=`PriceOpt`.
3. ★★**임의 사용자 코드 실행 Sandbox 신설 금지**(공격표면 0). `RuleEngine`은 선언형(화이트리스트 액션)이지 eval/코드 주입이 아니다.
4. 승인=`action_request`+high-value 게이트. Process Automation=`RuleEngine`+cron+`omni_outbox`. 거짓 트리거 0·테넌트 격리·`SecurityAudit`.
5. ★★**오흡수 금지**: `JourneyBuilder`/`RuleEngine`을 범용 Low-Code 플랫폼으로 표기하지 않는다(도메인 특화·060 D-2).
6. 범용 App/UI Builder/Component Marketplace/Extension SDK/Citizen Dev 플랫폼을 "명세에 있다"는 이유로 이식하지 않는다(`JourneyBuilder`+`RuleEngine`+`action_request` 로 커버).

---

## 7. Completion Criteria

- [x] 시각 빌더 스택 **실측**(범용 App/UI Builder/Component Marketplace/Extension SDK/Sandbox 부재·`JourneyBuilder` 캔버스·`RuleEngine` 규칙 디자이너·cron 런타임 실재)
- [x] 명세 §3~§28 **섹션별 매핑·판정**(범용 Low-Code 플랫폼 **out of scope** 증명·도메인 시각 빌더 실재·060 D-2)
- [x] 실 빌더(JourneyBuilder+RuleEngine+action_request+cron/omni_outbox) 성문화(§4)
- [x] ★도메인 시각 빌더·★★선언형(임의 코드 없음=보안 강점·Sandbox 부재=공격표면 0)·오흡수 차단(JourneyBuilder/RuleEngine≠범용 플랫폼) 명시
- [x] 의도적 미적용 + 사유(§5) — 범용 App/UI Builder/Component Marketplace/Extension SDK/Runtime Sandbox/Citizen Dev governance
- [x] Claude Code 규칙(§6) · `JourneyBuilder`·`RuleEngine`·`action_request`·cron 실 경로 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 실재하는 **도메인 특화 시각 빌더**(`JourneyBuilder` 워크플로 캔버스 +
> `RuleEngine` 규칙 디자이너 + `action_request` 승인 + cron/omni_outbox 런타임)의 성문화이지 범용 Low-Code
> 플랫폼/UI Builder/Component Marketplace 이식이 아니다. ★★**핵심**: **`RuleEngine`은 선언형이지 임의 코드가
> 아니며, Runtime Sandbox 부재는 결함이 아니라 공격표면 제거(보안 강점)**다. ★**out of scope 정직 선언(060
> D-2)**: 범용 Low-Code 플랫폼은 이 ROI SaaS 범위 밖이며 부재는 결함이 아니다.

---

## 다음 Part

**CCIS Part049 — Enterprise Master Data Management (MDM), Reference Data & Data Quality** — ★사전 실측 예고: ★**Part034(데이터 거버넌스/MDM/메타데이터)와 강하게 중복** — 형식 MDM 허브(golden record/survivorship)·Collibra/Alation 은 **부재**이나, MDM 실체는 **`DataPlatform`(Data Source Registry)·`EventNorm`/Unified Data Model(마스터 정규화)·V3 Trust(Data Quality)·CRM dedup(entity matching)·`ChannelRegistry`(참조데이터)·출처 lineage**로 부분 실재(Part034 승계). Part049 도 실측→MDM 허브/golden record 부재증명→DataPlatform+EventNorm+V3 Trust 성문화. ★Part034 중복 명시·"수집≠사용"·삭제vs익명화 재확인.
