# CHANGE GATE — 모든 수정 전 필수 10단계 절차 (사용자 지시 265차)

> **모든 코드 수정·신규 구현 착수 전 반드시 이 게이트를 통과한다.**
> 목적: 중복 구현 방지 + 기능 후퇴/버그 재발 방지. 이 문서는 각 단계의 **정본 소스를 가리키는 단일 진입점(인덱스)** 이며, 내용을 중복 보관하지 않는다.
> 관련: `feedback_no_duplicate_features`(Absolute Constitution 15조) · `docs/IMPLEMENTATION_STATUS.md` · `reference_audit_false_positives`(메모리).

## 10단계 게이트

| # | 단계 | 실행 방법 / 정본 소스 |
|---|------|------------------------|
| 1 | **전체 스캔** | `Grep`/`Glob` 로 관련 도메인 전수: `backend/src/Handlers/`, `frontend/src/pages/` + `components/`, `backend/src/routes.php`($custom+$register), 사이드바/라우트 매니페스트 |
| 2 | **동일 기능 검색** | 기능명·EP·핸들러·컴포넌트·훅·Context·테이블을 grep. **존재/부재를 코드로 증명**(추측 금지) |
| 3 | **Architecture Registry 확인** | `docs/IMPLEMENTATION_STATUS.md`(도메인 정본 이력) + 도메인별 `docs/*_ARCHITECTURE.md`(ADMIN_GROWTH_AUTOMATION·TEAM_PERMISSION·AI_PROFIT_OS) |
| 4 | **PM Change History 확인** | `NEXT_SESSION.md`(세션별 작업로그) · `docs/PM_CURRENT_STATUS.md` · `docs/PM_PRIORITY_PLAN.md` · `API_CHANGELOG.md`/`docs/*_CHANGELOG.md` · `git log` |
| 5 | **Audit History 확인** | `docs/PROJECT_AUDIT_REPORT.md` · `docs/SECURITY_AUDIT_REPORT.md` · `docs/DUPLICATE_AUDIT_REPORT.md`/`docs/*_DUPLICATE_AUDIT.md` · FP 레지스트리(사용자 메모리 `reference_audit_false_positives`) · `project_n*` 메모리 |
| 6 | **과거 수정 이력 확인** | `git log --all -- <경로>` + `NEXT_SESSION.md` 최근 차수 + 관련 `project_n*` 메모리 |
| 7 | **동일 기능 수정 여부 확인** | 위 3~6에서 같은 기능이 이미 수정·구현됐는지 대조. "✅ 구현됨"·"재플래그 금지" 항목 재확인 |
| 8 | **동일 기능 존재 시 재구현 금지** | 존재하면 **절대 신설/재구현 금지** |
| 9 | **기존 확장 가능성 먼저 검토** | 데모전용→운영배선·얕음→심화·미배선→배선·미노출→노출. 기존 인프라(Db/UserAuth/apiClient/ClaudeAI/ad_design 등) 재사용 |
| 10 | **확장 불가 시에만 신설 허용** | 진짜 부재(존재증명 완료) + 도메인 구분 명시 시에만. **신설은 기존보다 우수·기존과 무중복 필수** |

## ★ Duplicate Prevention Gate (신규 코드 작성 전 필수 — 265차 사용자 지시)

**신규 생성 전 아래 15개 카테고리에서 동일한 것이 이미 있는지 grep/read 로 검사한다. 하나라도 있으면 새로 만들지 않고 기존 것을 확장한다.** (265차 실책: check_routes_registered.mjs 를 기존 bin/audit_routes.php 미확인 후 중복 신설 → 이 게이트로 사전 차단 가능했음.)

