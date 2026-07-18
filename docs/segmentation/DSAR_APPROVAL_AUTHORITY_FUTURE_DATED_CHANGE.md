# DSAR — Future-Dated Authority Change (§58)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §58(2343-2379) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §5 · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)
> **분모 측정기**: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md --sec=58` = **27**(불릿 27 · 번호 0 = 지원변경 14 + 기록항목 13). 육안 계수 금지.

## 0. 현행 실측 (file:line)

★**§58 은 "미래 일자 변경을 잘못 처리한다"가 아니라 "미래 일자 예약이라는 개념이 없다"**이다(ⓑ §5 §58 = ABSENT). 로컬 미래 effective_from 예약 **0** · 예약을 발동시킬 스케줄러/활성화기 **0** · Authority Matrix·Version·Simulation 엔티티 자체가 부재.

| 계층 | 현행 실측 (ⓑ §5) | 판정 |
|---|---|---|
| **예약 슬롯** | 🔴 로컬 미래 effective_from 예약 **0** · `Paddle.php:291` next_billing 은 **외부 PSP 파라미터 위임**(오탐) | `ABSENT` |
| **예약 집행기** | 🔴 미래 변경을 활성화할 스케줄러 **0** · 인접 = SMS 예약 워커(286차 신설) = **발송 도메인**(승인 아님) | `ABSENT` |
| **버전축(predecessor/successor)** | 🔴 불변 prev-링크 버전체인 선례 **0** · version 컬럼 6개 전부 하드코딩 태그(ⓑ §5) | `ABSENT` |
| **Matrix/Version/Simulation 엔티티** | 🔴 `authority_matrix`·`authority_version`·`authority_simulation` **부재**(§61 Authority Simulation = ABSENT) | `NOT_APPLICABLE` |
| **영향 계산기** | 🔴 affected actors/roles/... 를 산출할 코드 **0** · `approval_chain`/`resolveApprover` grep 0(ⓑ §5·§6) | `ABSENT` |

## 1. 원문 전사 + 판정 — **원문 27종**(지원 변경 14 + Future Change 기록 13)

### 1-1. 지원 변경 — **14종** (`:2345` *"지원 변경:"*)

| # | 원문 항목명 | 현행 대조 (ⓑ §5) | 판정 |
|---|---|---|---|
| 1 | Amount Limit 증가·감소 | 🔴 금액축 부재 — 유일 금액조건 = `HIGH_VALUE_KRW` 상수(승인 필요여부 boolean만 · ⓑ §4) · 예약 변경 슬롯 0 | `ABSENT` |
| 2 | Currency 변경 | 🔴 통화 스코프 0 · 환율 저장계층 부재(ⓑ §4) | `ABSENT` |
| 3 | Scope 변경 | 예약 변경 수단 0 | `ABSENT` |
| 4 | Role 변경 | 🔴 Role 이름 문자열 판정만 · Authority Role 바인딩 예약 0 | `ABSENT` |
| 5 | Position 변경 | 🔴 직무 Position 개념 전역 0 | `ABSENT` |
| 6 | Legal Entity 변경 | 🔴 Legal Entity 엔티티 0(`biz_no`/`corp_reg`/`tax_id` grep 0) | `ABSENT` |
| 7 | Country·Region 변경 | 지리 축 = `Geo`(IP→ISO→언어)·TikTok country_code — **Authority 지리 스코프 아님** · 미래 예약 0 | `ABSENT` |
| 8 | Resource Scope 변경 | 인접 = `acl_permission` scopeSql 데이터-행 필터 — Authority 리소스 스코프 아님 · 예약 0 | `ABSENT` |
| 9 | Action Scope 변경 | Authority Action 바인딩 부재 · 예약 0 | `ABSENT` |
| 10 | Period Limit 변경 | 🔴 한도 기간축 부재(유일 예외 = `AutoCampaign:843-889` 마케팅 예산 · 승인 아님) · 예약 0 | `ABSENT` |
| 11 | Deny Rule 추가 | 🔴 **explicit deny 표현 자체가 없다** — `acl_permission`=allow-only(ⓑ §5·§6) · 추가할 deny 규칙 개념 0 | `ABSENT` |
| 12 | Authority 종료 | 🔴 종료 시점 표현 수단(`valid_to`/`effective_to`) grep 0(§57 참조) | `ABSENT` |
| 13 | Subject Exception 추가 | Subject 예외 바인딩 부재 · 예약 0 | `ABSENT` |
| 14 | Matrix Version 교체 | 🔴 Authority Matrix·Matrix Version 엔티티 통째로 부재 → **교체할 대상이 없다** | `NOT_APPLICABLE` |

> ★ 원문 지원변경 목록은 `Matrix Version 교체`(`:2360`)로 끝난다 — `evidence` 로 끝나지 않는다. **추가하지 않았다**(반대편향 방지).

### 1-2. Future Change 기록 항목 — **13종** (`:2362` *"Future Change에는 다음을 기록한다."*)

| # | 원문 항목명 | 현행 대조 (ⓑ §5) | 판정 |
|---|---|---|---|
| 15 | scheduled effective date | 🔴 미래 일자 컬럼 0 · `kr_fee_rule.effective_from` 은 최신승이라 미래 행 삽입 시 **즉시 활성**(§57 참조) | `ABSENT` |
| 16 | predecessor version | 🔴 불변 버전체인 0 · 교체 시 전임 버전 기록 수단 없음 | `ABSENT` |
| 17 | successor version | 🔴 예약 후속 버전 슬롯 0 | `ABSENT` |
| 18 | affected actors | 영향 계산기 0 | `ABSENT` |
| 19 | affected roles | Role 이름 문자열만 · 영향 산출 0 | `ABSENT` |
| 20 | affected positions | Position 개념 0 | `ABSENT` |
| 21 | affected legal entities | Legal Entity 엔티티 0 | `ABSENT` |
| 22 | affected chain levels | 🔴 `approval_chain`/`resolveApprover`/`routeApproval` grep 0 — 승인 체인 레벨 개념 부재(ⓑ §6) | `ABSENT` |
| 23 | affected active tasks | 🔴 승인 태스크 큐 부재 · `pm_task_assignees`(role ENUM owner/contributor/reviewer/observer)는 **PM 태스크 역할**이지 승인 태스크 아님 — **매핑 금지** | `NOT_APPLICABLE` |
| 24 | simulation result | 🔴 §61 `APPROVAL_AUTHORITY_SIMULATION` **부재**(ⓑ §6 = 전 ABSENT) → 시뮬레이터가 없어 결과를 낼 수 없다 | `BLOCKED_PREREQUISITE`(§61 선결) |
| 25 | validation result | 🔴 미래 변경 검증기 0 · 인접 검증(테넌트 소속 422 등)은 승인 도메인 아님 | `ABSENT` |
| 26 | activation result | 🔴 **예약 활성화 개념 0** — 활성화할 예약이 없다 | `ABSENT` |
| 27 | evidence | 정본 = `SecurityAudit`(append-only `:8` · tenant 해시 `:29` · `verify():56-68` `:64` hash_equals+prev) · 🔴 `menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 27 / 27 전사**(14 + 13). (측정기 27 · 원문 대조 27 · 전사 27 — **3자 일치**.) 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 1(evidence) · `BLOCKED_PREREQUISITE` 1(simulation) · `NOT_APPLICABLE` 2(Matrix Version 교체·affected active tasks) · `ABSENT` 23.

