# V273 Runtime Enforcement Upgrade
Date: 2026-02-25

## Major Upgrade: Runtime DSL Enforcement

Unlike V272 (policy defined), V273 introduces:
- Hard enforcement layer in connector execution path
- Allow/Deny evaluated before outbound API call
- Constraint validation (budget %, bid %, spend cap)
- Automatic rejection logged in audit_log + incidents

## Impact
- Policy is no longer advisory
- All connectors must pass DSL guardrail check
- Violations blocked before execution
