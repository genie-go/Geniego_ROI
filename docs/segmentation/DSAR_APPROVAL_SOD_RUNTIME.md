# DSAR — Runtime SoD Enforcement: 런타임 충돌평가 (APPROVAL_SOD_RUNTIME)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_10_RUNTIME_SOD_ENFORCEMENT_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_SOD_ENFORCEMENT_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_SOD_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_SOD_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_SOD_RUNTIME`은 SPEC §6(Runtime SoD) 및 §22(Runtime Conflict Evaluation)의 실행 시점 SoD 대상이다. 매 실행 시점마다 subject의 활성 역할·권한 조합이 Conflict Matrix에 상충하는지를 지속 평가·차단한다.

SPEC §6 평가 시점: API 호출 · 승인 요청 · 결재 처리 · 데이터 조회 · 데이터 수정 · Export · Delete.
SPEC §22 실행 시점: Every Request · Every Approval · Every Sensitive Action · Every Privileged Operation.
성능 요구(SPEC §38): Runtime Conflict Evaluation ≤ 10ms · Conflict Lookup ≤ 5ms.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

★**SoD 함정**: 아래 게이트들은 매 요청 인가를 강제하는 **RBAC/ABAC PEP(삽입지점)**일 뿐, "동시보유 역할의 상충평가" 자체는 **ABSENT**(grep 0)이다(GT② §2).

| SPEC 요소 | 판정 | 근거(GT file:line) |
|---|---|---|
| 중앙 매 요청 인가 게이트(PEP 후보) | PRESENT(재활용) | `index.php:572-611` scope 검사·미충족 403·`auth_role` 주입(GT① §C) |
| AI-게이트 보조 RBAC | PRESENT(재활용) | `index.php:430-460` 별 DB api_key 조회·role/scope 주입(GT① §C) |
| 팀 쓰기 가드(전역 미들웨어) | PRESENT(재활용) | `guardTeamWrite` `UserAuth.php:1167-1186`(전역 `index.php:82`)(GT① §C) |
| owner-only 액션 강제 | PRESENT(재활용) | `requireTeamWrite`/`TEAM_OWNER_ONLY` `UserAuth.php:1117`·`:1134-1147`(11개소 `:1206,:1728,:1852,:2104,:2268,:4316,:4342,:4367,:4382`)(GT① §C) |
| 창고 ABAC 화이트리스트 | PRESENT(재활용) | `guardWarehouse` `Wms.php:557-590`(12개소 `:598,:603,:638,:1329,:1374,:1409,:1591,:1720,:1749,:1777,:1830,:1884`)(GT① §C) |
| **Runtime Conflict Evaluator(동시보유 충돌평가)** | **ABSENT** | 인가 게이트는 RBAC 스코프이지 "동시보유 역할 충돌" 판정 아님 — `roleConflict|evaluateConflict|conflictMatrix|toxicPair` grep 0(GT② §2·§2 Runtime SoD Evaluator) |
| Runtime Guard / Static Lint | **ABSENT** | SoD Guard/Lint grep 0(GT② §2) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **삽입지점(Extend)**: 정적 RBAC 판정 **후**에 SoD Runtime Evaluator를 얹는다 — `index.php:572-611`·`guardTeamWrite`(`UserAuth.php:1167-1186`)·`guardWarehouse`(`Wms.php:557-590`)가 자연 PEP(ADR §D-1). 기존 게이트 파괴 없이 평가층 추가.
- **입력**: 현재 subject의 활성 역할·권한·스코프 집합(§23 Conflict Snapshot). Effective Resolution(3-7)·JIT(3-9) 산출을 입력으로 결합(ADR §D-6).
- **평가·차단**: Conflict Matrix(§14) 대조 → Severity(§15)·Resolution(§16 Block/Challenge/Approval/Escalation/Override/Break-Glass). Error Contract(§33: SOD_CONFLICT_DETECTED·SOD_RUNTIME_BLOCKED 등).
- **성능**: §38 ≤10ms Runtime Eval·≥97% Cache Hit — 매 요청 경로에 삽입되므로 필수 조건(실구현 세션 검증).
- **테넌트 격리**: `index.php:614-619` X-Tenant-Id 서버도출 강제 위에서 테넌트별 Matrix/Snapshot 조회(§36).
- **증거**: 런타임 충돌 이벤트는 SecurityAudit 불변체인(`SecurityAudit.php:14-33`·`:56-69`) 재활용(ADR §D-5).

## 4. KEEP_SEPARATE (동음이의 흡수금지)

- **RBAC/ABAC 게이트 ≠ Runtime SoD Evaluator**: `index.php:572-611`·`guardTeamWrite`·`guardWarehouse`는 "권한 있는가"(인가지점)이지 "상충 역할 동시보유인가"(충돌평가)가 아님(ADR §D-7·GT② §2).
- **"conflict" 41파일 전부 decoy**: HTTP 409 Conflict·ChannelSync/MenuPricingSync 데이터 sync conflict·merge/scheduling conflict는 SoD role-conflict 아님(GT② B-1). ★grep 히트 오인 금지.
- **단일승인 게이트 ≠ Runtime 결재분리**: `Catalog.php:2383-2407`(approveQueue 가격 writeback)=`requirePro`+tenant만·maker 미기록·self-approval 무검증(GT② B-5).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정 = ABSENT(엔진 순신규)·재활용 substrate = PEP 게이트**. Runtime Conflict Evaluator·Guard·Lint 전부 grep 0(GT② §2). 재활용 대상은 RBAC/ABAC 인가 게이트(§C 5개소)뿐이며 이는 삽입지점이지 충돌평가 아님(ADR §D-1·D-7).
- **선행 의존**: Conflict Matrix/Rule Registry(순신규·ADR §D-2)·Conflict Snapshot(§23 데이터 기반·ADR §D-4)·Effective Resolution(3-7)·JIT(3-9) 결합. Part 1~3-9 인증 후 실구현(BLOCKED_PREREQUISITE).
- **무후퇴·Extend-only**: 5개 PEP 게이트·maker-checker·SecurityAudit·cross-tenant 유지·병행(ADR §4 무후퇴).
- **코드 변경 0 · NOT_CERTIFIED**. 실 엔진 구현은 별도 RP-track 승인세션 대상.
