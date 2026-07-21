# MEA Part 001 — Canonical Entities Design & Judgment (§5~§12)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★헌법 6볼륨/DATA_ARCHITECTURE/DataPlatform 상속·형식 Registry/Framework greenfield.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | DATA_DOMAIN | 실 핸들러 도메인(형식 Registry 아님) | `UserAuth`/`OrderHub`/`Pnl` 등 | PARTIAL(도메인 실재) |
| 2 | DATA_ENTITY | DB 테이블·핸들러 스키마 | `Db.php`·ensureTables | PARTIAL(형식 Entity Registry 부재) |
| 3 | DATA_ATTRIBUTE | 컬럼 정의 | 테이블 스키마 | PARTIAL |
| 4 | DATA_OWNER | 부재(Business/Technical Owner/Steward) | — | ABSENT-formal |
| 5 | DATA_CLASSIFICATION | 부재(5-tier)·No-PII/consent seed | `GdprConsent.php` | ABSENT-formal(seed) |
| 6 | DATA_POLICY | RBAC/write 정책·헌법 | `index.php`·헌법 6볼륨 | PARTIAL |
| 7 | DATA_RETENTION | 부분(로그 retention·media_gc) | (운영 cron) | PARTIAL-informal |
| 8 | DATA_METADATA | 부재(형식 Metadata Registry)·DataAssets seed | `DataPlatform.php` | PARTIAL(seed) |
| 9 | DATA_VERSION | git·API 버전·미정착 컬럼(6) | git·`routes.php` | PARTIAL-informal(엔티티 version 미정착) |
| 10 | DATA_SOURCE | 커넥터/데이터소스 | `DataPlatform.php`·헌법 Volume 2 | PARTIAL-strong |
| 11 | DATA_CONSUMER | 분석/AI 소비 | `DataPlatform`·`ClaudeAI` | PARTIAL |
| 12 | DATA_LINEAGE | ★통합분석 원천추적 | `DataPlatform.php:316`(data-lineage) | PARTIAL-strong |
| 13 | DATA_QUALITY | ★DataTrust Quality/Trust Score | `DataPlatform.php`(V3) | PARTIAL-strong |
| 14 | DATA_ACCESS_POLICY | RBAC/scope·tenant 격리 | `index.php`·`Db.php` | PARTIAL |
| 15 | DATA_AUDIT_LOG | append-only 해시체인 | `SecurityAudit.php` | PARTIAL-strong(정본) |

## §6 Data Domain 매핑(15) — 실 핸들러 정합
Identity=`UserAuth`·Authorization=`index.php`(RBAC/writeGuard)·Workflow=`AgencyPortal`/approvals·Governance=`CONSTITUTION`/registry·Compliance=`GdprConsent`/`Dsar`·Organization=`AgencyPortal`/tenant·Customer=`CRM`·Product=`Catalog`·Commerce=`OrderHub`/`ChannelSync`·Logistics=`Wms`·Finance=`Pnl`/`PgSettlement`·ROI=`Rollup`/`Attribution`·AI=`ClaudeAI`/`DataPlatform`·Analytics=`Insights`/`DataPlatform`·Operations=deploy/migrations. → 형식 Domain Registry만 신설(도메인 재정의 금지).

## §7~§12 표준 판정
- **§7 Lifecycle(Create~Dispose)**: 부분(생성/저장/소비 실재·형식 Classify/Archive/Dispose 강제 미형식·retention seed). PARTIAL.
- **§8 Classification(5-tier)**: **ABSENT-formal**(No-PII/consent seed·GdprConsent). 신규 프레임워크.
- **§9 Ownership(5역할)**: **ABSENT-formal**(전무). 신규 프레임워크.
- **§10 Governance(중복금지/이력/버전/메타/lineage)**: 중복금지=pre-commit 게이트·이력=SecurityAudit·lineage=DataPlatform 실재. Metadata 자동생성/Version 관리=순신설.
- **§11 Security(암호/RLS/마스킹)**: Encryption at Rest=`Crypto`(비밀만)·RLS=`tenant_id` 앱계층·Masking=ChannelCreds. Column-Level/Dynamic Masking=순신설.
- **§12 표준필드**: tenant_id/created_at/updated_at/status=관례 승격·UUID/version/created_by/updated_by=미정착(점진 도입·무후퇴).

## 판정
**PARTIAL-strong(§10·§12·§13 lineage/quality/audit/tenant/source·DataPlatform/SecurityAudit/Db) / PARTIAL(§1~3·§6·§7·§11·§14) / ABSENT-formal(§4 Owner·§5 Classification·§8 Metadata Registry).** 코드 0. ★헌법 6볼륨/DATA_ARCHITECTURE/DataPlatform 상속(재정의 금지)·형식 Registry/Classification/Ownership Framework 신설·표준 필드 점진 도입.
