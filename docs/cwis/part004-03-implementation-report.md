# CWIS Part004-03 — Implementation Report

> 작성 2026-07-24 · 판정: **COMPLETED_WITH_LIMITATIONS**
> ★교차검증(`feedback_cross_verify_all_commands`) — 명세 §7 Context 계층 7종을 **실측으로 부재 증명**한 뒤 적응 구현.
> ★무후퇴(`feedback_no_regression_value_unification`) — 신규 사이드바 **기본 OFF**. 켜지지 않는 한 화면이 한 픽셀도 바뀌지 않는다.

---

## 1. 판정 근거

**완료**: Context Resolution · Validation · Atomic Switching · Tenant Isolation · Unified Sidebar ·
Tenant/Project Switcher · Breadcrumb · Frontend State · Legacy Fallback · 전환 스위치 · Security Test 가 **실동작**한다.
명세 §57 "COMPLETED 판정에 실동작이 필요한 12항목" 중 **Workspace Switcher 를 제외한 전부** 충족.

**한계**: ① Workspace/Organization/Team/Department/Program 은 **엔티티 자체가 저장소에 없다**(§2 부재 증명) —
빈 전환기를 만들지 않고 `unavailable_axes` 로 사유를 정직 반환했다. ② 신규 사이드바는 테넌트별 기본 OFF 이며
레거시가 계속 렌더된다(명세 §57 이 명시적으로 허용하는 `COMPLETED_WITH_LIMITATIONS` 조건). ③ Redis/Queue/OTel 부재.

---

## 2. 교차검증 — 명세 §7 Context 계층 vs 실측 (부재 증명)

| 명세 축 | 실측 결과 | 증거 | 처리 |
|---|---|---|---|
| **Tenant** | **실재** — `app_user.tenant_id`, **1 user = 1 tenant**(하위계정은 owner tenant 상속) | `UserAuth.php:216-226` | 구현 |
| ├ 대행사 위임 | **실재** — `agency_client_link`(agency ↔ N client tenant, approved/revoked/pending) | `AgencyPortal.php:64` | **진짜 멀티테넌트 = 구현** |
| └ 플랫폼 act-as | **실재** — `X-Act-As-Tenant: platform_growth`(admin 전용·리터럴 1개만) | `UserAuth.php:417-420` | 구현 |
| Organization | **부재** — 조직=tenant 매핑 확정 | CWIS Part002 §1 | `unavailable_axes` 정직 반환 |
| **Workspace** | **부재** — `WorkspaceState` 는 `tenant_kv`(키-값) 저장소. 워크스페이스 **엔티티·멤버십 행이 0** | `WorkspaceState.php:59` | 전환 대상 부재 → 미구현 |
| Department | **부재**(Part002 PLANNED — 제품범위) | — | 정직 반환 |
| Team | **부재** — `app_user.team_name` 문자열(1급 엔티티 아님) | Part002 §1 | 정직 반환 |
| Portfolio | `pm_portfolios` 실재하나 **Context 축이 아니라 PM 리소스** | Enterprise.php | 미채택(Part004-05 검토) |
| Program | **부재** | — | 정직 반환 |
| **Project** | **실재** — `pm_projects`(tenant_id·status ENUM·owner_user_id) | `migrations/20260526_168_001` | **구현** |

**결론**: 실제 전환 축은 **Tenant + Project 두 개뿐**이다.
존재하지 않는 축에 Switcher UI 를 만드는 것은 "동작하는 척하는 빈 껍데기"이므로 만들지 않았다
(Part002 가 department/squad/community 를 PLANNED 로 보류한 것과 동일 원칙).
서버는 부재 축을 **빈 배열이 아니라 `available:false` + 사유 문자열**로 반환한다 — 0 은 "지금 없음"으로,
부재는 "축 자체가 없음"으로 다르게 읽혀야 하기 때문이다.

**인프라 부재**(Part004-02 에서 이미 증명, 재확인): Feature Flag Service 0건 · Redis 0건 · Queue/Outbox 부재 ·
OpenTelemetry 부재 · artisan 부재 · PHPUnit 부재.

---

## 3. ★무후퇴 — 전환 게이트 설계

