# DSAR — Certification Performance Requirements (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §36(성능 요구사항)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §36(성능 요구사항)은 Certification & Access Review 엔진이 충족해야 할 5개 정량 SLA를 정의한다: Campaign 생성 ≤3초·Review 조회 ≤200ms·Decision 저장 ≤100ms·Analytics 갱신 ≤5분·Reviewer Queue 생성 ≤30초(100만 Assignment 기준). 이 SLA는 엔터프라이즈 규모(대량 사용자·대량 배정) 조직에서 인증 캠페인이 검토자 업무를 마비시키지 않도록 하는 실용적 제약이다. 본 문서는 5개 SLA의 달성 수단을 INDEX_STRATEGY(§35)·비동기 큐·스냅샷 캐시와 연계해 명세하고, 현행 유사 성능 substrate와 대조한다.

## 2. Ground-Truth (실 substrate 대조 / PARTIAL / ABSENT)

### 2.1 판정 요약 — **ABSENT(5종 전부, 대상 엔진 자체가 순신규이므로 성능 측정 대상 부재)**

Ground-Truth ①/②의 실측 결론: Campaign/Review/Decision/Analytics 엔진 자체가 존재하지 않으므로(grep 0), 그 성능(응답시간·처리량)도 측정할 대상이 없다 — ABSENT. 다만 이 저장소에는 **유사 규모·유사 조회 패턴의 참고 사례**가 실재한다: api_key 인증 미들웨어(`index.php:506`~`:522`)는 매 요청마다 라이브 DB 조회(`SELECT * FROM api_key WHERE key_hash=? AND is_active=1`)를 수행하며, best-effort UPDATE(`:522` last_used_at)를 동일 요청 경로에서 병행한다. 이는 "매 요청 실시간 조회 + 비동기적 부가 갱신"이라는 설계 패턴의 실증 사례이며, Reviewer Queue(#5)·Decision 저장(#3)의 참고가 될 수 있다.

### 2.2 하위항목 대조표

| SPEC §36 하위항목 | 판정 | 실 substrate / 근거(허용목록 파일:라인) |
|---|---|---|
| Campaign 생성 ≤3초 | **ABSENT** | Campaign 엔진 grep 0. 측정 대상 없음 |
| Review 조회 ≤200ms | **ABSENT** | Review 테이블 grep 0. 조회 패턴 참고=`index.php:506`(단건 조회, WHERE 절 기반 인덱스 조회) |
| Decision 저장 ≤100ms | **ABSENT** | Decision 테이블 grep 0. 저장 패턴 참고=`index.php:522`(best-effort UPDATE, non-fatal 예외 처리로 핫패스 지연 최소화) |
| Analytics 갱신 ≤5분 | **ABSENT** | Certification Analytics grep 0. 비동기 갱신 개념 자체가 신규 |
| Reviewer Queue 생성 ≤30초(100만 배정) | **ABSENT** | Review Queue 상태머신 grep 0(② §2 #3). 대규모 배정 스캔 성능은 INDEX_STRATEGY(§35) 선행 설계 필수 |

### 2.3 KEEP_SEPARATE

- `ModelMonitor.php:42`·`:221`·`:244` — ML 모델 드리프트 모니터링 성능(재학습 주기 등)이며 접근권한 검토 SLA와 무관하다. Analytics 갱신(#4) 설계가 이를 참고 성능 사례로 흡수하지 않는다.
- `PriceOpt.php:105`(po_simulations) — 가격 시뮬레이션 처리시간이며 Simulation 실행(API_SURFACE #8)과 이름만 유사할 뿐 이질 도메인이다.

## 3. Canonical 설계

5개 SLA는 다음 달성 수단으로 설계된다(코드 미구현, 설계 명세 단계):

1. **Campaign 생성 ≤3초** — Campaign row는 단건 INSERT + 대상 Scope 정의(SPEC §4)만 동기 처리하고, 실제 Review 대량 생성(수천~수백만 건)은 비동기 큐로 분리한다. Campaign 생성 자체가 동기적으로 전체 Review를 만들면 SLA 위반이 구조적으로 발생한다.
2. **Review 조회 ≤200ms** — INDEX_STRATEGY(§35) User/Reviewer/Status 복합 인덱스로 단건·목록 조회를 인덱스 스캔으로 한정한다. `index.php:506`의 단건 WHERE 조회 패턴을 참고해 항상 인덱스 커버 조건으로 질의를 설계한다.
3. **Decision 저장 ≤100ms** — Decision INSERT는 동기 처리하되, 후속 Evidence 무결성 검증(SecurityAudit 참조)이나 Auto Revocation 트리거는 비동기로 분리한다. `index.php:522`의 non-fatal try/catch 패턴(부가 갱신 실패가 핫패스를 막지 않음)을 참고한다.
4. **Analytics 갱신 ≤5분** — 실시간 집계가 아닌 주기적(예: 5분 간격) 배치·캐시 갱신으로 설계한다. Certification Digest(SPEC §28)를 미리 계산된 스냅샷 캐시로 저장해 Analytics 조회 시 실시간 집계를 회피한다.
5. **Reviewer Queue 생성 ≤30초(100만 배정)** — INDEX_STRATEGY(§35) Reviewer·Status·Due Date 복합 인덱스 필수 전제. 100만 건 전수 스캔이 아닌 인덱스 기반 필터링 + 페이지네이션으로 설계하며, Queue 생성 자체를 비동기 작업으로 분리하고 진행 상태를 폴링하는 방식도 고려한다.

### 3.1 SLA별 정직 판정 서술

- **Campaign 생성 ≤3초(ABSENT)**: 참고할 성능 실측치가 이 저장소에 없다. 유사 규모의 대량 레코드 생성 사례(예: 마케팅 캠페인 대상자 생성)는 KEEP_SEPARATE 도메인이라 성능 벤치마크로 차용하지 않는다.
- **Review 조회 ≤200ms(ABSENT, 패턴 참고)**: `index.php:506`의 단건 WHERE 조회(`key_hash=? AND is_active=1`)는 인덱스 커버 시 밀리초 단위 응답이 실증된 패턴이나, 이는 api_key 단일 테이블 단건 조회이며 Certification Review는 Reviewer/Status/Due Date 다축 조건 조회다 — 패턴 참고이지 성능 보증이 아니다.
- **Decision 저장 ≤100ms(ABSENT, 패턴 참고)**: `index.php:522`의 `try { UPDATE ... } catch { /* non-fatal */ }` 구조는 "핵심 경로는 동기, 부가 갱신은 실패해도 무시"라는 설계 철학의 실증이다. Decision INSERT(핵심)는 동기, Evidence 무결성 검증(부가)은 이 패턴을 본떠 비동기·non-fatal로 분리한다.
- **Analytics 갱신 ≤5분(ABSENT)**: 완전 그린필드. `ModelMonitor.php:42`의 드리프트 재계산 주기는 이름은 유사한 "주기적 갱신"이나 ML 모델 성능 모니터링이지 접근권한 집계가 아니므로 벤치마크 근거로 인용하지 않는다.
- **Reviewer Queue 생성 ≤30초/100만(ABSENT)**: 가장 도전적인 SLA다. INDEX_STRATEGY(§35) #2(Reviewer)·#7(Status)·#8(Due Date) 인덱스가 선행되지 않으면 100만 건 스캔은 구조적으로 SLA를 위반한다(전수 스캔 vs 인덱스 필터링의 근본적 차이). 이 SLA는 INDEX_STRATEGY 문서와 분리해서 판정할 수 없다.

## 4. Kernel/substrate 매핑

| SPEC §36 하위항목 | 재활용/승격 대상 substrate | 판정(신규/승격) |
|---|---|---|
| Review 조회 인덱스 패턴 | `index.php:506`(WHERE is_active=1 단건 조회) | 패턴 참고(신규 인덱스는 INDEX_STRATEGY 문서 정본) |
| Decision 저장 비동기 분리 패턴 | `index.php:522`(best-effort UPDATE, non-fatal) | 패턴 참고(흡수 아님) |
| Campaign/Analytics/Reviewer Queue 성능 설계 자체 | 없음 | 신규 |
| Tenant Isolation 성능 영향 통제 | `index.php:604`·`:608`(auth_tenant 주입) | 원칙 참고(무결성 우선, §5.2) |

## 5. 무후퇴 · Extend

Golden Rule(Wrap)에 따라 Certification 성능 설계는 `index.php:506`~`:522`의 기존 api_key 인증 조회 경로 자체를 변경하지 않는다 — 참고하는 것은 "단건 조회 + non-fatal 비동기 부가처리"라는 **설계 패턴**이지 코드 재사용이 아니다. Certification 5종 SLA는 전부 신규 엔진 위에서 신규로 측정되며, 기존 인증 미들웨어의 응답시간·처리량에 어떤 영향도 주지 않아야 한다(별도 신규 테이블·별도 조회 경로).

### 5.1 무후퇴 회귀 시나리오

1. **기존 인증 경로 영향 차단**: Certification Reviewer Queue 생성(#5) 같은 대규모 배치 작업이 `index.php:506`~`:522`가 위치한 인증 미들웨어와 동일 커넥션 풀·동일 요청 경로를 공유해 인증 응답시간을 저하시키지 않도록 설계한다(비동기 큐·별도 워커 분리).
2. **KEEP_SEPARATE 성능 벤치마크 오차용 금지**: `ModelMonitor.php:42`의 모델 드리프트 주기(재학습 SLA 등)를 Certification Analytics SLA(#4)의 "이미 검증된 유사사례"로 오인·차용하지 않는다 — 완전히 다른 워크로드 특성(피처 계산 vs 권한 집계)이다.
3. **무결성 우선 원칙 회귀 감시**: 향후 실 구현 세션에서 SLA 미달을 이유로 Tenant Isolation·Immutable Decision 검증을 생략·완화하는 최적화가 제안되면, §5.2 원칙에 따라 거부하고 인덱스·비동기 분리로만 성능을 개선한다.

### 5.2 성능-제약 상충 시 우선순위

fail-secure 원칙(D-4)에 따라, 성능 SLA(§36)와 무결성 제약(§34 Immutable/Tenant Isolation)이 상충하는 경우 **무결성이 우선**한다. 예: Reviewer Queue 생성을 30초 안에 맞추기 위해 Tenant Isolation 검증을 생략하는 설계는 금지된다 — 인덱스 최적화(§35)로 성능을 확보하되, tenant_id 필터·불변성 검증은 어떤 경우에도 생략하지 않는다. 이는 `index.php:604`가 보여주는 기존 GENIE_STRICT_AUTH 모호성-우선-차단 관례와 동일한 방향성이다(모호할 때 허용이 아닌 차단).

## 6. 완료 게이트

- [ ] BLOCKED_PREREQUISITE 해소: Part 1~3-7 선행 인증 완결 확인
- [ ] Campaign/Review/Decision/Analytics/Reviewer Queue 5종 엔진의 실 구현 착수(현재 grep 0)
- [ ] INDEX_STRATEGY(§35) 8종 인덱스 실 구현과 SLA 달성 여부 EXPLAIN 계획 상호 검증
- [ ] Campaign 생성 ≤3초 — Review 대량 생성 비동기 분리 설계 확정
- [ ] Decision 저장 ≤100ms — 부가처리(Evidence 검증·Auto Revocation) 비동기 분리 확정
- [ ] Analytics 갱신 ≤5분 — 배치/캐시 주기 설계 확정
- [ ] Reviewer Queue 생성 ≤30초(100만 배정) — 실측 벤치마크(실 구현 이후 별도 절차)
- [ ] KEEP_SEPARATE(ModelMonitor·PriceOpt 성능 사례) 오흡수 여부 재검증
- [ ] 성능-무결성 상충 시 무결성 우선 원칙(§5.2) 설계 반영 확인
- [ ] Tenant Isolation(`index.php:604`·`:608`) 성능 최적화 과정에서 후퇴 없음 재확인
- [ ] TEST_CONTRACT(§37) Performance 테스트(1M Assignments·500K Reviews·100K Decisions) 시나리오와 SLA 5종 상호 정합 확인
- [ ] NOT_CERTIFIED 상태에서 실제 코드 구현 착수 승인 획득(사용자 명시 승인 전 착수 금지)

## 7. 반날조 인용 출처

- SPEC §36(성능 요구사항) / ADR D-1(Extend-Wrap) · D-6(KEEP_SEPARATE)
- Ground-Truth ① §C(만료/휴면: `index.php:506`·`:518`·`:522`) · ② §2(#2·#3·#9 ABSENT)·§4 B-2(ModelMonitor KEEP_SEPARATE)
- 인용 파일:라인 — `backend/public/index.php:506`(단건 조회 WHERE 절)·`:518`(만료 비교)·`:522`(best-effort UPDATE, non-fatal)·`:604`·`:608`(auth_tenant 주입, 무결성 우선 원칙 근거). `backend/src/Handlers/ModelMonitor.php:42`·`:221`·`:244`(KEEP_SEPARATE). `backend/src/Handlers/PriceOpt.php:105`(KEEP_SEPARATE).
- ABSENT 5종(SLA 측정 대상 엔진 자체)은 grep 0 실측(Ground-Truth ② §2) — 유사 조회 패턴 실재를 "Certification 성능이 이미 검증됨"으로 과장하지 않음.

---
본 문서는 INDEX_STRATEGY DSAR(§35)와 짝을 이루며, 인덱스 설계 없이 5개 SLA는 구조적으로 달성 불가능하다는 전제를 공유한다. 실측 벤치마크(100만 Assignment 부하 테스트)는 코드 0 단계에서 수행할 수 없으며, TEST_CONTRACT DSAR(§37) Performance 항목의 실 구현 이후 과제다.

**요약**: SPEC §36의 5개 SLA 판정 = 전부 ABSENT(측정 대상 엔진 자체 순신규). 참고 가능한 유일 실 패턴은 api_key 인증 미들웨어의 단건 조회(`index.php:506`)와 non-fatal 부가 갱신(`:522`) — 흡수가 아닌 설계 패턴 참고다. Reviewer Queue SLA(#5)는 INDEX_STRATEGY(§35) 선행 없이는 판정 불가능한 상호의존 관계다. 코드 0·NOT_CERTIFIED·BLOCKED_PREREQUISITE 유지.
