import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import { ingest, generateWithFallback } from "./ingest";
import { fetchYouTubeMetrics, fetchMetaMetrics, resolveYouTubeHandle, resolveInstagramHandle, getInstagramBusinessIdFromToken } from "./src/services/socialApi";

import multer from "multer";
import { parse } from "csv-parse/sync";
import { Parser } from "json2csv";

dotenv.config({ override: true });

const db = new Database("dashboard.db");
const upload = multer({ storage: multer.memoryStorage() });

// Ingestion Status Tracking
let ingestionStatus = {
  status: "idle", // "idle", "running", "success", "error"
  lastRun: null as string | null,
  error: null as string | null
};

async function runIngestion() {
  if (ingestionStatus.status === "running") return;
  
  ingestionStatus.status = "running";
  ingestionStatus.error = null;
  
  try {
    await ingest(db);
    ingestionStatus.status = "success";
    ingestionStatus.lastRun = new Date().toISOString();
  } catch (error: any) {
    console.error("Ingestion failed:", error);
    ingestionStatus.status = "error";
    ingestionStatus.error = error.message || "Unknown error";
  }
}

async function checkCadenceGaps() {
  console.log("Checking for cadence gaps...");
  try {
    const thresholdsSetting = db.prepare("SELECT value FROM settings WHERE key = 'thresholds'").get() as any;
    const thresholds = thresholdsSetting ? JSON.parse(thresholdsSetting.value) : { cadence_gap_hours: 48 };
    const gapHours = thresholds.cadence_gap_hours || 48;

    const accounts = db.prepare("SELECT * FROM accounts WHERE status_tag = 'active'").all() as any[];
    const now = new Date();

    for (const account of accounts) {
      if (!account.last_post_ts) continue;

      const lastPost = new Date(account.last_post_ts);
      const diffHours = (now.getTime() - lastPost.getTime()) / (1000 * 60 * 60);

      if (diffHours > gapHours) {
        // Check if a pending alert already exists for this account and this gap
        const existingAlert = db.prepare(`
          SELECT id FROM alerts 
          WHERE account_id = ? AND type = 'cadence_gap' AND status = 'pending'
        `).get(account.id);

        if (!existingAlert) {
          const message = `Cadence gap detected for @${account.handle} on ${account.platform}. Last post was ${Math.floor(diffHours)} hours ago (Threshold: ${gapHours}h).`;
          db.prepare(`
            INSERT INTO alerts (account_id, type, message, severity, status)
            VALUES (?, 'cadence_gap', ?, 'high', 'pending')
          `).run(account.id, message);
          console.log(`Alert created for @${account.handle}`);
        }
      }
    }
  } catch (error) {
    console.error("Cadence check failed:", error);
  }
}

// Auth Middleware
const AUTH_TOKEN = process.env.SHARED_AUTH_TOKEN || "NIO2026";
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers["authorization"] || req.query.token;
  if (token === AUTH_TOKEN || token === `Bearer ${AUTH_TOKEN}`) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
};

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    handle TEXT NOT NULL,
    platform_account_id TEXT, -- ID for Meta/YouTube API
    profile_url TEXT,
    pod_owner TEXT,
    backup_owner TEXT,
    status_tag TEXT DEFAULT 'active',
    cadence_target_per_week INTEGER DEFAULT 1,
    last_post_ts DATETIME,
    priority_level TEXT DEFAULT 'medium',
    last_ingest_ts DATETIME
  );

  CREATE TABLE IF NOT EXISTS account_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    posts_per_day_7d REAL,
    avg_reach_7d INTEGER,
    saves_7d INTEGER,
    shares_7d INTEGER,
    watch_time_7d INTEGER,
    follower_delta_7d INTEGER,
    total_followers INTEGER,
    FOREIGN KEY(account_id) REFERENCES accounts(id)
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER,
    type TEXT NOT NULL, -- 'cadence_gap', 'metric_drop', 'threshold_breach'
    message TEXT NOT NULL,
    severity TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending', -- 'pending', 'resolved', 'ignored'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(account_id) REFERENCES accounts(id)
  );

  CREATE TABLE IF NOT EXISTS scheduled_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER,
    platform TEXT NOT NULL,
    content_type TEXT, -- 'Reel', 'Post', 'Story', 'Short'
    scheduled_time DATETIME NOT NULL,
    status TEXT DEFAULT 'scheduled', -- 'scheduled', 'deployed', 'failed'
    caption TEXT,
    asset_url TEXT,
    FOREIGN KEY(account_id) REFERENCES accounts(id)
  );

  CREATE TABLE IF NOT EXISTS ready_assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    type TEXT, -- 'Video', 'Image', 'Graphic'
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    status TEXT DEFAULT 'ready', -- 'ready', 'used', 'archived'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
} catch (e) {}

