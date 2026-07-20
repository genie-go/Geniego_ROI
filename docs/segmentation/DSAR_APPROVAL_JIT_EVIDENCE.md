# DSAR — JIT Access Governance: Elevation 증거 (APPROVAL_JIT_EVIDENCE)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_9_JIT_ACCESS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_JIT_ACCESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_JIT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_JIT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_JIT_EVIDENCE`(SPEC §26)는 elevation 수명주기 전반의 **감사가능(auditable) 증거 묶음**이다. 저장 필드: Business Justification · Approval History · Risk Assessment · Session Monitoring · Command History · Access Log(SPEC §26). Digest(§27)의 입력이며, 사후검토(Emergency §8·Break-Glass §9)의 근거다. 본 엔티티는 **재활용 substrate가 가장 두터운** 축으로, 불변 해시체인 증거 저장소가 실존한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §26 증거 필드 | 판정 | 근거(GT 파일:라인) |
|---|---|---|
| 불변 증거 저장소(tamper-evident) | **PRESENT(재활용)** | SecurityAudit 해시체인 `SecurityAudit.php:12-53`(append-only prev_hash→hash)·`verify` `:56-68`(GT①§4-F) |
| Business Justification | **PARTIAL(재활용 선례)** | AccessReview justification 필수·append-only 이력 `AccessReview.php:62-80,:219-222`(GT①§4-E) |
| Approval History | **PARTIAL(마케팅축)** | maker-checker `decideAction()` `Alerting.php:598`·approvals_json `Db.php:592`(대상=마케팅, KEEP_SEPARATE) |
| Risk Assessment | **ABSENT** | GT②§2: 권한상승 risk scoring 0 |
| 결정→증거기록 패턴 | **PRESENT(재활용 선례)** | AccessReview 결정→SecurityAudit 증거 `AccessReview.php:224-233`(GT①§4-E) |
| break-glass 사후 증거 이벤트 | **PARTIAL** | `auth.breakglass` 전용 감사 `UserAuth.php:997-999`(mfa_bypassed=true) |
| Session Monitoring · Command History · Access Log | **ABSENT** | GT②§2: Runtime Monitoring 부재(런타임 감시·명령이력 0) |

★재활용 경계: SecurityAudit 해시체인(GT①§4-F)·AccessReview 증거(GT①§4-E)만 Evidence축 substrate로 재사용한다. Runtime Monitoring 계열 필드는 순신규.

## 3. 설계 계약 (필드·상태·제약)

| 항목 | 계약 |
|---|---|
| 필드 | Business Justification·Approval History·Risk Assessment·Session Monitoring·Command History·Access Log(SPEC §26) |
| 불변성 | SecurityAudit 불변 체인 확장(`SecurityAudit.php:12-53`+`verify` `:56-68`)·변조 시 broken_at(ADR D-2) |
| Justification 필수 | AccessReview append-only 이력 패턴(`AccessReview.php:62-80`) 계승 — 근거없는 grant 거부 |
| 증거 기록 경로 | 결정→SecurityAudit 증거(`AccessReview.php:224-233`) 동형 확장, `auth.breakglass`(`UserAuth.php:997-999`) 전례 |
| 테넌트 격리 | Tenant Isolation(SPEC §33) |
| 엔진 분리 | AccessReview=정적 api_key 검토, JIT Evidence=동적 상승 증거(ADR D-5, 중복엔진 금지) |

## 4. KEEP_SEPARATE (동음이의 흡수금지)

| 근접물 | 근거 | 분리 사유 |
|---|---|---|
| `menu_audit_log` | GT② B-8(`AdminMenu.php:98`) | 메뉴 감사체인=장식·verify 별도. SecurityAudit(보안 tamper-evident)와 별개 관심사 |
| `action_request` approvals_json | GT② B-1(`Db.php:592-600`) | 마케팅 결재이력 — elevation evidence로 개명 금지 |
| AccessReview 엔진 | GT② B-10(`AccessReview.php:24-29`) | 정적 api_key 검토 — 계승하되 엔진 분리 |

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정 = 재활용-substrate(Evidence축 최대) + 부분 ABSENT**. 불변 증거 저장소(SecurityAudit)·justification·증거기록 패턴은 실존 재활용(GT①§4-E·§4-F). Risk Assessment·Session Monitoring·Command History·Access Log는 순신규(GT②§2).
- **재활용 축**: SecurityAudit 해시체인(`SecurityAudit.php:12-53`)·AccessReview 증거(`AccessReview.php:224-233`)·`auth.breakglass` 전례(`UserAuth.php:997-999`).
- **선행 의존**: Part 1~3-8 인증 후 실 구현(BLOCKED_PREREQUISITE, ADR §4). 코드 변경 0 · Extend-only · 무후퇴.