사용자가 요구한 "현재 구현된 기능이 절대 후퇴하면 안 된다"를 **구조로 보장**했다.

```
                         ┌─ enabled === true ──→ UnifiedSidebar (신규)
GET /v425/pm/sidebar ────┤                              │ 렌더 예외 발생 시
   .enabled              │                              ↓
                         └─ 그 외 전부 ─────────→ Sidebar (레거시, 무변경)
                            · 기본값(미설정)
                            · 로딩 중
                            · 401 / 403
                            · 503(스냅샷 부재)
                            · 네트워크 오류
                            · JS 렌더 예외 (ErrorBoundary)
```

- `SidebarSwitch.jsx` 가 유일한 진입점이며 **`enabled !== true` 이면 무조건 레거시**다.
- 서버 `sidebarEnabled()` 의 기본 반환값은 `false`이고, 테이블이 없어도 `false`다(자기검증 강제).
- `UnifiedSidebarBoundary` 가 신규 사이드바의 렌더 예외를 잡아 **즉시 레거시로 되돌린다**(화면 공백 없음).
- **레거시 `Sidebar.jsx`·`sidebarManifest.js`·`App.jsx` 라우트·기존 URL 을 한 줄도 변경하지 않았다.**

전환 스위치는 **기존 `tenant_collaboration_capabilities`(`collaboration.navigation.sidebar`)를 재사용**한다
(Part004-02 §19 권장 그대로 — 신규 Feature Flag 저장소 신설 없음). 이미 테넌트별 on/off·감사·정직성 게이트를
갖춘 자산이므로, **토글 1회로 즉시 롤백**되며 배포가 필요 없다.

레지스트리 차원의 무후퇴도 유지된다 — Shadow Compare **전 6개 플랜 IDENTICAL(차이 0)**.

---

## 4. Context Domain

### 4.1 Resolution 우선순위 (명세 §9)

```
① 검증된 Route Context   ← 최우선이되 반드시 검증 통과
② 명시적 전환(EXPLICIT_SWITCH)
③ 사용자 기본 Context (is_default)
④ 최근 Context
⑤ 세션 테넌트
⑥ SAFE_FALLBACK        ← ★다른 테넌트로 자동 전환하지 않는다
⑦ 사용자 선택 필요
```

무효 Route Context 는 **채택되지 않고** 안전 폴백되며, `fallback_applied:true` 로 사용자에게 알린다.

### 4.2 Validation (명세 §10·§11)

Boolean 이 아니라 `{valid, status, reason_code, invalid_fields, recommended_fallbacks, requires_user_selection, decision_id}` 를 반환한다.

| 검증 | 구현 |
|---|---|
| Tenant Membership | **서버가 계산한 화이트리스트**(자기 + 승인 위임 + admin act-as)와 대조. 요청값 미신뢰 |
| 계층 정합성 | 프로젝트의 `tenant_id` 가 대상 테넌트와 일치하는지 |
| 리소스 상태 | `archived` 는 활성 Context 로 선택 불가 |
| 존재 비노출 | 타 테넌트 프로젝트도 `CONTEXT_NOT_FOUND` 로 동일 응답 |
| 복구안 | 접근 불가 테넌트를 **복구안으로 제시하지 않는다** |

Status 어휘: `VALID · INVALID_TENANT · INVALID_PROJECT · CONTEXT_MISMATCH · CONTEXT_ARCHIVED · CONTEXT_SELECTION_REQUIRED`.

### 4.3 Atomic Switch (명세 §30)

전 계층을 **먼저 검증**하고 통과 시에만 저장한다. 실패 시 부분 저장이 없고 응답에 `context_unchanged:true` 를 명시한다.
낙관적 동시성(`expected_version`) 불일치 시 **409 + 최신 Context** 반환(§19).
성공 응답에 `cache_invalidation.clear_scopes`·`redirect_target`·`warnings` 포함(§39).

---

## 5. API

