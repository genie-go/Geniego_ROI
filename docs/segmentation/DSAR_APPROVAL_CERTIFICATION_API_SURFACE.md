# DSAR — Certification API Surface (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §33(API)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §33(API)은 Certification & Access Review 엔진이 외부(FE·타 서비스)에 노출해야 하는 **최소 9개 엔드포인트**를 정의한다. 원문 9종: (1) Campaign 생성, (2) Campaign 조회, (3) Review 생성, (4) Review 제출, (5) Evidence 등록, (6) Decision 등록, (7) Analytics 조회, (8) Simulation 실행, (9) Certification 상태 조회. 이 9개는 SPEC §1~§30이 정의하는 Registry/Campaign/Review Queue/Evidence/Decision/Attestation/Analytics/Simulation 계층 각각의 유일한 외부 접점이며, 본 API 없이는 상위 계층이 존재해도 조회·조작 불가능하다. 본 문서는 각 API를 현행 라우트·핸들러 substrate와 대조한다. 판정 핵심: **9개 전부 ABSENT(순신규 그린필드)** — Certification 도메인 명의의 라우트·핸들러 메서드는 grep 0(Ground-Truth ② §1). 재활용 가능한 것은 API 자체가 아니라 **API를 실배선하는 관례**(라우트 등록 패턴·RBAC 미들웨어 게이트)뿐이다.

## 2. Ground-Truth (실 substrate 대조 / PARTIAL / ABSENT)

### 2.1 판정 요약 — **ABSENT(9종 전부) · 관례 재활용만 PARTIAL**

