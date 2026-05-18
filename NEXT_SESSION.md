# GeniegoROI i18n 인계서 — 115차 시작점

> 114차 종결 시 전면 재작성 / 페어 모드(검수자 명령 → 사용자가 CC에 t 접두로 전달)
> 상단부터 순서대로. 0순위 먼저.

---

## 0. 운영 방식 (먼저 읽기 — 특히 ★진행 강제 규칙 / ★★검수자 추천 강제)

- 기본값: 검수자가 CC에 직접 수정/실행 명령. 신규 .py 본문은 검수자가 산출물 파일로 만들어 전달 → 사용자가 루트에 1회 저장. 진단·git은 CC가 직접.
- **sed·서브식·복합 파이프는 자동승인+Bash변환을 반복 유발(114차 실증).** 신규 .py는 sed 파생 대신 **검수자가 완성본 산출물로 직접 제공** → 사용자 1회 저장 → 실행은 단순 `python xxx.py 2>&1 | Out-File yyy.txt -Encoding utf8; code yyy.txt` 한 줄. 이 패턴이 114차 내내 안정 작동했음. sed 파생 금지.
- 모든 CC 명령은 t 접두 한 줄. 자동승인 프롬프트(Do you want to proceed? 등) 계속 뜸 → Esc 후 t 접두 직접 타이핑. 정착 패턴, 당황 금지.
- **자동승인 유발 패턴(전부 Esc): ① `$()`/`$LASTEXITCODE` 등 임베디드 표현식 ② sed의 `"..."` 이스케이프 ③ 복합 `|` 파이프 다단 ④ CC가 PowerShell→Bash 자동변환(`cd /mnt/d/...`) ⑤ findstr/Select-String 스크립트블록.** → 명령은 출력을 Out-File 로만, 서브식·sed 없이. node --check rc는 `$LASTEXITCODE` 쓰지 말고 "출력 없음=PASS"로 판정(114차 정착). raw 확인은 `; code <txt>` 로 에디터에 파일 원본 직접 확인.
- 검수자 설명 매 턴 핵심만(명령 + 확인 포인트 1~2개). raw 우선, CC 요약/제안 절대 불신.
- 환경변수 설정 금지. cp949는 .py 내부 sys.stdout.reconfigure(encoding="utf-8").
- 신규 .py 산출물은 inspect_suspect(검증완료 v4 파서: scan_key_blocks/extract_kv/_read_value/_at_key_position) 무변경 재사용. 도구 버전 난립 금지. SEC만 바꿔 파생하되 **sed 아닌 검수자 산출물로**.
- node --check 판정: node --check는 syntax 오류 시에만 출력하고 rc≠0. **Out-File 결과가 비어있으면(또는 오류문 없으면) = rc0 = PASS** (114차 전 섹션 이 방식으로 PASS 확인).

### ★★ 검수자 추천 강제 규칙 (의사결정 분기 시 — 최우선)
1. **선택지(ask_user_input)를 제시할 때는 항상 검수자 추천 1개를 옵션 라벨 안에 "— 검수자 추천"으로 명시**하고, 직후 응답에서 추천 근거를 인계서 규칙 번호로 1~3줄 제시.
2. 사용자가 "검수자 추천대로"라고만 답해도 즉시 그 선택으로 진행(재질문 금지).
3. 추천은 반드시 인계서 규칙(★진행 강제 / 운영규칙 / 안전장치)에 근거. 근거 없는 추천 금지.

### ★ 진행 강제 규칙 (미루기 금지 — 최우선)
1. **raw로 처리방향이 확정되면 그 즉시 다음 단계로 연속 진행.** dry-run→raw확인→apply→node check→독립검증→commit 을 한 흐름으로 끝낸다. 단계마다 멈추고 종결 금지.
2. **부분종결은 "인계서 작성 직전 단 1회"만 허용.** 그 전까지 작업 여력이 있는 한 멈추지 않는다. "다음 차수에서 하자"는 raw로 *구조 손상/불완전/오염이 입증된 경우에 한해서만* 허용, 그 외 금지.
3. **한 세션 목표 = 최소 2단계 apply+commit.** (114차는 gCat+accountPerf+gNav ja = 3커밋 달성 = 기준선 초과.)
4. "추측 금지"는 안전장치(백업·dry-run·가드·ROLLBACK)가 있으므로 속도 저하 명분 불가. raw가 확정한 안전 대상은 즉시 처리.
5. 작업 여력이 남으면 다음 우선순위로 계속 진행. 단 raw가 손상/불완전/오염을 입증하면 강행 대신 정밀 이관(114차 gAiRec/operations/budget/gCat zh/gNav zh — 가드가 손실·불완전 차단이 안전설계 정당성).
6. 파괴 작업 전 백업·dry-run·검증·이상시 ROLLBACK 절대 생략 금지(속도와 무관, 항상).