| Method | Path | 설명 |
|---|---|---|
| GET | `/v425/pm/context` | 현재 Context + source + version + **unavailable_axes(부재 사유)** |
| GET | `/v425/pm/context/options?type=TENANT\|PROJECT` | 전환 가능 목록. 접근 불가 항목은 애초에 미포함. 부재 축은 `available:false`+사유 |
| POST | `/v425/pm/context/switch` | 원자적 전환. 401/403/404/409/422 표준 코드(§43) — **500 로 처리하지 않음** |
| POST | `/v425/pm/context/validate` | 딥링크 복구·진단 |
| GET | `/v425/pm/sidebar` | Registry Tree + Context + Active + Ancestors + Breadcrumb + `enabled` · **ETag/304** |
| GET | `/v425/pm/breadcrumb?path=` | 리소스 기반 경로 |

전부 bare + `/api` 이중 등록 · `check_routes_registered.mjs` **OK**.

---

## 6. Active Menu 판정 (명세 §24)

단순 URL 문자열 비교가 아니다: **Alias 해석 → route_name 정확 일치 → 최장 prefix(경계 `/` 보장) → 조상 체인**.

- `/pm/projects/p_a1/board` → `pm.overview` 활성 + 조상 `pm.section` 자동 확장 (중첩 라우트 지원)
- `/pmx` → 매칭 없음 (`/pm` 이 `/pmx` 를 먹지 않는다)
- `/connectors`(레거시 별칭) → 정본 메뉴로 활성화

---

## 7. Breadcrumb

메뉴 계층(Registry) + 리소스(PM 프로젝트 실명 + 하위 탭)를 결합한다.

- **테넌트 격리**: 프로젝트 조회에 `tenant_id` 조건 필수 — 타 테넌트 리소스는 **크럼 자체를 만들지 않는다**(존재 비노출).
- **XSS**: 리소스 이름의 제어문자·`<`·`>` 제거 후 반환(자기검증이 `<img onerror>` 페이로드로 실증).
- SECTION 은 링크를 만들지 않는다.
- 축약(최대 4개) 시에도 **스크린리더에는 전체 경로**를 `sr-only` 로 제공한다.

---

## 8. Unified Sidebar

**권한 조건문이 한 줄도 없다** — 서버 Resolver 가 통과시킨 트리만 그린다(명세 §41).

| 요소 | 구현 |
|---|---|
| 상태 | EXPANDED / COLLAPSED(미니 64px) / MOBILE_OVERLAY. localStorage 는 **UI 상태만**(보안 무관) |
| 활성 | `aria-current="page"` + **색상 외 기호(●)** — WCAG 1.4.1 |
| 조상 확장 | `active_ancestors` 로 중첩 라우트에서 상위 섹션 자동 확장 |
| 비활성 | 취소선 + "비활성" 텍스트(색상 단독 아님) |
| 상태 UI | Skeleton(aria-busy) · Error(role=alert) · Empty |
| 접근성 | **`<nav>` 랜드마크** · `aria-expanded`/`aria-controls` · **Skip Link** · 44px 터치 타깃 · ←→ 확장/축소 |
| 모바일 | Focus Trap · Escape · 배경 스크롤 잠금 · **Focus 복원** · 라우트 변경 시 자동 닫힘 |

★Part004-01 이 레거시에서 지적한 **Skip Link 부재**와 **`<nav>` 랜드마크 부재**를 신규 셸에서 해소했다.

---

## 9. Context Switcher UI

- **Tenant Switcher**: 접근 가능 테넌트가 **2개 이상일 때만 노출**(§28). 실제로는 대행사·admin 만 해당.
  외부(위임) 테넌트는 `외부` 배지로 구분.
- **Project Switcher**: 검색 · archived/completed 기본 제외 · `include_archived` 시 표시하되 `selectable:false`.
- 키보드 전체 조작(↑↓/Home/End/Enter/Escape) · `role="listbox"`/`option` · `aria-selected` · 현재 선택 `✓` 기호.
- **전환 실패 시 기존 선택 원복** + 사유별 사용자 언어 안내(내부 정책 상세 미노출).
- Workspace/Organization/Team 전환기는 **만들지 않았다**(축 부재).

---

## 10. Frontend State

`CollaborationContextProvider` — Context/Navigation/Sidebar UI 상태 통합.

