# V377 Docker 배포 가이드

## 1) 요구사항
- Docker Desktop (또는 docker + docker-compose)

## 2) 빠른 시작
```bash
cp .env.example .env
docker compose up --build
```

## 3) 접속
- Backend API: http://localhost:8000
- Frontend UI: http://localhost:5173

## 4) 운영 팁
- DB 볼륨은 `genie_db` 로 유지됩니다.
- 운영에서는 `JWT_SECRET` 을 반드시 강력한 값으로 변경하세요.
- 프록시/로드밸런서가 있다면, CORS_ORIGINS 를 실제 도메인으로 제한하세요.
