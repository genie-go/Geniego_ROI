# GENIE ROI V379 - Azure Bicep (Runnable baseline)

This Bicep template provisions a runnable baseline on Azure:

- Azure Front Door Standard (global entry)
- Storage Account static website (frontend)
- Container Apps Environment + API app (+ optional Worker app)
- Azure Database for PostgreSQL Flexible Server
- Service Bus namespace + queue
- Key Vault (RBAC enabled; integrate secrets as needed)

## Prerequisites
- Azure CLI
- Contributor permissions to a resource group
- Container images in ACR (or another registry accessible to Container Apps)

## Deploy
```bash
az group create -n rg-genie-roi -l koreacentral

az deployment group create \
  -g rg-genie-roi \
  -f main.bicep \
  -p apiImage=<acr>.azurecr.io/genie-roi-api:latest \
     workerImage=<acr>.azurecr.io/genie-roi-worker:latest \
     pgAdminPassword='<strong-password>'
```

After deploy, outputs include:
- `frontDoorEndpoint`
- `apiFqdn`
- `webEndpoint`

## Upload frontend build
Build locally and upload to the static website container:
```bash
cd ../../..
cd frontend
npm ci
npm run build

# upload to $web container
az storage blob upload-batch --account-name <storageAccountName> -d '$web' -s dist --overwrite
```

## Notes
- For production, switch Postgres to private networking and integrate Key Vault secrets into Container Apps.
- Add custom domains + certificates for Front Door in a follow-up.
