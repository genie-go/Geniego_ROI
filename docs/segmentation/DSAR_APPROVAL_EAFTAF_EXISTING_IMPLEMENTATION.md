# DSAR — EAFTAF Ground-Truth ① Existing Implementation (Part 3-43)

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 상위 SPEC/ADR: Part 3-43 계보. 본 문서는 하위 DSAR file:line 인용의 허용 근거지(GROUND_TRUTH).

## 전수조사 방법
technology/radar/poc/pilot/vendor/adoption/maturity/dependency/evaluation 키워드로 `backend/src`·`docs`·매니페스트 전수 grep + 판독.

## 실존 substrate (형식 기술채택 아님·상위 Part/매니페스트)
| EAFTAF 개념 | 실존 substrate | 인용 | 성격 |
|---|---|---|---|
| Dependency/Technology 목록 | 의존성 매니페스트 | `composer.json`·`package.json` | PARTIAL(기술 스택·Lifecycle 부재) |
| Technology Radar/Discovery | Part 3-27 Future Standards Tracker | (설계) | 상위 Part 참조 |
| POC/Pilot | AbTesting(마케팅 실험)·Part 3-32 | `AbTesting.php`·(설계) | PARTIAL(패턴 참조·마케팅) |
| Architecture Compatibility | ADR·변경게이트 | `docs/architecture/`·`docs/CHANGE_GATE.md` | 상위 Part 3-33 참조 |
| Investment | Part 3-27/3-34 | (설계) | 상위 Part 참조 |
| Security Before Adoption | CI 스캔 | `.github/workflows/security-scan.yml` | PARTIAL |
| Evidence/Isolation | 해시체인·격리 | `SecurityAudit.php`·`Db.php` | 실재 |

## 부재(ABSENT) — 형식 EAFTAF 엔티티 (grep 0)
Technology Registry(형식) · Technology Governance(Review Board) · Technology Radar Engine · Emerging Technology Discovery Engine · Technology Evaluation/POC Manager/Pilot Validation Engine(형식) · Technology Maturity/Risk/Business Value Assessment · Architecture Compatibility Engine(런타임) · Vendor Evaluation Manager · Technology Investment/Adoption Roadmap·Standardization/Lifecycle Manager · Technology Snapshot/Digest/Analytics · Executive Technology Dashboard.

## ★조직/프로세스(비-코드)
Review Board·Vendor Evaluation·Executive Approval·POC governance는 조직/프로세스 신설.

## 판정
**PARTIAL / ABSENT-formal + 조직/프로세스.** composer/npm·AbTesting·docs/architecture·CI 스캔·SecurityAudit는 실재(매니페스트·상위 Part 공유)하나, 형식 통합 Technology Radar/POC Manager/Vendor Evaluation은 전무. 실행은 선행 인증 + 조직 신설 종속.
