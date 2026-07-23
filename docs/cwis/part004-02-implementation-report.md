# CWIS Part004-02 — Implementation Report

> 작성 2026-07-24 · 판정: **COMPLETED_WITH_LIMITATIONS**
> ★교차검증 원칙(`feedback_cross_verify_all_commands`) 적용 — 명세의 인프라 전제를 **실측으로 부재 증명**한 뒤 적응 구현.
> ★무후퇴 원칙(`feedback_no_regression_value_unification`) — 레거시 사이드바 **미변경** + Shadow Compare 로 전 플랜 동일성 **기계 증명**.

---

## 1. 판정 근거

**완료**: Registry Source · Navigation Resolver · Permission/Capability/Feature Flag/Context/Platform/Principal 필터 ·
사용자 메뉴 API · Registry Validation · Legacy Adapter(Alias) · Shadow Resolve · 캐시(ETag+메모) · 테스트가 **실제 동작**한다.
명세 §57 이 요구하는 "실동작 필수 목록" 전부 충족.

**한계(설계상 의도)**: Redis · Queue/Outbox · OpenTelemetry · Feature Flag Service · Plugin System · PostgreSQL ·
artisan Console 은 **저장소에 존재하지 않는다**(§2 부재 증명). 존재하지 않는 인프라 위에 레이어를 쌓지 않고
동등 목적을 실존 수단으로 대체했으며, 대체 불가한 것은 어휘·필드·평가 경로만 선구현하고 **소스 부재를 정직 표기**했다.
프론트엔드는 여전히 레거시 사이드바를 렌더한다(§69 준수) — 렌더 전환은 Part004-03.

---

## 2. 교차검증 — 명세 전제 vs 실측 (부재 증명)

| 명세 전제 | 실측 결과 | 검증 방법 | 처리 |
|---|---|---|---|
| Laravel `artisan` Console | **부재** | `artisan` 파일 없음 · `backend/bin/*.php` 는 순수 PHP cron | `backend/bin/navigation_registry.php` CLI 로 동일 목적 구현 |
| Feature Flag Service | **0건** | `grep -rl "feature_flag\|featureFlag\|FeatureFlag" backend/src frontend/src` → 0 | 필드·평가경로 구현 + **소스 부재 시 보수적 hidden**(§22). 선언 항목 0건이라 무영향 |
| Redis / predis | **부재** | `composer.json`·`Db.php` 0건 | 파일 스냅샷 + 프로세스 메모 + **ETag/304** |
| Queue · Outbox · DLQ | **부재** | cron 스크립트만 존재 | 동기 처리 + `pm_audit_log` 감사 |
| Plugin System | **0건** | `grep -rln plugin backend/src` → 0 | Source 어휘만 예약 — **등록자가 없으므로 "구현했다"고 표기하지 않음** |
| OpenTelemetry | 부재 | composer 의존성 0건 | 구조화 감사로그 + 결정적 지표(stats) |
| PostgreSQL | MySQL + SQLite 폴백 | `Db.php` | driver-aware DDL(부분 unique 불요 — tenant_id NOT NULL) |
| Enum / VO / DDD 4계층 | Enum **0개** | CCIS Part005 확정 | const 배열 + static 클래스(저장소 관례) |
| PHPStan Level 8 | **Level 5 + baseline 215** | `backend/phpstan.neon` | Level 5 로 실행 — **신규 오류 0건**(§8) |
| PHPUnit / Pest | 러너 없음 | `composer.json` require-dev = phpstan 뿐 | 의존성 0 자기검증 CLI 45건 + Node 36건 |

**핵심 판단**: 명세 §28 은 *"기존 Config Registry 로 충족 가능하면 코드 Registry 우선, Tenant Custom/Alias/Override 가
필요할 때만 DB"* 를 허용한다. Part004-01 이 확정한 실태(정의=프론트 정적 SSOT, DB=가시성 오버레이)와 일치하므로
**레지스트리를 DB 로 이관하지 않았다**. 이관 시 번들 정적 트리와 이원화되어 부팅 시 메뉴 깜빡임·오프라인 붕괴가 발생한다.

---

## 3. 기존 메뉴 Source 재사용 결과 (신규 엔진 0)

