import Database from "better-sqlite3";
const db = new Database("dashboard.db");

const metaToken = "EAAKZBgsx5Ei0BQ2IcpI1ifSt8lkFsJhYNwladJxsU4Gn2uxFUr8qvxAbJWCbZAexacz4FpUUPHiBKPJZCDqE8jkxmsFqo43cFKn4Pcy1aicCd4HD1JkzC5VkDrQ2cmXR9zm9gZAO5cjIAwuMkdJtLmEMkHbJgz7mpdqXZAV3ZCpSGvr1LRE8gZAwZAAwJbPVCOZA30ttyWXoGaJF0ZABurt1woSzpNxkZCuUjZBXNRye0mMBoMHK1gzqIaY8lpKNygbsrSkF1Q3OCrK8UdNt1pystkkeKmx5";

const keysSetting = db.prepare("SELECT value FROM settings WHERE key = 'api_keys'").get() as any;
let keys: any = {};
if (keysSetting) {
  keys = JSON.parse(keysSetting.value);
}

keys.meta = metaToken;
db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run('api_keys', JSON.stringify(keys));

console.log("Meta token updated in database.");
