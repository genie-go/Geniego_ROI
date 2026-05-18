# GeniegoROI i18n 인계서 — 118차 시작점

> 117차 종결 시 전면 재작성 / 페어 모드(검수자 명령 → 사용자가 CC에 t 접두로 전달)
> 상단부터 순서대로. 0순위 먼저.

---

## 0. 운영 방식 (먼저 읽기 — 특히 ★진행 강제 / ★★검수자 추천 강제)

- 기본값: 검수자가 CC에 직접 수정/실행 명령. 신규 .py 본문은 검수자가 산출물 파일로 만들어 전달 → 사용자가 루트에 1회 저장. 진단·git은 CC가 직접.
- **sed·서브식·복합 파이프는 자동승인+Bash변환 반복 유발.** 신규 .py는 sed 파생 금지, **검수자 완성본 산출물 → 사용자 1회 저장 → 단순 `python xxx.py 2>&1 | Out-File yyy.txt -Encoding utf8; code yyy.txt` 한 줄 실행**. 이 패턴이 114~117차 내내 안정 작동(117차 2커밋 전부 이 방식).
- **인라인 `python -c` 다줄 금지(117 교훈)**: PowerShell 경유 시 줄바꿈/괄호 깨져 `SyntaxError: unmatched ')'`. 진단도 전부 산출물 .py로. 한 줄 -c도 가급적 회피.
- 모든 CC 명령은 t 접두 한 줄. 자동승인 프롬프트 계속 뜸. **분기 패턴: ① 단순 `cd; python xxx.py | Out-File` 한 줄에 "경로 우회 방지(path resolution bypass)" 프롬프트 → Yes 진행(정착, 안전). ② 임베디드 표현식($()/$LASTEXITCODE)·if/else·sed `"..."`·복합 다단 파이프·Select-String 스크립트블록 → Esc 후 단순화.** 117차 내내 ①은 Yes, ②는 Esc로 안정.
- **CC 자체 패치 제안은 계속 reject(117 정착).** CC가 산출물을 안 기다리고 .py를 자기판단으로 직접 수정 시도하면 사용자가 "User rejected update"로 거부. 도구는 오직 검수자 산출물만 채택. 단 CC의 *진단 출력*(상태/소스 dump)은 채택 가능.
- 검수자 설명 매 턴 핵심만(명령 + 확인 포인트 1~2개). raw 우선, CC 요약/제안 절대 불신.
- 환경변수 설정 금지. cp949는 .py 내부 `sys.stdout.reconfigure(encoding="utf-8")`.
- **검증완료 파서 무변경 재사용 절대원칙(117 핵심교훈)**: 신규 .py는 session112_inspect_suspect.py 의 `scan_key_blocks(text)->[(key,start,end,depth)…]` / `extract_kv(body)->{key:val}` 를 **import 무변경 사용**. 키집합/블록/span 자작 파서 금지(117차 zhdel6 v1 자작파서가 실파일 ABORT — 도구버전 난립). 부모체인은 블록 span 포함관계로 산출(파서 무변경).
- node --check 판정: syntax 오류 시에만 출력+rc≠0. **Out-File 결과 비어있으면(에디터 placeholder "Generate code…"만) = rc0 = PASS** (114~117 전건 이 방식 PASS).
- **컨테이너 초기화 → 검수자는 산출물 전달 전 합성검증(미니 픽스처) 필수.** 단 **합성검증 커버리지 = 실파일 구조 반영필수(117 교훈)**: 미니픽스처가 형제키 소수면 대규모 실파일 경로 미검출(zhdel6 v1 픽스처 3키 → 실파일 301키에서 ABORT). 픽스처에 연속인접/비대상혼재/마지막키/원소속분리/중괄호균형 포함. 합성검증 통과 + 실파일 dry-run 양쪽 필수.

