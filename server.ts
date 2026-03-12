import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import dotenv from "dotenv";

dotenv.config();

const db = new Database("dashboard.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    handle TEXT NOT NULL,
    profile_url TEXT,
    pod_owner TEXT,
    backup_owner TEXT,
    status_tag TEXT DEFAULT 'active',
    cadence_target_per_week INTEGER DEFAULT 1,
    last_post_ts DATETIME,
    priority_level TEXT DEFAULT 'medium'
  );

  CREATE TABLE IF NOT EXISTS metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER,
    date DATE DEFAULT CURRENT_DATE,
    posts_count INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    watch_time INTEGER DEFAULT 0,
    follower_delta INTEGER DEFAULT 0,
    FOREIGN KEY(account_id) REFERENCES accounts(id)
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewer TEXT,
    thumbnail_ok BOOLEAN,
    captions_ok BOOLEAN,
    cta_ok BOOLEAN,
    cadence_ok BOOLEAN,
    notes TEXT,
    reviewed BOOLEAN DEFAULT 0,
    FOREIGN KEY(account_id) REFERENCES accounts(id)
  );

  -- Migration: Add reviewed column if it doesn't exist
  -- We use a try-catch pattern in SQL or just ignore errors if it fails
  -- For better-sqlite3, we can just run it and catch the error if it already exists
  -- But here we'll just add it to the initial schema and also try to alter it
