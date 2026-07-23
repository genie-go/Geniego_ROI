# GeniegoROI Claude Code Implementation Specification

# CCIS Part028 — Enterprise Integration, External API, EDI & Partner Connectivity Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Enterprise Integration·External API·EDI·Partner Connectivity 표준을 수립한다.

> ★**성격(중간 스택 — 커넥터/어댑터/Webhook 실재·형식 EDI/EIP 프레임워크 부재)**: 이 저장소는 **커머스·광고·
> 마케팅 SaaS**로서 외부 파트너 연동이 **핵심 실체**다. 명세가 요구하는 **형식 EDI(ANSI X12/EDIFACT)·AS2·
> SFTP/FTPS·EIP 프레임워크(Apache Camel/MuleSoft)·Guzzle/PSR-18 HTTP Client·Kafka/RabbitMQ Queue**는
> **부재**한다. 그러나 연동 실체는 **① 커넥터/어댑터 표준**(DATA 헌법 Volume 2 Connector Registry·
> `ChannelSync` 14채널·`AdAdapters`·`Connectors`·`OpenPlatform`·`KrChannel`/`KakaoChannel`/`Line`/
> `WhatsApp`/`InstagramDM`) + **② Webhook**(`Webhooks.php` — HMAC-SHA256 서명검증·opt-in 강제·복수 서명헤더)
> + **③ 재시도/장애복구**(`omni_outbox` attempts+backoff·`dlq/replay` 관리 라우트) + **④ 외부 서명**
> (HMAC-SHA256·AWS SigV4) + **⑤ Canonical 정규화**(`EventNorm`·Unified Data Model·표준모델 정규화)로 강하게
> 실재한다. Part001 §4 에 따라 실측 → EDI/EIP 프레임워크 부재증명 → 실 연동 스택 성문화했다. ★DATA 헌법
> "**채널 나열 금지 — 표준모델 정규화·통합**"·"**동일 Connector/API/Object/Schema 중복 구현 금지 — 기존
> 확장**"이 이 저장소의 연동 정본이다. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 연동 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| Integration Architecture | App→Layer→Adapter→Partner | ★**준수** — 도메인이 파트너 직접의존 안 함. `ChannelSync`/`AdAdapters`/`Connectors` 어댑터 경유 |
| EIP 프레임워크 | Camel/MuleSoft | **부재**. 패턴(Router/Translator/DLQ)은 코드로 개별 실재(프레임워크 아님) |
| Integration Hub | 중앙 통합 계층 | ★**대응물** — `Connectors`(커넥터 허브)·`OpenPlatform`·연동허브 UI(PG 15종 등). DATA Volume 2 Connector Registry |
| External API(REST/SOAP/GraphQL/gRPC) | 다중 프로토콜 | **REST 중심**(11번가/네이버/쿠팡/Meta/Google OpenAPI). SOAP/GraphQL/gRPC 미사용 |
| API Contract | Endpoint/Auth/Version/SLA | **부분** — `/v{NNN}` 버전 라우팅(Part011)·핸들러별 스펙. 형식 Contract Registry/OpenAPI 스키마 부분 |
| Webhook | Event/Retry/Signature/Replay | ★**준수** — `Webhooks.php` HMAC-SHA256 검증(opt-in 강제)·`X-Hub-Signature-256` 등 복수헤더·`hash_equals` 상수시간 |
| EDI(X12/EDIFACT/AS2) | 전자문서 표준 | **부재**(grep 0). B2B EDI 파트너 없음 — API/Webhook 연동이 정본 |
| EDI Mapping/Canonical Model | Partner→Canonical→DTO | ★**대응물** — `EventNorm`(이벤트 정규화)·Unified Data Model(DATA 헌법)·CONNECTOR_KEY 채널→커넥터 정규화 |
| Message Transformation | XML/CSV/EDI→DTO | **부분** — JSON/CSV 파싱·`DataExport`·정규화 매퍼. 형식 Transformation Registry 부재 |
| SFTP/FTPS/AS2 | 보안 파일전송 | **부재**. 파일연동은 HTTPS 업/다운로드(`MediaHost`·`DataExport`) |
| Partner Adapter | 파트너별 독립 어댑터 | ★**준수** — 채널별 어댑터(11번가/네이버/쿠팡/카카오/라인/Meta/Google/TikTok 등 독립 구현) |
| Authentication | OAuth2/JWT/API Key/mTLS | ★**준수(부분)** — OAuth2(`OAuth`)·JWT·`api_key`(SHA-256)·채널별 HMAC 서명. mTLS 미사용 |
| Retry | Timeout/5xx 재시도·Idempotent | ★**준수** — `omni_outbox` attempts+재시도(최대 3회)·defer(quiet-hours/STO는 attempts 미증가) |
| Idempotency | Key/Dedup/Hash | **부분** — 채널별 dedup(externalId upsert)·정규화. 형식 Idempotency-Key 헤더 표준 부재 |
| Message Queue | Kafka/RabbitMQ/Redis | **부재**(Part018). ★**DB-backed outbox**(`omni_outbox`)+cron 워커가 큐 대응물 |
| Error Handling | Technical/Business/Mapping/Contract | **부분** — HTTP status·error 컬럼·Alerting. 형식 오류분류 taxonomy 부분 |
| Monitoring | Success Rate/Retry/Partner Availability | **부분** — `ChannelSync` 상태·`SystemMetrics`·연동허브 상태. 파트너별 Dashboard 부분 |
| Logging | Partner/Trace ID/마스킹 | **부분** — error_log·`ai_call_log`·출처 기록. Trace ID 부재·민감정보 마스킹 부분(Part023) |
| Security(TLS/서명/IP Allowlist) | 암호화 통신 | ★**준수(부분)** — HTTPS·HMAC 서명·`Crypto` AES·`Ssrf` 가드. TLS 1.3 강제/Cert Rotation 인프라측 |
| Disaster Recovery | Queue Replay/DLQ | ★**대응물** — `/v39x/admin/dlq/replay`·`replay_bulk` 관리 라우트·outbox 재큐 |
| Compliance(GDPR/ISO/SOC2) | 규정 준수 | **부분** — GDPR(`GdprConsent`/`Dsar`)·PII 미저장. ISO/SOC2 형식 인증 아님(Part012) |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(API First/Contract/Message Driven/Loose Coupling/Retry Safe/Idempotent/Event) | **부분 준수** | ★API First·Loose Coupling(어댑터)·Retry Safe(outbox)·Event(Webhook/pixel). 형식 Contract-first 부분 |
| §4 Integration Architecture | **★준수** | 도메인이 파트너 직접의존 안 함·어댑터 경유(`ChannelSync`/`AdAdapters`) |
| §5 EIP | **부분(패턴만)** | Router/Translator/DLQ 패턴은 코드로 실재. 형식 EIP 프레임워크(Camel) 아님 |
| §6 Integration Hub | **★대응물** | `Connectors`·`OpenPlatform`·연동허브 UI·Connector Registry(DATA Volume 2) |
| §7 External API(REST/SOAP/GraphQL/gRPC) | **부분** | REST 중심. SOAP/GraphQL/gRPC 미사용(대상 파트너 REST) |
| §8 API Contract | **부분** | `/v{NNN}` 버전·핸들러 스펙·`docs/V*` 명세. 형식 OpenAPI/SLA Registry 부분 |
| §9 Webhook | **★준수** | ★`Webhooks.php` HMAC-SHA256 검증·복수 서명헤더·`hash_equals`. 서명시크릿 설정 시 즉시 강제전환(189차) |
| §10 EDI(X12/EDIFACT) | **부재** | B2B EDI 파트너 없음. API/Webhook 연동이 정본(이식 대상 아님) |
| §11~§12 EDI Mapping/Canonical Model | **★대응물** | `EventNorm`·Unified Data Model(DATA 헌법)·표준모델 정규화·CONNECTOR_KEY |
| §13 Message Transformation | **부분** | JSON/CSV 파싱·정규화 매퍼. 형식 Transformation Registry 부재 |
| §14~§15 SFTP/FTPS/AS2 | **부재** | 파일연동=HTTPS(`MediaHost`/`DataExport`). AS2/EDI B2B 파트너 없음 |
| §16 Partner Adapter | **★준수** | 파트너별 독립 어댑터(11번가/네이버/쿠팡/카카오/라인/Meta/Google/TikTok) |
| §17 Authentication | **★준수(부분)** | OAuth2·JWT·`api_key`(SHA-256)·채널 HMAC. mTLS 미사용 |
| §18 Retry | **★준수** | `omni_outbox` attempts+재시도(3회)·defer(attempts 미증가). Retry 금지대상(4xx) 구분 부분 |
| §19 Idempotency | **부분** | externalId dedup·upsert 정규화. 형식 Idempotency-Key 헤더 표준 부재 |
| §20 Message Queue | **부재(대응물)** | Kafka/RabbitMQ 없음(Part018). ★DB-backed `omni_outbox`+cron 워커 |
| §21 Error Handling | **부분** | HTTP status·error 컬럼·`Alerting`. 형식 오류 taxonomy 부분 |
| §22 Monitoring | **부분** | ChannelSync 상태·SystemMetrics·연동허브. 파트너별 Dashboard 부분 |
| §23 Logging | **부분** | error_log·출처 기록·`ai_call_log`. Trace ID 부재·마스킹 부분 |
| §24 Security | **★준수(부분)** | HTTPS·HMAC 서명·`Crypto` AES·`Ssrf` 가드. TLS1.3 강제/Cert Rotation=인프라측 |
| §25 Disaster Recovery | **★대응물** | `dlq/replay`·`replay_bulk` 관리 라우트·outbox 재큐 |
| §26 Compliance | **부분** | GDPR(`GdprConsent`/`Dsar`)·PII 미저장. ISO/SOC2 형식 인증 아님 |
| §27~§28 PHP/Claude(Guzzle/PSR-18/Canonical Mapper/DTO) | **부분** | ★Canonical(`EventNorm`)·어댑터 분리·Retry. **Guzzle/PSR-18 미사용(raw curl/file_get_contents)**·Typed DTO 부분 |
| §29~§30 검증(artisan integration:health 등) | **대상 없음** | artisan 없음. `ChannelSync` 상태 API·`dlq/replay`·연동허브로 대체 |

