# GenieGoROI i18n 인계서 — 122차 시작점

> 본 문서는 매 세션 종결 시 **검수자가 단일 파일로 전체 재작성** → 사용자가
> `D:\project\GeniegoROI\NEXT_SESSION.md` 전체 교체. PM_HANDOVER.md /
> FEATURE_PLAN_120.md 는 **별개 인계서로 불변**(절대 건드리지 않음).

---

## 0. 작업 개요

i18n 번역 키 동기화 프로젝트. locale 경로:
`D:\project\GeniegoROI\frontend\src\i18n\locales\{lang}.js`

- **정답원본 = ko.js (한국어)** — 모든 복구/번역의 의미 출처
- **ja.js 정답언어 = 일본어**, **zh.js 정답언어 = 중국어(간체)**
- 그 외 다국어(ar/de/hi/id/pt/ru/th/vi/zh-TW 등) 다수 존재하나 본 라인 외

### 검증 파서 모체 (★무변경 import 절대원칙)
`D:\project\GeniegoROI\session112_inspect_suspect.py` 의:
- `scan_key_blocks(text)` → 4-튜플 리스트 `(key, start, end, depth)`
- `extract_kv(body)` → 호출 시 `body = text[s+1:e]`. 값은 따옴표포함 +
  `re.sub(r"\s+"," ")` 정규화 (★중요: 양끝 따옴표 때문에 내부 의도공백 보존됨)
- `ANYKEY_RE`, `_at_key_position`, `_read_value` 도 동일 모체에서 import

신규 .py 도구는 이 검증완료 파서/패턴을 **무변경 재사용**한다 (N-13).

---

## 1. 운영 방식 (사용자 확정 — 불변)

- **검수자(=Claude)** 가 신규 `.py` 를 산출물로 만들어 `present_files` 전달
- **사용자**가 `D:\project\GeniegoROI` 루트에 저장
- 검수자가 **한 줄 명령**(t 접두 표기)을 주면 사용자가 실행 → raw txt 결과 붙여넣기
- 검수자 설명은 **한글, 핵심만 짧게**
- 의사결정 분기 시 **항상 검수자 추천 1개 명시** (인계서 규칙 근거)
- 여력 있는 한 **최대 작업 진행**. 부분종결 시에도 산출문서→저장→명령 방식 유지

### ★ 실행 환경 주의 (121차 실증)
사용자 측 `t` 접두는 표기 관례일 뿐. **실제 실행은 VS Code/Antigravity의
PowerShell 터미널 탭** 에서 이뤄져야 한다. AI 에이전트(CC) 채팅창에 명령을
'읽기'만 시키면 미실행된다. 한 줄 명령은 `;` 로 이어진 단일 PowerShell
명령이며, PowerShell 프롬프트(`PS D:\project\GeniegoROI>`)에 직접 붙여넣어
실행. 작업 디렉터리가 이미 루트면 `cd` 생략 가능.
붙여넣기 중 화면상 `\x3b` 등으로 깨져 보여도 실제 실행은 정상일 수 있으니,
**결과는 항상 별도 raw 검증 한 줄로 교차 확인** (추측 금지, N-17/규칙6).

### apply 한 줄 = 결합 명령
`python <tool>.py --apply` + `node --check <locale>` (Append) +
`git add <locale>` + `git commit -m "<영문 한 줄>"` (Append) +
`git log --oneline -3` (Append) → 단일 txt 로그.
CRLF→LF warning 은 무해. 검수자는 결과 raw 로 종결 판정.

---

## 2. 핵심 노트 (N-시리즈, 불변 계승)

- **N-13**: 검증완료 파서/패턴은 무변경 재사용. 신규 도구는 모체 import.
- **N-17 (★최중요)**: 파서기반 verify 는 JS 문법오류를 못 잡는다. 본 환경
  `node --check` 는 `export default { ... }` 표현식에서 `,,`·미완괄호 등
  일부 문법오류를 **통과시키기도** 한다. 따라서 안전장치는 **다중 AND +
  syntax증가0(정규식) + 실제 node --check + ROLLBACK** 의 조합이다.
  어느 하나도 단독 신뢰 불가. apply 는 다중 AND ALL PASS & node PASS 시에만.
