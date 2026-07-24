# CWIS-P004-U04-WS01-SP01-TK001-ST08 — Existing Implementation Classification 보고서

| 항목 | 값 |
|---|---|
| Specification ID | `CWIS-P004-U04-WS01-SP01-TK001-ST08` |
| Task | Existing Implementation Classification |
| Git Branch | `feat/n236-admin-growth-automation` |
| 기준 Revision | `7b02b1dd263` (ST07 완료) |
| 실행 스크립트 | `tools/cwis/navigation/scripts/classify-favorites-implementations.php` |
| **상태** | **READY** |
| 분류 레코드 | 1,541 / 1,541 (누락 0) |
| 운영 코드 변경 | **0건** · 명세 금지 경로 변경 **0건** |
| ST07 산출물 수정 | **0건** |

---

## 1. 결론 — 즐겨찾기 직접 구현은 **존재하지 않는다**

```
DIRECT_IMPLEMENTATION      0
PARTIAL_IMPLEMENTATION    27
SHARED_INFRASTRUCTURE     14
REUSABLE_COMPONENT         1
LEGACY_IMPLEMENTATION      0
TEST_ONLY                152
PACKAGE_ONLY           1,104
DOCUMENTATION_ONLY         0
FALSE_POSITIVE           187
CONFLICTING                1
UNKNOWN                   55
─────────────────────────────
합계                   1,541
```

`DIRECT_IMPLEMENTATION = 0`은 탐색 실패가 아니라 **증거로 확정된 사실**이다. 명세의 DIRECT 조건은 증거축 12종(Controller·Service·Repository·Entity·Migration·Route·Request·Response·Policy·Component·Store·API) 중 **2종 이상**인데, 즐겨찾기 기능 클러스터 어디에도 서버 계층 증거가 하나도 없다.

---

## 2. ★상류 판정 22건을 승계하지 않고 전부 재판정

ST07은 22건을 `DIRECT_IMPLEMENTATION_CANDIDATE`로 표시했다. 그대로 받았다면 "직접 구현 22건 존재"라는 **완전히 틀린 결론**이 나왔을 것이다.

실물 확인 결과 **22건 전부 `RAW_MATCH`** — 즉 소스 파일 안에서 `favorite`·`즐겨찾기`·`bookmark` 문자열이 발견됐다는 사실 그 이상도 이하도 아니다. `RAW_MATCH`는 증거축 12종 중 **어느 것에도 해당하지 않는다**.

```
FAV-NRM-001329  raw:FRONTEND:frontend/src/layout/sidebar.jsx:16:favorite
FAV-NRM-001264  raw:API:backend/src/routes.php:3304:/reports/saved
… 22건 전부 동일 성격
```

→ 22건 전부 재판정했고, 검증기가 **"상류 DIRECT 후보 중 RAW_MATCH는 DIRECT로 승계되지 않음"**을 기계로 강제한다.

**교훈**: 키워드 히트를 구현 증거로 세는 순간 분류 전체가 무너진다. 증거축을 엔티티 타입으로 정의하고 `RAW_MATCH`를 명시적으로 배제한 것이 이 Step의 핵심 설계다.

---

## 3. 기능 클러스터 — 증거는 레코드가 아니라 클러스터 단위로 모은다

훅 하나·컴포넌트 하나를 각각 보면 영원히 증거 1종이라 DIRECT가 나올 수 없다. 그래서 ST02~ST07이 **실제로 지목한 파일**로만 클러스터를 만들고 증거를 합산했다.

| 클러스터 | scope | 증거축 | 서버축 | 판정 | 멤버 |
|---|---|---|---|---|---|
| **사이드바 메뉴 즐겨찾기** | PRIMARY | COMPONENT, STORE | **없음** | `PARTIAL_IMPLEMENTATION` | 17 |
| 성공사례 북마크 | SIBLING | COMPONENT | **없음** | `PARTIAL_IMPLEMENTATION` | 11 |
| 저장된 리포트(BI) | UNRELATED_PRECEDENT | ENTITY, ROUTE | 있음 | `FALSE_POSITIVE` | 21 |

