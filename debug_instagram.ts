import Database from "better-sqlite3";
import axios from "axios";
import { getInstagramBusinessIdFromToken, resolveInstagramHandle, fetchMetaMetrics } from "./src/services/socialApi";
import dotenv from "dotenv";

dotenv.config({ override: true });

const db = new Database("dashboard.db");

async function debugInstagram() {
  const keysSetting = db.prepare("SELECT value FROM settings WHERE key = 'api_keys'").get() as any;
  const apiKeys = keysSetting ? JSON.parse(keysSetting.value) : {};
  const token = apiKeys.meta;

  if (!token) {
    console.error("No Meta token found in settings.");
    return;
  }

  console.log("Testing Meta Token...");
  
  try {
    const pagesRes = await axios.get(`https://graph.facebook.com/v21.0/me/accounts`, {
      params: { access_token: token }
    });
    console.log("Pages found:", JSON.stringify(pagesRes.data.data, null, 2));
    
    const businessId = await getInstagramBusinessIdFromToken(token);
    if (!businessId) {
      console.error("Could not find an Instagram Business Account ID associated with this token.");
      console.log("Please ensure:");
      console.log("1. The token has 'pages_show_list', 'instagram_basic', and 'ads_management' permissions.");
      console.log("2. The Facebook Page is linked to an Instagram Business Account.");
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
        } else {
          console.log(`Failed to fetch metrics for ${acc.handle}`);
        }
      } else {
        console.log(`Failed to resolve handle: ${acc.handle}`);
      }
    }
  } catch (error: any) {
    console.error("Error during Instagram debug:", error.response?.data || error.message);
  }
}

debugInstagram().then(() => console.log("Done."));
