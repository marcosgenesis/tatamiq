import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const academies = pgTable("academies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  address: text("address"),
  phoneWhatsapp: text("phone_whatsapp"),
  instagram: text("instagram"),
  pixKey: text("pix_key"),
  pixCopyPaste: text("pix_copy_paste"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Academy = typeof academies.$inferSelect;
export type NewAcademy = typeof academies.$inferInsert;
