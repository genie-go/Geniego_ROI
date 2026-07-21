# DSAR — Certification Schedule (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §3(Annual/Quarterly/Monthly/Weekly/Event/Risk/Regulatory/Emergency 스케줄)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §3이 정의하는 Certification Schedule은 Campaign(§3 별도 문서)의 8유형 중 정기형(Annual/Quarterly/Monthly/Weekly)의 **개시 시점을 결정하는 시간 트리거**이며, 비정기형(Event/Risk/Regulatory/Emergency) 4종의 **발생 감지 조건**을 함께 다룬다. Schedule 없이는 Campaign이 "언제" 열려야 하는지 알 수 없다 — 접근 검토가 방치(staleness)되지 않도록 보장하는 것이 Schedule의 존재 이유다. SPEC §3 하위항목: (a) 4개 정기 주기의 크론/스케줄러 등록, (b) Event 감지(조직개편·이직·역할변경), (c) Risk 감지(고위험 role 임계값), (d) Regulatory 마감 캘린더, (e) Emergency 수동/자동 트리거. 본 문서는 이 스케줄링 계층이 실 코드베이스의 34종 크론 작업 중 존재하는지 검증한다.

## 2. Ground-Truth (실 substrate 대조 / PARTIAL / ABSENT)

### 2.1 판정 요약 — **ABSENT(순신규 그린필드)**

Ground-Truth ①/②의 실측 결론: 접근 검토(access-review)를 주기적으로 개시하는 스케줄러/크론 작업은 grep 0 — 기존 34종 크론 작업 어디에도 access-review job이 없다. 다만 "만료(expiry)" 개념 자체는 코드베이스에 이미 존재하며(api_key expires 강제, 결제 만료 강등, 세션 유휴), 이들은 Schedule이 재활용할 수 있는 **형태만 근접한 트리거 신호**다 — 실제 주기적 검토 개시 로직은 아니다.

### 2.2 하위항목 대조표

| SPEC 하위항목 | 판정 | 실 substrate / 근거(허용목록 파일:라인) |
|---|---|---|
| Annual/Quarterly/Monthly/Weekly 스케줄러 등록 | ABSENT | grep 0 — 34종 크론 중 access-review 잡 없음 |
| Event 감지(조직개편·이직) | ABSENT | grep 0 — `UserAdmin.php:598`(assignRole 제거 주석)은 수동 개별 조치이지 자동 감지 트리거 아님 |
| Risk 감지(고위험 role 임계값) | PARTIAL(형태만 근접) | `TeamPermissions.php:722`(risk=high) 필드는 존재하나 이를 감지해 Schedule을 발화(fire)하는 로직 grep 0 |
| Regulatory 마감 캘린더 | ABSENT | grep 0 |
| Emergency 수동/자동 트리거 | ABSENT | grep 0 |
| 만료 기반 신호(재활용 후보) | PARTIAL(형태만 근접) | `index.php:518`(api_key expires 강제)·`UserAuth.php:141`(결제만료 강등)·`UserAuth.php:206`(세션 유휴) — 개별 자원 만료 강제이지 검토 캠페인 스케줄 아님 |

### 2.3 KEEP_SEPARATE

Schedule 자체는 이름 충돌 위험이 낮으나, 마감/주기 개념을 공유하는 근접물과 경계를 명시한다: `Dsar.php:384`(SLA_DAYS=30)는 DSAR(정보주체 권리 요청) 처리 기한이며 접근 검토 주기와 무관하다. `PriceOpt.php:105`(po_simulations) 등 정기 재계산 작업도 가격 최적화 도메인이며 access-review 스케줄과 무관하므로 흡수하지 않는다.

## 3. Canonical 설계

Schedule은 다음 개념 계약으로 설계된다(코드 미구현, 설계 명세 단계):

