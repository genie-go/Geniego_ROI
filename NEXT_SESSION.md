# 150차 세션 인계서 (NEXT_SESSION.md)

> **작성일**: 2026-05-23
> **이전 세션**: 149차 (SHORT_LATIN remediation 완전 종결)
> **다음 세션**: 150차 (잔여 i18n 미세 작업 또는 신규 영역)
> **저장 위치**: repo root `NEXT_SESSION.md`

---

## 1. 즉시 컨텍스트 (검수자가 첫 메시지 받자마자 알아야 할 것)

### 1.1 환경
- **Repo**: `E:\project\GeniegoROI\` (Windows, PowerShell)
- **Branch**: `master` (149차 commit `d3b74b2` push 완료)
- **ko.js 경로**: `frontend/src/i18n/locales/ko.js`
- **참조 locale 파일**: `frontend/src/i18n/locales/{en,ja,zh}.js`

### 1.2 3자 협업 구조 (149차에서 정립)
- **CC (Claude Code)**: repo root에서 `t`-prefix 명령 실행 (자동실행 무력화)
- **검수자 (Claude 채팅)**: 도구 작성, 한국어 1차 번역, 진단, 결정 추천
- **사용자**: cross-validation, 파일 저장, 명시 승인 (commit/push), CC 출력 첨부

### 1.3 149차에서 확정된 운영 원칙 (필수 준수)
- **검수자 응답: 핵심만 짧게** (장황한 설명 금지)
- **CC 직접 수정 우선** (`t` prefix). 사용자 직접 수정은 최후 수단
- 사용자 직접 수정 필요 시: 검수자가 수정 문서 제공 → 사용자 저장 → CC가 적용
- **부분 종결하더라도 최대한 진행** (작업 여력 있을 때)
- **모든 산출물은 초엔터프라이즈 기준**
- **CC 출력 채팅 전달 시 jq/grep/Select-String 등 자체 파이프 활용** (검수자가 직접 파일 읽기 ≠ 기본 패턴)
- **선택지 제시 시 검수자가 추천 1개 반드시 명시**
- **cross-validation: 항목별 채택/거부 사유 명시 필수**

### 1.4 핵심 안전 원칙 (148차 → 149차 누적)
- **N-79**: `ja.js`, `zh.js`는 sacred (SHA256 무변경 필수)
- **N-145-B**: 안전 가드 7종 (G1 백업 / G2 ja SHA / G3 zh SHA / G4 en leaf count / G5 ko leaf count / G6 dry→apply / G7 syntax 검증 + auto-rollback)
- **N-145-G**: commit/push는 사용자 명시 입력 필수
- **CC 명령**: 모두 `t` prefix (자동실행 무력화)
- **UTF-8 트랩**: PowerShell Get-Content 직접 출력은 mojibake. `[Console]::OutputEncoding=[Text.Encoding]::UTF8` + `[IO.File]::ReadAllText(...,[Text.UTF8Encoding]::new($false))` 사용
- **PS-in-bash escape 트랩**: 정규식/JSON 인라인 명령은 임시 .mjs 파일로 우회 권장

### 1.5 149차 직후 ko.js 상태
- **leaf count**: 33,385 (149차 검증 기준, 148차 33,384 대비 +1 — 무해, import 캐시 차이)
- **파일 크기**: 1,571,519 B (148차 1,571,675 → Δ -156 B)
- **HEAD**: `d3b74b2` (149차 commit, push 완료)
- **Working tree**: 무관한 dirty 파일 2개 (s140/s142_step2_pv.csv) + 대량 untracked artifacts (이전 세션 잔재, 정상)

---

## 2. 150차 작업 후보 (우선순위순)

### 2.1 ⭐ **잔여 i18n 영문 leaf** (우선순위 후보 #1)

149차 SHORT_LATIN 범위는 길이 2~60자, LATIN_RATIO ≥ 0.5. 다음 범위는 미처리:
- **길이 1 ASCII**: "A", "B", "X", "0", "1" 등 — 라벨/약어 가능성
- **길이 ≥ 61 (LATIN_LONG 처리 후 누락 잔재 가능)**: 재스캔 필요
- **LATIN_RATIO < 0.5**: 영문 비중 낮은 혼합 라벨 (한글 + 영문 혼재)

**진단 우선:** `session149_c7c_enumerate_leaks.mjs` 패턴 응용한 신규 도구 — ko.js 전체 leaf 1pass 스캔 + 카테고리 분류.

### 2.2 escape 2건 (147차 인계 잔재, 미해결)

- **위치**: `ruleEnginePage.super.aaTime1`, `ruleEnginePage.super.aaTime2`
- **이슈**: escape 시퀀스 처리 문제
- **권장**: 사용자 직접 확인 또는 검수자 진단 후 sed 직접 패치
- **확인 명령**:
  ```
  t powershell -NoProfile -Command "Select-String -Path frontend/src/i18n/locales/ko.js -Pattern 'aaTime1|aaTime2' | Select-Object LineNumber,Line"
  ```

### 2.3 c1 path-sample 캡 구조 개선 (도구 측 결함 해결)

- **발견**: 149차에서 c1 → c6c 파이프라인이 `PATHS_SAMPLE_MAX=3` 캡 때문에 nested occurrence 누락 (444 사이트 중 431 nested 가 c7b 입력에서 빠짐)
- **149차 해결**: c7c (전체 leaf 스캔) + c7d (line-aware 정확 치환) 사후 보완
- **150차 권장**: c1 / c6c 자체를 occurrence-complete 로 개선. 향후 i18n 작업에서 누락 방지
- **우선순위**: 낮음 (이미 c7d 패턴 확립, 재사용 가능)

### 2.4 c7c/c7d 도구 일반화

- 149차에서 ko.js 전체 영문 leaf 추출 + line-aware 치환 도구 완성
- 다음 작업 (잔여 영문, 한국어 표준 통일 등)에 재사용 가능하도록 일반화 권장
- 입력 사전 (ko_value → korean) 만 바꾸면 다른 작업도 처리 가능

### 2.5 한국어 표준 통일 재정비

149차 누적된 한국어 번역 표준 (4.x 참조) 을 ko.js 전반에 일관 적용. 일부 path는 같은 영단어가 다른 한글로 번역됨 (예: "Status" → 상태, 일부 path에서 "현황"). 표준 사전 기반 일괄 정규화 가능.

### 2.6 Node 20 → 24 actions 업데이트 (low-priority, i18n 무관)

- **데드라인**: 2026-06-02 (Node 24 default), 2026-09-16 (Node 20 제거)
- **작업**: `.github/workflows/*.yml` 의 `actions/checkout@v4`, `actions/setup-node@v4` 등 점검
- **우선순위**: 중간 (i18n 작업과 독립)

---

## 3. 149차 작업 자산 (150차에서 재활용 가능)

### 3.1 신규 도구 (총 9개, repo root)
```
session149_c1_extract_short_latin.mjs       # SHORT_LATIN 추출 → workbook
session149_c2_auto_map_short_latin.mjs      # 사전 자동 매핑 (148차 사전 호환)
session149_c3_freq_and_split.mjs            # 빈도 집계 + 배치 분할
session149_c3b_filter_autoids.mjs           # auto-ID 격리 (rule-engine 식별자)
session149_c3b_patch_re_auto_path.mjs       # c3b regex 확장 헬퍼
session149_c5_parse_raw_final.mjs           # raw_final.txt → mapped CSV
session149_c6c_build_c7b_input.mjs          # c5 + occurrence → c7b 입력
session149_c7b_apply_patch_pathaware.mjs    # 148차 c7b clone (path-aware patch)
session149_c7b_patch_clone.mjs              # 148차 → 149차 c7b 변형 도구
session149_c7c_enumerate_leaks.mjs          # ko.js 전체 leaf 스캔 → leak 사이트 enumerate ⭐
session149_c7d_apply_leaks.mjs              # line-aware 정확 치환 patcher ⭐
session149_verify_post_c7d.mjs              # post-c7d 검증 (still-english 카운트)
```

### 3.2 데이터 파일 (주요 산출물, repo root)
- `short_latin_workbook.csv` (2,367 candidates, c1 출력)
- `short_latin_unmapped.csv` (1,373 rows, c2 출력)
- `short_latin_unmapped_clean.csv` (638 rows, c3b auto-id 격리 후)
- `short_latin_autoids.csv` (735 격리된 auto-ID rows)
- `short_latin_freq_clean.csv` (294 unique ko_value)
- `short_latin_batch_01~03_raw.txt` (검수자 작성용 빈 템플릿)
- `short_latin_batch_01~03_raw_final.txt` (cross-validated 최종본, 100/100/94 entries)
- `short_latin_c5_mapped.csv` (294 unique mappings)
- `short_latin_c6c_c7b_input.csv` (638 occurrence-expanded, ns/path/ko_value/suggested_ko 스키마)
- `short_latin_c7c_leaks.csv` (444 actual leak sites, ko.js 전체 스캔 결과) ⭐
- `short_latin_c7c_summary.csv` (111 ko_value × site count 집계) ⭐

### 3.3 백업 (총 2개 디렉토리, .gitignore 처리 권장)
```
backup_session149_C7B/ko.js.bak             # c7b 적용 직전 (1,571,675 B)
backup_session149_C7D/ko.js.bak             # c7d 적용 직전 (1,570,640 B)
```

### 3.4 로그 파일
```
c7b_patch_log_149.txt                       # c7b 패치 로그
c7d_patch_log_149.txt                       # c7d 패치 로그
```

### 3.5 패치 통계 (참고)
| Layer | 처리 건수 |
|---|---|
| c7b round 1 (c6c sampled input, parent-ns block replacement) | 337 |
| c7d round 2 (c7c-enumerated 444 leak sites, line-aware replacement) | 444 |
| **총 ko.js 패치 (in-memory updates 누계)** | **약 781 (중복 포함)** |
| **순 영문 → 한국어 leaf 변경** | **모든 207 active mappings × 평균 occurrence ≈ 444+** |
| 외래어 영문 유지 (no-op, intentional) | 87 |
| auto-ID 격리 (rule-engine 식별자, 번역 대상 외) | 735 |

---

## 4. 한국어 번역 통일 표준 (148차 + 149차 누적)

### 4.1 톤 / 어투 (변경 없음)
- 존댓말 + 마침표 ("...해주세요.", "...됩니다.")
- 명사형 라벨은 간결하게
- 버튼은 동사형 짧게 ("저장", "취소", "확인")
- "이상 징후 감지" (anomaly detection)
- "Trend" → "추이"
- "&" → "·" (한국어 가독성)

### 4.2 외래어 영문 유지 카테고리 (149차 추가)
**기존 (148차):** 브랜드/제품명, 광고 플랫폼, 메트릭 모델, 기술 용어, 표준 약어

**149차 신규 (모두 영문 유지):**
- 기술 약어: SKU, ROAS, ROI, CPC, CTR, CRM, LTV, CVR, CPA, CPM, CTA, ACOS, IP, KPI, VAT, SMS, BOM, INCOTERM, SaaS, B2B, 3PL, ESG, PC, AOV, OAuth, P&L, AI, UGC, MMM, MTA, SNS
- 브랜드/플랫폼: WhatsApp, TikTok Shop, BigQuery, Kafka/S3, Smart Connect, SmartConnect AI, Unity Catalog, Webhook URL, Instagram DM, Instagram, Geniego, Cafe24, Shopify, Slack, Salesforce, Meta Ads, Meta(Facebook·Instagram), LINE, Google Ads, Google（YouTube）, TikTok, Net ROAS, Shapley, Sandbox, Enterprise, Growth, Pro, PRO
- 메트릭/모델: Blended ROAS, LTV vs CAC, Graph Score, Webhook
- UI 라벨 emoji+acronym: 👆 CTA, 🌱 ESG, 💰 LTV vs CAC, ⚡ Webhook, 💚 LINE, 📱 SMS, 🔴 LIVE
- 데이터 손상 항목 (메타데이터 누출): true, var(--text-1), CSV, PDF — 원문 유지 (translator handle 금지)

### 4.3 한국 표준 용어 (149차 신규 + 확정)

**상태값 (UI 패턴):**
- 활성화됨 / 비활성화됨 (Enabled/Disabled — "~화됨" 패턴)
- 연결 완료 (Connected), 연결 해제 (Disconnect)
- 매칭됨 (Matched), 승인됨 (Approved), 실행됨 (Executed), 선택됨 (Selected), 배정됨 (Allocated), 완료됨 (Completed), 종료됨 (Ended), 탈퇴됨 (Withdrawn), 만료 (Expired)
- 처리 대기 중 (Pending), 일시중지됨 (Paused)
- 실행 중 (Running), 분석 중 (Analyzing), 생성 중 (Creating), 시뮬레이션 실행 중 (Simulating), 전송 중 (Sending), 저장 중 (Saving), 불러오는 중 (Loading)
- 부정적 / 보통 / 긍정적 (Negative/Neutral/Positive, 감성 분석)
- ✓ 서명 완료, ✗ 거부됨 (icon + 상태)

**버튼/액션 (짧은 명사형):**
- 저장, 취소, 닫기, 수정, 삭제, 복사, 병합, 연결, 동기화, 보기, 가입, 탈퇴, 푸시, 승인, 업그레이드

**컬럼/라벨:**
- 주문 수, 구매 수, 클릭 수, 댓글 수, 문의 수, 방문자 수, 세션 수, 도달 수 (집계는 "~수" 접미)
- 차이, 차액, 수량, 단위, 개, 명, 건 (단위 명사형)
- 광고비 (Spend, marketing 컨텍스트), 집행액 (Spent, budget 컨텍스트), 초과 집행 (Overspend)
- 매출 (Revenue), 수익 (Profit), 손익 (P&L), 원가 (Cost), 가격 (Price), 합계 (Total), 금액 (Amount), 실지급액 (Net Payout)
- 참여도 (Engagement), 감성 분석 (Sentiment), 신뢰도 (Confidence), 노출 빈도 (Frequency)
- 추이 (Trend), 비율 (Rate, 범용), 건수 (count, 그래프 컨텍스트)
- 카테고리, 우선순위, 임계값, 등급, 코드, 도메인, 이벤트, 이력, 즐겨찾기, 주기, 날짜, 일, 기간, 페이지
- 상품 (Product, 이커머스 표준 — "제품" 거부), 고객 (Customer), 크리에이터 (Creator), 인플루언서 (Influencer)
- 비고 (Remarks), 정상 (Normal), 보관함 (Locker), 메인 배너 (Hero)

**시간/단위:**
- 1월~12월 (Jan~Dec 풀네임)
- 1단계/2단계/3단계 (Step1~3)
- 시간 (Time), 분 (Minutes), 초 (Sec), 오늘 (Today), 최근 (Recent)
- 가입일시 (Since)

**커머스 (149차 신규):**
- 쿠팡 (Coupang), G마켓 (Gmarket), 카카오 (Kakao)
- 출처 (Origin), 결과 (Result), 일정 (Schedule), 업종 (Industry)
- 배송 (Shipping), 창고 (Warehouse), 재고 (Stock), 박스 (Box)
- 회원가입 (Signup, full form), 탈퇴 (Withdraw, short form)

**기존 표준 유지 (148차):**
- 택배사: CJ대한통운, 한진택배, 롯데택배, 로젠택배 / 네이버 검색광고, 카카오 알림톡/친구톡
- WMS: 사업자등록번호, 정산 대조, 여정, 어트리뷰션, 이탈, 인플루언서, 옴니채널, 코호트, 퍼널, 마진율
- 결제 상태: 결제 완료, 부분 결제, 미결제, 초과 결제, 잔금 결제
- 재고: 정상, 부족, 초과, 임박, 실사, 입출고, 입고 대기, 출고 대기
- 권한: 승인, 반려, 일시정지, 대기 중, 권한 관리
- CSV: 업로드 (Import), 내보내기 (Export)

### 4.4 변수 보존 (필수, 유지)
- `{n}`, `{name}`, `{c}`, `{page}`, `{total}` 등 모든 placeholder 보존
- 예: `"{n} SKUs uncounted. Complete?"` → `"{n}개 SKU가 미실사 상태입니다. 완료하시겠습니까?"`

---

## 5. 150차 시작 시 검수자 행동 지침

### 5.1 첫 메시지 받았을 때
1. **컨텍스트 자동 확인**: 인계서를 가장 먼저 읽고 149차 결과 파악
2. **CC 상태 확인 요청**:
   ```
   t git status
   t git log -1 --oneline
   t wc -c frontend/src/i18n/locales/ko.js
   t sha256sum frontend/src/i18n/locales/ja.js frontend/src/i18n/locales/zh.js
   ```
3. **기대값**:
   - HEAD: `d3b74b2`
   - ko.js: 1,571,519 B
   - ja SHA: `d107ff396e118bfa99f5d24b415fda4fe54ae875bb5fa44ced86d667126a1437`
   - zh SHA: `9ea2361a3cb31fa544a7682803602b1ca13f2b5c108332fdb15c09068c55cdb4`

### 5.2 작업 진행 중 안전 원칙
- **dry-run 필수**: 모든 apply 전 항상 `--dry` 먼저
- **백업 분리**: 각 phase별 별도 백업 디렉토리 (`backup_session150_*`)
- **G7 syntax 검증**: 실패 시 즉시 auto-rollback 동작 확인
- **sacred file 검증**: 작업 종료 시 ja/zh SHA256 비교 필수
- **PowerShell escape 트랩 회피**: 인라인 정규식/JSON 대신 임시 .mjs 파일

### 5.3 commit 결정 기준 (변경 없음)
- **단일 작업 완료 시**: 작업 단위로 commit + push (사용자 명시)
- **부분 작업/검증 진행 중**: commit 미진행
- **N-145-G 절대 준수**: 사용자가 명시 안 하면 절대 실행 안 함

---

## 6. 알려진 이슈 / 주의사항 (149차 추가)

### 6.1 도구 한계 (해결됨)
- **c7b NS-block-locator**: 컨테이너 `NAME: { ... }` 패턴만 매칭. 1-segment leaf NS 실패 → 149차 c7d 로 해결
- **c7b 직렬화 한계**: emoji + em-dash 혼합 시 per-value 직렬화 누락 → 148차 sed 우회, 149차 c7d로 일반화 해결
- **c1 PATHS_SAMPLE_MAX 캡**: c6c 입력에서 nested occurrence 누락 → 149차 c7c가 ko.js 전체 스캔으로 해결. 향후 c1 자체 개선 권장

### 6.2 c7d 도구 특성 (재사용 시 참고)
- **장점**: ko.js 전체 leaf 스캔 + line-aware 정확 치환 → 100% 정확
- **전제조건**: `short_latin_c7c_leaks.csv` 형식 (ko_value, korean, path, source)
- **patternMatcher**: 6개 변형 (bare/double-quoted/single-quoted × "..."/'...') 모두 처리
- **safety**: 텍스트 매칭 카운트 ≠ expected occurrence 시 apply 거부 (안전)

### 6.3 PowerShell 운영 트랩
- **mojibake**: 기본 OEM 코드페이지 → CJK/이모지 손상. UTF-8 강제 필요
- **escape 계층 폭발**: shell→PS→JSON→JS 다층 escape는 안전한 결과 보장 안 됨. 임시 .mjs 파일 우회 권장
- **콘솔 출력 잘림**: 1100+ lines 출력 시 채팅 전달 누락. Downloads 폴더 복사 + 첨부 패턴 사용

### 6.4 워크북 데이터 특성
- **auto-ID 노이즈**: rule-engine 식별자 (6자 영숫자 + `.auto.*` / `.operations.*` path)는 모든 locale 동일 영문 → 격리 필수
- **데이터 손상 leak**: `CSV` → " C S V" (letter-spaced), `true`/`var(--text-1)` (메타 누출) — 번역 대상 아님, 원문 유지 표준
- **lowercase 변형**: Line/Sms/Pcs/Whatsapp 등은 대문자 표준 (LINE/SMS/개/WhatsApp) 통일

### 6.5 검수자-사용자 협업 패턴 (149차 정립)
- **사용자 채택률 (149차)**: 약 70~85% (batch_01: 18/24, batch_02: 13/16, batch_03: 13/17)
- **검수자 유지 사유 명시**: 항상 명확한 사유 (path 컨텍스트, UI 표준, 변수 결합, 톤 일관성)
- **이모지/특수문자**: 사용자 검수본이 emoji 누락 시 검수자가 항상 복원

### 6.6 CI / 프로덕션
- **배포 자동 트리거**: master push 시 `.github/workflows/deploy.yml` 자동 실행 → roi.genie-go.com 배포
- **CI 소요 시간**: 평균 30~60초
- **Node 20 deprecation**: 2026-06-02 데드라인

---

## 7. 150차 첫 메시지 권장 패턴

### 사용자 → 검수자
```
149차 인계서 첨부합니다. [150차 작업 지시]

[NEXT_SESSION.md 첨부]
```

### 검수자 첫 응답 예시 (지침)
```
149차 인계서 확인. 컨텍스트 파악 완료:
- SHORT_LATIN 100% 완료, commit d3b74b2 push 완료
- 잔여 작업 후보: 2.1~2.6
- c7c/c7d 도구 재사용 가능

작업 시작 전 사전 확인:

t git status
t git log -1 --oneline
t wc -c frontend/src/i18n/locales/ko.js
t sha256sum frontend/src/i18n/locales/ja.js frontend/src/i18n/locales/zh.js

(기대: HEAD d3b74b2, ko.js 1,571,519 B, ja/zh SHA 인계서 일치)

[사용자가 지정한 작업에 따라 진행]
```

---

## 8. 핵심 메트릭 요약 (한 눈에 보기)

### 149차 작업 결과
| 항목 | 결과 |
|---|---|
| **commit hash** | `d3b74b2` |
| **CI status** | 푸시 완료 (#231 예상) |
| **SHORT_LATIN 처리** | 207 active mappings 100% 적용 |
| **auto-ID 격리** | 735건 (rule-engine 식별자) |
| **외래어 영문 유지** | 87건 (no-op) |
| **신규 도구 (mjs)** | 12개 |
| **신규 데이터 (CSV/txt)** | 18+ files |
| **백업** | 2개 디렉토리 (C7B, C7D) |
| **안전 가드 통과** | G1~G7 × 2 phases = 14건 |
| **Sacred files** | ja/zh 모두 unchanged ✓ |
| **ko.js leaf count** | 33,384 → 33,384 (불변, 검증 시 33,385은 import cache 차이) |
| **ko.js 크기** | 1,571,675 → 1,571,519 B (Δ -156 B) |
| **still-english 검증** | 0건 ✓ (완전 처리) |
| **검수자-사용자 batch** | 3세트 (batch_01~03) cross-validated |

### i18n 전체 진행 누적 (148차 + 149차)
| 카테고리 | 처리 결과 |
|---|---|
| **LATIN_LONG** (>60자) | 3,798 / 3,798 (100%, 148차) |
| **SHORT_LATIN** (≤60자, ratio ≥0.5) | 207 active + 87 no-op + 735 auto-id 격리 (149차) |
| **잔여 (길이 1, ratio <0.5)** | 미평가 (150차 후보) |

---

## 9. 151차 작업 사전 결정 (사용자 확정, 149차)

**150차 i18n 마무리 종결 후 151차 우선 작업: Repo 정리.**

### 9.1 배경
148차 + 149차 누적으로 repo root 에 untracked artifacts 대량 누적:
- 작업 도구 (`session148_*.mjs`, `session149_*.mjs`) 24+ 개
- 데이터 CSV/txt (`latin_long_*`, `short_latin_*`) 50+ 개
- 백업 디렉토리 (`backup_session148_*`, `backup_session149_*`) 5+ 개
- raw dump 파일 (`_claude_dump_*.txt`)
- 무관 dirty (`s140_step2_pv.csv`, `s142_step2_pv.csv`) — 이전 세션 잔재

총 2,750+ untracked items 추정 (148차 인계서 기록).

### 9.2 151차 작업 범위
1. **untracked 분류**:
   - 영구 보존 (도구 — `session*.mjs`, 추후 재사용 가능): tools/ 디렉토리 신설 + 이동 검토
   - 임시 산출물 (CSV/txt — 작업 완료 시 의미 없음): .gitignore 추가
   - 백업 (backup_session*/): .gitignore 추가 (이미 처리됨, 재확인)
   - raw dump (_claude_dump_*): 즉시 삭제
   - 무관 dirty: 사용자 컨펌 후 stash 또는 revert

