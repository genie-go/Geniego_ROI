# 154차 세션 인계서 (NEXT_SESSION.md)

> **작성일**: 2026-05-24
> **이전 세션**: 153차 (i18n hygiene + 153차 산출물 + self-nest 분석)
> **다음 세션**: 154차
> **저장 위치**: repo root `NEXT_SESSION.md`
> **종결 방식**: 사용자 명시 종결 결정 (N-152-G)

---

## 1. 즉시 컨텍스트

### 1.1 환경

- **Repo**: `E:\project\GeniegoROI\` (Windows, PowerShell + Git Bash)
- **Branch**: `master`
- **HEAD (153차 종결 시점)**: `30ebe4e` (153차 commit 4, NEXT_SESSION commit 추가 예정)
- **ko.js**: 1,563,190 B (변경 없음, 153차 cleanup 미실행)
- **참조 locale 파일**: `frontend/src/i18n/locales/{ko,en,ja,zh,zh-TW,es,fr,de,pt,ru,ar,hi,id,th,vi}.js` (15개, 활성)

### 1.2 3자 협업 구조 (149~153차 정립)

- **CC (Claude Code)**: repo root, `t`-prefix 명령 실행 (자동실행 무력화). **t bash 명령 시 `cd /e/project/GeniegoROI &&` prefix 권장** (N-153-A 신규)
- **검수자 (Claude 채팅)**: 도구 작성, 진단, 설계 문서, 보안 보강, 결정 추천
- **사용자**: cross-validation, 파일 저장, 명시 승인 (commit/push), CC 출력 첨부, **세션 종결 결정**

### 1.3 운영 원칙 (필수 준수, 149~153차 누적)

**Sacred / 안전 가드 (149~150차)**:

- **N-79**: `ja.js`, `zh.js` sacred (SHA256 무변경)
- **N-145-B**: 안전 가드 7종 (G1 백업 / G2 ja SHA / G3 zh SHA / G4 en leaf / G5 ko leaf / G6 dry→apply / G7 syntax + auto-rollback)
- **N-145-G**: commit/push 사용자 명시 입력 필수
- **N-15**: PM 보고 이슈는 raw 검증 후 작업 (drift 위험 회피)

**협업 / 운영 패턴 (150차)**:

- **N-150-A**: CC stdout 잘림 / 인코딩 이슈 회피 — 검수자가 사용자에게 절대 경로 (예: `E:\project\GeniegoROI\<filename>`) 제시 → 사용자가 파일 직접 열어 채팅 첨부

**152차 운영 원칙 (전체 유지)**:

- **N-152-A**: 은행급 초엔터프라이즈 보안 baseline 적용. 상세는 `N-152-A_BANK_GRADE_SECURITY.md` 참조
- **N-152-B**: 선택지 제시 시 검수자 추천 1개 필수 명시 (사유 포함)
- **N-152-C**: 152차 이후 신규 i18n 라벨은 15개국 동시 추가 (한·영·일 전용 namespace 예외)
- **N-152-D**: 작업 여력 있는 한 부분 종결하더라도 최대한 진행. push 등 작업 단위 완료는 세션 종결 신호가 아님
- **N-152-E**: 인계서는 세션 종결 시점에만 작성 (미리 작성 금지). 단일 파일 통합본
- **N-152-F**: 한 번에 하나씩 진행 (CC 답변 받기 전 다음 명령 / 도구 미리 작성 금지). N-152-D 와 충돌 시 N-152-F 우선
- **N-152-G**: 세션 종결은 사용자 명시 결정으로만
- **N-152-H**: "작업 여력 있나요" 류 질문은 "다음 작업 진행하라" 의 의미. 인계서 작성 / 종결 신호가 아님

**153차 신규 운영 원칙**:

- **N-153-A (신규)**: `t bash -c` 명령은 `cd /e/project/GeniegoROI &&` prefix 사용 권장. Bash 툴의 working directory persistence 트랩 (이전 명령 `cd` 잔류) 회피. 153차에서 1회 사고 발생 + 복구. 절대 경로 사용 + && 분리.

- **N-153-B (신규)**: 검수자 작성 도구 (.mjs) 는 사용자 저장 → CC 실행 패턴 (N-150-A 확장). 검수자가 직접 작성하는 다중 명령은 활성 데이터 변경 금지 — **dry-run + quarantine-only 모드 우선**. 실제 데이터 변경은 사용자 검토 후 별도 도구로 분리.

- **N-153-C (신규)**: cleanup 결정 전 **사용 검증 4 패턴 의무** — (1) literal grep, (2) template literal t-backtick, (3) useTranslation('namespace') keyPrefix, (4) withTranslation() HOC. 4 패턴 모두 0 ref 일 때만 cleanup 안전. 1 패턴이라도 미검증 시 cleanup 보류.

- **N-153-D (신규)**: 대규모 데이터 변경 (1,000+ entries) 은 단일 commit 분리 금지 — 검증 commit + cleanup commit 분리. 검수자가 cleanup 도구 작성 시 사용자가 patch size 확인 후 승인 / 보류 결정.

**일반 원칙 (전체 누적)**:

- 검수자 응답: 핵심만 짧게 (장황한 설명 금지)
- CC 직접 수정 우선 (`t` prefix, 자동실행 무력화)
- 사용자 직접 수정 필요 시: 검수자 수정본 제공 → 사용자 저장 → CC 가 적용
- 부분 종결하더라도 최대한 진행 (N-152-D 범위 내, N-152-F 우선)
- 모든 산출물은 초엔터프라이즈 기준 (N-152-A 적용)
- 선택지 제시 시 검수자 추천 1개 반드시 명시 (N-152-B)
- **세션 종결은 사용자 명시 결정으로만** (N-152-G)

### 1.4 기술 트랩 (148~153차 누적)

- **UTF-8 트랩** (148차): PowerShell Get-Content 직접 출력 mojibake. UTF-8 강제 필요
- **PS → Bash 파이프 인코딩 손상** (149차): UTF-16 LE 해석 → mojibake
- **PS-in-bash escape 트랩** (149차): 정규식 / JSON 인라인 명령 임시 .mjs 파일 우회
- **CRLF/LF 트랩** (152차): 검수자 LF, repo CRLF. CC Edit tool 우선
- **execSync ENOBUFS** (149차): maxBuffer 16MB 설정
- **bash -c 인용부호 충돌** (149차): 임시 .sh 파일 또는 직접 호출 우회
- **콘솔 출력 잘림** (150차): 1100+ lines N-150-A 패턴
- **cd 잔류 트랩 (153차 신규)**: Bash 툴 working directory persistence. `cd /e/project/GeniegoROI &&` prefix 의무화 (N-153-A)
- **Python stub 트랩 (153차 신규)**: Windows Store stub 으로 python 명령 차단. **Node.js 사용 권장** (vite 환경 확정, PATH 안정)
- **gh CLI 미설치 (153차 신규)**: CI 모니터링 시 gh 명령 PATH 미등록. 대안: site curl 검증 또는 web 직접 확인
- **PUA codepoint 파일명 (153차 신규)**: Windows D 드라이브 경로의 콜론이 U+F03A 로 손상된 파일명. shell escape 불가, Node.js fs.readdirSync + substring filter 사용

### 1.5 153차 종결 시점 상태

- **leaf count**: 33,211 (변경 없음, cleanup 미실행)
- **파일 크기**: ko.js 1,563,190 B (변경 없음)
- **Sacred SHA**:
  - ja.js: `d107ff396e118bfa99f5d24b415fda4fe54ae875bb5fa44ced86d667126a1437` ✓ 불변
  - zh.js: `9ea2361a3cb31fa544a7682803602b1ca13f2b5c108332fdb15c09068c55cdb4` ✓ 불변
- **HEAD**: `30ebe4e` (origin/master 대비 +1 ahead 또는 +2, NEXT_SESSION commit 후 결정)
- **Working tree**: M NEXT_SESSION.md (이번 commit), untracked (~120건, 153차 misc + 2 WIP .mjs)
- **Production 배포**: `8eda461` 자동 배포 완료 (HTTP 200 / 401 KO 검증 ✓), `30ebe4e` push 후 재배포 예정
- **Quarantine 누적**:
  - `frontend/_quarantine/locales_backups_s153/`: 474 files (locale 백업 archive)
  - `frontend/_quarantine/orphan_keys_s153_self_nest/`: 15 JSON, 19,599 entries (~700KB)
  - `frontend/_quarantine/src_bak_s153/`: 5 files (JourneyBuilder×3 + CatalogSync + OrderHub)

---

## 2. 153차 작업 완결 보고

### 2.1 통계 요약

| 항목 | 값 |
|---|---|
| **commit** | 5개 (`618aa26`, `c20a576`, `8eda461`, `30ebe4e`, +1 NEXT_SESSION) |
| **push** | 1회 (`8eda461`까지), 마지막 push 통합 예정 |
| **신규 코드 모듈** | 0 (cleanup 도구 미작성, 154차로 분리) |
| **신규 분석 도구 (.mjs)** | 7 (categoryA, crm_pages_drill, dq_audit, dup_grep, self_nest_extract, parent_compare, selfnest_full_grep) |
| **신규 데이터 (CSV)** | 7 (8,651 rows 누적) |
| **신규 정책/설계 문서** | 0 (N-152-A baseline 유지) |
| **untracked 정리** | 2,673 → 129 (95.2%) |
| **repo 삭제 line** | 6,422,373 (locale 백업 tombstone) |
| **vite build** | green (19.36s) ✓ |
| **production 검증** | HTTP 200 (175ms) + 401 (KO i18n) ✓ |
| **sacred ja/zh** | unchanged ✓ |
| **운영 원칙 신규** | 4개 (N-153-A, B, C, D) |

### 2.2 작업 단위별 상세

| W | 작업 | 상태 |
|---|---|---|
| **W1** | locale 백업 quarantine (474 files, 339 git-tracked → tombstone) | ✅ commit `618aa26`, push |
| **W2** | PM 문서 archive (PM_HANDOVER + FEATURE_PLAN_120) | ✅ commit `c20a576`, push |
| **W3** | .gitignore 4 라운드 hygiene (untracked 2,673 → 129) | ✅ commit `8eda461`, push |
| **W4** | Production smoke test (HTTP 200/401) | ✅ pass |
| **W5** | 152차 t7 drift Category A 분석 (3,458 keys, 14 artifacts) | ✅ commit `30ebe4e`, push 대기 |
| **W6** | Self-nest sub-tree 분석 (19,599 entries × 15 locale) + 100% orphan 확정 | ✅ analysis only, cleanup deferred |
| **W7** | src 백업 quarantine (5 files: JourneyBuilder×3 + CatalogSync + OrderHub) | ✅ commit `30ebe4e`에 포함 |

### 2.3 핵심 발견

#### 2.3.1 Repo 비대화 정리

- **474 locale 백업** quarantine + 339 git-tracked tombstone → repo 6.4 MB text deletion
- **2,544 untracked files** ignored (.gitignore 4 라운드)
- **5 src 백업** 누출 발견 + 정리

#### 2.3.2 Category A drift 분석 (3,458 intentional_english keys)

- **Hotspots**: crm.contentCal (1,456 keys, 42%) + pages.marketingIntel (1,183 keys, 34%) = 77%
- **locale_count 분포**: 12-locale 50% (ko/ja/zh 번역 완료) + 3-locale 33% (en-cluster)
- **데이터 품질**: 빈 value 5건 (0.14%), trivial 24건 (0.69%), auto-gen 잔재 4건

#### 2.3.3 Self-nest sub-tree 발견 (Session 154 핵심 입력)

**Path**: `pages.marketingIntel.marketingIntel.*` (자가 중첩 namespace)

**규모**:
- 15 locales × 1,135~1,331 leaves = **19,599 entries**
- ko 최소 1,135 (한국어 정리 진행), th/vi 최대 1,331

**구조 해석**:
- Parent `pages.marketingIntel.*`: 새 "Performance Hub" 페이지 (363~463 keys, placeholder 잔존: `Badge20kpi`, `K_3`, `K_6`, `K_8`)
- Self-nest `pages.marketingIntel.marketingIntel.*`: 옛 "Marketing Intelligence" 페이지 (89~138 top-level keys, **실제 번역 완료 콘텐츠 보존**)

**검증 (N-153-C 4 패턴 모두 pass)**:
- 1,320 literal paths grep: **0 references** (corpus 31.9MB)
- Template t-backtick: 0
- useTranslation namespace: 0
- withTranslation HOC: 0

**결론**: 100% orphan (코드 미사용). 19,599 entries cleanup runtime 영향 0 — but Session 154 신중 진행 필요.

**격리 상태**: `frontend/_quarantine/orphan_keys_s153_self_nest/` 15 JSON (~700KB)

#### 2.3.4 Dup keypaths 1,165 leaf signatures

전체 dup keypaths 100% orphan 확정 (`session153_t7_dup_usage_results.csv` 2,332 rows).

### 2.4 153차 검수자 자기-비판 (재발 방지)

| 위반 / 오판 | 도출 / 학습 |
|---|---|
| cleanup 첫 도구 첫 버전 — JSON.stringify 로 활성 locale 재작성 시도 | N-153-B: 검수자 도구는 dry-run + quarantine-only 우선. 활성 데이터 변경은 별도 검토 |
| self-nest sub-tree 가 9 leaves 라 추정 (실제 1,135~1,331) | N-153-C: cleanup 전 4 패턴 검증 + 실 규모 확인 의무 |
| 직전 grep (1,165 dup leaves) 결과로 "100% orphan cleanup 안전" 결론 — 부분 검증 한계 인식 부족 | 검증 범위 명시 의무. CC 가 정직하게 지적 (1,320 paths 미검증) |
| 인계서 단일 마크다운 코드 블록으로 출력 — 사용자 복사 시 중첩 코드 블록 깨짐 | 인계서는 **파일로 직접 생성** (create_file). 코드 블록 복사 의존 금지 |

154차 검수자는 위 사례 인지 + N-153-A~D 준수.

---

## 3. 154차 작업 진입

### 3.1 진입 조건 / 외부 의존

| 조건 | 결정 주체 | 상태 |
|---|---|---|
| **W0 plaintext creds rotation** (152차 의뢰) | 사용자 (백엔드) | 대기 |
| **T3 백엔드 API 6종 의뢰** (152차) | 사용자 → 백엔드 팀 | 대기 |
| **T7 동기화 mode 결정** (mirror/english/ai) | 사용자 | 대기 |
| **PM Phase 2 백엔드 컨트랙트** (149차~) | 사용자 (백엔드) | 대기 |
| **demo-mode branching 정책** (152차) | 사용자 | 대기 |
| **Session 인증 사양** (152차) | 사용자 (백엔드) | 사용자 응답: Session 확정, 구체 사양 대기 |
| **Self-nest cleanup 진행 결정** (153차 신규) | 사용자 | **154차 핵심 결정 항목** |

### 3.2 트랙 구조 (153차 종결 시점)

| 트랙 | 진입 가능 시점 | 153차 산출물 (commit 됨) |
|---|---|---|
| **W0 코드 제거** | rotation 완료 후 | `W0_SECURITY_PLAINTEXT_CREDS.md` (152차) |
| **Self-nest cleanup** (신규) | 사용자 결정 후 즉시 | session153_t7 14 artifacts, quarantine JSON 15 |
| **T3 Phase A** | 백엔드 API 답변 후 | `T3_MENU_TOGGLE_DESIGN.md` (152차) |
| **T7 동기화 실행** | 사용자 mode 결정 후 | `T7_LOCALE_SYNC_PLAN.md` (152차) + 153차 분석 산출물 |
| **Placeholder 번역 (pages.marketingIntel)** (신규) | 사용자 결정 후 | self-nest 의 legacy 번역값을 placeholder 채우기에 활용 가능 |
| **PM Phase 2** | endpoint + Session 사양 후 | (152차 미진행) |
| **T4: 마케팅 자동화 8 카테고리** | 카테고리별 템플릿 사양 후 | (152차 미진행) |
| **T5: 팀 채팅** | WS endpoint 후 | (152차 미진행) |
| **T6: 프로젝트 협업** | 데이터 모델 후 | (152차 미진행) |

### 3.3 154차 첫 응답 권장 패턴

154차 검수자가 사용자 첫 메시지 받으면 다음과 같이 응답:

153차 인계서 확인. 완결 사항 요약 — Repo hygiene (untracked 2,673 → 129, locale 백업 quarantine 474, src 백업 5, .archive rmdir), PM 문서 archive, 152차 t7 drift Cat A 분석 (3,458 keys, 14 audit artifacts, 8,651 CSV rows), Self-nest 100% orphan 확정 (1,320 paths × 0 refs, 19,599 entries quarantine), production 검증 (HTTP 200 / 401 KO ✓), commit 5개 + push 통합.

154차 진입 사전 확인 CC 명령: cd /e/project/GeniegoROI && git status && git log -6 --oneline && wc -c frontend/src/i18n/locales/ko.js && sha256sum frontend/src/i18n/locales/ja.js frontend/src/i18n/locales/zh.js && ls frontend/_quarantine/

기대값: HEAD 30ebe4e 또는 +1, ko.js 1,563,190 B, ja SHA d107ff39...6a1437, zh SHA 9ea2361a...55cdb4, quarantine 3 디렉토리.

트랙 결정 (검수자 추천: Self-nest cleanup 진행 또는 보류):
1. Self-nest cleanup 진행하시겠습니까? (19,599 entries, 15 locales, AST 기반 도구 필요) — 진행 시 SHA 변동 명시 commit + vite build + smoke test. 보류 시 다른 트랙.
2. W0 rotation 완료됐습니까? → 코드 제거
3. T3 백엔드 API 답변? → Phase A 진입
4. T7 mode 결정 (mirror/english/ai)?
5. Placeholder 번역 (pages.marketingIntel Badge20kpi/K_3 등)?
6. drift Category B/C 진입?
7. PM Phase 2?

답변 받으면 N-152-F 적용해서 한 단계씩 진행.

---

## 4. 153차 작업 자산 (commit 됨, 재활용 가능)

### 4.1 commit 4건 (NEXT_SESSION commit 추가 시 5건)

| Hash | Subject | Files |
|---|---|---|
| `618aa26` | chore(locales): quarantine 339 tracked backup files + ignore _quarantine/ | 340 (+3/-6,422,373) |
| `c20a576` | docs(pm): add PM_HANDOVER and FEATURE_PLAN_120 (sessions 119-120 archive) | 2 (+235) |
| `8eda461` | chore(gitignore): session 153 diagnostic dumps cleanup (4 rounds + corrupt rm) | 1 (+85) |
| `30ebe4e` | feat(audit): session 153 t7 drift analysis toolkit + self-nest orphan verification | 14 (+9,462) |
| `(pending)` | docs(handover): session 153 → 154 handover | 1 (NEXT_SESSION.md) |

### 4.2 재사용 가능 도구 (commit 됨, repo root)

- session153_t7_categoryA_analyze.mjs — locale_count + namespace 분포 분석
- session153_t7_crm_pages_drill.mjs — L3 drill-down (crm.contentCal + pages.marketingIntel)
- session153_t7_data_quality_audit.mjs — dup keypaths + trivial + auto-gen 감사
- session153_t7_dup_usage_grep.mjs — 1,165 dup leaf 사용 검증
- session153_t7_self_nest_cleanup.mjs — self-nest extraction (DRY-RUN, quarantine-only)
- session153_t7_parent_nest_compare.mjs — parent vs self-nest 콘텐츠 diff
- session153_t7_selfnest_full_grep.mjs — 1,320 paths 전수 검증

### 4.3 데이터 파일 (commit 됨, 154차 입력)

- session153_t7_crm_contentCal_drill.csv — 1,456 rows, 113 L3 namespaces
- session153_t7_pages_marketingIntel_drill.csv — 1,183 rows, influencer 98% 집중
- session153_t7_dq_dup_keypaths.csv — 2,332 rows, 1,165 leaf signatures
- session153_t7_dq_trivial_values.csv — 24 rows (0.69%)
- session153_t7_dq_txt_autogen.csv — 4 rows
- session153_t7_dup_usage_results.csv — 2,332 rows, 1,165 dup all-orphan 확정
- session153_t7_selfnest_full_grep.csv — 1,320 rows, 100% orphan (0 code refs)

### 4.4 Quarantine 자산 (gitignored, 로컬 보존, 154차 cleanup 입력)

frontend/_quarantine/orphan_keys_s153_self_nest/ 디렉토리 내 15 JSON 파일:

- ko.json — 1,135 leaves
- ja.json — 1,305 leaves (sacred, 참조만, 수정 금지)
- zh.json — 1,305 leaves (sacred, 참조만, 수정 금지)
- zh-TW.json — 1,316 leaves
- en.json — 1,320 leaves
- es.json — 1,320 leaves
- fr.json — 1,320 leaves
- de.json — 1,329 leaves
- pt.json — 1,314 leaves
- ru.json — 1,314 leaves
- ar.json — 1,314 leaves
- hi.json — 1,314 leaves
- id.json — 1,331 leaves
- th.json — 1,331 leaves
- vi.json — 1,331 leaves

추가 quarantine 디렉토리:

- frontend/_quarantine/locales_backups_s153/ — 474 files (locale 백업 archive, 153차 W1)
- frontend/_quarantine/src_bak_s153/ — 5 files (src 백업 archive: JourneyBuilder×3 + CatalogSync + OrderHub)

### 4.5 미커밋 자산 (untracked, 154차 진입 시 활용)

- session153_t7_locale_hygiene.mjs — 152차 선제 작성, T7 sync 도구 (사용자 mode 결정 후 활용)
- session153_t7_sync_from_master.mjs — 152차 선제 작성, T7 sync 도구 (동일)
- _s153_selfnest_paths.txt — 153차 임시 helper (1,320 paths list, .gitignore 미커버이지만 임시)

---

## 5. 잔여 작업 (154차 이후)

### 5.1 즉시 진행 가능 (외부 의존 없음)

| 작업 | 우선순위 | 비고 |
|---|---|---|
| **Self-nest cleanup 실행** | **HIGH** | 19,599 entries × 15 locales, AST 기반 도구 작성 필요. 검증 완료 |
| drift Category A 보존 확정 결정 | medium | 3,458 keys, 사용자 검토 |
| pre-153 untracked 잔재 추가 정리 | low | ~129건 잔존 (latin 40 + misc 89) |

### 5.2 외부 의존 후 진행

| 작업 | 의존 조건 | 산출물 |
|---|---|---|
| **W0 코드 제거** | 사용자 rotation 완료 | `W0_SECURITY_PLAINTEXT_CREDS.md` |
| **T3 Phase A** | 백엔드 팀 답변 | `T3_BACKEND_API_REQUEST.md` |
| **T7 sync 실행** | 사용자 mode 결정 | `T7_LOCALE_SYNC_PLAN.md` + 153차 산출물 |
| **PM Phase 2** | endpoint, Session 사양 | (없음) |
| **Placeholder 번역** | 사용자 결정 | self-nest legacy 번역값 활용 가능 |

### 5.3 사용자 요청 큰 트랙 (외부 사양 필요)

- **T4 마케팅 자동화 8 카테고리** (152차~)
- **T5 팀 채팅** (152차~)
- **T6 프로젝트 협업** (152차~)
- **T1 PM Phase 2** (149차~)

### 5.4 기존 작업 트랙 (147~152차 잔재)

| 작업 | 분량 | 처리 시점 |
|---|---|---|
| s140/s142 CSV 89건 동기화 | 89건 | 외부 파이프라인 소유자 결정 후 |
| E5 잔여 ~25건 실제 leak | 25건 추정 | i18n 회귀 검사 시 |

### 5.5 153차 신규 식별

- **pages.marketingIntel.\* (parent) placeholder 잔존**: `Badge20kpi`, `K_3`, `K_6`, `K_8`, pageTitle "Performance Hub", pageSub 등 — 새 페이지명 번역 미완료. self-nest 의 legacy 번역값과 매핑 작업 가능
- **crm.contentCal 1,456 keys 12-locale uniform**: ko/ja/zh 번역 완료, 12개 비-CJK locale 영문 그대로 — 의도된 fallback 인지 사용자 확인 필요
- **pages.marketingIntel.influencer 1,160 keys 3-5 locale**: 광범위 미번역, T7 sync 진입 시 우선 대상

---

## 6. 초엔터프라이즈 보강 메모 (153차 누적, 154차 결정용)

153차 작업 중 검수자가 누적한 보강 후보 (사용자 결정 대기):

| # | 항목 | 사유 |
|---|---|---|
| **#1** | pre-commit hook | `*.bak*` 거부, sacred SHA 자동 검증, ko.js leaf count 급변 경고. N-145-B G2/G3/G5 자동화. 153차 339 tracked 백업 사고 재발 방지 |
| **#2** | .gitignore 정책 자동화 | 신규 세션 진입 시 session/s/t prefix 자동 추가. 153차 4 라운드 수동 .gitignore 비용 회피 |
| **#3** | Naming convention 강제 | session{NN}_* 가 진단 / 정식 commit 툴 두 용도 혼재. CONTRIBUTING.md 또는 ARCHITECTURE.md 명시. 진단 = _diag_session{NN}_*, 도구 = tools/session{NN}_*.mjs |
| **#4** | CI 모니터링 통합 | gh CLI PATH 정상화 (bash wrapper) 또는 공용 CI status 스크립트. master push 후 자동 CI watch 트리거 + Slack 알림 |

154차 검수자: 위 항목 별도 트랙 진입 시 사용자 결정 우선.

---

## 7. 알려진 이슈 / 주의사항 (148~153차 누적)

### 7.1 153차 신규

- **cd 잔류 트랩**: `cd /e/project/GeniegoROI &&` prefix 의무 (N-153-A)
- **Python stub 트랩**: Windows Store stub. Node.js 사용
- **gh CLI 미설치**: site curl 검증 또는 web 직접 확인
- **PUA codepoint 파일명**: Node.js fs.readdirSync + substring filter 사용
- **awk RFC 4180 quoted CSV 미처리**: Node.js + quote-aware parser 사용 (153차 도구들 표준)
- **인계서 코드 블록 중첩 깨짐**: 인계서 출력 시 마크다운 단일 코드 블록 의존 금지. create_file 로 직접 파일 생성

### 7.2 149~152차 누적 (유지)

- **PowerShell mojibake**, **PS→Bash 파이프 인코딩**, **escape 계층 폭발**, **콘솔 출력 잘림** (N-150-A), **execSync ENOBUFS**, **CRLF/LF 트랩**

### 7.3 워크북 데이터 특성

- **auto-ID 노이즈**, **데이터 손상 leak** (Txt_ prefix), **외래어 카테고리 영문 유지 표준** (149+150+152차 누적)

### 7.4 검수자-사용자 협업 패턴

- N-150-A 절대 경로 첨부 패턴
- 153차 추가: 검수자 도구 작성 시 dry-run + quarantine-only 우선 (N-153-B)
- 153차 추가: 인계서는 create_file 로 파일 직접 생성 (코드 블록 의존 금지)

### 7.5 CI / 프로덕션

- **배포 자동 트리거**: master push 시 자동 (deploy.yml)
- **CI 소요**: 평균 30~60초
- **153차 종결 시점 배포**: `8eda461` 완료, `30ebe4e` push 후 재배포 예정
- **Node 20 deprecation**: 2026-06-02 데드라인 (저우선순위)

### 7.6 PM 트랙 특이 사항

- PM 문서 drift 주의 (149차 3회 확인). N-15 원칙 (raw 검증 후 작업)

### 7.7 검수자 행동 위반 / 학습 사례 (152~153차)

**152차 위반 (4건)**:
- 인계서 미리 작성 (N-152-E)
- 선제 명령 작성 (N-152-F)
- 일방적 세션 종결 (N-152-G)
- 작업 여력 질문 오해석 (N-152-H)

**153차 학습 사례 (2건)**:
- cleanup 도구 첫 버전이 활성 locale JSON.stringify 재작성 시도 → 검수자 자기-수정 + N-153-B 도출 (dry-run + quarantine-only 우선)
- cleanup 범위 추정 오류 (9 leaves vs 실제 1,135~1,331) → N-153-C 도출 (4 패턴 검증 의무)
- 인계서 단일 마크다운 코드 블록 출력 시도 → 사용자가 복사 중 중첩 깨짐, 본문 누락 → create_file 로 직접 생성 학습

154차 검수자: 위 사례 인지 + 첫 응답에서 N-152-A~H + N-153-A~D 준수 명시.

---

## 8. 핵심 메트릭 요약

### 8.1 i18n 전체 진행 누적 (147~153차)

| 카테고리 | 처리 결과 |
|---|---|
| **Japanese pollution** (147차) | 청소 완료 + 150차 추가 21건 |
| **LATIN_LONG** (148차) | 3,798 / 3,798 (100%) |
| **SHORT_LATIN** (149차) | 207 active + 87 no-op + 735 auto-id 격리 |
| **B_MIXED_LOW_RATIO** (150차) | 94 final + 51 패치 + 4 no-op |
| **pages.marketingIntel.\* orphan** (150차) | 137 삭제 |
| **gAttr/journeyBuilder/lineChannel JA leak** (150차) | 21 패치 |
| **152차 W3** | drift 진단 + 분류 (cleanup 없음) |
| **153차** | drift Cat A 분석 + self-nest 발견 + quarantine (cleanup 미실행) |

### 8.2 153차 작업 결과

| 항목 | 결과 |
|---|---|
| **commit hash** | `618aa26`, `c20a576`, `8eda461`, `30ebe4e`, (+1 NEXT_SESSION) |
| **push** | `8eda461` push 완료, 마지막 통합 push 예정 |
| **CI status** | `8eda461` 자동 배포 완료, production HTTP 200/401 KO ✓ |
| **신규 분석 도구 (mjs)** | 7 |
| **신규 데이터 (CSV)** | 7 (총 8,651 rows) |
| **untracked 감소** | 2,673 → 129 (95.2%) |
| **repo deletion (locale 백업)** | 6,422,373 lines |
| **quarantine 누적** | 494 files + 19,599 entries (~700KB JSON) |
| **vite build** | green (19.36s) ✓ |
| **Sacred files** | ja/zh unchanged ✓ |
| **운영 원칙 신규** | 4개 (N-153-A, B, C, D) |
| **검수자 학습 사례** | 2건 (cleanup 도구 self-correction + 인계서 file 생성) |

---

## 9. 154차 첫 메시지 권장 패턴

### 사용자 → 검수자

사용자가 154차 첫 메시지 전송 시 권장 형식:

"153차 인계서 첨부합니다. 154차 [트랙 결정 또는 구체 작업 지시]. [NEXT_SESSION.md 첨부]"

### 검수자 첫 응답 의무 사항

- 운영 원칙 1.3 절 전체 인지 (특히 153차 신규 N-153-A ~ D + 152차 N-152-A ~ H)
- 7.7 절 검수자 학습 사례 인지 (재발 방지)
- 응답 형식: 핵심만 짧게, 추천 1개 명시, 한 번에 하나씩, 세션 종결은 사용자 결정 후에만, **t bash 명령은 `cd /e/project/GeniegoROI &&` prefix**

---

**문서 종결.**

본 인계서는 사용자 명시 종결 결정 후 검수자가 단일 파일로 작성했음 (N-152-G + N-152-E). 사용자는 기존 NEXT_SESSION.md 를 삭제하고 본 파일을 다운로드하여 같은 경로에 저장. 154차 첫 메시지에 첨부.