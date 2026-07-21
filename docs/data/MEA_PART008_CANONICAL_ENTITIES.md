# MEA Part 008 — Canonical Entities Design & Judgment (§5~§16)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★DataPlatform DataAssets·Trust First·DSAR canonical·ClaudeAI 재사용·형식 Catalog/Search greenfield·Part 001~007 상속.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | DATA_ASSET | ★출처 명시 데이터 자산 | `DataPlatform.php:12,78`(DataAssets) | PARTIAL-strong |
| 2 | DATASET | 관계형 테이블·자산 | `Db.php`·`DataPlatform` | PARTIAL |
| 3 | DATA_CATALOG | DataAssets 카탈로그(비형식) | `DataPlatform.php` | PARTIAL(형식 Portal 아님) |
| 4 | BUSINESS_GLOSSARY | 부재(형식·Part 003 Semantic) | — | ABSENT-formal |
| 5 | BUSINESS_TERM | canonical 정의(seed) | 28+ DSAR canonical | PARTIAL-informal |
| 6 | DATA_TAG | 부재(형식 태깅) | — | ABSENT |
| 7 | DATA_LABEL | NOT_CERTIFIED/status 라벨 | `DSAR_APPROVAL_*` | PARTIAL-informal |
| 8 | DATA_CERTIFICATION | ★Trust First·NOT_CERTIFIED·구현 이력 | 헌법 V3·`IMPLEMENTATION_STATUS.md` | PARTIAL(원칙) |
| 9 | DATA_OWNER | 부재(Part 001 Ownership) | — | ABSENT-formal |
| 10 | DATA_STEWARD | 부재 | — | ABSENT-formal |
| 11 | DATA_RATING | DataTrust 품질점수 | `DataPlatform`(DataTrust) | PARTIAL |
| 12 | DATA_USAGE | use_count(passive) | `api_key.use_count` | PARTIAL-informal |
| 13 | SEARCH_INDEX | 부재(Full-Text/Semantic) | — | ABSENT |
| 14 | DISCOVERY_PROFILE | 챗봇 지식(seed) | `ClaudeAI.php` | PARTIAL-seed |
| 15 | DATA_COLLECTION | 부재(개인/조직/공유) | — | ABSENT |

## §6~§16 표준 판정
- **§6 관리 대상(14)**: DB/Table/API/KPI/Master Data/Metadata/External Source=Part 001~007 자산 매핑. Feature Store=Part 002 미래. 형식 Catalog Portal=ABSENT.
- **§7 Business Glossary**: DSAR canonical+registry(용어 seed)·중복 Term 금지=중복금지 게이트. 형식 Glossary Manager=ABSENT.
- **§8 Certification(5등급)**: NOT_CERTIFIED 라벨+Trust First(READY만=Certified만 KPI)·형식 Manager=ABSENT.
- **§9 Search(10)**: NL search seed=`ClaudeAI`·형식 Full-Text/Semantic Search=ABSENT.
- **§10 Collection**: ABSENT(신설).
- **§11 Usage Analytics**: 품질=DataTrust·use_count·최근변경=SecurityAudit·형식 Engine=ABSENT.
- **§12 Security**: RBAC/masking/tenant/audit 상속·Metadata-only 접근=순신설.
- **§16 AI**: NL Search=`ClaudeAI`·품질 추천=`DataPlatform`·직접변경 불가=Part 004 승인+헌법 V3. 추천/Tag=순신설. 마케팅 AI 재사용/거버넌스 KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§1·§8=DataAssets/Certification 원칙) / PARTIAL(§2·§3·§5·§7·§11·§12·§14) / ABSENT-formal(§4·§6·§9·§10·§13·§15=Glossary/Tag/Owner/Steward/Search Index/Collection).** 코드 0. ★DataPlatform DataAssets·Trust First 인증·DSAR canonical·ClaudeAI 재사용(중복 카탈로그/인증/용어/검색 신설 절대 금지)·형식 Catalog Portal/Glossary/Search 신설·Part 001~007 상속·AI Metadata 직접변경 불가(승인).
