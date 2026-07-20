# DSAR — Approval Mesh Universal Context Exchange (Part 3-24 §2·§11)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_24_UNIVERSAL_GOVERNANCE_MESH_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_GOVERNANCE_MESH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_MESH_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_MESH_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §11 Universal Context Exchange)
`APPROVAL_MESH_CONTEXT`는 노드 간 **인가 판단맥락을 표준 포맷으로 교환**하는 계층이다. 7종 컨텍스트:
- **Identity** — principal·테넌트·역할.
- **Device** — 디바이스 posture.
- **Risk** — 위험 신호·스코어.
- **Compliance** — 규제·잔류·지역.
- **Session** — 세션·MFA 상태.
- **Federation** — 외부 IdP/조직 연합 맥락.
- **AI Context** — AI 판단 근거·신뢰도.

핵심 원칙=**최소 공개(minimal disclosure)**: 각 노드는 결정에 필요한 최소 컨텍스트만 수신.

## 2. Substrate 매핑
| Mesh Context 종류 | 현행 substrate | file:line | 관계 |
|---|---|---|---|
| Identity 주입 | 요청단위 auth attribute | `index.php:116-121` | **확장 대상** — 요청범위 주입을 cross-node 교환으로 |
| tenant/role 확정 | auth_tenant/auth_role 부여 | `index.php:436-437` | Identity context 시드(단일요청 한정) |
| Session/외부 identity | 엔터프라이즈 인증 흡수 | `EnterpriseAuth.php:43-53` | Federation context 후보(외부 IdP 흡수) |
| Federation(대행조직) | 에이전시 act-as 경계 | `AgencyPortal.php:64-71`,`:86-89` | cross-org 맥락 재검증 지점 |
| Compliance/잔류 | 테넌트 경계 파생 | `Db.php:519-527` | Compliance context 소스 |

## 3. 설계 계약
1. **최소 공개** — 각 교환은 결정 필요 최소 필드만. 과다 컨텍스트 전파 금지(PII 비저장 원칙 유지).
2. **Cross-node 무결성** — 교환 컨텍스트는 서명·재생방지 nonce. 위조 컨텍스트 수신 시 deny.
3. **Federation 재검증** — 외부 IdP/에이전시 맥락(`AgencyPortal.php:64-71`,`:86-89`·`EnterpriseAuth.php:43-53`)은 매 요청 approved 재검증 fail-closed(캐시 신뢰 금지).
4. **AI Context 근거** — AI 판단 맥락은 신뢰도/근거 동반(근거없는 컨텍스트 전파 금지, Explainable 원칙).
5. **테넌트 격리** — 컨텍스트 교환은 테넌트 스코프; act-as 헤더로 인한 tenant 하이재킹 방지(요청시점 tenant 해석 명시).

## 4. KEEP_SEPARATE
- **요청단위 attribute 주입(`index.php:116-121`)** = 단일 프로세스 요청범위 컨텍스트이지 cross-node 교환 프로토콜 아님. mesh context는 이를 시드로 **확장**하되 노드간 교환·서명·최소공개 계층은 순신설.

## 5. 판정
**PARTIAL.** 요청단위 컨텍스트 주입(`index.php:116-121`)·tenant/role 확정(`index.php:436-437`)은 존재하나 **단일요청 범위**. cross-node 표준 교환·최소공개·Federation 재검증 mesh는 이를 확장한 **순신설**. NOT_CERTIFIED. 코드 변경 0.
