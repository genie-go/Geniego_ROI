import Hubspot from "@hubspot/api-client";
import { ExecutePayload, ProviderAdapter, ProviderResponse } from "../contracts.js";

function hs() {
  const token = process.env.HUBSPOT_ACCESS_TOKEN || "";
  return new Hubspot.Client({ accessToken: token });
}

async function fetchContactSnapshot(client: Hubspot.Client, email: string) {
  // Best-effort: search by email and snapshot a small set of properties
  const props = ["firstname", "lastname", "phone", "company", "email"];
  const r = await client.crm.contacts.searchApi.doSearch({
    filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: email }] }],
    properties: props,
    limit: 1,
  } as any);
  const c = r?.results?.[0];
  if (!c) return null;
  return { id: c.id, properties: c.properties };
}

export const hubspotAdapter: ProviderAdapter = {
  name: "hubspot",
  async execute(p: ExecutePayload): Promise<ProviderResponse> {
    const token = process.env.HUBSPOT_ACCESS_TOKEN || "";
    if (!token) {
      return {
        ok: false,
        provider: "hubspot",
        channel: "crm",
        action_type: p.action_type,
        execution_id: p.execution_id,
        timestamp: new Date().toISOString(),
        error: "HUBSPOT_ACCESS_TOKEN not set",
      };
    }

    const client = hs();

    if (p.action_type === "CRM_UPSERT_CONTACT") {
      const email = p.payload.email as string;
      const properties = (p.payload.properties as Record<string, any>) || {};
      if (!email) {
        return {
          ok: false, provider: "hubspot", channel: "crm", action_type: p.action_type,
          execution_id: p.execution_id, timestamp: new Date().toISOString(), error: "missing email"
        };
      }

      const snapshot = await fetchContactSnapshot(client, email);

      // Upsert: if exists update by id; else create
      let applied: any = {};
      if (snapshot?.id) {
        const u = await client.crm.contacts.basicApi.update(snapshot.id, { properties } as any);
        applied = { id: u.id, updated: true };
      } else {
        const c = await client.crm.contacts.basicApi.create({ properties: { ...properties, email } } as any);
        applied = { id: c.id, created: true };
      }

      return {
        ok: true,
        provider: "hubspot",
        channel: "crm",
        action_type: p.action_type,
        execution_id: p.execution_id,
        timestamp: new Date().toISOString(),
        evidence: { email },
        snapshot: snapshot || undefined,
        applied,
      };
    }

    // Bulk update example (stub)
    return {
      ok: false,
      provider: "hubspot",
      channel: "crm",
      action_type: p.action_type,
      execution_id: p.execution_id,
      timestamp: new Date().toISOString(),
      error: "unsupported action_type for hubspot in scaffold (implement CRM_BULK_UPDATE as needed)",
    };
  },

  async rollback(p: ExecutePayload, snapshot: Record<string, any>) {
    const token = process.env.HUBSPOT_ACCESS_TOKEN || "";
    if (!token) {
      return {
        ok: false,
        provider: "hubspot",
        channel: "crm",
        action_type: "ROLLBACK",
        execution_id: p.execution_id,
        timestamp: new Date().toISOString(),
        error: "HUBSPOT_ACCESS_TOKEN not set",
      };
    }
    if (!snapshot?.id || !snapshot?.properties) {
      return {
        ok: false,
        provider: "hubspot",
        channel: "crm",
        action_type: "ROLLBACK",
        execution_id: p.execution_id,
        timestamp: new Date().toISOString(),
        error: "missing snapshot.id/properties",
      };
    }

    const client = hs();
    await client.crm.contacts.basicApi.update(snapshot.id, { properties: snapshot.properties } as any);

    return {
      ok: true,
      provider: "hubspot",
      channel: "crm",
      action_type: "ROLLBACK",
      execution_id: p.execution_id,
      timestamp: new Date().toISOString(),
      evidence: { restoredId: snapshot.id },
      applied: { reverted: true },
      warning: "Rollback is best-effort; verify state in HubSpot.",
    };
  },
};
