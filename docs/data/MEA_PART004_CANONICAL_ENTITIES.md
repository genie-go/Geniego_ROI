# MEA Part 004 — Canonical Entities Design & Judgment (§5~§16)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★33 DSAR canonical+registry 카탈로그·CHANGE_GATE/중복금지 게이트/SecurityAudit 재사용·형식 Metadata Platform greenfield·Part 001~003 상속.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | METADATA | canonical 정의·레지스트리 | 33 DSAR canonical·`docs/registry/` | PARTIAL-informal(비형식 카탈로그) |
| 2 | METADATA_SCHEMA | 테이블 스키마·canonical | `Db.php`·DSAR canonical | PARTIAL |
| 3 | METADATA_ATTRIBUTE | 컬럼·엔티티 속성 | 스키마·DSAR canonical | PARTIAL |
| 4 | METADATA_VERSION | git·API 버전 | git·`routes.php` | PARTIAL-informal |
| 5 | METADATA_OWNER | 부재(Part 001 Ownership) | — | ABSENT-formal |
| 6 | METADATA_POLICY | RBAC·CHANGE_GATE | `index.php`·`CHANGE_GATE.md` | PARTIAL |
| 7 | METADATA_TAG | 부재(형식 태깅) | — | ABSENT |
| 8 | METADATA_CATEGORY | Part 001 DATA_DOMAIN 분류 | (Part 001) | PARTIAL |
| 9 | METADATA_RELATION | 문서 상호참조 링크 | `[[...]]` 링크 | PARTIAL-seed |
| 10 | METADATA_CHANGE_LOG | append-only 체인·git | `SecurityAudit.php`·git | PARTIAL-strong |
| 11 | METADATA_APPROVAL | CHANGE_GATE+PM 승인 | `CHANGE_GATE.md`·`AgencyPortal` | PARTIAL |
| 12 | METADATA_SOURCE | 데이터소스 | `DataPlatform.php` | PARTIAL |
| 13 | METADATA_STATUS | NOT_CERTIFIED 라벨 | `DSAR_APPROVAL_*` | PARTIAL-informal |
| 14 | METADATA_LINEAGE | 데이터 계보 | `DataPlatform.php`(data-lineage) | PARTIAL |
| 15 | METADATA_AUDIT | 해시체인 감사 | `SecurityAudit.php` | PARTIAL-strong(정본) |

## §6~§16 표준 판정
- **§6 분류(10)**: Part 001 DATA_DOMAIN 정합. 형식 Category Manager=ABSENT.
- **§7 표준필드**: Part 001 상속(tenant_id/created_at/updated_at/status 관례·Version/Owner/Classification/Tags=미정착/신설).
- **§8 Repository**: 33 DSAR canonical+20 registry 카탈로그(등록/조회/이력=git·문서) 실재·형식 Repository Manager(수정/승인/검색/버전비교 UI)=ABSENT.
- **§9 Version**: git+API 버전·이전 버전 삭제 금지=git 이력. 형식 Version Manager=ABSENT.
- **§10 Search**: **ABSENT**(전용 메타데이터 검색·현행=grep).
- **§11 Governance**: ★승인=CHANGE_GATE·중복금지=pre-commit 게이트·이력/Audit=SecurityAudit 실재. Owner 필수=신설.
- **§12 Security**: RBAC/tenant/Crypto/Masking/G2 sacred SHA 상속.
- **§16 AI**: 중복 탐지=중복금지 게이트 seed·자동생성/Tag/Schema 추천=순신설(헌법 V3·승인 후). 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§10·§15=Change Log/Audit=SecurityAudit·§1 카탈로그) / PARTIAL-informal(§2~4·§6·§8·§9·§11~14) / ABSENT-formal(§5 Owner·§7 Tag·Search Engine).** 코드 0. ★메타데이터 카탈로그(33 DSAR canonical+registry)·거버넌스(CHANGE_GATE/중복금지)·감사(SecurityAudit) 재사용(중복 신설 절대 금지)·형식 Repository/Search/Version Manager 신설·Part 001~003 상속.
