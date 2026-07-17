# DSAR — Cross-Tenant Manager Guard (§59)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §59 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### ★축 주의 ① — 🔴 **현행은 Cross-Tenant Manager 를 "차단"하지 않는다. 개념 자체가 없다.**

**"차단됨"으로 적으면 허구다.** 테넌트 경계를 넘는 Manager 지정이 일어나지 않는 이유는 **가드가 막아서가 아니라 Manager 관계 축이 레포에 없어서**다(`manager_id`·`reports_to`·`supervisor_id` **grep 0** · git 삭제 이력 0).

### ★축 주의 ② — 테넌트 격리 강제는 **REAL 이나 평면(flat)이며 Manager 축과 무관**

| 자산 | 실측 | 성격 |
|---|---|---|
| **X-Tenant-Id 위조 차단** | **`index.php:600`** — 인증 키의 `tenant_id` 로 **무조건 덮어쓰기**(주석 `:595-599` 가 188차 P0 배경 자인) | **REAL** — 평면 격리 |
| **strict fail-closed** | **`index.php:585`** — `GENIE_STRICT_AUTH=1` + 무-테넌트 키 → 403. ⚠️**기본 OFF**(`:584` 자인) | **REAL(옵트인)** |
| **순회 단계 격리** | `Dependencies.php:91` — `WHERE tenant_id = ? AND predecessor_id = ?` **매 홉** | **REAL** — 유일한 그래프 순회 격리 선례 |

🔴 **이 3자산은 "요청이 어느 테넌트 데이터를 읽는가"를 강제할 뿐, "A 테넌트 Subject 가 B 테넌트 Subject 의 Manager 인가"를 판정하지 않는다.** 격리는 **평면**이며 §59 가 요구하는 것은 **관계 축의 경계 정책**이다. 전자로 후자를 닫으면 **분모를 갈아끼우는 역산**이다.

### ★축 주의 ③ — 인접 자산 = `agency_client_link` → **`KEEP_SEPARATE_WITH_REASON`**

레포에서 **테넌트 경계를 정당하게 넘는 유일한 실 능력**이다. 품질은 REAL 이나 **감독 관계가 아니다.**

- **DDL `AgencyPortal.php:64-72`** — `agency_id` × `client_tenant_id` · `status`(기본 `pending`) · `scope_json` · `invited_at`/`approved_at`/`revoked_at` · `UNIQUE(agency_id, client_tenant_id)`
- **매 요청 fail-closed 재검증 `:414-432`** — `resolveAccessContext()` : `:426` `status !== 'approved'` → null · `:427` **세션↔링크 tenant 불일치 방어** → null · 주석 `:411` *"매 요청 링크 status='approved' 재검증(철회/만료 즉시 차단)"*
- **`READ_ONLY` effect 실구현** — `defaultScope():89` `['write'=>false, 'menus'=>[...]]` → **`index.php:92-96`** 쓰기 메서드 시 **403 `AGENCY_READ_ONLY`** · `:98-100` 서버바인딩 tenant + 최소권한 role(`viewer`/`analyst`)
- 🔴 **그러나 §59 축이 아니다**: **N:M 이분 그래프**(대행사↔클라이언트) · **1홉 고정**(체인 없음) · **동의 기반 접근 허가**(`status='approved'`)이지 **감독 관계가 아니다**. Manager/Supervisor/보고선 개념 **0** · 승인 라우팅 자격 **0**.
- 🔴 **`:304`·`:381` 이 `revoked_at=NULL` 로 이전 해지 시각을 소거** → **이력 물리적 소멸** = §59 9·10(Evidence·Audit)·§55 의 **정면 반례**. **선례로 삼지 마라.**

### 비-오염 확인

- 🔴 `app_user.parent_user_id` = **테넌트 소속 포인터이지 보고선 아님**(정의 `UserAuth.php:156-167` · 주석 `:156`). 전 생성경로 **owner 직속 2단 봉인**(`:1226-1227`·`EnterpriseAuth.php:500`·`:1574/1581`·`:670`) · 순회 = **단일 홉**(`resolveTenantId:200-217` · `LIMIT 1` 1회 · 재귀 없음). **Cross-Tenant 는 구조상 발생 불가 — 관계가 없어서지 가드가 있어서가 아니다.**
- 🔴 `TeamPermissions.php:718` `'외부 대행사'` = **팀 프리셋 문자열** · `AdminGrowth.php:871` 광고**대행사** = 비즈니스 도메인. **Cross-Tenant Manager 아님.**

