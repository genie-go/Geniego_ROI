# DSAR — Condition Reference (§19)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §19 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_WORKFLOW_CONDITION_REFERENCE` | **backend/src grep 0** | `NOT_APPLICABLE`(부재 → 신설) |
| 현행 조건의 실체 | **참조가 아니라 인라인 평가.** `evalCondition`(JourneyBuilder.php:818-846) — `node['config']` 의 `{field, op, value}`(:821-823)를 읽어 **그 자리에서 판정** · 외부 조건 정의를 **참조하지 않는다** | `KEEP_SEPARATE_WITH_REASON`(마케팅 여정 · **참조 축 자체가 부재**) |
| 평가 가능 사실 | **5종 하드코딩**: `revenue`(:826 enrollment) · `grade`·`ltv`(:829-833 `crm_customers`) · `email_opened`·`email_clicked`(:837-841 `email_sends`). 🔴 **그 외 전부 `null` → 보수적 false**(:844) | `KEEP_SEPARATE_WITH_REASON` |
| 연산자 | 8종 `compare`(:848-860) — `eq/==`·`neq/!=`·`gt/>`·`gte/>=`·`lt/<`·`lte/<=`·`contains`·default(`==`) | `LEGACY_ADAPTER`(**Canonical DSL 6operator 상위호환** — Part 2 설계명세 정합) |
| 조건 버전 | **부재.** config 변경 = `nodes` 통째 덮어쓰기(`updateJourney` :153) → 평가 시점의 조건이 무엇이었는지 **복원 불가** | `NOT_APPLICABLE` |
| `expected result` | 부재 — 조건이 **무엇을 반환해야 하는가**를 선언하는 축 없음(`evalCondition` 은 항상 `'true'`/`'false'` 문자열) | `NOT_APPLICABLE` |
| `failure behavior` | **부재 · 암묵 강등.** 빈 catch 2곳(:834 crm_customers · :842 email_sends)이 **DB 실패를 삼켜** 사실 부재로 만들고 :844 가 **`null` → `compare` :850 `return false`** — **실패와 "조건 불충족"이 구별 불가** | `NOT_APPLICABLE`(🔴 아래 ★) |
| `stale data behavior` | **부재.** `evalCondition` 은 데이터 신선도를 **묻지 않는다**. 인접 자산 = V3 Intelligence Readiness(`READY`/`WARNING`/`BLOCKED` · DataTrust) — **조건 평가에 미배선** | `LEGACY_ADAPTER`(배선만) |
| `timeout behavior` | **부재.** DB 조회 2건(:829,:837) 타임아웃 없음 | `NOT_APPLICABLE` |
| `evidence capture` | 부재(조건) · **선례 REAL** = `logNode(...'condition','evaluated',['branch'=>$branch])`(:601) — 🔴 **결과만 기록 · 입력 사실(`$facts`)·조건 원문 미기록** → **왜 그렇게 판정됐는지 재구성 불가** | `LEGACY_ADAPTER`(확장 필요) |
| 외부 결정 서비스 | 부재(조건) · 인접 = `ClaudeAI` · `Decisioning`(집계 코호트·PII 없음) — **승인 조건 미배선**. ⚠️`ClaudeAI.php` "killswitch 내장" **주석은 실효와 불일치**(주석만 읽으면 오판) | `KEEP_SEPARATE_WITH_REASON` |

### ★축 주의 ① — `evalCondition` 은 Condition **Reference** 가 아니다

| 축 | `evalCondition`(:818-846) | 원문 §19 |
|---|---|---|
| 정의 위치 | **노드 config 안**(`{field,op,value}`) | **외부 조건 정의**(`condition id` + `condition version` 으로 참조) |
| 재사용 | 불가(노드마다 복붙) | 참조 — 하나의 조건을 다수 노드/엣지가 공유 |
| 출처 구분 | 없음(전부 CRM 사실) | **12종 `condition source type`** |
| 실패 처리 | 암묵 `false` 강등(빈 catch) | `failure behavior` **선언** |
| 버전 | 없음 | `condition version` |

**형태 유사 ≠ 의미 동일.** "조건 평가 기능이 있다"는 사실은 **§19 커버가 아니다** — §19 의 핵심은 평가가 아니라 **참조·버전·실패 계약**이다.

