# DSAR — Approval Request Resource (§9)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)

## 0. 현행 실측 (file:line) — Resource 바인딩

| 스펙 요구 | 현행 실측 (코드 근거) | Canonical 분류 |
|---|---|---|
| **Resource 분리 테이블** | **부재(grep 0)** — Request 1:N Resource 구조 없음 | **NOT_APPLICABLE(부재 → 신설)** |
| Resource 의 **현행 표현** | `mapping_change_request` 는 Resource 를 **평면 컬럼으로 인라인**: `platform`·`field`·`raw_value`·`canonical_value`(Db.php:626-629). **Request=Resource 동일시** | **★MIGRATION_REQUIRED**(§4.1 정면 상충) |
| `action_request` 의 Resource | `action_json` **JSON 블롭** 내부(Db.php:597). `executeAction` 이 런타임에 `channel`/`platform`, `campaign_ext_id`/`external_id`/`campaign_id`/`adset_id` 를 **키 폴백 체인**으로 추출(Alerting.php:621-622) — **스키마 없음 · 계약 불명** | **MIGRATION_REQUIRED** |
| `resource_type` | **부재(grep 0)** — 타입은 **테이블 소속**으로만 암묵 표현 | **NOT_APPLICABLE(신설)** |
| `resource_id` | 부분 — `admin_growth_approval.ref_id`·`ref_key`(AdminGrowth.php:144)가 **유일한 명시적 Resource 참조** | **LEGACY_ADAPTER**(승격 후보) |
| `resource_version` / drift 탐지 | **부재(grep 0)** — 승인 대상 Resource 의 버전 미기록 → **§4.5 승인 후 원본 변경 탐지 불가** | **NOT_APPLICABLE(신설)** |
| Relationship Type | **부재(grep 0)** — primary/secondary/affected 등 관계 축 없음 | **NOT_APPLICABLE(신설)** |
| Resource Snapshot | **부재(grep 0)** — §4.4 상충 | **NOT_APPLICABLE(신설)** |
| **REBATE_\* Resource** | ★**대상 엔티티 자체가 코드에 0**(backend/src·frontend/src grep 0) | **NOT_APPLICABLE(전방호환 계약)** |

### 0-1. 참조 가능한 실재 레지스트리 (Resource 식별 기반)

| 레지스트리 | 실측 | 분류 |
|---|---|---|
| `channel_registry` | ChannelRegistry.php:16,29 — **tenant_id 없는 글로벌** | **VALIDATED_LEGACY**(테넌트 축 주의) |
| `channel_credential` | Db.php:976 · AES-256-GCM | **VALIDATED_LEGACY** |
| `app_user` · `api_key` | Db.php:1099 · Db.php:942-955(role/scopes_json) | **VALIDATED_LEGACY** |
| Workspace · Organization · Legal Entity · Country/Region · Feature Flag · Incident · Task · Workflow | **전부 부재(grep 0)** — Workspace 실체는 `tenant_kv` KV(WorkspaceState.php:59) · Geo.php:19 는 IP→국가 **탐지**(레지스트리 아님) | **NOT_APPLICABLE(신설)** |

## 1. 스펙 §9 필드 15 + Relationship Type 11 전사 — **BLOCKED**

**분류: `BLOCKED_SPEC_TEXT_UNAVAILABLE`**

REQ 분모(§7 표)는 **"§9 Approval Request Resource 필드 = 15"**, **"§9 Relationship Type = 11"** 이라는 **개수만** 영속한다. **15개 필드명·11종 Type 명은 저장소에 없다**(REQ 외 grep 0).

**추측 생성 금지** — REQ §16(요구 날조 0) · REQ §9(351 사건) · REQ §15(역산 금지). **해제 조건**: 스펙 §9 원문 수령 → 전사표로 교체(§0 유효).

## 2. 규칙

- **§4.1 최우선**: Approval Request 와 Business Resource 를 동일시하지 않는다. 현행 `mapping_change_request` 의 **인라인 4컬럼이 이 원칙의 실측 위반 사례** — Resource 분리 시 **기존 컬럼 파괴 금지**(투영 유지 · 무후퇴).
- **JSON 블롭 → 스키마**: `action_json` 키 폴백 체인(Alerting.php:621-622)은 계약 부재의 증상. Canonical Resource 도입 시 **폴백 체인 전부를 명시 필드로 승격**하되 **기존 키 계속 수용**(하위호환).
- **`channel_registry` 글로벌 주의** — Resource 식별에 사용 시 **테넌트 격리 검증 필수**(헌법: 테넌트 격리 절대).
- **REBATE_\* Resource 선행 신설 금지** — 대상 엔티티가 0인데 승인 Resource 를 만들면 **287차 죽은 스켈레톤** 재발.
