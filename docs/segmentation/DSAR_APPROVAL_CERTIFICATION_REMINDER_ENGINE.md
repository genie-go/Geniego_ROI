# DSAR — Reminder Engine: Email/SMS/Push/Slack/Teams/Web Notification (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §18(Reminder Engine)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §18은 Review SLA(§17)의 Reminder SLA 타이머가 발동될 때 리뷰어·매니저·대상 사용자에게 실제로 알림을 전달하는 6개 채널을 정의한다: Email · SMS · Push · Slack · Teams · Web Notification. 본 DSAR은 "접근권한 검토건에 대한 리마인더"가 이 6개 채널 중 어느 것으로든 GeniegoROI에 존재하는지, 그리고 채널 인프라 자체(발송 게이트웨이)가 재활용 가능한지를 판정한다.

## 2. Ground-Truth (실 substrate 대조 / PARTIAL / ABSENT)

### 2.1 판정 요약 — **ABSENT (접근검토용)**

Ground-Truth ①·②의 공통 결론: **접근권한 검토 리마인더는 grep 0**다. Review Assignment(§8)·Review Queue(§9)·Review SLA(§17) 자체가 ABSENT이므로 "검토건에 대한 리마인더"라는 이벤트가 발생할 근거 자체가 없다(구조적 필연). GeniegoROI에는 마케팅/알림 목적의 발송 인프라(이메일·SMS·Slack 등)가 별도 도메인으로 존재하나, 이들은 access-review 리마인더가 아니다.

### 2.2 하위항목 대조표

| SPEC §18 채널 | 판정 | 실 substrate / 근거(허용목록 파일:라인) |
|---|---|---|
| Email(검토 리마인더) | **ABSENT** | 리뷰어 응답 리마인더 이메일 grep 0. 허용목록 내 이메일 발송 인프라 인용 없음(access-review 맥락) |
| SMS(검토 리마인더) | **ABSENT** | 동일 — access-review SMS 리마인더 grep 0 |
| Push(검토 리마인더) | **ABSENT** | 동일 — access-review push 리마인더 grep 0 |
| Slack(검토 리마인더) | **ABSENT** | access-review 목적 Slack 발송 grep 0. 근접 명명은 §2.3 KEEP_SEPARATE 참조(`Reviews.php:174`, 상품리뷰 도메인 — 흡수 금지) |
| Teams(검토 리마인더) | **ABSENT** | grep 0 |
| Web Notification(검토 리마인더) | **ABSENT** | grep 0 |

### 2.3 KEEP_SEPARATE (해당 시)

- `Reviews.php:174`(부정 상품리뷰 Slack 알림) — 채널(Slack)과 "리마인더/알림"이라는 형태만 유사할 뿐, 대상이 **고객이 남긴 부정적 상품 리뷰**에 대한 운영자 알림이며, "접근권한 검토건에 대한 리뷰어 리마인더"가 아니다. 도메인이 완전히 다르다(product review vs access review — 단어 "review"의 우연한 중복). 흡수·개명·통합 금지(가짜녹색 회피 최고위험 지점 — "리뷰 알림 엔진이 이미 있다"는 착시).
- 마케팅/알림 발송 인프라(허용목록 KEEP_SEPARATE 카테고리에 명시된 마케팅 approval 관련 채널 일반)는 access-review 리마인더로 전용되지 않는다. Certification Reminder Engine은 이들과 **채널 게이트웨이 레벨(SMTP/SMS Provider 등 인프라 자체)만 참조**할 수 있으나, 발송 트리거·수신자 해석·메시지 템플릿은 완전히 독립적으로 신설해야 한다.

## 3. Canonical 설계

Reminder Engine은 Review SLA(§17)의 Reminder SLA 타이머가 발동하는 이벤트를 구독(subscribe)하여, 6개 채널 중 수신자 선호도·역할(리뷰어/매니저/대상자)에 따라 적합한 채널로 발송하는 계약을 정의한다.

