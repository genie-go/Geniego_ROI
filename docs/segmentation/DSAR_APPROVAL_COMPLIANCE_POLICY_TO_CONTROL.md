# DSAR — Policy-to-Control Mapping (Part 3-17 §6)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_17_COMPLIANCE_REGULATORY_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_COMPLIANCE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_COMPLIANCE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_COMPLIANCE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC §6 — Policy-to-Control Mapping)

인가·컴플라이언스 **정책**을 감사 가능한 **통제(Control)** 항목에 자동 연결하는 매핑 계층을 규정한다. 입력 정책 유형:
- **Authorization Policy** — RBAC/scope 부여 정책.
- **Runtime Policy** — 요청시점 게이트(PEP)에서 강제되는 정책.
- **Dynamic Policy** — ABAC/조건부 정책.
- **Compliance Rule** — §7 규칙 엔진 산출물.
- **Zero Trust Rule** — 지속 검증·최소권한 규칙.

각 정책은 하나 이상의 통제(`control_id`)에 매핑되며, 통제는 규제 프레임워크 항목으로 역추적된다. 매핑은 coverage 산출과 gap 탐지의 기반이 된다.

## 2. Substrate 매핑

| SPEC 요구 | 현행 substrate | 상태 |
|---|---|---|
| Authorization/Runtime 정책 강제 | PEP `index.php:600-619`(bypass `:59`·auth attr `:600-604`) | 정책 실행부 존재 |
| 정책 결정(PDP) | `TeamPermissions.php:695-701`·`:704-712`·`:715-731` | 결정부 존재 |
| Control 리스트 | `Compliance.php:90-113`(control 나열)·`:99-101`·`:104`·`:105-108` | control 카탈로그 존재 |
| 정책→통제 매핑 계층 | — | **ABSENT(grep 0)** |

## 3. 설계 계약

1. `PolicyControlMap::link(policy_id, control_id[], framework_ref)` — 정책과 통제 다대다 연결 저장.
2. 매핑 소스: 인가 정책(PEP/PDP), §7 Compliance Rule, Zero Trust Rule → 통제 카탈로그(`Compliance.php:90-113` 확장) 키.
3. `coverage(control_id) = mapped_policies_active / control_required` — 각 통제의 정책 커버리지 산출.
4. `unmapped_policy[]`·`uncovered_control[]` = gap 목록. §9 Assessment의 입력.
5. 매핑은 tenant-scoped·불변 버전드(변경은 새 버전, 이전 감사 유지).

## 4. KEEP_SEPARATE

- `DataPlatform.php:282-287` 데이터품질 rule → 통제 매핑 대상 아님(데이터 신뢰검증 도메인).

## 5. 판정

**ABSENT** — 현행 authz 정책은 PEP(`index.php:600-619`)에서 실행, PDP(`TeamPermissions.php:695-701`)에서 결정되나 이를 감사 통제에 연결하는 **매핑 계층이 전무**하다. Control 카탈로그(`Compliance.php:90-113`)는 존재하나 정책과의 링크가 없어 coverage 산출 불가. → **순신설**. 코드 변경 0 · BLOCKED_PREREQUISITE(선행: 통제 카탈로그 안정 ID·§7 규칙 산출물).
