# DSAR — Organization Hierarchy Version Status (§13)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §13 (상태 축) · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 버전 상태 머신 | **grep 0** — 버전 엔티티 자체가 부재 | `ABSENT` |
| 레포 유일 다단계 상태 | `agency_client_link.status` = **pending / approved / revoked**(`AgencyPortal.php:64-72`) · 시각 3종 `invited_at`/`approved_at`/`revoked_at` | `LEGACY_ADAPTER` |
| 상태 fail-closed 재검증 | `resolveAccessContext`(`AgencyPortal.php:414-432`) — 매 요청 링크 재조회(`:423`) → `status!=='approved'` 이면 null(`:427`) → `index.php:85-90` **403** | `LEGACY_ADAPTER`(정본 선례) |
| 단순 상태 컬럼 | `team.status`(`TeamPermissions.php:145-151`) · `wms_bins.active`·`catalog` `active` 등 = **binary 활성 플래그** | `NAME_ONLY` |
| 승인 상태 소비 | 🔴 `Alerting::executeAction`(`Alerting.php:601-660`) — `:612` 에서 `status` 를 **SELECT 하고도 어디서도 판독하지 않아** `pending`·`rejected` 도 실집행(승인 우회). **`INSERT INTO action_request` grep 0 → 생산자 전무 → 현재 `VACUOUS`** | `VACUOUS` |
| 검증 단계(VALIDATION) | 쓰기 전 차단 선례 = `Dependencies::validateDependency`(`PM/Dependencies.php:32-34` → **422 `cycle_detected`**) — **상태 전이가 아니라 즉시 거부** | `KEEP_SEPARATE_WITH_REASON` |
| 경고 동반 성공(WARNINGS) | `PM/Gantt`(`PM/Gantt.php:104-125`) — 순환 시 **500이 아니라 부분결과+경고로 degrade** | `LEGACY_ADAPTER`(유일 선례) |
| 예약 발행(SCHEDULED) | SMS 예약 워커(286차) — **발송 도메인** | `KEEP_SEPARATE_WITH_REASON` |
| SUPERSEDED / ARCHIVED | 이력 대체 개념 grep 0 · `menu_defaults` 는 **최신 1건만 조회**(`AdminMenu.php:584-590`) — 이전 행이 SUPERSEDED 로 표시되지 않고 **그냥 안 읽힌다** | `ABSENT` |

**★축 주의 — 상태 이름 유사 ≠ 상태 머신.**
🔴 **`agency_client_link` 의 pending/approved/revoked 를 §13 14종에 매핑하지 마라.** ⓐ 도메인이 **크로스테넌트 접근 위임 동의**이지 버전 발행이 아니다 ⓑ **3상태 평면**이고 전이 규칙·검증 단계·예약 발행이 없다 ⓒ 원문의 `APPROVED`→`SCHEDULED`→`ACTIVE`→`SUPERSEDED` **생애주기 축이 통째로 없다**. 이름이 겹치는 것은 `APPROVED` **1개뿐**이며 그마저 의미가 다르다(위임 승인 vs 버전 승인).
⚠️ `agency_client_link` **실 데이터 존재 미확인**(라이브 미조회). 죽은 스켈레톤 확률은 낮다고 **추정**(프론트 `AgencyConsole.jsx` 실재 · `index.php:85` 미들웨어 실배선) — 단정 금지.

