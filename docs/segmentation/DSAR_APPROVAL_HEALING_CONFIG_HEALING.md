# DSAR — Configuration Healing Engine (Part 3-20 §11)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_HEALING_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §11 — Configuration Healing Engine)

APPROVAL_CONFIGURATION_HEALING은 인가(authorization) **구성(config)** 계층에서 발생하는 5종 드리프트·손상을 탐지→자동복구하는 엔진이다.

| 힐링 대상 | 정의 | 복구 계약 |
|-----------|------|-----------|
| Missing Configuration | 필수 authz config 키 부재 | canonical 기본값 재수화(rehydrate)·복구 사유 감사 |
| Invalid Version | config 스키마 버전 불일치 | 마지막 known-good 버전으로 롤포워드/롤백 제안 |
| Corrupted Cache | 인가 결정 캐시 무결성 실패 | 캐시 무효화·SoT 재조회로 재구성 |
| Metadata Mismatch | config 메타(테넌트/scope/hash) 불일치 | 메타 재계산·SoT 대비 재정합 |
| Endpoint Drift | 보호 엔드포인트 목록과 실 라우트 표류 | 라우트 SoT 재스캔·bypass 목록 재검증 |

핵심 원칙: **healing은 authz "config" 계층에만 작용**하며, 스키마 DDL·데이터 마이그레이션·권한 부여(grant) 자체를 변경하지 않는다. 모든 복구는 감사 이벤트를 남기고, 위험 등급 이상은 §16 Recovery Approval Manager 게이트를 통과해야 집행된다.

## 2. Substrate 매핑

| 계약 요소 | 현행 substrate | 판정 |
|-----------|----------------|------|
| authz config healing 엔진 | 없음 (grep 0) | **ABSENT** |
| 복구 승인 게이트(참조) | maker-checker (`Mapping.php:240`·self-approval 차단 `Mapping.php:268-271`·정족수 `Mapping.php:287`·producer `Mapping.php:209`) | 재사용(§16) |
| 복구 감사 무결성(참조) | SecurityAudit verify (`SecurityAudit.php:56-68`) | 재사용(§12) |

## 3. 설계 계약

- Config Healing Engine은 **순신설**. 탐지기(Detector)–계획(Plan)–집행(Executor)–감사(Audit) 4단으로 분리하고, Executor는 위험 등급 매핑에 따라 자동집행 또는 Recovery Approval 큐로 라우팅한다.
- 자동집행 허용 범위: Missing Configuration 기본값 재수화·Corrupted Cache 무효화(비파괴 재구성)에 한정. Invalid Version 롤백·Endpoint Drift 라우트 반영은 승인 필수(Fail-closed).
- 모든 healing 결정은 SecurityAudit append-only 체인(`SecurityAudit.php:14`)에 기록하며, 근거(전/후 config 해시·탐지 규칙 id)를 포함한다.

## 4. KEEP_SEPARATE (흡수 금지)

- **DB 스키마 self-heal은 authz config healing이 아니다**: `Db.php:308`·`Db.php:585-590`(`ensureTables`/컬럼 self-heal)·`AdminPlans.php:661-663`·`Wms.php:859`는 **테이블/컬럼 DDL 자가치유**로, 물리 스키마 계층에 속한다. 이를 config healing 엔진으로 통합하면 스키마 DDL과 인가 config가 한 엔진에 뒤섞여 계층 위반이 된다. 별도 유지.

## 5. 판정

**ABSENT** — authz config healing 도메인은 grep 0으로 전무하다. 순신설이며, 복구 승인·감사 무결성 substrate만 재사용한다. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행 §12 Integrity Validator·§16 Recovery Approval 부재).
