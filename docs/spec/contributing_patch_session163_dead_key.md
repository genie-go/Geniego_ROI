# 163차 dead-key gap 정량화 + §6 #43 + §7 trap J/K 영구화

> **세션**: 163차
> **트랙**: #43 → 25k gap 진실 규명으로 진화
> **저장**: 2026-05-26
> **방식**: CC inline heredoc (§7 #37 v4)

## 1. 핵심 수치

| 항목 | 값 |
|---|---:|
| ko.js leaves (canonical, `tools/leaf_count.mjs`) | 30,656 |
| ko.js leaves (J2-2 inline walk, array-recursing) | 30,692 |
| **counting Δ (§7 trap K)** | **+36** |
| direct refs (literal) | 5,272 |
| leaves ∩ direct | 4,541 |
| **orphan refs (JSX 호출, ko 미존재)** | **731** |
| prefix wildcards | 53 → 8,150 leaves cover |
| dynamic refs (변수명) | 3 ("key", "labelKey", "lk") — 정적 해결 불가 |
| **dead candidates** | **18,001 (58.65%), 이 중 ~36 은 array-element artifact → 실 dead ≈ 17,965** |
| 미설명 잔여 | 3,541 |

## 2. K3 통계 검증

20 random dead candidate → frontend/src 전체 grep.
- **19/20 hit=0** (95% TP)
- 1 FP: `segDesc` (48 hits, short-key substring collision)
- 정밀화 필요 시 strict pattern: `t\(["']<key>`

## 3. dead namespace 분포 (top)

| namespace | dead count |
|---|---:|
| pages | 5,052 |
| nav | 3,940 |
| ruleEnginePage | 2,221 |
| aiPredict | 300 |
| dataProduct | 270 |
| _marketing_1 | 239 |
| auto.* | hash-suffix 다수 |

**기여 요인 (우선순위)**:
1. page deletion without locale cleanup (pages.mobile.commerce, pages.priceOpt.unifiedROI 등)
2. auto-gen hash-suffix keys (auto.aax6hu, ruleEnginePage.operations.yn2mmg 류)
3. namespace bloat (nav 3,940 + gNav 별도 — migration 잔재)
4. 731 orphan refs — runtime fallback warning, 별개 cleanup

## 4. 영구화 항목

### §6 #43 (신규): dead-key cleanup spec strict-pattern 의무

P4 / 후속 dead-key cleanup spec 작성 시:
- 단순 substring grep 금지 (segDesc 류 collision)
- 의무 pattern: `grep -rnE "t\(["']<key>["']\)" frontend/src/`
- random sample N≥20 검증 + FP rate < 5% 확인 후 apply

### §7 trap J (신규): Node-on-Windows `/tmp/` drive-root resolution

Node 가 Windows 에서 leading `/` 를 drive root 로 해석 → `/tmp/foo` = `E:\tmp\foo` (Git Bash MSYS `/tmp` 와 별개).

**163 재발**: 2회 (P5 manifest baseline diff, J2-3 leaf dump).
**기존 158 MSYS trap** 의 Node 측 변종.

**Mitigation**:
- Node 가 쓰는 파일: `os.tmpdir()` (Windows `C:\Users\<u>\AppData\Local\Temp\` 자동 해석)
- bash 가 쓰는 파일: `/tmp/` 가능 (MSYS 정상 동작)
- 둘 사이 데이터 전달 시 path 변환 명시

### §7 trap K (신규): leaf-count counting semantics 불일치

session_init (`tools/leaf_count.mjs`): 30,656 vs J2-2 inline walk: 30,692 (Δ +36).

**확인된 메커니즘** (L1 source 비교 결과):
- `leaf_count.mjs`: arrays as **terminal units** (1 leaf each, `Array.isArray(v)` → `n++` no recurse)
- J2-2 inline walk: arrays as object → recurses **INTO** array, 각 contained string 을 별개 leaf 로 count, 비-string 비-object terminal (number/boolean/null) silently drop
- Δ = ko.js array literal 내부 string 의 초과분 ≈ 36
- **canonical = 30,656** (`tools/leaf_count.mjs` 권위 since 158 commit `0d1b0f6`; consumer JSX 가 `t("nav.items")` 형태로 array 전체 참조 → 1-leaf semantic 이 정합적)

**Mitigation**:
- leaf count 진술 시 **counting method 명시 의무** (인계서 §1.1, 후속 분석 spec 모두)
- **canonical = `tools/leaf_count.mjs`** — 다른 walk 결과는 "alternate measurement" 로 라벨
- 별도 walk 사용 시 결과를 leaf_count.mjs 와 비교한 Δ 명시

## 5. P4 진입 안전성 평가

- (A) dead-key 가설 확정 (K3 95% TP) → P4 이론상 안전
- **사전 조건**:
  1. 731 orphan refs 별도 cleanup (production runtime warning 해소)
  2. K3 strict pattern (§6 #43) 적용으로 FP rate 추정
  3. 162 G8 hook 영구 보호 + 본 세션 trap J/K 영구화 후 진입
  4. array-element artifact ~36 leaves 재분류 (J2-2 walk 산물, `leaf_count.mjs` canonical 적용 시 자동 해소)
- **현 baseline**: 정밀도 최고 시점

## 6. 후속 candidate

- **731 orphan refs**: namespace 분류 → fallback 추가 vs JSX 호출 정정
- **_marketing_1 / auto.*** 출처: i18n-sync agent / generator script grep
- **K3 strict pattern 재검증**: FP 95→99%+ 정밀화
- **counting semantics 일치**: session_init 와 Node walk 동일 알고리즘 의무

