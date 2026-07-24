# CWIS-P004-U04-WS01-SP01-TK001-ST10 — Final Gap Analysis & Implementation Roadmap

| 항목 | 값 |
|---|---|
| Specification ID | `CWIS-P004-U04-WS01-SP01-TK001-ST10` |
| Task | Final Gap Analysis & Implementation Roadmap |
| Git Branch | `feat/n236-admin-growth-automation` |
| 기준 Revision | `74ee4430ad4` (ST09 완료) |
| 실행 스크립트 | `tools/cwis/navigation/scripts/analyze-favorites-gaps.php` |
| **상태** | **READY** |
| 레코드 | 1,541 / 1,541 |
| Gap | **17** (CRITICAL 3 · HIGH 4 · MEDIUM 4 · LOW 2 · NONE 3 · UNKNOWN 1) |
| 운영 코드 변경 | **0건** · 금지 경로 변경 **0건** · 상류 산출물 수정 **0건** |

---

## 1. ★가장 먼저 답해야 할 것 — 완성률은 하나가 아니다

```
UI 프리퍼런스로 정의할 때   50%  (3 / 6)
회원 데이터로 정의할 때     20%  (3 / 15)
```

즐겨찾기의 완성률을 단일 숫자로 말하는 것은 **부정확하다**. `frontend/src/utils/tenantStorage.js:14`가 이미 규칙을 명문화하고 있기 때문이다:

> *"UI 프리퍼런스(theme/**sidebar**/lang/tour)는 디바이스 단위라 스코프 불요."*

이 규칙 아래에서는 **현행 device-local 구현이 규칙 위반이 아니라 규칙 준수**다. 따라서:

- 즐겨찾기 = **UI 프리퍼런스** → 서버 테이블·API·동기화는 **Gap이 아니다**. 남은 일은 접근성·순서·테스트뿐 (50% → 100%)
- 즐겨찾기 = **기기 간 동기화되는 회원 데이터** → 서버 계층 전체가 Gap (20% → 100%, PHASE_2·4·5 필요)

**이 결정 없이 PHASE_2 이후를 시작하면 안 된다.** 그래서 CRITICAL 3건과 HIGH 4건 전부에 `conditional=true`와 조건 문장을 붙였고, 로드맵 PHASE_1을 **blocking 결정 게이트**로 두었다. 이것이 본 Step의 핵심 산출물이다.

---

## 2. 완성률의 분모를 명시 — 감으로 쓰지 않았다

"완성률 N%"를 추정하지 않기 위해 **Capability 체크리스트 15항목**을 먼저 못박고, 각 항목의 존재/부재를 **선행 Step의 실측 증거로만** 판정했다.

| ID | Capability | 정의 범위 | 상태 | 증거 |
|---|---|---|---|---|
| CAP-01 | 즐겨찾기 토글 UI | PREFERENCE | ✅ | ST08 증거축 COMPONENT — `QuickAccessPanel` |
| CAP-02 | 클라이언트 상태 관리 | PREFERENCE | ✅ | ST08 증거축 STORE — `useFavorites` |
| CAP-03 | 기기 로컬 영속 | PREFERENCE | ✅ | ST03 `g_sidebar_favs`, `device_local_only=true` |
| CAP-04 | 접근성(토글 상태) | PREFERENCE | ❌ | **ST03 실측 `aria-pressed` 0건** |
| CAP-05 | 순서 지정 | PREFERENCE | ❌ | ST03·ST04 정렬 필드 부재 |
| CAP-06 | 자동 테스트 | PREFERENCE | ❌ | ST06 143건 중 즐겨찾기 대상 1건(그마저 본 작업 산물) |
| CAP-07 | 서버 지속화 테이블 | MEMBER_DATA | ❌ | **ST04 전 321 테이블 중 0건** |
| CAP-08 | 스키마 생성 경로 | MEMBER_DATA | ❌ | ST04 마이그레이션 21건 중 0건 |
| CAP-09 | REST 엔드포인트 | MEMBER_DATA | ❌ | **ST05 라우트 1,511개 중 0건** |
| CAP-10 | 서버 핸들러 | MEMBER_DATA | ❌ | **ST08 `server_axes=[]`** |
| CAP-11 | 기기 간 동기화 | MEMBER_DATA | ❌ | ST03 `server_synced_detected=false`, ST09 서버 실의존 0 |
| CAP-12 | 다형성 리소스 | MEMBER_DATA | ❌ | ST04 `polymorphic_detected` 참인 테이블 0건 |
| CAP-13 | 권한 게이트 적용 | MEMBER_DATA | ❌ | ST09 `AUTHORIZES` 엣지 0건 (게이트 자체는 재사용 가능) |
| CAP-14 | 변경 감사 로그 | MEMBER_DATA | ❌ | ST09 감사 테이블로 향하는 실의존 0건 (테이블은 존재) |
| CAP-15 | 테넌트 격리 | MEMBER_DATA | ❌ | ST08 raw localStorage — **단 규정상 프리퍼런스면 결여 아님** |

