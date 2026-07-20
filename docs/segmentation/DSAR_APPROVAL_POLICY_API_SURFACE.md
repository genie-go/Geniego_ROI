# DSAR — PDP/PEP Governance: API 표면 (Part 3-12 §29)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_12_PDP_PEP_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_PDP_PEP_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_POLICY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_POLICY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §29는 최소 6개 API를 정의한다: **Evaluate Policy**(요청→결정), **Explain Decision**(SPEC §16 Why Permit/Deny), **Publish Policy**(PAP 게시), **Simulate Policy**(SPEC §21 영향분석), **Query Decision**(스냅샷 조회), **Query Analytics**(SPEC §17 지표). 모든 신설 API는 CLAUDE.md 관례상 `/api/...` 접두(nginx SPA 폴백 착시 회피)·중앙 PEP(`index.php:69`) RBAC·X-Tenant-Id 격리(`:619`)를 준수한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| API | 판정 | 재활용/신규 근거 |
|---|---|---|
| Evaluate Policy | **PARTIAL(proto)** | proto-PDP `effectiveForUser`(`TeamPermissions.php:393-421`)·`effectiveScope`(`:236-265`)가 결정 산출 최근접이나 private·미배선(GT① §C). 공개 evaluate 엔드포인트 ABSENT |
| Explain Decision | **ABSENT** | 런타임 결정 설명 생성기 부재(GT② §2). `$violations`(`TeamPermissions.php:656-674`)는 위임검증 위반 나열만(확장 재료) |
| Publish Policy | **PARTIAL(de-facto PAP)** | 권한/scope CRUD(`TeamPermissions.php:598-621`·`:642-692`·`replaceScope` `:337-346`)는 파괴적 전체교체·버전/게시 없음(GT① §H) |
| Simulate Policy | **ABSENT** | authz 결정 시뮬 전무(GT② §2·§C-3 마케팅 simulate와 분리) |
| Query Decision | **PARTIAL** | 감사 SSOT `auth_audit_log`·`logAudit`(`UserAuth.php:4174-4197`)·SecurityAudit 체인(`SecurityAudit.php:12-68`) 존재하나 결정 스냅샷 질의 API 없음 |
| Query Analytics | **ABSENT** | authz Decision Analytics(Permit/Deny/Latency/Cache Hit) 전무(GT② §2) |

## 3. 설계 계약 (항목·규칙 — SPEC 근거)

1. **Evaluate Policy(§29·§4)**: 요청(Subject/Resource/Action/Environment·SPEC §3)→PDP→결정. `effectiveForUser`(`:393-421`)를 중앙 PDP로 승격(ADR D-1)·Decision Pipeline 12단계 고정순서. 결정론적 출력.
2. **Explain Decision(§16)**: Why Permit/Deny/Which Policy/Rule/Scope/Assignment/Deny/Risk 반환. `$violations`(`:656-674`)·scope trace(`effectiveScope` `:236-265`) 확장.
3. **Publish Policy(§7)**: PAP 게시/버전/Approval. `TeamPermissions.php:598-692` 파괴적 CRUD에 Immutable Version·게시 계층 추가(ADR D-3). AccessReview(`AccessReview.php:1-30`) 인접.
4. **Simulate Policy(§21)**: New Policy/Rule/Context/Scope 영향분석(Permit/Deny 변화·Latency·Cache) 순신규.
5. **Query Decision / Query Analytics(§17)**: 스냅샷·Evidence(`SecurityAudit.php:12-53`) 조회·결정 지표 집계. 전 API는 중앙 PEP(`index.php:69`·`:78-89`) 강제·write는 `analyst+`(`:587-597`)·admin scope(`:583-586`) 준수.

## 4. KEEP_SEPARATE (마케팅 policy 흡수금지)

본 API는 **authz 정책** 전용이다. 마케팅/ops의 policy·simulate·recon API는 별개·개명 금지(GT② §5): Catalog `evaluatePolicy`/`requiresHighValueApproval`(`Catalog.php:1104`·`:1159`)·RuleEngine(`RuleEngine.php:24`)·Decisioning recommendations(`Decisioning.php:432`)·action_request policy(`routes.php:439-445`·`:457-463`)·PriceOpt/AdminGrowth simulate(`PriceOpt.php:927`·`AdminGrowth.php:1239`)·PgSettlement/Connectors recon(`routes.php:655`·`Connectors.php:902`). Evaluate/Simulate/Publish Policy는 이들과 엔드포인트 공유 금지.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**NOT_CERTIFIED · 코드 변경 0.** Explain·Simulate·Query Analytics = **ABSENT(순신규)**. Evaluate(proto `effectiveForUser` `:393-421`)·Publish(de-facto PAP `:598-692`)·Query Decision(감사 `UserAuth.php:4174`) = **PARTIAL** — 재활용 후 승격/버전화. 전 API는 중앙 PEP(`index.php:69-619`) RBAC·X-Tenant-Id(`:619`) 위에 신설. 선행의존: 중앙 PDP·Policy Registry·Decision Cache/Explain(ADR D-1·D-3) 구축 후 성립(BLOCKED_PREREQUISITE). Part 1~3-11 인증 후 RP-track 실구현.
