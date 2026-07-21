# ADR — DSAR Authorization Master Reference Architecture (Part 3-50 · EAPGFMRA)

> **거버넌스 상태**: 아키텍처 결정 기록(캡스톤) · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> 인용은 GT①②(EAPGFMRA EXISTING/DUPLICATE) 등장 file:line만(반날조).

## 맥락
Part 3-50은 전 Part(3-1~3-49) + 실 코드베이스를 하나의 마스터 참조 아키텍처로 통합하는 Grand Finale 캡스톤. 실 아키텍처는 이미 강하게 실재·문서화 — `docs/architecture/`(146 ADR)·`docs/data/DATA_ARCHITECTURE.md`·실 Security/Data/Integration 아키텍처·47 EPIC 06-A spec. 형식 Master Architecture *엔진/도구*(Knowledge Graph/Analytics)만 grep 0.

## 결정
- **D-1 (마스터 참조 = 실 코드+ADR+DATA_ARCHITECTURE 인덱싱·재정의 금지):** Master Reference Architecture는 실 monorepo(frontend/backend)+146 ADR+`DATA_ARCHITECTURE.md`+`docs/registry/`+47 EPIC spec으로 이미 실재. 형식 Registry/Repository Manager는 이를 통합 인덱싱(중복 ADR/문서 신설 금지·Part 3-49 정합).
- **D-2 (Security Architecture = 실 자산 승격·비교적 강함):** Zero Trust(재검증)·IAM(`index.php` RBAC)·Secrets/PKI(`Crypto` AES-256-GCM)·SSRF(`Ssrf`)·federation(`EnterpriseAuth`)=실 Security Architecture. 중복 보안엔진 신설 금지(엔진 난립 금지).
- **D-3 (Data Architecture = DATA_ARCHITECTURE.md 정본):** Master Data Architecture=`docs/data/DATA_ARCHITECTURE.md`+`DataPlatform`+데이터 헌법 6볼륨. 중복 데이터 아키텍처 문서 신설 금지.
- **D-4 (Integration = REST 실재·GraphQL/Service Mesh 미래):** REST(`routes.php`·`AdAdapters`/`ChannelSync`)=실 Integration. GraphQL/gRPC/Event Streaming/Service Mesh=단일 호스트라 ABSENT(Part 3-47 정합·조기구현 금지). AI Architecture=마케팅 AI(Part 3-46) KEEP_SEPARATE.
- **D-5 (Evidence/Isolation = 기존 정본):** Immutable Architecture History·Evidence=`SecurityAudit::verify`([[reference_menu_audit_log_not_tamper_evident]]). Cross-Tenant Architecture Leakage·Isolation=`Db.php`([[reference_platform_growth_actas_tenant_hijack]]). Modification=`CHANGE_GATE`+admin 게이트.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. 캡스톤 — 실 아키텍처/ADR/DATA_ARCHITECTURE 정합·중복 재정의 금지. 실행은 선행 Part1~3-49 인증 종속(BLOCKED_PREREQUISITE·Knowledge Graph/Analytics/GraphQL 신설).
