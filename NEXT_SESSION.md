# GenieGoROI i18n 인계서 — 130차 시작점

> 본 문서는 129차 검수자가 전체 작성. 130차 검수자는 이 문서
> 전체를 신뢰 기반으로 삼되, 모든 수치·상태는 130차 시작 시
> raw 재확인 후 진행할 것. 추측 보류 금지 — raw 로 0/부재를
> 입증해야 보류가 정당.

---

## 0. 운영 원칙 (절대 — 매 차수 최우선 준수)

**0순위 절대원칙**
1. 작업 여력이 있으면 부분 종결이라도 최대한 진행한다. 복구가
   불가하면 검증·진단이라도 끝까지 수행한다. 인계서 작성 전
   반드시 사용자 승인을 받는다. 인계서는 검수자가 전체 작성
   하며(기존 전체 삭제 후 전체 붙여넣기), 임의 종결·임의 인계
   작성 금지.
2. **추측 보류 금지**: "안전여력 소진/보류"를 선언하려면 raw
   수치로 0 또는 부재를 입증해야 한다. 추측으로 보류하면
   126차처럼 실재하는 회수분을 놓친다(N-18 교훈).
3. **★불가작업 전환 원칙 (사용자 명시 — 반드시 준수·계승)**:
   진행 중인 특정 작업이 그 차수에 raw 로 도저히 불가
   (물리한계·결정불가·정답출처 부재)함이 입증되면, 거기
   매달리지 말고 작업 여력이 있는 한 다른 진행 가능한 작업
   으로 즉시 전환한다. 부분 종결이어도 무방. 이 원칙을 인계
   작업 시 운영원칙에 반드시 반영한다.
4. **★불가의 2종 구분 (반드시 계승)**:
   - **종류 1 (물리·논리 불가)**: 데이터 구조 자체의 한계.
     도구·데이터가 동일하면 차수가 바뀌어도 결과 동일. 다음
     차수에 자동으로 풀리지 않음. 풀리려면 새 식별축 발굴
     또는 데이터 구조 변경이 선행돼야 함.
   - **종류 2 (선행부재 불가)**: 선행 작업이 없어서 불가.
     선행 조건이 충족되면 다음 차수에 동일 도구로 가능.
   ※ 인계서엔 "다음 차수에 하면 됨"이 아니라 **무엇이 선행
     돼야 가능해지는지**를 명시한다. 차수가 바뀐다는 사실
     자체는 아무것도 가능하게 만들지 않는다.
5. **★사용자가 ko 결정하는 영역 — 검수자/CC 추측 절대 금지
   (N-17/N-25, 129차 강화)**: ko_fixed 작성/보조표 추천/
   "자동 복원" 등 어떤 형태로도 검수자·CC 가 ko 값을 결정·
   추천·시사해선 안 된다. "영문 유지가 자연스러워 보이는"
   항목도 사용자 확정 없이는 적용 금지. 6건이 적다고 "자동
   처리" 도 안전원칙 뚫는 선례가 됨 — 적을수록 사용자 확정 +
   일괄 처리가 효율적.

**작업 수칙**
- 모든 CC 명령 맨 앞 `t ` 접두 필수.
- cp949 회피 표준형:
  `t $env:PYTHONIOENCODING="utf-8"; python <도구> 2>&1 | Out-File -Encoding utf8 <log>; $env:PYTHONIOENCODING=""; code <log>`
- 명령 연결은 `;` 만 사용(`&&`/`||` 금지). PowerShell에서
  `copy /Y` 안 됨 → CC가 자동으로 Bash `cp`로 재실행함(정상).
- CC 승인 프롬프트: `1.Yes/2.allow all/3.No` → `2`,
  `1.Yes/2.No` → `1`. 검증완료 .py 를 CC 가 자체수정
  시도하면 → `3`. 도구 버그는 CC 에 안 시키고 검수자가
  직접 수정(N-18).
- 검수자 설명은 한글·핵심만 짧게. 초엔터프라이즈급 정밀도.
- ★사용자 선택지 제시 시 **검수자 추천 1개 반드시 명시**
  (128차 사용자 명시 지시). 사용자가 "검수자 추천"이라
  답하면 그대로 진행.
- ★검수자가 수정 문서를 만들면 사용자가 폴더에 저장 →
  검수자가 CC 명령으로 적용 (129차 사용자 명시 워크플로우).
  사용자 직접 수정은 ko_fixed CSV 작성 등 꼭 필요한 경우만.
- push 는 사용자 명시 승인 시에만(현재 origin 대비 미실행
  유지 — 5-4).
