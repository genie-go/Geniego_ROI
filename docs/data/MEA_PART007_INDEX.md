# MEA Part 007 — Index (Enterprise Data Lineage & Impact Analysis Architecture)

> **거버넌스 상태**: 설계 명세 인덱스 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).

Master Enterprise Architecture Part 007 (Data Lineage & Impact Analysis) 산출 문서 색인. ★MEA Part 001~006 상속·확장(재정의 금지).

## 문서 구성
| 문서 | 역할 |
|---|---|
| `docs/spec/MEA_PART007_DATA_LINEAGE_IMPACT_ARCHITECTURE_SPEC.md` | canonical SPEC v1.0(§1~§18) |
| `docs/architecture/ADR_MEA_DATA_LINEAGE_IMPACT_ARCHITECTURE.md` | 설계 결정(D-1~D-5·Part 001~006 상속·DataPlatform data_source/lineage 승격) |
| `docs/data/MEA_PART007_EXISTING_IMPLEMENTATION.md` | GT① 실존 substrate 전수조사 |
| `docs/data/MEA_PART007_DUPLICATE_AUDIT.md` | GT② DataPlatform lineage/data_source·Part 001/006 중복 경계 |
| `docs/data/MEA_PART007_CANONICAL_ENTITIES.md` | §5 15 엔티티 + §6~16 Lineage/Provenance/Impact 판정 |
| `docs/data/MEA_PART007_GOVERNANCE_MECHANISMS.md` | §11~18 Visualization/Security/Runtime/API/Event/AI |
| `docs/data/MEA_PART007_INDEX.md` | 본 색인 |

## 판정 요약
- **★PARTIAL-strong substrate(계보/출처 추적·불변 이력 실재):** ★Data Provenance/Source Registry=`DataPlatform.php:12,61`(272차 `data_source`·source_type/channel/account/credential/priority·"출처 명시 데이터 자산 카탈로그") · Data Lineage(분석→원천)=`DataPlatform.php:316`(/api/data-lineage·신선도+정규화규칙) · 출처 기록(Source/Credential/Sync/Quality/Trust)=데이터 헌법 · Immutable/Read-Only History=`SecurityAudit`(append-only·삭제 금지) · Explainability=헌법 V4(근거/신뢰도) · 변경-영향 인식=`CHANGE_GATE`+무후퇴 value unification · Root Cause seed=`AnomalyDetection`+감사 오탐 레지스트리.
- **ABSENT-formal(형식 그래프/Impact/Visualization greenfield):** Data Lineage Repository(형식) · **Lineage Graph Engine** · **Dependency Analyzer**(Column/API 그래프) · **Impact Analysis Engine**(Schema/컬럼삭제/KPI 자동 영향) · **Change Propagation Manager** · **Root Cause Analyzer**(형식) · **Lineage Visualization**(Data Flow/Impact Map/Change Timeline) · Execution Path · Event 표준(LineageRegistered 등).
- **★핵심:** Provenance/Lineage는 `DataPlatform`(272차 data_source registry + data-lineage)로 실재하고 불변 이력(`SecurityAudit`)·Explainability(헌법 V4)·변경 게이트(`CHANGE_GATE`)+무후퇴 value unification(변경-영향 인식 원칙)도 실재 — 단 그래프 기반 자동 Impact/Dependency/Root Cause 엔진·시각화는 부재. 형식 그래프 엔진만 신설.
- **★재사용(중복 신설 절대 금지):** `DataPlatform`(data_source/lineage)·`SecurityAudit`(불변)·`CHANGE_GATE`+무후퇴 원칙·헌법 V4(Explainability)·`AnomalyDetection`. Part 001 Data Source·Part 006 DataTrust lineage·헌법 재정의 금지. AI=Lineage 변경/삭제 불가(헌법 V3)·마케팅 AI KEEP_SEPARATE.
- **★교훈:** [[project_n272_data_platform]](DataPlatform data_source registry=Provenance 정본) · [[feedback_no_regression_value_unification]](무후퇴 value unification=변경-영향 인식 원칙) · [[reference_menu_audit_log_not_tamper_evident]](Lineage/Immutable 정본=SecurityAudit::verify) · [[reference_audit_false_positives]](오탐 레지스트리=Root Cause seed) · [[reference_platform_growth_actas_tenant_hijack]](Cross-Tenant Lineage Leakage).
- **코드 변경 0 · NOT_CERTIFIED**(선행 Part 001~006 + 형식 그래프/Impact 엔진 신설).

## 다음
MEA Part 008 — Enterprise Data Catalog & Discovery Architecture(본 Lineage 상속·확장·중복 정의 금지).
