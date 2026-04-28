# Deploy on Azure with Bicep (V378)

Path: `infra/azure/bicep`

Recommended production setup:
- Front Door(+WAF)
- Container Apps (api + worker)
- Azure Database for PostgreSQL Flexible Server
- Storage Static Website / Static Web Apps
- Service Bus Queue (ingestion/batch)
- Key Vault, App Insights

Notes:
- Use Managed Identity for Key Vault access
- Enforce private networking (VNet integration) where required
