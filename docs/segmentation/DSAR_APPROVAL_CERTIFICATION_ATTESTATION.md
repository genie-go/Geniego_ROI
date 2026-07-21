# DSAR — Attestation (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §12(Attestation)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §12는 Review Decision에 5종 Attestation(User·Manager·Owner·Security·Compliance) 주체가 전자서명 + timestamp로 "이 검토 결정에 동의/확인한다"를 기록할 것을 요구한다. Attestation은 Evidence(§11, Part 3-8 별도 DSAR)와 짝을 이루는 개념으로, Evidence가 "무엇을 근거로 판단했는가"라면 Attestation은 "누가 이 판단을 자신의 서명으로 확정했는가"다. SOX/SOC2 등 컴플라이언스 감사는 Attestation의 부인방지(non-repudiation)를 요구하므로, 본 문서는 5종 주체별 Attestation의 실 substrate 유무를 판정하고 SecurityAudit 해시체인을 서명기록 기반으로 참조하는 계약을 정의한다.

부인방지가 없으면 Reviewer가 "나는 승인한 적 없다"고 사후에 부인할 때 이를 반증할 수단이 없다 — 이는 감사 신뢰성의 근본 취약점이다. Attestation은 이 취약점을 막는 최소 요건이며, Evidence Collection(§11)이 채운 근거 위에 "누가 최종 책임을 서명했는가"를 얹는 마지막 확정 단계다.

## 2. Ground-Truth (실 substrate 대조 / PARTIAL / ABSENT)

### 2.1 판정 요약 — **ABSENT**

Ground-Truth ①·②가 확정한 대로 "Attestation"(전자서명+timestamp가 결합된 확인 레코드) 개념은 GeniegoROI 코드베이스에 **grep 0**다. `certif`/`attest`/`reviewer` 매칭은 전부 타 도메인 오탐(SAML X.509 CERTIFICATE·상품 인증필드·PM reviewer 역할)이며, 5종 주체(User/Manager/Owner/Security/Compliance) 중 어느 하나도 Certification 맥락에서 서명 확인을 남기는 경로가 없다. 다만 Attestation이 요구하는 **"무결성이 검증 가능한 append-only 기록"이라는 인프라 성격**은 SecurityAudit 해시체인이 이미 제공하므로, Attestation 저장 계층은 이를 참조(반영은 하되 흡수는 아님)해야 한다.

이 판정은 Part 3-7(ERRE)의 결론보다도 더 얇다 — ERRE는 최소한 effective 계산 substrate(`effectiveForUser`)를 가지고 있었으나, Attestation은 "서명 확인"이라는 개념 자체가 어느 도메인에도 존재하지 않는 순수 그린필드다.

### 2.2 하위항목 대조표

| SPEC §12 하위항목 | 판정 | 실 substrate / 근거(허용목록 파일:라인) |
|---|---|---|
| User Attestation | ABSENT | 사용자 본인이 자신의 배정을 확인 서명하는 경로 grep 0 |
| Manager Attestation | ABSENT | 매니저 승인 서명 경로 grep 0. `TeamPermissions.php:641`(putMemberPermissions)은 권한 위임 실행이지 서명 확인이 아님 |
| Owner Attestation | ABSENT | 테넌트 Owner 서명 경로 grep 0 |
| Security Attestation | ABSENT | 보안 담당자 서명 경로 grep 0 |
| Compliance Attestation | ABSENT | 컴플라이언스 담당자 서명 경로 grep 0 |
| 전자서명 메커니즘 | ABSENT | 서명 알고리즘/키 관리 substrate 없음. PKI·비대칭키 서명 인프라 자체가 부재하며, §3.1의 세션 기반 해시 결합 방식이 최소 대안 |
| Timestamp 무결성 | PARTIAL(인프라 근접) | `SecurityAudit.php:12`(클래스)·`:56`(verify)·`:63`(hash_chain)가 append-only 해시체인으로 기록시점 무결성을 이미 검증 가능 — Attestation 저장에 이 패턴을 **참조**할 수 있음(신규 Attestation 전용 레코드가 필요하며 SecurityAudit 자체를 Attestation으로 대체하지 않음) |

