# CWIS Part004-04 ST07-06 — Favorites Reorder (device-local)

| 항목 | 값 |
|---|---|
| 명세 | `CWIS-P004-U04-WS01-SP02-TK002-ST07-06` |
| **판정** | **READY** |
| 성격 | device-local 실동작 구현 (Option A 범위 · net-new) |
| 기준 리비전 | `c827b6f2afa` |
| 배포 | **미배포**(로컬 빌드·검증까지) · **미커밋**(자동 커밋 금지 준수) |

---

## 0. 요약

ST07 하위 8분할 중 **유일한 net-new 프론트 작업**인 Reorder 를 구현했다. 이로써 오래 보류됐던 **BACKLOG-3(CAP-05 순서 변경)** 이 해소됐다 — 이전엔 "요구 미확인"으로 의도적 보류였고, 사용자 확정("권장 순으로 진행")으로 요구가 확인됐다.

서버 favorites API 가 부재(ST05 BLOCKED)하므로 **device-local**(localStorage 배열 순서) 로 구현했고, DnD 라이브러리가 없어(§29 설치 금지) **키보드 접근 가능한 ▲▼ 버튼**(§13 대체·§14 키보드)으로 만들었다.

---

## 1. 구현

### 저장·상태 (무후퇴)

기존 `localStorage['g_sidebar_favs']` 경로 배열을 **그대로** 사용한다 — 기존 사용자 즐겨찾기 데이터 승계. `useFavorites` 는 `Set` 하나를 유지하되 Set 은 삽입 순서를 보존하므로 `[...favs]` 가 곧 사용자 순서다.

```js
// 추가는 맨 앞 prepend — 최신이 상단(이전 "add(끝)+표시 reverse" 와 시각 동일·무후퇴)
const next = arr.includes(path) ? arr.filter(p => p !== path) : [path, ...arr];

// move(path, dir) — 인접 항목 스왑, 경계 no-op, 즉시 persist
const move = useCallback((path, dir) => setFavs(prev => {
  const arr = [...prev]; const i = arr.indexOf(path);
  if (i < 0) return prev;
  const j = dir === 'up' ? i - 1 : i + 1;
  if (j < 0 || j >= arr.length) return prev;   // 경계 no-op
  [arr[i], arr[j]] = [arr[j], arr[i]];
  persist(arr); return new Set(arr);
}), []);
```

### 표시 (WYSIWYG)

표시부의 `.reverse()` 를 **제거**했다 — 재정렬과 짝을 이뤄야 하기 때문. 저장 순서 = 표시 순서. `toggle` 이 추가를 prepend 하므로 "최신 추가분 상단" 이라는 기존 시각 동작은 유지된다(무후퇴).

### UI

`QuickAccessPanel` 즐겨찾기 행마다 세로 `▲▼` 버튼(✕ 앞). **항목 2개 이상일 때만** 노출. **첫 항목 ▲ / 끝 항목 ▼ disabled**.

---

## 2. 접근성 (§23·§14)

| 항목 | 구현 |
|---|---|
| Semantic button | `<button type="button">` — 키보드 Tab+Enter 네이티브(실측 focusable) |
| aria-label | `위로 이동 — {메뉴명}` / `아래로 이동 — {메뉴명}` (대상 포함) |
| 경계 disable | 첫 ▲·끝 ▼ disabled(실측) — disabled 는 포커스 제외(정상) |
| 터치 타깃 | 모바일 ▲/▼ 각 44×22, 세로 합산 **44×44**(WCAG 2.5.5). ✕ 44×44 |
| 색상 의존 금지 | 글리프 ▲▼ + disabled opacity(색만으로 상태 표현 안 함) |

---

## 3. i18n (15개국)

키 `sidebar.moveFavUp` / `sidebar.moveFavDown` 을 **15개 로케일 전부**에 추가. 각 파일의 `removeFav` 앵커 뒤에 삽입하며 **파일별 키 표기(따옴표 유무)를 계승**(ko/ja/zh 는 `"key":`, 나머지는 `key:`), UTF-8 no BOM.

값은 표준 UI 마이크로카피(위/아래 이동)로 실번역 — 기계번역이 아니라 짧고 표준적인 동작 라벨(예 ko 위로 이동/아래로 이동, ja 上へ移動/下へ移動, de Nach oben/Nach unten). 코드는 `t(key, 'Move up')` 인라인 폴백도 병행해 키 누락 시에도 안전.

---

## 4. 검증

### 회귀 가드 · 빌드

- `npm run fav:test` — **26/26 통과**(신규 reorder 6항: move API·스왑·경계 no-op·2개↑ 노출·disabled·i18n 15개국)
- `vite build` — 성공(50s)
- Lint — 내 변경 파일 clean.
  ★**기존결함(무관)**: `Sidebar.jsx:730` `no-unused-vars '(section, i)'` 은 HEAD 에 이미 존재(즐겨찾기 무관·main 메뉴 map)이며 **범위 밖이라 미수정**(플래그만).

### 브라우저 실측 (Playwright · 프로덕션 빌드 preview)

| 화면 | 결과 |
|---|---|
| 데스크톱 1440 | 8개 렌더 · ▲▼ 존재 · 경계 disable 정확 · ▼클릭 스왑(`[/dashboard,/crm…]`→`[/crm,/dashboard…]`) · localStorage persist · **리로드 후 순서 유지** · 한국어 aria-label · 활성 버튼 focusable |
| 모바일 390 | 드로어 내 ▲/▼ 44×22(합산 44×44) · ✕ 44×44 · 순서 유지 |

### 무후퇴

BACKLOG-1(스크롤·잘라내지 않음) · BACKLOG-2(44×44) · 패널 소멸(flexShrink:0) · 추가 최신상단(prepend) · 저장키 `g_sidebar_favs` 불변 — 전부 유지.

---

## 5. 변경 파일 (허용 범위)

```
frontend/src/layout/Sidebar.jsx          (reorder 핵심)
frontend/src/i18n/locales/*.js × 15      (moveFavUp/Down)
tools/favorites_selftest.mjs             (가드 20→26항)
+ 산출물 2건 (tools/cwis/**, docs/cwis/**)
```

§28 허용 범위 준수(frontend/·i18n·docs/cwis·tools/cwis). Backend·Migration·Lock·env 무변경.

---

## 6. 판정과 다음 단계

**READY.** device-local Reorder 를 구현·브라우저 실측·회귀 가드까지 완료했다.

제한:
- device-local 전용(기기 간 동기화 없음 — 서버 API 부재·Option A 범위)
- DnD 드래그 불가(라이브러리 없음) → ▲▼ 버튼 방식
- 기존결함 `Sidebar.jsx:730` 미수정(범위 밖·플래그)

### 남은 ST07 하위

- **ST07-03/04/05/07** — 이미 구현(REUSE) 또는 서버 API 부재(BLOCKED)로 실질 신규 작업 없음(ST07-01 재사용판정 참조)
- **ST07-08(테스트/통합)** — `fav:test` 26항으로 상당 부분 이미 충족

**대기:** 커밋·배포(운영/데모 dist swap)는 **사용자 승인 후**. 현재 미커밋·미배포.
