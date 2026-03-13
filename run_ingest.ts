import Database from "better-sqlite3";
import { ingest } from "./ingest";

const db = new Database("dashboard.db");

async function run() {
  console.log("Starting manual ingestion...");
  try {
    await ingest(db);
    console.log("Manual ingestion completed.");
  } catch (error) {
    console.error("Manual ingestion failed:", error);
  }
}

run();
