# DSAR — EASTF Ground-Truth ① Existing Implementation (Part 3-39)

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 상위 SPEC/ADR: Part 3-39 계보. 본 문서는 하위 DSAR file:line 인용의 허용 근거지(GROUND_TRUTH).

## 전수조사 방법
transformation/portfolio/roadmap/capability/value-stream/benefits/initiative/raid 키워드로 `backend/src`·`docs` 전수 grep + 판독.

## 실존 substrate (형식 Transformation 아님·PPM/상위 Part 공유)
| EASTF 개념 | 실존 substrate | 인용 | 성격 |
|---|---|---|---|
| Portfolio Manager | pm_portfolio | `Handlers/PM/Enterprise.php` | PARTIAL(★테넌트 PM≠플랫폼 프로그램) |
| Risk & Dependency | pm_raid(RAID)·baseline | `Handlers/PM/Enterprise.php` | PARTIAL(테넌트 PM) |
| Strategic Roadmap/Capability | Part 3-27 LTER | (설계) | 상위 Part 참조 |
| Innovation Portfolio/Initiative | Part 3-32 EACIF | (설계) | 상위 Part 참조 |
| Executive Dashboard | Part 3-34 EAEGD | (설계) | 상위 Part 참조 |
| AI Transformation Advisor | ClaudeAI·AutoRecommend(마케팅) | `ClaudeAI.php`·`AutoRecommend.php` | KEEP_SEPARATE(패턴만) |
| Approval | pending_approval | `Catalog.php`·`Alerting.php` | PARTIAL |
| Evidence/Isolation | 해시체인·격리 | `SecurityAudit.php`·`Db.php` | 실재 |

## 부재(ABSENT) — 형식 EASTF 엔티티 (grep 0)
Transformation Registry · Transformation Governance(Steering Committee) · Strategic Roadmap Manager(형식) · Transformation Portfolio Manager(플랫폼) · Business Capability Mapping Engine · Value Stream Manager · Change Impact Assessment Engine · Organizational Readiness Manager(조직) · Technology Transition Manager · Investment Prioritization Engine · Benefits Realization Manager · Transformation KPI Engine · AI Transformation Advisor(거버넌스) · Snapshot/Digest/Analytics.

## ★조직(비-코드)
Executive Steering Committee·Organizational Readiness(Leadership/Skills)는 조직/인력 신설 대상.

## 판정
**PARTIAL / ABSENT-formal + 조직 요소.** PM/Enterprise(pm_portfolio·pm_raid·baseline)·Part 3-27/3-32/3-34 참조·ClaudeAI·pending_approval·SecurityAudit는 실재(PPM·상위 Part 공유)하나, 형식 통합 Transformation Lifecycle/Value Stream/Benefits Realization은 전무. 실행은 선행 Part 인증 + 조직 신설 종속.
