# DSAR — Approval Context Snapshot (§32)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **전사 근거**: [SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §32 — 원문 그대로 전사.
> 🔴 **분모 불일치**: **REQ 집계 19 ↔ 원문 실측 18 — 원문이 정본.** (본 축은 REQ 가 **과다** 집계 · 대다수 축과 반대 방향.) REQ §7 의 `19` 는 정정 대상 — 숫자 임의 정합 금지.

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

## 1. 스펙 §32 필수 필드 — 원문 전사 (실측 18)

`APPROVAL_CONTEXT_SNAPSHOT` — 원문 순서 그대로(좌 1~9 · 우 10~18):

| # | 필드 | # | 필드 |
|---|---|---|---|
| 1 | `approval_context_snapshot_id` | 10 | risk snapshot |
| 2 | `approval_request_id` | 11 | contract snapshot |
| 3 | `approval_case_id` | 12 | funding snapshot |
| 4 | requester snapshot | 13 | budget snapshot |
| 5 | actor candidate snapshot | 14 | incident snapshot |
| 6 | authorization snapshot | 15 | environment snapshot |
| 7 | organization snapshot | 16 | `captured_at` |
| 8 | role snapshot | 17 | `immutable_hash` |
| 9 | policy snapshot | 18 | `evidence` |

> 🔴 **원문 실측 18 ↔ REQ 집계 19 — 원문이 정본.** 숫자를 조용히 맞추지 않는다.

### 1-1. 🔴 placeholder ↔ 원문 대조 — 자작 항목 폐기 기록

289차 placeholder(19행)는 **필드 축 자체를 오해**했다. 원문 §32 는 **개별 스칼라 컬럼 나열이 아니라 "…snapshot" 묶음 축**이다:

| placeholder(자작·폐기) | 원문 §32 | 성격 |
|---|---|---|
| `client_ip` · `user_agent` · `request_id_header` | **없음** | **자작**(원문에 IP/UA/헤더 축 없음 — `menu_audit_log` 재사용 아이디어를 요구로 착각) |
| `correlation_id` | **없음**(§34 소관) | 자작(타 § 침범) |
| `snapshot_type` | **없음**(§30 소관) | 자작(타 § 침범) |
| `tenant_id`·`workspace_id`·`organization_id`·`legal_entity_id` 개별 컬럼 | **organization snapshot**(#7) 로 통합 | 축 분해 자작 |
| `actor_role_at_time`·`actor_authorization_snapshot_id` | **authorization snapshot**(#6) · **role snapshot**(#8) | 명칭 자작 |
| — | **requester snapshot**(#4) · **actor candidate snapshot**(#5) · **risk**(#10) · **contract**(#11) · **funding**(#12) · **budget**(#13) · **incident**(#14) snapshot | **원문에 있으나 placeholder 전면 누락** |

⇒ **원문이 정본.** 원문은 승인 맥락을 **업무 스냅샷 묶음**(contract·funding·budget·incident 포함)으로 요구하며, placeholder 의 인프라 메타(ip/ua) 지향과 **방향이 다르다**.

**현행 커버리지 = 18 중 0**(§0 실측 `APPROVAL_CONTEXT_SNAPSHOT` grep 0 · 판정 "승인 근거 재현 가능성 = 0" 유지).
원문 대조로 **불만족 폭이 오히려 확대**됨: contract/funding/budget/incident snapshot 축은 §0 대조표에 **항목조차 없었다**(전면 부재).

## 2. 규칙

- **Immutable · Append-only**(§4.9) — **UPDATE·DELETE 금지**.
- **Context ≠ Resource**(§4.1) — 본 문서는 **승인 당시 환경/주체/정책 맥락**만. 원본 업무 데이터는 `DSAR_APPROVAL_RESOURCE_SNAPSHOT.md`(§30). **혼동·중복 신설 금지**.
- **`snapshot_type` 은 §30 소관**(원문 §32 필드 아님) — Context 전용 타입 신설 금지 · §30 8종 재사용.
- **actor 는 헤더에서 읽지 않는다** — `Alerting.php:33-36`(`X-User-Email` 위조가능) 패턴 복제 금지 · `Mapping.php:36-53` 서버해석 **확장**(Golden Rule). 원문 축은 **requester snapshot(#4) · actor candidate snapshot(#5)**.
- **ip/ua/request_id 는 원문 §32 요구가 아니다**(자작 폐기) — `menu_audit_log`(`AdminMenu.php:123-131`) 재사용은 **감사 보강 아이디어**로 남기되 **요구 분모로 계상 금지**(REQ §15 역산 회피).
- `workspace_id`/`organization_id`/`legal_entity_id` 는 **현재 코드에 없다** — **있다고 가정하고 배선 금지**(287차 죽은 스켈레톤). 레지스트리 신설이 **선행조건**.
- **코드변경 0**.
