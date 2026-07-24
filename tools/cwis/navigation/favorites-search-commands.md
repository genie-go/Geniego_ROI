# Favorites Discovery — Search Command Templates

> **Specification ID**: `CWIS-P004-U04-WS01-SP01-TK001-ST01`
> **입력 설정**: [`tools/cwis/navigation/favorites-search-scope.json`](./favorites-search-scope.json)
> **용도**: ST02~ST06 이 동일한 범위·제외·마스킹 규칙으로 검색을 재현하기 위한 명령 템플릿.
> ★본 문서는 템플릿만 제공한다. 자동 실행 스크립트는 ST01 범위 밖이며 만들지 않는다(명세 §23).

---

## 0. 실행 환경 실측 (이 저장소 기준)

| 항목 | 실측 결과 | 영향 |
|---|---|---|
| `rg` (ripgrep) | **Bash 도구에서 사용 가능** — `ripgrep 14.1.1` | 1순위 도구로 사용 |
| `rg` (Windows PowerShell) | **PATH 에 없음** | PowerShell 에서는 `Select-String` 또는 Git Bash 경유 |
| `git grep` | 사용 가능 | 2순위(추적 파일만 검색 — untracked 세션 산출물 자동 제외라는 장점) |
| PowerShell | 5.1 Desktop, OutputEncoding **utf-8** | 한국어 검색어 사용 가능 |
| 저장소 루트 | `E:\project\GeniegoROI` (문서·결과에는 **상대 경로만** 기록) | §5 참조 |

★**Bash 도구와 PowerShell 도구는 서로 다른 셸이다.** 리다이렉션을 섞지 말 것
(Bash: `2>/dev/null` · PowerShell: `2>$null`).

---

## 1. 공통 제외 규칙

`favorites-search-scope.json` 의 `exclude_directories` / `exclude_globs` 와 반드시 일치시킨다.

```
.git .github .idea .vscode .playwright-mcp
node_modules  backend/vendor  frontend/node_modules  frontend/dist
frontend/src/i18n/locales_backup
clean_src  backup  legacy_v338_pkg
dist  build  coverage  .cache  tmp  temp  logs
*.min.js  *.map  *.bak*  _be_*  _dist_*  _build_*.log  "Screen capture/"
```

**제외 사유**

| 대상 | 사유 |
|---|---|
| `backend/vendor`, `node_modules` | 외부 의존성 — 우리 구현이 아님. 중복·오탐 대량 발생 |
| `frontend/dist`, `dist.bak*` | 빌드 산출물(minified) — 원본 소스로만 판단 |
| `clean_src`, `backup`, `legacy_v338_pkg` | 읽기 전용 과거 미러 — 현재 동작과 무관 |
| `frontend/src/i18n/locales_backup` | 로케일 백업본 — 현행 아님 |
| `_be_*`, `_dist_*`, `_build_*.log` | 세션 배포 산출물(루트를 검색 대상에 넣지 않으므로 자연 제외되나 명시) |
| `logs/`, `*.log` | **개인정보·토큰 노출 위험** |

---

## 2. Bash / Git Bash (1순위 — ripgrep)

### 2.1 전체 1차 검색 (영문)

```bash
rg --ignore-case --line-number --with-filename \
   --glob '!**/node_modules/**' \
   --glob '!**/vendor/**' \
   --glob '!frontend/dist/**' \
   --glob '!**/dist.bak*/**' \
   --glob '!clean_src/**' --glob '!backup/**' --glob '!legacy_v338_pkg/**' \
   --glob '!frontend/src/i18n/locales_backup/**' \
   --glob '!**/*.min.js' --glob '!**/*.map' --glob '!**/*.bak*' \
   -e 'favou?rites?' -e 'bookmarks?' -e 'starred' -e 'unstar' \
   -e '\bpinned?\b' -e 'unpin' -e 'saved_items?' -e 'user_favou?rites?' \
   backend/src backend/bin backend/migrations frontend/src tools
```

### 2.2 한국어 1차 검색

```bash
rg --line-number --with-filename \
   --glob '!**/node_modules/**' --glob '!**/vendor/**' \
   -e '즐겨찾기' -e '즐겨 찾기' -e '북마크' -e '저장한 항목' -e '저장된 항목' \
   -e '별표' -e '고정' -e '핀' \
   backend/src frontend/src docs
```

> 로케일(`frontend/src/i18n/locales`)은 `noisy_paths` 다. 별도 실행하고 결과는 기본 `UI_ONLY` 로 둔다.
> ```bash
> rg --line-number --max-count 5 -e '즐겨찾기|북마크|최근 항목' frontend/src/i18n/locales
> ```

### 2.3 Backend 전용 (ST02 입력)

