# DSAR — Approval Authority Change Impact (§60 영향 13 + 기본정책 8 병합)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §60(2404-2434) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §2·§4·§5·§6·§7·§8 · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)

## 0. 현행 실측 (file:line)

### ★대전제 — `Authority Change Impact Calculation Engine` = **`ABSENT`**

**Authority 변경 시 영향을 계산하는 코드가 0건이다.** 애초에 변경할 Authority 엔티티(§5~§59)가 부재하고, 승인 4경로(mapping/catalog/action_request/admin_growth·ⓑ §2)는 **상태머신**일 뿐 — 정책 변경이 진행 중 Task·Pending Decision·예약 승인에 파급되는지 재계산하는 hook 이 어디에도 없다.

| 항목 | 실측 | 판정 |
|---|---|---|
| `AUTHORITY_CHANGE_IMPACT`·영향 재계산기 | grep **0** — 변경-영향 계산 개념 부재 | `ABSENT` |
| 유일 "변경 시 재계산" 선례 | `AutoCampaign::periodSpentToDate:855` = 예산 누적 지출 재집계(마케팅 도메인·승인 아님·ⓑ §4) | `LEGACY_ADAPTER`(도메인 상이) |
| 승인시점 권한 동결 | 🔴 `Actor Authorization Snapshot` **부재**(ⓑ §5 CONFIRM) — 3경로 전부 시각·actor 문자열만 저장 | `ABSENT` |
| explicit deny 표현 | 🔴 `acl_permission`=allow-only · deny 비트 없음(ⓑ §6) | `ABSENT` |

★**변경-영향 계산 자체가 부재하므로 항목별 "영향 계산 결과"는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다.

## 1. 원문 전사 + 판정 — **원문 21종**(영향 대상 13 + 기본 정책 8)

> ★분모 주의: **측정기 `--sec=60` = 21**(불릿 21). 본 편 헤더 지시서의 "영향 12 / 20 예상"은 **수기 과소계수**다 — 영향 대상은 **13**(마지막 항목 `Existing Snapshot` 누락 = 5-3-1 이 진단한 "목록 끝 항목 누락" 편향의 재현) + 정책 8 = **21**. 측정기로 확정.

### 영향 대상 (13)

| # | 원문 영향 대상 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Active Approval Candidate | 🔴 Candidate 도출(§47) 자체 부재(ⓑ §6) · 진행 후보 재평가 hook 0 | `ABSENT` |
| 2 | Unassigned Approval Level | 🔴 Approval Chain/Level 개념 0(`approval_chain` grep 0·ⓑ §3) | `ABSENT` |
| 3 | Assigned Task | 🔴 Task 모델 부재 — 승인=상태전이(`status='pending_approval'→'queued'`·Catalog `:2350`)이지 할당 Task 아님 | `ABSENT` |
| 4 | Claimed Task | 🔴 claim/lock 개념 0 | `ABSENT` |
| 5 | Pending Decision | 인접 = `pending_approval` 상태(`Catalog::approveQueue:2341-2365`)·`action_request status`(`Db.php:592-600`) 실재하나 **변경-영향 재계산 0** | `ABSENT` |
| 6 | Approval Chain Resolution | 🔴 Resolution(§50/§51) 전 부재(ⓑ §6) | `ABSENT` |
| 7 | Delegation Reference | 인접 = `TeamPermissions:639` 위임상한 자기정합(`DELEGATION_EXCEEDED`·ⓑ §3)이나 **Authority 위임 아님**·변경 파급 재계산 0 | `ABSENT` |
| 8 | Authority Utilization | ★**인접 실재** — `AutoCampaign:843-889` 기간 내 누적 지출(`periodSpentToDate:855`)→상한 비교(`:856`)→`AdAdapters::pause`(`:864`) = 실 누적사용량 집행(마케팅 도메인·승인 아님·ⓑ §4 FLIP) | `LEGACY_ADAPTER` |
| 9 | Reserved Amount | 🔴 금액축 부재 — 예약·홀드 금액 개념 0(유일 금액조건=`HIGH_VALUE_KRW` boolean 상수·`Catalog.php:1016`·ⓑ §4) | `ABSENT` |
| 10 | Notification Recipient | 승인 알림 수신자 결정·변경 파급 재계산 0 | `ABSENT` |
| 11 | Reconciliation State | 🔴 Authority Reconciliation(§63) 부재 — 정의 vs 부여 대사 0·Tenant 마스터 부재(ⓑ §7) | `ABSENT` |
| 12 | Future Scheduled Approval | 🔴 Future-Dated(§58) ABSENT — 로컬 미래 effective 예약 0(ⓑ §5) | `ABSENT` |
| 13 | Existing Snapshot | 🔴 `Actor Authorization Snapshot` 부재(ⓑ §5) — 동결된 스냅샷이 없어 "완료 Decision 당시" 보존 대상 자체가 없음 ★**측정기가 살린 13번째(수기 누락)** | `ABSENT` |

### 기본 정책 (8)

