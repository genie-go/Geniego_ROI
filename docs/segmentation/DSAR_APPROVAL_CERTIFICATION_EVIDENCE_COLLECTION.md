# DSAR — Evidence Collection (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §11(Evidence Collection)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §11이 정의하는 Evidence는 Review Decision(승인/거부/회수)이 근거로 삼아야 하는 9종 증거 묶음이다 — Assignment History·Approval History·Login History·Access History·Business Justification·Manager Comment·Risk Report·Audit Report·Policy Evaluation. Reviewer가 "왜 이 배정을 유지/철회했는가"를 사후에 재구성 가능하게 만드는 것이 목적이며, D-4(ADR)가 요구하는 "Evidence 없는 Approve 금지"의 입력 계약이다. 본 문서는 9개 하위항목 각각에 대해 실 substrate 유무를 정직하게 판정하고, Certification Evidence Collector가 어느 substrate를 참조(Extend)해야 하는지 계약한다.

Evidence Collection은 Part 3-8 거버넌스 전체의 최하단 입력 계층이다 — §12 Attestation은 Evidence를 근거로 서명하고, §27 Certification Evidence Storage는 Evidence·Attestation을 함께 영구 보관한다. 이 계층이 부실하면 상위 계층 전부가 근거 없는 형식적 승인으로 전락하므로(가짜녹색), 9개 하위항목의 판정을 정확히 하는 것이 Part 3-8 전체 신뢰성의 출발점이다.

## 2. Ground-Truth (실 substrate 대조 / PARTIAL / ABSENT)

### 2.1 판정 요약 — **ABSENT(엔진) / PARTIAL(근접 substrate 산재)**

Ground-Truth ①·②의 결론대로 Evidence Collection이라는 **전용 수집기**(9종 증거를 하나의 Evidence 레코드로 묶어 Review Decision에 첨부하는 파이프라인)는 grep 0 — 순신규다. 다만 9개 하위항목 중 4개(Login History·Audit Report·Policy Evaluation·Access History 일부)는 **다른 목적으로 이미 기록되고 있는 필드/로그**를 재활용할 수 있다. 나머지 5개(Assignment History·Approval History·Business Justification·Manager Comment·Risk Report)는 소재 자체가 없는 완전 ABSENT다.

### 2.2 하위항목 대조표

| SPEC §11 하위항목 | 판정 | 실 substrate / 근거(허용목록 파일:라인) |
|---|---|---|
| Assignment History | ABSENT | 배정 변경 시점을 시계열로 조회하는 전용 이력 테이블 없음. `TeamPermissions.php:686`(`member_permissions_set`)·`:722`가 권한위임 이벤트를 `auth_audit_log`에 `risk='high'`로 남기는 것이 유일한 근접 흔적이나 이는 "배정 변경 로그"이지 "배정 이력 조회 API"가 아님 |
| Approval History | ABSENT | 승인/거부 결정 자체가 grep 0(§4·D-2). 로그할 대상 이벤트가 존재하지 않음 |
| Login History | PARTIAL | `UserAdmin.php:117`(`last_login` 최근 세션 조회)·`UserAuth.php:206`(세션 유휴/최종접속). 단일 최근값만 있고 시계열 이력 아님 |
| Access History | PARTIAL(얇음) | `backend/public/index.php:522`(api_key `last_used_at`·`use_count` 갱신)만 존재. 리소스별/엔드포인트별 접근 이력 아니고 키 단위 최종사용 시각뿐 |
| Business Justification | ABSENT | 배정/승인에 첨부되는 사유 텍스트 필드 grep 0 |
| Manager Comment | ABSENT | 검토 코멘트 저장 스키마 grep 0 |
| Risk Report | ABSENT | Certification 맥락의 위험보고서 substrate 없음. `ModelMonitor.php`·`AnomalyDetection.php`는 KEEP_SEPARATE(§2.3) |
| Audit Report | PARTIAL | `SecurityAudit.php:12`(append-only 해시체인)·`UserAuth.php:4165`(`auth_audit_log`)·`Compliance.php:133`(UNION 통합조회)가 감사 로그 원천은 제공하나, "이 배정에 대한 감사 리포트를 생성"하는 집계 API는 부재 |
| Policy Evaluation | PARTIAL | `TeamPermissions.php:393`(`effectiveForUser` — 역할별 유효권한 산출 + fail-closed) 자체가 정책평가 결과값이므로 Evidence로 스냅샷 가능 |