| 요소 | 재사용한 기존 자산 | 신규 신설 |
|---|---|---|
| 메뉴 정의 | `frontend/src/layout/sidebarManifest.js` (77항목) | 없음 — **파생만** |
| 라우트 | `App.jsx` Route 137건 | 없음 |
| 권한 | `plan_menu_access`(DB) + `planMenuPolicy.MENU_MIN_PLAN` + `ADMIN_ONLY_MENU_KEYS` | 없음 — **의미 그대로 승계** |
| 전역 가시성 | `menu_tree`(AdminMenu.php) | 없음 — 오버레이로 병합 |
| Capability | Part001 `collaboration_capabilities` | 없음 |
| 인증·테넌트·역할·감사 | `PM\Shared`(gate/auditLog/json) | 없음 |
| 라벨 | `sidebarI18n.js` SIDEBAR_DICT 15개국 | 없음 — `label_key` 승계(재번역 유발 없음) |
| 소스 파싱 | Part004-01 `navigation_analyze.mjs` Scanner | 없음 — **import 재사용**(두 번째 파서 금지) |
| **테넌트 오버라이드** | — | **`navigation_overrides` 1개**(menu_tree 는 플랫폼 전역이라 테넌트별 재정의 불가 = 진짜 결여) |

**신규 테이블은 1개뿐**이다. 명세 §28.1/§28.2 의 `navigation_items`·`navigation_aliases` 는 정적 SSOT + 스냅샷이
그 역할을 이미 수행하므로 만들지 않았다(중복 금지).

---

## 4. Menu Key 표준과 정규화

형식: `{domain}.{slug}` (명세 §13 패턴 `^[a-z][a-z0-9]*(\.[a-z][a-z0-9_]*)+$` 준수 — 89/89 통과).

결정적 파생 규칙(재현 가능):
1. `domain` = 사이드바 그룹 key 매핑 (`home·marketing·adops·crm·commerce·analytics·automation·pm·data·finance·workspace·administration`)
   — ADMIN_MENU 의 `system` 은 `administration` 으로 승격.
2. `slug` = 경로에서 `/` 제거 → `/`·`-` → `_`, 도메인 접두 중복 제거
   (`/pm/collaboration` + `pm` → `pm.collaboration` · `/admin/growth` + `administration` → `administration.growth`).
3. 섹션 = `{domain}.section`.

예시: `home.dashboard` · `crm.kakao_channel` · `commerce.order_hub` · `pm.collaboration` · `administration.db_admin`.

**URL·번역문자열·DB ID 를 Key 로 쓰지 않는다**. 표시 라벨을 바꿔도 Key 는 불변이다.

---

## 5. Legacy Adapter · Alias Mapping (§14·§66 — 사용자 설정 보존)

**105개 Alias** 자동 생성:

| Alias Type | 건수 | 내용 |
|---|---|---|
| `LEGACY_PATH` | 77 | 사이드바 정본 경로 → 정본 Menu Key (`/dashboard` → `home.dashboard`) |
| `LEGACY_ROUTE` | 23 | 레거시 리다이렉트 경로 → 최종 대상 Key (`/connectors`·`/ad-channels` → `data.integration_hub`) |
| `LEGACY_PATH`(DRAFT) | 5 | 사이드바 미등재 실기능(`/amazon-risk` 등) — 정본 승격 여부는 Part004-03 결정 |

★**즐겨찾기(`g_sidebar_favs`)·최근항목(`g_sidebar_recents`)은 경로 문자열을 저장한다**(Part004-01 §5.4 실측).
경로 전량이 Alias 로 결속되었으므로 Key 체계 전환 후에도 **사용자 설정이 한 건도 유실되지 않는다**.
자기검증이 이를 강제한다: *"기존 사이드바 경로가 전부 alias 로 보존된다(즐겨찾기 Key 무손실)"* — PASS.

Alias 규율: 중복 0 · 순환 0 · **체인 금지(1홉)** · 대상 부재 0 (`aliases:validate` 문제 0건).
불확실한 항목은 자동 허용하지 않고 `DRAFT` 로 등록했다(§43).

---

## 6. 도메인 모델 (실구현)

**어휘 6종**(생성기가 스냅샷 `vocabulary` 로 함께 배포 — 프론트/백엔드가 같은 정의 사용):
`NavigationItemType`(8) · `NavigationItemStatus`(7) · `NavigationContextScope`(13) · `TargetPlatform`(10) ·
`PrincipalType`(9) · `TargetType`(4). Enum 문법은 저장소에 존재하지 않아(CCIS P005) 상수 배열 + 검증기로 강제한다.

**항목 89건 구성**: SECTION 12 + ITEM 77 · 전부 `ACTIVE`.

