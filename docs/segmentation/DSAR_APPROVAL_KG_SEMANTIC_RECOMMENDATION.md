# DSAR — 인가 시맨틱 추천 엔진 APPROVAL_SEMANTIC_RECOMMENDATION (Part 3-21 §16)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_21_KNOWLEDGE_GRAPH_SEMANTIC_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_KNOWLEDGE_GRAPH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_KG_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_KG_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §16)

APPROVAL_SEMANTIC_RECOMMENDATION은 인가 지식그래프의 구조를 분석해 **권한 위생(hygiene) 개선안**을 근거와 함께 제안하는 설계 계약이다. 자동집행이 아니라 관리자 승인정책을 존중하는 **추천(recommendation)**이다. 5개 추천 클래스를 규정한다.

- **Role Merge(역할 병합)**: 유효권한 집합이 사실상 동일한 역할을 병합 제안.
- **Policy Simplification(정책 단순화)**: 중복·포함관계 정책의 축약 제안.
- **Permission Reduction(권한 축소)**: 미사용/과다 권한을 최소권한 원칙에 맞게 축소 제안.
- **Trust Optimization(신뢰 최적화)**: 근거 신뢰도가 낮은 부여를 재검증 대상으로 제안.
- **Compliance Improvement(준법 개선)**: SoD·최소권한 위배 해소안 제안.

모든 추천은 근거(현행 그래프 사실)·기대효과·신뢰도를 표시(Explainable)하며 근거 없는 추천은 금지된다.

## 2. Substrate 매핑 (현행 실코드 → 추천 원천)

| 추천 클래스 | 현행 substrate (실코드) | 관계 |
|---|---|---|
| Role Merge | `TeamPermissions.php:393-421` effectiveForUser | 유효권한 산출값이 병합 비교의 입력. 추천기 아님 |
| Policy Simplification | `TeamPermissions.php:423-429` (정책 구조) | 정책 구조 원천. 축약 제안기 부재 |
| Permission Reduction | `TeamPermissions.php:737-753` ORG_PRESET | 프리셋 기준선. 축소 제안 로직 grep 0 |
| Trust Optimization | (일반) V3 신뢰 게이트 | authz Trust 추천기 파일단위 부재 |
| Compliance Improvement | `SecurityAudit.php:63-64` verify | 무결성 검증만. 개선 추천 아님 |

authz 대상 recommendation 엔진 grep 0. 유효권한/프리셋만 원천으로 존재.

## 3. 설계 계약 (신설 대상)

1. **KG-Recommender**는 `effectiveForUser`(`TeamPermissions.php:393-421`) 유효권한과 `ORG_PRESET`(`:737-753`) 기준선을 읽기전용 입력으로 소비한다.
2. Role Merge 후보는 유효권한 집합 동치성으로만 산출하며 병합 자체는 절대 자동집행하지 않는다(관리자 승인 필수).
3. Permission Reduction은 `ORG_PRESET`(`:737-753`) 기준선 대비 초과분을 후보로 제시하되 무후퇴 검증 후에만 적용 권고.
4. 모든 추천은 `{recommendation, evidencePath[], expectedEffect, confidence}` 형태로 근거를 동반한다(Explainable, 근거 없는 추천 폐기).
5. Compliance Improvement 추천은 `SecurityAudit.php:63-64` verify 결과와 정합하는 위배만 대상으로 한다.

## 4. KEEP_SEPARATE

- **상품 어피니티/추천** `CustomerAI.php:266`·`:299`·`AutoRecommend.php:50`·`:490`·`Decisioning.php:349`·`CRM.php:1280-1285` = 고객·상품 추천(마케팅 도메인). **권한 추천이 아니다.** 코드·데이터·목적 전면 분리, 인가 추천기로 오흡수 금지.

## 5. 판정

**ABSENT** — 인가 대상 시맨틱 추천(Role Merge/Policy Simplification/Permission Reduction/Trust Optimization/Compliance Improvement) 엔진 grep 0. 기존 recommendation 실코드는 전부 상품·고객 추천(`CustomerAI.php:266`·`:299`·`AutoRecommend.php:50`·`:490`·`Decisioning.php:349`·`CRM.php:1280-1285`)으로 KEEP_SEPARATE 대상이며 권한과 무관하다. authz 추천의 입력 원천은 `effectiveForUser`(`TeamPermissions.php:393-421`)·`ORG_PRESET`(`:737-753`)에 존재하나 이를 소비하는 추천 로직은 부재. → **순신설**. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