Ground-Truth ①/②의 실측 결론: Certification Campaign/Review/Evidence/Decision/Analytics/Simulation 어느 도메인도 라우트·핸들러 코드가 없다(② §2 #1~#3·#9 전부 ABSENT). 유일 재활용 대상은 (a) `routes.php`의 `'METHOD /path' => 'Class::method'` 버전접두 등록 관례(허용목록 `routes.php:2800` license_key 등록부가 그 패턴의 실례), (b) `index.php` RBAC 미들웨어 대역(`:506`~`:608`)의 인증·rank·scope 게이트. 이름이 유사한 "Decision 등록" 근접물(`Alerting.php:571`~`:723` decideAction, `Catalog.php:2383` approveQueue)은 접근권한 인증이 아닌 마케팅/상품 승인이므로 KEEP_SEPARATE.

### 2.2 하위항목 대조표

| SPEC §33 하위항목 | 판정 | 실 substrate / 근거(허용목록 파일:라인) |
|---|---|---|
| Campaign 생성 | **ABSENT** | Campaign 스키마·핸들러 grep 0(② §2 #2). 근접 마케팅 캠페인(`AdminGrowth.php:1040`~`:1069`)은 이질 도메인 |
| Campaign 조회 | **ABSENT** | 조회 엔드포인트 grep 0. 등록 관례만 재활용 가능(`routes.php:2800` license_key 등록 패턴) |
| Review 생성 | **ABSENT** | Review Queue 상태머신 grep 0(② §2 #3) — `Pending/InReview/Escalated` 매칭 없음 |
| Review 제출 | **ABSENT** | 제출(submit) 엔드포인트 grep 0. `action_request` 결재(`Alerting.php:571`)는 KEEP_SEPARATE |
| Evidence 등록 | **ABSENT** | Certification Evidence 스키마·등록 API grep 0(② §2 #10). `Attribution.php:379`~`:462` evidence_json은 귀속근거로 이질 도메인 |
| Decision 등록 | **ABSENT** | Decision(Approve/Reject/Revoke 등) 등록 API grep 0. 근접=`Alerting.php:571`~`:723`(decideAction/executeAction, 라우트 `routes.php:432`~`:434`)·`Catalog.php:2383`(approveQueue, 라우트 `routes.php:99`) — 둘 다 KEEP_SEPARATE |
| Analytics 조회 | **ABSENT** | Certification Analytics(§20) grep 0(② §2 #9). 이질 도메인만 존재(`ModelMonitor.php:42`) |
| Simulation 실행 | **ABSENT** | 권한 what-if Simulation grep 0(② §2 #9). `PriceOpt.php:105` po_simulations는 가격 시뮬레이션(이질) |
| Certification 상태 조회 | **ABSENT** | Certification 상태(campaign/review/decision status) 조회 API grep 0. 재활용 소재=api_key `is_active`(`Db.php:951`, `index.php:506`) 상태 조회 패턴뿐 |

### 2.3 KEEP_SEPARATE

- `Alerting.php:571`~`:723`(`listActionRequests`/`decideAction`/`executeAction`, `action_request` `Db.php:592`, 라우트 `routes.php:432`~`:434`) — 마케팅 자동집행 정족수 결재. 상태전이(pending→approved→executed)가 "Decision 등록"과 흡사하나 **접근권한 인증이 아니다**. Certification Decision API로 흡수·개명 금지.
- `Catalog.php:2383`(approveQueue, 라우트 `routes.php:99`) — 상품 채널 라이트백 human-in-loop 승인. 권한 검토가 아니다.

## 3. Canonical 설계

9개 API는 다음 계약으로 설계된다(코드 미구현, 설계 명세 단계):

1. **Campaign 생성** `POST /api/v-cert/campaigns` — analyst+ 또는 `write:*`. Campaign 유형(Annual/Quarterly/Event-driven 등, SPEC §3) 지정.
2. **Campaign 조회** `GET /api/v-cert/campaigns/{id}` — viewer+(자기 소속 tenant 한정), tenant 격리 강제.
3. **Review 생성** `POST /api/v-cert/reviews` — Campaign에 종속. 자동 배정(SPEC §8 신규/변경/특권 role 트리거) 또는 수동 생성.
4. **Review 제출** `POST /api/v-cert/reviews/{id}/submit` — Reviewer 본인만(§6 Reviewer Governance). 제출 시 Decision·Evidence 동반 필수(빈 제출 거부).
5. **Evidence 등록** `POST /api/v-cert/reviews/{id}/evidence` — Decision 이전 단계에서 다건 등록 허용. append-only(수정 불가, D-4).
6. **Decision 등록** `POST /api/v-cert/reviews/{id}/decision` — Approve/Reject/Revoke/Reduce Scope/Escalate 중 1건. 등록 후 불변(Immutable Decision, §34).
7. **Analytics 조회** `GET /api/v-cert/analytics` — admin/compliance 전용. 완료율·초과율·회수건수 등 집계(비동기 갱신, §36 ≤5분).
8. **Simulation 실행** `POST /api/v-cert/simulate` — read-only what-if. 실제 배정 변경 없음. analyst+.
9. **Certification 상태 조회** `GET /api/v-cert/status/{subject}` — 특정 subject(user/role/api_key)의 최근 인증 상태·다음 검토 예정일 조회.

**설계 원칙**:
1. **라우트 등록 관례 준수** — 9개 전부 `routes.php`에 `'METHOD /path' => 'Class::method'`로 등록해야 실동작(`routes.php:2800` license_key 등록부가 실례). 핸들러 클래스 존재만으로 라우팅되지 않는다(CLAUDE.md "핸들러 미배선≠실백엔드").
2. **`/api` 접두 실배선 필수** — nginx SPA 폴백이 미배선 라우트를 200 HTML로 착시시키므로, 배포 검증은 실 JSON 응답 확인이 필수(MEMORY `/api` 접두 트랩).
3. **RBAC 미들웨어 병행** — `index.php:506`~`:608` 대역의 인증(키 조회 `:506`)·만료(`:518`)·rank/scope 게이트가 9개 API 전부에 선행 적용된다. 신규 엔드포인트는 쓰기(POST/PUT/PATCH/DELETE)에 analyst+ 또는 `write:*` 관례, 특권 조작(Campaign 승인정책 변경 등)은 `admin:keys` 관례를 따른다.
4. **KEEP_SEPARATE 불흡수** — Decision 등록 API를 `action_request`/`approveQueue`로 구현 재사용 금지(§2.3).

### 3.1 API별 정직 판정 서술

- **Campaign 생성/조회(#1·#2, ABSENT)**: 마케팅 캠페인(`AdminGrowth.php:1040`~`:1069`, `admin_growth_campaign`)은 이름이 유사하나 광고 발송 캠페인이며 접근권한 인증 주기와 무관하다. Campaign API는 이를 흡수하지 않고 신규 스키마·신규 라우트로 그린필드 구축한다.
- **Review 생성/제출(#3·#4, ABSENT)**: Review Queue 상태머신(Pending→InReview→Escalated→Approved/Revoked→Closed, SPEC §9) 자체가 순신규이므로 그 위의 생성/제출 API도 선행조건 없이는 무의미하다 — Review API는 §9 Queue 실 구현과 동시에만 배선 가능(BLOCKED_PREREQUISITE).
- **Evidence 등록(#5, ABSENT)**: `Attribution.php:379`~`:462`의 `evidence_json`은 마케팅 귀속(attribution) 근거 저장 패턴으로, "증거를 JSON으로 append하는 형태"만 참고 가치가 있고 도메인은 완전히 다르다(귀속 vs 접근권한 심사). 개명·흡수 금지.
- **Decision 등록(#6, ABSENT)**: 유일 근접 상태전이는 `action_request`(`Alerting.php:571`~`:723`, pending→approved→executed)와 `catalog_writeback`(`Catalog.php:2383`, pending_approval). 둘 다 "누군가 결재한다"는 형태만 같고 대상이 마케팅 집행·상품 라이트백이라 KEEP_SEPARATE 원칙(D-6)에 따라 절대 흡수하지 않는다. Decision 등록 API는 이 패턴에서 상태머신 설계 방식만 참고하고 스키마·핸들러는 완전히 별도로 신설한다.
- **Analytics 조회(#7, ABSENT)**: `ModelMonitor.php:42`(drift_score)는 ML 모델 성능 모니터링으로 이질 도메인이다. Certification Analytics(완료율·초과율·리스크 트렌드, §20)는 참고할 집계 substrate가 없어 순신규다.
- **Simulation 실행(#8, ABSENT)**: `PriceOpt.php:105`(po_simulations)는 가격 시뮬레이션이며 권한 what-if와 무관하다(ERRE Part 3-7에서도 동일하게 KEEP_SEPARATE 판정된 선례, `PriceOpt::simulate`).
- **Certification 상태 조회(#9, ABSENT)**: 유사 개념으로 api_key `is_active`/`expires_at` 상태 조회(`Db.php:951`, `index.php:506`)가 있으나 이는 "키가 유효한가"이지 "이 배정이 최근 검토·인증되었는가"가 아니다. 상태 개념 자체가 다르다.

## 4. Kernel/substrate 매핑

| SPEC §33 하위항목 | 재활용/승격 대상 substrate | 판정(신규/승격) |
|---|---|---|
| 라우트 등록 방식 | `routes.php:2800`(license_key 버전접두 등록 패턴) | 관례 재활용(신규 라우트) |
| 인증·rank 게이트 | `index.php:506`(키 조회)·`:518`(만료)·`:522`(last_used) | 관례 재활용(미들웨어 병행) |
| tenant 격리 | `index.php:604`·`:608`(auth_tenant 주입) | 관례 재활용 |
| Decision 등록 상태전이 참고(흡수 아님) | `Alerting.php:571`~`:723`(KEEP_SEPARATE) | 신규(패턴만 참고) |
| Campaign/Review/Evidence/Analytics/Simulation/상태조회 API 자체 | 없음 | 신규 |

## 5. 무후퇴 · Extend

Golden Rule(Wrap)에 따라 9개 API는 기존 `routes.php` 등록 규약·`index.php` RBAC 미들웨어를 **대체하지 않고 그 위에 신규 라우트로 추가**된다. 기존 api_key 인증(`index.php:506`)·만료 강제(`:518`)·tenant 격리(`:604`·`:608`)는 그대로 9개 API 전부에 선행 적용되어 후퇴하지 않는다. `Alerting.php:571`(decideAction)·`Catalog.php:2383`(approveQueue)는 Decision 등록 API가 흡수·개명하지 않고 별개 결재 도메인으로 존치한다(KEEP_SEPARATE). 라이선스 키 등록 패턴(`routes.php:2800`)은 형태만 참고하며 스키마·쓰기 경로를 변경하지 않는다.

### 5.1 무후퇴 회귀 시나리오

1. **`/api` 무음 사망 회피**: 신규 9 엔드포인트가 `routes.php` 미등록 시 nginx SPA 폴백이 HTML 200을 반환해 "성공 착시"를 유발한다(MEMORY `/api` 접두 트랩). 배포 검증은 반드시 실 JSON 응답을 확인한다.
2. **RBAC 게이트 우회 금지**: `index.php:506`~`:608` 대역의 인증·rank·tenant 게이트와 동형인 write 게이트가 9개 API 전부를 감싸야 하며, Campaign/Decision 생성 같은 특권 조작이 게이트 앞단에서 우회되지 않도록 신규 라우트 등록 시 `admin:keys`/`analyst+` 스코프를 최초부터 명시한다.
3. **KEEP_SEPARATE 재플래그 금지**: 289차 후속 감사에서 확정한 `action_request`(마케팅)·`approveQueue`(상품)는 Certification Decision과 이름만 유사할 뿐 실결함이 아니다. 이후 세션에서 이 둘을 "Certification 미구현 증거"로 재플래그하거나, 반대로 "이미 구현됨"으로 오판하지 않는다.

## 6. 완료 게이트

- [ ] BLOCKED_PREREQUISITE 해소: Part 1~3-7(Auth Registry~ERRE) 선행 인증 완결 확인
- [ ] Campaign 생성/조회 API 라우트 등록 + 실 JSON 응답 검증(`/api` 접두)
- [ ] Review 생성/제출 API 상태머신(§9 Queue) 선행 구현과 연동 확인
- [ ] Evidence 등록 API append-only 불변성 검증(D-4)
- [ ] Decision 등록 API 불변성(Immutable Decision, §34) + KEEP_SEPARATE 불흡수 재검증
- [ ] Analytics/Simulation API 성능 요구(§36) 충족 확인
- [ ] Certification 상태 조회 API tenant 격리 검증
- [ ] RBAC 게이트(analyst+/admin:keys 관례) 9개 API 전수 적용 확인
- [ ] NOT_CERTIFIED 상태에서 실제 코드 구현 착수 승인 획득(사용자 명시 승인 전 착수 금지)

## 7. 반날조 인용 출처

- SPEC §33(API) / ADR D-1(Extend-Wrap)·D-2(SecurityAudit 참조·흡수아님)·D-6(KEEP_SEPARATE)
- Ground-Truth ① §E(배정 상태 스키마: `Db.php:951`·`routes.php:2800`) · ② §2(#1~#3·#9 ABSENT)·§4 B-1/B-2(KEEP_SEPARATE)
- 인용 파일:라인 — `backend/public/index.php:506`·`:518`·`:522`·`:604`·`:608`. `backend/src/Db.php:951`(api_key)·`:592`(action_request). `backend/src/routes.php:2800`(license_key)·`:99`·`:432`~`:434`. `backend/src/Handlers/Alerting.php:571`~`:723`(KEEP_SEPARATE). `backend/src/Handlers/Catalog.php:2383`(KEEP_SEPARATE). `backend/src/Handlers/Attribution.php:379`~`:462`(evidence_json, 이질 도메인 참고).
- ABSENT 9종은 grep 0 실측(Ground-Truth ② §2) — 근접물(action_request/approveQueue)로 채우지 않음.
