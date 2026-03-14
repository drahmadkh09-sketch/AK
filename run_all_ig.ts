import Database from "better-sqlite3";
import axios from "axios";
import { getInstagramBusinessIdFromToken, resolveInstagramHandle, fetchMetaMetrics } from "./src/services/socialApi";
import dotenv from "dotenv";

dotenv.config({ override: true });

const db = new Database("dashboard.db");

async function runAll() {
  const metaToken = "EAAKZBgsx5Ei0BQ2IcpI1ifSt8lkFsJhYNwladJxsU4Gn2uxFUr8qvxAbJWCbZAexacz4FpUUPHiBKPJZCDqE8jkxmsFqo43cFKn4Pcy1aicCd4HD1JkzC5VkDrQ2cmXR9zm9gZAO5cjIAwuMkdJtLmEMkHbJgz7mpdqXZAV3ZCpSGvr1LRE8gZAwZAAwJbPVCOZA30ttyWXoGaJF0ZABurt1woSzpNxkZCuUjZBXNRye0mMBoMHK1gzqIaY8lpKNygbsrSkF1Q3OCrK8UdNt1pystkkeKmx5";

  const keysSetting = db.prepare("SELECT value FROM settings WHERE key = 'api_keys'").get() as any;
  let keys = {};
  if (keysSetting) {
    keys = JSON.parse(keysSetting.value);
  }

  keys.meta = metaToken;
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run('api_keys', JSON.stringify(keys));
  console.log("Meta token updated.");

  const token = metaToken;
  console.log("Testing Meta Token...");
  
  try {
    const meRes = await axios.get(`https://graph.facebook.com/v21.0/me`, {
      params: { access_token: token, fields: 'id,name' }
    });
    console.log("User info:", JSON.stringify(meRes.data, null, 2));

    const pagesRes = await axios.get(`https://graph.facebook.com/v21.0/me/accounts`, {
      params: { access_token: token }
    });
    console.log("Pages found:", JSON.stringify(pagesRes.data.data, null, 2));
    
    const businessId = await getInstagramBusinessIdFromToken(token);
    if (!businessId) {
      console.error("Could not find an Instagram Business Account ID associated with this token.");
      return;
    }

    console.log(`Found Requester Business ID: ${businessId}`);

    const accounts = db.prepare("SELECT * FROM accounts WHERE platform = 'Instagram'").all() as any[];
    
    for (const acc of accounts) {
      console.log(`Resolving handle: ${acc.handle}...`);
      const resolvedId = await resolveInstagramHandle(acc.handle, businessId, token);
      
      if (resolvedId) {
        console.log(`Successfully resolved ${acc.handle} to ${resolvedId}`);
        db.prepare("UPDATE accounts SET platform_account_id = ? WHERE id = ?").run(resolvedId, acc.id);
        
        console.log(`Fetching metrics for ${acc.handle}...`);
        const metrics = await fetchMetaMetrics(resolvedId, token);
        if (metrics) {
          console.log(`Metrics for ${acc.handle}:`, JSON.stringify(metrics));
        }
      } else {
        console.log(`Failed to resolve handle: ${acc.handle}`);
      }
    }
  } catch (error: any) {
    console.error("Error:", error.response?.data || error.message);
  }
}

runAll().then(() => console.log("Done."));
