# GeniegoROI i18n 인계서 — 116차 시작점

> 115차 종결 시 전면 재작성 / 페어 모드(검수자 명령 → 사용자가 CC에 t 접두로 전달)
> 상단부터 순서대로. 0순위 먼저.

---

## 0. 운영 방식 (먼저 읽기 — 특히 ★진행 강제 / ★★검수자 추천 강제)

- 기본값: 검수자가 CC에 직접 수정/실행 명령. 신규 .py 본문은 검수자가 산출물 파일로 만들어 전달 → 사용자가 루트에 1회 저장. 진단·git은 CC가 직접.
- **sed·서브식·복합 파이프는 자동승인+Bash변환 반복 유발.** 신규 .py는 sed 파생 금지, **검수자 완성본 산출물 → 사용자 1회 저장 → 단순 `python xxx.py 2>&1 | Out-File yyy.txt -Encoding utf8; code yyy.txt` 한 줄 실행**. 이 패턴이 114·115차 내내 안정 작동(115차 5커밋 전부 이 방식).
- 모든 CC 명령은 t 접두 한 줄. 자동승인 프롬프트 계속 뜸 → Esc 후 t 접두 직접 타이핑. 정착 패턴, 당황 금지.
- **자동승인 유발 패턴(전부 Esc): ① `$()`/`$LASTEXITCODE` 등 임베디드 표현식 ② sed `"..."` 이스케이프 ③ 복합 `|` 다단 ④ PowerShell→Bash 자동변환 ⑤ findstr/Select-String 스크립트블록.** node --check rc는 `$LASTEXITCODE` 쓰지 말고 **"출력 없음=PASS"**로 판정(114·115 정착). raw 확인은 `; code <txt>`로 에디터에 파일 원본 직접 확인.
- 검수자 설명 매 턴 핵심만(명령 + 확인 포인트 1~2개). raw 우선, CC 요약/제안 절대 불신.
- 환경변수 설정 금지. cp949는 .py 내부 `sys.stdout.reconfigure(encoding="utf-8")`.
- 신규 .py 산출물은 inspect_suspect(검증완료 v4 파서: scan_key_blocks/extract_kv/_read_value/_at_key_position) 무변경 재사용. 도구 버전 난립 금지. SEC만 바꿔 파생하되 sed 아닌 검수자 산출물로.
- node --check 판정: syntax 오류 시에만 출력+rc≠0. **Out-File 결과 비어있으면 = rc0 = PASS** (114·115 전 섹션 이 방식 PASS 확인).

### ★★ 검수자 추천 강제 규칙 (의사결정 분기 시 — 최우선)
1. **선택지(ask_user_input) 제시 시 항상 검수자 추천 1개를 옵션 라벨 안에 "— 검수자 추천"으로 명시**하고, 직후 응답에서 추천 근거를 인계서 규칙 번호로 1~3줄 제시.
2. 사용자가 "검수자 추천대로"라고만 답해도 즉시 그 선택으로 진행(재질문 금지).
3. 추천은 반드시 인계서 규칙(★진행 강제/운영규칙/안전장치)에 근거. 근거 없는 추천 금지.

### ★ 진행 강제 규칙 (미루기 금지 — 최우선)
1. **raw로 처리방향 확정 즉시 다음 단계 연속 진행.** dry-run→raw확인→apply→node→독립검증→commit 한 흐름으로 종결. 단계마다 멈추고 종결 금지.
2. **부분종결은 "인계서 작성 직전 단 1회"만 허용.** 그 전까지 작업 여력 있는 한 멈추지 않음. "다음 차수에서"는 raw로 손상/불완전/오염이 입증된 경우에 한해서만 허용.
3. **한 세션 목표 = 최소 2단계 apply+commit.** (115차는 5커밋 = 기준선 3 대폭 초과.)
4. "추측 금지"는 안전장치(백업·dry-run·가드·ROLLBACK)가 있으므로 속도저하 명분 불가. raw 확정 안전대상은 즉시 처리.
5. 작업 여력 남으면 다음 우선순위로 계속. 단 raw가 손상/불완전/오염 입증 시 강행 대신 정밀 이관(가드가 손실·미번역·구조오염 차단이 안전설계 정당성).
6. 파괴 작업 전 백업·dry-run·검증·이상시 ROLLBACK 절대 생략 금지(속도 무관, 항상).

