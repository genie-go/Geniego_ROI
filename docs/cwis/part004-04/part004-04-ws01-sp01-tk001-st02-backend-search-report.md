# CWIS-P004-U04-WS01-SP01-TK001-ST02 — Backend Search Report

| 항목 | 값 |
|---|---|
| **Specification ID** | `CWIS-P004-U04-WS01-SP01-TK001-ST02` |
| 작업명 | Favorites Existing System Analysis — Backend Favorites Keyword Search |
| 선행 Step (ST01) 상태 | **READY_WITH_LIMITATIONS** → 진행 가능 |
| Git Branch | `feat/n236-admin-growth-automation` |
| Git Revision (직전) | `b4bb7503a47` |
| 검색 엔진 | PHP native (`preg_match` + `token_get_all`) — 신규 패키지 설치 0 |
| 실행 시간 | 약 1.4초 (179 파일) |
| **완료 상태** | **READY** |

---

## 1. ★핵심 결론

> **PHP 백엔드에 즐겨찾기(Favorites/Bookmark/Pin/SavedItem) 구현은 존재하지 않는다.**

- 총 히트 **42건 전수를 육안 확인**한 결과 **100% 오탐**이었다.
- Class / Interface / Trait / Enum / Method 중 즐겨찾기 관련 심볼 **0개**.
- Repository / Service / Controller / Policy / Event / Queue / Cache 후보 **0개**.
- Part004-01 이 도출한 *"즐겨찾기는 프론트 localStorage 에만 존재"* 결론이 **독립 검색으로 재확인**되었다.

이는 "검색을 안 해서 0"이 아니라 **백엔드 PHP 179개 파일을 전수 스캔한 결과 0** 이다(검증 항목이 전수성 강제).

---

## 2. 필요성 판정 (신규 상시 원칙 적용)

> 원칙: *필요한 것만 구현하고, 불필요는 사유와 함께 보고* (`feedback_necessity_gate_before_implementation`)

| 명세 요구 | 판정 | 사유 |
|---|---|---|
| PHP 백엔드 즐겨찾기 검색 실행 | **IMPLEMENT** | 결론은 예상됐어도 **증거 산출물 자체가 ST02 의 딜리버러블**. 1.4초 비용으로 확정 근거 확보 |
| 재사용 가능한 검색 스크립트 | **IMPLEMENT** | ST03~ST06 과 향후 재실행이 동일 규칙을 재현해야 함. `token_get_all` 심볼 추출은 스크립트 없이는 불가 |
| §15 `tenant_id`/`user_id` 전역 검색 | **범위 조정** | `tenant_id` 는 `backend/src` 에 **3,025회** 출현(102 파일). 전역 검색 시 결과가 노이즈에 매몰된다. 명세 문구(*"즐겨찾기 관련 결과 **주변에서** 확인"*)대로 **히트 ±12줄 proximity 로만** 평가 |
| §7 `app/` `src/` `modules/` `packages/` `plugins/` `bootstrap/` `routes/` 검색 | **SKIP** | **전부 부재**(ST01 실측). `config/` 는 존재하나 PHP 파일 **0개** |
| §10 Doctrine `DiscriminatorMap` / Eloquent `morphTo` 등 ORM 패턴 | **패턴만 유지** | 본 저장소는 raw PDO. ORM 패턴 매칭은 0건이 예상되나 **부재 증명 목적으로 검색은 수행**(비용 0) |
| §37 5MB 초과 파일 스트리밍 처리 | **SKIP** | 백엔드 최대 파일이 5MB 미만이라 해당 케이스 0건. 크기 감지·기록 로직만 유지 |
| §38 ripgrep `--json` 파싱 | **미채택** | PowerShell 환경에 `rg` 가 PATH 에 없음(ST01 실측). PHP native 로 통일해 OS 간 재현성 확보 |

---

## 3. 검색 범위

### 3.1 검색 루트 (실측 교집합)

| 루트 | PHP 파일 | 채택 |
|---|---|---|
| `backend/src` | 140 | ✅ |
| `backend/bin` | 39 | ✅ |
| `config` | **0** | scope 에 있으나 PHP 0개 → 실질 미검색 |
| `app` `src` `modules` `packages` `plugins` `routes` | — | **부재** |

**총 스캔 파일 179개** (전수성 검증 통과 — 실제 파일 수와 일치).

### 3.2 제외

`exclude_directories` 23개(scope 준수) + 확장자 필터(`php` `inc` `module`).
프로젝트 외부를 가리키는 symlink **0건**. 5MB 초과 파일 **0건**. 읽기 실패 **0건(0.0%)**.

---

## 4. 검색 통계

