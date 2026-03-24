import React from "react";
import type { Tenant, User, Permission } from "./types";
import { DEMO_USERS, roleById } from "./data";
import { loadTenants } from "./data";

type Ctx = {
  tenants: Tenant[];
  user: User;
  setUser: (u: User) => void;
  tenant: Tenant | null;
  setTenantId: (id: string) => void;
  has: (p: Permission) => boolean;
};

export const AppContext = React.createContext<Ctx | null>(null);

export function useApp() {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error("AppContext missing");
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [tenants, setTenants] = React.useState<Tenant[]>([]);
  const [user, setUser] = React.useState<User>(DEMO_USERS[0]);
  const [tenantId, setTenantId] = React.useState<string>(DEMO_USERS[0].tenantId);

  React.useEffect(() => {
    loadTenants().then(setTenants).catch(() => setTenants([]));
  }, []);

  React.useEffect(() => {
    // keep tenantId aligned with user
    setTenantId(user.tenantId);
  }, [user]);

  const tenant = tenants.find(t => t.tenant_id === tenantId) ?? null;
  const role = roleById(user.roleId);
  const has = (p: Permission) => role.permissions.includes(p);

  const value: Ctx = { tenants, user, setUser, tenant, setTenantId, has };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
