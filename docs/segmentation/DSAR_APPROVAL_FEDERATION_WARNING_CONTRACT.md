# DSAR — Authorization Federation Warning Contract (Part 3-18 §31)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_18_FEDERATION_CROSS_DOMAIN_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FEDERATION_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FEDERATION_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FEDERATION_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC) — APPROVAL_FEDERATION_WARNING_CONTRACT(§31)

Federation Warning Contract는 **아직 차단(§30 Error)에는 이르지 않았으나 연합 건전성이 저하되는 조기 신호를 비차단(non-blocking) 경고로 표면화**하는 계약이다. Error가 요청을 실패시키는 하드 신호라면, Warning은 요청을 통과시키되 운영자·자동화에 열화를 알리는 소프트 신호다 — 예방적 개입(계약 갱신·인증서 회전·재검증)의 트리거가 된다. 본 §31은 5종 경고를 규정한다.

- **Trust Score Declining** — 파트너 신뢰 점수가 하락 추세(임계 미만 아직 아님).
- **Certificate Near Expiration** — 인증서 만료 임박(회전 유예 창 진입).
- **Sync Delay** — 정책/메타데이터 동기화 지연이 목표 SLA 초과.
- **Partner Latency High** — 원격 PDP/메타데이터 응답 지연 상승.
- **Federation Drift Detected** — §24 Drift Governance가 관측한 drift가 경고 임계 도달.

계약상 Warning은 **요청을 차단하지 않으며**, 반드시 감사에 기록되고 임계 누적 시 §30 Error 또는 재검증으로 승격 가능하다. 경고 남발(alert fatigue) 방지를 위해 축별 임계·억제(debounce)를 계약에 포함한다.

## 2. Substrate 매핑

| SPEC 개념(§31) | 현행 substrate | 상태 |
|---|---|---|
| 경고 이벤트 감사 기록 | `SecurityAudit.php:14-67` | 경고 append 채널로 재사용 가능 |
| Certificate 정보 소비 지점 | IdP cert 소비(`EnterpriseAuth.php:596-623`) | 만료 임박 판정의 데이터원 proto, 경고 로직 부재 |
| Drift 관측 입력 | §24 Federation Drift(DSAR_APPROVAL_FEDERATION_DRIFT) | 설계 문서만, 실 관측 엔진 ABSENT |
| Trust Declining/Cert Near Expiration/Sync Delay/Partner Latency/Drift Detected 경고 | 부재 | **ABSENT (grep 0)** |

## 3. 설계 계약

- **WarningSignal 레코드** — `{signal, severity(WARN), metric, threshold, observed_at, suppressed(bool)}`. 5종 enum. 요청 verdict에 영향 없음(non-blocking).
- **Certificate Near Expiration** — `EnterpriseAuth.php:596-623`가 소비하는 IdP cert의 만료 시각을 데이터원으로 삼아 유예 창 진입 시 발행. 별도 인증서 저장소 신설 금지.
- **Drift Detected** — §24 DriftObservation의 severity가 경고 임계에 도달하면 발행(§24와 단일 관측 파이프라인, 중복 관측 금지).
- **억제(Debounce)** — 축별 임계·최소 재발행 간격을 계약에 포함해 alert fatigue 방지. 억제된 경고도 suppressed=true로 감사 기록(침묵 삭제 금지).
- **승격 경로** — 경고 누적/악화 시 §30 Error 또는 재검증 트리거로 승격, 자동 차단은 하지 않음(fail-open 신호이나 감사 완전).

## 4. KEEP_SEPARATE

- **OpenPlatform HMAC**(`OpenPlatform.php:41`) — API rate/latency 경고와 federation partner latency는 도메인 상이. 통합 금지.
- **OAuth 콜백**(`OAuth.php:369`) — 소셜 로그인 지연은 federation sync delay 아님.

## 5. 판정

**ABSENT** — federation warning 5종 grep 0. 감사 채널(`SecurityAudit.php:14-67`)과 인증서 소비 지점(`EnterpriseAuth.php:596-623`)이 경고의 기록·데이터원 baseline으로 존재하나, 신뢰 하락·만료 임박·동기 지연·지연 상승·drift 경고를 발행하는 로직은 전무. Drift Detected 입력원(§24)도 설계 상태로 ABSENT. §31 5종 순신설. **NOT_CERTIFIED · BLOCKED_PREREQUISITE**(관측 대상 federation 런타임·Drift 엔진 substrate 부재).
