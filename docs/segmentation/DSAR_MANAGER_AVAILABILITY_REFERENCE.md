# DSAR — Manager Availability Reference (§41)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §41 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### ★★ `is_active` — **표현은 빈약, 집행은 REAL** → `PARTIAL`

§41 담당 축 중 **유일하게 실재하는 것**은 `app_user.is_active` 다. **표현력과 집행력을 분리해 판정한다**(규칙 7 — 이름이 아니라 능력으로).

**정의부** — 🔴 ★**base DDL `Db.php:1106`**: `is_active TINYINT(1) NOT NULL DEFAULT 1`
> 🔴 **`UserAuth.php:165-179`(ALTER 목록)만 보면 놓친다.** `app_user` ALTER 사이트는 **5개소**(`UserAuth.php:166-178` 9컬럼 · `Db.php:1123-1135` · `Db.php:1225-1232` · `UserAuth.php:3421-3423` **동적 $col — mfa 6종** · `TeamPermissions.php:175` team_id **중복 정의** · `EnterpriseAuth.php:65`)이며 **`is_active` 는 그 어디에도 없다** — base DDL 이다. **결론(고용 컬럼 0)은 5개소 전량에서 유지.**

| 축 | 실측 | 판정 |
|---|---|---|
| **표현력** | 🔴 **`TINYINT(1) NOT NULL DEFAULT 1` = 1/0 두 값뿐** → §41 8종 중 **표현 가능 2종** | 🔴 |
| **`UNKNOWN` 표현** | 🔴 ★**표현 불가** — `NOT NULL DEFAULT 1` → **미지가 자동으로 "가용"** = **fail-open** | 🔴 **가장 위험** |
| **사유 / 시각 / 이력** | 🔴 **컬럼 0** — `is_active=0` **3경로 혼재**(`UserAuth.php:1380` 팀원삭제 · `EnterpriseAuth.php:412` SCIM DELETE · `UserAdmin.php:361` 관리자 토글) → **왜·언제·누가 비활성화했는지 구분 불가** | 🔴 |
| **집행력** | ✅ **REAL** — 로그인 차단(`UserAuth.php:805`) · **재활성화 우회 방어**(`:854-856` — **비밀번호 검증 성공 후에만** 최고관리자 오배치 복구) · **비활성 시 세션 즉시 폐기**(`:1381` · `EnterpriseAuth.php:400`,`:413`) · owner 잠금 방지(`:398`,`:411`) | ✅ |

> 🔴 **★규칙 8 재적중 방지** — `is_active` 는 **계정 상태이지 고용 상태가 아니다**. 소비처 **전부 인증 게이트**(`UserAuth.php:248`,`:805`,`:2455`·`routes.php:2776`). **승인 라우팅 술어로 판독하는 코드 0.** → §41 `approval routing effect` 는 **부재**.

### ★ 유일한 확장 지점 — **SCIM `active` = IdP→내부 인입 REAL**

`EnterpriseAuth.php:389-400` — **PUT(전체)·PATCH(Operations) 양형식** 수용:
- `:389` `if (array_key_exists('active', $b)) $active = !empty($b['active']) ? 1 : 0;` (PUT)
- `:391-396` Operations 루프 · `:394` **`filter_var($av, FILTER_VALIDATE_BOOLEAN)`** (PATCH)
- `:398` **owner 비활성화 금지 403**(테넌트 잠금 방지)
- `:400` **`DELETE FROM user_session WHERE user_id=?` = 즉시 deprovision**
- `scimDeleteUser`: `:412` `is_active=0` · `:413` 세션 폐기 · `:411` owner 삭제 금지 403

→ ★**§41 `TERMINATED`/`SUSPENDED` 의 유일한 확장 지점.** IdP 가 상태를 밀어넣는 **실배선 경로가 이미 있다**.

> 🔴 **단 `manager` 는 다르다** — SCIM `manager` **`ABSENT` 확정**: `urn:ietf:params:scim:schemas:extension:enterprise:2.0:User` **전역 0** · `scimUserOut:329-339` = schemas/id/externalId/userName/active/name/emails/meta **뿐** · `scimCreateUser:364-375` = userName·name·externalId·groups **5종만** 파싱.
> 🔴 ★**PATCH = 침묵 no-op(가짜 녹색)**: `scimUpdateUser:391-396` Operations 루프가 **`'active'` 경로만** 분기 → IdP 가 `PATCH {"path":"manager"}` 를 보내면 `:399` 가 `is_active`·`name` 만 UPDATE 하고 **200 + 정상 User 리소스 반환**. Okta/Entra 콘솔엔 **성공 표시 · 저장된 것은 없다.** **현재 소비자 0 → 관찰 사실 · 등급 미부여.**

