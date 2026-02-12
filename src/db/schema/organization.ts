import {pgTable, text, timestamp, pgEnum, index} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth";
import { classes, departments } from "./app";

export const organizationTypeEnum = pgEnum("organization_type", ["school", "college", "university", "coaching"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "inactive", "trial", "expired"]);

const timestamps = {
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull()
}

export const organization = pgTable("organization", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    type: organizationTypeEnum("type").notNull(),
    email: text("email").notNull().unique(),
    phone: text("phone"),
    address: text("address"),
    logo: text("logo"),
    logoCldPubId: text("logo_cld_pub_id"),
    
    // Subscription details
    subscriptionStatus: subscriptionStatusEnum("subscription_status").default("trial").notNull(),
    subscriptionStartDate: timestamp("subscription_start_date"),
    subscriptionEndDate: timestamp("subscription_end_date"),
    
    ...timestamps
}, (table) => [
    index("organization_email_idx").on(table.email),
]);

export const organizationRelations = relations(organization, ({ many }) => ({
    users: many(user),
    departments: many(departments),
    classes: many(classes),
}));

export type Organization = typeof organization.$inferSelect;
export type NewOrganization = typeof organization.$inferInsert;