# EPIC 00 — Enterprise Metadata Registry · Chapter 1 Discovery

> **조사 일시**: 288차 세션 (2026-07-16). **조사 방법**: 실제 코드·docs·routes·DB(Db.php)·git·기존 레지스트리 직접 스캔(추측 금지).
> **결론(가장 중요)**: **Metadata Registry는 이미 존재한다** — `docs/registry/`의 **19개 레지스트리**(265차 신설). 따라서 Chapter 1은 병렬 registry를 **신설하지 않고**(그 자체가 헌법 §2.2·EPIC §2.2 중복금지 위반) 기존 체계를 **발견·매핑·갭분석·확장**한다.

---

## 1. Chapter 1 Mission (기존 정본 포인터 — 중복 서술 금지)

| EPIC 00 요구 문서 | 이미 존재하는 정본(SSOT) | 처리 |
|---|---|---|
| METADATA_REGISTRY_MISSION | [`docs/CONSTITUTION.md`](../CONSTITUTION.md) §11 + [`docs/registry/README.md`](../registry/README.md) | **포인터**(신설 안 함) |
| CURRENT_REGISTRY_DISCOVERY | 본 문서 §3 | 신규(발견 스냅샷) |
| EXISTING_DOCUMENTATION_MAP | 본 문서 §4 + registry README의 19↔SSOT 표 | 신규+포인터 |
| DUPLICATE_CANDIDATE_BASELINE | [`docs/registry/DuplicatePreventionLog.md`](../registry/DuplicatePreventionLog.md) + `DUPLICATE_PERMISSION_AUDIT.md` + `ADMIN_GROWTH_DUPLICATE_AUDIT.md` | **기존 확장**(§5) |
| REGRESSION_RISK_BASELINE | [`docs/registry/RegressionHistory.md`](../registry/RegressionHistory.md) + `RepeatedDefectHistory.md` + `RootCauseAnalysis.md` | **기존 확장**(§6) |
| PM_CHANGE_HISTORY | [`docs/pm/PM_CHANGE_HISTORY.md`](../pm/PM_CHANGE_HISTORY.md) (이미 존재) | **기존 확장**(288차 추가) |

> ★ 6개 신규 파일을 별도 생성하지 않은 이유 = EPIC 00 §2.2/§2.3 및 registry README의 "정본 있으면 중복 보관 않고 정본을 가리킨다" 원칙. 본 문서가 Chapter 1의 discovery/map/baseline을 통합 기록하고 나머지는 기존 정본을 가리킨다.

---

## 2. 프로젝트 규모 메트릭 (증거 기반 실측)

| 대상 | 수량 | 소스 |
|---|---|---|
| Backend Handlers | 102 | `backend/src/Handlers/*.php` |
| Frontend Pages | 107 | `frontend/src/pages/*.jsx` |
| Route 매핑(라인) | 1473 | `backend/src/routes.php` |
| Cron/배치 스크립트 | 36 | `backend/*cron*.php`·`backend/bin/*.php` |
| i18n 로케일 | 15 | `frontend/src/i18n/locales/*.js` |
| 데이터 헌법 | 5권 | `docs/*_CONSTITUTION.md` (288차 제정) |

---

## 3. Current Registry Discovery — 기존 19 레지스트리 (docs/registry/, 265차)

registry README가 각 레지스트리↔SSOT를 **포인터/실보관**으로 구분해 관리 중. 상태는 registry README가 정본.

