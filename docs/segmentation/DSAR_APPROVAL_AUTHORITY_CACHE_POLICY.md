# DSAR — Approval Authority Cache 원칙 (§76)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §76(3126~3171) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §7 · 포맷 exemplar: [DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md)
> **측정기 분모**: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md --sec=76` → **38**(불릿 38·번호 0 · Cache Key 23 + 적용원칙 15). 육안 금지.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Authority Resolution Cache | 🔴 **서버 캐시 계층 부재**(ⓑ §7) — Redis/Memcached 소스 0(`composer.json` require 없음·transitive만) → **키를 구성할 Resolution Cache 도, 무효화할 캐시 도 존재하지 않음** | `NOT_APPLICABLE`(무효화 대상 부재) |
| `apcu_*` | `SystemMetrics.php:225-236`(`apcu_cache_info`/`apcu_sma_info`)·`:428-433`(`apcu_fetch`) = **지표 보고 전용** — Authority Resolution 을 캐시하지 않음 | `LEGACY_ADAPTER`(지표 계측 · 캐시 계층 아님) |
| 프론트 localStorage | `MenuVisibilityContext.jsx:28` `ADMIN_TREE_CACHE_KEY='g_admin_menu_tree_cache'`·`:50` get·`:62` set(`{ts, data}`) = **클라이언트 전용 메뉴 트리 캐시**(브라우저별·서버 Authority Resolution 무관) | `KEEP_SEPARATE_WITH_REASON`(클라 전용) |

★**서버 Authority Resolution Cache 가 존재하지 않으므로 Cache Key 23종·적용원칙 15종의 전부가 "구성/무효화할 캐시 없음"으로 `NOT_APPLICABLE` 이다.** 프론트 localStorage 캐시는 Authority Resolution 과 무관한 클라 UI 캐시라 별도 유지(`KEEP_SEPARATE`)이며 아래 38종 어디에도 커버로 계상하지 않는다.

## 1. 원문 전사 + 판정 — **원문 38종**(Cache Key 23 + 적용원칙 15)

### Authority Resolution Cache Key 구성 요소 (23)

원문(3128): *"Authority Resolution Cache Key에는 최소 다음을 포함하라."*

| # | 원문 Key 요소 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | tenant_id | Resolution Cache 부재 → 키 구성 대상 없음(느슨한 `api_key.tenant_id`는 키 아님·ⓑ §7) | `NOT_APPLICABLE` |
| 2 | subject_id | Subject authority binding 부재(ⓑ §3) → 키 요소 없음 | `NOT_APPLICABLE` |
| 3 | role_assignment_version | 🔴 Role Assignment 버전체인 0(version 6컬럼 전부 하드코딩 태그·ⓑ §5) | `NOT_APPLICABLE` |
| 4 | position_incumbency_version | 🔴 Position(직위) 개념 부재(ⓑ §3.1) | `NOT_APPLICABLE` |
| 5 | authority_domain | Authority Domain 축 없음(ⓑ §3) | `NOT_APPLICABLE` |
| 6 | authority_type | Authority Type 축 없음 | `NOT_APPLICABLE` |
| 7 | action | action authority 부여 없음(`acl_permission.approve`=미소비·ⓑ §3) | `NOT_APPLICABLE` |
| 8 | resource_type | resource-scope authority 없음 | `NOT_APPLICABLE` |
| 9 | resource_id | 동상 — 리소스 단위 authority 없음 | `NOT_APPLICABLE` |
| 10 | resource_version | 🔴 리소스 버전 체인 0 | `NOT_APPLICABLE` |
| 11 | organization_id | org authority 부여 없음(`seedOrg`=ACL 시드·ⓑ §3) | `NOT_APPLICABLE` |
| 12 | legal_entity_id | 🔴 Legal Entity 엔티티 0(ⓑ §1) | `NOT_APPLICABLE` |
| 13 | region | 지리 축 존재하나 Authority 스코프 아님(레지스트리 §13) | `NOT_APPLICABLE` |
| 14 | country | 동상 — country_code 는 광고 차원이지 authority 키 아님 | `NOT_APPLICABLE` |
| 15 | original_amount | 🔴 금액축 부재 — `HIGH_VALUE_KRW` 상수만(ⓑ §4) | `NOT_APPLICABLE` |
| 16 | original_currency | 🔴 통화 스코프 0(변환 전용·ⓑ §4) | `NOT_APPLICABLE` |
| 17 | comparison_currency | 동상 — 비교통화 authority 없음 | `NOT_APPLICABLE` |
| 18 | authority_matrix_version_id | 🔴 Matrix·버전 엔티티 0(ⓑ §1) | `NOT_APPLICABLE` |
| 19 | authority_version_id | 🔴 불변 prev-링크 버전체인 선례 0(ⓑ §5) | `NOT_APPLICABLE` |
| 20 | limit_period | 인접 = `AutoCampaign` 기간지출(마케팅)이나 authority 키 아님(ⓑ §4) | `NOT_APPLICABLE` |
| 21 | utilization_version | 🔴 Utilization 버전/스냅샷 0 | `NOT_APPLICABLE` |
| 22 | effective_date | 승인/권한 엔티티 effective dating 0(ⓑ §5) | `NOT_APPLICABLE` |
| 23 | policy_version_set_hash | 🔴 승인 정책 버전셋 해시 개념 0(`SecurityAudit` 해시는 감사로그용·ⓑ §5) | `NOT_APPLICABLE` |

### 적용 원칙 (15)

원문(3154): *"다음을 적용하라."*

| # | 원문 적용 원칙 | 현행 대조 | 판정 |
|---|---|---|---|
| 24 | Version-aware Cache | 캐시 계층 부재 → version-aware 대상 없음 | `NOT_APPLICABLE` |
| 25 | Tenant-isolated Cache | 서버 Resolution Cache 부재(프론트 localStorage 는 클라 전용·§0 KEEP_SEPARATE) | `NOT_APPLICABLE` |
| 26 | Actor-assignment-aware Cache | actor assignment 버전 부재(#3·#4) → aware 대상 없음 | `NOT_APPLICABLE` |
| 27 | Resource-version-aware Cache | resource_version 부재(#10) | `NOT_APPLICABLE` |
| 28 | Amount·Currency-aware Cache | 금액·통화 축 부재(#15~#17) | `NOT_APPLICABLE` |
| 29 | Effective-date-aware Cache | effective dating 부재(#22) | `NOT_APPLICABLE` |
| 30 | Authority Version 활성화 시 Invalidation | 🔴 **무효화할 캐시 없음** — Authority Version 개념·캐시 둘 다 부재 | `NOT_APPLICABLE` |
| 31 | Role·Position 변경 시 Invalidation | 🔴 무효화할 캐시 없음 · Position 개념 부재 | `NOT_APPLICABLE` |
| 32 | Legal Entity 변경 시 Invalidation | 🔴 무효화할 캐시 없음 · Legal Entity 0 | `NOT_APPLICABLE` |
| 33 | Threshold 변경 시 Invalidation | 🔴 무효화할 캐시 없음 · Threshold=`HIGH_VALUE_KRW` 상수(ⓑ §4) | `NOT_APPLICABLE` |
| 34 | FX Reference 변경 시 정책 기반 처리 | 인접 = `Connectors.php:1794-1796` 24h TTL 신선도 가드(ⓑ §4 FLIP)이나 **환율 KV 캐시이지 Authority Resolution Cache 정책 아님** | `LEGACY_ADAPTER` |
| 35 | Utilization 변경 시 Invalidation | 🔴 무효화할 캐시 없음 · Utilization 버전 0 | `NOT_APPLICABLE` |
| 36 | Explicit Deny 추가 시 즉시 Invalidation | 🔴 무효화할 캐시 없음 · explicit deny 표현 0(`acl_permission`=allow-only·ⓑ §3) | `NOT_APPLICABLE` |
| 37 | Critical Drift 시 Cache 차단 | 🔴 차단할 캐시 없음 · Drift 탐지-캐시 연동 0 | `NOT_APPLICABLE` |
| 38 | 과거 Snapshot은 Current Cache로 재생성 금지 | 🔴 Snapshot·Cache 둘 다 부재 → 재생성 위험 자체가 발동 안 함(우연한 준수) | `NOT_APPLICABLE` |

**실측 개수: 38 / 38 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 1(#34) · `NOT_APPLICABLE` 37.

> 🔴 **커버 0.00%.** 서버 Authority Resolution Cache 가 존재하지 않으므로 Cache Key·Invalidation 어느 것도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 1건(#34 FX 24h TTL 가드)은 환율 KV 신선도 정책이지 Authority Cache 정책이 아니다.

## 2. 규칙

- 🔴 **무효화 대상 부재를 우연한 준수(spurious compliance)로 계산 금지** — §76 Invalidation 원칙(#30~#38)이 "위반 0"인 이유는 **무효화할 캐시가 없어서**이지 무효화 정책이 올바르게 구현돼서가 아니다. 커버·준수로 계상하지 마라(우연한 준수).
- 🔴 **프론트 localStorage(`g_admin_menu_tree_cache`)를 Authority Resolution Cache 로 승격하지 마라**(§0 KEEP_SEPARATE) — 브라우저별 클라 UI 캐시는 tenant-격리·version-aware 무효화가 없고 서버 권한 판정의 정본이 될 수 없다. 서버 Resolution Cache 신설 시 이 클라 캐시를 재사용하지 말고 별도 계층으로.
- 🔴 **캐시 신설 시 Cache Key 23종을 부분만 넣지 마라** — `role_assignment_version`·`resource_version`·`policy_version_set_hash` 를 누락하면 §65 "Current Matrix 로 과거 재해석"·"Role 이름 문자열 판정" gap 을 캐시가 구조적으로 재생산한다. 저장계층(버전체인·effective dating·Amount Band)이 캐시보다 선행이다.
- 🔴 **`apcu_*`(SystemMetrics)를 Authority 캐시로 오인하지 마라** — `:225-236`·`:428-433`은 지표 보고 전용이며 Resolution 값을 담지 않는다. 이 계측 코드에 authority 값을 얹어 캐시화하는 우회 금지.
