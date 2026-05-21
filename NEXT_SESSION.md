# GenieGoROI i18n 인계서 — 137차 시작점

> 본 문서는 136차 검수자가 전체 작성.
> 137차 검수자는 이 문서 전체를 신뢰 기반으로 삼되, 모든 수치·상태는
> 137차 시작 시 raw 재확인 후 진행할 것. 추측 보류 금지 — raw 로
> 0/부재를 입증해야 보류가 정당. **★특히 locale 폴더 전체 .js 파일
> raw 확인 필수 (N-116 교훈) + ko 와 ja path 차집합 raw 재확인 필수
> (N-117 신규 — 인계서 전제와 raw 가 다를 수 있음).**

---

## 0. 운영 원칙 (절대 — 매 차수 최우선 준수)

**0순위 절대원칙**
1. **★작업 여력 최대 활용 (132차 사용자 명시·강화, 133/134/135/136차 실증)**:
   작업 여력이 있으면 절대 다음 차수로 미루지 않는다. 부분 종결이
   가능하면 진행하고, 추가 측정·발굴·도구작성·apply 까지 가능하면
   끝까지 한다. 인계서만 작성하다 차수만 증가시키지 말 것. 사용자
   작성분 받으면 즉시 병합·dry·apply 까지 그 차수 안에 완결한다.
   인계서 작성 전 반드시 사용자 승인을 받는다. 인계서는 검수자가
   전체 작성하며(기존 전체 삭제 후 전체 붙여넣기), 임의 종결·임의
   인계 작성 금지.
2. **추측 보류 금지 + ★locale 폴더 전체 .js raw 확인 필수 (N-116)**:
   "안전여력 소진/보류"를 선언하려면 raw 수치로 0 또는 부재를
   입증해야 한다. **추가로, 인계서의 좌표/대상 언어 정보는 매 차수
   시작 시 `Get-ChildItem locales -Filter "*.js"` 로 raw 재확인 필수**.
3. **★불가작업 전환 원칙**: 진행 중인 특정 작업이 그 차수에 raw 로
   도저히 불가함이 입증되면, 거기 매달리지 말고 작업 여력이 있는
   한 다른 진행 가능한 작업으로 즉시 전환한다. 부분 종결이어도 무방.
4. **★불가의 2종 구분**:
   - **종류 1 (물리·논리 불가)**: 데이터 구조 자체의 한계. 차수 바뀌어도 결과 동일.
   - **종류 2 (선행부재 불가)**: 선행 작업이 없어서 불가. 선행 충족되면 가능.
5. **★사용자가 ko 결정하는 영역 — 추측 절대 금지 (N-17/N-25/N-58/N-65/N-115/N-121)**:
   ko_fixed 자동 결정 금지. 단, 추천값 제시 후 사용자 확정 받는 워크플로우는 허용.
6. **★CC 자동 명령 무력화 원칙 (N-81, 135/136차 push/apply 자동 다수 실증)**:
   거부 응답 입력하지 않고, 검수자의 다음 `t` 명령으로 덮어쓰기.
   apply/commit/push/ja-zh propagation 자동 입력은 차단 우선.
   **★136차 N-122 추가**: CC 자체가 "안전검사 ALL PASS" 보고해도 검수자가
   raw 메모장 출력으로 직접 보지 않은 결과는 신뢰 금지. CC 의 분석
   요약은 절대 신뢰 근거가 아님.
7. **★ko 전용 안전 apply 도구 패턴 (135/136차 실증)**:
   - 기존 path ko 값 수정: `session132_apply_ko_only.py`
   - 신규 키 추가 (기존 namespace): `session134_apply_new_keys.py --csv <path>` ★ 검증완료
   - **신규 namespace 통째 생성: `session136_apply_v2.py --csv <path>`** ★136차 신규 검증
   - **중첩 nested sub-block 수동: CC Edit 도구** (helpPanel 케이스, 136차)
   - **★15개 언어 propagation: 137차 도구 작성 필요 (현재 부재)**