### 3-1. 사이드바 즐겨찾기 — 클라이언트만 있고 서버가 통째로 없다

```
COMPONENT  FAV-NRM-000005  QuickAccessPanel  (frontend/src/layout/Sidebar.jsx)
STORE      FAV-NRM-001391  useFavorites      → localStorage 'g_sidebar_favs'
                                              device_local_only=true, server_synced=false
서버축     ROUTE 0 · CONTROLLER 0 · MIGRATION 0 · ENTITY 0 · REPOSITORY 0 · SERVICE 0
```

즐겨찾기는 **브라우저 localStorage에만 존재**한다. 기기를 바꾸면 사라지고, 서버는 사용자가 무엇을 즐겨찾기했는지 전혀 모른다.

### 3-2. `saved_report`를 즐겨찾기로 세지 않은 이유

초안에서 나는 `saved-report`를 즐겨찾기 클러스터에 넣었고, 그 결과 "서버 증거축 2종 보유"로 잡혀 판정이 왜곡됐다. **ST07이 이미 답을 냈는데 내가 무시한 것이다** — Alias 사전이 `saved item`을 `auto_replace=false`로 두며 *"saved_report는 BI 리포트 정의 저장이라 즐겨찾기와 의미가 다르다"*고 명시했다.

→ `scope=UNRELATED_PRECEDENT`로 분리하고 `FALSE_POSITIVE`로 판정했다. 다만 **사용자 저장 리소스의 최근접 구현 선례**라는 가치는 사유에 보존해 ST09 재사용 매핑으로 넘긴다.

---

## 4. ★저장 정책 — 신규 즐겨찾기 설계를 가르는 문서화된 규칙 발견

두 구현이 **서로 다른 저장소 헬퍼**를 쓴다:

| 구현 | 저장 방식 | 테넌트 격리 |
|---|---|---|
| 사이드바 즐겨찾기 | `localStorage.getItem('g_sidebar_favs')` (raw) | **없음** |
| 성공사례 북마크 | `tSetJSON('case_bookmarks')` → `case_bookmarks::t=<tenant>` | **있음** |

처음엔 이것을 정책 분열 결함으로 볼 뻔했다. 그러나 `frontend/src/utils/tenantStorage.js:14`가 **명문으로 규정**하고 있다:

> *"사용처: 회원 비즈니스 데이터/설정을 localStorage에 영속하는 모든 경로 (…). **UI 프리퍼런스(theme/sidebar/lang/tour)는 디바이스 단위라 스코프 불요.**"*

즉 **둘 다 문서화된 의도대로 동작하는 정상 구현**이다. 결함으로 올렸다면 오탐이었다.

**이 규칙이 신규 즐겨찾기의 저장 정책을 그대로 결정한다**:

- 즐겨찾기를 **UI 프리퍼런스**로 규정 → 현행 device-local이 규칙 준수. 서버 지속화 불필요
- 즐겨찾기를 **기기 간 동기화되는 회원 데이터**로 규정 → `tenantStorage` 경유 + 서버 지속화가 **필수**이며, 현행 raw localStorage는 규칙 위반이 된다

ST09/ST10이 답해야 할 것은 "무엇을 만들까"가 아니라 **"즐겨찾기는 둘 중 무엇인가"**다.

---

## 5. ★LEGACY 0건 — 증거 없이 주장하지 않았다

중간 실행에서 LEGACY가 **33건**으로 나왔고, 그 안에 `menu_tree`·`coupon_redemptions`·`free_coupons` 같은 **현역 테이블**이 들어 있었다.

원인은 ST07의 `status=ORPHANED`를 "미사용"으로 읽은 것이다. 실제 의미는 **"즐겨찾기 테이블 인벤토리에서 상위 항목을 못 찾음"** — 즐겨찾기 검색 스코프의 산물일 뿐 사용 여부와 무관하다.

