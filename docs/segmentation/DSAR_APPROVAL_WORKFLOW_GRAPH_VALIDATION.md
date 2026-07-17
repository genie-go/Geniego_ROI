# DSAR — Graph Validation (§16)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §16 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 그래프 검증 계층 | **부재.** `orphan`/`unreachable`/`dead_end`/`acyclic`/`reachab`/`infinite_loop`/`graph_valid` **backend/src 전수 grep — 그래프 검증 히트 0**(Dsar.php `$unreachable` = DSAR 삭제 도달불가 테이블 · Wms `consolidateOrphanStock` = 고아 재고 · LiveCommerce `reachable` = WHIP/WHEP 엔드포인트 생존 — **전부 축 다름**) | `NOT_APPLICABLE`(부재 → 신설) |
| 정의 저장 시 검증 | **0.** `createJourney`(JourneyBuilder.php:112-138) · `updateJourney`(:141-166) 모두 요청 본문 `nodes`/`edges` 를 **`json_encode` 하여 그대로 INSERT/UPDATE**(:135 · :153-154) — 노드/엣지 **구조 검증 전무** | `NOT_APPLICABLE` |
| 활성화 게이트 | **0.** `updateJourney` :163 `status=:status` — **임의 status 를 무검증 수용**(전이 규칙·활성화 전 검증 없음) | `NOT_APPLICABLE` |
| 순환 처리 | **런타임 방어만.** `advanceEnrollment` :511-518 — `$guard++ < 100` 상한 + `$seen[$nodeId]` 재방문 시 `cycle_detected` 로그 후 `break`. ★**:512 주석이 "작성자 JSON에 acyclicity 검증 없음"을 자인** | `LEGACY_ADAPTER`(**런타임 안전망** — 작성 시 검증의 대체물 아님) |
| Node/Edge Code 중복 | **미검증.** `findNode`(:718)는 **선형 스캔 후 첫 일치 반환** → 중복 id 는 **조용히 첫 노드만 실행**(오류 아님) | `NOT_APPLICABLE` |
| Version Immutable Hash | 부재(§9 Version 자체 부재) · 인접 선례 = `Migrate.php:50` `hash('sha256',$sql)` + `schema_migrations.checksum`(:145) · `CreativeStore` `content_hash` UNIQUE dedup(Db.php:1277) | `LEGACY_ADAPTER`(**해시 무결성 패턴의 실 선례** — 워크플로용 아님) |
| Masking Policy | **선언 부재 · 구현 산재.** `mask*()` **13파일 47건**(ChannelCreds:162 · WmsCctv:112 · UserAuth:2381 maskEmail/:2571 maskPhone · CRM:840 · BillingMethod:186 maskCard · OpenPlatform:117 maskSecret · DataExport:109 maskConfig · LicenseKeyUtils:93) — **전부 응답 직전 인라인**, 변수 단위 선언적 정책 0 | `LEGACY_ADAPTER`(마스킹 능력은 REAL · **정책 축은 부재**) |
| Cross-Tenant Sub-workflow | **Sub-workflow 자체 부재**(`sub_journey`/`call_activity` grep 0) → 검증 대상 없음 | `NOT_APPLICABLE` |
| Restricted Script Node | 부재(§12 #9 `SCRIPT_TASK_RESTRICTED` = `NOT_APPLICABLE`) | `NOT_APPLICABLE` |

### ★핵심 대조 — "순환 감지가 있다"는 오독이다

JourneyBuilder :512 은 **레포 유일의 그래프 안전 장치**이며, 그래서 **가장 정확히 대조해야 한다**.

| 축 | JourneyBuilder :511-518 | 원문 §16 요구 |
|---|---|---|
| **시점** | **런타임**(enrollment 이 그 노드를 실제로 밟을 때) | **활성화 전**("Workflow Version 활성화 전에 다음을 검증하라") |
| **범위** | **한 advance 패스 내 재방문**만 | **정의 전역**(Start→Terminal 도달가능성·고아·데드엔드) |
| **결과** | 해당 enrollment **1건 중단** + `cycle_detected` 로그 | **활성화 거부**(불량 정의가 애초에 실행되지 않음) |
| **미탐지** | 순환이 **실행되기 전까지 아무도 모른다.** 순환 없는 고아/데드엔드/미도달 노드는 **영원히 미탐지** | 전부 사전 탐지 |
| **자인** | ★`:512` 주석 원문 — "작성자 JSON에 **acyclicity 검증 없음**" | — |

**판정: `LEGACY_ADAPTER`(런타임 안전망)이지 §16 커버가 아니다.** 🔴 이를 "무한 Loop 위험 탐지 충족"으로 계산하면 **역산**이다. 원문은 **활성화 전 정적 검증**을 요구하고, 현행은 **실행 중 1건 손절**이다 — **축이 다르다**. 다만 :512 는 **정적 검증이 부재할 때 무엇이 남는지의 실증**이므로 **런타임 이중 게이트의 근거로는 보존·재사용**한다.

## 1. 원문 전사 + 판정 — 검증 항목 **원문 21종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | 정확한 Start Node 존재 | 부재 · `createJourney` 기본 노드에 `trigger_1` 1개(:121)는 **관례일 뿐 강제 아님**(사용자 `nodes` 로 덮어쓰기 가능 :135) | `NOT_APPLICABLE` |
| 2 | 최소 하나의 Terminal Node 존재 | 부재 · 현행은 **엣지 소진 시 암묵 종료**(`nextNode` :790 `if (!$cand) return '';`) — Terminal 선언 없음 | `NOT_APPLICABLE` |
| 3 | Start에서 Terminal까지 도달 가능 | 부재(grep 0) | `NOT_APPLICABLE` |
| 4 | Orphan Node 없음 | 부재 · 🔴 `findNode` :718-? 미발견 시 `$nodeId=''` **조용히 종료**(:520) — 고아는 오류가 아니라 무음 | `NOT_APPLICABLE` |
| 5 | Unreachable Node 없음 | 부재(grep 0) | `NOT_APPLICABLE` |
| 6 | Dead-end Non-terminal Node 없음 | 부재 · **데드엔드와 정상 종료가 구분 불가**(둘 다 `nextNode` → `''`) | `NOT_APPLICABLE` |
| 7 | Edge Source·Target 유효 | 부재 · 존재하지 않는 `to` 를 가리켜도 **저장 성공**(:154) → 실행 시 무음 종료 | `NOT_APPLICABLE` |
| 8 | Gateway Default Path 규칙 충족 | 부재 · **Gateway 개념 자체 grep 0**(§18) | `NOT_APPLICABLE` |
| 9 | 무한 Loop 위험 탐지 | **런타임만** — `$guard++ < 100`(:511) + `$seen` 재방문 break(:514-517). ★:512 이 "작성자 JSON에 acyclicity 검증 없음" 자인 | `LEGACY_ADAPTER`(**정적 검증 아님** · 축 다름) |
| 10 | Loop에 종료 조건 존재 | 부재 · 현행은 종료 조건을 **요구하지 않고 상한(100)으로 손절** | `NOT_APPLICABLE` |
| 11 | Mandatory Node 우회 경로 없음 | 부재 · 🔴 **정확한 반례 보유**: `Alerting::executeAction`(:612)이 status SELECT 후 미판독 → 승인 노드 우회 실집행(현재 VACUOUS · 생산자 배선 시 활성) | `NOT_APPLICABLE` |
| 12 | Cross-Tenant Sub-workflow Reference 없음 | Sub-workflow 부재 → 검증 대상 없음. ⚠️ 단 **테넌트 누락 선례는 실재**(`admin_growth_approval` tenant_id 없음 · `paddle_events` tenant_id 없음 Paddle.php:99) | `NOT_APPLICABLE` |
| 13 | Production에서 Restricted Script Node 없음 | 부재 · §12 #9 와 짝(노드 타입 자체 부재 → 차단 대상 없음) | `NOT_APPLICABLE` |
| 14 | Approval Requirement 없는 Approval Task 없음 | 부재 · 🔴 **현행이 정확히 이 반례**: `action_request` 정족수 **컬럼 없음** · `Alerting:562` 리터럴 `2` 는 응답 장식 · `decideAction` 은 **1명에 approved** = **요건 없는 승인 태스크가 이미 존재** | `NOT_APPLICABLE` |
| 15 | Assignment Hook 없는 Human Task 없음 | 부재 · Human Task/배정/클레임 개념 전무(§12 #5) | `NOT_APPLICABLE` |
| 16 | Error Boundary 없는 Critical System Task 경고 | 부재 · Error Boundary 부재(§12 #24) | `NOT_APPLICABLE` |
| 17 | Retry Policy 없는 External Service Task 경고 | 부재(선언) · **재시도 능력은 REAL**: `AdAdapters::retryDeliveryDlq`(:1187-1228 maxAttempts 5 · `600*2^n` 86400s 캡) · `OpenPlatform`(:466-471) · `Omnichannel`(:365 백오프 없음) — 🔴 **3공식 병존 · 선언적 정책 0** | `LEGACY_ADAPTER`(능력 존재 · 정책 축 부재) |
| 18 | 민감 Variable의 Masking Policy 존재 | 부재(정책) · **마스킹 구현은 13파일 47건 REAL**(ChannelCreds:162 · WmsCctv:112 · UserAuth:2381/:2571 · BillingMethod:186 …) — 전부 응답 직전 인라인 | `LEGACY_ADAPTER` |
| 19 | Node Code 중복 없음 | 부재 · `findNode`(:718) **첫 일치 반환** → 중복 id 조용히 통과 | `NOT_APPLICABLE` |
| 20 | Edge Code 중복 없음 | 부재 · edge_code 개념 자체 없음(§15 필드 #3) | `NOT_APPLICABLE` |
| 21 | Version Immutable Hash 유효 | 부재(§9) · **해시 무결성 선례 존재** = `Migrate.php:50` sha256 + `schema_migrations.checksum`(:145) · `uq_creative_hash` UNIQUE(Db.php:1277) | `LEGACY_ADAPTER`(패턴만) |

**실측 개수: 21 / 21 전사.** 커버리지 = 신설 17 · 어댑터 4. **§16 전 항목 중 원문 요구(활성화 전 정적 검증)를 충족하는 항목은 0이다.**

## 2. 규칙

- 🔴 **"순환 감지가 있으니 §16 #9 충족"은 역산이다.** JourneyBuilder :512 는 **런타임 1건 손절**이고 원문은 **활성화 거부**다. 주석이 스스로 "작성자 JSON에 acyclicity 검증 없음"이라 자인한다 — **자인을 커버로 뒤집지 마라.** 8회차에 "이름 grep 0"을 능력 부재로 오독해 뒤집힌 것의 **정확한 대칭 오류**(능력 존재를 요구 충족으로 오독)다.
- **검증은 활성화 게이트여야 한다.** 현행 `updateJourney` :163 `status=:status` 는 **임의 status 무검증 수용**이다. §16 은 `status: active` 전이 지점에 **21항 전체를 통과해야만** 허용하는 게이트를 요구한다. 🔴 저장 시 검증(`createJourney`)만으로는 불충분 — **활성화 시점**이 정본이다.
- **정적 검증 + 런타임 방어 = 이중 게이트. 택일 금지.** :511-518 의 `$guard`/`$seen` 은 **제거 대상이 아니라 존치 대상**이다(정적 검증을 통과한 정의도 데이터 조건에 따라 폭주할 수 있다 — §4.8). 무후퇴 원칙.
- 🔴 **§16 #11·#14 는 "미래에 막을 것"이 아니라 "이미 뚫려 있는 것"이다.**
  - #14 반례 = `action_request` 정족수 컬럼 없음 + `listActionRequests` 가 `required_approvals:2` 를 응답하나 `decideAction` 은 **1명에 approved** → **응답 계약 위반이 이미 존재**.
  - #11 반례 = `Alerting::executeAction`(:612) status 죽은 읽기 → `pending`/`rejected` 실집행.
  - 둘 다 **`INSERT INTO action_request` grep 0 → 현재 VACUOUS**(생산자 전무)이나 **생산자 배선 시 즉시 활성**. **별도 승인세션 대상 · 참조 구현으로 삼지 마라.**
- **Masking Policy(#18)는 신설이 아니라 선언 축의 추가다.** 마스킹 **능력**은 13파일 47건으로 REAL — 🔴 **14번째 mask 함수 신설 금지**(AL-19). 필요한 것은 `mask*()` 호출이 아니라 **변수 단위 정책 선언 + §17 `variable mappings` 연동**이다.
- **Retry Policy(#17)도 동일** — 능력 REAL·공식 3종 병존. 신설분은 **`AdAdapters:1221` 공식(`600*2^n`·86400s 캡·maxAttempts 5) 채택**. 🔴 4번째 백오프 공식 금지.
  ★**defer≠실패 규율 보존**(Omnichannel:349,362 — quiet_hours/sto_defer 는 attempts 미증가) · ★**honest pending 보존**(ChannelSync:6173 · Catalog:1712 — 어댑터 부재 시 재시도 미소모).
- **Version Immutable Hash(#21)는 `Migrate.php:50` 패턴을 재사용하라**(sha256 of 정본 문자열 + 컬럼 저장). 🔴 단 **`schema_migrations` 를 워크플로에 재사용 금지**(도메인 상이) — **패턴만 인용**.
- **"경고"와 "차단"을 구분하라.** 원문은 #16·#17 만 **경고**, 나머지 19항은 **검증(차단)** 이다. 🔴 임의로 경고를 차단으로, 차단을 경고로 승강 금지 — 승강은 정의상 요구 변조다.
- 🔴 `NOT_APPLICABLE` 17종 **"있다고 가정"하고 배선 금지**.
