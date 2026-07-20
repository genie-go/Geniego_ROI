# DSAR — Authorization Graph Builder (Part 3-21 §7)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_21_KNOWLEDGE_GRAPH_SEMANTIC_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_KNOWLEDGE_GRAPH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_KG_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_KG_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §7)

Authorization Graph Builder는 인가 도메인의 **Subject/Role/Permission/Scope/Policy/Resource** 노드와 그 사이의 관계(assigned·grants·scoped·delegates·constrains)를 **파생 뷰 그래프**로 구성하는 순수 read-model 빌더다. 계약 표면: RBAC 정적 역할·ABAC 속성조건·ReBAC 관계기반·JIT 한시부여·SoD 상호배제·Zero Trust 매요청 재평가·Federation 외부 identity 흡수·Compliance 근거태깅·AI Governance 설명가능성·**Incremental Update**(전체 재빌드 금지, 델타 반영). 그래프는 결정을 **내리지 않는다** — 결정 정본은 SOURCE 정책 엔진에 남고, 그래프는 가시성·발견·감사·설명을 위한 2차 투영이다.

## 2. Substrate 매핑 표 (SOURCE = SSOT, 그래프 = 파생)

| KG 요소 | SOURCE 기질(정본) | file:line | ingest 성격 |
|---|---|---|---|
| Subject→Permission (grants edge) | acl_permission 부여 레코드 | `TeamPermissions.php:152-159` | 읽기 전용 투영 |
| Effective permission 노드 집합 | effectiveForUser 해석 결과 | `TeamPermissions.php:393-421` | 파생·계산된 뷰 |
| Role preset → Permission 번들 | ORG_PRESET 정의 | `TeamPermissions.php:737-753` | 정적 role edge |
| Subject→Role 위계 (parent chain) | 상위 사용자 참조 | `UserAuth.php:186-188` | 위계 edge |
| Policy/Constraint 노드 | 정책 테이블(생성/조회) | 일반 기술(allowlist 외) | 제약 edge |

## 3. 설계 계약 (Builder 불변식)

- **파생 불변**: 그래프 노드/엣지는 SOURCE 레코드의 read-only 투영이다. 그래프에 쓰기 = SOURCE에 쓰기 아님. 역방향 mutation 경로 금지.
- **Incremental**: 빌더는 SOURCE 변경 이벤트(부여/회수/위계변경) 델타만 반영하며 전체 재빌드는 정합성 복구용 예외 경로로만 허용.
- **근거 태깅**: 모든 엣지는 origin(어느 SOURCE 레코드·어느 file:line 계열 규칙)과 신뢰근거를 보유 → Compliance/AI Governance 설명가능성 계약 충족.
- **Fail-closed**: SOURCE에서 해석 불가·모호한 관계는 엣지를 **생성하지 않는다**(Unknown≠grant). Zero Trust 상 그래프는 결정 권위를 대체하지 않는다.

## 4. KEEP_SEPARATE

마케팅 GraphScore 빌더(`GraphScore.php:187-256`)는 **인가 그래프가 아니다** — 채널/노드 스코어링 도메인. 본 §7 인가 그래프와 노드·엣지 의미·용도가 상이하므로 통합·재사용 금지, 분리 유지.

## 5. 판정

**ABSENT-엔진**: Authorization Graph Builder 실체 없음(GraphBuilder grep 0). 관계·위계·프리셋 기질은 TeamPermissions/UserAuth에 실재하나 **그래프 빌더 자체는 순신설** 대상이다. SOURCE가 SSOT이고 그래프는 파생 뷰 — 기존 정책 엔진을 재구현하지 말 것. NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행: SPEC canonical 확정·SOURCE 이벤트 델타 계약 정의).
