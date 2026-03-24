import sgMail from "@sendgrid/mail";
import { ExecutePayload, ProviderAdapter } from "../contracts.js";

export const sendgridAdapter: ProviderAdapter = {
  name: "sendgrid",
  async execute(p: ExecutePayload) {
    const apiKey = process.env.SENDGRID_API_KEY || "";
    if (!apiKey) {
      return {
        ok: false,
        provider: "sendgrid",
        channel: "email",
        action_type: p.action_type,
        execution_id: p.execution_id,
        timestamp: new Date().toISOString(),
        error: "SENDGRID_API_KEY not set",
      };
    }
    sgMail.setApiKey(apiKey);

    const from = p.payload.from as string;
    const to = (p.payload.to as string[]) || [];
    const subject = p.payload.subject as string;
    const html = p.payload.html as string;
    const text = (p.payload.text as string) || "";

    const [resp] = await sgMail.send({
      from,
      to,
      subject,
      text: text || undefined,
      html: html || undefined,
    });

    return {
      ok: true,
      provider: "sendgrid",
      channel: "email",
      action_type: p.action_type,
      execution_id: p.execution_id,
      timestamp: new Date().toISOString(),
      evidence: { statusCode: resp.statusCode, headers: resp.headers },
      applied: { subject, toCount: to.length },
      warning: "Email is not reversible. Use kill-switch/pause to mitigate mistakes.",
    };
  },
};
