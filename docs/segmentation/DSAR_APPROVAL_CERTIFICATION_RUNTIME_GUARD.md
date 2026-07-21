# DSAR — Certification Runtime Guard (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §29(Runtime Guard)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §29는 런타임에 다음 6개 이상 상태를 탐지해 즉시 차단하는 Guard 계층을 정의한다.

- **Missing Reviewer**: 검토자 미배정 상태에서 Certification 절차 진행 시도
- **Invalid Campaign**: 존재하지 않거나 종료된 Access Review 캠페인 참조
- **Expired Cert**: 유효기간 만료된 인증 상태에서의 권한 행사
- **Missing Evidence**: 근거(§26 Evidence) 없는 Decision 기록 시도
- **Unauthorized Decision**: 권한 없는 주체의 판정 시도
- **Duplicate Review**: 동일 대상에 대한 중복 검토 레코드 생성 시도

Runtime Guard는 §26(Snapshot)·§28(Digest)이 "무엇을 저장/증명하는가"를 정의하는 데 비해, **행위 시점에 무엇을 막아야 하는가**를 정의하는 능동적 방어 계층이다.

## 2. Ground-Truth (실 substrate 대조 / PARTIAL / ABSENT)

### 2.1 판정 요약 — **ABSENT(거버넌스 자체)** / **PARTIAL(근접 fail-secure 가드 존재)**

Ground-Truth ①·②의 실측 결론에 따르면, "Missing Reviewer/Invalid Campaign/Expired Cert/Missing Evidence/Unauthorized Decision/Duplicate Review"라는 Certification 전용 6종 차단 로직은 grep 0이다. 그러나 이 도메인은 다른 5개 엔티티(Snapshot/Digest 등)보다 판정이 미묘하다 — 프로젝트 전역에는 **동일한 fail-secure 철학**(만료/위조/월권을 차단)을 구현한 근접 가드가 이미 여러 개 존재하며, 이들은 Certification 전용은 아니지만 **같은 설계 원칙의 선례**로 재활용 가능하다.

### 2.2 하위항목 대조표

| SPEC 하위항목 | 판정 | 실 substrate / 근거(허용목록 파일:라인) |
|---|---|---|
| Missing Reviewer 차단 | ABSENT | grep 0. 근접(형태만): `PM/Assignees.php:14`(reviewer role enum) — 열거형 정의일 뿐 배정 여부 런타임 검증 없음 |
| Invalid Campaign 차단 | ABSENT | grep 0. Campaign 개념 자체가 §28과 동일하게 부재(`AdminGrowth.php:1040` 캠페인은 KEEP_SEPARATE) |
| Expired Cert 차단 | PARTIAL(근접 만료 가드 존재) | `index.php:518`(expires 강제) — API 키 만료 강제 차단 패턴. Certification 만료 검증 아니지만 **"만료=거부" fail-secure 철학의 직접 선례** |
| Missing Evidence 차단 | ABSENT | grep 0. Evidence 저장 자체가 §26에서 ABSENT이므로 차단 로직도 종속적으로 부재 |
| Unauthorized Decision 차단 | PARTIAL(근접 권한초과 가드 존재) | `TeamPermissions.php:641`(putMemberPermissions) — 권한초과 요청 시 403 반환. Decision 권한 검증 아니지만 **"권한 없는 자의 쓰기 시도=차단" 패턴의 직접 선례** |
| Duplicate Review 차단 | ABSENT | grep 0. 멱등성/중복 방지 로직은 이 도메인에 없음 |
| Tenant 위조 차단(경계 조건) | PARTIAL(인접 원칙, Certification 전용 아님) | `index.php:604`·`:608`(tenant 위조차단) — Certification 자체는 아니나 Runtime Guard가 반드시 갖춰야 할 "요청 주체 위조 차단"의 동일 원칙 |

### 2.3 KEEP_SEPARATE (해당 시)

