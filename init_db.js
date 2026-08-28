import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const dbPath = path.resolve('recovery.db');
const db = new DatabaseSync(dbPath);

console.log('⚡ Initializing High-Performance Multi-Tenant SQLite Database at:', dbPath);

// Enable WAL mode & performance tuning
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA cache_size = -64000;
  PRAGMA foreign_keys = OFF;
`);

// Migration helper
function addColumnIfNotExists(table, column, typeDef) {
  try {
    const tableInfo = db.prepare(`PRAGMA table_info(${table})`).all();
    const hasCol = tableInfo.some(c => c.name === column);
    if (tableInfo.length > 0 && !hasCol) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${typeDef};`);
      console.log(`Migrated ${table}: added column ${column}`);
    }
  } catch (err) {
    console.warn(`Migration notice for ${table}.${column}:`, err.message);
  }
}

// 1. Merchants Table
db.exec(`
  CREATE TABLE IF NOT EXISTS merchants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    webhook_secret TEXT NOT NULL,
    max_discount_cap REAL DEFAULT 10.0,
    currency TEXT DEFAULT 'INR',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// 2. Transactions Table
db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL DEFAULT 'mid_acme_india',
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'INR',
    status TEXT NOT NULL,
    failure_code TEXT,
    failure_reason TEXT,
    payment_method TEXT,
    risk_score REAL DEFAULT 0.0,
    recovery_link TEXT,
    discount_applied REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    recovered_at DATETIME
  );
`);
addColumnIfNotExists('transactions', 'merchant_id', "TEXT NOT NULL DEFAULT 'mid_acme_india'");
addColumnIfNotExists('transactions', 'recovery_link', 'TEXT');
addColumnIfNotExists('transactions', 'discount_applied', 'REAL DEFAULT 0.0');

// 3. Processed Events Table (Idempotency)
db.exec(`
  CREATE TABLE IF NOT EXISTS processed_events (
    event_id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL DEFAULT 'mid_acme_india',
    event_type TEXT NOT NULL,
    payload_hash TEXT NOT NULL,
    status TEXT DEFAULT 'processed',
    processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// 4. Recovery Logs Table
db.exec(`
  CREATE TABLE IF NOT EXISTS recovery_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_id TEXT NOT NULL DEFAULT 'mid_acme_india',
    transaction_id TEXT NOT NULL,
    channel TEXT NOT NULL,
    nudge_step INTEGER DEFAULT 1,
    discount_offered REAL DEFAULT 0.0,
    message_content TEXT,
    delivery_status TEXT DEFAULT 'sent',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
addColumnIfNotExists('recovery_logs', 'merchant_id', "TEXT NOT NULL DEFAULT 'mid_acme_india'");

// 5. Customer Profiles Table
db.exec(`
  CREATE TABLE IF NOT EXISTS customer_profiles (
    phone TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL DEFAULT 'mid_acme_india',
    name TEXT,
    email TEXT,
    opted_out INTEGER DEFAULT 0,
    preferred_channel TEXT DEFAULT 'whatsapp',
    preferred_payment_method TEXT DEFAULT 'upi',
    total_recovered_revenue REAL DEFAULT 0.0,
    loyalty_tier TEXT DEFAULT 'Standard',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
addColumnIfNotExists('customer_profiles', 'merchant_id', "TEXT NOT NULL DEFAULT 'mid_acme_india'");
addColumnIfNotExists('customer_profiles', 'opted_out', 'INTEGER DEFAULT 0');
addColumnIfNotExists('customer_profiles', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');

// 6. Audit Logs Table
db.exec(`
  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_id TEXT NOT NULL DEFAULT 'mid_acme_india',
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Create Indexes
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_tx_merchant_status ON transactions(merchant_id, status);
  CREATE INDEX IF NOT EXISTS idx_tx_created_at ON transactions(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_processed_events_time ON processed_events(processed_at);
`);

// Seed Default Merchant
const insertMerchant = db.prepare(`
  INSERT OR REPLACE INTO merchants (id, name, email, webhook_secret, max_discount_cap, currency)
  VALUES (?, ?, ?, ?, ?, ?)
`);

insertMerchant.run(
  'mid_acme_india',
  'Acme India Corp',
  'billing@acmeindia.com',
  'whsec_live_razor_test_key_991823',
  10.0,
  'INR'
);

// Check if transactions exist, else seed
const countQuery = db.prepare('SELECT count(*) as count FROM transactions');
const countResult = countQuery.get();

if (countResult.count === 0) {
  const insertTx = db.prepare(`
    INSERT INTO transactions (id, merchant_id, customer_name, customer_email, customer_phone, amount, currency, status, failure_code, failure_reason, payment_method, risk_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const initialTxs = [
    ['pay_rec_1001', 'mid_acme_india', 'Rahul Sharma', 'rahul@example.com', '+919876543210', 4499.00, 'INR', 'failed', 'BAD_REQUEST_AUTHENTICATION_FAILED', '3D Secure OTP verification timed out on customer device', 'credit_card', 0.22],
    ['pay_rec_1002', 'mid_acme_india', 'Pooja Verma', 'pooja@example.com', '+919876543211', 12999.00, 'INR', 'recovered', 'GATEWAY_ERROR', 'Bank gateway timeout during high load', 'upi', 0.15],
    ['pay_rec_1003', 'mid_acme_india', 'Vikram Malhotra', 'vikram@example.com', '+919876543212', 2450.00, 'INR', 'recovering', 'INSUFFICIENT_FUNDS', 'Debit card declined due to insufficient balance', 'debit_card', 0.45],
    ['pay_rec_1004', 'mid_acme_india', 'Ananya Iyer', 'ananya@example.com', '+919876543213', 8990.00, 'INR', 'failed', 'CARD_EXPIRED', 'Customer card expiration date reached', 'credit_card', 0.10],
    ['pay_rec_1005', 'mid_acme_india', 'Siddharth Rao', 'siddharth@example.com', '+919876543214', 18500.00, 'INR', 'recovering', 'UPI_LIMIT_EXCEEDED', 'Daily transaction limit exceeded for customer VPA', 'upi', 0.35]
  ];

  for (const tx of initialTxs) {
    insertTx.run(...tx);
  }

  const insertProfile = db.prepare(`
    INSERT OR REPLACE INTO customer_profiles (phone, merchant_id, name, email, preferred_channel, preferred_payment_method, total_recovered_revenue, loyalty_tier)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertProfile.run('+919876543210', 'mid_acme_india', 'Rahul Sharma', 'rahul@example.com', 'whatsapp', 'upi', 4499.00, 'Gold');
  insertProfile.run('+919876543211', 'mid_acme_india', 'Pooja Verma', 'pooja@example.com', 'whatsapp', 'upi', 12999.00, 'Platinum');

  console.log('✅ Seeded SQLite database with initial multi-tenant recovery records.');
}

console.log('🚀 Multi-Tenant Database initialized successfully with WAL Mode.');
db.close();
