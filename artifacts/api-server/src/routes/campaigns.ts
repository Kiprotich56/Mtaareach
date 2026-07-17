import { Router, type IRouter } from "express";
import { db, campaignsTable, smsTemplatesTable, smsLogsTable, contactsTable, walletsTable, walletTransactionsTable, groupMembersTable, auditLogsTable } from "@workspace/db";
import { eq, and, or, sql, inArray } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";
import { dispatchCampaign } from "../lib/campaignDispatch";

const router: IRouter = Router();

function parseCampaign(c: typeof campaignsTable.$inferSelect) {
  return {
    ...c,
    estimatedCost: parseFloat(c.estimatedCost),
    actualCost: parseFloat(c.actualCost),
  };
}

// Templates
router.get("/templates", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const templates = await db.select().from(smsTemplatesTable)
    .where(user.tenantId ? eq(smsTemplatesTable.tenantId, user.tenantId) : sql`1=1`)
    .orderBy(smsTemplatesTable.createdAt);
  res.json(templates.map(t => ({ ...t, charCount: t.body.length, partCount: Math.ceil(t.body.length / 160) })));
});

router.post("/templates", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const { name, body } = req.body;
  if (!name || !body) { res.status(400).json({ error: "name and body required" }); return; }
  const [template] = await db.insert(smsTemplatesTable).values({ name, body, tenantId: user.tenantId! }).returning();
  res.status(201).json({ ...template, charCount: body.length, partCount: Math.ceil(body.length / 160) });
});

router.get("/templates/:templateId", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.templateId as string, 10);
  const [t] = await db.select().from(smsTemplatesTable).where(eq(smsTemplatesTable.id, id));
  if (!t) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...t, charCount: t.body.length, partCount: Math.ceil(t.body.length / 160) });
});

router.patch("/templates/:templateId", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.templateId as string, 10);
  const [t] = await db.update(smsTemplatesTable).set({ name: req.body.name, body: req.body.body, updatedAt: new Date() }).where(eq(smsTemplatesTable.id, id)).returning();
  if (!t) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...t, charCount: t.body.length, partCount: Math.ceil(t.body.length / 160) });
});

router.delete("/templates/:templateId", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.templateId as string, 10);
  const [t] = await db.update(smsTemplatesTable).set({ isArchived: true }).where(eq(smsTemplatesTable.id, id)).returning();
  if (!t) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ message: "Template archived" });
});

router.post("/templates/:templateId/duplicate", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const id = parseInt(req.params.templateId as string, 10);
  const [t] = await db.select().from(smsTemplatesTable).where(eq(smsTemplatesTable.id, id));
  if (!t) { res.status(404).json({ error: "Not found" }); return; }
  const [dup] = await db.insert(smsTemplatesTable).values({ name: `${t.name} (copy)`, body: t.body, tenantId: user.tenantId! }).returning();
  res.status(201).json({ ...dup, charCount: dup.body.length, partCount: Math.ceil(dup.body.length / 160) });
});

// Campaigns
router.get("/campaigns/summary", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const where = user.tenantId ? eq(campaignsTable.tenantId, user.tenantId) : sql`1=1`;
  const [agg] = await db.select({
    totalCampaigns: sql<number>`count(*)::int`,
    totalSmsSent: sql<number>`coalesce(sum(${campaignsTable.sentCount}), 0)::int`,
    totalSmsDelivered: sql<number>`coalesce(sum(${campaignsTable.deliveredCount}), 0)::int`,
    totalCost: sql<number>`coalesce(sum(${campaignsTable.actualCost}::numeric), 0)::float`,
  }).from(campaignsTable).where(where);

  const byStatus = await db
    .select({ label: campaignsTable.status, count: sql<number>`count(*)::int` })
    .from(campaignsTable).where(where).groupBy(campaignsTable.status);

  const sent = agg?.totalSmsSent ?? 0;
  const delivered = agg?.totalSmsDelivered ?? 0;
  res.json({
    totalCampaigns: agg?.totalCampaigns ?? 0,
    totalSmsSent: sent,
    totalSmsDelivered: delivered,
    deliveryRate: sent > 0 ? Math.round((delivered / sent) * 100) : 0,
    totalCost: agg?.totalCost ?? 0,
    byCampaignStatus: byStatus,
  });
});

router.get("/campaigns", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const page = parseInt(req.query.page as string ?? "1", 10);
  const limit = Math.min(parseInt(req.query.limit as string ?? "20", 10), 100);
  const offset = (page - 1) * limit;
  const status = req.query.status as string | undefined;

  const conditions = [];
  if (user.tenantId) conditions.push(eq(campaignsTable.tenantId, user.tenantId));
  if (status) conditions.push(eq(campaignsTable.status, status));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(campaignsTable).where(where ?? sql`1=1`);
  const campaigns = await db.select().from(campaignsTable).where(where ?? sql`1=1`).orderBy(campaignsTable.createdAt).limit(limit).offset(offset);

  res.json({ data: campaigns.map(parseCampaign), total, page, limit });
});

