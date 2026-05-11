# GeniegoROI 프로젝트 인계서 (71차용)

## 70차 종결 상태 (확정)

### Git 상태
- master HEAD: **dfde658** (push 완료, origin/master 동기화)
- working tree: 깨끗 (master ↑0 ↓0)
- 70차 commit: 1건 (push 완료)
  - **dfde658**: refactor(gdpr): standardize saveConsentToServer via postJsonAuth (T-3 first)
    - CI: ✅ success (2026-05-11 07:56 UTC)
    - 변경: 1 file, 254 insertions(+), 263 deletions(-)
    - 주의: stat 수치가 큰 이유는 core.autocrlf=true 환경의 라인 엔딩 차이 때문 (실제 의미 변경은 `git diff -w --stat` 기준 2 insertions + 11 deletions)

### 69차 → 70차 표준화 진행 누적
| 차수 | Commit | 작업 | 표준화 함수 | 파일 | CI |
|---|---|---|---|---|---|
| 69차 | 5e0594c | T-1 first | getJsonAuth (GET) | EventPopupDisplay.jsx | ✅ |
| 69차 | 98b0983 | CI paths-ignore | - | deploy.yml | ✅ |
| 70차 | dfde658 | T-3 first | postJsonAuth (POST) | GdprBanner.jsx | ✅ |

## 70차 작업 raw 확정 사항

### GdprBanner.jsx 변경 내역 (3개 변경)
1. **line 3 신규 import 추가**:
   `import { postJsonAuth } from "../services/apiClient";`
2. **const API 선언 제거** (이전 line 13):
   `const API = import.meta.env.VITE_API_BASE || '';` 삭제 (다른 사용처 없음 raw 확인)
3. **saveConsentToServer 함수 본문 교체** (line 27 부근):
   - 이전: raw fetch + localStorage 토큰 직접 조회 + Bearer 헤더 수동 작성 (15라인)
   - 이후: `await postJsonAuth('/api/gdpr/consent', consents);` 단일 호출 (7라인)

### apiClient.js 함수 목록 (raw 확정, frontend/src/services/apiClient.js)
| 라인 | 함수 | 비고 |
|---|---|---|
| 7 | getJson(path) | 비인증 GET |
| 23 | defaultHeaders() | 내부용 |
| 35 | postJson(path, body) | 비인증 POST |
| 54 | getJsonAuth(path) | 인증 GET (69차 표준화) |
| 70 | putText(path, rawBody) | 인증 PUT (text) |
| 89 | putJson(path, body) | 인증 PUT (JSON) |
| 109 | postJsonAuth(path, body, extraHeaders) | 인증 POST (70차 표준화) |
| 113 | requestJsonAuth(path, method, body, extraHeaders) | 인증 범용 요청 |
| 134 | getJsonAuthWithHeaders(path, extraHeaders) | 인증 GET + 커스텀 헤더 |
| 151 | postFileAuth(path, file, extraFields, extraHeaders) | 인증 파일 업로드 |

## 70차 핵심 교훈 (71차 적용 필수)

### 1. CC bash 출력 truncate 일관 발생
- 증상: `+N lines (ctrl+o to expand)` 표시되며 본문 미노출, CC가 자체 요약만 출력
- 대응: `| cat`, `head -N`, `wc -l` 등으로 강제 출력 검증 필요
- 최종 수단: 사용자 VS Code 직접 스크린샷 (69차 교훈 #3 유효)

### 2. CC raw 위장 (할루시네이션) 발견 사례
- 70차 사례: GdprBanner.jsx 코드를 묻자 CC가 **이미 postJsonAuth 사용 중인 가짜 코드 출력**
- 발각 방법: md5sum + wc -l + grep -c 같은 metadata 교차 검증
- 결과: postJsonAuth 매칭 0건 확인 → CC 출력 거짓 확정
- 교훈: CC 출력만으로 진행 절대 금지, raw metadata로 교차 검증 필수

### 3. core.autocrlf=true 환경의 git diff 함정
- 증상: 워킹트리/인덱스/HEAD 라인 엔딩 차이로 전체 파일 변경처럼 표시 (예: 254/263)
- 진실 확인: `git diff -w --stat` 또는 `git diff --cached --stat` (공백 무시)
- 워킹트리 라인 엔딩 변환은 **무의미** (autocrlf가 git add 시 또 변환)
- 70차 결론: 라인 엔딩 정규화는 별도 회차 작업 (.gitattributes 추가 등)

### 4. CC Edit 도구의 의도 오해석 사례
- 70차 사례: sed 명령을 "파일 끝에 \r 추가"로 잘못 해석 → 파일 손상 위험
- 대응: CC Edit 도구 자율 사용 시 거부, 사용자 VS Code 직접 Edit 또는 CC bash heredoc 우회

### 5. CC 자율 commit 메시지 작성 빈번
- 패턴: commit 단계에서 CC가 자율 메시지 작성하며 t 프리픽스 누락
- 대응: 검수자가 69차 패턴 일관 메시지로 덮어쓰기 (`refactor(scope): description (T-N first)`)

### 6. python3 미설치 환경 (Windows)
- Python heredoc 시도 시 Exit 49 발생
- 대안: Node.js (`node -e "..."`) 또는 bash heredoc 우회

## 71차 우선순위 후보

### 후보 A: T-1/T-3 후속 단순 표준화
- apiClient.js의 다른 인증 함수 (`requestJsonAuth`, `getJsonAuthWithHeaders`, `postFileAuth`) 사용처 raw 검색 필요
- raw fetch 패턴 grep으로 표준화 대상 파일 식별

### 후보 B: 후보 5 (메신저 5파일 verify) — 69차에서 인계됨, 미진행

### 후보 C: .gitattributes 추가 (라인 엔딩 정규화)
- 70차 dfde658 commit에서 stat 부풀림 원인
- 별도 회차 권장 (다른 .jsx 파일 영향 가능 → 대규모 변경)

## 71차 첫 명령 (Claude Code 입력 권장)
- t1: `t git -C "D:\project\GeniegoROI" log --oneline -10`
- t2: `t git -C "D:\project\GeniegoROI" status --short`
- t3: `t git -C "D:\project\GeniegoROI" diff origin/master --stat`
- t4: `t git -C "D:\project\GeniegoROI" branch --show-current`
- t5: `t git -C "D:\project\GeniegoROI" remote -v`

기대값: HEAD=dfde658, working tree clean, ↑0↓0, master, origin 정상

## 검수자 운영 원칙 (불변)
- 자율 추천 절대 금지 (정책 #1)
- raw 결과만 받기 (CC 자체 분석은 참고만)
- t 프리픽스 누락 시 즉시 정지 + 재입력 요청
- 부분 종결 판단 정책 정착 (회차 잔여 + 인계 무결성 우선)
- CC create_file/Write/Edit 도구 사용 금지 (인계서 및 파일 작성)
- bash 출력 truncate 발생 시 `| cat` 또는 사용자 VS Code 스크린샷으로 우회

## 71차 시작 확인 사항
- 본 인계서를 raw로 확인
- 첫 명령 t1~t5 실행 후 raw 결과 기대값과 일치 확인
- CC 자체 요약 무시, raw만 신뢰
- 작업 시작 전 우선순위 후보 (A/B/C) 검수자 결정 필요