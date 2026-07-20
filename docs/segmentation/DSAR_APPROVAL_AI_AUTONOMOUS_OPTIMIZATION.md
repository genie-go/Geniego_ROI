# DSAR — Authorization AI Governance: 자율 최적화 엔진 (APPROVAL_AI_AUTONOMOUS_OPTIMIZATION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_AI_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_AI_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_AI_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

SPEC §20 Autonomous Optimization Engine은 인가 AI가 **인간 승인 없이 자동 수행 가능/불가**한 범위를 규정한다.
- **자동 수행 가능**: Cache Optimization · Query Optimization · Recommendation Ranking · Dashboard Personalization (부작용 없는 성능/표현 계층).
- **자동 수행 불가**: Policy 변경 · Permission 삭제 · Role 삭제 · Compliance Rule 변경 (권한 표면을 바꾸는 파괴적 변경 — Human Approval Gateway(§19) 필수).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §20 요소 | 판정 | 근거(파일:라인) |
|---|---|---|
| authz 자율 최적화(자동 수행) | **ABSENT** | GT② §2 "Autonomous Optimization / Continuous Learning(authz) = ABSENT. 자율 최적화 전무" |
| 자동 수행 불가 대상 보호(수동 통제) | **PARTIAL(수동·자동 아님)** | `TeamPermissions.php:356-373`·`:381-387` scopeWithinCap/assignableMap(수동 위임상한)·`:152-159`·`:810-831` reclampTeamMembers(정적 RBAC) |
| 자동수행 불가의 human 게이트 | **PARTIAL(재활용)** | maker-checker `Mapping.php:268-271`·`Alerting.php:642-650`·`AccessReview.php:177-242`(§19 게이트) |

★자율 집행 엔진은 grep 0(GT② §2·§B-3의 마케팅 `ModelMonitor` retrain은 자율 authz 아님).

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **자동 허용 화이트리스트**: Cache/Query Optimization·Recommendation Ranking·Dashboard Personalization만 `autonomous_allowed=true`(§20). 그 외 전부 `false`.
- **자동 금지 강제**: Policy/Permission/Role/Compliance Rule 변경은 **자동수행 불가**·Human Approval Gateway(§19) 경유 필수. 집행은 기존 통제(RBAC/PDP/PEP)·AI는 추천만(ADR D-6 "집행은 기존 통제").
- **제약**: Runtime Guard `Unapproved Recommendation Deployment`/`AI Bypass`(§28)·Static Lint `Missing Human Approval`(§29). Tenant Isolation(§33). Error `AI_GOVERNANCE_BLOCKED`(§30).

## 4. KEEP_SEPARATE (마케팅 explainability/top_drivers 흡수금지)

`ModelMonitor.php:161-218` retrain·`:293-313` seedDemoModels·`AutoRecommend.php:35-920`(UCB bandit `:81`·자가학습 prior `:185`)·`Mmm.php:1-23` 한계ROAS 최적화는 **마케팅 광고 자율/자가학습**이다(GT② §B-1·§B-5). authz Autonomous Optimization(권한/정책 대상)으로 **흡수 금지**. `Decisioning.php:12-477` 광고 의사결정도 authz 자율집행 아님(ADR D-7).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**판정 = ABSENT-greenfield(authz 자율 최적화 순신규).** 자동수행은 성능/표현 계층(cache/query/ranking/dashboard)만 허용, 파괴적 변경(policy/permission/role/compliance)은 절대 자동 금지·Human Approval 필수(§20·ADR D-3). 재활용: maker-checker 게이트(§19). ABSENT: 자율 집행 엔진·authz 최적화 파이프라인. 선행 의존: Part 1~3-14 인증 후 실 구현(BLOCKED_PREREQUISITE). 코드 변경 0 · NOT_CERTIFIED. 마케팅 자율/자가학습(ModelMonitor/AutoRecommend/Mmm) 흡수 금지.
