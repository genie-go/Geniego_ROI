
# V309 Threat Model (Summary)

## Assets
- OAuth tokens / API keys
- Customer commerce/ads performance data
- PII (orders)
- Budget control endpoints

## Threats & Controls
- Token leakage: secrets manager, encryption at rest, rotation, least privilege scopes
- Webhook spoofing: signature verification + replay protection + IP allowlists
- RBAC bypass: centralized authZ middleware + audit logs
- Data exfiltration: tenant isolation, row-level policies (optional), egress controls
- Supply chain: signed images, SBOM, dependency scanning

## Compliance-ready controls
- Audit logs (immutable storage option)
- Data retention policies
- Access reviews & role templates
