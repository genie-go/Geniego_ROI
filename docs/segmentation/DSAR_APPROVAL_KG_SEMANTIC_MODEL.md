# DSAR — Authorization Semantic Model Engine (Part 3-21 §6)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_21_KNOWLEDGE_GRAPH_SEMANTIC_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_KNOWLEDGE_GRAPH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_KG_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_KG_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §6 — Semantic Model Engine)

`APPROVAL_SEMANTIC_MODEL`은 온톨로지(§5) 위에 얹히는 **의미론 계층(semantic layer)** 으로, 인가 지식을 6개 하위 온톨로지로 구조화한다: **Authorization Ontology**(권한·역할·스코프 의미), **Identity Ontology**(주체·계정·federation identity 의미), **Compliance Ontology**(규제·DSAR·감사 의미), **Policy Ontology**(정책·규칙 의미), **Risk Ontology**(위험·민감도 의미), **Federation Ontology**(외부 IdP·그룹 매핑 의미). 계약 목표는 인가 결정에 **의미론적 추론 가능성(semantic reasoning)** 과 **설명가능성(explainability)** 을 부여하는 것이다.

## 2. Substrate 매핑 — 의미의 원천(암묵 실재)

의미 모델 엔진 자체는 부재하나, 각 하위 온톨로지의 의미는 아래 substrate에 **암묵적으로** 흩어져 실재한다. 의미 모델은 이를 명시화할 뿐 대체하지 않는다.

| 하위 온톨로지 | 현행 의미 substrate | file:line |
|---|---|---|
| Authorization | Action/Scope 어휘·유효권한 산출 | `TeamPermissions.php:39`·`:41`·`:393-421` |
| Identity | 역할 위계·주체 해석 | `UserAuth.php:186-188`·`:175-177` |
| Compliance | append-only 감사 해시체인 앵커 | `SecurityAudit.php:25-31`·`:63-64` |
| Policy | 스코프 상한 포함관계·프리셋 | `TeamPermissions.php:356-373`·`:737-753` |
| Risk | (민감도 의미 미형식화 — SOURCE 부재) | — (일반 서술) |
| Federation | 그룹→역할 매핑 substrate | `EnterpriseAuth.php:70`·`:84`·`:448-462` |

Risk Ontology의 의미 원천은 현행 코드에 형식화된 SOURCE가 없어 file:line 없이 일반 서술한다(민감도·위험 등급은 순신설 필요).

## 3. 설계 계약 (신설 — 코드 0)

- **SemanticModelEngine(개념)**: 6개 하위 온톨로지를 인가 온톨로지(§5) 위에 정의하고, 의미 관계(subsumption·equivalence·conflict)를 표현. 추론 결과는 결정을 **대체하지 않고 설명**한다(현행 결정 경로 무후퇴).
- **Explainability**: 의미 모델은 인가 결정에 근거(evidence)·신뢰도를 부착하는 XAI 계층. 근거 없는 의미 추론 금지(데이터 헌법 V4 준수).
- **무결성 앵커**: 의미 모델 버전·변경은 SecurityAudit append-only 해시체인(`SecurityAudit.php:25-31`·`:63-64`)으로 tamper-evident 기록.
- **판정 앵커**: 순신설. 기존 결정 엔진(effectiveForUser 등)은 SOURCE로 참조만.

## 4. KEEP_SEPARATE (혼입·중복 금지)

- **데이터 lineage**: `DataPlatform.php:313-345`(및 `:281`) — 이는 **데이터 자산 계보(lineage)** 로 마케팅/분석 데이터의 출처 추적이며, 인가 의미 모델과 무관. "semantic" 명명 유사로 흡수 금지.
- **MCMC 주석 semantic 히트**: `Mmm.php:949` — 이 "semantic" 매치는 **MCMC(마르코프 체인) 코드 주석**일 뿐 의미 모델이 아니다. 오탐(false positive)으로 기각·별개 유지.

## 5. 판정

**ABSENT** — Semantic Model Engine은 grep 0(현행 부재). Authorization/Identity/Compliance/Policy/Risk/Federation 6개 하위 온톨로지 모두 미구현. 각 의미는 substrate에 암묵 산재하나(위 §2 표), 형식화된 의미 모델·의미 추론·XAI 계층은 없음. 본 DSAR는 **순신설 설계 명세**(코드 변경 0·NOT_CERTIFIED·BLOCKED_PREREQUISITE). 데이터 lineage(`DataPlatform.php:313-345`)·`Mmm.php:949`(MCMC 주석)는 KEEP_SEPARATE.