> 🔴 **커버 0.** 미래 일자 예약·집행·활성화가 통째로 부재하므로 어떤 항목도 `VALIDATED_LEGACY` 가 아니다. `evidence` 1건만 `SecurityAudit` 확장 대상이다.

## 2. 규칙

- 🔴 **★§58 은 "미래 일자 처리가 잘못됐다"가 아니라 "미래 일자 예약이라는 개념이 없다"**이다(ⓑ §5). 예약 슬롯 · 예약 집행기 · 활성화 결과 = **전부 신규**. `Paddle.php:291` next_billing 을 "미래 예약 있음"으로 오독 금지(외부 PSP 위임).
- 🔴 **`kr_fee_rule.effective_from` 에 미래 날짜를 넣는 것으로 §58 를 닫지 마라** — 읽기 전부 `ORDER BY effective_from DESC LIMIT 1` 이고 `<= NOW()` 술어가 없어(전역 grep 0) **미래 행이 즉시 활성화**된다. `scheduled effective date` 의 선결 조건은 **미래 행 배제 술어**다.
- 🔴 **`simulation result` 는 §61 Authority Simulation 선결**(`BLOCKED_PREREQUISITE`) — 시뮬레이터 엔티티가 없는데 결과 필드만 배선하면 **항상 빈 값**을 낳는 fake-looks-real 이다. §61 을 먼저 세워라.
- 🔴 **`affected chain levels`·`affected active tasks` 를 기존 자산으로 매핑 금지** — 승인 체인 계산 코드가 레포에 0(`approval_chain` grep 0)이고, `pm_task_assignees` 는 **PM 태스크 역할**(owner/contributor/reviewer/observer)이지 승인 태스크가 아니다. 미달을 커버라 부르면 **§58 갭이 정의상 소멸**한다.
- 🔴 **`Deny Rule 추가` 를 "있음"으로 표기 금지** — `acl_permission` 은 allow-only 이며 explicit-deny 표현 자체가 없다(ⓑ §6). 추가할 deny 규칙 개념이 부재하므로 이 항목은 신설 대상이다.
- 🔴 **27종 "있다고 가정"하고 배선 금지** — 23종이 `ABSENT` 다.
