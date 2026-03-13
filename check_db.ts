import Database from "better-sqlite3";
const db = new Database("dashboard.db");
const accounts = db.prepare("SELECT * FROM accounts").all();
console.log(JSON.stringify(accounts, null, 2));
