# 272차 세션 인계서 — 대행사 전기능 + 통합 데이터 플랫폼 + CI 라이브화 준비

> 작성 2026-07-09 · 브랜치 `feat/n236-admin-growth-automation` = `master` 정합(병합·push 완료) · 운영/데모 배포·검증 완료.

## 0. 한 줄 요약
전수 감사 18수정 + 대행사 멀티클라이언트 콘솔·**전기능 운영 브릿지** + **통합 데이터 플랫폼 1~2단계** 신설·배포·브라우저 검증 완료. master 병합(CI 트리거)까지 마쳤고, **CI 실배포 라이브화(SSH 키·스모크 계정) 준비 완료 — 사용자 GitHub Secrets 등록만 남음.**

## 1. 커밋 일람 (feat/n236 = master, 전부 push 완료)
| 커밋 | 구분 | 내용 |
|---|---|---|
| `eecee90` | fix | 8에이전트 전수 초정밀 감사 확정 18건(SSRF·세션바이패스·Paddle 승격·DLQ·WMS·sub-admin 등) |
| `1888a74` | perf | 첫 페인트 번들 5.9→0.67MB gzip(autofill·로케일 지연로드) |
| `3e95411` | feat | 대행사 멀티클라이언트 콘솔 + 클라이언트 승인 게이트(은행급 격리) |
| `686a500` | feat | 통합데이터 1단계(구독사 프로필 + 소스 레지스트리) + AgencyManager |
| `97e5146` | feat | 대행사 전기능 브릿지(클라이언트 전환 시 전 앱 운영) |
| `fb549da` | feat | 통합데이터 2단계(품질스캔·범용 신뢰도점수·계보 + DataTrust 배선) |
| `ab0eb27` | docs | DATA_ARCHITECTURE + PM_CHANGE_HISTORY |
| `32ebb68` | fix | CI SCP 경로 이중중첩 버그 수정(strip_components=2) |

## 2. 현재 라이브 상태
- **운영** www.genieroi.com: 프론트 `index-a78XXwme.js` 서빙(dist 일치)·백엔드 DataPlatform/agency 배선·home 200. 
- **데모** demo.genieroi.com: 동일 반영. 대행사 체험 계정 `agencytest@demo.local` / `agencyTest123!`(승인 링크 세팅됨 → "전기능 운영" 즉시 체험).
- master = feat/n236 = 배포본 정합. 회귀 0(신규 경로만 작동)·JS에러 0·화이트스크린 0.

## 3. 대행사(Agency) — 전기능 완성
- **은행급 격리**: `agency_account`·`agency_client_link`(N:N·status pending/approved/revoked·scope_json)·`agency_session`(agt_ 토큰). index.php 미들웨어가 **매 요청 승인 재검증(철회 즉시 403 fail-closed)** + 클라이언트 tenant 서버바인딩(위조 불가) + 읽기/쓰기 스코프 강제.
- **전기능 브릿지**(97e5146): 승인 클라이언트로 전환 시 agt_ 세션을 앱 인증 컨텍스트(TOKEN_KEY/USER_KEY 합성 user)로 심어 **전 앱(대시보드/캠페인/CRM/WMS/어트리뷰션…)을 클라이언트 스코프로 운영**. AuthContext가 agt_ 토큰이면 /auth/me 스킵(핵심 안전: 일반 사용자는 agt_ 미보유→미진입=회귀0). "대행사 모드" 배너 + 콘솔 안전복귀(합성세션 정리).
- 화면: `/agency`(콘솔·로그인/클라이언트목록/전기능운영)·`/agency-access`(클라이언트 소유자 승인/철회)·`/admin/agencies`(최고관리자 계정발급).
- **검증**: 데모·운영 브라우저 각 11항목 전부 PASS(로그인→승인클라이언트→전앱 렌더→배너→CRM 스코프→복귀→세션정리)·JS에러0.

## 4. 통합 데이터 플랫폼 (정본 = docs/data/DATA_ARCHITECTURE.md)
- ★**아키텍처 감사(4에이전트) 결과 3계층 대부분 이미 구현** → 중복 신설 0, 진짜 갭만 추가.
- **1단계**: `tenant_business_profile`(구독사 회사/브랜드)·`data_source` 레지스트리(구독등록 vs 외부수집 구분·외부는 channel_credential 자동유도). 화면 `/data-assets`.
- **2단계**: `/api/data-quality`(레코드 스캔·범용 reliability_score 0~100)·`/api/data-lineage`(분석도메인→원천 추적) + DataTrustDashboard 실배선(운영만·데모 샘플격리).
- ★**무데이터 테넌트=honest null+안내**(가짜숫자 0·목데이터 미사용 원칙 준수).

