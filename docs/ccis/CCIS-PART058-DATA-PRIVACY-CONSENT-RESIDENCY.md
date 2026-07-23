# GeniegoROI Claude Code Implementation Specification

# CCIS Part058 — Enterprise Data Privacy, Consent Management, Data Residency & Sovereign Cloud Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Enterprise Data Privacy·Consent Management·Data Residency·Sovereign Cloud 표준을 수립한다.

> ★**성격(★Part012/034/049 중복 — 프라이버시 컨트롤 강함·형식 Consent Platform/Residency/Sovereign Cloud
> 부재)**: 본 Part 는 **CCIS Part012(보안)·034(데이터 거버넌스)·049(MDM)와 중복**되며 그 판정을 승계한다.
> 프라이버시는 이 저장소가 **은행급**을 지향하는 **강한 영역**이나, **개인정보 보호 컨트롤**이 강하고 **형식
> Consent Management Platform(OneTrust)·Data Residency/Sovereign Cloud**는 없다(단일 VPS·단일 리전·한국).
> 명세가 다루는 **형식 CMP·Data Residency(regional/country storage)·Data Sovereignty·Sovereign Cloud(regional/
> isolated infra)·Cross-Border Data Transfer(승인)·형식 KMS·ISO 27701/27018 인증**은 **부분/부재**한다. ★**강한
> 축(프라이버시 컨트롤)**: **`GdprConsent`**(동의·`hash_hmac` 서명)·**`Dsar`**(삭제/이동/**익명화**·**삭제vs
> 익명화**·법정보존 데이터 신원 파기·**fail-closed**·**email_suppression 삭제 금지 역설**·해시 3종 정확 매칭·
> Part034)·**`PreferenceCenter`**(수신동의·quiet-hours·Part033)·**PII 미저장**(집계 코호트·해시 식별자·헌법)·
> **`Crypto` AES-256-GCM**·**Masking**(`mask()`)·**CRM canonical identity**(가명처리 유사·Part049)·**테넌트
> 격리 절대** 는 강하게 실재한다. Part001 §4 에 따라 실측 → CMP/Residency/Sovereign Cloud 부재증명 →
> GdprConsent+Dsar+PII 미저장 성문화했다. ★정본=**Part012/034/049** 승계·**"삭제vs익명화·수집≠사용·데이터
> 최소수집"** 재확인·재판정 금지. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 프라이버시 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| Privacy Architecture | Collection→Consent→Policy→Processing→Storage→Audit | ★**대체로 준수** — 동의 검증·PII 미저장·`Crypto`·`SecurityAudit`. 형식 Policy Engine 부분 |
| Data Privacy | Personal/Sensitive Data Protection | ★**준수** — PII 미저장(집계 코호트)·`Crypto` AES·Masking·`Dsar` |
| Privacy by Design | Secure Default/Minimal Collection | ★**강함** — **PII 미저장·데이터 최소수집(집계 코호트·해시 식별자)**·헌법 원칙 |
| Consent Management | Collection/Update/Withdrawal/Verify | ★**실재** — `GdprConsent`(동의·`hash_hmac` 서명)·`PreferenceCenter`(수신동의) |
| Consent Lifecycle | Registration/Renewal/Expiration/Revoke | ★**부분 준수** — `GdprConsent`·`PreferenceCenter`(철회)·`email_suppression`. 형식 만료/갱신 부분 |
| Data Classification | Public/Internal/Confidential/Restricted | **부분** — PII 미저장·민감도. 형식 4등급 taxonomy 아님(Part034) |
| Data Residency | Regional/Country Storage/Validation | **부재(out of scope)** — 단일 VPS·단일 리전(한국). 지역별 저장 없음 |
| Data Sovereignty | Sovereign Storage/Processing/Local Encrypt | **부분(대응물)** — 국내 저장·`Crypto` 암호화. 형식 sovereign 요구 대응 부분 |
| Sovereign Cloud | Regional/Isolated Infra/Dedicated Encrypt | **부재(out of scope)** — 단일 VPS(regional cloud/isolated infra 없음·Part045) |
| Cross-Border Data Transfer | Approval/Validation/Audit | **부재(대응물)** — 단일 리전(국경 간 이전 없음). 외부 채널 API는 채널사 정책 |
| Data Masking | Dynamic/Static/Partial/Context | ★**부분 준수** — `mask()`(자격증명·원문 미반환)·Masking. Dynamic/Context 부분 |
| Data Anonymization | Identifier Removal/Aggregation/Irreversible | ★**실재** — `Dsar`(**법정보존 데이터=신원 식별자만 파기·익명화**)·집계 코호트(비가역) |
| Data Pseudonymization | Tokenization/Alias/Reversible | ★**대응물** — **해시 식별자**·CRM canonical `identity_id`(Part049). 형식 reversible 토큰 부분 |
| Privacy Governance | Policy/Review/Committee/Audit | **부분** — DATA 헌법·`Dsar`·`SecurityAudit`·`action_request`. 형식 위원회 부분 |
| Data Retention Policy | Rule/Auto Expiration/Secure Delete/Audit | ★**실재** — `Dsar`(삭제vs익명화·법정보존·fail-closed). auto expiration 부분 |
| Monitoring | Consent/Violation/Transfer/Retention | **부분** — `GdprConsent` 상태·`SecurityAudit`·`AnomalyDetection`. 형식 privacy 대시보드 부분 |
| Logging | Consent/Privacy Record/Classification | ★**부분 준수** — `SecurityAudit`(불변)·`Dsar` 이력. Consent ID/Trace 부분 |
| Security(AES-256/RBAC/Access/KMS/격리) | 개인정보 보호 | ★**준수** — AES-256-GCM(`Crypto`)·RBAC+Scope·**테넌트 격리 절대**. 형식 KMS 아님(앱레벨) |
| Compliance(GDPR/CCPA/PIPA/ISO 27701/27018) | 규정 | ★**부분 준수** — GDPR Art.17·PIPA(`Dsar`/`GdprConsent`). ISO 27701/27018 형식 인증 아님 |
| Disaster Recovery | Consent/Metadata/Backup 복구 | **부분** — DB 백업·`Crypto` 키. Residency 검증 대상 없음 |
| Performance(Privacy/Consent Cache/Regional Routing) | 처리 성능 | **부분** — HTTP 캐시. Regional Routing 대상 없음(단일 리전) |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Privacy by Design/by Default/Data Minimization/Explicit Consent/Sovereign Data/Transparency/Tenant Isolation/Auditability) | **★대체로 준수** | ★Privacy by Design/Default(PII 미저장)·Data Minimization(집계 코호트)·Explicit Consent(`GdprConsent`)·Tenant Isolation·Auditability(`SecurityAudit`). Sovereign Data 부분 |
| §4 Privacy Architecture | **★대체로 준수** | 동의·PII 미저장·`Crypto`·감사 |
| §5 Data Privacy | **★준수** | PII 미저장·`Crypto`·Masking·`Dsar` |
| §6 Privacy by Design | **★강함** | PII 미저장·최소수집(헌법) |
| §7 Consent Management | **★실재** | `GdprConsent`·`PreferenceCenter` |
| §8 Consent Lifecycle | **부분 준수** | `GdprConsent`·철회·`email_suppression` |
| §9 Data Classification | **부분** | PII 미저장. 형식 taxonomy 아님(Part034) |
| §10 Data Residency | **부재(out of scope)** | 단일 리전(한국) |
| §11 Data Sovereignty | **부분(대응물)** | 국내 저장·`Crypto`. 형식 대응 부분 |
| §12 Sovereign Cloud | **부재(out of scope)** | 단일 VPS |
| §13 Cross-Border Transfer | **부재(대응물)** | 단일 리전. 외부 채널=채널사 정책 |
| §14 Data Masking | **부분 준수** | `mask()`·Masking |
| §15 Data Anonymization | **★실재** | `Dsar`(법정보존=신원 파기·익명화)·집계 코호트 |
| §16 Data Pseudonymization | **★대응물** | 해시 식별자·CRM `identity_id` |
| §17 Privacy Governance | **부분** | DATA 헌법·`Dsar`·`SecurityAudit` |
| §18 Data Retention Policy | **★실재** | `Dsar`(삭제vs익명화·법정보존·fail-closed) |
| §19 Monitoring | **부분** | `GdprConsent`·`SecurityAudit`·`AnomalyDetection` |
| §20 Logging | **부분 준수** | `SecurityAudit`·`Dsar` 이력 |
| §21 Security | **★준수** | AES-256·RBAC·테넌트 격리. KMS=앱레벨 |
| §22 Compliance | **부분 준수** | GDPR Art.17·PIPA. ISO 27701/27018 형식 아님 |
| §23 Disaster Recovery | **부분** | DB 백업·`Crypto` 키 |
| §24 Performance | **부분** | HTTP 캐시 |
| §25~§26 PHP/Claude(Privacy/Consent/Classification/Masking/Sovereign Cloud Adapter) | **부분** | ★`GdprConsent`·`Dsar`·`PreferenceCenter`·PII 미저장·`Crypto`. Sovereign Cloud/CMP/KMS Adapter 부재 |
| §27~§28 검증(privacy:health/consent:validate/residency:status) | **대상 없음** | artisan 없음. `GdprConsent`·`Dsar` API·`SecurityAudit` 로 대체 |

---

## 4. 확립된 표준 (신규 프라이버시 코드가 따를 정본)

- ★★**Privacy by Design 정본 = PII 미저장(집계 코호트·해시 식별자)**. ★**데이터 최소수집**(헌법·No PII storage). 신규 ingest 는 집계 코호트 유지·개별 buyer 레코드 신설 금지(v418.1 decisioning 원칙).
- ★**동의 정본 = `GdprConsent`(hash_hmac 서명)+`PreferenceCenter`(수신동의·quiet-hours)**. 동의 없는 개인정보 처리 금지·철회=`email_suppression`.
- ★★**Retention 정본 = `Dsar`(삭제vs익명화)**: 법정 보존의무 데이터(주문·클레임·반품·배송·정산)는 **삭제 아닌 익명화**(GDPR Art.17(3)(b)·회계 정합값 보존·신원 식별자만 파기)·**fail-closed**(신원확인 전 실행 불가)·★**email_suppression 삭제 금지**(삭제=수신거부 해제 역설)·**해시 3종 정확 매칭**(틀리면 조용히 미삭제).
- ★**가명/익명 = 해시 식별자 + CRM canonical identity**(Part049·가명처리)·집계 코호트(비가역 익명화). Masking=`mask()`(원문 미반환).
- ★**보안 = AES-256-GCM(`Crypto`)+RBAC+Scope+테넌트 격리 절대**. KMS=앱레벨 `Crypto`(형식 KMS 미도입).
- ★**Data Residency/Sovereign Cloud 정직**: 단일 VPS·단일 리전(한국)이라 **regional storage/sovereign cloud 부재**. ★**Cross-Border=단일 리전이라 국경 간 이전 없음**(외부 채널 API는 채널사 정책·오흡수 금지: 외부 API 호출≠개인정보 국외이전).
- ★★**Part012/034/049 중복·재판정 금지**: 보안=Part012·거버넌스/retention=Part034·가명처리=Part049 정본. 본 Part 는 Consent/Residency/Sovereign Cloud 관점 보강.
- ★**사업범위 원칙**: **형식 CMP(OneTrust)·Data Residency·Sovereign Cloud·형식 KMS 는 단일 리전 범위 밖/부분** — 다중 리전/규제 요구 전 선이식 금지.

---

## 5. 의도적 미적용 + 사유 (정직 보고 — Part012/034/049 중복 + Residency/Sovereign 부재)

1. **형식 Consent Management Platform(OneTrust)** — 안 함. `GdprConsent`(hash_hmac 서명)+`PreferenceCenter`가 대응물. 전용 CMP=별도 도입.
2. **Data Residency(regional/country storage)·Sovereign Cloud(regional/isolated infra)** — 안 함. **단일 VPS·단일 리전(한국)**(Part045). 다중 리전/데이터 주권 요구 발생 시 도입.
3. **Cross-Border Data Transfer(승인/감사)** — 대응물. 단일 리전이라 국경 간 이전 없음. ★**외부 채널 API 호출은 채널사 정책**(개인정보 국외이전 오흡수 금지·PII 미저장이라 표면 최소).
4. **형식 Data Classification taxonomy·형식 KMS·ISO 27701/27018 인증** — 부분. PII 미저장·`Crypto` AES(앱레벨)·GDPR/PIPA 기술통제는 준수·형식 인증서는 외부 프로세스.
5. **Part012/034/049 와 중복되는 보안/거버넌스/가명처리** — 각 Part 정본(재판정 금지). 본 Part 는 Consent/Residency 관점만.
6. **artisan `privacy:*`/`consent:validate`/`residency:status` 명령** — 없음(Slim). `GdprConsent`·`Dsar` API·`SecurityAudit` 로 대체.

★**준수하는 실 원칙(강함)**: **Privacy by Design(PII 미저장·최소수집·집계 코호트)·동의(`GdprConsent` hash_hmac·`PreferenceCenter`)·Retention(`Dsar` 삭제vs익명화·법정보존·email_suppression 역설·해시 3종)·가명/익명(해시·CRM identity)·AES-256·테넌트 격리 절대·GDPR/PIPA·`SecurityAudit`**. ★**오흡수 차단**: 외부 채널 API≠개인정보 국외이전(PII 미저장). ★**Part012/034/049 정본 재사용**.

---

## 6. Claude Code 구현 규칙

1. ★★Privacy by Design=PII 미저장(집계 코호트·해시 식별자)·데이터 최소수집. 개별 buyer 레코드 신설 금지(헌법).
2. 동의=`GdprConsent`(hash_hmac)+`PreferenceCenter`. 동의 없는 처리 금지·철회=`email_suppression`.
3. ★★Retention=`Dsar`(법정보존=삭제 아닌 익명화·fail-closed·email_suppression 삭제 금지·해시 3종 정확 매칭). 가명=해시/CRM identity·Masking=`mask()`.
4. 보안=AES-256(`Crypto`)+RBAC+테넌트 격리 절대. ★외부 채널 API≠개인정보 국외이전(오흡수 금지·PII 미저장).
5. ★Data Residency/Sovereign Cloud/형식 CMP/KMS 를 선이식하지 않는다 — 단일 리전 범위 밖(다중 리전/규제 요구 선행).
6. ★★보안/거버넌스/가명처리 판정=Part012/034/049 정본(재판정 금지). OneTrust/Sovereign Cloud 이식 금지(GdprConsent+Dsar+PII 미저장 로 커버).

---

## 7. Completion Criteria

- [x] 프라이버시 스택 **실측**(형식 CMP/Data Residency/Sovereign Cloud/Cross-Border/형식 KMS 부재·`GdprConsent`·`Dsar` 삭제vs익명화·`PreferenceCenter`·PII 미저장·`Crypto` AES·테넌트 격리 실재)
- [x] 명세 §3~§28 **섹션별 매핑·판정**(Residency/Sovereign Cloud **out of scope**(단일 리전) 증명·프라이버시 컨트롤 강함·Part012/034/049 중복)
- [x] 실 프라이버시(GdprConsent+Dsar+PreferenceCenter+PII 미저장+Crypto+테넌트 격리) 성문화(§4)
- [x] ★★Privacy by Design(PII 미저장·최소수집)·삭제vs익명화(email_suppression 역설·해시 3종)·가명/익명·★오흡수(외부 API≠국외이전) 명시
- [x] 의도적 미적용 + 사유(§5) — CMP/Data Residency/Sovereign Cloud/Cross-Border/형식 KMS/ISO 27701(+Part012/034/049 중복)
- [x] Claude Code 규칙(§6) · `GdprConsent`·`Dsar`·`PreferenceCenter`·PII 미저장·`Crypto` 실 경로 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 **Part012/034/049 중복 + 강한 프라이버시 컨트롤**(PII 미저장 Privacy
> by Design + `GdprConsent` 동의 + `Dsar` 삭제vs익명화 + 해시 가명처리 + AES-256 + 테넌트 격리)의 성문화이지
> OneTrust/Sovereign Cloud/Data Residency 이식이 아니다. ★**Data Residency/Sovereign Cloud 는 단일 리전(한국)
> 범위 밖**이며, ★**외부 채널 API 호출은 개인정보 국외이전이 아니다**(PII 미저장). 보안/거버넌스/가명처리=
> Part012/034/049 정본(재판정 금지).

---

## 다음 Part

**CCIS Part059 — Enterprise Platform Engineering, Internal Developer Platform (IDP), Golden Paths & Developer Experience** — ★사전 실측 예고: 형식 IDP(Backstage)·Service Catalog·Golden Paths·Self-Service Infra·Scorecards 는 **부재**(단일 모놀리스·소규모 팀)이나, 개발자 경험 실체는 **CLAUDE.md/docs(WORK_PROCESS·CHANGE_GATE·registry)·deploy.ps1(빌드 오케스트레이터)·cron SSOT 검증(check_cron_ssot.sh)·`gen_chatbot_knowledge.mjs`(자동화)·핸들러 패턴 표준(routes.php 문자열 매핑)·PHPStan(품질 게이트·290차)**로 부분 실재. Part059 도 실측→Backstage/Service Catalog/Golden Paths 부재증명→CLAUDE.md+deploy.ps1+registry 성문화. ★단일 모놀리스(Part025)·"신규=라우트 추가로 챗봇 자동 인지"·CHANGE_GATE 승계.