## 1. 컨텍스트

- 작업: i18n 번역 키 동기화. **정답 원본은 ko.js(원본 한국어)** — 115차에 gCat/gAiRec/gNav 복구로 일관 입증. EN은 일부 키가 키명 그대로인 stub라 ko 의미 우선.
- locale: frontend\src\i18n\locales\{lang}.js (15개, ES모듈). 주 대상 ja.js/zh.js. 정답 출처 = ko.js, 참조 = en.js.
- 키는 따옴표 형태("pageTitle":...). 검증은 node --check (출력없음=PASS).

## 2. 운영규칙 (절대준수)

1. 자동승인 → Esc 후 t 접두 직접(0의 5종).
2. 한 줄·Windows 경로. 출력 Out-File; code <f>로 파일 원본 직접 확인.
3. node --check (출력없음=rc0=PASS).
4. commit 영문 한 줄. .js만 스테이징(.bak/t*.txt/.py 제외). push는 사용자 확인 하(deploy.yml 자동배포).
5. CC 요약 신뢰 금지 → 부모체인/brace-depth/값 raw만.
6. dry-run SKIP/SHARED는 "키 존재"만. 값까지 직접 교차.
7. 파괴 편집 전 .bak 백업. 재검증 실패 시 자동 ROLLBACK.
8. **키집합 동일 ≠ 무손실. 값까지 동일/방향 확인 후에만 처리. 상위집합 흡수도 "전키가 정답블록에서 현지어값"이어야 손실0. 단 고유명사(ko=en=현지어 동일 영문값, 예: whatsapp/Coupang/11Street/Amazon/channel_)는 미번역 아닌 정답 → 가드 화이트리스트 예외 처리(115 gNav zh subsetdel_v2 표준).**
9. **동명 블록 다중존재 주의**: 한 키가 ROOT/[ui]/[dash,operations]/[ruleEnginePage]/[marketing] 등 복수 depth 존재 가능. 처리 전 probe로 부모체인·키수·값분포(한자/가나/한글/영문stub/더미) raw 확정. inspect 계열은 중첩본 오인식 → probe(부모체인 명시) 우선.
10. **값방향 raw 필수**: 통계만 믿지 말고 키별 실값 육안 교차. 더미/한영혼재/미번역 오염 시 자동처리 금지. **단, 미번역이 ko에 정답 존재 시 → ko기반 검수자 확정 번역 in-place 치환으로 복구 가능(115 gCat zh/gAiRec/gNav zh 표준).**

## 3. 핵심 .py 자산 (루트 보존, 컨테이너 초기화 → 매번 재저장)

### 검증완료 파서 모체 (읽기전용, 무변경 인용)
- session112_inspect_suspect.py ★ — 모든 신규도구 파서 모체(scan_key_blocks/extract_kv/_read_value/_at_key_position 무변경).
- session111_ident_valuediff_v4.py ★ — 파서 원형.

### 115차 신규 자산 (★ = 116차 재사용 표준)
- session115_probe_*.py ★ — 구조진단 표준(gcat_zh/gairec/operations/gnav_zh11/gairec_ja_nest). 부모체인+값분포+ko/en 정답출처 규명. SEC만 바꿔 검수자 산출물로 파생.
- session115_dump_gcat_ko.py / session115_dump_gairec_x.py ★ — ko 정답 + 다국어 교차 실값 덤프(복구원본 육안검수).
- session115_adopt_gcat_zh_translate.py ★★ — **영문stub→ko기반 검수자확정 번역 in-place 치환 표준**. 가드: 현재값이 알려진 영문stub와 정확일치 시만 치환, 불일치 ABORT, 백업/dry-run/독립검증/ROLLBACK. (gCat zh 40키 ecdaa97.)
- session115_adopt_gairec_ja_ui12.py ★ — 위 표준 + **화이트리스트 외 키 무접촉**(26키 기존정답 보존, 12키만 치환). (gAiRec ja[ui] a4363cd.)
- session115_adopt_gairec_zh_root.py ★ — 위 표준 + **검증식 정정**(fixed_ok 기대값 = plan + skip_done, plan만 비교 금지 — zh ROOT 1차 ROLLBACK 버그 교훈). (gAiRec zh 71키 e9f8bef.)
- session115_adopt_gnav_zh_root11.py ★ — 위 표준(검증식 정정버전 적용). (gNav zh 10키 3e491ff.)
- session115_adopt_gnav_zh_subsetdel_v2.py ★★ — **114 subsetdel + 고유명사 화이트리스트 예외 정밀완화 표준**. 핵심가드(삭제대상⊆현지어완전체, 손실0, 백업/재스캔독립검증/ROLLBACK) 무변경 + PROPER_NOUN 비현지어키는 현지어 간주. (gNav zh dash중첩본 100키 삭제 7ba7b2c.)