**Aggregate 규칙 강제**(빌드 검증 + 런타임 재검증 이중):
Menu Key 형식·중복 · Parent 존재·자기참조·**계층 순환** · ITEM Target 필수 · SECTION Route 금지 ·
ACTIVE Label 필수 · **ADMINISTRATION Scope Permission 필수** · **AI_AGENT/SERVICE_ACCOUNT UI 대상 금지** ·
External Domain Whitelist · Client Action Whitelist · Label XSS · Icon/Badge Key 등록 여부 · Alias 순환.

---

## 7. Navigation Resolver (명세 §32 — 11단계 파이프라인)

```
① Principal Type   → 비인간(AI_AGENT/SERVICE_ACCOUNT) 전면 차단 · 대상 미포함 차단
② Target Platform  → WEB_DESKTOP/MOBILE/COMMAND_PALETTE/ADMIN_CONSOLE …
③ Status           → BROKEN/ARCHIVED/DRAFT/HIDDEN 사용자 노출 금지
④ Capability       → Part001 레지스트리 · 미해석/비활성 = 숨김(보수적)
⑤ Feature Flag     → 평가 소스 부재 시 숨김(§22)
⑥ Permission       → plan_menu_access → 등급표 폴백 (프론트 hasMenuAccess 정확 재현)
⑦ Context Scope    → WORKSPACE/PROJECT 컨텍스트 없으면 숨김 · ADMINISTRATION 은 admin 만
⑧ 전역 가시성      → menu_tree hidden/disabled 반영
⑨ Visibility Policy→ 검증된 JSON DSL(임의 코드 실행 없음) · 해석 실패 = 숨김
⑩ Tenant Override  → 라벨/아이콘/순서/비활성/숨김만 (보안 조건 약화 불가)
⑪ Tree 구성        → 빈 섹션 정리 · sort_order 안정 정렬
```

**권한 의미 승계의 정확성**이 이 Part 의 핵심이다. `hasMenuAccess` 는 프론트 `AuthContext` 를 그대로 옮겼다:
admin 전권 → **admin_only 는 enterprise 도 차단** → enterprise 전권 → `plan_menu_access`(prefix 매칭 + 202차
`ops`→`commerce_channel` 하위호환) → 등급표 fail-secure. 8건의 전용 테스트가 각 분기를 고정한다.

---

## 8. ★무후퇴 증명 — Shadow Resolve (§42·§63)

레거시 계산과 신규 Resolver 를 **동일 입력으로 동시 계산**해 차이를 측정한다.

```
plan          legacy  registry   결과
free            19      19       IDENTICAL
starter         28      28       IDENTICAL
growth          44      44       IDENTICAL
pro             63      63       IDENTICAL
enterprise      64      64       IDENTICAL
admin           77      77       IDENTICAL
→ 차이 플랜 = 0
```

- **메뉴 손실(missing_in_registry) 0건** — 기존에 보이던 메뉴가 사라지지 않는다.
- **과다 노출(extra_in_registry) 0건** — 기존에 막히던 메뉴가 열리지 않는다(수익 티어 무결성).
- 이 검사는 CLI(`shadow-compare`) · API(`GET .../shadow-compare`) · 자기검증(자동 실패) **3중**으로 상시 감시된다.
- 사용자에게는 여전히 레거시 사이드바가 렌더된다 — 본 비교는 전환 안전성 **측정 전용**이다.

---

## 9. API

### 사용자
| Method | Path | 설명 |
|---|---|---|
| GET | `/v425/pm/navigation` | 허용된 트리만. `platform`·`locale`·`include_badges`. **ETag/304**, `registry_version` 포함. 거부 사유는 미노출(§34) |
| GET | `/v425/pm/navigation/items/{menuKey}` | 허용 항목 단건. **Alias 자동 해석**(`/dashboard` 로도 조회) |

### 관리자 (admin 게이트 + 테넌트 격리)
| Method | Path | 설명 |
|---|---|---|
| GET | `/v425/pm/navigation/registry` | 전체 레지스트리 + 빌드 검증 결과 |
| POST | `/v425/pm/navigation/validate` | **런타임 재검증**(스냅샷을 신뢰하지 않고 다시 돌린다) + 오버라이드 무결성 |
| POST | `/v425/pm/navigation/preview` | 프로필별 예상 메뉴 + **거부 사유**. ★임퍼소네이트·권한변경 없음, body 의 `tenant_id` 무시(Cross-Tenant 차단) |
| GET | `/v425/pm/navigation/shadow-compare` | 레거시 ↔ 레지스트리 플랜별 차이 |
| GET/POST | `/v425/pm/navigation/overrides` | 테넌트 재정의 목록/등록 |
| POST | `/v425/pm/navigation/overrides/{id}/remove` | 삭제(자기 테넌트만) |

