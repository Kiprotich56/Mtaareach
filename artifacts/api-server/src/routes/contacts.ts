import { Router, type IRouter } from "express";
import { db, contactsTable, groupsTable, groupMembersTable, wardsTable, villagesTable } from "@workspace/db";
import { eq, and, or, ilike, sql, inArray } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";

const router: IRouter = Router();

router.get("/contacts/stats", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const tenantFilter = user.tenantId ? eq(contactsTable.tenantId, user.tenantId) : undefined;

  const [totals] = await db
    .select({
      total: sql<number>`count(*)::int`,
      withConsent: sql<number>`count(*) filter (where ${contactsTable.consentSms} = true)::int`,
      recentlyAdded: sql<number>`count(*) filter (where ${contactsTable.createdAt} > now() - interval '7 days')::int`,
    })
    .from(contactsTable)
    .where(tenantFilter ?? sql`1=1`);

  const byGender = await db
    .select({ label: sql<string>`coalesce(${contactsTable.gender}, 'Unknown')`, count: sql<number>`count(*)::int` })
    .from(contactsTable)
    .where(tenantFilter ?? sql`1=1`)
    .groupBy(contactsTable.gender);

  res.json({
    total: totals?.total ?? 0,
    withConsent: totals?.withConsent ?? 0,
    recentlyAdded: totals?.recentlyAdded ?? 0,
    byGender: byGender.map(r => ({ label: r.label ?? "Unknown", count: r.count })),
    byConstituency: [],
  });
});

router.get("/contacts/import", requireAuth, async (_req, res): Promise<void> => {
  res.json({ message: "Use POST /contacts/import" });
});

router.post("/contacts/import", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const { contacts } = req.body;
  if (!Array.isArray(contacts)) { res.status(400).json({ error: "contacts array required" }); return; }

  let imported = 0, skipped = 0;
  const errors: string[] = [];

  for (const c of contacts) {
    try {
      const existing = await db.select({ id: contactsTable.id }).from(contactsTable)
        .where(and(eq(contactsTable.phone, c.phone), eq(contactsTable.tenantId, user.tenantId!)));
      if (existing.length > 0) { skipped++; continue; }
      await db.insert(contactsTable).values({ ...c, tenantId: user.tenantId!, tags: c.tags ?? [] });
      imported++;
    } catch (e) {
      errors.push(`Failed for ${c.phone}: ${(e as Error).message}`);
    }
  }

  res.json({ imported, skipped, errors });
});

router.get("/contacts", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const page = parseInt(req.query.page as string ?? "1", 10);
  const limit = Math.min(parseInt(req.query.limit as string ?? "50", 10), 200);
  const offset = (page - 1) * limit;
  const search = req.query.search as string | undefined;
  const wardId = req.query.wardId ? parseInt(req.query.wardId as string, 10) : undefined;
  const villageId = req.query.villageId ? parseInt(req.query.villageId as string, 10) : undefined;
  const consentSms = req.query.consentSms !== undefined ? req.query.consentSms === "true" : undefined;

  const conditions = [];
  if (user.tenantId) conditions.push(eq(contactsTable.tenantId, user.tenantId));
  if (search) conditions.push(or(
    ilike(contactsTable.firstName, `%${search}%`),
    ilike(contactsTable.lastName, `%${search}%`),
    ilike(contactsTable.phone, `%${search}%`)
  ));
  if (wardId) conditions.push(eq(contactsTable.wardId, wardId));
  if (villageId) conditions.push(eq(contactsTable.villageId, villageId));
  if (consentSms !== undefined) conditions.push(eq(contactsTable.consentSms, consentSms));

  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(contactsTable).where(where ?? sql`1=1`);
  const contacts = await db.select().from(contactsTable).where(where ?? sql`1=1`).orderBy(contactsTable.createdAt).limit(limit).offset(offset);

  res.json({ data: contacts, total, page, limit });
});

router.post("/contacts", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const { phone } = req.body;

  const [existing] = await db.select().from(contactsTable)
    .where(and(eq(contactsTable.phone, phone), eq(contactsTable.tenantId, user.tenantId!)));
  if (existing) {
    res.status(409).json({ error: "Contact with this phone already exists", existing });
    return;
  }

  const [contact] = await db.insert(contactsTable).values({
    ...req.body,
    tenantId: user.tenantId!,
    tags: req.body.tags ?? [],
  }).returning();
  res.status(201).json(contact);
});