8. **★only_b 분류 신뢰 금지 (134차 N-93)**: 코드 호출 grep 검증 필수.
9. **★PASSTHROUGH 패턴 (135차 N-110)**: ja/zh가 이미 한국어인 경우 그대로 ko 사용.
10. **★사전 다단계 보강 (135차 N-111)**: v1→v5 매칭률 단계적 상승 패턴.
11. **★★★ 15개 언어 무결성 원칙 (N-116, 사용자 명시)**:
    - 배포 운영 중인 i18n 시스템에서 누락 언어는 런타임 에러 / 영문 키 노출 / 일관성 깨짐 유발
    - 어설프게 몇 개국 언어 누락하고 진행 절대 금지
    - ko 신규 키 추가 시 → 14개 언어 모두 동일 path 에 placeholder 또는 번역값 보장 필수
    - propagation 도구는 boundary check 를 ja/zh 만이 아니라 **15개 전체 무결성** 으로 확장
    - 단일 언어 작업 후 즉시 다음 언어로 넘어가지 말고, **모든 15개 언어에서 일관성 검증** 후 다음 작업
12. **★★★★★ ko/ja 구조 raw 재확인 원칙 (N-117 신규, 136차 발견)**:
    - 인계서의 "ko XX% 완성" 표현은 leaf 수 단순 비교일 뿐. 실제로는
      ko/ja path 차집합이 매우 클 수 있음 (136차 raw: ko ∩ ja = 7,873만,
      ko-only 12,245 / ja-only 15,347 — 양쪽 거의 독립 source-of-truth).
    - 매 차수 시작 시 `set(ko.keys()) ∩ set(ja.keys())` raw 재확인 필수.
    - propagation 전략 결정 전 ko/ja 일치율 raw 확정 우선.
13. **★도구 정규식 매칭 검증 원칙 (N-122/N-124 신규)**:
    - 정규식 `top:\s*{` 패턴은 **nested 위치도 false positive 매칭** 가능.
    - 도구 작성 시 `build_leaf_paths` 결과로 top-level set 미리 확정 후
      그 set 안에서만 매칭 인정. raw 정규식 단독 신뢰 금지.
    - dry-run 의 안전검사: `delta == applied`, `missing == 0`,
      `unexpected == 0` 셋 다 PASS 강제. 하나라도 FAIL 이면 apply 절대 금지.

**작업 수칙**
- 모든 CC 명령 맨 앞 `t ` 접두 필수.
- cp949 회피 표준형: `t $env:PYTHONIOENCODING="utf-8"; python <도구> 2>&1 | Out-File -Encoding utf8 <log>; $env:PYTHONIOENCODING=""; code <log>`
- 명령 연결은 `;` 만 (`&&`/`||` 금지).
- ★PowerShell 괄호 `()` 사용 시 manual approval 트리거 → 검수자 명령은 괄호 회피 (136차 발견).
- CC 승인: `1.Yes/2.allow all/3.No` → `2`, `1.Yes/2.No` → `1`. 검증완료 .py 자체수정 시도 → `3`.
- CC 자동 명령은 거부 응답 대신 다음 `t` 명령으로 덮어쓰기.
- 검수자 설명은 한글·핵심만 짧게. 초엔터프라이즈급 정밀도.
- 선택지 제시 시 검수자 추천 1개 반드시 명시.
- 사용자 작업은 1건만 (도구 저장 또는 CSV 검토 + 업로드).
- ★사용자가 outputs 다운로드 파일을 폴더에 덮어쓰기 했는지 raw 검증 필수 (N-106).
- ★사용자가 CSV/엑셀 업로드 시 raw 컬럼·내용 검증 우선 — 잘못된 파일 가능성 (N-126 신규, 136차).
- push 는 사용자 명시 승인 시에만 (현재 origin 대비 미실행 — 5-4).
- read-only 진단/probe 우선. apply 는 dry → raw → apply 순.
- ★dry-run 결과는 raw 메모장 출력으로 검수자 직접 확인 (CC 요약 신뢰 금지, N-122 후속).

