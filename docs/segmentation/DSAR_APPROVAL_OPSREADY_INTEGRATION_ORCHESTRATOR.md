# DSAR — Enterprise Integration Orchestrator + E2E Validator (Part 3-25 §3·§4)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_25_FINAL_INTEGRATION_OPERATIONAL_READINESS_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OPERATIONAL_READINESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OPSREADY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OPSREADY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC)

Part 3-25 §3·§4는 EPIC 06-A 전 구성요소(Identity / Authz / Authn / Governance / Compliance / Federation / AI Governance / Digital Twin / Knowledge Graph / Observability)를 **하나의 배포 단위로 조립·활성화·검증**하는 최종 통합 계층을 규정한다.

- **§3 Enterprise Integration Orchestrator**: (a) Dependency Resolution — 구성요소 간 선행/후행 의존 그래프 해석, (b) Ordered Activation — 위상정렬된 순서로 무중단 활성화, (c) Component Registry — 활성 구성요소·버전·상태 대장.
- **§4 E2E Validator**: 통합 후 종단 검증 체인 — `Auth → Authz` 흐름, `Policy → PDP → PEP` 결정 전달, `Role → Permission` 해석이 실제 요청 경로에서 일관되게 성립하는지 살아있는 트레이스로 확인.

계약의 핵심 불변식: **오케스트레이터는 구성요소를 대체(Replace)하지 않고 조립(Compose)한다** — 각 구성요소의 자체 권위(테넌트 격리·정책 결정)는 보존되며, 오케스트레이터는 순서·의존·증적만 관장한다.

## 2. Substrate 매핑

| SPEC 요구 | 현존 substrate | file:line | 상태 |
|---|---|---|---|
| 통합 대상 authz(인증 흐름) | EnterpriseAuth SSO(OIDC/SAML/SCIM) | `EnterpriseAuth.php:11-33` | 실재 |
| 통합 후 증적(E2E 검증 evidence) | SecurityAudit append-only 해시체인 | `SecurityAudit.php:25-31` | 실재 |
| Dependency Resolution | — | (grep 0) | ABSENT |
| Ordered Activation | — | (grep 0) | ABSENT |
| Component Registry | — | (grep 0) | ABSENT |
| E2E Validator 체인 | — | (grep 0) | ABSENT |

통합 대상이 될 authz substrate는 실재한다 — `EnterpriseAuth.php:11-33`은 기존 세션/유저 프로비저닝/테넌트 격리 인프라를 재사용하는 SSO 계층으로, 오케스트레이터가 조립할 "구성요소"의 대표 사례다. E2E 검증 결과를 남길 tamper-evident 증적 계층도 `SecurityAudit.php:25-31`(prev_hash→hash_chain 연결)로 실재한다. 그러나 **이들을 의존순서로 해석·활성화·종단검증하는 오케스트레이터 자체는 코드베이스에 존재하지 않는다**(grep 0).

## 3. 설계 계약

- **Dependency Resolution**: 구성요소를 노드로, 선행요구를 방향 간선으로 하는 DAG. 순환 시 활성화 거부(fail-closed). 각 노드는 `{component, version, requires[], provides[]}` 서명을 선언.
- **Ordered Activation**: 위상정렬 결과 순서로만 활성화. 선행 구성요소 health 미달 시 후행 활성화를 차단(BLOCKED_PREREQUISITE 전파).
- **E2E Validator**: 통합 직후 `Auth→Authz` / `Policy→PDP→PEP` / `Role→Permission` 3계약을 합성 요청으로 통과시키고, 각 홉의 결정과 근거를 `SecurityAudit.php:25-31` 체인에 기록. 어느 홉이든 불일치면 활성화를 rollback 상태로 표시.
- **Component Registry**: 활성 구성요소 대장은 신설 — 기존 어느 핸들러도 이 역할을 겸하지 않으므로 순신설이 중복을 만들지 않는다.

## 4. KEEP_SEPARATE

- **커머스 채널 통합**은 별개 도메인이다 — `ChannelSync.php:11-14`(인증키 등록 즉시 상품/주문/재고 수집)와 `Connectors.php:13-15`(TikTok Business / Amazon SP-API 실호출)는 **외부 판매채널 데이터 커넥터**로, EPIC 06-A 거버넌스 구성요소 오케스트레이션과 목적·수명주기가 다르다. 이름에 "integration/connector"가 겹친다는 이유로 흡수 금지 — 별도 유지.

## 5. 판정

**ABSENT** — Enterprise Integration Orchestrator 및 E2E Validator는 코드베이스에 부재(grep 0). 조립 대상 substrate(`EnterpriseAuth.php:11-33`)와 증적 계층(`SecurityAudit.php:25-31`)은 실재하나, 이를 의존해석·순서활성화·종단검증하는 오케스트레이션 계층은 **순신설**이 정당하며 중복을 유발하지 않는다. 커머스 커넥터(`ChannelSync.php:11-14`·`Connectors.php:13-15`)는 KEEP_SEPARATE. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행 foundation 미확정).
