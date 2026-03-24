import type { Tenant, Role, User, Approval } from "./types";

export async function loadJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return (await res.json()) as T;
}

export async function loadTenants(): Promise<Tenant[]> {
  return loadJson<Tenant[]>("/demo/sample_data/demo_tenants.json");
}

export const ROLES: Role[] = [
  { id: "exec", name: "총괄(Executive)", permissions: ["overview:read","analytics:read","approvals:read","admin:read"] },
  { id: "marketing", name: "마케팅팀", permissions: ["overview:read","ads:read","ads:write","analytics:read","influencer:read","policies:read"] },
  { id: "finance", name: "재무팀", permissions: ["overview:read","approvals:read","approvals:write","policies:read","policies:write","admin:read"] },
  { id: "commerce", name: "커머스 운영", permissions: ["overview:read","commerce:read","commerce:write","analytics:read","approvals:read"] },
  { id: "agency_viewer", name: "대행사 Viewer", permissions: ["overview:read","commerce:read","ads:read","analytics:read"] },
];

export const DEMO_USERS: User[] = [
  { id: "u1", name: "김총괄", roleId: "exec", tenantId: "demo-tenant-kr-001" },
  { id: "u2", name: "박마케팅", roleId: "marketing", tenantId: "demo-tenant-us-002" },
  { id: "u3", name: "이재무", roleId: "finance", tenantId: "demo-tenant-kr-001" },
  { id: "u4", name: "최커머스", roleId: "commerce", tenantId: "demo-tenant-sea-003" },
  { id: "u5", name: "Agency Viewer", roleId: "agency_viewer", tenantId: "demo-tenant-us-002" },
];

export function roleById(id: string) {
  return ROLES.find(r => r.id === id) ?? ROLES[0];
}

export const DEMO_APPROVALS: Approval[] = [
  { id: "ap-001", tenantId: "demo-tenant-kr-001", type: "ads_budget_change", title: "[Meta] 예산 +25% 증액 요청", requestedBy: "박마케팅", status: "PENDING", createdAt: "2026-02-24T09:20:00Z" },
  { id: "ap-002", tenantId: "demo-tenant-kr-001", type: "inventory_write", title: "[쿠팡] 재고 120→150 반영", requestedBy: "최커머스", status: "PENDING", createdAt: "2026-02-24T10:05:00Z" },
  { id: "ap-003", tenantId: "demo-tenant-us-002", type: "price_update", title: "[Shopify] 가격 29.99→27.99 (프로모션)", requestedBy: "김총괄", status: "APPROVED", createdAt: "2026-02-23T18:10:00Z" },
];