| 레지스트리 | 유형 | 정본(SSOT) |
|---|---|---|
| ArchitectureRegistry | 포인터 | IMPLEMENTATION_STATUS + *_ARCHITECTURE |
| FeatureRegistry / FeatureStatusMatrix | 포인터 | IMPLEMENTATION_STATUS (✅/🔧/⏳) |
| APIRegistry | 포인터 | routes.php + *_CHANGELOG |
| DatabaseRegistry | 포인터 | Db.php + 라이브 SHOW COLUMNS |
| AutomationRegistry | 포인터+시드 | AutoCampaign/AutoRecommend/AbTesting/JourneyBuilder |
| AnalyticsRegistry | **실보관** | Rollup/AttributionEngine/Mmm/Reports/CustomerAI |
| ChannelRegistry | 포인터 | ChannelRegistry.php + channel_registry 테이블 |
| ComponentRegistry | **실보관** | pages·components·hooks·context(s) |
| DependencyRegistry | 포인터 | package.json + composer.json |
| IntegrationRegistry | 포인터 | docs/integrations + ChannelCreds |
| AuditHistory | 포인터 | PROJECT_AUDIT_REPORT + SECURITY_AUDIT + project_n* |
| ChangeHistory | 포인터 | NEXT_SESSION + git log + *_CHANGELOG |
| RepeatedDefectHistory | 실보관 | FP레지스트리 + 재발클래스 |
| RootCauseAnalysis | 실보관 | 3차+ 반복수정 RCA |
| RegressionHistory | 실보관 | Regression Prevention Gate 결과 |
| DecisionLog | 실보관 | PG보류·Stripe보류 등 |
| PMApprovalHistory | 실보관 | 2차+ 반복수정·배포·인계 승인 |
| DuplicatePreventionLog | 실보관 | 중복검출·통합 |

**상태**: 19개 전부 존재·운영 중(REGISTERED). 개별 항목의 VERIFIED/CANONICAL 여부는 각 레지스트리·IMPLEMENTATION_STATUS가 정본 — 본 스캔은 registry **존재**만 VERIFIED, 개별 엔트리 최신성은 **UNVERIFIED**(각 레지스트리 갱신일 대조 필요, Chapter 2 입력).

---

## 4. Existing Documentation Map (거버넌스 정본)

- **원칙**: `docs/CONSTITUTION.md`(개발) + `docs/*_CONSTITUTION.md`(데이터 5권).
- **게이트**: `docs/CHANGE_GATE.md`(4~5중 게이트).
- **레지스트리**: `docs/registry/`(19) + README(SSOT 맵).
- **상태 정본**: `docs/IMPLEMENTATION_STATUS.md`, `FeatureStatusMatrix.md`.
- **PM**: `docs/pm/PM_CHANGE_HISTORY.md`, `PM_CURRENT_STATUS.md`, `PM_PRIORITY_PLAN.md`, `PMApprovalHistory.md`.
- **감사**: `PROJECT_AUDIT_REPORT.md`, `SECURITY_AUDIT_REPORT.md`, `DUPLICATE_*_AUDIT.md`, project_n* 메모리.
- **버그**: `docs/BUGS_TRACKING.md`.
- **세션로그**: `NEXT_SESSION.md`, `SESSION_HISTORY.md`.

---

## 5. Duplicate Candidate Baseline (제거 금지 — 식별만)

기존 `DuplicatePreventionLog.md` + `DUPLICATE_*_AUDIT.md`가 정본. 288차 스캔에서 관측된 후보(미해결·조사 필요, `UNVERIFIED`):

- **context/ vs contexts/** 이중 컨텍스트 디렉터리(CLAUDE.md 명시 — 둘 다 실사용, 통합 후보 아님·주의 대상).
- **루트 일회성 스크립트 다수**(fix_*/patch_*/catalog_fix*.cjs 등) — 대부분 실행완료·아카이브 대상(NEXT_SESSION 정리 이력). 신규 아님.
- **deploy_* 변종** — deploy 보존 매트릭스(CLAUDE.md)로 이미 판정(keep 7 / archived).
- **i18n 페이지 로컬 shadow**(PriceOpt/SmartConnect/ReturnsPortal 로컬사전) — 메모리 `reference_page_local_i18n_shadow` 기록.
- **EventNorm 2계층 파이프라인 고아**(288차 확인) — 소비자 부재, 통합/배선 판단 라이브검증 대기(`CONSOLIDATION_REQUIRED` 후보).
- **action_request 생산자 부재**(287~288 확인) — 죽은 스켈레톤, 제품결정 대기.