### 2.3 KEEP_SEPARATE

- `Attribution.php:379`~`:462`(evidence_json)는 마케팅 귀속 알고리즘의 근거(어느 채널이 전환에 기여했는지)를 기록하는 **귀속근거**이지 접근권한 검토증거가 아니다. 이름의 "evidence"만 유사할 뿐 도메인이 이질적이므로 Certification Evidence 스키마에 흡수·개명하지 않는다(형태만 참조 가능한 JSON 컬럼 패턴).

### 2.4 판정 근거 상세 — 왜 PARTIAL이 "충분"이 아닌가

- **Login History**: `UserAdmin.php:117`·`UserAuth.php:206`은 "가장 최근 1건"만 노출한다. Certification이 요구하는 것은 재인증 주기(예: 90일) 동안의 로그인 빈도·패턴이며, 이를 위해서는 세션 이력 테이블 자체를 시계열로 질의하는 신규 조회 계층이 필요하다 — 현재는 최신값 덮어쓰기 구조이므로 과거값이 남아있지 않을 수 있다.
- **Access History**: `index.php:522`는 api_key 단위 최종사용 시각·누적 호출수만 갱신한다. "어떤 엔드포인트를, 언제, 몇 번" 수준의 리소스별 접근 로그는 별도 수집 파이프라인(예: 미들웨어 로깅) 신설이 전제되어야 하며 현재는 존재하지 않는다.
- **Audit Report**: `SecurityAudit`·`auth_audit_log`·`Compliance.php:133`는 원시 로그 또는 UNION 조회는 제공하나, "특정 배정 1건에 한정된 감사 요약 리포트"를 생성하는 필터링·집계 계층이 없다. Reviewer가 로그 전체를 수동으로 훑어야 하는 상태와 "리포트가 있다"는 상태는 다르다.
- **Policy Evaluation**: `effectiveForUser`는 호출 시점의 즉시 계산값을 반환할 뿐 이력을 저장하지 않는다. Evidence로 쓰려면 Decision 시점에 그 결과를 스냅샷으로 고정(persist)해야 하며, 이 스냅샷 저장 로직 자체는 신규다.

## 3. Canonical 설계

### 3.1 레코드 구조

Evidence Collection은 Review Decision 1건당 정확히 1개의 불변(append-only) Evidence 레코드를 생성한다. 레코드는 9개 하위항목을 **각각 별도 컬럼/서브도큐먼트**로 보관하며, 값이 없는 항목은 `null`이 아니라 `"NOT_AVAILABLE"`로 명시(정직 부재 표시 — 값 없음과 미수집을 구분). Reviewer가 Decision을 내리기 전 Evidence 레코드가 최소 Login History + Policy Evaluation + Audit Report 3종을 갖추지 못하면 Decision 자체가 차단된다(§29 Runtime Guard `Missing Evidence`, D-4).

### 3.2 수집 트리거·입력 경로

Business Justification·Manager Comment는 Reviewer/Manager가 Decision 시점에 자유텍스트로 직접 입력하는 수집 경로이며 substrate 부재이므로 신규 입력 UI가 필요하다. 반면 Login History·Access History·Audit Report·Policy Evaluation은 Review Queue 아이템이 생성되는 순간 백그라운드에서 자동 수집되어야 하며(Reviewer가 수동으로 조회하지 않아도 이미 채워져 있는 상태), 이는 §11이 요구하는 "검토 착수 시점에 이미 준비된 근거"라는 취지에 부합한다.

### 3.3 불변성·소비 계약

Evidence 레코드는 생성 이후 수정 불가(D-4 불변성)이며 SecurityAudit로 이중 기록한다(D-2, 흡수 아님·참조). §12(Attestation) DSAR·§27(Certification Evidence Storage) DSAR은 본 레코드를 FK로 참조하는 소비자이며, 본 문서가 정의하는 Evidence Collection이 그 원천 데이터를 채우는 선행 계층이다.

## 4. Kernel/substrate 매핑

