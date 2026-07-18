# DSAR — Authority Candidate Source Priority (§48)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §48(1986-2004) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §6 · 후보 엔티티: [DSAR_APPROVAL_AUTHORITY_CANDIDATE.md](DSAR_APPROVAL_AUTHORITY_CANDIDATE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Authority Candidate **소스 우선순위** 로직 | 🔴 grep **0** — 후보 도출(§47)이 전무하므로 **복수 소스를 우선순위로 해소하는 로직 자체 부재**(ⓑ §6) | `NOT_APPLICABLE`(선행 후보 없음) |
| 특이성(Specificity)/충돌 해소(§52/§53/§54) | 코드 부재 — "conflict" 60+ 히트는 전부 SQL `ON CONFLICT` upsert 또는 `RuleEngine.php:250` ad_schedule precedence(무관·ⓑ §6) | `NOT_APPLICABLE` |
| §4.8 "임의 최대한도 선택 금지" | **무발동** — 애초에 복수 Authority 가 없어 선택 대상 자체 부재(ⓑ §6) | `NOT_APPLICABLE` |

★**우선순위는 후보 집합(§47)을 전제로 하는 해소 규칙이다.** 후보 도출이 부재하므로 13개 소스 계층은 전량 미적용이며, 아래는 원문 전사(신설 명세)다.

## 1. 원문 전사 + 판정 — **원문 13종**(§48 권장 기본 순서 · 측정기 `--sec=48`=13)

| # | 원문 소스 계층 | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | Explicit Approved Subject Authority | Explicit Approved Subject 개념·우선순위 로직 부재 — 승인 4경로는 진입게이트 통과자 그대로 승인(ⓑ §3) | `NOT_APPLICABLE` |
| 2 | Exact Position Authority | 직급/Position 축 부재 — 다홉 사람계층 walk 0(ⓑ §3) | `NOT_APPLICABLE` |
| 3 | Exact Role + Legal Entity Authority | Role 축 2벌 직교 + Legal Entity 엔티티 0(`biz_no`/`tax_id` grep0·ⓑ §3) — 우선순위 결합 로직 부재 | `NOT_APPLICABLE` |
| 4 | Exact Organization + Role Authority | Organization 엔티티 부재(tenant=느슨 VARCHAR·조직계층 아님·ⓑ §7) | `NOT_APPLICABLE` |
| 5 | Exact Resource Owner Authority | 인접 = owner 판별(`parent_user_id IS NULL`·`ORDER BY`·ⓑ §3) — 소유자 개념은 있으나 Resource Owner Authority 우선순위 아님 | `LEGACY_ADAPTER` |
| 6 | Exact Cost Center·Profit Center Authority | 🔴 `cost_center`/`profit_center` grep **0** — Cost/Profit Center 엔티티 부재 | `ABSENT` |
| 7 | Exact Program Authority | `program_limit`·Program Authority grep 0(ⓑ §1) | `NOT_APPLICABLE` |
| 8 | Legal Entity Functional Authority | Legal Entity 0 · Functional Authority 축 부재 | `NOT_APPLICABLE` |
| 9 | Country·Regional Authority | Authority 지리 스코프 부재 — `Geo`(IP→ISO)·TikTok country_code 는 별개 도메인(§6 registry §0.13) | `NOT_APPLICABLE` |
| 10 | Tenant Default Role Authority | Tenant 마스터 부재(FK0 VARCHAR·`Db.php:944`)·Default Role Authority 매핑 0(ⓑ §7) | `NOT_APPLICABLE` |
| 11 | Platform Standard Authority | 인접 = `admin_growth_approval`(플랫폼 전역 큐·tenant 없음·ⓑ §2)이나 Authority 표준 우선순위 아님 | `NOT_APPLICABLE` |
| 12 | Manual Review | 후보 해소 실패 시 수동검토 라우팅 부재 — 4경로는 애초 후보 도출이 없어 fallback 개념 없음(ⓑ §3) | `NOT_APPLICABLE` |
| 13 | Block | 최종 차단 계층 부재 — explicit-deny>allow(§4.9) 구조 자체 없음(`acl_permission` allow-only·ⓑ §6) | `NOT_APPLICABLE` |

**실측 개수: 13 / 13 전사**(측정기 `--sec=48`=13 · 원문 1988-2002). 커버리지 = **`VALIDATED_LEGACY` 0** · `NOT_APPLICABLE` 11 · `LEGACY_ADAPTER` 1 · `ABSENT` 1 · `KEEP_SEPARATE_WITH_REASON` 0 · `BLOCKED_PREREQUISITE` 0.

> 🔴 **커버 0.00%.** 우선순위는 후보 집합(§47) 위에서만 성립하는데 후보 도출이 부재하므로 전 계층이 `NOT_APPLICABLE`(선행 부재)이다. 유일 인접(#5 Resource Owner=`parent_user_id` owner 판별)도 소유자 판별일 뿐 우선순위 해소가 아니다.

## 2. 규칙

- 🔴 **원문 명령(1941행 §47 이후 2004행)**: *"Explicit Subject Authority라도 DENY·Expiry·Scope Mismatch를 우회하지 못하게 하라."* — #1(Explicit Approved Subject)이 최상위 우선순위여도 **Exclusion(§49)의 EXPLICIT_DENY·AUTHORITY_EXPIRED·scope mismatch 를 무조건 우회 금지**다. 신설 시 우선순위 해소보다 **Exclusion 게이트를 선평가(fail-closed)** 하라. 현행 `Mapping.php:268` 자기승인차단이 1경로에만 있는 결함(ⓑ §2)을 우선순위 로직에 상속시키지 마라.
- 🔴 **13개 소스 계층을 ENUM 하드코딩하지 마라** — `pm_audit_log.entity_type` ENUM 이 신규 타입 INSERT 예외를 낸 선례(5-3-3-1 §8)를 반복하지 말고 확장 가능 우선순위 카탈로그로.
- 🔴 **#6 Cost/Profit Center 를 임의 신설로 채우지 마라** — 재무 조직축(Cost Center·Profit Center)은 저장계층부터 부재(`ABSENT`)이므로 Authority Domain(§8)·Legal Entity(§11) 선결 후 통합 설계한다. 임의 상수/더미로 우선순위를 채우면 §65 gap 을 유발한다.
- 🔴 **코드 변경 0 유지** — 소스 우선순위 해소 엔진 신설은 후보 도출(§47)·Resolution(§50/§51) 선행 후 **별도 승인세션**.