- **정기 트리거**: Annual/Quarterly/Monthly/Weekly 4종은 크론 등록 방식으로 Campaign 개시를 발화 — 기존 34종 크론 작업과 동일한 등록 패턴을 따르되 별도 신규 잡으로 추가한다(기존 크론 재작성 금지).
- **비정기 트리거**: Event(조직변경 이벤트 구독), Risk(고위험 role 임계값 초과 감지 — `TeamPermissions.php:722` risk=high 신호 소비), Regulatory(법규 마감 캘린더 연동), Emergency(보안사고 대응 수동/자동 발화) 4종.
- **만료 신호 재활용**: `index.php:518`·`UserAuth.php:141`·`UserAuth.php:206`의 개별 만료 판정은 "이 Assignment가 이미 방치되었는가"를 판단하는 입력 신호로 Schedule에 편입 가능 — 단, 이들 자체는 검토 캠페인이 아니라 개별 자원 강제 조치이므로 재구현하지 않고 신호로만 관찰한다.
- **fail-secure**: Schedule 발화 실패(크론 미실행 등) 시, 마지막 검토 시점을 초과한 Assignment는 자동으로 pending_review 상태로 전환되어야 한다(방치 방지).

## 4. Kernel/substrate 매핑

| SPEC 하위항목 | 재활용/승격 대상 substrate | 판정(신규/승격) |
|---|---|---|
| 고위험 신호(Risk 트리거 입력) | `TeamPermissions.php:722`(risk=high) | 승격(신호 소비, 로직 자체는 신규) |
| 만료 신호(방치 감지 입력) | `index.php:518`·`UserAuth.php:141`·`UserAuth.php:206` | 승격(신호 소비, 로직 자체는 신규) |
| 세션/사용자 상태 참조 | `UserAuth.php:4263`(user_session)·`:54`(app_user) | 승격(대상 존재 확인용 참조) |
| 정기/비정기 스케줄러 자체 | 없음 — 신규 | 신규 |
| Event 감지 로직 | 없음 — 신규 | 신규 |
| Regulatory 캘린더 | 없음 — 신규 | 신규 |

## 5. 무후퇴 · Extend

Schedule은 기존 34종 크론 작업의 등록 방식·실행 주기를 변경하지 않고 신규 크론 잡을 추가하는 형태로만 확장한다(Golden Rule Wrap). `index.php:518`의 api_key 만료 강제, `UserAuth.php:141`의 결제만료 강등, `UserAuth.php:206`의 세션 유휴 처리는 그대로 유지되며 Schedule은 이들의 산출 상태를 관찰(observe)만 하고 재구현하지 않는다. `TeamPermissions.php:722`의 risk=high 필드 계산 로직도 변경하지 않는다.

## 6. 완료 게이트

- [ ] BLOCKED_PREREQUISITE 해소: Campaign(§3) 및 선행 Part 3-1~3-7 완결 확인
- [ ] 4종 정기 크론 잡 신규 등록 설계(기존 34종 크론 무변경 확인)
- [ ] Risk 트리거 임계값 정의(`TeamPermissions.php:722` 소비 계약)
- [ ] Event/Regulatory/Emergency 발화 조건 명세
- [ ] 만료 신호 3종(`index.php:518`/`UserAuth.php:141`/`UserAuth.php:206`) 관찰 계약 확정
- [ ] fail-secure 방치 감지(pending_review 자동 전환) 로직 설계
- [ ] NOT_CERTIFIED 상태에서 실제 코드 구현 착수 승인 획득

## 7. 반날조 인용 출처

- SPEC §3(Annual/Quarterly/Monthly/Weekly/Event/Risk/Regulatory/Emergency 스케줄) / ADR D-1(Extend-Wrap) · D-5(Reviewer Delegation 상한)
- Ground-Truth ① §(만료/휴면 신호 3종·risk=high 필드) · ② §(Dsar SLA_DAYS·PriceOpt 정기작업 KEEP_SEPARATE 근거)
- ABSENT 항목(정기 스케줄러·Event/Regulatory/Emergency 발화 로직)은 grep 0 실측 — 만료 신호를 "이미 구현된 스케줄"로 과장하지 않음
