# DSAR — Policy/Runtime Consistency Validators (Part 3-20 §9·§10)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_HEALING_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §9 Policy Consistency Validator · §10 Runtime Consistency Validator)

Consistency Validator는 인가(authorization) 상태가 **논리적으로 자기모순 없는지**를 지속 검증하는 읽기 전용 판정기다. 두 계층으로 분리한다 — §9는 **정책(policy) 정의 계층**의 정합성을, §10은 **런타임(runtime) 결정 계층**의 정합성을 본다. 위반을 탐지만 하고 스스로 변경하지 않으며, 복구는 §13/§17 엔진에 위임한다.

| 계층 | 검증기 | 정의 | 판정 계약 |
|------|--------|------|-----------|
| §9 Policy | Policy Version | 정책 baseline 버전 단조성·중복/역행 부재 | 불일치 시 CONSISTENT=false·근거(버전 쌍) 감사 |
| §9 Policy | Dependency | 참조 role/scope/policy 존재·순환 부재 | dangling/cycle 탐지 |
| §9 Policy | Conflict | 동일 주체·리소스 allow↔deny 상호배제 | 충돌쌍 열거 |
| §9 Policy | Coverage | 보호 대상 라우트/엔티티의 정책 누락 부재 | uncovered 목록 |
| §9 Policy | Effective Rule | 합성(compose) 후 유효규칙이 정의규칙과 일치 | 유효≠정의 시 편차 |
| §10 Runtime | Decision Cache | 결정 캐시가 현행 정책 버전과 정합 | stale/orphan 캐시 |
| §10 Runtime | Runtime Context | 요청 컨텍스트(tenant/scope/role) 내부 정합 | 필드 상호모순 |
| §10 Runtime | Session State | 활성 세션 권한이 SoT와 정합 | drift 세션 |
| §10 Runtime | Authorization Decision | 재평가 결정이 기록 결정과 재현 일치 | 비재현 결정 |
| §10 Runtime | Trust State | Trust/readiness 상태가 정책 게이트와 정합 | 게이트 우회 |

핵심 원칙: **탐지≠복구**. Validator는 CONSISTENT/INCONSISTENT 판정과 근거만 산출하고, 판정 레코드는 tamper-evident 감사에 남긴다.

## 2. Substrate 매핑

| SPEC 요소 | 현행 substrate | 판정 |
|-----------|----------------|------|
| Policy/Runtime consistency validator 엔진 | 없음 (grep 0) | **ABSENT** |
| 판정 레코드 무결성(참조) | SecurityAudit append-only 해시체인(`SecurityAudit.php:14-68`)·verify(`SecurityAudit.php:56-68`) | 재사용(판정 기록·재현 검증 앵커) |
| 라이브 결정 경로(참조) | authz 미들웨어 게이트(`index.php:610`) | 관측 대상(변경 없음) |

## 3. 설계 계약

- 두 Validator 모두 **순신설**·읽기 전용. 산출물은 `{scope, validator_id, consistent, evidence[], version}` 판정 레코드이며, 스스로 정책·캐시·세션을 변경하지 않는다.
- Effective Rule(§9)·Authorization Decision(§10) 검증은 **재현(replay) 방식** — 정의로부터 유효규칙을, 기록으로부터 결정을 재계산해 등가성만 대조한다(부작용 0).
- 모든 INCONSISTENT 판정은 근거(위반쌍·버전·규칙 id)와 함께 `SecurityAudit.php:14-68` 체인에 append-only 기록하고, 판정 재현 무결성은 `SecurityAudit.php:56-68` verify를 재사용한다.
- Validator는 복구를 트리거만 할 수 있고 집행하지 않는다 — Compliance Recovery(§13)·Rollback Recovery(§17)로 라우팅.

## 4. KEEP_SEPARATE (흡수 금지)

- **재무/데이터 정합**은 authz consistency가 아니다: `PgSettlement.php:215`(정산 스냅샷)·`Wms.php:2160`(재고 계층)은 도메인 상이. 인가 정합 엔진에 통합하면 관심사가 뒤섞인다. 별개 유지.
- **마케팅 이상 힌트** `ClaudeAI.php:3692`는 캠페인 anomaly로, 인가 결정 정합과 무관. 흡수 금지.

## 5. 판정

**ABSENT** — Policy/Runtime consistency validator는 grep 0으로 전무하다. Policy Version/Dependency/Conflict/Coverage/Effective Rule(§9)·Decision Cache/Runtime Context/Session State/Authorization Decision/Trust State(§10) 10종 검증기는 모두 **순신설**이며, 판정 기록·재현 무결성만 SecurityAudit 해시체인(`SecurityAudit.php:14-68`·verify `SecurityAudit.php:56-68`)을 확장해 재사용한다. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행 정책 SoT·§13/§17 복구 계약 부재).
