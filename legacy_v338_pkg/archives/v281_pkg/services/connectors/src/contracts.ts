export type Channel = "ads" | "email" | "crm" | "journey";

export type ExecutePayload = {
  execution_id: string;
  tenant_id: string;
  dry_run?: boolean;
  channel: Channel;
  provider?: string;       // google_ads/meta/naver/amazon_ads/ses/sendgrid/hubspot/salesforce
  action_type: string;
  payload: Record<string, any>;
};

export type ProviderResponse = {
  ok: boolean;
  provider: string;
  action_type: string;
  channel: Channel;
  execution_id: string;
  timestamp: string;
  evidence?: Record<string, any>;     // request/response IDs, message IDs, etc.
  snapshot?: Record<string, any>;     // BEFORE-state for rollback (ads/crm)
  applied?: Record<string, any>;      // AFTER-state summary
  warning?: string;
  error?: string;
};

export type ProviderAdapter = {
  name: string;
  execute: (p: ExecutePayload) => Promise<ProviderResponse>;
  rollback?: (p: ExecutePayload, snapshot: Record<string, any>) => Promise<ProviderResponse>;
};
