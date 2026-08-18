import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Newsletter subscribers — the first real domain table for the brand site.
 *
 * Commerce tables (products / carts / orders / payments) are intentionally NOT
 * defined yet; they are specified as a reserved capability in
 * `openspec/specs/commerce/spec.md` and will be added through the spec-first
 * workflow.
 */
export const newsletterSubscribers = sqliteTable("newsletter_subscribers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type NewNewsletterSubscriber = typeof newsletterSubscribers.$inferInsert;
