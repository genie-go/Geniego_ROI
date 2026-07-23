# GeniegoROI Claude Code Implementation Specification

# CCIS Part033 — Notification Platform, Omnichannel Messaging & Communication Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Notification Platform·Omnichannel Messaging·Communication 표준을 수립한다.

> ★**성격(강한 스택 — 발송 인프라 실재)**: 옴니채널 발송은 이 저장소의 **핵심 실체**(CRM 옴니채널 초고도화·
> 255차)다. ★**강한 축**: `Omnichannel`(정본 오케스트레이터·**우선순위 워터폴** whatsapp→kakao→sms→email→
> push·`omni_outbox` 배치 큐잉+워커·수신자별 도달가능+자격등록 채널 선택·실패시 폴백·**중복0**=채널 send
> 프리미티브 재사용)·**11 채널**(Email `Mailer`/`SmtpClient` Postfix+OpenDKIM·SMS `NaverSms` SENS·`WebPush`
> APNs/FCM·**RFC8291/HKDF 암호화**·Kakao 알림톡/친구톡 `KakaoChannel`·`WhatsApp` 템플릿·`Line`·`InstagramDM`·
> Slack `Alerting`·In-App)·`PreferenceCenter`(수신동의·quiet-hours)·**빈도캡 단일 SSOT**(`CRM::
> isMarketingSendAllowed`)·retry/DLQ(`omni_outbox` attempts+backoff·Part028)·delivery status·i18n 현지화 가
> 강하게 실재한다. ★**부분/부재 축**: **Microsoft Teams/Discord 알림·형식 단일 Notification Gateway 추상화
> (Omnichannel+직접 핸들러+`NotifyEngine` 공존)·SPF/DKIM/DMARC DNS(203차 미완)·형식 Provider Failover·
> OpenTelemetry**. Part001 §4 에 따라 실측 → 부분/부재 판정 → 실 발송 스택 성문화했다. ★**정직**: `NotifyEngine`
> 은 쿠폰알림 헬퍼(email 실발송·SMS/kakao 로그 스텁)이지 옴니채널 정본이 아니다 — 실 발송경로=`Omnichannel`.
> (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 발송 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| Notification Architecture | Event→Gateway→Adapter→Provider | ★**준수** — 세그먼트/이벤트→`Omnichannel` 워터폴→채널 프리미티브→Provider. 비즈니스/채널 분리 |
| Notification Gateway | Routing/Channel Select/Retry | ★**대응물 = `Omnichannel`** — 워터폴 라우팅·수신자별 채널 선택·`omni_outbox` 재시도·스케줄 |
| Notification Channel | Email/SMS/Push/Kakao/… | ★**11 채널 실재** — Email/SMS/LMS/MMS/Push/Kakao/WhatsApp/Line/InstagramDM/Slack/In-App |
| Email | HTML/DKIM/SPF/DMARC | ★**부분 준수** — `Mailer`/`SmtpClient`(Postfix+**OpenDKIM**)·HTML·`EmailMarketing`. ★**SPF/DKIM/DMARC DNS 미완**(203차) |
| SMS/LMS/MMS | 단문/장문/이미지 | ★**실재** — `NaverSms`(SENS)·`SmsMarketing`. 국가별 규격 부분 |
| Push(APNs/FCM/WebPush) | 기기 토큰 관리 | ★**실재** — `WebPush`(APNs/FCM·**RFC8291/HKDF 암호화 페이로드**·구독 토큰) |
| Kakao(알림톡/친구톡) | 템플릿 승인/대체발송 | ★**실재** — `KakaoChannel`(알림톡·친구톡)·SMS 대체발송(워터폴 폴백) |
| WhatsApp Business | Template/Session/Media | ★**실재** — `WhatsApp::sendOne`(승인 템플릿) |
| Collaboration(Slack/Teams) | 운영/장애 알림 | **부분** — Slack=`Alerting`(HMAC 서명·`X-Genie-Signature`). ★**MS Teams/Discord 부재** |
| In-App Notification | Badge/Popup/Read | ★**부분 준수** — `CRM`/notification·`WebPopupCampaign`·read status. Notification Center 부분 |
| Webhook Notification | JSON/Signature/Retry | ★**실재** — `OpenPlatform::emit`·`Webhooks`(HMAC 검증·Part028)·`omni_outbox` 재시도 |
| Notification Template | ID/Version/Language/Var | ★**부분 준수** — 채널별 템플릿(EmailMarketing·Kakao 승인템플릿·i18n). 형식 통합 템플릿 레지스트리 부분 |
| Template Rendering | Placeholder/조건/Loop/i18n | ★**부분 준수** — placeholder·i18n(15개국)·현지화. 조건/Loop 블록 부분 |
| Preference Center | 수신동의/Quiet Hours | ★**실재** — `PreferenceCenter`(채널별 수신동의)·quiet-hours(STO defer)·suppression |
| Scheduling | Immediate/Delayed/Recurring | ★**실재** — `omni_outbox` 큐·cron 워커·STO(개인 최적시각)·예약 |
| Delivery Tracking | Queued/Sent/Delivered/Failed | ★**부분 준수** — `omni_outbox.status`(queued/sent/failed)·attempts·campaign stats(total/sent/failed/skipped). Opened/Clicked 부분(pixel) |
| Retry Policy(백오프) | 일시실패 재시도·영구실패 금지 | ★**실재** — `omni_outbox` attempts(최대 3회)·defer(quiet/STO는 attempts 미증가). 영구실패 구분 부분 |
| Rate Limiting | User/Tenant/Provider | ★**부분 준수** — 빈도캡 SSOT(`CRM::isMarketingSendAllowed`)·배치(OMNI_BATCH 500). Provider rate 부분 |
| Monitoring | Delivery/Bounce/Open Rate | **부분** — campaign stats·`Alerting`·`SystemMetrics`. Bounce/Open 형식 부분 |
| Logging | Notification/Template/Trace ID | **부분** — `omni_outbox`·error_log·`SecurityAudit`. Trace ID 부재·PII 미저장(해시 식별자) |
| Security(TLS/Signature/Secret) | 자격증명 보호 | ★**준수** — TLS·Webhook HMAC·`Crypto` AES(자격증명 암호화)·토큰 보호 |
| Disaster Recovery | Retry/DLQ/Provider Failover | ★**부분** — `omni_outbox` 재큐·DLQ replay·**채널 폴백**(워터폴). 형식 Provider Failover 부분 |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Channel Agnostic/Template/Event/Retry Safe/Preference Aware/Tenant Isolated/Localized/Failover) | **★대체로 준수** | ★Channel Agnostic(워터폴)·Preference Aware(PreferenceCenter)·Tenant Isolated·Localized(i18n)·Retry Safe(outbox). Failover=채널 폴백(Provider 부분) |
| §4 Notification Architecture | **★준수** | Event→`Omnichannel`→채널→Provider 분리 |
| §5 Notification Gateway | **★대응물** | `Omnichannel`(워터폴·outbox·재시도·스케줄) |
| §6 Notification Channel | **★11 채널 실재** | Email/SMS/Push/Kakao/WhatsApp/Line/InstagramDM/Slack/In-App/Webhook |
| §7 Email | **★부분 준수** | Postfix+OpenDKIM·HTML. **SPF/DKIM/DMARC DNS 미완**(203차) |
| §8 SMS/LMS/MMS | **★실재** | `NaverSms` SENS·`SmsMarketing` |
| §9 Push | **★실재** | `WebPush` APNs/FCM·RFC8291/HKDF 암호화 |
| §10 Kakao | **★실재** | `KakaoChannel` 알림톡/친구톡·SMS 대체발송 |
| §11 WhatsApp | **★실재** | `WhatsApp::sendOne` 승인 템플릿 |
| §12 Collaboration | **부분** | Slack=`Alerting`(HMAC). MS Teams/Discord 부재 |
| §13 In-App | **부분 준수** | `CRM`·`WebPopupCampaign`·read status. Notification Center 부분 |
| §14 Webhook | **★실재** | `OpenPlatform::emit`·HMAC 검증·재시도 |
| §15~§16 Template/Rendering | **부분 준수** | 채널별 템플릿·i18n 현지화·placeholder. 통합 레지스트리/조건블록 부분 |
| §17 Preference Center | **★실재** | `PreferenceCenter`·quiet-hours·suppression |
| §18 Scheduling | **★실재** | `omni_outbox`·cron·STO·예약 |
| §19 Delivery Tracking | **부분 준수** | outbox status·campaign stats. Opened/Clicked 부분 |
| §20 Retry Policy | **★실재** | outbox attempts+backoff·defer. 영구실패 구분 부분 |
| §21 Rate Limiting | **부분 준수** | 빈도캡 SSOT(CRM)·배치. Provider rate 부분 |
| §22 Monitoring | **부분** | campaign stats·`Alerting`. Bounce/Open 형식 부분 |
| §23 Logging | **부분** | outbox·error_log·`SecurityAudit`. Trace ID 부재·PII 미저장 |
| §24 Security | **★준수** | TLS·HMAC·`Crypto` AES·토큰 보호 |
| §25 Disaster Recovery | **부분** | outbox 재큐·DLQ replay·채널 폴백. Provider Failover 부분 |
| §26~§27 PHP/Claude(Gateway/Adapter/Queue/Template/Provider SDK 추상화) | **★대체로 준수** | ★`Omnichannel` gateway·채널 어댑터(중복0)·`omni_outbox` 큐·i18n. Provider SDK 추상화/OTel 부분 |
| §28~§29 검증(notification:queue 등) | **대상 없음** | artisan 없음. `Omnichannel` API·`omni_outbox`·`PreferenceCenter` 로 대체 |

