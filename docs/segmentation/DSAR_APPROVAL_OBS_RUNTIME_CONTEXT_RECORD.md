# DSAR — Authorization Observability & Forensics: 런타임 컨텍스트 레코드 (APPROVAL_RUNTIME_CONTEXT_RECORD)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_14_AUTHORIZATION_OBSERVABILITY_FORENSICS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OBSERVABILITY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OBS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OBS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_RUNTIME_CONTEXT_RECORD`는 SPEC §11(Runtime Context Recorder)이 규정하는 **인가 결정 시점의 런타임 컨텍스트 스냅샷**이다. 기록 항목: Device·Network·Browser·Client·IP·Region·Environment·MFA Status·Trust Score(SPEC §11 열거). Auth Event(SPEC §3)의 Runtime Context Version이 이 레코드를 가리킨다.

- SPEC §1(구현 목표 10번 "Runtime Context Recorder").
- Decision Replay(SPEC §8 Context Replay)·Digital Twin(SPEC §7 Context/Runtime State 복원)의 입력 근거.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §11 항목 | 판정 | 근거(파일:라인) |
|---|---|---|
| 세션 메타 기록(ip/ua/last_seen) | **PARTIAL** | `UserAuth.php:4243-4251`(recordSessionMeta) — GT① §2.E |
| 감사행 ip/ua 컨텍스트 | **PARTIAL** | `UserAuth.php:4174-4197`·`:4165`(audit ip/ua/risk 컬럼) — GT② §2 |
| MFA Status / Trust Score / Region / Device / Environment | **ABSENT** | GT② §2 "recordSessionMeta·audit ip/ua 기록. **인가 결정(scope 평가 입력·allow/deny) 컨텍스트 스냅샷 없음**" |
| 결정 컨텍스트 스냅샷(scope 평가 입력·allow/deny) | **ABSENT** | GT① §2.E "recordSessionMeta(ip/ua/last_seen)…**결정 컨텍스트 스냅샷 없음**" · ADR §2.1 |

★핵심 격차: `recordSessionMeta`(`UserAuth.php:4243-4251`)는 **세션 컨텍스트(ip/ua/last_seen)만** 기록하고 **인가 결정 컨텍스트(scope 평가 입력·allow/deny·MFA·Trust Score 스냅샷)는 없다**(GT① §2.E·GT② §2·ADR D-8 "recordSessionMeta는 세션 컨텍스트만"). 따라서 PARTIAL.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거)

- **확장(Extend)**(ADR D-2): `recordSessionMeta`(`UserAuth.php:4243-4251`)를 **결정 컨텍스트 스냅샷으로 확장** — SPEC §11의 Device/Network/Browser/Client/IP/Region/Environment/MFA Status/Trust Score를 결정 시점에 캡처(GT② §3-4).
- **Auth Event 연동**: SPEC §3의 Runtime Context Version 필드가 이 레코드를 참조(ADR D-2). Policy/Permission Trace(SPEC §12·§13)의 Runtime Constraint 입력.
- **불변/무결성**: 스냅샷은 Immutable(SPEC §33 Snapshot Integrity). Immutable Event Store(`SecurityAudit.php:14-68`) 앵커에 참조 연결(ADR D-1·흡수 아님).
- **테넌트 격리**: `Compliance.php:176`(fail-closed) 재사용.
- **Replay/Twin 입력**: Context Replay(SPEC §8)·Digital Twin Runtime State(SPEC §7·time-travel)의 재구성 근거. Replay는 read-only simulation(SPEC §8).

## 4. KEEP_SEPARATE (흡수 금지)

- **인프라 SystemMetrics**: `SystemMetrics.php:1-60`(모듈 latency_ms/uptime/error_rate — 인프라 헬스·비authz) — 런타임 컨텍스트 아님(GT② §5 B-3).
- **마케팅 attribution/decision**: `AttributionEngine.php:1522`·`:1546`·`:1553`·`Decisioning.php:12`·`:36` — 결정 컨텍스트 아님(GT② §5 B-2).
- **Walmart correlation_id**: `ChannelSync.php:1705`(외 5개소) — 외부 API 헤더(GT② §5 B-1).
- **ML/데이터 관측**: `ModelMonitor.php`·`DataPlatform.php` — authz 런타임 컨텍스트 아님(GT② §5 B-3).

## 5. 판정

- **NOT_CERTIFIED · BLOCKED_PREREQUISITE**: Runtime Context Recorder = **PARTIAL**. 세션 메타(ip/ua/last_seen)는 PRESENT하나 **결정 컨텍스트 스냅샷(scope 입력·allow/deny·MFA·Trust Score)은 ABSENT**.
- **재활용/ABSENT**: 확장 대상=`UserAuth.php:4243-4251`(recordSessionMeta)·감사 ip/ua=`UserAuth.php:4174-4197`·앵커=`SecurityAudit.php:14-68`. Device/Region/Environment/MFA/Trust Score 결정 스냅샷은 순신규.
- **선행 의존**: 결정 컨텍스트(scope 평가 입력·allow/deny)는 Part 3-12 PDP·3-13 Zero Trust(Trust Score) 인증 후 실 캡처(ADR D-6). 그전엔 스냅샷 스키마 계약만 확정.
