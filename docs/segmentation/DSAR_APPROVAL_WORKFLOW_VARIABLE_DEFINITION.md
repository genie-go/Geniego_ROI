# DSAR — Workflow Variable Definition (§11)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §11 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_WORKFLOW_VARIABLE_DEFINITION` | **grep 0** | `NOT_APPLICABLE`(부재 → 신설) |
| 변수 개념 | 부재 — 현행 승인은 **스키마 고정 컬럼**(`mapping_change_request`: `platform·field·raw_value·canonical_value·note` · Db.php:623-636) | **구조적 부재** |
| 자유 페이로드 유사물 | `action_json`(Db.php:592-600) · `payload_json`(AdminGrowth.php:142-149) — **타입·검증·마스킹 전무한 raw JSON** | `MIGRATION_REQUIRED` |
| `encrypted 여부` | `channel_credential` AES-256-GCM(Db.php:976) + `no_credentials` 게이트 | `VALIDATED_LEGACY`(재사용) |
| `masking policy` | 승인 도메인 **부재**(grep 0) | `NOT_APPLICABLE` |
| `data classification` | **부재**(grep 0) | `NOT_APPLICABLE` |
| SECRET 원문 저장 금지 | 현행 `action_json`·`payload_json` 은 **임의 JSON** — 시크릿 유입을 막는 스키마 제약 **없음** | 🔴 위험 노출 |

## 1. 원문 전사 + 판정

### 1.1 지원 Scope — **원문 9종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | REQUEST | 부재 | `NOT_APPLICABLE` |
| 2 | CASE | 부재 — Case 개념 자체 부재(§52 §4) | `NOT_APPLICABLE` |
| 3 | ITEM | 부재 — 현행은 **단일 레코드 1건 승인**(다품목 0) | `NOT_APPLICABLE` |
| 4 | WORKFLOW | 부재 | `NOT_APPLICABLE` |
| 5 | NODE | 부재 | `NOT_APPLICABLE` |
| 6 | TASK | 부재 | `NOT_APPLICABLE` |
| 7 | EXECUTION | 부재 | `NOT_APPLICABLE` |
| 8 | SYSTEM | 부재 · 유사 `app_setting` 24h 캐시(Connectors.php:1749) | `LEGACY_ADAPTER` |
| 9 | SECRET_REFERENCE | 부재(승인) · 인접 = `channel_credential`(Db.php:976) | `MIGRATION_REQUIRED` |

**실측 개수: 9 / 9 전사.**

### 1.2 필수 필드 — **원문 19축**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | variable_definition_id | 부재 | `NOT_APPLICABLE` |
| 2 | workflow_version_id | 부재(§9) | `NOT_APPLICABLE` |
| 3 | variable_name | 부재 | `NOT_APPLICABLE` |
| 4 | variable type | 부재 | `NOT_APPLICABLE` |
| 5 | scope | 부재 | `NOT_APPLICABLE` |
| 6 | required 여부 | 부재 | `NOT_APPLICABLE` |
| 7 | default value reference | 부재 | `NOT_APPLICABLE` |
| 8 | allowed values | 부재 | `NOT_APPLICABLE` |
| 9 | data classification | 부재(grep 0) | `NOT_APPLICABLE` |
| 10 | mutable 여부 | 부재 | `NOT_APPLICABLE` |
| 11 | input 여부 | 부재 | `NOT_APPLICABLE` |
| 12 | output 여부 | 부재 | `NOT_APPLICABLE` |
| 13 | persisted 여부 | 부재 | `NOT_APPLICABLE` |
| 14 | searchable 여부 | 부재 | `NOT_APPLICABLE` |
| 15 | encrypted 여부 | `channel_credential` AES-256-GCM(Db.php:976) | `VALIDATED_LEGACY`(확장) |
| 16 | masking policy | 부재(grep 0) | `NOT_APPLICABLE` |
| 17 | validation rule | 부재 | `NOT_APPLICABLE` |
| 18 | status | 부재 | `NOT_APPLICABLE` |
| 19 | evidence | 부분(`audit_log` Db.php:540-546 — tenant_id·해시체인 없음) | `MIGRATION_REQUIRED` |

**실측 개수: 19 / 19 전사.** ★**19축 전부 전사 확인 — 말미 `evidence` 포함**(5-3-1 누락 편향 방지). 커버리지 = 신설 17 · 재사용/이관 2.

### 1.3 원문 서술 전사

> Credential Secret 원문을 Workflow Variable에 저장하지 마라.

**판정:** 🔴 **현행은 이 금지를 강제할 수단이 없다.** `action_json`·`payload_json` 이 임의 JSON 이므로 시크릿이 들어가도 막히지 않는다. `channel_credential`(AES-256-GCM · Db.php:976)만이 유일한 정본 보관소다.

## 2. 규칙

- **Variable 은 정의(Definition)이지 값이 아니다.** 값은 §35 Workflow Variable(인스턴스)이다 — 혼동 금지.
- 🔴 **Credential Secret 원문 저장 금지.** Variable 은 `SECRET_REFERENCE`(참조)만 보유하고, 원문은 `channel_credential`(AES-256-GCM)에 남긴다 — **신설 금고 만들지 마라**(Extend).
- `data classification` + `masking policy` 는 §16 Graph Validation 의 **"민감 Variable 의 Masking Policy 존재"** 검증과 짝이다 — 분류 없으면 검증이 공회전한다.
- 🔴 `NOT_APPLICABLE` 17축을 "있다고 가정"하고 배선 금지.
- `encrypted 여부`는 **선언**이고 실제 암호화는 기존 AES-256-GCM 경로에 위임한다(중복 암호 구현 금지).
