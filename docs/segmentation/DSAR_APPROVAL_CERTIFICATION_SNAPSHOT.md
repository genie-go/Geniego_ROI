# DSAR — Certification Snapshot (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §26(Certification Snapshot)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §26은 Access Review(접근권한 재검토) 시점에 검토 대상의 상태를 **불변 스냅샷**으로 고정 저장하는 계층을 정의한다. Role Certification & Access Review는 "지금 이 순간의 권한 상태가 검토·승인되었다"는 사실을 시간이 지나도 재현·증명할 수 있어야 하며, 이를 위해서는 검토 시점의 다음 7개 축이 하나의 불변 레코드로 동결되어야 한다.

- **Review State**: 검토 진행 단계(대기/진행/완료/반려 등)
- **Decision**: 검토자의 최종 판정(승인/거부/조건부 유지 등)
- **Evidence**: 판정 근거(로그·사용 이력·이상행위 신호 등)
- **Assignment**: 검토 대상 역할/권한이 부여된 주체(사용자·서비스 계정)
- **Permission**: 검토 시점의 실효 권한 집합(scope 포함)
- **Scope**: 권한이 적용되는 테넌트/리소스 경계
- **Timestamp**: 스냅샷 동결 시각(변경 불가)

이 7개 축이 하나로 묶여 저장되지 않으면, 이후 감사 시점에 "그때 무엇이 검토·승인되었는지"를 재구성할 수 없다 — 이는 SPEC §26이 전제하는 Access Review 거버넌스의 최소 요건이다.

## 2. Ground-Truth (실 substrate 대조 / PARTIAL / ABSENT)

### 2.1 판정 요약 — **ABSENT**

Ground-Truth ①·②의 실측 결론에 따르면, "Review State + Decision + Evidence + Assignment + Permission + Scope + Timestamp"를 하나의 불변 레코드로 동시에 스냅샷하는 엔진·테이블·클래스는 코드베이스 전체에서 **grep 0**이다. 이 도메인은 순신규(그린필드)이며, 근접 재활용 가능한 substrate가 부분적으로 존재할 뿐 그 substrate들 자체가 Certification Snapshot 목적으로 설계된 바 없다.

### 2.2 하위항목 대조표

| SPEC 하위항목 | 판정 | 실 substrate / 근거(허용목록 파일:라인) |
|---|---|---|
| Review State 저장 | ABSENT | grep 0. 근접 상태전이 패턴만 존재: `TeamPermissions.php:517`(팀 status), `AgencyPortal.php:69`(agency_client_link 상태전이) — 둘 다 access review 상태머신 아님(§2.3 참조) |
| Decision 저장 | ABSENT | grep 0. 근접: `Alerting.php:571`~`:723`(decideAction) — 마케팅 승인 결정이며 권한 검토 결정 아님(KEEP_SEPARATE) |
| Evidence 저장(불변) | ABSENT | grep 0. 형태만 유사: `Attribution.php:379`~`:462`(evidence_json) — 귀속 근거이지 접근권한 증거 아님(형태만 재활용 가능, §4 참조) |
| Assignment 저장 | ABSENT | grep 0. 근접: `PM/Assignees.php:14`(reviewer role enum) — 순수 열거형으로 검토자 배정 레코드 아님 |
| Permission(실효 권한) 스냅샷 | ABSENT | grep 0. 실효권한 산출 자체는 존재: `TeamPermissions.php:393`(effectiveForUser) — 그러나 이는 **런타임 조회**이지 시점 동결 스냅샷이 아님 |
| Scope 저장 | ABSENT | grep 0. scope 상한 로직 존재: `TeamPermissions.php:356`(scopeWithinCap) — 상한 검증이지 스냅샷 아님 |
| Timestamp(불변 동결) | ABSENT | grep 0. append-only 불변기록 패턴은 별도 도메인에 존재: `SecurityAudit.php:8`(append-only 주석)·`:12`(클래스) — 감사로그이지 Certification 스냅샷 아님 |

### 2.3 KEEP_SEPARATE (해당 시)

- `TeamPermissions.php:517`·`:557`(팀 status) — 팀 소속 활성/비활성 상태전이일 뿐, "검토·승인되었다"는 인증(attestation) 의미가 없다. Access Review 스냅샷이 아니다.
- `Alerting.php:571`~`:723`(action_request decideAction/executeAction) — 마케팅 캠페인 집행 승인이며, 권한(role/permission) 검토와 무관하다. 이름의 "decide"가 유사할 뿐 대상이 다르다.
- `Attribution.php:379`~`:462`(evidence_json) — 마케팅 귀속 근거 데이터 구조이며, 접근권한 검토 증거가 아니다. **형태(JSON evidence 컬럼)만** 재활용 가능(§4).

## 3. Canonical 설계

Snapshot 레코드는 다음 계약을 따른다(신규 설계, 코드 미구현):

- **원자성**: 7개 축은 단일 트랜잭션으로 동시에 기록된다. 부분 기록 금지(fail-secure — 부분 스냅샷은 UNKNOWN으로 간주해 거부).
- **불변성**: 기록 후 UPDATE 금지. 정정이 필요하면 새 스냅샷 레코드를 추가하고 이전 레코드는 `superseded_by`로 연결(append-only, `SecurityAudit.php:8` 패턴 준용).
- **식별자**: `snapshot_id`(PK) · `subject_id`(검토 대상 role/permission 보유자) · `reviewer_id` · `tenant_id`(테넌트 격리 필수).
- **Review State enum**: `PENDING | IN_REVIEW | CERTIFIED | REJECTED | EXPIRED`.
- **Evidence는 구조화 JSON**: 자유 텍스트 금지, 근거 유형(사용 로그 참조/이상행위 신호/직전 인증 이력) 태깅 필수.
- **Scope는 명시적 경계 객체**: 테넌트+리소스+action 3축 최소 포함(`TeamPermissions.php:356` scopeWithinCap의 상한 개념을 승격).
- **Timestamp는 서버 시각 단일 소스**(클라이언트 제공 시각 신뢰 금지 — fail-secure).

