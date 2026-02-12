import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { timestamps } from "./utils.js";

export const organizationTypeEnum = pgEnum("organization_type", ["school", "college", "university", "coaching"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "inactive", "trial", "expired"]);

export const organization = pgTable("organization", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    type: organizationTypeEnum("type").notNull(),
    email: text("email").notNull().unique(), // ✅ .unique() already creates index
    phone: text("phone"),
    address: text("address"),
    logo: text("logo"),
    logoCldPubId: text("logo_cld_pub_id"),
    
    // Subscription details
    subscriptionStatus: subscriptionStatusEnum("subscription_status").default("trial").notNull(),
    subscriptionStartDate: timestamp("subscription_start_date"),
    subscriptionEndDate: timestamp("subscription_end_date"),
    
    ...timestamps
}); // ✅ Removed index, removed relations

export type Organization = typeof organization.$inferSelect;
export type NewOrganization = typeof organization.$inferInsert;