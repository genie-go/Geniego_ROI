# DSAR — EASTF Canonical Entities Design & Judgment (Part 3-39 §2~§20)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★PM 테넌트 PPM·상위 Part 참조·재정의 금지.

## 20 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | APPROVAL_TRANSFORMATION_PROGRAM | 부재 | — | ABSENT |
| 2 | APPROVAL_TRANSFORMATION_PORTFOLIO | pm_portfolio(테넌트 PM) | `PM/Enterprise.php` | PARTIAL(패턴·KEEP_SEPARATE) |
| 3 | APPROVAL_TRANSFORMATION_INITIATIVE | Part 3-32 Innovation Initiative | (설계) | 상위 Part 참조 |
| 4 | APPROVAL_TRANSFORMATION_ROADMAP | Part 3-27 LTER Roadmap | (설계) | 상위 Part 참조 |
| 5 | APPROVAL_BUSINESS_CAPABILITY | Part 3-27 Capability Roadmap(부분) | (설계) | ABSENT-formal(Mapping 신설) |
| 6 | APPROVAL_VALUE_STREAM | 부재 | — | ABSENT |
| 7 | APPROVAL_CHANGE_IMPACT | 부재(수동 grep 영향분석·Part 3-33 정합) | — | ABSENT-formal |
| 8 | APPROVAL_ORGANIZATIONAL_READINESS | 부재(조직·비-코드) | — | ABSENT(조직) |
| 9 | APPROVAL_TECHNOLOGY_TRANSITION | Part 3-27 LTER Modernization | (설계) | 상위 Part 참조 |
| 10 | APPROVAL_INVESTMENT_PLAN | Part 3-27/3-34 Investment | (설계) | 상위 Part 참조 |
| 11 | APPROVAL_BENEFITS_REALIZATION | 비즈니스 ROI(KEEP_SEPARATE) | `Pnl.php` | ABSENT-formal |
| 12 | APPROVAL_TRANSFORMATION_KPI | 부재 | — | ABSENT |
| 13 | APPROVAL_TRANSFORMATION_SNAPSHOT | 부재 | — | ABSENT |
| 14 | APPROVAL_TRANSFORMATION_EVIDENCE | append-only 정본 | `SecurityAudit.php` | PARTIAL(체인 재사용) |
| 15 | APPROVAL_TRANSFORMATION_DIGEST | 부재 | — | ABSENT |
| 16 | APPROVAL_TRANSFORMATION_ANALYTICS | 부재 | — | ABSENT |
| 17 | APPROVAL_TRANSFORMATION_BASELINE | pm_baseline(테넌트)·문서 baseline | `PM/Enterprise.php`·git | PARTIAL |
| 18 | APPROVAL_TRANSFORMATION_VERSION | git·문서 버전 | git | PARTIAL |
| 19 | APPROVAL_TRANSFORMATION_STATUS | NOT_CERTIFIED 라벨 | `DSAR_APPROVAL_*` | PARTIAL-informal |
| 20 | APPROVAL_TRANSFORMATION_CERTIFICATION | Part 3-36 참조 | (설계) | 상위 Part 참조 |

## 도메인 설계 계약(§3~§20 요지)
- **§5 Portfolio·§11 Risk & Dependency**: `PM/Enterprise.php` pm_portfolio·pm_raid(RAID) 패턴 참조(★테넌트 PM 도메인·플랫폼 Transformation Program은 별도 인스턴스).
- **§4 Roadmap·§10 Technology Transition·§12 Investment**: Part 3-27 LTER 참조(재정의 금지).
- **§3 Steering Committee·§9 Organizational Readiness**: ★조직/인력(비-코드). 조직도/RACI 설계까지만.
- **§7 Value Stream·§13 Benefits Realization**: 순신설. 비즈니스 ROI(`Pnl`)·마케팅 예측(`Mmm`)은 KEEP_SEPARATE.
- **§20 AI Transformation Advisor**: ClaudeAI/AutoRecommend 패턴 참조(마케팅≠거버넌스 Advisor·오흡수 금지).

## 판정
**PARTIAL(§2·§14·§17~19=PM/Enterprise PPM·SecurityAudit·git substrate·상위 Part 참조) / ABSENT-formal(§6·§7·§11~13·§16 Value Stream/Benefits/KPI/Analytics) + 조직(§3·§8).** 코드 0. BLOCKED_PREREQUISITE + 조직 신설. 실행 시 PM/상위 Part 패턴 참조(재정의·마케팅 AI 오흡수 금지).
