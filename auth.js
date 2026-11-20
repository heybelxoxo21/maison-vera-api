import crypto from "node:crypto";
import jwt from "jsonwebtoken";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "atelier@maisonvera.com";
const RAW_PASSWORD = process.env.ADMIN_PASSWORD || "VeraAtelier2026!";
const JWT_SECRET = process.env.JWT_SECRET || "fallback_dev_secret";

// Hash the configured admin password on server startup with a random salt
const SALT = crypto.randomBytes(16).toString("hex");
const STORED_HASH = crypto.scryptSync(RAW_PASSWORD, SALT, 64);

export function verifyAdminCredentials(email, password) {
  if (!email || !password) return false;
  if (email.toLowerCase().trim() !== ADMIN_EMAIL.toLowerCase()) return false;

  const inputHash = crypto.scryptSync(password, SALT, 64);
  return crypto.timingSafeEqual(STORED_HASH, inputHash);
}

export function signAdminToken(email) {
  return jwt.sign({ email, role: "admin" }, JWT_SECRET, { expiresIn: "4h" });
}

// Express middleware to protect admin-only routes
export function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Admin authentication required." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Session expired or invalid token. Please log in again." });
  }
}