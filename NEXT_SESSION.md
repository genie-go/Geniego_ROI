# 149차 세션 인계서 (NEXT_SESSION.md)

> **작성일**: 2026-05-23
> **이전 세션**: 148차 (LATIN_LONG remediation 완전 종결)
> **다음 세션**: 149차 (SHORT_LATIN 또는 사후 작업)
> **저장 위치 권장**: repo root `NEXT_SESSION.md` 또는 `.claude/NEXT_SESSION.md`

---

## 1. 즉시 컨텍스트 (검수자가 첫 메시지 받자마자 알아야 할 것)

### 1.1 환경
- **Repo**: `E:\project\GeniegoROI\` (Windows, PowerShell)
- **Branch**: `master` (148차 commit `2bf7663` push 완료 + CI #230 Success)
- **ko.js 경로**: `frontend/src/i18n/locales/ko.js`
- **참조 locale 파일**: `frontend/src/i18n/locales/{en,ja,zh}.js`

### 1.2 3자 협업 구조
- **CC (Claude Code)**: repo root에서 `t`-prefix 명령 실행 (자동실행 무력화)
- **검수자 (Claude 채팅)**: 도구 작성, 한국어 1차 번역, 진단, sed 명령 생성
- **사용자**: cross-validation (검수본 검토 후 최종 채택), repo root 파일 저장, 명시 승인 (commit/push)

### 1.3 핵심 안전 원칙
- **N-79**: `ja.js`, `zh.js`는 sacred (SHA256 무변경 필수)
- **N-145-B**: 안전 가드 7종
  - G1 백업 (작업 시작 전)
  - G2 ja.js SHA256 unchanged
  - G3 zh.js SHA256 unchanged
  - G4 en.js leaf count unchanged
  - G5 ko.js leaf count unchanged (path-only edits)
  - G6 dry-run → apply 2단계 진행
  - G7 re-import syntax 검증 + 실패 시 auto-rollback
- **N-145-G**: commit/push는 사용자 명시 입력 필수
- **CC 명령**: 모두 `t` prefix (자동실행 무력화)

### 1.4 148차 직후 ko.js 상태
- **leaf count**: 33,384 (변경 없음)
- **파일 크기**: 1,571,675 B
- **LATIN_LONG**: 3,798 / 3,798 (100%) 완전 처리
  - Korean-patched: 3,695 (97.3%)
  - 외래어 영문 유지 (intentional no-op): 103 (2.7%)
- **HEAD**: `2bf7663` ([github](https://github.com/genie-go/Geniego_ROI/commit/2bf7663))
- **Working tree**: 무관한 dirty 파일 2개 (s140/s142_step2_pv.csv) + 2,750+ untracked artifacts (이전 세션 잔재, 정상)

---

## 2. 149차 작업 후보 (우선순위)

### 2.1 ⭐ **작업 2: SHORT_LATIN 3,009건** (메인 작업, 가장 추천)

- **대상**: ko.js에서 짧은 영문 라벨 (길이 < 임계값, LATIN_LONG보다 짧음)
- **복잡도**: LATIN_LONG보다 높음 — placeholder 판별 필요
  - 정상 외래어 (예: "OK", "ID", "API") → 유지
  - 미번역 영문 라벨 → 한국어 변환
  - `{n}`, `{name}` 같은 변수 (placeholder) → 보존
- **방법론**: 148차 c1~c7b2 파이프라인 재사용 가능 (재구성 필요)
  - c1: SHORT_LATIN 추출 도구 (새로 작성 — 길이 조건 변경)
  - c2: auto-map (기존 사전 재활용 가능)
  - c3~c5: top-frequency + batch 분할 + 검수자 1차 번역 + 사용자 cross-validation
  - c6c: c2 통합 + 정규화 fallback (148차 도구 재활용)
  - c7b2 또는 c7c: path-aware 패치 (148차 도구 재활용 또는 leaf-NS aware 개선)

- **준비**:
  - `ko_self_pollution_workbook.csv`에서 SHORT_LATIN 추출 (148차 c1과 분리)
  - 또는 새 c1 도구 작성 (예: `session149_c1_extract_short_latin.mjs`)
  - ja.js / zh.js 대조 강화 — 같은 path가 ja/zh에서 외래어 영문 그대로면 ko도 유지

- **예상 소요**: LATIN_LONG (3,798) 대비 SHORT_LATIN (3,009)이지만 placeholder 판별 + 외래어 비율이 훨씬 높을 가능성 — 실제 번역 대상은 절반 이하 추정. 148차 분량과 유사 또는 약간 적음.

### 2.2 escape 2건 (147차 인계, 미해결)

- **위치**: `ruleEnginePage.super.aaTime1`, `ruleEnginePage.super.aaTime2`
- **이슈**: escape 시퀀스 처리 문제 (147차에서 사용자 직접 편집 권장된 항목)
- **권장**: 사용자가 직접 ko.js 라인 찾아 수정. 검수자 진단 가능.
- **확인 명령**:
  ```
  grep -n "aaTime1\|aaTime2" frontend/src/i18n/locales/ko.js
  ```

### 2.3 c7c 도구 작성 (선택, 향후 작업용)

- **목적**: 148차에서 발견된 c7b/c7b2 한계 해결
- **한계 1**: NS-block-locator가 top-level leaf-NS (예: `stPaid`, `daysLeft`) 미지원 → sed로 우회 처리됨 (총 19회)
- **한계 2**: emoji + em-dash 혼합 시 per-value 직렬화 누락 (graph ns 3건)
- **개선**:
  - leaf-NS aware locator (컨테이너 `NAME: {...}` 외에 leaf `"NAME": "value"` 패턴도 처리)
  - 강화된 유니코드 escape (emoji surrogate pair + em-dash 등 안전 처리)
- **우선순위**: SHORT_LATIN 후 또는 별도 세션. 현재는 sed로 충분 처리됨.

### 2.4 Node 20 → 24 actions 업데이트 (low-priority)

- **출처**: 148차 CI #230 워크플로 경고
- **현황**: `actions/checkout@v4`, `actions/setup-node@v4`가 Node.js 20 사용
- **데드라인**: 2026-06-02 (Node 24 default), 2026-09-16 (Node 20 제거)
- **권장**: SHORT_LATIN 진행과 별개로 어느 시점 업데이트 권장. 작업 영향 없음.

---

## 3. 148차 작업 자산 (149차에서 재활용 가능)

### 3.1 도구 (총 12개, repo root에 있음)
```
session148_c1_extract_latin_long.mjs      # LATIN_LONG 추출 → workbook
session148_c2_auto_map_latin_long.mjs     # 사전 자동 매핑
session148_c3_top500_freq.mjs             # Top N 빈도 분석
session148_c4_split_unmapped.mjs          # 잔여 unmapped 배치 분할
session148_c5_parse_raw.mjs               # raw.txt 수동 번역 → mapped CSV
session148_c6_merge_mappings.mjs          # 147차용 merge (148차 미사용)
session148_c6b_merge_batch_tails.mjs      # batch 통합 + 정합성 검증
session148_c6c_build_c7b_input.mjs        # c2+c6b → c7b 입력 (정규화 fallback 포함)
session148_c7_apply_patch.mjs             # 147차 폐기됨 (string-replace 실패)
session148_c7b_apply_patch_pathaware.mjs  # path-aware patcher (147차 성공)
session148_c7b2_apply_tail.mjs            # c7b 사본, IN_MERGED 경로만 변경
```

### 3.2 데이터 파일 (총 31개, repo root)
- `latin_long_workbook.csv` (3,798 occurrences, c1 출력)
- `latin_long_auto_mapped.csv` (38 unique, c2 출력)
- `latin_long_unmapped_batch_NN_raw.txt` × 10 (검수자 1차 번역)
- `latin_long_unmapped_batch_NN_raw_final.txt` × 10 (사용자 cross-validated)
- `latin_long_unmapped_batch_NN_raw_final_mapped.csv` × 10 (c5 출력)
- `latin_long_top500_freq.csv`, `latin_long_top500_raw_final.txt`, `latin_long_top500_raw_final_mapped.csv`
- `latin_long_tail_merged.csv` (1,376건, c6b 출력)
- `latin_long_tail_all_in_one.csv` (1,876건, c6b 출력)
- `latin_long_c6c_c7b_input.csv` (3,798 row × 4 col, c7b2 직접 입력)

### 3.3 백업 (총 5개 디렉토리, .gitignore 처리됨)
```
backup_session148_C7/ko.js.bak              # 147차 c7 실패 시점 (1,601,121 B)
backup_session148_C7B/ko.js.bak             # 147차 c7b 성공 직전
backup_session148_C7B_TAIL/ko.js.bak        # c7b2 사전 (1,576,635 B)
backup_session148_C7B_TAIL_SED/ko.js.bak    # sed_v1 사전 (1,571,571 B)
backup_session148_C7B_TAIL_SED_V2/ko.js.bak # sed_v2 사전 (1,571,627 B)
```

### 3.4 패치 통계 (참고)
| Layer | 처리 건수 |
|---|---|
| c7b round 1 (c2+c5 merged, path-aware) | 2,118 |
| daysLeft sed (round 1 잔여) | 1 |
| c7b2 (c4 tail batches, path-aware) | 1,558 |
| sed_v1 (15 leaf-NS + CSV/PDF) | 15 |
| sed_v2 (3 graph 잔여, emoji+em-dash edge case) | 3 |
| **Korean-patched 합계** | **3,695** |
| 외래어 영문 유지 (no-op) | 103 |
| **Total accounted** | **3,798 / 3,798 ✓** |

### 3.5 sed 19건 직접 패치 명단 (검색 시 참고)
1. **daysLeft** (147차 잔여): `"Days Left"` → `"일 남음"`
2. **sed_v1 (15건)**: CSV/PDF + 13 leaf-NS
   - `"CSV": " C S V"` → `"CSV": "CSV"`
   - `"PDF": " P D F"` → `"PDF": "PDF"`
   - `"fixedPerf": "Fixed Perf"` → `"고정+성과형"`
   - `"stPaid": "St Paid"` → `"결제 완료"`
   - `"stPartial": "St Partial"` → `"부분 결제"`
   - `"stUnpaid": "St Unpaid"` → `"미결제"`
   - `"stOverpaid": "St Overpaid"` → `"초과 결제"`
   - `"perContract": "Per Contract"` → `"계약별"`
   - `"actualPaid": "Actual Paid"` → `"실제 지급액"`
   - `"payRemaining": "Pay Remaining"` → `"잔금 결제"`
   - `"adReady": "Ad Ready"` → `"광고 집행 준비 완료"`
   - `"checkRights": "Check Rights"` → `"권한 확인"`
   - `"adCreative": "Ad Creative"` → `"광고 크리에이티브"`
   - `"productPage": "Product Page"` → `"상품 페이지"`
   - `"viewsPerOrder": "Views Per Order"` → `"주문당 조회 수"`
3. **sed_v2 (3건, graph 잔여)**:
   - `"🟡 MOCK Data"` → `"🟡 MOCK 데이터"`
   - `"🟡 MOCK Results"` → `"🟡 MOCK 결과"`
   - `"No Edge — Register Node/Edge in Tab above"` → `"연결된 엣지가 없습니다. 상단 탭에서 노드/엣지를 등록해주세요."`

---

## 4. 한국어 번역 통일 표준 (148차 누적, 149차 적용 권장)

### 4.1 톤 / 어투
- 존댓말 + 마침표 ("...해주세요.", "...됩니다.")
- 명사형 라벨은 간결하게 ("주문", "재고")
- 버튼은 동사형 짧게 ("저장", "취소", "확인")
- "이상 징후 감지" (anomaly detection 통일, batch_01 #40부터)
- "Trend" → "추이"
- "&" → "·" (한국어 가독성 — 예: "사유·메모")

### 4.2 외래어 영문 유지 카테고리 (no-op, 103건)
- **브랜드/제품명**: TikTok Shop, Unity Catalog, SmartConnect AI, Smart Connect, Shopee SG, Amazon US, LINE, WhatsApp
- **광고 플랫폼**: Google Ads, Meta Ads, Google (YouTube) (전각 괄호 보존)
- **메트릭/모델**: Blended ROAS, LTV vs CAC, Ridge+Adstock+Hill, Markov+Uplift, Exact Shapley
- **기술 용어**: Webhook URL, OAuth, API Key, ROAS < 3.0x, var(--text-1) (CSS), JSON snippet
- **표준 약어**: SMS, ESG, BI, 3PL, FBA, P&L, Channel API, Core (플랜 등급), MOCK
- **UI 라벨 (emoji+acronym)**: 🔴 LIVE, 🟡 MOCK 데이터 (emoji 보존)
- **URL/Path**: `https://example.com/...`