### 🔴 함정 — **커버 계산 금지**

| 후보 | 실체 | 왜 아닌가 |
|---|---|---|
| `locked_until` (`UserAuth.php:3335` `login_attempt` · `AgencyPortal.php:179` `agency_login_attempt`) | **무차별 대입 스로틀** | 🔴 키가 **`ident`(user_id 아님)** · **분 단위 자동 해제** · 관리 행위 아님 → **`SUSPENDED` 선례 아님** |
| `suspend` | 🔴 **말장난 1건** — `WorkspaceState.php:12` **"belt-and-suspenders"** | **Suspension 개념 전역 0** |
| `UserAdmin::impersonate:466-525` | **신원 위장 열람**(관리자 2시간 토큰 `:492` · 관리자 계정 대행 차단 `:487`) | 🔴 주석이 **"대행"을 6회**(`:466`,`:492`,`:525`) 쓰나 **권한 대행이 아니다** — 기간부 Assignment·original manager 참조·covered scope **전무**. **`acting manager reference` 로 계산하면 심각한 오판** |
| `대행` 한글 grep 대량 히트 | 배송대행/구매대행(`ClaudeAI.php`·`MarketingDataHub.php:115`) · 광고**대행사**(`AdminGrowth.php:871`·`TeamPermissions.php:718` `'외부 대행사'` 팀 프리셋) · 결제**대행**(PG) | **직무대리 0건** |
| `DELEGATION_EXCEEDED` (`TeamPermissions:645`) | **권한 부여 상한** | Manager 위임 아님 → `delegation reference` 선례 아님 |
| `interim` | **1건 = 지오리프트 중간결과**(`AttributionEngine.php:672` `$rj['interim']`) | 이름 함정 |

### ★ `timezone` 선례 판정 — **4벌+ 병존 · 전부 도메인 상이**

| 벌 | 실측 | 도메인 | DST |
|---|---|---|---|
| `RuleEngine::DEFAULT_TZ = 'Asia/Seoul'` (`RuleEngine.php:35`) | PHP 상수 | 광고 데이파팅 기본값 | — |
| ★**`daypart_schedule.tz VARCHAR(40) DEFAULT 'Asia/Seoul'`** (`RuleEngine.php:56`) | **유일한 IANA 문자열 tz 컬럼** | 광고 데이파팅 | ✅ 표현 가능 |
| `crm_customer_prefs.tz_offset INT NOT NULL DEFAULT 9` (`PreferenceCenter.php:84` MySQL · `:99` SQLite · 판독 `:160`) | INT 오프셋 | 고객 수신 선호 | 🔴 **표현 불가** |
| JourneyBuilder `gmdate` (`:538`) | **UTC 고정** | 시스템 시각 | — |

> 🔴 **전부 도메인 상이 — 직원 근무지 타임존 전역 0.** **스키마 형태(`VARCHAR(40)` IANA)만 이식 가능 · 값·의미·소유자는 신규.**

## 1. 원문 전사 + 판정 — **원문 21종** (지원 상태 8 + 필수 필드 13)

원문 범위 선언(`:1525-1527`): *"이번 단계에서는 가용성 Reference만 구축한다. 상세 Delegation·Substitute는 후속 전용 블록에서 구현한다."*

### 1-1. 지원 상태 — **8종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | AVAILABLE | ✅ `is_active=1`(`Db.php:1106`) — **표현 가능** · 🔴 단 **계정 상태**이지 가용성 아님 · 사유·시각 0 | `PARTIAL` |
| 2 | ON_LEAVE | 🔴 **`on_leave` grep 0** · `Leave Status` 전역 0 | `ABSENT` |
| 3 | OUT_OF_OFFICE | 🔴 **`out_of_office` grep 0** | `ABSENT` |
| 4 | SUSPENDED | 🔴 **Suspension 개념 전역 0** — `suspend` = **말장난 1건**(`WorkspaceState.php:12` "belt-and-suspenders") · `locked_until` 은 **무차별 대입 스로틀**(선례 아님) · ★**SCIM `active`(`EnterpriseAuth.php:389-400`)가 유일 확장 지점** | `ABSENT`(확장지점 有) |
| 5 | TEMPORARILY_UNAVAILABLE | 부재 — **기간 표현 수단(`effective_to`/`valid_to`) grep 0** | `ABSENT` |
| 6 | TERMINATED | 🔴 **`terminated`·`deleted_at` grep 0** · `is_active=0` 은 **3경로 혼재**로 종료와 구분 불가 · ★SCIM `scimDeleteUser:412` 가 유일 확장 지점 | `ABSENT`(확장지점 有) |
| 7 | SECURITY_BLOCKED | 부재 · 인접 `locked_until` = **분 단위 자동 해제 스로틀**(보안 차단 아님) | `ABSENT` |
| 8 | UNKNOWN | 🔴 ★**표현 불가** — `is_active TINYINT(1) NOT NULL DEFAULT 1`(`Db.php:1106`) → **미지가 자동으로 "가용"** = **fail-open** | `ABSENT`(**최우선 위험**) |