### 114차 자산 (보존)
- session114_adopt_acctperf_dashdel.py ★ / session114_adopt_gcat_ja_nestdel.py ★ — 영문stub 중첩본 삭제 표준.
- session114_adopt_gnav_zh_subsetdel.py — 폐기·**v2로 대체**(고유명사 미인지로 정당 ABORT했으나 과보수, 115 v2가 정밀완화 표준).
- session114_probe_*.py — 참고용 보존.
- ※ session111_subset_absent.py = 폐기·사용금지.

## 4. [DONE] 115차 결과 (raw 확정·apply 성공만)

### 4-0. push — 묶음 보류 유지
HEAD=7ba7b2c. origin 대비 **↑13**(112차2 / 113차2 / 114차3+인계서1 / 115차5 전부 origin 미반영). 검수자 결정: 계속 묶음 보류. push 시점 미정(사용자 승인 시).

### 4-1. ★ gCat zh 복구 완료 (ecdaa97) — 114차 "데이터손상→이관" 판정 뒤집음
- raw: zh gCat 2블록(ROOT/[dash]) 각 20키 전부 영문stub(한자0). **ko 2블록 각 20키 한국어정답완전(한글20)**, en∩ko=20.
- 결정: ko 한국어 정답 정상 → "데이터손상 이관"이 아닌 **ko기반 zh 신규번역 복구**.
- 처리(session115_adopt_gcat_zh_translate.py --apply): 40키 영문stub→검수자확정 중국어 in-place 치환. node PASS·독립검증 40/40 PASS. commit ecdaa97 (40 ins/40 del, 키변경0).

### 4-2. ★ gAiRec ja[ui] 완료 (a4363cd)
- raw: ja gAiRec 3블록 — [ruleEnginePage]75 / [dash>operations]75 영문stub / **[ui]38(인계서 "진짜ROOT 38"이 이것, 부모=ui)**. ja[ui]38 중 26키 기존 일본어정답, 12키 영문/혼재.
- 결정: 26키 보존, 12키만 ko기반 일본어 정정(화이트리스트 외 무접촉).
- 처리(session115_adopt_gairec_ja_ui12.py --apply): 12키 치환. node PASS·독립검증(키수38불변/일본어26→38/12-12) PASS. commit a4363cd (12/12, 키변경0).

### 4-3. ★ gAiRec zh ROOT 완료 (e9f8bef)
- raw: zh gAiRec 진짜ROOT[]75키 — 한자1(searchPlaceholder만)/영문stub69, title="Email Marketing" XPAGE오염. ko 75키 정답.
- 결정: ko기반 71키 중국어 치환(고유명사 Coupang/11Street/Gmarket/channel_ 4키 현값=정답 SKIP), title XPAGE오염 정정.
- 처리(session115_adopt_gairec_zh_root.py --apply): **1차 검증식 버그(fixed_ok 75 vs plan 71 → 정상인데 ROLLBACK, zh.js 무손상)**. 검증식 정정(기대=plan71+skip4=75) v2 재apply: 71키 치환. node PASS·독립검증 75/75 PASS. commit e9f8bef (71/71, 키변경0).

