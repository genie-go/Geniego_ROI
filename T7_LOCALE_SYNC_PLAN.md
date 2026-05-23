# T7 — 15개국 Locale 동기화 정책 문서

> **작성**: 152차 검수자
> **트랙**: T7 (i18n 15개국 i18n 확장 + 동기화)
> **상태**: 정책 확정 (실행은 153차+)
> **의존**: ko.js 마스터 정비, T3 신규 라벨 등록

---

## 1. 현황 (152차 진단)

### 1.1 Locale 인프라
- **15개국 locale 파일 존재**: ko / en / ja / zh (=zh-CN) / zh-TW / es / fr / de / pt / ru / ar / hi / id / th / vi
- **i18n engine**: 자체 v2.1 (`frontend/src/i18n/index.js`, i18next 미사용)
- **언어 감지**: localStorage → navigator.language → ipapi.co (IP-based)
- **ar RTL**: `LANG_OPTIONS` 에 `dir: "rtl"` 등록 완료
- **마스터**: `ko.js` (33,211 leaf keys)

### 1.2 Coverage 진단 (152차 W2)

| Locale | Coverage | Missing | Extra | KO-identical |
|---|---|---|---|---|
| ko | 100.00% | 0 | 0 | 0 |
| zh | 43.20% | 18,865 | 3,979 | 3,495 |
| ja | 58.44% | 13,802 | 2,766 | 5,055 |
| en | 67.65% | 10,745 | 5,562 | 2,181 |
| de | 67.76% | 10,706 | 7,483 | 2,461 |
| zh-TW | 67.42% | 10,821 | 8,662 | 2,416 |
| id / th | 66.95% | ~10,975 | ~10,295 | ~2,400 |
| vi | 66.73% | 11,048 | 7,547 | 1,911 |
| ar | 66.41% | 11,157 | 4,793 | 2,651 |
| pt / ru / hi | 66.41% | 11,157 | 4,792 | 2,651 |
| es / fr | 67.65% | 10,745 | 5,562 | 2,181 |

### 1.3 Clone Cluster (152차 발견)

| 클러스터 | 멤버 | 의미 |
|---|---|---|
| **en-cluster** | en / es / fr | es/fr 가 en 에서 bulk-clone 됨 |
| **pt-cluster** | pt / ru / hi / ar | 단일 source 에서 4개 locale 복제 |

→ es/fr/pt/ru/hi/ar 6개는 **유효한 번역이 아닌 영어 (또는 한국어) 그대로 노출** 비율 높음.

### 1.4 Drift 분류 (152차 W3, 15,283 unique drift keys)

| 카테고리 | Count | 의미 |
|---|---|---|
| (A) intentional_english | 3,458 | 영어로 의도된 라벨 (브랜드, 기술용어, 단위) → 보존 |
| (B) ko_rename_drift | 5,759 | ko 가 rename/restructure 됨, 다른 locale 잔재 → 153차 검토 |
| (C) clone_leak | 6,066 | 다른 locale 에 ko/en 그대로 들어감 → 153차 번역 |

---

## 2. 152차 정책 (사용자 확정)

### 2.1 Forward-Looking 정책 (신규 작업)

> **152차 이후 신규 추가되는 i18n 라벨은 15개국 모두 동시 추가.**

- 마스터 ko.js 에 우선 등록
- ko.js 등록 즉시 14개 locale 에 동기화 (수동 또는 도구로)
- **의도된 영어 라벨** (브랜드, 기술용어) 은 14개 locale 모두 동일 영어 등록 + 주석으로 의도 표시
- ar 추가 시 RTL 고려 (단위 / 숫자 표기, 화살표 방향)

### 2.2 Backward-Looking 정책 (기존 drift)

> **기존 86,900 drift 는 152차 cleanup 안 함. 153차 사용자 검토 후 일괄 처리.**

- 152차 산출물: `session152_t7_drift_category_{A,B,C}.csv` (153차 입력)
- 153차 사용자 검토 절차:
  1. Category A (intentional_english) → 검토 후 보존 확정
  2. Category B (ko_rename) → ko 마스터 sync 또는 dead key 결정
  3. Category C (clone_leak) → AI 일괄 번역 (BAS 의 ko 원본 → 14개 locale)

### 2.3 한·영·일 우선 작업 보존

- 사용자 진술: "한·영·일만 진행한 namespace 존재"
- → 이 namespace 는 **152차 이후에도 한·영·일만 진행 허용** (15개국 강제 적용 안 함)
- 식별 방법: `session152_t7_drift_category_B.csv` 에서 ja/en 에만 존재하는 키 추출 가능 (153차 도구 추가)

---

## 3. Sacred Files (149+150차 누적)

