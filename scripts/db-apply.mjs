// Applies all SQL migrations (and optionally seed.sql) to a Postgres database
// over a direct connection string. Used to push the schema to a hosted Supabase
// project without Docker. No Docker / no psql required.
//
// Usage:
//   DATABASE_URL="postgresql://postgres:PASS@db.<ref>.supabase.co:5432/postgres" \
//     node scripts/db-apply.mjs            # migrations + seed
//   ... node scripts/db-apply.mjs --no-seed
//   ... node scripts/db-apply.mjs --seed-only
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: set DATABASE_URL to your Postgres connection string.");
  process.exit(1);
}

const args = new Set(process.argv.slice(2));
const runMigrations = !args.has("--seed-only");
const runSeed = !args.has("--no-seed");

const root = path.resolve(process.cwd(), "supabase");
const migrationsDir = path.join(root, "migrations");

async function exec(client, label, sql) {
  process.stdout.write(`→ ${label} … `);
  try {
    await client.query(sql);
    console.log("ok");
  } catch (err) {
    console.log("FAILED");
    console.error(`\n✖ ${label}\n${err.message}\n`);
    throw err;
  }
}

async function main() {
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log("Connected.\n");

  try {
    if (runMigrations) {
      const files = (await readdir(migrationsDir))
        .filter((f) => f.endsWith(".sql"))
        .sort();
      for (const f of files) {
        const sql = await readFile(path.join(migrationsDir, f), "utf8");
        await exec(client, `migration ${f}`, sql);
      }
    }
    if (runSeed) {
      const seed = await readFile(path.join(root, "seed.sql"), "utf8");
      await exec(client, "seed.sql", seed);
    }
    console.log("\n✓ Done.");
  } finally {
    await client.end();
  }
}

main().catch(() => process.exit(1));
