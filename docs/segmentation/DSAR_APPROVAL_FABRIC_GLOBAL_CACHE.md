# DSAR — Approval Global Cache (Part 3-16 §12)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_16_UNIFIED_AUTHORIZATION_FABRIC_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FABRIC_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FABRIC_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FABRIC_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의(SPEC)

**APPROVAL_GLOBAL_CACHE**는 인가 결정(authz decision)을 계층적으로 캐시하되 **version-aware**하게(정책 version 변경 시 즉시 무효화) 운영하는 계약이다.

| 캐시 계층 | 계약 요지 |
|-----------|-----------|
| Local Cache | PEP/PDP 프로세스 내 결정 캐시. |
| Distributed Cache | 노드간 공유 결정 캐시(예: Redis류). |
| Edge Cache | 접점(edge)에서의 사전 결정 캐시. |
| Regional Cache | 지역별 결정 캐시(지연/주권 대응). |
| Version-Aware Invalidation | 정책 version 전환 시 전 계층 원자적 무효화. |

라이브 authz에는 **인가 결정 캐시가 전무**하다. PDP(`backend/src/Handlers/TeamPermissions.php:695-701`)는 매 요청 결정을 재계산하며, 미들웨어 PEP(`backend/public/index.php:69-622`)도 결정을 캐시하지 않는다. 따라서 무효화 계약이 걸릴 대상 자체가 없다.

## 2. 실존 substrate 매핑

| 캐시 계층 | 상태 | 근거(허용목록) |
|-----------|------|----------------|
| Local (authz decision) | ABSENT | PDP 매요청 재계산(`TeamPermissions.php:695-701`) |
| Distributed | ABSENT | 노드간 결정 캐시 grep 0 |
| Edge | ABSENT | 접점 결정 캐시 없음 |
| Regional | ABSENT | 지역 결정 캐시 없음 |
| Version-Aware Invalidation | ABSENT | 무효화 대상 캐시 부재 |

**서술** — authz 결정은 매 요청 `TeamPermissions.php:695-701`에서 즉석 계산되고, PEP 미들웨어(`index.php:69-622`)는 인증/격리 판정을 요청 수명주기 안에서만 유지한다. 어떤 계층에도 재사용 가능한 authz decision 캐시가 없다.

## 3. 설계 계약(규칙)

- **R-12.1** 모든 캐시 엔트리는 정책 version(§5 Versioned Distribution)과 결속되며 version 전환 시 무효화된다.
- **R-12.2** 결정 캐시는 **deny를 넓히는 방향으로만** stale을 허용(fail-closed): stale 시 재계산이 기본, 캐시 miss가 허용 확대로 이어지지 않는다.
- **R-12.3** 캐시 계층 신설은 PDP(`TeamPermissions.php:695-701`)의 결정 함수를 **원천 그대로 두고 앞단에 삽입**한다(결정 로직 대체 금지).
- **R-12.4** 무효화 이벤트는 `SecurityAudit`(`backend/src/SecurityAudit.php:35-40`) 관측 채널에 남긴다.

## 4. KEEP_SEPARATE

- **`AttributionEngine.php:1754-1791`**(attribution_model_cache): 마케팅 기여도 계산 결과 캐시다 — authz Decision Cache가 **아님**. Local/Distributed Cache PRESENT 근거로 흡수 금지.
- **API rate-limit 카운터**: 속도 제한 상태이지 인가 결정 캐시 아님 — version-aware invalidation 대상 아님.

## 5. 판정

**NOT_CERTIFIED · BLOCKED_PREREQUISITE.** APPROVAL_GLOBAL_CACHE 전 계층 ABSENT(인가 결정 캐시 전무). `AttributionEngine.php:1754-1791` 계산캐시·api rate-limit은 authz Decision Cache 아님(KEEP_SEPARATE). 정책 version substrate(§5) 부재로 version-aware 무효화 불가 — 순신설 대상.