전부 bare + `/api` 이중 등록(`$custom` + `$register` 4블록) — `check_routes_registered.mjs` **OK**.

---

## 10. 보안 검증 결과

| 위협 | 조치 | 검증 |
|---|---|---|
| AI Agent / Service Account UI 메뉴 | Resolver 최우선 차단 + 레지스트리 검증 CRITICAL | 테스트 2건 PASS (트리 0건 반환) |
| Guest / External Partner 내부 메뉴 | `target_principal_types` 미포함 → 전면 차단 (Part003 `Shared::gate` Default Deny 와 이중) | 테스트 2건 PASS |
| 관리자 메뉴 누출 | `admin_only` 는 `plan_menu_access` 로도 뚫리지 않음 · ADMINISTRATION 스코프는 admin 만 | 테스트 4건 PASS |
| **Override 로 보안 우회** | `OVERRIDE_TYPES` 에 PERMISSION/CAPABILITY/FEATURE_FLAG/PARENT/REQUIRED_PLAN **자체가 없음**(구조적 차단) + ADMINISTRATION 메뉴는 재정의 전면 금지 | 테스트 2건 PASS (Reflection 으로 상수 검사) |
| Cross-Tenant | 오버라이드 조회/삭제 전부 `tenant_id=?` · Preview 는 body tenant 무시 | 코드 + 테스트 |
| Visibility Policy Injection | attribute 9종·operator 6종 **화이트리스트**, 임의 코드 실행 경로 없음, 해석 실패 = 숨김 | 테스트 5건 PASS |
| XSS 라벨 | `[<>]|javascript:|data:` 거부 + 길이 80 제한 + 빌드 검증 | 코드 + 검증기 |
| Open Redirect | External URL 도메인 화이트리스트(현재 외부 링크 0건이나 정책 선구현) | 검증기 |
| 임의 Client Action | 등록된 4종만 허용 | 검증기 |
| 경로 조작 | 스냅샷 읽기를 `backend/data` 하위로 `realpath` 강제 | 코드 |
| 검증 실패 스냅샷 활성화 | `activatable=false` 면 **로드 자체를 거부**, 생성기는 활성 경로에 쓰지 않고 `*-rejected.json` 으로 격리 | 코드 + 테스트 |

---

## 11. Capability / 권한 카탈로그

`collaboration.navigation.registry` = **ANALYZING → ENABLED**.
★근거: 명세 §50 *"Registry 코드만 존재하고 실제 사용자 조회 API 가 연결되지 않았다면 ENABLED 로 표시하지 않는다"* —
`GET /v425/pm/navigation` 이 실배선되었고 Resolver·Validation·Shadow 가 동작하므로 ENABLED 로 승격했다.

나머지는 그대로: `analysis=ENABLED` · `sidebar·context_switcher·personal_hub=PLANNED` ·
`favorites·recents·command_palette=**PARTIAL**`.

> **명세와의 의도적 차이**: §50 은 favorites/recents/command_palette 를 `PLANNED` 로 지정하지만, 이들은 **실제로
> 동작하는 기능이 이미 존재한다**(Sidebar QuickAccessPanel · Ctrl+K 팔레트 — Part004-01 실측). 존재하는 기능을
> PLANNED 로 적으면 그것이야말로 상태 위장이므로 PARTIAL 을 유지한다(서버 영속·manifest 연동이 없어 PARTIAL).

권한(§49)은 **신규 권한 체계를 만들지 않고** 기존 역할 게이트에 매핑했다:
`navigation.view` → viewer 게이트 · `registry.view`/`manage`/`validate`/`preview`/`override.manage` → admin 게이트.
저장소에 세분 permission 카탈로그 테이블이 없다(Part003 도 역할 게이트 + 그랜트로 적응) — 세분화는 Part004-08 대상.

---

## 12. 캐시 (§46)