### ★★ 검수자 추천 강제 규칙 (의사결정 분기 시 — 최우선)
1. **선택지(ask_user_input) 제시 시 항상 검수자 추천 1개를 옵션 라벨 안에 "— 검수자 추천"으로 명시**하고, 직후 응답에서 추천 근거를 인계서 규칙 번호로 1~3줄 제시.
2. 사용자가 "검수자 추천대로"라고만 답해도 즉시 그 선택으로 진행(재질문 금지).
3. 추천은 반드시 인계서 규칙(★진행 강제/운영규칙/안전장치)에 근거. 근거 없는 추천 금지.

### ★ 진행 강제 규칙 (미루기 금지 — 최우선)
1. **raw로 처리방향 확정 즉시 다음 단계 연속 진행.** dry-run→raw확인→apply→node→독립검증→commit 한 흐름으로 종결. 단계마다 멈추고 종결 금지.
2. **부분종결은 "인계서 작성 직전 단 1회"만 허용.** 그 전까지 작업 여력 있는 한 멈추지 않음. "다음 차수에서"는 raw로 손상/불완전/오염이 입증된 경우에 한해서만 허용.
3. **한 세션 목표 = 최소 2단계 apply+commit.** (117차는 2커밋 = 기준선 충족.)
4. "추측 금지"는 안전장치(백업·dry-run·가드·ROLLBACK)가 있으므로 속도저하 명분 불가. raw 확정 안전대상은 즉시 처리.
5. 작업 여력 남으면 다음 우선순위로 계속. 단 raw가 손상/불완전/오염 입증 시 강행 대신 정밀 이관(가드가 손실·미번역·구조오염 차단이 안전설계 정당성).
6. 파괴 작업 전 백업·dry-run·검증·이상시 ROLLBACK 절대 생략 금지(속도 무관, 항상).

## 1. 컨텍스트

- 작업: i18n 번역 키 동기화. **정답 원본은 ko.js(원본 한국어)** — 115~117차 일관 입증. EN은 일부 키가 키명 그대로인 stub라 ko 의미 우선.
- locale: frontend\src\i18n\locales\{lang}.js (15개, ES모듈). 주 대상 ja.js/zh.js. 정답 출처 = ko.js, 참조 = en.js.
- 키는 따옴표 형태("pageTitle":...). 검증은 node --check (출력없음=PASS).
- **116차 발견 유지**: 미번역키 ≠ 전부 복구가능. ko 정답값이 키명과 동일한 "더미키"는 ko에도 실값 없음 → 치환 제외(무접촉). is_dummy_ko 판정 = ko값 공백 OR ko값==키명(대소문자무시). 영숫자토큰 규칙 금지(SKU 오판정).
- **117차 핵심 추가발견(★)**: dash 중첩본 손실위험키 다수가 **OBJ 트리**(내부 수십~수백 하위키). 손실0 판정기준은 값언어비율(부정확) 아니라 **키집합 포함관계**: D(dash중첩본 키집합) ⊆ R(원소속 ROOT직속 동명섹션 키집합) 이면 dash삭제 손실0(116 subsetdel_v2/nestdel_v2 표준). 운영규칙 8 그대로.
- **117차 발견: auto ja ROOT직속에 한국어 대량 혼입 오염**(실값 "Qoo10 (큐텐)" 등 한글166키). ja.js 자체 한영혼재 오염 — 별도 정밀사안(118 이후).

## 2. 운영규칙 (절대준수)

