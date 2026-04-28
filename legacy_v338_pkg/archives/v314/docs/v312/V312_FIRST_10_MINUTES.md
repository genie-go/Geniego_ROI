# First 10 Minutes (Beginner Walkthrough)

This is the fastest way to understand the platform using the V311 React demo.

## Step 1) Run the demo UI
1. Open a terminal
2. Go to the demo app folder:
   - `cd demo/saas_frontend_react`
3. Install and run:
   - `npm install`
   - `npm run dev`
4. Open: http://localhost:5173

## Step 2) Try tenant switch (multi-customer SaaS concept)
- At the top bar, switch **Tenant** (DemoBrandUS / 데모브랜드K / DemoBrandSEA)
- The dashboard numbers will change based on the selected tenant.

## Step 3) Try role switch (RBAC)
- Switch the **User role**
- Notice how the left menu changes (some pages disappear).

## Step 4) Commerce workflow
- Go to **Commerce Hub**
- Use search/filter
- Select rows and run a bulk action (e.g., “재고 반영 요청”)

## Step 5) Ads workflow
- Go to **Ads Hub**
- Select campaigns and run “Pause 요청” or “예산 변경 요청” (demo)

## Step 6) Approvals (finance control)
- Switch user to **finance**
- Go to **승인함**
- Approve/Reject the pending requests

## Step 7) Analytics
- Go to **Analytics**
- Review the KPI cards and scenario notes

That’s the core story: **multi-tenant + RBAC + bulk ops + approvals + governed automation**.