- `index.php:518`(expires 강제)·`:604`·`:608`(tenant 위조차단) — API 키/세션 인증 미들웨어의 만료·위조 차단이며, Certification의 "인증서(cert) 만료" 개념과 이름은 유사하나 검증 대상(요청 인증 vs 권한 재검토 상태)이 다르다. Runtime Guard 설계 시 **철학만 계승**하고 코드는 공유하지 않는다.
- `TeamPermissions.php:641`(putMemberPermissions) — 팀 멤버 권한 설정 시 상한 초과를 막는 가드이며, Certification Decision의 Unauthorized 차단과 목적은 유사하나 적용 대상(팀 권한 설정 vs 인증 판정 행위)이 다르다. 직접 재사용이 아니라 **패턴 계승**.
- `PM/Assignees.php:14`(reviewer role enum) — 순수 오탐. PM 도메인의 리뷰어 역할 열거형이며 Access Review 배정 검증 로직이 전혀 없다.

## 3. Canonical 설계

Runtime Guard는 각 위반 유형에 대해 **차단 우선(fail-secure) + 명시적 에러 코드**(§31 Error Contract와 연동)를 반환한다.

- **Missing Reviewer**: Certification 절차 진입 시 `reviewer_id`가 유효한 활성 계정에 배정되어 있는지 사전 검증. 미배정 시 즉시 거부(진행 자체를 차단).
- **Invalid Campaign**: `campaign_id`가 존재하고 상태가 `ACTIVE`인지 검증. 종료/미존재 캠페인 참조 시 거부.
- **Expired Cert**: `index.php:518` 패턴을 계승 — 만료 시각 경과 시 해당 인증서 기반 권한 행사를 즉시 무효화(재인증 요구).
- **Missing Evidence**: Decision 기록 시 §26 Evidence 필드가 비어있으면 Decision 자체를 거부(증거 없는 판정 금지).
- **Unauthorized Decision**: `TeamPermissions.php:641` 패턴을 계승 — 판정 주체의 실효 권한(§26 Permission 스냅샷)을 대조해 권한 밖 판정 시도를 403으로 거부.
- **Duplicate Review**: 동일 `(subject_id, campaign_id)` 조합에 대해 진행 중(§26 Review State ≠ 종결)인 레코드가 있으면 신규 생성 요청을 거부(멱등키 또는 유니크 제약).
- **UNKNOWN 상태 처리**: 위 6종 판정 중 하나라도 모호(예: campaign 상태 조회 실패, reviewer 조회 타임아웃)하면 **거부를 기본값**으로 한다(ADR D-4·D-7 — 모호성은 승인이 아니라 차단).

## 4. Kernel/substrate 매핑

| SPEC 하위항목 | 재활용/승격 대상 substrate | 판정(신규/승격) |
|---|---|---|
| 만료 차단 철학 | `index.php:518`(expires 강제) | 승격(패턴 계승, Certification 전용 만료 필드는 신규) |
| 요청 주체 위조 차단 철학 | `index.php:604`·`:608`(tenant 위조차단) | 승격(패턴 계승) |
| 권한초과 차단 철학 | `TeamPermissions.php:641`(putMemberPermissions) | 승격(패턴 계승, Decision 권한 검증은 신규 로직) |
| Missing Reviewer 검증 | 없음(`PM/Assignees.php:14`는 열거형뿐) | 신규 |
| Invalid Campaign 검증 | 없음 | 신규 |
| Missing Evidence 검증 | 없음(§26 종속) | 신규 |
| Duplicate Review 검증(멱등) | 없음 | 신규 |

## 5. 무후퇴 · Extend

