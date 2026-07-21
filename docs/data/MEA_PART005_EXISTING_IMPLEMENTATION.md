# MEA Part 005 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 005 SPEC/ADR.

## 전수조사 방법
identity_link/identity360/entity-resolution/golden-record/match/merge/dedup/consolidate/survivorship/reference-data/currency 키워드로 `backend/src` 전수 grep + 판독.

## 실존 substrate (아이덴티티 해석·dedup·기준 도메인)
| MEA 개념 | 실존 substrate | 인용 | 성격·판정 |
|---|---|---|---|
| Entity Resolution/Match(확률적) | ★identity_link·confidence 스코어 | `Attribution.php:133,176,190`(attribution_identity_link·tenant/identity_hash/session/confidence·UNIQUE dedup) | PARTIAL-strong(Match seed) |
| 고객 아이덴티티(360) | CRM identity360 | `CRM.php` | PARTIAL |
| Dedup/Merge | SSOT dedup·orphan merge | 231차 DB SSOT dedup·`Wms`(consolidateOrphanStock) | PARTIAL(중복 제거) |
| 중복 생성 금지 | UNIQUE 제약+게이트 | UNIQUE(uq_idlink 등)·pre-commit 중복금지 게이트 | PARTIAL-strong |
| Master Domain(기준 데이터) | 실 핸들러 | `UserAuth`(User)·`index.php`(Role)·`CRM`(Customer)·`SupplyChain`(Supplier)·`PartnerPortal`(Partner)·`Catalog`(Product)·`Wms`(Warehouse) | PARTIAL(도메인 실재) |
| Reference Data | currency/country/status enum·notice | `OrderHub`/`Pnl`/`ChannelSync`·`backend/data/st11_notice_types.json` | PARTIAL-informal |
| Survivorship 매핑 | 승인/신뢰도/최신/품질 | `CHANGE_GATE`·DataTrust confidence·`updated_at`·admin | PARTIAL-informal |
| Sync | 커넥터 sync | `ChannelSync.php` | PARTIAL(API/Batch) |
| Audit/Security | 해시체인·격리·암호 | `SecurityAudit.php`·`Db.php`·`Crypto` | 실재(재사용) |

## 부재(ABSENT-formal) — 형식 MDM 엔진 (grep 0)
Master Data Repository(형식) · **Golden Record Manager** · **형식 Match/Merge Engine**(Exact/Rule/Fuzzy 파이프라인) · **Survivorship Engine** · Reference Data Manager(형식·Version) · Synchronization Service(형식·**Event/CDC**) · Approval Workflow(형식) · Distribution Service · Master Data Dashboard · Event 표준(MasterCreated 등).

## 판정
**PARTIAL / ABSENT-formal.** ★아이덴티티 해석(`Attribution` identity_link·confidence)·중복 제거(231차 SSOT·UNIQUE·중복금지 게이트·orphan merge)·Master 도메인 실 핸들러·Reference enum·Sync 커넥터·감사는 실재하나, **형식 Golden Record Manager·Match/Merge/Survivorship Engine·Reference Data Manager·Distribution은 전무**. 실행은 선행 Part 001~004 + 형식 MDM 엔진 신설 종속.
