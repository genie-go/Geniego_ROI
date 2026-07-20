# DSAR — Runtime SoD Enforcement Governance: 실존 구현 substrate 전수조사 (Ground-Truth ①)

> **거버넌스 상태**: Ground-Truth 증거 문서 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_10_RUNTIME_SOD_ENFORCEMENT_GOVERNANCE_SPEC.md`(canonical 원문 verbatim · Version 1.0).
> 상위 ADR: `docs/architecture/ADR_DSAR_SOD_ENFORCEMENT_GOVERNANCE.md`.
> 본 문서는 Part 3-10(SoD) 설계의 반날조 인용 **정본 허용목록**이다. 하위 per-entity DSAR은 본 문서 + Ground-Truth ② + ADR 등장 `파일:라인`만 인용.

---

## 0. 조사 범위·방법

- 대상: `backend/src/`·`backend/public/index.php`·`backend/migrations/`. 읽기 전용. 배제: `_be_*/`·`clean_src/`·`backup/`·`locales_backup/`.
- 방법: `sod|segregation|conflict|toxic|incompatible|mutually.exclusive|self.approval|maker|checker|requested_by|dual.control` 다중 grep + 승인 substrate(Alerting/Mapping/Catalog/AdminGrowth) 정독. 2 Explore 스레드(49 tool-use) 상호검증. 라인 실측.

## 1. 핵심 판정 요약

**Runtime SoD(동일인이 상충 직무·역할을 동시 보유하는지 판정·차단)는 전면 부재(ABSENT)다.** Conflict Rule·Matrix·Toxic-Combination Registry·Role/Permission/Scope/Context/Transaction/Workflow/Session Conflict Engine·Runtime Evaluator·Temporal SoD 전부 grep 0.

- **★유일한 실 SoD-인접 통제 = `Mapping.php` self-approval 차단**(제안자==승인자 403·정족수·dedup·fail-closed 4중). 단 이는 **dual-control(4-eyes, 2인 필요)** 이며 SoD(1인 상충역할 동시보유)와 개념적으로 **인접하나 별개**다.
- **Alerting `action_request` = 코드완비·데이터 미배선(VACUOUS)**: 정족수·dedup·approved-only 집행은 있으나 maker 컬럼(`requested_by`) 부재로 approver≠requester 강제 불가 + 생산자(`INSERT`) grep 0. **기존 확정 상태(재플래그 아님)**.
- **재활용 substrate 3축**: 정적 RBAC/ABAC 게이트(SoD 강제의 자연 삽입지점)·SecurityAudit 해시체인(증거)·access_review_item(검토 저장). 실 엔진은 이 위에 SoD 평가층을 **신설(Extend)** 한다.

## 2. 실존 substrate 카탈로그

### A. Maker-Checker / Self-Approval 분리 (SoD-인접 dual-control — 유일 실통제)

| 파일:라인 | 심볼 | 설명 | SoD 매핑 | 상태 |
|---|---|---|---|---|
| `backend/src/Handlers/Mapping.php:268-271` | 자기승인 차단 | `if requested_by === $actor` → 403 "self-approval is not allowed (maker-checker)" | **제안자≠승인자 실강제(핵심)** | PRESENT |
| `backend/src/Handlers/Mapping.php:287` | 정족수 | `count($approvals) >= required_approvals`(기본 2) | Quorum | PRESENT |
| `backend/src/Handlers/Mapping.php:278-283` | dedup·승인자 도출 | 동일 actor 재승인 409 | 4-eyes 무결성 | PRESENT |
| `backend/src/Handlers/Mapping.php:186-190` · `:246-250` | actorId fail-closed | 제안/승인 양측 위조불가 도출, 미확인 403 | 신원 무결성 | PRESENT |
| `backend/src/Handlers/Mapping.php:244` | 익명 정족수 우회 차단 | anon 승인 차단 | Guard | PRESENT |
| `backend/src/Db.php:632-634` | `mapping_change_request` 스키마 | `requested_by VARCHAR NOT NULL`+`required_approvals INT DEFAULT 2` | maker 데이터 기반 | PRESENT |

### B. Alerting 승인 substrate (코드완비·데이터 미배선 — VACUOUS)

| 파일:라인 | 심볼 | 설명 | SoD 매핑 | 상태 |
|---|---|---|---|---|
| `backend/src/Handlers/Alerting.php:42-57` · `:598-606` | `actorId()`·승인자 서버도출 fail-closed | 미확인 시 `decideAction` 403 "approver identity unresolved" | 신원 무결성 | PRESENT |
| `backend/src/Handlers/Alerting.php:642-650` | 정족수 2 강제 | distinct actor `count>=2 ? approved` | Quorum | PRESENT |
| `backend/src/Handlers/Alerting.php:634-640` | dedup | 동일 actor 재승인 409 | 4-eyes | PRESENT |
| `backend/src/Handlers/Alerting.php:684-688` | approved-only 집행 | `status!=='approved'` execute 409 | 우회 차단 | PRESENT |
| `backend/src/Handlers/Alerting.php:64-72` · `:70` | auth_tenant·`__anon__` 센티넬 | raw 헤더 폴백 제거 | 테넌트 신뢰 | PRESENT |
| `backend/src/Db.php:592-600` | `action_request` 스키마 | 컬럼=id/policy_id/tenant_id/status/action_json/approvals_json/created_at — **`requested_by`(maker) 없음** | approver≠requester 강제 불가 | 공백 |
| `INSERT INTO action_request` (전 저장소) | 생산자 | **grep 0 — 영구 공란(VACUOUS)** | 데이터 미배선 | ABSENT |
| `docs/approval/APPROVAL_CHAIN_TEST_PLAN.md:172` · `docs/approval/APPROVAL_CHAIN_SECURITY_AND_GUARDS.md:385` | 프로젝트 문서 확정 | "생산자 전수 0 → VACUOUS" 명시(기존 확정) | 근거 | — |

### C. Runtime 인가 게이트 (SoD 강제의 자연 삽입지점 — RBAC/ABAC, 충돌평가 아님)

| 파일:라인 | 심볼 | 설명 | SoD 매핑 | 상태 |
|---|---|---|---|---|
| `backend/public/index.php:572-611` | 중앙 api_key RBAC 게이트 | scope(`admin:keys`/`write:*`) 검사·미충족 403·`auth_role` 주입 | 매 요청 인가 지점(PEP 후보) | PRESENT |
| `backend/public/index.php:430-460` | AI-게이트 보조 RBAC | 별 DB api_key 행 조회·role/scope 주입 | 인가 지점 | PRESENT |
| `backend/src/Handlers/UserAuth.php:1167-1186` | `guardTeamWrite` | member 쓰기 403(전역 미들웨어 `index.php:82`) | 정적 팀역할 강제 | PRESENT |
| `backend/src/Handlers/UserAuth.php:1117` · `:1134-1147` | `TEAM_OWNER_ONLY`·`requireTeamWrite` | owner-only 액션 강제(11개소 `:1206,:1728,:1852,:2104,:2268,:4316,:4342,:4367,:4382`) | action RBAC | PRESENT |
| `backend/src/Handlers/UserAuth.php:1119-1131` | `teamCanWrite`/`normTeamRole` | owner>manager>member 3단 정적표 | 역할표 | PRESENT |
| `backend/src/Handlers/Wms.php:557-590` | `guardWarehouse` | 창고 화이트리스트 fail-closed(12개소 `:598,:603,:638,:1329,:1374,:1409,:1591,:1720,:1749,:1777,:1830,:1884`) | 창고 ABAC | PRESENT |

### D. Session 페이로드 (단일 team_role — 다중 활성역할 개념 부재)

| 파일:라인 | 심볼 | 설명 | SoD 매핑 | 상태 |
|---|---|---|---|---|
| `backend/src/Handlers/UserAuth.php:263-316` | 세션 조회 join(`:316` team_role 파생) | 세션은 사용자당 **단일 team_role**만 실음 | 다중 활성역할 데이터 부재 | 공백 |
| `backend/src/Handlers/UserAuth.php:609` · `:990` | 세션 발급 | — | — | PARTIAL |
| `backend/src/Handlers/UserAuth.php:691` · `:1019` | 세션 페이로드 | plan·team_role만 | Session Conflict 기반 부재 | 공백 |

### E. Cross-Tenant 격리 (Cross-System SoD 인접)

| 파일:라인 | 심볼 | 설명 | SoD 매핑 | 상태 |
|---|---|---|---|---|
| `backend/public/index.php:614-619` | X-Tenant-Id 서버도출 강제 | 인증키 tenant_id로 무조건 덮어쓰기(188차 P0·헤더위조 차단) | Cross-Tenant Isolation | PRESENT |
| `backend/public/index.php:608-612` | auth_tenant 주입 | 핸들러가 auth_tenant/세션만 신뢰 | 격리 | PRESENT |

### F. 감사·증거·보상통제 substrate (재활용 대상)

| 파일:라인 | 심볼 | 설명 | SoD 매핑 | 상태 |
|---|---|---|---|---|
| `backend/src/SecurityAudit.php:14-33` | `log()`/INSERT | prev_hash→hash_chain append-only | Evidence(불변) | PRESENT |
| `backend/src/SecurityAudit.php:35-41` · `:56-69` | lastHash·`verify` | hash_equals 변조탐지 | 무결성 검증 | PRESENT |
| `backend/src/Handlers/AccessReview.php:66-80` · `:219-224` · `:225` | access_review_item DDL·INSERT·SecurityAudit 연동 | justification 필수(`:192` fail-secure) 추가전용 | 검토·증거 저장 패턴 | PRESENT |
| `backend/src/Handlers/UserAuth.php:790-801` | break-glass `isMasterAuth` | env(`GENIE_BREAKGLASS_PW`) 비상경로 | Emergency Override 재활용 substrate | PRESENT |
| `backend/src/Handlers/UserAuth.php:929-961` · `:940-945` | MFA `mfa_policy` | 테넌트별 off/admin/all 강제 | Compensating Control(MFA) 재활용 | PRESENT |

### G. 부분 substrate — AdminGrowth 승인(결재분리 미성립)

| 파일:라인 | 심볼 | 설명 | SoD 매핑 | 상태 |
|---|---|---|---|---|
| `backend/src/Handlers/AdminGrowth.php:1294` · `:1313-1331` | insert(requested_by/decided_by)·decide | `decided_by`만 기록·requested_by와 actor 비교 없음·단일 admin=approved(정족수 없음) | SoD 결재분리 **미성립** | PARTIAL |

## 3. 종합 판정

**SoD = ABSENT-governance / thin-substrate.** Conflict Rule·Matrix·Registry·Role/Permission/Scope/Context/Transaction/Workflow/Session Conflict·Runtime Evaluator·Temporal·Dynamic·Static SoD·Exception/Override/Compensating 워크플로·SoD 전용 Evidence/Snapshot/Digest/Analytics/Drift/Reconciliation/Simulation·SoD Guard/Lint 전부 순신규. **유일 실 SoD-인접 통제=Mapping self-approval 차단(dual-control)**. 재활용: RBAC/ABAC 게이트(§C, SoD 평가 삽입지점)·SecurityAudit(§F)·access_review_item(§F)·break-glass/MFA(§F, 보상통제)·cross-tenant(§E). 실 엔진은 이 substrate를 **대체가 아닌 재활용·확장(Extend)** 한다.
