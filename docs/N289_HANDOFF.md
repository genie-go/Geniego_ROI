# 289차 세션 인계서 — 288 코드 이력정합 + EPIC 06-A(Segmentation~Retention) 설계정본 8파트 + 발송게이트/phone DNC 실구현

> **성격**: 대부분 **비파괴 설계 명세(코드변경 0)** + **실 코드 2건**(발송게이트 P0·SEG-C4 phone DNC). **미배포**. 브랜치 `feat/n236-admin-growth-automation`(master 미접촉). 커밋 완료·push 예정.

---

## 0. 개요

288차 연속. 사용자가 EPIC 06-A Enterprise Engineering Handbook을 순차 투입 → **실제 코드 근거 전수조사 + Canonical 설계정본 확정**(EPIC 00~05 거버넌스 연속·비파괴). 중간에 확정된 CRITICAL wrong-target P0(발송게이트)와 SEG-C4(phone DNC)를 **실 코드로 구현**. SEG-H2(외부 광고 Removal)는 라이브 검증 필요로 **연기**(블라인드 지양·287차 죽은스켈레톤 교훈).

**핵심 원칙 준수**: 모든 설계문서는 실 코드(crm_segments·isMarketingSendAllowed·email_suppression·AdAdapters·crm_channel_prefs 등) 근거·file:line. 없는 것은 "현행 부재→목표계약"으로 **정직 기록**(허구전환 금지). 정본 재구현 금지·확장만. 기능후퇴 0.

---

## 1. 커밋 목록 (12건, 이 세션 · 시간순)

| 커밋 | 내용 | 성격 |
|---|---|---|
| `476f029e43b` | **288차 확정결함 19건**(가짜녹색 systemic·모델교체·VAT·TOCTOU·issuanceGuide 15개국) 서버배포분 git 이력정합 | 코드(배포됨) |
| `9c023cc0c03` | EPIC 06-A **Part 1** Segmentation·Audience·Cohort Inventory & Baseline | 설계(코드0) |
| `d0665762b56` | **Part 2** Canonical Segment Schema·DSL·Rule Engine·Versioning | 설계 |
| `9073d52a32b` | **Part 3-1** Canonical Audience Builder Foundation·Build Pipeline | 설계 |
| `bef04615a57` | **Part 3-2** Audience Eligibility Engine·Freshness·Destination Readiness | 설계 |
| `c2e6a753cdb` | **★발송게이트 P0 SEG-C1~C3** 무게이트 3경로에 정본 게이트 강제 | **코드(미배포)** |
| `c128efbac6d` | **Part 3-3-1** Canonical Consent Engine·Evidence·Projection | 설계 |
| `05c037a75df` | **Part 3-3-2** Suppression Engine·Preference·Revocation·Execution-time | 설계 |
| `407c1231872` | **★SEG-C4 phone DNC + SMS STOP** 미매핑 phone fail-open 갭 해소 | **코드(미배포)** |
| `00d15326a9c` | SEG-H2 라이브검증 세션 연기 결정 기록 | 문서 |
| `ede8e4786ef` | **Part 3-3-3-1** Privacy Foundation·Purpose Limitation·Processing Governance | 설계 |
| `8a248d3a7bb` | **Part 3-3-3-2** Retention·Archival·Data Lifecycle Governance | 설계 |

산출 문서: `docs/segmentation/`(SEGMENTATION_*·CANONICAL_SEGMENT_*·CANONICAL_AUDIENCE_*·CANONICAL_CONSENT_*·CANONICAL_SUPPRESSION_*·CANONICAL_PREFERENCE_*·CANONICAL_PRIVACY_*·CANONICAL_RETENTION_*·SEGMENT_RISK_REGISTER) + `docs/architecture/ADR_*`(8개) + `docs/pm/PM_CHANGE_HISTORY` + `docs/registry/`(DecisionLog·DuplicatePreventionLog·RepeatedDefectHistory·AuditHistory).

---

