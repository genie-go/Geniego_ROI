# MEA Part 005 — Index (Enterprise Master Data Management Architecture)

> **거버넌스 상태**: 설계 명세 인덱스 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).

Master Enterprise Architecture Part 005 (Enterprise MDM Architecture) 산출 문서 색인. ★MEA Part 001~004 상속·확장(재정의 금지).

## 문서 구성
| 문서 | 역할 |
|---|---|
| `docs/spec/MEA_PART005_MDM_ARCHITECTURE_SPEC.md` | canonical SPEC v1.0(§1~§18) |
| `docs/architecture/ADR_MEA_MDM_ARCHITECTURE.md` | 설계 결정(D-1~D-5·Part 001~004 상속·Attribution identity_link/231 SSOT 승격) |
| `docs/data/MEA_PART005_EXISTING_IMPLEMENTATION.md` | GT① 실존 substrate 전수조사 |
| `docs/data/MEA_PART005_DUPLICATE_AUDIT.md` | GT② 아이덴티티/dedup·Part 001/004 중복 경계 |
| `docs/data/MEA_PART005_CANONICAL_ENTITIES.md` | §5 15 엔티티 + §6~16 도메인/Match/Survivorship 판정 |
| `docs/data/MEA_PART005_GOVERNANCE_MECHANISMS.md` | §11~18 Sync/Security/Runtime/API/Event/AI |
| `docs/data/MEA_PART005_INDEX.md` | 본 색인 |

## 판정 요약
- **★PARTIAL substrate(아이덴티티 해석·dedup·기준 도메인 실재):** ★Entity Resolution/Match=`Attribution.php:133,176`(`attribution_identity_link`·tenant/identity_hash/session·**confidence 스코어**=확률적 매칭·UNIQUE dedup) · 고객 아이덴티티=`CRM.php`(identity360) · Dedup/Merge=231차 DB SSOT dedup·`Wms`(consolidateOrphanStock) · 중복 생성 금지=UNIQUE 제약+pre-commit 중복금지 게이트 · Master Domain=실 핸들러(User=`UserAuth`·Role=`index.php`·Customer=`CRM`·Supplier=`SupplyChain`·Partner=`PartnerPortal`·Product=`Catalog`·Warehouse=`Wms`) · Reference Data=currency/country/status enum·`st11_notice_types.json` · Sync=`ChannelSync` · Audit=`SecurityAudit`.
- **ABSENT-formal(형식 MDM 엔진 greenfield):** Master Data Repository(형식) · **Golden Record Manager** · **형식 Match/Merge Engine**(Fuzzy 파이프라인) · **Survivorship Engine** · Reference Data Manager(형식) · Synchronization Service(**Event/CDC**) · Distribution Service · Dashboard · Event 표준(MasterCreated 등) · Owner 지정(Part 001 Ownership 부재).
- **★핵심:** MDM 취지("중복 제거·SSOT")는 이미 실 강제 원칙(231차 DB SSOT·중복금지 게이트·UNIQUE)이고 확률적 아이덴티티 해석(confidence)도 실재 — 형식 Golden Record/Match-Merge/Survivorship 엔진만 신설. ★중복 아이덴티티/dedup 로직 재구현 절대 금지(MDM 취지 위반).
- **★재사용(중복 신설 절대 금지):** `Attribution`(identity_link/confidence)·231차 SSOT·UNIQUE·중복금지 게이트·Reference enum·`ChannelSync`·`SecurityAudit`·`Db.php`/`Crypto`. Part 001/004·헌법 재정의 금지. AI=Golden Record 직접변경 불가(헌법 V3)·마케팅 AI KEEP_SEPARATE.
- **★교훈:** [[feedback_no_duplicate_features]](중복 생성 금지=MDM 핵심·중복금지 게이트) · [[project_n231_dedup_ssot]](DB SSOT dedup=Golden Record 기반) · [[reference_platform_growth_actas_tenant_hijack]](Cross-Tenant Master Leakage) · [[reference_menu_audit_log_not_tamper_evident]](Master Audit 정본=SecurityAudit::verify).
- **코드 변경 0 · NOT_CERTIFIED**(선행 Part 001~004 + 형식 MDM 엔진 신설).

## 다음
MEA Part 006 — Enterprise Data Quality Management Architecture(본 MDM 상속·확장·중복 정의 금지).