---

## 4. 확립된 표준 (신규 발송 코드가 따를 정본)

- ★**발송 정본 = `Omnichannel`**(워터폴 오케스트레이터). 신규 캠페인/알림은 이 오케스트레이터 경유·`omni_outbox` 큐잉. ★**중복0**: 채널 send 프리미티브 재사용(`EmailMarketing::omniSend`·`KakaoChannel::sendOne`·`WhatsApp::sendOne`·`WebPush::sendToTenant`). **동기 루프 대량발송 금지**(outbox 큐).
- ★**컴플라이언스 게이트(기존 SSOT)**: suppression(이메일)·**빈도캡=`CRM::isMarketingSendAllowed`**(단일 SSOT·이중 enforcement 금지)·quiet-hours(STO defer). 신규 발송은 이 게이트 통과 필수.
- ★**register-then-execute**: 자격증명 미등록 채널은 graceful 'skipped'(정직·에러 아님)·다음 채널 폴백. 등록만 하면 즉시 실발송. **가짜 발송 위장 금지**(288차 가짜녹색).
- ★**채널 어댑터 추가로 확장**: 신규 채널=send 프리미티브+워터폴 편입(`WATERFALL_CHANNELS`). ★**데드코드 금지**(283차 sms/webpush가 상수/normalize에서 제거돼 호출0이던 결함 — 주석 주장과 코드 사실 일치).
- ★**Retry = `omni_outbox`**(attempts+backoff·일시실패 재큐·quiet/STO defer는 attempts 미증가·영구실패 재시도 금지)·DLQ replay(Part028).
- ★**테넌트 격리·PII 미저장**(어트리뷰션=해시/익명 식별자)·`Crypto` AES 자격증명·Webhook HMAC·i18n 현지화(15개국).
- ★**Email 전달성**: Postfix+OpenDKIM 실재하되 **SPF/DKIM/DMARC DNS 완비 필요**(203차 미완·전달성 개선 잔여작업).

