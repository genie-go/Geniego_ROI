# GeniegoROI i18n 인계서 — 121차 시작점

> 120차 종결 시 전면 재작성 / 페어 모드(검수자 명령 → 사용자가 CC에 t 접두로 전달)
> 상단부터 순서대로. 0순위 먼저.

---

## 0. 운영 방식 (먼저 읽기 — 특히 ★진행 강제 / ★★검수자 추천 강제)

- 기본값: 검수자가 CC에 직접 수정/실행 명령. 신규 .py 본문은 검수자가 산출물 파일로 만들어 전달 → 사용자가 루트에 1회 저장. 진단·git은 CC가 직접.
- **sed·서브식·복합 파이프는 자동승인+Bash변환 반복 유발.** 신규 .py는 검수자 완성본 산출물 → 사용자 1회 저장 → 단순 `python xxx.py 2>&1 | Out-File yyy.txt -Encoding utf8; code yyy.txt` 한 줄. 114~120 안정. apply 한 줄은 `python --apply` + `node --check` Append + `git add/commit` Append 결합형도 안정(120 2건).
- **인라인 `python -c` 다줄 절대 금지**. 진단·소스덤프도 전부 산출물 .py로.
- 모든 CC 명령은 t 접두 한 줄. **분기: ① 단순 `cd; python xxx.py | Out-File`(node --check·git add/commit Append 결합 포함) → "경로 우회 방지" → Yes(정착). ② 임베디드식($()/$LASTEXITCODE)·`python -c` 다줄·`cmd /c`·if/else·복합 다단 파이프 → Esc 후 산출물 .py로 단순화.** (120 0순위 $LASTEXITCODE 명령이 ②에 걸려 echo 마커 단순형으로 우회한 사례 — 임베디드식 회피.)
- **CC 자체 패치 제안은 계속 reject.** 도구는 오직 검수자 산출물. CC 진단 출력(상태/소스 dump)은 채택 가능.
- 검수자 설명 매 턴 핵심만(명령 + 확인 1~2개). raw 우선, CC 요약/제안 절대 불신. **사용자 지시: 검수자 설명 짧게, 핵심만.**
- 환경변수 설정 금지. cp949는 .py 내부 `sys.stdout.reconfigure(encoding="utf-8")`.
- **검증완료 파서 무변경 재사용 절대원칙**: 신규 .py는 session112_inspect_suspect.py 의 `scan_key_blocks`/`extract_kv` 를 **import 무변경 사용**. 키집합/블록/span 자작 파서 금지. **반드시 실모체 소스 dump 로 호출규약 확인 후 도구 작성(아래 3절 모체 실측계약 참조).**
- node --check 판정: **Out-File 결과에 SyntaxError 텍스트 없으면 = PASS**. **빈 출력 PASS 확정 시 echo 마커(`=== node ===` ~ `=== done ===`)로 감싸 명시**(120 확립 — 빈출력을 추정 PASS 처리 금지, 운영규칙 5).
- **컨테이너 초기화 → 검수자는 산출물 전달 전 합성검증 필수.** 합성검증 = 실모체 파서 무변경 미러 import + 실파일 구조 픽스처 + **실제 node --check 교차**(120 N-17 신규 — 파서기반 verify만으로는 JS 문법오류 미검출). 합성검증 통과 + 실파일 dry-run 양쪽 필수.
- **키존재 ≠ 정답, 더미 함정**: `(D−R)−K=0` 만으로 ins 강행 금지. **반드시 ko/ja 값을 raw 교차해 is_dummy 판정**. (119 auto 147 ko더미 / 120 marketing 50 = ko·ja 양쪽 실값 정답 — 양 극단 모두 raw 실측이 정답.)
- **인계서 표기 비관/낙관 오기록 누적 — 항상 raw 실측 우선(N-15·N-18 강화)**: 120 에서 인계서 표기가 raw 와 어긋난 사례 다수 — 2순위 "KO_ABSENT 50 신규번역" → 실측 KO_REAL 50+JA_REAL 50(ins+del 완전종결) / 4순위 "accountPerf 의미충돌 3키" → 실측 정상 일본어(no-op) / 7순위 "settlements ROOT/auth 중복" → 실측 ROOT직속 2중복(priceOpt 동형). **인계서는 출발점일 뿐, raw 가 정답 출처(운영규칙 9·10).**