## 2. ★미배포 코드 2건 검증 계획 (배포 전 필수)

> **로컬 PHP 인터프리터 부재**(CLAUDE.md 기지사실) → 로컬 `php -l`·구동 검증 불가. **feat 브랜치 push 는 CI(deploy.yml=master 전용)를 트리거하지 않으므로 php -l CI 도 안 돎.** ∴ **배포 시 서버(php 8.1.34)에서 `php -l` 수동 실행 필수**, 이후 헤드리스 기능검증.

### 2.1 배포 전 구문검증 (서버 또는 php 설치 환경)
```
php -l backend/src/Handlers/SmsMarketing.php
php -l backend/src/Handlers/WhatsApp.php
php -l backend/src/Handlers/CRM.php
php -l backend/src/routes.php
```
(정적검토 완료: brace/스코프/시그니처 정상·프로덕션 정본 dispatchCampaignCore/email_suppression 충실 복사·G9 라우트정합 통과. 단 php -l 미실행.)

### 2.2 발송게이트 P0 (SEG-C1~C3) — 헤드리스
- **변경**: `SmsMarketing::send`(단건)·`SmsMarketing::broadcast`(freq-only→전체게이트)·`WhatsApp::send`(단건)에 `CRM::isMarketingSendAllowed` 강제. cid=0(미매핑)=fail-open(캠페인 동일·무회귀).
- **검증**: ①opt-out 등록 고객(crm_channel_prefs opted_in=0) 번호로 `POST /api/sms/send` → `ok:false, status:blocked, reason:channel_opt_out`. ②정상 고객 번호(설정 有) → 발송/sent. ③`/api/sms/broadcast` 에 suppressed·정상 혼합 → 응답 `capped/opted_out/quiet_deferred/sent` 집계 정합. ④`/api/whatsapp/send` opt-out 번호 → blocked. ⑤**무회귀**: 정상 고객 정상 발송 유지 확인.
- **★오탐 정정 확인**: `WhatsApp::sendOne`은 미변경(유일 호출자 Omnichannel::deliverWaterfall 가 이미 게이트). 재구현 금지.

### 2.3 SEG-C4 phone DNC (sms_suppression) — 헤드리스
- **변경**: `sms_suppression` 테이블(ensureTables 자가치유·MySQL+SQLite)·`SmsMarketing::isPhoneSuppressed/suppressPhone/isStopKeyword`·게이트 통합(`CRM.php:1140-1145` phone계열·매핑무관 차단)·API `/api/sms/suppression`(GET/POST/DELETE)·`/api/sms/opt-out`(STOP 인테이크).
- **검증**: ①`POST /api/sms/suppression {phone}` → 등록. ②**그 번호(crm_customers 미등록이어도)** 로 `/api/sms/send` → `blocked, reason:phone_suppressed` ← **핵심(fail-open 갭 해소 확인)**. ③`POST /api/sms/opt-out {phone, message:"수신거부"}` → `suppressed:true`; message 없거나 비STOP → suppressed:false. ④`GET /api/sms/suppression` → 목록·by_reason. ⑤`DELETE /api/sms/suppression {phone}` 후 재발송 → 차단 해제. ⑥테이블 생성 확인: `SHOW TABLES LIKE 'sms_suppression'`(운영/데모 각각).
- **잔여(후속 인프라)**: 캐리어 MO 직접 웹훅(NHN/SENS 콜백 포맷·공개 bypass·서명)=미구현. 현 `/sms/opt-out`은 세션인증(requirePro) 경유.

### 2.4 배포 절차(288차 실측 재사용)
백엔드=운영+데모 동일 업로드(3파일: SmsMarketing/WhatsApp/CRM + routes.php). chown www:www. **php-fpm 2서비스 reload**(php-fpm.service + php8.1-fpm.service). 데모=demo.genieroi.com(docroot roidemo.geniego.com). 운영=roi.geniego.com. plink/pscp `-pwfile`(백틱 제거). **배포는 사용자 승인 후·데모 동반·health 200 확인.**

