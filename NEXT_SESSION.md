# NEXT_SESSION.md — 144 → 145 인계서

## ★ 145차 검수자 시작 시 사용자에게 먼저 보고할 사항

143차 인계서의 "missing 24건" 은 **잘못된 명세**였음. 144차 실측 결과 **실제 missing 146,243건** (12 lang 합산). 144차에서 reportBuilder ns 만 부분 처리 (-63건). 145차는 **현재 raw 기준 재설계** 진행.

---

## 144차 종결 무결성 (실측 기준)

| 항목 | 값 |
|---|---:|
| **ko leaf** | 33,348 (B1-fix: 일본어 10건 한국어 복원, leaf 수 무변경) |
| **en leaf** | 27,965 → **28,028 (+63)** |
| ja leaf | 22,175 (무변경, byte 1,153,628) |
| zh leaf | 정답군 (무변경, byte 869,855) |
| 12 lang missing | 146,243 → **146,180 (-63)** |
| 13 lang `node --check` | 전체 PASS |

### 11 lang 잔여 missing (B4 propagation 대기 중)

| lang | leaf | missing 잔여 |
|---|---:|---:|
| en | 28,028 | 10,745 (144차 -63 회수) |
| es | 27,960 | 10,808 |
| fr | 27,960 | 10,808 |
| th | 27,012 | 11,756 |
| vi | 27,680 | 11,082 |
| id | 27,053 | 11,704 |
| de | 26,172 | 12,531 |
| zh-TW | 25,543 | 13,071 |
| ar | 20,417 | 13,102 |
| hi | 20,416 | 13,102 |
| pt | 20,416 | 13,102 |
| ru | 20,416 | 13,102 |
| **합** | | **146,180** |

---

## 144차 누적 회수 (순증)

| 작업 | Δ entries | commit |
|---|---:|---|
| ko 일본어 10건 한국어 복원 (B1-fix) | 0 (값 교체만) | 2ca9981 |
| en reportBuilder ns 신규 63키 + userMgmt.role_/role_ModeStr 정상화 | **+63** | f4ee9ff |
| **합계** | **+63** | 2 commits |

143차 대비 회수량 차이 사유: **현실 직시**. 143차는 인계서의 "24건" 명세를 따랐으나 실측 결과 reportBuilder ns 전체 부재 (12 lang × 63~72키 = 765건) 확인. 144차는 그 중 **en 1 lang 만 처리** (B4 자동 전파 토대 마련).

---

## ★ 사용자 명시 원칙 (143/144차 누적)

1. **ja_jp PASSTHROUGH 승인 유지** — ko 한글 위치에 일본어 노출 허용 (단 144차에서 reportBuilder/userMgmt 10건은 **사용자 결정 P1-b 로 한국어 복원**, 정책 부분 철회 영역)
2. **ja/zh 정답군 byte 무변경 절대 원칙** (N-79, 144차 보존)
3. **검수자 작업 패턴**: dry → 사용자 확인 → apply, 자동 가드 4종 필수
4. **작업 여력 최대 활용** — 종결 자제, 부분 성과라도 계속 발굴
5. **CC 명령 접두사 `t` 필수** (자동 승인 우회)
6. **사용자 저장은 1건** (도구 저장 시)
7. **push 는 사용자 명시 입력 시에만**
8. **CC 직접 편집 위험** — JSON/도구 등은 검수자 제공 파일 우선 (144차 따옴표 오류 3회 재발 교훈)
9. **초엔터프라이즈급 작업** — 땜질 대신 도구 보강
10. **사용자 결정 1=C 확정** (5-F 영문 기준 12 lang)
11. **★ 145차 시작 시 143차 "24건" 명세 폐기 — 실측 우선**

---

## 144차 핵심 성과 — 도구 자산 (재사용 가능)

