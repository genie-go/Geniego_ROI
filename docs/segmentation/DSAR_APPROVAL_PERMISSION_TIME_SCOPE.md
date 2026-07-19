# DSAR — Permission Time Scope (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

Permission의 **시간 차원 유효성**을 정형화한다. Valid From/Until·Business Hours/Weekday·Maintenance/Incident/Temporary/Emergency Window·Fiscal/Accounting Period 등 시간 창(window)에 따라 허용을 제한한다. **★Timezone 명시 필수**: 모든 시간 경계는 명시적 timezone(및 fiscal calendar)에 귀속되며, **서버 local time 암묵 의존을 금지**한다(서버 이전·DST·다지역 배포 시 경계 오판 방지). 순신규 엔티티.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `time_scope_code` | Time Scope 식별자 |
| `valid_from` / `valid_until` | 절대 유효 구간(timezone 포함) |
| `business_hours` | 허용 업무시간 창 |
| `allowed_weekdays` | 허용 요일 집합 |
| `window_type` | 시간 창 분류(§3 열거) |
| `maintenance_window_ref` / `incident_window_ref` | 유지보수·장애 창 참조 |
| `temporary` / `emergency` | 임시·긴급 창 여부(만료 강제) |
| `fiscal_period_ref` / `accounting_period_ref` | 회계·결산 기간 참조 |
| `timezone` | **필수 명시**(IANA TZ·서버 local time 암묵의존 금지) |
| `calendar_ref` | fiscal calendar 참조(주말·공휴일 정의) |

## 3. 열거형 / 타입

- **window_type**: `VALID_RANGE` · `BUSINESS_HOURS` · `WEEKDAY` · `MAINTENANCE` · `INCIDENT` · `TEMPORARY` · `EMERGENCY` · `FISCAL_PERIOD` · `ACCOUNTING_PERIOD` · `CUSTOM`.
- **temporal_binding**: `TIMEZONE_EXPLICIT`(고정·Mandatory) — `SERVER_LOCAL_IMPLICIT` 금지.
- **expiration**: `HARD_EXPIRE`(temporary/emergency=만료 후 자동 거부) · `PERSISTENT`.

## 4. 실 substrate 매핑 (§92)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| Permission Time Scope(valid from/until·business hours·window·fiscal period·timezone binding) | — | **ABSENT(순신규)** | — |
| 위임/권한 만료(인접·부재) | — | **ABSENT** — acl_permission에 valid_until 컬럼 없음(EXISTING §1.1 스키마=tenant/subject/menu_key/actions/updated_at) | EXISTING §1.1 |

★Permission 계층에 시간 차원 자체가 부재(순신규). `acl_permission` 스키마(`tenant_id, subject_type, subject_id, menu_key, actions, updated_at`)에는 `valid_from/until`·window·timezone 컬럼이 없어 Temporary/Emergency grant 자동 만료·회계기간 잠금·업무시간 제한이 불가능하다. Business Hours/Maintenance/Fiscal Period·명시 timezone binding은 전부 순신규.

## 5. 설계 원칙 / 결정

- **Timezone 명시 강제**: 모든 시간 경계는 `timezone`(IANA) 필수 — 서버 local time 암묵 의존 금지(다지역·DST 오판 봉인·Mandatory Control).
- **Temporary/Emergency Hard Expire**: 임시·긴급 창은 만료 후 **자동 거부**(Revocation/Expiration Enforcement·ADR §6.16). 만료 미강제 grant 금지.
- Fiscal/Accounting Period 잠금은 결산 마감 후 mutating Action을 시간 창으로 차단(회계 무결성).
- Time Scope는 Constraint의 `TIME` type(§CONSTRAINT)과 정합 — 별도 우회 시간 경로 금지.
- Golden Rule: grant substrate(acl_permission)에 시간 컬럼·window 참조를 확장, 중복 스케줄러/만료 엔진 신설 금지.

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: 전 필드 순신규 ABSENT — grant에 시간 차원·명시 timezone binding 부재.
- Temporary/Emergency 자동 만료·Fiscal Period 잠금 미착수(설계만).
- **BLOCKED_PREREQUISITE**: 시간 창 판정은 Part 1 Decision Core(판정 시각 snapshot) + JIT/Time-bound Privilege(별도 Part) 연계 후 — **RP-002**.
- Part 1 D-2 위험 4건 = 289차 P1~P4 해소 — 재플래그 금지.
