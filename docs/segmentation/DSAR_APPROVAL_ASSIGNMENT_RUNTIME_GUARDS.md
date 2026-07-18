# DSAR — Approval Assignment Runtime Guards (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 0. 판정 원리 — "차단할 대상이 실행시점에 있는가"

§60 은 배정 **집행(runtime) 직전에 차단하라**는 런타임 가드 목록이다. §59 static lint(저장 시점)와 달리, 여기서는 **이미 실재하는 런타임 통제(tenant 격리·requirePro 진입게이트·자기승인차단 1경로·해시검증·job 회수)를 재사용**할 수 있는 항목이 갈린다.

| 판정 | 의미 |
|---|---|
| `LEGACY_ADAPTER` | 인접 런타임 통제가 실재하여 **배정 경로에서 확장·연결하면 되는** 가드(재구현 금지) |
| `ABSENT` | 차단 로직이 통째로 없음 · 인접 데이터축만 존재 |
| `NOT_APPLICABLE` | 차단 대상 엔티티(Registry/Version/Queue/Lease/Lock/Subject …) 자체 부재 |

★ **`VALIDATED_LEGACY` 미사용**(cover 0). `LEGACY_ADAPTER` 는 **확장 대상 인접 가드**이지 커버가 아니다. ★ **대부분 미구현이나, tenant 격리·requirePro 진입게이트는 부분 실재**한다.

## 1. 원문 전사 + 판정 (§60 Runtime Guard 차단 목록 — 키트 요약 전사)

§60 원문 차단 목록: Tenant/Version/Policy/Queue/Authority/Delegation/Capacity/Lease/Lock/Amount Band/Currency/Loop/문자열 Assignee 등.

| # | 원문 runtime guard | 현행 대조 (허용목록 file:line) | 판정 |
|---|---|---|---|
| 1 | Tenant Mismatch 차단 | tenant 격리 분산·실재(§GROUND_TRUTH 축4 PARTIAL) — 런타임 격리 가드 존재하나 배정 경로 전용 재검증 부재 | LEGACY_ADAPTER |
| 2 | Assignment Version Inactive 차단 | 불변 버전체인 부재 · 활성/비활성 상태전이 0 | NOT_APPLICABLE |
| 3 | Policy Not Found 차단 | Assignment Policy(§8) 엔티티 0 | NOT_APPLICABLE |
| 4 | Queue Version Inactive 차단 | Queue Version(§23) 0 · 인접 큐 `Catalog.php:75-84`·`Omnichannel.php:405` 버전 없음 | NOT_APPLICABLE |
| 5 | Authority 미검증 차단 | 축2 Authority ABSENT · 승인자=진입게이트(requirePro `Catalog.php:2385`) 통과자이지 자격 검증 아님 | ABSENT |
| 6 | Delegation 미검증 차단 | 위임 정본 ABSENT · `TeamPermissions.php:627-647` ACL 상한(인접상이) | NOT_APPLICABLE |
| 7 | Capacity Exhausted 차단 | Capacity=PARTIAL(`PM/Enterprise.php:371-400` 읽기전용·미환류) → Hard 한도 차단 0 | ABSENT |
| 8 | Lease Expired Decision 차단 | Lease(§42) 엔티티 부재 · 인접 = `catalog_writeback_job` 600s 회수(`Catalog.php:1699-1702`)는 시간기반 job 회수 | LEGACY_ADAPTER(job용) |
| 9 | Stale Lock 차단(Fencing) | 인접 락(`Omnichannel.php:425-448` SKIP LOCKED·`Catalog.php:1721-1731` CAS)에 **Fencing Token 없음** → 오래된 프로세스 덮어쓰기 방지 부재 | ABSENT |
| 10 | Amount Band 초과 차단 | Amount Band(§34) 0 · `Catalog.php:1016` HIGH_VALUE 상수는 boolean 게이트만(`Catalog.php:1103-1105` requires_approval)·한도 차단 아님 | LEGACY_ADAPTER(boolean만) |
| 11 | Currency Mismatch 차단 | currency_scope 0(변환 전용) | NOT_APPLICABLE |
| 12 | Loop(Reassignment/Routing/Fallback) 차단 | 개념 ABSENT → 루프 대상 없음 | NOT_APPLICABLE |
| 13 | 문자열/Email/Role Name Assignee 차단 | Assignee canonical binding 부재 · 현행 `team_role` flat·`parent_user_id`(`UserAuth.php:156-157`) 문자열 파생 | ABSENT |
| 14 | Self-approval 차단 | `Mapping.php:268` 자기승인차단 **1경로만 실재** · catalog/action_request/admin_growth 미방어 | LEGACY_ADAPTER |
| 15 | 중복 Active Assignment/Claim 차단 | 인접 CAS(`Catalog.php:1721-1731`)·SKIP LOCKED(`Omnichannel.php:425-448`)는 단일 job/발송 경합만 · 배정 중복 차단 아님 | LEGACY_ADAPTER(동시성만) |
| 16 | Snapshot Hash Invalid 차단 | 불변 정본 = `SecurityAudit.php:56-68` verify()(재계산+prev 교차) · approval snapshot 미적용 → 확장 대상 | LEGACY_ADAPTER |
| 17 | requirePro/진입 권한 게이트 | **부분 실재** — `catalog_writeback_job` 승인자=임의 requirePro(`Catalog.php:2385`) · 자격 판정 아닌 진입게이트 | LEGACY_ADAPTER |