## 1. 컨텍스트

- 작업: i18n 번역 키 동기화(EN 기준 14언어 fallback). D:\project\GeniegoROI.
- locale: frontend\src\i18n\locales\{lang}.js (15개, ES모듈). 주 대상 ja.js/zh.js. EN기준 = locales\en.js.
- 키는 따옴표 형태("pageTitle":...). 검증은 node --check (출력없음=PASS).

## 2. 운영규칙 (절대준수)

1. 자동승인 → Esc 후 t 접두 직접(0의 5종).
2. 한 줄·Windows 경로. 출력 Out-File; code <f> 로 파일 원본 직접 확인.
3. node --check (출력없음=rc0=PASS).
4. commit 영문 한 줄. .js만 스테이징(.bak/t*.txt/.py 제외). push는 사용자 확인 하(deploy.yml 자동배포).
5. CC 요약 신뢰 금지 → 부모체인/brace-depth/값 raw만.
6. dry-run SKIP/SHARED는 "키 존재"만. 값까지 직접 교차.
7. 파괴 편집 전 .bak 백업. 재검증 실패 시 자동 ROLLBACK.
8. **키집합 동일 ≠ 무손실. 값까지 동일/방향 확인 후에만 처리. 상위집합 흡수도 "전키가 정답블록에서 현지어값"이어야 손실0(114차 gNav zh: ROOT가 삭제대상 완전포함이나 11키 영어stub → 처리불가 판정).**
9. **동명 블록 다중존재 주의**: 한 키가 ROOT/ruleEnginePage내/dash,operations내/marketing내 등 복수 depth에 존재 가능. 처리 전 probe 도구로 부모체인·키수·값분포(한글/가나/한자/키복사더미)·정답블록·오염징후 raw 확정. **기존 inspect 도구는 dash중첩본을 ROOT[1]로 오인식하므로(114차 gCat 실증), probe(부모체인 명시)로 실구조 선확인 필수.**
10. **값방향 raw 필수**: A>/B> 통계만 믿지 말고 키별 실값 육안 교차. 더미/해시값(키=값)·한영혼재·미번역(en영어 fallback) 오염 시 자동 처리 전면 금지.

## 3. 핵심 .py 자산 (루트 보존, 컨테이너 초기화 → 매번 재저장)

### 검증완료 파서 모체 (읽기전용, 무변경 인용)
- session112_inspect_suspect.py ★ — 모든 신규도구 파서 모체(scan_key_blocks/extract_kv/_read_value/_at_key_position 무변경).
- session111_ident_valuediff_v4.py ★ — 파서 원형.

