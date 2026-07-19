# DSAR — Permission Engine 중복 구현 감사 (EPIC 06-A-03-02-03-04 Part 2 · §93)

- **상태**: 중복감사 정본 (코드 변경 0) · 289차 후속 (2026-07-19)
- **원칙**: 동일 목적 구현이 있으면 중복 Registry/Resolver/Group/Bundle/Effective-Set 신설 금지 — Canonical Contract+Adapter로 통합(Golden Rule).
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)

---

## 1. 확인된 중복/병렬 구현

### D-1. ★3개 분리 rank/vocab 체계 (통합 resolver 부재) — 최우선 통합 대상
| 체계 | 위치 | 스케일 | 용도 |
|---|---|---|---|
| plan RANK | `PlanPolicy.php:19` (free/demo:0…admin:5) | 6단계 | 상용 기능 게이트 |
| api_key roleRank | `index.php:573` (viewer:0…admin:3) | 4단계 | 프로그래매틱 접근 |
| team_role hierarchy | `UserAuth`(owner/manager/member) | 3단계 | 팀 내 위임 |

→ 서로 무관한 3 스케일이 동일 요청에 각기 관여. Canonical Permission Resolution이 **단일 Effective Set으로 통합**(각 축은 Scope/Constraint/Actor-type로 편입)해야 함. **주의: plan은 Permission이 아님(§6.2)** — 통합은 "혼용"이 아니라 Resolution Context의 별개 차원으로 결합.

### D-2. admin 판정 — 289차 해소(부분 통합)
- 종전 5개소 드리프트 → **`resolveAdminByToken` SSOT로 4개소 위임 완료**(UserAdmin/SystemMetrics/DbAdmin/EventPopup). requireAdminUser(리치 userByToken)·TeamPermissions::isAdmin(배열술어)=의도적 별개 계층(`UserAuth.php:2995`). **잔여 중복 없음(정리됨)**.

### D-3. team_role member-readonly 규칙 3중 병렬 (의도적 defense-in-depth·단일 SSOT 정책화 필요)
- FE `writeGuard.js`/`teamRolePolicy.js`(UI) + 서버 per-handler `teamCanWrite`/`requireTeamWrite`(11개소) + 서버 전역 `guardTeamWrite`(index.php:82). 3 병렬 구현이 동일 member-readonly 규칙 표현. defense-in-depth는 정당하나 규칙 정의는 **단일 Policy 데이터**로(현재 코드 3곳 하드코딩).

### D-4. plan rank 수동 동기화 3중
- BE `PlanPolicy::RANK`(`:19`) vs FE `PLAN_TIER_RANK`(`planMenuPolicy.js:91`) vs `plans.js planRank` — 손 동기화(주석 `PlanPolicy.php:15`). Canonical Registry로 단일소스화 대상.

### D-5. Permission vocabulary 분산
- team-menu: `MENU_CATALOG`(26)+`ACTIONS`(8)+`DATA_SCOPES`(9) `TeamPermissions.php:39-82`.
- api_key: ad-hoc scope 문자열(`read:*` 등) `index.php:577`.
- plan: `FEATURE_MIN_PLAN` 키 `PlanPolicy.php:27`.
- admin: `plan/plans='admin'`+`admin_level`.
→ 4개 별도 vocabulary. Canonical Permission Registry/Namespace(`{DOMAIN}:{RESOURCE}:{ACTION}`)로 정규화(Legacy Mapping·confidence 기록).

## 2. 중복이 **아닌** 것 (정직 판정·오탐 예방)
- data_scope enforce 4핸들러 = 중복 아님(단일 엔진·소비처 적음이 gap일 뿐).
- resolveAdminByToken vs requireAdminUser vs TeamPermissions::isAdmin = **의도적 계층 분리**(토큰→admin행 / 리치 userByToken / 배열술어). 통합 완료·잔여 중복 아님.
- FE UI 게이트 vs 서버 게이트 = defense-in-depth(중복 아님·규칙정의 단일화만 필요).

## 3. 통합 결정 (조립 계획)
- **금지**: 신규 Permission Registry/Resolver/Group/Bundle/Effective-Set 병렬 신설.
- **채택**: TeamPermissions(acl/data_scope)를 Permission Scope/Grant substrate로, index.php RBAC를 PEP로, resolveAdminByToken를 admin bypass 정본으로 흡수. 3 rank 체계는 Canonical Resolution Context의 별개 차원(plan=상용게이트·api_key=actor-type·team_role=위임)으로 결합하되 단일 Effective Set 산출.
- **실 구현**: 선행 Decision Core + Canonical Action/Resource Registry 신설 후 별도 승인세션(RP-002). 이번 차수=설계(코드 0).
