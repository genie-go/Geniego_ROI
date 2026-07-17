# DSAR — Sub-workflow Node (§30)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §30 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Sub-workflow 호출 | **전면 부재** — `sub_journey`·`call_activity`·`sub_workflow`·`subWorkflow`·`child_workflow` **backend/src grep 0**(대소문자 무시) | `NOT_APPLICABLE` |
| 워크플로 정의 테이블 | `workflow_*`·`flow_*`·`wf_*` **grep 0** — **부를 대상(Definition)이 없다** | `NOT_APPLICABLE` |
| Definition Version 고정 | 부재 — 버전 개념 자체가 없음 | `NOT_APPLICABLE` |
| ★유일 실 Flow 엔진 | `JourneyBuilder::advanceEnrollment`(JourneyBuilder.php:498-700+) · 노드 **13종** · **하위 여정 호출 노드 없음** | `KEEP_SEPARATE_WITH_REASON` |
| 순환 방어 선례 | `JourneyBuilder.php:512` — **한 패스 내 재방문 중단(런타임 방어만)** · ★주석이 **"작성자 JSON에 acyclicity 검증 없음"을 자인** | `LEGACY_ADAPTER`(패턴 참조) |

**★축 주의 — §30은 "이름 grep 0"과 "능력 부재"가 **일치**하는 절이다(8회차 오판과 다름).** 8회차에 BPMN/Temporal grep 0 을 "워크플로 엔진 부재"로 확대 해석했다가 **JourneyBuilder라는 실 엔진의 존재로 뒤집힌** 전례가 있다. 그래서 §30은 **이름이 아니라 능력으로 재검증**했다: JourneyBuilder는 실 Flow 엔진이 맞으나, 그 **노드 13종**(trigger·email·kakao·sms·push·webhook·nba·decision·delay·wait·condition·split·exit·attr·goal) 중 **"다른 정의를 호출해 자식 인스턴스를 만들고 결과를 되받는" 능력이 없다**. 더 근본적으로 **워크플로 정의 테이블이 grep 0** 이라 **호출 대상이 존재하지 않는다**. → **이름 부재 + 능력 부재 = 진짜 부재.**

## 1. 원문 전사 + 판정 — `SUB_WORKFLOW` 필수 항목 **원문 12종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | child workflow definition | 정의 테이블 grep 0 — 호출 대상 부재 | `NOT_APPLICABLE` |
| 2 | child workflow version selection | 버전 개념 부재 | `NOT_APPLICABLE` |
| 3 | input mapping | 부재 · 인접 = JourneyBuilder 노드 간 컨텍스트는 `journey_enrollments` 행 공유 — **매핑 아님** | `NOT_APPLICABLE` |
| 4 | output mapping | 부재 | `NOT_APPLICABLE` |
| 5 | tenant compatibility | 부재(자식 호출) · 인접 = 테넌트 격리 규율 REAL(`WHERE ... AND tenant_id=?`) | `LEGACY_ADAPTER` |
| 6 | environment compatibility | 부재 · 인접 = `Db::envLabel()`(278차) — 워크플로 축 미배선 | `NOT_APPLICABLE` |
| 7 | legal entity compatibility | `legal_entity` **grep 0** | `NOT_APPLICABLE` |
| 8 | completion policy | 부재 — 자식 완료 판정 규칙 없음 | `NOT_APPLICABLE` |
| 9 | cancellation propagation | 부재 | `NOT_APPLICABLE` |
| 10 | failure propagation | 부재 · 인접 = `OpenPlatform::emit`(:311-328)은 **예외 절대 미전파**(:325) = 전파 **차단** 선례(역방향) | `KEEP_SEPARATE_WITH_REASON` |
| 11 | timeout | 부재 | `NOT_APPLICABLE` |
| 12 | evidence | 부재 · 인접 = `journey_node_logs`(JourneyBuilder.php:50,:69) 노드 감사 | `LEGACY_ADAPTER` |

**실측 개수: 12 / 12 전사.** 커버리지 = 부재 9 · 어댑터 2 · 별도유지 1 · **현행 충족 0**.
※ 원문 §30 필수 목록은 **`evidence` 로 끝난다** — 12번으로 전사했다(누락 아님).

## 2. 원문 전사 + 판정 — `SUB_WORKFLOW` 차단 항목 **원문 5종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | 순환 Sub-workflow 호출 | 차단 부재 · ★인접 선례 = `JourneyBuilder.php:512` **한 패스 내 재방문 중단** — **런타임 방어만**이고 **정의 시점 acyclicity 검증은 주석이 부재를 자인** | `LEGACY_ADAPTER`(불충분) |
| 2 | Cross-Tenant Child Workflow | 차단 부재 · ⚠️286차 실측 = **`platform_growth` act-as 전역 tenant 하이재킹** 전례(요청시점 tenant 해석이 뒤집힘) | `NOT_APPLICABLE` |
| 3 | Production Parent에서 미승인 Sandbox Child 호출 | 차단 부재 · §28 Production 차단(§16)과 **동일 전제 공유** | `NOT_APPLICABLE` |
| 4 | Mandatory Control이 없는 Child Workflow | 차단 부재 — Mandatory Control 축 자체가 부재 | `NOT_APPLICABLE` |
| 5 | Version 미고정 Child 실행 | 차단 부재 — 버전 개념 부재(필수 2번과 동근) | `NOT_APPLICABLE` |

**실측 개수: 5 / 5 전사.** 커버리지 = 어댑터 1 · 부재 4 · **현행 충족 0**.

## 3. 규칙

- 🔴 **17종(필수 12 + 차단 5) 전부 현행 충족 0 — "있다고 가정"하고 배선 절대 금지.** §30은 **호출 대상(정의 테이블)조차 없는** 완전 결번이다.
- 🔴 **`SUB_WORKFLOW` 는 워크플로 정의(Definition)·버전 고정에 전면 의존한다** — 정의 테이블(grep 0)과 버전 축이 **선행 없이는 §30 착수 불가**. 필수 1·2번과 차단 5번이 **같은 결번의 세 얼굴**이다.
- 🔴 **순환 차단(차단 1번)을 `JourneyBuilder:512` 로 대체 계산하지 마라.** :512는 **한 패스 내 런타임 재방문 중단**이며, **주석이 스스로 "작성자 JSON에 acyclicity 검증 없음"을 자인**한다. Sub-workflow 순환은 **정의 시점 정적 검증**(호출 그래프 DAG 검사)이 필요하다 — 런타임 방어만으로는 **자식이 부모를 부르는 무한 확장**을 막지 못한다. 단 **런타임 방어는 2차 안전망으로 승계**하라(무후퇴).
- 🔴 **Cross-Tenant 차단(차단 2번)은 형식적 규칙이 아니다** — 286차에 **act-as 헤더가 요청시점 tenant 해석을 통째로 뒤집은 실사고**가 있었다. 자식 워크플로의 테넌트는 **부모로부터 상속하되 요청 헤더로 재해석되지 않도록** 고정하라.
- **JourneyBuilder 를 Sub-workflow 호출자로 승격하지 마라(현 단계).** JourneyBuilder는 `customer_id` 필수(:554) **마케팅 여정 도메인**이며, 비-고객 승인을 태우려면 **enrollment 컨텍스트 일반화가 선결**(설계 결론 1). 이 선결 없이 자식 호출을 얹으면 **도메인 오염이 재귀적으로 증폭**된다.
- **`journey_node_logs`(:50,:69)를 evidence(12번) 어댑터로 참조 가능** — 신설 전 확장 검토.
