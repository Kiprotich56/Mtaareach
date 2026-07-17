import { Router, type IRouter } from "express";
import { db, countiesTable, constituenciesTable, wardsTable, villagesTable, pollingStationsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";

const router: IRouter = Router();

router.get("/geography/counties", requireAuth, async (_req, res): Promise<void> => {
  const counties = await db.select().from(countiesTable).orderBy(countiesTable.name);
  const constituencyCounts = await db
    .select({ countyId: constituenciesTable.countyId, count: sql<number>`count(*)::int` })
    .from(constituenciesTable)
    .groupBy(constituenciesTable.countyId);
  const countMap = new Map(constituencyCounts.map(c => [c.countyId, c.count]));
  res.json(counties.map(c => ({ ...c, constituencyCount: countMap.get(c.id) ?? 0 })));
});

router.get("/geography/constituencies", requireAuth, async (req, res): Promise<void> => {
  const countyId = req.query.countyId ? parseInt(req.query.countyId as string, 10) : undefined;
  let query = db
    .select({
      id: constituenciesTable.id,
      name: constituenciesTable.name,
      countyId: constituenciesTable.countyId,
      countyName: countiesTable.name,
      createdAt: constituenciesTable.createdAt,
    })
    .from(constituenciesTable)
    .innerJoin(countiesTable, eq(constituenciesTable.countyId, countiesTable.id))
    .$dynamic();
  if (countyId) query = query.where(eq(constituenciesTable.countyId, countyId));
  const constituencies = await query.orderBy(constituenciesTable.name);
  const wardCounts = await db
    .select({ constituencyId: wardsTable.constituencyId, count: sql<number>`count(*)::int` })
    .from(wardsTable)
    .groupBy(wardsTable.constituencyId);
  const wMap = new Map(wardCounts.map(w => [w.constituencyId, w.count]));
  res.json(constituencies.map(c => ({ ...c, wardCount: wMap.get(c.id) ?? 0 })));
});

router.get("/geography/wards", requireAuth, async (req, res): Promise<void> => {
  const constituencyId = req.query.constituencyId ? parseInt(req.query.constituencyId as string, 10) : undefined;
  let query = db
    .select({
      id: wardsTable.id,
      name: wardsTable.name,
      constituencyId: wardsTable.constituencyId,
      constituencyName: constituenciesTable.name,
      countyName: countiesTable.name,
      createdAt: wardsTable.createdAt,
    })
    .from(wardsTable)
    .innerJoin(constituenciesTable, eq(wardsTable.constituencyId, constituenciesTable.id))
    .innerJoin(countiesTable, eq(constituenciesTable.countyId, countiesTable.id))
    .$dynamic();
  if (constituencyId) query = query.where(eq(wardsTable.constituencyId, constituencyId));
  const wards = await query.orderBy(wardsTable.name);
  res.json(wards);
});

router.get("/geography/villages", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const wardId = req.query.wardId ? parseInt(req.query.wardId as string, 10) : undefined;
  const status = req.query.status as string | undefined;

  let q = db
    .select({
      id: villagesTable.id,
      name: villagesTable.name,
      wardId: villagesTable.wardId,
      wardName: wardsTable.name,
      tenantId: villagesTable.tenantId,
      status: villagesTable.status,
      gpsCoordinates: villagesTable.gpsCoordinates,
      population: villagesTable.population,
      rejectionReason: villagesTable.rejectionReason,
      createdAt: villagesTable.createdAt,
    })
    .from(villagesTable)
    .innerJoin(wardsTable, eq(villagesTable.wardId, wardsTable.id))
    .$dynamic();

  const conditions = [];
  if (user.tenantId) conditions.push(eq(villagesTable.tenantId, user.tenantId));
  if (wardId) conditions.push(eq(villagesTable.wardId, wardId));
  if (status) conditions.push(eq(villagesTable.status, status));
  if (conditions.length) q = q.where(and(...conditions));

  const villages = await q.orderBy(villagesTable.name);
  res.json(villages);
});

router.post("/geography/villages", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const { name, wardId, gpsCoordinates, population } = req.body;
  if (!name || !wardId) { res.status(400).json({ error: "name and wardId required" }); return; }
  const [village] = await db.insert(villagesTable).values({
    name, wardId, tenantId: user.tenantId!, status: "pending", gpsCoordinates, population,
  }).returning();
  const [ward] = await db.select().from(wardsTable).where(eq(wardsTable.id, wardId));
  res.status(201).json({ ...village, wardName: ward?.name ?? "" });
});

