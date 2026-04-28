# GENIE_ROI V330 (SaaS 점수 8.5~9.0대 목표) - 초고효율 업그레이드 요약

V329fh에서 점수 깎이던 포인트(커넥터 실운영, 컴플라이언스, ID graph 충돌, 서버 RBAC, 모니터링)를
'상용 SaaS' 운영 감각으로 한 번에 끌어올린 패키지입니다.

## 핵심 업그레이드
1) SmartStore OAuth(네이버 커머스API) 토큰 발급: Client Credentials + signature 기반으로 "실운영형" 마감
2) Pixel 컴플라이언스: 동의 로그 / retention / 삭제요청(DSR) + 처리
3) ID graph: 증거 기반 confidence 누적 + 충돌 감지(email_hash ↔ customer_id)
4) UI: 권한 메뉴 + 서버 API 잠금(진짜 RBAC) + 모니터링 패널(에러/지연/누락)

## 실행
- 서버: scripts/v330/run_web_ui.py
- UI:
  - /dashboard/login_v330.html
  - /dashboard/ui_v330.html
- Pixel:
  - /p/<project>/pixel/p.js
  - /p/<project>/pixel/e
  - /p/<project>/pixel/s2s

## 기본 계정(최초 실행시 자동 생성)
- admin / admin
- analyst / analyst
- viewer / viewer

## 운영 팁(상용 느낌 올리는 순서)
1) Pixel 먼저 배포(동의 배너 포함) → 전환 누락/중복 감소
2) SmartStore 토큰 테스트로 인증 정상화 후 증분 수집 워터마크 전진
3) 모니터링 탭에서 "last_ok_age / error"만 봐도 운영 난이도 크게 하락
4) DSR(삭제요청) 프로세스까지 갖추면 엔터프라이즈 협의에서 신뢰도 급상승