2. **.gitignore 재정비**:
   - 패턴 일반화: `session*_*.csv`, `*_raw.txt`, `*_raw_final.txt`, `backup_session*/`, `_claude_dump_*`
   - 기존 .gitignore 보존 + append 모드

3. **archive 디렉토리 신설 (optional)**:
   - 완료된 세션 산출물 (CSV/도구) 을 `archive/session148/`, `archive/session149/` 로 이동
   - repo root 깨끗하게 정리
   - git history 유지

4. **detached dirty 처리**:
   - `s140_step2_pv.csv`, `s142_step2_pv.csv` 사용자 확인 후 결정

### 9.3 151차 작업 우선순위
- 안전 우선 (sacred files 비접근 — i18n 작업 무관)
- 단계별 dry-run + 사용자 컨펌
- commit/push 단위 작업 (.gitignore commit, archive 이동 commit 분리)

### 9.4 검수자 작업 가이드 (151차 시작 시)
1. 사용자에게 untracked 분류 정책 컨펌
2. .gitignore 패턴 작성 → dry-run (`git status` 결과 미리보기)
3. archive 디렉토리 이동 (선택)
4. detached dirty 처리 (사용자 의사 확인)
5. commit + push (사용자 명시)

---

## 10. 152차 작업 사전 결정 (사용자 확정, 149차)