> ★ **지원 상태 목록은 `evidence` 로 끝나지 않는다**(`UNKNOWN` 이 마지막 · `:1538`). **추가하지 않았다.**

**표현 가능 = 8종 중 2종(1/0).** 🔴 **규칙 10 적중** — 현행이 "항상 2상태"인 것은 **8종을 표현할 수단이 없어서**다.

### 1-2. 필수 필드 — **13종**

`MANAGER_AVAILABILITY_REFERENCE`:

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 9 | availability reference id | 부재 — 가용성 엔티티 0 | `ABSENT` |
| 10 | manager subject | 🔴 **Manager 관계 축 전역 0**(`manager_id`·`reports_to`·`supervisor_id` grep 0) · 인접 = `team_role='manager'` **롤 라벨**(관계 아님) | `ABSENT` |
| 11 | source | ★**SCIM `active` = IdP→내부 인입 REAL**(`EnterpriseAuth.php:389-400` PUT/PATCH 양형식 · `:394` `filter_var BOOLEAN`) — **§41 의 유일한 실배선 소스** · 🔴 HRIS/ERP/Directory **히트 0** | `PARTIAL` |
| 12 | availability state | `is_active` 1/0 — **8종 중 2종** · `UNKNOWN` 표현 불가 | `PARTIAL` |
| 13 | start | 🔴 **시각 컬럼 0** — `is_active` 전이 시각 미기록 | `ABSENT` |
| 14 | end | 🔴 **`effective_to`/`valid_to` grep 0** — 폐구간 전례 0 | `ABSENT` |
| 15 | timezone | **4벌+ 병존 · 전부 도메인 상이** · **직원 근무지 tz 0** · 스키마 형태 선례 = `daypart_schedule.tz VARCHAR(40)`(`RuleEngine.php:56`) | `ABSENT`(도메인) |
| 16 | acting manager reference | 🔴 **`acting` grep 0** · **`UserAdmin::impersonate:466-525` 매핑 금지**(신원 위장 열람 · 주석 "대행" 6회는 함정) | `ABSENT` |
| 17 | delegation reference | 🔴 원문 범위 선언(`:1527`) = **후속 전용 블록** · `DELEGATION_EXCEEDED`(`TeamPermissions:645`) = **권한 부여 상한**(선례 아님) | `NOT_APPLICABLE`(본 단계 범위 외) · 참조 슬롯만 |
| 18 | substitute reference | 🔴 `deputy`/`substitute`/`stand_in` **grep 0** · 원문 범위 선언 = 후속 블록 | `NOT_APPLICABLE`(본 단계 범위 외) · 참조 슬롯만 |
| 19 | approval routing effect | 🔴 **`is_active` 를 승인 라우팅 술어로 판독하는 코드 0** — 소비처 전부 **인증 게이트**(`:248`,`:805`,`:2455`·`routes.php:2776`) · 🔴 승인자 후보 계산기 자체가 0(`resolveApprover`/`approval_chain`/`routeApproval` **grep 0**) | `ABSENT` |
| 20 | status | 부재 · 인접 `team.status VARCHAR(20) DEFAULT 'active'`(`TeamPermissions.php:148`) = **팀 상태** | `ABSENT` |
| 21 | evidence | 🔴 **사유·이력 컬럼 0** · 인접 감사 선례 = `pm_audit_log`(`tenant_id NOT NULL` migration `20260526_168_008:7` + `diff_json` `:13` + append-only 주석 `:2-3`) | `LEGACY_ADAPTER`(참조) |

**실측 개수: 21 / 21 전사** (8 + 13). (측정기 21 · 원문 대조 21 · 전사 21 — **3자 일치**.)
커버리지 = **`PARTIAL` 4 · `NOT_APPLICABLE`(범위 외) 2 · `LEGACY_ADAPTER` 1 · `ABSENT` 14 · 커버(`VALIDATED_LEGACY`) 0**.