1. 자동승인 → 0의 분기(① Yes / ② Esc 단순화).
2. 한 줄·Windows 경로. 출력 Out-File; code <f>로 파일 원본 직접 확인.
3. node --check (출력없음=rc0=PASS).
4. commit 영문 한 줄. .js만 스테이징(.bak/t*.txt/.py 제외). push는 사용자 확인 하(deploy.yml 자동배포).
5. CC 요약·제안 신뢰 금지 → 부모체인/brace-depth/값/키집합 raw만. CC 자체 .py 패치 reject.
6. dry-run SKIP/SHARED는 "키 존재"만. 값·키집합까지 직접 교차.
7. 파괴 편집 전 .bak 백업. 재검증(3중 동시 AND) 실패 시 자동 ROLLBACK.
8. **키집합 동일 ≠ 무손실. D⊆R 키집합 + 원소속이 정답(현지어/ko기반)이어야 손실0.** 고유명사(ko=en=현지어 동일 영문값, whatsapp/Coupang/11Street/Amazon/channel_)는 미번역 아닌 정답 → 가드 화이트리스트 예외.
9. **동명 블록 다중존재 주의**: 한 키가 ROOT/[ui]/[dash/operations]/[ruleEnginePage] 등 복수 depth 존재. 처리 전 probe로 부모체인·키수·키집합 raw 확정. **117 실측 예: ja dash 3개(depth2 ruleEnginePage내부 / depth1 ROOT innerOps=1 / depth1 ROOT 소형). zh dash 3개 유사.** inspect 계열 중첩본 오인식 → 검증완료 파서 scan_key_blocks + span 포함관계 부모체인이 표준. 인계서 표기 부모체인 != 실제 가능(116·117 교훈, 항상 실측).
10. **값방향 raw 필수**: 통계·값언어비율만 믿지 말 것(117 v5 lang_ratio 가 OBJ중첩 평면매칭으로 marketing ja 오판정 — 결함입증). 손실0 판정은 키집합 포함관계 우선. 미번역이 ko에 정답 존재 시 ko기반 복구 가능(115/116 표준).

## 3. 핵심 .py 자산 (루트 보존, 컨테이너 초기화 → 매번 재저장)

### 검증완료 파서 모체 (읽기전용, 무변경 인용 — 절대원칙)
- **session112_inspect_suspect.py ★★** — 모든 신규도구 파서 모체.
  - `scan_key_blocks(text)` → `[(key, start, end, depth), …]` (start='{' 위치, end='}' 위치, depth=스택깊이). 부모체인 dict 없음 → span 포함관계로 산출.
  - `extract_kv(body)` → `{key: value}` 평면 dict (값 공백정규화 str, OBJ면 '{…}' 통째 문자열). **인자는 블록 body 문자열 1개.** depth==0 에서만 키 인식 → 블록 넘길 때 바깥 '{' '}' 제거: `text[start+1:end]` (117 핵심 FIX, block_body 정정).
- session111_ident_valuediff_v4.py ★ — 파서 원형.

### 117차 신규 자산 (★ = 118차 재사용 표준)
- **session117_keyset_verdict.py ★★** — **키집합 포함관계 손실0 판정 표준**. 각 키/언어마다 D(operations[dash] 내부키집합) / R(ROOT직속 동명섹션 키집합) / K(ko operations[dash] 키집합) 추출·비교. D⊆R=③격리안전, D⊄R·D⊆K=복구선행, ko부재=이관. 116파서 무변경+합성검증 4종. operations_under_dash/root_direct_block/keyset_of_key_obj 정착.
- **session117_adopt_ops_zh_dashdel6.py ★★ (v2, 4380109 적용·검증완료)** — **operations[dash] 내 N키 통째삭제 표준**. 116 nestdel_v2 3중 가드 무변경 계승: ①대상 dash내부 제거 ②원소속 ROOT직속 키집합·값 불변 ③형제키=(삭제전-대상) 정확일치 +중괄호균형, 전부 동시 AND(plan 단독비교 금지). 검증파서로 in_dash_block span 획득 → deletion_span(선행 key토큰~후행콤마, 마지막키=LAST 선행콤마흡수). 백업/dry-run/ROLLBACK. 합성검증 7종(연속인접/비대상보존/마지막키/원소속불변/중괄호).
- **session117_adopt_ops_ja_dashdel2.py ★★ (ad281cd 적용·검증완료)** — 위 zh판의 ja 파생(파일 ja.js, TARGET만 차이). 파생 표준: 동일도구 파일·TARGET만 변경, 가드·검증식·합성검증·파서 전부 무변경.
- session117_probe_zh_opsdash_span.py ★ — 검증파서로 operations[dash] 식별 + 키별 dash내부/ROOT직속 블록 span raw dump 진단 표준.
- session117_dump_dash_lossrisk.py (v5) — 값언어비율 판정판. **lang_ratio 결함(OBJ중첩 평면매칭) 입증되어 폐기. 키집합 기준(keyset_verdict)으로 대체.** 참고만.
- session117_probe_rootblk_boundary.py — ROOT직속 블록 경계 raw 육안검증 진단(읽기전용). 경계초과 vs 실데이터 판별용.