전자서명 메커니즘 자체(PKI·비대칭키)도 부재하므로, §3.1이 제시하는 세션 기반 해시 결합 방식이 최소 실행 가능한 대안이 된다. 이는 완전한 전자서명 표준(예: 전자서명법상 공인전자서명)을 요구하지 않는 내부 통제 목적의 Attestation에는 충분하나, 외부 규제기관 제출용 증빙으로 격상하려면 별도 PKI 도입이 추가로 필요하다는 점을 명시해 둔다.

### 2.3 KEEP_SEPARATE

- `password_verify` — 로그인 시 비밀번호 해시 대조 함수. 신원 인증(authentication)이지 검토 결정에 대한 서명 확인(attestation)이 아니다.
- `Dsar.php:335`(본인확인) — DSAR(정보주체 권리행사) 요청자가 본인임을 확인하는 절차로, 개인정보보호법 맥락의 본인확인이며 Access Certification Attestation과 목적·주체·트리거가 전혀 다르다. 이름의 유사성("확인")만으로 흡수·개명하지 않는다.

### 2.4 판정 근거 상세

`password_verify`는 로그인 시점의 신원확인(authentication)이며 그 결과가 "이 특정 Review Decision에 동의한다"는 의미로 저장되지 않는다 — attestor가 이미 로그인해 있다는 사실과, 그가 특정 결정에 서명했다는 사실은 별개다. `Dsar.php:335`도 마찬가지로 DSAR 요청 시점의 본인확인이며 검토 결정과 무관한 별개 트랜잭션이다. 두 substrate 모두 Attestation이 필요로 하는 "결정 본문과 결합된 서명"이라는 핵심 속성을 제공하지 않으므로 PARTIAL로도 격상하지 않고 KEEP_SEPARATE로 명확히 분리한다.

## 3. Canonical 설계

### 3.1 레코드 구조

Attestation 레코드는 Review Decision 1건당 0~N개(5종 주체별 최대 1개씩) 생성되며, 각 레코드는 `{attestor_role, attestor_user_id, decision_id, statement, signed_at, signature_hash}`를 갖는다. `signature_hash`는 attestor의 세션 인증 컨텍스트(이미 인증된 세션 — 신규 서명 인프라가 아니라 기존 로그인 신뢰를 전제)와 Decision 본문을 결합한 해시로, SecurityAudit에 `log()`로 append-only 기록되어 `verify()`로 사후 무결성 검증이 가능하다(D-2: 참조이지 흡수 아님 — Attestation은 SecurityAudit의 하위 레코드 타입이 아니라 별도 스키마이며, SecurityAudit는 그 기록을 감사 트레일로 이중 보관할 뿐).

### 3.2 필수 조합·불변성

D-4에 따라 Attestation은 생성 후 수정·삭제 불가(불변)이며, 5종 주체 중 정책상 필수로 지정된 주체(예: High Risk 배정은 Security+Compliance 둘 다 필수)의 Attestation이 누락되면 Decision이 `Closed` 상태로 전이할 수 없다. 필수 조합은 Risk Evaluation(§27 Certification Evidence Storage 참조)에 따라 동적으로 달라지며, 최소 조합은 항상 User Attestation 1건이다(fail-secure — 아무 주체도 서명하지 않은 Decision은 존재할 수 없음).

### 3.3 상위·하위 계층 연계

Attestation은 §11 Evidence 레코드를 statement 작성 시점에 참조하며(Evidence 없이 서명 불가, D-4), §27 Certification Evidence Storage는 완성된 Attestation 레코드 집합을 최종 저장물의 일부로 포함한다. 세 계층은 Evidence → Attestation → Storage 순서의 파이프라인을 이룬다.

## 4. Kernel/substrate 매핑

| SPEC §12 하위항목 | 재활용/승격 대상 substrate | 판정(신규/승격) |
|---|---|---|
| Timestamp 무결성/append-only 저장 | `SecurityAudit.php:12`·`:56`·`:63` | 승격(패턴 참조 — 신규 Attestation 스키마가 SecurityAudit에 이중 기록) |
| Attestor 신원(이미 인증된 세션) | `UserAuth.php` 세션 인증 substrate(간접 전제, 직접 인용 없음) | 참조 전제(신규 서명 인프라 불필요) |
| User/Manager/Owner/Security/Compliance 5종 레코드 | 없음 | 완전 신규 |
| 전자서명 알고리즘 | 없음 | 완전 신규 |

