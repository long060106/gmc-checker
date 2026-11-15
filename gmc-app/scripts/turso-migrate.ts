// Applies prisma/migrations/*/migration.sql to the Turso (libSQL) database, oldest first.
// `prisma migrate deploy` can't talk to Turso, so this does the same job:
// each migration folder is applied once and recorded in the _applied_migrations table.
//
//   npm run db:turso-migrate     (needs TURSO_DATABASE_URL, and TURSO_AUTH_TOKEN for a remote database)
//
// Runs automatically on every Render start (see render.yaml), so it must be safe to run again:
// already-applied folders are skipped.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@libsql/client";

try {
  process.loadEnvFile(".env");
} catch {
  // no .env file — rely on the real environment
}

const url = process.env.TURSO_DATABASE_URL?.trim();
if (!url) {
  console.error("TURSO_DATABASE_URL is not set; nothing to migrate.");
  process.exit(1);
}

const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined });
const dir = join(process.cwd(), "prisma", "migrations");

await db.execute(
  "CREATE TABLE IF NOT EXISTS _applied_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)",
);
const done = new Set((await db.execute("SELECT name FROM _applied_migrations")).rows.map((r) => String(r.name)));

// Folder names start with a timestamp, so a plain sort is chronological.
const folders = readdirSync(dir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(dir, d.name, "migration.sql")))
  .map((d) => d.name)
  .sort();

let applied = 0;
for (const name of folders) {
  if (done.has(name)) continue;
  const sql = readFileSync(join(dir, name, "migration.sql"), "utf8");
  // Run the migration and record it together, so a failure leaves neither half behind.
  const tx = await db.transaction("write");
  try {
    await tx.executeMultiple(sql);
    await tx.execute({
      sql: "INSERT INTO _applied_migrations (name, applied_at) VALUES (?, ?)",
      args: [name, new Date().toISOString()],
    });
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    console.error(`Migration ${name} failed:`, err);
    process.exit(1);
  }
  console.log(`Applied ${name}`);
  applied++;
}
console.log(applied ? `${applied} migration(s) applied.` : "Database is up to date.");
db.close();
