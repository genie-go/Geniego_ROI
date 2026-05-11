GeniegoROI 프로젝트 70차 세션 시작합니다. 외부 검수자 역할 부탁드립니다.

# 70차 핵심 (검수자 결정 대기)
- 69차 Phase B 완료: EventPopupDisplay.jsx T-1 첫 표준화 (회수 후보 3)
- 69차 후보 4 완료: deploy.yml paths-ignore .txt 추가
- 69차 후보 6 완료: CI 배포 결과 확인 (2건 모두 PASS)
- 69차 T-2 진입 시도 → GdprBanner.jsx POST 부적합 확인 → 부분 종결
- 70차 진입 전 postJsonAuth 함수 존재 여부 raw 확인 필수

# 69차 종결 상태 (확정)
- master HEAD: 98b0983 (push 완료, origin/master 동기화)
- working tree: 깨끗 (master ↑0 ↓0)
- 69차 commit 2건:
  - 5e0594c: refactor(popup): standardize auth fetch via getJsonAuth (T-1 first)
  - 98b0983: ci(deploy): add **.txt to paths-ignore

# 69차 핵심 성과

## Phase B (T-1 첫 표준화, 회수 후보 3) — 완료
1. 변경 파일: frontend/src/components/EventPopupDisplay.jsx
2. 변경 1: L3 import 추가
   - `import { getJsonAuth } from '../services/apiClient.js';`
3. 변경 2: L173~L178 fetch 6줄 → L173 getJsonAuth 1줄 (-5줄 순감)
   - 변경 전: localStorage 토큰 조회 + fetch + Authorization 헤더 + !r.ok 체크 + r.json()
   - 변경 후: `const d = await getJsonAuth("/api/v423/popups/active");`