검증기가 **부재 Capability ↔ Gap 1:1 대응**과 **존재하는 Capability로 Gap을 만들지 않았는지**를 양방향으로 확인하고, 완성률 두 값을 체크리스트에서 독립 재계산해 대조한다.

---

## 3. ★인프라 부재를 Gap으로 날조하지 않았다

명세는 CACHE·QUEUE·EVENT·SEARCH Gap 분석을 요구한다. 실측 결과 이 인프라들은 **저장소에 아예 없다**:

| 인프라 | 실측 | 판정 |
|---|---|---|
| Redis/Memcached | `predis`·`ext-redis` 0건. `Navigation.php:16`이 부재를 명시하고 프로세스 메모+파일 스냅샷+ETag로 대체 | **NONE** — 즐겨찾기 규모에 분산 캐시는 불필요 |
| Queue/Outbox | `Queue::`·`Bus::` 0건 | **NONE** — 토글은 동기 처리로 충분 |
| Elasticsearch/Meilisearch | 0건 | **NONE** — 사용자당 수십 건 규모 |
| 도메인 이벤트 버스 | 부재 | **LOW** — 구독 요구가 확인되지 않음 |
| Workspace·Project | ST07 `ABSENT_AXES` | **UNKNOWN** — 엔티티 신설이 선행, 본 Unit 범위 밖 |

"인프라가 없다"를 곧바로 "즐겨찾기에 결함이 있다"로 옮기면 존재하지 않는 요구를 만들어내는 것이다. **필요 없는 것의 부재는 Gap이 아니다.** 검증기가 인프라 항목이 CRITICAL/HIGH로 승격되지 않았는지, 그리고 각 항목에 "왜 불필요한가"가 기록됐는지를 강제한다.

---

## 4. Gap Matrix — 17건

| ID | 심각도 | 카테고리 | Phase | 우선 | Capability | 조건부 |
|---|---|---|---|---|---|---|
| GAP-004 | **CRITICAL** | DATABASE | 2 | P0 | 서버 지속화 테이블 | ✅ |
| GAP-006 | **CRITICAL** | API | 4 | P0 | REST 엔드포인트 | ✅ |
| GAP-007 | **CRITICAL** | BACKEND | 2 | P0 | 서버 핸들러 | ✅ |
| GAP-005 | HIGH | DATABASE | 2 | P1 | 스키마 생성 경로 | ✅ |
| GAP-008 | HIGH | FRONTEND | 3 | P1 | 기기 간 동기화 | ✅ |
| GAP-010 | HIGH | AUTHORIZATION | 5 | P1 | 권한 게이트 적용 | ✅ |
| GAP-012 | HIGH | TENANT | 5 | P1 | 테넌트 격리 | ✅ |
| GAP-001 | MEDIUM | UX | 3 | P2 | 접근성 | — |
| GAP-003 | MEDIUM | TEST | 7 | P2 | 자동 테스트 | — |
| GAP-009 | MEDIUM | DATABASE | 2 | P2 | 다형성 리소스 | ✅ |
| GAP-011 | MEDIUM | OBSERVABILITY | 6 | P2 | 변경 감사 로그 | ✅ |
| GAP-002 | LOW | FRONTEND | 3 | P3 | 순서 지정 | — |
| GAP-013~017 | NONE·LOW·UNKNOWN | 인프라 | 1 | P2~P3 | 인프라 선행 종속 | — |

**CRITICAL·HIGH 7건이 전부 `conditional=true`다.** 조건이 성립하지 않으면(즐겨찾기 = UI 프리퍼런스) 이 7건은 사라지고 남는 Gap은 **접근성·순서·테스트 3건**뿐이다.

---

## 5. 구현 결정 — 1,541건

```
KEEP_AS_IS     1,429    변경 요구 없음(오탐·패키지·테스트)
MANUAL_REVIEW     56    분류 미확정 — 추가 근거 없이 로드맵에 올리지 않음
EXTEND            27    부분구현 확장(Golden Rule: Replace 아님)
REUSE             25    기존 자산 재사용
REMOVE             4    미사용 Composer 의존성(범위 밖, 별도 승인)
```

### REUSE 25건 — 새로 짤 필요가 없는 것

| 계층 | 수 | 내용 |
|---|---|---|
| Shared | 10 | `PM\Shared::gate` · `planMenuPolicy` · 미들웨어 7단 |
| Package | 7 | 전역 사용 패키지 — 신규 의존성 0 |
| Database·Test | 7 | 감사 테이블 2 + 마이그레이션 2 + 인메모리 SQLite 픽스처 3 |
| Frontend | 1 | `useRecentVisits` — 동일 패턴 참조 구현 |