### ★★ 검수자 추천 강제 규칙 (의사결정 분기 시 — 최우선)
1. **선택지 제시 시 항상 검수자 추천 1개를 명시**하고, 직후 추천 근거를 인계서 규칙 번호로 1~3줄.
2. 사용자가 "검수자 추천대로"/"검수자 추천"이라고만 답해도 즉시 그 선택으로 진행(재질문 금지).
3. 추천은 반드시 인계서 규칙에 근거. **사용자 지시: 항상 검수자 추천 1개 강제.**

### ★ 진행 강제 규칙 (미루기 금지 — 최우선)
1. **raw로 처리방향 확정 즉시 다음 단계 연속.** dry-run→raw확인→apply→node→commit 한 흐름 종결.
2. **부분종결은 "인계서 작성 직전 단 1회"만.** 안전 즉시처리 대상 전부 소진 후. "다음 차수"는 raw로 손상/불완전/오염 입증된 경우만.
3. **한 세션 목표 = 최소 2단계 apply+commit.** (120 = ins50 + dashdel 2커밋 충족.)
4. "추측 금지"는 안전장치 있으므로 속도저하 명분 불가. raw 확정 안전대상 즉시 처리. raw 입증용 진단 1회는 미루기 아님(가드 정당성).
5. 작업 여력 남으면 다음 우선순위 계속. **raw가 손실/불완전/오염 입증 시(복구선행·잔차·이관·2중ROOT·값상이다수) 강행 대신 정밀이관.** (120 5·6·7순위가 이 케이스 — 정밀이관 인계.)
6. 파괴 작업 전 백업·dry-run·검증·이상시 ROLLBACK 절대 생략 금지(속도 무관, 항상). **120 ins50 실패 = 이 규칙이 막아낸 사례(2차 검증 누락분은 N-17로 보강).**

## 1. 컨텍스트

- 작업: i18n 번역 키 동기화. **정답 원본은 ko.js(원본 한국어)**. EN 일부 키명그대로 stub라 ko 우선. ja R 정답언어=일본어, zh R 정답언어=중국어.
- locale: frontend\src\i18n\locales\{lang}.js (15개, ES모듈). 주 대상 ja.js/zh.js. 정답 출처 = ko.js, 참조 = en.js.
- 키는 따옴표 형태. 검증 node --check (SyntaxError 없음=PASS).
- **실측 트리구조**: ja/zh operations[dash] = dash > operations > 섹션. 인계서 표기 ≠ 실제, 항상 검증파서 scan_key_blocks 출력 + span 포함관계로 실측(운영규칙 9).
- **손실0 판정기준(117~120 표준)**: ① D⊆R(키집합) ② R∩D 에서 D정답·R더미=0 ③ D−R 전부 더미/부재. D−R 에 ko/ja 실값 정답 있으면 ins 파생 복구선행 → D⊆R 성립 후 dashdel(120 marketing ja 표준 패턴 = 119 super 재현).

## 2. 운영규칙 (절대준수)

1. 자동승인 → 0의 분기(① Yes / ② Esc 산출물.py화).
2. 한 줄·Windows 경로. 출력 Out-File; code <f>로 원본 직접 확인.
3. node --check (SyntaxError 없음=PASS). 빈출력 PASS는 echo 마커로 명시(N-17 정신).
4. commit 영문 한 줄. .js만 스테이징(.bak/t*.txt/.py 제외 = 전부 ?? 미추적 정상). push는 사용자 확인 하(deploy.yml 자동배포).
5. CC 요약·제안 신뢰 금지 → 부모체인/brace-depth/값/키집합 raw만. CC 자체 .py 패치 reject.
6. **dry-run·`(D−R)−K=0` 는 "키 존재"만. 값·is_dummy 까지 직접 교차.**
7. 파괴 편집 전 .bak 백업. 재검증(다중 동시 AND) 실패 시 자동 ROLLBACK. **+ 실제 node --check 교차 필수(N-17).**
8. **키집합 동일 ≠ 무손실. D⊆R + R∩D D정답·R더미=0 + 원소속 R 정답보존이어야 손실0.**
9. **동명 블록 다중존재 주의**: 한 키가 ROOT/[ui]/[dash/operations]/[pages] 등 복수 depth. 처리 전 probe로 부모체인·키수·키집합 raw 확정. **R 확정 = parent_chain==[] 且 동일 key 중 최소 depth. '가장 큰 것'·'parent_chain==[ROOT]' 휴리스틱 금지.** D 확정 = parent_chain 에 dash & operations 포함 최내곽. **ROOT직속이 2개 이상이면 비정상(중복) — 직접 교차로 정답측 raw 규명(120 priceOpt/settlements).**
10. **값방향 raw 필수**: 통계·키존재만 믿지 말 것. 인계서 표기 비관/낙관 둘 다 raw로 재판정(120 다수 실증).