### 4-4. ★ gNav zh 2순위 완결 (3e491ff + 7ba7b2c) — 114차 N-5 해소
- raw: zh gNav 3블록 — [marketing]65 / 진짜ROOT[]104(한자93, 영문stub11) / [dash>operations]100(영문stub). 11키 = apiKeys/aiMarketingHub/aiPrediction/whatsapp/instagramDm/lineChannel/supplierPortal/alertPolicies/actionPresets/dbAdmin/pgConfig. ko커버 10(whatsapp은 고유명사=정답).
- ① ROOT 11키 보완(session115_adopt_gnav_zh_root11.py --apply): whatsapp SKIP, 10키 ko기반 중국어 치환. node PASS·독립검증 11/11 PASS. commit 3e491ff (10/10).
- ② dash중첩본 삭제(session115_adopt_gnav_zh_subsetdel_v2.py --apply): 114 subsetdel은 whatsapp(고유명사) 미인지로 정당 ABORT → **고유명사 화이트리스트 예외 정밀완화 v2** 제작. 삭제대상100⊆진짜ROOT104(삭제대상-완전체=0), 비현지어 1키=whatsapp 고유명사 → 손실0 입증. 100키 영문stub 중첩본 삭제. node PASS·독립검증(블록3→2/ROOT키집합불변/중첩본제거) PASS. commit 7ba7b2c (102 del).

### 4-5. 이관 확정 사안 (raw로 손실/미완 입증 — 정밀 이관)
- **gAiRec ja 중첩본 2개**: [ruleEnginePage]75 / [dash>operations]75 영문stub. **각 중첩본-ja[ui]38 = 37키(완전체 부재)**. ja[ui]는 ko75의 부분집합(38키)이라 ja[ui] 자체가 부분정답. 단순삭제 시 37키 손실. → 116차 1순위(ja[ui] 누락 37키 ko기반 보강 후 subsetdel_v2 적용).
- **operations ja/zh**: 115 probe raw — ko [dash]300키 한국어66%(정답신뢰가능, en∩ko=300). ja 3블록(진짜ROOT 없음 / [ruleEnginePage]296 한자144·가나98 부분정답 / [dash]301 영문stub / [auth]13 일본어). zh 진짜ROOT296(한자170 부분정답)/[dash]302영문stub. 타섹션오염 ja5/zh6키(auto/marketing/gAiRec/gBudget/super/gNav prefix). **부분정답+부분미번역+소수오염 복합** → 116차 정밀 raw(ja 3블록 키별 실값 + 오염키 실값) 선행 후 복구설계. operations 최난도, 진단까지 완료.

## 5. [PENDING] 116차 작업 (★raw 확정 즉시 연속 진행, 손실입증 시만 이관)

### 0순위 — push 상태 재확인
```
t cd D:\project\GeniegoROI; git log --oneline -10 2>&1 | Out-File t116_status.txt -Encoding utf8; git status --short 2>&1 | Out-File t116_status.txt -Append -Encoding utf8; code t116_status.txt
```
확인: HEAD=7ba7b2c, origin 대비 ↑13, working tree clean(추적 .js 잔여 없음, ?? = .bak/.py/t*.txt 정상). 이상 없으면 즉시 1순위.

### 1순위 — gAiRec ja 37키 보강 후 중첩본 정리 (4-5 참조)
- ja[ui]38 = ko75의 부분집합. 누락 37키(adCampaignTimeline/adDefault/adImgCreate/aiBudgetBase/allApprove/analysisRes/analyzingBest/annual/autoGenFormats/benchmark... 등) ko 한국어정답 존재(115 dump_gairec_x raw에 ko75 전체 확인됨).
- ① session115_dump_gairec_x.py 재실행으로 ko 75키 + ja[ui] 38키 raw 재확인 → 누락 37키 ja 일본어 검수자 확정.
- ② ja[ui]에 37키 ko기반 일본어 신규 삽입 도구(검수자 산출물). **삽입은 치환과 달리 라인 추가** — 가드: ja[ui] 블록 끝 직전 삽입, 38→75키, 기존 38키 무접촉, 백업/dry-run/독립검증/ROLLBACK.
- ③ ja[ui]가 75키 완전체화되면 session115_adopt_gnav_zh_subsetdel_v2.py의 ja 파생(SEC=gAiRec, PROPER_NOUN=11Street 등)으로 [ruleEnginePage]/[dash>operations] 중첩본 2개 삭제.
- 검수자 추천: dump 재확인(①)부터. 37키 신규번역은 규모 크므로 raw 확정 후 연속.

