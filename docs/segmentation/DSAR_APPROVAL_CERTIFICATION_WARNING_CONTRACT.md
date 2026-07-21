# DSAR — Certification Warning Contract (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §32(Warning Contract)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §32는 §31(Error Contract)의 **차단성 에러**와 대비되는 **비차단(non-blocking) 경고** 계약을 정의한다. Certification 거버넌스가 모든 이상 신호에 즉시 차단으로 대응하면 운영 마비(false positive에 의한 업무 중단)를 유발할 수 있으므로, "곧 문제가 될 상태"를 사전 경고해 자연스러운 시정을 유도하는 계층이 필요하다. §32 5종:

- **Review Due Soon**: 검토 기한이 임박(만료 전 사전 알림)
- **Campaign Expiring**: Access Review 캠페인 자체의 종료가 임박
- **Reviewer Overloaded**: 특정 검토자에게 과도한 검토 건수가 몰림
- **Certification Drift**: 인증 시점 이후 권한/역할 구성이 변경되어 인증 상태와 실제 상태가 괴리
- **SLA At Risk**: 검토 SLA(예: 30일) 위반 임박

5종 모두 공통적으로 "지금 당장 차단할 필요는 없으나, 담당자가 인지하고 조치하지 않으면 §31(Error Contract)의 차단 상태로 전환될 것"이라는 시제 구조를 갖는다. 이 시제 구조(현재 정상 → 방치 시 미래 위반)가 Warning과 Error를 구분하는 근본 기준이다(§5-A에서 상술).

## 2. Ground-Truth (실 substrate 대조 / PARTIAL / ABSENT)

### 2.1 판정 요약 — **ABSENT(신규 계약)**

Ground-Truth ①·②의 실측 결론에 따르면, 위 5종 경고 신호를 생성·전달하는 로직은 grep 0이다. 이 도메인은 §26~§31 대비 재활용 substrate가 가장 적다 — 유일하게 근접한 것은 **SLA 개념 자체**(다른 도메인의 30일 기한)이며, 이는 Certification SLA 기본값 설계 시 참조 가능한 선례일 뿐 코드 재사용 대상은 아니다.

### 2.2 하위항목 대조표

| SPEC 하위항목 | 판정 | 실 substrate / 근거(허용목록 파일:라인) |
|---|---|---|
| Review Due Soon | ABSENT(신규) | grep 0. §31 `REVIEW_OVERDUE`(차단)의 사전 단계에 해당 — 순서상 이 경고가 먼저 발생해야 함 |
| Campaign Expiring | ABSENT(신규) | grep 0. Campaign 개념 자체가 §28과 동일하게 이 도메인엔 부재(`AdminGrowth.php:1040` 캠페인은 KEEP_SEPARATE) |
| Reviewer Overloaded | ABSENT(신규) | grep 0. 검토자별 부하 분산/모니터링 로직 없음 |
| Certification Drift | ABSENT(신규) | grep 0. "인증 시점 대비 현재 상태 괴리" 탐지 로직 없음. §26 Snapshot이 ABSENT이므로 비교 기준점 자체가 없음(강한 종속) |
| SLA At Risk | ABSENT(신규 로직) / SLA 상수 선례는 존재 | grep 0(로직). SLA 일수 상수 선례: `Dsar.php:384`(SLA_DAYS=30) — DSAR(개인정보 열람요청) 도메인의 30일 SLA 상수이며, Certification 전용 SLA와 이름만 유사(둘 다 "DSAR" 약어를 쓰지만 의미가 다름 — §2.3 참조) |

### 2.3 KEEP_SEPARATE (해당 시)