`);

try {
  db.exec("ALTER TABLE audit_logs ADD COLUMN reviewed BOOLEAN DEFAULT 0");
} catch (e) {
  // Column likely already exists
}

db.exec(`
  CREATE TABLE IF NOT EXISTS insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    tags TEXT -- JSON array of account IDs
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  -- Seed some initial settings if not present
  INSERT OR IGNORE INTO settings (key, value) VALUES ('alert_destinations', '{"email": "admin@example.com", "slack": "", "whatsapp": ""}');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('thresholds', '{"reach_drop": 20, "cadence_gap_hours": 48}');

  -- Seed initial accounts if empty
  INSERT OR IGNORE INTO accounts (platform, handle, profile_url, pod_owner, backup_owner, status_tag, cadence_target_per_week, priority_level)
  SELECT 'Instagram', 'dr_ray', 'https://instagram.com/dr_ray', 'Pod A', 'Backup A', 'active', 3, 'high'
  WHERE NOT EXISTS (SELECT 1 FROM accounts);

  INSERT OR IGNORE INTO accounts (platform, handle, profile_url, pod_owner, backup_owner, status_tag, cadence_target_per_week, priority_level)
  SELECT 'X', 'deacon_harold', 'https://x.com/deacon_harold', 'Pod B', 'Backup B', 'active', 5, 'medium'
  WHERE (SELECT COUNT(*) FROM accounts) = 1;

  INSERT OR IGNORE INTO accounts (platform, handle, profile_url, pod_owner, backup_owner, status_tag, cadence_target_per_week, priority_level)
  SELECT 'YouTube', 'fr_mike', 'https://youtube.com/fr_mike', 'Pod A', 'Backup B', 'active', 2, 'high'
  WHERE (SELECT COUNT(*) FROM accounts) = 2;
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API Routes ---

  // Accounts
  app.get("/api/accounts", (req, res) => {
    const accounts = db.prepare("SELECT * FROM accounts").all();
    res.json(accounts);
  });

  app.post("/api/accounts", (req, res) => {
    const { platform, handle, profile_url, pod_owner, backup_owner, priority_level, cadence_target_per_week } = req.body;
    const info = db.prepare(`
      INSERT INTO accounts (platform, handle, profile_url, pod_owner, backup_owner, priority_level, cadence_target_per_week)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(platform, handle, profile_url, pod_owner, backup_owner, priority_level, cadence_target_per_week);
    res.json({ id: info.lastInsertRowid });
  });

  app.patch("/api/accounts/:id", (req, res) => {
    const { id } = req.params;
    const { status_tag, last_post_ts } = req.body;
    if (status_tag) db.prepare("UPDATE accounts SET status_tag = ? WHERE id = ?").run(status_tag, id);
    if (last_post_ts) db.prepare("UPDATE accounts SET last_post_ts = ? WHERE id = ?").run(last_post_ts, id);
    res.json({ success: true });
  });

  // Metrics
  app.get("/api/metrics/:accountId", (req, res) => {
    const metrics = db.prepare("SELECT * FROM metrics WHERE account_id = ? ORDER BY date DESC LIMIT 30").all(req.params.accountId);
    res.json(metrics);
  });

  app.post("/api/metrics", (req, res) => {
    const { account_id, reach, saves, shares, watch_time, follower_delta, posts_count } = req.body;
    db.prepare(`
      INSERT INTO metrics (account_id, reach, saves, shares, watch_time, follower_delta, posts_count)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(account_id, reach, saves, shares, watch_time, follower_delta, posts_count);
    res.json({ success: true });
  });

  // Audit Logs
  app.get("/api/audit-logs", (req, res) => {
    const logs = db.prepare(`
      SELECT al.*, a.handle, a.platform 
      FROM audit_logs al 
      JOIN accounts a ON al.account_id = a.id 
      ORDER BY timestamp DESC
    `).all();
    res.json(logs);
  });

  app.post("/api/audit-logs", (req, res) => {
    const { account_id, reviewer, thumbnail_ok, captions_ok, cta_ok, cadence_ok, notes } = req.body;
    db.prepare(`
      INSERT INTO audit_logs (account_id, reviewer, thumbnail_ok, captions_ok, cta_ok, cadence_ok, notes, reviewed)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `).run(account_id, reviewer, thumbnail_ok ? 1 : 0, captions_ok ? 1 : 0, cta_ok ? 1 : 0, cadence_ok ? 1 : 0, notes);
    res.json({ success: true });
  });

  app.patch("/api/audit-logs/batch", (req, res) => {
    const { ids, data } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Invalid IDs" });
    }

    const updates = Object.keys(data).map(key => `${key} = ?`).join(", ");
    const values = Object.values(data);
    
    const placeholders = ids.map(() => "?").join(",");
    const stmt = db.prepare(`UPDATE audit_logs SET ${updates} WHERE id IN (${placeholders})`);
    stmt.run(...values, ...ids);
    
    res.json({ success: true });
  });

  // Insights
  app.get("/api/insights", (req, res) => {
    const insights = db.prepare("SELECT * FROM insights ORDER BY created_at DESC").all();
    res.json(insights);
  });

  app.post("/api/insights", (req, res) => {
    const { content, tags } = req.body;
    db.prepare("INSERT INTO insights (content, tags) VALUES (?, ?)").run(content, JSON.stringify(tags));
    res.json({ success: true });
  });

  // Settings
  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    const result = settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = JSON.parse(curr.value);
      return acc;
    }, {});
    res.json(result);
  });

  app.post("/api/settings", (req, res) => {
    const { key, value } = req.body;
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, JSON.stringify(value));
    res.json({ success: true });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // --- Background Tasks ---

  // Mock Metrics Ingestion (Simulating API pulls)
  setInterval(() => {
    const accounts = db.prepare("SELECT id FROM accounts WHERE status = 'active'").all();
    accounts.forEach((acc: any) => {
      const lastMetric = db.prepare("SELECT * FROM metrics WHERE account_id = ? ORDER BY date DESC LIMIT 1").get(acc.id);
      
      // Only add if no metric for today
      const today = new Date().toISOString().split('T')[0];
      if (!lastMetric || lastMetric.date !== today) {
        const reach = Math.floor(Math.random() * 5000) + 1000;
        const saves = Math.floor(reach * 0.05);
        const shares = Math.floor(reach * 0.02);
        const watch_time = Math.floor(reach * 1.5);
        const follower_delta = Math.floor(Math.random() * 100) - 20;

        db.prepare(`
          INSERT INTO metrics (account_id, date, reach, saves, shares, watch_time, follower_delta, posts_count)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(acc.id, today, reach, saves, shares, watch_time, follower_delta, 1);

        // Check for alerts
        const settingsRaw = db.prepare("SELECT value FROM settings WHERE key = 'thresholds'").get();
        const thresholds = JSON.parse(settingsRaw.value);
        
        if (lastMetric && reach < lastMetric.reach * (1 - thresholds.reach_drop / 100)) {
          console.log(`ALERT: Reach drop detected for account ${acc.id}`);
          // In a real app, trigger WhatsApp/Slack/Email here
        }
      }
    });
  }, 1000 * 60 * 60); // Run every hour

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