| 카테고리 | 이 코드베이스 검색 대상 |
|----------|-------------------------|
| **Component** | `frontend/src/components`·`pages` — 컴포넌트명/유사 JSX grep |
| **API** | `backend/src/routes.php`($custom+$register)·Handlers — 동일 METHOD+경로/목적 |
| **Hook** | `frontend/src/hooks`·전 파일 `use[A-Z]` 커스텀훅 grep |
| **Service** | `backend/src/Handlers`·`frontend/src/services`(apiClient/wmsApi/crmApi 등) |
| **Utility** | `frontend/src/utils`·`tools/`·백엔드 헬퍼(Crypto/Db/TemplateResponder 등) |
| **Context** | `frontend/src/context` **및** `frontend/src/contexts`(★둘 다 존재) |
| **Store** | 상태관리=Context/`tenantStorage`(tGetJSON/tSetJSON)·localStorage 키·GlobalDataContext |
| **SQL** | 동일 데이터 조회 쿼리(테이블+연산 grep)·집계 SSOT(rollupSettlementsCore 등) |
| **Event** | `OpenPlatform::emit` 이벤트타입·`EventNorm` event_type·BroadcastChannel 메시지타입 |
| **Queue** | `ad_delivery_dlq`·Omnichannel outbox·webhook_dispatch·server_conversion_log 원장 |
| **Batch** | `backend/bin/*.php` 배치 스크립트 |
| **Scheduler** | `backend/bin/*_cron.php`·`install_crontab.sh`·check_cron_ssot |
| **Workflow** | `JourneyBuilder`(노드)·`Approvals`/action_request·`RuleEngine` |
| **Automation** | `AutoCampaign`/`AutoRecommend`/`AbTesting`/`AutoMarketing`/`RuleEngine` |
| **Analytics** | `Rollup`/`AttributionEngine`/`Mmm`/`Reports`/`CustomerAI`·산출 SSOT |

### 규칙
1. **존재하면 신설 금지 → 기존 확장**(데모→운영배선·얕음→심화·미배선→배선). 기존 인프라 재사용(Db/UserAuth/apiClient/ClaudeAI/ad_design).
2. **도구/스크립트(tools/·bin/)도 반드시 검사** — 265차 audit_routes 중복 교훈.
3. **도메인이 진짜 다르면 신설 정당**(예: 머천트 프로모션 ≠ 플랫폼 구독쿠폰). 도메인 구분을 명시.
4. 중복 발견 시 **통합/제거**(고아 stub·오탐 하위버전 제거).

## ★ Repeat-Modification Escalation (동일 기능 반복수정 차단 — 265차 사용자 지시)

**동일 기능을 반복 수정하면 패치를 멈추고 근본원인을 제거한다.** 착수 전 그 기능이 과거 몇 번 수정됐는지 먼저 확인(아래 이력원 대조).

### 반복 횟수 판정(착수 전 필수 대조)
- `git log --follow -- <파일>` + `git log -S'<함수/식별자>'` — 동일 파일/함수/동작의 과거 수정 커밋 카운트.
- `reference_audit_false_positives`(FP 레지스트리)·`project_n*`(차수별 이력)·`docs/IMPLEMENTATION_STATUS.md`·`NEXT_SESSION.md` — 같은 기능이 이미 수정·확정됐는지.
- 관련 [[feedback_audit_reference_past_fixes]](과거수정 참조 의무).

### 에스컬레이션 래더
| 차수 | 조치 |
|------|------|
| **1차** | 정상 수정(4중 게이트 통과) |
| **2차** | **PM Approval Required** — 착수 전 사용자 승인 요청(AskUserQuestion). 왜 또 수정하는지·이전 수정과 무엇이 다른지 명시 |
| **3차** | **Root Cause Analysis** — 표면 패치 금지. 왜 계속 수정이 필요한가(스키마드리프트·계약불일치·게이트누락·설계결함) 근본원인 규명 후 그것을 수정 |
| **4차+** | **기능 수정 금지** — 반복수정의 근본원인(구조/클래스)을 제거. 재발방지 검출기/CI가드/SSOT통합으로 클래스 자체를 없앤다 |