### 114차 신규 자산 (★ = 115차 재사용 표준)
- session114_probe_*.py ★★ — **115차 구조진단 표준 베이스**. 부모체인+값분포(한글/가나/한자/키복사더미)+블록쌍 value-DIFF 방향+키별 상세 덤프. SEC만 바꿔 검수자 산출물로 파생(probe_accountperf/budget/gairec/gnav/operations/gcat_zh 6종 실증). **inspect 계열보다 우선 — 부모체인 명시로 오인식 차단.**
- session114_adopt_acctperf_dashdel.py ★★ — **영어stub [dash,operations] 중첩본 1개 삭제 + 정답블록·ROOT 무변경** 표준. 가드: 삭제대상 현지어0 영어stub + 잔존 현지어 정답 존재. 백업/재스캔독립검증/ROLLBACK. (accountPerf ja+zh apply 성공 0d99cc4.)
- session114_adopt_gnav_dashdel.py ★ — acctperf_dashdel + **손실0 강화가드**(삭제대상 키집합 == 현지어완전체 키집합 양방향0). (gNav ja apply 성공 f8b7c5b, zh는 가드 ABORT.)
- session114_adopt_gnav_zh_subsetdel.py ★★ — **가드 정밀완화 표준**: 삭제대상 ⊆ 현지어완전체(삭제대상-완전체=0) + 삭제대상 전키가 완전체에서 현지어값. 상위집합 허용하되 비현지어키 검출 시 ABORT. (zh gNav에서 11키 영어stub 검출 → 정당 ABORT, 처리불가 입증.) **115차 상위집합 흡수 판정의 표준.**
- session114_adopt_gcat_ja_nestdel.py ★ — 진짜ROOT가 이미 정답일 때 영어stub 중첩본 N개 삭제(흡수 없음). (gCat ja apply 성공 aab894f.)
- session114_inspect_gcat.py — inspect_priceopt의 gCat 파생(읽기전용, 참고용).

### 113차 자산 (보존)
- session113_adopt_priceopt_nestonly.py ★★ — NEST→ROOT 단방향 흡수+중첩본1개삭제 표준.
- session113_adopt_ai.py / session113_inspect_ai.py / session113_map_superset7.py — 보존.
- ※ session111_subset_absent.py = 폐기·사용금지.

## 4. [DONE] 114차 결과 (raw 확정·apply 성공만)

### 4-0. push — 묶음 보류 유지
HEAD=f8b7c5b. origin 대비 **↑7**(7bbceab·365d596=112차 / e1f878a·d2f4e44=113차 / aab894f·0d99cc4·f8b7c5b=114차, 전부 origin 미반영). 검수자 결정: 계속 묶음 보류. push 시점 미정(사용자 승인 시).

### 4-1. ★ gCat ja 완료 (aab894f)
- raw: gCat ja 3블록 — [ruleEnginePage]21키 영어stub+더미2 / [dash]21키 영어stub(rep와 vdiff0) / **진짜ROOT[](depth1) 20키 = 일본어 정답완전체**(가나15/한자16).
- 결정: 진짜ROOT가 이미 정답 → 흡수 불필요. **영어stub 중첩본 2개([ruleEnginePage]/[dash]) 삭제, ROOT 무변경.**
- 처리(session114_adopt_gcat_ja_nestdel.py --apply): 중첩본2 삭제. node PASS·독립검증(gCat 1개=진짜ROOT 20키불변) PASS. commit aab894f (1 file, 46-).
- **zh 이관**: zh gCat 2블록 모두 영어stub+키복사더미, **정답 중국어 부재 = 데이터손상**. 자동처리 금지(2순위 복구군).

### 4-2. ★ accountPerf ja+zh 완료 (0d99cc4)
- raw: ja 3블록 — [ruleEnginePage]35키 **일본어정답완전체**(더미0) / [dash,operations]35키 영어stub(더미0, B>32 역방향) / 진짜ROOT[]3키 일본어(의미상이). zh 2블록 — 진짜ROOT[]35키 **중국어정답완전체**(한자33) / [dash,operations]35키 영어stub.
- 결정: 영어stub인 [dash,operations] 중첩본만 삭제, 정답완전체·ROOT 무변경(priceOpt nestonly 패턴).
- 처리(session114_adopt_acctperf_dashdel.py --apply): ja/zh 각 dash중첩본 삭제. node PASS·독립검증 PASS. commit 0d99cc4 (2 files, 74-).
- **잔여**: ja [ruleEnginePage]↔진짜ROOT 의미충돌 3키(pageSub/pageTitle/teamDashboard, 일본어끼리 의미상이) = 별도 수동(작업범위 밖, 무손치 보존).