| 도구 | 역할 |
|---|---|
| `session144_probe_real_missing.mjs` ★ | 12 lang vs ko 실제 missing 역측정 (143차 명세 의존 X) |
| `session144_extract_ns_missing.mjs` ★ | ns 별 missing path 추출 (인자: ns 명) |
| `session144_translate_ko_to_en.mjs` | unique path → 영문 번역 워크북 생성 |
| `session144_check_en_existing.mjs` ★ | en.js / ja.js 기존 값 참조 매칭 (exact/similar) |
| `session144_fill_en_suggestion.mjs` ★ | 자동 채움 + 오염 필터 (히라가나/가타카나/한글) |
| `session144_apply_corrections.mjs` | corrections.json → 워크북 적용 (v2 도 동일 패턴) |
| `session144_apply_corrections2.mjs` | corrections2.json 처리 (재사용 패턴) |
| `session144_apply_ko_restore.mjs` ★ | ko 일본어 → 한국어 복원 (key-value 정밀 매칭) |
| `session144_apply_en_workbook.mjs` ★★ | en.js INSERT + REPLACE + 빈값/오염값 처리 통합 |

★ = 145차 재사용 강력 권장

---

## ★ 144차 신규 발견 — 145차 우선 과제

### 1순위: en.js 의 jp 오염 추가 발견 (★★★)

`session144_check_en_existing.mjs` 실행 시 `userMgmt.role_ModeStr` 의 en 값이 "デモ" 였음. **en.js 전체에 동일 오염 가능성 다수**.

진단 명령:
```
t node --input-type=module -e "import {pathToFileURL} from 'node:url';import path from 'node:path';const m=await import(pathToFileURL(path.resolve('frontend/src/i18n/locales/en.js')).href);const en=m.default;const HIRA=/[\u3040-\u309F]/;const KATA=/[\u30A0-\u30FF]/;const HAN=/[\uAC00-\uD7AF]/;const found=[];function walk(o,p=''){for(const[k,v]of Object.entries(o||{})){const np=p?p+'.'+k:k;if(typeof v==='string'&&(HIRA.test(v)||KATA.test(v)||HAN.test(v)))found.push({path:np,value:v});else if(typeof v==='object'&&v)walk(v,np);}}walk(en);console.log('en.js 오염 TOTAL:',found.length);console.log(JSON.stringify(found.slice(0,20),null,2));"
```

ko.js 도 동일 진단:
```
t node --input-type=module -e "import {pathToFileURL} from 'node:url';import path from 'node:path';const m=await import(pathToFileURL(path.resolve('frontend/src/i18n/locales/ko.js')).href);const ko=m.default;const HIRA=/[\u3040-\u309F]/;const KATA=/[\u30A0-\u30FF]/;const found=[];function walk(o,p=''){for(const[k,v]of Object.entries(o||{})){const np=p?p+'.'+k:k;if(typeof v==='string'&&(HIRA.test(v)||KATA.test(v)))found.push({path:np,value:v});else if(typeof v==='object'&&v)walk(v,np);}}walk(ko);console.log('ko.js 오염 TOTAL:',found.length);console.log(JSON.stringify(found.slice(0,30),null,2));"
```

git show 8bbaed6 결과로 `orderHub.orderHub`, `orderHub.supplyChain`, `orderHub.returnsPortal` 등 다수 일본어 오염 잔존 확정. **145차 1순위 정리 작업**.

예상 회수: ko/en 각각 50~200건 추정 (전수 측정 필요).

### 2순위: B4 — reportBuilder ns 11 lang propagation

**도구 사양** (검수자 작성 권장):
- 입력: `en_translation_workbook_final2.json` (74건)
- 대상: es, fr, th, vi, id, de, zh-TW, ar, hi, pt, ru (11 lang)
- ja/zh 제외 (N-79)
- en 값 그대로 propagation (옵션 P1 확정)
- ns 블록 신규 생성 / 키 부분 삽입 통합 처리
- 자동 백업 + dry/apply + 사후 가드

**예상 회수**: 74 × 11 = **+814 entries** (실제는 SKIP 일부 고려 약 +693~+814)

**참고**: `session144_apply_en_workbook.mjs` 의 INSERT/REPLACE 로직을 11 lang 루프로 확장하면 됨.

### 3순위: nav ns 메뉴 레이블 동기화 (★ 최대 회수처)