## 3. 핵심 .py 자산 (루트 보존, 컨테이너 초기화 → 매번 재저장)

### 검증완료 파서 모체 (읽기전용, 무변경 인용 — 절대원칙)
- **session112_inspect_suspect.py ★★** — 모든 신규도구 파서 모체. **120 재확인 실측 계약(t120_parser_dump.txt):**
  - `scan_key_blocks(text)` → `[(key, start, end, depth), …]` **4-튜플**. start='{' 위치, end='}' 위치. `stack.append((m, i, len(stack)))` → **depth=len(stack), push 전 길이(0-base 아님 주의: ROOT직속 첫 블록 depth=1 가 아니라 실측은 래퍼 구조 따라 다름 — pick_R 은 parent_chain==[] & min depth 로 일반화, depth 절대값 휴리스틱 금지).** `key is None`(export default 래퍼) blocks 제외 → ROOT는 parent_chain 미출현.
  - `extract_kv(body)` → `{key: value}` 평면 dict. **호출 시 body=text[s+1 : e] (여는 '{' 제외, 닫는 '}' 미포함). text[start:end+1] 넘기면 keys=0 (119 v1 실패원인, 절대금지).** 값은 **따옴표 포함 + `re.sub(r"\s+"," ")` 정규화**. 비교는 unq() 로 양끝 따옴표만 제거 후(N-14).
- **표준 헬퍼(119~120 확립, 무변경 복붙):**
  - `pick_R(c)` = parent_chain==[] 중 최소 depth (ROOT직속). **2개 이상이면 직접 교차 필요(N-19).**
  - `pick_D(c)` = parent_chain 에 'dash'&'operations' 포함 중 최대 depth.
  - `blocks_for_key(text,target)` = scan_key_blocks 에서 key==target + span 진포함 parent_chain.
  - `is_dummy(key,val)` = unq(val).strip()=="" OR ==key.lower() (N-10).

### 120차 신규 자산 (★ = 121차 재사용 표준)
- **session120_dump_parser.py ★★** — 실모체 소스 dump 표준(컨테이너 초기화 시 호출규약 재확인 1순위).
- **session120_adopt_mkt_ja_ins50.py ★★ (4db02d6 적용·검증완료)** — ins 표준(ins15 모체 계승 + N-17 보강). 6중 동시 AND(inserted∧preserved∧ins_val∧count_ok∧**syntax_ok**∧**brace_ok**). **apply_ins 후행콤마 정밀처리(마지막키 ',' 종결 시 콤마중복 금지 — ins50 1차 실패 근본수정). SEC·SRC_SEC·INSERT_KV 만 변경 → 임의 ko/ja기반 복구 ins. ins 의 121차 모체.**
- **session120_adopt_mkt_ja_dashdel.py ★★ (73f0f52 적용·검증완료)** — dashdel 표준(superdel 모체 계승 + N-17 보강). 다중 AND(removed∧preserved∧siblings∧losssafe∧syntax) + lossfree_verdict 내장 + deletion_span(선행/후행 콤마 균형). **TARGET·self_test 픽스처만 변경 → 임의 dash 격리. dashdel 의 121차 모체.**
- session120_diag_zh_lossfree.py / session120_scan_zh_dashops_all.py / session120_diag_mkt_ko_crossref.py / session120_diag_mkt_ja_jaref.py / session120_diag_acctperf_ja_3keys.py / session120_diag_priceopt_ja.py / session120_diag_priceopt_dual_root.py / session120_diag_diverge_settle.py — 검증완료 진단 파생. 재사용 가능.

