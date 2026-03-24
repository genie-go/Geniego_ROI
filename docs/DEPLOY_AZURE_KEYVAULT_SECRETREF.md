# Azure: Key Vault secretRef for Container Apps - V381

V381 configures Container Apps secrets using **Key Vault references** instead of plain values.

## Requirements
- User Assigned Managed Identity on the Container App
- Key Vault RBAC enabled
- Key Vault secret created (`dbConn`)
- Container App secret set with:
  - `keyVaultUrl`
  - `identity` (the managed identity resource ID)

## Notes
- `publicNetworkAccess` for Key Vault is disabled in V381.
- A Private Endpoint + private DNS zone `privatelink.vaultcore.azure.net` is deployed.
- Ensure your deployment user has permission to assign roles and create private endpoints.
