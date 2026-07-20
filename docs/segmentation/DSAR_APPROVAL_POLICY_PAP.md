# DSAR — PDP/PEP Governance: 정책 관리 지점 (APPROVAL_PAP)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_12_PDP_PEP_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_PDP_PEP_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_POLICY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_POLICY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

APPROVAL_PAP는 정책의 생애주기를 관리하는 행정 계층이다(SPEC §7): Policy 생성 · Policy 수정 · Policy 폐기 · Version 관리 · Approval · Publishing. PAP는 Policy Registry/Repository/Version/Package/Bundle(SPEC §1·§11·§12)을 관장하며, 게시된 Immutable Policy Version(SPEC §30)만 PDP가 평가하도록 정책 배포 경계를 형성한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

PAP는 권한 CRUD 수준으로 존재하나 버전/게시 계층이 없어 **PARTIAL**이다(GT② §2).

| PAP 기능 | 판정 | 근거(파일:라인) |
|---|---|---|
| **Policy 생성/수정(권한 CRUD)** | PARTIAL(de-facto) | `putTeamPermissions`·`putMemberPermissions`(`TeamPermissions.php:598-621`·`:642-692`)—파괴적 전체교체·버전 없음 |
| Scope 관리 | PARTIAL | `replaceScope`(`TeamPermissions.php:337-346`)·`seedOrg`(`:755-784`) |
| Policy 폐기 | PARTIAL | 권한 행 교체로 암묵 폐기(`:598-692`)—명시적 deprecate/폐기 상태 없음 |
| **Version 관리** | **ABSENT** | Immutable Policy Version 부재—파괴적 교체(GT② §2·SPEC §30 위반) |
| **Approval / Publishing** | **ABSENT** | 정책 승인·게시 경계 부재(grep 0·GT② §2) |
| 관리 거버넌스 인접 | PARTIAL | `AccessReview.php:1-30`(Part 3-8 api_key 검토·SecurityAudit 증거)—결정 거버넌스 인접(GT① §H) |
| 감사 SSOT | PARTIAL | `teamAudit`(`TeamPermissions.php:714-731`)·auth_audit_log(`UserAuth.php:4174`)—문자열 detail·정책 변경이력 구조화 미비 |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **정책 생애주기**: 생성→수정→Approval→Publishing→폐기(SPEC §7). 현행 `putTeamPermissions`/`putMemberPermissions`(`TeamPermissions.php:598-692`) CRUD에 **버전/게시 계층 추가**(ADR §D-3)—대체 아닌 확장.
- **Immutable Version**: 게시된 Policy Version은 불변(SPEC §30 Immutable Policy Version)·파괴적 전체교체(`:598-692`)를 append-only 버전 발행으로 승격. Bundle/Package 무결성(SPEC §30) 강제.
- **API(SPEC §29)**: Publish Policy·Simulate Policy를 PAP 진입점으로 신설—게시 전 Simulation(SPEC §21) 영향분석 게이트.
- **변경 감사**: 정책 변경은 SecurityAudit 해시체인(`SecurityAudit.php:12-53`) 및 `teamAudit`(`TeamPermissions.php:714-731`) 확장 기록(ADR §D-5)—구조화된 정책 변경이력.
- **테넌트 격리**: 정책 관리·게시는 tenant 경계 내(SPEC §30 Tenant Isolation)·크로스테넌트 정책 배포 금지.

## 4. KEEP_SEPARATE (마케팅 policy 흡수금지)

PAP는 authz 정책 관리이며, 마케팅/알림 정책 관리와 무관하다(GT② §5). `action_request.policy_id`(`Db.php:576`·`routes.php:439-445`)=Alerting `alert_policies` 관리·maker-checker(`Mapping.php:269`)는 알림 액션정책 거버넌스이지 authz PAP 아님. `PriceOpt.php:927`·`AdminGrowth.php:1239`(simulate)는 마케팅 시뮬—PAP Policy Simulation과 개명·흡수 금지.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: PAP = **PARTIAL**—권한 CRUD(`TeamPermissions.php:598-692`·`:337-346`·`:755-784`) 실존하나 **Version/Approval/Publishing = ABSENT**(파괴적 교체·게시 경계 부재·GT② §2).
- **재활용(Extend)**: `TeamPermissions` CRUD에 버전/게시 계층 추가·SecurityAudit 변경감사 확장(ADR §D-3·§D-5)—신규 관리 엔진 중복 금지.
- **선행의존**: Policy Registry/Version/Bundle(APPROVAL_POLICY_* 계열)이 PAP 관장 대상—해당 순신규 엔티티 선행(BLOCKED_PREREQUISITE)·Part 1~3-11 인증 조건. 코드 변경 0 · NOT_CERTIFIED.
