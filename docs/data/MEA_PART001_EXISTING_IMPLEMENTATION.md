# MEA Part 001 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 001 SPEC/ADR.

## 전수조사 방법
DataPlatform/DataTrust/lineage/tenant_id/created_at/uuid/version/Crypto/classification 키워드로 `backend/src`·`docs/data`·헌법 6볼륨 전수 grep + 판독.

## 실존 substrate (데이터 규범/정본·플랫폼·표준 관례)
| MEA 개념 | 실존 substrate | 인용 | 성격·판정 |
|---|---|---|---|
| 데이터 규범(최상위) | 데이터 헌법 6볼륨 | `docs/DATA_INTELLIGENCE_CONSTITUTION.md`·`DATA_SOURCE_ARCHITECTURE_CONSTITUTION.md`·`DATA_TRUST_QUALITY_CONSTITUTION.md` 등 | ★실재(최상위 규범) |
| 구현 정본 | 데이터 아키텍처 | `docs/data/DATA_ARCHITECTURE.md` | ★실재(구현 정본) |
| Data Platform/DataTrust/Quality | DataAssets·신뢰도·품질 | `DataPlatform.php`(DataTrust dashboard·284행) | PARTIAL-strong(272차) |
| Data Lineage | 통합분석 원천추적 | `DataPlatform.php:316`(GET /api/data-lineage·319 dataLineage) | PARTIAL-strong |
| Tenant Isolation(RLS 유사) | tenant_id 앱계층 스코핑 | `Db.php`·전역 `tenant_id`(2961 사용) | ★실재(강한 관례) |
| 표준 필드(부분) | created_at/updated_at/status | 전역(created_at 875·updated_at 863) | PARTIAL-strong(관례) |
| Encryption at Rest | AES-256-GCM 비밀저장 | `Crypto`(channel_credential) | PARTIAL(비밀만) |
| Masking | last4/부분 마스킹 | `ChannelCreds`(first4/last4) | PARTIAL |
| Immutable History/Audit | append-only 해시체인 | `SecurityAudit.php` | 실재(재사용) |
| AI(Classification/Quality/Anomaly) | DataTrust·이상탐지 | `DataPlatform.php`·`AnomalyDetection.php` | PARTIAL(헌법 V3/V4 정합) |
| Data Domain(도메인 매핑) | 실 핸들러 | `UserAuth`/`index.php`(Authz)/`OrderHub`/`Wms`/`Pnl`/`Rollup`/`ClaudeAI` | PARTIAL(도메인 실재·형식 Registry 아님) |

## 부재(ABSENT) — 형식 Registry/Framework·미정착 표준 (grep 0/희소)
Enterprise Data Registry(형식) · Canonical Data Dictionary(형식·단 28 DSAR canonical+DATA_ARCHITECTURE seed) · **Enterprise Metadata Registry** · Data Domain Registry(형식) · **Data Ownership Framework**(Business/Technical Owner/Steward/Custodian/Approver=전무) · **Data Classification Framework**(5-tier Public~Secret=전무) · 형식 Data Quality/Lifecycle Framework · **표준 필드 미정착**: `UUID`(6)·`version`(6)·`created_by`(13)·`updated_by`(27)=희소(현행 auto-increment id 다수) · GraphQL(부재·REST만) · 형식 Event 표준(DataCreated 등·event-driven 대부분 부재).

## 판정
**PARTIAL-strong / ABSENT-formal.** 데이터 헌법 6볼륨+`DATA_ARCHITECTURE.md`(규범/정본)+`DataPlatform`(DataTrust/Lineage)+tenant 격리+created/updated 관례+`Crypto`+`SecurityAudit`+도메인 매핑은 실재하나, **형식 Enterprise Data/Metadata Registry·5-tier Classification·Ownership Framework·UUID/version 표준은 미정착/부재**. ★핵심=규범/정본 이미 존재 → MEA는 상속·정합(재정의 금지). 실행은 형식 Registry/Framework 신설 + 표준 마이그레이션 종속.