## 1. 원문 전사 + 판정 — **원문 17종**(차단 7 + Shared Service 요구 10)

### 차단 대상 **7종** (원문: *"다음을 차단하라."*)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | 다른 Tenant Subject를 Direct Manager로 지정 | 🔴 **차단이 아니라 개념 부재.** Direct Manager 축 0. **인접 유일**: `createTeam:463-469` 가 `manager_user_id` 수령 시 **테넌트 소속 검증 → 422**(`:464`) — **팀 매니저 지정 경로 한정 · 보고선 아님** | `ABSENT`(인접 `:464` 는 §61 1번에서 계상) |
| 2 | 다른 Tenant Position을 Supervisor로 지정 | **Position 축 전역 0** · Supervisor 축 0 | `ABSENT` |
| 3 | 다른 Tenant Organization Head를 Manager로 지정 | Organization = **18/18 `CONTRACT_ONLY`** · `head_id` grep 0 | `ABSENT` |
| 4 | Cross-Tenant Acting Manager | **Acting 축 전역 0** | `ABSENT` |
| 5 | Cross-Tenant Temporary Manager | Temporary Assignment 축 0(effective date 0) | `ABSENT` |
| 6 | Cross-Tenant Supervisory Path | Supervisory Path 축 0. **알고리즘 선례만 존재** — `Dependencies.php:91` 이 **매 홉 tenant 술어**로 순회를 봉쇄(태스크 도메인) | `ABSENT`(도메인) |
| 7 | Cross-Tenant Approval Candidate | 🔴 **승인자 후보를 계산하는 코드가 레포에 없다**(`resolveApprover`/`approval_chain`/`routeApproval` **grep 0**) → 후보 집합이 없으니 **경계 판정 대상도 없다** | `ABSENT` |

### 명시적 Shared Service 요구 **10종** (원문: *"명시적 Shared Service가 필요한 경우 다음을 요구한다."*)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 8 | Shared Service Reference | Shared Service 엔티티 **0**. 인접 `agency_client_link`(`:64-72`) = **접근 허가 링크이지 공유 서비스 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 9 | Contract Reference | 계약 참조 **0** — `agency_client_link` 에 계약 컬럼 없음(`:64-72` 전 컬럼 확인) | `ABSENT` |
| 10 | Tenant-to-Tenant Trust Policy | 인접 = `status='approved'` **동의 기반**(`:414-432` 매 요청 재검증). 🔴 그러나 **정책이 아니라 단일 불리언 상태** — 신뢰 조건·등급·범위 표현 0 | `KEEP_SEPARATE_WITH_REASON` |
| 11 | Allowed Scope | 인접 **REAL** = `scope_json` → `defaultScope():89` `menus:['dashboard','marketing','campaign','attribution','commerce']`. 🔴 **메뉴 화이트리스트이지 감독 범위 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 12 | Data Access Policy | 인접 **REAL** = **`READ_ONLY` effect 실구현** — `write=false` → **`index.php:92-96` 403 `AGENCY_READ_ONLY`** + `:98-100` 최소권한 role 강등 | `KEEP_SEPARATE_WITH_REASON` |
| 13 | Authorization Check | 인접 **REAL** = **매 요청 fail-closed 재검증**(`:414-432` · `:426` 비승인 null · `:427` 세션↔링크 tenant 불일치 방어) — **레포 최고 품질의 경계 인가 선례** | `KEEP_SEPARATE_WITH_REASON` |
| 14 | Approval Routing Eligibility | **승인 라우팅 자체가 부재**(§4.1 승인 경로 4개 전량 = "호출자가 곧 승인자") → 자격 판정 대상 0 | `ABSENT` |
| 15 | Effective Period | 🔴 `invited_at`/`approved_at`/`revoked_at`(`:68-69`) 는 **이벤트 타임스탬프이지 유효기간 아님**(`effective_from`/`effective_to` 아님 · 만료 질의 0). 🔴 **`:304`·`:381` 이 `revoked_at=NULL` 로 소거** → 기간 복원 불가 | `ABSENT` |
| 16 | Evidence | 근거 첨부 축 **0** | `ABSENT` |
| 17 | Audit | 🔴 **`:304`·`:381` 의 `revoked_at=NULL` 소거가 감사 축의 정면 반례.** 링크 상태 변경 이력 테이블 **부재**. ⚠️ AgencyPortal 전용 감사로그 유무 **미확인**(본 전사에서 미실측 — 등급 부여 보류) | `ABSENT`(★부분 실측 — 자진신고) |