| # | 원문 정책 | 현행 대조 | 판정 |
|---|---|---|---|
| 14 | 완료 Decision: 당시 Snapshot 유지 | 🔴 `Actor Authorization Snapshot` 부재(ⓑ §5) — `Mapping:285`{user,ts}·`Alerting:591`{actor,decision,ts}·`admin_growth` decided_by/decided_at 2컬럼 = **당시 권한 미동결** → "당시 Snapshot" 자체가 없음 | `ABSENT` |
| 15 | 미할당 Level: 재평가 가능 | 🔴 Chain/Level 개념 0(ⓑ §3) — 재평가할 미할당 Level 없음 | `ABSENT` |
| 16 | 할당 Task: 정책에 따라 재검증 | 🔴 Task 모델·정책엔진(승인) 부재 — `RuleEngine`=마케팅 세그 DSL(승인 아님·ⓑ §3) | `ABSENT` |
| 17 | Claim Task: Decision 시 재검증 | 🔴 claim 개념 0·Decision-시점 자격 재검증 술어 0(`Mapping::approve:287`=정족수 숫자만·ⓑ §3) | `ABSENT` |
| 18 | Authority 감소: Pending High-value 우선 재검증 | 🔴 금액축 부재 — `high_value`는 **JSON 응답으로만 반환**(`:1125`·`:2252`)·저장 0·`approveQueue`가 approval_type 무시(라우팅 갭·ⓑ §4) → High-value 우선순위 재검증 무발동 | `ABSENT` |
| 19 | Explicit Deny 추가: Active Decision Attempt 차단 | 🔴 explicit deny 표현 없음 — `acl_permission`=allow-only(ⓑ §6) → deny 로 차단할 표현 자체가 없음 | `ABSENT` |
| 20 | Legal Entity 제거: 즉시 Runtime Guard | 🔴 Legal Entity 0(`biz_no`/`corp_reg`/`tax_id` grep 0·ⓑ §4) → 제거 트리거·Runtime Guard 무발동 | `ABSENT` |
| 21 | Security Suspension: 즉시 차단 | ★**인접 실재** — 로그인 스로틀 `login_attempt`(`UserAuth.php:3335` DDL·`fail_count`/`locked_until`·`RL_LOCK=900`(`:3363` 15분 잠금)) = 계정 잠금 즉시 차단 패턴(단 **인증 스로틀**이지 승인권한 정지 아님) | `LEGACY_ADAPTER` |

**실측 개수: 21 / 21 전사.** (측정기 `--sec=60` 분모 **21** = 영향 13 + 정책 8 · 전사 **21** — 정합)
원문 정책이 "Security Suspension: 즉시 차단"으로 **끝난다**(`:2431`) → 규칙 4(목록 끝 항목 누락 금지) 충족.

커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 2(영향#8 Authority Utilization=AutoCampaign · 정책#21 Security Suspension=login_attempt) · `ABSENT` 19.

> 🔴 **커버 0.** 변경-영향 계산 엔진이 통째로 부재하므로 어떤 항목도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 2건은 **확장 대상 인접 자산**(Utilization=AutoCampaign 누적차감·Suspension=login_attempt 잠금)이지 커버가 아니다 — 둘 다 **도메인 상이**(마케팅 예산·인증 스로틀)이며 Authority 변경 파급 재계산이 아니다.

## 2. 규칙

- 🔴 **§60 영향 13 + 정책 8 = 커버 0.** Authority 변경-영향 계산은 Authority 엔티티(§5~§59)·Snapshot(§55)·Resolution(§47~§54)이 선행 구축돼야 성립한다 — 현재는 변경할 Authority 도, 파급을 받을 Task/Level/Candidate 도 없다.
- 🔴 **"완료 Decision 당시 Snapshot 유지"(정책 #14)를 현재의 `{user,ts}` 배열로 구현하려 하지 마라.** `Actor Authorization Snapshot` 부재(ⓑ §5)가 근본 공백이며, 이는 [SNAPSHOT 편](DSAR_APPROVAL_AUTHORITY_SNAPSHOT.md) `BLOCKED_HISTORICAL_INTEGRITY_RISK`(`AgencyPortal revoked_at=NULL` in-place 소거 반례)와 직결된다 — 변경은 **UPDATE 가 아니라 새 행 INSERT**.
- 🔴 **"Explicit Deny 추가 → Active Decision Attempt 차단"(정책 #19)은 deny 표현 신설이 선행.** `acl_permission`=allow-only(ⓑ §6)에 deny 비트를 얹으면 allow/deny 우선순위(§4.9)·충돌해소(§54)가 함께 정의돼야 한다 — deny 만 추가하면 판정 미정의.
- 🔴 **"Authority 감소 → Pending High-value 우선 재검증"(정책 #18)의 전제인 금액축부터 부재**(ⓑ §4). `high_value`는 응답 JSON 플래그일 뿐 저장·라우팅되지 않는다(`approveQueue`가 approval_type 무시) → §24 Amount Band 승격이 선결이며, 새 임계 상수 추가 금지.
- 🔴 **`AutoCampaign` 누적차감(영향 #8)·`login_attempt` 잠금(정책 #21)을 승인 도메인으로 재구현하지 마라** — 인접 패턴은 참조하되 중복 엔진 금지. 누적사용량 집행은 `periodSpentToDate` 패턴을, 즉시 차단은 `locked_until` 게이트 패턴을 확장한다.
- 🔴 **코드 변경 0 유지** — 실 결함(high_value 라우팅 갭·1인 결재 3경로·Actor Auth Snapshot 부재·`revoked_at=NULL` 이력소멸)은 **별도 승인세션**(Golden Rule + verify + 배포승인).