### 2순위 — operations 정밀 raw → 복구설계 (★최난도, 4-5 참조)
- 115 probe로 구조 확정. 다음: ja 3블록([ruleEnginePage]296/[dash]301/[auth]13) + zh(ROOT296/[dash]302) 키별 실값 + 타섹션오염 ja5/zh6키 실값 dump(읽기전용).
- ko [dash]300키(한국어199, 정답신뢰가능)가 복구원본. ja[ruleEnginePage]296·zh ROOT296 부분정답과 ko 교차 → 미번역분만 ko기반 보완, 오염키 격리.
- 자동 .js편집은 복구설계 확정 후. 진단(읽기전용)부터.

### 3순위 — accountPerf ja 의미충돌 3키 수동
114차 4-2 잔여. ja [ruleEnginePage]정답↔진짜ROOT[] pageSub/pageTitle/teamDashboard 일본어끼리 의미상이. i18n 폴백 경로 raw 확인 후 키단위 정정.

### 4순위 — priceOpt 잔여 (113차 4-2)
priceOpt ROOT[1]↔파편[2](208,값상이66)·[2](90,타페이지오염38키). 키단위 수동. 오염38키(title="Email Marketing"류) 타페이지 귀속 별도.

### 5순위 — DIVERGE 본래분
zh supplyChain(∩75)+ja supplyChain/marketing(∩124)/acctPerf(∩11). 수동 키단위. 자동 금지.

### 6순위 — 미번역·백로그
- **budget ja/zh**: 114차 4-4 — 3블록 전부 영문stub(가나0/한자0), 현지어 정답 부재. ko budget 정답 존재 여부 115식 probe 선확인 → 존재 시 ko기반 복구(gCat zh 패턴), 부재 시 신규번역.
- [N-6] settlements ROOT/auth 중복(라인변동 재탐색). [NEW-3] 109차[B] finalverify ar/hi/pt/ru. [C] 키단위diff/comingSoon·budget EN카피/runAI·runAi/workspace 브랜드·CRLF/D안 ESLint/E안 CSV/F안 Connectors/107차 attrData zh.

### 마지막 — 묶음 push (검수자 확인 하)
```
t cd D:\project\GeniegoROI; git log --oneline -14 2>&1 | Out-File t116_pushchk.txt -Encoding utf8; code t116_pushchk.txt
```
검수자 push 승인 시: `t cd D:\project\GeniegoROI; git push origin master` (deploy.yml 자동배포 트리거). ↑13 누적분 일괄 반영.

## 6. 즉시 체크리스트 (116차)

1. [ ] 0순위 git log/status(HEAD=7ba7b2c, ↑13, working tree clean). 이상 없으면 즉시 1순위.
2. [ ] 1순위 gAiRec ja: dump_gairec_x 재실행 → ko75/ja[ui]38 raw → 누락37키 검수자 확정 → 삽입도구(38→75) → subsetdel_v2 ja파생으로 중첩본2 삭제.
3. [ ] **probe 도구 우선**(부모체인 명시). inspect 계열 중첩본 오인식 주의.
4. [ ] 신규 .py는 sed 금지, 검수자 완성본 산출물 → 사용자 1회 저장 → 단순 python 한 줄.
5. [ ] node --check 출력없음=PASS. `$LASTEXITCODE` 등 임베디드 금지.
6. [ ] raw 확인은 code <txt> 파일 원본. CC 요약·SAFE분류 절대 불신, 키별 실값 육안.
7. [ ] 동명블록 다중존재 의심(운영규칙 9). probe로 매번 부모체인·값분포 매핑.
8. [ ] 영문stub→ko기반 복구 시 검수자 확정 번역 내장(LLM 자동생성 아님). **검증식 = fixed_ok 기대값 plan+skip_done로 비교**(115 zh ROOT 버그 교훈, 절대 plan만 비교 금지).
9. [ ] 고유명사(whatsapp/Coupang/11Street/Amazon/Gmarket/channel_ 등 ko=en=현지어 동일영문)는 미번역 아닌 정답 → 치환 SKIP + subsetdel 가드 화이트리스트 예외(115 v2 표준).
10. [ ] 의사결정 분기 시 검수자 추천 1개 옵션 명시+근거(0의 ★★). 사용자 "추천대로"=즉시 진행.
11. [ ] 부분종결은 인계서 작성 직전 1회만. 그 전 자발적 종결 금지(0의 ★진행 강제).
12. [ ] 종결 시 본 인계서 동일 형식 전체 재작성(검수자 단일파일 → 사용자 NEXT_SESSION.md 전체 교체).

