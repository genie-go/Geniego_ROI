# MEA Part 001 — Index (Enterprise Data Platform Foundation)

> **거버넌스 상태**: 설계 명세 인덱스 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).

Master Enterprise Architecture Part 001 (Enterprise Data Platform Foundation) 산출 문서 색인. ★데이터 헌법 6볼륨·`DATA_ARCHITECTURE.md` 상속·정합(재정의 아님).

## 문서 구성
| 문서 | 역할 |
|---|---|
| `docs/spec/MEA_PART001_DATA_PLATFORM_FOUNDATION_SPEC.md` | canonical baseline SPEC v1.0(§1~§18) |
| `docs/architecture/ADR_MEA_DATA_PLATFORM_FOUNDATION.md` | 설계 결정(D-1~D-5·헌법/DATA_ARCHITECTURE 재정의 금지·상속) |
| `docs/data/MEA_PART001_EXISTING_IMPLEMENTATION.md` | GT① 실존 substrate 전수조사 |
| `docs/data/MEA_PART001_DUPLICATE_AUDIT.md` | GT② 헌법 6볼륨/DATA_ARCHITECTURE/데이터 자산 중복 경계 |
| `docs/data/MEA_PART001_CANONICAL_ENTITIES.md` | §5 15 엔티티 + §6 도메인 매핑 + §7~12 표준 판정 |
| `docs/data/MEA_PART001_GOVERNANCE_MECHANISMS.md` | §10~18 Governance/Security/Runtime/API/Event/AI/표준필드 |
| `docs/data/MEA_PART001_INDEX.md` | 본 색인 |

## 판정 요약
- **★PARTIAL-strong substrate(데이터 규범/정본/플랫폼/표준 관례 실재):** 최상위 규범=데이터 헌법 6볼륨 · 구현 정본=`docs/data/DATA_ARCHITECTURE.md` · Data Platform/DataTrust/Quality=`DataPlatform.php` · Data Lineage=`DataPlatform.php:316`(data-lineage) · Tenant Isolation(RLS)=`Db.php`(`tenant_id` 2961 사용) · 표준필드 관례=created_at/updated_at/status · Encryption at Rest=`Crypto`(AES-256-GCM) · Immutable/Audit=`SecurityAudit` · 도메인=15개 실 핸들러 매핑.
- **ABSENT-formal(형식 Registry/Framework·미정착 표준):** Enterprise Data Registry · **Enterprise Metadata Registry** · Canonical Data Dictionary(형식·28 DSAR canonical seed) · **Data Ownership Framework**(Business/Technical Owner/Steward/Custodian/Approver) · **Data Classification Framework**(5-tier Public~Secret) · 표준필드 `UUID`(6)/`version`(6)/`created_by`(13)/`updated_by`(27)=미정착 · **GraphQL/Event 표준**(DataCreated 등)·Trace ID.
- **★핵심(Golden Rule 준수):** 데이터 헌법 6볼륨·`DATA_ARCHITECTURE.md`가 이미 규범/구현 정본 — 본 MEA는 **상속·정합**(재정의·중복 금지). "본 문서 유일 SSOT"는 **아키텍처 계층 한정**. 형식 Registry/Framework만 신설·표준 필드는 **점진 도입(무후퇴·기존 테이블 파괴 금지)**.
- **★KEEP_SEPARATE / 재사용:** `DataPlatform`(DataTrust/Lineage)·`Db.php`(격리)·`Crypto`(암호)·`SecurityAudit`(감사)·28 DSAR canonical(사전)은 **재사용**(중복 플랫폼/격리/암호/감사/사전 신설 절대 금지·V3 엔진 난립금지). Unified Intelligence(Volume 4·마케팅) 오흡수 금지. AI=Canonical Data 직접수정 불가(헌법 V3 수집≠사용).
- **★교훈:** [[reference_platform_growth_actas_tenant_hijack]](Cross-Tenant Data Leakage·RLS=tenant_id 서버바인딩) · [[reference_menu_audit_log_not_tamper_evident]](Data Audit Log 정본=SecurityAudit::verify) · [[feedback_no_duplicate_features]](중복 Entity 금지=중복금지 게이트) · [[feedback_no_regression_value_unification]](표준 필드 무후퇴 점진 도입).
- **코드 변경 0 · NOT_CERTIFIED**(형식 Registry/Framework 신설 + 표준 마이그레이션 계획 종속).

## 다음
MEA Part 002 — Enterprise Data Lake Architecture(본 Foundation 상속·확장·중복 정의 금지).