- **N-18**: 인계서 표기와 raw 가 불일치하면 raw 기준 재판정 (판정기준을
  ko문자열비교 대신 '정답언어 보유측 판정' 으로 교정한 사례).
- **N-19**: ROOT직속 동일 섹션 2개↑ = 중복 비정상. dashdel 불가, **키 단위
  병합**(정답측 overwrite 후 잉여 블록 제거). 또한 **R 내부 최상위 키
  중복**(JS last-wins)도 동일 정신: 모든 출현을 동일 정답값으로 overwrite.

### 합성검증 필수 구성
실모체 미러 + 실파일 구조 픽스처(중첩/pages 동일키 함정 포함) + 실제 node
교차. 픽스처 설계 결함도 합성검증이 잡아낸다(121차 실증) — 픽스처는 실제
raw 구조와 일치시킬 것.

---

## 3. 121차 종결 상태 — 8커밋 (HEAD = e2b2a36)

git log 최상단부터:

| 커밋 | 작업 | 상태 |
|---|---|---|
| **e2b2a36** | marketing **ja** 436키 영문스텁→일본어 복구 | ✅ 종결 |
| 802a05b | marketing **zh** 195키 영문스텁→중국어 복구 | ✅ 종결 |
| 873837d | supplyChain **zh** 75키 복구 | ✅ 종결 |
| 6c97b73 | supplyChain **ja** 75키 복구 | ✅ 종결 |
| 450f387 | settlements **zh** 2중ROOT 병합 (61키, N-19) | ✅ 종결 |
| 1d573ed | settlements **ja** 2중ROOT 병합 (61키, N-19) | ✅ 종결 |
| 76e518c | priceOpt **ja** 2중ROOT 병합 (39키 INSERT, N-19) | ✅ 종결 |
| (그 위) | 3208d84 = 인계서 docs 커밋 (120차 말미) | — |

- origin/master 대비 **↑44 commits** (이번 세션분 포함). **묶음 push 보류**
  (검수자 승인 하에서만. push 시 deploy.yml 자동배포 트리거됨).
- accountPerf zh colCtr/colRoas: ko 도 영문스텁("CTR(%)"/"ROAS") = 정답출처
  부재 → **무처리 종결**(N-18). 재시도 불요.

### 검증완료 121 도구 (루트 저장됨, 재사용 가능)
`session121_diag_priceopt_merge.py`, `session121_merge_priceopt_ja.py`,
`session121_diag_settlements.py`, `session121_merge_settlements.py`,
`session121_diag_diverge.py`, `session121_recover_supplychain.py`,
`session121_recover_marketing_zh.py`, `session121_recover_marketing_ja.py`

---

## 4. N-17 디버그 교훈 4건 (marketing 복구 중 실증 — 신규 도구 필수 반영)

복구/overwrite 류 도구는 아래 4가지를 **모두** 내장해야 한다. 미반영 시
대량 다국어(특히 ja/zh) 값에서 재발한다:

1. **node_check cp949 디코딩**: `subprocess.run(..., text=True)` 는 Windows
   기본 cp949 로 중·일 출력 디코딩 중 `UnicodeDecodeError` → 거짓 FAIL/
   불필요 ROLLBACK. → `capture_output=True`(bytes 수신) 후
   `.decode("utf-8", errors="replace")`. returncode 로만 PASS 판정.
2. **검증 norm() strip 금지**: `extract_kv` 는 리터럴 양끝이 따옴표라
   `.strip()` 이 내부 의도공백을 못 깎아 보존함. 검증 비교용 `norm()` 에
   `.strip()` 을 쓰면 `"[생성테스트] "` 같은 접두/접미 공백 키가 거짓
   불일치. → norm 은 `re.sub(r"\s+"," ", s)` 만 (strip 없음).
