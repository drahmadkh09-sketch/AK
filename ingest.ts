import Database from "better-sqlite3";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { fetchMetaMetrics, fetchYouTubeMetrics, SocialMetrics } from "./src/services/socialApi";

dotenv.config({ override: true });

const dbInstance = new Database("dashboard.db");

export async function generateWithFallback(prompt: string) {
  const models = ["gemini-3-flash-preview", "gemini-3.1-flash-lite-preview", "gemini-2.5-flash-preview"];
  
  // Try to find a valid-looking API key
  const apiKeys = [
    process.env.GEMINI_API_KEY, 
    process.env.API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.GEMINI_API_KEY_1_5
  ].filter(key => {
    if (!key) return false;
    const s = String(key).trim();
    
    // 1. Check for common placeholder strings
    const placeholders = [
      "your_", "todo", "key_here", "placeholder", "undefined", "null", 
      "my_gemini", "my_google", "api_key", "insert_here", "my_g"
    ];
    const isPlaceholder = placeholders.some(p => s.toLowerCase().includes(p));
    
    // 2. Check for environment variable names being used as values
    const isEnvName = s === "GEMINI_API_KEY" || s === "API_KEY" || s === "GOOGLE_API_KEY" || s === "GEMINI_API_KEY_1_5";
    
    // 3. Real Gemini/Google API keys almost always start with 'AIza'
    const hasCorrectPrefix = s.startsWith("AIza");
    
    // 4. Check for keys that are just generic "KEY" or "MY_KEY" or contain dots from masking
    const isGenericKey = (s.toLowerCase().endsWith("_key") && s.length < 25) || s.includes("...");
    
    // A valid key must be long enough, not be a placeholder, and ideally have the correct prefix
    return s.length > 15 && !isPlaceholder && !isEnvName && !isGenericKey && (hasCorrectPrefix || s.length > 30);
  }) as string[];

  if (apiKeys.length === 0) {
    console.error("No valid Gemini API key found. Checked: GEMINI_API_KEY, API_KEY, GOOGLE_API_KEY, GEMINI_API_KEY_1_5");
    throw new Error("No valid Gemini API key found in environment variables. Please set GEMINI_API_KEY in Settings.");
  }

  let lastError: any = null;

  for (const apiKey of apiKeys) {
    const maskedKey = apiKey.substring(0, 4) + "..." + apiKey.substring(apiKey.length - 4);
    for (const model of models) {
      console.log(`Attempting generation with model ${model} using key ${maskedKey}...`);
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
      try {
        const response = await ai.models.generateContent({
          model: model,
          contents: prompt,
          config: { responseMimeType: "application/json" }
        });
        
        if (response && response.text) {
          return response.text;
        }
      } catch (error: any) {
        lastError = error;
        const errorMsg = error.message?.toLowerCase() || "";
        
        if (errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("exhausted")) {
          console.warn(`Quota exceeded for ${model} with key ${maskedKey}, trying next...`);
          continue;
        }
        
        if (errorMsg.includes("400") || errorMsg.includes("invalid") || errorMsg.includes("not found")) {
          console.warn(`Key ${maskedKey} or model ${model} is invalid: ${error.message}`);
          continue;
        }
        
        console.error(`Unexpected error with model ${model}:`, error.message);
      }
    }
  }
  
  throw lastError || new Error("All models and keys failed.");
}

async function sendNotification(db: any, message: string, severity: string) {
  const settingsRaw = db.prepare("SELECT value FROM settings WHERE key = 'alert_destinations'").get();
  if (settingsRaw) {
    const destinations = JSON.parse(settingsRaw.value);
    console.log(`[NOTIFICATION] [${severity.toUpperCase()}] ${message}`);
    
    if (destinations.email) {
      console.log(`[EMAIL] Attempting to send to ${destinations.email}: ${message}`);
      
      if (process.env.SMTP_HOST) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        try {
          await transporter.sendMail({
            from: process.env.SMTP_FROM || '"Social Dashboard" <alerts@example.com>',
            to: destinations.email,
            subject: `[CRITICAL ALERT] ${severity.toUpperCase()}: Social Dashboard`,
            text: message,
            html: `<div style="font-family: serif; padding: 20px; background: #f5f5f5; border-radius: 12px;">
                    <h2 style="color: #D4AF37;">Critical Social Alert</h2>
                    <p style="font-size: 16px; color: #333;">${message}</p>
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #999;">This is an automated alert from your Social Media Dashboard.</p>
                   </div>`,
          });
          console.log(`[EMAIL] Successfully sent to ${destinations.email}`);
        } catch (error) {
          console.error(`[EMAIL] Failed to send to ${destinations.email}:`, error);
        }
      } else {
        console.warn("[EMAIL] SMTP_HOST not configured, skipping real email send.");
      }
    }
    if (destinations.slack) {
      console.log(`[SLACK] Posting to ${destinations.slack}: ${message}`);
    }
    if (destinations.whatsapp) {
      console.log(`[WHATSAPP] Sending to ${destinations.whatsapp}: ${message}`);
    }
  }
}

