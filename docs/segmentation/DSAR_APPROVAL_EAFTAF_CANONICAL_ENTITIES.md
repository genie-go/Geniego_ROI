# DSAR — EAFTAF Canonical Entities Design & Judgment (Part 3-43 §2~§21)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★상위 Part 3-27/3-32/3-33 통합·재정의 금지.

## 20 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | APPROVAL_TECHNOLOGY_REGISTRY | 부재(composer/npm=목록) | `composer.json`·`package.json` | PARTIAL(Registry 형식화) |
| 2 | APPROVAL_TECHNOLOGY_PROFILE | 부재 | — | ABSENT |
| 3 | APPROVAL_TECHNOLOGY_RADAR | Part 3-27 Future Standards | (설계) | 상위 Part 참조 |
| 4 | APPROVAL_TECHNOLOGY_POC | AbTesting(마케팅) | `AbTesting.php` | PARTIAL(패턴·KEEP_SEPARATE) |
| 5 | APPROVAL_TECHNOLOGY_PILOT | Part 3-32 Pilot | (설계) | 상위 Part 참조 |
| 6 | APPROVAL_TECHNOLOGY_EVALUATION | 부재(수동 평가) | — | ABSENT-formal |
| 7 | APPROVAL_TECHNOLOGY_MATURITY | Part 3-28 Maturity | (설계) | 상위 Part 참조 |
| 8 | APPROVAL_TECHNOLOGY_RISK | 부재(비즈니스 Risk=KEEP_SEPARATE) | — | ABSENT-formal |
| 9 | APPROVAL_TECHNOLOGY_BUSINESS_VALUE | 비즈니스 ROI(KEEP_SEPARATE) | `Pnl.php` | ABSENT-formal |
| 10 | APPROVAL_TECHNOLOGY_ARCHITECTURE | Part 3-33 Compatibility·ADR | `docs/architecture/` | 상위 Part 참조 |
| 11 | APPROVAL_TECHNOLOGY_VENDOR | 제품 벤더(KEEP_SEPARATE)·Part 3-27 | `ChannelSync.php` | ABSENT-formal(기술 벤더 신설) |
| 12 | APPROVAL_TECHNOLOGY_INVESTMENT | Part 3-27/3-34 | (설계) | 상위 Part 참조 |
| 13 | APPROVAL_TECHNOLOGY_ROADMAP | Part 3-27 LTER Roadmap | (설계) | 상위 Part 참조 |
| 14 | APPROVAL_TECHNOLOGY_STANDARD | CLAUDE.md·registry·Part 3-33 | `CLAUDE.md`·`docs/registry/` | PARTIAL |
| 15 | APPROVAL_TECHNOLOGY_SNAPSHOT | 부재 | — | ABSENT |
| 16 | APPROVAL_TECHNOLOGY_EVIDENCE | append-only 정본 | `SecurityAudit.php` | PARTIAL(체인 재사용) |
| 17 | APPROVAL_TECHNOLOGY_DIGEST | 부재 | — | ABSENT |
| 18 | APPROVAL_TECHNOLOGY_ANALYTICS | 부재 | — | ABSENT |
| 19 | APPROVAL_TECHNOLOGY_VERSION | git·API 버전·composer lock | git·`composer.json` | PARTIAL |
| 20 | APPROVAL_TECHNOLOGY_STATUS | NOT_CERTIFIED 라벨 | `DSAR_APPROVAL_*` | PARTIAL-informal |

## 도메인 설계 계약(§3~§21 요지)
- **§4 Technology Radar·§5 Discovery**: Part 3-27 Future Standards Tracker 통합(재정의 금지). Radar 시각화(Observe~Retire)는 신설.
- **§7~8 POC/Pilot**: `AbTesting` 실험 패턴 참조(★마케팅≠기술)·Part 3-32 Pilot 통합. Exit Criteria/Success Criteria governance 신설.
- **§12 Architecture Compatibility**: Part 3-33 EASALM(ADR·Impact/Compliance) 통합.
- **§13 Vendor Evaluation**: ★제품 벤더(채널/PG)≠기술 벤더(플랫폼 인프라/SDK). 기술 벤더 평가=순신설(대부분 조직/프로세스).
- **§16 Dependency/Lifecycle**: composer/npm 목록을 소스로 EOL/adoption 상태(Proposed~Retired) 신설.

## 판정
**PARTIAL(§1·§4·§14·§16·§19=composer/npm·AbTesting·CLAUDE.md/registry·SecurityAudit substrate·상위 Part 참조) / ABSENT-formal(§2·§6·§8~9·§11·§15·§17~18 Evaluation/Risk/Vendor/Analytics) + 조직(§3 Review Board·§13 Vendor Eval).** 코드 0. BLOCKED_PREREQUISITE + 조직 신설. 실행 시 상위 Part 통합(재정의·제품벤더/마케팅 오흡수 금지).
