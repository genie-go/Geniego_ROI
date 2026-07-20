# DSAR — Zero Trust & Continuous Authorization: 데이터베이스 제약 (Part 3-13 §33)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_13_ZERO_TRUST_CONTINUOUS_AUTHORIZATION_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_ZERO_TRUST_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ZT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ZT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §33은 Zero Trust 저장계층에 4개 DB 제약을 요구한다.

| # | 제약 | 의미 |
|---|---|---|
| C1 | Immutable Trust Snapshot | Trust Snapshot(§20: Identity/TrustScore/Session/Device/Risk/Decision)은 기록 후 불변 |
| C2 | Trust Version | 신뢰 평가 결과에 버전 부여(정책·threat feed 변화 추적) |
| C3 | Tenant Isolation | 모든 trust 레코드 테넌트 경계 격리 |
| C4 | Digest Validation | Digest(§22: Trust/Runtime/Decision/Snapshot 입력)의 무결성 검증 |

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 제약 | 판정 | 근거(파일:라인) |
|---|---|---|
| C1 Immutable Trust Snapshot | **ABSENT** (authz 전용 immutable trust snapshot 테이블 전무) | 근접 재활용: SecurityAudit 해시체인 append-only(`SecurityAudit.php:12-53`·`:56-68`)=tamper-evident 증거(GT① §E). trust snapshot 전용 아님 |
| C2 Trust Version | **ABSENT** | trust profile/score 구조 전무(GT② §2 "trust profile/engine 전용 구조 전무") |
| C3 Tenant Isolation | **PARTIAL** (기존 세션 substrate 격리 존재·trust 전용 아님) | api_key 미들웨어 tenant 주입(`index.php:69-622`)·`user_session`(`UserAuth.php:249-311`)에 tenant 결합. authz trust 전용 테이블 ABSENT |
| C4 Digest Validation | **ABSENT** | SecurityAudit verify(`SecurityAudit.php:56-68`)가 유일 무결성 검증 근접물. Digest(§22) 전용 검증 전무 |

## 3. 설계 계약 (항목·기준 — SPEC 근거)

- **C1**: `approval_trust_snapshot` 신설 테이블은 INSERT-only. UPDATE/DELETE 금지 트리거 또는 append-only 해시체인(SecurityAudit 패턴 `SecurityAudit.php:12-68` 재활용)으로 불변 강제.
- **C2**: 각 snapshot에 `trust_version` 컬럼 — 정책/threat feed 세대 식별. 재평가(§25 Revalidation) 시 신버전 append(기존 무수정).
- **C3**: 모든 trust 테이블에 `tenant_id` NOT NULL + 쿼리 경로 테넌트 스코프 강제(기존 미들웨어 tenant 주입 `index.php:69-622` 결합).
- **C4**: Digest(§22)는 SecurityAudit verify(`SecurityAudit.php:56-68`) 패턴으로 preimage 검증. Snapshot digest 불일치 시 BLOCKED.

## 4. KEEP_SEPARATE / 선행의존

- **KEEP_SEPARATE**: 마케팅 trust/신뢰도 저장(`Mmm.php:749`·`:939`·`AttributionEngine.php:246-261`·`DataPlatform.php:281`)·마케팅 risk/anomaly(`AnomalyDetection.php`·`ModelMonitor.php:11-18`·`Risk.php:31-55`·`CustomerAI.php:10-18`)는 authz trust snapshot 테이블과 데이터소스·목적 완전 분리. `performance_metrics`/`attribution_*`/`crm_*` ≠ authz `user_session`/`auth_audit_log`(GT② §5).
- **선행의존**: Part 1~3-12 인증 후 실 구현(BLOCKED_PREREQUISITE). C1/C2/C4는 순신규 테이블 신설 필요.

## 5. 판정 (NOT_CERTIFIED · RP-track 실구현 조건 · 선행의존)

- **판정**: C1/C2/C4 = **ABSENT**(authz 전용 immutable trust snapshot·version·digest 테이블 순신규), C3 = **PARTIAL**(세션 tenant 격리 재활용·trust 전용 미존재).
- **RP-track 실구현 조건**: 제약 4종 DB 강제(트리거/체인/NOT NULL) + Digest Validation 회귀. 현 단계 코드 변경 0 · **NOT_CERTIFIED**. SecurityAudit 체인(`SecurityAudit.php:12-68`)·user_session(`UserAuth.php:249-311`) 재활용은 Extend-only(무후퇴).