---

## 4. 확립된 표준 (신규 연동 코드가 따를 정본)

- ★**커넥터/어댑터 정본**: 신규 외부 연동은 **파트너별 어댑터**(`ChannelSync`/`AdAdapters`/`Connectors`/`OpenPlatform` 확장) + **Connector Registry 등록**(DATA 헌법 Volume 2·인증/증분수집/정규화/Quality Gate/Trust Score). ★**동일 Connector/API/Object/Schema 중복 구현 금지 — 기존 확장**(DATA Volume 2 §14).
- ★**채널 나열 금지 → 표준모델 정규화·통합**: 파트너 응답은 `EventNorm`·Unified Data Model 로 Canonical 정규화 후 내부 사용. `CONNECTOR_KEY`(채널→커넥터) 정규화 준수.
- ★**Webhook 정본 = `Webhooks.php`**: HMAC-SHA256 서명검증(`GENIE_WEBHOOK_SECRET_<VENDOR>` 설정 시 강제·복수 서명헤더·`hash_equals` 상수시간). 신규 인바운드 Webhook 은 이 검증 경유. **서명 없는 수신 신설 금지**.
- ★**재시도 = `omni_outbox` 패턴**: attempts 카운터+최대 재시도·일시실패(5xx/timeout) 재큐·**영구실패(4xx/검증/인증)는 재시도 금지**. defer(quiet-hours/STO)는 attempts 미증가. **DB-backed outbox = 큐 대응물**(Kafka 이식 금지·Part018).
- ★**장애복구 = DLQ replay**(`/v39x/admin/dlq/replay`·`replay_bulk`)·outbox 재큐. 메시지 재처리 경로 유지.
- ★**외부 서명/보안**: 아웃바운드 HMAC-SHA256(`X-Genie-Signature: t=,v1=` Slack스타일·Alerting)·AWS SigV4(PriceOpt/네이버)·`Crypto` AES 시크릿·`Ssrf` 가드(raw curl SSRF 표면 차단). HTTPS 필수.
- ★**정직 미산출·테넌트 격리**: 파트너 응답 없음/미연결=빈결과+사유(가짜값 금지·288차 가짜녹색 `ok=>true` 위장 금지). 모든 연동 데이터는 위조 불가 권위 tenant 격리.

