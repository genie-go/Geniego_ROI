# DSAR — Compliance Rule Engine (Part 3-17 §7)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_17_COMPLIANCE_REGULATORY_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_COMPLIANCE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_COMPLIANCE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_COMPLIANCE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC §7 — Compliance Rule Engine)

승인·인가 의사결정에 적용되는 **컴플라이언스 규칙**을 유형별로 평가하는 엔진을 규정한다. 규칙 유형:
- **Mandatory Rule** — 위반 시 인가 거부(fail-closed). 예: 규제상 분리의무(SoD), 최소권한 상한.
- **Optional Rule** — 위반 시 경고·승인 상향(escalation)이나 거부는 아님.
- **Advisory Rule** — 정보성 권고. 감사 증적에만 기록.
- **Industry Rule** — 업종 표준(PCI-DSS/ISO 27001 등) 파생 규칙.
- **Regional Rule** — 관할 규제(GDPR/PIPA 등) 파생 규칙.

각 규칙은 `{id, type, severity, condition, effect, evidence_ref}` 계약을 가지며, 인가 평가 파이프라인에 hook되어 결과(PASS/WARN/BLOCK)와 근거를 반환한다.

## 2. Substrate 매핑

| SPEC 요구 | 현행 substrate | 상태 |
|---|---|---|
| Compliance posture 스코어 | `Compliance.php:53-130`(posture)·`:90-113`(control 리스트)·`:115-120`(3버킷) | EXTEND 대상(평가엔진 아님) |
| 규칙 평가 hook | 인가 PEP `index.php:600-619` · PDP `TeamPermissions.php:695-701` | 규칙 hook 지점 부재 |
| 규칙 유형별 effect | — | **ABSENT(grep 0)** |
| 규칙 정의 저장소 | — | **ABSENT** |

## 3. 설계 계약

1. `ComplianceRuleEngine::evaluate(context) → RuleVerdict[]`. context = 인가 요청 스냅샷(actor/role/scope/resource/action/tenant).
2. Mandatory 위반 1건이라도 있으면 종합 verdict = BLOCK, Optional = WARN+escalate, Advisory = LOG.
3. 각 verdict는 `evidence_ref`로 감사 증적(`Compliance.php:143-190` audit 통합 경로)에 연결.
4. 규칙 정의는 tenant-scoped, 버전드. Industry/Regional는 카탈로그로 상속.

## 4. KEEP_SEPARATE (흡수 금지)

- `RuleEngine.php:10-12` — **마케팅 IF-THEN 자동화 룰**. 컴플라이언스 규칙 아님. 병합 시 도메인 오염.
- `DataPlatform.php:282-287`·`:288-291`·`:297-302`·`:305` — **데이터 품질 rule**. 데이터 신뢰검증용이며 인가 컴플라이언스와 무관.

## 5. 판정

**ABSENT** — compliance rule 평가엔진 grep 0. Mandatory/Optional/Advisory/Industry/Regional 유형 구분·인가 hook·effect 종합 로직 전무. `Compliance.php`는 posture 스코어카드일 뿐 규칙 엔진이 아니다. → **순신설**. 코드 변경 0 · BLOCKED_PREREQUISITE(선행: PDP 규칙 hook 지점 정의).
