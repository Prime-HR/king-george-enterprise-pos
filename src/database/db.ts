import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('king_george_pos.db');

export function initializeDatabase(): void {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      unit_price REAL NOT NULL,
      cost_price REAL NOT NULL DEFAULT 0,
      stock_quantity REAL NOT NULL DEFAULT 0,
      category TEXT NOT NULL DEFAULT 'Pieces',
      low_stock_threshold REAL NOT NULL DEFAULT 5,
      sku TEXT,
      image_uri TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT,
      phone_number TEXT,
      receipt_date TEXT NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      amount_paid REAL NOT NULL DEFAULT 0,
      balance_due REAL NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'Cash',
      momo_ref TEXT,
      storage_status TEXT NOT NULL DEFAULT 'delivered',
      storage_notes TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER,
      item_name TEXT NOT NULL,
      unit_price REAL NOT NULL,
      cost_price REAL NOT NULL DEFAULT 0,
      quantity REAL NOT NULL,
      total_price REAL NOT NULL,
      category TEXT NOT NULL DEFAULT 'Pieces',
      FOREIGN KEY (sale_id) REFERENCES sales(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS debt_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      customer_name TEXT,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'Cash',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (sale_id) REFERENCES sales(id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL DEFAULT 'Other',
      payment_method TEXT NOT NULL DEFAULT 'Cash',
      notes TEXT,
      expense_date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Migrations
  try { db.runSync("ALTER TABLE sales ADD COLUMN storage_status TEXT NOT NULL DEFAULT 'delivered'"); } catch (e) {}
  try { db.runSync("ALTER TABLE sales ADD COLUMN storage_notes TEXT"); } catch (e) {}
  try { db.runSync("ALTER TABLE sales ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'Cash'"); } catch (e) {}
  try { db.runSync("ALTER TABLE sales ADD COLUMN momo_ref TEXT"); } catch (e) {}
  try { db.runSync("ALTER TABLE products ADD COLUMN cost_price REAL NOT NULL DEFAULT 0"); } catch (e) {}
  try { db.runSync("ALTER TABLE products ADD COLUMN sku TEXT"); } catch (e) {}
  try { db.runSync("ALTER TABLE sale_items ADD COLUMN cost_price REAL NOT NULL DEFAULT 0"); } catch (e) {}

  // Default settings
  try {
    const pin = db.getFirstSync<{ value: string }>("SELECT value FROM settings WHERE key = 'admin_pin'");
    if (!pin) {
      db.runSync("INSERT OR REPLACE INTO settings (key, value) VALUES ('admin_pin', '1234')");
      db.runSync("INSERT OR REPLACE INTO settings (key, value) VALUES ('momo_number', '0548809611')");
      db.runSync("INSERT OR REPLACE INTO settings (key, value) VALUES ('momo_name', 'GEORGE GYAMFI')");
      db.runSync("INSERT OR REPLACE INTO settings (key, value) VALUES ('shop_phone', '0548809611')");
      db.runSync("INSERT OR REPLACE INTO settings (key, value) VALUES ('shop_email', 'gyamfigeorge9990@gmail.com')");
      db.runSync("INSERT OR REPLACE INTO settings (key, value) VALUES ('shop_location', 'Juaben Adumasa')");
    }
  } catch (e) {}

  // Pre-seed common retail general merchandise
  try {
    const row = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM products');
    if (!row || row.count === 0) {
      // [name, unit_price, cost_price, stock, category, threshold, sku]
      const sampleGoods: [string, number, number, number, string, number, string][] = [
        ['Royal Aroma Fragrant Rice 25kg', 520.0, 470.0, 40, 'Bags', 5, 'KG-101'],
        ['Gino Pure Vegetable Oil 25L', 680.0, 620.0, 25, 'Gallons', 4, 'KG-102'],
        ['St. Louis Cube Sugar Carton (50 boxes)', 480.0, 430.0, 30, 'Cartons', 5, 'KG-103'],
        ['Ideal Evaporated Milk Crate (48 tins)', 290.0, 260.0, 50, 'Crates', 8, 'KG-104'],
        ['Milo Tin Refill Pack 400g', 45.0, 38.0, 80, 'Packs', 15, 'KG-105'],
        ['Voltic Mineral Water 500ml (Pack of 16)', 35.0, 28.0, 100, 'Packs', 20, 'KG-106'],
        ['Frytol Premium Cooking Oil 5L', 140.0, 120.0, 35, 'Gallons', 6, 'KG-107'],
        ['Geisha Soap Herbal Green Carton (48 pcs)', 220.0, 190.0, 30, 'Cartons', 5, 'KG-108'],
        ['Omo Multi-Active Detergent 1kg', 28.0, 22.0, 75, 'Packs', 15, 'KG-109'],
        ['Tasty Tom Tomato Paste Carton (50 sachets)', 180.0, 155.0, 40, 'Cartons', 8, 'KG-110'],
        ['Key Soap Bar Long (1 piece)', 18.0, 14.0, 120, 'Pieces', 25, 'KG-111'],
        ['Malta Guinness Crate (24 bottles)', 190.0, 165.0, 30, 'Crates', 5, 'KG-112'],
        ['Spaghetti Gino Carton (20 packs)', 160.0, 140.0, 45, 'Cartons', 8, 'KG-113'],
        ['Gari White (50kg Bag)', 380.0, 330.0, 20, 'Bags', 4, 'KG-114'],
        ['Sunlight Dishwashing Liquid 750ml', 32.0, 26.0, 60, 'Pieces', 10, 'KG-115'],
      ];
      for (const [name, price, cost, stock, cat, thresh, sku] of sampleGoods) {
        db.runSync(
          'INSERT INTO products (name, unit_price, cost_price, stock_quantity, category, low_stock_threshold, sku) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [name, price, cost, stock, cat, thresh, sku]
        );
      }
    }
  } catch (e) {}
}

export { db };