> 신규 중복 생성은 288차 감사에서 **가짜녹색 통일·취소제외 2축 통일**로 오히려 **중복 산출로직을 SSOT로 수렴**(No Duplicate Intelligence 실천).

---

## 6. Regression Risk Baseline

기존 `RegressionHistory.md`·`RepeatedDefectHistory.md`·`RootCauseAnalysis.md`가 정본. 상시 위험 클래스(CLAUDE.md·메모리 확정):

- **PowerShell + 한글 UTF-8 손상**(파이프라인 인코딩) — `.NET API` 안전패턴 필수.
- **데모빌드 운영혼입**(VITE_DEMO_MODE) — dist swap 시 운영=`npm run build`·데모=`--mode demo` 분리(288차 배포 준수).
- **가짜녹색(false-green) 클래스**(288차 근절) — 재발 감시 대상: 실패반환 `ok=>true` 금지, 285차 정본 패턴.
- **/api 접두 라우팅 착시**(nginx SPA 폴백) — 신규 실배선 /api 접두 필수.
- **오탐 재플래그**(FP 레지스트리) — 전수감사 전 주입 의무.

---

## 7. Registry 적용범위 분류 ↔ 기존 커버리지 (EPIC §3)

| EPIC 영역 | 기존 커버 레지스트리/정본 | 갭 |
|---|---|---|
| 제품/UX | ComponentRegistry + IMPLEMENTATION_STATUS | — |
| 데이터 | DatabaseRegistry + 데이터 헌법 5권 + DataPlatform | Trust/Quality Score **행레벨 레지스트리 미보관**(Vol3 부록) |
| 채널/연동 | ChannelRegistry + IntegrationRegistry + ChannelCreds | — |
| 분석 | AnalyticsRegistry | — |
| 자동화 | AutomationRegistry | action_request 생산자 갭 |
| 기술기반 | ArchitectureRegistry + DependencyRegistry | — |
| **Knowledge Graph / Semantic Layer / AI Memory·Learning Engine** | **미존재** | ★Chapter 2+ 신규 설계 영역(현재 `UNVERIFIED`/미착수) |

---

## 8. UNVERIFIED / 미확인 영역 (증거 없는 완료 선언 금지)

- 19 레지스트리 개별 엔트리의 **최신성**(마지막 갱신 vs 실코드 드리프트) — 미대조.
- Knowledge Graph·Semantic Layer·AI Memory Engine — **미존재**(EPIC 00의 상위 목표, 아직 설계 전).
- EventNorm·action_request 파이프라인 — 라이브검증/제품결정 대기.

---

## 9. Chapter 2 입력자료

- 기존 19 레지스트리를 **Semantic/Machine-readable Registry**로 승격할지(현재 markdown) 결정.
- Trust/Quality Score 행레벨 레지스트리(Vol3) 설계.
- Knowledge Graph/AI Memory Engine 아키텍처(신규 영역) — CONSOLIDATION 아니라 신규이므로 중복금지 게이트 통과 후 착수.

---

## 10. Chapter 1 완료 조건 대조

- [x] 프로젝트 전체 구조 스캔(§2 메트릭)
- [x] 기존 Registry·문서 발견 기록(§3·§4) — **19 레지스트리 + PM 이력 이미 존재**
- [x] 기존 PM/감사 이력 확인(§4)
- [x] 중복 후보 초기 목록(§5, 제거 없음)
- [x] 기능 후퇴 위험 초기 목록(§6)
- [x] Registry 필요 전영역 분류(§7)
- [x] 기존 문서 중복 생성 없음(§1 — 포인터 처리)
- [x] 최상위 원칙 기록(§1 헌법 포인터)
- [x] PM Change History 갱신(288차 — 별도 커밋)
- [x] 증거 없는 완료 선언 없음(§8 UNVERIFIED 명시)
