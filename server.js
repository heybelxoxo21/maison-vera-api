import express from "express";
import cors from "cors";
import db from "./db.js";
import { verifyAdminCredentials, signAdminToken, requireAdmin } from "./auth.js";

const app = express();
const PORT = process.env.PORT || 4000;

const allowedOrigins = [
  "http://localhost:5173",
  process.env.CORS_ORIGIN,
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
  })
);
app.use(express.json());

// Health check route
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", database: "sqlite-connected" });
});

// AUTH: Admin Login Endpoint
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!verifyAdminCredentials(email, password)) {
    return res.status(401).json({ error: "Invalid Atelier credentials." });
  }

  const token = signAdminToken(email);
  res.json({
    message: "Authenticated",
    token,
    email,
  });
});

// PUBLIC READ: GET all luxury products
app.get("/api/products", (req, res) => {
  const { category } = req.query;

  if (category && category !== "all") {
    const stmt = db.prepare("SELECT * FROM products WHERE category = ?");
    return res.json(stmt.all(category));
  }

  const products = db.prepare("SELECT * FROM products").all();
  res.json(products);
});

// PROTECTED CREATE: Add new luxury product (Admin only)
app.post("/api/products", requireAdmin, (req, res) => {
  const { code, title, material, category, priceEur, badge } = req.body;

  if (!title || !material || !category || !priceEur) {
    return res.status(400).json({ error: "Title, material, category, and price are required." });
  }

  const id = Date.now().toString().slice(-4);
  const formattedCode = code || `${id} / ${title.split(" ")[0]}`;
  const numericPrice = Number(priceEur);

  db.prepare(`
    INSERT INTO products (id, code, title, material, category, priceEur, badge)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, formattedCode, title, material, category, numericPrice, badge || "");

  const createdProduct = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
  res.status(201).json(createdProduct);
});

// PROTECTED UPDATE: Modify price or badge (Admin only)
app.put("/api/products/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { priceEur, badge } = req.body;

  const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
  if (!existing) {
    return res.status(404).json({ error: "Product not found." });
  }

  const updatedPrice = priceEur !== undefined ? Number(priceEur) : existing.priceEur;
  const updatedBadge = badge !== undefined ? badge : existing.badge;

  db.prepare("UPDATE products SET priceEur = ?, badge = ? WHERE id = ?").run(
    updatedPrice,
    updatedBadge,
    id
  );

  const updatedProduct = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
  res.json(updatedProduct);
});

// PROTECTED DELETE: Remove a product (Admin only)
app.delete("/api/products/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const result = db.prepare("DELETE FROM products WHERE id = ?").run(id);

  if (result.changes === 0) {
    return res.status(404).json({ error: "Product not found." });
  }

  res.json({ message: "Product removed from catalog", id });
});

// PROTECTED READ: View all customer orders (Admin only)
app.get("/api/orders", requireAdmin, (req, res) => {
  const rows = db.prepare("SELECT * FROM orders ORDER BY createdAt DESC").all();
  const formattedOrders = rows.map((row) => ({
    ...row,
    items: JSON.parse(row.itemsJson),
  }));
  res.json(formattedOrders);
});

// PUBLIC CREATE: Customer checkout order
app.post("/api/orders", (req, res) => {
  const { items, currency } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Shopping bag cannot be empty." });
  }

  const totalEur = items.reduce((sum, item) => sum + item.priceEur, 0);
  const newOrder = {
    orderId: `MV-${Date.now().toString().slice(-6)}`,
    items,
    currency: currency || "EUR",
    totalEur,
    createdAt: new Date().toISOString(),
  };

  db.prepare(`
    INSERT INTO orders (orderId, itemsJson, currency, totalEur, createdAt)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    newOrder.orderId,
    JSON.stringify(newOrder.items),
    newOrder.currency,
    newOrder.totalEur,
    newOrder.createdAt
  );

  res.status(201).json({
    message: "Private order confirmed",
    order: newOrder,
  });
});

app.listen(PORT, () => {
  console.log(`MAISON VÉRA API running at http://localhost:${PORT}`);
});