명세의 LEGACY 조건은 *Route 없음 · Import 없음 · Reference 없음 · Migration 오래됨 · Deprecated 표시*인데, 이 테이블들에 대해 그중 **어느 것도 조사한 적이 없다**.

→ `discovered_via=migration_only` 고아는 `FALSE_POSITIVE`(스코프 밖)로 정정하고, LEGACY는 **실제 참조 단절이 입증될 때만**(라우트가 존재하지 않는 컨트롤러 파일을 가리킴) 부여하도록 좁혔다. 그 결과가 **0건**이다.

`menu_tree`를 죽은 코드라고 보고했다면 그것은 삭제 검토로 이어질 수 있는 위험한 오보였다.

---

## 6. 파생 분류 — 추측이 아니라 관계 근거

증거축이 없는 컨테이너성 레코드를 UNKNOWN으로 방치하지 않고, **실제 관계**로부터 파생시켰다.

| 파생 | 건수 | 근거 |
|---|---|---|
| FILE ← 자식 합의 | **503** | 파일에 `DEFINED_IN`으로 들어오는 자식이 **예외 없이** 동일 판정일 때만 전파. 갈리면 UNKNOWN 유지 |
| MIGRATION ← 대상 테이블 | **16** | 그 마이그레이션이 `CREATES`/`ALTERS`하는 테이블의 판정에서 파생 |

전파 대상은 `FALSE_POSITIVE`·`PACKAGE_ONLY`·`TEST_ONLY`·`DOCUMENTATION_ONLY`로 제한했다 — 컨테이너에 부여해도 의미가 유지되는 판정만이다. `PARTIAL_IMPLEMENTATION`을 파일에 전파하면 "이 파일이 즐겨찾기 부분구현"이라는 과장이 된다.

검증기는 전파된 503건 전부에 대해 **자식 전원 합의를 실제로 재확인**한다.

이 파생 덕분에 UNKNOWN이 **529 → 55**로 줄었다.

---

## 7. 정규식이 파일 경로에 오작동한 건 — 수정

키워드 정규식을 FILE 레코드에도 적용했더니:

- `frontend/_audit.cjs` → 경로에 `audit` → **SHARED_INFRASTRUCTURE**(일회성 패치 스크립트인데)
- `backend/bin/navigation_context_selftest.php` → 경로에 `context` → **REUSABLE_COMPONENT**(셀프테스트 파일인데)

FILE은 경로 문자열이라 키워드가 우연히 걸린다. → **FILE·RAW_MATCH에는 키워드 규칙을 적용하지 않도록** 제한했다. 그 결과 SHARED_INFRASTRUCTURE는 실제 미들웨어 체인과 감사 테이블만 남았다(40 → 14).

---

## 8. SHARED_INFRASTRUCTURE 14건 — 즐겨찾기가 놓일 실제 지반

| 구분 | 항목 |
|---|---|
| 인증·권한 게이트 | `PM\Shared::gate($req,$resp,$minRole)` · `plan_menu_access + planMenuPolicy` |
| 미들웨어 체인 | `body_parsing` → `cors` → `api_key_auth` → `rbac` → `rate_limit` → `tenant_injection` → `error_middleware` |
| 우회 경로 | `api_key_auth_or_session_bypass` |
| 감사 테이블 | `menu_audit_log` · `pm_audit_log` |

★`PM\Shared::gate`는 **외부 협업자(guest/partner)를 PM 리소스에서 Default Deny로 봉쇄**한다(CWIS Part003). 즐겨찾기 API를 PM 계열로 만들면 외부 협업자는 자동 차단된다 — 설계 시 반드시 의도 확인이 필요해 `manual_review=true`로 표시했다.

---

## 9. 남은 UNKNOWN 55건 — 정직한 미산출

