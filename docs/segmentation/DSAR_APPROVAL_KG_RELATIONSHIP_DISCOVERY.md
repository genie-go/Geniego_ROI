# DSAR — Authorization Relationship Discovery (Part 3-21 §10)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_21_KNOWLEDGE_GRAPH_SEMANTIC_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_KNOWLEDGE_GRAPH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_KG_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_KG_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §10)

Relationship Discovery는 파생 인가 그래프 위에서 **명시되지 않은 관계**를 추론·표면화하는 분석 계약이다. 발견 클래스: **Hidden Role Dependency**(간접 역할 의존)·**Permission Cluster**(공동 부여 군집)·**Trust Chain**(위임·상속 신뢰 사슬)·**Policy Cluster**(정책 상호작용 군집)·**Compliance Relationship**(규정 근거로 묶이는 관계). 발견 결과는 **제안(surfaced insight)**일 뿐 자동 부여·자동 회수 권한이 없다 — 인가 결정 정본은 SOURCE에 남는다.

## 2. Substrate 매핑 표 (발견 입력 = SOURCE 스코프 규칙)

| 발견 클래스 | SOURCE 기질(정본) | file:line | 발견 성격 |
|---|---|---|---|
| Trust Chain / Hidden Dependency | scopeWithinCap 상한 검사 | `TeamPermissions.php:356-373` | 위임 상한 경계 추론 |
| Permission/Policy Cluster | effectiveScope 유효범위 계산 | `TeamPermissions.php:236-265` | 공동 스코프 군집화 |
| Role Dependency 위계 | 상위 사용자 참조 체인 | `UserAuth.php:186-188` | 상속 경로 추적 |

## 3. 설계 계약 (Discovery 불변식)

- **제안 전용**: 발견된 관계는 read-only 인사이트다. Discovery는 SOURCE에 엣지·부여를 **생성하지 않는다**. 승인·집행은 별도 governance 경로(사람 검토)를 거친다.
- **근거 필수**: 모든 발견은 근거(어느 scopeWithinCap/effectiveScope 규칙이 도출 근거인지)를 첨부 → 설명가능성·Compliance 태깅.
- **Fail-safe over-report 금지**: 신뢰근거가 약한 관계는 발견으로 승격하지 않는다(허위 클러스터가 잘못된 SoD 경보·과도부여 제안을 유발하지 않도록).
- **경계 존중**: scopeWithinCap 상한을 넘는 추론은 위반 후보로 **표시**할 뿐 실제 상한을 그래프가 변경하지 않는다.

## 4. KEEP_SEPARATE

마케팅 그래프 스코어링(`GraphScore.php:187-256`)·markov 어트리뷰션(`AttributionEngine.php:19-38`)·journey(`JourneyBuilder.php:131-137`)의 관계·경로 탐색은 인가 Relationship Discovery와 **의미·목적이 상이**하다. 알고리즘 외형(경로/군집 탐색)이 유사해도 인가 도메인 발견과 통합·재사용 금지, 분리 유지.

## 5. 판정

**ABSENT**: Relationship Discovery 실체 없음(discovery grep 0). scopeWithinCap(`TeamPermissions.php:356-373`)·effectiveScope(`TeamPermissions.php:236-265`)는 발견 입력 기질로 실재하나 관계 발견 엔진은 **순신설**이다. 발견=제안·SOURCE=결정권위 계약 하에서만 인증 가능. NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행: §7 Builder·§8 Sync 파생 그래프 확정).
