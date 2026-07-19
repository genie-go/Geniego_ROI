# DSAR — Permission Engine Critical Gap 후보 정책 (EPIC 06-A-03-02-03-04 Part 2 · §87)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **전수조사 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)
- **규율**: 코드/DB 0 · BLOCKED_PREREQUISITE(RP-002) · 반날조(file:line은 상위 2문서만) · Permission≠Role≠Authority · Golden Rule · Part1 D-2(writeGuard/requireFeaturePlan/admin_roles/admin SSOT=289차 P1~P4 해소) 재플래그 금지

---

## ① 목적

§87은 **Permission Engine에서 탐지 시 Critical(또는 High)로 처리해야 할 Gap 후보의 심각도 정책**이다. 감사 결과 목록이 아니라 **등급 부여 규칙**이다. 실 Permission Engine이 신설될 때 각 후보가 방어되지 않으면 자동 승인·전권 우회·크로스테넌트 유출로 직결되므로, 신설과 동시(또는 선행)에 방어가 배선되어야 한다.

★**축 주의**: 아래 후보의 대다수는 현 저장소에 **선언체(Registry/Definition/Version/Deny Entity/Snapshot)가 순신규**여서 "판정 대상 개념 자체가 없다". 이를 "갭 없음(양호)"으로 읽으면 분모 소멸형 역산이다. **ABSENT = 안전이 아니라 "방어 대상이 아직 존재하지 않음"**이다. 신설 시 대부분 즉시 High로 활성화된다.

## ② 핵심 항목/열거 (§87 Gap 후보 · 원문 심각도 High|Critical)

원문은 개별 항목별 등급을 지정하지 않으므로 등급 열은 **High|Critical(원문 그대로)**로 기록하고, 별도로 **현 저장소 실측 판정**을 부기한다(항목별 High/Critical 세분은 지어내지 않는다).

| # | §87 Gap 후보 | 현 저장소 실측 판정 |
|---|---|---|
| 1 | Permission Registry 부재 | **High(순신규)** — Registry 개념 ABSENT(§92 PARTIAL: MENU_CATALOG 한정) |
| 2 | Canonical Permission Code 표준 부재 | **High(순신규)** — 식별자가 `menu_key`(UI 지향)·`{DOMAIN}:{RESOURCE}:{ACTION}` ABSENT |
| 3 | Permission Version 부재 | **High(순신규)** — 스키마 버전화 ABSENT |
| 4 | Permission Scope 정형모델 부재 | **High(순신규)** — row-scope substrate만 존재, 정형 Scope 모델 ABSENT |
| 5 | Tenant Scope 부재 | **완화(부분 존재)** — 중앙 RBAC가 tenant 강제주입(Cross-tenant 격리 정본)이나 Permission grant 귀속 정형화는 ABSENT |
| 6 | Resource Version Binding 부재 | **High(순신규)** — ABSENT |
| 7 | Action Binding 부재 | **완화(부분 존재)** — 8 actions vocabulary 존재하나 Canonical Action Binding ABSENT |
| 8 | UI Permission만 존재·Server-side Enforcement 부재 | **해당 없음(289차 해소)** — writeGuard 서버 전역 배선 완료. Permission 계층의 재검증 정형화는 순신규 |
| 9 | Wildcard 일반 사용 | **해당 없음(정직)** — Wildcard(`write:*`/`read:*`)는 api_key 프로그래매틱 한정(일반 UI 부여 아님) |
| 10 | isAdmin 전권 우회 | **해당 없음(정직)** — admin 판정 전부 DB plan/plans/admin_level, 소스 리터럴 authz 전무 |
| 11 | Explicit Deny 부재 | **High(순신규)** — first-class Deny row ABSENT(`1=0` 센티넬만) |
| 12 | Deny가 Allow보다 약함(Precedence) | **High(순신규)** — Deny-overrides 결합전략 ABSENT |
| 13 | Grant 근거/승인 부재 | **High(순신규)** — Grant Source Chain·승인 근거 ABSENT |
| 14 | Temporary Grant 만료 부재 | **High(순신규)** — Temporary/Expiration Entity ABSENT |
| 15 | Emergency Grant Audit 부재 | **High(순신규)** — Emergency 개념 ABSENT |
| 16 | Service Account에 Human Approval 강제 | **High(순신규)** — Actor Type 분리·Service Account 정책 ABSENT |
| 17 | Cross-Tenant Grant | **완화(부분 존재)** — 중앙 RBAC tenant 격리 정본 있으나 Permission grant 전용 차단 ABSENT |
| 18 | Revocation 미반영(캐시/유효집합) | **High(순신규)** — Effective-Set 미영속·미캐시, 무효화 파이프라인 ABSENT |
| 19 | Group/Hierarchy Circular | **High(순신규)** — Hierarchy/Group/Bundle 개념 ABSENT |
| 20 | Scope 결합 확대(Union) | **High(순신규)** — Intersection/Expansion Guard ABSENT |
| 21 | Snapshot/Evidence 부재 | **High(순신규)** — Snapshot ABSENT · Evidence PARTIAL(변경만 감사) |
| 22 | Cache Key에 Version/Tenant 없음 | **High(순신규)** — Effective-Set 캐시 자체 ABSENT |
| 23 | Legacy 자동 Allow | **High(순신규)** — Legacy Permission Mapping 미도입(도입 시 fail-open 금지) |
| 24 | Grant/Snapshot In-place Update | **High(순신규)** — 불변 Version/Snapshot 개념 ABSENT |
| 25 | 고객설정으로 Enforcement 제거 | **High(순신규)** — Mandatory Control 무력화 금지(§6.16)는 원칙만 |

