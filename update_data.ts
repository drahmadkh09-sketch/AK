import Database from "better-sqlite3";

const db = new Database("dashboard.db");

// Update API Keys
const keys = {
  gemini: "", // Keep existing if any
  youtube: "AIzaSyBbUYbLchB-Z-WnGOTvqZlPpGPMuE9LNwU",
  meta: "EAAKZBgsx5Ei0BQ2IcpI1ifSt8lkFsJhYNwladJxsU4Gn2uxFUr8qvxAbJWCbZAexacz4FpUUPHiBKPJZCDqE8jkxmsFqo43cFKn4Pcy1aicCd4HD1JkzC5VkDrQ2cmXR9zm9gZAO5cjIAwuMkdJtLmEMkHbJgz7mpdqXZAV3ZCpSGvr1LRE8gZAwZAAwJbPVCOZA30ttyWXoGaJF0ZABurt1woSzpNxkZCuUjZBXNRye0mMBoMHK1gzqIaY8lpKNygbsrSkF1Q3OCrK8UdNt1pystkkeKmx5"
};

const existingKeysRaw = db.prepare("SELECT value FROM settings WHERE key = 'api_keys'").get() as any;
let existingKeys = {};
if (existingKeysRaw) {
  existingKeys = JSON.parse(existingKeysRaw.value);
}

const newKeys = { ...existingKeys, ...keys };
db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run('api_keys', JSON.stringify(newKeys));

console.log("API Keys updated.");

// Add Accounts
const handles = [
  "@avemariaradio",
  "@dr.rayguarendi",
  "@dynamicdeacon",
  "@drmarcuspeter",
  "@livingbreadradio",
  "@yeabut40",
  "@trad_west_",
  "@cameron_riecker"
];

const insertAccount = db.prepare(`
  INSERT INTO accounts (platform, handle, status_tag, priority_level)
  VALUES (?, ?, 'active', 'high')
`);

for (const handle of handles) {
  // Check if exists
  const exists = db.prepare("SELECT 1 FROM accounts WHERE handle = ? AND platform = 'YouTube'").get(handle);
  if (!exists) {
    insertAccount.run('YouTube', handle);
    console.log(`Added YouTube account: ${handle}`);
  } else {
    console.log(`YouTube account ${handle} already exists.`);
  }
  
  // Also add as Instagram just in case, or maybe the user wants them as Instagram?
  // Usually these are cross-platform. I'll add them as Instagram too if they don't exist.
  const existsIG = db.prepare("SELECT 1 FROM accounts WHERE handle = ? AND platform = 'Instagram'").get(handle);
  if (!existsIG) {
    insertAccount.run('Instagram', handle);
    console.log(`Added Instagram account: ${handle}`);
  }
}

console.log("Accounts added.");
