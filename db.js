import { DatabaseSync } from "node:sqlite";

const dbPath = process.env.DB_FILE || "./maison-vera.db";
const db = new DatabaseSync(dbPath);

// Create tables if they do not exist yet
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    material TEXT NOT NULL,
    category TEXT NOT NULL,
    priceEur INTEGER NOT NULL,
    badge TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS orders (
    orderId TEXT PRIMARY KEY,
    itemsJson TEXT NOT NULL,
    currency TEXT NOT NULL,
    totalEur INTEGER NOT NULL,
    createdAt TEXT NOT NULL
  );
`);

// Seed initial catalog only if the products table is empty
const countRow = db.prepare("SELECT COUNT(*) AS count FROM products").get();

if (countRow.count === 0) {
  const insertProduct = db.prepare(`
    INSERT INTO products (id, code, title, material, category, priceEur, badge)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const initialProducts = [
    ["01", "01 / L'Arc Tote", "L'Arc Structured Tote", "Box Calfskin — Espresso", "totes", 1450, "New Arrival"],
    ["02", "02 / Solenne Clutch", "Solenne Fold Clutch", "Nappa Leather — Alabaster", "clutches", 890, ""],
    ["03", "03 / Véra Saddle", "Véra Mini Saddle", "Saddle Grain — Obsidian", "crossbody", 1180, ""],
    ["04", "04 / Céleste Crossbody", "Céleste Chain Crossbody", "Suede Calfskin — Cognac", "crossbody", 960, "Limited"],
  ];

  for (const product of initialProducts) {
    insertProduct.run(...product);
  }
  console.log("Seeded MAISON VÉRA SQLite database with initial catalog.");
}

export default db;