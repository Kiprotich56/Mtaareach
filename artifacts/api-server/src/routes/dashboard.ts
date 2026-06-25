import { Router, type IRouter } from "express";
import { db, contactsTable, campaignsTable, walletsTable, tenantsTable, smsGatewaysTable, auditLogsTable, villagesTable, wardsTable, constituenciesTable, countiesTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";

const router: IRouter = Router();

router.get("/dashboard/stats", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const tenantFilter = user.tenantId ? eq(contactsTable.tenantId, user.tenantId) : sql`1=1`;
  const campaignFilter = user.tenantId ? eq(campaignsTable.tenantId, user.tenantId) : sql`1=1`;

  const [contacts] = await db.select({
    total: sql<number>`count(*)::int`,
    withConsent: sql<number>`count(*) filter (where ${contactsTable.consentSms} = true)::int`,
    newThisWeek: sql<number>`count(*) filter (where ${contactsTable.createdAt} > now() - interval '7 days')::int`,
  }).from(contactsTable).where(tenantFilter);

  const [campaigns] = await db.select({
    active: sql<number>`count(*) filter (where ${campaignsTable.status} in ('sending', 'queued'))::int`,
    thisMonth: sql<number>`count(*) filter (where ${campaignsTable.createdAt} > now() - interval '30 days')::int`,
    totalSent: sql<number>`coalesce(sum(${campaignsTable.sentCount}), 0)::int`,
    totalDelivered: sql<number>`coalesce(sum(${campaignsTable.deliveredCount}), 0)::int`,
  }).from(campaignsTable).where(campaignFilter);

  let walletBalance = 0;
  if (user.tenantId) {
    const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.tenantId, user.tenantId));
    walletBalance = parseFloat(wallet?.balance ?? "0");
  }

  const sent = campaigns?.totalSent ?? 0;
  const delivered = campaigns?.totalDelivered ?? 0;

  res.json({
    totalContacts: contacts?.total ?? 0,
    contactsWithConsent: contacts?.withConsent ?? 0,
    activeCampaigns: campaigns?.active ?? 0,
    totalSmsSent: sent,
    walletBalance,
    newContactsThisWeek: contacts?.newThisWeek ?? 0,
    campaignsThisMonth: campaigns?.thisMonth ?? 0,
    deliveryRate: sent > 0 ? Math.round((delivered / sent) * 100) : 0,
  });
});

router.get("/dashboard/super-admin", requireAuth, async (_req, res): Promise<void> => {
  const [tenantStats] = await db.select({
    total: sql<number>`count(*)::int`,
    active: sql<number>`count(*) filter (where ${tenantsTable.status} = 'active')::int`,
  }).from(tenantsTable);

  const [contactStats] = await db.select({ total: sql<number>`count(*)::int` }).from(contactsTable);
  const [campaignStats] = await db.select({
    today: sql<number>`coalesce(sum(${campaignsTable.sentCount}) filter (where ${campaignsTable.sentAt} > now() - interval '1 day'), 0)::int`,
    month: sql<number>`coalesce(sum(${campaignsTable.sentCount}) filter (where ${campaignsTable.sentAt} > now() - interval '30 days'), 0)::int`,
  }).from(campaignsTable);

  const tenants = await db.select().from(tenantsTable).limit(5);
  const wallets = await db.select().from(walletsTable);
  const wMap = new Map(wallets.map(w => [w.tenantId, parseFloat(w.balance)]));

  const topTenants = await db
    .select({
      tenantId: contactsTable.tenantId,
      contactCount: sql<number>`count(*)::int`,
    })
    .from(contactsTable)
    .groupBy(contactsTable.tenantId)
    .orderBy(desc(sql`count(*)`))
    .limit(5);

  const tMap = new Map(tenants.map(t => [t.id, t.name]));

  const gateways = await db.select().from(smsGatewaysTable);

  res.json({
    totalTenants: tenantStats?.total ?? 0,
    activeTenants: tenantStats?.active ?? 0,
    totalContacts: contactStats?.total ?? 0,
    totalSmsSentToday: campaignStats?.today ?? 0,
    totalSmsThisMonth: campaignStats?.month ?? 0,
    topTenants: topTenants.map(t => ({
      tenantId: t.tenantId,
      tenantName: tMap.get(t.tenantId) ?? "Unknown",
      contactCount: t.contactCount,
      smsSent: 0,
      walletBalance: wMap.get(t.tenantId) ?? 0,
    })),
    gatewayStatus: gateways.map(g => ({
      gatewayId: g.id,
      gatewayName: g.name,
      status: g.isActive ? "active" : "inactive",
      sentToday: 0,
      deliveryRate: parseFloat(g.deliveryRate),
    })),
  });
});