---

## 5. 의도적 미적용 + 사유 (정직 보고)

1. **형식 EDI(ANSI X12/EDIFACT/XML EDI)·AS2** — 안 함. B2B EDI 파트너가 없다(커머스/광고 API·Webhook 연동이 정본). EDI 도입=파트너 계약 선행 종속.
2. **SFTP/FTPS** — 안 함. 파일연동은 HTTPS 업/다운로드(`MediaHost`·`DataExport`). SFTP 파트너 요구 시 도입.
3. **EIP 프레임워크(Apache Camel/MuleSoft)** — 안 함. Router/Translator/DLQ 패턴은 코드로 개별 실재. 프레임워크 이식=런타임 재설계.
4. **Message Queue(Kafka/RabbitMQ/Redis Queue)** — 안 함(Part018). ★DB-backed `omni_outbox`+cron 워커가 큐 대응물(단일 모놀리스에 적합).
5. **Guzzle/Symfony HttpClient/PSR-18** — 안 함. raw `curl`/`file_get_contents`+`Ssrf` 가드. HTTP Client 추상화 미도입(의존성 최소화).
6. **SOAP/GraphQL/gRPC 서버·mTLS·형식 Contract Registry(OpenAPI)·Trace ID** — 안 함/부분. REST+`/v{NNN}` 버전 라우팅·핸들러 스펙이 정본.
7. **artisan `integration:*`/`webhook:*`/`contract:*` 명령** — 없음(Slim). `ChannelSync` 상태 API·`dlq/replay`·연동허브 UI로 대체.

