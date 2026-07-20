# DSAR — JIT Access Governance: 경고 계약 (Part 3-9 §31)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_9_JIT_ACCESS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_JIT_ACCESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_JIT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_JIT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §31 Warning Contract = **차단은 아니나 운영자·감사자 주의를 요하는 비-치명 신호 5종**이다. Error(§30·차단)와 달리 경고는 grant를 유지한 채 알림·검토를 유발한다.

| 경고 | 발생 조건(SPEC 매핑) |
|---|---|
| Elevation Expiring Soon | grant End Time 임박(§16 Remaining Time·§14 End Time 도달 전) |
| Monitoring Gap | Runtime Monitoring 신호 결손(§13 감시 누락) |
| Extension Required | 작업 미완 상태에서 만료 임박(§16 Session Extension 필요) |
| High Risk Elevation | Risk 평가 HIGH/CRITICAL grant 발급·사용(§6 출력) |
| Frequent Elevation Pattern | 동일 requester 반복 상승 패턴(§20 Analytics·§21 Drift) |

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 경고축 | 근접 substrate (파일:라인) | 상태 |
|---|---|---|
| Elevation Expiring Soon | 세션 만료시각 `expires_at` `UserAuth.php:249-284`·impersonate 2h TTL `UserAdmin.php:472-482`(GT①§4-C/D) — 만료시각은 실존, 임박 경고 발신 없음 | PARTIAL |
| Monitoring Gap | Runtime Monitoring(§13) 자체가 ABSENT(GT②표 §2 Guard/Anomaly) — gap 탐지 불가 | ABSENT |
| Extension Required | Session Extension(§16) grep 0(GT②B-9 lazy만) — 연장 필요 신호 없음 | ABSENT |
| High Risk Elevation | break-glass `auth.breakglass` High-risk 감사이벤트 `UserAuth.php:997-999`(GT①§4-A) — 비상 인증 이벤트일 뿐 elevation risk 경고 아님 | 오근접 |
| Frequent Elevation Pattern | `AnomalyDetection.php`(마케팅/지표·GT②B-8) — 권한상승 빈도 분석 아님. Elevation Analytics 부재 | ABSENT |

- **정직 경계**: 만료시각(세션/impersonate TTL)은 실존하나 "임박 경고 발신 계층"과 elevation risk/frequency 분석은 전무하다(GT②§1 JIT Analytics/Risk ABSENT).

## 3. 설계 계약 (항목·규칙 — SPEC 근거)

| 규칙 | 계약 내용 |
|---|---|
| W-1 비차단 원칙 | 경고는 grant를 유지하되 알림·검토 유발. 차단은 Error(§30)/Guard(§28) 소관. |
| W-2 만료 임박 | `expires_at` 잔여시간 임계 도달 시 Elevation Expiring Soon·Extension Required 발신(만료시각은 grant 원장 앵커 필요·§D-1). |
| W-3 감시 결손 | Runtime Monitoring(§13) 신호 결손 시 Monitoring Gap — 감시 부재를 은폐 아닌 경고로 표면화. |
| W-4 위험 표면화 | Risk HIGH/CRITICAL(§6) grant는 High Risk Elevation 경고 + SecurityAudit 증거(`SecurityAudit.php:12-53`) 결선. |
| W-5 패턴 신설 | Frequent Elevation Pattern은 Elevation Analytics(§20)/Drift(§21) 신설 후 파생 — `AnomalyDetection.php` 마케팅 엔진 재사용 아님(KEEP_SEPARATE). |

## 4. KEEP_SEPARATE (동음이의 흡수금지)

- `AnomalyDetection.php`·`ModelMonitor.php`(GT②B-8) — 마케팅/ML 이상·드리프트. elevation 빈도/위험 경고 아님.
- `auth.breakglass` 감사 `UserAuth.php:995`(GT①C) — 비상 인증 이벤트이지 High Risk Elevation 경고 아님.
- `CustomerAI.php` churn risk_level(`:78-80` 등·GT②B-8) — 고객 이탈 위험이지 권한상승 위험 아님.
- 세션 유휴 로그아웃 `UserAuth.php:206`(GT②B-4) — 세션 수명 경고이지 grant 만료 경고 아님.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**Warning Contract = 대부분 ABSENT / 만료시각만 부분 재활용.** 5경고 중 만료 임박계열은 세션/impersonate TTL 시각을 신호원으로 재사용 가능하나, Monitoring Gap·Extension Required·Frequent Pattern은 대응 계층(§13 감시·§16 연장·§20 Analytics)이 전무해 순신규다. 만료 임박 경고조차 grant 원장(§D-1)이 선행해야 발신 가능. 코드 변경 0 · Part 1~3-8 인증 후 RP-track(BLOCKED_PREREQUISITE).
