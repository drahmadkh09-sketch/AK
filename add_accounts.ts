import Database from "better-sqlite3";

const db = new Database("dashboard.db");

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

const platforms = ["YouTube", "Instagram"];

for (const handle of handles) {
  for (const platform of platforms) {
    // Check if exists
    const existing = db.prepare("SELECT id FROM accounts WHERE handle = ? AND platform = ?").get(handle, platform);
    if (!existing) {
      db.prepare(`
        INSERT INTO accounts (platform, handle, pod_owner, backup_owner, status_tag, priority_level)
        VALUES (?, ?, 'System', 'Admin', 'active', 'medium')
      `).run(platform, handle);
      console.log(`Added ${handle} on ${platform}`);
    } else {
      console.log(`${handle} on ${platform} already exists`);
    }
  }
}

console.log("Finished adding accounts.");
