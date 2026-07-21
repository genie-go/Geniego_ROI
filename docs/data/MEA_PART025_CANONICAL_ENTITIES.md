# MEA Part 025 — Canonical Entities Design & Judgment (§5~§16)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★CRM/CustomerAI/JourneyBuilder/GdprConsent 재사용·형식 Customer 360 Engine/Identity Manager greenfield·Part 021/024 상속·No-PII 준수.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | CUSTOMER | crm_customers | `CRM.php`(:48) | PARTIAL-strong |
| 2 | CUSTOMER_PROFILE | grade·RFM·활동 | `CRM.php`(crm_activity:60) | PARTIAL-strong |
| 3 | CUSTOMER_360 | omnichannel identity | `CRM.php`(255차) | PARTIAL-strong |
| 4 | CUSTOMER_IDENTITY | 확률 아이덴티티(부분) | `Attribution.php`(282차)·`UserAuth` | PARTIAL(형식 resolution ABSENT) |
| 5 | CUSTOMER_SEGMENT | crm_segments SoT | `CRM.php`(:64·:71)·`Decisioning` | PARTIAL-strong |
| 6 | CUSTOMER_PREFERENCE | 선호(부분) | `CRM`·WebPush 토픽 | PARTIAL-informal |
| 7 | CUSTOMER_CONTACT | 연락처 | `CRM.php` | PARTIAL |
| 8 | CUSTOMER_ADDRESS | 주소 | `CRM`·`OrderHub` | PARTIAL |
| 9 | CUSTOMER_JOURNEY | 저니 캔버스 | `JourneyBuilder.php` | PARTIAL |
| 10 | CUSTOMER_INTERACTION | 활동/터치포인트 | `CRM`(crm_activity)·`Attribution` | PARTIAL |
| 11 | CUSTOMER_CONSENT | GDPR 동의 | `GdprConsent.php` | PARTIAL-strong |
| 12 | CUSTOMER_SCORE | LTV/RFM/churn | `CRM`·`CustomerAI` | PARTIAL-strong |
| 13 | CUSTOMER_STATUS | grade·이탈 상태 | `CRM.php`(cutoff) | PARTIAL |
| 14 | CUSTOMER_AUDIT | 해시체인 | `SecurityAudit.php` | PARTIAL-strong |
| 15 | CUSTOMER_POLICY | Consent/Privacy 정책 | `GdprConsent`·`Compliance` | PARTIAL |

## §6~§16 표준 판정
- **§6 Domain(10)**: Individual/VIP=CRM(grade)·Member=UserAuth·Subscription=Paddle·Partner=PartnerPortal. 형식 Master 통합=부분.
- **§7 Lifecycle(10)**: Registration=UserAuth(OTP 273차)·Loyalty=CRM(RFM)·Dormant=CRM(cutoff)·Withdrawal=Dsar·형식 Lifecycle Manager=부분.
- **§8 Customer 360(10)**: ★CRM(255차 identity 360·LTV 263차)·Order=OrderHub·Payment=Payment·형식 실시간 조립 Engine=부분.
- **§9 Segmentation(8)**: crm_segments SoT·RFM·AI Dynamic=CustomerAI/Decisioning(no-PII)·형식 Engine version/snapshot(EPIC 06-A 289차 부재)=부분.
- **§10 Journey(10)**: JourneyBuilder·Attribution(터치포인트·확률 아이덴티티 282차)·형식 Journey Manager(Event 전 단계)=부분.
- **§11 Governance(8)**: Consent=GdprConsent·Privacy=Compliance/Dsar·Duplicate/Merge Policy(형식)=부분.
- **§12 Security**: Tenant/Encryption/★No-PII 집계(v418.1)/PII Masking/RBAC/Consent/Audit(Part 021 상속).
- **§16 AI**: LTV/이탈/재구매=CustomerAI(BG-NBD 279차)·NBA=AutoRecommend·Explainability=헌법 V4·고객 정보 자동 변경/동의 대신 수행 불가=헌법 V3+V5+CHANGE_GATE. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§1~3·§5·§11·§12·§14=고객/360/세그먼트/동의/감사) / PARTIAL(§4·§6~10·§13·§15) / ABSENT-formal(형식 Customer 360 Engine/Identity Manager(resolution·Merge)/Segmentation Engine version/Journey Manager).** 코드 0. ★고객 마스터/360(`CRM`)·세그먼트(`CRM`/`Decisioning`)·동의(`GdprConsent`) 재사용(★중복 고객/세그먼트/LTV 도메인 절대 금지·LTV 역분개 정본 재구현 금지·No-PII 준수)·형식 Customer 360 Engine/Identity Manager 신설(고객 재구현 없이)·Part 021/024 상속·★AI 고객 정보 자동 변경/동의 대신 수행 불가(V3+V5+CHANGE_GATE).