### 근본원인 제거 패턴(4차+ 시 우선)
- 반복 스키마드리프트 → 라이브 SHOW COLUMNS 정합 + 드리프트 전수감사(265차).
- 반복 라우트 Not found → $custom↔$register 검출기 CI가드(G9).
- 반복 화이트스크린 → rules-of-hooks CI가드(G10).
- 반복 컬럼/키 불일치 → SSOT 상수화(CRED_CHAN_ALIAS)·단일소스 파생.
- 반복 오탐 → FP 레지스트리 주입 + PM 직접 재증명.

## ★ Change Impact Analysis (수정 실행 전 필수 — 265차 사용자 지시)

**영향 분석 없이 수정 금지.** 게이트 10단계 통과 후, 실제 코드 수정 착수 전 아래 11개 차원의 영향을 먼저 분석·기술한다. 각 차원의 이 코드베이스 추적 방법:

| 차원 | 추적 방법(grep/read 대상) |
|------|---------------------------|
| **Menu(메뉴)** | 사이드바 매니페스트·`frontend/src/App.jsx`(라우트/lazy import)·`planMenuPolicy`/`tabPlanPolicy`(플랜 게이팅) |
| **API** | `backend/src/routes.php`($custom+$register)에서 수정 핸들러 메서드가 서빙하는 엔드포인트 + `/api` 변형 |
| **Service** | 수정 핸들러 클래스/메서드의 **호출자 전수 grep**(`ClassName::method`·내부 self::) |
| **Screen(화면)** | 그 엔드포인트/함수를 소비하는 `frontend/src/pages`·`components` grep(경로 문자열·apiClient 호출) |
| **DB** | 쿼리가 만지는 테이블/컬럼 — `Db.php` CREATE + 런타임 ensure/ALTER + **라이브 SHOW COLUMNS**(스키마 판정 정본) |
| **Queue(큐)** | async outbox(`Omnichannel` outbox·`ad_delivery_dlq`·webhook DLQ·server_conversion_log)·멱등 원장 영향 |
| **Scheduler(크론)** | `backend/bin/*_cron.php` 러너·`install_crontab.sh` SSOT·`check_cron_ssot` — 그 함수가 cron 호출자인지 |
| **Automation** | `AutoCampaign`/`AutoRecommend`/`RuleEngine`/`AbTesting`/`JourneyBuilder` 트리거·집행 경로 영향 |
| **Analytics** | `Rollup`/`AttributionEngine`/`Mmm`/`Reports`/`CustomerAI`·산출 SSOT(순이익/ROAS/LTV) 소비처 |
| **Channel(채널)** | `ChannelSync`/`AdAdapters`/`Connectors`/`ChannelCreds`·채널키 정규화·자동sync 디스패치 영향 |
| **Component** | 수정 컴포넌트/훅/Context/util 를 **import 하는 파일 전수 grep**(재사용 파급) |

### 실행 규칙
1. 위 11차원 중 **해당되는 것만** 명시(무영향 차원은 "영향 없음" 표기해 분석했음을 증명).
2. 특히 **머니경로(주문→정산→순이익)·마케팅 실집행·테넌트 격리·크로스탭 동기화**를 만지면 반드시 Automation/Analytics/Channel/Queue 파급을 grep 으로 확인.
3. 스키마 변경 판단은 **라이브 SHOW COLUMNS** 필수(덤프/주석 맹신 금지).
4. 분석 결과 **회귀 위험**(무후퇴 원칙 위반) 발견 시 수정 방식을 additive/멱등/게이트로 재설계.
5. 분석을 커밋 메시지·인계서에 요약 기록.

## ★ Regression Prevention Gate (수정 완료 후 필수 — 265차 사용자 지시)

**수정 후 아래 7개 회귀를 검사한다. 하나라도 발견되면 수정을 취소(revert)한다.** 무후퇴(no-regression) 원칙의 강제 검증.

