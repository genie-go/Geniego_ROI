# DSAR — Hierarchy Selection 기본 우선순위 (§51)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §51 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 계층 선택 우선순위 | **grep 0** — 선택할 계층이 없으므로 우선순위도 없다 | `CONTRACT_ONLY` |
| Approval Hierarchy | `grep 0`(5-3-2 §12 실측 — 승인 노드 30종 전부 부재) | `ABSENT` |
| Platform Template 최근접 | `TeamPermissions::ORG_PRESET`(`:706-722`) 15단위 + `seedOrg`(`:725-753`) 동명 skip 멱등·트랜잭션·감사(`:747`) · 배선 REAL(`routes.php:1589`·`:2570` `$register` · `teamApi.js:261`) | `PARTIAL`(템플릿이되 Hierarchy 아님) |
| Tenant Default | 테넌트 개념 존재 · **테넌트별 기본 계층 없음** | `NAME_ONLY` |
| 우선순위 폴백(Manual Review/Block) | 승인 라우팅 부재 → 폴백 대상 없음 | `ABSENT` |
| 유사 우선순위 해소 선례 | `pathToMenuKey`(`planMenuPolicy.js:288-298`) = **정확 매칭 → 최장 prefix → null** 2단 폴백 | `KEEP_SEPARATE_WITH_REASON`(라우트 도메인) |

**★축 주의 — 우선순위 표는 "여러 계층이 공존할 때" 만 의미를 갖는다.** 현행은 계층이 **0종**이므로 13단계 전부 실행 불가다. 🔴 `ORG_PRESET` 이 15단위를 시드한다는 사실을 "Platform Template Hierarchy 존재"로 계산하면 **역산** — 시드 결과가 **평면 `team` 행 15개**이지 계층이 아니다(`team` DDL `:145-151` **`parent_team_id` 없음**).

## 1. 원문 전사 + 판정 — **원문 13종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Explicit Approval Hierarchy Binding | 부재 — Approval Hierarchy·Binding 양쪽 **grep 0** | `ABSENT` |
| 2 | Resource-specific Organization Hierarchy | 부재 — Resource 축·조직 계층 양쪽 부재 | `ABSENT` |
| 3 | Legal Entity Approval Hierarchy | 부재 — 법인 엔티티 없음(`biz_no`/`corp_reg`/`tax_id` **0건** · 사업자정보는 `app_user` 평문 필드 `UserAuth.php:499`) | `ABSENT` |
| 4 | Business Unit Approval Hierarchy | 부재 — ★`business_unit` **유일 히트 = Trustpilot 리뷰 API 자격증명 `business_unit_id`**(`ChannelSync.php:2573-2580`·`ChannelRegistry.php:126`) **무관** | `ABSENT` |
| 5 | Department Approval Hierarchy | 부재 — `department`/`division` **grep 0**. 인접 = `TEAM_TYPES` 17종(`TeamPermissions.php:44-49`) **평면 문자열 카탈로그** | `LEGACY_ADAPTER` |
| 6 | Cost Center Approval Hierarchy | 부재 — `cost_center` **grep 0** | `ABSENT` |
| 7 | Profit Center Approval Hierarchy | 부재 — `profit_center` **grep 0**. ★`po_*` 는 **Price Optimization**(`PriceOpt.php:38-146`)이지 무관 | `ABSENT` |
| 8 | Program Approval Hierarchy | 부재 — Program 축 없음. 인접 = PM 프로젝트(`pm_*`) — **태스크 의존성 도메인** | `KEEP_SEPARATE_WITH_REASON` |
| 9 | Regional Approval Hierarchy | 부재 — `region` **3축 병존**(`Db.php:681,690` / `Connectors.php:2704-2710` / `Wms.php:129`) · **parent region 컬럼 0** · Country↔Region binding 0 | `ABSENT` |
| 10 | Tenant Default Approval Hierarchy | 테넌트는 존재하나 **기본 계층 없음** · ★테넌트 **마스터 테이블 자체가 없다**(발급 = `'acct_'.$id` 문자열 생성 `UserAuth.php:220-224` · 열거 = `SELECT DISTINCT tenant_id` **19개소**) | `NAME_ONLY` |
| 11 | Platform Template Hierarchy | ★**최근접 실자산** — `ORG_PRESET` 15단위(`:706-722`)를 `seedOrg`(`:725-753`)가 플랫폼 표준으로 일괄 생성 · 각 항목에 `team_type`·기본 `scope`·기본 `perms`. **단 계층은 이름에만** — "마케팅 글로벌팀"↔"마케팅팀" **구조 링크 0** | `PARTIAL` |
| 12 | Manual Review | 부재 — Manual Review 상태·큐 없음 | `ABSENT` |
| 13 | Block | 부재(승인 도메인). 인접 = fail-closed 차단 선례 실재(`index.php:585` strict · `AgencyPortal::resolveAccessContext:414-432` 매 요청 재검증 → 403) | `LEGACY_ADAPTER` |