## ③ substrate 매핑 (§92 + file:line · 없으면 ABSENT)

- **acl_permission(menu×action)** — `CANONICAL_PERMISSION_SCOPE_CANDIDATE(정형화)` · `TeamPermissions.php:152-171`(테이블·UNIQUE `uq_acl :170`)·`ACTIONS :39`(8동작)·`MENU_CATALOG :55-82`(26메뉴 SSOT). #2/#3/#4/#7 후보의 substrate이나 **Canonical Code/Version은 ABSENT**.
- **data_scope(행필터)** — `ROW/DATA_SCOPE_CANDIDATE` · `TeamPermissions.php:160-171,218-322`·`DENY_SCOPE :234`·`1=0` 센티넬 `:290,303`. #11(Deny) substrate이나 first-class Deny Entity는 ABSENT.
- **중앙 RBAC(PEP)+tenant 강제주입** — `CANONICAL(PEP)` · `index.php:553-619`(roleRank `:573`·scope `:577`·write `:590-596`·tenant inject `:619`). #5/#8/#17의 방어 최근접.
- **api_key wildcard scopes** — `Keys.php:191,204`·`UserAuth.php:4307`. #9 후보의 wildcard 실재처이나 **프로그래매틱 한정 → §6.8 부합(일반 부여 아님)**.
- **admin SSOT** — `UserAuth::resolveAdminByToken :2998`. #10의 "isAdmin 전권 우회" 정직 부재 근거.
- **Grant Source Chain·Temporary/Emergency Expiration·Snapshot/Digest·Effective-Set 캐시·Hierarchy/Group/Bundle·Combining Strategy** — **ABSENT(전부 순신규)**.

## ④ 설계 원칙

- ★**정직 판정 보존**: #9(Wildcard)·#10(isAdmin)은 **해당 없음** — 날조 금지. #8/Part1 D-2 4건은 289차 P1~P4 해소로 **재플래그 금지**.
- **ABSENT ≠ 안전**: 순신규 후보는 신설 시 High로 활성화된다. "엔진 먼저·가드 나중" 금지 — 방어를 선행/동시 배선.
- **Default Deny·Explicit Deny 우선**: Deny는 first-class Entity로 신설하고 Allow보다 항상 우선(#11/#12).
- **Scope는 Intersection**: 결합 시 확장 금지·Expansion Guard(#20).
- **불변성**: Grant Version·Snapshot·Evidence는 In-place Update 금지·append-only(#21/#24).
- **Mandatory Control 무력화 불가**(§6.16): Tenant Isolation·Default/Explicit Deny·Version·Scope Validation·Grant Evidence·Revocation/Expiration·Server-side Enforcement·Snapshot·Audit·Cache Invalidation·Wildcard Restriction은 고객설정으로 끌 수 없음(#25).

## ⑤ Gap

- **BLOCKED_PREREQUISITE(RP-002)**: 실 Critical Gap 방어의 상당수는 선행 Part 1 Authorization Decision/Snapshot/Evidence/Ledger 실 저장체 + Decision Core(코드 0)에 결합되어야 완성된다(Permission Binding·Commit-time Revalidation).
- 순신규 후보(#1~#4/#6/#11~#16/#18~#24)는 **substrate 없음 → 신설과 동시 방어 배선 필수**.
- ★후보를 "있다고 가정"하고 배선 금지 — 부재는 부재로 기록했다. 실 구현·심각도 세분은 별도 승인세션.
