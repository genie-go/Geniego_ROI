export type Permission =
  | "overview:read"
  | "commerce:read" | "commerce:write"
  | "ads:read" | "ads:write"
  | "influencer:read" | "influencer:write"
  | "policies:read" | "policies:write"
  | "approvals:read" | "approvals:write"
  | "analytics:read"
  | "admin:read" | "admin:write";

export type Role = {
  id: string;
  name: string;
  permissions: Permission[];
};

export type Tenant = {
  tenant_id: string;
  name: string;
  region: "KR" | "US" | "SEA" | "EU";
  plan: "Starter" | "Growth" | "Enterprise" | "Enterprise+";
};

export type User = {
  id: string;
  name: string;
  roleId: string;
  tenantId: string;
};

export type Approval = {
  id: string;
  tenantId: string;
  type: "ads_budget_change" | "price_update" | "inventory_write" | "influencer_settlement";
  title: string;
  requestedBy: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
};
