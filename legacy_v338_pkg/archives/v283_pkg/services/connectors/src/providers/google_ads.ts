import { GoogleAdsApi } from "google-ads-api";
import { ExecutePayload, ProviderAdapter, ProviderResponse } from "../contracts.js";

function api() {
  const client_id = process.env.GOOGLE_ADS_CLIENT_ID || "";
  const client_secret = process.env.GOOGLE_ADS_CLIENT_SECRET || "";
  const developer_token = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "";
  return new GoogleAdsApi({ client_id, client_secret, developer_token });
}

function customer() {
  const refresh_token = process.env.GOOGLE_ADS_REFRESH_TOKEN || "";
  const login_customer_id = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || undefined;
  const customer_id = process.env.GOOGLE_ADS_CUSTOMER_ID || "";
  const cust = api().Customer({
    customer_id,
    refresh_token,
    login_customer_id,
  });
  return cust;
}

export const googleAdsAdapter: ProviderAdapter = {
  name: "google_ads",
  async execute(p: ExecutePayload): Promise<ProviderResponse> {
    const must = ["GOOGLE_ADS_CLIENT_ID","GOOGLE_ADS_CLIENT_SECRET","GOOGLE_ADS_DEVELOPER_TOKEN","GOOGLE_ADS_REFRESH_TOKEN","GOOGLE_ADS_CUSTOMER_ID"];
    const missing = must.filter(k => !(process.env as any)[k]);
    if (missing.length) {
      return {
        ok: false,
        provider: "google_ads",
        channel: "ads",
        action_type: p.action_type,
        execution_id: p.execution_id,
        timestamp: new Date().toISOString(),
        error: "Missing env: " + missing.join(", "),
      };
    }

    if (p.action_type !== "ADS_BUDGET_UPDATE") {
      return {
        ok: false,
        provider: "google_ads",
        channel: "ads",
        action_type: p.action_type,
        execution_id: p.execution_id,
        timestamp: new Date().toISOString(),
        error: "Unsupported action_type in scaffold (implement more as needed)",
      };
    }

    // Payload expects:
    // - campaign_budget_resource_name OR campaign_budget_id
    // - new_amount_micros
    const budget_resource = p.payload.campaign_budget_resource_name as string | undefined;
    const budget_id = p.payload.campaign_budget_id as string | undefined;
    const new_amount_micros = Number(p.payload.new_amount_micros);

    if (!new_amount_micros || (!budget_resource && !budget_id)) {
      return {
        ok: false,
        provider: "google_ads",
        channel: "ads",
        action_type: p.action_type,
        execution_id: p.execution_id,
        timestamp: new Date().toISOString(),
        error: "Missing new_amount_micros and budget resource/id",
      };
    }

    const cust = customer();

    // Snapshot (best-effort): fetch current amount_micros
    // This is a scaffold query; GAQL may need adjustment by account setup.
    let snapshot: any = {};
    try {
      const resourceName = budget_resource || `customers/${cust.credentials.customer_id}/campaignBudgets/${budget_id}`;
      const rows = await cust.query(`SELECT campaign_budget.resource_name, campaign_budget.amount_micros FROM campaign_budget WHERE campaign_budget.resource_name = '${resourceName}' LIMIT 1`);
      const row: any = (rows as any)[0];
      snapshot = row ? { resource_name: row.campaign_budget.resource_name, amount_micros: row.campaign_budget.amount_micros } : { resource_name: resourceName };
    } catch (e: any) {
      snapshot = { warning: "snapshot query failed", error: e?.message };
    }

    // Apply update
    const resourceName = budget_resource || snapshot.resource_name;
    await cust.campaignBudgets.update([{ resource_name: resourceName, amount_micros: new_amount_micros } as any]);

    return {
      ok: true,
      provider: "google_ads",
      channel: "ads",
      action_type: p.action_type,
      execution_id: p.execution_id,
      timestamp: new Date().toISOString(),
      evidence: { resource_name: resourceName },
      snapshot,
      applied: { amount_micros: new_amount_micros },
      warning: "Rollback is best-effort; store snapshot at gateway for reliable rollback orchestration.",
    };
  },

  async rollback(p: ExecutePayload, snapshot: Record<string, any>) {
    const cust = customer();
    if (!snapshot?.resource_name || !snapshot?.amount_micros) {
      return {
        ok: false,
        provider: "google_ads",
        channel: "ads",
        action_type: "ROLLBACK",
        execution_id: p.execution_id,
        timestamp: new Date().toISOString(),
        error: "Missing snapshot.resource_name/amount_micros",
      };
    }
    await cust.campaignBudgets.update([{ resource_name: snapshot.resource_name, amount_micros: snapshot.amount_micros } as any]);
    return {
      ok: true,
      provider: "google_ads",
      channel: "ads",
      action_type: "ROLLBACK",
      execution_id: p.execution_id,
      timestamp: new Date().toISOString(),
      evidence: { resource_name: snapshot.resource_name },
      applied: { reverted_to_micros: snapshot.amount_micros },
      warning: "Rollback is best-effort; verify in Google Ads UI.",
    };
  }
};
