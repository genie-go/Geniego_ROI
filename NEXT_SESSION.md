# 67차 종결 (2026-05-11)

## master HEAD: 9eb78fc (push 완료, origin/master 동기화)
- working tree: 깨끗 (master ↑0 ↓0)
- 67차 commit 1건:
  - 9eb78fc: fix(api): putJson uses defaultHeaders() for Authorization

## 67차 핵심 성과
1. **apiClient.js putJson 인증 헤더 누락 버그 수정** (L92)
   - 변경 전: `headers: { "Content-Type": "application/json" }`
   - 변경 후: `headers: defaultHeaders()`
   - 영향: Authorization + X-Tenant-ID 헤더 누락 해소
   - 호출처: RulesEditorV2.jsx L126 (`/v395/templates/v2/${channel}/drafts/${draftId}` PUT)
2. **defaultHeaders() 호출 패턴 8개 함수 raw 확인 완료**
   - L38 postJson, L55 getJsonAuth, L73 putText, L92 putJson(신규), L116 requestJsonAuth, L135 getJsonAuthWithHeaders, L155 postFileAuth
3. **EventPopupDisplay.jsx fetch 패턴 사전 분석** (후보 3 보류 근거)
4. **빌드 검증 PASS**: 1168 모듈, 19.45초, 에러/경고 0건

## 67차 미완료 (68차 회수 대상)
- **후보 3 (T-1 첫 표준화 시도)**: EventPopupDisplay.jsx
  - 보류 근거: defaultHeaders() 토큰 정책과 L173 토큰 패턴 **불일치** 확인
  - defaultHeaders: TOKEN_KEY(demo_genie_token | genie_token) → accessToken → X-Tenant-ID
  - L173: genie_token → genie_auth_token (X-Tenant-ID 없음)
  - **선행 필수**: 토큰 키 통일 정책 수립
- 후보 4 (deploy.yml paths-ignore .txt 추가) — 회차 ~5, 저위험
- 후보 5 (메신저 5파일 verify) — 회차 ~10
- 후보 6 (67차 push CI 결과 확인) — GitHub Actions 9eb78fc 빌드 PASS 여부

## 68차 우선순위 후보
1. **토큰 키 통일 정책 수립** (회차 ~5) — 후보 3 선행 작업 ⭐ 최우선
   - 옵션 a: genie_auth_token deprecated 처리
   - 옵션 b: defaultHeaders에 genie_auth_token fallback 추가
   - 옵션 c: EventPopupDisplay만 예외 함수 사용
2. **후보 3 (T-1 첫 표준화)** — EventPopupDisplay.jsx, 회차 ~15 (정책 수립 후)
3. **후보 4** (deploy.yml .txt paths-ignore) — 회차 ~5
4. **후보 6** (67차 CI 배포 결과 확인) — 회차 ~3

## 환경 정보 (정책 #31, 변동 없음)
- 위치: D:\project\GeniegoROI\frontend\src\pages\
- 도구: Antigravity + Claude Code (Sonnet 4.6) 페어
- 검수자 채팅: claude.ai 웹/모바일 새 창
- t 프리픽스: 자율 실행문 무력화용 (매 명령 앞에 부착)
- Edit tool: Read/Grep tool 호출 형태
- 빌드: PowerShell 명시 권장 (Bash 라우팅 시 cd && 변환됨, 권한 prompt 발생)

## 68차 첫 명령 (Claude Code에 입력 예정)
- t1: t git -C "D:\project\GeniegoROI" log --oneline -10
- t2: t git -C "D:\project\GeniegoROI" status --short
- t3: t git -C "D:\project\GeniegoROI" diff origin/master --stat
- t4: t git -C "D:\project\GeniegoROI" branch --show-current
- t5: t git -C "D:\project\GeniegoROI" remote -v

**기대값**: HEAD=9eb78fc(또는 docs commit 1건 추가됨), working tree clean, ↑0↓0, master, origin 정상

## 68차 핵심 회수 raw 자료
### apiClient.js defaultHeaders() 토큰 조회 순서
```
1. TOKEN_KEY (demo_genie_token or genie_token) — 데모 모드 분기
2. "accessToken" fallback
3. X-Tenant-ID: 데모 시 "demo", 아니면 localStorage.tenantId
```

### EventPopupDisplay.jsx L173 (표준화 대상, 현재 동작)
```
fetch("/api/v423/popups/active", { ... })
토큰: genie_token → genie_auth_token (2-way fallback)
X-Tenant-ID: 미포함
demo_genie_token: 미읽음
```

### putJson 패치 모범 사례 (68차 진행 참고)
- 1파일 1commit 원칙 준수
- diff raw 검증 후 commit
- 빌드 PASS 후 push
- 자동 포맷팅 부수 변경은 동일 commit 포함 (revert 단위 유지)

## 사용자 정책 (67차 종결 시점 — 44건 확정 + 67차 후보 2건 = 46건)
1~19: 60차 정착
20~21: 61차 정착
22~28: 62차 사전 정의
29~34: 62차 정착
35~37: 63차 신규
38: 64차 신규
39 후보 (65차): Bash 라우팅 실패 시 PowerShell 자동 재시도 신뢰
40 후보 (65차): 권한 prompt "2번 Yes-all" 절대 금지
41 후보 (65차): NEXT_SESSION.md 갱신은 Phase A 직후 우선 처리
42 후보 (66차): PowerShell Select-String 한글 매치 시 ripgrep 우선
43 후보 (66차): Claude Code 자체 분석은 raw 재검증 후 신뢰
44 후보 (66차): archive 파일명 패턴 표준화 NEXT_SESSION_ARCHIVE_{prev_session}.md
**45 후보 (67차)**: subexpression `$()` 포함 PowerShell 명령은 권한 prompt 유발 → Read tool 우선
**46 후보 (67차)**: PowerShell -Command 명시해도 Claude Code가 Bash로 라우팅 (cd && npm) 변환됨 → 빌드 명령은 1번 Yes 통과 정상

## 67차 교훈
1. **수동 편집 시 raw 재검증 필수**: 사용자 직접 편집으로도 `,,` 중복 등 syntax error 발생 가능 (66차 교훈 3 보완)
2. **자동 포맷팅 부수 변경 허용**: 1commit 단위 revert 유지가 더 중요
3. **표준화 진입 전 토큰 정책 등 메타 결정 선행**: 단순 함수 교체로 안 보이는 불일치 발견 가능
4. **Claude Code 분석 라벨**: "구조가 동일하므로 X로 바꾸면 됩니다" 패턴은 raw 미확인 환각 위험 (정책 #43 후보 실증 누적)

## 검수자 운영 원칙 (재확인)
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
- **67차 교훈 1**: 수동 편집도 raw 재검증 필수 (sytanx error 통과 위험)
- **67차 교훈 2**: 표준화 진입 전 토큰/인증/스코프 등 메타 정책 raw 확인 선행

68차 시작 확인. 검수자 페어 진행 모드 인지. Claude Code 명령 t1번 결과 raw 수신 대기.