승격 대상은 전부 "기록 시점의 무결성 검증"에 국한되며, "누가 서명했는가"의 신원 확인 자체는 attestor가 이미 통과한 세션 인증(로그인)을 전제로 재사용할 뿐 신규 인증 메커니즘을 만들지 않는다. 이는 Attestation이 별도 PKI/전자서명 인프라 없이도 "세션 인증 + 해시체인 기록"의 조합만으로 최소 요건을 충족시킬 수 있음을 의미하며, 향후 구현 범위를 좁히는 설계 판단이다.

## 5. 무후퇴 · Extend

`SecurityAudit`의 `log`/`verify`/`hash_chain` 계약은 원래의 보안감사 목적(모든 관리 행위의 append-only 트레일)대로 그대로 유지되며, Attestation을 위해 SecurityAudit의 스키마나 API를 변경하지 않는다(D-1 Extend·Wrap). Attestation은 SecurityAudit가 제공하는 무결성 검증 패턴을 **참조해 신규 스키마를 얹는 방식**으로만 구현되어야 하며, SecurityAudit를 "Attestation 엔진"으로 개명·흡수하지 않는다(D-2). `password_verify`·`Dsar.php:335` 본인확인 로직은 각자 목적(로그인 인증·DSAR 본인확인)대로 변경 없이 유지된다.

이 원칙이 지켜지지 않으면(즉 SecurityAudit 스키마를 Attestation 전용 컬럼으로 변형하면) SecurityAudit의 `verify()`(`:56`)를 소비하는 기존 무결성 검증 경로가 예기치 않게 영향을 받을 위험이 있다. D-1·D-2를 지키는 것은 단순한 설계 미학이 아니라 실질적 회귀 방지 조치다.

## 6. 완료 게이트

- [ ] Part 1~3-7 선행 계보 CERTIFIED 완료 — 현재 BLOCKED_PREREQUISITE
- [ ] Attestation 레코드 스키마(5종 주체·statement·signed_at·signature_hash) 신규 설계·구현
- [ ] SecurityAudit 이중 기록 연동(참조 전용, SecurityAudit 스키마 변경 없음) 구현
- [ ] 주체별 필수 Attestation 정책(Risk 기반 필수 조합) 설계
- [ ] Decision `Closed` 전이 시 필수 Attestation 누락 차단(Runtime Guard) 구현
- [ ] Risk 기반 필수 조합 결정 로직(§27 Risk Evaluation 연동) 설계
- [ ] §11 Evidence 레코드 참조 없이는 Attestation 작성 불가하도록 하는 선행 의존 강제 구현
- [ ] 코드 변경 0 유지 확인(본 문서는 설계 명세만)
- [ ] 코드 배포·인증(CERTIFIED) 전환 없음 확인
- [ ] Ground-Truth ①·② 재조사 없이 CERTIFIED 전환 금지(반날조 원칙 유지 확인)
- [ ] 전자서명 표준(내부 통제 vs 외부 규제 제출용 PKI) 채택 범위 확정

## 7. 반날조 인용 출처

- SPEC §12(Attestation: User/Manager/Owner/Security/Compliance Attestation·전자서명+Timestamp)
- ADR D-2(SecurityAudit 참조·흡수아님) · D-4(Attestation/Evidence 불변) · D-6(KEEP_SEPARATE) · D-7(정직분리)
- Ground-Truth ① §2-A(`SecurityAudit.php:12`·`:56`·`:63` 해시체인)
- Ground-Truth ② §4(KEEP_SEPARATE — KYC/verify 도메인)
- ABSENT 항목(5종 Attestation 레코드·전자서명 메커니즘)은 grep 0 실측 — `password_verify`·`Dsar.php:335` 근접물로 채우지 않음
- 본 문서는 §11(Evidence Collection)·§27(Certification Evidence Storage) DSAR과 짝을 이루며, 세 문서 모두 동일 허용목록만 인용한다(교차 재인용 시에도 신규 파일:라인 창작 금지)