4. 효과: 토큰 키 통일 (68차 Phase A 활용), localStorage 직접 조회 제거, 응답 처리 위임
5. 빌드 PASS (24.85s, 에러 0건, 경고 2건 기존 known issue 동일)
6. CI PASS (43s, GitHub Actions #187)

## 후보 4 (deploy.yml .txt paths-ignore) — 완료
1. 변경 파일: .github/workflows/deploy.yml
2. 변경: L7~L8 사이 `- '**.txt'` 1줄 삽입 (옵션 B 채택, 파일 확장자 그룹핑 일관)
3. 빌드 PASS (이전 빌드와 동일 — yml 변경은 빌드 영향 없음)
4. CI PASS (45s, GitHub Actions #188)

## 후보 6 (CI 배포 결과 확인) — 완료
- 5e0594c: ✅ PASS (43s)
- 98b0983: ✅ PASS (45s)
- 58fe119 (68차): ✅ PASS (48s, 회고 검증)
- 모든 commit master 브랜치 정상 배포

# 69차 미완료 (70차 회수 대상)

## **T-2 부적합 발견 → 별도 분류 필요** ⭐ 최우선
- **GdprBanner.jsx saveConsentToServer 함수 raw 검증 결과**:
  - method: POST (T-1은 GET)
  - body: JSON.stringify(consents) 존재
  - base URL: `${API}/api/gdpr/consent` (T-1은 `/api/v423/popups/active` 직접 경로)
  - 응답 처리 없음 (fire-and-forget 패턴)
  - 토큰: `genie_token` 1개만 (T-1은 `genie_token || genie_auth_token` 2-way)
- **결론**: getJsonAuth(GET 전용)로 교체 불가
- **필요 작업**: postJsonAuth 함수 존재 여부 검증 → 미존재 시 신규 생성 필요

## 후보 5 (메신저 5파일 verify) — 미진행
## T-1 후속 표준화 후보 (raw 검증 미진행, CC 분석 기준)
- pages/InstagramDM.jsx (L14)
- pages/OmniChannel.jsx (L19)
- pages/RollupDashboard.jsx (L534)
- pages/SmsMarketing.jsx (L23)
- pages/WhatsApp.jsx (L7)
- pages/WmsManager.jsx (L889, L1939) — 2회 사용, 복잡
- pages/CatalogSync.jsx (L278)
- components/SessionExpiryWarning.jsx (L30, removeItem 패턴 → 다른 용도 가능성)
- context/ConnectorSyncContext.jsx (L33)

## 추가 검증 미진행 파일
- security/SecurityGuard.js
- utils/apiInterceptor.js

# 69차에서 raw 확정된 핵심 정보

## apiClient.js (services/) 함수 목록 (68차 raw + 69차 부분 검증)
- L7: getJson (인증 없음, 퍼블릭)
- L35: postJson (68차 인계서 언급, body 받음, 인증 여부 미확인)
- L54~67: getJsonAuth (인증 GET, defaultHeaders 사용, 반환 = res.json())
- L70~?: putText (PUT 메서드)
- L89~?: putJson (PUT 메서드)
- **postJsonAuth 함수 존재 여부**: 미확인 ⚠️
- **추정 함수 명명 규칙**: `{method}Json{Auth?}` → postJsonAuth가 있다면 같은 패턴 예상

## getJsonAuth 동작 패턴 (L54~67 raw)
- 반환: 파싱된 JSON 객체
- 실패 시: throw Error(`HTTP ${status} ${detail}`)
- 외부 try/catch 필요

## EventPopupDisplay.jsx 최종 상태 (L1~3 import, L170~188 useEffect)
- import: React + sanitizeHtml + getJsonAuth
- useEffect 내부: try-catch + getJsonAuth + d.popups 사용 + setTimeout 1200ms 지연

# 환경 정보 (정책 #31, 변동 없음)
- 위치: D:\project\GeniegoROI\frontend\src\
- 도구: Antigravity + Claude Code (Sonnet 4.6) 페어
- 검수자 채팅: claude.ai 웹/모바일 새 창 (이 채팅)
- t 프리픽스: 자율 실행문 무력화용 (매 명령 앞에 부착)
- Edit tool: Read/Grep tool 호출 형태 (bash 변환 불필요)
- 빌드: PowerShell 명시해도 Bash 라우팅됨 (cd && npm), 권한 prompt 시 1번 Yes 정상

# 70차 첫 명령 (Claude Code에 입력 예정)
- t1: t git -C "D:\project\GeniegoROI" log --oneline -10
- t2: t git -C "D:\project\GeniegoROI" status --short
- t3: t git -C "D:\project\GeniegoROI" diff origin/master --stat
- t4: t git -C "D:\project\GeniegoROI" branch --show-current
- t5: t git -C "D:\project\GeniegoROI" remote -v

기대값: HEAD=98b0983, working tree clean, ↑0↓0, master, origin 정상

# 70차 우선순위 후보 (검수자 추천 대기)
1. **postJsonAuth 함수 raw 검증** (apiClient.js L1~L100 전체 함수 목록 확인) — 회차 ~5, 최우선
   - 존재 시: GdprBanner.jsx T-3 (POST 표준화) 진행 가능
   - 미존재 시: postJsonAuth 신규 작성 필요 (회차 ~15)
2. **T-1 후속 표준화** (단순 후보 raw 검증 후 1건 선정) — 회차 ~10
   - 후보: WhatsApp.jsx (L7), InstagramDM.jsx (L14), OmniChannel.jsx (L19)
   - GdprBanner.jsx 사례로 raw 검증 우선 정책 강화 필요
3. 후보 5 (메신저 5파일 verify) — 회차 ~10
4. 종결 인계

# 70차 진입 사전 raw 검증 필요 항목

## T-3 진입 (POST 표준화) 사전 검증
1. apiClient.js 전체 함수 목록 raw (L1~L100 또는 export 함수 grep)
   - postJsonAuth 존재 여부 확정
   - 존재 시 시그니처 (path, body, 반환 형태) 확인
2. GdprBanner.jsx L1~L42 raw 재확인 (69차에서 확보, 인계서에 핵심 정보 반영됨)

## T-1 후속 진입 사전 검증
1. 단순 후보 파일 L1~L50 raw (import + 토큰 사용 라인)
2. fetch method 반드시 raw 확인 (GdprBanner 사례 — POST/GET 혼재 가능성)

# 사용자 정책 (69차 종결 시점 — 50건 확정 + 69차 후보 4건 = 54건)

1~46: 67차까지 정착/후보
47 (68차): Claude Code 자동 생성 명령은 ESC/엔터 불가, t 프리픽스 덮어쓰기만 유효
48 (68차): PowerShell -Command .NET method 판정 시 권한 prompt 상시 발생, 1번 Yes 통과 일관
49 (68차): 인계서 파일 경로는 raw 재검증 후 신뢰
50 (68차): 토큰 키 통일 정책 — defaultHeaders 3-way fallback

## 69차 신규 후보
51 후보 (69차): **T-1 표준화 진입 전 raw fetch method 확인 필수** (GdprBanner 사례 — 함수명에 "save/load" 등 동작 단서 있어도 GET/POST 추정 금지, 반드시 raw 검증)
52 후보 (69차): **getJsonAuth는 GET 전용** (apiClient.js L55 raw 확인), POST 케이스는 별도 함수 필요 → T-1/T-3 분리 분류 정착
53 후보 (69차): **CC Read tool 우회는 deploy.yml/jsx 모두 발생** → 사용자 직접 VS Code 스크린샷이 가장 확실한 raw 확보 방법, PowerShell Get-Content 명령은 CC가 Read로 자동 우회 시도
54 후보 (69차): **인계서 작성 시 CC create_file/Write 도구 사용 금지** → 검수자가 채팅 출력 → 사용자가 직접 VS Code 붙여넣기 → 저장 (정책 일관)

# 69차 교훈

1. **fetch method 추정 금지 — raw 검증 필수**: GdprBanner.jsx saveConsentToServer는 함수명상 "저장"이지만 method 확인 없이는 GET/POST 불명. T-1 표준화 진입 전 method 확정 단계 추가 필요.
2. **getJsonAuth는 GET 전용 함수** (apiClient.js L55: defaultHeaders만 전달, method 없음 = 기본 GET). POST 케이스는 별도 함수 필요.
3. **CC Read tool 우회 패턴 일관 발생**: EventPopupDisplay.jsx, deploy.yml, GdprBanner.jsx 모두 PowerShell Get-Content 명령을 Read tool로 자동 우회. 우회 시 CC 자체 분석 결과만 출력 → 환각 가능성. → 사용자 직접 VS Code 스크린샷이 raw 확보 최종 수단.
4. **CC 자율 commit/Edit/push 명령 발생률 매우 높음**: 69차에서 약 8회 자율 명령 시도. 모두 t 프리픽스 덮어쓰기로 차단. commit 메시지까지 자체 작성 시도 (정책 #1 위반) → 일관 차단.
5. **검수자 자율 추천 절대 금지 (정책 #1) 재확인**: trade-off 객관 정리 후 사용자 결정 위임. 사용자가 "검수자 권고" 요청 시에도 단정 추천 회피, 객관 우열 평가만 제공.
6. **부분 종결 판단**: T-2 진행 시 GdprBanner POST 부적합 발견 → 회차 잔여 고려하여 옵션 B(부분 종결) 선택 정책 정착. 인계서 무결성 우선 원칙 일관.
7. **paths-ignore 그룹핑 정책**: 파일 확장자 그룹 → 디렉토리 그룹 순서 일관 유지 (옵션 B 채택 사례).

# 70차 검수자 권고 (T-3 진입 또는 T-1 후속)

## T-3 진입 (POST 표준화) 진행 시
- apiClient.js 전체 함수 목록 raw 확인 선행 (postJsonAuth 존재 여부)
- 미존재 시 신규 함수 작성: `export async function postJsonAuth(path, body)` 패턴 예상
- GdprBanner.jsx fire-and-forget 패턴 → 반환값 무시 가능 (await 만 유지)
- 회차 ~15 충분 확보 (신규 함수 작성 시)

## T-1 후속 진입 시
- 단순 후보 1건 raw 검증부터 (WhatsApp.jsx L7 또는 InstagramDM.jsx L14 권장)
- fetch method 반드시 raw 확인 (GdprBanner 교훈)
- GET 확정 시 T-1 패턴 그대로 적용 (Phase B 학습 모멘텀 활용)
- 1파일 1commit 권장 (rollback 용이성)

# 검수자 운영 원칙 (재확인)
- 자율 추천 절대 금지 (정책 #1)
- 명령 라인 표시: 즉시 실행용 + NEXT_SESSION.md 저장용 분리
- raw 결과만 받기 (Claude Code 자체 분석은 참고만, 환각 가능성 인지)
- Phase 경계에서 종결 권장 (인계 무결성 우선)
- t 프리픽스 누락 시 즉시 정지 + 재입력 요청
- 정책 #20, #21 엄격 적용 (모호 시 보류)
- 65차 교훈: Claude Code 자체 작성안(Write 도구) 사용 시 본문 검수 필수
- 66차 교훈 1: Claude Code 자동 생성 명령(Clear-Content, Set-Content) 절대 실행 금지, t 프리픽스 무력화
- 66차 교훈 2: Claude Code 자체 분석 결과는 raw 재검증 필수
- 66차 교훈 3: 본문 작성은 사용자 직접 에디터 편집이 가장 안전
- 67차 교훈 1: 수동 편집도 raw 재검증 필수 (syntax error 통과 위험)
- 67차 교훈 2: 표준화 진입 전 토큰/인증/스코프 등 메타 정책 raw 확인 선행
- 68차 교훈 1: 인계서 경로도 raw 재검증 필수
- 68차 교훈 2: Claude Code 자율 명령 빈도 매우 높음, t 프리픽스 덮어쓰기 일관 적용
- 68차 교훈 3: PowerShell -Command .NET method 판정 시 1번 Yes 통과
- 68차 교훈 4: raw 강제 추출 = Get-Content | Select-Object (Read tool 회피, 단 69차에서 CC가 이마저도 우회 확인)
- 68차 교훈 5: 검수자 첨부 이미지 raw가 환각 차단 최후 방어선
- 68차 교훈 6: commit 메시지 type 선택은 trade-off 객관 정리 후 사용자 결정
- **69차 교훈 1: fetch method 추정 금지, raw 검증 필수**
- **69차 교훈 2: getJsonAuth = GET 전용, POST/PUT은 별도 함수**
- **69차 교훈 3: CC Read tool 우회는 일관 발생 → 사용자 직접 스크린샷이 raw 확보 최종 수단**
- **69차 교훈 4: CC 자율 commit/Edit/push 명령 약 8회/세션 발생, t 프리픽스 일관 차단**
- **69차 교훈 5: 검수자 자율 추천 금지 일관 적용 (사용자 권고 요청 시에도 객관 평가만)**
- **69차 교훈 6: 부분 종결 판단 정책 정착 (회차 잔여 + 인계 무결성 우선)**
- **69차 교훈 7: paths-ignore 그룹핑 정책 (파일 확장자 → 디렉토리 순서)**

70차 시작 확인. 검수자 페어 진행 모드 인지. Claude Code 명령 t1번 결과 raw 수신 대기.