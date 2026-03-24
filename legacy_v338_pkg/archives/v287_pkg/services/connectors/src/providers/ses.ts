import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { ExecutePayload, ProviderAdapter } from "../contracts.js";

function client() {
  const region = process.env.SES_REGION || "ap-northeast-2";
  return new SESClient({ region });
}

export const sesAdapter: ProviderAdapter = {
  name: "ses",
  async execute(p: ExecutePayload) {
    const from = p.payload.from as string;
    const to = (p.payload.to as string[]) || [];
    const subject = p.payload.subject as string;
    const html = p.payload.html as string;
    const text = (p.payload.text as string) || "";

    if (!from || to.length === 0 || !subject) {
      return {
        ok: false,
        provider: "ses",
        channel: "email",
        action_type: p.action_type,
        execution_id: p.execution_id,
        timestamp: new Date().toISOString(),
        error: "missing from/to/subject",
      };
    }

    // DRY_RUN is enforced at gateway by default; connectors assume real call here.
    const cmd = new SendEmailCommand({
      Source: from,
      Destination: { ToAddresses: to },
      Message: {
        Subject: { Data: subject },
        Body: {
          Html: html ? { Data: html } : undefined,
          Text: text ? { Data: text } : undefined,
        },
      },
    });

    const resp = await client().send(cmd);

    return {
      ok: true,
      provider: "ses",
      channel: "email",
      action_type: p.action_type,
      execution_id: p.execution_id,
      timestamp: new Date().toISOString(),
      evidence: { messageId: resp.MessageId, to, from },
      applied: { subject, toCount: to.length },
      warning: "Email is not reversible. Use kill-switch/pause to mitigate mistakes.",
    };
  },
};