- read-only 진단/probe 우선. apply 는 dry → raw → apply
  순. 백업+node+rollback 필수. 합성검증 ALL PASS 아니면
  abort.

---

## 1. 프로젝트 좌표

- locale: `D:\project\GeniegoROI\frontend\src\i18n\locales\{ko,ja,zh}.js`
- 인계서 본체: `D:\project\GeniegoROI\NEXT_SESSION.md`
  (PM_HANDOVER.md / FEATURE_PLAN_120.md 는 불변, 건드리지 말 것)
- 작업 도구: `D:\project\GeniegoROI\session129_*.py` (검증자산)
- ko leaf-paths 총수(129차 시작 raw): 19,801

---

## 2. 핵심 검증자산 (N-13: 무변경 재사용 — 절대 재작성 금지)

**검증 모체 (import 전용, 무변경)**
- `session125_recover_safestub_jazh`:
  `build_leaf_paths`(text→dict, **값은 JS raw escape 보존**
  — 128 N-28 raw 확정),
  `_ko_suspect(path, ko_val)` — 2인자 시그니처(128 N-18 raw),
  `_is_hashkey`(auto.<숫자없는 영숫자> 미식별 한계),
  `KO_CONTAMINATED`, `norm`,
  `scan_key_blocks`(최상위 블록만),
  `extract_kv(body)` 1인자, ANYKEY_RE, `locate_and_plan`/
  `apply_plans`, **LEAF_RE_TMPL** = `("%s"\s*:\s*)("(?:[^"\\]|\\.)*")`

**128차 검증 자산 (무변경 재사용 가능)**
- `session128_apply_auto4_ko.py` (8ca2ff5 회수 도구, 129차
  apply_ko_unified.py 의 N-13 모체)
- `session128_make_ko_sheet_az88.py` (시트 생성 도구 N-13 모체)
- 기타 128차 도구는 인계서 128차 § 2 참조

**129차 신규 도구 (검증완료)**

회수 도구:
- `session129_recover_mirror7.py`        → fc84c08 (7건, root←dashops)
- `session129_apply_ko_unified.py`       → 일반화 회수 도구
                                          (--csv/--bak-suffix 인자)

진단 도구 (read-only):
- `session129_diag_global_writetarget.py` → ko.js 전체 작성대상 전수
- `session129_diag_auto_breakdown.py`     → auto.* 영역 분류
- `session129_diag_auto_unified.py`       → auto.* 299 매핑 + az88 검증
- `session129_diag_mirror7.py`            → 7건 회수 방향 확정
- `session129_diag_marketing_v2.py`       → marketing 분포 (v1 폐기)
- `session129_diag_mk87_paths.py`         → mk87 path 구조
- `session129_diag_mk87_widekeys.py`      → mk87 광범위 key 위험 분석
- `session129_diag_mk87_realrisk.py`      → mk87 ko_broken_set 정밀 위험
- `session129_diag_residual.py`           → 잔여 영역 분포
- `session129_diag_residual_risk.py`      → 잔여 영역 위험 정밀

시트 생성 도구:
- `session129_make_ko_sheet_az_unified.py` → az_unified 146 key
- `session129_make_ko_sheet_mk87.py`       → mk87 55 key
- `session129_make_ko_sheet_residual.py`   → residual 253 key
- `session129_make_ko_sheet_generic.py`    → 일반화 시트 도구 (예비)

폐기 도구:
- `session129_diag_marketing_namespace.py` → v1, prefix 가정 잘못
- `session129_diag_dashops_audit.py`       → 일회성 검증 (목적 달성)

---

## 3. 완료 커밋 (HEAD = fc84c08 직후 + 인계커밋, 129차 1커밋 + 인계커밋)

| 커밋 | 내용 | 건수 |
|---|---|---|
| fc84c08 | i18n(5-C mirror7) recover auto.{key} root ko from dashops mirror (ja/zh unchanged, ko7) | 7 |

- **129차 누적**: 회수 7건 (mirror7 root←dashops)
- **전체 누적**: 128차까지 6,548 + 129차 7 = **6,555건**
- 안전검증: dry→raw→apply, 백업+node+rollback, 합성검증 ALL PASS,
  ja/zh byte-level 무변경 확인 (N-31 신규).
- node --check ja/zh/ko = 0 (정상). locale tracked clean.
- origin 대비 push 미실행(5-4, 사용자 승인 대기).

---

## 4. 129차 핵심 발견 (130차가 반드시 알아야 할 것)

### N-32 — 인계서 추정치 다수 raw 정정 (대규모)

128차 인계서의 추정치들이 실측에서 대폭 변동됨:

