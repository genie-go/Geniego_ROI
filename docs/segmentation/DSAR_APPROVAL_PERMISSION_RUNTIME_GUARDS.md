# DSAR — Permission Engine Runtime Guard (EPIC 06-A-03-02-03-04 Part 2 · §89)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **전수조사 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)
- **규율**: 코드/DB 0 · BLOCKED_PREREQUISITE(RP-002) · 반날조(file:line은 상위 2문서만) · Permission≠Role≠Authority · Golden Rule · Part1 D-2 재플래그 금지

---

## ① 목적

§89는 **Permission Resolution/집행 시점(Runtime)에 매 요청마다 검증해야 할 Guard 목록**이다. Static Lint(§88·정의 시점)와 달리, Runtime Guard는 **PEP(Policy Enforcement Point)에서 실제 요청 컨텍스트**(actor·tenant·resource·version·scope·grant 상태)에 대해 판정한다. 현행 Runtime Guard 최근접은 **`index.php` 중앙 RBAC + `guardTeamWrite`**이며, §89 대다수는 이를 확장하되 Permission Resolution 결과를 결합해야 완성된다.

## ② 핵심 항목/열거 (§89 Runtime Guard)

| # | Runtime Guard | 실패 시 | 현행 최근접 |
|---|---|---|---|
| 1 | Registry Missing | Registry 미탑재 → Deny | ABSENT |
| 2 | Definition Missing | 정의 미조회 → Deny | ABSENT |
| 3 | Version Missing/Mismatch | 요청 버전≠활성 버전 → Deny | ABSENT |
| 4 | Grant Missing | grant 부재 → Deny(Default Deny) | acl_permission 부재=deny |
| 5 | Inactive | 비활성 정의/grant → Deny | ABSENT |
| 6 | Suspended | 정지된 grant → Deny | ABSENT |
| 7 | Revoked | 철회된 grant → Deny | ABSENT |
| 8 | Expired | 만료 grant → Deny | ABSENT |
| 9 | Explicit Deny | Deny 매칭 → 즉시 Deny(Allow보다 우선) | `1=0` 센티넬만 |
| 10 | Tenant Scope Mismatch | 타 테넌트 → Deny(격리) | 중앙 RBAC tenant 강제 |
| 11 | Legal Entity Scope Mismatch | 법인 범위 밖 → Deny | ABSENT |
| 12 | Org Scope Mismatch | 조직 범위 밖 → Deny | ABSENT |
| 13 | Resource Type Mismatch | 리소스 타입 불일치 → Deny | ABSENT |
| 14 | Resource ID Scope Mismatch | 리소스 ID 범위 밖 → Deny | data_scope 행필터 |
| 15 | Resource Version Mismatch | 리소스 버전 불일치 → Deny | ABSENT |
| 16 | Action Mismatch | 요청 action≠grant action → Deny | acl_permission actions |
| 17 | Field Scope Mismatch | 필드 범위 밖 → Deny | ABSENT |
| 18 | Row Scope Mismatch | 행 범위 밖 → Deny | data_scope scopeSql |
| 19 | Data Scope Mismatch | 데이터 범위 밖 → Deny | data_scope |
| 20 | API Scope Mismatch | API operationId 범위 밖 → Deny | ABSENT |
| 21 | Client Scope Mismatch | 클라이언트 범위 밖 → Deny | ABSENT |
| 22 | Channel Scope Mismatch | 채널 범위 밖 → Deny | scopeChannelProduct |
| 23 | Amount Constraint Failure | 금액 한도 초과 → Deny | ABSENT(Authority=Part 5) |
| 24 | Currency Constraint Failure | 통화 제약 실패 → Deny | ABSENT |
| 25 | Time Constraint Failure | 시간 제약(유효기간/시각) 실패 → Deny | ABSENT |
| 26 | Dependency Missing | 선행 권한 부재 → Deny | ABSENT |
| 27 | Exclusion Violation | 상호배제 위반 → Deny | ABSENT |
| 28 | Conflict | 권한 충돌 → Deny/Escalate | ABSENT |
| 29 | Circular | 순환 참조 → Deny | ABSENT |
| 30 | Ambiguous | 결정 모호 → Deny(fail-closed) | ABSENT |
| 31 | Actor Type Invalid | actor 타입 부적합 → Deny | ABSENT |
| 32 | Service/System Actor Restriction | 서비스/시스템 액터 제한 위반 → Deny | ABSENT |
| 33 | Scope Expansion Unapproved | 미승인 범위 확장 → Deny | ABSENT |
| 34 | Drift | 정의/캐시 드리프트 → 재검증/Deny | ABSENT |
| 35 | Digest Mismatch | Snapshot 다이제스트 불일치 → Deny | ABSENT |
| 36 | Cache Integrity Failure | 캐시 무결성 실패 → 재계산/Deny | 캐시 ABSENT |
| 37 | Cross-Tenant Use | 크로스테넌트 grant 사용 → Deny | 중앙 RBAC tenant 격리 |
| 38 | Runtime Bypass 시도 | 우회 경로 탐지 → Deny | guardTeamWrite 전역 |

