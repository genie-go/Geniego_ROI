# 레지스트리 시스템 (265차 신설·기억 의존 금지)

> **상위 헌법**: [`docs/CONSTITUTION.md`](../CONSTITUTION.md) §11 — 이 레지스트리 시스템은 헌법의 **실행 메커니즘 정본(SSOT)**이다. 원칙은 헌법, 실행·기록은 여기.
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

---

## 표준 규약 (헌법 Vol2 Ch2.1 편입 — 266차)

> 아래는 [`../CONSTITUTION.md`](../CONSTITUTION.md) §5·6·7·10을 레지스트리 차원에서 강제하는 **실행 규약**이다. 원칙은 헌법, 규약·기록은 여기(중복 없음).

### A. Feature ID 불변 규약
- 모든 기능은 **불변 Feature ID**를 가진다. 예: `ROI-001`, `CRM-110`, `AUTO-017`, `ATTR-301`.
- 기능 **이름·UI·소유자가 바뀌어도 ID는 절대 변경하지 않는다**(폐기 시에도 ID 재사용 금지).
- ID 발급·매핑 정본: `docs/IMPLEMENTATION_STATUS.md`(기능 정본). FeatureRegistry는 이를 가리킨다.

### B. Feature Lifecycle 상태기계
현행 `✅/🔧/⏳`(FeatureStatusMatrix)를 다음 전이로 세분한다. **Production 이전은 "완료" 아님.**
```
Planned → Design → Development → Internal Test → Integration Test
→ Regression Test → QA Approved → PM Approved → Production → Deprecated → Archived
```
- `✅` = Production, `🔧` = Development~PM Approved 사이, `⏳` = Planned/보류(외부의존).
- Deprecated→Archived 전이는 §7 Consolidation 절차(DuplicatePreventionLog) 완료 후에만.

### C. 레지스트리별 필드 스키마(최소 필드 강제)
포인터형이라도 정본 항목은 아래 최소 필드를 기록한다(누락 = Registry-Incomplete).
- **Feature**: ID·Domain·Status(Lifecycle)·Module·Dependencies·DB·API·UI·Permission·PM Approval·Related·Known Risks
- **API**: Endpoint·Method·Auth·Authorization(RBAC/scope)·Rate Limit·Idempotency·Timeout·Logging·Related Feature·DB Tables
- **Database**: Table·Columns·Indexes·FK·Tenant Isolation·Soft Delete·Audit·Related API/Feature
- **Component**: Parent·Context(s)·Props·State/Store·Permission·API·Related Feature
- **Dependency**(최중요): 기능→의존체인 전체(예: Dashboard→Analytics→ChannelSync→OAuth→Credential→Tenant→Permission). **미기록 시 배포 금지.**

### D. Registry-Complete 완료 게이트
헌법 §10(완료의 정의)을 레지스트리로 구체화. 아래 8종 등록 완료 시에만 `Registry-Complete`:
`✅Feature ✅API ✅DB ✅Component ✅Dependency ✅Tests ✅ChangeHistory ✅PMApproval`

### E. 후보 신규 레지스트리 (투기적 신설 금지)
아래는 대응 서브시스템이 **코드로 실재할 때만** 신설한다(빈 스텁 금지·FeatureStatusMatrix 투기금지 규칙):
`Webhook · Service · Scheduler · Queue · Event · Workflow · Configuration · Environment · Quality`.
- 이미 SSOT 보유로 **별도 레지스트리 불필요**: Permission(`TEAM_PERMISSION_*`·`EXISTING_PERMISSION_FEATURE_MAP`), Security(`*_SECURITY_REVIEW`·`SECURITY_AUDIT_REPORT`), Release(`V*_RELEASE_NOTES`), Test(`*_TEST_RESULTS`).