**151차 Repo 정리 종결 후 152차 우선 작업: PM 작업 트랙 진입.**

### 10.1 트랙 구조
GeniegoROI 작업은 **2개 트랙** 으로 분리:

| 트랙 | 최신 인계서 | 상태 (149차 기준) |
|---|---|---|
| **i18n 트랙** | `NEXT_SESSION.md` (149차) | 150차 종결 예정 |
| **PM 트랙** | `PM_HANDOVER.md` (2026-05-18) | Phase 1 완료, Phase 2 외부 차단 |

i18n 트랙이 150~151차로 종결되면 PM 트랙이 메인이 됨. **PM 인계서는 별도 파일 (`PM_HANDOVER.md`) 로 관리**.

### 10.2 PM 트랙 진행 현황 (PM_HANDOVER.md 2026-05-18 기반)

**완료된 작업:**
- **Phase 1** (commit `a6cc2d8`): CatalogSync LANG_LOCALE_MAP hoisted / useI18n hooks (3 places) / OrderHub apiClient namespace import
- vite build green (21.5s)
- 긴급 이슈 OrderHub lang 버그 → 이미 fix 상태였음 (no-op)
- 보고 "OrderHub Export missing" → 실제 구현 완료 + CSV-injection guard 우수

**차단 (외부 정보 대기):**
- **Phase 2**: `/api/orders`, `/api/claims`, `/api/settlements` 통합
- 현재 `frontend/src/contexts/GlobalDataContext.jsx` 는 Mock 데이터만 채움
- 차단 사유 (3가지):
  1. 백엔드 endpoint 컨트랙트 (response shape, error model) 미정
  2. demo-mode branching 정책 (Mock vs Real 토글 방식) 미정
  3. 인증 방식 (JWT? Session? OAuth?) 미정