- **45,672 entries missing** (12 lang 합산, real_missing_report.json 1위)
- 영문 기준 propagation 권장 (옵션 P1 동일 정책)
- 단, ko 의 nav 값 중 일본어 오염 가능성 있어 **1순위 완료 후 진행**

### 4순위: catalogSync ns (27,564) + dash ns (12,304)

143차 인계서 "audit mismatch 22 / pages ambiguous 3 / only_B 88" 백로그는 **실측 우선** 원칙 따라 폐기 가능. 대신 `real_missing_report.json` 의 top 30 ns 기준 재우선순위.

### 5순위: `_marketing_1` 3중 중복 (143차 잔여 백로그)

142차 보고된 -2,289 entries. grep 검증 필요. 144차 미진행.

### 6순위: ja_cjk 2,616건 분리 작업 (143차 사용자 결정 2)

144차 미진행. 145차 결정 보류 항목.

---

## 144차 git 커밋 2개 (master)

```
f4ee9ff i18n(en): add reportBuilder ns (63 keys) + restore userMgmt.role_/role_ModeStr (+63 leaves, en 27965->28028)
2ca9981 i18n(ko): restore 10 keys from ja_jp contamination (reportBuilder 9 + userMgmt.role_ModeStr)
```

push 상태: 사용자 별도 진행. 144차 종결 시점에 origin/master 보다 106 commits ahead.

---

## 144차 작업 산출 파일 (재참조)

### JSON 데이터
- `ns_missing_reportBuilder.json`, `ns_missing_userMgmt.json` — ns 별 lang 미싱 데이터
- `en_translation_workbook.json` → `_filled.json` → `_final.json` → `_final2.json` — 영문 번역 워크북 4단계
- `en_existing_check.json` — en/ja 기존 매칭 분석
- `corrections.json` (10건), `corrections2.json` (3건) — 수동 검수 정정
- `ko_restore_10keys.json` — 일본어 오염 한국어 복원 매핑

### 백업 디렉토리
- `backup_session144_B1fix/` — ko.js 한국어 복원 전
- `backup_session144_B3/` — en.js apply 전 13 lang 전체

---

## 145차 시작 권장 절차

1. **raw 무결성 재측정** — `node tools/session144_probe_real_missing.mjs` 부터
2. **★ 1순위 ko/en 오염 진단** — 위 두 진단 명령 즉시 실행, 사용자에게 오염 규모 보고
3. **사용자 결정 받기** — 1순위 진행 vs 2순위 (B4 propagation, +700~) 먼저
4. **143차 명세 의존 금지** — 실측만 신뢰
5. **CC 직접 편집 회피** — JSON/도구 등 정확한 raw 필요 시 검수자 파일 제공
6. **작업 여력 최대 활용** — 종결 자제, 부분 성과라도 발굴

---

## 핵심 N-원칙 (144차 검증/추가)

- **N-79**: ja/zh 정답군 절대 무변경 (144차 byte 보존)
- **N-110/142차 확장**: PASSTHROUGH (ja_jp 사용자 승인 시 ko 자동 회수) — 144차 reportBuilder/userMgmt 영역은 P1-b 로 한국어 복원
- **N-128**: ko.js 다중 블록 raw 확인 (v3 도구 last block 통째 교체)
- **N-137**: unquoted ns root + indent=2 패턴
- **N-141**: 도구 byte 측정 부정확 → leaf count (node import) 가 안전 지표
- **N-144-A (신규)**: 143차 인계서의 missing 명세는 실측과 크게 다를 수 있음. **현재 raw 실측이 항상 진실**.
- **N-144-B (신규)**: CC 의 raw 텍스트 생성 (heredoc, write file) 은 따옴표/이모지 오류 빈발. **JSON/도구는 검수자 파일 다운로드 방식 안전**.
- **N-144-C (신규)**: 도구 안전 가드 필수 5종 — 자동 백업 / 사전 ja-zh byte / dry-apply 2단계 / 사후 ja-zh byte / SYNTAX OK 자동 확인.
- **N-144-D (신규)**: 분류 도구의 SKIP 조건은 **빈값/공백 포함하여 오염 취급**. POLLUTED 정규식만으로 부족.