1. **트리거**: Reminder SLA 타이머 도달(§17) — Response SLA 잔여시간 50%/80%/100% 등 임계 지점.
2. **수신자 해석**: Review Queue(§9) 배정 정보에서 리뷰어·매니저·대상 사용자를 조회.
3. **채널 선택**: 수신자 채널 선호도(옵트인) + 채널 가용성(예: Slack 미연동 조직은 Email로 폴백).
4. **멱등성**: 동일 검토건·동일 SLA 임계에 대한 중복 발송 방지.
5. **실패 처리**: 채널 발송 실패 시 폴백 채널 시도, 최종 실패 시 Escalation Engine(§19)으로 조기 이관 가능.
6. **감사**: 발송 이력은 Certification Evidence(§27)의 일부로 append-only 기록.

### 3.1 메시지 템플릿과 개인화

각 채널의 메시지는 검토건 맥락(대상자명·부여된 권한·위험 등급·마감일)을 포함해야 리뷰어가 클릭 없이도 우선순위를 판단할 수 있다(Explainable Review 원칙의 알림 계층 반영). 템플릿은 15개 로케일(`frontend/src/i18n/locales/`)을 지원해야 하며, 이는 CLAUDE.md의 i18n 규약(신규 키 15개국 동시 반영)을 그대로 준수한다 — 단 이는 실 구현 세션의 책임이며 본 설계 세션에서는 로케일 키를 신설하지 않는다(코드 0).

### 3.2 채널별 긴급도 차등

Email/Web Notification은 일상적 리마인더(50%/80% 임계)에, SMS/Push는 임박한 마감(100% 임계 직전)에, Slack/Teams는 팀 단위 가시성이 필요한 조직 알림(에스컬레이션 임박)에 각각 대응하는 것을 기본 정책으로 하되, 최종 채널 선택은 수신자 옵트인 설정이 조직 기본정책보다 우선한다.

### 3.3 리마인더와 에스컬레이션의 책임 경계

Reminder Engine은 **통지(informing)** 만 담당하며 **강제 이관(forcing)** 은 Escalation Engine(§19, 별도 DSAR)의 책임이다. 리마인더가 3회 반복되어도 리뷰어가 응답하지 않으면, Reminder Engine이 스스로 다음 조직단계로 이관하지 않는다 — 대신 Escalation SLA(§17) 만료 이벤트를 통해 Escalation Engine이 이관을 결정하고, 그 결정의 결과로 Reminder Engine이 **새로운 수신자**(Manager 등)에게 통지를 재발송한다. 두 엔진이 서로의 책임을 침범하지 않도록 이 경계를 명확히 유지하는 것이 SPEC §17/§18/§19의 3분리 설계 의도다.

## 4. Kernel/substrate 매핑

| SPEC §18 하위항목 | 재활용/승격 대상 substrate | 판정(신규/승격) |
|---|---|---|
| Email 채널 게이트웨이 | (허용목록 내 access-review 맥락 substrate 없음) | 신규(인프라 레벨만 참조 가능성 — 코드 인용은 이번 DSAR 범위 밖) |
| SMS 채널 게이트웨이 | (허용목록 내 substrate 없음) | 신규 |
| Push 채널 게이트웨이 | (허용목록 내 substrate 없음) | 신규 |
| Slack 채널 게이트웨이 | `Reviews.php:174`(KEEP_SEPARATE — 채널 존재를 형태 참조만, 로직 흡수 금지) | 신규(패턴 참조만) |
| Teams 채널 게이트웨이 | (substrate 없음) | 신규 |
| Web Notification | (substrate 없음) | 신규 |
| 트리거 연동 | Review SLA(§17, 전체 ABSENT — 형제 DSAR 범위) | 신규 |

## 5. 무후퇴 · Extend

Golden Rule(Wrap): `Reviews.php:174`의 상품리뷰 Slack 에스컬레이션 로직은 **절대 수정·재사용(코드 레벨) 금지** — 완전히 다른 도메인(고객 상품평)이므로 그대로 유지한다(무후퇴). Reminder Engine은 "Slack 발송이 가능한 채널 인프라가 조직에 이미 존재한다"는 **인프라적 사실**만 설계 참고사항으로 삼되, `Reviews.php`의 함수·데이터·트리거를 호출하거나 흡수하지 않는다. 이는 ADR D-6(KEEP_SEPARATE)의 직접 적용이다.