router.get("/geography/villages/:villageId", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.villageId as string, 10);
  const [village] = await db
    .select({ id: villagesTable.id, name: villagesTable.name, wardId: villagesTable.wardId, wardName: wardsTable.name, status: villagesTable.status, gpsCoordinates: villagesTable.gpsCoordinates, population: villagesTable.population, rejectionReason: villagesTable.rejectionReason, createdAt: villagesTable.createdAt })
    .from(villagesTable)
    .innerJoin(wardsTable, eq(villagesTable.wardId, wardsTable.id))
    .where(eq(villagesTable.id, id));
  if (!village) { res.status(404).json({ error: "Village not found" }); return; }
  res.json(village);
});

router.patch("/geography/villages/:villageId", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.villageId as string, 10);
  const updates: Record<string, unknown> = {};
  for (const k of ["name", "gpsCoordinates", "population"]) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  const [village] = await db.update(villagesTable).set(updates).where(eq(villagesTable.id, id)).returning();
  if (!village) { res.status(404).json({ error: "Not found" }); return; }
  const [ward] = await db.select().from(wardsTable).where(eq(wardsTable.id, village.wardId));
  res.json({ ...village, wardName: ward?.name ?? "" });
});

router.post("/geography/villages/:villageId/approve", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.villageId as string, 10);
  const [village] = await db.update(villagesTable).set({ status: "active" }).where(eq(villagesTable.id, id)).returning();
  if (!village) { res.status(404).json({ error: "Not found" }); return; }
  const [ward] = await db.select().from(wardsTable).where(eq(wardsTable.id, village.wardId));
  res.json({ ...village, wardName: ward?.name ?? "" });
});

router.post("/geography/villages/:villageId/reject", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.villageId as string, 10);
  const { reason } = req.body;
  const [village] = await db.update(villagesTable).set({ status: "rejected", rejectionReason: reason }).where(eq(villagesTable.id, id)).returning();
  if (!village) { res.status(404).json({ error: "Not found" }); return; }
  const [ward] = await db.select().from(wardsTable).where(eq(wardsTable.id, village.wardId));
  res.json({ ...village, wardName: ward?.name ?? "" });
});

router.get("/geography/polling-stations", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const wardId = req.query.wardId ? parseInt(req.query.wardId as string, 10) : undefined;
  const villageId = req.query.villageId ? parseInt(req.query.villageId as string, 10) : undefined;

  let q = db
    .select({ id: pollingStationsTable.id, name: pollingStationsTable.name, code: pollingStationsTable.code, wardId: pollingStationsTable.wardId, wardName: wardsTable.name, villageId: pollingStationsTable.villageId, registeredVoters: pollingStationsTable.registeredVoters, createdAt: pollingStationsTable.createdAt })
    .from(pollingStationsTable)
    .innerJoin(wardsTable, eq(pollingStationsTable.wardId, wardsTable.id))
    .$dynamic();

  const conditions = [];
  if (user.tenantId) conditions.push(eq(pollingStationsTable.tenantId, user.tenantId));
  if (wardId) conditions.push(eq(pollingStationsTable.wardId, wardId));
  if (villageId) conditions.push(eq(pollingStationsTable.villageId, villageId));
  if (conditions.length) q = q.where(and(...conditions));

  res.json(await q.orderBy(pollingStationsTable.name));
});

router.post("/geography/polling-stations", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const { name, code, wardId, villageId, registeredVoters } = req.body;
  if (!name || !code || !wardId) { res.status(400).json({ error: "name, code, wardId required" }); return; }
  const [station] = await db.insert(pollingStationsTable).values({ name, code, wardId, villageId, registeredVoters, tenantId: user.tenantId! }).returning();
  const [ward] = await db.select().from(wardsTable).where(eq(wardsTable.id, wardId));
  res.status(201).json({ ...station, wardName: ward?.name ?? "" });
});

router.patch("/geography/polling-stations/:stationId", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.stationId as string, 10);
  const updates: Record<string, unknown> = {};
  for (const k of ["name", "code", "villageId", "registeredVoters"]) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  const [station] = await db.update(pollingStationsTable).set(updates).where(eq(pollingStationsTable.id, id)).returning();
  if (!station) { res.status(404).json({ error: "Not found" }); return; }
  const [ward] = await db.select().from(wardsTable).where(eq(wardsTable.id, station.wardId));
  res.json({ ...station, wardName: ward?.name ?? "" });
});

export default router;
