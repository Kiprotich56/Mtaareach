import { Router, type IRouter } from "express";
import { db, tenantsTable, tenantSettingsTable, walletsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";

const router: IRouter = Router();

router.get("/tenants", requireAuth, async (req, res): Promise<void> => {
  const tenants = await db.select().from(tenantsTable).orderBy(tenantsTable.createdAt);
  const wallets = await db.select().from(walletsTable);
  const walletMap = new Map(wallets.map(w => [w.tenantId, w]));

  res.json(tenants.map(t => ({
    ...t,
    walletBalance: parseFloat(walletMap.get(t.id)?.balance ?? "0"),
    smsRatePerMessage: parseFloat(t.smsRatePerMessage),
  })));
});

router.post("/tenants", requireAuth, async (req, res): Promise<void> => {
  const { name, slug, timezone = "Africa/Nairobi", smsRatePerMessage = 1.0 } = req.body;
  if (!name || !slug) {
    res.status(400).json({ error: "name and slug are required" });
    return;
  }

  const [tenant] = await db.insert(tenantsTable).values({ name, slug, timezone, smsRatePerMessage: String(smsRatePerMessage) }).returning();
  await db.insert(walletsTable).values({ tenantId: tenant.id, balance: "0.00", currency: "KES" });
  await db.insert(tenantSettingsTable).values({ tenantId: tenant.id, timezone, smsRatePerMessage: String(smsRatePerMessage) });

  res.status(201).json({ ...tenant, walletBalance: 0, smsRatePerMessage });
});

router.get("/tenants/:tenantId", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.tenantId as string, 10);
  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, id));
  if (!tenant) { res.status(404).json({ error: "Tenant not found" }); return; }
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.tenantId, id));
  res.json({ ...tenant, walletBalance: parseFloat(wallet?.balance ?? "0"), smsRatePerMessage: parseFloat(tenant.smsRatePerMessage) });
});

router.patch("/tenants/:tenantId", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.tenantId as string, 10);
  const updates: Record<string, unknown> = {};
  const allowed = ["name", "status", "timezone", "smsRatePerMessage", "defaultSenderId", "primaryColor"];
  for (const k of allowed) {
    if (req.body[k] !== undefined) updates[k] = k === "smsRatePerMessage" ? String(req.body[k]) : req.body[k];
  }
  const [tenant] = await db.update(tenantsTable).set(updates).where(eq(tenantsTable.id, id)).returning();
  if (!tenant) { res.status(404).json({ error: "Tenant not found" }); return; }
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.tenantId, id));
  res.json({ ...tenant, walletBalance: parseFloat(wallet?.balance ?? "0"), smsRatePerMessage: parseFloat(tenant.smsRatePerMessage) });
});

router.post("/tenants/:tenantId/activate", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.tenantId as string, 10);
  const [tenant] = await db.update(tenantsTable).set({ status: "active" }).where(eq(tenantsTable.id, id)).returning();
  if (!tenant) { res.status(404).json({ error: "Not found" }); return; }
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.tenantId, id));
  res.json({ ...tenant, walletBalance: parseFloat(wallet?.balance ?? "0"), smsRatePerMessage: parseFloat(tenant.smsRatePerMessage) });
});

router.post("/tenants/:tenantId/deactivate", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.tenantId as string, 10);
  const [tenant] = await db.update(tenantsTable).set({ status: "inactive" }).where(eq(tenantsTable.id, id)).returning();
  if (!tenant) { res.status(404).json({ error: "Not found" }); return; }
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.tenantId, id));
  res.json({ ...tenant, walletBalance: parseFloat(wallet?.balance ?? "0"), smsRatePerMessage: parseFloat(tenant.smsRatePerMessage) });
});

router.get("/settings", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  if (!user.tenantId) { res.status(400).json({ error: "No tenant" }); return; }
  const [settings] = await db.select().from(tenantSettingsTable).where(eq(tenantSettingsTable.tenantId, user.tenantId));
  if (!settings) { res.status(404).json({ error: "Settings not found" }); return; }
  res.json({ ...settings, smsRatePerMessage: parseFloat(settings.smsRatePerMessage) });
});

router.patch("/settings", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  if (!user.tenantId) { res.status(400).json({ error: "No tenant" }); return; }
  const updates: Record<string, unknown> = {};
  const allowed = ["defaultSenderId", "timezone", "allowFieldAgentVillageSubmission", "requireConsentForSms"];
  for (const k of allowed) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  updates.updatedAt = new Date();
  const [settings] = await db.update(tenantSettingsTable).set(updates).where(eq(tenantSettingsTable.tenantId, user.tenantId)).returning();
  res.json({ ...settings, smsRatePerMessage: parseFloat(settings.smsRatePerMessage) });
});

export default router;
