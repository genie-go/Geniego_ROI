# ADR — MEA Part 005 Enterprise Master Data Management (MDM) Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part005 EXISTING/DUPLICATE) 등장 file:line만(반날조).

## 맥락
MEA Part 005는 MDM(기준 데이터 단일화·중복 제거). GeniegoROI는 "중복 금지·SSOT"가 실 강제 원칙이고 아이덴티티 해석 seed도 실재한다 — `Attribution.attribution_identity_link`(confidence 스코어 확률적 Entity Resolution)·`CRM` identity360·231차 DB SSOT dedup·`Wms.consolidateOrphanStock`(merge)·중복금지 pre-commit 게이트. 단 형식 Golden Record/Match-Merge/Survivorship Engine은 부재. 본 Part는 Part 001~004 상속(재정의 금지).

## 결정
- **D-1 (Part 001~004·헌법 상속·재정의 금지):** DATA_DOMAIN/표준필드(Part 001)·Metadata(Part 004)·KPI/Reference(Part 003)를 준수·인용. Master Data Domain(§6)=Part 001 DATA_DOMAIN 매핑. 중복 정의 금지.
- **D-2 (Entity Resolution/Match = Attribution identity_link 승격):** Match/Entity Resolution = `Attribution.php:133,176`(`attribution_identity_link`·tenant/identity_hash/session·confidence·UNIQUE dedup)·`CRM` identity360. Fuzzy/AI Match Score는 confidence 스코어 위에 신설. 중복 아이덴티티 엔진 신설 금지(기존 확장).
- **D-3 (중복 제거/SSOT = 231차·UNIQUE·중복금지 게이트 재사용):** "중복 생성 금지·Golden Record"=UNIQUE 제약(uq_idlink 등)+pre-commit 중복금지 게이트([[feedback_no_duplicate_features]])+231차 DB SSOT dedup([[project_n231_dedup_ssot]])+`Wms.consolidateOrphanStock`(merge). 형식 Golden Record Manager는 이 위에 신설(중복 dedup 로직 재구현 금지).
- **D-4 (Survivorship/Reference = 기존 매핑·형식 신설):** Survivorship 우선순위=승인(`CHANGE_GATE`)>신뢰도(DataTrust/confidence)>최신(`updated_at`)>품질(DataTrust Score)>admin. Reference Data=currency/country/status enum+`st11_notice_types.json`+채널 레지스트리. 형식 Survivorship/Reference Data Manager=순신설(값 재정의 금지).
- **D-5 (Security/Sync/AI = 기존 자산 재사용):** Tenant/RBAC/Crypto/Audit/G2=Part 001~004. Sync=`ChannelSync`(Event/CDC=미래). AI(중복탐지=중복금지 게이트·Match Score=confidence·품질=DataTrust·이상=`AnomalyDetection`)·Golden Record 직접변경 불가=헌법 V3(수집≠사용). 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE·중복 AI 엔진 금지(V3 난립금지).

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. Part 001~004/헌법 상속·재정의 금지·아이덴티티 해석(Attribution)/dedup(231차/UNIQUE/게이트) 재사용·형식 Golden Record/Match-Merge/Survivorship Engine만 신설·마케팅 AI 분리·AI Golden Record 직접변경 불가. 실행은 선행 Part 001~004 종속.
