# ADR — MEA Part 008 Enterprise Data Catalog & Discovery Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part008 EXISTING/DUPLICATE) 등장 file:line만(반날조).

## 맥락
MEA Part 008은 Data Catalog & Discovery. GeniegoROI는 데이터 자산 카탈로그 seed가 실재 — `DataPlatform`(272차 "원천 데이터를 출처 명시 데이터 자산으로 카탈로그화"·L1 자산·data_source registry). 인증 게이트도 실 원칙(Volume 3 Trust First=신뢰도 미달=AI/자동화 제외·READY만=Certified만 KPI)+NOT_CERTIFIED 라벨+`IMPLEMENTATION_STATUS`. 단 형식 Catalog Portal/Business Glossary/Search Engine/Tag/Collection은 부재. 본 Part는 Part 001~007 상속(재정의 금지).

## 결정
- **D-1 (Part 001~007·헌법 상속·재정의 금지):** Metadata(Part 004)·Provenance/Source(Part 007)·DataTrust Quality(Part 006)·Owner(Part 001)를 준수·인용. 관리 대상(§6)=Part 001~007 자산 매핑. 중복 정의 금지.
- **D-2 (Data Asset Registry/Catalog = DataPlatform 272차 승격):** Data Asset/Catalog = `DataPlatform.php:12,78`(272차 DataAssets·"자산 카탈로그화"·data_source registry·L1 자산). 형식 Catalog/Asset Registry는 이를 인덱싱(중복 카탈로그 신설 금지·[[project_n272_data_platform]]).
- **D-3 (Certification = Trust First 재사용):** Dataset Certification(Certified만 KPI/ROI 사용) = ★헌법 V3 Trust First(신뢰도 미달=AI/자동화 제외·READY만·Part 006)+NOT_CERTIFIED 라벨(Part 3-36)+`docs/IMPLEMENTATION_STATUS.md`. 형식 Certification Manager는 이 원칙을 형식화(중복 인증 로직 신설 금지).
- **D-4 (Business Glossary/Search = 신설·기존 seed 재사용):** Business Glossary=28+ DSAR canonical+docs/registry(용어 seed)·"동일 Term 중복 금지"=중복금지 게이트([[feedback_no_duplicate_features]]). NL Search=`ClaudeAI`(챗봇 지식 파이프라인). 형식 Business Glossary Manager·Full-Text/Semantic Search Engine=순신설(Part 003 Semantic Layer 상세).
- **D-5 (Security/Usage/AI = 기존 자산·헌법 정합):** RBAC=`index.php`·Masking=`ChannelCreds`·Tenant=`Db.php`([[reference_platform_growth_actas_tenant_hijack]])·Audit=`SecurityAudit`. "권한 없으면 Metadata만"=RBAC 패턴 신설. Usage=`api_key.use_count`(passive)·품질=`DataPlatform`(DataTrust). AI(NL Search/추천)=`ClaudeAI`/`DataPlatform`·공식 Metadata 직접변경 불가=Part 004 승인+헌법 V3. 마케팅 AI 챗봇 NL search 재사용하되 거버넌스 AI KEEP_SEPARATE.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. Part 001~007/헌법 상속·재정의 금지·DataPlatform(DataAssets/data_source)·Trust First 인증 원칙·DSAR canonical/registry·SecurityAudit 재사용·형식 Catalog Portal/Glossary/Search/Certification Manager만 신설. 실행은 선행 Part 001~007 종속.