- 전환 중 **중복 요청 차단**(`switching` 가드)
- **성공 응답 후에만** Store 갱신(낙관적 갱신 금지)
- 테넌트 변경 시 `::t=` 네임스페이스 localStorage 키 **전량 제거**(이전 테넌트 데이터 잔존 차단 §39).
  UI 프리퍼런스는 보존
- ETag 기반 304 재사용 · 실패는 조용히 레거시로 수렴

---

## 11. 데이터베이스

**신규 테이블 1개**: `collaboration_user_contexts`(기본/최근 Context·version·principal 스코프).
명세 §44.2 의 `collaboration_context_switch_logs` 는 **만들지 않았다** — 기존 `pm_audit_log`(append-only,
PM 활동피드/SSE 자동 연동)를 재사용해 고위험 전환만 기록한다(중복 테이블 금지).

감사 대상: `context_tenant_switched`(테넌트 변경) · `context_switch_denied`(Cross-Tenant 시도).
일반 사이드바 조회는 감사에 남기지 않는다(§45).

---

## 12. 보안 검증 결과

| 위협 | 조치 | 검증 |
|---|---|---|
| **Cross-Tenant Context 주입** | 서버 계산 화이트리스트 대조 · 요청 `tenant_id` 미신뢰 | PASS (실 SQLite 쿼리) |
| **다른 Workspace/Tenant 프로젝트 주입** | 계층 정합성 검증(`pm_projects.tenant_id` 대조) | PASS |
| 해지된 대행사 위임으로 전환 | `status='approved' AND revoked_at IS NULL` | PASS |
| pending 위임 노출 | 동일 | PASS |
| Archive Context 자동 선택 | `CONTEXT_ARCHIVED` 차단 | PASS |
| 무효 Route → 타 테넌트 폴백 | 폴백이 세션 테넌트를 넘지 않음 | PASS |
| 복구안으로 접근 불가 테넌트 제시 | 제시하지 않음 | PASS |
| Guest/External Partner 조직 구조 노출 | options 전면 차단 + switch 403 | 코드 |
| 리소스 존재 여부 노출 | 타 테넌트도 `NOT_FOUND` 동일 응답 · 크럼 미생성 | PASS |
| Breadcrumb XSS | 제어문자/`<`/`>` 제거 | PASS (`<img onerror>` 실증) |
| Open Redirect / 경로 주입 | `path` 형식 강제(`/` 시작·`//` 금지·512자) | 코드 |
| localStorage 를 보안 근거로 사용 | UI 상태만 저장 · 테넌트/프로젝트 미저장 | 코드 |
| Context 오류를 500 처리 | 401/403/404/409/422 표준 매핑 | 코드 |

---

## 13. 테스트 결과

| 검증 | 결과 |
|---|---|
| `php backend/bin/navigation_context_selftest.php` | **35 passed, 0 failed** (SQLite 인메모리 실쿼리) |
| `php backend/bin/navigation_registry.php selftest` (Part004-02 회귀) | **45 passed, 0 failed** |
| `node tools/navigation_analyze_selftest.mjs` (Part004-01 회귀) | **36 passed, 0 failed** |
| `shadow-compare` 전 6개 플랜 | **차이 0 · 전부 IDENTICAL** |
| Registry Validation | CRITICAL 0 · ERROR 0 |
| `php -l` (핸들러 3 · routes · CLI 2) | **No syntax errors** |
| `check_routes_registered.mjs` | **OK** |
| PHPStan (Level 5 + baseline) | 변경 전 6 → 변경 후 **6** · **신규 0건** |
| 프론트 프로덕션 빌드 | **성공** |

**커버 영역(35건)**: Tenant Provider 3 · Project Provider 4 · Validation 9 · Resolver 4 · 부재 축 2 ·
Active Menu 5 · Breadcrumb 6 · 전환 스위치 2.

`npm run nav:all` 로 전 스위트(116건)를 한 번에 실행한다.

---

## 14. 회귀 검증 (무후퇴)