router.get("/contacts/:contactId", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.contactId as string, 10);
  const [contact] = await db.select().from(contactsTable).where(eq(contactsTable.id, id));
  if (!contact) { res.status(404).json({ error: "Contact not found" }); return; }
  res.json(contact);
});

router.patch("/contacts/:contactId", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.contactId as string, 10);
  const updates = { ...req.body, updatedAt: new Date() };
  const [contact] = await db.update(contactsTable).set(updates).where(eq(contactsTable.id, id)).returning();
  if (!contact) { res.status(404).json({ error: "Contact not found" }); return; }
  res.json(contact);
});

router.delete("/contacts/:contactId", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.contactId as string, 10);
  const [contact] = await db.delete(contactsTable).where(eq(contactsTable.id, id)).returning();
  if (!contact) { res.status(404).json({ error: "Contact not found" }); return; }
  res.json({ message: "Contact deleted" });
});

router.post("/contacts/:contactId/opt-out", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.contactId as string, 10);
  const [contact] = await db.update(contactsTable)
    .set({ consentSms: false, updatedAt: new Date() })
    .where(eq(contactsTable.id, id))
    .returning();
  if (!contact) { res.status(404).json({ error: "Contact not found" }); return; }
  res.json(contact);
});

// Groups
router.get("/groups", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const groups = await db.select().from(groupsTable)
    .where(user.tenantId ? eq(groupsTable.tenantId, user.tenantId) : sql`1=1`)
    .orderBy(groupsTable.createdAt);

  const memberCounts = await db
    .select({ groupId: groupMembersTable.groupId, count: sql<number>`count(*)::int` })
    .from(groupMembersTable)
    .groupBy(groupMembersTable.groupId);
  const cMap = new Map(memberCounts.map(m => [m.groupId, m.count]));

  res.json(groups.map(g => ({ ...g, memberCount: cMap.get(g.id) ?? 0 })));
});

router.post("/groups", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const { name, description } = req.body;
  if (!name) { res.status(400).json({ error: "name required" }); return; }
  const [group] = await db.insert(groupsTable).values({ name, description, tenantId: user.tenantId! }).returning();
  res.status(201).json({ ...group, memberCount: 0 });
});

router.get("/groups/:groupId", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.groupId as string, 10);
  const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, id));
  if (!group) { res.status(404).json({ error: "Group not found" }); return; }
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(groupMembersTable).where(eq(groupMembersTable.groupId, id));
  res.json({ ...group, memberCount: count });
});

router.patch("/groups/:groupId", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.groupId as string, 10);
  const [group] = await db.update(groupsTable).set({ name: req.body.name, description: req.body.description }).where(eq(groupsTable.id, id)).returning();
  if (!group) { res.status(404).json({ error: "Not found" }); return; }
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(groupMembersTable).where(eq(groupMembersTable.groupId, id));
  res.json({ ...group, memberCount: count });
});

router.delete("/groups/:groupId", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.groupId as string, 10);
  await db.delete(groupMembersTable).where(eq(groupMembersTable.groupId, id));
  const [group] = await db.delete(groupsTable).where(eq(groupsTable.id, id)).returning();
  if (!group) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ message: "Group deleted" });
});

router.post("/groups/:groupId/members", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.groupId as string, 10);
  const { contactIds } = req.body;
  for (const cid of contactIds) {
    const existing = await db.select().from(groupMembersTable).where(and(eq(groupMembersTable.groupId, id), eq(groupMembersTable.contactId, cid)));
    if (!existing.length) {
      await db.insert(groupMembersTable).values({ groupId: id, contactId: cid });
    }
  }
  res.json({ message: "Members added" });
});

router.delete("/groups/:groupId/members", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.groupId as string, 10);
  const { contactIds } = req.body;
  if (contactIds?.length) {
    await db.delete(groupMembersTable).where(and(eq(groupMembersTable.groupId, id), inArray(groupMembersTable.contactId, contactIds)));
  }
  res.json({ message: "Members removed" });
});

export default router;