### 4.3 한국 표준 용어
- **택배사**: 네이버 검색광고, 카카오 알림톡/친구톡, **CJ대한통운**, **한진택배**, **롯데택배**, **로젠택배**
- **WMS**: 사업자등록번호, 정산 대조 (Reconciliation), 여정 (Journey), 어트리뷰션, 이탈, 인플루언서, 옴니채널, 코호트, 퍼널, 마진율, 운송장 번호, 로트 ID, 발주 번호, 리드타임, 퍼스트파티, 자사몰, 폐쇄몰
- **결제 상태**: 결제 완료, 부분 결제, 미결제, 초과 결제, 잔금 결제
- **재고 상태**: 정상, 부족, 초과 (과잉 아님), 임박, 실사, 입출고, 입고 대기, 출고 대기
- **권한**: 승인, 반려, 일시정지, 대기 중, 권한 관리 (Permission Management)
- **CSV**: "업로드" (Import 통일), "내보내기" (Export 통일)

### 4.4 변수 보존 (필수)
- `{n}`, `{name}`, `{c}`, `{page}`, `{total}` 등 모든 placeholder 보존
- 예: `"{n} SKUs uncounted. Complete?"` → `"{n}개 SKU가 미실사 상태입니다. 완료하시겠습니까?"`

---

