# DSAR — Approval Request Type (§7)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)

## 0. 현행 실측 (file:line) — Request Type 축의 부재

| 스펙 요구 | 현행 실측 (코드 근거) | Canonical 분류 |
|---|---|---|
| `request_type` 컬럼 | **부재(grep 0)** — `mapping_change_request`(Db.php:623-636) · `action_request`(Db.php:592-600) 어느 쪽에도 없음 | **NOT_APPLICABLE(부재 → 신설)** |
| Type 열거형/상수 | **부재(grep 0)** — backend/src 에 Approval Request Type enum·const 없음 | **NOT_APPLICABLE(신설)** |
| Type 의 **암묵적 대용** | **테이블 자체가 타입 역할**을 한다 — "mapping 변경 승인"은 `mapping_change_request` 테이블에 있다는 사실로만 구분됨 | **MIGRATION_REQUIRED**(테이블=타입 안티패턴) |
| `action_request` 내부 유사물 | `action_json` 의 `type`/`action_type` 키(Alerting.php:560 · `executeAction` :623 에서 `pause|lock|stop|off` / `budget` **부분문자열 매칭**) — **Action 종류**이지 **Request Type 아님** | **LEGACY_ADAPTER**(혼동 주의) |
| `admin_growth_approval.ref_type` | AdminGrowth.php:142-149 — VARCHAR(40). **Request Type 에 가장 가까운 유일 실물**이나 admin growth 국지적 | **LEGACY_ADAPTER**(승격 후보) |

**핵심 실측**: 현행에 **Request Type 축이 존재하지 않는다.** 도메인 구분은 **테이블 분리**로, 동작 구분은 **JSON 블롭 안의 문자열 부분매칭**으로 대체돼 있다.

## 1. 스펙 §7 Request Type 전사 — 원문 실측 **24종**

**전사 근거: [`SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md`](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §7 "Request Type"**

> ✅ **REQ 집계 24 ↔ 원문 실측 24 — 일치.**

**§0 핵심 실측 = "현행에 Request Type 축이 존재하지 않는다"** → 24종 **전부 부재**가 기본 판정이며, 아래 "현행 대응"은 §0 이 기록한 **암묵적 대용물**만 인용한다(신규 판정 생성 0).

| # | Request Type (원문) | 현행 존재 여부 — §0 실측 인용 |
|---|---|---|
| 1 | `CREATE` | **부재** — §0 `request_type` 컬럼 grep 0 · Type 열거형 grep 0 |
| 2 | `UPDATE` | **부재** — 동일. ※§0 암묵 대용: `mapping_change_request` **테이블 자체가 타입 역할**(테이블=타입 안티패턴 · **MIGRATION_REQUIRED**) |
| 3 | `APPROVE` | **부재(Type 축)** — §0 grep 0. ※`TeamPermissions::ACTIONS` 의 `'approve'` 는 **인가 액션**이지 Request Type 아님(축 혼동 금지) |
| 4 | `ACTIVATE` | **부재** — §0 grep 0 |
| 5 | `PAUSE` | **부재(Type 축)** — ※§0 암묵 대용: `action_json` 의 `strpos($type,'pause')` **부분문자열 매칭**(Alerting.php:623) = **Action 종류**이지 **Request Type 아님** · **LEGACY_ADAPTER**(혼동 주의) |
| 6 | `RESUME` | **부재** — §0 grep 0 |
| 7 | `SUSPEND` | **부재** — §0 grep 0. ※인접 대용 = `'lock'`/`'stop'`/`'off'` 부분매칭(Alerting.php:623) · **Action 축** |
| 8 | `TERMINATE` | **부재** — §0 grep 0 |
| 9 | `DELETE` | **부재** — §0 grep 0 |
| 10 | `RESTORE` | **부재** — §0 grep 0 |
| 11 | `MIGRATE` | **부재** — §0 grep 0 |
| 12 | `FUND` | **부재** — §0 grep 0 |
| 13 | `ALLOCATE` | **부재** — §0 grep 0 |
| 14 | `COMMIT` | **부재** — §0 grep 0 |
| 15 | `ADJUST` | **부재(Type 축)** — ※§0 암묵 대용: `strpos($type,'budget')` → `updateBudget`(Alerting.php:634) · **Action 축** |
| 16 | `SETTLE` | **부재** — §0 grep 0 |
| 17 | `PAY` | **부재** — §0 grep 0 |
| 18 | `REVERSE` | **부재** — §0 grep 0 |
| 19 | `REFUND` | **부재** — §0 grep 0 |
| 20 | `EXPORT` | **부재** — §0 grep 0 |
| 21 | `ACCESS` | **부재** — §0 grep 0 |
| 22 | `POLICY_CHANGE` | **부재** — §0 grep 0 |
| 23 | `EMERGENCY` | **부재** — §0 grep 0 |
| 24 | `CUSTOM` | **부재** — §0 grep 0(확장 슬롯) |

### 1-1. 유일한 근접 실물 — `ref_type` 대조

§0 은 `admin_growth_approval.ref_type`(AdminGrowth.php:142-149 · VARCHAR(40))을 **"Request Type 에 가장 가까운 유일 실물"**(**LEGACY_ADAPTER** · 승격 후보)로 기록한다.
**그 관측값은 §6/§15 문서 실측 기준 `content`/`live_mode`/`campaign_launch` 3종**이며 — 위 원문 24종 **어느 것과도 일치하지 않는다**.

> ⚠️ **`ref_type` 을 Request Type 으로 직접 매핑하면 축 혼합이다.** §0 판정대로 **Resource Type 에 가깝다**. 매핑 확정은 별도 승인 사항(여기서 확정하면 역산 — REQ §15).

## 2. 규칙

- **테이블 신설로 Type 을 표현하지 않는다.** 현행의 "테이블=타입"은 Domain Type + Request Type **2축**으로 대체(스펙 §5 단서: Rebate 전용 복제 금지 · Domain Type/Resource Type 확장).
- **`ref_type`(AdminGrowth.php:142)를 승격 검토** — 신설보다 기존 확장 우선(Golden Rule).
- **부분문자열 매칭 금지**: `strpos($type,'pause')`(Alerting.php:623) 식 판정은 Type 이 **열거형이 아니어서** 생긴 우회다. Canonical Type 도입 시 **정확 일치**로 전환.
- **Type 축을 "있다"고 가정하고 배선 금지**(287차 죽은 스켈레톤) — 현행 grep 0.
