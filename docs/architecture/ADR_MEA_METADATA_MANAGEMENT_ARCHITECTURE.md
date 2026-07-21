# ADR — MEA Part 004 Enterprise Metadata Management Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part004 EXISTING/DUPLICATE) 등장 file:line만(반날조).

## 맥락
MEA Part 004는 메타데이터 중앙 관리. Part 001이 이미 "Enterprise Metadata Registry"를 ABSENT 목표로 스코핑 → 본 Part가 상세. 코드베이스에는 형식 메타데이터 플랫폼은 부재하나, **비형식 메타데이터 카탈로그가 강하게 실재**: 33개 DSAR canonical entity 문서(authz/데이터 canonical 정의)+20개 docs/registry+`DATA_ARCHITECTURE.md`+`DataPlatform`(lineage). 거버넌스(승인/중복금지/감사)도 CHANGE_GATE+pre-commit 게이트+SecurityAudit로 실재.

## 결정
- **D-1 (Part 001~003·헌법 상속·재정의 금지):** Metadata Framework/DATA_METADATA/표준필드/DATA_DOMAIN(Part 001)·KPI 정의 메타(Part 003 Semantic seed)를 준수·인용. Metadata 분류(§6)=Part 001 DATA_DOMAIN 정합. 중복 정의 금지.
- **D-2 (Metadata Catalog = DSAR canonical+registry 재사용):** 등록된 메타데이터 = 33개 `DSAR_APPROVAL_*_CANONICAL_ENTITIES.md`(canonical 정의)+20개 `docs/registry/`+`DATA_ARCHITECTURE.md`. 형식 Metadata Repository/Registry는 이를 인덱싱(중복 카탈로그 신설 금지·Part 3-49 정합). ★이 문서 시리즈(EPIC 06-A/MEA) 자체가 메타데이터 산출물.
- **D-3 (Governance = CHANGE_GATE+중복금지 게이트+SecurityAudit 승격):** 승인 없는 등록 금지=`CHANGE_GATE`+PM 승인·**중복 Metadata 금지=pre-commit 중복금지 게이트**([[feedback_no_duplicate_features]])·변경 이력/Audit=`SecurityAudit::verify`([[reference_menu_audit_log_not_tamper_evident]]). Owner 지정 필수=Part 001 Ownership(ABSENT·신설). 형식 Approval Workflow=승인 워크플로우(`AgencyPortal`/approvals) 승격.
- **D-4 (Version/Security = 기존 자산 재사용):** Version=git+API 버전(`/v{NNN}`)·Version Protection=pre-commit G2 sacred SHA. Security=RBAC(`index.php`)·Tenant(`Db.php`·[[reference_platform_growth_actas_tenant_hijack]])·Encryption(`Crypto`)·Masking(ChannelCreds). 중복 버전/보안 신설 금지.
- **D-5 (Search/Sync/AI = 신설·헌법 정합):** Full-Text Metadata Search Engine·Sync Service·형식 Version Manager=순신설(현행=grep/문서 탐색). AI(중복 탐지=중복금지 게이트 seed·자동생성/Tag/Schema 추천)=순신설·승인 없이 변경 불가=헌법 V3. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE(중복 AI 엔진 금지·V3 난립금지).

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. Part 001~003/헌법 상속·재정의 금지·메타데이터 카탈로그(DSAR canonical/registry)·거버넌스(CHANGE_GATE/중복금지/SecurityAudit) 재사용·형식 Metadata Platform(Repository/Search/Version Manager)만 신설. 실행은 선행 Part 001~003 종속.
