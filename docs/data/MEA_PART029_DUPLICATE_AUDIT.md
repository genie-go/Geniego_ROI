# MEA Part 029 — Ground-Truth ② Duplicate Implementation Audit

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 목적 = Channel 신설이 기존 채널(`ChannelRegistry`/`ChannelSync`)·자격증명(`ChannelCreds`)·Part 021~027와 중복 재정의하지 않도록 경계 확정. ★채널=앱 최강 도메인으로 중복 위험 최상.

## ★상위 Part/규범 중복 — 재정의 금지
| MEA 개념 | 상위 Part/규범 | 판정 |
|---|---|---|
| CHANNEL/Sync | ★MEA Part 021 Commerce·`ChannelSync` | ★재정의 금지·재사용 |
| Connector/Adapter | ★데이터 헌법 Vol2·`Connectors`·`ChannelRegistry` | ★재정의 금지(채널 나열 금지·표준모델) |
| Channel Product/Image | ★MEA Part 022 PIM·`Catalog`/`ChannelImage` | ★재정의 금지·재사용 |
| Channel Price | ★MEA Part 023 Pricing·`ChannelSync`(channelPrice) | 참조·재사용 |
| Channel Order/Inventory | ★MEA Part 024 OMS·Part 027·`ChannelSync`/`Wms` | ★재정의 금지·재사용 |

## ★동음이의(코드베이스) — 재사용 vs 오흡수 (★중복 채널/어댑터/자격증명 절대 금지)
| MEA 개념 | 자산 | 인용 | 판정 |
|---|---|---|---|
| 채널 레지스트리 | DB 동적 | `ChannelRegistry.php` | ★재사용(★중복 레지스트리 신설 절대 금지) |
| 어댑터/동기화 | per-channel | `ChannelSync.php` | ★재사용(★중복 어댑터/sync 절대 금지) |
| 계약/preflight | op 검증 | `ChannelContract.php` | 재사용 |
| 자격증명 | AES-256-GCM | `ChannelCreds.php`(202차) | ★재사용(★중복 자격증명 신설 절대 금지·평문노출 회피) |
| Connector Interface | 커넥터 | `Connectors.php` | 재사용(데이터 헌법 Vol2) |
| 재고/가격 SSOT | Wms/PriceOpt | `Wms`·`ChannelSync`(channelPrice) | ★재사용(중복 재고/가격 금지) |
| AI | 마케팅 AI | `ClaudeAI` | KEEP_SEPARATE |

## ★교훈 반영
- [[feedback_no_regression_value_unification]]: 채널/어댑터/자격증명 단일 정의·값 무후퇴=★중복 절대 금지(값 분산=회귀).
- ★데이터 헌법 Vol2: 채널 나열 금지·표준모델 정규화·Connector Registry 등록·Quality Gate·Trust Score(§14)·중복 Connector/API/Object/Schema 금지.
- ★11번가 표준필수 정본(286차·[[reference_st11_product_register_full_spec]])·★st11 -997=(경로,메서드) 미등록(인증실패 아님·키·IP·이용신청 정상·재의심 금지·[[reference_st11_openapi_997_and_paths]])·재구현/재학습 금지.
- ★11번가 N+1 회피(285차·루프 내 외부 API=즉시 장애)·공용카탈로그 `__shared__` 읽기=정본.
- ★자격증명 평문노출 회피([[feedback_credentials_handling]])·`ChannelCreds` AES-256-GCM·masked.
- [[reference_platform_growth_actas_tenant_hijack]]: Cross-Tenant Channel Leakage·Tenant Isolation.
- [[reference_menu_audit_log_not_tamper_evident]]: Channel Audit 정본 = `SecurityAudit::verify`만.

## 확장 대상(중복 신설 금지·기존 승격)
- 채널=`ChannelRegistry` 승격(채널 재구현 금지·Channel Management Engine). 어댑터/sync=`ChannelSync`/`ChannelContract`/`Connectors`. 자격증명=`ChannelCreds`. Audit=`SecurityAudit`.

## 판정
**중복 위험 최상(채널=앱 최강 도메인·레지스트리/어댑터/자격증명/동기화 실재).** ★핵심=`ChannelRegistry`(레지스트리)·`ChannelSync`(어댑터/sync)·`ChannelContract`(preflight)·`ChannelCreds`(암호화 자격증명)·`Connectors`(interface)·`SecurityAudit`는 **재사용/승격**(★중복 채널/어댑터/자격증명 도메인 신설 절대 금지=값 분산=무후퇴 위반·채널 나열 금지·표준모델·st11 정본 재구현 금지). Part 021 Commerce·Part 022 PIM·Part 023 Pricing·Part 024 OMS·Part 027 Inventory·데이터 헌법 Vol2·헌법 **재정의 금지**. 본 Part 고유 순신설=형식 통합 Marketplace Adapter Framework(표준 Connector Interface)·Channel Sync Engine·Retry Policy·Channel Governance Manager·Event 표준뿐. 마케팅 AI KEEP_SEPARATE·★AI 외부 채널 자동 게시/설정 변경 불가(V3+V5+CHANGE_GATE).
