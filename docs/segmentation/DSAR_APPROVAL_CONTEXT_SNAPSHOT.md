# DSAR — Approval Context Snapshot (§32)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **분모 정합**: 행 수 = REQ §7(스펙 §32 Context Snapshot 필드 = 19). 스펙 원문 나열 **저장소 미영속** → `UNVERIFIED_TRANSCRIPTION`.

## 0. 현행 실측 대조표 (file:line)

**★Context Snapshot 전면 부재(승인 도메인·grep 0).** 승인 당시의 **환경·주체·권한·정책 맥락을 고정하는 수단이 하나도 없다.**

| 맥락 축 | 현행 실측 | 분류 |
|---|---|---|
| Environment | `Db::env()`(`Db.php:46,57`) — `GENIE_ENV` → `'demo'|'production'` **2값 분기**. **승인 행에 기록되지 않음** | **LEGACY_ADAPTER**(값 원천만 존재) |
| Tenant | `action_request.tenant_id` **후행 ALTER**(`Db.php:589` · 208차 P0 IDOR) · `mapping_change_request.tenant_id`(`Db.php:623-636`) | **VALIDATED_LEGACY**(부분) |
| **Workspace** | 레지스트리 **부재** — 실체는 `tenant_kv` KV(`WorkspaceState.php:59`) | **NOT_APPLICABLE(신설)** |
| **Organization · Legal Entity** | **부재(grep 0)** | **NOT_APPLICABLE(신설)** |
| Actor 신원 | `Mapping::actorId`(`Mapping.php:36-53`) **위조불가 서버해석** ↔ `Alerting.php:33-36` **`X-User-Email` 헤더 위조가능** | **VALIDATED_LEGACY** / **MIGRATION_REQUIRED**(혼재) |
| **Actor 권한 스냅샷** | **부재(grep 0)** — 승인자가 *그 시점에* 어떤 권한이었는지 재현 불가 | **NOT_APPLICABLE(신설 · §21) ** |
| **Policy Version** | **부재(grep 0)**. `PlanPolicy`(`PlanPolicy.php:17,20,28`) = **PHP const 배열**(버전 없음) · 🔴 **fail-open**(`:12` 주석 자인) | **NOT_APPLICABLE(신설)** → §33 |
| IP / User-Agent / Request-Id | 승인 테이블 **부재**. **`menu_audit_log` 만** `ip_address`·`user_agent`·`request_id`(`AdminMenu.php:123-131,236-239`) 보유 | **★재사용 선례**(승인 도메인 아님) |
| **Correlation** | `correlation_id` **grep 0** | **NOT_APPLICABLE(신설)** → §34 |
| APPROVAL_CONTEXT_SNAPSHOT | **grep 0** | **NOT_APPLICABLE(부재 → 신설)** |

> **판정: 승인 근거의 재현 가능성 = 0.** 현행 4개 승인 테이블은 `status`·`approvals_json`·`created_at` 만 남긴다.
> "**어떤 환경에서 · 누가 · 어떤 권한으로 · 어떤 정책 버전 하에서 승인했는가**"는 **전부 소실**된다.
> `menu_audit_log` 가 이 맥락(ip/ua/request_id/역할/해시체인)을 **이미 갖고 있다** — 승인 도메인이 못 가진 게 아니라 **연결이 안 된 것**이다.

## 1. CANONICAL_APPROVAL_CONTEXT_SNAPSHOT 필드 (19)

| # | 필드 | 비고 |
|---|---|---|
| 1 | `context_snapshot_id` | PK |
| 2 | `tenant_id` | 격리 필수 |
| 3 | `request_id` | FK → §7 |
| 4 | `case_id` | FK → §12 · nullable |
| 5 | `snapshot_type` | §30 8종 재사용(**중복 신설 금지**) |
| 6 | `environment` | `Db::env()` 확장(`Db.php:46,57`) |
| 7 | `workspace_id` | **신설**(현행 `tenant_kv` KV → 레지스트리 승격) |
| 8 | `organization_id` | **신설**(grep 0) |
| 9 | `legal_entity_id` | **신설**(grep 0) |
| 10 | `actor_id` | **위조불가 서버해석**(`Mapping.php:36-53` 패턴 강제) |
| 11 | `actor_role_at_time` | §21 |
| 12 | `actor_authorization_snapshot_id` | FK → §21 |
| 13 | `policy_reference_id` | FK → §33 |
| 14 | `policy_version_at_time` | **승인 근거 재현의 핵심**(현행 부재) |
| 15 | `correlation_id` | §34 |
| 16 | `client_ip` | **`AdminMenu.php:123-131` 확장** |
| 17 | `user_agent` | 동상 |
| 18 | `request_id_header` | `X-Request-Id`(`AdminMenu.php:236-239` 확장) |
| 19 | `taken_at` | |

## 2. 규칙

- **Immutable · Append-only**(§4.9) — **UPDATE·DELETE 금지**.
- **Context ≠ Resource**(§4.1) — 본 문서는 **승인 당시 환경/주체/정책 맥락**만. 원본 업무 데이터는 `DSAR_APPROVAL_RESOURCE_SNAPSHOT.md`(§30). **혼동·중복 신설 금지**.
- **`snapshot_type` 은 §30 의 8종을 재사용**한다 — Context 전용 타입 신설 금지.
- **actor 는 헤더에서 읽지 않는다** — `Alerting.php:33-36`(`X-User-Email` 위조가능) 패턴 복제 금지 · `Mapping.php:36-53` 서버해석 **확장**(Golden Rule).
- **ip/ua/request_id 는 신설 아님** — `menu_audit_log`(`AdminMenu.php:123-131`) 선례 확장.
- `workspace_id`/`organization_id`/`legal_entity_id` 는 **현재 코드에 없다** — **있다고 가정하고 배선 금지**(287차 죽은 스켈레톤). 레지스트리 신설이 **선행조건**.
- **코드변경 0**.