### 118/119 자산 (보존·재사용 가능)
- session119_adopt_marketing_ja_ins15.py ★★ / session119_adopt_ops_ja_superdel.py ★★ / session119_diag_super_lossfree.py ★★ / session118_adopt_acctperf_ja_ins24.py / session117_keyset_verdict.py 등. ※ 폐기: lang_ratio 계열 / v1 인계서계약 신뢰 실패본.

## 4. [DONE] 120차 결과 (raw 확정·apply 성공만 — 2커밋)

### 4-0. push — 묶음 보류 유지
HEAD=73f0f52. origin 대비 ↑(117~120 + PM 누적, 정확값 121 0순위 git log 실측). 검수자 결정: 계속 묶음 보류.

### 4-1. ★ zh dash>ops 잔여 전수 종결 (1순위, apply 없는 진단종결)
- raw: session120_scan_zh_dashops_all.py 전수 — zh.js 360블록 중 **dash&operations 부모체인 블록 0개, 격리후보 0건**. 4섹션(auto/marketing/super/acctPerf) + 전수 모두 음성.
- **핵심**: 인계서 1순위 가설("zh도 ja처럼 dash 잔여")을 raw 반증. zh dash 격리는 117(opsZhDashDel6)·118(budget/marketing)·9020dc4 선행완료. **apply 불요 = 잔여 물리적 부재(손실0 자명). 1순위 정밀 종결.**

### 4-2. ★ ja marketing ins50 복구선행 (2순위, 인계서 KO_ABSENT오기록 raw 반박) — 1커밋
- raw: 인계서 "KO_ABSENT 50 = ko·R 부재, 신규번역 필요" → **실측 정반대**. D−R 50키 전부 **KO_REAL 50**(ko dataProduct 한국어 정답) + **JA_REAL 50**(ja ruleEnginePage 일본어 정답). KO_DUMMY=0/KO_ABSENT=0/JA_DUMMY=0.
- **4db02d6**: session120_adopt_mkt_ja_ins50.py --apply. ja ruleEnginePage 50키 일본어를 ja ROOT직속 marketing R ins. 748→798. 6중 AND True. node PASS. (단 1차 시도 실패→ROLLBACK→근본수정 후 성공, N-17.)
- **N-17 실패·복구 기록**: 1차 ins50 도구가 R 마지막키 후행콤마 미처리 → `,,` SyntaxError → 손상커밋 078ec51. 4중 AND(파서기반)가 `,,` 미검출(extract_kv 관대) → ROLLBACK 미발동. `git reset --hard HEAD~1` + `git checkout -- ja.js` 로 완전복원(HEAD=a6cc2d8). 도구 근본수정: apply_ins 후행콤마 분기 + verify 5번째 syntax_ok + self_test 양케이스/음성 + **실제 node 교차**. 2차 dry→apply PASS.

### 4-3. ★ ja marketing dashdel (3순위, ins50 후 D⊆R 성립) — 1커밋
- raw: ins50 후 R 798. 손실0 재판정: D⊆R=True, D_ANS_R_DUM=0, D−R=0(real=0). 3조건 충족.
- **73f0f52**: session120_adopt_mkt_ja_dashdel.py --apply. dash>ops marketing D(625) 격리. 형제 395→394. 다중 AND True. node PASS. (628 deletions) → marketing ja = ins50+del 짝 완전 종결(119 super ins97+del169 패턴 재현).

### 4-4. 4순위 accountPerf ja 3키 — no-op 종결
- raw: pageSub/pageTitle/teamDashboard ja ROOT직속 전부 정상 일본어 정답(더미·한글혼입·영문 0). 인계서 "의미충돌" 표기 raw 반박(N-15/N-18). 정정 불요 = no-op. (ko 한글혼입 플래그는 ko=한국어원본이라 정상, 도구 라벨 오의미.)

## 5. [PENDING] 121차 작업 (★raw 확정 즉시 연속, 손실입증 시만 이관)