---

## 3. EPIC 06-A 설계정본 (재구현 금지·후속 구현세션 입력)

- **완료 8파트**(전부 코드0·정직 부재기록): P1(Inventory) · P2(Segment Schema/DSL) · P3-1(Audience Builder) · P3-2(Eligibility) · P3-3-1(Consent) · P3-3-2(Suppression/Preference/Revocation) · P3-3-3-1(Privacy/Purpose) · P3-3-3-2(Retention/Lifecycle).
- **정본 매핑**(승격·재구현 금지): crm_segments+members=Customer Segment SoT · isMarketingSendAllowed=Eligibility Engine · crm_channel_prefs=Consent Store · email_suppression=Suppression Store · isFrequencyCapped=Frequency Engine · isQuietNow=Quiet Hours · AdAdapters=Destination/Data Sharing Activity · 데이터 헌법 Vol1~5/No-PII=Privacy 원칙 · cron/backup=Lifecycle.
- **핵심 발견**: "segment" 3도메인(Customer/Decisioning-cohort/Growth-ICP) 명명분리 · Definition↔Membership↔Audience↔Snapshot 분리·Version/Snapshot 부재 · Consent≠Suppression≠Eligibility≠Purpose Limitation · Unknown≠Granted·Fail-closed · Contactability≠Reachability · 무기한보존 금지·조기삭제/과도보존 둘다 결함.
- **후속 EPIC 예정**: Part 3-3-3-3(DSAR Access/Export/Rectification/Restriction) → 3-3-3-4(RTBF/Deletion Engine/Re-ingestion) → 3-3-3-5(Cross-border/Residency) → 3-3-3-6(Certification/Conformance/Production).

---

## 4. 잔여 P0/P1 (구현 대기)

| ID | 내용 | 상태 |
|---|---|---|
| SEG-C1~C3 | 발송게이트 표준화 | ✅ 구현·**배포+헤드리스 검증 대기**(§2.2) |
| SEG-C4 | phone DNC+STOP | ✅ 구현·**배포+헤드리스 검증 대기**(§2.3). 잔여=캐리어 MO 웹훅(인프라) |
| **SEG-H2** | Audience Removal(Meta/Google/TikTok users_remove) | **라이브 광고계정 검증세션 대기**(블라인드 지양). 설계=Part3-3-2 완료 |
| SEG-H3 | DSAR push/line/instagram/onsite/popup 미도달 | Part3-3-3-3/4 + Deletion Block 구현세션 |
| SEG-H5 | Audience↔Provider Reconciliation | SEG-H2 동반 구현 |
| dist.bak 정리 | Shadow Copy(278차 FS트랩 재발) | Orphan/Shadow 탐지 구현세션 |

---

## 5. 다음 세션 최우선

1. **★EPIC 06-A Part 3-3-3-3 — DSAR (Access·Export·Rectification·Processing Restriction Governance) 이어서 진행** (사용자 지정 1순위). 입력=Part 3-3-3-1(Privacy) + 3-3-3-2(Retention/Deletion Eligibility·Legal Hold) 설계정본. 후속=3-3-3-4(RTBF/Deletion Engine)·3-3-3-5(Cross-border)·3-3-3-6(Certification). 비파괴 설계 명세(코드변경0) 패턴 유지·정직 부재기록·정본(Dsar.php·crm_channel_prefs·email_suppression) 확장.
2. **미배포 코드 2건 배포+검증**(§2) — 서버 php -l → 운영/데모 업로드 → 헤드리스. 사용자 승인 후(배포는 별건 승인).
3. **SEG-H2/H3/H5 라이브 구현세션**(광고계정+배포 가능 시).

전 설계정본=`docs/segmentation/`·`docs/architecture/ADR_*`. 오탐방지=`docs/registry/RepeatedDefectHistory`·FP레지스트리. 정본 재구현·기능후퇴 금지.