try {
  db.exec("ALTER TABLE account_metrics ADD COLUMN total_followers INTEGER");
} catch (e) {}

try {
  db.exec("ALTER TABLE account_metrics ADD COLUMN likes_7d INTEGER");
} catch (e) {}

try {
  db.exec("ALTER TABLE account_metrics ADD COLUMN dislikes_7d INTEGER");
} catch (e) {}

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

// Update API keys if provided in env
const existingKeys = db.prepare("SELECT value FROM settings WHERE key = 'api_keys'").get() as any;
let keys = existingKeys ? JSON.parse(existingKeys.value) : { meta: "", youtube: "", gemini: "" };
let updated = false;
if (process.env.META_ACCESS_TOKEN && !keys.meta) { keys.meta = process.env.META_ACCESS_TOKEN; updated = true; }
if (process.env.YOUTUBE_API_KEY && !keys.youtube) { keys.youtube = process.env.YOUTUBE_API_KEY; updated = true; }
if (process.env.GEMINI_API_KEY && !keys.gemini) { keys.gemini = process.env.GEMINI_API_KEY; updated = true; }

if (updated) {
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('api_keys', ?)").run(JSON.stringify(keys));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const apiRouter = express.Router();
  app.use("/api", apiRouter);

  // Apply Auth Middleware to all /api routes except health
  apiRouter.use((req, res, next) => {
    if (req.path === "/health" || req.path === "/health/") return next();
    authMiddleware(req, res, next);
  });

  // --- API Routes ---

  // Health
  apiRouter.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Auth Verification
  apiRouter.get("/auth/verify", (req, res) => {
    res.json({ success: true });
  });

  // Accounts
  apiRouter.get("/resolve-handle", async (req, res) => {
    const { platform, handle } = req.query;
    if (!platform || !handle) return res.status(400).json({ error: "Missing platform or handle" });

    const keysSetting = db.prepare("SELECT value FROM settings WHERE key = 'api_keys'").get() as any;
    const apiKeys = keysSetting ? JSON.parse(keysSetting.value) : {};

    try {
      if (platform === 'YouTube') {
        const id = await resolveYouTubeHandle(handle as string, apiKeys.youtube);
        return res.json({ id });
      } else if (platform === 'Instagram') {
        let requesterId = null;
        const requester = db.prepare("SELECT platform_account_id FROM accounts WHERE platform = 'Instagram' AND platform_account_id IS NOT NULL LIMIT 1").get() as any;
        if (requester) {
          requesterId = requester.platform_account_id;
        } else {
          requesterId = await getInstagramBusinessIdFromToken(apiKeys.meta);
        }

        if (!requesterId) return res.status(400).json({ error: "No Instagram Business ID found to use for discovery. Please configure Meta API key correctly." });
        
        const id = await resolveInstagramHandle(handle as string, requesterId, apiKeys.meta);
        return res.json({ id });
      }
      res.status(400).json({ error: "Unsupported platform for resolution" });
    } catch (error) {
      console.error("Resolution error:", error);
      res.status(500).json({ error: "Failed to resolve handle" });
    }
  });

  apiRouter.get("/accounts", (req, res) => {
    const accounts = db.prepare("SELECT * FROM accounts").all();
    res.json(accounts);
  });

  apiRouter.get("/accounts/export", (req, res) => {
    const accounts = db.prepare("SELECT * FROM accounts").all();
    const fields = ['platform', 'handle', 'profile_url', 'pod_owner', 'backup_owner', 'status_tag', 'cadence_target_per_week', 'priority_level'];
    const parser = new Parser({ fields });
    const csv = parser.parse(accounts);
    res.header('Content-Type', 'text/csv');
    res.attachment('accounts.csv');
    res.send(csv);
  });

  apiRouter.post("/accounts/import", upload.single('file'), (req, res) => {
    if (!(req as any).file) return res.status(400).json({ error: "No file uploaded" });
    const records = parse((req as any).file.buffer, { columns: true, skip_empty_lines: true });
    const stmt = db.prepare(`
      INSERT INTO accounts (platform, handle, platform_account_id, profile_url, pod_owner, backup_owner, status_tag, cadence_target_per_week, priority_level)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertMany = db.transaction((rows) => {
      for (const row of rows) {
        stmt.run(row.platform, row.handle, row.platform_account_id || null, row.profile_url, row.pod_owner, row.backup_owner, row.status_tag || 'active', row.cadence_target_per_week || 1, row.priority_level || 'medium');
      }
    });
    insertMany(records);
    res.json({ success: true, count: records.length });
  });

  apiRouter.post("/accounts", (req, res) => {
    const { platform, handle, platform_account_id, profile_url, pod_owner, backup_owner, priority_level, cadence_target_per_week } = req.body;
    const info = db.prepare(`
      INSERT INTO accounts (platform, handle, platform_account_id, profile_url, pod_owner, backup_owner, priority_level, cadence_target_per_week)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(platform, handle, platform_account_id, profile_url, pod_owner, backup_owner, priority_level, cadence_target_per_week);
    res.json({ id: info.lastInsertRowid });
  });

  apiRouter.patch("/accounts/:id", (req, res) => {
    const { id } = req.params;
    const { status_tag, last_post_ts, platform_account_id, platform, handle, profile_url, pod_owner, backup_owner, priority_level, cadence_target_per_week } = req.body;
    
    if (status_tag !== undefined) db.prepare("UPDATE accounts SET status_tag = ? WHERE id = ?").run(status_tag, id);
    if (last_post_ts !== undefined) db.prepare("UPDATE accounts SET last_post_ts = ? WHERE id = ?").run(last_post_ts, id);
    if (platform_account_id !== undefined) db.prepare("UPDATE accounts SET platform_account_id = ? WHERE id = ?").run(platform_account_id, id);
    if (platform !== undefined) db.prepare("UPDATE accounts SET platform = ? WHERE id = ?").run(platform, id);
    if (handle !== undefined) db.prepare("UPDATE accounts SET handle = ? WHERE id = ?").run(handle, id);
    if (profile_url !== undefined) db.prepare("UPDATE accounts SET profile_url = ? WHERE id = ?").run(profile_url, id);
    if (pod_owner !== undefined) db.prepare("UPDATE accounts SET pod_owner = ? WHERE id = ?").run(pod_owner, id);
    if (backup_owner !== undefined) db.prepare("UPDATE accounts SET backup_owner = ? WHERE id = ?").run(backup_owner, id);
    if (priority_level !== undefined) db.prepare("UPDATE accounts SET priority_level = ? WHERE id = ?").run(priority_level, id);
    if (cadence_target_per_week !== undefined) db.prepare("UPDATE accounts SET cadence_target_per_week = ? WHERE id = ?").run(cadence_target_per_week, id);
    
    res.json({ success: true });
  });

  // Metrics
  apiRouter.get("/metrics/:accountId", (req, res) => {
    const metrics = db.prepare(`
      SELECT 
        id, 
        account_id, 
        timestamp as date, 
        avg_reach_7d as reach, 
        saves_7d as saves, 
        shares_7d as shares, 
        follower_delta_7d as follower_delta,
        total_followers,
        avg_reach_7d as reach_7d,
        (saves_7d + shares_7d) as engagement_7d,
        likes_7d,
        dislikes_7d
      FROM account_metrics 
      WHERE account_id = ? 
      ORDER BY timestamp DESC 
      LIMIT 30
    `).all(req.params.accountId);
    res.json(metrics);
  });

  apiRouter.post("/metrics", (req, res) => {
    const { account_id, posts_per_day_7d, avg_reach_7d, saves_7d, shares_7d, watch_time_7d, follower_delta_7d, likes_7d, dislikes_7d } = req.body;
    db.prepare(`
      INSERT INTO account_metrics (account_id, posts_per_day_7d, avg_reach_7d, saves_7d, shares_7d, watch_time_7d, follower_delta_7d, likes_7d, dislikes_7d)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(account_id, posts_per_day_7d, avg_reach_7d, saves_7d, shares_7d, watch_time_7d, follower_delta_7d, likes_7d || 0, dislikes_7d || 0);
    res.json({ success: true });
  });

  // Alerts
  apiRouter.get("/alerts", (req, res) => {
    const alerts = db.prepare(`
      SELECT al.*, a.handle, a.platform 
      FROM alerts al 
      JOIN accounts a ON al.account_id = a.id 
      WHERE al.status = 'pending'
      ORDER BY created_at DESC
    `).all();
    res.json(alerts);
  });

  apiRouter.patch("/alerts/:id", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    db.prepare("UPDATE alerts SET status = ? WHERE id = ?").run(status, id);
    res.json({ success: true });
  });

  // Scheduled Posts
  apiRouter.get("/scheduled-posts", (req, res) => {
    const posts = db.prepare(`
      SELECT sp.*, a.handle 
      FROM scheduled_posts sp 
      JOIN accounts a ON sp.account_id = a.id 
      ORDER BY scheduled_time ASC
    `).all();
    res.json(posts);
  });

  apiRouter.post("/scheduled-posts", (req, res) => {
    const { account_id, platform, content_type, scheduled_time, caption, asset_url } = req.body;
    db.prepare(`
      INSERT INTO scheduled_posts (account_id, platform, content_type, scheduled_time, caption, asset_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(account_id, platform, content_type, scheduled_time, caption, asset_url);
    res.json({ success: true });
  });

  apiRouter.patch("/scheduled-posts/:id", (req, res) => {
    const { id } = req.params;
    const { status, scheduled_time, caption } = req.body;
    const updates = [];
    const values = [];
    if (status) { updates.push("status = ?"); values.push(status); }
    if (scheduled_time) { updates.push("scheduled_time = ?"); values.push(scheduled_time); }
    if (caption) { updates.push("caption = ?"); values.push(caption); }
    
    if (updates.length > 0) {
      db.prepare(`UPDATE scheduled_posts SET ${updates.join(", ")} WHERE id = ?`).run(...values, id);
    }
    res.json({ success: true });
  });

  apiRouter.delete("/scheduled-posts/:id", (req, res) => {
    db.prepare("DELETE FROM scheduled_posts WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Ready Assets
  apiRouter.get("/ready-assets", (req, res) => {
    const assets = db.prepare("SELECT * FROM ready_assets WHERE status = 'ready' ORDER BY created_at DESC").all();
    res.json(assets);
  });

  apiRouter.post("/ready-assets/upload", upload.single('file'), (req, res) => {
    if (!(req as any).file) return res.status(400).json({ error: "No file uploaded" });
    const records = parse((req as any).file.buffer, { columns: true, skip_empty_lines: true });
    const stmt = db.prepare(`
      INSERT INTO ready_assets (title, type, url, thumbnail_url)
      VALUES (?, ?, ?, ?)
    `);
    const insertMany = db.transaction((rows) => {
      for (const row of rows) {
        stmt.run(row.title, row.type, row.url, row.thumbnail_url);
      }
    });
    insertMany(records);
    res.json({ success: true, count: records.length });
  });

  apiRouter.get("/external-assets", (req, res) => {
    // Return empty list as real integration is not configured
    res.json([]);
  });

  apiRouter.post("/ready-assets", (req, res) => {
    const { title, type, url, thumbnail_url } = req.body;
    db.prepare(`
      INSERT INTO ready_assets (title, type, url, thumbnail_url)
      VALUES (?, ?, ?, ?)
    `).run(title, type, url, thumbnail_url);
    res.json({ success: true });
  });

  apiRouter.patch("/ready-assets/:id", (req, res) => {
    const { id } = req.params;
    const { status, title } = req.body;
    if (status) db.prepare("UPDATE ready_assets SET status = ? WHERE id = ?").run(status, id);
    if (title) db.prepare("UPDATE ready_assets SET title = ? WHERE id = ?").run(title, id);
    res.json({ success: true });
  });

  apiRouter.delete("/ready-assets/:id", (req, res) => {
    db.prepare("DELETE FROM ready_assets WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Audit Logs
  apiRouter.get("/audit-logs", (req, res) => {
    const logs = db.prepare(`
      SELECT al.*, a.handle, a.platform 
      FROM audit_logs al 
      JOIN accounts a ON al.account_id = a.id 
      ORDER BY timestamp DESC
    `).all();
    res.json(logs);
  });

  apiRouter.post("/audit-logs", (req, res) => {
    const { account_id, reviewer, thumbnail_ok, captions_ok, cta_ok, cadence_ok, notes } = req.body;
    db.prepare(`
      INSERT INTO audit_logs (account_id, reviewer, thumbnail_ok, captions_ok, cta_ok, cadence_ok, notes, reviewed)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `).run(account_id, reviewer, thumbnail_ok ? 1 : 0, captions_ok ? 1 : 0, cta_ok ? 1 : 0, cadence_ok ? 1 : 0, notes);
    res.json({ success: true });
  });

  apiRouter.patch("/audit-logs/batch", (req, res) => {
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
  apiRouter.get("/insights", (req, res) => {
    const insights = db.prepare("SELECT * FROM insights ORDER BY created_at DESC").all();
    res.json(insights);
  });

  apiRouter.post("/insights", (req, res) => {
    const { content, tags } = req.body;
    db.prepare("INSERT INTO insights (content, tags) VALUES (?, ?)").run(content, JSON.stringify(tags));
    res.json({ success: true });
  });

  // Settings
  apiRouter.get("/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    const result = settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = JSON.parse(curr.value);
      return acc;
    }, {});
    res.json(result);
  });

  apiRouter.post("/settings", (req, res) => {
    const { key, value } = req.body;
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, JSON.stringify(value));
    res.json({ success: true });
  });

  apiRouter.get("/accounts/:id/realtime-metrics", async (req, res) => {
    const { id } = req.params;
    const account = db.prepare("SELECT * FROM accounts WHERE id = ?").get(id) as any;
    if (!account) return res.status(404).json({ error: "Account not found" });

    const keysSetting = db.prepare("SELECT value FROM settings WHERE key = 'api_keys'").get() as any;
    const apiKeys = keysSetting ? JSON.parse(keysSetting.value) : {};

    let metrics = null;
    try {
      let platformAccountId = account.platform_account_id;

      // Try to resolve ID if missing
      if (!platformAccountId) {
        console.log(`Realtime: Resolving handle for ${account.handle}...`);
        if (account.platform === 'YouTube') {
          platformAccountId = await resolveYouTubeHandle(account.handle, apiKeys.youtube);
        } else if (account.platform === 'Instagram') {
          // Find a requester ID (any Instagram account with an ID)
          const requester = db.prepare("SELECT platform_account_id FROM accounts WHERE platform = 'Instagram' AND platform_account_id IS NOT NULL LIMIT 1").get() as any;
          let requesterId = requester?.platform_account_id;
          
          if (!requesterId) {
            // Fallback: try to get ID from token
            requesterId = await getInstagramBusinessIdFromToken(apiKeys.meta);
          }
          
          if (requesterId) {
            platformAccountId = await resolveInstagramHandle(account.handle, requesterId, apiKeys.meta);
          }
        }
        
        if (platformAccountId) {
          db.prepare("UPDATE accounts SET platform_account_id = ? WHERE id = ?").run(platformAccountId, account.id);
          console.log(`Realtime: Resolved ${account.handle} to ${platformAccountId}`);
        }
      }

      if (!platformAccountId) {
        return res.status(400).json({ error: "Could not resolve platform account ID. Please ensure the handle is correct and API keys are valid." });
      }

      if (account.platform === 'YouTube') {
        if (!apiKeys.youtube && !process.env.YOUTUBE_API_KEY) {
          return res.status(400).json({ error: "YouTube API Key is missing. Please configure it in Settings." });
        }
        metrics = await fetchYouTubeMetrics(platformAccountId, apiKeys.youtube);
      } else if (account.platform === 'Instagram') {
        if (!apiKeys.meta && !process.env.META_ACCESS_TOKEN) {
          return res.status(400).json({ error: "Meta Access Token is missing. Please configure it in Settings." });
        }
        metrics = await fetchMetaMetrics(platformAccountId, apiKeys.meta);
      }

      if (!metrics) {
        return res.status(500).json({ error: "Failed to fetch metrics from social platform. Check API key validity and quotas." });
      }

      res.json(metrics);
    } catch (error: any) {
      console.error("Realtime metrics error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch realtime metrics" });
    }
  });

  // Ingestion Control
  apiRouter.get("/ingest/status", (req, res) => {
    res.json(ingestionStatus);
  });

  apiRouter.post("/ingest/trigger", (req, res) => {
    runIngestion(); // Run in background
    res.json({ success: true, message: "Ingestion triggered" });
  });

  apiRouter.post("/ingest/account/:id", async (req, res) => {
    const id = Number(req.params.id);
    const account = db.prepare("SELECT * FROM accounts WHERE id = ?").get(id) as any;
    if (!account) return res.status(404).json({ error: "Account not found" });

    try {
      await ingest(db, id);
      res.json({ success: true, message: `Ingestion completed for @${account.handle}` });
    } catch (error: any) {
      console.error(`Ingestion failed for @${account.handle}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  apiRouter.get("/system/status", async (req, res) => {
    const keysSetting = db.prepare("SELECT value FROM settings WHERE key = 'api_keys'").get() as any;
    const apiKeys = keysSetting ? JSON.parse(keysSetting.value) : {};
    
    const status = {
      youtube: !!(apiKeys.youtube || process.env.YOUTUBE_API_KEY),
      meta: !!(apiKeys.meta || process.env.META_ACCESS_TOKEN),
      gemini: !!(apiKeys.gemini || process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.GOOGLE_API_KEY),
      meta_expired: false,
      youtube_invalid: false
    };

    // Quick check for meta token expiration if it exists
    const metaToken = apiKeys.meta || process.env.META_ACCESS_TOKEN;
    if (metaToken) {
      try {
        const id = await getInstagramBusinessIdFromToken(metaToken);
        console.log("Meta Token Health Check ID:", id);
        if (!id) {
          status.meta_expired = true;
          // Clear from DB if it's there and invalid
          if (apiKeys.meta) {
            const newKeys = { ...apiKeys, meta: "" };
            db.prepare("UPDATE settings SET value = ? WHERE key = 'api_keys'").run(JSON.stringify(newKeys));
          }
        }
      } catch (e: any) {
        if (e.response?.data?.error?.code === 190 || e.message?.includes('expired')) {
          status.meta_expired = true;
          // Clear from DB if it's there and expired
          if (apiKeys.meta) {
            const newKeys = { ...apiKeys, meta: "" };
            db.prepare("UPDATE settings SET value = ? WHERE key = 'api_keys'").run(JSON.stringify(newKeys));
          }
        }
      }
    }

    res.json(status);
  });

  apiRouter.post("/system/test-key", async (req, res) => {
    const { type, key } = req.body;
    if (!key) return res.status(400).json({ error: "Key is required" });

    try {
      if (type === 'meta') {
        const id = await getInstagramBusinessIdFromToken(key);
        if (id) return res.json({ success: true, message: "Meta token is valid." });
        return res.status(400).json({ error: "Invalid Meta token or no linked Instagram Business account found." });
      } else if (type === 'youtube') {
        // Try to resolve a common handle to test key
        const id = await resolveYouTubeHandle('@youtube', key);
        if (id) return res.json({ success: true, message: "YouTube API key is valid." });
        return res.status(400).json({ error: "Invalid YouTube API key." });
      } else if (type === 'gemini') {
        const result = await generateWithFallback("Respond with 'OK'", key);
        if (result) return res.json({ success: true, message: "Gemini API key is valid." });
        return res.status(400).json({ error: "Invalid Gemini API key or quota exceeded." });
      }
      res.status(400).json({ error: "Invalid test type" });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Test failed" });
    }
  });

  // 404 for API routes
  apiRouter.use((req, res) => {
    res.status(404).json({ error: `API route ${req.originalUrl} not found` });
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

  // Initial run on startup
  setTimeout(() => {
    runIngestion();
    checkCadenceGaps();
  }, 5000);

  // Run every 6 hours
  setInterval(() => {
    runIngestion();
  }, 6 * 60 * 60 * 1000);

  // Check cadence every hour
  setInterval(() => {
    checkCadenceGaps();
  }, 60 * 60 * 1000);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