- `Dsar.php:335`(본인확인)·`:54`·`:288`·`:384`(SLA_DAYS=30) — 이것은 **Data Subject Access Request**(개인정보 보호법상 정보주체 열람요청) 처리 도메인이며, 본 EPIC 06-A Part 3-8 문서 파일명에 쓰인 "DSAR"(Design Specification / Access Review 문서 접두사 관례)와 **약어만 우연히 같고 의미가 완전히 다르다**. `Dsar.php`의 SLA_DAYS=30은 개인정보 열람요청 처리기한이며, Certification Review SLA와 절대 혼동·흡수하지 않는다. 참조 가능한 것은 "SLA를 상수화해 경고 임계값 계산에 쓴다"는 **패턴**뿐이다.
- `AdminGrowth.php:1040`~`:1069`(admin_growth_campaign) — §28 Digest 문서와 동일한 이유로 KEEP_SEPARATE(마케팅 캠페인이며 Access Review 캠페인 아님).
- `ChannelContract.php:14`, `EnterpriseAuth.php:597`(SAML 인증서) — "인증서·계약 만료"라는 단어가 유사하나 완전히 다른 도메인(채널 계약/SSO 인증서)이며 Certification Drift·SLA At Risk 경고 로직과 무관하다.

## 3. Canonical 설계

- **경고 vs 에러 구분 원칙**: §31 에러는 **행위를 차단**하지만 §32 경고는 **행위를 허용하되 신호만 발신**한다. 예: `REVIEW_OVERDUE`(에러, §31)는 SLA 초과 후 발동해 권한을 임시 정지하지만, `SLA At Risk`(경고, §32)는 SLA 초과 이전 사전 알림으로 아무 것도 차단하지 않는다.
- **Review Due Soon**: 기한 대비 잔여일이 임계값(예: 25% 지점, SPEC 확정 필요) 이하일 때 발신. `REVIEW_OVERDUE` 에러(§31)의 정확히 선행 단계.
- **Campaign Expiring**: 캠페인 종료일 임박 시 소속 미완료 Review 전체에 일괄 발신.
- **Reviewer Overloaded**: 특정 reviewer의 미완료 Review 건수가 임계치를 초과하면 발신 — 배정 재조정(재배정) 트리거로만 쓰이고 자동 재배정은 하지 않음(승인정책 존중, 자동집행 금지 원칙).
- **Certification Drift**: §26 Snapshot 시점의 Permission/Scope와 현재 실효 권한(`TeamPermissions.php:393` effectiveForUser 재조회)을 비교해 차이가 있으면 발신 — Drift 자체는 경고이며, 심각한 Drift(예: scope 확장)는 별도로 §31 에러 승격을 SPEC에서 검토 필요.
- **SLA At Risk**: `Dsar.php:384`의 SLA_DAYS 상수화 패턴을 참조해 Certification 전용 SLA 상수를 별도 정의(값 자체는 공유하지 않음).
- **전달 방식**: 경고는 차단 응답이 아니라 별도 채널(알림/대시보드 신호)로 전달되며, API 응답 바디에 `warnings: []` 배열로 포함 가능(에러와 물리적으로 다른 필드).
- **중복 억제**: 동일 경고가 매 요청마다 반복 발신되면 알림 피로(alert fatigue)를 유발하므로, 동일 `(subject_id, warning_type)` 조합은 일정 주기(예: 1일 1회) 내 재발신을 억제하는 정책을 SPEC 확정 단계에서 함께 정의한다.
- **자동집행 금지 재확인**: 5종 경고 중 어느 것도 단독으로 권한 변경·차단·재배정을 자동 실행하지 않는다. 모든 후속 조치는 사람(관리자/reviewer)의 승인을 거친다 — Volume 5 Safety Rule(신뢰도/권한/동기화/통계신뢰 부족 시 자동집행 금지)과 동일한 원칙을 Certification 경고 계층에도 적용한다.

## 4. Kernel/substrate 매핑

| SPEC 하위항목 | 재활용/승격 대상 substrate | 판정(신규/승격) |
|---|---|---|
| SLA 상수화 패턴 | `Dsar.php:384`(SLA_DAYS=30) | 승격(패턴만, 값·도메인은 완전 분리) |
| Certification Drift 비교 기준 | `TeamPermissions.php:393`(effectiveForUser) | 승격(현재 상태 조회원으로 재사용) |
| Review Due Soon/Campaign Expiring/Reviewer Overloaded | 없음 | 신규 |

## 5. 무후퇴 · Extend

