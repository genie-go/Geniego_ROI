# DSAR — PDP/PEP Governance: 런타임 결정 캐시 (APPROVAL_POLICY_CACHE)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_12_PDP_PEP_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_PDP_PEP_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_POLICY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_POLICY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

**Runtime Decision Cache**(SPEC §14): PDP 결정을 재사용하기 위한 캐시. 키 구성요소 — Subject · Resource · Action · Context Hash · Decision · TTL · Version(7요소). 상위 흐름(SPEC §0)에서 PDP와 PEP 사이에 위치(`PDP → Decision Cache → PEP`). **Cache Invalidation**(SPEC §15): 캐시 무효화 트리거 — Policy 변경 · Assignment 변경 · Session 종료 · Context 변경 · Risk 변경(5종). 파이프라인 12단계 Cache Update(§8)가 캐시에 기록하고, 캐시 적중은 성능 요구(SPEC §32 Cache Hit ≥ 98%)를 만족시킨다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 항목 | 판정 | 근거(파일:라인) |
|---|---|---|
| **Runtime Decision Cache(전체)** | **ABSENT** | subject/resource/action/context-hash→decision 캐시 전무. `TeamPermissions.php:202-225` **매 호출 DB 재계산**(GT② §2 · GT① §D subjectPerms/subjectScope) |
| Context Hash 원천 | PARTIAL | Runtime Context 수집만 존재(`UserAuth.php:3446-3454`·`:4243-4250`·`:4232-4240`) — 해시화·캐시키 미배선 |
| TTL / Version | ABSENT | 결정 TTL·정책 버전 태깅 부재(Policy Version 자체 ABSENT·GT② §2) |
| Cache Invalidation(5 트리거) | ABSENT | 무효화 트리거 부재 — 캐시 부재의 필연. Session 종료 훅(`UserAuth.php` 세션메타)만 인접 |
| Decision Cache Corruption/Poisoning 방지 | ABSENT | Runtime Guard(Cache Poisoning 차단·SPEC §25) 부재(GT② §2) |

## 3. 설계 계약 (항목·규칙 — SPEC 근거·고정순서/TTL/테넌트격리)

- **C-1 캐시키 7요소**: 캐시 엔트리 키 = Subject · Resource · Action · Context Hash + 값(Decision · TTL · Version)(SPEC §14). Context Hash는 SPEC §13 Runtime Context(device/browser/MFA/geo/risk/session/env)를 정규화·해시.
- **C-2 순신규**: Decision Cache는 순신규(ADR D-3) — 현행 매 요청 DB 재계산(`TeamPermissions.php:202-225`)을 대체하지 않고 **그 위에** 캐시 계층 추가(Extend). 캐시 미스 시 파이프라인(§8) 전 단계 실행 후 12단계 Cache Update로 적재.
- **C-3 무효화(fail-safe)**: 5 트리거(SPEC §15) 발생 시 즉시 무효화. Assignment/Policy 변경은 PAP(`TeamPermissions.php:598-692`) CRUD 경로에 훅. 무효화 실패 시 캐시 미스로 강등(fail-closed·재계산).
- **C-4 TTL·버전 태깅**: 각 엔트리에 TTL·Policy Version 부착. Policy Version 변경 시 구버전 엔트리 무효(SPEC §15 Policy 변경).
- **C-5 테넌트 격리**: 캐시키에 tenant 포함. X-Tenant-Id(`index.php:619`) 경계 교차 재사용 금지(ADR D-7·Cache Poisoning 방지). Immutable Snapshot·Cache는 SecurityAudit 해시체인(`SecurityAudit.php:12-53`) 기반 무결성(ADR D-5).

## 4. KEEP_SEPARATE (마케팅 policy 흡수금지)

authz Decision Cache는 **마케팅 캐시와 분리**. `attribution_model_cache`(마케팅 캐시)는 authz PDP Decision Cache 아님(GT② §5 C-4). 비-authz reconcil/drift/simulate 캐시류(`ModelMonitor.php:220-335` drift·`PriceOpt.php:927` simulate·`AdminGrowth.php:1239`·`PgSettlement`(`routes.php:655`)·`Connectors.php:902`·`Wms.php:2160`·`KrChannel.php:419` recon)도 흡수 금지. authz 결정 캐시와 코드·데이터 공유 없음.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정 = ABSENT(Runtime Decision Cache 전체·TTL/Version·Invalidation·Poisoning 방지).** 현행은 캐시 없이 매 요청 DB 재계산(`TeamPermissions.php:202-225`) — 성능 요구(§32 Cache Hit ≥ 98%) 미달 상태. 순신규(그린필드·ADR D-3).
- **재활용(Extend·흡수 아님)**: Context 수집(`UserAuth.php:4232-4250`) → Context Hash 원천, PAP CRUD(`:598-692`) → 무효화 훅점, SecurityAudit(`:12-53`) → 캐시/스냅샷 무결성, X-Tenant-Id(`index.php:619`) → 테넌트 격리.
- **선행의존**: Decision Cache는 중앙 PDP(ADR D-1)·Decision Pipeline 12단계(§8)·Policy Version(선행 신설) 존재 후에만 의미. Part 1~3-11 인증 후 실 구현(BLOCKED_PREREQUISITE). 코드 변경 0 · NOT_CERTIFIED.
