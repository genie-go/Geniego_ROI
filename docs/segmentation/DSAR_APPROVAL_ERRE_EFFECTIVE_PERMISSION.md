# DSAR — APPROVAL_EFFECTIVE_PERMISSION (EPIC 06-A-03-02-03-04 Part 3-7 · per-entity · SPEC §8)

- **상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · BLOCKED_PREREQUISITE · 289차 후속 (2026-07-20)
- **상위 SPEC**: [`EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md) §8
- **상위 ADR**: [`ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md)
- **Ground-Truth**: [`DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md)(①) · [`DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md)(②)
- **판정**: PARTIAL-substrate / ABSENT-governance — substrate=`subjectPerms`·`normActions`·`clampActions`(`TeamPermissions.php`)
- **불변**: 반날조(모든 `file:line`은 상위 SPEC·ADR·Ground-Truth ①② 등장분만) · Extend-only · Explicit Deny > Allow(ADR D-4)

---

## 1. 목적

SPEC §8 Effective Permission Calculator가 산출하는 **결과 엔티티** APPROVAL_EFFECTIVE_PERMISSION을 정의한다. Direct·Inherited·Composite·Dynamic·Runtime·Service Permission을 통합하되, **Permission Merge Rule**을 반드시 준수한다(SPEC §8 원문):
- **Explicit Deny > Allow**
- **Narrow Scope > Wide Scope**
- **Runtime Constraint > Static Constraint**

이 엔티티는 Resolution Pipeline(SPEC §4)의 15단계 "Effective Permission Generation" 산출물이며, 런타임 projection(SPEC §27 "Effective Permission Set")의 입력이다.

**Ground-Truth 요지**: permission 산출의 실존 substrate는 `subjectPerms`(`TeamPermissions.php:202`)·`normActions`(`:182`)·`clampActions`(`:423`)이며, allow-only grant 모델(acl_permission)에 clamp·intersection이 적용된다. **통합 "deny beats allow" 규칙과 negative-ACL 레코드는 부재**(Ground-Truth ① §3) — merge rule의 1항(Explicit Deny > Allow)은 scope 차원 센티넬로만 국소 구현.

## 2. Ground-Truth 현황

### 2.1 실존 substrate (PARTIAL — permission projection·clamp)

| substrate | file:line | Resolution Kernel 매핑 | 판정 |
|---|---|---|---|
| `ACTIONS` 8동작 상수(view..manage, manage=슈퍼셋) | `TeamPermissions.php:39` | Permission Projection (vocabulary) | PRESENT |
| `subjectPerms()` — acl_permission → menu_key⇒actions[] 맵(request-time DB 읽기) | `TeamPermissions.php:202` | Assignment Collection | PRESENT |
| `normActions()` — ACTIONS 부분집합 정렬 + dedupe + view 자동포함 | `TeamPermissions.php:182` | **Permission Projection / canonical ordering·dedupe** | PRESENT |
| `actionsCover()` — manage 슈퍼셋 판정 | `TeamPermissions.php:194` | Permission Projection | PRESENT |
| `clampActions()` — want∩cap 교집합(cap manage면 전체 허용) | `TeamPermissions.php:423` | **Conflict Detection / intersection (narrow>wide)** | PRESENT |
| `effectiveForUser()` — member 명시권한을 팀상한과 교집합 clamp | `TeamPermissions.php:393` | Effective Generation | PRESENT(팀 한정) |
| `putMemberPermissions()` — assignable 초과 검증(403 `DELEGATION_EXCEEDED`)+clamp | `TeamPermissions.php:641` | Conflict Detection / write | PRESENT |
| `reclampTeamMembers()` — 팀권한 축소 시 멤버 재클램프(영속) | `TeamPermissions.php:809` | Conflict Detection / re-projection | PRESENT |
| api_key write 게이트: write:* 없으면 rank 기반 403 | `index.php:587` | Permission Projection (api_key 차원) | PRESENT |
| plan 기능 게이트 `requireFeaturePlan()` | `UserAuth.php:77` · `PlanPolicy.php:27`(`FEATURE_MIN_PLAN`)·`:47`(`minPlanFor`, 미정의 fail-secure 'pro') | Permission Projection (plan 차원) | PRESENT |
| api_key scope 상한 교차검증(초과→422)+`array_unique` dedupe | `Keys.php:99` · `:102` · `:201`(`allowedScopesForRole`) | Conflict Detection / dedupe·cap | PRESENT |

### 2.2 Merge Rule 실측 (PARTIAL)

- **Explicit Deny > Allow**: **PARTIAL**. 통합 "deny beats allow" 규칙 부재. acl_permission은 **allow-only grant 모델** — 행 단위 negative-ACL(explicit deny 레코드) 테이블·로직 부재(Ground-Truth ① §3). deny 우선은 scope 차원 `__deny__` 센티넬(`TeamPermissions.php:234`)로만 국소 존재(별편 EFFECTIVE_DENY 소관).
- **Narrow Scope > Wide Scope**: **PRESENT**. `clampActions`(`:423`)=want∩cap, member→팀상한 clamp. narrow(member)<wide(team)<widest(owner) 위계(Ground-Truth ① §3).
- **Runtime Constraint > Static Constraint**: **ABSENT**. runtime constraint를 static보다 우선 적용하는 통합 로직 grep 0(별편 EFFECTIVE_CONSTRAINT 소관).
- **combine/merge 함수**: 명시적 명명 함수 **부재** — 결합은 `effectiveForUser`(`:393`) 내부 인라인. `$result + ['role'=>...]`(`effectivePermissions:694`)가 유일한 merge 유사(Ground-Truth ① §3).