## 5. ★CI 라이브화 — 사용자 GitHub Secrets 등록만 남음
`.github/workflows/deploy.yml`은 master push 시 빌드 후 SCP/SSH 배포하나 **시크릿 미등록 시 자동 skip(inert)**. 이번에 라이브화 준비 완료:
- **SSH 키**: CI용 키페어 생성·공개키 운영 root authorized_keys 설치·인증검증 완료. 개인키=`C:\Users\Master\ci_deploy_key`(사용자→GitHub).
- **SCP 경로 버그 수정**(32ebb68): `strip_components:2`·target `.../frontend/dist`(기존 이중중첩 잠복버그).
- **스모크 계정**: 운영 `ci-smoke@genieroi.internal`(pro·tenant acct_cismoke 격리·id=51). Phase5 로그인·Phase6 smoke.mjs EXIT0 검증완료. 자격증명=`C:\Users\Master\ci_smoke_creds.txt`.

**사용자 등록 대상(GitHub → Settings → Secrets → Actions)**:
| Secret | 값 |
|---|---|
| `REMOTE_IP` | 1.201.177.46 |
| `REMOTE_USER` | root |
| `SSH_PRIVATE_KEY` | 개인키 파일 내용 |
| `TEST_EMAIL` | ci-smoke@genieroi.internal |
| `TEST_PASS` | (creds 파일) |

등록 후 다음 master push부터 **프론트 자동배포 + 로그인 헬스체크 + E2E 계약 회귀 게이트** 라이브.
⚠️ **CI SCP는 frontend/dist만** 배포 → **백엔드 PHP는 계속 수동 pscp 필수**.

## 6. 운영 개시 전제 (사용자 결정 사항)
1. **Paddle 운영키 설정** — 미설정 시 상용 과금·구독 갱신 비활성(승격 버그는 이번 수정됨).
2. **라이브 채널 자격증명 등록** — 미등록 시 실데이터 0(등록 즉시 실행 구현 완료).
3. (선택) 데이터 3단계: 출처 메타 행레벨·계보 end-to-end 그래프(관측성 강화·정합 결함 아님).

## 7. ★273차가 알아야 할 함정 (272차 학습)
- **배포 rm-then-deploy 레이스**: 프론트 배포 시 "구 assets rm → deploy" 순서가 배포 지연과 겹치면 **순간 assets=0(JS 404 화이트스크린)**. 운영 1회 발생·즉시 재배포 복구. → **배포 완료 후 stale 정리** 또는 배포 후 반드시 `entry_load=200` 확인.
- **CI SCP 이중중첩**: appleboy/scp-action은 source 경로째 풀어 target에 넣음 → strip_components 필수(수정 완료).
- **대행사 브릿지 키 접두**: TOKEN_KEY가 빌드별(genie_token / demo_genie_token) 상이 → 검증 스크립트도 빌드 모드에 맞춰야 함(272차 오검출 1회).
- **로그인 스모크**: login_type 미포함이면 admin/access_code 게이트 우회 → 일반 pro 계정 평문 로그인으로 토큰 발급(스모크 계정 선정 근거).

## 8. 검증 방법 (재현)
- 백엔드: `_tmp_php81/php.exe -l` · `node tools/check_routes_registered.mjs`.
- E2E: `E2E_EMAIL=.. E2E_PASSWORD=.. node tools/e2e/smoke.mjs`(운영·EXIT0 기대).
- 브라우저: Playwright(npm) 헤드리스 — MCP는 node kill로 끊김. 자격증명 env로만([[reference_session_credentials]]).
- 배포: plink/pscp(-pw) 수동 · 데모 `vite build --mode demo` → deploy_demo.cjs · 운영 `npm run build` → 경로치환 배포.

## 9. 자격증명·배포
[[reference_session_credentials]](SSH/MySQL/admin) · [[reference_ops_host]](경로) · [[reference_ci_deploy_inert]](CI 라이브화 상태) · [[reference_e2e_smoke]](스모크 계정). 운영 직접변경은 명시 승인 후만([[feedback_handoff_approval]]).