---

## 5. 의도적 미적용 + 사유 (정직 보고)

1. **Microsoft Teams/Discord 알림** — 안 함. 운영/장애 알림은 Slack(`Alerting` HMAC 서명). Teams/Discord 요구 발생 시 어댑터 추가.
2. **형식 단일 Notification Gateway 추상화(Interface)** — 부분. `Omnichannel`(정본 오케스트레이터)+채널 직접 핸들러+`NotifyEngine`(쿠폰알림 헬퍼) 공존. ★**`NotifyEngine` SMS/kakao 는 로그 스텁**(email 실발송)이지 발송 정본 아님 — 실 경로=`Omnichannel`.
3. **SPF/DKIM/DMARC DNS 완비** — 미완(203차). Postfix+OpenDKIM(서명)은 실재하나 DNS 레코드(SPF/DKIM public/DMARC 정책) 완비가 전달성 잔여작업.
4. **형식 Provider Failover·Provider SDK 추상화·OpenTelemetry** — 부분. 채널 폴백(워터폴)이 대응물. Provider 단위 자동 failover/SDK 추상화 미도입.
5. **통합 Template Registry(버전/조건블록/Loop)·형식 Delivery Tracking(Opened/Clicked)** — 부분. 채널별 템플릿·i18n·outbox status·pixel 이 대응물.
6. **artisan `notification:*` 명령** — 없음(Slim). `Omnichannel` API·`omni_outbox`·`PreferenceCenter` 로 대체.