| 항목 | 128차 추정 | 129차 실측 | 비고 |
|---|---|---|---|
| auto.* leaf_key (az88) | 128 | **319 고유** (root 153 + dashops 146) | root+dashops 100% 미러 |
| az88 sheet 커버리지 | 작성대상 128 | **작성대상 1, CLEAN 127** | sheet 부적합 → 폐기 |
| auto.* 실제 작성대상 leaf_key | 128 | **153** (mirror7 7 회수 후 **146**) | OTHER 위주 |
| marketing R1 ko 부재 | 3,020 | **87 path / 55 leaf_key** (mk87) | 대폭 축소 |
| auto.* 외 ja/zh 진짜깨짐 전파 | 10 | **0** | 이미 회수됨 |
| 숨은 작성대상 (미발견 영역) | 미인지 | **잔여 384 path / 253 leaf_key** | residual sheet |

**핵심 교훈**: 인계서 추정치는 raw 가 아니다. 매 차수 시작 시
raw 재측정 필수. 추정에 의존해 시트 만들면 az88 처럼 부적합 시트
나옴.

### N-33 — 광범위 leaf_key 의 ko_broken_set 자연 SKIP 안전성 raw 검증

leaf_key 가 ko.js 전체에 5+ 위치 등장하는 광범위 key 의 경우:
- 작성대상 카테고리 path 의 ko 값 = `ko_broken_set`
- CLEAN path 의 ko 값 ≠ `ko_broken_set` (자연 SKIP)
- raw 검증 결과: mk87 광범위 69 CLEAN 위험 0, residual 281 CLEAN
  위험 0

따라서 회수 도구의 leaf_key 단위 + ko_broken_set 매칭 가정은
광범위 key 영역에서도 안전. apply_ko_unified.py 가 단일 도구로
모든 영역(az_unified/mk87/residual) 처리 가능한 근거.

**단, 130차 시작 시 raw 재측정 권장** — 새 sheet 추가 시 동일
검증 (residual_risk 패턴) 필수.

### N-34 — 도구 일반화 원칙 (CSV/백업접미사 인자화)

128차까지의 회수 도구는 도메인별로 별도 작성 (mk-valuniq, mk-pathsolo
등). 129차에 일반화:
- `apply_ko_unified.py`: CSV 경로 인자, 백업 접미사 인자, prefix
  매칭 제거 (leaf_key 가 일치하는 모든 path 자동 처리)
- 시트 도구도 generic 버전 작성 (`make_ko_sheet_generic.py`)
- N-13 정신: 같은 패턴 도구 반복 작성 금지. 인자화로 재사용성 확보.

130차 신규 시트가 필요하면 generic 도구 또는 residual 도구의
N-13 계승.

### N-35 — root↔dashops 미러 자체 일관화 회수 패턴 (mirror7 신규)

같은 leaf_key 가 두 위치(`auto.{key}` + `dash.operations.auto.{key}`)
에 존재하고, 한쪽이 깨졌고 다른 쪽이 CLEAN 일 때 raw 기반 자체
일관화 회수 가능.

- raw 기반: ko.js 가 이미 정답을 보유 (추측 0%)
- N-17/N-25 위반 아님: 검수자가 ko 결정 안 함
- ja/zh 는 무변경 (별개 언어 번역 — 사용자/번역자원 영역)
- 7건 raw 입증 (fc84c08): new900~905, event_empty

**130차 적용 가능성**: 다른 영역에 동일 패턴 있는지 raw 측정 시
자동 회수 기회. 단, ja/zh 회수는 별도 정답 출처 필요 (5-B 잔여).

### N-36 — ja/zh 깨진값 전파 회수 잔여 (mirror7 이후)

mirror7 7건은 ko 만 회수. root 의 ja/zh 는 여전히 깨진 영문값
(root ko 가 깨졌던 시점에 전파된 상태) 보유. dashops 측 ja/zh
도 None (정상값 부재).

→ ja/zh 회수는 일본어/중국어 정답 별도 필요. 130차 또는 후속
회수 기회로 기록.

### N-37 — 시트 ko_fixed 작성은 사용자 단독 영역 (강화)

129차 워크플로우 명시:
- 검수자/CC 가 "자동 추천", "영문 유지 자동 처리", "보조표 추천"
  등 어떤 형태로도 ko_fixed 결정 시사 금지
- 6건이 적다고 자동 처리하면 안전원칙 뚫리는 선례
- ko_broken 패턴 분류 보조표는 가능 (추천 없음, 묶음만)
- 사용자 작성 → 검수자 binary-safe 도구 → CC 명령 적용 워크플로우
  엄수

---

