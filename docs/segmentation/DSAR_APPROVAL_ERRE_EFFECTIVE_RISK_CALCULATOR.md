# DSAR — ERRE Effective Risk Calculator (per-entity)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · BLOCKED_PREREQUISITE.
> **EPIC**: 06-A-03-02-03-04 Part 3-7 (Effective Role Resolution Engine)
> **상위 SPEC**: `docs/spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md` §12
> **상위 ADR**: `docs/architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md` (D-5 KEEP_SEPARATE·D-1·D-7)
> **Ground-Truth**: `DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md`(①) · `DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②)
> **Canonical Entity**: `APPROVAL_EFFECTIVE_RISK`

---

## 1. 목적

본 DSAR은 ERRE Resolution Pipeline(SPEC §4)의 **10단계 Risk Projection** 및 **Effective Risk Calculator**(SPEC §12)의 거버넌스 계약을 정의한다. Effective Risk Calculator는 Subject의 인증·세션·디바이스·네트워크·행위 위험과 role/permission/scope의 criticality를 종합해 **접근 위험등급(LOW·MEDIUM·HIGH·CRITICAL)**을 산출하고, 그 결과를 Effective Deny Calculator의 **Risk Deny** 신호원으로 공급한다.

본 계산기는 GeniegoROI에서 **전면 부재(ABSENT)**하다. role을 입력으로 위험등급을 계산하는 계산기는 백엔드 실코드에 존재하지 않는다(Ground-Truth ② 표 #7). 유사 이름의 `Risk.php`(고객 churn ML)는 권한 resolution이 아니므로 **KEEP_SEPARATE**(ADR D-5)이다. 따라서 본 계산기는 순신규 그린필드이며, 본 문서는 부재를 정직하게 기록하고 오흡수 경계를 명확히 하는 것을 목적으로 한다.

## 2. Ground-Truth 판정

### 2.1 실존 substrate — 없음 (ABSENT)

Effective Risk Calculator에 승격 가능한 권한-resolution 위험 substrate는 실측 **부재**하다. `role → LOW/MED/HIGH/CRIT` 위험등급 계산기는 백엔드 실코드 grep 0(Ground-Truth ② 표 #7).

가장 근접한 위험-인접 게이트조차 정적이다:
- `backend/src/Handlers/UserAuth.php:941`~`:972` MFA 정적 게이트(off/admin/all) — **risk-score 없음**(Ground-Truth ② §4). auth-level constraint일 뿐 위험 계산이 아니다. → Effective Constraint Calculator에서 정적 constraint로만 취급.

### 2.2 KEEP_SEPARATE (오흡수 금지 · Ground-Truth ② §4, ADR D-5)

아래는 이름에 "risk/model/anomaly"가 있으나 **권한 위험 resolution이 아니다**. ERRE Effective Risk Calculator에 흡수·개명·통합 절대 금지(가짜녹색 회피).

| 파일:라인 | 실제 도메인 | 왜 KEEP_SEPARATE |
|---|---|---|
| `backend/src/Handlers/Risk.php:12` | 고객 churn ML 예측 | role 입력 아님·마케팅 이탈 예측 |
| `backend/src/Handlers/Risk.php:81` | policy ML probability | 권한 위험등급 아님 |
| `backend/src/Handlers/Risk.php:91` | churn drivers | 권한 resolution 무관 |
| `backend/src/Handlers/AnomalyDetection.php` | 이상탐지(마케팅/커머스) | 접근 위험 아님 |
| `backend/src/Handlers/ModelMonitor.php` | ML model drift | role drift 아님 |
| `backend/src/Handlers/Alerting.php:665` | 알림 executor identity | resolution executor·risk 아님 |

**정직 분리**(ADR D-7 부재 과장 회피 반대편): `Risk.php`가 존재한다고 해서 "위험 계산이 이미 있다"로 오판하면 가짜녹색이다. `Risk.php`는 고객 churn ML이지 접근 권한 위험이 아니다. 반대로 Effective Risk Calculator를 "숨겨진 구현"으로 과장해서도 안 된다 — grep 0은 실측 부재다.

## 3. Canonical 설계

### 3.1 Canonical Entity: `APPROVAL_EFFECTIVE_RISK`

```
APPROVAL_EFFECTIVE_RISK {
  subject_ref        : 정규화 Subject 식별자
  resolution_version : 불변 버전 바인딩
  factors            : {
     identity_risk, session_risk, device_risk, network_risk, behavior_risk,
     role_criticality, permission_criticality, scope_criticality
  }
  risk_level         : LOW | MEDIUM | HIGH | CRITICAL   // SPEC §12 출력
  evidence           : 각 factor의 근거·가중 (SPEC §19 Evidence·§17 Explain)
  digest             : 정규화 후 해시
}
```

### 3.2 평가 요소 8종 (SPEC §12)

1. Identity Risk · 2. Session Risk · 3. Device Risk · 4. Network Risk · 5. Behavior Risk · 6. Role Criticality · 7. Permission Criticality · 8. Scope Criticality.

이들은 **전부 신규**다. role/permission/scope criticality는 Effective Role·Permission·Scope Calculator 산출물을 입력으로 파생하고, identity/session/device/network/behavior는 Resolution Context(SPEC §6)에서 파생한다.

### 3.3 출력·전파 규칙

- 출력은 4단계 등급 LOW/MEDIUM/HIGH/CRITICAL(SPEC §12).
- **HIGH/CRITICAL → Risk Deny 승격**: Effective Deny Calculator(SPEC §11)의 Risk Deny 소스로 공급 → 고위험 접근 차단(fail-secure).
- **MFA 정적 게이트와의 관계**: `UserAuth.php:941` MFA는 정적 auth-level이며, 본 계산기의 동적 위험 등급과 **직교**. 위험 기반 step-up MFA는 신규 결합(현행 정적 게이트는 KEEP_SEPARATE로 병존).

### 3.4 Determinism (ADR D-2)

동일 (Subject·Context·Version) → 동일 risk_level. risk 결과는 Snapshot에 영속하되, 동적 요소(session/behavior) 변경 시 Cache Invalidation(SPEC §22 Runtime Context 변경).

### 3.5 Snapshot·Explain·Error·Warning (SPEC §17·§18·§30·§31)

- **Snapshot**(SPEC §18): risk_level·factors를 Resolution Version과 불변 영속.
- **Explain**(SPEC §17): "왜 이 위험등급인가"를 factor별 기여도와 함께 사람이해·JSON 양형 제공.
- **Evidence**(SPEC §19): 각 factor 값·가중·criticality 근거 기록.
- **Error**(SPEC §30): risk 평가 실패 시 `ROLE_RESOLUTION_FAILED`(안전측 상향=CRITICAL 취급 권장).
- **Warning**(SPEC §31): 동적 위험 상승 시 `Runtime Context Changed`.

### 3.6 순신규 판정의 함의

본 계산기는 승격할 substrate가 없으므로 8요소·등급 산정·가중 로직 전부를 신규 설계한다. 단 role/permission/scope criticality 입력은 각각 Effective Role/Permission/Scope Calculator 산출을 재사용하므로 **완전 고립 신규가 아니라 상류 계산기 결합형 신규**다. identity/session/device/network/behavior는 Resolution Context(SPEC §6)에서 파생 — 이 컨텍스트 요소들은 이미 요청 처리에 존재하나 위험 점수로 종합된 적이 없다(ABSENT).

## 4. Kernel 매핑 (Resolution Pipeline)

| Pipeline 단계(SPEC §4) | 본 계산기 관여 | 상태 |
|---|---|---|
| 10. Risk Projection | 8요소 위험등급 산출 | ABSENT(순신규) |
| 9. Explicit Deny Projection | HIGH/CRIT → Risk Deny 공급 | Deny Calculator 연동 |
| 12. Policy Evaluation | 위험 기반 정책(step-up) | Policy Evaluation 연동 |
| 16. Snapshot Generation | 불변 risk 스냅샷 | ABSENT(신규) |

SPEC §27 Runtime Authorization Projection의 **Effective Risk Level**로 노출. SPEC §12 출력이 SPEC §11 Risk Deny를 트리거.

### 4.1 KEEP_SEPARATE 경계의 Kernel 매핑 주의

Pipeline 10단계(Risk Projection)에 `Risk.php`(churn ML)·`AnomalyDetection`·`ModelMonitor`의 산출을 입력·구현체로 끌어오면 안 된다(ADR D-5). 이들은 마케팅/모델 도메인 신호이며 접근 위험 factor가 아니다. Risk Projection은 오직 인증·세션·디바이스·네트워크·행위·criticality 8요소만 입력한다. 마케팅 ML을 권한 위험으로 재사용하면 가짜녹색.

## 5. 무후퇴 · Extend (ADR D-1·D-5·D-7)

- **순신규(그린필드)**: 승격할 권한-위험 substrate가 없으므로 본 계산기는 신규 구축이다. 단 **기존 정적 게이트(MFA `UserAuth.php:941`)는 파괴 금지·병존**(Extend).
- **KEEP_SEPARATE 절대 준수**(D-5): `Risk.php`·`AnomalyDetection`·`ModelMonitor`·`Alerting`을 ERRE Risk Calculator로 흡수·개명·재사용 금지. 마케팅 ML을 권한 위험으로 위장하면 가짜녹색.
- **부재 정직 기록**(D-7): risk calculator grep 0은 실측 부재. "이미 Risk.php가 있다"는 오판 금지. 반대로 숨은 구현 과장도 금지.
- **레거시 재부활 금지**: `legacy_v338_pkg` Python 재부활 금지(ADR D-5).

## 6. 완료 게이트

1. 8요소를 종합해 LOW/MED/HIGH/CRIT 산출(SPEC §12).
2. HIGH/CRITICAL이 Effective Deny Calculator Risk Deny로 정합 전파.
3. `Risk.php`/`AnomalyDetection`/`ModelMonitor` 오흡수 0(KEEP_SEPARATE 감사 통과).
4. Risk Snapshot·Digest·Version 불변 영속(SPEC §18·§20·§33).
5. Explain Engine이 위험 사유 제공(SPEC §17·§19).
6. Regression: 현행 정적 MFA 게이트 무후퇴·병존(SPEC §36).
7. Security: 위험 기반 escalation 차단(SPEC §28·§36).

### 6.1 테스트 계약 (SPEC §36)

- **Unit**: 8요소 가중 종합→LOW/MED/HIGH/CRIT 경계·안전측 상향(평가 실패→CRITICAL).
- **Integration**: HIGH/CRIT→Effective Deny Calculator Risk Deny 전파, criticality 입력=상류 Role/Permission/Scope Calculator 재사용 정합.
- **KEEP_SEPARATE 감사**: `Risk.php`/`AnomalyDetection`/`ModelMonitor`/`Alerting` 오흡수 0 정적 검사.
- **Performance**: 동적 factor 재계산 P95 ≤ 20ms(SPEC §35).
- **Security**: 위험 기반 escalation·우회 차단.
- **Regression**: 현행 정적 MFA 게이트(`UserAuth.php:941`) 무후퇴·병존.

> 선행 의존: Part 1~3-6 인증 후 별도 승인 세션. 코드 0. 본 개념 전면 ABSENT.

## 7. 반날조 인용 출처

- ABSENT 판정: Ground-Truth ② 표 #7(`role→LOW/MED/HIGH/CRIT` 계산기 grep 0)
- 정적 MFA(위험 아님): `UserAuth.php:941~:972` — Ground-Truth ② §4
- SPEC §4·§6·§11·§12·§17·§18·§19·§20·§22·§27·§28·§33·§36
- ADR D-5(KEEP_SEPARATE)·D-1(Extend)·D-2(deterministic)·D-7(정직 분리)
- KEEP_SEPARATE: `Risk.php:12/:81/:91`·`AnomalyDetection.php`·`ModelMonitor`·`Alerting.php:665` — Ground-Truth ② §4

**요약**: Effective Risk Calculator = **ABSENT(전면 부재·순신규)**. 승격할 권한-위험 substrate 없음. `Risk.php`(churn ML)·`AnomalyDetection`·`ModelMonitor`는 KEEP_SEPARATE(ADR D-5·가짜녹색 회피). 8요소 위험등급→HIGH/CRIT Risk Deny 전파. 정적 MFA 게이트는 병존(Extend). 코드 0·NOT_CERTIFIED·선행의존.
