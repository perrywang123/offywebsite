import "dotenv/config";
import { getDb } from "../src/server/db/client";
import { newsletterSubscribers } from "../src/server/db/schema";

function main() {
  const db = getDb();

  const emails = ["hello@offy.example", "founder@offy.example"];
  for (const email of emails) {
    db.insert(newsletterSubscribers).values({ email }).onConflictDoNothing().run();
  }

  const count = db.select().from(newsletterSubscribers).all().length;
  console.log(`Seeded ${emails.length} subscribers (table now has ${count} rows).`);
}

main();