검증기가 **REUSE 전건이 ST09 `REUSE_CANDIDATE`에 실재하는지**를 독립 확인한다(명세: *REUSE는 반드시 Reuse Evidence를 가진다*).

### EXTEND 27건 — 확장 표면

`useFavorites`·`QuickAccessPanel`·`toggleBookmark`(증거축 3건)와, 그 구현 파일 내부의 수정 지점 24건이다.

> 초안에서는 후자 24건에 *"변경 요구가 확인되지 않음"*이 붙었다. 클러스터 내부에 있으면서 증거축이 아니라는 이유로 else 분기에 떨어진 것인데, **확장 시 실제로 손대게 될 위치**이므로 틀린 서술이었다. 변경 표면으로 재분류했다.

### REMOVE 4건 — 유일하게 증거 있는 제거 후보

`php-di/php-di` · `vlucas/phpdotenv` · `illuminate/database` · `monolog/monolog`

ST06이 전 소스 독립 스캔으로 사용처 0건을 실증했다(명세: *REMOVE는 Legacy Evidence를 가진다*). **단 즐겨찾기 범위 밖의 저장소 전역 사안**이므로 전건 `manual_review=true` + `scope_note`를 달았고, 검증기가 ST06 원본과 대조해 4건 전부의 근거를 재확인한다.

ST08이 `LEGACY_IMPLEMENTATION=0`으로 판정한 것과 모순이 아니다 — 그것은 **즐겨찾기 구현 중** 죽은 것이 없다는 뜻이고, 이 4건은 즐겨찾기와 무관한 저장소 의존성이다.

---

## 6. ★기술 부채 6건 — P0 하나를 놓치면 배포가 안 된다

| ID | 제목 | 심각도 | 우선 |
|---|---|---|---|
| **DEBT-004** | **스키마 생성 경로가 마이그레이션이 아니라 `ensureTables`** | MEDIUM | **P0** |
| DEBT-001 | 즐겨찾기 테스트 커버리지 0 | MEDIUM | P2 |
| DEBT-002 | 표준 테스트 러너 부재 | MEDIUM | P2 |
| DEBT-005 | 토글 접근성 상태 미노출 | MEDIUM | P2 |
| DEBT-003 | 미사용 Composer 의존성 4건 | LOW | P3 |
| DEBT-006 | ST04 파서 SQL 키워드 오탐 | LOW | P3 |

**DEBT-004가 유일한 P0다.** ST04 실측상 전 321개 테이블이 `backend/src`의 `ensureTables` DDL로 생성되며 `backend/migrations`는 세션 172에서 정지했다. 관행을 모르고 즐겨찾기 테이블을 새 마이그레이션 파일로 만들면 **운영에 반영되지 않는다** — 코드는 올라가는데 테이블이 없는 상태가 된다. 검증기가 이 부채의 P0 지정을 강제한다.

---

## 7. 리스크 5건

| ID | 등급 | 제목 |
|---|---|---|
| **RISK-001** | **VERY_HIGH** | **즐겨찾기의 정의가 확정되지 않음** — 이 결정 없이 PHASE_2 이후 진행 불가 |
| RISK-002 | HIGH | `PM\Shared::gate` 재사용 시 guest/partner Default Deny 자동 적용 |
| RISK-003 | HIGH | 신규 테이블을 마이그레이션으로 만들면 배포되지 않음 |
| RISK-004 | MEDIUM | ST09 영향도 VERY_HIGH 45건이 변경 위험 지점 |
| RISK-005 | MEDIUM | 협업 범위 즐겨찾기는 선행 엔티티(Workspace·Project) 부재 |

---

## 8. 로드맵 — PHASE_1은 코드가 아니라 결정이다

| Phase | 목표 | 조건 | 우선 |
|---|---|---|---|
| **PHASE_1** | **★정의 결정 게이트** — UI 프리퍼런스인가 회원 데이터인가 | **blocking** | P0 |
| PHASE_2 | Core Backend — 테이블·핸들러 (`ensureTables` 패턴) | PHASE_1 = MEMBER_DATA | P0 |
| PHASE_3 | Frontend — 기존 구현 **확장**(Replace 금지) | 무조건 | P1 |
| PHASE_4 | API — 라우트 등록(`/api` 접두) | PHASE_1 = MEMBER_DATA | P0 |
| PHASE_5 | Security — 기존 게이트 **재사용**(신규 구현 금지) | 무조건 | P1 |
| PHASE_6 | Optimization — 기존 `menu_audit_log` 재사용 | 무조건 | P2 |
| PHASE_7 | Testing — 재사용 픽스처 활용 | 무조건 | P2 |
| PHASE_8 | Cleanup — 파서 오탐 정정 · 의존성(별도 승인) | 무조건 | P3 |