### 116차 자산 (보존·재사용 가능)
- session116_adopt_gairec_ja_nestdel_v2.py ★★ — 중첩본 통째삭제 + 가드 원형(117 zh/ja dashdel 의 모체). find_full_key_span/3중검증식.
- session116_adopt_gairec_ja_ins37.py ★★ — 부분집합 블록에 누락키 ko기반 신규삽입(라인추가) 표준. **118 복구선행(acctPerf/auto ja) 의 모체 후보.**
- session116_dump_ops_ja_Agroup.py / zh_Agroup.py ★★ — A군(복구가능)/B군(더미) 분류 표준. is_dummy_ko.
- session116_adopt_ops_ja_ruleengine_A33.py / zh_root_A35.py ★ — A군 ko기반 in-place 치환 표준.
- session116_probe_ops_dashdel.py ★ — 중첩본 삭제 손실위험 진단(117 1순위 출발점).

### 115차 이전 자산
- session115_adopt_gcat_zh_translate.py ★★ / session115_adopt_gnav_zh_subsetdel_v2.py ★★ — ko기반 번역치환 / subsetdel+화이트리스트 원형.
- ※ session111_subset_absent.py·session114_adopt_gnav_zh_subsetdel.py = 폐기·사용금지.

## 4. [DONE] 117차 결과 (raw 확정·apply 성공만)

### 4-0. push — 묶음 보류 유지
HEAD=ad281cd. origin 대비 **↑20**(112~116차 18 + 117차 2 전부 origin 미반영). 검수자 결정: 계속 묶음 보류. push 시점 미정(사용자 승인 시).

### 4-1. ★ zh operations[dash] 6키 손실0 삭제 (4380109) — 1순위 ③격리 일괄
- raw(t117_keyset.txt): zh 6키 전부 D⊆R 키집합 손실0 입증. acctPerf D35⊆R64 / apiKeys 20⊆20 / auto 319⊆319 / gBudget 66⊆66 / super 169⊆172 / gAiRec 75⊆75. (zhspan으로 dash내부 블록 span·내부키수 교차검증 일치.)
- session117_adopt_ops_zh_dashdel6.py --apply: operations[dash](span 155946~224776, 형제301) 내 6키만 제거. 합성검증 7종 PASS. 독립 3중검증식 전부 True(6키제거/원소속불변/형제정합/중괄호균형). node PASS. commit 4380109 (1 file, 697 del). marketing 은 D−K 70키 잔차로 의도적 비대상(무접촉).

### 4-2. ★ ja operations[dash] 2키 손실0 삭제 (ad281cd) — 1순위 ③격리 ja분
- raw: ja D⊆R 손실0 입증분 = apiKeys(20⊆20) / gBudget(66⊆66) 2키만. (acctPerf D−R24·auto D−R147=복구선행, super D−R97+ko부재=이관, marketing D−K70=잔차, gAiRec ja dash없음 → 전부 비대상.)
- session117_adopt_ops_ja_dashdel2.py --apply (zh판 ja파생): operations[dash](span 141851~207344, 형제300) 내 2키만 제거. 합성검증 7종 PASS. 독립 3중검증 전부 True. node PASS. commit ad281cd (1 file, 90 del).