## 2. 규칙

- ★ **§41 종합 판정 = `PARTIAL`** — **표현은 빈약(8종 중 2종), 집행은 REAL.** 이 둘을 섞지 마라. **집행이 REAL 이라는 이유로 커버 계산 금지**(규칙 9 — 미달을 커버라 부르면 갭이 정의상 소멸한다).
- 🔴 **★최우선 위험 = `UNKNOWN` 을 표현할 수 없다.** `is_active TINYINT(1) **NOT NULL DEFAULT 1**`(`Db.php:1106`) → **미지 = 자동 "가용" = fail-open**. §41 이 `UNKNOWN` 을 8종에 **명시적으로 포함**시킨 이유가 이것이다. **신규 availability state 컬럼은 `UNKNOWN` 을 기본값으로 하는 fail-closed 여야 한다.** 🔴 **`NOT NULL DEFAULT 1` 형태 채택 금지.**
- ★ **확장은 `is_active` 위가 아니라 옆이다.** `is_active` 는 **계정 상태(인증 게이트)** 이며 **고용/가용 상태가 아니다**. 여기에 상태를 더 얹으면 **로그인 차단(`:805`)이 가용성 변경으로 오발동**한다. **별도 availability 축을 신설하고 `is_active` 는 건드리지 마라**(무후퇴).
- ★ **소스 인입은 SCIM `active` 경로를 확장하라**(`EnterpriseAuth.php:389-400`) — **PUT/PATCH 양형식 · `filter_var BOOLEAN`(`:394`) · owner 잠금 방지(`:398`) · 세션 즉시 폐기(`:400`)** 가 이미 REAL 이며, **§41 `TERMINATED`/`SUSPENDED` 의 유일한 확장 지점**이다. **신설 SCIM 핸들러 금지 — 기존 확장.**
  - 🔴 **단 `manager` 는 다르다**: SCIM `manager` **전역 0** · Operations 루프가 **`'active'` 만 분기**(`:391-396`) → `PATCH {"path":"manager"}` 는 **200 반환하며 아무것도 저장 안 함(침묵 no-op = 가짜 녹색)**. **확장 시 미지원 path 를 명시적으로 거부(4xx)하도록 함께 고쳐라** — 그러지 않으면 **가짜 녹색이 새 필드로 전파**된다. ⚠️ **현재 소비자 0 → 등급 미부여.**
- 🔴 **`locked_until` 을 `SUSPENDED` 선례로 삼지 마라** — 키가 **`ident`(user_id 아님)** 이고 **분 단위 자동 해제**되는 **무차별 대입 스로틀**이다(`UserAuth.php:3335`·`AgencyPortal.php:179`). **`suspend` grep 히트는 말장난 1건**("belt-and-suspenders" `WorkspaceState.php:12`) → **Suspension 개념 전역 0**(규칙 7 — 이름이 아니라 능력으로).
- 🔴 **`UserAdmin::impersonate:466-525` 를 `acting manager reference` 로 계산하면 심각한 오판** — 주석이 **"대행"을 6회** 쓰지만 **신원 위장 열람**이다(기간부 Assignment·original manager 참조·covered scope **전무**). **주석을 근거로 삼지 마라 — 정의부를 Read 하라**(규칙 8).
- ★ **`delegation reference`·`substitute reference` 는 원문이 스스로 범위 밖으로 선언했다**(`:1527` *"상세 Delegation·Substitute는 후속 전용 블록에서 구현한다"*). **본 단계에서는 참조 슬롯(FK 자리)만 남기고 구현 금지.** 🔴 **여기서 구현하면 후속 블록과 중복 엔진**이 된다(헌법 위반).
- ★ **`timezone` 은 스키마 형태만 이식**: `VARCHAR(40)` IANA 문자열(`daypart_schedule.tz` `RuleEngine.php:56`). 🔴 **`crm_customer_prefs.tz_offset INT` 형태 채택 금지**(DST 표현 불가). **4벌 전부 도메인 상이 — 직원 근무지 tz 는 값·의미·소유자 전부 신규.**
- 🔴 **`approval routing effect` 는 배선할 곳이 없다** — 승인자 후보 계산기(`resolveApprover`/`approval_chain`/`routeApproval`)가 **grep 0**. **가용성이 승인 라우팅에 미치는 효과는 §29/§43 이 라우팅을 정의한 뒤에야 배선 가능.** 선행 없이 설계하면 역산.
- 🔴 **21종 "있다고 가정"하고 배선 금지.**