export async function ingest(db: any = dbInstance) {
  console.log("Starting data ingestion...");
  
  const accounts = db.prepare("SELECT * FROM accounts WHERE status_tag = 'active'").all();
  
  for (const acc of accounts as any) {
    console.log(`Ingesting data for ${acc.handle} (${acc.platform})...`);
    
    try {
      let metrics: SocialMetrics | null = null;

      // 1. Attempt Real API Pulls
      if (acc.platform === 'Instagram' || acc.platform === 'Facebook') {
        metrics = await fetchMetaMetrics(acc.platform_account_id);
      } else if (acc.platform === 'YouTube') {
        metrics = await fetchYouTubeMetrics(acc.platform_account_id);
      }

      // 2. Fallback to Gemini if real API fails or is not configured
      if (!metrics) {
        console.log(`Real API pull failed or not configured for ${acc.handle}, falling back to Gemini...`);
        const prompt = `Provide realistic 7-day social media metrics for the account ${acc.handle} on ${acc.platform}. 
        Return ONLY a JSON object with these fields: posts_per_day_7d (float), avg_reach_7d (int), saves_7d (int), shares_7d (int), watch_time_7d (int), follower_delta_7d (int).
        Base it on the typical performance of such an account if you recognize it, otherwise provide realistic industry averages for that platform.`;
        
        const responseText = await generateWithFallback(prompt);
        metrics = JSON.parse(responseText);
      }

      if (metrics) {
        console.log(`Metrics for ${acc.handle}:`, JSON.stringify(metrics));
        // Calculate follower delta if we have a previous total_followers
        const prevMetric = db.prepare("SELECT total_followers FROM account_metrics WHERE account_id = ? ORDER BY timestamp DESC LIMIT 1").get(acc.id);
        if (prevMetric && (prevMetric as any).total_followers && metrics.total_followers) {
          metrics.follower_delta_7d = metrics.total_followers - (prevMetric as any).total_followers;
          console.log(`Calculated follower delta for ${acc.handle}: ${metrics.follower_delta_7d}`);
        }

        // Insert into account_metrics
        console.log(`Inserting metrics into database for ${acc.handle}...`);
        db.prepare(`
          INSERT INTO account_metrics (account_id, posts_per_day_7d, avg_reach_7d, saves_7d, shares_7d, watch_time_7d, follower_delta_7d, total_followers, likes_7d, dislikes_7d)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(acc.id, metrics.posts_per_day_7d, metrics.avg_reach_7d, metrics.saves_7d, metrics.shares_7d, metrics.watch_time_7d, metrics.follower_delta_7d, metrics.total_followers || null, metrics.likes_7d || 0, metrics.dislikes_7d || 0);
        
        // Update last_post_ts if we have posts
        if (metrics.posts_per_day_7d > 0) {
          db.prepare("UPDATE accounts SET last_post_ts = CURRENT_TIMESTAMP WHERE id = ?").run(acc.id);
        }
        console.log(`Successfully updated metrics for ${acc.handle}`);
      } else {
        console.warn(`No metrics generated for ${acc.handle}`);
      }
      
      // Check for alerts
      const settingsRaw = db.prepare("SELECT value FROM settings WHERE key = 'thresholds'").get();
      if (settingsRaw) {
        const thresholds = JSON.parse((settingsRaw as any).value);
        
        // Cadence check
        const lastPost = acc.last_post_ts ? new Date(acc.last_post_ts) : null;
        const now = new Date();
        if (lastPost && (now.getTime() - lastPost.getTime()) > thresholds.cadence_gap_hours * 60 * 60 * 1000) {
          const existing = db.prepare("SELECT 1 FROM alerts WHERE account_id = ? AND type = 'cadence_gap' AND status = 'pending'").get(acc.id);
          if (!existing) {
            const message = `Cadence gap detected for ${acc.handle}: No posts for over ${thresholds.cadence_gap_hours} hours.`;
            db.prepare(`
              INSERT INTO alerts (account_id, type, message, severity)
              VALUES (?, 'cadence_gap', ?, 'high')
            `).run(acc.id, message);
            await sendNotification(db, message, 'high');
          }
        }
        
        // Metric drop check (compare with previous if exists)
        if (metrics) {
          const prevMetric = db.prepare("SELECT * FROM account_metrics WHERE account_id = ? ORDER BY timestamp DESC LIMIT 1 OFFSET 1").get(acc.id);
          if (prevMetric && metrics.avg_reach_7d < (prevMetric as any).avg_reach_7d * (1 - thresholds.reach_drop / 100)) {
            const existing = db.prepare("SELECT 1 FROM alerts WHERE account_id = ? AND type = 'metric_drop' AND status = 'pending'").get(acc.id);
            if (!existing) {
              const message = `Significant reach drop detected for ${acc.handle}: ${metrics.avg_reach_7d} vs previous ${(prevMetric as any).avg_reach_7d}.`;
              db.prepare(`
                INSERT INTO alerts (account_id, type, message, severity)
                VALUES (?, 'metric_drop', ?, 'medium')
              `).run(acc.id, message);
              await sendNotification(db, message, 'medium');
            }
          }
        }
      }
      
      console.log(`Successfully ingested ${acc.handle}`);
    } catch (error) {
      console.error(`Failed to ingest ${acc.handle}:`, error);
    }
  }
  
  console.log("Ingestion complete.");
}

if (process.argv[1] && (process.argv[1].endsWith('ingest.ts') || process.argv[1].endsWith('ingest.js'))) {
  ingest().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
