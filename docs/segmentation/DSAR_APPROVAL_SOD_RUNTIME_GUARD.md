# DSAR — Runtime SoD Enforcement: 런타임 가드 (Part 3-10 §31)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_10_RUNTIME_SOD_ENFORCEMENT_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_SOD_ENFORCEMENT_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_SOD_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_SOD_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §31 Runtime Guard는 매 요청 인가 시점에 다음 6종 위반을 **차단(Block)** 하는 런타임 강제층이다: (a) SoD Conflict, (b) Critical Conflict, (c) Invalid Exception, (d) Expired Exception, (e) Scope Escalation, (f) Override Abuse. §22 Runtime Conflict Evaluation(Every Request/Approval/Sensitive Action/Privileged Operation)의 집행 종단이며 §38 성능(Runtime Conflict Evaluation ≤ 10ms)을 만족해야 한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §31 항목 | 판정 | substrate(재활용) | GT 인용 |
|---|---|---|---|
| Runtime Guard 삽입지점(PEP) | PARTIAL(재활용) | 중앙 api_key RBAC 게이트·scope 검사·미충족 403 | `index.php:572-611`(GT①§C·②3.1·ADR D-1) |
| 보조 인가 지점 | PARTIAL | AI-게이트 보조 RBAC(role/scope 주입) | `index.php:430-460`(GT①§C) |
| 팀역할 쓰기가드 | PARTIAL | `guardTeamWrite` member 쓰기 403·전역 미들웨어 | `UserAuth.php:1167-1186`·`index.php:82`(GT①§C) |
| 창고 ABAC 가드 | PARTIAL | `guardWarehouse` 화이트리스트 fail-closed(12개소) | `Wms.php:557-590`(GT①§C) |
| approved-only 집행 | PARTIAL | `status!=='approved'` execute 409 | `Alerting.php:684-688`(GT①§B) |
| Cross-Tenant 격리 | PRESENT(재활용) | X-Tenant-Id 서버도출 강제·auth_tenant 주입 | `index.php:614-619`·`:608-612`(GT①§E) |
| Override Abuse substrate | PARTIAL | break-glass `isMasterAuth`(env 비상경로·사후감사 대상) | `UserAuth.php:790-801`(GT①§F·ADR D-5) |
| **SoD Conflict 차단 자체** | **ABSENT** | 동시보유 상충역할 판정·차단 로직 grep 0 | GT②2 Runtime Evaluator ABSENT·ADR D-7 |

## 3. 설계 계약 (항목·규칙 — SPEC 근거)

- **정적 RBAC 판정 후 SoD Evaluator 삽입**: 기존 게이트(`index.php:572-611`·`guardTeamWrite`·`guardWarehouse`)를 파괴하지 않고, 인가 통과 **후** "현재 subject 활성 역할·권한 조합이 Conflict Matrix에 상충하는가"를 평가(ADR D-1). Extend-only·무후퇴.
- **6종 차단 매핑**: SoD Conflict/Critical Conflict → Block(§16 Resolution Strategy Block/Escalation); Invalid·Expired Exception → 예외 유효성 재검(§19 자동종료); Scope Escalation → 위임상한 클램프와 **직교**(KEEP_SEPARATE §4); Override Abuse → break-glass 사후감사(§20).
- **성능·증거**: 평가 ≤ 10ms(§38), 차단 이벤트는 SecurityAudit 불변체인에 기록(`SecurityAudit.php:14-33`·`:56-69`, ADR D-5).
- **입력원**: Effective Resolution(3-7)·JIT(3-9) 산출 활성역할집합을 입력으로 결합(ADR D-6). JIT 시한부 상승 발급 시에도 재평가(§5 Dynamic SoD).

## 4. KEEP_SEPARATE (동음이의 흡수금지)

- **RBAC/ABAC 게이트는 인가지점이지 충돌평가 아님**: `index.php:572-611`은 scope 검사(RBAC)이지 "동시보유 역할 충돌" 판정 아님(GT②2.2·ADR D-7).
- **Scope Escalation ≠ 위임상한 클램프**: `TeamPermissions.php:599-621`·`:642-658` `assignable` 클램프는 privilege-escalation 통제이지 role-conflict SoD 아님(GT② B-4).
- **maker-checker(dual-control) ≠ SoD**: `Mapping.php:268-271`·`Alerting.php:642-650`은 "2인 필요"이지 "1인 상충역할 동시보유"가 아니다(GT② B-2). 재활용하되 개명·흡수 금지.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

Runtime Guard **자체(SoD 충돌 차단)=ABSENT·순신규**. PEP 삽입지점·approved-only·cross-tenant·break-glass는 **재활용 substrate(대체 아님·Extend)**. 코드 변경 0·NOT_CERTIFIED. 선행: Part 1~3-9 인증 + Conflict Matrix/Snapshot 데이터기반 신설(ADR D-2/D-4·BLOCKED_PREREQUISITE).