★**준수하는 실 원칙**: **어댑터 분리(Loose Coupling)·Connector Registry(중복 금지·기존 확장)·Canonical 정규화(채널 나열 금지)·Webhook HMAC 검증·Retry(outbox attempts+backoff)·DLQ replay·외부 HMAC 서명·SSRF 가드·정직 미산출(가짜녹색 금지)·테넌트 격리**.

---

## 6. Claude Code 구현 규칙

1. 신규 외부 연동=파트너 어댑터(`ChannelSync`/`AdAdapters`/`Connectors`/`OpenPlatform`) 확장 + **Connector Registry 등록**(DATA Volume 2·Quality Gate·Trust Score). ★**동일 Connector/API/Object/Schema 중복 구현 금지**.
2. 파트너 응답=`EventNorm`·Unified Data Model 로 Canonical 정규화 후 사용. ★**채널 나열 금지·표준모델 정규화**.
3. 인바운드 Webhook=`Webhooks.php` HMAC-SHA256 검증 경유(서명 없는 수신 신설 금지).
4. 재시도=`omni_outbox` 패턴(attempts+backoff·5xx/timeout 재큐·**4xx/검증/인증 재시도 금지**). Kafka/RabbitMQ 이식 금지(DB-backed outbox 유지).
5. 아웃바운드=HMAC-SHA256/SigV4 서명·`Crypto` AES 시크릿·`Ssrf` 가드·HTTPS. raw curl 시 SSRF 가드 필수.
6. ★**정직 미산출**: 파트너 미연결/응답없음=빈결과+사유(가짜녹색 `ok=>true` 위장 금지·288차). 테넌트 격리 절대.
7. EDI(X12/EDIFACT)·AS2·SFTP·Camel/MuleSoft·Kafka·Guzzle 를 "명세에 있다"는 이유로 이식하지 않는다(대상 파트너/인프라 부재).

---

## 7. Completion Criteria

- [x] 연동 스택 **실측**(EDI/AS2/SFTP/EIP프레임워크/Guzzle/Kafka 부재·커넥터/어댑터·Webhook HMAC·outbox retry·DLQ replay·EventNorm 정규화)
- [x] 명세 §3~§30 **섹션별 매핑·판정**(형식 EDI/EIP/SFTP/MQ 부재 증명)
- [x] 실 연동(어댑터+Connector Registry+Canonical 정규화+Webhook HMAC+retry+DLQ) 성문화(§4)
- [x] ★어댑터 분리·Connector Registry(중복 금지)·채널 나열 금지·Webhook HMAC·정직 미산출(가짜녹색 금지)·테넌트 격리 명시
- [x] 의도적 미적용 + 사유(§5) — EDI/AS2/SFTP/EIP프레임워크/Kafka/Guzzle/mTLS
- [x] Claude Code 규칙(§6) · `ChannelSync` 상태·`dlq/replay`·연동허브 실 경로 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 실재하는 **커넥터/어댑터 표준 + Canonical 정규화 + Webhook HMAC
> 검증 + outbox 재시도 + DLQ replay** 연동 스택의 성문화이지 형식 EDI(X12/EDIFACT)/AS2/Camel/Kafka/Guzzle
> 이식이 아니다. ★DATA 헌법 "**채널 나열 금지 — 표준모델 정규화·통합**"·"**중복 구현 금지 — 기존 확장**"이
> 연동 정본이다.

---

## 다음 Part

**CCIS Part029 — Search Engine, Full-Text Search, Vector Search & Knowledge Retrieval Standards** — ★사전 실측 예고: Elasticsearch/OpenSearch/Meilisearch·형식 Vector DB(Pinecone/Weaviate)는 **부재**(289차후속 Vector DB 보류=표본 0). 검색 실체는 **MySQL LIKE/FULLTEXT·`GeniegoGlossary`·챗봇 지식(`gen_chatbot_knowledge.mjs`·270차 파이프라인)·RAG Retriever(`geniegoFeatureDetails`·MEA 055 weak)·`graph_node` KG**. Part029 도 실측→ES/Vector DB 부재증명→MySQL 검색+챗봇 지식+RAG Retriever 성문화(검색엔진 이식 금지).