**전사(키트 요약 17항).** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 8(#1·8·10·14·15·16·17 + #8 job) · `ABSENT` 4(#5·7·9·13) · `NOT_APPLICABLE` 5(#2·3·4·6·11·12).

> 🔴 **커버 0. 대부분 미구현이나 tenant 격리·requirePro 진입게이트는 부분 실재.** `LEGACY_ADAPTER` 8건은 **확장 대상 인접 가드**(tenant 격리·job 회수·자기승인차단 1경로·해시검증·requirePro)이지 "배정 가드가 이미 있다" 가 아니다. 특히 #10(Amount boolean)·#14(1/4 자기승인)·#8(job 한정 회수)은 **부분 방어를 "완전" 으로 오표기 금지**. `NOT_APPLICABLE` 5건은 차단 대상 엔티티가 통째로 부재하다.

## 2. 규칙

- 🔴 **8개 `LEGACY_ADAPTER` 가드는 "재사용", 4개 `ABSENT` 는 "신설", 5개 `NOT_APPLICABLE` 은 "선행 엔티티 후 발동"** — 이 3분류가 §60 착수 순서다. 인접 가드를 새로 짜지 마라(중복 엔진 금지·§66).
- 🔴 **Tenant Mismatch(#1)를 배정 집행 직전 재검증** — tenant 격리는 분산 실재하나(축4) 배정 핸들러 내부에서 X-Tenant 재확인을 강제하라. 요청시점 tenant 해석 오염 선례([[reference_platform_growth_actas_tenant_hijack]]) 재발 방지.
- 🔴 **Self-approval(#14)을 4경로 전체로 승격** — `Mapping.php:268` 방어를 catalog(`Catalog.php:2383-2407`)/action_request/admin_growth(`AdminGrowth.php:1289-1298`)로 확장(현재 1/4). §58 Critical Gap(SoD/CoI 우회) 직접 봉쇄.
- 🔴 **Stale Lock(#9)은 Fencing Token 신설로만** — 현행 `omni_outbox`(`Omnichannel.php:425-448`)·`catalog_writeback_job`(`Catalog.php:1721-1731`)는 fencing 없는 CAS/SKIP LOCKED. Lock(§44)에 fencing token 필수.
- 🔴 **Amount Band 초과(#10)/Lease Expired(#8) 부분방어를 "완전" 으로 오표기 금지** — HIGH_VALUE 상수는 boolean 게이트(`Catalog.php:1103-1105`)만, job 600s 회수(`Catalog.php:1699-1702`)는 job 한정이다. 실 ceiling 차단·Lease 만료 Decision 차단은 Amount Band(§34)·Lease(§42) 신설 후에야 정직하다.
- 🔴 **Snapshot Hash(#16)는 `SecurityAudit::verify()` 확장** — 새 해시엔진 금지. `menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]).
- 🔴 **본 문서는 정책 명세** — §60 원문은 키트에 요약 전사되어 있으며, 실 구현 시 원문 스펙의 전체 guard 목록을 재확인해 누락 없이 켜라.

관련: [[DSAR_APPROVAL_ASSIGNMENT_CRITICAL_GAP_POLICY]] · [[DSAR_APPROVAL_ASSIGNMENT_STATIC_LINT]] · [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
