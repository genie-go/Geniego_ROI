# V299 Admin Guide (Enterprise)

## SSO (OIDC) setup (scaffold)
In **Admin → SSO**, set:
- Issuer URL
- Client ID / Secret
- Redirect URL
Toggle Enabled.

This reference implementation stores config and exposes endpoints for initiating login/callback.
Production requires validating ID tokens, nonce, and session management.

## RBAC
Roles are per-tenant.
- roles(tenant_id, role_name)
- role_permissions(tenant_id, role_name, permission)

Common permissions:
- admin:*
- billing:read, billing:write
- marketplace:review, marketplace:publish
- audit:read

## Audit Logs
Every /v1 request writes an audit log record:
- actor, action(route), status, ip, user-agent, metadata

## Tenant policy templates
Use **Admin → Policies**:
- choose a template (strict approvals, finance guardrails, etc.)
- apply to tenant