| 계층 | 구현 | 무효화 |
|---|---|---|
| System Registry | 빌드 스냅샷 파일 + **프로세스 메모** | 스냅샷 재생성(content hash 로 버전 변경) |
| Resolved Tree | **ETag(registry_version + 트리 해시)** + `Cache-Control: private, must-revalidate` · 304 응답 | 권한/플랜/오버라이드/가시성 변경 시 트리 해시가 바뀌어 자동 무효화 |

Redis 부재로 분산 캐시는 없다. 대신 **ETag 를 트리 내용에서 파생**시켜 권한 변경 직후 오래된 메뉴가
캐시로 유지되는 사고를 구조적으로 차단했다(§46 요구사항의 핵심). 관리자 메뉴는 매 요청 재평가된다.

---

## 13. 관측성 · 감사

- Resolver 가 결정적 지표를 반환: `total·principal·platform·status·capability·feature_flag·permission·visibility·policy·context·pruned_empty·visible`.
- 감사(`pm_audit_log` → PM 활동피드/SSE 자동 연동): `navigation_previewed` · `navigation_override_upserted` · `navigation_override_removed`.
- 고빈도 트리 조회는 감사에 남기지 않는다(§44 — 전부 영구 저장 금지).

---

## 14. 구현물

| 파일 | 성격 | 내용 |
|---|---|---|
| `tools/navigation_registry_build.mjs` | 신규 | 정규화·검증·스냅샷 생성기. **Part004-01 Scanner import 재사용** |
| `backend/src/Handlers/PM/Navigation.php` | 신규 | Registry Source · Resolver · Policy DSL · Badge Provider · Override · 9 엔드포인트 |
| `backend/bin/navigation_registry.php` | 신규 | CLI: `status` `validate` `aliases:validate` `resolve` `shadow-compare` `selftest` (artisan 적응) |
| `backend/bin/navigation_registry_selftest.php` | 신규 | PHP 자기검증 45건(DB 불요) |
| `frontend/src/services/navigationRegistry.js` | 신규 | Registry API 클라이언트 — **렌더 경로 미참여**(Part004-03 대비) |
| `frontend/src/pages/CollaborationHome.jsx` | 확장 | 레지스트리 패널(검증·Shadow·Preview). **신규 메뉴 0** |
| `backend/src/Handlers/PM/Collaboration.php` | 확장 | capability 1건 상태 승격 |
| `backend/src/routes.php` | 확장 | 라우트 9종 × (bare/`/api`) × (`$custom`/`$register`) |
| `backend/data/navigation_registry.json` | 산출물 | 활성 스냅샷(배포 동반) |
| `package.json` | 확장 | `nav:registry` · `nav:registry:check` |

---

## 15. 테스트 결과

| 검증 | 결과 |
|---|---|
| `php backend/bin/navigation_registry.php selftest` | **45 passed, 0 failed** |
| `node tools/navigation_analyze_selftest.mjs` (Part004-01 회귀) | **36 passed, 0 failed** |
| `shadow-compare` 전 6개 플랜 | **차이 0 · 전부 IDENTICAL** |
| `aliases:validate` | **105 alias · 문제 0건** |
| Registry Validation | **CRITICAL 0 · ERROR 0 · WARNING 1**(`/register` → 쿼리스트링 URL, 메뉴 대상 아님 = 정상) |
| `php -l` (Navigation·Collaboration·routes·CLI×2) | **No syntax errors** |
| `check_routes_registered.mjs` | **OK** — 신규 9라우트 포함 전 plain `$custom` 이 `$register` 됨 |
| PHPStan (Level 5 + baseline) | 변경 전 6 → 변경 후 **6** · **신규 0건** |
| 프론트 프로덕션 빌드 | **성공**(경고는 기존 chunk-size 만) |
| `npm run nav:check`(P1 게이트) | **exit 0** |

**테스트 커버 영역**: 권한 8 · Principal 4 · 관리자 격리 3 · 상태/플랫폼/Capability/Flag 5 · Context 2 ·
Policy DSL 5 · 오버레이/오버라이드 5 · 트리 3 · Alias 2 · **실스냅샷 회귀 7**(Shadow 포함).

---

## 16. 회귀 검증 (무후퇴)

