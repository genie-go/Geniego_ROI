# GenieGoROI i18n 인계서 — 136차 시작점

> 본 문서는 135차 검수자가 전체 작성 (★ amend — N-116 발견 반영).
> 136차 검수자는 이 문서 전체를 신뢰 기반으로 삼되, 모든 수치·상태는
> 136차 시작 시 raw 재확인 후 진행할 것. 추측 보류 금지 — raw 로
> 0/부재를 입증해야 보류가 정당. **★특히 locale 폴더 전체 .js 파일
> raw 확인 필수 (N-116 교훈).**

---

## 0. 운영 원칙 (절대 — 매 차수 최우선 준수)

**0순위 절대원칙**
1. **★작업 여력 최대 활용 (132차 사용자 명시·강화, 133/134/135차 실증, 135차 +285 신기록)**:
   작업 여력이 있으면 절대 다음 차수로 미루지 않는다. 부분 종결이
   가능하면 진행하고, 추가 측정·발굴·도구작성·apply 까지 가능하면
   끝까지 한다. 인계서만 작성하다 차수만 증가시키지 말 것. 사용자
   작성분 받으면 즉시 병합·dry·apply 까지 그 차수 안에 완결한다.
   인계서 작성 전 반드시 사용자 승인을 받는다. 인계서는 검수자가
   전체 작성하며(기존 전체 삭제 후 전체 붙여넣기), 임의 종결·임의
   인계 작성 금지.
2. **추측 보류 금지 + ★locale 폴더 전체 .js raw 확인 필수 (N-116 신규)**:
   "안전여력 소진/보류"를 선언하려면 raw 수치로 0 또는 부재를
   입증해야 한다. **추가로, 인계서의 좌표/대상 언어 정보는 매 차수
   시작 시 `Get-ChildItem locales -Filter "*.js"` 로 raw 재확인 필수**.
   135차에 인계서가 `{ko,ja,zh}.js` 3개만 명시하여 검수자가 14개+ 추가
   언어 자산을 인식 못한 사례 (N-116). 사용자 질문이 raw 검증을
   촉발하지 않았다면 14개 언어 무시한 상태로 차수 종결 위험.
3. **★불가작업 전환 원칙**: 진행 중인 특정 작업이 그 차수에 raw 로
   도저히 불가함이 입증되면, 거기 매달리지 말고 작업 여력이 있는
   한 다른 진행 가능한 작업으로 즉시 전환한다. 부분 종결이어도 무방.
4. **★불가의 2종 구분**:
   - **종류 1 (물리·논리 불가)**: 데이터 구조 자체의 한계. 차수 바뀌어도 결과 동일.
   - **종류 2 (선행부재 불가)**: 선행 작업이 없어서 불가. 선행 충족되면 가능.
5. **★사용자가 ko 결정하는 영역 — 추측 절대 금지 (N-17/N-25/N-58/N-65/N-115)**:
   ko_fixed 자동 결정 금지. 단, 추천값 제시 후 사용자 확정 받는 워크플로우는 허용.
6. **★CC 자동 명령 무력화 원칙 (N-81, 135차 push 자동 다수 실증)**:
   거부 응답 입력하지 않고, 검수자의 다음 `t` 명령으로 덮어쓰기.
   apply/commit/push/ja-zh propagation 자동 입력은 차단 우선.
7. **★ko 전용 안전 apply 도구 패턴 (135차 5회 사용 모두 PASS)**:
   - 기존 path ko 값 수정: `session132_apply_ko_only.py`
   - 신규 키 추가: `session134_apply_new_keys.py` ★ depth-aware, ja/zh boundary
   - **★15개 언어 propagation: 136차 신규 도구 필요 (현재 부재)**
