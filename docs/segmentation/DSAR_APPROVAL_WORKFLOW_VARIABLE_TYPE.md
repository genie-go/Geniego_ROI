# DSAR — Workflow Variable Type (§11)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §11 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 타입 시스템 | **grep 0** — 승인 페이로드는 임의 JSON(`action_json`·`payload_json`) | `NOT_APPLICABLE`(부재 → 신설) |
| `CURRENCY`/`MONEY` | `fxToKrw`(24통화 + `app_setting` 24h 캐시 · Connectors.php:1749) | `VALIDATED_LEGACY`(다통화 합산 차단 기반) |
| `SECRET_REFERENCE` | `channel_credential` AES-256-GCM(Db.php:976) | `VALIDATED_LEGACY` |
| `EVIDENCE_REFERENCE` | `menu_audit_log.hash_chain`(AdminMenu.php:123-131) 유일 | `MIGRATION_REQUIRED` |
| 날짜/시각 표현 | 현행 승인계는 `created_at VARCHAR(32)`(Db.php:540-546 · :623-636) — **DATETIME 타입 아닌 문자열** | 🔴 타입 규율 부재 근거 |

## 1. 원문 전사 + 판정 — **원문 19종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | STRING | 타입 시스템 부재 | `NOT_APPLICABLE` |
| 2 | INTEGER | 부재 · 유사 `required_approvals INT`(Db.php:623-636) | `NOT_APPLICABLE` |
| 3 | DECIMAL | 부재 | `NOT_APPLICABLE` |
| 4 | BOOLEAN | 부재 | `NOT_APPLICABLE` |
| 5 | DATE | 부재 | `NOT_APPLICABLE` |
| 6 | DATETIME | 부재 — 현행은 `VARCHAR(32)` 문자열 시각 | `NOT_APPLICABLE` |
| 7 | DURATION | 부재 | `NOT_APPLICABLE` |
| 8 | CURRENCY | 부재(승인) · 인접 `fxToKrw` 24통화(Connectors.php:1749) | `LEGACY_ADAPTER` |
| 9 | MONEY | 부재 — 금액+통화 복합타입 grep 0 | `NOT_APPLICABLE` |
| 10 | ENUM | 부재 · 유사 `status` VARCHAR(제약 없음) | `NOT_APPLICABLE` |
| 11 | LIST | 부재 · 유사 `approvals_json`(구조 계약 없음) | `NOT_APPLICABLE` |
| 12 | MAP | 부재 | `NOT_APPLICABLE` |
| 13 | RESOURCE_REFERENCE | 부재 · 유사 `ref_type`/`ref_id`(AdminGrowth.php:142-149) | `LEGACY_ADAPTER` |
| 14 | SUBJECT_REFERENCE | 부재 · 유사 `Mapping::actorId` → `apikey:{id}`/`user:{email}`(Mapping.php:36-53) | `LEGACY_ADAPTER`(★위조불가 신원 정본) |
| 15 | POLICY_REFERENCE | 부재 · `PlanPolicy` 는 **fail-open**(PlanPolicy.php:12 주석 자인) | `BLOCKED_POLICY_DRIFT` |
| 16 | EVIDENCE_REFERENCE | 부재 · `menu_audit_log.hash_chain` 만 선례 — 🔴 쓰기 체인만 실재·`verify()` 0·preimage `ts`(:195) 소실 → tamper-evident 아님; 검증형 정본 = `SecurityAudit::verify():56-68` | `MIGRATION_REQUIRED` |
| 17 | SECRET_REFERENCE | 부재(승인) · `channel_credential` AES-256-GCM(Db.php:976) | `VALIDATED_LEGACY` |
| 18 | JSON | 사실상 **현행 유일 타입**(`action_json`·`payload_json`·`approvals_json`) — **타입 부재의 증상**이지 구현 아님 | `MIGRATION_REQUIRED` |
| 19 | CUSTOM | 부재 | `NOT_APPLICABLE` |

**실측 개수: 19 / 19 전사.** 커버리지 = 부재 12 · 어댑터 4 · 이관 2 · 차단 1.

## 2. 규칙

- 🔴 **`JSON` 이 현행에 있다고 "타입 시스템 존재"로 계산 금지.** 임의 JSON 은 **타입 부재의 증상**이다 — 검증·마스킹·분류가 전부 불가능하다.
- `MONEY` 는 **금액과 통화가 분리 불가**한 복합타입이다. 통화 없는 숫자 합산 금지 — `fxToKrw`(Connectors.php:1749)에 위임하되 **환산 시점**을 Evidence 에 남겨라(286차 값 동기화 원칙).
- `SUBJECT_REFERENCE` 는 **`Mapping::actorId` 패턴을 정본으로 확장**하라 — `auth_key`/`UserAuth::authedUser` 기반 **위조불가**, 미확인 시 **null → 403 fail-closed**. 🔴 `Alerting::actor`(Alerting.php:33-36 · 클라이언트 `X-User-Email` 헤더 → 기본 `'unknown'`)를 **절대 참조 금지**(위조 가능).
- 🔴 `POLICY_REFERENCE` 를 `PlanPolicy` 로 배선 금지 — **fail-open** 이라 승인 게이트 기반으로 부적격(`BLOCKED_POLICY_DRIFT`).
- `SECRET_REFERENCE` 는 **참조만**(원문 저장 금지 · §11 명시).