| 파일 | SHA256 | 정책 |
|---|---|---|
| ja.js | `d107ff396e118bfa99f5d24b415fda4fe54ae875bb5fa44ced86d667126a1437` | sacred, 무변경 |
| zh.js | `9ea2361a3cb31fa544a7682803602b1ca13f2b5c108332fdb15c09068c55cdb4` | sacred, 무변경 |

**152차 정책 확장**:
- T3 / T4+ 신규 라벨 추가 시 sacred 파일은 **추가만 가능, 기존 키 수정 금지**
- sacred 가드 도구 (G2 / G3) 통과 필수

---

## 4. 153차 동기화 도구 명세

### 4.1 ko.js → 14개 locale 일괄 sync 도구

```
session153_t7_sync_from_master.mjs
```

**입력**:
- 마스터 ko.js
- 대상 locale 리스트 (기본 14개, 옵션으로 subset)
- 카테고리별 처리 정책 (CLI 옵션 또는 config)

**동작**:
1. ko.js 의 leaf 전체 추출
2. 각 locale 에서 missing key 식별
3. **AI 번역 호출** (OpenAI / Claude / DeepL — 선택)
4. ar locale 은 RTL 마크 추가 (필요 시)
5. dry-run 모드: diff CSV 출력 (apply 안 함)
6. apply 모드: locale 파일에 추가 + 백업 생성
7. sacred 가드 (G2 / G3 / G5 leaf count) 자동 통과 검증

**산출**:
- `session153_t7_sync_<locale>_dryrun.csv` (적용 전 검토)
- `session153_t7_sync_<locale>_applied.csv` (적용 후 기록)

### 4.2 한·영·일 우선 namespace 식별 도구

```
session153_t7_identify_partial_namespaces.mjs
```

**동작**:
- 각 namespace 에서 locale coverage 분포 계산
- ko / en / ja 만 존재 → "한영일 namespace" 표시
- ko / en / ja / + 3개 이상 → "확장 가능 namespace" 표시
- → 153차 사용자에게 namespace 별 정책 의사 결정 입력 제공

---

## 5. 자동 검증 / CI

### 5.1 신규 라벨 PR 검사 (153차 도입)

- PR 에서 ko.js 신규 leaf 발견 시 → 14개 locale 동기화 여부 검사
- 누락 시 CI 실패 (또는 warn)
- 예외: namespace 가 "한영일 전용" 으로 표시된 경우 통과

### 5.2 drift 회귀 방지

- 152차 진단 결과를 baseline 으로 보존 (`session152_t7_coverage_matrix.csv`)
- 153차 이후 매 commit 마다 diff 비교
- coverage 가 더 나빠지면 CI 실패

### 5.3 sacred 파일 보호

- ja.js / zh.js SHA256 검사 (기존 G2 / G3 가드)
- pre-commit hook 으로 강제

---

## 6. AI 일괄 번역 정책 (153차)

### 6.1 사용 모델
- Claude (Anthropic API) 우선 — 마케팅 도메인 / 한국어 컨텍스트 강점
- 대체: OpenAI GPT-4 / DeepL
- Sacred file (ja / zh) 은 AI 번역 대상 외

### 6.2 번역 컨텍스트 주입
- 마케팅 자동화 SaaS 도메인 명시
- 기존 locale 의 의도된 영어 라벨 (Category A) 참고
- 한국어 표준 용어 가이드 (149+150차 정립) 참고
- ar 은 RTL + 마케팅 영역 단어 컨텍스트 추가

### 6.3 검증 절차
- 각 batch (50~100건) 단위 dry-run → 사용자 cross-validation
- 채택률 80% 이상 시 apply
- 부분 채택 시 사용자 수정 후 재제출

---

## 7. 152차 시점 미확정 사항

| 항목 | 사용자 결정 필요 |
|---|---|
| 153차 AI 번역 모델 선택 | Claude / OpenAI / DeepL |
| 한·영·일 전용 namespace 명시 목록 | 사용자 또는 153차 도구로 추출 |
| CI 차단 정책 강도 | warn only / 차단 (BLOCK) |
| Category B 5,759 처리 | 어떤 비율로 ko sync / dead 삭제 |
| Category C 6,066 처리 | AI 번역 batch size, 채택 기준 |

---

## 8. 다음 단계

- [ ] **사용자 검토**: 본 정책 문서 승인
- [ ] **153차 진입 조건**: T3 백엔드 의뢰 + W0 rotation + 본 문서 승인
- [ ] **153차 작업**:
  - T3 Phase A (인프라 + DB + 백엔드 API)
  - T7 153차 동기화 도구 작성 + 사용자 검토 결정