3. **키 중복 = 모든 출현 overwrite**: R(섹션 ROOT) 내부에 동일 최상위 키가
   2회+ 존재 가능(JS last-wins). 첫 출현만 바꾸면 둘째(영문)가 실제 적용됨.
   → `find_all_value_spans`(최상위 모든 출현 리스트 반환)로 전부 overwrite.
   일반 키(출현1)도 동일 함수로 무해 처리. (121: zh marketing 6키 중복,
   ja marketing 은 중복 0 — 도구는 양쪽 자동 대응).
4. **개행/제어문자 JS 이스케이프**: 번역값에 리터럴 `\n`(다행 텍스트:
   AlertMsg/upgradalDesc 등) 포함 시, `quote_like` 가 그대로 `"..."` 로
   감싸면 JS 문자열에 raw 개행 → `SyntaxError`. → `quote_like` 에서
   `\r\n`/`\n`/`\r`→`\\n`, `\t`→`\\t` 이스케이프. **그리고 검증 norm() 에도
   동일 이스케이프 적용**(extract_kv 가 읽는 `\n` 2문자 형태와 정합).

→ `session121_recover_marketing_ja.py` / `_zh.py` 가 위 4건 전부 반영된
   **레퍼런스 구현**. 신규 복구 도구는 이 둘의 엔진부를 베이스로 한다.

---

## 5. 잔여 백로그 (122차 후보)

### 5-1. marketing 복구불가 키 (보류 — 별도 판단)
- marketing **ja 39키 / zh 21키**: ko 부재 또는 ko 자체가 영문스텁 →
  정답출처 없음. 무처리 보류. (ko 보강이 선행돼야 처리 가능 — 별개 과제)

### 5-2. 4순위 잔여 (인계서 누적 백로그)
- 키단위 diff 정밀 점검
- comingSoon / runAI·runAi 표기 불일치
- workspace 브랜드 키
- CRLF 일관화
- ESLint / CSV / Connectors 관련
- 107 attrData zh 잔여

진행 시: 안전 즉시처리 대상(ROOT직속1·ko정답보유·단일블록 overwrite)부터.
2중ROOT·정답분산·손상은 진단도구 선행 후 검수자 추천 분기.

### 5-3. 마지막 단계 (전 작업 종결 후)
- 묶음 **push** (검수자 승인 필수). origin ↑44+ → push 시 deploy.yml
  자동배포. 사용자 명시 승인 없이 push 금지.

---

## 6. 122차 즉시 재개 절차

1. **0순위 상태 확인** 한 줄 (검수자가 첫 산출):
   `git log --oneline -5` + `node --check ja.js` + `node --check zh.js` +
   `git status --short` → raw 로 HEAD=e2b2a36 / locale clean 확인.
2. 백로그 5-2 중 안전 대상 선정 → 진단 또는 복구 도구 작성(4절 레퍼런스
   엔진부 계승) → dry-run(다중 AND ALL PASS 확인) → apply 1커밋.
3. 분기 발생 시 검수자 추천 1개 명시 후 사용자 선택 대기.
4. 세션 종결 시 본 NEXT_SESSION.md 동일 형식 **전체 재작성** →
   사용자 전체 교체. PM_HANDOVER.md / FEATURE_PLAN_120.md 불변.

### 자산 위치
- 검증완료 도구: 3절 목록 (루트 저장됨)
- 백업: `{lang}.js.bak_session121_*` 다수 (각 apply 시 자동 생성, 복구 가능)
- 컨테이너 작업물은 세션 한정. 재개 시 도구는 위 레퍼런스에서 재파생.

---

*(끝. 본 문서만으로 122차 무손실 재개 가능. 의문 시 raw 교차확인 우선,
추측 금지 — N-17.)*