# DSAR — Regulatory Reporting Engine (Part 3-17 §18)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_17_COMPLIANCE_REGULATORY_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_COMPLIANCE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_COMPLIANCE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_COMPLIANCE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC §18 — Regulatory Reporting)

인가 컴플라이언스 상태를 **규제 표준별 리포트**로 생성하는 엔진을 규정한다. raw 감사 이벤트가 아니라, 표준 프레임워크의 통제 항목에 매핑된 증적 리포트이다. 대상 표준:

- **ISO 27001** — 정보보안 통제(A.9 접근통제 등) 매핑.
- **SOC 2** — Trust Services Criteria(Security/Availability 등).
- **PCI DSS** — 결제 데이터 접근·최소권한.
- **SOX** — 재무 관련 접근통제·분리의무(SoD).
- **GDPR** — 처리활동·접근 근거(데이터주체 리포트는 KEEP_SEPARATE).
- **HIPAA** — 보호대상 정보 접근통제.

각 리포트는 `{framework, control_mapping[], evidence_refs[], period, attestation}` 계약을 가지며, 통제 항목별 증적을 집계·서명한다.

## 2. Substrate 매핑

| SPEC 요구 | 현행 substrate | 상태 |
|---|---|---|
| 감사 이벤트 export | `Compliance.php:269-300`(auditExport)·`:212-263`(이벤트 수집) | raw SIEM export(규제 리포트 아님) |
| posture 스코어카드 | `Compliance.php:53-130`·`:90-113`·`:115-120` | 리포트 입력만 |
| 증적 무결성 | `SecurityAudit.php:14-68`·`:56-68`(verify) | 재사용 가능 |
| 표준별 control 매핑(ISO/SOC/PCI/SOX/HIPAA) | — | **ABSENT(grep 0)** |
| 리포트 생성기·attestation | — | **ABSENT** |

## 3. 설계 계약

1. `RegulatoryReportEngine::generate(framework, period) → Report`. framework별 control 매핑 카탈로그는 순신설(현행 부재).
2. 증적 소스는 `Compliance.php:212-263` 이벤트·`:53-130` posture를 소비하되, 표준 통제 항목으로 재매핑(raw export `:269-300`은 SIEM 경로로 유지·리포트와 분리).
3. 각 통제 항목 증적은 `SecurityAudit.php:14-68` append-only 해시체인 검증(`:56-68`)으로 무결성 보증.
4. attestation은 서명·기간 봉인. 표준 카탈로그(ISO/SOC/PCI/SOX/HIPAA)는 버전드·tenant-scoped.

## 4. KEEP_SEPARATE (흡수 금지)

- `Dsar.php`·`GdprConsent.php` — **데이터주체 프라이버시 리포트**(처리내역·동의). 규제 컴플라이언스 리포트와 도메인 분리. GDPR 데이터주체 응답은 여기서 생성하지 않는다.
- `LegalDoc.php` — 법적 문서 관리. 리포트 엔진 아님.

## 5. 판정

**ABSENT** — ISO/SOC/PCI DSS/SOX/GDPR/HIPAA 리포트 생성기 grep 0(PCI/SOX/HIPAA 표준 매핑 부재). 현행 auditExport(`Compliance.php:269-300`·`:212-263`)는 raw SIEM 이벤트 export이지 표준 통제 매핑 규제 리포트가 아니다. posture(`Compliance.php:53-130`)는 스코어카드일 뿐. → **순신설**(표준별 control 매핑 카탈로그+리포트 생성기). 코드 변경 0 · BLOCKED_PREREQUISITE(선행: 표준 통제 카탈로그·증적 매핑 계약 정본화).