router.get("/dashboard/geographic-summary", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const tenantFilter = user.tenantId ? eq(contactsTable.tenantId, user.tenantId) : sql`1=1`;

  const byCounty = await db
    .select({ label: countiesTable.name, count: sql<number>`count(*)::int` })
    .from(contactsTable)
    .innerJoin(countiesTable, eq(contactsTable.countyId, countiesTable.id))
    .where(tenantFilter)
    .groupBy(countiesTable.name)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  const byConstituency = await db
    .select({ label: constituenciesTable.name, count: sql<number>`count(*)::int` })
    .from(contactsTable)
    .innerJoin(constituenciesTable, eq(contactsTable.constituencyId, constituenciesTable.id))
    .where(tenantFilter)
    .groupBy(constituenciesTable.name)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  const byWard = await db
    .select({ label: wardsTable.name, count: sql<number>`count(*)::int` })
    .from(contactsTable)
    .innerJoin(wardsTable, eq(contactsTable.wardId, wardsTable.id))
    .where(tenantFilter)
    .groupBy(wardsTable.name)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  res.json({ byCounty, byConstituency, byWard });
});

router.get("/dashboard/recent-activity", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const tenantFilter = user.tenantId ? eq(auditLogsTable.tenantId, user.tenantId) : sql`1=1`;
  const logs = await db.select().from(auditLogsTable).where(tenantFilter).orderBy(desc(auditLogsTable.createdAt)).limit(20);
  res.json(logs.map(l => ({
    id: l.id,
    type: "audit",
    description: l.action,
    actorName: l.actorName,
    createdAt: l.createdAt,
  })));
});

// Reports
router.get("/reports/contacts", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const tenantFilter = user.tenantId ? eq(contactsTable.tenantId, user.tenantId) : sql`1=1`;

  const [totals] = await db.select({
    total: sql<number>`count(*)::int`,
    withConsent: sql<number>`count(*) filter (where ${contactsTable.consentSms} = true)::int`,
    withoutConsent: sql<number>`count(*) filter (where ${contactsTable.consentSms} = false)::int`,
  }).from(contactsTable).where(tenantFilter);

  const byGender = await db
    .select({ label: sql<string>`coalesce(${contactsTable.gender}, 'Unknown')`, count: sql<number>`count(*)::int` })
    .from(contactsTable).where(tenantFilter).groupBy(contactsTable.gender);

  const byAgeGroup = await db
    .select({ label: sql<string>`coalesce(${contactsTable.ageGroup}, 'Unknown')`, count: sql<number>`count(*)::int` })
    .from(contactsTable).where(tenantFilter).groupBy(contactsTable.ageGroup);

  const byConstituency = await db
    .select({ label: constituenciesTable.name, count: sql<number>`count(*)::int` })
    .from(contactsTable)
    .innerJoin(constituenciesTable, eq(contactsTable.constituencyId, constituenciesTable.id))
    .where(tenantFilter)
    .groupBy(constituenciesTable.name)
    .orderBy(desc(sql`count(*)`))
    .limit(20);

  res.json({
    totalContacts: totals?.total ?? 0,
    withConsent: totals?.withConsent ?? 0,
    withoutConsent: totals?.withoutConsent ?? 0,
    byGender: byGender.map(r => ({ label: r.label ?? "Unknown", count: r.count })),
    byAgeGroup: byAgeGroup.map(r => ({ label: r.label ?? "Unknown", count: r.count })),
    byConstituency,
  });
});

router.get("/reports/campaigns", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const campaignFilter = user.tenantId ? eq(campaignsTable.tenantId, user.tenantId) : sql`1=1`;

  const [agg] = await db.select({
    totalCampaigns: sql<number>`count(*)::int`,
    totalSmsSent: sql<number>`coalesce(sum(${campaignsTable.sentCount}), 0)::int`,
    totalDelivered: sql<number>`coalesce(sum(${campaignsTable.deliveredCount}), 0)::int`,
    totalFailed: sql<number>`coalesce(sum(${campaignsTable.failedCount}), 0)::int`,
  }).from(campaignsTable).where(campaignFilter);

  const topCampaigns = await db.select().from(campaignsTable).where(campaignFilter)
    .orderBy(desc(campaignsTable.sentCount)).limit(5);

  const sent = agg?.totalSmsSent ?? 0;
  const delivered = agg?.totalDelivered ?? 0;

  res.json({
    totalCampaigns: agg?.totalCampaigns ?? 0,
    totalSmsSent: sent,
    totalDelivered: delivered,
    totalFailed: agg?.totalFailed ?? 0,
    deliveryRate: sent > 0 ? Math.round((delivered / sent) * 100) : 0,
    byMonth: [],
    topCampaigns: topCampaigns.map(c => ({
      ...c,
      estimatedCost: parseFloat(c.estimatedCost),
      actualCost: parseFloat(c.actualCost),
    })),
  });
});

export default router;
