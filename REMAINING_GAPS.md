# REMAINING_GAPS.md

GeniegoROI AI Profit Intelligence OS — 미구현/부분구현 갭 + 기존 구조 통합 구현 계획

- 기준: HEAD `ec389a9` (231차) · 원칙: **신규 중복 금지, 기존 확장**
- 분류: 🟢 즉시(무위험·기존확장) · 🟡 중규모(스키마 ALTER·검증필요) · 🔴 설계결정 필요

| # | 갭 | 현재 | 구현 방식(기존 확장 대상) | 무후퇴 등급 | 비고 |
|---|----|------|---------------------------|------------|------|
| 1 | **Profit Health Score** | pnlStats 워터폴은 있으나 종합 건강도 판정 없음 | `PnLDashboard.jsx` 신규 **탭** + `pnlStats` 파생 지표(Gross/Op Margin·반품률·배송비율·CAC) Green/Yellow/Red | 🟢 순수 파생 | 즉시 |
| 2 | **Root Cause 인과추론** | AnomalyDetection 탐지만 | `AnomalyDetection.php`/`Decisioning.php` 확장: 이상점 → 워터폴 항목별 델타 기여 분해 + `action_request` 추천 연결 | 🟡 | 처방 연결 |
| 3 | **통합 What-if Scenario** | PriceOpt/Mmm/Forecast 개별 시뮬만 | `PnLDashboard` ForecastTab에 **Scenario Builder** 통합(`Mmm.optimize`+`PriceOpt.simulation`+pnlStats 재계산) | 🟡 | 신규 페이지 금지 |
| 4 | **Agent 권한모드** | action_request 승인은 있으나 Recommend/Approval/Auto 모드 부재 | `app_user.agent_mode` 컬럼(ALTER, 기본 'approval') + `AdAdapters` 실행 전 게이트 | 🟡 ALTER | 기본 안전값 |
| 5 | **Executive Copilot 단일흐름** | ClaudeAI·CustomerAI·AIInsights 분산 | `AIInsights.jsx` 확장: 질의 → ClaudeAI 답변 + pnlStats KPI + Anomaly 원인 + action_request 추천/승인 연결 | 🟡 | 신규 AI 메뉴 금지 |
| 6 | **ROI Formula Versioning** | 계산식 소스 고정·이력 없음 | 신규 경량 테이블 `roi_formula_version`(version·formula_json·effective_from) + RoiService 참조 | 🟡 신규테이블 | 거버넌스 |
| 7 | **KPI Definition Registry / Metric Dictionary** | AutoRecommend 소스 상수 하드코딩 | `metric_def` 경량 테이블 또는 app_setting 메타로 외부화 + DataTrustDashboard 노출 | 🟡 | DB 외부화 |
| 8 | **Profit Knowledge Graph 순이익 가중** | graph_edge.weight=일반 | `GraphScore` 엣지 가중치에 순이익 기여(margin−배송−반품) 추가(meta_json) | 🟢 확장 | 신규 그래프 메뉴 불요 |
| 9 | **역할별 Dashboard View** | 8 대시보드 미분화 | 기존 대시보드에 role-view 프리셋(탭 필터, `tabPlanPolicy` 패턴 재사용) | 🟢 | 신규 대시보드 금지 |
| 10 | **API 응답 표준 봉투** | TemplateResponder 단순 json·경로별 혼재 | `TemplateResponder`에 `ok($data,$meta)`/`fail($code,$detail)` 표준 메서드 추가(기존 respond 보존) + 신규/주요 엔드포인트부터 점진 적용 | 🟡 점진 | 무후퇴 위해 기존 봉투 유지 |
| 11 | **Alerting cron 스케줄** | HTTP evaluate만·cron 불명확 | 서버 crontab/systemd timer 등록(`/v410/alerts/evaluate` daily/weekly) | 🟡 운영 | 폐쇄루프 자동화 |
| 12 | **AIRuleEngine 백엔드** | 프론트 데모전용 | `Alerting`(정책엔진) 확장으로 실 연동(신규 핸들러 금지) | 🟡 | 데모→실 |
| 13 | **벤치마크 국가차원·신뢰도** | 채널·업종만(KRW) | `channel_benchmark`에 country·sample_n·confidence ALTER. ★가짜 하드코딩 금지·내부 익명집계 | 🟡 ALTER | |
| 14 | **OAuth 토큰 암호화 검증** | connector_token 평문 의심 | `Crypto::encrypt` 적용 확인·미적용 시 암호화(채널 키 패턴 재사용) | 🔴 보안검증 | SECURITY_REVIEW #7 |
| 15 | **일반 API rate-limit·CSRF·SameSite·세션쿠키** | 로그인만 rate-limit | index.php 미들웨어 확장(엔드포인트 throttle)·SameSite=Strict·CSRF 토큰 | 🔴 | SECURITY_REVIEW |
| 16 | **ABAC / SSO Ready** | RBAC만 | 속성기반(테넌트·역할·자원) 게이트 헬퍼 + OAuth IdP 연동 구조(OAuth.php 확장) | 🔴 설계 | 대규모 조직용 |
| 17 | **view=읽기전용 페이지별 강제** | adminMenuLevel 노출까지(231차) | 전 admin 페이지에 `adminMenuLevel` 기반 쓰기 차단 점진 적용 | 🟡 점진 | 231차 #4 잔여 |

## 권장 실행 순서
🟢 즉시(1·8·9) → 🟡 핵심(2·3·4·5) → 거버넌스(6·7·11·12·13) → 🔴 보안설계(10·14·15·16·17).

각 항목: 기존 핸들러/페이지/테이블 **확장만**. 신규 메뉴·대시보드·Agent·ROI 핸들러 생성 0. 무후퇴·운영/데모 배포·헤드리스 검증·문서 갱신.
