import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const countiesTable = pgTable("counties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const constituenciesTable = pgTable("constituencies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  countyId: integer("county_id").notNull().references(() => countiesTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const wardsTable = pgTable("wards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  constituencyId: integer("constituency_id").notNull().references(() => constituenciesTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const villagesTable = pgTable("villages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  wardId: integer("ward_id").notNull().references(() => wardsTable.id),
  tenantId: integer("tenant_id").notNull(),
  status: text("status").notNull().default("pending"),
  gpsCoordinates: text("gps_coordinates"),
  population: integer("population"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pollingStationsTable = pgTable("polling_stations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  wardId: integer("ward_id").notNull().references(() => wardsTable.id),
  villageId: integer("village_id").references(() => villagesTable.id),
  tenantId: integer("tenant_id").notNull(),
  registeredVoters: integer("registered_voters"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCountySchema = createInsertSchema(countiesTable).omit({ id: true, createdAt: true });
export const insertConstituencySchema = createInsertSchema(constituenciesTable).omit({ id: true, createdAt: true });
export const insertWardSchema = createInsertSchema(wardsTable).omit({ id: true, createdAt: true });
export const insertVillageSchema = createInsertSchema(villagesTable).omit({ id: true, createdAt: true });
export const insertPollingStationSchema = createInsertSchema(pollingStationsTable).omit({ id: true, createdAt: true });

export type County = typeof countiesTable.$inferSelect;
export type Constituency = typeof constituenciesTable.$inferSelect;
export type Ward = typeof wardsTable.$inferSelect;
export type Village = typeof villagesTable.$inferSelect;
export type PollingStation = typeof pollingStationsTable.$inferSelect;
export type InsertVillage = z.infer<typeof insertVillageSchema>;
export type InsertPollingStation = z.infer<typeof insertPollingStationSchema>;