### 4-3. ★ gNav ja 완료 (f8b7c5b)
- raw: ja 4블록 — [ruleEnginePage]100키 **일본어정답완전체**(가나73/한자45) / [dash,operations]100키 영어stub([0]과 키집합100%동일,전용0/0) / [marketing]65키 영어stub+app_pricing오염 / 진짜ROOT[]87키 일본어(A9/B7 혼재).
- 결정: 키집합100%동일 영어stub인 [dash,operations]만 삭제(손실0), [ruleEnginePage]정답·[marketing]·ROOT 무접촉 보존(priceOpt nestonly "안전범위 한정").
- 처리(session114_adopt_gnav_dashdel.py --apply): ja dash중첩본 삭제. node PASS·독립검증(gNav 3개, 정답완전체 가나73/한자45 불변) PASS. commit f8b7c5b (1 file, 102-).
- **zh 이관**(4-4 참조).

### 4-4. 이관 확정 사안 (raw로 손상/불완전/미번역 입증 — 자동처리 금지)
- **gCat zh**: 2블록 전부 영어stub+키복사더미. 정답 중국어 부재 = 데이터손상. → 2순위.
- **gAiRec ja/zh**: ja 3블록 — 중첩본[ruleEnginePage]/[dash,operations] 각 75키(더미12) / 진짜ROOT[]38키(가나7/한자25, 더미5, title="Email Marketing" 타페이지오염·subtitle 의미충돌). **중첩본 37키가 ROOT에 부재 → 삭제 시 37키 손실 + ROOT 자체 부분오염.** zh도 정답부재. → 2순위.
- **operations ja/zh**: ja 3블록 — [ruleEnginePage]296키(더미95) / [dash,operations]303키(더미110) / 진짜ROOT[]13키. **진짜ROOT 13키 vs 중첩본296+ → 283+키 손실. 키복사더미 대량(`0dv8o1`류=auto 4-3a와 동일 해시손상). [dash,operations]전용에 타섹션 9개(accountPerf/auto/gAiRec/gNav/marketing/super 등) 구조 오염.** → 2순위(구조복구 선행).
- **budget ja/zh**: 3블록 전부 영어stub(가나0/한자0), 현지어 정답 부재 = **미번역(en영어 fallback) 상태.** 흡수·삭제 모두 무의미. en→ja/zh 신규 번역 필요. → 6순위.
- **gNav zh**: 3블록 — [marketing]65키 영어stub+app_pricing오염 / 진짜ROOT[]104키(한자93) / [dash,operations]100키 영어stub. 진짜ROOT가 dash중첩본 100키 완전포함(삭제대상-완전체=0)이나 **그 중 11키(apiKeys/aiMarketingHub/aiPrediction/whatsapp/instagramDm 등)가 ROOT에서도 영어stub(미번역)** → 삭제 시 11키 영어 잔존 불완전. subsetdel 가드가 정당 ABORT. → 3순위(zh 11키 미번역 보완 후 재처리 가능).

## 5. [PENDING] 115차 작업 (★raw 확정 즉시 연속 진행, 손상입증 시만 이관)

### 0순위 — push 상태 재확인
```
t cd D:\project\GeniegoROI; git log --oneline -8 2>&1 | Out-File t115_status.txt -Encoding utf8; git status --short 2>&1 | Out-File t115_status.txt -Append -Encoding utf8; code t115_status.txt
```
확인: HEAD=f8b7c5b, origin 대비 ↑7, 추적변경=NEXT_SESSION.md만(나머지 ?? = .bak/.py/t*.txt 정상). 이상 없으면 즉시 1순위.

### 1순위 — 2순위 복구군 진단 (auto·operations·gAiRec·gCat zh)
**raw로 데이터손상/구조오염 확정된 군. 번역동기화 전 복구 진단 선행(읽기전용부터).**
처리 순서(검수자 추천 명시, probe 도구 SEC 파생 활용):
1. **gCat zh** (최소형, 2블록 영어stub) → en.js·ko.js gCat 3자 대조로 중국어 정답 출처 규명. ko(원본 한국어)에서 zh 번역 생성 가능 여부 raw.
2. **gAiRec ja** (ROOT 38키 부분정답 + 중첩본 37키 ROOT부재 + ROOT오염) → en/ko 대조로 ① ROOT 누락 37키 정답 출처 ② ROOT title/subtitle 오염 정정값 규명.
3. **operations** (★최난도: 진짜ROOT 13키 / 중첩본 296+더미95·110 / 타섹션9개 구조오염) → 구조복구가 번역보다 선행. en.js operations 정상 키구조 기준 확보 → [dash,operations]내 타섹션9개(accountPerf/auto/gAiRec/gNav/marketing/super 등) 격리 설계 → 그 후 번역. 진단 도구(읽기전용)부터, 자동 .js편집 절대 금지(복구설계 확정 전).
각 사안: en.js·ko.js·ja/zh.js 3~4자 키:값 대조 신규 진단도구 검수자 산출물 작성 → raw → [복구가능/추가이관] 판정. **손상 입증 시 즉시 다음, 복구설계 확정 시 도구 설계.**