## 5. 149차 시작 시 검수자 행동 지침

### 5.1 첫 메시지 받았을 때
1. **컨텍스트 자동 확인** (memory system 없음, 사용자가 인계서 첨부 가정):
   - 인계서를 가장 먼저 읽고 148차 결과 파악
   - SHORT_LATIN 작업이 메인이지만, 사용자 지시 우선
2. **CC 상태 확인 요청**:
   ```
   git status
   git log -1 --oneline  # 2bf7663 확인
   wc -c frontend/src/i18n/locales/ko.js  # 1,571,675 B 확인
   ```

### 5.2 SHORT_LATIN 작업 시작 시 권장 순서
1. **사전 진단**: 워크북 또는 새 c1 도구로 SHORT_LATIN 정확한 카운트 확인 (3,009 가정 검증)
2. **placeholder 판별 전략 수립**:
   - ja.js / zh.js 동일 path 값 대조
   - 모든 locale에서 영문 동일하면 의도된 외래어 → 유지
   - 그 외는 번역 대상
3. **148차 도구 체인 재구성**:
   - `session149_c1_extract_short_latin.mjs` (새 작성)
   - `session149_c2_*` (사전 재활용)
   - `session149_c4_split_*` (배치 분할)
   - c6c, c7b2는 그대로 재활용 (입력 경로만 변경)