### ★축 주의 ② — `failure behavior` 부재는 마케팅에선 안전, 승인에선 반대다

`evalCondition` :834/:842 빈 catch → :844 `null` → `compare` :850 `if ($a === null) return false`. 마케팅 여정에서 이 **보수적 false** 는 안전하다(발송 안 함 = 손해 없음). **승인 도메인에서는 방향이 반대다** — "조건 평가 실패"가 `false` 로 흘러 **분기가 진행**되면, **평가 불능이 곧 통과**가 될 수 있다. 🔴 이 패턴을 승인에 이식하면 **§16 #11(Mandatory Node 우회) 을 코드로 구현하는 것**이다.

### ★축 주의 ③ — 필수 필드가 `evidence` 로 끝나지 않는다 (원문 그대로)

§19 필수 필드 목록의 **말미는 `status`(12번)이며 `evidence` 항목이 없다.** 대신 `evidence capture`(11번)가 있다. 이는 §18 과 동일한 편차이며, `evidence` 로 끝나는 §15(15축)·§17(20축) 관례와 **다르다**. 🔴 **관례에 맞춰 13번째 `evidence` 를 임의 추가하지 않았다**(규율 4: 숫자를 조용히 맞추지 마라). 편차의 의도 여부는 본 문서가 판단할 사안이 아니다 — **사실만 기록한다.**

## 1. 원문 서술 전사

> 이번 단계에서는 조건 실행 Contract와 Hook을 구축한다.
>
> 상세 Dynamic Rule Engine은 후속 단계에서 완성한다.

**판정: 본 단계의 범위는 `CONTRACT_ONLY` 다.** 🔴 §19 를 근거로 **룰 엔진을 구현하지 마라** — 원문이 명시적으로 후속 단계로 미룬다. 본 단계 산출은 **계약(필드 12축) + Hook(source type 12종의 진입점)** 뿐이다.
⚠️ **EPIC 06-A Part 2 에 이미 Canonical Schema/DSL/RuleEngine 설계명세(d0665762b56)가 선영속되어 있다** — 후속 Dynamic Rule Engine 은 **그 정본의 확장**이지 신규 엔진이 아니다(🔴 중복 엔진 금지).

