# MEA Part 005 — Canonical Entities Design & Judgment (§5~§16)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★Attribution identity_link/231 SSOT/UNIQUE 재사용·형식 MDM 엔진 greenfield·Part 001~004 상속.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | MASTER_ENTITY | 실 도메인 핸들러 | `UserAuth`/`CRM`/`Catalog`/`Wms` | PARTIAL(도메인 실재) |
| 2 | GOLDEN_RECORD | UNIQUE 제약·SSOT(형식 아님) | UNIQUE·231차 SSOT | PARTIAL(중복방지 seed) |
| 3 | MASTER_ATTRIBUTE | 컬럼·엔티티 속성 | 스키마 | PARTIAL |
| 4 | REFERENCE_DATA | enum·notice·레지스트리 | `st11_notice_types.json`·채널 레지스트리 | PARTIAL-informal |
| 5 | MATCH_RULE | ★identity_link·confidence | `Attribution.php:133,176` | PARTIAL-strong(확률적 Match) |
| 6 | MERGE_RULE | orphan merge·dedup | `Wms`(consolidateOrphanStock)·231차 | PARTIAL(형식 아님) |
| 7 | SURVIVORSHIP_RULE | 승인/신뢰도/최신/품질 매핑 | `CHANGE_GATE`·DataTrust·`updated_at` | PARTIAL-informal(형식 엔진 부재) |
| 8 | MASTER_VERSION | git·API 버전 | git | PARTIAL-informal |
| 9 | MASTER_OWNER | 부재(Part 001 Ownership) | — | ABSENT-formal |
| 10 | MASTER_CHANGE_LOG | append-only 체인 | `SecurityAudit.php` | PARTIAL-strong |
| 11 | MASTER_APPROVAL | CHANGE_GATE+PM 승인 | `CHANGE_GATE.md`·`AgencyPortal` | PARTIAL |
| 12 | MASTER_SYNC_JOB | 커넥터 sync | `ChannelSync.php` | PARTIAL |
| 13 | MASTER_DISTRIBUTION | 부재(형식) | — | ABSENT |
| 14 | MASTER_STATUS | NOT_CERTIFIED 라벨·상태 enum | `DSAR_APPROVAL_*`·enum | PARTIAL-informal |
| 15 | MASTER_AUDIT | 해시체인 감사 | `SecurityAudit.php` | PARTIAL-strong(정본) |

## §6~§16 표준 판정
- **§6 Master Domain(15)**: Part 001 DATA_DOMAIN 상속·실 핸들러 매핑. 형식 Master Repository=ABSENT.
- **§7 Golden Record**: UNIQUE+SSOT+SecurityAudit+CHANGE_GATE seed·형식 Golden Record Manager=ABSENT.
- **§8 Match & Merge**: ★`Attribution` identity_link(confidence 확률적 Match)·`Wms` merge·중복금지 게이트. 형식 Match/Merge Engine(Fuzzy 파이프라인)=순신설.
- **§9 Survivorship**: 승인/신뢰도/최신/품질 매핑 실재·형식 Survivorship Engine=ABSENT.
- **§10 Reference Data**: enum/notice/레지스트리·형식 Reference Data Manager+Version=순신설.
- **§11 Sync**: 커넥터(API/Batch)·Event/CDC=ABSENT.
- **§12 Security**: Part 001~004 상속(tenant/RBAC/Crypto/audit/G2).
- **§16 AI**: Match Score=confidence·품질=DataTrust·이상=AnomalyDetection·직접변경 불가=헌법 V3. Merge/Reference 추천=순신설. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§5·§10·§15=identity_link Match/Change Log/Audit) / PARTIAL(§1~4·§6~8·§11·§12·§14) / ABSENT-formal(§9 Owner·§13 Distribution·형식 Golden Record/Match-Merge/Survivorship Engine).** 코드 0. ★아이덴티티 해석(Attribution)·dedup(231/UNIQUE/게이트) 재사용(중복 재구현 절대 금지)·형식 MDM 엔진 신설·Part 001~004 상속·AI Golden Record 직접변경 불가(헌법 V3).
