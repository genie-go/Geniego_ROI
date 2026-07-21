# DSAR — EAGCoE Canonical Entities Design & Judgment (Part 3-37 §2~§22)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★대부분 조직 체계(비-코드).

## 20 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | APPROVAL_COE_REGISTRY | 부재 | — | ABSENT(조직) |
| 2 | APPROVAL_COE_POLICY | 헌법·정책 문서 | `docs/CONSTITUTION.md` | PARTIAL(문서형) |
| 3 | APPROVAL_COE_STANDARD | 코딩/i18n/배포 표준 | `CLAUDE.md`·`docs/registry/` | PARTIAL |
| 4 | APPROVAL_COE_GUIDELINE | 변경게이트·트랩 문서 | `docs/CHANGE_GATE.md`·`CLAUDE.md` | PARTIAL |
| 5 | APPROVAL_COE_BEST_PRACTICE | 메모리(feedback/reference)·오탐레지스트리 | `.claude/.../memory/` | PARTIAL(비형식) |
| 6 | APPROVAL_COE_ADVISORY | 부재(자문위원회 없음) | — | ABSENT(조직) |
| 7 | APPROVAL_COE_CERTIFICATION | Part 3-35/3-36 참조 | (설계) | 상위 Part 참조 |
| 8 | APPROVAL_COE_TRAINING | 부재(교육 없음) | — | ABSENT(조직) |
| 9 | APPROVAL_COE_KPI | 부재 | — | ABSENT |
| 10 | APPROVAL_COE_COMMUNITY | 부재(내부 기술 커뮤니티 없음) | — | ABSENT(조직) |
| 11 | APPROVAL_COE_INNOVATION | Part 3-32 EACIF 참조 | (설계) | 상위 Part 참조 |
| 12 | APPROVAL_COE_RESEARCH | 부재 | — | ABSENT |
| 13 | APPROVAL_COE_SNAPSHOT | 부재 | — | ABSENT |
| 14 | APPROVAL_COE_EVIDENCE | append-only 정본 | `SecurityAudit.php` | PARTIAL(체인 재사용) |
| 15 | APPROVAL_COE_DIGEST | 부재 | — | ABSENT |
| 16 | APPROVAL_COE_ANALYTICS | 부재 | — | ABSENT |
| 17 | APPROVAL_COE_VERSION | git·문서 버전 | git | PARTIAL |
| 18 | APPROVAL_COE_STATUS | NOT_CERTIFIED 라벨 | `DSAR_APPROVAL_*` | PARTIAL-informal |
| 19 | APPROVAL_COE_BASELINE | 헌법/표준 baseline | `docs/CONSTITUTION.md`·git | PARTIAL |
| 20 | APPROVAL_COE_ROADMAP | Part 3-27 LTER 참조 | (설계) | 상위 Part 참조 |

## 도메인 설계 계약(§3~§22 요지)
- **§4 CoE Organization·§5~11 Excellence Offices·§15 Advisory Board·§16 Community**: ★전부 조직/인력(비-코드). 소프트웨어 제품엔 미존재 → 조직도/RACI 설계까지만.
- **§13 Best Practice Repository·§14 Standards Management**: ★유일 실 substrate — `docs/CONSTITUTION.md`(사명·Golden Rule·9개 절대원칙)·`.claude` 메모리(feedback/reference=오탐레지스트리·트랩·PowerShell 함정)·`CLAUDE.md`(코딩/i18n/배포 표준)를 형식 저장소로 승격.
- **§12 Training·§17 Innovation·§5 Architecture**: 상위 Part 3-35/3-32/3-33 참조(재정의 금지).
- **§18 CoE KPI**: Standard Adoption/Best Practice Reuse 등 순신설(조직 KPI).

## 판정
**PARTIAL(§2~5·§14·§17~19=Constitution/CLAUDE.md/메모리/CHANGE_GATE/registry/git/SecurityAudit 문서형) / ABSENT(§1·§6·§8~10·§12~13·§15~16 조직/커뮤니티/교육/자문=비-코드).** 코드 0. BLOCKED_PREREQUISITE + 조직 신설. 실행 시 문서형 substrate 형식화 + 상위 Part 참조(중복 저장소/조직 임의신설 금지).