## 7. 파일 상태

- t113_*/t114_*/t115_* 결과 txt 루트 보존(raw 이력). 116차는 t116_* 사용.
- 115차 백업 5개: zh.js.bak_session115_gcatZhTranslate_20260518_123257(ecdaa97), ja.js.bak_session115_gairecJaUi12_20260518_124037(a4363cd), zh.js.bak_session115_gairecZhRoot_20260518_124513·124636(e9f8bef, 124513=1차버그ROLLBACK분), zh.js.bak_session115_gnavZhRoot11_20260518_125529(3e491ff), zh.js.bak_session115_gnavZhSubsetDelV2_20260518_130006(7ba7b2c). 114/113/112/110/109차 백업 보존.
- .py 자산: 3절 목록. 검수자 산출물 → 사용자 루트 저장. 컨테이너 초기화 → 매번 재저장. session111_subset_absent.py·session114_adopt_gnav_zh_subsetdel.py 폐기·사용금지(후자는 v2 대체).
- git: HEAD=7ba7b2c, origin 대비 ↑13(push 보류). 추적변경 NEXT_SESSION.md만(나머지 ?? 미추적 정상).
- NEXT_SESSION.md = 본 인계서. 116차 종결 시 전체 교체.

### 신규 사안
- [N-1] ✅ gCat zh 완료(ecdaa97). 114차 "데이터손상" 판정 뒤집고 ko기반 복구. **ko가 정답원본 = 핵심 발견.**
- [N-2] ✅ gAiRec ja[ui] 완료(a4363cd). 26키 보존, 12키 정정. 화이트리스트 외 무접촉 표준.
- [N-3] ✅ gAiRec zh ROOT 완료(e9f8bef). 71키 복구+XPAGE오염 정정. **검증식 버그→정정(plan+skip_done) = 116차 필수 교훈.**
- [N-4] ✅ gNav zh 2순위 완결(3e491ff+7ba7b2c). 114차 N-5 해소. **고유명사 화이트리스트 예외 = subsetdel_v2 표준.**
- [N-5] ★미해결(116차 1순위): **gAiRec ja 중첩본 37키 손실위험** — ja[ui]38은 ko75 부분집합. 37키 ko기반 보강(삽입) 후 subsetdel_v2 ja파생으로 중첩본2 삭제.
- [N-6] ★미해결(116차 2순위): **operations 최난도** — ja/zh 부분정답+부분미번역+타섹션오염 ja5/zh6. ko[dash]300 정답원본. 정밀 raw 후 복구설계.
- [N-7] 미해결(3순위): accountPerf ja 의미충돌 3키.
- [N-8] 미해결(4순위): priceOpt 잔여 파편[2]208·[2]90.
- [N-9] 미해결(6순위): budget ja/zh 영문stub(ko 정답존재 여부 선확인) / settlements 중복.
- 속도 원칙(필독): "초엔터프라이즈급"=품질·안전, 진행 더디게 하란 의미 아님. (a) 합성검증 핵심1~2종, 나머지 실파일 dry-run. (b) 도구 버전 난립 금지(inspect_suspect 파서 무변경, SEC만 파생). (c) 매 턴 결과확인+다음도구 동시. (d) 부분종결 인계서 직전 1회, 한 세션 최소 2단계 apply+commit(115차 5커밋 초과달성). (e) raw 확정 즉시 연속, "추측 금지"를 속도저하 명분 금지. 단 raw로 손실/미완/오염 입증 시(115 gAiRec ja 중첩본/operations) 강행 대신 정밀 이관 — 가드가 키손실·검증버그·미번역 차단이 안전설계 정당성. (f) 의사결정 분기 시 검수자 추천 1개 강제(0의 ★★). (g) 신규 .py는 sed 아닌 검수자 완성본 산출물. (h) **영문stub→ko기반 복구가 115차 핵심 발견 — 114차 "데이터손상 이관" 다수가 실제로는 ko 정답 보유 복구가능. 116차 budget 등도 ko 선확인 필수.** (i) **검증식은 반드시 plan+skip_done 기대값 비교**(plan만 비교 시 정상인데 ROLLBACK — 115 zh ROOT 실증).