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

.PHONY: help bootstrap validate lint test quality quality-baseline phpstan phpstan-baseline build build-frontend build-backend \
        compose-up compose-down validate-layout validate-boundaries \
        validate-generated validate-large-files validate-env

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
bootstrap: ## 개발 환경 초기화 (검증 → 의존성 설치 → .env 템플릿 → git hooks)
	@bash scripts/bootstrap/bootstrap.sh

validate-env: ## 개발환경 도구 검증 (node·php·git·composer·docker·python)
	@bash scripts/validation/check-environment.sh

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
# lint  = 원시 결과 그대로. 기존 위반 958건이 있으므로 **현재는 실패한다**(그게 사실이다).
# quality = 베이스라인 게이트. 기존 위반은 통과시키되 증가분만 차단한다.
# 둘 다 필요하다 — lint 를 통과시키려고 규칙을 끄지 않기 위해서다.
lint: lint-frontend lint-backend ## 전체 Lint (원시 — 기존 위반 때문에 현재 실패한다)

lint-frontend: ## Frontend ESLint 실행
	@echo "[lint-frontend] Running ESLint..."
	cd $(FRONTEND_DIR) && npm run lint

lint-backend: ## Backend PHP 구문 검사 (전 파일)
	@echo "[lint-backend] Running PHP lint on all tracked PHP files..."
	@fail=0; tot=0; \
	for f in $$(git ls-files 'backend/**/*.php' 'tools/*.php'); do \
	  tot=$$((tot+1)); \
	  php -l "$$f" > /dev/null || { echo "  구문 오류: $$f"; fail=$$((fail+1)); }; \
	done; \
	echo "[lint-backend] $$tot files checked, $$fail error(s)."; \
	[ $$fail -eq 0 ]

quality: ## 통합 품질 게이트 (ESLint · PHP구문 · Shell · JSON · Git · PHPStan 정적분석)
	@bash scripts/quality/check-code-quality.sh

quality-baseline: ## 위반을 줄인 뒤 ESLint 베이스라인 갱신 (상향 금지)
	@bash scripts/quality/check-code-quality.sh --update-baseline

phpstan: ## Backend PHPStan 정적분석 (레벨 5 · 베이스라인 대비)
	cd $(BACKEND_DIR) && php vendor/bin/phpstan analyse --memory-limit=1G

phpstan-baseline: ## 위반을 줄인 뒤 PHPStan 베이스라인 갱신 (상향 금지)
	cd $(BACKEND_DIR) && php vendor/bin/phpstan analyse --generate-baseline=phpstan-baseline.neon --memory-limit=1G

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
test: quality validate ## 전체 검증 (품질 게이트 + 저장소 게이트)
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
