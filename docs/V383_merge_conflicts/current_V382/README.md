# GENIE_ROI (V382 Unified)

V382는 V374~V381 기능을 **단일 런타임(FastAPI + React + IaC)으로 통합**한 통합 버전입니다.

- Backend: FastAPI + SQLAlchemy + Alembic
- Frontend: React (Vite)
- Infra: AWS Terraform / Azure Bicep (V381 기반)

## Quickstart (Docker)
```bash
docker compose up --build
```
- Frontend: http://localhost:5173
- Backend: http://localhost:8000/docs

## V382 핵심 화면
- Connectors: /connectors
- Write-back: /writeback
- Approvals: /approvals
- Settlements: /settlements
- Audit: /audit

## Spec
- docs/V382_FUNCTIONAL_SPEC_KO.md

> Note: 현재 소스는 **안전한 통합 뼈대 + 데모 실행 가능한 엔드포인트/화면**까지 포함합니다.
> 실제 채널 공식 API 연결(Amazon SP-API 등)은 각 채널 어댑터 모듈에서 구현하도록 분리되어 있습니다.