## ③ substrate 매핑 (§92 + file:line · 없으면 ABSENT)

- **중앙 RBAC = Runtime Guard(PEP) 최근접** — `index.php:553-619`: roleRank `:573`·scope 게이트 `:590-596`·**tenant 강제주입 `:619`**(#10/#37 격리 정본)·`/v421/keys` admin:keys `:583-586`. api_key scopes = 프로그래매틱 Runtime 판정.
- **guardTeamWrite 전역 미들웨어** — `UserAuth::guardTeamWrite :1167` + `index.php:82`(mutating 전역·`TEAM_READ_ONLY`)·`requireTeamWrite :1134`·`teamCanWrite :1125`. #38 Runtime Bypass 봉인.
- **#4 Default Deny·#16 Action** — `TeamPermissions.php:152-171`(acl_permission)·`ACTIONS :39`(8동작)·`effectiveForUser :366`(Effective-Set 온디맨드 계산·미영속).
- **#9 Explicit Deny** — `DENY_SCOPE :234`·`1=0` 센티넬 `:290,303` (first-class Deny row는 ABSENT).
- **#14/#18/#19/#22 Row/Data/Channel Scope** — `data_scope`(`:160-171,218-322`)·`effectiveScope :236-265`·`scopeSql :286-293`·`scopeSqlNamed :299-307`·`scopeChannelProduct :315-322`. ★단 **소비 핸들러 4곳(Catalog/OrderHub/Wms/AdPerformance)만** — 넓은 미필터 표면.
- **#3/#5~#8/#11~#13/#15/#17/#20/#21/#23~#36 Version·Grant 상태·Scope 세분·Constraint·Drift·Digest·Cache** — **ABSENT(순신규)**.

## ④ 설계 원칙

- **Default Deny + Deny First**: 미조회/미결정/모호(#1~#3/#30)는 전부 Deny(fail-closed). Explicit Deny(#9)는 Allow 평가 전에 최우선 판정.
- **Runtime은 요청 컨텍스트 실측**: actor/tenant/resource/version/scope/grant 상태를 **매 요청** 재검증. 캐시된 결과라도 Version/Tenant/Grant 상태 무효화 반영(#34/#36).
- **Tenant 격리 무후퇴**: 신설 Permission Guard도 `index.php:619` tenant 강제주입 전례를 계승(#10/#37).
- **넓은 미필터 표면 축소**: data_scope 소비 4핸들러 → 전 mutating 표면으로 Row/Data Guard 확장(현행 enforcement gap 해소).
- **Permission≠Authority**: #23~#25 Amount/Currency/Time Constraint는 Part 5 Approval Authority 연결 Contract로 위임(Permission Guard가 금액 판단을 삼키지 않음).

## ⑤ Gap

- BLOCKED_PREREQUISITE(RP-002): #3(Version)·#7/#8(Revoked/Expired)·#35(Digest)·#34(Drift)는 Grant Version·Snapshot·Decision Core(Part 1·코드 0) 선행 필요.
- 현행 실 Runtime Guard = 중앙 RBAC + guardTeamWrite(#4/#10/#16/#37/#38 근접) + data_scope(#14/#18/#19/#22, 단 4핸들러). **나머지 30여 종은 순신규**.
- ★enforcement gap 명시: data_scope가 ~57핸들러 중 4곳만 소비 → 미필터 표면은 신설 시 최우선. "있다고 가정" 배선 금지.
