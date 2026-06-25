import { pgTable, serial, text, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

export const contactsTable = pgTable("contacts", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  gender: text("gender"),
  ageGroup: text("age_group"),
  occupation: text("occupation"),
  countyId: integer("county_id"),
  constituencyId: integer("constituency_id"),
  wardId: integer("ward_id"),
  villageId: integer("village_id"),
  pollingStationId: integer("polling_station_id"),
  consentSms: boolean("consent_sms").notNull().default(false),
  consentSource: text("consent_source"),
  consentDate: timestamp("consent_date"),
  tags: json("tags").$type<string[]>().notNull().default([]),
  notes: text("notes"),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const groupsTable = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const groupMembersTable = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groupsTable.id),
  contactId: integer("contact_id").notNull().references(() => contactsTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertContactSchema = createInsertSchema(contactsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGroupSchema = createInsertSchema(groupsTable).omit({ id: true, createdAt: true });

export type Contact = typeof contactsTable.$inferSelect;
export type Group = typeof groupsTable.$inferSelect;
export type GroupMember = typeof groupMembersTable.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