| 항목 | 값 |
|---|---|
| 검색 대상 디렉터리 | 2 (실질) |
| 검색 PHP 파일 | **179** |
| 검색 실패 파일 | **0** (실패율 0.0%) |
| 총 Match (중복 제거 전) | 44 |
| **중복 제거 후 Match** | **42** |
| 고유 파일 (히트 보유) | **26** |
| **고유 Symbol** | **0** |
| 민감정보 마스킹 | 0 (마스킹 대상 자체가 없었음) |
| 외부 경로 제외 | 0 |

### 4.1 Layer 별

| Layer | 건수 |
|---|---|
| HTTP_API (`backend/src/Handlers/**`) | 40 |
| QUEUE (`backend/bin/**`) | 2 |

### 4.2 Classification 별

| Classification | 건수 |
|---|---|
| **OBVIOUS_FALSE_POSITIVE** | **42 (100%)** |
| POTENTIAL_BACKEND_IMPLEMENTATION | **0** |
| POTENTIAL_RELATED_INFRASTRUCTURE | **0** |
| UNKNOWN | **0** |

### 4.3 Priority 별 (파일 단위)

| Priority | 파일 수 |
|---|---|
| HIGH | **0** |
| MEDIUM | **0** |
| LOW | **0** |
| IGNORE_CANDIDATE | **26** |

### 4.4 연관 구조 후보

| 후보 | 건수 |
|---|---|
| Repository | 0 |
| Service | 0 |
| Policy / Authorization | 0 |
| Domain Event / Outbox | 0 |
| Queue Job | 0 |
| Cache | 0 |
| **Polymorphic Resource** (`morphTo`/`resource_type`) | **0** |
| User Preference 연계 | 0 |
| Navigation 연계 (`menu_key` 등) | 0 |

→ **즐겨찾기가 재사용할 수 있는 범용 백엔드 인프라도 존재하지 않는다.**
(Part004-04 본 구현 시 리소스 참조 모델을 **새로 설계**해야 한다는 뜻 — ST10 갭 분석의 핵심 입력.)

---

## 5. 오탐 분석 (42건 전수 육안 확인)

| ignore_reason | 건수 | 실체 |
|---|---|---|
| **KO_FIXED_VALUE** | **30** | 한국어 `고정` = **"fixed"**. 고정 주기 / 고정 배송비 / 고정 단가 / 통화 KRW 고정 / sub-admin 고정 등. 즐겨찾기 "고정(pin)"과 무관 |
| **COMMENT_ONLY** | 7 | 위 `고정` 이 주석에 있는 경우 |
| **CWIS_SELF_REFERENCE** | 3 | 본 CWIS 작업이 만든 코드(`PM/Collaboration.php` capability 카탈로그, `navigation_registry_selftest.php`). **기존 구현 근거가 아님** |
| **JS_BOOKMARKLET** | 2 | `Onsite.php` 의 `$bookmarklet` — 온사이트 CRO 편집기를 주소창에서 실행하는 **JS 스니펫**. 북마크 기능과 무관 |

### 5.1 검색기 정확도 개선 2건 (본 Step 에서 발견·수정)

1. **`bookmarklet` 오탐** — 초기 실행에서 `POTENTIAL_BACKEND_IMPLEMENTATION` 으로 잘못 승격됐다.
   전용 오탐 규칙 추가.
2. **★한글 토큰 경계 결함** — `별표` 가 **`월별표`(monthly table)** 내부에 매칭됐다(`Pnl.php` 3건).
   한글에는 `\b` 가 없으므로 `(?<![가-힣])별표(?![가-힣])` 로 선후행 한글을 배제하도록 수정.
   → 재실행 후 `월별표` 잔존 **0건** 확인.

이 두 건은 **검색 규칙이 아니었다면 잘못된 "백엔드 구현 존재" 결론**으로 이어질 수 있었다.

---

## 6. 주요 후보 파일 (상위 요약 — 전체는 JSON)

**HIGH / MEDIUM Priority 파일 0개.** 모든 히트 파일(26개)이 `IGNORE_CANDIDATE`.

대표 사례 5건:

| 파일 | 히트 | 실체 |
|---|---|---|
| `backend/src/Handlers/Pnl.php` | 3 | `월별표`(monthly table) — 토큰 경계 수정으로 제거됨 |
| `backend/src/Handlers/Onsite.php` | 2 | `$bookmarklet` — JS 스니펫 |
| `backend/src/Handlers/PreferenceCenter.php` | 1 | *"레거시 북마크(구버전 폼)"* 주석 — 브라우저 북마크 의미 |
| `backend/src/Handlers/Mmm.php` | 2 | `고정 κ` — 알고리즘 파라미터 |
| `backend/src/Handlers/ChannelSync.php` | 1 | `고정(02) 배송비` — 채널 배송비 코드 |

---

## 7. 생성 파일