### 0순위 — push 상태 재확인
```
t cd D:\project\GeniegoROI; git log --oneline -14 2>&1 | Out-File t121_status.txt -Encoding utf8; git status --short frontend/src/i18n/locales 2>&1 | Out-File t121_status.txt -Append -Encoding utf8; "=== node ja ===" | Out-File t121_status.txt -Append -Encoding utf8; node --check frontend/src/i18n/locales/ja.js 2>&1 | Out-File t121_status.txt -Append -Encoding utf8; "=== node zh ===" | Out-File t121_status.txt -Append -Encoding utf8; node --check frontend/src/i18n/locales/zh.js 2>&1 | Out-File t121_status.txt -Append -Encoding utf8; "=== done ===" | Out-File t121_status.txt -Append -Encoding utf8; code t121_status.txt
```
확인: HEAD=73f0f52, origin 대비 ↑(실측), locales clean(?? .bak/.py/t*.txt만), 마커 사이 ja/zh SyntaxError 없음=PASS. 이상 없으면 즉시 1순위. 컨테이너 초기화 시 session120_dump_parser.py 먼저 재저장→호출규약 재확인(6절 #2).

### 1순위 — ★ priceOpt ja 2중 ROOT 정밀이관 (120 5순위 raw 규명 완료분)
- **raw 확정(t120_priceopt_dual.txt)**: ja priceOpt ROOT직속 **2개 병존** — B0(span 164512, 209키, jp=167 우세=정답측) / B1(span 574390, 208키, etc영문=137 우세=미번역측). ∩=208, 값상이=200. ko 교차: B0만일본어정답=141 / B1만일본어정답=40 / B0·B1비정상=0 / ko부재=0.
- **핵심 위험**: JS 동일키 ROOT 중복 → 빌드/런타임 "나중(B1) 우선"이라 영문 B1이 적용되어 일본어 B0 무력화 가능. **단순 dashdel 불가** — B1만정답 40키 손실. **키단위 병합 필요**: B0 기준 + B1만정답 40키 흡수 → 중복 B1 제거. 양측 정답 분산이라 손실0 비자명.
- 검수자 추천: ① 209↔208 키단위 병합도구(B0정답 우선 + B1만정답 40키 raw 확정 후 B0에 ins + B1 블록 제거). 단 ins50 N-17 교훈 — 후행콤마/syntax_ok/실제node 교차 필수. dry-run raw 후 검수자 추천 분기. ★진행 강제 #5(정밀이관 — 자동단순처리 불가, 키단위).

### 2순위 — settlements ja/zh 2중 ROOT 정밀이관 (120 7순위 raw 재판정 완료분)
- raw(t120_diverge_settle.txt): ja settlements 동명5개 중 **ROOT직속 2개**([0]61키, [2]61키), auth=0. zh 동일(ROOT직속 2개 [0]/[3] 각 61키). **N-6 "ROOT/auth 중복" 표기 raw 반박 — 실측은 priceOpt 동형 2중 ROOT 중복.**
- priceOpt(1순위)와 동일 구조·동일 처리패턴. 1순위 병합도구 TARGET=settlements 파생으로 재사용. ROOT 2블록 직접 교차(session120_diag_priceopt_dual_root.py SEC=settlements 파생) → 정답측 확정 → 키단위 병합. 자동금지, 키단위.

### 3순위 — 6순위 DIVERGE 대량 미번역 정밀이관
- raw: supplyChain ja/zh R76 전부 미번역(ko정답보유 정정후보 75) / marketing ja R798 정정후보470·zh 218 / accountPerf zh 2(colRoas/colCtr). ko 정답 보유라 복구가능하나 **규모 대(supplyChain 75 + marketing ja470/zh218)**, 키단위 정밀.
- 분기: (a) supplyChain ja/zh 75키 = ko정답 전량보유·단일섹션 → ins15 모체 파생 대량 ins 가능성(dry-run raw 후 손실0·더미0 확인 시). (b) marketing 470/218 = 규모 방대, 키단위 배치 분할. (c) accountPerf zh 2키 = 소량 우선처리 가능. **자동금지(운영규칙 10), raw 키단위 후 검수자 추천 분기. 우선순위: accountPerf zh 2 → supplyChain 75 → marketing 대량.**

### 4순위 — 7순위 잔여 백로그
[C] 키단위diff/comingSoon·runAI·runAi/workspace 브랜드·CRLF(git warning 무해, .gitattributes 후순위)·ESLint/CSV/Connectors/107 attrData zh. 키단위 수동.

### 마지막 — 묶음 push (검수자 확인 하)
```
t cd D:\project\GeniegoROI; git log --oneline -40 2>&1 | Out-File t121_pushchk.txt -Encoding utf8; code t121_pushchk.txt
```
검수자 push 승인 시: `t cd D:\project\GeniegoROI; git push origin master` (deploy.yml 자동배포). 누적분(117~121 + PM) 일괄 반영. **PM_HANDOVER.md/FEATURE_PLAN_120.md 는 별개 인계서 — 무관, 불변.**

## 6. 즉시 체크리스트 (121차)

1. [ ] 0순위 git log/status(HEAD=73f0f52, locales clean, ja/zh node PASS 마커확인). 이상 없으면 즉시 1순위.
2. [ ] **검증완료 파서 무변경 import + 실모체 호출규약 절대 준수**: extract_kv(text[s+1:e]), pick_R=parent_chain==[]&min depth. 컨테이너 초기화 시 session120_dump_parser.py 먼저.
3. [ ] **키존재 ≠ 정답**: ko/ja값 raw 교차 is_dummy 판정 필수.
4. [ ] **인계서 표기 raw 재판정**: 비관/낙관 둘 다 실측 우선(120 다수 실증, 운영규칙 9·10·N-18).
5. [ ] 신규 .py 검수자 완성본 산출물 → 사용자 1회 저장 → 단순 한 줄. 합성검증 = 실모체 무변경 미러 + 실파일구조 픽스처 + **실제 node 교차(N-17)**. 합성검증+dry-run 양쪽 필수.
6. [ ] node --check SyntaxError 없음=PASS, **빈출력은 echo 마커로 명시**. apply 한 줄 = python --apply + node Append + git add/commit Append 결합형.
7. [ ] raw 확인은 code <txt> 원본. CC 요약·자체패치 절대 불신(reject).
8. [ ] 동명블록 다중존재 매번 실측. **ROOT직속 2개↑ = 중복 비정상, 직접 교차 정답측 규명(N-19, priceOpt/settlements)**.
9. [ ] 손실0 = ① D⊆R ② D정답·R더미=0 ③ D−R 더미/부재. 검증식 다중 동시 AND + **syntax_ok + 실제 node 교차(N-17)**.
10. [ ] D−R 실값이면 ins 모체 파생 복구선행 → D⊆R 성립 후 dashdel(120 marketing 표준). **2중 ROOT 중복은 dashdel 불가 — 키단위 병합(N-19).**
11. [ ] 의사결정 분기 시 검수자 추천 1개 명시+근거. 사용자 "검수자 추천"=즉시 진행.
12. [ ] 부분종결은 인계서 작성 직전 1회, 안전 즉시처리 대상 소진 시. 종결 시 본 인계서 동일 형식 전체 재작성(검수자 단일파일 → 사용자 NEXT_SESSION.md 전체 교체).

## 7. 파일 상태

- t113_*~t120_* 결과 txt 루트 보존(raw 이력). 121차는 t121_* 사용.
- **120차 백업**: ja.js.bak_session120_mktJaIns50_20260519_072841(078ec51 손상분, reset 됨 — 참고용) / ja.js.bak_session120_mktJaIns50_20260519_073414(4db02d6) / ja.js.bak_session120_mktJaDashDel_20260519_073905(73f0f52). 119 이전 백업 보존.
- .py 자산: 3절 목록. 검수자 산출물 → 사용자 루트 저장. 컨테이너 초기화 → 매번 재저장.
- git: HEAD=73f0f52, origin 대비 ↑(121 0순위 실측). 추적변경 NEXT_SESSION.md만(나머지 ?? 미추적 정상).
- NEXT_SESSION.md = 본 인계서. 121차 종결 시 전체 교체. **PM_HANDOVER.md/FEATURE_PLAN_120.md 별개 유지.**

### 신규 사안
- [N-6] ★갱신(120): settlements 중복 = ROOT/auth 아니라 **ROOT직속 2중복(priceOpt 동형)** raw 확정. 121 2순위 정밀이관.
- [N-7] ✅해소(120): accountPerf ja 3키 raw 정상 일본어 = no-op. 인계서 "의미충돌" 표기 반박.
- [N-8] ★갱신(120): priceOpt = ROOT직속 2중복(B0 209 정답측/B1 208 미번역). 121 1순위 키단위 병합 정밀이관.
- [N-10] 유지·강화: is_dummy(따옴표포함 인식). 키존재≠정답, ko/ja값 raw 교차 필수.
- [N-11] 유지·강화: 손실0 = D⊆R + D정답·R더미=0 + D−R 더미/부재. 값언어비율 폐기.
- [N-13] 유지·강화: probe/도구 자작 휴리스틱 금지. R=parent_chain==[]&min depth. 실모체 호출규약 raw 확인 후 도구작성(session120_dump_parser.py 표준).
- [N-14] 유지: 모체 검증식 자작 리터럴 비교 추가 금지. extract_kv 따옴표 미제거+공백정규화, unq() 양끝만 제거.
- [N-15] 유지·강화(120 다수 실증): 인계서 표기 비관/낙관 오기록 — 항상 raw 실측 우선.
- [N-16] 유지: 파생도구 print/미리보기 하드코딩 키 금지 → INSERT_KV 첫키 동적참조.
- [N-17] ★신규(120 핵심): **파서기반 verify는 JS 문법오류(`,,` 등) 미검출** — extract_kv 가 이중콤마 관대히 건너뜀. ins50 1차 실패(078ec51 손상커밋, ROLLBACK 미발동) 근본원인. **대책: ① apply_ins 후행콤마 정밀분기(마지막키 ',' 종결 시 콤마중복 금지) ② verify 에 syntax_ok(`,\s*,`/`{\s*,`/`,\s*}`/`:\s*,`/`:\s*}` before대비증가분 검출) ③ self_test 콤마없음/후행콤마 양케이스+음성 ④ 합성검증에 실제 node --check 교차 필수.** ins50/dashdel 모체에 반영완료, 신규 파괴편집 도구 전부 의무.
- [N-18] ★신규(120): 인계서 비관표기 raw 반박 누적 3건(KO_ABSENT50→실값정답 / 의미충돌→정상 / ROOT_auth→ROOT2중복). N-15 강화 — 표기 신뢰 0, raw 100%.
- [N-19] ★신규(120): **ROOT직속 동명 2개↑ 병존 = 비정상 중복**(priceOpt/settlements). dashdel(격리삭제) 불가 — 양측 정답 분산 가능. 직접 교차로 정답측 raw 규명 → 키단위 병합(정답측 기준 + 타블록 고유정답 흡수 + 중복 제거). 자동단순처리 금지, 정밀이관.
- 속도 원칙(필독): "초엔터프라이즈급"=품질·안전, 진행 더디게 아님. (a) 합성검증=실모체 무변경 미러+실파일구조 픽스처+dry-run+**실제node교차(N-17)**. (b) 검증완료 파서·검증식 무변경 재사용, 실모체 호출규약 raw 선행. (c) 매 턴 결과확인+다음도구 동시. (d) 부분종결 인계서 직전 1회·안전대상 소진 시, 한 세션 최소 2 apply+commit(120 충족). (e) raw 확정 즉시 연속. raw로 손상/미완/오염/2중ROOT 입증 시 강행 대신 정밀. (f) 분기 시 검수자 추천 1개 강제. (g) 신규 .py 검수자 완성본 + 전달 전 합성검증(N-17 node교차 포함). (h) 손실0 = D⊆R + D정답·R더미=0 + D−R 더미/부재. (i) 검증식 다중 동시 AND + syntax_ok + 실제node. (j) CC 자체 .py 패치 reject. (k) 키존재≠정답 ko/ja raw 교차. (l) 인계서 표기 raw 재판정(N-18). (m) ROOT 2중복 = 키단위 병합 정밀이관(N-19).