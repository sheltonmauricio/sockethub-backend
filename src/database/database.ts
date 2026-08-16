import Database from "better-sqlite3";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dataDirectory = join(__dirname, "../../../data");
const databasePath = join(dataDirectory, "chat.db");
const schemaPath = join(__dirname, "schema.sql");

mkdirSync(dataDirectory, { recursive: true });

const database = new Database(databasePath);

database.pragma("foreign_keys = ON");

const schema = readFileSync(schemaPath, "utf-8");

database.exec(schema);

export default database;