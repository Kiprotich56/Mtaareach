import { Router, type IRouter } from "express";
import { db, smsGatewaysTable, senderIdsTable, auditLogsTable, tenantsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";

const router: IRouter = Router();

// SMS Gateways
router.get("/sms-gateways", requireAuth, async (_req, res): Promise<void> => {
  const gateways = await db.select().from(smsGatewaysTable).orderBy(smsGatewaysTable.createdAt);
  res.json(gateways.map(g => ({ ...g, deliveryRate: parseFloat(g.deliveryRate) })));
});

router.post("/sms-gateways", requireAuth, async (req, res): Promise<void> => {
  const { name, provider, apiEndpoint, apiKey, isPrimary } = req.body;
  if (!name || !provider) { res.status(400).json({ error: "name and provider required" }); return; }
  const [gateway] = await db.insert(smsGatewaysTable).values({ name, provider, apiEndpoint, apiKey, isPrimary: !!isPrimary }).returning();
  res.status(201).json({ ...gateway, deliveryRate: parseFloat(gateway.deliveryRate) });
});

router.patch("/sms-gateways/:gatewayId", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.gatewayId as string, 10);
  const updates: Record<string, unknown> = {};
  for (const k of ["name", "apiEndpoint", "apiKey", "isActive", "isPrimary"]) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  const [gateway] = await db.update(smsGatewaysTable).set(updates).where(eq(smsGatewaysTable.id, id)).returning();
  if (!gateway) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...gateway, deliveryRate: parseFloat(gateway.deliveryRate) });
});

// Sender IDs
router.get("/sender-ids", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const status = req.query.status as string | undefined;

  let q = db.select({
    id: senderIdsTable.id,
    name: senderIdsTable.name,
    status: senderIdsTable.status,
    tenantId: senderIdsTable.tenantId,
    tenantName: tenantsTable.name,
    rejectionReason: senderIdsTable.rejectionReason,
    isDefault: senderIdsTable.isDefault,
    createdAt: senderIdsTable.createdAt,
  }).from(senderIdsTable)
    .innerJoin(tenantsTable, eq(senderIdsTable.tenantId, tenantsTable.id))
    .$dynamic();

  const conditions = [];
  if (user.role !== "super_admin" && user.tenantId) conditions.push(eq(senderIdsTable.tenantId, user.tenantId));
  if (status) conditions.push(eq(senderIdsTable.status, status));
  if (conditions.length) q = q.where(and(...conditions));

  res.json(await q.orderBy(senderIdsTable.createdAt));
});

router.post("/sender-ids", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const { name } = req.body;
  if (!name) { res.status(400).json({ error: "name required" }); return; }
  const [sid] = await db.insert(senderIdsTable).values({ name, tenantId: user.tenantId! }).returning();
  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, user.tenantId!));
  res.status(201).json({ ...sid, tenantName: tenant?.name ?? "" });
});

router.post("/sender-ids/:senderIdId/approve", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.senderIdId as string, 10);
  const [sid] = await db.update(senderIdsTable).set({ status: "approved" }).where(eq(senderIdsTable.id, id)).returning();
  if (!sid) { res.status(404).json({ error: "Not found" }); return; }
  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, sid.tenantId));
  res.json({ ...sid, tenantName: tenant?.name ?? "" });
});

router.post("/sender-ids/:senderIdId/reject", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.senderIdId as string, 10);
  const { reason } = req.body;
  const [sid] = await db.update(senderIdsTable).set({ status: "rejected", rejectionReason: reason }).where(eq(senderIdsTable.id, id)).returning();
  if (!sid) { res.status(404).json({ error: "Not found" }); return; }
  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, sid.tenantId));
  res.json({ ...sid, tenantName: tenant?.name ?? "" });
});

// Audit logs
router.get("/audit-logs", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const page = parseInt(req.query.page as string ?? "1", 10);
  const limit = Math.min(parseInt(req.query.limit as string ?? "50", 10), 200);
  const offset = (page - 1) * limit;

  const where = user.role !== "super_admin" && user.tenantId
    ? eq(auditLogsTable.tenantId, user.tenantId)
    : sql`1=1`;

  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(auditLogsTable).where(where);
  const logs = await db.select().from(auditLogsTable).where(where).orderBy(auditLogsTable.createdAt).limit(limit).offset(offset);
  res.json({ data: logs, total, page, limit });
});

export default router;
