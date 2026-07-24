# CWIS Part004-04 WS01-SP02-TK002-ST02 — Favorites Application Layer

| 항목 | 값 |
|---|---|
| 명세 | `CWIS-P004-U04-WS01-SP02-TK002-ST02` (Favorites Application Layer Implementation) |
| **판정** | **BLOCKED** |
| 기준 리비전 | `b4c6b2758da3` |
| 생성 코드 | **0건** |
| 변경 파일 | 본 보고서 + `tools/cwis/navigation/output/favorites-application-implementation-summary.json` (§22 허용 경로) |

---

## 0. 요약

본 명세는 첫 문장에서 전제를 선언한다.

> "ST01에서 구현한 Favorites Domain Layer를 기반으로 Application Layer를 구현한다."

**그 전제가 성립하지 않는다.** ST01 은 직전 세션에서 사용자 확정으로 **미구현(NOT_IMPLEMENTED)** 처리됐다(커밋 `d7c1aafeaa1`). 명세 §27 은 이 상황을 BLOCKED 조건 첫 줄에 그대로 명시해 두었다 — "ST01 Domain 구현 없음".

전제 붕괴 하나로 끝내지 않고, §1 이 지시한 **13개 Convention 축을 전수 실측**했다. 그 결과가 두 번째·독립적인 BLOCKED 근거이므로 아래에 전부 싣는다.

---

## 1. BLOCKED 근거 7건 (전부 실측)

### BLK-1 · ST01 Domain 부재 — §27 BLOCKED 1행 정확 일치

```
커밋 d7c1aafeaa1  docs(cwis): Task002 ST01 Domain Layer 미구현 결정 + 범위 재설정
CWIS-P004-U04-WS01-SP02-TK002-ST01 = NOT_IMPLEMENTED (사용자 확정 2026-07-24)
```

Application Layer 는 정의상 Domain 위에 얹히는 계층이다. 기반이 없으면 얹을 대상이 없다.

### BLK-2 · §22 가 허용한 코드 경로가 전부 부재

§22 는 "**프로젝트의 실제 구조에 존재하는** 다음 경로만 허용한다" 고 규정한다.

| 허용 경로 | 실재 |
|---|---|
| `app/Application/**` | 부재 |
| `src/Application/**` | 부재 |
| `modules/*/Application/**` | 부재 |
| `packages/*/Application/**` | 부재 |
| `Shared/Application/**` | 부재 |
| `docs/cwis/part004-04/**` | **존재** |
| `tools/cwis/navigation/output/**` | **존재** |

```bash
find . -type d -name "Application" -not -path "*/node_modules/*" -not -path "*/clean_src/*"   # → 0건
find . -type d -name "Domain"      -not -path "*/node_modules/*" -not -path "*/clean_src/*"   # → 0건
ls -d app src modules packages Shared                                                          # → NONE
```

저장소 백엔드 루트는 `backend/src/` 다. **코드를 쓰려면 허용 범위 밖에 새 루트 트리를 신설해야 하므로, 허용된 산출물 경로는 문서 2건뿐이다.** 이 Step 에서 코드 0건은 규정 위반이 아니라 규정 준수다.

### BLK-3 · 기존 아키텍처와 충돌 — DDD/CQRS 0건

```
backend/src 전수 실측
  interface 0 · trait 0 · enum 0
  CommandBus 0 · QueryBus 0 · CommandHandler 0 · QueryHandler 0
  class *Repository 0 · TransactionManager 0 · EventDispatcher 0
  Handlers 119개 = 전부 Slim 4 + raw PDO 절차형
  routes.php 3,998행 = 'METHOD /path' => 'Genie\Handlers\Class::method' 문자열 매핑
```

DDD/CQRS 스트라텀 신설은 저장소에 없던 **두 번째 아키텍처 도입**이다. 헌법 Golden Rule(Replace 아닌 **Extend**)과 중복 구현 금지에 정면으로 걸린다.

### BLK-4 · Repository 가 감쌀 저장소 자체가 없음

| 축 | 실측 |
|---|---|
| 즐겨찾기 테이블 | **0 / 321** |
| 즐겨찾기 라우트 | **0 / 1,511** |
| 서버 핸들러 | **0** (`server_axes=[]`) |
| `backend/src` 내 `favorit` 문자열 | **1건** — `PM/Collaboration.php:80` 카탈로그 설명문 |

### BLK-5 · Workspace 축 부재 — 명세 필드를 채울 수 없음

명세 §3 이 요구하는 Command 필드는 `tenantId · workspaceId · principalType · principalId · resourceType · resourceId · favoriteType · position` 이다.

ST07 `NavigationContext::ABSENT_AXES` 확정 — **Workspace · Document · Meeting · Channel · Team · Role 이 전부 부재**한다. `Project`/`Task` 만 `pm_projects`/`pm_tasks` 로 존재한다. 현행 즐겨찾기 대상은 **메뉴 경로 문자열**이다. `workspaceId`·`principalType` 은 실재 데이터로 채울 수 없는 필드다.

