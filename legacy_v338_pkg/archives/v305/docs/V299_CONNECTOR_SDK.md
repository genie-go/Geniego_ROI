# Connector SDK (V299)

The connector service includes a tiny SDK to build and publish connectors quickly.

## Generate a new provider skeleton
From services/connectors:
- npm run sdk:gen -- --provider=my_provider

This creates:
- src/providers/my_provider.ts
- updates provider index

## Local test
- npm test (if configured)
- run docker compose and call /v1/connectors/test

## Publish to Marketplace (automation)
Use:
- npm run sdk:publish -- --tenant=<TENANT> --apiKey=<KEY> --provider=my_provider --displayName="My Provider" --scopes="ads.read,ads.write"

This calls the gateway marketplace publish endpoints and creates a connector_registry record.
