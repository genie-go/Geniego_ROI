# DSAR — Approval Mesh Trust (Part 3-24 §2·§10)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_24_UNIVERSAL_GOVERNANCE_MESH_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_GOVERNANCE_MESH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_MESH_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_MESH_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC §10 Global Trust Fabric)

`APPROVAL_MESH_TRUST`는 Universal Governance Mesh의 **전역 신뢰 직물(Global Trust Fabric)** 이다. 계약상 역할:

- Mesh를 구성하는 노드·리전·테넌트 사이에 **Global Trust Chain**(상호 인증된 신뢰 앵커)을 수립하여, 한 노드가 발급한 authz 주장(assertion)을 다른 노드가 검증 가능하게 한다.
- **Federation**(테넌트/조직 간 신뢰 위임)과 **Cross-Region Trust**(리전 경계를 넘는 신뢰 전파)를 표준화하여, 로컬 SSO/위임을 전역 신뢰 그래프로 승격한다.
- **Certificate/Identity Trust**: 각 identity가 어느 신뢰 앵커에서 유래했는지, 신뢰 경로(trust path)가 유효·미폐기 상태인지를 판정한다.

즉 Trust Fabric은 "이 authz 주장을 신뢰할 수 있는가, 그 신뢰가 어느 앵커에서 어떤 경로로 전파되었는가"에 대한 전역 판정층이다.

## 2. 실존 substrate 매핑 (PRESENT / PARTIAL / ABSENT)

| 계약 요소 | 라이브 substrate | 판정 | 근거(허용목록) |
|---|---|---|---|
| 테넌트 로컬 신뢰(SSO 세션 확립) | 존재하나 단일테넌트 | **PARTIAL-local** | `EnterpriseAuth.php:43-53`(SSO 인증 확립)·`:57` |
| 조직 간 신뢰 위임(agency→client) | 존재하나 로컬 승인 | **PARTIAL-local** | `AgencyPortal.php:64-71`(위임 approved 재검증)·`:86-89`·`:20` |
| Global Trust Chain(상호 앵커) | 없음 | **ABSENT** | grep 0 — 단일 호스트 모놀리스(`Db.php:63-87`) |
| Cross-Region Trust 전파 | 없음 | **ABSENT** | 복수 리전/노드 물리 대상 부재 |
| Certificate/Identity Trust path 검증 | 없음(폐기경로 없음) | **ABSENT** | 신뢰경로/폐기(revocation) substrate 전무 |

라이브 신뢰는 **단일 테넌트 로컬 범위**에 갇혀 있다. `EnterpriseAuth.php:43-53`은 SSO로 세션 신뢰를 확립하고 `:57`로 그 결과를 소비하지만 테넌트 경계 안이며, `AgencyPortal.php:64-71`의 위임은 매 요청 `approved` 재검증(`:86-89`)으로 fail-closed하되 이는 **한 서버 안의 애플리케이션 레벨 위임**이다. 전역 신뢰 앵커·리전 간 신뢰 전파·인증서 신뢰 경로는 관장할 복수 노드 자체가 없어 존재하지 않는다.

## 3. 설계 계약 (규칙)

- **R1 (전역 앵커 단일성)**: 각 신뢰 주장은 명시된 신뢰 앵커에서 유래해야 하며, 앵커 없는 주장은 신뢰되지 않는다. 로컬 SSO(`EnterpriseAuth.php:43-53`)는 앵커의 **소비 지점**으로 확장하며 병렬 신뢰엔진을 신설하지 않는다.
- **R2 (Fail-closed 위임)**: Federation 위임은 매 판정 시점 재검증되어야 하며, 미지·만료 신뢰는 "허용"으로 승격 금지. 기존 agency 위임 재검증 계약(`AgencyPortal.php:64-71`·`:86-89`)을 전역 위임으로 확장한다.
- **R3 (테넌트 격리)**: Cross-Region/Federation 신뢰라도 테넌트 경계 격리는 유지되며, 공용 스코프는 `__shared__` 명시 표기로만 읽는다.
- **R4 (폐기 우선)**: 신뢰 경로가 폐기되었거나 검증 불가 시 deny-by-default. 신뢰 미확립을 신뢰로 해석하지 않는다.
- **R5 (중복 엔진 금지)**: 신뢰 확립은 기존 SSO(`EnterpriseAuth.php`)·agency 위임(`AgencyPortal.php`) 계약을 확장 대상으로 삼으며, 별도 trust fabric 엔진을 난립시키지 않는다.

## 4. KEEP_SEPARATE

해당 없음. 본 §는 authz 전역 신뢰 계약이며, 마케팅·그래프·저니 도메인의 "trust/score" 명명(예: ML/데이터 신뢰도)과 개념·대상이 다르다. 데이터 Trust Score(V3 신뢰검증)와 혼동 금지 — 그것은 데이터 품질 신뢰이지 authz identity 신뢰가 아니다.

## 5. 판정 (NOT_CERTIFIED)

`APPROVAL_MESH_TRUST`는 **PARTIAL-local** — 테넌트 SSO 신뢰(`EnterpriseAuth.php:43-53`)·agency 위임 신뢰(`AgencyPortal.php:64-71`·`:86-89`)는 실재하나 **모두 단일 호스트·단일 테넌트 로컬 범위**다. Global Trust Chain·Federation·Cross-Region Trust·Certificate/Identity Trust path는 **순신설(greenfield)** 대상이며, 관장할 복수 노드/리전 substrate가 부재하다. 코드 변경 0 · 선행(노드/리전 substrate) 부재로 **BLOCKED_PREREQUISITE · NOT_CERTIFIED**.
