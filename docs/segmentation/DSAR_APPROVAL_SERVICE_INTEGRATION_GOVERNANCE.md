# DSAR — Integration Governance 승인 (EPIC 06-A-03-02-03-04 Part 3-6 · per-entity: Integration Governance · 스펙 §21)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
- **ground-truth**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped/Dynamic(Part 3-1~3-5)·Decision Core 실 구현 부재
- **불변**: UNKNOWN Permit 금지(ADR D-2) · 외부 벤더 자격증명 ≠ 내부 identity(ADR D-3) · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §21 Integration Governance는 **ERP · CRM · Payment · Settlement · Logistics · External API** 6종 외부 연동에 대한 identity/credential 통제 계층이다. EXISTING_IMPLEMENTATION §7·ADR §1이 명시하는 ChannelCreds/Connectors 자격증명 저장·검증 인프라가 근접 substrate이나, 이는 "테넌트가 등록한 외부 자격증명 저장소"이지 스펙이 요구하는 **Integration Identity(고유 PK·lifecycle·audit actor를 가진 별도 주체)**가 아니다 — PARTIAL 판정.

## 2. Canonical 필드

| # | 필드 | 의미 |
|---|---|---|
| 1 | integration id | Integration Identity 식별자 |
| 2 | integration category | 아래 §3 열거형 |
| 3 | tenant id | 자격증명 소유 테넌트 |
| 4 | credential ref | 저장된 자격증명 참조 |
| 5 | verification state | ping/검증 결과 |
| 6 | audit actor | 변경 감사 actor |

## 3. 열거형 / 타입

**Integration Category**(스펙 §21 원문): `ERP` · `CRM` · `PAYMENT` · `SETTLEMENT` · `LOGISTICS` · `EXTERNAL_API`

## 4. 실 substrate 매핑 (PARTIAL — 자격증명 저장/검증은 실재, Identity 엔티티는 부재)

| Integration Category | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| EXTERNAL_API(일반) | `channel_credential`(CRUD+AES-256-GCM 암호화)·`connector_token`(OAuth 토큰) | `ChannelCreds.php:25-1284,252`·`Connectors.php:154-177` | **근접(PARTIAL)** — 자격증명 저장/암호화/ping 검증(`:576-834`)은 실재하나, 이는 "테넌트가 소유한 외부 API 접속 정보"이며 Integration 자체를 별도 identity(고유 PK/lifecycle/audit actor)로 취급하지 않음 |
| ERP/CRM/PAYMENT/SETTLEMENT/LOGISTICS(개별 분류) | 없음 — ChannelCreds/Connectors는 채널/커넥터 단위로 저장할 뿐 ERP/CRM/Payment/Settlement/Logistics라는 스펙 §21의 6분류 태그로 구분되지 않음(이번 ground-truth 2편에 해당 분류 코드 인용 없음) | — | **ABSENT(분류 체계 부재)** |
| EXTERNAL_OUTBOUND(외부 벤더) | Google GCP 서비스계정 JWT(GA4)·Snowflake 키페어 JWT — **아웃바운드 전용, 내부 identity 아님** | `Connectors.php:3781-3815`·`DataExport.php:130-132,550-584,28` | **근접이나 오흡수 엄금(EXTERNAL_OUTBOUND)** — ADR D-3 "외부 벤더 자격증명 ≠ 내부 identity" 명시. Integration Identity로 등록 시 반드시 별도 Adapter 분류(ADR §3) |
| "Integration User" 근접 명명 | `api_key.role='connector'` — role 값일 뿐, 별도 Integration Identity 엔티티 아님 | `Keys.php:95,193,208` | **ABSENT(최근접이나 미달)** — EXISTING_IMPLEMENTATION §7 명시: "api_key 메타 role 값일 뿐·별도 Integration Identity 엔티티(고유 PK/lifecycle/audit actor) 부재(grep 0)" |

## 5. 설계 원칙

- ★PARTIAL 판정의 정확한 의미: "자격증명 저장·암호화·검증"은 성숙(ChannelCreds ping 검증 `:576-834`)하지만, 그 자격증명을 소유·사용하는 **주체(Integration Identity) 자체는 모델링되어 있지 않다** — channel_credential의 "주체=테넌트, 객체=자격증명"이며 Integration은 객체 속성(채널명)일 뿐 별도 identity row가 아니다(EXISTING_IMPLEMENTATION §7).
- ERP/CRM/Payment/Settlement/Logistics 6분류(스펙 §21)를 "이미 ChannelSync 채널 목록으로 커버된다"고 오판하지 않는다 — 채널(11번가/쿠팡/네이버 등 커머스 채널)과 스펙이 말하는 Integration 대분류(ERP/CRM/Payment 등 업무 시스템군)는 다른 축이며, 이번 ground-truth 인용 범위에 후자의 분류 코드는 없다(부재 과장 방지를 위해 "채널=Integration"으로 대충 흡수하지 않음).
- 외부 벤더 JWT(Google/Snowflake)는 반드시 EXTERNAL_OUTBOUND/Adapter로 분리하고 Integration Identity Registry에 내부 identity로 등록하지 않는다(ADR D-3·§2 "중복이 아닌 것" 재확인).
- 신설 시 ChannelCreds/Connectors를 Integration Credential substrate로 재사용(ADR D-1 INTEGRATION_CREDENTIAL 흡수 분류)하고, 그 위에 Integration Identity(고유 PK)·Integration Role·Runtime Audit actor를 신규 계층으로 얹는다(병렬 신규 자격증명 저장소 신설 금지 — Golden Rule).

## 6. Gap / BLOCKED_PREREQUISITE

- Integration Credential 저장/암호화/검증(ChannelCreds/Connectors)은 PARTIAL 실재, Integration Identity 엔티티·6분류 체계(ERP/CRM/Payment/Settlement/Logistics/External API)·Integration Role·Runtime Audit actor는 ABSENT.
- 외부 벤더 JWT의 Adapter 분리 설계(오흡수 방지 가드) = 순신규(ADR §3).
- 실 구현 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped/Dynamic·Decision Core 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.
