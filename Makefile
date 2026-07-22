# GeniegoROI — Root Makefile
# CCIS Part002 — Repository & Monorepo Architecture
# Version 1.0 | 2026-07-22
#
# 사용법:
#   make help           — 사용 가능한 명령 목록
#   make bootstrap      — 개발 환경 초기화
#   make validate       — Repository 검증 실행
#   make build          — 전체 빌드
#   make test           — 전체 테스트
#   make lint           — 전체 Lint
#   make compose-up     — Docker Compose 시작
#   make compose-down   — Docker Compose 종료

.PHONY: help bootstrap validate lint test build build-frontend build-backend \
        compose-up compose-down validate-layout validate-boundaries \
        validate-generated validate-large-files

# ─────────────────────────────────────────────────────────────
# 설정
# ─────────────────────────────────────────────────────────────
SHELL := /bin/bash
FRONTEND_DIR := frontend
BACKEND_DIR  := backend

# 검증 스크립트는 bash 단일 구현(scripts/validation/*.sh)만 유지한다.
# Windows 에서는 Git Bash 의 /bin/bash 로 동작하며, 동일 로직의 .ps1 사본은 두지 않는다
# (2벌 유지 시 한쪽만 갱신되는 표류가 발생 — CCIS Part002 중복 금지 원칙).
#
# ★ Windows 에서는 반드시 Git Bash 에서 실행할 것.
#   PowerShell/cmd 에서 make 를 돌리면 `bash` 가 C:\Windows\System32\bash.exe(WSL 스텁)로 해석돼
#   "Linux용 Windows 하위 시스템 배포판이 없습니다" 가 깨진 한글로 출력되고 Error 1 로 죽는다.
#   원인 추적에 시간이 갈리므로 아래에서 선제 차단한다.
ifeq ($(OS),Windows_NT)
  BASH_PROBE := $(shell bash -c "echo ok" 2>/dev/null)
  ifneq ($(BASH_PROBE),ok)
    $(error 실행 가능한 bash 가 없습니다. Windows 에서는 Git Bash 로 실행하십시오 — 예: "C:/Program Files/Git/bin/bash.exe" -lc "cd /e/project/GeniegoROI && make validate". PowerShell 의 bash 는 WSL 스텁이라 동작하지 않습니다)
  endif
endif

# ─────────────────────────────────────────────────────────────
# 도움말
# ─────────────────────────────────────────────────────────────
help: ## 사용 가능한 명령 목록 출력
	@echo ""
	@echo "GeniegoROI Makefile Commands"
	@echo "============================"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-25s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ─────────────────────────────────────────────────────────────
# Bootstrap
# ─────────────────────────────────────────────────────────────
bootstrap: ## 개발 환경 초기화 (의존성 설치)
	@echo "[bootstrap] Installing frontend dependencies..."
	cd $(FRONTEND_DIR) && npm install
	@echo "[bootstrap] Installing backend dependencies..."
	cd $(BACKEND_DIR) && composer install
	@echo "[bootstrap] Done."

# ─────────────────────────────────────────────────────────────
# Validation
# ─────────────────────────────────────────────────────────────
validate: validate-layout validate-boundaries validate-generated validate-large-files ## 전체 Repository 검증

validate-layout: ## Repository 레이아웃 검증
	@echo "[validate-layout] Running shell validation..."
	@bash scripts/validation/check-repository-layout.sh || exit 1

validate-boundaries: ## 모듈 경계 의존성 검증
	@echo "[validate-boundaries] Checking module boundaries..."
	@bash scripts/validation/check-module-boundaries.sh || exit 1

validate-generated: ## Generated Code 상태 검증
	@echo "[validate-generated] Checking generated files..."
	@bash scripts/validation/check-generated-files.sh || exit 1

validate-large-files: ## 대용량 파일 검증
	@echo "[validate-large-files] Checking large files..."
	@bash scripts/validation/check-large-files.sh || exit 1

# ─────────────────────────────────────────────────────────────
# Lint
# ─────────────────────────────────────────────────────────────
lint: lint-frontend lint-backend ## 전체 Lint

lint-frontend: ## Frontend ESLint 실행
	@echo "[lint-frontend] Running ESLint..."
	cd $(FRONTEND_DIR) && npm run lint

lint-backend: ## Backend PHP Lint 실행
	@echo "[lint-backend] Running PHP lint..."
	cd $(BACKEND_DIR) && php -l src/routes.php
	@echo "[lint-backend] PHP lint passed."

# ─────────────────────────────────────────────────────────────
# Build
# ─────────────────────────────────────────────────────────────
build: build-frontend build-backend ## 전체 빌드

build-frontend: ## Frontend 빌드
	@echo "[build-frontend] Building React SPA..."
	cd $(FRONTEND_DIR) && npm run build
	@echo "[build-frontend] Build complete: $(FRONTEND_DIR)/dist/"

build-backend: ## Backend Composer 설치 (Production)
	@echo "[build-backend] Installing PHP dependencies (production)..."
	cd $(BACKEND_DIR) && composer install --no-dev --optimize-autoloader
	@echo "[build-backend] Done."

# ─────────────────────────────────────────────────────────────
# 부분 빌드
# ─────────────────────────────────────────────────────────────
build-app: ## 특정 App 빌드 (APP=web|mobile)
ifeq ($(APP),web)
	@make build-frontend
else ifeq ($(APP),mobile)
	cd $(FRONTEND_DIR) && npm run cap:sync
else
	@echo "Usage: make build-app APP=web|mobile"
	@exit 1
endif

# ─────────────────────────────────────────────────────────────
# Test
# ─────────────────────────────────────────────────────────────
test: lint validate ## 전체 테스트 (lint + validation)
	@echo "[test] All tests passed."

# ─────────────────────────────────────────────────────────────
# Docker Compose
# ─────────────────────────────────────────────────────────────
compose-up: ## Docker Compose 시작 (로컬 개발)
	@echo "[compose-up] Starting services..."
	docker compose up -d

compose-down: ## Docker Compose 종료
	@echo "[compose-down] Stopping services..."
	docker compose down

compose-logs: ## Docker Compose 로그 확인
	docker compose logs -f

# ─────────────────────────────────────────────────────────────
# Git 상태
# ─────────────────────────────────────────────────────────────
git-status: ## Git 상태 확인
	@echo "[git-status] Repository status:"
	@git status --short
	@echo ""
	@echo "[git-status] Current branch: $$(git branch --show-current)"

git-diff: ## Git Diff 확인
	@git diff --stat
	@git diff --check