| 항목 | 결과 | 증거 |
|---|---|---|
| 레거시 사이드바 | **미변경** | `Sidebar.jsx`·`sidebarManifest.js` diff 0 |
| 기존 라우트·URL·Deep Link | **미변경** | `App.jsx` 는 Sidebar 마운트 1줄 + Provider 래핑 + 본문 anchor 만 추가 |
| 기본 동작 | **완전 동일** | `enabled` 기본 false → `SidebarSwitch` 가 레거시 렌더(자기검증 강제) |
| 사용자 Sidebar 접힘 상태 | **보존** | 신규는 별도 키(`g_sidebar_ui_state`) 사용 — 기존 키 미접촉 |
| 즐겨찾기/최근항목 | **보존** | Part004-02 Alias 105건 유지 |
| 권한 동작 | **동일** | Shadow Compare 전 플랜 IDENTICAL |
| 기존 관리자 메뉴 | **동일** | menu_tree 오버레이 존중 |

---

## 15. 남은 위험

1. **Workspace 축 부재** — Part004-04 이후 "워크스페이스별 즐겨찾기/기본 컨텍스트"를 설계하려면
   워크스페이스 1급 엔티티 승격 결정이 선행되어야 한다. 현재는 테넌트=워크스페이스.
2. **모바일 하단 탭은 아직 레거시 하드코딩** — `MobileBottomNav` 가 Registry 를 참조하지 않는다
   (Part004-01 P2 지적 사항). Part004-07 대상. capability 를 `PARTIAL` 로 정직 표기했다.
3. **분산 캐시 부재** — ETag 로 방어하나 멀티 노드 확장 시 재설계 필요.
4. **신규 사이드바 실사용 검증 미완** — 기본 OFF 라 실제 사용자 트래픽을 아직 받지 않았다.
   켜기 전 관리자 Preview + Shadow 확인이 필요하다.
5. **Context 전환 Rate Limit 미구현**(§48) — 현재 admin/viewer 게이트만. Part004-08 대상.

---

## 16. 롤백

| 단계 | 방법 | 소요 |
|---|---|---|
| **즉시(운영 중)** | `collaboration.navigation.sidebar` capability 를 disable → 다음 요청부터 레거시 | **배포 불필요** |
| 프론트 | `App.jsx` 의 `<SidebarSwitch />` → `<Sidebar />` 복원 + import 3줄 제거 | 빌드 1회 |
| 백엔드 | `NavigationContext.php` 삭제 + routes 2블록 제거 | 파일 교체 |
| 테이블 | `collaboration_user_contexts` 미사용 잔존(무해) 또는 DROP | — |
| Capability | 4건 상태 되돌림 | 레지스트리 데이터 |

★**롤백하지 않아도 안전하다** — 기본 OFF 이므로 현 상태로 배포해도 사용자 화면은 종전과 동일하다.

**미배포** — 운영/데모 swap 은 사용자 승인 후(`feedback_deploy_approval_mandatory`).

---

## 17. Part004-04 진행 가능 여부

**가능**. Context Resolver·Sidebar Shell·Switcher 가 실동작하므로 Part004-04(즐겨찾기/고정/최근/개인 설정)가
재사용할 기반이 갖춰졌다.

착수 시 결정할 사항:

1. **즐겨찾기 저장 위치** — 현재 `g_sidebar_favs`/`g_sidebar_recents` 는 **디바이스 로컬**이고,
   `tenantStorage.js` 가 *"UI 프리퍼런스는 디바이스 단위"* 를 명시적 설계로 문서화하고 있다(Part004-01 §5.4).
   서버 영속으로 승격하면 그 설계 결정을 뒤집는 것이므로 **정책 변경임을 명시**하고 진행해야 한다.
   → 권장: **경로가 아니라 Part004-02 정본 Menu Key 로 저장**(Alias 105건이 기존 경로를 흡수하므로 무손실 이관 가능).
2. **즐겨찾기 대상 범위** — 메뉴만 vs 프로젝트/문서/작업까지. 현재 실재하는 리소스는 **메뉴 + PM 프로젝트**뿐이다
   (채널/문서/회의는 Part001 에서 PLANNED). 존재하지 않는 리소스의 즐겨찾기를 만들지 말 것.
3. **기본 Context 설정 UI** — `collaboration_user_contexts.is_default` 컬럼과 `set_default` 파라미터를
   이번 Part 에서 이미 배선해 두었으므로 UI 만 붙이면 된다.