★**준수하는 실 원칙(강함)**: **옴니채널 워터폴(Channel Agnostic·중복0)·11 채널 실발송·outbox 큐/재시도/DLQ·빈도캡 단일 SSOT·PreferenceCenter(수신동의/quiet-hours)·register-then-execute(정직 skipped)·테넌트 격리·PII 미저장·i18n 현지화·Webhook HMAC·Crypto 자격증명**.

---

## 6. Claude Code 구현 규칙

1. 발송=`Omnichannel`(워터폴)+`omni_outbox` 큐 경유(동기 대량발송 금지). 채널 send 프리미티브 재사용(중복0).
2. ★컴플라이언스=suppression+**빈도캡 `CRM::isMarketingSendAllowed`**(단일 SSOT·이중 enforcement 금지)+quiet-hours(STO). 통과 필수.
3. ★register-then-execute: 미등록 채널=graceful 'skipped'(정직·가짜 발송 위장 금지·288차). 신규 채널=워터폴 편입(데드코드 금지·283차).
4. Retry=`omni_outbox`(attempts+backoff·영구실패 재시도 금지)·DLQ replay. 테넌트 격리·PII 미저장·i18n 현지화.
5. Email 신규 발송 시 SPF/DKIM/DMARC DNS 완비 확인(203차 잔여). 자격증명=`Crypto` AES·Webhook=HMAC.
6. MS Teams/Discord/형식 Provider Failover/통합 Template Registry 를 "명세에 있다"는 이유로 선이식하지 않는다(Omnichannel+11채널+outbox 로 커버). 요구 발생 시 어댑터 추가.

---

## 7. Completion Criteria

- [x] 발송 스택 **실측**(11 채널 실재·`Omnichannel` 워터폴·`omni_outbox` 큐/재시도/DLQ·빈도캡 SSOT·PreferenceCenter·WebPush RFC8291·MS Teams/Discord 부재)
- [x] 명세 §3~§29 **섹션별 매핑·판정**(강한 발송 스택 명시·형식 Gateway 추상화/Provider Failover/SPF DNS 부분 증명)
- [x] 실 발송(Omnichannel+11채널+outbox+PreferenceCenter+빈도캡 SSOT) 성문화(§4)
- [x] ★Channel Agnostic(워터폴·중복0)·빈도캡 단일 SSOT·register-then-execute(정직 skipped)·데드코드 금지·테넌트 격리·PII 미저장 명시
- [x] 의도적 미적용 + 사유(§5) — Teams/Discord·형식 Gateway 추상화·SPF/DKIM/DMARC DNS·Provider Failover
- [x] Claude Code 규칙(§6) · `Omnichannel`·`omni_outbox`·`PreferenceCenter`·`CRM::isMarketingSendAllowed` 실 경로 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 이 저장소의 **강한 발송 스택**(옴니채널 워터폴 + 11 채널 실발송 +
> outbox 큐/재시도/DLQ + 빈도캡 단일 SSOT + PreferenceCenter)의 성문화다. 부분/부재(MS Teams·형식 Provider
> Failover·SPF/DKIM/DMARC DNS 203차)는 어댑터/DNS 잔여작업이며, ★**정직**: `NotifyEngine` SMS/kakao 스텁은
> 발송 정본이 아니다(실 경로=`Omnichannel`).

---

## 다음 Part

**CCIS Part034 — Data Governance, Master Data Management & Metadata** — ★사전 실측 예고: 형식 MDM/RDM 허브·Data Catalog 도구(Collibra/Alation)는 **부재**하나, 거버넌스 실체는 **DATA 헌법(Volume 1~5·최상위 데이터 원칙)·출처 기록(Source/Credential/Sync/Quality/Trust lineage·Part026)·V3 Data Trust(품질 거버넌스·수집≠사용)·`GeniegoGlossary`(비즈니스 용어)·`ChannelRegistry`/Connector Registry(참조데이터)·`EventNorm`/Unified Data Model(마스터 정규화)·테넌트 격리·PII 미저장**로 실재. Part034 도 실측→MDM/Catalog 도구 부재증명→DATA 헌법+lineage+V3 Trust+Glossary 성문화(MDM 허브 이식 금지). ★데이터 인텔리전스=핵심 경쟁력(강함) 승계.
