# DSAR — PDP/PEP Governance: 거버넌스 부재 + 중복/근접물 감사 (Ground-Truth ②)

> **거버넌스 상태**: Ground-Truth 증거 문서 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_12_PDP_PEP_GOVERNANCE_SPEC.md`(canonical 원문 verbatim · Version 1.0).
> 상위 ADR: `docs/architecture/ADR_DSAR_PDP_PEP_GOVERNANCE.md`. Ground-Truth ①: `DSAR_APPROVAL_POLICY_EXISTING_IMPLEMENTATION.md`.
> (A) 거버넌스 계층 ABSENT/PARTIAL 실측 + (B) ★하드코딩 authz(Missing PDP) + (C) KEEP_SEPARATE 마케팅 policy/decision.

---

## 1. 핵심 판정 — **중앙 PDP·Policy Registry·Decision Cache/Explain 부재, 인가는 코드 if 분기·DB 권한행에 암묵 내장**

`policy_version|policy_bundle|policy_registry|PolicyPackage|publishPolicy|decision_cache|pdp|pep` **authz 매치 0건**(히트는 전부 `alert_policies`(Alerting)·`mfa_policy`·`PlanPolicy`·`__deny__` 우연매치). XACML식 선언적 정책 계층은 그린필드. 단 proto-PDP(effectiveForUser)·PIP·분산 PEP(GT①)는 재활용.

## 2. 거버넌스 계층 실측표

| SPEC 항목 | 판정 | 근거(파일:라인) |
|---|---|---|
| Policy Registry/Repository/Version/Package/Bundle | **ABSENT(grep 0)** | authz 정책 선언·버전·게시 전용 구조 전무. 정책은 코드(if 분기)·DB 권한행(`acl_permission`/`data_scope`·`TeamPermissions.php:152-166`)에 암묵 내장 |
| 통합 PDP(결정론적 중앙 평가) | **ABSENT / PARTIAL(proto)** | `effectiveForUser`(`TeamPermissions.php:393-421`)가 최근접이나 private·미배선. Effective Role/Scope/Deny/Dynamic/Risk/Policy/SoD/JIT/Compliance 통합 평가 부재 |
| PEP(단일 강제·우회불가) | **PARTIAL(이원분산)** | 중앙 coarse PEP(`index.php:69-619`)+분산 handler PEP(`requireTeamWrite`·`guardWarehouse`)+하드코딩(§B). PEP가 PDP를 경유하지 않고 각자 판정 → "PEP는 PDP 우회불가" 위반 상태 |
| PIP | **PRESENT** | `acl_permission`/`data_scope`(`TeamPermissions.php:39-41`)+세션(`UserAuth.php:256-268`). device/geo·계산된 risk는 PDP 미배선(PARTIAL) |
| PAP(정책관리·게시·버전) | **PARTIAL** | `TeamPermissions.php:598-692` 권한 CRUD(파괴적 교체·버전/게시 없음) |
| Decision Pipeline(12단계 고정순서) | **ABSENT** | 고정순서 파이프라인 부재. 각 PEP가 개별 순서로 부분 판정 |
| Decision Types(Permit/Deny/Challenge/MFA/…) | **PARTIAL** | Require MFA/Challenge(`UserAuth.php:929-964`)·Read-only(`:1128`) 실집행. Permit/Deny/Escalate/Time-limited 통합 결정유형 부재 |
| Decision Combining(Deny-overrides) | **ABSENT** | `__deny__` 센티넬(`TeamPermissions.php:234`)은 단일 스코프 fail-closed용. allow/deny 병합·deny-overrides 규칙 부재 |
| Runtime Decision Cache + Invalidation | **ABSENT** | subject/resource/action/context-hash→decision 캐시 전무(`TeamPermissions.php:202-225` 매 호출 DB 재계산) |
| Decision Explain(Why Permit/Deny) | **ABSENT** | 런타임 결정 설명 생성기 부재. `$violations`(`:656-674`)는 위임 검증 위반 나열만 |
| Decision Snapshot/Evidence/Digest | **PARTIAL** | SecurityAudit 해시체인(`SecurityAudit.php:12-68`)·auth_audit_log(`UserAuth.php:4174`)는 문자열 detail만. rule/scope trace 결정증거 미기록 |
| Decision Analytics/Drift/Simulation/Reconciliation(authz) | **ABSENT** | authz 결정 통계·드리프트·시뮬 전무(§C 마케팅 KEEP_SEPARATE) |
| Runtime Guard(PDP bypass/PEP disable)/Static Lint(hardcoded authz) | **ABSENT** | PDP 우회 차단·하드코딩 authz lint 전무. 하드코딩 61+12개소(§B)가 lint 대상 |

## 3. 재활용 substrate 요약 (순수 그린필드 아님 — 흡수 아닌 재활용)

1. **proto-PDP** — `effectiveForUser`(`TeamPermissions.php:393-421`)를 중앙 PDP로 승격.
2. **PIP** — `acl_permission`/`data_scope`+세션 속성(`UserAuth.php:256-268`). PDP 속성원 그대로 사용.
3. **PEP 강제 헬퍼** — `scopeSql`/`scopeSqlNamed`(`:286-322`)+`__deny__` fail-closed. PDP 소비 강제점.
4. **중앙/분산 PEP** — `index.php:69-619`·`requireTeamWrite`·`guardWarehouse`. PDP 배선 대상.
5. **Decision Types** — MFA/Challenge(`UserAuth.php:929-964`)·Read-only(`:1128`). 결정유형 재사용.
6. **Evidence** — SecurityAudit 해시체인(`SecurityAudit.php:12-68`)에 rule/scope trace 확장.
7. **PAP** — `TeamPermissions.php:598-692` CRUD에 버전/게시 계층 추가.

## 4. ★B. 하드코딩 authz (Missing PDP·Static Lint 대상)

인가 판정이 통합 PDP가 아니라 각 핸들러 if 분기에 산재 — 중앙 PDP 부재의 직접 증거이자 §26 Static Lint(Direct Permission Check/Hardcoded Authorization)의 제거 대상.
- **admin 문자열 직접비교 61개소/14핸들러**(대표: `UserAdmin.php`·`Payment.php`·`AdminMenu.php`·`Keys.php`). 대표 PDP-side: `UserAuth.php:81`(`auth_role==='admin'`)·`:1138`(`plan==='admin'`)·`:1179`·`TeamPermissions.php:132`(isAdmin).
- **auth_role 직접판독 12개소/9핸들러**(`Pnl.php`·`Alerting.php`·`AdminMenu.php`·`EventPopup.php`·`DbAdmin.php`·`AccessReview.php`·`AutoRecommend.php`·`PM/Shared.php`).
- ★이는 **라이브 실결함이 아니라 아키텍처 부채**(중앙 PDP로 수렴할 대상)이며, Part 3-12는 설계만·수정 대상 아님.

## 5. ★C. KEEP_SEPARATE — authz policy/decision 아님 (마케팅·ops·finance·개명 금지)

★저장소의 "policy/decision/cache/simulate/drift/reconcil" 신호는 **거의 전부 마케팅·ops·finance**다. authz PDP substrate와 코드·데이터 공유 없음.

### C-1. 마케팅/커머스 policy·decision 엔진
- `Catalog.php:1104`(evaluatePolicy — 상품 리스팅 컴플라이언스/고액승인)·`:1159`(requiresHighValueApproval). 커머스 상품등록 정책.
- `RuleEngine.php:24`(캠페인 룰엔진 daypart/pause_channel/frequency)·`Decisioning.php:12`·`:36`(ingestAdInsights)·`:432`(recommendations)·`AutoRecommend`. 마케팅 규칙/의사결정.

### C-2. 알림/승인 정책 (authz 아님)
- `action_request.policy_id`(`Db.php:576`·`:592-594`·`routes.php:439-445`·`:457-463`) = Alerting `alert_policies` 참조. 알림 액션정책·maker-checker(`Mapping.php:269`)는 알림/액션 거버넌스이지 authz PDP 아님.

### C-3. 비-authz drift/simulate/reconcil
- drift=`ModelMonitor.php:220-335`(ML 모델 드리프트)·simulate=`PriceOpt.php:927`·`AdminGrowth.php:1239`·reconcil=`PgSettlement`(`routes.php:655`)·`Connectors.php:902`(ROAS)·`Wms.php:2160`·`KrChannel.php:419`. authz Decision Drift/Simulation/Reconciliation 아님.

### C-4. entitlement·비-PDP risk
- `PlanPolicy` RANK(`PlanPolicy.php` const 배열·fail-open)·requirePlan(`UserAuth.php:364`)=상용 구매등급 게이트(authz와 직교·entitlement). `Risk.php`=공급망 fraud risk(마케팅). attribution_model_cache=마케팅 캐시.

## 6. 종합

**PDP/PEP 거버넌스 = ABSENT 골격(통합 PDP·Policy Registry·Decision Cache/Explain/Pipeline/Combining·authz Analytics/Drift/Sim) / PARTIAL(이원분산 PEP·PAP·Evidence) / PRESENT(PIP·proto-PDP effectiveForUser·Decision Types·__deny__).** 재활용(흡수 아님·확장): effectiveForUser→중앙 PDP 승격·PIP 그대로·scopeSql 강제·분산 PEP 수렴·SecurityAudit Evidence 확장·TeamPermissions PAP 버전화. **★Missing PDP 증거=하드코딩 authz 61+12개소(Static Lint 대상·라이브 결함 아님·설계만). ★KEEP_SEPARATE=Catalog evaluatePolicy·RuleEngine·Decisioning·AutoRecommend·action_request policy·ModelMonitor drift·PriceOpt/AdminGrowth simulate·PgSettlement/Connectors/Wms/KrChannel recon·PlanPolicy entitlement·Risk.php·attribution cache.** authz policy≠마케팅 policy.