### BLK-6 · 상위 게이트(PHASE_1) 결정과 정면 충돌

`favorites-roadmap.json` 이 조건을 기계 판독 가능한 형태로 남겨 두었다.

```json
"PHASE_2": { "conditional_on": "PHASE_1 정의 = MEMBER_DATA" },
"PHASE_4": { "conditional_on": "PHASE_1 정의 = MEMBER_DATA" },
"PHASE_1": { "note": "정의가 \"UI 프리퍼런스\"로 확정되면 PHASE_2·PHASE_4 는 **불필요**" }
```

사용자 확정 답은 **UI 프리퍼런스**다. Application Layer 는 그 결정으로 소멸시킨 서버 지속화 축의 중간 계층이다.

### BLK-7 · ★구조적 죽은 코드를 재생산한다

§23 은 Controller · Route · Repository 구현 · Migration 을 **전부 금지**한다. 따라서 §28 이 요구하는 Command 5 + Query 4 + Handler 9 + DTO 6 + Port 8 ≈ **30여 개 클래스는 호출부가 존재할 수 없다.**

이것은 본 Unit 이 **직전 커밋에서 고친 결함과 같은 종류**다.

```
67dee1fe46a  feat(favorites): 즐겨찾기 추가 진입점 신설 — 도달 불가 기능 복구
```

즐겨찾기가 초기 커밋부터 죽어 있던 이유가 *"구현은 있는데 진입점이 없어서"* 였다. 같은 것을 **설계상 보장된 형태로** 다시 만드는 셈이다. 재발 방지는 `reference_reachability_check_dead_feature` 에 기록돼 있다.

---

## 2. §1 지시 Convention 조사 — 13축 전수 실측

명세가 "기존 공통 구현이 있으면 반드시 재사용하라" 고 지시했으므로 재사용 대상을 찾기 위해 전수 조사했다. 결과 자체가 BLK-3 의 근거가 됐다.

| 조사 축 | 실재 | 실측 근거 |
|---|---|---|
| 기존 CQRS 구조 | **부재** | `CommandBus\|QueryBus\|CommandHandler\|QueryHandler` 0건 |
| Command Bus | **부재** | 동일 |
| Query Bus | **부재** | 동일 |
| Handler Naming Convention | **동음이의** | `backend/src/Handlers/` 119개는 **Slim 라우트 핸들러**이지 CQRS Handler 가 아니다. `__invoke()`·`handle()` 어느 Convention 도 아니고 `routes.php` 문자열 매핑이다 |
| Application DTO Convention | **부재** | `class *Dto\|*DTO\|*Result` 0건 — 연관배열 직반환 |
| Transaction Manager | **부재** | `TransactionManager\|UnitOfWork` 0건. raw PDO `beginTransaction` 이 12개 파일에 산재 |
| Authorization Port | **부재** | 아래 별도 서술 |
| Tenant Context | **존재** | Slim request attribute `auth_tenant` · `X-Tenant-Id` 주입(`public/index.php` 미들웨어). **Framework 결합형** |
| Workspace Context | **부재** | 엔티티·멤버십 행 자체가 없음 |
| Clock | **부재** | `ClockInterface` 0건 |
| Event Dispatcher | **부재** | `EventDispatcher\|DomainEvent` 0건 |
| Pagination DTO | **부재** | Pagination 클래스 0건 — 핸들러별 limit/offset ad-hoc |
| Result 및 Exception 구조 | **부재** | 공통 Result·도메인 예외 계층 0건 — `['ok'=>bool]` + HTTP status 관용 |
| Idempotency 구조 | **부분** | 10개 이상 핸들러가 개별 사용하나 공통 인프라·Port 없음 |

### Authorization 축의 함정 (§13 vs §20 상충)

권한 게이트는 **존재한다**.

```php
// backend/src/Handlers/PM/Shared.php:59
protected static function gate(Request $req, Response $resp, string $minRole = 'viewer'): array
```

그런데 §20 은 **"Static Helper 의존 금지"** 와 **Framework 객체 반입 금지**를 규정한다. 이 게이트는 `static` 이고 Slim `Request`/`Response` 를 직접 받는다.

- 그대로 호출 → §20 위반
- 감싸는 Port 신설 → §12 "동일 목적의 새로운 공통 추상화를 중복 생성하지 마라" 위반

**어느 쪽도 규정을 만족시키지 못한다.** 명세가 상정한 아키텍처와 실제 저장소가 다르기 때문에 생기는 구조적 상충이며, 개별 판단으로 우회할 성질이 아니다.

---

## 3. 현행 즐겨찾기의 실제 모습

```javascript
// frontend/src/layout/Sidebar.jsx:51
try { return new Set(JSON.parse(localStorage.getItem('g_sidebar_favs') || '[]')); }
// :58
try { localStorage.setItem('g_sidebar_favs', JSON.stringify([...next])); }
catch { /* 스토리지 접근 실패(프라이빗 모드/쿼터) 무시 */ }
```

