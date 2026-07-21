# MEA Part 039 — Ground-Truth ② Duplicate Implementation Audit

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 목적 = Cross Border/Customs 신설이 기존 국제 추적(`Logistics`)·원산지(`Catalog`)·VAT(`Pnl`)·다통화(`Connectors`)와 오흡수/중복하지 않도록 경계 확정. ★중복 위험 국소(추적/원산지 seed만·통관 순신설).

## ★상위 Part/규범 중복 — 재정의 금지
| MEA 개념 | 상위 Part/규범 | 판정 |
|---|---|---|
| International Tracking | ★MEA Part 031/037·`Logistics`(DHL) | ★재정의 금지·재사용 |
| 글로벌 마켓 판매 | ★MEA Part 029 Channel·`ChannelSync` | ★재정의 금지·재사용 |
| 원산지(Certificate of Origin) | ★MEA Part 022 PIM·`Catalog`/st11(286차) | ★재정의 금지·재사용 |
| VAT/Tax | ★MEA Part 016 Profit·`Pnl` | ★재정의 금지·재사용(★VAT≠관세) |
| 다통화 | ★MEA Part 023 Pricing·`Connectors::fxToKrw` | 참조·재사용 |

## ★동음이의(코드베이스) — 오흡수 금지 (★VAT≠관세·글로벌 판매≠통관)
| MEA 개념 | 자산 | 인용 | 판정 |
|---|---|---|---|
| International Tracking | DHL | `Logistics.php`(INTL) | 재사용·★오흡수 금지(추적≠통관) |
| 글로벌 판매 | amazon/ebay | `ChannelSync.php` | 재사용·★오흡수 금지(판매≠수출입 통관) |
| 원산지 | 11번가 원산지 | `Catalog`/st11 | 재사용(Certificate of Origin seed) |
| VAT | 부가세 | `Pnl`(VAT) | ★재사용·★오흡수 금지(VAT≠관세 Duty) |
| 다통화 | KRW base | `Connectors::fxToKrw` | 재사용 |
| AI | 마케팅 AI | `ClaudeAI` | KEEP_SEPARATE |

## ★교훈 반영
- ★[[feedback_competitive_gap_verify]]: Customs/HS Code/Duty/Trade Compliance 부재=부재증명(과대주장 금지·통관은 3PL/통관사 담당).
- ★"코드 존재≠구현 완료"(283차)·★역방향 오흡수 금지: VAT(`Pnl`)≠관세(Duty)·글로벌 판매(`ChannelSync`)≠수출입 통관·DHL 추적(`Logistics`)≠통관 절차.
- ★`Logistics` DHL 실구현·FedEx/UPS/TNT "현재 정직하게 pending"(과대주장 금지 코드 주석 준수)·재구현 금지.
- ★11번가 원산지 정본(286차·st11_notice_types.json)=재구현/재학습 금지.
- [[reference_platform_growth_actas_tenant_hijack]]: (신설 시)Cross-Tenant Customs Leakage·Tenant Isolation.
- [[reference_menu_audit_log_not_tamper_evident]]: Customs Audit 정본 = `SecurityAudit::verify`만.

## 확장 대상(중복 신설 금지 / 순신설)
- 국제 추적=`Logistics` 재사용(통관 아님). 글로벌 판매=`ChannelSync`. 원산지=`Catalog`/st11. VAT=`Pnl`(관세 아님). ★Customs Management/HS Code/Duty/Trade Compliance/Import·Export Registration/Customs Documentation=전부 순신설(부재·자체 통관 운영+통관/정부 API 후).

## 판정
**중복 위험 국소(추적/원산지 seed만·통관 핵심 순신설).** ★핵심=`Logistics`(국제 추적)·`ChannelSync`(글로벌 판매)·`Catalog`/st11(원산지)·`Pnl`(VAT)·`Connectors`(다통화)·`SecurityAudit`는 **재사용하되 통관 도메인이 아님(오흡수 금지·추적≠통관·판매≠수출입·VAT≠관세)**. Part 031/037 Logistics·Part 029 Channel·Part 022 PIM·Part 016 Profit·헌법 **재정의 금지**. 본 Part 고유 순신설=★Customs Management(Customs Declaration/HS Code/Duty Calculation/Electronic Filing)·Trade Compliance(Sanction/Restricted Goods/FTA/Dangerous Goods)·Import/Export Registration·Customs Documentation(Commercial Invoice/Packing List/Export License)·Bonded/International Warehouse(전부 부재·부재증명 완료)뿐. ★통관은 3PL/통관사 담당·자체 통관 운영 착수 시(통관 시스템/정부 API 연동 필수)·과대주장 금지·마케팅 AI KEEP_SEPARATE·★AI 통관 신고 자동 제출/정부 승인 자동 수행 불가(V3+V5+CHANGE_GATE).