| 회귀 유형 | 이 코드베이스 검증 방법 |
|-----------|-------------------------|
| **변경(changed)** | `git diff` 정독 — 기존 경로 동작이 바뀌었나? **additive/멱등/게이트인지 확인**. 수정 flow 라이브검증(작동) + 형제경로 무변경 확인 |
| **느려짐(slowed)** | 무캡 루프·N+1·추가 동기쿼리 없나? 집계는 서버 GROUP BY 유지(LIMIT=리스트만)·새 fetch 는 debounce/캐시 |
| **삭제(deleted)** | `git diff` — 라이브였던 함수/라우트($register)/컬럼/UI 제거 0. 삭제 시 verify-before-delete 5단계 |
| **비활성화(disabled)** | 기능이 주석처리/플래그 OFF/조건차단 되지 않았나 |
| **숨겨짐(hidden)** | 렌더에서 UI 제거·메뉴 제거·라우트 미등록·탭 소거 0. 청크 렌더·홈200 확인 |
| **중복(duplicated)** | Duplicate Prevention Gate 재확인 — 새 중복 생성 0(tools/·bin/ 포함) |
| **다른방식 재구현(reimplemented)** | 기존 함수/서비스/훅을 다른 방식으로 재작성 0. 기존 재사용 확인 |

### 검증 실행(수정 유형별)
- **백엔드**: `php -l`(운영+데모)·라이브 수정쿼리 실증(SHOW COLUMNS/실행)·fpm restart 후 대상 EP + 형제 EP 응답 확인.
- **프론트**: `npm run build` PASS·운영/데모 배포 후 홈200·변경 청크200·대상 화면 + 인접 화면 동작.
- **머니/집행/격리**: 이중계산 0·거짓집행 0·테넌트 유출 0 재확인(멱등키·게이트).
- **회귀 발견 시**: 즉시 `git checkout`/revert 로 수정 취소 후 additive 재설계.
- 검증 결과를 커밋 메시지에 기록(예: "빌드PASS·홈200·라이브검증·회귀0").

## 판정 원칙
- **핸들러 미배선 ≠ 미배선 실백엔드**: 존재증명 시 응답이 **실데이터인지 빈 스텁/데모전용인지**까지 확인. 스텁 배선은 철칙(운영 목데이터 금지) 위반이므로 배선 대상 아님(265차 CustomerAI 사례).
- **"배선 존재 ≠ 필드 정합"**: 배선돼 있어도 프론트/백엔드 필드 키 불일치가 잠복할 수 있음(265차 geo readiness 사례).
- **스키마 판정은 라이브 `SHOW COLUMNS`만 정본**(덤프/메모리 프로즈 맹신 금지·263/265차 Paddle 사례).
- **도메인 구분 명시**: 유사해 보여도 다른 엔티티면 신설 정당(예: 머천트 프로모션 ≠ 플랫폼 구독쿠폰·키워드SoS ≠ SKU가격경쟁).

## 신규 구현 시 기록 의무 (게이트 통과 후) — ★기억 의존 금지·문서 갱신 필수
신규/확장 완료 시 즉시 반영: `docs/IMPLEMENTATION_STATUS.md`(구현 이력) + `NEXT_SESSION.md`(차수 로그) + 해당 `project_n*` 메모리.
**추가로 `docs/registry/` 레지스트리 시스템의 해당 문서를 반드시 갱신한다**(265차·기억 의존 금지). 19 레지스트리 ↔ 정본 매핑 = `docs/registry/README.md`. 정본형은 정본을, 실보관형(RepeatedDefect/RootCause/Regression/Decision/PMApproval/DuplicatePrevention/Analytics/Component)은 해당 registry 파일에 append(삭제 금지). 다음 세션이 같은 것을 다시 만들지 않도록 이력을 남긴다.
