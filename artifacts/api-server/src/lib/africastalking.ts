const AT_BASE = "https://api.africastalking.com/version1/messaging";

export interface AtRecipient {
  number: string;
  status: string;
  statusCode: number;
  cost: string;
  messageId: string;
}

export interface AtBatchResult {
  sent: AtRecipient[];
  failed: AtRecipient[];
  totalCostKes: number;
}

/** Parse cost string like "KES 0.8000" → 0.8 */
function parseCost(costStr: string): number {
  const m = costStr?.match(/[\d.]+/);
  return m ? parseFloat(m[0]) : 0;
}

/**
 * Send SMS to up to 200 numbers in one AT API call.
 * Returns per-recipient results and the total cost in KES.
 */
export async function sendSmsBatch(params: {
  to: string[];           // E.164 numbers, max 200
  message: string;
  from?: string;          // Sender ID (optional)
}): Promise<AtBatchResult> {
  const apiKey = process.env.AT_API_KEY;
  const username = process.env.AT_USERNAME;

  if (!apiKey || !username) {
    throw new Error("AT_API_KEY and AT_USERNAME secrets are not set. Add them in the Replit Secrets panel.");
  }

  const body = new URLSearchParams({ username, to: params.to.join(","), message: params.message });
  if (params.from) body.set("from", params.from);

  const res = await fetch(AT_BASE, {
    method: "POST",
    headers: { apiKey, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Africa's Talking API ${res.status}: ${text}`);
  }

  const data = await res.json() as { SMSMessageData: { Recipients: AtRecipient[] } };
  const recipients: AtRecipient[] = data.SMSMessageData?.Recipients ?? [];

  // statusCode 101 = Sent, 100 = Processed, 102 = Queued — all considered success
  const successCodes = new Set([100, 101, 102]);
  const sent = recipients.filter(r => successCodes.has(r.statusCode));
  const failed = recipients.filter(r => !successCodes.has(r.statusCode));
  const totalCostKes = recipients.reduce((sum, r) => sum + parseCost(r.cost), 0);

  return { sent, failed, totalCostKes };
}