8. **★only_b 분류 신뢰 금지 (134차 N-93)**: 코드 호출 grep 검증 필수.
9. **★PASSTHROUGH 패턴 (135차 N-110)**: ja/zh가 이미 한국어인 경우 그대로 ko 사용.
10. **★사전 다단계 보강 (135차 N-111)**: v1→v5 매칭률 단계적 상승 패턴.
11. **★★★ 15개 언어 무결성 원칙 (N-116 신규 — 사용자 명시 강화)**:
    - **배포 운영 중인 i18n 시스템에서 누락 언어는 런타임 에러 / 영문 키 노출 / 일관성 깨짐 유발**
    - 어설프게 몇 개국 언어 누락하고 진행 절대 금지
    - ko 신규 키 추가 시 → 14개 언어 모두 동일 path 에 placeholder 또는 번역값 보장 필수
    - propagation 도구는 boundary check 를 ja/zh 만이 아니라 **15개 전체 무결성** 으로 확장
    - 단일 언어 작업 후 즉시 다음 언어로 넘어가지 말고, **모든 15개 언어에서 일관성 검증** 후 다음 작업

**작업 수칙**
- 모든 CC 명령 맨 앞 `t ` 접두 필수.
- cp949 회피 표준형: `t $env:PYTHONIOENCODING="utf-8"; python <도구> 2>&1 | Out-File -Encoding utf8 <log>; $env:PYTHONIOENCODING=""; code <log>`
- 명령 연결은 `;` 만 (`&&`/`||` 금지).
- CC 승인: `1.Yes/2.allow all/3.No` → `2`, `1.Yes/2.No` → `1`. 검증완료 .py 자체수정 시도 → `3`.
- CC 자동 명령은 거부 응답 대신 다음 `t` 명령으로 덮어쓰기.
- 검수자 설명은 한글·핵심만 짧게. 초엔터프라이즈급 정밀도.
- 선택지 제시 시 검수자 추천 1개 반드시 명시.
- 사용자 작업은 1건만 (도구 저장 또는 CSV 검토 + 업로드).
- ★사용자가 outputs 다운로드 파일을 폴더에 덮어쓰기 했는지 raw 검증 필수 (N-106).
- push 는 사용자 명시 승인 시에만 (현재 origin 대비 미실행 — 5-4).
- read-only 진단/probe 우선. apply 는 dry → raw → apply 순.

---

## 1. 프로젝트 좌표 (★N-116 정정)