## 5. 잔여 백로그 (raw 확정 — 130차 작업 후보)

### 5-A. 종류 1 (물리·논리 불가 — 선행 없이는 차수 무관 불가)

**128차 인계 그대로 (129차 미작업)**:
- marketing R1 中 bad/mismatch 12건 (probe_order self-verify
  불성립, 128차 d8bd83a 시 종류1 확정)
- marketing R1 中 ko 부재로 종류2인 분 (수치 정정: 3,020 추정 →
  실측 mk87 87 path)
- **129차 가능 조건**: 5번째 결정적 식별축을 read-only effect
  측정으로 발굴해야만 가능. 단순 차수 변경으론 불가.

### 5-B. 종류 2 (선행부재 불가 — ko 정답 작성 선행 시 가능)

**★최우선 — 시트 3종 사용자 작성 대기 (총 454 leaf_key)**

| 시트 | leaf_key | path 합계 | 도구 |
|---|---|---|---|
| `_ko_sheet_az_unified.csv` | 146 | ~292 (root+dashops) | apply --bak-suffix s129azu |
| `_ko_sheet_mk87.csv` | 55 | 87+ (광범위 key 포함) | apply --bak-suffix s129mk87 |
| `_ko_sheet_residual.csv` | 253 | 384 | apply --bak-suffix s129res |

- 단일 회수 도구: `session129_apply_ko_unified.py`
- 사용자가 ko_fixed 채워 저장 → 검수자가 CC 명령으로 적용
- 빈칸 자동 SKIP (부분 처리 OK)
- 광범위 key 안전성 raw 검증 완료 (N-33)
- 적용 명령 예:
  ```
  t $env:PYTHONIOENCODING="utf-8"; python session129_apply_ko_unified.py apply --csv _ko_sheet_az_unified.csv --bak-suffix s129azu 2>&1 | Out-File -Encoding utf8 _t130_azu_apply.log; $env:PYTHONIOENCODING=""; code _t130_azu_apply.log
  ```

**130차 가능 조건**: 사용자가 시트 ko_fixed 칸 채우면 즉시 가능.
한 시트 부분 작성도 OK (빈칸 SKIP).

**ja/zh 깨진값 전파 회수 (N-36)**:
- mirror7 7건의 root ja/zh 잔여
- 다른 영역 ja/zh 진짜깨짐 (auto.* 외) — 현재 raw 0건 (이미 회수)
- 새 발견 시 별도 시트/도구 필요. ko 회수와 별개 흐름.

**ABSENT-only key (apply_ko_unified.py 회수 불가)**:
- ko 값이 None 인 path 만 가진 key 는 leaf_re 토큰 치환 불가
  (auto4/az88 도구 한계)
- 본 도구 자동 SKIP + 경고. 별도 처리 도구 필요 (block 단위 삽입)
- 130차 raw 측정 + 별도 도구 작성 후보

### 5-C. 독립 과제 (128차 인계 + 129차 변동)

- **5-1 #3 성과허브**: ko 464키 신규작성 선행. 별개 과제.
- **5-4 push**: origin 대비 미실행. 128차 4커밋 + 128→129 인계
  커밋 + 129차 1커밋 (fc84c08) + 129→130 인계커밋. 사용자 명시
  승인 시에만.
- **_is_hashkey 경계 부정확**: 'auto.<숫자없는 영숫자>' 미식별
  한계 그대로. az_unified 처리하면 영향 영역 대부분 해소될 가능성.
- **SyntaxWarning '\p'**: 일부 도구 docstring 내 `\p` 표기에서
  발생. 실행 무관. 정리는 선택사항.

---

## 6. 129차 무결성 raw 확정 (130차 신뢰 기반)

### 6-1. 커밋 무결성

- fc84c08 (mirror7): dry→raw→apply, 백업+node+rollback, 합성검증
  ALL PASS. ko 7건 변경 (7 ins / 7 del). ja/zh byte-level 무변경
  확인. 합성검증 pre/post ALL PASS.

### 6-2. 시트 무결성

- _ko_sheet_az_unified.csv : 146 key (광범위 위험 0 검증)
- _ko_sheet_mk87.csv       : 55 key (광범위 위험 0 검증)
- _ko_sheet_residual.csv   : 253 key (광범위 위험 0 검증)
- 합계 454 leaf_key, 빈칸 SKIP 동작 검증 (dry 3회 모두 NOOP 정상)
- 폐기: `_ko_sheet_az88.csv.deprecated` / `.json.deprecated`
  (128차 사용 시트, 부적합 raw 확정 — N-32)

### 6-3. 도구 동작 검증