### 4-3. 이관·복구선행 확정 사안 (raw로 손실 입증 — 강행금지)
- **acctPerf ja / auto ja (복구선행)**: D⊄R. ko operations[dash] 에 정답 OBJ 존재(D⊆K). 부족분 D−R(acctPerf 24키 / auto 147키)을 ko기반으로 원소속(ja ROOT직속) 보강(ins) 후에야 dash 격리 가능. **118 1순위**: session116_adopt_gairec_ja_ins37.py 파생으로 OBJ 부족키 ko기반 ins 설계.
- **marketing ja/zh (잔차)**: D−K 70키(abSetup/alertNewApproval/approvalWarning1 등) — dash중첩본에 있으나 ko·원소속 정답에 부재. zh marketing 은 D⊆R 이나 D−K 70 잔차로 4380109 비대상 유지. **단순 격리·복구 불가, 키단위 수동판정(118 2순위)**: 70키가 타페이지 오염인지 신규필요인지 raw 규명.
- **super ja (이관)**: D−R 97 + ko부재. 정답출처 없음 → 수동 이관(118 3순위).
- **auto ja ROOT직속 한영혼재 오염**: 별도 정밀사안. ja.js 원소속 auto 에 한국어 실값 혼입(한글166키). i18n 동기화 범위 내 오염복구 필요(118 검토).

## 5. [PENDING] 118차 작업 (★raw 확정 즉시 연속 진행, 손실입증 시만 이관)

### 0순위 — push 상태 재확인
```
t cd D:\project\GeniegoROI; git log --oneline -10 2>&1 | Out-File t118_status.txt -Encoding utf8; git status --short frontend/src/i18n/locales 2>&1 | Out-File t118_status.txt -Append -Encoding utf8; code t118_status.txt
```
확인: HEAD=ad281cd, origin 대비 ↑20, locales에 추적 .js 잔여 없음(?? = .bak/.py/t*.txt 정상). 이상 없으면 즉시 1순위.

