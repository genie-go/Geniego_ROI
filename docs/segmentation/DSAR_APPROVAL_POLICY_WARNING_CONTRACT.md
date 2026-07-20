# DSAR — PDP/PEP Governance: 경고 계약 (Part 3-12 §28)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_12_PDP_PEP_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_PDP_PEP_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_POLICY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_POLICY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §28은 결정을 차단하지 않되(비-fail-closed) 운영 신호로 발신할 5개 경고를 정의한다: **Policy Deprecated**(폐기예정 정책 적용), **Decision Latency High**(결정 지연 상승), **Cache Miss Spike**(캐시 미스 급증), **Runtime Drift**(런타임 드리프트), **Missing Context Attribute**(컨텍스트 속성 결손). 에러(§27·deny)와 달리 경고는 결정을 허용하되 SPEC §17 Analytics·§18 Drift로 관측된다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 경고코드 | 판정 | 재활용/신규 근거 |
|---|---|---|
| Policy Deprecated | **ABSENT** | Policy Registry/Version 부재(GT② §2)로 deprecation 상태값 자체가 그린필드 |
| Decision Latency High | **ABSENT** | authz Decision Analytics ABSENT(GT② §2). 매 호출 DB 재계산(`TeamPermissions.php:202-225`)이라 지연 계측기 없음. SPEC §32 임계는 순신규 |
| Cache Miss Spike | **ABSENT** | Decision Cache 부재(GT② §2)로 miss율 지표 없음 |
| Runtime Drift | **ABSENT** | authz Decision Drift 전무(GT② §2). SecurityAudit 체인(`SecurityAudit.php:12-68`)은 tamper-evidence이지 드리프트 계측 아님 |
| Missing Context Attribute | **PARTIAL** | 컨텍스트 수집(`UserAuth.php:3446-3454` ip/ua·auth_tenant `index.php:608-619`) 존재하나 결손 경고 발신 없음. device/geo/계산 risk는 PDP 미배선(GT① §D `UserAuth.php:4165` risk PARTIAL) |

## 3. 설계 계약 (항목·규칙 — SPEC 근거)

1. **비차단 원칙(§28)**: 5개 경고는 결정을 deny로 뒤집지 않음(에러 §27과 구분). 결정은 진행되며 경고는 Analytics(SPEC §17)·Drift(§18)로 집계.
2. **Policy Deprecated**: PAP 게시/버전(ADR D-3·`TeamPermissions.php:598-692` CRUD 버전화) 신설 후 deprecated 버전 적용 시 경고.
3. **Decision Latency High**: SPEC §32(P95≤15ms) 근접 시 경고. 중앙 PDP 지연 계측 신설.
4. **Cache Miss Spike / Runtime Drift**: Decision Cache(SPEC §14)·Drift Detection(SPEC §18 Policy/Decision/Runtime/Scope Drift) 신설과 결합해 임계 초과 발신.
5. **Missing Context Attribute**: PIP 속성원(`UserAuth.php:256-268`·`3446-3454`)에서 device/geo/risk 결손 시 경고. 결손은 §27 CONTEXT_NOT_AVAILABLE(deny)과 달리 fallback 후 경고. SecurityAudit(`SecurityAudit.php:12-53`) 기록.

## 4. KEEP_SEPARATE (마케팅 policy 흡수금지)

본 경고계약은 **authz 결정 관측** 전용이다. 마케팅/ops의 drift·simulate·cache 신호는 흡수 금지(GT② §5·§C-3): ModelMonitor ML 드리프트(`ModelMonitor.php:220-335`)·PriceOpt simulate(`PriceOpt.php:927`)·AdminGrowth simulate(`AdminGrowth.php:1239`)·attribution_model_cache. 이들은 authz Decision Drift/Cache Miss 경고 대상이 아니다(개명·재해석 금지).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**NOT_CERTIFIED · 코드 변경 0.** Policy Deprecated·Decision Latency High·Cache Miss Spike·Runtime Drift = **ABSENT(순신규)**. Missing Context Attribute = **PARTIAL** — 컨텍스트 수집 substrate(`UserAuth.php:3446-3454`·`index.php:608-619`) 위에 결손 경고 신설. 선행의존: Policy Registry·Decision Cache·Analytics·Drift(ADR D-3) 구축 후 성립(BLOCKED_PREREQUISITE). Part 1~3-11 인증 후 RP-track 실구현.
