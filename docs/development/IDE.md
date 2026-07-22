# IDE 설정

CCIS Part003 | 실측 2026-07-22

---

## 1. 권장 에디터

| 에디터 | 비고 |
|--------|------|
| Visual Studio Code | 주 사용. 저장소에 공유 워크스페이스 설정이 있다(§3) |
| PhpStorm / IntelliJ IDEA | PHP 백엔드 작업 시. EditorConfig 를 기본 지원한다 |

**개인 설정은 저장소에 넣지 않는다** — 개인 키맵·테마·로컬 절대경로·SSH 키·운영 접속정보(Part003 §7.3).

---

## 2. 공통 규약 — `.editorconfig`

저장소 루트의 `.editorconfig` 가 정본이다. EditorConfig 플러그인만 켜면 자동 적용된다.

| 항목 | 값 |
|------|-----|
| 문자셋 | UTF-8 |
| 줄바꿈 | **LF** (단 `.ps1`/`.bat`/`.cmd` 는 CRLF) |
| 들여쓰기 | 기본 2칸 · PHP/SQL/Python 4칸 · **Makefile 은 탭** |
| 최대 줄길이 | 120 (Markdown 제외) |

`.gitattributes` 가 `* text=auto eol=lf` 로 정규화하며, `*.ps1`/`*.bat`/`*.cmd` 만 `eol=crlf` 다.
바이너리(`*.zip`, 이미지, 폰트)는 변환 대상에서 제외돼 있다.

---

## 3. ★ `.vscode/settings.json` 이 `.editorconfig` 를 일부 덮는다 (의도된 것)

저장소에 추적되는 `.vscode/settings.json` 은 다음 4개를 지정한다.

```json
{
    "editor.formatOnSave": false,
    "files.insertFinalNewline": false,
    "files.trimTrailingWhitespace": false,
    "files.eol": "\n"
}
```

`.editorconfig` 는 `insert_final_newline = true` · `trim_trailing_whitespace = true` 이므로
**뒤 두 항목이 정면으로 충돌한다.** 이는 실수가 아니라 안전장치로 본다 —
`ko.js`(≈1MB) 같은 거대 파일을 열었다 저장하는 것만으로 공백 정리 diff 가 수천 줄 발생하고,
그 diff 가 실제 변경을 덮어버리기 때문이다.

**따라서 이 설정을 "정합성을 위해" 되돌리지 말 것.** 새 파일에는 EditorConfig 규약을 손으로 지키고,
기존 대형 파일은 건드린 줄만 바뀌도록 둔다.

`editor.formatOnSave: false` 도 같은 이유다. 포매터를 쓰려면 선택 영역 포맷을 쓴다.

---

## 4. 권장 확장 (VS Code)

| 확장 | 용도 |
|------|------|
| EditorConfig for VS Code | `.editorconfig` 적용 |
| ESLint | `frontend/.eslintrc.json` — `npm run lint` 와 같은 규칙 |
| PHP Intelephense (또는 PHP Tools) | PHP 8.1 정적 분석 |
| markdownlint | 문서 작업 |

**설치를 강제하지 않는다.** `.vscode/extensions.json` 은 두지 않는다 — 개인 환경 강제를 피한다.

---

## 5. 파일 인코딩 함정 (Windows)

이 저장소는 한국어 문자열을 대량으로 포함한다. 다음은 실제로 파일을 깨뜨린 사례다.

| 하지 말 것 | 대신 |
|-----------|------|
| `Get-Content \| Where-Object \| Set-Content` | `[System.IO.File]::ReadAllText/WriteAllText` + UTF-8(BOM 없음) |
| BOM 없는 `.ps1` 저장 | **UTF-8 with BOM** — PS 5.1 은 BOM 없는 `.ps1` 을 ANSI 로 읽어 한글을 깬다 |
| VS Code Find/Replace All 로 대량 치환 | 일부 파일에서 조용히 실패한다. .NET API 스크립트나 직접 편집 |

`deploy.ps1`·`scripts/bootstrap/bootstrap.ps1` 은 BOM 포함으로 저장돼 있다. 편집 후 BOM 이 사라지지 않았는지 확인한다.

```bash
head -c3 scripts/bootstrap/bootstrap.ps1 | od -An -tx1     # efbbbf 이어야 한다
```

---

## 6. 대형 파일 취급

| 파일 | 크기 | 지침 |
|------|------|------|
| `frontend/src/i18n/locales/*.js` | `ko.js` ≈ 1MB × 15개 | **통째로 열지 않는다.** 필요한 키만 검색해 편집 |
| `backend/src/routes.php` | 1600+ 줄 | 라우트 등록 위치만 찾아 편집 |
| `backend/src/Db.php` | 대형 | 스키마 로직 포함 — 부분 편집 |

에디터 전체 검색은 `node_modules`·`dist`·`clean_src`·`legacy_v338_pkg` 를 제외하고 건다.

---

## 7. Git hooks

`bootstrap` 이 `core.hooksPath=.githooks` 를 설정한다. 커밋 전 시크릿 스캔이 돌아간다.

```bash
git config --get core.hooksPath      # .githooks 여야 한다
```

훅을 우회(`--no-verify`)하지 않는다.