| 유형 | 수 | 사유 |
|---|---|---|
| FILE | 34 | 자식 판정이 갈려 합의 없음 — 다수결로 밀지 않고 유지 |
| RAW_MATCH | 10 | 클러스터 밖 키워드 히트. 증거축 아님 |
| GAP_CANDIDATE | 5 | **분석 산출물이라 명세 11종에 대응 항목이 없다.** 억지 배정 대신 UNKNOWN 유지 — ST10의 직접 입력 |
| MIGRATION | 3 | 대상 테이블 판정이 갈려 파생 불가 |
| SYMBOL | 3 | 소속·역할 확정 증거 부족 |

`DOCUMENTATION_ONLY = 0`도 정직한 값이다 — ST02·ST03이 문서 경로를 검색 범위에서 제외했으므로 문서 레코드 자체가 존재하지 않는다.

---

## 10. 검증 결과 — 59/59 통과

| 영역 | 검증 |
|---|---|
| 완전성 | 1,541건 전건 분류 · ST07 레코드 100% 커버 · ID 고유 · Enum 준수 |
| **증거 (핵심)** | **증거 0건 레코드 0 · 증거 없는 DIRECT 0 · 증거 유형 명세 7종 이내 · value 공백 0** |
| DIRECT 규칙 | DIRECT는 증거축 2종 이상 클러스터에서만 · 클러스터 소속 필수 |
| 필수 필드 | `classification`·`reason`·`evidence`·`confidence`·`manual_review` 전건 존재 · reason 20자 이상 |
| Summary | 11종 전부 독립 재계산 일치 · 합계 = 전체 · manual_review 수 일치 |
| 상류 재판정 | 22건 존재 확인 · RAW_MATCH의 DIRECT 승계 0 |
| 파생 근거 | 전파 503건 전부 자식 합의 재확인 |
| 클러스터 | 멤버 수·증거축 실측 대조 · 판정 일관(오탐·충돌 우선 예외) |
| 핵심 사실 고정 | 사이드바 서버축 0 · COMPONENT+STORE 보유 · saved-report 분리 · 인증 게이트 2건 |
| 무결성 | ST07 산출물 수정 0 · 허용 경로 외 변경 0 · **명세 금지 경로 변경 0** |
| JSON | `classification.json` · `summary.json` VALID |

`manual_review = 38`건이 후속 검토 대상이다.

---

## 11. 생성 산출물

```
tools/cwis/navigation/output/favorites-classification.json
tools/cwis/navigation/output/favorites-classification-summary.json
tools/cwis/navigation/scripts/classify-favorites-implementations.php
docs/cwis/part004-04/favorites-classification-report.md
```

---

## 12. ST09로 넘기는 확정 사실

1. **즐겨찾기 서버 구현은 0** — Route·Controller·Migration·Table·Repository·Service 전부 부재
2. **클라이언트 구현은 2종 존재** — 사이드바 즐겨찾기(device-local), 성공사례 북마크(tenant-scoped)
3. **저장 정책 규칙이 이미 문서로 존재** — `tenantStorage.js:14`가 UI 프리퍼런스와 회원 데이터를 가른다. 신규 설계의 첫 결정은 즐겨찾기가 어느 쪽인지 정하는 것
4. **최근접 구현 선례는 `saved_report`** — ENTITY+ROUTE 갖춘 사용자 저장 리소스이나 `user_scoped=NO`(테넌트 공유)라 그대로 복제하면 안 됨
5. **재사용 가능 인프라는 인증 게이트 뿐** — `PM\Shared::gate`(외부 협업자 Default Deny 포함)와 미들웨어 체인 7단
6. **LEGACY 없음** — 정리·폐기 대상 없음
7. **미사용 Composer 의존성 4건**은 `PACKAGE_ONLY` + `manual_review`로 보존(제거 판단은 범위 밖)

**상태: READY** — ST09 Dependency & Reuse Mapping 입력으로 사용 가능.