**실측 개수: 17 / 17 전사.** (측정기 분모 17 · 원문 대조 17 · 전사 17 — **일치**)
커버리지 = **`VALIDATED_LEGACY` 0** · `KEEP_SEPARATE_WITH_REASON` 5 · `ABSENT` 12.

> ★ **원문 말미 항목이 `Evidence` → `Audit` 로 끝난다** — 규칙 4 확인 결과 **원문이 실제로 `evidence` 를 포함**하므로 전사에 포함했다(추가·날조 아님).

## 2. 규칙

- 🔴 **"현행이 Cross-Tenant Manager 를 차단한다"고 적지 마라.** `index.php:600`(X-Tenant-Id 덮어쓰기)·`:585`(strict)는 **평면 격리**이며 관계 축을 모른다. 이를 §59 커버로 계산하면 **분모를 데이터 접근 축으로 갈아끼우는 역산**(§78 "레이트리밋 있음" 오류와 동형).
- 🔴 **`agency_client_link` 를 Manager 관계로 확장 금지 — `KEEP_SEPARATE_WITH_REASON`.** 근거는 "다른 것"이 아니라 **구조 사실**: **N:M 이분·1홉 고정·동의 기반 접근 허가**다. Supervisory Path(다홉·방향성·전이)를 여기에 얹으면 **접근 허가 모델이 감독 모델로 오염**되고, 대행사 링크가 **승인 권한을 자동 획득**한다(§76 3번 *"Manager 라는 이유만으로 Approval Authority 자동 부여"* 와 동형 결함 신설).
- ✅ **이식 대상 = `resolveAccessContext:414-432` 의 집행 형태**: **① 매 요청 재검증(캐시 금지) ② `status!=='approved'` → fail-closed ③ 세션↔링크 tenant 불일치 방어 ④ 서버바인딩 주입(위조불가)**. §59 8~13 신설 시 **이 4형태를 그대로 계승**하라. **재구현 금지.**
- ✅ **`READ_ONLY` effect 는 실구현 선례**(`defaultScope():89` → `index.php:92-96` 403). §59 12번(Data Access Policy)은 **이 게이트를 확장**하되 **신규 403 경로 신설 금지**.
- 🔴 **`revoked_at=NULL` 소거 패턴(`AgencyPortal.php:304`·`:381`) 복제 절대 금지.** §59 15·17 과 §55(과거 Snapshot 대체 금지)의 **정면 반례**다. Cross-Tenant Manager 는 **append-only 이력**(`pm_audit_log` migration `20260526_168_008` 형태 — `tenant_id NOT NULL`·`diff_json`·append-only)이 필수.
- 🔴 **6번(Supervisory Path)은 `Dependencies.php:91` 의 매 홉 tenant 술어를 반드시 계승하라.** 순회 SQL 에서 이 술어를 빠뜨리면 **§57 순환탐지와 §59 경계가 동시에 뚫린다**(단일 누락 → 이중 실패).
- 🔴 **7번(Approval Candidate)은 Resolver 신설이 선결.** 후보 집합이 0개인 상태로 "Cross-Tenant 후보를 차단했다"고 표시하면 **VACUOUS**이자 **자동 PASS = 가짜녹색**.
- 🔴 **1번을 `createTeam:464` 로 닫지 마라.** `:464` 는 **REAL 이나 팀 매니저 컬럼 지정 경로 한정**이며 보고선이 아니다. §61 1번(Tenant 일치)에서 계상하고 §59 에서는 **중복 계상 금지**(규칙 9 — 미달을 커버로 위장).
- **strict 기본 OFF(`index.php:584`)를 전제로 삼지 마라.** 무-테넌트 키가 통과하는 기본 구성에서 §59 를 설계하면 **경계 판정의 좌변이 빈 문자열**이 된다.
