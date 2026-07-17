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

## 1. 스펙 §7 Request Type 24종 전사 — **BLOCKED**

**분류: `BLOCKED_SPEC_TEXT_UNAVAILABLE`**

REQ 분모(§7 표)는 **"§7 Request Type = 24"** 라는 **개수만** 영속한다. **24종의 항목명은 저장소 어디에도 없다**(REQ 외 grep 0).

**24종 추측 생성 금지** — REQ §16 **"요구 날조 0 · 스펙 원문 항목만 전사"** · REQ §9 **351 사건**(근거 없는 숫자가 복제돼 정본이 된 사고). 지어낸 Type 목록을 분모로 삼으면 **역산**(REQ §15)이 되어 커버리지가 동어반복이 된다.

**해제 조건**: 스펙 §7 Request Type 원문 수령 → 본 §1 을 전사표로 교체(§0 은 그대로 유효).

## 2. 규칙

- **테이블 신설로 Type 을 표현하지 않는다.** 현행의 "테이블=타입"은 Domain Type + Request Type **2축**으로 대체(스펙 §5 단서: Rebate 전용 복제 금지 · Domain Type/Resource Type 확장).
- **`ref_type`(AdminGrowth.php:142)를 승격 검토** — 신설보다 기존 확장 우선(Golden Rule).
- **부분문자열 매칭 금지**: `strpos($type,'pause')`(Alerting.php:623) 식 판정은 Type 이 **열거형이 아니어서** 생긴 우회다. Canonical Type 도입 시 **정확 일치**로 전환.
- **Type 축을 "있다"고 가정하고 배선 금지**(287차 죽은 스켈레톤) — 현행 grep 0.
