# DSAR — Regulatory Change Manager (Part 3-17 §12)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_17_COMPLIANCE_REGULATORY_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_COMPLIANCE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_COMPLIANCE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_COMPLIANCE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC §12 — Regulatory Change Manager)

규제 요건의 **변경 자체를 추적·승인·이행**하는 관리자를 규정한다. 규제는 정적이 아니라 개정되므로, 인가 컴플라이언스 규칙도 규제 버전에 종속되어야 한다. 구성요소:

- **Regulation Update** — 신규/개정 규제 요건의 등록.
- **Version Upgrade** — 규제 버전 승격(v→v+1)과 파생 규칙 재계약.
- **Deprecated Rule** — 폐지된 규제에서 파생된 규칙의 은퇴.
- **Effective Date** — 개정의 발효 시각(발효 전/후 이원 적용).
- **Migration Plan** — 구 규칙→신 규칙 전환 계획·승인.

각 변경은 `{id, regulation_ref, from_version, to_version, effective_date, migration_plan, approver, status}` 계약을 가지며, Effective Date 기준으로 인가 평가에 적용되는 규칙셋이 전환된다.

## 2. Substrate 매핑

| SPEC 요구 | 현행 substrate | 상태 |
|---|---|---|
| 변경 승인(maker-checker) | `Mapping.php:238-291`(승인 워크플로)·`:267-269`(self-approval 차단) | 재사용 가능(규제 전용 아님) |
| 변경요청 상태 저장 | `Db.php:592-600`·`:623-636`(mapping_change_request) | 재사용 가능 |
| 변경 증적 append-only | `SecurityAudit.php:14-68`·`:56-68`(verify) | 재사용 가능 |
| Regulation 데이터모델·버전 | — | **ABSENT(grep 0)** |
| Effective Date 이원 적용·Migration Plan | — | **ABSENT** |
| Deprecated Rule 은퇴 사이클 | — | **ABSENT** |

## 3. 설계 계약

1. `RegulatoryChangeManager::register(regulation_ref, to_version, effective_date, migration_plan) → change_id`. 규제 데이터모델은 순신설(현행 substrate에 부재).
2. 변경 승인은 `Mapping.php:238-291` maker-checker 정족수 재사용, self-approval 차단(`:267-269`) 강제.
3. Effective Date 기준 규칙셋 전환 — 발효 전은 구 버전, 발효 후는 신 버전 적용. Deprecated Rule은 발효와 함께 은퇴.
4. 변경 증적은 `SecurityAudit.php:14-68` append-only 해시체인에 연결(`:56-68` verify 정본), 상태는 `Db.php:592-600` 확장 저장.

## 4. KEEP_SEPARATE (흡수 금지)

- `LegalDoc.php`·`GdprConsent.php` — **데이터주체 프라이버시** 법적 문서/동의 버전. 규제 변경 관리와 도메인 분리.
- `DataPlatform.php:297-302` — 데이터 품질 rule 버전. 규제 규칙 버전 아님.

## 5. 판정

**ABSENT** — Regulation Update/Version Upgrade/Deprecated Rule/Effective Date/Migration Plan grep 0. 규제 데이터모델 자체가 부재하여 버전 종속 규칙 전환·발효일 이원 적용·폐지 규칙 은퇴 로직 전무. 승인 substrate(`Mapping.php:238-291`)와 증적(`SecurityAudit.php:14-68`)만 재사용 가능. → **순신설**(규제 데이터모델+변경 사이클). 코드 변경 0 · BLOCKED_PREREQUISITE(선행: 규제→규칙 파생 계약·규칙 평가 hook 정의).
