# MEA Part 025 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 025 SPEC/ADR.

## 전수조사 방법
customer/crm/360/ltv/segment/consent/journey/identity/merge/dedup 키워드로 `backend/src/Handlers` 전수 grep + 판독.

## 실존 substrate (★고객 마스터·360·세그먼트·동의)
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| 고객 마스터 | crm_customers·grade·RFM | `CRM.php`(crm_customers:48·grade/ltv:52·rfm:80) | PARTIAL-strong |
| Customer 360 | omnichannel identity | `CRM.php`(255차)·crm_activity:60 | PARTIAL-strong |
| ROI Contribution(LTV) | LTV·취소/반품 역분개 | `CRM.php`(ltv·263차) | PARTIAL-strong |
| 세그먼트 | crm_segments·members | `CRM.php`(crm_segments:64·crm_segment_members:71) | PARTIAL-strong |
| AI Dynamic Segment | no-PII aggregate | `CustomerAI.php`·`Decisioning.php` | PARTIAL |
| 저니 | 저니 캔버스 | `JourneyBuilder.php` | PARTIAL |
| 확률 아이덴티티 | probabilistic identity | `Attribution.php`(282차) | PARTIAL |
| 동의(Consent) | GDPR 동의 | `GdprConsent.php` | PARTIAL-strong |
| Privacy/DSAR | DSAR·컴플라이언스 | `Dsar.php`·`Compliance.php` | PARTIAL-strong |
| Identity/Verification | OTP 가입 | `UserAuth.php`(273차) | PARTIAL |
| AI(LTV/churn) | 생애가치·이탈 예측 | `CustomerAI.php`(BG-NBD 279차) | PARTIAL-strong |
| Security(No-PII) | 집계 cohort | v418.1·`Crypto`·`SecurityAudit` | PARTIAL-strong |

## 부재(ABSENT-formal) — 형식 Customer 360 Engine/Identity Manager (grep 0 또는 산재)
형식 Customer 360 Engine(실시간 조립·Single Customer View)·Customer Identity Manager(deterministic+probabilistic resolution·Customer Merge Policy·Duplicate Detection)·형식 Customer Master Repository(단일 SSOT)·Segmentation Engine(version/snapshot·EPIC 06-A 289차 부재)·Journey Manager(Event 기반 전 단계)·형식 Customer Lifecycle Manager·Event 표준(CustomerRegistered 등).

## 판정
**PARTIAL-strong / ABSENT-formal.** ★고객 마스터·360·세그먼트·동의는 **실재**: `CRM`(crm_customers·grade·RFM·crm_activity·crm_segments/members·255차 omnichannel identity 360·263차 LTV 역분개)·`CustomerAI`(churn/CLV·BG-NBD 279차)·`Decisioning`(no-PII aggregate)·`JourneyBuilder`(저니)·`GdprConsent`(동의)·`Compliance`/`Dsar`(Privacy)·`Attribution`(확률 아이덴티티 282차)이나, **형식 통합 Customer 360 Engine(실시간 조립)·Identity Manager(resolution·Merge Policy)·Segmentation Engine version/snapshot은 부재**(고객=handler별·Part 021 정합·EPIC 06-A crm_segments SoT version 부재 정합). 실행은 실시간 360 조립 계층 신설(고객 재구현 없이) 종속.
