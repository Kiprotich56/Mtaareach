import { db, tenantsTable, walletsTable, tenantSettingsTable, usersTable, contactsTable, smsGatewaysTable, senderIdsTable, smsTemplatesTable, campaignsTable, auditLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding database...");

  // Tenant
  const existing = await db.select().from(tenantsTable).where(eq(tenantsTable.slug, "demo-outreach"));
  let tenantId: number;
  if (existing.length > 0) {
    tenantId = existing[0].id;
    console.log("Tenant already exists, id:", tenantId);
  } else {
    const [tenant] = await db.insert(tenantsTable).values({
      name: "Demo Outreach", slug: "demo-outreach", status: "active", timezone: "Africa/Nairobi", smsRatePerMessage: "1.00",
    }).returning();
    tenantId = tenant.id;
    console.log("Created tenant:", tenantId);
  }

  // Wallet
  await db.insert(walletsTable).values({ tenantId, balance: "15000.00", currency: "KES" }).onConflictDoUpdate({ target: walletsTable.tenantId, set: { balance: "15000.00" } });

  // Settings
  const existingSettings = await db.select().from(tenantSettingsTable).where(eq(tenantSettingsTable.tenantId, tenantId));
  if (existingSettings.length === 0) {
    await db.insert(tenantSettingsTable).values({ tenantId, timezone: "Africa/Nairobi", smsRatePerMessage: "1.00" });
  }

  // Users
  const users = [
    { email: "superadmin@mtaareach.com", firstName: "Super", lastName: "Admin", role: "super_admin", password: "admin123", tenantId: null },
    { email: "admin@demo-outreach.com", firstName: "John", lastName: "Kariuki", role: "tenant_admin", password: "admin123", tenantId },
    { email: "county@demo-outreach.com", firstName: "Grace", lastName: "Korir", role: "county_coordinator", password: "coord123", tenantId, assignedCountyId: 1 },
    { email: "ward@demo-outreach.com", firstName: "Peter", lastName: "Cheruiyot", role: "ward_coordinator", password: "coord123", tenantId, assignedWardId: 1 },
    { email: "agent@demo-outreach.com", firstName: "Mary", lastName: "Chepkemoi", role: "field_agent", password: "agent123", tenantId, assignedWardId: 1 },
  ];

  for (const u of users) {
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, u.email));
    if (existing.length === 0) {
      const passwordHash = await bcrypt.hash(u.password, 10);
      await db.insert(usersTable).values({
        email: u.email, firstName: u.firstName, lastName: u.lastName, role: u.role, passwordHash,
        tenantId: u.tenantId ?? null, isActive: true,
        assignedCountyId: (u as {assignedCountyId?: number}).assignedCountyId ?? null,
        assignedWardId: (u as {assignedWardId?: number}).assignedWardId ?? null,
      });
      console.log("Created user:", u.email);
    } else {
      console.log("User exists:", u.email);
    }
  }

  // SMS Gateway
  const gateways = await db.select().from(smsGatewaysTable);
  if (gateways.length === 0) {
    await db.insert(smsGatewaysTable).values([
      { name: "Africa's Talking", provider: "africastalking", isActive: true, isPrimary: true, deliveryRate: "94.50", totalSent: 12847 },
      { name: "Twilio Backup", provider: "twilio", isActive: true, isPrimary: false, deliveryRate: "91.20", totalSent: 3201 },
    ]);
    console.log("Created SMS gateways");
  }

  // Sender IDs
  const sids = await db.select().from(senderIdsTable).where(eq(senderIdsTable.tenantId, tenantId));
  if (sids.length === 0) {
    await db.insert(senderIdsTable).values([
      { name: "MTAAREACH", tenantId, status: "approved", isDefault: true },
      { name: "DEMOREACH", tenantId, status: "approved", isDefault: false },
    ]);
    console.log("Created sender IDs");
  }

  // SMS Templates
  const templates = await db.select().from(smsTemplatesTable).where(eq(smsTemplatesTable.tenantId, tenantId));
  if (templates.length === 0) {
    await db.insert(smsTemplatesTable).values([
      { name: "Welcome Message", body: "Habari {first_name}! Karibu sana kwenye kampuni yetu. Tuna furaha kukuwa nawe.", tenantId },
      { name: "Meeting Reminder", body: "Mkutano muhimu utafanyika {date} saa {time} eneo la {venue}. Tafadhali hakikisha unakuwepo.", tenantId },
      { name: "Get Out and Vote", body: "Kura yako ni nguvu yako! Kumbuka kupiga kura tarehe {date}. Vituo vya kupigia kura vitafunguliwa saa 1 hadi saa 12.", tenantId },
      { name: "Community Update", body: "Habari za jamii: {message}. Kwa maelezo zaidi wasiliana na ofisi yetu.", tenantId },
    ]);
    console.log("Created templates");
  }

  // Sample contacts
  const contacts = await db.select().from(contactsTable).where(eq(contactsTable.tenantId, tenantId));
  if (contacts.length === 0) {
    const sampleContacts = [
      { firstName: "James", lastName: "Ruto", phone: "+254712345601", gender: "male", ageGroup: "31-40", occupation: "Farmer", countyId: 1, constituencyId: 1, wardId: 1, consentSms: true, consentSource: "field", tags: ["farmer", "voter"], tenantId },
      { firstName: "Sarah", lastName: "Chepkirui", phone: "+254712345602", gender: "female", ageGroup: "25-30", occupation: "Teacher", countyId: 1, constituencyId: 2, wardId: 4, consentSms: true, consentSource: "event", tags: ["teacher", "youth"], tenantId },
      { firstName: "David", lastName: "Kiprotich", phone: "+254712345603", gender: "male", ageGroup: "41-50", occupation: "Business", countyId: 1, constituencyId: 3, wardId: 8, consentSms: false, consentSource: "manual", tags: ["business"], tenantId },
      { firstName: "Ann", lastName: "Korir", phone: "+254712345604", gender: "female", ageGroup: "51-60", occupation: "Retired", countyId: 2, constituencyId: 9, wardId: 34, consentSms: true, consentSource: "sms", tags: ["elder", "voter"], tenantId },
      { firstName: "Patrick", lastName: "Ngetich", phone: "+254712345605", gender: "male", ageGroup: "18-24", occupation: "Student", countyId: 2, constituencyId: 11, wardId: 41, consentSms: true, consentSource: "field", tags: ["youth", "student"], tenantId },
      { firstName: "Esther", lastName: "Lagat", phone: "+254712345606", gender: "female", ageGroup: "31-40", occupation: "Nurse", countyId: 1, constituencyId: 2, wardId: 5, consentSms: true, consentSource: "event", tags: ["health", "voter"], tenantId },
      { firstName: "Moses", lastName: "Sang", phone: "+254712345607", gender: "male", ageGroup: "25-30", occupation: "Engineer", countyId: 2, constituencyId: 9, wardId: 35, consentSms: true, consentSource: "field", tags: ["professional"], tenantId },
      { firstName: "Ruth", lastName: "Talai", phone: "+254712345608", gender: "female", ageGroup: "41-50", occupation: "Farmer", countyId: 1, constituencyId: 5, wardId: 19, consentSms: false, consentSource: "manual", tags: ["farmer"], tenantId },
      { firstName: "Joseph", lastName: "Bett", phone: "+254712345609", gender: "male", ageGroup: "51-60", occupation: "Pastor", countyId: 2, constituencyId: 10, wardId: 38, consentSms: true, consentSource: "event", tags: ["leader", "community"], tenantId },
      { firstName: "Grace", lastName: "Mutai", phone: "+254712345610", gender: "female", ageGroup: "18-24", occupation: "Student", countyId: 1, constituencyId: 6, wardId: 21, consentSms: true, consentSource: "sms", tags: ["youth"], tenantId },
    ];
    for (const c of sampleContacts) {
      await db.insert(contactsTable).values({ ...c, tags: c.tags });
    }
    console.log("Created sample contacts");
  }

  // Sample campaign
  const campaigns = await db.select().from(campaignsTable).where(eq(campaignsTable.tenantId, tenantId));
  if (campaigns.length === 0) {
    await db.insert(campaignsTable).values([
      { name: "Welcome Campaign", senderId: "MTAAREACH", body: "Habari! Karibu sana kwenye mtandao wetu.", tenantId, status: "completed", totalRecipients: 247, sentCount: 247, deliveredCount: 231, failedCount: 16, estimatedCost: "247.00", actualCost: "247.00", audienceFilter: {} },
      { name: "March Meeting Reminder", senderId: "MTAAREACH", body: "Mkutano muhimu utafanyika kesho saa 3 asubuhi. Tafadhali hakikisha unakuwepo.", tenantId, status: "completed", totalRecipients: 89, sentCount: 89, deliveredCount: 84, failedCount: 5, estimatedCost: "89.00", actualCost: "89.00", audienceFilter: {} },
      { name: "Youth Forum Invitation", senderId: "MTAAREACH", body: "Vijana wa Uasin Gishu, tungependa mkuwepo kwenye mkutano wa vijana Jumamosi ijayo!", tenantId, status: "draft", totalRecipients: 0, sentCount: 0, deliveredCount: 0, failedCount: 0, estimatedCost: "0.00", actualCost: "0.00", audienceFilter: { ageGroup: "18-30" } },
    ]);
    console.log("Created sample campaigns");
  }

  // Audit logs
  const auditLogs = await db.select().from(auditLogsTable).where(eq(auditLogsTable.tenantId, tenantId));
  if (auditLogs.length === 0) {
    await db.insert(auditLogsTable).values([
      { action: "User logged in", actorId: 2, actorName: "John Kariuki", actorRole: "tenant_admin", resourceType: "auth", tenantId },
      { action: "Campaign created: Welcome Campaign", actorId: 2, actorName: "John Kariuki", actorRole: "tenant_admin", resourceType: "campaign", resourceId: 1, tenantId },
      { action: "Contact imported (10 records)", actorId: 2, actorName: "John Kariuki", actorRole: "tenant_admin", resourceType: "contact", tenantId },
      { action: "Template created: Welcome Message", actorId: 2, actorName: "John Kariuki", actorRole: "tenant_admin", resourceType: "template", resourceId: 1, tenantId },
    ]);
    console.log("Created audit logs");
  }

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
