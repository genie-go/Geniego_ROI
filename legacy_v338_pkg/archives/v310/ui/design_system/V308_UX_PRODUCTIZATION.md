
# V308 UI/UX Productization Design (Enterprise)

## Goals
- Enterprise-grade navigation, search, RBAC-aware UI, audit visibility
- Fast daily operations: Commerce jobs, Ads control, Influencer campaigns
- Safe automation: policy + approvals + dry-run previews
- Observability: job health, connector health, SLA dashboards

## IA (Information Architecture)
1. Overview (Executive)
2. Commerce Hub
   - Products
   - Orders
   - Inventory
   - Channels
   - Jobs (with retry + DLQ)
3. Ads Hub
   - Accounts
   - Campaigns (real-time control)
   - Rules/Automation
   - Reports
4. Influencer Hub
   - Creators
   - Campaigns
   - Contracts/Settlement
5. Analytics
   - Funnels / Cohorts / Incrementality
6. Policies & Approvals
7. Billing & Plans
8. Admin
   - Users/Roles
   - Audit Logs
   - API Keys / Webhooks

## UX Patterns
- Global search (product, order, campaign, influencer)
- Bulk actions with confirmation + preview
- Diff view before applying changes (ads budget/bid, price updates)
- Retry/Resolve workflow for failed items
- Permission-based menu rendering

## Design System
- 8pt spacing grid
- Tokenized colors/typography
- Component catalog: Button, Table, Drawer, Modal, Stepper, Toast, Badge, Tabs, FilterBar
- Accessibility: keyboard nav, contrast, aria labels