### 2순위 — gNav zh 11키 미번역 보완 후 재처리
4-4 gNav zh 참조. 진짜ROOT[]가 dash중첩본 100키 완전포함하나 11키(apiKeys/aiMarketingHub/aiPrediction/whatsapp/instagramDm 등)가 ROOT에서 영어stub. ① en/ko 대조로 11키 중국어 정답 확보 → ROOT에 채움(별도 도구) → ② 그 후 session114_adopt_gnav_zh_subsetdel.py --apply 재실행(11키 현지어화되면 가드 통과). 11키 보완 전 dash중첩본 삭제 금지.

### 3순위 — accountPerf ja 의미충돌 3키 수동
4-2 잔여. ja [ruleEnginePage]정답↔진짜ROOT[] pageSub/pageTitle/teamDashboard 일본어끼리 의미상이. 어느 쪽이 노출 정답인지 i18n 폴백 경로 raw 확인 후 키단위 정정.

### 4순위 — priceOpt 잔여 (113차 4-2 잔여분)
priceOpt ROOT[1]↔파편[2](208,값상이66)·[2](90,타페이지오염38키). 키단위 수동. 오염38키(title="Email Marketing"류)는 타페이지 귀속 별도 정리.

### 5순위 — DIVERGE 본래분
zh supplyChain(∩75)+ja supplyChain/marketing(∩124)/acctPerf(∩11). 수동 키단위. 자동 금지.

### 6순위 — 미번역·백로그
- **budget ja/zh** (4-4): 전 블록 영어stub, en→ja/zh 신규 번역.
- [N-6] settlements ROOT/auth 중복(라인변동 후 재탐색). [NEW-3] 109차[B] finalverify ar/hi/pt/ru. [C] 키단위diff/comingSoon·budget EN카피/runAI·runAi/workspace 브랜드·CRLF/D안 ESLint/E안 CSV/F안 Connectors/107차 attrData zh.

### 마지막 — 묶음 push (검수자 확인 하)
```
t cd D:\project\GeniegoROI; git log --oneline -12 2>&1 | Out-File t115_pushchk.txt -Encoding utf8; code t115_pushchk.txt
```
검수자 push 승인 시: `t cd D:\project\GeniegoROI; git push origin master` (deploy.yml 자동배포 트리거).

## 6. 즉시 체크리스트 (115차)

1. [ ] 0순위 git log/status(HEAD=f8b7c5b, ↑7, 추적변경 NEXT_SESSION.md만). 이상 없으면 즉시 1순위.
2. [ ] 1순위 복구군: gCat zh→gAiRec ja→operations 순. en.js·ko.js·ja/zh.js 3~4자 대조 진단도구(읽기전용) 검수자 산출물부터. 복구설계 확정 전 자동 .js편집 절대 금지.
3. [ ] **probe 도구 우선**(부모체인 명시). inspect 계열은 dash중첩본을 ROOT 오인식(114차 gCat 실증).
4. [ ] 신규 .py는 sed 파생 금지, **검수자 완성본 산출물 → 사용자 1회 저장 → 단순 python 한 줄 실행**(114차 정착).
5. [ ] node --check는 출력없음=PASS. `$LASTEXITCODE` 등 임베디드 표현식 금지(자동승인 유발).
6. [ ] raw 확인은 code <txt> 파일 원본. CC 요약·SAFE분류 휴리스틱 절대 불신, 키별 실값 육안.
7. [ ] 동명블록 다중존재 항상 의심(운영규칙 9). probe로 부모체인·값분포 매번 매핑.
8. [ ] 상위집합 흡수도 "전키가 정답블록 현지어값"이어야 손실0(운영규칙 8, gNav zh 교훈). subsetdel 가드 표준 적용.
9. [ ] 의사결정 분기 시 검수자 추천 1개 옵션에 명시+근거 제시(0의 ★★규칙). 사용자 "추천대로"=즉시 진행.
10. [ ] 부분종결은 인계서 작성 직전 1회만. 그 전엔 자발적 종결 금지(0의 ★진행 강제).
11. [ ] 종결 시 본 인계서 동일 형식 전체 재작성(검수자 단일파일 → 사용자 NEXT_SESSION.md 전체 교체).