```bash
rg --ignore-case --line-number --type php \
   -e 'favou?rite' -e 'bookmark' -e 'pinned' -e 'saved_item' \
   -e 'FavoriteService|FavoriteRepository|FavoriteController|BookmarkService' \
   -e 'addFavorite|removeFavorite|toggleFavorite|isFavorite|pinItem|unpinItem' \
   backend/src backend/bin
```

★**본 저장소 특성**: 라우트 정본은 `backend/src/routes.php` 의
`'METHOD /path' => 'Class::method'` 문자열 맵이다. Laravel `Route::` / Symfony Attribute 라우팅은 없다.

```bash
rg --line-number -e "'(GET|POST|PUT|PATCH|DELETE) [^']*(favou?rite|bookmark|pin|saved)" \
   backend/src/routes.php
```

### 2.4 Frontend 전용 (ST03 입력)

```bash
rg --ignore-case --line-number --glob '!**/node_modules/**' \
   -e 'favou?rite' -e 'bookmark' -e 'pinned' -e 'starred' \
   -e 'useFavorites|useRecentVisits|QuickAccessPanel|toggleFav' \
   -e 'g_sidebar_favs|g_sidebar_recents|g_user_menu_visibility|g_sidebar_ui_state' \
   frontend/src
```

### 2.5 Database 전용 (ST04 입력)

★`backend/migrations/` 는 **세션 172 에서 동결**되었고 이후 스키마는 핸들러의 `ensureTables()` 자가치유로
생성된다. **두 곳을 모두** 검색하지 않으면 실제 테이블을 놓친다.

```bash
# ① 마이그레이션 파일
rg --ignore-case --line-number -e 'favou?rites?|bookmarks?|pinned_items|saved_items' backend/migrations

# ② 핸들러 내부 DDL (진짜 정본)
rg --line-number -e 'CREATE TABLE IF NOT EXISTS\s+\w*(favou?rite|bookmark|pin|saved)\w*' backend/src

# ③ 테이블 이름 전수(즐겨찾기 후보 식별용)
rg --only-matching --no-line-number -e 'CREATE TABLE IF NOT EXISTS\s+(\w+)' --replace '$1' backend/src | sort -u
```

### 2.6 Test / Package 전용 (ST06 입력)

```bash
# 테스트 러너가 없으므로 자체 검증 스크립트가 테스트 자산이다
rg --ignore-case --line-number -e 'favou?rite|bookmark|pinned' \
   tools/*_selftest.mjs backend/bin/*_selftest.php

# 외부 패키지
rg --ignore-case -e 'favou?rite|bookmark|star|pin' \
   backend/composer.json frontend/package.json package.json
```

### 2.7 git grep (2순위 — 추적 파일만)

```bash
git grep -n -I --ignore-case -e 'favourite' -e 'favorite' -e 'bookmark' -e 'pinned' \
  -- backend/src frontend/src backend/migrations tools
```

> 장점: untracked 세션 산출물(`_be_*`, `_dist_*`)이 자동 제외된다.
> 단점: 커밋되지 않은 신규 파일을 놓친다 — `rg` 결과와 **교차 확인** 필수.

---

## 3. Windows PowerShell 5.1 (rg 미설치 환경)

★`rg` 가 PATH 에 없으므로 `Select-String` 을 쓴다. **`Get-Content | Where-Object | Set-Content` 패턴은
UTF-8 한글 파일을 손상시키므로 검색 결과 저장에 사용 금지**(읽기 전용 파이프라인만 허용).

### 3.1 전체 1차 검색

```powershell
$include = @('backend\src','backend\bin','backend\migrations','frontend\src','tools')
$exclude = 'node_modules|\\vendor\\|frontend\\dist|dist\.bak|clean_src|\\backup\\|legacy_v338_pkg|locales_backup|\.min\.js$|\.map$|\.bak'
$pattern = 'favou?rites?|bookmarks?|starred|unstar|pinned?|unpin|saved_items?'

Get-ChildItem -Path $include -Recurse -File -Include *.php,*.js,*.jsx,*.mjs,*.sql,*.json,*.md |
  Where-Object { $_.FullName -notmatch $exclude } |
  Select-String -Pattern $pattern -CaseSensitive:$false |
  Select-Object -First 500 |
  ForEach-Object { "{0}:{1}:{2}" -f (Resolve-Path -Relative $_.Path), $_.LineNumber, $_.Line.Trim() }
```

### 3.2 한국어 검색

```powershell
Get-ChildItem -Path 'backend\src','frontend\src' -Recurse -File -Include *.php,*.js,*.jsx |
  Where-Object { $_.FullName -notmatch 'node_modules|locales_backup' } |
  Select-String -Pattern '즐겨찾기|북마크|최근 항목|고정' -Encoding UTF8 |
  ForEach-Object { "{0}:{1}" -f (Resolve-Path -Relative $_.Path), $_.LineNumber }
```

### 3.3 결과를 파일로 저장할 때

