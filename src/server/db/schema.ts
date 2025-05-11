import * as p from "drizzle-orm/pg-core";

export const users = p.pgTable("users", {
  id: p.serial().primaryKey(),
  name: p.text(),
  email: p.text().unique(),
  password: p.text(),
  createdAt: p.timestamp("created_at").defaultNow(),
  updatedAt: p.timestamp("updated_at").defaultNow(),
});