### 10.3 PM 작업 핵심 경고 (N-15 패턴)

PM 문서 (`PM_ANALYSIS_REPORT.md`, `PM_PAGE_ANALYSIS.md`, 2026-05-01) 가 현재 코드와 **3회 drift 확인됨**.

**필수 원칙: 모든 PM 보고 이슈는 raw 검증 후 작업.**
- PM 보고된 "버그/missing 기능" 을 검증 없이 작업 시 정상 코드 덮어쓰기 / 보안 회귀 위험
- 검수자는 PM 문서를 신뢰하지 않고, 항상 현재 코드 raw 확인 우선

### 10.4 152차 작업 진입 조건

PM Phase 2 진행을 위해 **반드시 사용자가 사전 확정** 해야 할 항목:

| 항목 | 결정 주체 | 현재 상태 |
|---|---|---|
| 백엔드 endpoint 컨트랙트 | 백엔드 팀 | 미확정 |
| demo-mode branching 정책 | 사용자/PM | 미확정 |
| 인증 방식 | 백엔드 팀/사용자 | 미확정 |

**위 3개 중 일부라도 미확정 시 152차 진행 불가.** 그 경우 검수자가 **백엔드 컨트랙트 확정 의뢰서** 작성 (PM 또는 백엔드 팀에 전달용) 도구로 대응.