## 2. 원문 전사 + 판정 — 필수 필드 **원문 12축**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | condition_reference_id | 부재 | `NOT_APPLICABLE` |
| 2 | workflow_version_id | 부재(§9) | `NOT_APPLICABLE` |
| 3 | node or edge reference | 부재 · 🔴 현행 조건은 **노드에만** 붙는다(`node['config']`) — 엣지 조건 개념 없음(§15 #7) | `NOT_APPLICABLE` |
| 4 | condition source type | 부재(아래 12종 전부) | `NOT_APPLICABLE` |
| 5 | condition id | 부재 — 조건이 **식별자를 갖지 않는다**(익명 인라인) | `NOT_APPLICABLE` |
| 6 | condition version | 부재 · `nodes` 덮어쓰기(:153) → **평가 당시 조건 복원 불가** | `NOT_APPLICABLE` |
| 7 | expected result | 부재 · `evalCondition` 은 항상 `'true'`/`'false'` 고정 반환 | `NOT_APPLICABLE` |
| 8 | failure behavior | **부재 · 암묵 `false` 강등**(빈 catch :834,:842 → :844 null → :850 false) — 실패와 불충족 구별 불가 | `NOT_APPLICABLE`(🔴 ★축 주의 ②) |
| 9 | stale data behavior | 부재 · 인접 = V3 Intelligence Readiness(`READY`/`WARNING`/`BLOCKED`) **미배선** | `LEGACY_ADAPTER`(배선만) |
| 10 | timeout behavior | 부재 · DB 조회(:829,:837) 타임아웃 없음 | `NOT_APPLICABLE` |
| 11 | evidence capture | 부분 · `logNode`(:601)가 **결과 `branch` 만** 기록 — 입력 사실·조건 원문 미기록 | `MIGRATION_REQUIRED` |
| 12 | status | 부재(조건 레벨) | `NOT_APPLICABLE` |

**실측 개수: 12 / 12 전사.** ★**원문 목록 말미는 `status` 이며 `evidence` 항목이 없다 — 임의 추가하지 않았다**(★축 주의 ③). 커버리지 = 신설 10 · 어댑터 1 · 이관 1.

## 3. 원문 전사 + 판정 — Condition Source Type **원문 12종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | APPROVAL_POLICY | **부재.** 🔴 현행 승인 4종은 정책이 **코드 상수**: `Mapping` INSERT 리터럴 `2`(:209) · `Alerting` 응답 하드코딩 `2`(:562) · `AdminGrowth` 단일결재 암묵. 정책 테이블 0 | `NOT_APPLICABLE` |
| 2 | AUTHORIZATION_POLICY | 부재(조건 소스) · 인접 = RBAC 4역할 + 스코프(index.php) — **엔드포인트 단위**, 조건 평가 소스로 미배선 | `LEGACY_ADAPTER`(배선만) |
| 3 | BUSINESS_RULE | 부재(선언) · 인접 = Part 2 Canonical Schema/DSL/RuleEngine **설계명세만**(d0665762b56 · 코드 0) | `CONTRACT_ONLY` |
| 4 | FINANCIAL_RULE | 부재(조건) · 인접 실자산 = 서버 P&L SSOT + VAT(267차) · `Mmm::frontier` — **조건 소스로 미배선** | `LEGACY_ADAPTER`(배선만) |
| 5 | RISK_RULE | 부재(조건) · 인접 = V3 Fake/Bot/Spam/Fraud/Duplicate/Anomaly 검증 · `AnomalyDetection` — **미배선** | `LEGACY_ADAPTER`(배선만) |
| 6 | CONTRACT_RULE | 부재 · 인접 = `DigitalShelf` 계약(268차) — **도메인 상이**(채널 진열 계약) | `KEEP_SEPARATE_WITH_REASON` |
| 7 | RESOURCE_ATTRIBUTE | 부재(선언) · 유사 = `evalCondition` 이 `crm_customers` 에서 `grade`/`ltv` 직접 SELECT(:829-833) — **참조가 아니라 하드코딩** | `KEEP_SEPARATE_WITH_REASON` |
| 8 | REQUEST_ATTRIBUTE | 부재 · 유사 = `$enr['revenue']`(:826) — enrollment 속성, 승인 요청 속성 아님 | `NOT_APPLICABLE` |
| 9 | WORKFLOW_VARIABLE | **부재 · 개념 전무**(§17 #6 `variable mappings` grep 0 과 짝) | `NOT_APPLICABLE` |
| 10 | EXTERNAL_DECISION_SERVICE | 부재 · 인접 = `ClaudeAI`·`Decisioning` — 승인 조건 미배선. ⚠️`ClaudeAI.php` "killswitch 내장" 주석은 **실효와 불일치** | `KEEP_SEPARATE_WITH_REASON` |
| 11 | MANUAL_REFERENCE | 부재 · §12 #5 `HUMAN_TASK` 부재와 짝 | `NOT_APPLICABLE` |
| 12 | CUSTOM | 부재 | `NOT_APPLICABLE` |

**실측 개수: 12 / 12 전사.** 커버리지 = `NOT_APPLICABLE` 5(#1,#8,#9,#11,#12) · `LEGACY_ADAPTER` 3(#2,#4,#5) · `KEEP_SEPARATE_WITH_REASON` 3(#6,#7,#10) · `CONTRACT_ONLY` 1(#3). **합계 5+3+3+1 = 12 ✅**(표가 정본 · 항목번호까지 대조 완료).

## 4. 규칙

- 🔴 **본 단계는 `CONTRACT_ONLY` 다 — 룰 엔진 구현 금지.** 원문이 "상세 Dynamic Rule Engine은 후속 단계에서 완성한다"고 명시한다. 산출은 **계약 12축 + Hook 12종 진입점**까지.
- 🔴 **후속 Rule Engine 은 신규가 아니라 Part 2 Canonical Schema/DSL/RuleEngine 정본(d0665762b56)의 확장이다.** 중복 인텔리전스/엔진 난립 금지(데이터 헌법 V3·V4).
- **조건은 참조되어야 한다 — 인라인 금지.** `evalCondition` 처럼 `{field,op,value}` 를 노드에 박으면 **(a) 재사용 불가 (b) 버전 불가 (c) 평가 당시 조건 복원 불가**다. §19 #5 `condition id` + #6 `condition version` 이 이를 닫는다.
- 🔴 **`failure behavior`(#8)의 기본값은 fail-closed 다.** 현행 빈 catch(:834,:842) → `null` → **보수적 false**(:850) 패턴을 **승인에 이식 금지** — 마케팅에선 "발송 안 함"으로 안전하지만 승인에선 **평가 불능이 통과가 된다**. **Unknown ≠ Pass** (Part 3-2 Eligibility Engine 의 `Unknown≠Eligible` 규율과 동일 · Fail-closed).
  ★정본 참조 구현 = `Mapping::actorId`(289차 신설) — **미확인 신원 → null → 403 fail-closed**. 이것이 이 레포의 검증된 fail-closed 형태다.
- **`stale data behavior`(#9)는 신설 금지·배선만.** V3 Intelligence Readiness(`READY`/`WARNING`/`BLOCKED`)가 정본이다 — **수집≠사용**. 🔴 신선도 판정기를 새로 만들면 V3 헌법의 단일 엔진 원칙 위배.
- **`evidence capture`(#11)는 `logNode`(:601) 확장이다.** 현행은 **결과(`branch`)만** 기록해 **"왜 그렇게 판정됐는가"가 재구성 불가**다. 승인 도메인은 **입력 사실 + 조건 원문 + 조건 version + 결과**를 함께 기록해야 한다(Explainable AI 원칙 · V4). 🔴 조건 전용 감사 테이블 신설 금지 — `journey_node_logs`(:50,:69) 확장.
- **`APPROVAL_POLICY`(#1)가 §19 에서 가장 중요한 결번이다.** 현행 정족수는 **전부 코드 상수**(`Mapping` :209 리터럴 `2` · `Alerting` :562 하드코딩 `2` · `AdminGrowth` 단일결재 암묵)여서 **조건으로 참조할 대상이 존재하지 않는다**. 승인 정의(Definition) 신설이 **§19 의 선결 조건**이다.
  🔴 **단 정족수 로직 자체는 신설 금지** — `Mapping.php:245-290` 5단 규율(위조불가 신원 fail-closed → 자기승인 차단 → 승인자 dedup → 비-pending 409 → 정족수)을 **공용 트레이트/서비스로 추출**하라. 재작성 시 **289차 G-01 이 닫은 우회로(익명 2회 = 정족수)를 다시 연다.**
  🟠 **선결 결함**: `actor_type` 축 부재 → `apikey:` 와 `user:` 가 정족수에 **동등 계수** → **API 키 2개로 Maker-Checker 충족 가능**(스펙 §20 위배).
- **`AUTHORIZATION_POLICY`(#2)를 엔드포인트 RBAC 로 대체 금지** — "이 API 를 호출할 수 있는가" ≠ "이 조건이 참인가". 축이 다르다(§17 #14-15 와 동일 논리).
- **`FINANCIAL_RULE`(#4)/`RISK_RULE`(#5) 은 배선만.** P&L SSOT+VAT(267차) · Mmm frontier(270차) · V3 이상탐지가 실자산이다. 🔴 승인용 재무/리스크 계산기 신설 금지 — **동일 값이 두 곳에서 산출되면 값 단일소스 원칙 위배**.
- **`EXTERNAL_DECISION_SERVICE`(#10) 배선 시 V3 게이트 필수** — AI 는 **READY 통과 데이터만** 사용하고 **모든 추천에 근거/신뢰도 표시**(V4 Explainable AI). 🔴 근거 없는 조건 판정 금지. ⚠️ `ClaudeAI.php` 의 "killswitch 내장" **주석은 실효와 불일치** — 주석을 근거로 안전하다고 판단하지 마라.
- **`WORKFLOW_VARIABLE`(#9)은 §17 #6 `variable mappings` 선행 필수** — 변수 없이 source type 만 선언하면 **영원히 참조 불가한 죽은 열거값**이다(`action_request` 의 `required_approvals:2` 가 정확히 그 형태 — 응답에 실리나 **매핑 1회 후 참조 0** · `Approvals.jsx:576` dead field).
- 🔴 필드 `NOT_APPLICABLE` 10축 · Source Type `NOT_APPLICABLE` 5종 **"있다고 가정"하고 배선 금지**.