## 1. 원문 전사 + 판정 — **원문 14종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | DRAFT | 부재 — 초안 상태 grep 0 · `menu_defaults` 는 생성 즉시 유효(`AdminMenu.php:308`) | `NOT_APPLICABLE` |
| 2 | VALIDATION_PENDING | 부재 — 검증이 **비동기 상태가 아니라 동기 차단**(`PM/Dependencies.php:32-34` 422) | `KEEP_SEPARATE_WITH_REASON` |
| 3 | VALIDATION_FAILED | 부재 — 실패가 **상태로 영속되지 않고 422 응답으로 소멸** | `KEEP_SEPARATE_WITH_REASON` |
| 4 | REVIEW_PENDING | **부재** — Review 단계 자체 없음(5-3-2 §12 확정: Review/Approval 미분화) | `ABSENT` |
| 5 | APPROVAL_PENDING | 부재 · 이름 인접 = `agency_client_link` `pending`(`AgencyPortal.php:64-72`) — **위임 초대 대기**이지 버전 승인 대기 아님 | `NAME_ONLY` |
| 6 | APPROVED | 부재(버전) · 이름 인접 = `agency_client_link` `approved` + `approved_at` · ★**실 게이트 배선 REAL**(`:427` fail-closed) | `LEGACY_ADAPTER` |
| 7 | SCHEDULED | 부재 — **예약 발행 = 미래 `effective_from` 을 요구**하나 as-of 술어가 전역 0건(`Db.php:898` 컬럼만) → 구조적 불가 | `ABSENT` |
| 8 | ACTIVE | 부재(버전) · 인접 = `team.status`·`active TINYINT(1)` **binary 플래그**(`Wms.php:193-194` 등) — 생애주기 상태 아님 | `NAME_ONLY` |
| 9 | ACTIVE_WITH_WARNINGS | 부재 · ★**개념 선례 1건** = `PM/Gantt.php:104-125` 순환 시 **부분결과+경고 degrade**(500 아님) — **응답 degrade 이지 영속 상태 아님** | `LEGACY_ADAPTER` |
| 10 | SUPERSEDED | **부재** — `menu_defaults` 이전 행은 표시되지 않고 **조회에서 누락될 뿐**(`AdminMenu.php:584-590` 최신 1건). `kr_fee_rule` 도 동일(최신승 `Pnl.php:454`) | `ABSENT` |
| 11 | DEPRECATED | 부재 — 폐기 표시 축 grep 0 | `NOT_APPLICABLE` |
| 12 | SUSPENDED | 부재 · 이름 인접 = 계정 잠금(`AgencyPortal.php:179`) — **인증 realm 잠금**이지 버전 정지 아님 | `NAME_ONLY` |
| 13 | ARCHIVED | 부재 — 아카이브 축 grep 0 · `effective_to` 부재로 **폐구간 종료 표현 불가** | `ABSENT` |
| 14 | BLOCKED | 부재(버전) · 이름 인접 = `agency_client_link` `revoked` · env cross-check 403(`demo_blocked_in_production`/`production_blocked_in_demo` — ★**`Pnl`·`OrderHub` 2개 핸들러에만 존재**) | `NAME_ONLY` |

**실측 개수: 14 / 14 전사.** 커버리지 = `VALIDATED_LEGACY` **0** · `LEGACY_ADAPTER` 2 · `KEEP_SEPARATE_WITH_REASON` 2 · `NAME_ONLY` 4 · `ABSENT` 4 · `NOT_APPLICABLE` 2.

> 🔴 **커버 0.** ★**상태 머신은 개별 상태값의 집합이 아니다** — 이름이 4개 겹쳐도(`NAME_ONLY`) **전이 규칙·검증 단계·발행 예약이 전무**하므로 축 자체가 부재다. 개수 대조로 커버를 주장하면 역산이다.

## 2. 규칙

- 🔴 **`agency_client_link` pending/approved/revoked 를 §13 14종에 매핑 금지.** 도메인 상이(위임 동의) · 3상태 평면 · 생애주기 축 부재.
- 🔴 **`active TINYINT(1)` 을 `ACTIVE` 로 계산 금지.** binary 플래그와 14상태 생애주기는 다른 축이다.
- 🔴 **`Alerting::executeAction`(`Alerting.php:601-660`) 을 상태 소비 참조 구현으로 삼지 마라.** `:612` 가 `status` 를 SELECT 하고도 **판독하지 않는다** → 승인 우회. 현재는 생산자 전무로 `VACUOUS` 이나 **생산자 배선 시 즉시 활성 결함**이다. 상태를 **읽고 분기하는 것**까지가 상태 머신이다.
- **`APPROVED` 게이트는 `AgencyPortal::resolveAccessContext`(`:414-432`) 패턴을 확장하라** — **매 요청 재검증 · fail-closed(`:427` null → 403)** 가 레포 정본. 세션에 승인 결과를 캐시해두고 신뢰하는 구현은 금지(286차 `X-Act-As-Tenant` 사고의 교훈: `UserAuth.php:397-400` 하드코딩 스위치로 봉인된 이유).
- **`ACTIVE_WITH_WARNINGS` 는 `PM/Gantt`(`PM/Gantt.php:104-125`) 의 degrade 원칙을 따르라** — 구조 이상 시 **500이 아니라 부분결과+경고**. 단 그것은 **응답 형태**이고, 원문은 **영속 상태**를 요구한다 — 신규다.
- 🔴 **`SCHEDULED` 를 "구현 쉬움"으로 취급 금지.** 예약 발행은 **미래 `effective_from` + as-of 조회**를 전제하는데 **as-of 술어가 전역 0건**(`WHERE effective_from <= :as_of` grep 0)이다. §13 `effective_from`/`effective_to` 능력 없이 `SCHEDULED` 만 넣으면 **`VACUOUS`** 다.
- 🔴 **`SUPERSEDED`/`ARCHIVED` 를 "최신 1건 조회"로 갈음 금지.** 현행(`AdminMenu.php:584-590`·`Pnl.php:454`)은 이전 행을 **표시하지 않고 그냥 안 읽는다** — 상태 표시가 아니라 **조회 누락**이다. 무후퇴를 위해 **표시(SUPERSEDED)와 누락은 구분**하라.
- 🔴 14종 **"있다고 가정"하고 배선 금지.**
