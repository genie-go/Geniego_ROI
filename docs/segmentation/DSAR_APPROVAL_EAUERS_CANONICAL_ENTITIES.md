# DSAR — EAUERS Canonical Entities Design & Judgment (Part 3-57 §2~§19)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★registry/CONSTITUTION/CLAUDE.md/pre-commit 게이트 재사용·형식 엔진 greenfield.

## 20 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | APPROVAL_ENTERPRISE_STANDARD | 헌법·게이트·ADR | `CONSTITUTION`·`CHANGE_GATE.md`·`docs/architecture/` | PARTIAL-strong |
| 2 | APPROVAL_STANDARD_DOMAIN | 헌법 도메인·데이터 볼륨 | `CONSTITUTION`·헌법 6볼륨 | PARTIAL-informal |
| 3 | APPROVAL_STANDARD_RULE | 게이트 규칙·절대금지 | `CHANGE_GATE.md`·pre-commit 게이트 | PARTIAL |
| 4 | APPROVAL_STANDARD_PATTERN | ADR 패턴·DSAR 7문서 | `docs/architecture/`(146 ADR) | PARTIAL-informal |
| 5 | APPROVAL_STANDARD_CONTROL | pre-commit 게이트·감사 통제 | pre-commit G-게이트·`reference_audit_false_positives` | PARTIAL |
| 6 | APPROVAL_STANDARD_NAMING | 프로젝트 규약 | `CLAUDE.md` | PARTIAL-informal |
| 7 | APPROVAL_STANDARD_COMPLIANCE | 게이트·헌법 준수 | `CHANGE_GATE.md` | PARTIAL-informal |
| 8 | APPROVAL_STANDARD_CERTIFICATION | NOT_CERTIFIED 라벨 | `DSAR_APPROVAL_*`(Part 3-36) | PARTIAL-informal |
| 9 | APPROVAL_STANDARD_ANALYTICS | 부재(형식) | — | ABSENT |
| 10 | APPROVAL_STANDARD_SNAPSHOT | 부재 | — | ABSENT |
| 11 | APPROVAL_STANDARD_EVIDENCE | append-only 정본 | `SecurityAudit.php` | PARTIAL(체인 재사용) |
| 12 | APPROVAL_STANDARD_DIGEST | 부재 | — | ABSENT |
| 13 | APPROVAL_STANDARD_BASELINE | sacred SHA·헌법·git | pre-commit G2·`CONSTITUTION`·git | PARTIAL-strong |
| 14 | APPROVAL_STANDARD_VERSION | git·문서 버전 | git | PARTIAL |
| 15 | APPROVAL_STANDARD_STATUS | NOT_CERTIFIED 라벨 | `DSAR_APPROVAL_*` | PARTIAL-informal |
| 16 | APPROVAL_STANDARD_LIBRARY | ADR·패턴 라이브러리 | `docs/architecture/` | PARTIAL-informal |
| 17 | APPROVAL_STANDARD_MAPPING | 문서 상호참조 링크 | `[[...]]` 링크 | PARTIAL-seed |
| 18 | APPROVAL_STANDARD_EXCEPTION | FP 레지스트리 | `reference_audit_false_positives` | PARTIAL-informal |
| 19 | APPROVAL_STANDARD_PUBLICATION | git commit·배포 | git·배포 절차 | PARTIAL-informal |
| 20 | APPROVAL_STANDARD_REFERENCE | registry·DSAR canonical | `docs/registry/`·28 DSAR canonical | PARTIAL-strong |

## 도메인 설계 계약(§3~§19 요지)
- **§3·§5 Governance/Repository**: CONSTITUTION/CHANGE_GATE/registry/146 ADR 인덱싱(중복 표준 문서 금지·Part 3-49/3-50).
- **§7 Pattern Library / §8 Control Catalog**: 146 ADR 패턴·pre-commit 게이트 통제 승격.
- **§9 Naming**: `CLAUDE.md` 규약 승격(중복 규약 금지).
- **§10·§11 Lifecycle/Certification**: CHANGE_GATE+git·NOT_CERTIFIED 라벨(Part 3-36).
- **§6·§12·§17·§18 Mapping/KPI/Analytics/AI Advisor**: 형식 순신설·마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§1·§13·§20=헌법/sacred SHA/registry 강함) / PARTIAL-informal(§2~8·§16·§18·§19=게이트/ADR/규약/인증/FP) / ABSENT(§9·§10·§12=Analytics/Snapshot/Digest).** 코드 0. BLOCKED_PREREQUISITE. ★Part 3-49/3-50 상위집합(재설계 금지)·표준 문서/게이트/규약 재사용·형식 Mapping/Analytics 엔진 신설·마케팅 AI 분리.