| 파일 | 내용 |
|---|---|
| `tools/cwis/navigation/scripts/search-favorites-backend.php` | 재실행 가능한 정적 검색기 (DB/Queue/네트워크/Boot 없음) |
| `tools/cwis/navigation/output/favorites-backend-raw-results.json` | 원본 결과 42건 + 메타/통계 |
| `tools/cwis/navigation/output/favorites-backend-file-inventory.json` | 파일 단위 인벤토리 26건 |
| `tools/cwis/navigation/output/favorites-backend-symbol-inventory.json` | 심볼 인벤토리 **0건**(빈 결과 자체가 결론) |
| `docs/cwis/part004-04/part004-04-ws01-sp01-tk001-st02-backend-search-report.md` | 본 보고서 |

---

## 8. 검증 결과

**22 passed, 0 failed**

| 검증 | 결과 |
|---|---|
| JSON 3개 구문 (§43.1) | PASS |
| `result_id` 형식 + **고유성** (§43.3) | PASS |
| **file_path 상대·내부·traversal 없음** (§43.2) | PASS (26/26 실재 확인) |
| **raw 고유 파일 수 = inventory 파일 수** (§44) | PASS |
| **inventory match_count = raw 집계** (§44) | PASS |
| symbol file_path ⊂ raw 파일 (§44) | PASS |
| 메타 카운트 = 실제 배열 길이 | PASS |
| `by_priority` / `by_classification` 합계 정합 | PASS |
| `matched_text` 300자 이하 · 개행 escape (§31) | PASS |
| **민감정보 원문 없음** (§45) | PASS (Bearer/PEM/DB_PASSWORD/API_KEY 등 8패턴) |
| 절대경로·개인 디렉터리 없음 (§32) | PASS |
| classification / priority / symbol_type enum 정합 | PASS |
| 읽기 실패율 20% 미만 (§36) | PASS (0.0%) |
| 성능 기준 (§47) | PASS (179 파일 / 1.4초) |
| **운영 코드 무변경** (§46) | PASS (추적 파일 diff 0) |
| **★백엔드 PHP 전수 스캔 (누락 없음)** | PASS (179 = 실제 파일 수) |

> 마지막 항목이 중요하다 — *"검색을 덜 해서 0건"* 이 아님을 기계적으로 강제한다.

---

## 9. 제한 사항

1. **AST Parser 부재** — `nikic/php-parser` 미설치(신규 설치 금지). PHP 내장 `token_get_all` 로
   Class/Interface/Trait/Enum/Method/Constant 를 추출했다. 이는 정규식보다 정확하지만
   동적 호출(`__call`, 가변 메서드명)은 탐지 불가다. 다만 **심볼 히트가 0건**이라 실무 영향 없음.
2. **`config/` 는 형식적 포함** — PHP 파일 0개라 실질 검색 대상이 아니었다.
3. **`고정` 오탐 규칙의 보수성** — 한국어 `고정`은 본 저장소에서 대부분 "fixed" 의미라 광범위하게
   오탐 처리했다. 향후 실제 "고정(pin)" 기능이 추가되면 규칙 재조정이 필요하다(현재는 그런 코드가 없음).
4. **ST02 는 최종 판정을 하지 않는다** — Classification 은 4값(`UNKNOWN`/`OBVIOUS_FALSE_POSITIVE`/
   `POTENTIAL_*`)만 사용했다. 최종 분류·갭 분석은 ST08/ST10 소관.

---

## 10. 다음 Step 진행 가능 여부

**READY**

- 필수 JSON 3개 + 보고서 생성, 검증 22/22 통과, 운영 코드 변경 0건.
- ST03(Frontend) 의 입력으로 즉시 사용 가능.

### 10.1 ST03 을 위한 인계 사항

1. **프론트가 유일한 구현 지점이다** — ST02 가 백엔드 0건을 확정했으므로, ST03 이 실제로 발견할
   대상은 `frontend/src/layout/Sidebar.jsx` 의 `useFavorites` / `useRecentVisits` / `QuickAccessPanel`
   (ST01 `known_repo_symbols` 에 고정 등재됨)이다.
2. **한글 토큰 경계 결함을 그대로 이어받지 말 것** — `(?<![가-힣])` 패턴을 ST03 에도 적용해야 한다.
   로케일 파일(`frontend/src/i18n/locales`)은 `noisy_paths` 로 분리 실행할 것.
3. **`고정` 오탐이 프론트에서도 대량 발생할 수 있다**(CSS `position: fixed` 주석, 고정 헤더 등).

### 10.2 여전히 유효한 압축 권고

ST02 결과로 **ST04(DB)·ST05(API)의 결론도 사실상 확정**되었다 — 백엔드에 테이블·라우트·핸들러가
0건이므로 `pm_*`/`collaboration_*` 어디에도 favorites 스키마가 없다.
**ST04·ST05·ST06 을 1개 Step 으로 묶고, ST07~ST11 을 1개로 통합**하면 동일 품질을 2 Step 으로 달성할 수 있다.
명세대로 개별 진행을 원하시면 그렇게 하겠다.