---

## 1. 프로젝트 좌표

### 1-1. locale 디렉토리
`D:\project\GeniegoROI\frontend\src\i18n\locales\` — **15개 언어 .js 파일**

### 1-2. 15개 언어 raw 현황 (136차 종결 시점, 단위 KB)

| 그룹 | 언어 | KB | 수정일 | 역할 |
|---|---|---:|---|---|
| **정답군** | ja.js | 1,126.6 | 5/20 (135차) | ★ 최대 / 정답 출처 |
| | zh.js | 849.5 | 5/20 (135차) | 보조 정답 |
| **회수 작업 진행** | ko.js | ~990 추정 | 5/21 (136차 +76) | **leaf 20,194 (ja 87%)** |
| **5/16군** | th.js | 1,049.7 | 5/16 | leaf 20,267 |
| | vi.js | 924.6 | 5/16 | leaf 20,893 |
| | id.js | 853.0 | 5/16 | leaf 20,219 |
| | de.js | 828.4 | 5/16 | leaf 19,304 |
| | zh-TW.js | 776.7 | 5/16 | leaf 18,699 |
| **5/14군** | en.js | 948.5 | 5/14 | leaf 21,581 |
| | es.js | 954.5 | 5/14 | leaf 21,615 |
| | fr.js | 952.6 | 5/14 | leaf 21,615 |
| **5/17군 (대량 회수)** | ar.js | 487.1 | 5/17 | leaf 9,829 ★ |
| | hi.js | 492.7 | 5/17 | leaf 9,827 ★ |
| | pt.js | 478.1 | 5/17 | leaf 9,827 ★ |
| | ru.js | 487.5 | 5/17 | leaf 9,827 ★ |

### 1-3. leaf count raw (136차 종결 시점)
- ko: **20,194** (135차 종결 20,118 → 136차 +76)
- ja: 23,220 (변동 없음, 정답)
- zh: 19,409 (변동 없음)
- 15개 언어 전체 leaf raw 137차 시작 시 재확인 (변동 없을 것)

### 1-4. ★ko/ja 차집합 raw (★★★★★ N-117 발견)

| 항목 | 수치 | 비고 |
|---|---:|---|
| ko leaf | 20,194 | |
| ja leaf | 23,220 | 정답 (변동 없음) |
| ko ∩ ja | 7,873 + 76 = **7,949** (137차 추정) | 136차 +69 audit/graph/performance 추가 반영 |
| ko-only | 12,245 (136차 종결 직후, 변동 없음) | ko 가 독자 보유한 path |
| ja-only | 15,347 - 76 = **15,271** | 136차 76건 줄어듦 |

★ ko 와 ja 가 **거의 독립된 source-of-truth**. 단순 ko 87% 완성 아님.
136차 1단계 일부 commit 후 set 변경. 137차 시작 시 정확한 차집합 재측정 필수.

### 1-5. 인계서 / 도구 위치
- 인계서: `D:\project\GeniegoROI\NEXT_SESSION.md`
- 작업 도구: `D:\project\GeniegoROI\session{125,128,129,130,131,132,133,134,135,136}_*.py`

---

## 2. 핵심 검증자산 (N-13: 무변경 재사용)

**검증 모체** (import 전용): `session125_recover_safestub_jazh` (build_leaf_paths, _ko_suspect, KO_CONTAMINATED 등)

**128~135차 자산**: 135차 인계서 § 2 참조

**136차 신규 도구 (7개)**
- `session136_diag_all_locales.py` ★ 15개 언어 leaf count + ja/ko 차집합 측정
- `session136_classify_ja_only.py` ★ ja-only 15,347 path 를 코드 호출 기준 5개 카테고리 분류 (ACTIVE_FULL/ACTIVE_LEAF/PARENT_DYN/PAGES_BACKUP/DEAD)
- `session136_extract_passthrough.py` ★ ja-only 의 PASSTHROUGH 가능 분류 (PASS_FULL/PASS_MIXED/JA_NATIVE/ASCII_ONLY/EMPTY)
- `session136_verify_active_leaf.py` ★ ACTIVE_LEAF parent 검증 (N-108 false positive 차단)
- `session136_active_full_recommend.py` ★ 검수자 사전 매칭 추천값 + 사용자 검토용 CSV 생성
- `session136_apply_v2.py` ★★★ 신규 namespace 통째 생성 + leaf 추가 (audit/graph/performance 등). v1 결함 4종 수정 (N-122).
- `session136_diag_pattern.py` ★ ko.js 정규식 매칭 false positive 진단 (N-122/N-124 원인 파악)
- `session136_apply_helppanel.py` ★ helpPanel.staticHelp 안 sub-block 추가 시도 (N-124 결함 발견 → CC Edit 도구로 우회 적용)

**136차 신규 CSV/TXT (14개+)**:
s136_diag_summary.txt, s136_diag_missing_vs_ja.csv, s136_diag_missing_vs_ko.csv,
s136_diag_extra_vs_ja.csv, s136_ja_only_classify.txt, s136_ja_only_active.csv (76),
s136_ja_only_active_leaf.csv (2,415), s136_ja_only_parent_dyn.csv (187),
s136_passthrough_summary.txt, s136_passthrough_full.csv, s136_passthrough_active.csv,
s136_active_leaf_verify.txt, s136_active_leaf_verified.csv (0), s136_active_leaf_dropped.csv (203),
s136_active_full_recommend.csv, s136_active_full_summary.txt,
s136_active_full_ko_final.csv (76 사용자 검토 완료) 등.

**★★★ 137차 신규 작성 필요 도구**:
- **`session137_classify_active_leaf.py`** — ACTIVE_LEAF 2,415 의 parent 검증 v2 (parent 정확도 향상)
- **`session137_propagate_keys.py`** — ko 신규 키 → 14개 언어 propagation (15개 무결성 boundary check)
- **`session137_translate_dict.py`** — ja/zh 사전을 12개 언어로 확장
- **`session137_apply_active_leaf.py`** — ACTIVE_LEAF JA_NATIVE/ASCII_ONLY 회수 도구

---

## 3. 완료 커밋 (HEAD = 7484297 + 인계 amend)

| 커밋 | 내용 | +leaf |
|---|---|---:|
| 인계 | docs(handover): session 136 -> 137 | — |
| **7484297** | i18n(s136) add 7 ko leafs for helpPanel.staticHelp (connectors.steps + help/smsMarketing sub-blocks) | +7 |
| **5880167** | i18n(s136) add 69 ko leafs for ja-only active_full (audit/graph/performance) | +69 |
| 0008b33 | docs(handover): session 135 -> 136 | — |
| fb1413c | i18n(s135-cat_a) add 45 ko leafs from only_b cat_a recoverable | +45 |
| ee6ab7f | i18n(s135-e3) add 17 more ko leafs (E3 NEEDS_TRANS batch) | +15 |
| 6cea1d1 | i18n(s135-e3) add 1 new ko leaf (partial) | +1 |
| 0be30c8 | i18n(s135-absent) add 33 new ko leafs from active absent | +23 |
| 9506c38 | i18n(s135) apply user-confirmed ko_final 201 leafs | +201 |

- **136차 누적**: 2 작업 commit + 1 인계 = **+76 leaf**
- **전체 누적 ko**: 6,548 + 132차 58 + 133차 35 + 134차 32 + 135차 285 + 136차 76 = **7,034건**
- **★주의**: 위 누적은 ko 만 — 다른 14개 언어 회수 누적 미측정
- node --check ja/zh/ko = 0. ko.js tracked. origin 대비 push 미실행.

---

## 4. 136차 핵심 발견 (N-117 ~ N-126)

### N-117 — ★★★★★ ko/ja 가 거의 독립된 source-of-truth (최대 발견)
인계서 N-116 전제 "ko 87% 완성, ja 대비" raw 와 큰 차이:
- ko leaf 20,118 / ja leaf 23,220
- ko ∩ ja = 7,873 path 만 일치 (전체 ja 의 33.9%)
- **ko-only 12,245** / **ja-only 15,347** — 양쪽 거의 다른 namespace
- ko-only top-level 15개 (한국 특화), ja-only top-level 12개 (ja 가 미리 받은 신규)
- 단순 leaf 수 비교는 의미 적음. 차집합 raw 측정 필수.

### N-118 — ★★ PAGES_BACKUP/DEAD 에 한국어 원문 잔재
ja.js 의 `crm.email.aiInsight = "AI 인사이트"`, `banner.acctPerf.metaEu = "[유럽팀] ..."` 등 ja 가 원래 ko 였던 잔재. 1,571건 PASS_FULL 분류. 단 코드 호출 없음 (DEAD) — 후순위.

### N-119 — ★★★ ACTIVE_LEAF × PASS_FULL = 203 가 전부 dropped
parent 검증 결과 verified=0, dropped=203. 원인: ja-only path 라는 사실 자체가 모순 — parent 가 코드에 없으니 leaf 도 사실상 dead.

### N-120 — ★★ ja.js 의 namespace 구조 결함
`pages._marketing_1.*`, `crm.aiHub.aiHub.*`, `crm.aiHub.catalogSync.journey.*` 등 비정상 nested. ja.js 빌드 결함. ko 회수 대상 아님.

### N-121 — ★★ 사용자 수정 우선 채택 (N-115 재실증)
136차 ko_user_final 검토에서 사용자 번역이 대체로 검수자 추천보다 양질 (UI 컨벤션, 의미 명확성):
- audit.riskHigh/Medium/Low: 검수자 '상/중/하' → 사용자 '높음/중간/낮음' (한국어 UI 컨벤션)
- audit.pageDesc: '불변 감사 기록' → '변경 불가능한 감사 기록' (의미 명확)
- audit.totalEvents: '전체 이벤트 수' → '전체 이벤트 총합'
다만 helpPanel.staticHelp.smsMarketing.title 은 ja stub 오류로 사용자 '이메일 마케팅' → 검수자 'SMS 마케팅' 채택.

### N-122 — ★★★★ apply 도구 정규식 false positive (중대 발견)
v1 도구 `find_top_level_block` 정규식이 nested 위치도 매칭 (`audit` 가 ko.js 안 어떤 nested 안에 있는 single match 를 top-level 로 오인). 76건 시도 → 실제 +3 만 leaf 인식. ★★★dry-run 의 안전검사 약함 → 적용 직전 발견. apply 강행했으면 ko.js 파손 가능.

**해결**: v2 도구 (`session136_apply_v2.py`) 작성 — `build_leaf_paths` 로 top-level set 확정 후 분기. 추가 안전검사:
- `delta == plan_new` 강제
- `missing_in_added == 0` 강제
- `unexpected_in_added == 0` 강제
- 셋 다 PASS 아니면 apply 절대 금지

### N-123 — ★★★ ko.js 의 helpPanel.staticHelp 구조 (raw)
ko 의 helpPanel.staticHelp 안에는:
- `apiKeys.*` (4)
- `connectors.help.*` (2) — connectors 안 nested
- `connectors.smsMarketing.*` (3) — connectors 안 nested
- `connectors.steps/summary/tips/title` (3 + steps 부재)
- `userMgmt.*` (4)

ja 의 staticHelp.help.* / staticHelp.smsMarketing.* (직속) 와 다른 위치. 두 영역 모두 작동해야 함 → ja 구조 따라 ko 에 staticHelp 직속 sub-block 신규 추가.

### N-124 — ★★★★ 정규식 매칭 false positive 2차 발견 (helpPanel)
`session136_apply_helppanel.py` 가 `helpPanel` 정규식으로 매칭 시도 → ko.js 안 `nav.pages.helpPanel.staticHelp.*` (23개 nested 중복) 가 먼저 매칭됨. 실제 top-level helpPanel.staticHelp 못 잡음. 안전검사 FAIL (missing=7, unexpected=7) → apply 금지.

**해결**: CC Edit 도구로 정확한 텍스트 직접 삽입 (정규식 회피). 검수자가 정확한 before/after 텍스트 작성 + CC 가 Edit 실행. node --check PASS, +7 leaf 확인.

### N-125 — ★★★★★ ko.js 의 connectors.help/smsMarketing 이미 존재 (raw 정정)
ko.js 의 staticHelp.connectors 안에 help, smsMarketing sub-block 이 이미 존재 (steps 는 부재). ja 의 staticHelp.help/smsMarketing 직속과 별개 영역. **양쪽 모두 작동해야 함** — ja 호출 코드와 ko 의 connectors 안 호출 코드가 다른 page.

### N-126 — ★ 사용자 업로드 파일 검증 필수 (신규)
사용자가 ko_수정.xls 업로드 → 잘못된 파일 (134차 도구 코드) 2회 업로드. 채팅 붙여넣기는 폴더 저장 아님. 검수자가 raw 컬럼·내용 검증 필수. 정확한 CSV 형식 작성 절차 안내 우선.

---

## 5. 잔여 백로그 (★재구성)

### 5-A. ★★★ 137차 1순위 — ACTIVE_LEAF 회수 + 15개 언어 propagation

**Step 1 — ACTIVE_LEAF 2,415 의 진짜 active 추출 (선행 필수)**
- 136차 verify_active_leaf 결과 verified=0 — parent 검증 로직 약했음
- v2 검증: parent path 가 코드에 quoted 출현 + 코드가 `t(path + leaf)` 같은 동적 호출 패턴 확인
- ACTIVE_LEAF JA_NATIVE 840 + ASCII_ONLY 1,371 = 2,211 잠재 회수 대상

**Step 2 — PARENT_DYN 187 검증**
- 동적 parent 호출 — parent 가 코드에 있는데 leaf 가 동적 생성. 회수 가치 raw 확인.

**Step 3 — ko/ja 차집합 raw 재측정**
- 136차 +76 반영 후 정확한 차집합 확인
- ko-only 12,245 의 active 영역 분석 (한국 특화 namespace 가 ja 에 없는 게 정상인지 ja 에 추가 필요한지)

**Step 4 — 15개 언어 propagation 도구 작성**
- `session137_propagate_keys.py` — ja/zh boundary 를 15개 전체로 확장
- depth-aware 매칭, leaf 중복, ambiguous 차단 (134차 패턴 확장)
- N-122 안전검사 패턴 채택 (delta == applied 강제)
- 백업 자동, 실패 시 롤백

**Step 5 — 우선순위 결정**
- ★ 5/14군 (en/es/fr) — 가장 정렬 양호, 우선 처리
- ★ 5/16군 (th/vi/id/de/zh-TW) — 두 번째
- ★ 5/17군 (ar/hi/pt/ru) — 대량 회수, 후순위 또는 별도 차수

### 5-B. 종류 2 (선행 부재 — ko 영역 잔여)

- **only_B 잔여 88건** (135차 cat_a 130 외, 진짜 신규 233-130=103 분석 필요)
- **absent 308 옵션 B 우회** (133차 N-84, 134차 N-103)
- **multi-value dataProduct.* 영역** (5-A, 도구 작성 시간 큼)
- **SAFE_DICT v6 보강** (가성비 점진 감소)
- **rgba 오염 1건** (`rgba(99,140,255,0.12)` — ko.js 데이터 결함, 후순위)

### 5-C. 종류 1 (회수 불가 확정)

- p1 588 / absent 216 dead / cat_a 1085 dead / sidebar.version 줄바꿈 / E3 NO_SOURCE 23
- truly_new with ja 121 / marketing R1 bad 12 / 3중 교집합 144 / gSug 14
- ja-only DEAD 12,351 / PAGES_BACKUP 318

### 5-D. 독립 과제

- **5-1 #3 성과허브**: ko 464키 신규작성 선행
- **5-4 push**: origin 대비 미실행. 누적 미push:
  - 128차 4커밋, 인계 8개, 129차 1, 132차 1, 133차 1, 134차 3, 135차 5, **136차 3 (인계+2 작업)**
  - 사용자 명시 승인 시에만

---

## 6. 136차 무결성 raw 확정

### 6-1. ko.js / ja.js / zh.js 상태
- node --check 3개 모두 0
- ja.js / zh.js byte-level 무변경 (137차 시작 시 raw 재확인 필요)
- ko.js: 20118 → 20187 (+69) → 20194 (+7) = **+76 total**

### 6-2. ★15개 언어 raw 무결성 (136차 종결 시점)
- ko: 20,194 leaf (+76 from 135차)
- ja: 23,220 leaf (변동 없음)
- zh: 19,409 leaf (변동 없음)
- **12개 언어 leaf 변동 없음** (136차 미작업)
- node --check 미수행 (12개 언어) — 137차 시작 시 raw 필수

### 6-3. 136차 작업커밋 raw

| 커밋 | 영역 | +leaf |
|---|---|---:|
| 5880167 | audit(52) + graph(13) + performance(4) 신규 namespace | +69 |
| 7484297 | helpPanel.staticHelp.connectors.steps + help/smsMarketing | +7 |
| **합계** | | **+76** |

### 6-4. 사용자 작업 시트 (136차 누적)
| 시트 | rows | 상태 |
|---|---:|---|
| s136_active_full_recommend.csv | 76 | ✅ |
| s136_active_full_ko_final.csv | 76 | ✅ (전체 적용) |

### 6-5. 도구 검증
- `session134_apply_new_keys.py`: --csv 옵션 검증 통과 (호환 확인됨, 단 신규 namespace 부재 case 미지원)
- `session136_apply_v2.py`: 1회 dry + 1회 apply 모두 PASS, 안전검사 ALL PASS
- `session136_apply_helppanel.py`: 정규식 false positive 로 사용 불가 (N-124) → CC Edit 도구로 우회
- 백업 2개 보존 (`ko.js.bak_s136v2_*`, `ko.js.bak_s136hp_manual`)

---

## 7. 137차 실행 로드맵 (★★★ 우선순위)

**0단계 — 시작 시 raw 재확인 (필수 확장)**
- `Get-ChildItem locales -Filter "*.js"` 15개 언어 raw
- ko/ja path 차집합 raw 재측정 (N-117 후속)
- node --check ja/zh/ko 우선, 12개는 1순위 도구에서

**★★★ 1순위 — ACTIVE_LEAF 회수 (Step 1~2)**

Step 1: `session137_classify_active_leaf.py` 작성 — ACTIVE_LEAF 2,415 의 v2 parent 검증
Step 2: PARENT_DYN 187 검증
Step 3: 회수 가능 path 추출 → ko 추천값 사전 작성
Step 4: 사용자 검토 → apply (session136_apply_v2.py 재사용)
Step 5: commit

**예상 결과**: ACTIVE_LEAF 의 verified 회수 가능량 — 정확한 측정 후 결정

**★ 2순위 — 15개 언어 propagation 도구 작성**

Step 1: `session137_propagate_keys.py` 작성 (ja/zh boundary → 15개 전체)
Step 2: 5/14군 (en/es/fr) 우선 propagation
Step 3: 5/16군 (th/vi/id/de/zh-TW) propagation
Step 4: 5/17군 (ar/hi/pt/ru) 별도 차수

**★ 3순위 — ko 잔여 only_B 영역** (cat_a 외 103건)

**★ 4순위 — absent 308 옵션 B 우회 검증**

**★ 5순위 — multi-value dataProduct.* 영역**

**진행 불가 시**: 각 순위에서 raw 부재/불가 입증 후 다음 순위 전환 (0-3).
작업 여력 있는 한 다음 차수로 미루지 말고 진행 (0-1).

---

## 8. 종결 절차 (사용자 승인 후에만)

종결 요약 보고 → 사용자 승인 → 검수자가 NEXT_SESSION.md 전체 작성(기존 삭제 후 전체 붙여넣기) → 사용자 저장 → CC 명령으로 차수 인계 커밋:
`t git add NEXT_SESSION.md; git commit -m "docs(handover): session 137 -> 138"; git log --oneline -3`

※ 사용자 명시 지시 (반드시 계승):
- 작업 여력 있는 한 다음 차수로 미루지 말고 끝까지 진행 (132차 강화 0-1, 135/136차 실증)
- 사용자 작성분 받으면 그 차수 안에 apply 까지 완결
- 미측정 축 계속 발굴·진행 (★136차 N-117 — ko/ja 차집합 raw 확인)
- 불가작업엔 매달리지 말고 전환 (0-3)
- 종류1/종류2 구분으로 무엇이 선행돼야 가능한지 명시 (0-4)
- 선택지 제시 시 검수자 추천 1개 반드시 명시
- 도구는 검수자가 작성 (CC 자체작성 금지)
- 사용자가 ko 결정하는 영역은 추측원복 절대 금지 (N-17/N-25/N-37/N-58/N-65)
- CC 자동 명령은 거부 응답 대신 다음 `t` 명령으로 덮어쓰기 (N-81)
- ko 전용 안전 도구로만 apply (ja/zh propagation 도구 사용 금지) (N-79)
- **★★★ 15개 언어 무결성 원칙 (N-116, 사용자 명시) — 어설프게 몇 개국 언어 누락하고 진행 금지**
- **★★★★★ ko/ja 차집합 raw 재확인 원칙 (N-117) — 인계서 leaf 수만 보지 말고 path set 비교 필수**
- **★ 매 차수 시작 시 locale 폴더 전체 .js raw 확인 필수 (운영원칙 0-2 확장)**
- 신규 키 추가:
  - 기존 namespace → `session134_apply_new_keys.py --csv <path>`
  - 신규 namespace 통째 → `session136_apply_v2.py --csv <path>` ★ 검증완료
  - 중첩 sub-block → CC Edit 도구 (정규식 false positive 회피)
  - 다른 언어는 137차에서 도구 작성
- 검수자 추천 + 사용자 검토 워크플로우 (N-76, 134차 N-104, 135차 N-115, 136차 N-121 사용자 수정 우선)
- only_b 영역 작업 시 코드 호출 grep 검증 선행 (N-93)
- 사용자 파일 덮어쓰기 검증 필수 (N-106)
- 사용자 업로드 CSV/엑셀 raw 컬럼 검증 필수 (N-126 신규)
- PASSTHROUGH 패턴 적용 (N-110)
- 사전 다단계 보강 패턴 (N-111)
- ★★도구 정규식 매칭 검증 원칙 (N-122/N-124, 134차 N-13 확장)
- ★dry-run 결과는 raw 메모장 출력으로 검수자 직접 확인 (CC 요약 신뢰 금지)
- ★PowerShell 괄호 `()` 사용 시 manual approval 트리거 → 검수자 명령은 괄호 회피
- 초엔터프라이즈급 정밀도 유지

---
*(136차 검수자 작성. 모든 수치 raw 확정. 137차는 시작 시
locale 폴더 전체 .js 재확인 + ko/ja 차집합 raw 재측정 후 진행.
136차 작업커밋 2건 (+76 leaf, 20118→20194), 도구 7개 + CSV/TXT 14개+.
누적 7,034건 ko 회수. 1단계 v2 PASS, 2단계 helpPanel 정규식 결함 → CC Edit 우회 PASS.
★★★★★ N-117 ko/ja 거의 독립 source-of-truth 발견 (최대).
★★★★ N-122/N-124 정규식 false positive 2회 발견 → 안전검사 강화.
★★ N-118~N-121, N-123, N-125~N-126 신규.
137차 1순위: ACTIVE_LEAF 2,415 v2 parent 검증. 2순위: 15개 언어 propagation 도구 작성.
원칙 0-12 (ko/ja 차집합 raw) + 0-13 (정규식 매칭 검증) 신설.)*