| SPEC §11 하위항목 | 재활용/승격 대상 substrate | 판정(신규/승격) |
|---|---|---|
| Login History | `UserAdmin.php:117`·`UserAuth.php:206` | 승격(단일값→시계열 확장 필요) |
| Access History | `index.php:522`(last_used_at) | 승격(키 단위→리소스 단위 확장 필요, 대부분 신규) |
| Audit Report | `SecurityAudit.php:12`·`UserAuth.php:4165`·`Compliance.php:133` | 승격(집계 리포트 레이어 신규) |
| Policy Evaluation | `TeamPermissions.php:393`(effectiveForUser) | 승격(결과 스냅샷화) |
| Assignment History | `TeamPermissions.php:686`·`:722` | 부분 승격(이벤트 로그는 있으나 조회 API 신규) |
| Approval History | 없음 | 완전 신규 |
| Business Justification | 없음 | 완전 신규 |
| Manager Comment | 없음 | 완전 신규 |
| Risk Report | 없음 | 완전 신규(KEEP_SEPARATE 모니터링 도메인과 별개) |

## 5. 무후퇴 · Extend

`effectiveForUser`(TeamPermissions.php:393)·`last_login`(UserAdmin.php:117)·`last_used_at`(index.php:522)·SecurityAudit 해시체인은 원래 목적(즉시 권한산정·최근접속 표시·자격증명 사용추적·보안감사)대로 **그대로 유지**하며 파괴·재구현하지 않는다(Golden Rule). Evidence Collector는 이들을 **읽기 전용으로 참조**해 Certification 전용 스냅샷을 신규 생성할 뿐, 원본 테이블/함수의 스키마나 호출 계약을 변경하지 않는다. `Attribution.php:379`(evidence_json)·`ModelMonitor.php`·`AnomalyDetection.php` 등 KEEP_SEPARATE 근접물은 이름 유사에도 불구하고 개명·통합하지 않고 각자 도메인에 존치한다(289차 후속 P1~P5 보안수정 산출물도 재플래그 없이 재활용 substrate로만 소비).

읽기 전용 참조 원칙의 실무 함의는 다음과 같다: Evidence Collector가 장애를 일으키더라도 `effectiveForUser`·`last_login`·`last_used_at`·SecurityAudit의 원래 소비자(런타임 권한산정·관리자 UI·자격증명 검증·보안감사 조회)는 영향을 받지 않는다. 이는 Certification 계층이 아직 BLOCKED_PREREQUISITE 상태에서 미구현이더라도 기존 시스템 동작에 어떠한 회귀도 발생시키지 않는다는 무후퇴 보장의 근거다.

## 6. 완료 게이트

- [ ] Part 1(Auth Registry)~3-7(ERRE) 선행 계보 CERTIFIED 완료 — 현재 BLOCKED_PREREQUISITE
- [ ] Evidence 레코드 스키마(9항목 + `NOT_AVAILABLE` 명시 규칙) 신규 구현 및 리뷰
- [ ] Assignment History 조회 API(현재 이벤트 로그만 존재) 설계·구현
- [ ] Approval History·Business Justification·Manager Comment·Risk Report 입력/저장 경로 신규 구현
- [ ] Audit Report 집계 레이어(SecurityAudit + auth_audit_log + Compliance UNION 기반) 구현
- [ ] Runtime Guard `Missing Evidence` 차단 규칙 구현·테스트
- [ ] Login History·Access History 시계열 조회 계층(현재 최신값 1건만 노출) 신규 구현
- [ ] Policy Evaluation 스냅샷 영속화(현재 즉시계산·비저장) 구현
- [ ] 코드 변경 0 유지 확인(본 문서는 설계 명세만)
- [ ] 코드 배포·인증(CERTIFIED) 전환 없음 확인

## 7. 반날조 인용 출처

- SPEC §11(Evidence Collection: Assignment/Approval/Login/Access History·Justification·Manager Comment·Risk/Audit Report·Policy Evaluation)
- ADR D-2(SecurityAudit 참조·흡수아님) · D-4(Attestation/Evidence 불변) · D-6(KEEP_SEPARATE) · D-7(정직분리)
- Ground-Truth ① §2-A(감사/증거 substrate: `SecurityAudit.php:12`·`UserAuth.php:4165`·`Compliance.php:133`) · §2-C(만료/휴면: `index.php:522`) · §2-D(위임: `TeamPermissions.php:393`)
- Ground-Truth ② §4(KEEP_SEPARATE 근접물 — `Attribution.php:379` evidence_json 형태만 재사용 패턴)
- ABSENT 항목(Approval History·Business Justification·Manager Comment·Risk Report·Assignment History 전용조회)은 grep 0 실측 — 근접물로 채우지 않음
- 본 문서는 §12(Attestation)·§27(Certification Evidence Storage) DSAR과 짝을 이루며, 세 문서 모두 동일 허용목록만 인용한다(교차 재인용 시에도 신규 파일:라인 창작 금지)
