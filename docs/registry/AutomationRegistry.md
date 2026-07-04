# AutomationRegistry — 자동화 레지스트리 (포인터+요약)

> **정본**: 코드 + `docs/V390_ACTIONS_AUTOMATION.md`·`ADMIN_GROWTH_AUTOMATION_ARCHITECTURE.md`·IMPLEMENTATION_STATUS §4. 신규 자동화 착수 전 여기 확인(중복 엔진 금지·기존 확장).

## 자동화 엔진(정본 file)
| 엔진 | 역할 |
|------|------|
| `AutoRecommend.php` | 다목표·경험적베이즈·UCB밴딧·포화 water-filling·증분성보정 |
| `AutoCampaign.php` | PAUSED생성→결제게이트→activateDelivery 캐스케이드·킬스위치·페이싱·optimizePortfolio·데이파팅 |
| `AbTesting.php` | 베이지안 A/B·승자예산집중·DCO피로도회전 |
| `AdAdapters.php` | 6채널 실집행(create/deliver/activate/pause/updateBudget)·tCPA/tROAS·CAPI·오디언스 |
| `RuleEngine` | 규칙기반 pause_channel 등 실동작 |
| `JourneyBuilder.php` | 저니 전노드(trigger/email/kakao/sms/delay/wait/condition/split/webhook/goal/nba/exit/attr)·RL forgetting |
| `Omnichannel.php` | 워터폴(whatsapp→kakao→email/sms)·멱등 outbox·cron |
| cron 13러너 | crontab 실등록(sync/rollup/attribution/gads/오디언스갱신 등) |

## 원칙
- 실집행=실 매체 API(자격증명 시). 무지출 안전(PAUSED·킬스위치·결제게이트·readiness). 채널키 정규화(normConnKey/connectorKey).
- 잘못된 채널/캠페인 집행 방지 가드레일 유지.

## 갱신 규칙
신규/변경 자동화 append. 집행경로 변경 시 Impact Analysis(Automation/Channel/Queue) + 거짓집행/과집행 회귀검증.
