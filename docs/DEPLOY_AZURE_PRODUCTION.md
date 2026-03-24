
# V380 Azure Production Deployment (Bicep)

This Bicep set is intended as a runnable baseline:
- Front Door (managed cert for custom domain)
- Container Apps (API + optional worker) with VNet integration
- Postgres Flexible Server (public access disabled) via Private Endpoint + Private DNS zone
- Service Bus queue
- Key Vault (RBAC) for secret storage (baseline stores DB password as secret)
- Storage static website for React assets

## Deploy
```bash
cd infra/azure/bicep
az deployment group create -g <resource-group> -f main.bicep -p apiImage=<IMAGE> pgAdminPassword='<PASSWORD>' customDomain='app.example.com'
```

## Notes
- To use custom domain, create a CNAME from your domain to the Front Door endpoint host name, then Front Door validates automatically.
- For strict production, bind Container Apps secrets to Key Vault via managed identity + secretRef.
