# DSAR — JIT Access Governance: 런타임 모니터링 (APPROVAL_JIT_MONITOR)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_9_JIT_ACCESS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_JIT_ACCESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_JIT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_JIT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

APPROVAL_JIT_MONITOR는 활성 상승세션의 **실제 사용 행위를 실시간 감시**한다. SPEC §13(Runtime Monitoring): Permission Usage·API Invocation·Data Access·Scope Usage·Command Execution·Session Idle Time·Abnormal Behavior. Continuous Validation(§12·Runtime DSAR)이 "유효성 재검증"이라면, Monitor는 "사용 관측·이상 탐지"로 상승권한의 오·남용을 감지해 Revocation(§14)·Analytics(§20)·Evidence(§26)에 신호를 공급한다. Monitoring Latency ≤ 5초(SPEC §35).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| substrate | 판정 | 근거(파일:라인) | JIT 매핑 |
|---|---|---|---|
| api_key 자격증명 substrate(런타임 401·revoke) | PARTIAL | `index.php:518`·`Keys.php:135`(GT① A·E) | 자격증명 사용 관측 재활용 후보 |
| 세션 유휴 자동로그아웃 | PARTIAL | `UserAuth.php:206`(GT② B-4) | Session Idle Time(근접) |
| SecurityAudit 불변 감사 로그(append-only) | PRESENT | `SecurityAudit.php:12-53`(GT① 4-F·ADR §2.1) | Access Log·Evidence 기록 |
| **상승세션 실시간 감시(permission/API/data/scope usage)** | **ABSENT** | GT② §2 Session-entitlement projection ABSENT·상승 usage 관측 grep 0 | 순신규 |
| **상승 Risk/Anomaly scoring** | **ABSENT** | GT② §2 — 권한상승 risk scoring 0 | 순신규 |

> **정직 경계**: api_key 사용 카운팅·세션 유휴 감지는 **개별 축의 관측**이지 상승세션 단위의 통합 실시간 감시가 아니다. 상승권한의 Permission/API/Data/Scope Usage 실시간 모니터링·Abnormal Behavior 탐지는 GT② §2 기준 ABSENT. api_key 사용 관측 substrate(`Keys.php:135`)는 **재활용 후보**이나 elevation 실시간 감시 자체는 순신규.

## 3. 설계 계약 (필드·상태·제약)

- **감시 항목**(SPEC §13): Permission Usage·API Invocation·Data Access·Scope Usage·Command Execution·Session Idle Time·Abnormal Behavior. 이상 신호는 Revocation(Risk 상승 → 자동회수, SPEC §14)·Warning(Monitoring Gap·High Risk Elevation, SPEC §31)로 라우팅.
- **불변 증거**: 관측 이벤트·Command History·Access Log는 SecurityAudit 불변 체인(`SecurityAudit.php:12-53`) 기록(SPEC §26 Evidence).
- **재활용**: api_key 사용 관측(`Keys.php:135`·`index.php:518`)·유휴 감지(`UserAuth.php:206`)를 **대체 아닌 확장**으로 상승세션 감시에 결합. 신규 이상탐지 엔진 신설 금지 — 아래 KEEP_SEPARATE 엔진과 분리 유지.
- **테넌트 격리·성능**: 테넌트별 격리 관측·Monitoring Latency ≤ 5초(SPEC §35).

## 4. KEEP_SEPARATE (동음이의 흡수금지)

| 근접물 | 근거 | 분리 사유 |
|---|---|---|
| model drift 모니터 | `ModelMonitor.php`(GT② B-8) | ML 모델 드리프트 — elevation 감시 아님 |
| 마케팅/지표 이상탐지 | `AnomalyDetection.php`(GT② §2·B-8) | 마케팅/거래 이상탐지 — 상승세션 감시 아님 |
| churn risk_level | `CustomerAI.php:78-80,:179,:392,:406`(GT② B-8) | 고객 이탈 risk — elevation risk 아님 |
| 메뉴 감사체인 | `menu_audit_log`(`AdminMenu.php:98`)(GT② B-8) | 장식·verify 별개 — elevation snapshot/evidence 아님 |

> **핵심 분리(ADR·GT② B-8)**: `ModelMonitor`·`AnomalyDetection`은 **KEEP_SEPARATE** — 상승세션 실시간 감시를 이 마케팅/ML 엔진에 흡수·개명 금지(중복 엔진 금지·가짜녹색 회피).

## 5. 판정

- **NOT_CERTIFIED · BLOCKED_PREREQUISITE**: 코드 변경 0. 상승세션 실시간 감시·Risk/Anomaly scoring은 **ABSENT(순신규)**. api_key 사용 관측·SecurityAudit 기록·유휴 감지는 **재활용(Extend)**.
- **재활용/ABSENT 분리**: 재활용=`Keys.php:135`·`index.php:518`·`SecurityAudit.php:12-53`·`UserAuth.php:206`. ABSENT=상승 usage 감시·elevation risk scoring(GT② §2). KEEP_SEPARATE=`ModelMonitor.php`·`AnomalyDetection.php`(GT② B-8).
- **선행 의존**: Part 1~3-8 인증 후 실 구현. Session·Runtime DSAR 확정 후 감시 신호가 Revocation/Analytics/Evidence로 결합.
