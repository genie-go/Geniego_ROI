# DSAR — 인가 지식그래프 추론 엔진 APPROVAL_GRAPH_REASONING (Part 3-21 §15)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_21_KNOWLEDGE_GRAPH_SEMANTIC_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_KNOWLEDGE_GRAPH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_KG_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_KG_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §15)

APPROVAL_GRAPH_REASONING은 인가 지식그래프(노드=principal·role·scope·resource·approval, 엣지=grants·delegates·caps·requires) 위에서 **추론(inference)**을 수행해 명시되지 않은 인가 사실을 도출하고, 그 도출 근거를 **설명가능한 경로(explainable authorization path)**로 제시하는 설계 계약이다. 5개 추론 클래스를 규정한다.

- **Transitive Inference(전이추론)**: A가 B를 위임하고 B가 C를 포함하면 A→C 인가를 도출. 원천 진실은 집합 포함(superset) 관계.
- **Constraint Inference(제약추론)**: scope 상한(cap)을 넘는 도출을 차단하는 단조 축소.
- **Trust Inference(신뢰추론)**: 근거 데이터 Trust/Confidence가 임계 미달이면 도출을 BLOCKED 처리(V3 신뢰헌법 정합).
- **Policy Inference(정책추론)**: 정책 규칙 그래프를 따라 허용/거부 결론과 그 규칙 경로를 도출.
- **Compliance Inference(준법추론)**: 도출 결과가 SoD·최소권한 위배인지 판정하고 위배 경로를 반환.

모든 도출은 반드시 **근거 경로 + 신뢰도**를 동반하며, 근거 없는 결론은 금지(Explainable Authorization).

## 2. Substrate 매핑 (현행 실코드 → 추론 원천)

| 추론 클래스 | 현행 substrate (실코드) | 관계 |
|---|---|---|
| Transitive Inference | `TeamPermissions.php:194-198` clampActions(manage superset 집합포함) | 전이추론의 원자 진실 = manage⊇write⊇read 집합포함. 그래프 추론 아님 |
| Constraint Inference | `TeamPermissions.php:356-373` scopeWithinCap(상한 단조축소) | cap 초과 차단의 원천. 다단 추론기 아님 |
| Trust Inference | (일반) V3 신뢰검증 게이트 | 파일단위 authz Trust Inference 엔진 grep 0 → 파일명 인용 없음 |
| Policy Inference | (일반) 정책 평가 서술부 | 그래프 규칙 추론기 부재 |
| Compliance Inference | `SecurityAudit.php:63-64` verify(무결성 검증) | append-only 검증만. SoD 추론 아님 |
| AI infra | `ClaudeAI.php:70` LLM 챗봇 | 자연어 응답 인프라. graph reasoning 아님 |
| inference(마케팅) | `Mmm.php:949` MCMC | 마케팅 믹스 베이지안 추론. authz와 무관 |

## 3. 설계 계약 (신설 대상)

1. **KG-Reasoner** 서비스는 위 substrate를 **읽기전용 진실원**으로 소비하되, 추론 결과를 절대 substrate에 역기입하지 않는다(무후퇴·비파괴).
2. 모든 도출 사실(inferred fact)은 `{fact, path[], trustScore, ruleId}` 튜플로 반환하며 path 없는 fact는 폐기한다.
3. Transitive 도출은 `clampActions`(`TeamPermissions.php:194-198`)·`scopeWithinCap`(`:356-373`) 의미론과 **일치해야** 하고 이를 초과하는 도출은 Constraint Inference가 무효화한다.
4. explainable 근거 경로는 `SecurityAudit.php:25-31` 이벤트 스키마와 호환되는 감사 로그로 남긴다.
5. Trust 미달 도출은 자동화/AI 집행에서 제외(BLOCKED).

## 4. KEEP_SEPARATE

- **마케팅 MCMC 추론** `Mmm.php:949` = 베이지안 미디어믹스. authz 추론과 코드·목적·데이터 전면 분리. 통합 금지.
- **LLM 챗봇 인프라** `ClaudeAI.php:70` = 자연어 대화. 근거 경로 도출기가 아니며 reasoning 엔진으로 오흡수 금지.

## 5. 판정

**ABSENT** — 인가 그래프 추론(Transitive/Constraint/Trust/Policy/Compliance Inference) 전용 엔진 grep 0. "inference" 실코드는 `Mmm.php:949` 마케팅 MCMC뿐이며 authz와 무관. 전이추론의 원천 진실은 `TeamPermissions.php:194-198`(clampActions manage superset)·`:356-373`(scopeWithinCap) 집합포함 관계로 존재하나 이는 단발 판정이지 다단 그래프 추론이 아니다. AI infra는 `ClaudeAI.php:70` LLM 챗봇으로 graph reasoning이 아니다. → **순신설**. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(KG substrate 정본 부재).
