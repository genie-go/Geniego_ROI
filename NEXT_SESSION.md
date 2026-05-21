# NEXT_SESSION.md — 143 → 144 인계서

## ★ 144차 검수자 시작 시 사용자에게 먼저 물어야 할 사항

다음 차수 검수자는 raw 무결성 측정 후, **작업 시작 전에 사용자에게 아래 결정 사항을 반드시 묻는다**:

### 결정 1: 5-F 성과허브 (nav.pages.performance 11 ns) 다국어 운영 정책

**배경**: ko 에 152 entries 존재. ja/zh 정답군에는 부재. 운영 정책 미정.

**옵션**:
- **A**: 모든 언어 지원 (ja 번역값 입력 → 13 lang PASSTHROUGH, +1,976)
- **B**: ko-only 운영 (12 lang 에서 메뉴 숨김 코드 변경)
- **C**: 영문 기준 글로벌 (en 번역값 입력 → 12 lang PASSTHROUGH, +1,824) ★ 검수자 추천

**진단 도구**: `session143_probe_perfhub.mjs` (143차 작성, 미실행)

### 결정 2: ja_jp PASSTHROUGH 승인 유지 여부

**현황**: 143차에 사용자 명시 승인으로 4,668 entries PASSTHROUGH 완료 (ko 한글 위치에 일본어 노출).

**144차 추가 가능 작업**:
- ja_cjk 2,616건 분리 후 일본어 한자만 PASSTHROUGH (잠재 +500~1,500)

**질문**: ja_jp PASSTHROUGH 승인 유지 → ja_cjk 분리 작업 진행 OK?

### 결정 3: `_marketing_1` 3중 중복 처리 (-2,289 entries)

**현황**: 142차 인계서 보고. 동일 ns 가 3번 중복 정의됨. dead code 가능성 높음.

**작업**: 검수자가 코드 호출 grep 검증 → dead 확인되면 제거 권장. **사용자가 진행 승인 필요**.

---

## 143차 종결 시점 무결성 (s143_step62_final_check3 기준)

| 항목 | 값 |
|---|---:|
| ko leaf | **33,348** |
| ja leaf | 22,175 (무변경) |
| zh leaf | 정답군 (무변경, byte 869,855) |
| ko ∩ ja | **19,546 (87.7%)** |
| 13 lang node --check | 전체 PASS |

### 12 lang 상태

| lang | leaf | missing 잔여 | 분포 |
|---|---:|---:|---|
| en | 27,965 | 1 | userMgmt 1 |
| es | 27,960 | 1 | userMgmt 1 |
| fr | 27,960 | 1 | userMgmt 1 |
| th | 27,012 | 2 | reportBuilder 1 + userMgmt 1 |
| vi | 27,680 | **10** | reportBuilder 9 + userMgmt 1 |
| id | 27,053 | 2 | reportBuilder 1 + userMgmt 1 |
| de | 26,172 | 1 | userMgmt 1 |
| zh-TW | 25,543 | 2 | reportBuilder 1 + userMgmt 1 |
| ar | 20,417 | 1 | userMgmt 1 |
| hi | 20,416 | 1 | userMgmt 1 |
| pt | 20,416 | 1 | userMgmt 1 |
| ru | 20,416 | 1 | userMgmt 1 |
| **합** | | **24** | |

## 143차 누적 회수 (순증)

| 작업 | Δ entries | commit |
|---|---:|---|
| orphan 정리 (ko workspace + dataProduct."") | -15 | 200f128 |
| 8 lang top-level [""] + "2d" 오염 정리 | -72 | a57dd40 |
| ko ja_jp+ja_en PASSTHROUGH | +4,583 | 8bbaed6 |
| 12 lang ja_jp PASSTHROUGH propagation | +37,229 | 61a142e |
| ko 신규 5 ns (journeyBuilder/gAttr/lineChannel/journeyTpl/dataTrust) | +93 | d937853 |
| 12 lang 신규 4 ns propagation | +925 | d937853 |
| 7 lang N-137 unquoted performance + reportBuilder | +146 | 222682a |
| **합계** | **+42,889** | (6 commits) |

## ★ 사용자 명시 원칙 (143차 확립)

1. **ja_jp PASSTHROUGH 승인 유지** — ko 한글 위치에 일본어 노출 허용 (사용자 명시)
2. **ja/zh 정답군 byte 무변경 절대 원칙** (N-79, 143차 보존: ja=1,153,628 zh=869,855)
3. 검수자 작업 패턴: dry → 사용자 확인 → apply, 자동 가드 4종 필수
4. **작업 여력 최대 활용** — 종결 자제, 부분 성과라도 계속 발굴
5. **CC 명령 접두사 `t` 필수** (자동 승인 우회)
6. 사용자 저장은 1건 (도구 저장 시)
7. **push 는 사용자 명시 입력 시에만**

## [PENDING] 144차 작업 후보 (우선순위)

### 1순위: 잔여 24건 multi-block 정밀 삽입 (도구 작성 필요)

**문제**: v3 도구 (`session141_propagate_v3_deepmerge.py`) 는 last-block 통째 교체 — multi-block (top + nav 하위 중첩) 시 매칭 실패.

