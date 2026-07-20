# DSAR — Authorization Runtime Coordinator (Part 3-19 §7)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_19_AUTONOMOUS_CONTROL_PLANE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_CONTROL_PLANE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_CONTROLPLANE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_CONTROLPLANE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의(SPEC) — APPROVAL_RUNTIME_COORDINATOR (Runtime Coordination Engine)

Runtime Coordinator 는 **런타임 authz 결정 파이프라인의 조율 계층**으로, 다음 구성요소의 협업을 조정한다:

- **PDP** (Policy Decision Point) — 권한 결정 산출.
- **PEP** (Policy Enforcement Point) — 결정 집행(요청 허용/차단).
- **PIP** (Policy Information Point) — 결정에 필요한 속성/컨텍스트 조회.
- **Decision Cache** — 결정 결과 캐싱(무효화 정책 포함).
- **Runtime Context / Session** — 호출자 세션·테넌트·역할 컨텍스트 구성.
- **Zero Trust Evaluation** — 매 요청 최소권한·명시적 검증 원칙 적용.

계약상 Coordinator 는 **조율만** 담당하며 PDP/PEP 의 결정·집행 로직 자체를 대체하지 않는다.

## 2. 실존 substrate 매핑

| 계약 요소 | 판정 | 근거(허용목록) |
|---|---|---|
| PDP(결정 산출) | **PRESENT** (Data Plane) | `TeamPermissions.php:695-701`(`effectivePermissions`·`effectiveForUser`)·`:704-712`(assignable 상한) |
| PEP(집행/차단) | **PRESENT** (Data Plane) | inline RBAC 미들웨어 `index.php:69-88`·공개경로 bypass `index.php:68-80`·auth 속성 주입 `index.php:426-438` |
| PIP(속성 조회) | PARTIAL | 권한/역할/테넌트 속성 해석 `TeamPermissions.php:695-701`(effectiveForUser 경로) |
| Runtime Context/Session | PARTIAL | 세션/역할 컨텍스트 `index.php:426-438`(auth_key/role/tenant)·`TeamPermissions.php:33` |
| Decision Cache | ABSENT | 결정 캐시·무효화 계층 부재(요청마다 재평가) |
| Zero Trust Eval | PARTIAL | 매 요청 인증검사 `index.php:69-88`(미인증 차단) — 명시적 최소권한 조율 계층은 부재 |
| **조율(Coordination) 계층** | **ABSENT** (grep 0) | PDP/PEP/PIP 를 묶는 런타임 조정자 부재 |
| 결정 증거 앵커 | PRESENT(재사용) | `SecurityAudit.php:14-31`·`:56-64` |

**판정 근거**: Data Plane 의 PDP(`TeamPermissions.php:695-701`)와 PEP(`index.php:69-88`)는 **실재**하며 라이브 authz 결정을 산출·집행한다. 그러나 이들을 통합 조율하는 Runtime Coordination Engine(Decision Cache 무효화·Zero Trust 최소권한 수렴·PIP 속성 파이프라인 통합)은 **부재**하다(grep 0). PDP/PEP 는 각 요청 경로에 산재해 직접 호출될 뿐 중앙 조율자가 없다. 따라서 전체 판정 **PARTIAL**(구성요소 실재·조율 계층 부재).

## 3. 설계 계약(규칙)

- **R1 (조율만, 결정 불대체)**: Coordinator 는 기존 PDP `TeamPermissions.php:695-701`·PEP `index.php:69-88` 를 **호출·조율**하며 그 결정/집행 로직을 재구현하지 않는다(무후퇴).
- **R2 (Fail-secure 수렴)**: PIP 속성 조회 실패·컨텍스트 불확정 시 Coordinator 는 deny 로 수렴한다. 현행 `TeamPermissions.php:122-124`(fail-closed least-privilege)·`index.php:69-88`(bearer 부재 차단) 시맨틱 계승.
- **R3 (Decision Cache 무효화)**: Decision Cache 신설 시 Registry(§1) active 정책 버전 변경을 무효화 트리거로 삼는다. stale 결정 집행 금지.
- **R4 (Zero Trust)**: 매 요청 최소권한·명시적 검증. 세션 컨텍스트(`index.php:426-438`)의 role/tenant 를 신뢰 근거로 재검증하며 암묵적 상승 금지.
- **R5 (증거 기록)**: 조율 결정 이벤트(특히 deny·escalation)는 `SecurityAudit.php:14-31` 해시체인에 append-only 기록. 감사 재구현 금지.

## 4. KEEP_SEPARATE

- 마케팅 런타임 의사결정 `Decisioning.php:12`·`:307`, `RuleEngine.php:12`·`:24` 는 authz 런타임 조율과 별개 도메인. Coordinator 로 흡수 금지.

## 5. 판정

**NOT_CERTIFIED · BLOCKED_PREREQUISITE.** Data-Plane PDP/PEP 는 실재(PRESENT)하나 이를 통합하는 Runtime Coordination Engine 은 부재(ABSENT)로 전체 **PARTIAL**. 본 문서는 조율 계층 순신설 설계 계약만 정의한다. 실 구현은 Registry(§1)·Orchestrator(§3) 선행 후 별도 승인 세션에서 진행. 코드 변경 0.
