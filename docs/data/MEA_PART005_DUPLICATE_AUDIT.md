# MEA Part 005 — Ground-Truth ② Duplicate Implementation Audit

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 목적 = MDM 신설이 기존 아이덴티티/dedup·Part 001~004와 중복 재정의하지 않도록 경계 확정. ★MDM 자체가 "중복 제거"라 재사용이 핵심.

## ★상위 Part/규범 중복 — 재정의 금지
| MEA 개념 | 상위 Part/규범 | 판정 |
|---|---|---|
| DATA_DOMAIN/표준필드 | ★MEA Part 001 Foundation | ★재정의 금지·상속 |
| Metadata(카탈로그/버전/거버넌스) | ★MEA Part 004 Metadata | ★재정의 금지·상속 |
| Reference/KPI 코드 | MEA Part 003 EDW | 참조 |
| 데이터 규범/정본 | 헌법 6볼륨·`DATA_ARCHITECTURE.md` | 참조·정합 |

## ★동음이의(코드베이스) — 재사용 vs 오흡수 (★중복 아이덴티티/dedup 로직 절대 금지)
| MEA 개념 | 자산 | 인용 | 판정 |
|---|---|---|---|
| Entity Resolution/Match | identity_link·confidence | `Attribution.php:133,176` | ★재사용(중복 아이덴티티 엔진 신설 금지) |
| 고객 아이덴티티 | CRM identity360 | `CRM.php` | 재사용 |
| Dedup/Merge | SSOT dedup·orphan merge | 231차 SSOT·`Wms`(consolidateOrphanStock) | ★재사용(중복 dedup 재구현 금지) |
| 중복 생성 금지 | UNIQUE+게이트 | UNIQUE·pre-commit 중복금지 | 재사용 |
| Reference Data | enum·notice·레지스트리 | `st11_notice_types.json`·채널 레지스트리 | 재사용(값 재정의 금지) |
| Sync | 커넥터 | `ChannelSync.php` | 재사용 |
| Audit/Security | 해시체인·격리 | `SecurityAudit.php`·`Db.php`·`Crypto` | 재사용 |
| AI | 이상탐지·DataTrust·마케팅 AI | `AnomalyDetection`·`DataPlatform`·`ClaudeAI` | 재사용(전자)·KEEP_SEPARATE(마케팅 AI) |

## ★교훈 반영
- [[feedback_no_duplicate_features]]: "중복 생성 금지"(§13)=중복금지 pre-commit 게이트·MDM 핵심.
- [[project_n231_dedup_ssot]]: DB SSOT dedup — MDM Golden Record는 이 위에.
- [[reference_platform_growth_actas_tenant_hijack]]: Cross-Tenant Master Leakage·Tenant Isolation=tenant_id 서버바인딩.
- [[reference_menu_audit_log_not_tamper_evident]]: Master Audit 정본 = `SecurityAudit::verify`만.

## 확장 대상(중복 신설 금지·기존 승격)
- Match/Entity Resolution=`Attribution` identity_link 승격. Dedup=231차 SSOT+UNIQUE+게이트. Reference=enum/notice/레지스트리. Sync=`ChannelSync`. Audit=`SecurityAudit`. Security=`Db.php`/`Crypto`/`index.php`.

## 판정
**중복 위험 최상(아이덴티티/dedup 실재·MDM=중복 제거).** ★핵심=`Attribution`(identity_link/confidence)·231차 SSOT dedup·UNIQUE 제약·중복금지 게이트·Reference enum은 **재사용/승격**(★중복 아이덴티티/dedup 로직 재구현 절대 금지=MDM 취지 위반). Part 001/004·헌법 **재정의 금지**. 본 Part 고유 순신설=형식 Golden Record Manager·Match/Merge/Survivorship Engine·Reference Data Manager·Distribution Service뿐. 마케팅 AI KEEP_SEPARATE·AI Golden Record 직접변경 불가(헌법 V3).
