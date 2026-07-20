# DSAR — JIT Access Governance: 상승 승인 워크플로 (APPROVAL_JIT_APPROVAL)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_9_JIT_ACCESS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_JIT_ACCESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_JIT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_JIT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_JIT_APPROVAL`(SPEC §7 Approval Workflow·Canonical Entity §2)은 특권 상승 요청의 **승인 결정 상태머신**이다. 지원 방식(SPEC §7):

| 방식 | 설명 |
|---|---|
| Auto Approval | 저위험 자동 승인 |
| Single Approval | 단일 승인자 |
| Dual Approval | 2인 정족수 |
| Multi-stage Approval | 다단계 결재 |
| Risk-based Approval | Risk Level(§6) 연동 라우팅 |
| Compliance Approval | 컴플라이언스 승인 |
| Executive Approval | 임원 승인 |

**모든 승인 결정은 Immutable Version으로 저장**(SPEC §7·§33 Immutable Approval)한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 항목 | 판정 | 재활용/부재 근거(GT 등장 file:line) |
|---|---|---|
| 권한상승 승인 경로 | **ABSENT(권한상승용)** | GT② §2 "권한상승 결재 경로 0" — 결재엔진은 마케팅용 |
| maker-checker 상태머신 | **재활용(PRESENT)** | `Alerting.php:598` decideAction·집행게이트 `:684-686`(approved-only) |
| 2인 정족수·self 재승인 차단 | **재활용(PRESENT)** | `Alerting.php:642-650`(정족수2)·`:634-640`(self dedup) |
| 승인자 신원 서버도출(위조차단) | **재활용(PRESENT)** | `Alerting.php:600-606`(fail-closed) |
| `required_approvals` 컬럼 실존 선례 | 참고 | `mapping_change_request` `Db.php:623-636`·소비 `Mapping.php:209,:287,:527` |
| Immutable Version 저장 | 재활용 | SecurityAudit 해시체인 `SecurityAudit.php:12-53`·verify `:56-68`·`auth.breakglass` `UserAuth.php:997-999` |
| append-only 결정 이력 선례 | 재활용 | AccessReview 결정→증거 `AccessReview.php:224-233`·이력 `:62-80` |

## 3. 설계 계약 (SPEC 근거·테넌트격리/불변버전)

- **상태머신 재사용**: `Alerting.php:598` decideAction의 승인/거부 전이·approved-only 집행게이트(`:684-686`)·2인 정족수(`:642-650`)·self 재승인 차단(`:634-640`)을 **패턴 재사용**하되 **별도 elevation 승인 테이블·경로 신설**(ADR D-2·GT② B-1 KEEP_SEPARATE).
- **정족수 정의 위치**: elevation 신설 테이블은 `mapping_change_request`처럼 `required_approvals` **컬럼 실존**(`Db.php:623-636`) 방식을 채택(코드상수 강제인 action_request `Db.php:592-600` 한계 회피).
- **Risk 연동**: Risk-based Approval(SPEC §7)은 `APPROVAL_JIT_RISK`(§6) 등급으로 방식 라우팅(HIGH/CRITICAL → dual/multi-stage/executive).
- **불변 버전**: 모든 결정 = Immutable Version(SPEC §33) → SecurityAudit 체인(`SecurityAudit.php:12-53`) 확장 기록. 승인철회는 Auto Revocation(SPEC §14) 트리거.
- **테넌트 격리**: SPEC §33 Tenant Isolation. **성능**: 승인 처리 ≤ 200ms(SPEC §35).

## 4. KEEP_SEPARATE (동음이의 흡수금지)

| 근접 승인물 | file:line(GT 등장) | 분리 사유 |
|---|---|---|
| `action_request` maker-checker | `Alerting.php:642-650,:684-686`·테이블 `Db.php:592-600`·라우트 `routes.php:443-445` | **캠페인 예산/라이트백**(`Alerting.php:571`) 결재 — 권한상승 아님 |
| `mapping_change_request` | `Db.php:623-636`·`Mapping.php:209,:287,:527` | **매핑 거버넌스** 정족수 — elevation 아님 |
| catalog writeback 승인 | `routes.php:110`·`Catalog.php:2383`·`requiresHighValueApproval` `Catalog.php:1159`(₩5M `:1036`) | 상품 데이터/고액 승인 |
| agency access 승인 | `AgencyPortal.php:347`·`routes.php:338` | 대행사↔클라이언트 **영구 링크** 승인 |

> **★혼동 경계**: elevation Approval(상승 결재) ≠ Alerting `action_request`(마케팅 행위 결재)·Catalog `approveQueue`(상품 고액 승인)·`mapping_change_request`(매핑 승인). 상태머신·정족수는 **재활용**하되 대상 도메인이 상이 — **JIT elevation으로 개명·흡수 금지**(가짜녹색 회피, ADR D-6).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: 권한상승 승인 워크플로 **ABSENT(순신규, GT② §2)**. 재활용 substrate = Alerting maker-checker 상태머신(`:598,:642-650,:684-686,:600-606`)·SecurityAudit 불변체인·AccessReview append-only 결정이력. 성격 = "재활용 기반 신설".
- **선행 의존**: Part 1~3-8 인증 후 RP-track 실 구현(BLOCKED_PREREQUISITE·ADR §4).
- **무후퇴**: action_request/mapping/catalog/agency 결재 4종 전부 별개 유지·병행. Extend-only. **코드 0 · NOT_CERTIFIED**.