- `Dsar.php`의 SLA_DAYS=30 및 본인확인 로직은 수정하지 않는다. Certification SLA는 **별도 상수**로 신설하며 값도 반드시 동일할 필요가 없다(도메인이 다르므로 SPEC에서 독립적으로 결정).
- `AdminGrowth.php`의 캠페인 로직은 그대로 유지하며 Warning Contract가 그 이름·구조를 흡수하지 않는다.
- 경고(§32)는 자동으로 권한을 변경·차단하지 않는다 — 자동집행은 사용자 승인정책을 존중해야 한다는 Volume 5 원칙(안전한 자동화)을 그대로 계승. Reviewer Overloaded 경고가 발신되어도 자동 재배정은 수행하지 않는다.
- `TeamPermissions.php:393`의 effectiveForUser는 Drift 비교의 "현재값" 조회에만 쓰이고 함수 자체는 변경하지 않는다.

## 5-A. §31(Error) vs §32(Warning) 경계 원칙 (§31 문서와 대구)

§31 Error Contract 문서 5-A와 동일한 원칙을 공유한다 — "되돌릴 수 없는 침해가 임박/발생"이면 §31, "아직 침해는 없으나 방치 시 §31로 악화될 상태"면 §32. 본 문서에서 이 원칙이 적용되는 구체 사례:

- `SLA At Risk`(§32) → 방치 시 `REVIEW_OVERDUE`(§31)로 악화
- `Review Due Soon`(§32) → 방치 시 §29 Runtime Guard의 검토 미완료 상태가 지속되어 결국 §31 에러로 이어짐
- `Certification Drift`(§32)는 예외적으로 심각도에 따라 즉시 §31 에러로 승격될 수 있는 유일한 항목이다(예: Drift가 scope 확장을 포함하면 방치가 곧 침해이므로 경고만으로는 부족할 수 있음) — 이 승격 조건은 SPEC 확정 단계에서 별도로 정의되어야 한다.

### 5-B. 타 Part 3-8 엔티티와의 관계

- §26(Snapshot)은 Certification Drift 비교의 기준점(baseline)이다 — Snapshot 없이는 "무엇과 비교해 달라졌는가"를 정의할 수 없다.
- §28(Digest)의 Version 필드는 Certification Drift 판정 시 "낡은 버전의 digest 기준으로 비교하고 있지 않은가"를 함께 점검하는 보조 신호로 쓰일 수 있다.
- §30(Static Lint)이 코드 작성 단계에서 Bypass Certification을 막으면, 런타임에 발생하는 Certification Drift(우회로 인한 상태 불일치)의 발생 빈도 자체가 줄어드는 예방 관계다.

## 6. 완료 게이트

- [ ] BLOCKED_PREREQUISITE 해소: §26(Snapshot)·§31(Error Contract) 선행 확정(Drift 비교 기준점, 에러와의 단계 구분)
- [ ] 5종 경고별 임계값(잔여일 %, 검토 건수 상한 등) SPEC 확정
- [ ] Certification Drift 심각도에 따른 §31 에러 승격 조건 확정
- [ ] Certification 전용 SLA 상수 값 확정(Dsar.php SLA_DAYS와 독립적으로 결정)
- [ ] 경고 임계값과 §31 차단 임계값의 일관성 검증(경고 < 차단, §31 문서 5-A와 정합)
- [ ] 경고 전달 채널(알림/대시보드) 설계 확정
- [ ] 코드 변경 0 유지 확인
- [ ] NOT_CERTIFIED 상태 유지 — 실 구현은 별도 승인 세션

## 7. 반날조 인용 출처

- SPEC §32(Warning Contract)
- ADR D-5(Reviewer Delegation 상한 — Reviewer Overloaded와 연관) · D-6(KEEP_SEPARATE) · D-7(정직분리)
- Ground-Truth ① §(Dsar.php SLA_DAYS, TeamPermissions effectiveForUser) · ② §(Dsar.php KEEP_SEPARATE — DSAR 약어 혼동 방지, AdminGrowth campaign KEEP_SEPARATE)
- ABSENT 항목(5종 경고 전체)은 grep 0 실측 명시 — Dsar.php SLA_DAYS는 "상수화 패턴"만 참조, 개인정보 열람요청 도메인과 절대 혼동하지 않음을 명시
