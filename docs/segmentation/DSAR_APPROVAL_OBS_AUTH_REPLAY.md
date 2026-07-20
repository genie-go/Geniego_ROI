# DSAR — Authorization Observability & Forensics: 결정 재현 엔진 (APPROVAL_AUTH_REPLAY)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_14_AUTHORIZATION_OBSERVABILITY_FORENSICS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OBSERVABILITY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OBS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OBS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_AUTH_REPLAY`은 과거 인가 결정을 **실제 리소스 접근 없이 Read-only Simulation으로 재현**하는 재현 엔진이다(SPEC §8). Replay 대상은 Request Replay·Context Replay·Policy Replay·Session Replay·Runtime Replay(SPEC §8)이며, "왜 이 요청이 허용/거부되었는가"를 사후 실행하여 검증한다(SPEC §0). Replay는 결코 실제 리소스를 변경하지 않는다(SPEC §8 명시: Read-only Simulation).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| Part3-14 요소 | 판정 | 근거(파일:라인) |
|---|---|---|
| Decision Replay 엔진 | **ABSENT** | 과거 시점 결정 재현 경로 없음(GT② §2). Replay/Digital Twin authz 매치 0(GT② §1) |
| 재현 입력(effective permission) | **PARTIAL·현재상태만** | `effectiveScope`(`TeamPermissions.php:236`)·effective route(`routes.php:1605`)는 **현재 상태만**·time-travel 없음(GT② §2) |
| 재현 원천 이벤트 스토어 | **PRESENT(SecurityAudit)** | `SecurityAudit.php:14-68` append-only+verify=재현 데이터의 유일 tamper-evident 원천(GT① §A) |
| Replay 결정 컨텍스트 | **ABSENT** | 결정 컨텍스트 스냅샷 없음(`recordSessionMeta`는 ip/ua만·`UserAuth.php:4243-4251`·GT② §2) |
| Replay Count 지표 | **ABSENT** | Metrics Engine Replay Count(SPEC §20) 미수집(authz telemetry ABSENT·GT② §2) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·불변/테넌트격리)

| 항목 | 계약 |
|---|---|
| Replay 종류 | Request·Context·Policy·Session·Runtime Replay(SPEC §8) |
| ★안전 제약 | **Read-only Simulation** — 실 리소스 접근/변경 절대 금지(SPEC §8). Runtime Guard의 Replay Abuse 차단(SPEC §28) |
| 입력 | Immutable Event Store(SPEC §18)의 과거 이벤트 + Runtime Context Record(SPEC §11)·Policy/Permission Version(SPEC §3) |
| 성능 | Replay ≤ 3초(SPEC §35) |
| 오류 계약 | REPLAY_FAILED(SPEC §30)·경고 Replay Drift(SPEC §31) |
| 무결성/격리 | 재현 대상 이벤트는 Hash Chain Integrity(SPEC §33)로 검증·테넌트 격리(`Compliance.php:176` fail-closed) |
| API | Replay Decision(SPEC §32) |

## 4. KEEP_SEPARATE (Walmart correlation_id·마케팅 흡수금지)

| 동음이의 | 실체 | 근거(파일:라인) |
|---|---|---|
| ★correlation_id | Walmart 외부 API 헤더 — replay 연결키 아님 | `ChannelSync.php:1705`·`:1709`(GT② §5 B-1) |
| 마케팅 decision | ingestAdInsights("decision"≠authz 재현) | `Decisioning.php:12`·`:36`(GT② §5 B-2) |
| 마케팅 percentile | 부트스트랩 신뢰구간 p5/p95(≠authz replay 지표) | `AttributionEngine.php:1522`·`:1546`·`:1553`(GT② §5 B-2) |
| ML 모니터링 | 모델 재현/모니터링 | `ModelMonitor.php`(GT② §5 B-3) |

authz Decision Replay는 마케팅 시뮬레이션·ML 재현과 **별개 엔진**이며 흡수하지 않는다(ADR D-8).

## 5. 판정 (NOT_CERTIFIED · ABSENT-순신규 · 선행의존)

- **판정**: **ABSENT(순신규)**. Decision Replay는 read-only·time-travel 신설(ADR D-3). 현행 `effectiveScope`(`TeamPermissions.php:236`)는 현재 상태만 계산하므로 과거 시점 재현 substrate가 아니다(GT② §2).
- **재활용(참조/확장)**: SecurityAudit Immutable Event Store(`SecurityAudit.php:14-68`)를 재현 원천으로(ADR D-1). 결정 컨텍스트는 recordSessionMeta 확장(ADR §3.5).
- **선행 의존**: 과거 이벤트가 correlation/decision-context 컬럼으로 기록(§5·§6 선행)되어야 재현 가능. Part 1~3-13 인증 후 실 구현(BLOCKED_PREREQUISITE·ADR §4).
- **코드 변경 0 · NOT_CERTIFIED**. Replay Validation은 실 구현(RP-track) 세션 조건(ADR §5).