| 항목 | 결과 | 증거 |
|---|---|---|
| 기존 메뉴 항목 | **변경 0** | `sidebarManifest.js` 미변경 · 셀프테스트 스냅샷(회원 64/관리자 13) 강제 |
| 기존 Route | **변경 0** | `App.jsx` 미변경 |
| 기존 Menu Key | **변경 0** | `plan_menu_access` menuKey 를 `legacy_permission_key` 로 그대로 승계 |
| 사용자 즐겨찾기/최근항목 | **무손실** | 경로 77건 전량 Alias 결속(자동 검증) |
| 기존 권한 동작 | **동일** | Shadow Compare 전 플랜 IDENTICAL |
| 기존 사이드바 렌더 | **미변경** | 프론트 렌더 경로에 신규 코드 미참여 |
| `menu_tree` 관리자 설정 | **존중** | hidden/disabled 를 Resolver 가 반영(테스트 2건) |

---

## 17. 남은 위험

1. **스냅샷 신선도** — 메뉴를 바꾸고 `npm run nav:registry` 를 돌리지 않으면 레지스트리가 낡는다.
   `nav:registry:check` 를 배포 파이프라인에 연결하는 건 Part004-08 판단.
2. **워크스페이스/프로젝트 컨텍스트 미배선** — `NavigationContext` 는 필드를 갖되 항상 null 이다.
   요청 파라미터를 **신뢰하지 않기 위해 의도적으로 비워 두었고**(멤버십 검증 경로 부재), Part004-03 에서
   전환기와 함께 멤버십 검증을 배선한다. 현재 WORKSPACE/PROJECT 스코프 항목이 0건이라 실사용 영향 없음.
3. **Feature Flag / Plugin 은 소스가 없다** — 어휘·평가 경로만 존재. 등록자가 생기기 전까지 기능이 아니다.
4. **Badge Provider 1종만 실구현** — `unread_notifications` 만 실제 소스가 있다. 나머지는 `count:null` +
   사유를 반환한다(0 을 만들지 않는다).
5. **분산 캐시 부재** — 멀티 노드 확장 시 ETag 만으로는 부족하다. Redis 도입 시 재설계 필요.

---

## 18. 롤백

| 대상 | 방법 | 위험 |
|---|---|---|
| `tools/navigation_registry_build.mjs` | 삭제 | 없음(런타임 미참여) |
| `backend/data/navigation_registry.json` | 삭제 → API 가 503 + 사유 반환 | 없음(레거시 사이드바 무관) |
| `Navigation.php` + 라우트 9종 | 파일 삭제 + routes.php 2블록 제거 | 없음(신규 경로만 추가) |
| `navigation_overrides` 테이블 | 미사용 잔존(무해) 또는 DROP | 없음 |
| Capability 상태 | `ENABLED` → `ANALYZING` 되돌림 | 없음(레지스트리 데이터) |
| `CollaborationHome` 레지스트리 패널 | 해당 블록 + state 제거 | 없음 |
| `navigationRegistry.js` | 삭제 | 없음(렌더 경로 미참여) |

★**롤백 없이도 안전하다** — 프론트 렌더 경로가 신규 코드를 전혀 참조하지 않으므로, 백엔드가 완전히 실패해도
사용자 사이드바는 종전과 동일하게 동작한다(장애 격리).

**미배포** — 운영/데모 swap 은 사용자 승인 후(`feedback_deploy_approval_mandatory`).

---

## 19. Part004-03 진행 가능 여부

**가능**. Registry·Resolver·Alias·Shadow 가 실동작하고 전 플랜 동일성이 증명되어 전환 기반이 갖춰졌다.

Part004-03 착수 시 결정할 사항:

1. **워크스페이스 1급 엔티티 승격 여부** — 미승격 시 Workspace Switcher 는 전환할 대상이 없다(Part004-01 §5.3 이후 미해결).
2. **전환 스위치 방식** — Feature Flag Service 가 없으므로 ① 신규 최소 플래그 저장소를 만들지 ②
   `tenant_collaboration_capabilities`(기존 테넌트별 토글)를 전환 스위치로 재사용할지 결정해야 한다.
   **②를 권장한다** — 이미 테넌트별 on/off·감사·정직성 게이트를 갖춘 기존 자산이다(중복 신설 회피).
3. **DRAFT alias 5건 처리** — `/amazon-risk`·`/ai-recommend`·`/rules-editor-v2` 등 사이드바 미등재 실기능의
   정본 메뉴 승격 또는 폐기(Part004-01 백로그 B-1 과 동일 건).
4. **전환 순서** — Shadow 가 IDENTICAL 인 지금이 최적기다. 섹션 단위(예: `pm.section`)부터 레지스트리 렌더로
   바꾸고 나머지는 레거시를 유지하는 **혼합 렌더**가 가장 안전하다.