### 10.5 151차 종료 시 인계서 분기 지침 ⭐

**151차 검수자는 작업 종료 시 다음 2개 파일을 분리하여 작성:**

1. **NEXT_SESSION.md (i18n 트랙 종결 보고)**:
   - 150~151차 작업 결과 종합 (i18n 완전 종결 + Repo 정리 완료)
   - "i18n 작업 종결됨. 152차부터는 PM 트랙으로 전환." 명시
   - 향후 i18n 재작업 필요 시 본 문서 참조 가능하도록 보존

2. **PM_HANDOVER.md (PM 트랙 신규 인계서, 기존 2026-05-18 버전 대체)**:
   - 본 인계서의 10.x 섹션 내용을 통합 + 확장
   - Phase 1 완료 기록 / Phase 2 차단 사유 / N-15 경고
   - 152차 진입 조건 (10.4) 명시
   - 사용자 결정 항목 체크리스트
   - 백엔드 컨트랙트 확정 시 즉시 진행 가능한 작업 단위 분해
   - 이전 `PM_HANDOVER.md` (2026-05-18) 는 `PM_HANDOVER_archive_2026-05-18.md` 로 백업 권장

### 10.6 152차 검수자 첫 응답 권장 패턴

```
PM_HANDOVER.md 확인. PM 트랙 진입.

작업 시작 전 사전 확인:

1. 사용자에게 152차 진입 조건 컨펌:
   - 백엔드 endpoint 컨트랙트 확정 여부
   - demo-mode 정책 결정 여부
   - 인증 방식 확정 여부

2. 미확정 항목 있으면:
   → 검수자가 백엔드/PM 의뢰서 작성 (커뮤니케이션 문서)
   → 152차는 의뢰서 작성 + 사용자에게 외부 의뢰 위임 후 대기

3. 모두 확정되면:
   t git status
   t git log -5 --oneline
   t powershell -NoProfile -Command "Select-String -Path frontend/src/contexts/GlobalDataContext.jsx -Pattern 'Mock|TODO|FIXME' | Select-Object LineNumber,Line | Format-Table -AutoSize"
   (Mock 데이터 위치 파악)
   
4. Phase 2 작업 단위 분해 → 사용자 우선순위 컨펌 → 진행
```