- `index.php`의 인증 미들웨어(만료·tenant 위조 차단 부분)는 수정하지 않는다. Runtime Guard는 별도 계층(Certification 액션 진입점)에서 유사 철학을 **독립적으로 구현**한다(Golden Rule — Extend, not Merge into existing middleware).
- `TeamPermissions.php:641`의 putMemberPermissions는 그대로 유지하며, Decision 권한 검증 로직이 이 함수를 호출·재사용하지 않고 별도 함수로 신설한다(책임 분리, 무후퇴).
- P1~P5(289차 writeGuard 서버전역 등)는 API 계층의 fail-secure 강제이며, Certification Runtime Guard는 그 위에 **도메인 특화 계층**으로 추가된다 — P1~P5를 대체하지 않는다.
- §26(Snapshot)의 Permission/Evidence 필드가 확정되어야 Unauthorized Decision·Missing Evidence 가드가 실 데이터를 참조할 수 있다(선행 의존성).

## 5-A. 6종 위반 유형별 우선순위 (설계 참고)

구현 순서상 아래 우선순위를 SPEC 확정 단계에 제안한다(모두 코드 미착수, 순서 제안일 뿐).

1. **Expired Cert** — `index.php:518` 만료 강제 패턴이 가장 직접적인 선례이므로 구현 난이도가 낮음.
2. **Unauthorized Decision** — `TeamPermissions.php:641` putMemberPermissions의 403 반환 패턴을 계승하면 되므로 두 번째로 난이도가 낮음.
3. **Missing Reviewer / Invalid Campaign** — §26 Assignment, §28 Campaign이 먼저 정의되어야 검증 가능(순신규 로직 + 선행 의존).
4. **Missing Evidence** — §26 Evidence 필드 확정에 강하게 종속.
5. **Duplicate Review** — 멱등키 설계가 별도로 필요해 상대적으로 후순위.

### 5-B. 타 Part 3-8 엔티티와의 관계

- §26(Snapshot)의 Permission/Evidence/Assignment 필드는 본 Guard의 1차 데이터 원천이다.
- §28(Digest)의 Version 필드는 Expired Cert 판정 시 "오래된 digest 알고리즘으로 생성된 인증"을 별도로 취급할지 여부의 입력이 될 수 있다.
- §31(Error Contract)은 본 문서 6종 위반이 API 소비자에게 노출되는 최종 형태이며, 매핑은 다대다일 수 있다(예: Duplicate Review가 별도 에러 코드로 세분화될 가능성).
- §32(Warning Contract)의 Review Due Soon·SLA At Risk는 본 Guard의 차단 트리거(Expired Cert, REVIEW_OVERDUE 계열)보다 **선행 단계**로 발신되는 비차단 신호다 — Guard가 차단하기 전에 Warning이 먼저 경고해야 한다는 순서 관계를 SPEC에 명시한다.

## 6. 완료 게이트

- [ ] BLOCKED_PREREQUISITE 해소: §26 Snapshot 필드 확정(Permission/Evidence 참조원)
- [ ] 6종 차단 유형별 에러 코드 매핑(§31 Error Contract와 정합)
- [ ] UNKNOWN 상태 fail-secure 기본 동작 재확인(승인 아님, 거부)
- [ ] Duplicate Review 멱등키 설계 확정
- [ ] 기존 index.php/TeamPermissions.php 가드와의 계층 분리 검증(공유 대신 독립 구현)
- [ ] §32 Warning Contract와의 선후 관계(경고 선행 → 차단 후행) 검증
- [ ] 코드 변경 0 유지 확인
- [ ] NOT_CERTIFIED 상태 유지 — 실 구현은 별도 승인 세션

## 7. 반날조 인용 출처

- SPEC §29(Runtime Guard)
- ADR D-4(Attestation/Evidence 불변, UNKNOWN 거부) · D-7(정직분리) · D-6(KEEP_SEPARATE)
- Ground-Truth ① §(index.php 만료/tenant 가드, TeamPermissions 권한초과 가드) · ② §(PM/Assignees 순수오탐)
- ABSENT 항목(Missing Reviewer/Invalid Campaign/Missing Evidence/Duplicate Review 전용 로직)은 grep 0 실측 명시 — Expired Cert·Unauthorized Decision은 PARTIAL(철학 선례만 존재, Certification 전용 구현 아님)로 과장 없이 판정
