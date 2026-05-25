# build_resolver_manifest_v2.mjs patch12 — `pages_backup` SKIP_DIRS 추가

> **세션**: 161차
> **대상 파일**: `tools/build_resolver_manifest_v2.mjs`
> **목적**: manifest v2 false-positive scan 제거 (98% noise → 0)
> **외부 의존**: 0
> **분량**: 0.1 세션
> **선행 학습 적용**: §6 #33 path canonical ✓, §6 #34 import 패턴 N/A, §6 #38 spec 검증식 dogfood ✓

---

## 1. 배경

### 1.1 patch11 dogfood 결과 (161차 직전 commit `9e47321`)

manifest v2 의 parse_errors 43건 dump 후 분석:

| 차원 | 결과 |
|---|---|
| errorName | 100% SyntaxError |
| 디렉터리 분포 | 42/43 (98%) `frontend\src\pages_backup`, 1/43 (2%) `frontend\src\pages` |
| 확장자 | 100% `.jsx` |

→ parse_errors 43건의 본질: **`pages_backup/` 디렉터리 스캔 false positive 42건** + 실 syntax 문제 1건 (`TierPricingTab.jsx:259:97`, 별도 트랙).

### 1.2 manifest v2 정밀도 영향 (P4 dead-subtree apply 의존)

`pages_backup/` 스캔이 manifest 에 미치는 영향 (두 시나리오 모두 P4 정밀도 손상):

| 시나리오 | 결과 | P4 영향 |
|---|---|---|
| (a) parse 성공한 일부 파일이 i18n 키를 reference | manifest 가 `pages_backup` 의 키를 "used" 로 기록 | 실 코드 (`pages/`) 에서 unused 인 키가 보호됨 → false-negative (under-cleanup) |
| (b) parse 실패한 42건 | 해당 파일들의 i18n 키 누락 | 만약 같은 키가 `pages/` 에 있어도 manifest 부재 → P4 가 unused 로 오판 → false-positive (over-cleanup) |

→ **두 시나리오 모두 manifest 정밀도 침해**. P4 진입 전 fix 필수.

### 1.3 patch12 산출물

`SKIP_DIRS` 에 `'pages_backup'` 추가:
- walk() 재귀 진입 자체를 차단 → readdir 비용 절감 + 정합성
- 기존 i18n locales 처리 (path substring) 와는 다른 카테고리 — `pages_backup` 은 staging 영역, 정확한 디렉터리명 매칭이 합당

---

## 2. 수정 사양

### 2.1 SKIP_DIRS 확장 (line 56 부근)

**기존**:
```javascript
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.next', '.git', 'coverage']);
```

(실제 코드의 정확한 set member 는 cat -n 으로 확인 후 적용. spec 의 위 라인은 예시)

**patch12**:
```javascript
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.next', '.git', 'coverage', 'pages_backup']);
```

(기존 member 보존 + `'pages_backup'` 1개 추가)

### 2.2 SKIP_PATH_SUBSTRINGS 미수정

`SKIP_PATH_SUBSTRINGS` (line 58) 은 i18n locales 자기-참조 false positive 대응 용도. `pages_backup` 은 그런 미묘한 경우가 아니므로 SKIP_DIRS 가 일치 카테고리. **건드리지 않음**.

---

## 3. 호환성 / 회귀 검증

### 3.1 Backward compatibility

- 기존 동작 변화: `pages_backup/` 하위 파일만 manifest 에서 제외 (실제 production 코드 `pages/` 영향 0)
- `--emit-parse-errors` (patch11) flag 영향 0 — flag 자체는 정상 작동
- pre-commit hook G7-self-test 영향 0 — manifest 파일은 갱신되지만 sacred SHA gate 와 무관

### 3.2 회귀 테스트 (dogfood)

#### T1: parse_errors 감소 확인

```bash
# patch12 적용 전 (현재 baseline)
node tools/build_resolver_manifest_v2.mjs 2>&1 | grep parse_errors
# 기대: parse_errors: 43

# patch12 적용 후
node tools/build_resolver_manifest_v2.mjs 2>&1 | grep parse_errors
# 기대: parse_errors: 1 (잔존 1건은 TierPricingTab.jsx, 별도 트랙)
```

#### T2: scan_files 감소 확인 (선택)

```bash
node tools/build_resolver_manifest_v2.mjs 2>&1 | grep scan_files
# 기대: 247 → 247-42=205 부근 (정확한 수치는 dogfood 결과 기록)
```

#### T3: manifest content 변화 측정 (P4 영향 정량)

```bash
# 적용 전 content SHA (generated_at 제외)
node -e "const j=JSON.parse(require('fs').readFileSync('tools/resolver_consumer_manifest_v2.json'));delete j.generated_at;process.stdout.write(JSON.stringify(j))" | sha256sum > /tmp/pre_patch12.sha

# patch12 적용 후 재빌드
node tools/build_resolver_manifest_v2.mjs

node -e "const j=JSON.parse(require('fs').readFileSync('tools/resolver_consumer_manifest_v2.json'));delete j.generated_at;process.stdout.write(JSON.stringify(j))" | sha256sum > /tmp/post_patch12.sha

diff /tmp/pre_patch12.sha /tmp/post_patch12.sha
# 기대: SHA 차이 발생 (변화 0 이면 SKIP 미작동 의심 — 반대로 정상이 변화)
```

