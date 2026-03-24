.PHONY: up down logs fmt test

up:
	docker compose up -d --build

down:
	docker compose down -v

logs:
	docker compose logs -f --tail=200

fmt:
	cd services/gateway && gofmt -w .
	cd services/connectors && npm run fmt
	cd services/ai_engine && python -m ruff format .

test:
	cd services/gateway && go test ./...
	cd services/connectors && npm test
	cd services/ai_engine && pytest -q