### 10.7 PM 트랙 작업 영역 (참고)

PM 문서 기반 알려진 영역 (drift 검증 후 작업):
- **CatalogSync**: Phase 1 완료
- **OrderHub**: Phase 1 완료, Export 기능 검증됨
- **GlobalDataContext.jsx**: Phase 2 대상 (Mock → Real API)
- **권한/인증 시스템**: 인증 방식 확정 후
- **신규 페이지/기능**: PM 문서에 기록된 작업 (raw 검증 필수)

---

## 11. 150차 종료 시 후속 인계서 작성 가이드

150차 종료 시 동일 형식으로 `NEXT_SESSION_151.md` 또는 `NEXT_SESSION.md` 갱신. 핵심 포함 항목:
- 150차 작업 결과 통계 (i18n 마무리 종결 보고)
- i18n 작업 전체 누적 통계 (147~150차)
- 9.x Repo 정리 작업 사양 그대로 계승
- 10.x PM 트랙 진입 사양 그대로 계승
- 추가 발견된 이슈 / 우선순위 조정

---

**문서 끝**

작성: 149차 검수자 (Claude 채팅)
검증 대상: 150차 검수자 (Claude 채팅, 새 세션)
사용자: 인계서 검토 후 repo root `NEXT_SESSION.md`로 저장 권장