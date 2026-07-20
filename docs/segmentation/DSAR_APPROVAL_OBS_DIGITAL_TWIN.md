# DSAR — Authorization Observability & Forensics: 인가 디지털 트윈 (APPROVAL_AUTH_DIGITAL_TWIN)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_14_AUTHORIZATION_OBSERVABILITY_FORENSICS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OBSERVABILITY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OBS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OBS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_AUTH_DIGITAL_TWIN`은 특정 과거 시점(Time Travel)의 인가 상태를 **완전 복원**하는 디지털 트윈이다(SPEC §7). 재현 가능 객체는 User·Session·Role·Assignment·Scope·Permission·Context·Policy·Runtime State(SPEC §7)이며, 특정 시점 기준으로 완전 복원 가능해야 한다(SPEC §7 명시). "특정 시점의 Effective Permission은 무엇이었는가"에 답하는 핵심 엔티티다(SPEC §0).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| Part3-14 요소 | 판정 | 근거(파일:라인) |
|---|---|---|
| Digital Twin(time-travel 복원) | **ABSENT** | 과거 시점 effective permission 복원 경로 없음(GT② §2). digital_twin authz 매치 0(GT② §1) |
| 현행 effective 계산 | **PARTIAL·현재상태만** | `effectiveScope`(`TeamPermissions.php:236`)·effective route(`routes.php:1605`)는 **현재 상태만**(time-travel 아님·GT② §2, ADR D-3) |
| 시점 복원 원천(이벤트 이력) | **PRESENT(SecurityAudit)** | `SecurityAudit.php:14-68` append-only 해시체인=버전 이력의 유일 tamper-evident 원천(GT① §A) |
| Version 축(Policy/Role/Permission/Context) | **ABSENT** | Authorization Event Model의 Effective Role/Permission/Runtime Context Version(SPEC §3) 컬럼 부재(`UserAuth.php:4165` 평문 detail·GT② §2) |
| Runtime State 스냅샷 | **PARTIAL** | `recordSessionMeta`(`UserAuth.php:4243-4251`) ip/ua만·결정 컨텍스트 스냅샷 없음(GT② §2) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·불변/테넌트격리)

| 항목 | 계약 |
|---|---|
| 복원 객체 | User·Session·Role·Assignment·Scope·Permission·Context·Policy·Runtime State(SPEC §7) |
| ★Time Travel | 특정 시점 기준 완전 복원(SPEC §7). Version 축=Policy/Effective Role/Effective Permission/Runtime Context Version(SPEC §3) |
| 입력 | Immutable Event Store(SPEC §18 Versioned) + Snapshot(SPEC §25 Context/Policy) |
| 무결성 | Cryptographic Integrity(SPEC §18)·Hash Chain Integrity(SPEC §33). SecurityAudit verify(`:56-68`) 패턴 |
| 오류 계약 | DIGITAL_TWIN_BUILD_FAILED(SPEC §30) |
| 테넌트 격리 | Tenant Isolation DB 제약(SPEC §33)·`Compliance.php:176` fail-closed |
| API | Build Digital Twin(SPEC §32)·Digital Twin Validation 통과(SPEC §37) |

## 4. KEEP_SEPARATE (Walmart correlation_id·마케팅 흡수금지)

| 동음이의 | 실체 | 근거(파일:라인) |
|---|---|---|
| ★correlation_id | Walmart 외부 API 헤더 — 트윈 상관키 아님 | `ChannelSync.php:1705`·`:2874`·`:3467`(GT② §5 B-1) |
| 데이터 lineage | 데이터 계보(≠authz 시점 복원) | `DataPlatform.php`(GT② §5 B-3) |
| ML 모니터링 | 모델 상태 트윈/모니터링 | `ModelMonitor.php`(GT② §5 B-3) |
| 인프라 헬스 | 모듈 latency/uptime/error_rate | `SystemMetrics.php:1-60`(GT② §5 B-3) |

authz Digital Twin의 시점 복원은 데이터 lineage·ML·인프라 관측성과 **흡수 금지**(ADR D-8).

## 5. 판정 (NOT_CERTIFIED · ABSENT-순신규 · 선행의존)

- **판정**: **ABSENT(순신규)**. Time-travel 복원은 신설(ADR D-3). 현행 `effectiveScope`(`TeamPermissions.php:236`)·effective route(`routes.php:1605`)는 현재 상태만 산출하므로 디지털 트윈 substrate가 아니다(GT② §2).
- **재활용(참조/확장)**: SecurityAudit 이벤트 이력(`SecurityAudit.php:14-68`)을 버전 원천으로(ADR D-1), 감사행에 Version 축 컬럼 확장(ADR D-2), recordSessionMeta→Runtime State 스냅샷 확장(ADR §3.5).
- **선행 의존**: Digital Twin은 이벤트에 시점·버전이 기록되어야 복원 가능(§3 Event Model 선행). Part 1~3-13 인증 후 실 구현(BLOCKED_PREREQUISITE·ADR §4).
- **코드 변경 0 · NOT_CERTIFIED**. Digital Twin Validation은 실 구현(RP-track) 세션 조건(ADR §5).