### 2.3 KEEP_SEPARATE (오흡수 금지)

- `RuleEngine.php`(channel_roas/sku_stock 캠페인 자동제어) · `Decisioning.php` · `AnomalyDetection.php` · `Alerting.php`(`:665` "executor identity"=알림 실행자, resolution executor 아님)는 **권한 permission이 아니다**(Ground-Truth ② §4). merge/combine 명명이 유사해도 흡수 금지.

## 3. Canonical 설계

APPROVAL_EFFECTIVE_PERMISSION 엔티티 canonical 필드(SPEC §8):

| # | 필드 | 의미 |
|---|---|---|
| 1 | effective_permission_id | 산출 결과 식별자 |
| 2 | subject_ref | 대상 주체 |
| 3 | permission_set[] | resource/action 실효 권한 집합 |
| 4 | merge_trace[] | Direct/Inherited/Composite/Dynamic/Runtime/Service 출처 + merge rule 적용 근거 |
| 5 | deny_applied[] | 우선 적용된 Explicit Deny 항목(EFFECTIVE_DENY 참조) |
| 6 | scope_binding | 적용 narrow scope(EFFECTIVE_SCOPE 참조) |
| 7 | resolution_version | 불변 버전 바인딩 |
| 8 | digest | Snapshot Digest 참조 |

**Merge 알고리즘**(SPEC §8): (1) 모든 출처 permission 수집 → (2) Explicit Deny를 최우선 차감 → (3) narrow scope 우선 적용 → (4) runtime constraint를 static보다 우선. `clampActions`(`:423`) intersection 원리를 통합 merge로 승격하되, deny 차감을 앞단에 신설.

## 4. Resolution Kernel 매핑

| SPEC §4 Pipeline 단계 | 본 엔티티 기여 | substrate 승격 대상 |
|---|---|---|
| 3. Assignment Collection | permission grant 수집 | `subjectPerms`(`:202`) |
| 9. Explicit Deny Projection | deny 우선 차감 입력 | `__deny__`(`:234`) → 별편 EFFECTIVE_DENY |
| 11. Permission Projection | action 정규화·dedupe | `normActions`(`:182`)·`actionsCover`(`:194`) |
| 13. Conflict Detection | intersection·cap 검증 | `clampActions`(`:423`)·`putMemberPermissions`(`:641`) |
| **15. Effective Permission Generation** | **permission_set 산출·merge** | `effectiveForUser`(`:393`) 승격 |

## 5. 무후퇴 · Extend

- **Extend-only**(ADR D-1): `subjectPerms`·`normActions`·`clampActions`를 파괴하지 않고 Effective Permission Calculator 단계 구현체로 승격.
- **Explicit Deny > Allow 전역화**(ADR D-4): 현행 국소 `__deny__` 센티넬을 전역 Deny Calculator 산출과 결합해 permission merge 앞단에서 차감. narrow scope > wide scope는 `clampActions`가 이미 보장.
- **실재 과신 회피**(ADR D-7): allow-only grant 모델에 negative-ACL·통합 combine 함수가 없음을 "merge가 이미 있다"로 오판 금지.
- **무후퇴**: `requireFeaturePlan`·api_key write 게이트·scope 상한 검증은 ERRE 완성까지 유지·병행.

## 6. 완료게이트 기여

SPEC §37 중 기여 항목:
- "Effective Permission Calculator 구축" — 본 엔티티는 산출물 계약.
- Merge Rule 3항(deny>allow / narrow>wide / runtime>static) 결정성 — Regression(SPEC §36) RBAC·ABAC 회귀 검증 대상.
- 성능(1M Effective Permission Projection·SPEC §36)은 실 구현 세션 조건.
- 실 구현은 선행 foundation(Part 1~3-6) 인증 후 별도 승인 세션(RP-track). 본 편 코드 0·NOT_CERTIFIED.

## 7. 반날조 인용 출처

- `TeamPermissions.php:39` · `:182` · `:194` · `:202` · `:234` · `:393` · `:423` · `:641` · `:694` · `:809`(Ground-Truth ① §2.A·§3)
- `index.php:587`(① §2.B) · `UserAuth.php:77`(① §2.C) · `PlanPolicy.php:27` · `:47`(① §2.D) · `Keys.php:99` · `:102` · `:201`(① §2.E)
- KEEP_SEPARATE: `Alerting.php:665`(Ground-Truth ② §4)

실코드 파일 미열람 — 정본 4문서가 유일 근거. NOT_CERTIFIED · 코드 변경 0.