- session129_apply_ko_unified.py: 3 시트 모두 dry NOOP 정상
- session129_recover_mirror7.py: dry PASS + apply PASS 검증

### 6-4. locale 상태

- node --check ko/ja/zh = 0 (정상)
- locale tracked clean (수정된 추적 파일 없음)
- origin 대비 push 미실행 (5-4)

**결론: 129차 1커밋 무결성 raw 확정. 시트 3종 준비 완료.**

---

## 7. 130차 실행 로드맵 (★우선순위 — 이 순서대로)

**0단계 — 시작 시 raw 재확인 (필수)**
```
t node --check frontend/src/i18n/locales/ja.js; node --check frontend/src/i18n/locales/zh.js; node --check frontend/src/i18n/locales/ko.js; git log --oneline -7; git status --short
```
HEAD 인계커밋 + fc84c08 확인, locale clean, node 3개 OK.

**★1순위 — 시트 사용자 작성 진행도 raw 측정 + apply 진행**
- 3 시트 (az_unified/mk87/residual) 의 ko_fixed 작성 진행도 측정
- 작성된 분만으로 apply (빈칸 자동 SKIP, 부분 처리 OK)
- 적용 후 합성검증 ALL PASS 확인 → 커밋

각 시트 적용 명령 (사용자 작성 후):
```
# az_unified
t $env:PYTHONIOENCODING="utf-8"; python session129_apply_ko_unified.py dry --csv _ko_sheet_az_unified.csv --bak-suffix s130azu 2>&1 | Out-File -Encoding utf8 _t130_azu_dry.log; $env:PYTHONIOENCODING=""; code _t130_azu_dry.log

# mk87
t $env:PYTHONIOENCODING="utf-8"; python session129_apply_ko_unified.py dry --csv _ko_sheet_mk87.csv --bak-suffix s130mk87 2>&1 | Out-File -Encoding utf8 _t130_mk87_dry.log; $env:PYTHONIOENCODING=""; code _t130_mk87_dry.log

# residual
t $env:PYTHONIOENCODING="utf-8"; python session129_apply_ko_unified.py dry --csv _ko_sheet_residual.csv --bak-suffix s130res 2>&1 | Out-File -Encoding utf8 _t130_res_dry.log; $env:PYTHONIOENCODING=""; code _t130_res_dry.log
```
dry PASS 확인 후 apply.

**★2순위 — ja/zh 깨진값 전파 영역 raw 재측정 (N-36)**
- mirror7 7건의 root ja/zh 잔여 + 다른 영역
- read-only diag 작성 (session129_diag_global_writetarget.py 의
  ja/zh 부분 N-13 계승)
- 새 회수 기회 발견 시 도구 작성

**★3순위 — ABSENT-only key 별도 처리 도구 (N-13 신규 패턴)**
- apply_ko_unified.py 가 회수 불가한 영역
- leaf_re 토큰 치환이 아닌 block 단위 삽입 도구 필요
- read-only raw 측정 → 도구 설계 → 검증 → apply

**4순위 — order-axis R1 새 식별축 발굴 (5-A, 도박성)**
- effect>0 식별축 못 찾으면 종결
- 우선순위 최하

**진행 불가 시**: 각 순위에서 raw 로 부재/불가 입증 후 다음 순위로
전환(0-3). 전부 불가면 정직하게 부분종결, 사용자 승인 받아 인계.

---

## 8. 종결 절차 (사용자 승인 후에만)

종결 요약 보고 → 사용자 승인 → 검수자가 NEXT_SESSION.md
전체 작성(기존 삭제 후 전체 붙여넣기) → 사용자 저장 →
CC 명령으로 차수 인계 커밋:
`t git add NEXT_SESSION.md; git commit -m "docs(handover): session 130 -> 131"; git log --oneline -3`

※ 사용자 명시 지시 (반드시 계승):
- 작업 여력 있는 한 미측정 축 계속 발굴·진행
- 불가작업엔 매달리지 말고 전환 (0-3)
- 종류1/종류2 구분으로 "무엇이 선행돼야 가능한지" 명시 (0-4)
- 선택지 제시 시 검수자 추천 1개 반드시 명시
- 도구는 검수자가 작성 (CC 자체작성 금지, N-18)
- 사용자가 ko 결정하는 영역은 추측원복 절대 금지 (N-17/N-25/N-37)
- 검수자 수정 문서 → 사용자 폴더 저장 → 검수자 CC 명령 적용 워크플로우
- 초엔터프라이즈급 정밀도 유지

---
*(129차 검수자 작성. 모든 수치 raw 확정. 130차는 시작 시
재확인 후 진행.)*