4. **검수자-사용자 배치 협업**: 148차 패턴 동일 (raw → raw_final)

### 5.3 작업 진행 중 안전 원칙
- **dry-run 필수**: c7b2 apply 전 항상 `--dry` 먼저
- **백업 분리**: 각 phase별 별도 백업 디렉토리 (`backup_session149_*`)
- **G7 syntax 검증**: 실패 시 즉시 auto-rollback 동작 확인
- **sacred file 검증**: 작업 종료 시 ja/zh SHA256 비교 필수

### 5.4 commit 결정 기준
- **단일 작업 완료 시**: 148차처럼 작업 단위로 commit + push (사용자 명시)
- **부분 작업 또는 검증 진행 중**: commit 미진행 (working tree 유지)
- **N-145-G 원칙 절대 준수**: 사용자가 "commit 진행" 또는 "push 진행" 명시 안 하면 절대 실행 안 함

---

## 6. 알려진 이슈 / 주의사항

### 6.1 도구 한계 (c7c 작성 시 참고)
- **c7b/c7b2 NS-block-locator**: 컨테이너 `NAME: { ... }` 패턴만 매칭. top-level leaf `"NAME": "value"`는 실패 → sed 우회 필요
- **c7b2 직렬화 edge case**: emoji + em-dash 혼합 시 per-value 직렬화 누락 (graph ns 3건 사례)
- **c6b/c6c CSV 스키마 차이**: c5 출력은 6컬럼, c2 출력은 8컬럼 — 컬럼명 기반 lookup 필수