실 구현 세션에서 채널 게이트웨이(SMTP 발신 서버·SMS Provider·Slack Webhook 등)의 **연결 설정 자체**가 이미 조직에 등록되어 있다면(예: 마케팅 발송용 SMTP 계정), 그 연결 자격증명(credential) 레벨의 인프라는 재사용할 수 있다 — 단 이는 인프라 계층(전송 게이트웨이)의 재사용이지 **비즈니스 로직**(누구에게 언제 무엇을 보낼지 결정하는 로직)의 재사용이 아니다. 이 경계가 무너지면 "리마인더 엔진이 이미 있다"는 착시로 직결되므로, 실 구현 시 채널 게이트웨이 재사용 여부는 별도의 인프라 감사(코드 레벨이 아닌 배포/설정 레벨)로 재확인해야 하며 본 설계 문서는 이를 확정하지 않는다(코드 0 원칙상 인프라 자격증명 실측은 본 세션 범위 밖).

## 5.1 Notification 수신거부(옵트아웃)와 fail-secure의 긴장관계

일반 마케팅 알림과 달리 Certification 리마인더는 조직의 컴플라이언스 의무 이행 수단이므로, 개별 수신자가 전 채널을 옵트아웃하더라도 **최소 1개 채널(Web Notification 등 인앱)은 강제로 유지**해야 한다 — 그렇지 않으면 리뷰어가 알림을 모두 끈 채 방치해도 시스템이 이를 감지하지 못해 fail-secure 원칙(모호하면 차단)이 무력화된다. 이는 §17 Review SLA의 Escalation SLA가 "알림을 못 받았다"는 이유로 무기한 유예되지 않도록 하는 안전장치이기도 하다.

## 6. 완료 게이트

- [ ] Email/SMS/Push/Slack/Teams/Web Notification 6채널 발송 어댑터 신설
- [ ] Review SLA(§17) Reminder 타이머 이벤트 구독 연동
- [ ] 수신자 해석 로직(리뷰어/매니저/대상자 역할 기반) 신설
- [ ] 채널 선호도·폴백 정책 신설
- [ ] 멱등 발송(중복 방지) 검증
- [ ] `Reviews.php:174`와의 코드/데이터 비공유 검증(오흡수 회귀 테스트)
- [ ] Certification Evidence(§27) 발송이력 연결
- [ ] 15개국 로케일 메시지 템플릿 신설(i18n 규약 준수 — 실 구현 세션 책임)
- [ ] 채널별 긴급도 차등 정책(옵트인 우선순위 포함) 신설
- [ ] 채널 게이트웨이 인프라 재사용 범위 별도 인프라 감사(코드 레벨 밖)
- [ ] BLOCKED_PREREQUISITE 해소 — Review SLA(§17)·Review Queue(§9) 선행 완료 필요
- [ ] 코드 0 유지

## 7. 반날조 인용 출처

- SPEC §18(Reminder Engine: Email/SMS/Push/Slack/Teams/Web Notification)
- ADR D-6(KEEP_SEPARATE 오흡수 금지) · D-7(정직분리)
- Ground-Truth ②(허용목록 KEEP_SEPARATE): `Reviews.php:174`(부정 상품리뷰 Slack — access-review 리마인더 아님)
- 형제 DSAR 상호참조(자체 인용 아님, 연동 설계 근거): `DSAR_APPROVAL_CERTIFICATION_REVIEW_SLA.md`(§17) · `DSAR_APPROVAL_CERTIFICATION_ESCALATION_ENGINE.md`(§19)
- (ABSENT 항목: Email/SMS/Push/Slack/Teams/Web Notification 6채널 전부 access-review 맥락 — grep 0 실측. `Reviews.php:174`를 "리마인더 엔진이 이미 있다"로 과장하지 않음)