router.post("/campaigns", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const { name, senderId, body, templateId, audience, scheduledAt, sendNow } = req.body;
  if (!name || !senderId || !body) { res.status(400).json({ error: "name, senderId, body required" }); return; }

  const [campaign] = await db.insert(campaignsTable).values({
    name, senderId, body, tenantId: user.tenantId!,
    templateId: templateId ?? null,
    audienceFilter: audience ?? {},
    scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    status: sendNow ? "queued" : "draft",
  }).returning();

  db.insert(auditLogsTable).values({
    tenantId: user.tenantId ?? null,
    actorId: user.id,
    actorName: `${user.firstName} ${user.lastName}`,
    actorRole: user.role,
    action: "campaign_created",
    resourceType: "campaign",
    resourceId: String(campaign.id),
    metadata: { name: campaign.name, status: campaign.status },
  }).catch(() => {});

  res.status(201).json(parseCampaign(campaign));

  // If sendNow, kick off dispatch in the background after responding
  if (sendNow) {
    db.update(campaignsTable)
      .set({ status: "sending", sentAt: new Date(), updatedAt: new Date() })
      .where(eq(campaignsTable.id, campaign.id))
      .then(() => dispatchCampaign(campaign.id, user))
      .catch(() => {});
  }
});

router.get("/campaigns/:campaignId", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.campaignId as string, 10);
  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
  if (!campaign) { res.status(404).json({ error: "Not found" }); return; }
  res.json(parseCampaign(campaign));
});

router.patch("/campaigns/:campaignId", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.campaignId as string, 10);
  const updates: Record<string, unknown> = {};
  const allowed = ["name", "senderId", "body", "audienceFilter", "scheduledAt"];
  for (const k of allowed) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  updates.updatedAt = new Date();
  const [campaign] = await db.update(campaignsTable).set(updates).where(eq(campaignsTable.id, id)).returning();
  if (!campaign) { res.status(404).json({ error: "Not found" }); return; }
  res.json(parseCampaign(campaign));
});

router.post("/campaigns/:campaignId/pause", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.campaignId as string, 10);
  const [campaign] = await db.update(campaignsTable).set({ status: "paused" }).where(eq(campaignsTable.id, id)).returning();
  if (!campaign) { res.status(404).json({ error: "Not found" }); return; }
  res.json(parseCampaign(campaign));
});

router.post("/campaigns/:campaignId/resume", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.campaignId as string, 10);
  const [campaign] = await db.update(campaignsTable).set({ status: "sending" }).where(eq(campaignsTable.id, id)).returning();
  if (!campaign) { res.status(404).json({ error: "Not found" }); return; }
  res.json(parseCampaign(campaign));
});

router.post("/campaigns/:campaignId/preview", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const id = parseInt(req.params.campaignId as string, 10);
  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
  if (!campaign) { res.status(404).json({ error: "Not found" }); return; }
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(contactsTable)
    .where(user.tenantId ? eq(contactsTable.tenantId, user.tenantId) : sql`1=1`);
  const [wallet] = await db.select().from(walletsTable).where(user.tenantId ? eq(walletsTable.tenantId, user.tenantId) : sql`1=1`);
  const balance = parseFloat(wallet?.balance ?? "0");
  const cost = total * 1.0;
  res.json({ totalSelected: total, eligible: total, excluded: 0, estimatedCost: cost, walletBalance: balance, canAfford: balance >= cost });
});

router.post("/campaigns/:campaignId/execute", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const id = parseInt(req.params.campaignId as string, 10);

  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
  if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }
  if (!["draft", "queued", "paused"].includes(campaign.status)) {
    res.status(400).json({ error: `Cannot execute a campaign with status "${campaign.status}"` }); return;
  }

  await db.update(campaignsTable)
    .set({ status: "sending", sentAt: new Date(), updatedAt: new Date() })
    .where(eq(campaignsTable.id, id));

  res.json({ message: "Campaign dispatch started", campaignId: id });

  // Dispatch async — does not block the response
  dispatchCampaign(id, user).catch(() => {});
});

// SMS Logs
router.get("/sms-logs", requireAuth, async (req, res): Promise<void> => {
  const campaignId = req.query.campaignId ? parseInt(req.query.campaignId as string, 10) : undefined;
  const status = req.query.status as string | undefined;
  const page = parseInt(req.query.page as string ?? "1", 10);
  const limit = Math.min(parseInt(req.query.limit as string ?? "50", 10), 200);
  const offset = (page - 1) * limit;

  const conditions = [];
  if (campaignId) conditions.push(eq(smsLogsTable.campaignId, campaignId));
  if (status) conditions.push(eq(smsLogsTable.status, status));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(smsLogsTable).where(where ?? sql`1=1`);
  const logs = await db.select().from(smsLogsTable).where(where ?? sql`1=1`).orderBy(smsLogsTable.createdAt).limit(limit).offset(offset);
  res.json({ data: logs, total, page, limit });
});

export default router;