### 6.2 워크북 데이터 특성
- **OCR-spaced acronym**: c2 추출 시 "C S V", "P D F" 같은 공백 분리 acronym 발생 (실제 ko.js에 ` C S V` 처럼 leading space 포함된 형태 존재) → 정규화 처리 필요
- **다중 occurrence**: 한 ko_value가 여러 path에 출현 (count > 1). c7b는 path별 row 입력 받음 → c6c에서 occurrence-expand 필요

### 6.3 검수자-사용자 협업 패턴
- **사용자 채택률 (148차)**: 약 70~100% (batch_04, batch_07 전면 채택)
- **검수자 통일 결정 사유 명시 필수**: 사용자 검수본 거부 시 항상 명확한 사유 (예: 변수 결합, 원문 충실, UI 표준 등)
- **이모지 + 특수문자 보존**: 사용자 검수본이 emoji 누락한 경우 검수자가 항상 복원

### 6.4 CI / 프로덕션
- **배포 자동 트리거**: master push 시 `.github/workflows/deploy.yml` 자동 실행 → roi.genie-go.com 배포
- **CI 소요 시간**: 평균 30~60초
- **Node 20 deprecation**: 2026-06-02부터 Node 24 default

---

## 7. 149차 첫 메시지 권장 패턴

### 사용자 → 검수자
```
148차 인계서 첨부합니다. SHORT_LATIN 작업 시작 부탁드립니다.

[NEXT_SESSION.md 첨부]
```

### 검수자 첫 응답 예시 (지침)
```
148차 인계서 확인. 컨텍스트 파악 완료:
- LATIN_LONG 100% 완료, commit 2bf7663 push 완료
- SHORT_LATIN 3,009건이 149차 메인 작업
- 148차 도구 12개 + 데이터 31개 재활용 가능

작업 시작 전 사전 확인 요청:

1. CC에게 현재 상태 확인 부탁:
   t git status
   t git log -1 --oneline
   t wc -c frontend/src/i18n/locales/ko.js
   (예상: master = origin/master, 2bf7663, 1,571,675 B)

2. SHORT_LATIN 정확한 카운트 검증 (인계서 3,009는 추정):
   기존 워크북에 SHORT_LATIN 카테고리가 있는지, 또는 새 c1 도구로 추출 필요한지 확인

3. SHORT_LATIN 임계 조건 확정 (사용자 또는 검수자 결정):
   - 길이 < N? (예: < 20)
   - LATIN_LONG (148차 기준) 제외 후 잔여?
   - placeholder 판별 기준?

위 3가지 진행 옵션을 골라주시면 검수자가 c1 변형 또는 워크북 재활용 도구 작성하겠습니다.
```

---

## 8. 핵심 메트릭 요약 (한 눈에 보기)

| 항목 | 148차 결과 |
|---|---|
| **commit hash** | `2bf7663` |
| **CI status** | #230 Success (44s) |
| **LATIN_LONG 처리** | 3,798 / 3,798 (100%) |
| **Korean-patched** | 3,695 (97.3%) |
| **외래어 영문 유지** | 103 (2.7%) |
| **신규 도구 (mjs)** | 12개 |
| **신규 데이터 (CSV/txt)** | 31개 |
| **백업** | 5개 디렉토리 |
| **Sed 직접 패치** | 19회 |
| **안전 가드 통과** | G1~G7 × 5 phases = 35건 |
| **Sacred files** | ja/zh/en 모두 unchanged ✓ |
| **ko.js leaf count** | 33,384 → 33,384 (불변) |
| **ko.js 크기** | 1,601,121 → 1,571,675 B (Δ -29,446 B) |
| **검수자-사용자 batch** | 11세트 (Top500 + batch_01~10) cross-validated |

---

## 9. 149차 종료 시 후속 인계서 작성 가이드

149차 종료 시 동일 형식으로 `NEXT_SESSION_150.md` 생성 부탁. 핵심 포함 항목:
- 149차 작업 결과 통계
- 새로 발견된 이슈 / 도구 한계
- 누적 한국어 번역 표준 업데이트
- 150차 작업 후보

---

**문서 끝**

작성: 148차 검수자 (Claude 채팅)
검증 대상: 149차 검수자 (Claude 채팅, 새 세션)
사용자: 인계서 검토 후 repo root `NEXT_SESSION.md`로 저장 권장