```powershell
# ★반드시 UTF-8(BOM 없음) 명시 — 기본 ANSI 로 저장하면 한글이 깨진다
$results | Out-File -FilePath 'docs\cwis\part004-04\_raw\st02-backend.txt' -Encoding utf8
```

---

## 4. 검색 결과 → JSON 변환

ST07(Normalization)에서 사용할 중간 형식. `rg --json` 을 1차 소스로 쓴다.

```bash
rg --json --ignore-case \
   --glob '!**/node_modules/**' --glob '!**/vendor/**' \
   -e 'favou?rite|bookmark|pinned|saved_item' \
   backend/src frontend/src \
  > docs/cwis/part004-04/_raw/st02-raw.jsonl
```

`rg --json` 은 JSON Lines 를 낸다. `type == "match"` 행만 취해 아래 형태로 정규화한다
(필드 정의는 `favorites-search-scope.json` 의 `result_metadata_fields`).

```json
{
  "result_id": "st02-0001",
  "keyword": "favorite",
  "matched_text": "…최대 200자, 민감값 [REDACTED]…",
  "file_path": "frontend/src/layout/Sidebar.jsx",
  "line_number": 18,
  "language": "jsx",
  "layer": "FRONTEND",
  "classification": "PARTIAL_IMPLEMENTATION",
  "symbol_name": "useFavorites",
  "related_resource": "menu_path",
  "tenant_aware": false,
  "user_scoped": true,
  "workspace_scoped": false,
  "permission_detected": false,
  "test_detected": false,
  "notes": ""
}
```

Node 로 변환할 때(패키지 설치 금지 — 표준 모듈만):

```bash
node -e "
const fs=require('fs');
const out=[];let i=0;
for(const line of fs.readFileSync(process.argv[1],'utf8').split('\n')){
  if(!line.trim())continue;
  let j;try{j=JSON.parse(line)}catch{continue}
  if(j.type!=='match')continue;
  out.push({
    result_id:'st02-'+String(++i).padStart(4,'0'),
    file_path:j.data.path.text.replace(/\\\\/g,'/'),
    line_number:j.data.line_number,
    matched_text:j.data.lines.text.trim().slice(0,200)
  });
}
fs.writeFileSync('docs/cwis/part004-04/_raw/st02-normalized.json',JSON.stringify(out,null,2));
console.log('rows='+out.length);
" docs/cwis/part004-04/_raw/st02-raw.jsonl
```

---

## 5. 민감정보 마스킹 주의사항

검색 결과를 저장하기 **전에** 반드시 적용한다(`favorites-search-scope.json` → `redaction_rules`).

| 규칙 | 내용 |
|---|---|
| 마스킹 대상 | `password` `secret` `token` `api_key` `private_key` `authorization` `bearer` `cookie` `session` `client_secret` `access_key` `GENIE_DB_PASS` `APP_KEY` `PG_ENC_KEY` |
| 방식 | 키는 남기고 값만 `[REDACTED]` (`mask_value_keep_key`) |
| 길이 제한 | `matched_text` 최대 200자 |
| 경로 | **상대 경로만** 기록. `E:\project\...` 같은 절대 경로·개인 디렉터리명 금지 |
| 절대 저장 금지 | `.env` 전체 내용 · 토큰/비밀번호/세션ID/쿠키 원문 · Private Key · 개인정보 Payload |

`.env` 계열은 애초에 검색 대상에서 제외한다.

```bash
# .env 는 include 하지 않는다. 실수로 포함됐는지 사후 확인:
rg --files docs/cwis/part004-04/_raw | xargs -r rg -l 'GENIE_DB_PASS|APP_KEY|PG_ENC_KEY' || echo "clean"
```

---

## 6. 오탐(FALSE_POSITIVE) 주의 목록

검색 시 다음은 즐겨찾기와 무관하다 — 분류 단계에서 걸러낸다.

- `star` — 별점/평점(리뷰), CSS 글리프 `★`
- `pin` — PIN 번호, `package-lock` 의 pinned dependency
- `history` — 브라우저 History API, git history
- `preference` — `PreferenceCenter`(마케팅 수신동의). 내비게이션 설정과 무관
- `recent` — 최근 주문·최근 캠페인 등 도메인 데이터 정렬
- `docker-compose.yml` 의 PostgreSQL 관련 히트 — **실제 스택과 불일치하는 초기 커밋 스텁**
- `docs/cwis/**` — 명세 문구 자체(구현 근거로 사용 금지)

---

## 7. Step 별 사용 매핑

| Step | 사용할 명령 |
|---|---|
| ST02 Backend Keyword Search | §2.3, §2.7 |
| ST03 Frontend Keyword Search | §2.4 (+ §2.2 로케일 분리 실행) |
| ST04 Database / Migration Search | §2.5 ①②③ **전부** |
| ST05 Route / API Search | §2.3 하단 routes.php 전용 명령 |
| ST06 Test / Package Search | §2.6 |
| ST07 Normalization | §4 |
