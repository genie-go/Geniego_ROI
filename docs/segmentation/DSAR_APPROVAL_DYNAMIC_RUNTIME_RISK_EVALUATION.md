# DSAR — Dynamic Runtime Risk Evaluation 승인 (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Runtime Risk · 스펙 §20)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **ground-truth**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped(Part 3-1~3-4)·Decision Core 실 구현 부재
- **불변**: UNKNOWN Permit 금지(ADR D-2) · PEP≠PDP · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §20 Runtime Risk는 Session/Device/Network/Geo/Authentication/User 6종 Risk를 **계산**해 Policy Decision(§18)의 입력으로 공급하는 계층이다. ADR D-1·EXISTING_IMPLEMENTATION §7이 명시하는 대로, 현재 `auth_audit_log.risk`는 **계산값이 아니라 호출부 하드코딩 정적 심각도 라벨**이며, 이 구분이 본 편의 핵심 판정이다.

## 2. Canonical 필드

| # | 필드 | 의미 |
|---|---|---|
| 1 | risk evaluation id | Runtime Risk 평가 식별자 |
| 2 | subject / session binding | 평가 대상 |
| 3 | risk type | 아래 §3 열거형 |
| 4 | computed score | 계산된 위험도(현재 substrate에는 없음 — 정적 라벨만 존재) |
| 5 | evaluated at | 평가 시각 |
| 6 | consumed by | 이 Risk를 소비하는 Policy Decision(§18)/Rule Evaluation(§9) 참조 |

## 3. 열거형 / 타입

**Risk Type**(스펙 §20 원문): `SESSION_RISK` · `DEVICE_RISK` · `NETWORK_RISK` · `GEO_RISK` · `AUTHENTICATION_RISK` · `USER_RISK`

## 4. 실 substrate 매핑 (ABSENT — 정적 라벨만)

| Risk Type | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| (공통) risk 컬럼 자체 | `auth_audit_log.risk VARCHAR(16)` | `UserAuth.php:4165`(EXISTING_IMPLEMENTATION §4·§7) | **PARTIAL(컬럼 실재·계산 아님)** |
| (공통) 값 산출 방식 | `audit()` 호출부가 low/medium/high를 **하드코딩**해 전달 | `UserAuth.php:4174-4197`(호출 예시 `:4174,4203`·EXISTING_IMPLEMENTATION §4·§7) | **ABSENT(계산 로직 부재)** — "정적 심각도 라벨"이지 Session/Device/Network/Geo/Auth/User 6축을 합성하는 계산 엔진이 아님 |
| (공통) 소비처 | `if($risk==='high')` 분기 → SIEM 포워딩(`Compliance::forwardEvent`) | `UserAuth.php:4192-4194`(EXISTING_IMPLEMENTATION §7) | 유일 소비 = 로깅/포워딩. Role/Permission 결정에 연결된 지점 없음 |
| SESSION_RISK | 없음(라벨 값의 일부 호출부가 세션 관련 이벤트에서 사용되나 세션 위험도 계산 없음) | `UserAuth.php:970,983`(EXISTING_IMPLEMENTATION §4 사용 인용) | **ABSENT(6축 개별 계산 없음)** |
| DEVICE_RISK | 부재 — device 컬럼 자체가 EXISTING_IMPLEMENTATION §4 table에서 "부재(컬럼 없음)"로 명시 | — | **ABSENT** |
| NETWORK_RISK | 부재 — 동일 사유(§4 table network 행) | — | **ABSENT** |
| GEO_RISK | grep 0 — 이번 ground-truth 2편에 지리 위험 관련 인용 없음 | — | **ABSENT** |
| AUTHENTICATION_RISK | MFA 정책 3단계(`MFA_STRICTNESS`)는 인증 강도 정책이지 위험도 계산이 아님 | `UserAuth.php:3719-3760`(ADR §D-1·EXISTING_IMPLEMENTATION §8) | **ABSENT(계산 아님·정책 게이트)** |
| USER_RISK | grep 0 | — | **ABSENT** |
| (참고·오탐 방지) `sc_lines.risk` | 공급망 도메인 risk 컬럼(RBAC 무관) | `SupplyChain.php:398`(EXISTING_IMPLEMENTATION §7) | **다른 도메인 — Runtime Risk 대상 아님**(재분류 금지) |

## 5. 설계 원칙

- ★핵심 구분(실재 과신 금지): "risk 컬럼이 존재한다" ≠ "risk가 계산된다". `auth_audit_log.risk`는 개발자가 이벤트 유형별로 문자열을 **써넣는** 필드이지, Session/Device/Network/Geo/Auth/User 속성을 합성해 산출하는 계산 엔진의 출력이 아니다(EXISTING_IMPLEMENTATION §7 원문).
- `SupplyChain.php:398`의 `sc_lines.risk`는 이름이 같을 뿐 완전히 다른 도메인(공급망)이다 — Dynamic Role의 Runtime Risk로 흡수하거나 재사용 대상으로 오인하지 않는다(마케팅 automation KEEP_SEPARATE와 동일한 경계 원칙).
- SIEM 포워딩(`Compliance::forwardEvent`)은 **감사/보안관제 목적**의 소비이며 Role/Permission Decision(§18)의 입력으로 연결된 적이 없다 — 신설 시 이 포워딩 파이프라인을 참고 substrate로 재사용할 수는 있으나, "이미 role 결정에 쓰이고 있다"고 서술하지 않는다.
- 6종 Risk 계산 엔진은 전부 순신규 설계 대상이며, 계산 결과는 §18 Policy Decision의 Rule Evaluation(§9) 입력 중 하나(Attribute Source)로 공급되도록 조립한다(ADR §3 Canonical Interface).

## 6. Gap / BLOCKED_PREREQUISITE

- 6종 Risk Type 전부 계산 엔진 ABSENT — 유일한 근접 substrate는 정적 라벨 컬럼(`auth_audit_log.risk`) 자체이며 이는 "저장소"이지 "계산기"가 아니다.
- Risk→Policy Decision(§18) 연결 경로 = 순신규(§18 자체가 ABSENT).
- 실 구현 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped·Decision Core 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.