**PHASE_1 종료 조건**: ① 정의 확정(사용자 승인) ② `ensureTables` 스키마 경로 확인(DEBT-004) ③ 외부 협업자 즐겨찾기 허용 여부 확정(RISK-002)

> **정의가 "UI 프리퍼런스"로 확정되면 PHASE_2·PHASE_4는 불필요해지고 PHASE_3·PHASE_7만 남는다.** 50% → 100% 경로이며, 작업량은 한 자릿수 수준이다.

검증기가 PHASE_1의 `blocking=true`, 정의 게이트 문구 존재, PHASE_2·4의 `conditional_on` 명시, 전 Phase의 `exit_criteria`, **모든 Gap이 어느 Phase에든 배정됐는지**를 확인한다.

### `NOT_SCHEDULED` 도입 사유

1,484건은 로드맵 행동이 필요 없다. 이들을 명세의 `PHASE_8`(Cleanup)에 몰아넣으면 **정리 단계 규모가 거짓으로 부풀어** 로드맵이 왜곡된다. 명세 8단계와 별도로 `NOT_SCHEDULED`를 명시값으로 도입하고 사유를 산출물에 기록했다.

---

## 9. 검증 결과 — 77/77 통과

| 영역 | 검증 |
|---|---|
| 커버리지 | 1,541건 전건 · ST08 전건 커버 · ID 고유 |
| **필수 필드** | **Decision·Priority·Phase 공백 0건** · 6종 Enum 준수 · reason 15자↑ · evidence 1개↑ |
| **명세 4대 규칙** | **증거 없는 CRITICAL 0** · **Gap 없는 IMPLEMENT_NEW 0** · **REUSE↔ST09 실증** · **REMOVE↔ST06 실증** |
| Gap 무결성 | 부재 Capability ↔ Gap **1:1** · 존재 Capability로 Gap 생성 0 · 전 Capability·Gap 증거 보유 |
| **날조 방지** | **Redis·Queue 부재를 git grep으로 재실측** · 인프라 항목 CRITICAL 승격 0 · 불필요 사유 명시 |
| 완성률 | 두 정의 모두 체크리스트에서 **독립 재계산 일치** · 분모/분자 명시 · ST08 증거축과 모순 없음 |
| 로드맵 | 8단계 · PHASE_1 blocking + 정의 게이트 · 조건부 Phase 명시 · 전 Phase exit_criteria · **Gap 전건 배정** |
| 리스크·부채 | 전건 증거·조치 보유 · 정의 미확정이 최상위 리스크 · **ensureTables 부채 P0 강제** |
| 통계 | phase·priority·decision·gap·reuse·removal·debt 전부 독립 재계산 일치 |
| 무결성 | 허용 경로 외 변경 0 · 금지 경로 무변경 · 상류 산출물 수정 0 |
| JSON | 8개 산출물 VALID |

---

## 10. 생성 산출물

```
tools/cwis/navigation/output/favorites-gap-analysis.json
tools/cwis/navigation/output/favorites-roadmap.json
tools/cwis/navigation/output/favorites-implementation-plan.json
tools/cwis/navigation/output/favorites-risk-analysis.json
tools/cwis/navigation/output/favorites-technical-debt.json
tools/cwis/navigation/output/favorites-refactoring-candidates.json
tools/cwis/navigation/output/favorites-removal-candidates.json
tools/cwis/navigation/output/favorites-final-summary.json
tools/cwis/navigation/scripts/analyze-favorites-gaps.php
docs/cwis/part004-04/part004-04-ws01-sp01-tk001-st10-gap-analysis-report.md
```

---

## 11. Task002 착수 전 사용자가 답해야 할 단 하나

> **즐겨찾기는 "UI 프리퍼런스"인가, "기기 간 동기화되는 회원 데이터"인가?**

| 답 | 완성률 | 필요 Phase | Gap |
|---|---|---|---|
| UI 프리퍼런스 | 50% | 3 · 7 | 3건(접근성·순서·테스트) |
| 회원 데이터 | 20% | 2 · 3 · 4 · 5 · 6 · 7 | 12건(CRITICAL 3 포함) |

두 경로의 작업량 차이는 한 자릿수 대 수십 건이다. **이 답이 없으면 ST11 이후 모든 설계 결정이 근거를 잃는다.**

부수적으로 확인이 필요한 2가지: **외부 협업자(guest/partner)에게 즐겨찾기를 허용할 것인가**(RISK-002), **미사용 Composer 의존성 4건을 제거할 것인가**(범위 밖·별도 승인).

**상태: READY** — Task001 Existing System Analysis 전 과정(ST01~ST10) 종료.
