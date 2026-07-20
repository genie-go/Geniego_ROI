# DSAR — Authorization Universal Governance Mesh Error Contract (Part 3-24 §27)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_24_UNIVERSAL_GOVERNANCE_MESH_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_GOVERNANCE_MESH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_MESH_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_MESH_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)

Error Contract(§27)는 메시 연산이 **복구 불가한 실패**에 도달했을 때 반환하는 표준 에러코드 7종의 계약이다: MESH_NODE_UNAVAILABLE(노드 도달 불가), POLICY_DISTRIBUTION_FAILED(정책 분배 실패), CONSENSUS_FAILURE(합의 실패·정족수 미달), REGION_SYNC_FAILED(리전 동기화 실패), FEDERATION_GATEWAY_ERROR(연합 게이트웨이 오류), ROUTE_RESOLUTION_FAILED(경로 해석 실패), TOPOLOGY_INCONSISTENT(위상 불일치). 각 에러는 fail-closed 의미론을 가지며(에러=인가 거부, 성공 fallback 금지), append-only 감사에 사유와 함께 기록되고, tenant scope로 격리된 상관관계 ID를 수반한다.

## 2. Substrate 매핑

| 에러코드 | 실재 substrate(baseline) | 인용 | 판정 |
|---|---|---|---|
| CONSENSUS_FAILURE | maker-checker 정족수/승인 게이트 | `Mapping.php:287` | 근접·에러코드부재 |
| ROUTE_RESOLUTION_FAILED | 라우트 등록 매핑(해석 실패원) | `routes.php:759-764` | 근접·에러코드부재 |
| POLICY_DISTRIBUTION_FAILED | 감사 verify 실패 신호 | `SecurityAudit.php:63-64` | 인접·에러코드부재 |
| NODE_UNAVAILABLE / REGION_SYNC / FEDERATION / TOPOLOGY | (해당 substrate 없음) | — | ABSENT-greenfield |

7종 에러코드의 **발생원(메시 노드·정책 분배·리전 sync·연합 게이트웨이·위상 검증) 자체가 부재** — grep 0.

## 3. 설계 계약

- **에러 표면**: 메시 제어평면 API가 반환하는 표준 에러 봉투(코드·사유·상관ID·tenant). 기존 라우트 계약(`routes.php:759-764`) 위에 신규 에러코드를 얹되 기존 에러 의미 무후퇴. 신규 실배선은 `/api` 접두·`$register` 배선.
- **fail-closed 매핑**: 7종 모두 인가 거부로 귀결. MESH_NODE_UNAVAILABLE/REGION_SYNC_FAILED/FEDERATION_GATEWAY_ERROR = 하류 미도달→거부(성공 위장 금지). CONSENSUS_FAILURE = 정족수 미달(`Mapping.php:287` 게이트 의미 계승). ROUTE_RESOLUTION_FAILED = 경로 미해석(`routes.php:759-764`). TOPOLOGY_INCONSISTENT = 위상 무결성 위반.
- **감사**: 모든 에러를 append-only 감사(`SecurityAudit.php:27`)에 기록, 정본 verify(`SecurityAudit.php:63-64`). 물리삭제·장식 체인 금지.
- **격리**: 상관ID·에러 컨텍스트 tenant scope. 교차 테넌트 에러 상태 노출 금지.

## 4. KEEP_SEPARATE

마케팅 채널 동기화(`ChannelSync.php:12`)의 sync 실패는 커머스 아웃바운드 에러로 REGION_SYNC_FAILED와 무관. 어트리뷰션(`AttributionEngine.php:1560`) 무관. 별도 유지.

## 5. 판정

**ABSENT(7종 에러코드·발생원 부재)** — 순신설. CONSENSUS_FAILURE는 maker-checker 정족수 게이트(`Mapping.php:287`), ROUTE_RESOLUTION_FAILED는 라우트 매핑(`routes.php:759-764`), POLICY_DISTRIBUTION_FAILED는 감사 verify(`SecurityAudit.php:63-64`)가 각각 근접 substrate로 실재하나 **메시 노드·리전 sync·연합 게이트웨이·위상 검증이라는 발생원 자체가 없어 에러코드 7종 모두 신규**다. 죽은 terraform substrate PRESENT 금지(greenfield). BLOCKED_PREREQUISITE(메시 제어평면 부재). 코드 변경 0.
