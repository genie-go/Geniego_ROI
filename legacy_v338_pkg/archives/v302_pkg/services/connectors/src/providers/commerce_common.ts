import { ExecutePayload, ProviderResponse } from "../contracts.js";

export function nowIso() { return new Date().toISOString(); }

export function okResp(p: ExecutePayload, provider: string, applied?: any, evidence?: any, warning?: string): ProviderResponse {
  return {
    ok: true,
    provider,
    action_type: p.action_type,
    channel: p.channel,
    execution_id: p.execution_id,
    timestamp: nowIso(),
    applied: applied || {},
    evidence: evidence || {},
    warning,
  };
}

export function errResp(p: ExecutePayload, provider: string, error: string, evidence?: any): ProviderResponse {
  return {
    ok: false,
    provider,
    action_type: p.action_type,
    channel: p.channel,
    execution_id: p.execution_id,
    timestamp: nowIso(),
    error,
    evidence: evidence || {},
  };
}

export async function sleep(ms: number) { await new Promise((r) => setTimeout(r, ms)); }

export async function jsonFetch(url: string, init: RequestInit, retries = 4): Promise<{ status: number; headers: Headers; json: any; text: string; }> {
  let lastErr: any = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const resp = await fetch(url, init);
      const text = await resp.text();
      const json = text ? (() => { try { return JSON.parse(text); } catch { return { raw: text }; } })() : {};
      if (resp.status === 429 || (resp.status >= 500 && resp.status <= 599)) {
        const ra = parseInt(resp.headers.get("retry-after") || "0", 10);
        const waitMs = ra > 0 ? ra * 1000 : Math.min(8000, 400 * (attempt + 1));
        await sleep(waitMs);
        continue;
      }
      return { status: resp.status, headers: resp.headers, json, text };
    } catch (e: any) {
      lastErr = e;
      await sleep(Math.min(5000, 400 * (attempt + 1)));
    }
  }
  throw lastErr || new Error("jsonFetch_failed");
}

export function requireFields(creds: any, fields: string[], provider: string) {
  const c = creds || {};
  const missing = fields.filter((f) => !c[f]);
  if (missing.length) throw new Error(`${provider}_missing_creds:${missing.join(",")}`);
  return c;
}