#### T4: consumer 키 변화 정량 (P4 영향 핵심 지표)

```bash
# 적용 전 manifest 의 direct 키 개수
node -e "const j=require('./tools/resolver_consumer_manifest_v2.json');console.log('direct:',Object.keys(j.consumers.direct||{}).length,'prefix:',Object.keys(j.consumers.prefix||{}).length,'dynamic:',(j.consumers.dynamic||[]).length)"

# patch12 적용 + 재빌드 후 동일 명령
# 기대: direct 5272 → ?? (감소 = backup 만의 키 제거, 보존 = pages/ 와 backup 이 같은 키 사용)
```

→ 이 수치 차이가 **P4 dead-subtree apply 시 false-positive 위험의 정량 측정값**.

#### T5: patch11 flag 호환성

```bash
node tools/build_resolver_manifest_v2.mjs --emit-parse-errors 2>&1 | grep -E '^\[v2\] parse-error-breakdown:'
# 기대: [v2] parse-error-breakdown: SyntaxError=1 (43에서 감소)

node tools/build_resolver_manifest_v2.mjs --parse-errors-out /tmp/post_patch12_errors.json
node -e "console.log(require(process.argv[1]).length)" /tmp/post_patch12_errors.json
# 기대: 1
```

#### T6: pages_backup 외 디렉터리 영향 검증

```bash
# pages_backup 직속 파일이 아닌, 정상 디렉터리 파일들이 여전히 스캔되는지
node tools/build_resolver_manifest_v2.mjs --parse-errors-out /tmp/post_patch12_errors.json
node -e "const r=require(process.argv[1]);console.log(JSON.stringify(r,null,2))" /tmp/post_patch12_errors.json
# 기대: 1건만, 그 1건은 frontend\src\pages\TierPricingTab.jsx (pages_backup 아님)
```

---

## 4. 적용 절차 (CC 직접 수정)

### Step 1: 사전 sanity (§6 #33 의무)

```bash
cd /e/project/GeniegoROI
grep -n 'SKIP_DIRS' tools/build_resolver_manifest_v2.mjs
# 기대: 2건 hit (선언 line 56 + 사용 line 71)
```

### Step 2: SKIP_DIRS 확장 (Edit 1건)

CC 가 str_replace 로 `SKIP_DIRS` set 리터럴에 `'pages_backup'` 1개 member 추가.

### Step 3: dogfood (§3.2 T1-T6 순차 실행)

각 T1-T6 결과를 단계별로 보고. 특히 T3, T4 의 manifest content 변화 측정 수치는 **162차 P4 트랙 진입 시 핵심 baseline**.

### Step 4: commit

```
feat(tools): build_resolver_manifest_v2 pages_backup SKIP_DIRS (#29 fix)

patch11 dogfood 로 발견된 parse_errors 43건 중 42건 (98%) 이
pages_backup/ false-positive scan 임을 확인. SKIP_DIRS 에 추가:
- parse_errors: 43 → 1 (잔존 1건 TierPricingTab.jsx 별도 트랙)
- manifest 정밀도 회복 → P4 dead-subtree apply 진입 안전
```

---

## 5. §6 / §7 self-audit

| 검증 | 상태 |
|---|---|
| #33 repo path canonical | ✓ `tools/build_resolver_manifest_v2.mjs` grep 확인됨 |
| #34 import 패턴 | N/A (Set 리터럴 1개 member 추가) |
| #35 production 도메인 | N/A |
| #36 shell idiom | N/A |
| #37 spec 저장 경로 중첩 | 사용자 저장 시 `docs/spec/` 단일 레벨 확인 의무 |
| #38 spec 검증식 dogfood | ✓ T1-T6 모두 실 명령으로 검증식 작성 (jq 미사용, node -e + argv) |

---

## 6. 잔존 작업 (patch12 이후)

### 6.1 TierPricingTab.jsx:259:97 실 syntax 문제 조사

patch12 적용 후 parse_errors 1건 잔존. 162차 또는 161차 잔여 작업:
- 해당 라인 sample 확인
- babel-parser plugin 누락 여부 (JSX feature, optional chaining 등)
- 실 syntax bug 라면 frontend 트랙 (i18n 무관)

### 6.2 `pages_backup/` 자체 정리 (별도 트랙, 사용자 결정 의존)

- backup 의도성·보존 가치 확인
- 정리 시 P4 dead-subtree candidate 추가 발굴 가능

---

## 6.5 161차 dogfood 실 결과 (post-apply baseline)

| 지표 | Pre-patch12 | Post-patch12 | Δ |
|---|---|---|---|
| scan_files | 247 | 205 | -42 |
| parse_errors | 43 | 1 | -42 |
| consumers.direct | 5272 | 5272 | 0 |
| consumers.prefix | 53 | 53 | 0 |
| consumers.dynamic | 3 | 3 | 0 |
| content SHA (generated_at 제외) | `e617dc6f...` | `b96e9e09...` | 변화 (summary block 한정) |

**P4 apply 영향 결정**: consumers 불변 → patch12 는 dead-subtree apply 의사결정 입력 데이터 변경 0. 즉 patch12 는 noise/efficiency 개선에 한정, **162차 P4 진입 시 patch12 baseline 안전 확정**.

잔존 1건: `frontend\src\pages\TierPricingTab.jsx` SyntaxError `Unexpected token (259:97)` — 실 코드, 별도 트랙 (§6.1).

---

**spec 종결.**