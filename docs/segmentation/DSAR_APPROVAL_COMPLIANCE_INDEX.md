# DSAR — Index 계약 (Part 3-17 §33)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_17_COMPLIANCE_REGULATORY_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_COMPLIANCE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_COMPLIANCE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_COMPLIANCE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC §33)

Compliance 조회 지연을 만족시키기 위해 7종 인덱스가 필요하다:

- **IX-1 Regulation Index** — 규정 카탈로그·버전 lookup.
- **IX-2 Control Index** — 통제 라이브러리·상태 조회.
- **IX-3 Compliance Score Index** — 규정/통제별 점수 집계 조회.
- **IX-4 Assessment Index** — 평가(assessment) 실행 이력 시계열.
- **IX-5 Exception Index** — 면제(exception)·유효기간 조회.
- **IX-6 Snapshot Index** — 시점 스냅샷 버전·발행시각.
- **IX-7 Evidence Index** — 증거 수집 상태·만료 조회.

## 2. 라이브 substrate 매핑

| SPEC 인덱스 | 실 substrate | 상태 |
|---|---|---|
| IX-1 Regulation | (regulation 테이블) | **ABSENT** |
| IX-2 Control | (control 테이블) | **ABSENT** |
| IX-3 Compliance Score | (compliance_score 테이블) | **ABSENT** |
| IX-4 Assessment | (assessment 테이블) | **ABSENT** |
| IX-5 Exception | (exception 테이블) | **ABSENT** |
| IX-6 Snapshot | (snapshot 테이블) | **ABSENT** |
| IX-7 Evidence | SecurityAudit 감사 로그 `SecurityAudit.php:14-33` 는 존재하나 compliance evidence 인덱스 테이블 아님 | ABSENT(전용 테이블 부재) |
| 현 DB 인덱스 | 단일노드 PDO 싱글톤 `Db.php:20-21`·self-healing `ensureTables` `Db.php:308-321`·`:330-358` | 일반 도메인 테이블만 |

compliance/regulation/control_map/assessment/attestation/evidence 테이블·인덱스는 grep 0. 현 DB 는 마이그레이션 정지 이후 handler 자가치유(`Db.php:308-321`·`:330-358`)로만 스키마가 늘어난다.

## 3. 설계 계약(신설 시)

- 7종 인덱스는 §32 의 compliance 테이블(regulation/control/score/assessment/exception/snapshot/evidence)이 **먼저 신설**되어야 정의 가능. 대상 테이블 부재 → 인덱스는 선행 종속(§32 → §33).
- 신규 compliance 인덱스는 현 self-healing 경로(`Db.php:308-321`·`:330-358`)와 동일 방식(handler `ensureTables`)으로 진입해야 하며 별도 인덱스 관리자 신설 금지(중복).
- 인덱스 컬럼 순서는 §34 성능 계약(Assessment≤30초·Score Refresh≤10초)의 조회 패턴에서 역산한다. 성능 목표 미확정 상태에서 컬럼 순서 고정 금지.
- IX-7 Evidence 는 SecurityAudit 해시체인(`SecurityAudit.php:14-33`)을 증거 원천으로 확장할 때 그 조회 축(tenant/action/created_at)을 상속하되, compliance 전용 증거 인덱스는 §32 evidence 테이블 신설 후 대상 발생.

## 4. 판정

**ABSENT.** compliance 테이블·인덱스가 전무하다. 현 DB 는 단일노드 PDO 싱글톤(`Db.php:20-21`)이고 스키마는 self-healing(`Db.php:308-321`·`:330-358`)으로만 관리된다. 7종 인덱스 전부 **순신설**이며 §32 compliance 테이블 신설에 종속(BLOCKED_PREREQUISITE).

NOT_CERTIFIED · 코드 변경 0.