전부다. 메뉴 경로 문자열 `Set` 을 `localStorage` 에 담는 **기기 로컬 UI 프리퍼런스**이며, 별도 `useFavorites` 훅 파일조차 없이 `Sidebar.jsx` 안에 인라인돼 있다.

`reference_ui_preference_device_local_boundary` 규정대로 이는 **테넌트 격리 위반이 아니다** — 명세 §14 가 요구하는 격리 검증의 적용 대상 자체가 아니라는 뜻이다.

---

## 4. 검증 결과 (§25 · §26)

```bash
git status --short   # tracked 변경 0건 (untracked 빌드 로그 다수는 사전 존재·본 Step 무관)
git diff --name-only # 빈 결과
git diff --check     # 빈 결과
```

`php -l` · PHPStan 은 **변경된 PHP 파일이 0건이므로 N/A** 다. (저장소에 PHPStan 레벨5·baseline 288 이 존재하나 실행 대상이 없다. §25 의 "새 Package 설치 금지" 는 준수 — 설치 0건.)

§25 체크리스트 16항 중 실행 가능한 항목은 전부 PASS 이며, 그중 의미 있는 것은 하나다.

> **중복 공통 추상화 없음 — PASS.** 신규 추상화 0건이 본 판정의 핵심이다.

§26 대로 **허용 범위 외 변경은 없다.** 산출물 2건은 모두 §22 허용 경로다. 사용자가 만든 기존 변경은 건드리지 않았다.

---

## 5. §21 테스트 후보

구현이 없으므로 6개 분류 전부 **비어 있다**(`unit_test_candidates` … `tenant_isolation_test_candidates`). 임의로 채우면 실재하지 않는 대상에 대한 계획이 된다.

현행 UI 프리퍼런스 범위에서 **즉시 유효한** 후보만 정직하게 기록한다.

- Sidebar 즐겨찾기 토글 후 `g_sidebar_favs` 왕복 보존 (FAV-GAP-003 · CAP-06 — 자동 테스트 부재 확정)
- 즐겨찾기 6개 이상일 때 열람 경로 (BACKLOG-1 미해소 상태의 회귀 감지)

---

## 6. 다음 단계 — 사용자 결정 필요

### 권장 · Option A — 현 결정 유지

`SP02-TK002` 계열(Domain · Application · Infrastructure)을 **종결 처리**하고, 실측으로 확인된 잔여 3건으로 이동한다. 전부 PHASE_3 프론트엔드 축이며 기존 `Sidebar.jsx` 확장으로 처리된다 — 죽은 코드 0.

| 항목 | 내용 |
|---|---|
| CAP-04 | `aria-pressed` 0건 — 토글 상태가 스크린리더에 노출되지 않음 |
| BACKLOG-2 | 별표 모바일 터치 타깃 약 23×17px (권장 44 미달). 해소 시 행 높이 44px 유지 필수 — 아코디언 `maxHeight` 클리핑 방지 |
| BACKLOG-1 | 즐겨찾기 6개 이상 열람 경로 부재(`slice(0,5)` · 더보기 0건). 방향 판단에 실사용 데이터 필요 |

### Option B — PHASE_1 재결정 (MEMBER_DATA)

즐겨찾기를 기기 간 동기화되는 회원 데이터로 재정의한다. 다만 그 경우에도 **DDD/CQRS 신설이 아니라** 저장소 기존 관용(`ensureTables` + `Handlers` + `routes.php` 등록, `/api` 접두 필수)으로 구현해야 헌법 Golden Rule 에 부합한다. 로드맵 PHASE_2 → PHASE_4 → PHASE_5 순서이며, Workspace 축은 여전히 부재하므로 principal 은 **user 단일 축**으로 축소해야 한다.

---

## 7. 판정

**BLOCKED** — §27 이 열거한 BLOCKED 예시 5개 중 **4개가 동시 성립**한다.

| §27 BLOCKED 예시 | 성립 |
|---|---|
| ST01 Domain 구현 없음 | ✅ BLK-1 |
| 기존 Architecture 와 충돌 | ✅ BLK-3 |
| 필수 Repository 계약 부재 | ✅ BLK-4 |
| Tenant Context 확인 불가 | ✅ BLK-5 (Workspace 축) |
| 입력 분석 산출물 없음 | ❌ — 산출물은 전부 존재하며 정독했다 |

`READY_WITH_LIMITATIONS` 가 아닌 이유: 그 등급은 **구현을 마친 뒤 남은 제약**을 뜻한다. 여기서는 구현의 전제와 대상 경로가 함께 부재하므로 부분 구현조차 성립하지 않는다.

`FAILED` 가 아닌 이유: Syntax 오류 · 순환 의존 · 허용 경로 외 수정 · Tenant 격리 누락이 **하나도 없다**. 규정을 어겨서 멈춘 것이 아니라, 규정을 지켰기 때문에 멈췄다.
