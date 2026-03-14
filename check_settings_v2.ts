import Database from "better-sqlite3";
const db = new Database("dashboard.db");
const settings = db.prepare("SELECT * FROM settings").all();
console.log(JSON.stringify(settings, null, 2));
