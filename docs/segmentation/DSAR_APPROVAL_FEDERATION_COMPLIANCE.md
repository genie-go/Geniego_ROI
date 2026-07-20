# DSAR — Compliance Federation (Part 3-18 §9)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_18_FEDERATION_CROSS_DOMAIN_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FEDERATION_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FEDERATION_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FEDERATION_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC 참조)

`APPROVAL_FEDERATION_COMPLIANCE`는 §9 Compliance Federation으로, 서로 다른 권한 도메인이 **컴플라이언스 통제·증거·감사를 공유**하고 지역/규제 요건을 상호 검증하는 계층이다. 로컬 컴플라이언스가 자기 도메인 posture만 관리하는 것과 달리, compliance federation은 도메인 간에 통제 상태와 증거를 교환·정합한다. SPEC §9 최소 구성요소:

- **Shared Controls**: 도메인 간 공통 통제 항목의 상태를 공유·정합.
- **Shared Evidence**: 통제 이행 증거(로그·해시체인)를 상대 도메인이 인증 경로로 검증.
- **Shared Audit**: 감사 추적을 도메인 간에 상호 조회·검증.
- **Regulatory Mapping**: 도메인별 규제 프레임워크를 canonical 통제로 매핑.
- **Regional Compliance Validation**: 지역별 규제 요건(데이터 주권 등) 충족 여부 상호 검증.

## 2. Substrate 매핑

| SPEC 요소 | 현행 근접 substrate | 판정 |
|---|---|---|
| 로컬 컴플라이언스 posture | `Compliance.php:71-73` posture 조회·`:87` | KEEP(로컬 상태) |
| 로컬 규제 항목 평가 | `Compliance.php:95-98` 통제 항목 | KEEP(로컬 통제) |
| 감사 증거(해시체인) | `SecurityAudit.php:14-67` append-only·`:56` verify | KEEP(로컬 증거) |
| Shared Controls/Evidence/Audit | 없음(grep 0) | **ABSENT** |
| Regulatory Mapping·Regional Validation | 없음(grep 0) | **ABSENT** |

**현행 컴플라이언스는 100% 로컬**이다. `Compliance.php:71-73` posture와 `:95-98` 통제 항목은 자기 도메인 상태만 조회·평가하며, 증거는 `SecurityAudit.php:14-67`(`:56` verify) 해시체인에 로컬로 append-only 기록된다. 도메인 간에 통제 상태·증거·감사를 **공유·상호검증**하는 경로는 grep 0으로 전무하고, regulatory mapping·regional validation도 부재하다.

## 3. 설계 계약 (신설 대상)

- **SharedControls**: 로컬 통제(`Compliance.php:95-98`)를 canonical 통제 카탈로그로 매핑하고 상태를 도메인 간 게시. 미매핑 통제=공유 제외(fail-closed).
- **SharedEvidence**: `SecurityAudit.php:14-67` 해시체인을 상대 도메인이 `:56` verify로 무결성 검증 가능하도록 서명·게시. 검증 실패=증거 불인정.
- **SharedAudit**: 감사 추적 상호 조회는 읽기 전용·인증 경로 한정. 원본 불변(해시체인 append-only 유지).
- **RegulatoryMapping**: 도메인별 규제 프레임워크 → canonical 통제 매핑 테이블.
- **RegionalValidation**: 지역별 요건(데이터 주권 등) 미충족=federation 거부. posture(`Compliance.php:71-73`)를 입력으로 승격.
- **스키마**: 공유 통제/증거 메타는 `Db.php:942-955`,`:961-973` 자가치유 패턴 재사용.

## 4. KEEP_SEPARATE

- **로컬 컴플라이언스/증거**: `Compliance.php:71-73`,`:95-98`·`SecurityAudit.php:14-67`는 단일 도메인 posture·증거 — federation이 대체하지 않고 게시·검증 대상으로 확장한다.
- **데이터 export**: `DataExport.php:131-156`는 데이터 반출 경로이지 컴플라이언스 증거 공유 아님. 별도.
- **커머스 동기화**: `ChannelSync.php:378-479`는 채널 동기화로 별도.

## 5. 판정

**ABSENT** — 도메인 간 통제/증거/감사 공유·regulatory mapping·regional validation grep 0. 현행 컴플라이언스는 전부 로컬 posture(`Compliance.php:71-73`,`:95-98`)와 로컬 해시체인 증거(`SecurityAudit.php:14-67`). 순신설 대상. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행 federation contract·trust anchor 부재). 실 구현은 별도 승인 세션.