### 1-1. locale 디렉토리
`D:\project\GeniegoROI\frontend\src\i18n\locales\` — **15개 언어 .js 파일**

### 1-2. 15개 언어 raw 현황 (135차 종결 시점, 단위 KB)

| 그룹 | 언어 | KB | 수정일 | 역할 |
|---|---|---:|---|---|
| **정답군** | ja.js | 1,126.6 | 135차 (오늘) | ★ 최대 / 정답 출처 |
| | zh.js | 849.5 | 135차 (오늘) | 보조 정답 |
| **회수 작업 진행** | ko.js | 986.5 | 135차 (+285 leaf) | ★ 87% 완성 (ja 대비) |
| **5/16군 (정렬 양호)** | th.js | 1,049.7 | 5/16 | 93% |
| | vi.js | 924.6 | 5/16 | 82% |
| | id.js | 853.0 | 5/16 | 76% |
| | de.js | 828.4 | 5/16 | 74% |
| | zh-TW.js | 776.7 | 5/16 | 69% |
| **5/14군 (정렬 양호)** | en.js | 948.5 | 5/14 | 84% |
| | es.js | 954.5 | 5/14 | 85% |
| | fr.js | 952.6 | 5/14 | 85% |
| **5/17군 (대량 회수 필요)** | ar.js | 487.1 | 5/17 | **43%** ★ 절반 |
| | hi.js | 492.7 | 5/17 | **44%** ★ 절반 |
| | pt.js | 478.1 | 5/17 | **42%** ★ 절반 |
| | ru.js | 487.5 | 5/17 | **43%** ★ 절반 |

### 1-3. ko.js leaf 수치
- 현재: **20,118** (135차 종결, +285 from 135차 시작)
- ja.js leaf: 23,220 (변동 없음, 정답)
- zh.js leaf: 19,409 (변동 없음, 보조 정답)
- **다른 12개 언어 leaf count 미측정 — 136차 1순위 raw 측정 필수**

### 1-4. 인계서 / 도구 위치
- 인계서: `D:\project\GeniegoROI\NEXT_SESSION.md`
- 작업 도구: `D:\project\GeniegoROI\session{125,128,129,130,131,132,133,134,135}_*.py`

---

## 2. 핵심 검증자산 (N-13: 무변경 재사용)

**검증 모체** (import 전용): `session125_recover_safestub_jazh` (build_leaf_paths, _ko_suspect, KO_CONTAMINATED 등)

**128~134차 자산**: 134차 인계서 § 2 참조

**135차 신규 도구 (9개)**
- `session134_apply_new_keys.py` ★★★ (134차, 135차 5회 무결 사용 — depth-aware, ja/zh boundary)
- `session135_extract_cat_a_v5.py` ★ cat_a 130건 v5 매칭 (98%)
- `session135_apply_cat_a_final.py` ★ v5 + USER_OVERRIDE 통합
- 진단 도구 6개 (absent/cat_a/e3/skip_parents/backup/candidates)

**135차 CSV/TXT (20개+)**: s135_user_ALL_final.csv (201), s135_user_absent_final.csv (47), s135_e3_user_review.csv (18), s135_cat_a_user_review.csv (130), s135_cat_a_apply.csv (129) 등

**★★★ 136차 신규 작성 필요 도구**:
- **`session136_diag_all_locales.py`** — 15개 언어 leaf count + key path 일치도 raw 측정
- **`session136_propagate_keys.py`** — ko 신규 키 → 14개 언어 propagation (boundary check 확장)
- **`session136_translate_dict.py`** — ja/zh 사전을 en/es/fr/de/th/vi/id/zh-TW/ar/hi/pt/ru 12개로 확장

---

## 3. 완료 커밋 (HEAD = 0008b33 + 인계 amend)

| 커밋 | 내용 | +leaf |
|---|---|---:|
| 0008b33 | docs(handover): session 135 -> 136 (인계 — N-116 amend 필요) | — |
| fb1413c | i18n(s135-cat_a) add ko leafs from only_b cat_a recoverable | +45 |
| ee6ab7f | i18n(s135-e3) add 17 more ko leafs (E3 NEEDS_TRANS batch) | +15 |
| 6cea1d1 | i18n(s135-e3) add 1 new ko leaf (partial) | +1 |
| 0be30c8 | i18n(s135-absent) add 33 new ko leafs from active absent | +23 |
| 9506c38 | i18n(s135) apply user-confirmed ko_final 201 leafs | +201 |
| 16340be | docs(handover): session 134 -> 135 | — |

- **135차 누적**: 5 작업 commit + 1 인계 = **+285 leaf** ★ 신기록 (134차 +32의 8.9배)
- **전체 누적 ko**: 6,548 + 132차 58 + 133차 35 + 134차 32 + 135차 285 = **6,965건**
- **★주의**: 위 누적은 ko 만 — 다른 14개 언어 회수 누적 미측정
- node --check ja/zh/ko = 0. ko.js tracked. origin 대비 push 미실행.

---

## 4. 135차 핵심 발견 (N-105 ~ N-116)

### N-105 — ★★★ 단일 차수 +285 leaf 신기록 (134차의 8.9배)
1순위 v3 (+201) + 2순위 absent (+23) + 5순위 E3 (+16) + 6순위 cat_a (+45) = +285.
운영원칙 0-1 + 0-3 완전 실증.

### N-106 — ★★★ 사용자 파일 덮어쓰기 검증 필수
E3 1차에서 사용자 파일 미덮어쓰기로 16건 손실, 2차 복구. 검수자가 outputs 전달 시 사용자 폴더 덮어쓰기 raw 검증 필수.

### N-107 — Windows grep 부재
`grep -r` Windows 부재. Python `os.walk + 메모리 substring` 대체 표준화.

### N-108 — leaf_key quoted false positive
absent 308 검증 시 leaf_key quoted 308/308 매칭 = 다른 namespace 의 동명 키. 진짜 신호는 full path + parent.path quoted 두 가지.

### N-109 — pages_backup 비활성 영역
absent active 92 중 45건이 pages_backup/* 에서만 호출. 활성 페이지 진입 시까지 보류.

### N-110 — ★ PASSTHROUGH 패턴 정착
ja/zh 값이 이미 한국어인 경우 그대로 ko 로 사용. 135차 6순위 v4 일반화 → PASS_ZH 9건 자동 적용.

### N-111 — ★★ 사전 다단계 보강 패턴
v1 10% → v2 33% → v3 53% → v4 82% → v5 98%. raw 결과 보고 단계적 보강.

### N-112 — apply-time dup 안전장치 정상 작동
cat_a apply 시 pages.colChannel 등 6건이 사전 검증 통과했지만 apply 직전 dup 발견 → SKIP.

### N-113 — only_B cat_a 8.4% 매칭률
1,540건 중 active union (full + parent.dyn) = 130건 (8.4%). cat_a 130 → apply +45.

### N-114 — sidebar.version 줄바꿈 한계
ja=`収益 + リスク + ガバナンス\n決済OS·v423.0.0`. 줄바꿈 인용 처리 한계, 종류 1 준함.

### N-115 — ★★★ 사용자 수정 우선 채택 원칙
사용자 수정 3건 모두 검수자 추천보다 양질:
- reviews.allSentiments: '모든 감정' → '리뷰 전체 감성' (도메인 표준)
- marketing.csAiOpt3: '...된 소재는' → '...사용한 소재는' (의미 명확)
- sidebar.upgrade: '업그레이드 ▸' → '업그레이드' (UI 컨벤션)

### N-116 — ★★★★★ 검수자 좌표 누락 발견 — 15개 언어 자산 (최대 발견)
135차 종결 직전, 사용자 질문 "15개국 언어 작업 맞나?" 가 raw 검증 촉발. raw 확인 결과:
- locale 폴더에 **15개 언어 .js 파일** 존재
- 134/135차 인계서가 `{ko,ja,zh}.js` 3개만 명시 → 검수자가 14개+ 추가 언어 자산 미인지
- ja 1,126 KB 정답군 / ko 986 KB (87%) / **나머지 12개 언어 5/14~5/17 동기화 후 ko +285 미반영**
- ar/hi/pt/ru 4개는 ja 대비 43% (절반 크기) = 대량 회수 필요
- **사용자 명시: "어설프게 몇 개국 언어 누락하고 진행하면 오류 확률 높음"**
- 배포 운영 중인 i18n 시스템에서 누락은 런타임 에러 / 영문 키 노출 / 일관성 깨짐 유발

**후속 영향**:
- 운영원칙 0-2 (raw 재확인) 강화 — locale 폴더 전체 .js 매 차수 시작 시 raw 필수
- 운영원칙 0-11 신설 — 15개 언어 무결성 원칙
- 백로그 전면 재구성 — 136차 1순위 = 15개 언어 propagation
- 도구 확장 — boundary check 가 ja/zh → 15개 전체로 확장
- **ko 87% 완성 ≠ 전체 i18n 완성** (이전 차수의 완성도 인식 모두 ko 기준)

**교훈**: 인계서는 신뢰 기반이지만 좌표/대상 정보는 raw 검증으로 반드시 보완. 사용자 질문은 검수자가 놓친 신호의 핵심 발견 기제.

---

## 5. 잔여 백로그 (★전면 재구성 — N-116 반영)

### 5-A. ★★★ 136차 1순위 — 15개 언어 propagation (N-116 직접 후속)

**Step 1 — 15개 언어 raw 측정 (선행 필수)**
- 각 언어 leaf count, key path set, ko/ja 대비 차집합
- 도구: `session136_diag_all_locales.py` (신규 작성)

**Step 2 — ko 변경분 propagation 전략 결정**
- 옵션 A: ko 신규 키 path 만 다른 언어에 추가 (값은 영문 fallback 또는 ja/zh 사용)
- 옵션 B: ko 변경분 + 번역값 완성 (각 언어별 사전 보강 + LLM 보조)
- 사용자 결정 필수

**Step 3 — propagation 도구 작성**
- `session136_propagate_keys.py` — ja/zh boundary 를 15개 전체로 확장
- depth-aware 매칭, leaf 중복, ambiguous 차단 (134차 패턴 확장)
- 백업 자동, 실패 시 롤백
- dry/apply 분리

**Step 4 — 우선순위 결정**
- ★ 5/14군 (en/es/fr) — 가장 정렬 양호, 우선 처리
- ★ 5/16군 (th/vi/id/de/zh-TW) — 두 번째
- ★ 5/17군 (ar/hi/pt/ru) — 대량 회수, 후순위 또는 별도 차수

### 5-B. 종류 2 (선행 부재 — ko 영역 잔여)

- **only_B 잔여 88건** (135차 cat_a 130 외, 진짜 신규 233-130=103 분석 필요)
- **absent 308 옵션 B 우회** (133차 N-84, 134차 N-103)
- **multi-value dataProduct.* 영역** (5-A, 도구 작성 시간 큼)
- **SAFE_DICT v6 보강** (가성비 점진 감소)

### 5-C. 종류 1 (회수 불가 확정)

- p1 588 / absent 216 dead / cat_a 1085 dead / sidebar.version 줄바꿈 / E3 NO_SOURCE 23
- truly_new with ja 121 / marketing R1 bad 12 / 3중 교집합 144 / gSug 14

### 5-D. 독립 과제

- **5-1 #3 성과허브**: ko 464키 신규작성 선행
- **5-4 push**: origin 대비 미실행. 누적 미push:
  - 128차 4커밋, 인계 8개, 129차 1, 132차 1, 133차 1, 134차 3, 135차 5
  - 사용자 명시 승인 시에만

---

## 6. 135차 무결성 raw 확정

### 6-1. ko.js / ja.js / zh.js 상태
- node --check 3개 모두 0
- ja.js / zh.js byte-level 무변경 (5차례 boundary check PASS)
- ko.js: 19833 → 20034 → 20057 → 20058 → 20073 → 20118 (+285)

### 6-2. ★15개 언어 raw 무결성 (135차 종결 시점)
- ja: 1,126.6 KB (정답)
- ko: 986.5 KB (작업)
- zh: 849.5 KB (정답)
- **12개 언어 (5/14~5/17): 487~1,049 KB — 동기화 미실시 상태 확정**
- **node --check 미수행 (12개 언어) — 136차 시작 시 raw 필수**

### 6-3. 135차 작업커밋 raw

| 커밋 | 영역 | +leaf |
|---|---|---:|
| 9506c38 | NEEDS_TRANS 201 v3 user-confirmed | +201 |
| 0be30c8 | absent active 33 RECOMMEND | +23 |
| 6cea1d1 | E3 reportBuilder.allChannels (partial) | +1 |
| ee6ab7f | E3 NEEDS_TRANS 15 leafs (complete) | +15 |
| fb1413c | cat_a recoverable 45 leafs | +45 |
| **합계** | | **+285** |

### 6-4. 사용자 작업 시트 (135차 누적)
| 시트 | rows | 상태 |
|---|---:|---|
| s135_user_ALL_final.csv | 201 | ✅ |
| s135_user_absent_final.csv | 47 | ✅ (33 적용) |
| s135_e3_user_review.csv | 18 | ✅ (16 적용) |
| s135_cat_a_user_review.csv | 130 | ✅ (45 적용) |

### 6-5. 도구 검증
- `session134_apply_new_keys.py`: 5회 apply 모두 PASS, dup SKIP 안전장치 정상 (N-112)
- 백업 5개 보존

---

## 7. 136차 실행 로드맵 (★★★ 우선순위 — N-116 반영, 이 순서대로)

**0단계 — 시작 시 raw 재확인 (필수 확장)**
**★확장 사항**: 15개 언어 전체 raw 표시. node check 는 ja/zh/ko 우선, 나머지 12개는 1순위 Step 1 에서 수행.

**★★★ 1순위 — 15개 언어 propagation (N-116 직접)**

Step 1: `session136_diag_all_locales.py` 작성 + 15개 언어 raw 측정
Step 2: 사용자에게 propagation 전략 결정 요청 (옵션 A: path 만 / 옵션 B: 번역값 완성)
Step 3: `session136_propagate_keys.py` 작성 (ja/zh boundary → 15개 전체)
Step 4: 5/14군 (en/es/fr) 우선 propagation → dry → apply → commit
Step 5: 5/16군 (th/vi/id/de/zh-TW) propagation
Step 6: 5/17군 (ar/hi/pt/ru) 대량 회수 (별도 차수 가능)

**예상 결과**: 12개 언어 × 평균 +200~285 leaf = **수천 leaf 회수 가능**

**★ 2순위 — ko 잔여 only_B 영역** (cat_a 외 103건)

**★ 3순위 — absent 308 옵션 B 우회 검증**

**★ 4순위 — multi-value dataProduct.* 영역**

**★ 5순위 — SAFE_DICT v6 보강**

**진행 불가 시**: 각 순위에서 raw 부재/불가 입증 후 다음 순위 전환 (0-3).
작업 여력 있는 한 다음 차수로 미루지 말고 진행 (0-1).

---

## 8. 종결 절차 (사용자 승인 후에만)

종결 요약 보고 → 사용자 승인 → 검수자가 NEXT_SESSION.md 전체 작성(기존 삭제 후 전체 붙여넣기) → 사용자 저장 → CC 명령으로 차수 인계 커밋:
`t git add NEXT_SESSION.md; git commit -m "docs(handover): session 136 -> 137"; git log --oneline -3`

※ 사용자 명시 지시 (반드시 계승):
- 작업 여력 있는 한 다음 차수로 미루지 말고 끝까지 진행 (132차 강화 0-1, 135차 +285 신기록)
- 사용자 작성분 받으면 그 차수 안에 apply 까지 완결
- 미측정 축 계속 발굴·진행 (★135차 N-116 직접 — locale 폴더 raw 확인 누락 사례)
- 불가작업엔 매달리지 말고 전환 (0-3)
- 종류1/종류2 구분으로 무엇이 선행돼야 가능한지 명시 (0-4)
- 선택지 제시 시 검수자 추천 1개 반드시 명시
- 도구는 검수자가 작성 (CC 자체작성 금지)
- 사용자가 ko 결정하는 영역은 추측원복 절대 금지 (N-17/N-25/N-37/N-58/N-65)
- CC 자동 명령은 거부 응답 대신 다음 `t` 명령으로 덮어쓰기 (N-81)
- ko 전용 안전 도구로만 apply (ja/zh propagation 도구 사용 금지) (N-79)
- **★★★ 15개 언어 무결성 원칙 (N-116, 사용자 명시) — 어설프게 몇 개국 언어 누락하고 진행 금지**
- **★ 매 차수 시작 시 locale 폴더 전체 .js raw 확인 필수 (운영원칙 0-2 확장)**
- 신규 키 추가는 `session134_apply_new_keys.py` (ko) — 다른 언어는 136차에서 도구 작성
- 검수자 추천 + 사용자 검토 워크플로우 (N-76, 134차 N-104, 135차 N-115 사용자 수정 우선)
- only_b 영역 작업 시 코드 호출 grep 검증 선행 (N-93)
- 사용자 파일 덮어쓰기 검증 필수 (N-106)
- PASSTHROUGH 패턴 적용 (N-110)
- 사전 다단계 보강 패턴 (N-111)
- 초엔터프라이즈급 정밀도 유지

---
*(135차 검수자 작성 ★N-116 amend. 모든 수치 raw 확정. 136차는 시작 시
locale 폴더 전체 .js 재확인 후 진행. 135차 작업커밋 5건 (+285 leaf, 19833→20118),
도구 9개 + CSV/TXT 20개+. 누적 6,965건 ko 회수 (단일 차수 +285 신기록, 134차 +32의 8.9배).
★★★ N-105 +285 신기록, ★★ N-106~N-115, ★★★★★ N-116 15개 언어 자산 발견 (최대).
ko 87% 완성 ≠ 전체 i18n 완성 — 14개 언어 propagation 필수.
ar/hi/pt/ru 4개는 ja 대비 43% 절반 크기 = 대량 회수 필요.
사용자 명시: "어설프게 몇 개국 언어 누락하고 진행하면 오류 확률 높음" — N-116 후속 원칙 0-11 신설.
136차 1순위: 15개 언어 propagation (Step 1~6). 도구 신규 작성 필수.)*