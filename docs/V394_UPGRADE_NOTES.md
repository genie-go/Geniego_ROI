# V394 Upgrade Notes (from V393)

This release keeps all V393 capabilities and adds an **Amazon SP-API MVP** that supports:

- LWA OAuth (refresh-token) access token retrieval
- AWS SigV4 signing (service: execute-api)
- Listings Items API `putListingsItem` (create/update listing) via **WritebackJob** execution

## What changed
- Added `backend/app/services/v394/amazon_sp_api.py` (LWA + SigV4 + Listings Items PUT)
- Upgraded Amazon provider to call the real SP-API (still guarded by template v2 validation)
- Added `/v394/*` API routes and bumped platform version to 394

## Safety & secrets
No secrets are stored in the repo. Credentials must be provided via environment variables.
See `docs/V394_AMAZON_SPAPI_SETUP.md`.