**전체 24건 path**:
- vi 10: reportBuilder.{pageSub, tabCreate, reportType, channels, generateReport, noReports, previewTitle, type_channel, type_influencer} + userMgmt.role_ModeStr
- th/id/zh-TW 2: reportBuilder 1 + userMgmt 1
- en/es/fr/de 1: userMgmt 1
- ar/hi/pt/ru 1: userMgmt 1

**작업**: 각 lang 의 top-level ns 블록만 정확히 식별하여 부분 키 삽입 (nav 하위 보호). 검수자 자동 가능.

**예상 회수**: +24 entries

### 2순위: ja_cjk 2,616건 분류 후 PASSTHROUGH (★ 사용자 결정 2 의 결과에 따라)

**현황**: 한자만 — 일본어 한자 vs 중국어 한자 모호. ja vs zh 비교로 분리.

**분류 방법**:
- 동일 path 가 zh 에 존재 + 값 동일 → 중국어 한자 (PASSTHROUGH 보류)
- zh 부재 또는 다름 → 일본어 한자 (ja_jp PASSTHROUGH 추가)

**예상 회수**: +500~1,500 entries (정확한 비율은 측정 필요)

### 3순위: 5-F 성과허브 (★ 사용자 결정 1 의 결과에 따라)

**진단 도구**: `session143_probe_perfhub.mjs` (143차 작성, 미실행)

**잠재**: 결정 옵션에 따라 +1,824 ~ +1,976 (옵션 A 또는 C)

### 4순위: 142차 인계서 잔여 백로그

- audit mismatch 22 / pages ambiguous 3 / only_B 88 (코드 grep 검증 선행)
- `_marketing_1` 3중 중복 2,289 entries (★ 사용자 결정 3)
- nested 위치 빈키 검증 (L3868/L10412/L21518 등 indent 4 위치)

### 5순위: 도구 개선

- v3 last-block 매칭 → multi-block 우선순위 도구로 개선
- byte 측정 버그 해결 (string.length vs UTF-8 byte 차이, N-141)

## 143차 신규 도구 자산 (재사용 가능)

| 도구 | 역할 |
|---|---|
| `session143_probe_perfhub.mjs` | 5-F 성과허브 진단 (read-only) |
| `session143_probe_abnormal_keys.mjs` | 비정상 키 분류 |
| `session143_dry_orphan_keys.mjs` | SAFE/UNSAFE 분류 |
| `session143_locate_orphans.mjs` | ko.js raw 위치 측정 |
| `session143_apply_orphan_clean_v2.mjs` ★ | workspace + dataProduct."" 정리 (v1 폐기) |
| `session143_probe_8lang_orphan.mjs` | 8 lang 정리 사전 진단 |
| `session143_apply_8lang_orphan.mjs` ★ | 8 lang top-level [""] + "2d" 정리 |
| `session143_extract_ja_jp_v2.mjs` ★ | v3 호환 TSV 생성 (JSON-quoted) |
| `session143_add_5ns.mjs` ★ | ko 에 5 ns 통째 추가 (export default close 매칭) |
| `session143_add_new_ns_multilang.mjs` ★ | 12 lang 신규 ns 일괄 추가 (--all 옵션) |

## 핵심 N-원칙 (143차 검증)

- **N-79**: ja/zh 정답군 절대 무변경 (143차 byte 보존)
- **N-110/142차 확장**: PASSTHROUGH (ja_jp 사용자 승인 시 ko 자동 회수)
- **N-128**: ko.js 다중 블록 raw 확인 (v3 도구 last block 통째 교체)
- **N-137**: unquoted ns root + indent=2 패턴 (`session142_propagate_unquoted_ns_v2.py` 재사용)
- **N-141**: 도구 byte 측정 부정확 → leaf count (node import) 가 안전 지표 (143차 재현, 144차 도구 개선 후보)

## 144차 시작 권장 절차

1. **raw 무결성 재측정**: `Get-ChildItem`, `node session140_kojaintersect_missing.mjs`, 13 lang `node --check`
2. **★ 사용자에게 결정 1/2/3 의견 묻기** (위 섹션 참고)
3. 사용자 답변에 따라 작업 후보 우선순위 조정
4. 1순위 잔여 24건 정리 (가성비 + 무결성 완성)
5. 작업 여력 최대 활용, 종결 자제

## 143차 git 커밋 6개 (master)

```
222682a i18n(7-lang): N-137 unquoted performance+reportBuilder propagation +146 entries (missing 170->24)
d937853 i18n: add 5 new ns to ko + propagate to 12 langs (+93 ko, +925 propagation)
61a142e i18n(12-lang): ja_jp PASSTHROUGH propagation +37,229 entries (ko∩ja 87.7%)
8bbaed6 i18n(ko): ja_jp+ja_en PASSTHROUGH +4,583 entries (ko leaf 28672->33255, ko∩ja 14870->19453, 87.7%)
a57dd40 fix(i18n): remove top-level empty-key object + 2d orphan in 8 langs (-72 leaves, ja/zh untouched)
200f128 fix(i18n/ko): remove 15 orphan keys (workspace.0-5 split + dataProduct.empty-key sub-block)
```

push 상태는 사용자 별도 진행 (143차 진행 중 `git push origin master` 입력 시점).