## 7. 파일 상태

- t113_* / t114_* / t115_* 결과 txt 루트 보존(raw 이력).
- 114차 백업 4개: ja.js.bak_session114_gcatNestDel_20260518_105705(aab894f), ja/zh.js.bak_session114_acctPerfDashDel_20260518_111208~209(0d99cc4), ja.js.bak_session114_gNavDashDel_20260518_112135(f8b7c5b). 113/112/110/109차 백업 보존.
- .py 자산: 3절 목록. 검수자 산출물 → 사용자 루트 저장. 컨테이너 초기화 → 매번 재저장. session111_subset_absent.py 폐기·사용금지.
- git: HEAD=f8b7c5b, origin 대비 ↑7(push 보류). 추적변경 NEXT_SESSION.md만(나머지 ?? 미추적 정상).
- NEXT_SESSION.md = 본 인계서. 115차 종결 시 전체 교체.

### 신규 사안
- [N-1] ✅ gCat ja 완료(aab894f). 진짜ROOT 정답 → 영어stub 중첩본2 삭제.
- [N-2] ✅ accountPerf ja+zh 완료(0d99cc4). 영어stub dash중첩본 삭제, 정답·ROOT 보존. **dashdel 도구 = 표준.**
- [N-3] ✅ gNav ja 완료(f8b7c5b). 키집합100%동일 영어stub dash중첩본 삭제, 안전범위 한정.
- [N-4] ★★중대 미해결(115차 1순위): **2순위 복구군** — gCat zh(정답부재)·gAiRec ja/zh(키부족+ROOT오염)·operations ja/zh(283키손실+더미대량+타섹션9개 구조오염). en/ko 대조 복구 선행, 자동편집 금지.
- [N-5] ★미해결(115차 2순위): **gNav zh 11키 미번역** — 진짜ROOT가 dash중첩본 완전포함이나 11키(apiKeys 등) 영어stub. 11키 중국어 보완 후 subsetdel 재처리.
- [N-6] 미해결(3순위): accountPerf ja 의미충돌 3키(pageSub/pageTitle/teamDashboard) 수동.
- [N-7] 미해결(4순위): priceOpt 잔여 파편[2]208·[2]90(타페이지오염38키).
- [N-8] 미해결(6순위): budget ja/zh 전블록 영어stub 미번역 / settlements ROOT/auth 중복.
- 속도 원칙(필독): "초고도화/초엔터프라이즈급"=품질·안전, 진행 더디게 하란 의미 절대 아님. (a) 합성검증 핵심 1~2종, 나머지 실파일 dry-run. (b) 도구 버전 난립 금지(inspect_suspect 파서 무변경 인용, SEC만 검수자 산출물 파생). (c) 매 턴 결과확인+다음도구 동시. (d) 부분종결 인계서 직전 1회, 한 세션 최소 2단계 apply+commit(114차 3커밋 초과달성). (e) raw 확정 즉시 연속 진행, "추측 금지"를 속도저하 명분 금지. 단 raw로 손상/불완전/오염 입증 시(114차 gAiRec/operations/budget/gCat zh/gNav zh) 무리한 강행 대신 정밀 이관 — 가드가 114차에 키손실·미번역·구조오염 5종+ 차단이 안전설계 정당성. (f) 의사결정 분기 시 검수자 추천 1개 강제(0의 ★★). (g) 신규 .py는 sed 아닌 검수자 완성본 산출물(114차 sed 자동승인 반복 교훈).