**실측 개수: 13 / 13 전사.** 원문에 **필수필드 축 없음**(§51 은 우선순위 목록 + 충돌 규칙 1건으로 구성) → 필드 표 없음. 커버리지 = 부재 8 · `NAME_ONLY` 1 · `PARTIAL` 1 · `LEGACY_ADAPTER` 2 · `KEEP_SEPARATE_WITH_REASON` 1 · **`VALIDATED_LEGACY` 0**.

## 2. 규칙

- ★**원문 마지막 문장이 규칙이다**(:2108): **"동일 우선순위에서 여러 Active Hierarchy가 충돌하면 임의 선택하지 마라."** → 충돌은 **`MANUAL_REVIEW`(#12) 또는 `BLOCK`(#13)** 으로 폴백해야 하며 **`LIMIT 1`·`ORDER BY ... DESC LIMIT 1` 로 조용히 하나 고르는 구현은 금지**다.
  🔴 **레포에 정확히 그 안티패턴이 실재한다** — `kr_fee_rule` 읽기가 전부 `ORDER BY effective_from DESC LIMIT 1` **최신승**(`Pnl.php:454`·`KrChannel.php:102`·`:151`·`:459`)으로 **충돌을 조용히 해소**한다. **이 패턴을 계층 선택에 복제하지 마라.**
- 🔴 **`ORG_PRESET`(#11)을 우선순위 해소의 근거로 쓰지 마라.** 15단위는 **동명 skip 멱등**(`seedOrg:725-753`)이라 **중복은 막지만 충돌은 판정하지 않는다** — 같은 이름이면 건너뛸 뿐 "어느 쪽이 Active 인가"를 묻지 않는다.
- 🔴 **`X-Act-As-Tenant`(`UserAuth::authedTenant:397-400`)를 Tenant Default(#10) 해소 경로로 쓰지 마라.** admin **AND** 헤더값이 **정확히 `'platform_growth'`** 일 때만 동작하는 **하드코딩 스위치**다 — 계층도 위임도 아니며 **임의 테넌트 임퍼소네이트는 구조적으로 불가**(286차 사고 수정 결과).
- 🔴 **`agency_client_link`(`AgencyPortal.php:64-72`)를 우선순위 #1(Explicit Binding) 근거로 쓰지 마라 = 역산.** ⓐ **이분(bipartite)** — `agency_account`(`:56-63`)는 테넌트가 아니라 **별도 인증 realm** ⓑ **N:M · 1홉 전용**(순회·이행성·깊이 0) ⓒ 조직↔조직 엣지 아님 ⓓ **동의 기반 접근 허가**이지 소유·포함 관계 아님.
- **폴백 2단 선례는 `pathToMenuKey`(`planMenuPolicy.js:288-298`)를 참조하라** — 정확 매칭 우선 → 최장 prefix → **미등록은 null**. 단 도메인이 라우트→메뉴키이므로 **구조만 차용·코드 재사용 금지**(`KEEP_SEPARATE_WITH_REASON`).
- **#12/#13 은 폴백이 아니라 안전장치다.** 헌법 Vol3(Fail-closed) 정합 — **Unknown ≠ Eligible**. 우선순위 1~11 이 전부 미해소면 **자동 승인 경로를 만들지 말고 `MANUAL_REVIEW`→`BLOCK`** 으로 떨어뜨려라(§54 "Placeholder Root 를 자동 승인 경로로 사용 금지"와 짝).
- **#11 채택 시 `ORG_PRESET` 확장 강제 — 두 번째 프리셋 엔진 신설 금지**(헌법: Replace 가 아니라 Extend). 계층화는 `team` 에 **부모 링크를 추가하는 확장**이지 신규 조직 테이블 병설이 아니다.
- 🔴 **13단계 "있다고 가정"하고 배선 금지.**