## 4. Kernel/substrate 매핑

| SPEC 하위항목 | 재활용/승격 대상 substrate | 판정(신규/승격) |
|---|---|---|
| 불변기록 패턴(append-only) | `SecurityAudit.php:12`(클래스)·`:8`(append-only 주석) | 승격(패턴 차용, 별도 테이블) |
| 스냅샷 저장 패턴(구조) | `AdminMenu.php:200`(menu_defaults snapshot) | 승격(구조 차용 — 메뉴 기본값 스냅샷과 동일한 "특정 시점 상태 동결" 패턴을 Certification 도메인에 이식) |
| 실효 권한 조회 | `TeamPermissions.php:393`(effectiveForUser) | 승격(스냅샷 생성 시점의 입력값으로 소비, 로직 자체는 재사용) |
| Scope 상한 개념 | `TeamPermissions.php:356`(scopeWithinCap) | 승격(경계 객체 설계에 반영) |
| Evidence 컬럼 형태 | `Attribution.php:379`~`:462`(evidence_json) | 승격(컬럼 타입/저장방식만 차용, 의미 도메인은 완전히 신규) |
| Review State 상태머신 | 없음 | 신규 |
| Decision 레코드 | 없음 | 신규 |
| Assignment 레코드 | 없음 | 신규 |

## 5. 무후퇴 · Extend

- `SecurityAudit.php`는 손대지 않는다. Certification Snapshot은 그 **패턴**(append-only, hash 검증 가능성)을 참조할 뿐 별도 테이블/클래스로 신설한다(Golden Rule — Extend, not Replace).
- `AdminMenu.php:200`의 menu_defaults snapshot 로직은 수정하지 않는다. "특정 시점 상태를 동결 저장한다"는 구조적 아이디어만 차용한다.
- `TeamPermissions.php:393`(effectiveForUser)·`:356`(scopeWithinCap)은 Snapshot 생성 로직이 **호출**하는 입력원으로만 취급하며, 두 함수 자체의 시그니처·동작은 변경하지 않는다.
- KEEP_SEPARATE로 분류된 `Alerting.php`·`Attribution.php`·`TeamPermissions.php` 상태전이 로직은 Certification 스냅샷으로 흡수·개명하지 않는다.
- P1~P5(289차 writeGuard 서버전역·featurePlan fail-secure·admin_roles 폐기·admin SSOT·세션토큰 hash-only)는 그대로 유지되며 본 설계가 그 위에 얹힌다는 전제만 기록한다(실 구현은 후속 세션).

## 5-A. 타 Part 3-8 엔티티와의 관계

- §28(Digest)은 본 §26 Snapshot을 입력으로 소비한다 — Snapshot이 먼저 확정되지 않으면 Digest의 `snapshot_id` 참조가 정의될 수 없다(강한 선행 의존성).
- §29(Runtime Guard)의 Unauthorized Decision·Missing Evidence 가드는 본 문서의 Permission/Evidence 필드를 실 데이터 원천으로 참조한다.
- §32(Warning Contract)의 Certification Drift 경고는 본 문서 Snapshot 시점의 Permission/Scope와 현재 실효 권한(`TeamPermissions.php:393`)의 차이를 비교하는 기준점으로 본 Snapshot을 사용한다.
- 따라서 §26은 Part 3-8 6개 엔티티 중 **가장 하류에 있는 다른 5개가 공통으로 의존하는 기초 계층**이다 — 구현 착수 시 최우선 순위가 되어야 한다는 점을 SPEC 확정 단계에 명시한다.

## 6. 완료 게이트

- [ ] BLOCKED_PREREQUISITE 해소: Part 1(Foundation)~Part 3-7(ERRE) 선행 완결 확인
- [ ] Review State 상태머신 SPEC 확정 및 리뷰
- [ ] Evidence 구조화 스키마(JSON 태깅 규칙) 확정
- [ ] Scope 경계 객체(tenant+resource+action) 확정
- [ ] Snapshot 불변성 강제 방식(DB 트리거 vs 애플리케이션 레벨) 결정
- [ ] Assignment 레코드와 기존 role/permission 부여 테이블(선행 Part 3-1~3-4 Role Registry/Hierarchy/Assignment/Scoped 산출물) 간 참조 무결성 설계
- [ ] 타 Part 3-8 엔티티(§28/§29/§32)의 Snapshot 참조 인터페이스 사전 합의
- [ ] 코드 변경 0 유지 확인(본 문서는 설계 명세로만 존재)
- [ ] NOT_CERTIFIED 상태 유지 — 실 구현 착수 전 별도 승인 세션 필요

## 7. 반날조 인용 출처

- SPEC §26(Certification Snapshot)
- ADR D-4(Attestation/Evidence 불변) · D-6(KEEP_SEPARATE) · D-7(정직분리)
- Ground-Truth ① §(SecurityAudit/AdminMenu/TeamPermissions substrate 목록) · ② §(마케팅 approval/모니터링 KEEP_SEPARATE 목록)
- ABSENT 항목(Review State/Decision/Assignment 레코드)은 grep 0 실측 명시 — 근접물(Alerting decideAction, Attribution evidence_json)로 채우지 않음