### 1순위 — acctPerf/auto ja 복구선행 (4-3 참조, ★최난도 잔여)
- ① keyset_verdict 재실행으로 acctPerf ja(D−R 24) / auto ja(D−R 147) 부족키 raw 재확인 + 각 부족키의 ko operations[dash] 정답값(OBJ 내부) dump.
- ② session116_adopt_gairec_ja_ins37.py 파생 설계: ja ROOT직속 원소속(acctPerf span 967~ / auto span 567588~573895)에 ko기반 부족 OBJ 하위키 신규삽입. 가드: 현재키집합 정확일치, 삽입키∩기존=0, 블록닫기직전 삽입, 백업/dry-run/독립검증(R 키집합 D 포함화)/ROLLBACK, 검증식 plan+preserved.
- ③ ②로 D⊆R 성립 후 session117_adopt_ops_ja_dashdel2.py 파생(TARGET=acctPerf,auto)으로 dash 격리.
- 단 **auto ja 원소속 한영혼재 오염 선해결 필요**: ins 전에 ja ROOT직속 auto 의 한국어혼입 한글166키 raw 확인 → ko기반 일본어 정정인지, dash 영문stub이 오히려 참조원인지 판정(강행금지, 정밀).
- 검수자 추천: ① 부족키+ko정답 dump부터(읽기전용). raw로 정답출처·오염범위 확정 후에만 ②③ 연속(★진행 강제 #5).

### 2순위 — marketing ja/zh 잔차 70키 정밀분석
- D−K 70키(ko·원소속 부재)가 타페이지 오염(113차 priceOpt 류)인지, marketing 신규필요 키인지 keyset_verdict 파생으로 70키 각 ko 전 섹션 존재여부 raw 규명. 자동번역 금지(운영규칙 10). 검수자 추천: raw 규명 후 (a)타섹션귀속 (b)신규번역 (c)이관 분기.

### 3순위 — super ja 이관 + 잔여
- super ja D−R 97 + ko부재 → 키단위 수동 이관. accountPerf ja 의미충돌 3키(114 4-2 잔여, pageSub/pageTitle/teamDashboard) 폴백경로 raw 후 정정.

### 4순위 — priceOpt 잔여 (113차 4-2)
priceOpt ROOT[1]↔파편[2](208,값상이66)·[2](90,타페이지오염38키). 키단위 수동.

### 5순위 — DIVERGE 본래분
zh supplyChain(∩75)+ja supplyChain/marketing(∩124)/acctPerf(∩11). 수동 키단위. 자동 금지.

### 6순위 — 미번역·백로그
- **budget ja/zh**: 114차 4-4 — 3블록 영문stub. **ko budget 정답/더미 여부 keyset_verdict 파생(SEC=budget, D/R/K) 선확인** → A군이면 ko기반 복구, 더미면 무접촉/이관.
- [N-6] settlements ROOT/auth 중복. [C] 키단위diff/comingSoon·runAI·runAi/workspace 브랜드·CRLF/ESLint/CSV/Connectors/107차 attrData zh.

### 마지막 — 묶음 push (검수자 확인 하)
```
t cd D:\project\GeniegoROI; git log --oneline -22 2>&1 | Out-File t118_pushchk.txt -Encoding utf8; code t118_pushchk.txt
```
검수자 push 승인 시: `t cd D:\project\GeniegoROI; git push origin master` (deploy.yml 자동배포). ↑20 누적분 일괄 반영.

## 6. 즉시 체크리스트 (118차)

1. [ ] 0순위 git log/status(HEAD=ad281cd, ↑20, locales clean). 이상 없으면 즉시 1순위.
2. [ ] 1순위 acctPerf/auto ja 복구선행: 부족키+ko정답 dump → ins 설계(ins37파생) → D⊆R 성립 → dashdel 파생 격리. auto 원소속 한영혼재 오염 선판정.
3. [ ] **검증완료 파서 무변경 재사용 절대원칙**(117 핵심). scan_key_blocks/extract_kv import. 자작 키집합/span 파서 금지(zhdel6 v1 ABORT 교훈).
4. [ ] 신규 .py는 sed·인라인 다줄 -c 금지, 검수자 완성본 산출물 → 사용자 1회 저장 → 단순 python 한 줄. **합성검증 픽스처는 실파일 구조 반영**(연속인접/비대상혼재/마지막키/원소속분리/중괄호). 합성검증+실파일 dry-run 양쪽 필수.
5. [ ] node --check 출력없음=PASS. `$LASTEXITCODE` 등 임베디드 금지.
6. [ ] raw 확인은 code <txt> 파일 원본. CC 요약·분류·자체패치 절대 불신(reject). 키별 실값·키집합 육안.
7. [ ] 동명블록 다중존재 매번 실측(운영규칙 9). dash 다중(ja/zh 3개씩). 검증파서 scan+span부모체인.
8. [ ] 손실0 판정 = **키집합 포함관계 D⊆R**(운영규칙 8). 값언어비율 금지(v5 lang_ratio 결함 입증). 검증식 = 3중 동시 AND(제거/원소속불변/형제정합), plan 단독비교 절대금지(115 zh ROOT 버그, 117 전건 이 방식 PASS).
9. [ ] 미번역 ≠ 복구가능(116). is_dummy_ko. A군만 치환/복구, B군·고유명사 SKIP.
10. [ ] 의사결정 분기 시 검수자 추천 1개 옵션 명시+근거(0의 ★★). 사용자 "추천대로"=즉시 진행.
11. [ ] 부분종결은 인계서 작성 직전 1회만. 그 전 자발적 종결 금지(0의 ★진행 강제). raw로 손실/오염 입증분(복구선행·잔차·이관)은 강행금지·정밀.
12. [ ] 종결 시 본 인계서 동일 형식 전체 재작성(검수자 단일파일 → 사용자 NEXT_SESSION.md 전체 교체).

## 7. 파일 상태

- t113_*~t117_* 결과 txt 루트 보존(raw 이력). 118차는 t118_* 사용.
- 117차 백업 2개: zh.js.bak_session117_opsZhDashDel6_20260518_151849(4380109), ja.js.bak_session117_opsJaDashDel2_20260518_152253(ad281cd). 116/115/114/113/112/110/109차 백업 보존.
- .py 자산: 3절 목록. 검수자 산출물 → 사용자 루트 저장. 컨테이너 초기화 → 매번 재저장. session111_subset_absent.py·session114_adopt_gnav_zh_subsetdel.py 폐기·사용금지. session117_dump_dash_lossrisk.py(v5) lang_ratio 결함으로 폐기(keyset_verdict 대체).
- git: HEAD=ad281cd, origin 대비 ↑20(push 보류). 추적변경 NEXT_SESSION.md만(나머지 ?? 미추적 정상).
- NEXT_SESSION.md = 본 인계서. 118차 종결 시 전체 교체.

### 신규 사안
- [N-1~N-5] ✅ 115·116차 완료분.
- [N-6] ★부분완료(117차 진척): **operations dash 중첩본 정밀이관** — zh 6키(4380109)+ja 2키(ad281cd) D⊆R 손실0 격리 완료. 잔여: acctPerf/auto ja 복구선행(118 1순위), marketing ja/zh 70키 잔차(118 2순위), super ja 이관(118 3순위).
- [N-7] 미해결(3순위): accountPerf ja 의미충돌 3키.
- [N-8] 미해결(4순위): priceOpt 잔여.
- [N-9] 미해결(6순위): budget ja/zh / settlements 중복.
- [N-10] 유지(116): 미번역키 중 더미 다수. is_dummy_ko 양방향 raw.
- [N-11] ★신규(117 발견): **손실0 판정 = 키집합 포함관계**(운영규칙 8/11). 값언어비율 도구(v5 lang_ratio) OBJ중첩 평면매칭 결함 — marketing ja 오판정 입증. 키집합 D⊆R 만 신뢰. 검증완료 파서 무변경 재사용 절대(자작파서 난립이 실파일 ABORT 원인).
- [N-12] ★신규(117 발견): **auto ja ROOT직속 한영혼재 오염**(한국어 실값 한글166키 혼입). i18n 동기화 범위 내 별도 복구사안(118 1순위 auto 처리 시 선판정).
- 속도 원칙(필독): "초엔터프라이즈급"=품질·안전, 진행 더디게 하란 의미 아님. (a) 합성검증 핵심 + 실파일 구조반영 픽스처 + dry-run. (b) **검증완료 파서 무변경 재사용 절대(117 핵심)**, 도구 버전 난립 금지. (c) 매 턴 결과확인+다음도구 동시. (d) 부분종결 인계서 직전 1회, 한 세션 최소 2단계 apply+commit(117차 2커밋 충족). (e) raw 확정 즉시 연속, "추측 금지"를 속도저하 명분 금지. 단 raw로 손실/미완/오염 입증 시(복구선행·잔차·이관) 강행 대신 정밀. (f) 의사결정 분기 시 검수자 추천 1개 강제. (g) 신규 .py는 sed·인라인다줄-c 아닌 검수자 완성본 산출물 + 전달 전 합성검증(실파일구조 반영). (h) **손실0 = 키집합 D⊆R**(값언어비율 금지). (i) **검증식은 3중 동시 AND**(제거+원소속불변+형제정합), plan 단독비교 시 정상인데 ROLLBACK — 115 zh ROOT 실증, 117 전건 이 방식 PASS. (j) CC 자체 .py 패치 reject, 진단출력만 채택.