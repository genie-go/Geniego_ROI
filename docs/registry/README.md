# 레지스트리 시스템 (265차 신설·기억 의존 금지)

> **원칙(사용자 265차)**: 절대로 기억에 의존하지 않는다. 모든 변경은 해당 레지스트리를 반드시 갱신한다.
> **정본 SSOT 존중**: 이미 정본이 있는 항목은 **여기서 중복 보관하지 않고 정본을 가리킨다**(SSOT 드리프트 방지 = Duplicate Prevention Gate). 정본 없는 항목만 여기 실보관.
> 4중/5중 게이트: `docs/CHANGE_GATE.md`. 모든 변경 전후 게이트 통과 + 아래 해당 레지스트리 갱신.

## 19 레지스트리 ↔ 정본 매핑

| 레지스트리 | 정본(SSOT) | 유형 |
|-----------|-----------|------|
| ArchitectureRegistry.md | `docs/IMPLEMENTATION_STATUS.md`(도메인) + `*_ARCHITECTURE.md`(ADMIN_GROWTH·TEAM_PERMISSION·AI_PROFIT_OS) | 포인터 |
| FeatureRegistry.md | `docs/IMPLEMENTATION_STATUS.md`(기능 정본 이력) | 포인터 |
| FeatureStatusMatrix.md | `docs/IMPLEMENTATION_STATUS.md`(✅/🔧/⏳ 상태표) | 포인터 |
| APIRegistry.md | `backend/src/routes.php`($custom+$register SSOT) + `*_CHANGELOG.md` | 포인터 |
| DatabaseRegistry.md | `backend/src/Db.php`(CREATE) + **라이브 SHOW COLUMNS**(스키마 정본) + `DB_MIGRATIONS.md` | 포인터 |
| AutomationRegistry.md | 코드(AutoCampaign/AutoRecommend/AbTesting/RuleEngine/JourneyBuilder) + `V390_ACTIONS_AUTOMATION.md` | 포인터+시드 |
| AnalyticsRegistry.md | 코드(Rollup/AttributionEngine/Mmm/Reports/CustomerAI) — **신규 실보관** | 실보관 |
| ChannelRegistry.md | 코드(`ChannelRegistry.php`+`channel_registry` 테이블·admin CRUD) + `V391_CHANNEL_ROADMAP.md` | 포인터 |
| ComponentRegistry.md | `frontend/src/pages`·`components`·`hooks`·`context(s)` — **신규 실보관** | 실보관 |
| DependencyRegistry.md | `frontend/package.json` + `backend/composer.json`(SSOT) | 포인터 |
| IntegrationRegistry.md | `docs/integrations/` + `CONNECTOR_EXPANSION_AD_DATASOURCES.md` + ChannelCreds | 포인터 |
| AuditHistory.md | `docs/PROJECT_AUDIT_REPORT.md`·`SECURITY_AUDIT_REPORT.md` + FP레지스트리(메모리) + `project_n*` | 포인터 |
| ChangeHistory.md | `NEXT_SESSION.md`(세션로그) + git log + `*_CHANGELOG.md` | 포인터 |
| RepeatedDefectHistory.md | 메모리 `reference_audit_false_positives` + 본 파일 **재발클래스 실보관** | 실보관 |
| RootCauseAnalysis.md | **신규 실보관**(3차+ 반복수정 시 RCA 기록) | 실보관 |
| RegressionHistory.md | **신규 실보관**(Regression Prevention Gate 결과 기록) | 실보관 |
| DecisionLog.md | **신규 실보관**(PG보류·Stripe보류 등 결정) — `COMPETITIVE_REVALIDATION_*` 참조 | 실보관 |
| PMApprovalHistory.md | **신규 실보관**(2차+ 반복수정·배포·인계 승인) | 실보관 |
| DuplicatePreventionLog.md | **신규 실보관**(중복검출·통합) — `DUPLICATE_*_AUDIT.md` 참조 | 실보관 |

## 갱신 규칙
- 변경 착수 전: 해당 레지스트리(정본)로 존재/이력 확인(게이트 Step3~7).
- 변경 완료 후: 정본 문서 갱신(포인터형은 정본을, 실보관형은 본 registry 파일을) + 커밋에 요약.
- 실보관 5종(Analytics/Component/RootCause/Regression/Decision/PMApproval/RepeatedDefect/DuplicatePrevention)은 여기에 append(이력 보존·삭제 금지).
