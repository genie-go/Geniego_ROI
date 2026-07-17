# DSAR — Workspace Role (§17)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 계약
workspace id·role·**inherited tenant role**·local scope·exclusions·environment·valid from/to·evidence.

**예시 분리**: Marketing Workspace(Program 조회·Campaign 분석) · Finance Workspace(Funding·Liability·Settlement) · Operations Workspace(Claim·Accrual) · Audit Workspace(Read-only Evidence).

## 🔴 실측 — Workspace Registry 부재 (오탐 제거)
`workspace` grep 4히트 전수 검증 결과 **전부 오탐**:
| 히트 | 실체 |
|---|---|
| `WorkspaceState.php` | **`tenant_kv` 키-값 저장소**(279차 감사 E-P1 — localStorage 전용 운영데이터를 서버 영속). **조직 Workspace Registry 아님** |
| `FeedTemplate.php` · `GeniegoKnowledge.php` · `routes.php` | 단어 언급 |

**`workspace` 테이블 없음 · CREATE TABLE/SELECT FROM 히트 0 → Workspace Registry 부재 확정.**

> 이 오탐 검증이 필요한 이유: **1-6에서 grep REAL 히트 4건 중 3건이 오탐**이었다.
> **이름이 같다고 같은 것이 아니다.**

## 분류
**NOT_APPLICABLE → 신설**(Workspace Registry 자체가 선행 필요). **Workspace Role 은 상위 Registry 없이 계약만 성립**.
