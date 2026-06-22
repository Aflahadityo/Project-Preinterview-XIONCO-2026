const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
let pool;
let isMock = false;

// Mock database store for demo mode
const mockDb = {
  categories: [
    { id: 1, name: 'SEATS', created_at: new Date() },
    { id: 2, name: 'TABLE', created_at: new Date() },
    { id: 3, name: 'BEDFRAME', created_at: new Date() },
    { id: 4, name: 'CABINET', created_at: new Date() },
    { id: 5, name: 'DECOR', created_at: new Date() }
  ],
  products: [
    { id: 1, name: 'Cameo Accent Chair', category: 'SEATS', price: 2450000, created_at: new Date() },
    { id: 2, name: 'Canis Minimalist Sofa', category: 'SEATS', price: 5800000, created_at: new Date() },
    { id: 3, name: 'Cubix Pouf Ottoman', category: 'SEATS', price: 850000, created_at: new Date() },
    { id: 4, name: 'Eorde Lounge Chair', category: 'SEATS', price: 3200000, created_at: new Date() },
    { id: 5, name: 'Qaztac Nightstand Nakas', category: 'TABLE', price: 1500000, created_at: new Date() },
    { id: 6, name: 'Cubix Coffee Table', category: 'TABLE', price: 2100000, created_at: new Date() },
    { id: 7, name: 'Geom Dining Table', category: 'TABLE', price: 4500000, created_at: new Date() },
    { id: 8, name: 'Nexus Bed Frame', category: 'BEDFRAME', price: 6500000, created_at: new Date() },
    { id: 9, name: 'Kross Credenza Cabinet', category: 'CABINET', price: 3800000, created_at: new Date() },
    { id: 10, name: 'Aura Geometric Mirror', category: 'DECOR', price: 1200000, created_at: new Date() }
  ],
  product_stocks: [
    { id: 1, product_id: 1, quantity: 10, updated_at: new Date() },
    { id: 2, product_id: 2, quantity: 8, updated_at: new Date() },
    { id: 3, product_id: 3, quantity: 15, updated_at: new Date() },
    { id: 4, product_id: 4, quantity: 5, updated_at: new Date() },
    { id: 5, product_id: 5, quantity: 12, updated_at: new Date() },
    { id: 6, product_id: 6, quantity: 10, updated_at: new Date() },
    { id: 7, product_id: 7, quantity: 4, updated_at: new Date() },
    { id: 8, product_id: 8, quantity: 7, updated_at: new Date() },
    { id: 9, product_id: 9, quantity: 9, updated_at: new Date() },
    { id: 10, product_id: 10, quantity: 11, updated_at: new Date() }
  ],
  purchases: [
    { id: 1, product_id: 1, quantity: 2, total_price: 4900000, status: 'active', notes: 'Pesanan hotel lounge', purchased_at: new Date(Date.now() - 4 * 24 * 3600 * 1000) },
    { id: 2, product_id: 5, quantity: 1, total_price: 1500000, status: 'active', notes: 'Nakas kamar utama', purchased_at: new Date(Date.now() - 3 * 24 * 3600 * 1000) },
    { id: 3, product_id: 3, quantity: 4, total_price: 3400000, status: 'active', notes: 'Beli paket coffee shop', purchased_at: new Date(Date.now() - 2 * 24 * 3600 * 1000) },
    { id: 4, product_id: 6, quantity: 1, total_price: 2100000, status: 'cancelled', notes: 'Batal karena salah ukuran', purchased_at: new Date(Date.now() - 1 * 24 * 3600 * 1000), cancelled_at: new Date() },
    { id: 5, product_id: 2, quantity: 1, total_price: 5800000, status: 'active', notes: 'Sofa ruang tamu', purchased_at: new Date(Date.now() - 12 * 3600 * 1000) }
  ],
  admins: [
    { id: 1, username: 'admin', password: 'admin', role: 'admin' },
    { id: 2, username: 'superadmin', password: 'superadmin', role: 'super_admin' }
  ],
  settings: [
    { key: 'ai_provider', value: 'gemini' },
    { key: 'ai_model', value: 'gemini-2.5-flash' },
    { key: 'system_prompt', value: 'Kamu adalah asisten AI dari XIONCO yang ramah, sopan, dan profesional. Bantu menjawab pertanyaan pengguna tentang furnitur atau topik umum lainnya dalam Bahasa Indonesia secara ringkas dan informatif.' }
  ]
};

// Check if database URL is provided and valid
if (!connectionString || (connectionString.includes('localhost') && !process.env.PGHOST)) {
  isMock = true;
  console.log('\n======================================================');
  console.log('⚠️  DATABASE_URL is not set or points to localhost.');
  console.log('👉  Starting application in In-Memory DEMO MODE.');
  console.log('👉  SQLite / PostgreSQL is bypassed. Enjoy the mock data!');
  console.log('======================================================\n');
} else {
  try {
    pool = new Pool({
      connectionString: connectionString,
      ssl: connectionString.includes('127.0.0.1')
        ? false
        : { rejectUnauthorized: false }
    });
  } catch (err) {
    console.error('Failed to initialize PostgreSQL pool. Falling back to DEMO MODE:', err.message);
    isMock = true;
  }
}

// In-Memory Query Engine
async function mockQuery(text, params = []) {
  const sql = text.trim().replace(/\s+/g, ' ');

  // 1. SELECT * FROM admins WHERE username = $1 AND password = $2
  if (sql.includes('FROM admins WHERE username =') || sql.includes('FROM admins WHERE username = $1')) {
    const username = params[0];
    const password = params[1];
    const user = mockDb.admins.find(u => u.username === username && u.password === password);
    return { rows: user ? [user] : [] };
  }

  // 2. SELECT * FROM categories
  if (sql.includes('FROM categories')) {
    if (sql.includes('WHERE name =')) {
      const name = params[0];
      const cat = mockDb.categories.find(c => c.name === name);
      return { rows: cat ? [cat] : [] };
    }
    return { rows: [...mockDb.categories].sort((a, b) => a.name.localeCompare(b.name)) };
  }

  // 3. INSERT INTO categories
  if (sql.includes('INSERT INTO categories')) {
    const name = params[0];
    const id = mockDb.categories.length + 1;
    const newCat = { id, name, created_at: new Date() };
    mockDb.categories.push(newCat);
    return { rows: [newCat] };
  }

  // 4. SELECT p.*, s.quantity FROM products
  if (sql.includes('FROM products p LEFT JOIN product_stocks s') || sql.includes('FROM products p JOIN product_stocks s')) {
    const rows = mockDb.products.map(p => {
      const stock = mockDb.product_stocks.find(s => s.product_id === p.id);
      return {
        ...p,
        quantity: stock ? stock.quantity : 0
      };
    }).sort((a, b) => b.id - a.id);
    return { rows };
  }

  // 4b. SELECT p.name, p.category, p.price, COALESCE(ps.quantity, 0) as quantity FROM products p LEFT JOIN product_stocks ps
  if (sql.includes('FROM products p LEFT JOIN product_stocks ps')) {
    let rows = mockDb.products.map(p => {
      const stock = mockDb.product_stocks.find(s => s.product_id === p.id);
      return {
        name: p.name,
        category: p.category,
        price: p.price,
        quantity: stock ? stock.quantity : 0
      };
    });

    // Handle WHERE clause with LIKE
    if (sql.includes('WHERE') && sql.includes('LIKE')) {
      const searchTerm = params[0].replace(/%/g, '').toLowerCase();
      rows = rows.filter(p =>
        p.name.toLowerCase().includes(searchTerm) ||
        p.category.toLowerCase().includes(searchTerm)
      );
    }

    // Handle ORDER BY
    if (sql.includes('ORDER BY p.category, p.name')) {
      rows.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    }

    return { rows };
  }

  // 5. INSERT INTO products
  if (sql.includes('INSERT INTO products')) {
    const name = params[0];
    const category = params[1];
    const price = Number(params[2]);
    const id = mockDb.products.length + 1;
    const newProduct = { id, name, category, price, created_at: new Date() };
    mockDb.products.push(newProduct);
    return { rows: [newProduct] };
  }

  // 6. INSERT INTO product_stocks
  if (sql.includes('INSERT INTO product_stocks')) {
    const product_id = Number(params[0]);
    const quantity = Number(params[1]);
    const id = mockDb.product_stocks.length + 1;
    const newStock = { id, product_id, quantity, updated_at: new Date() };
    mockDb.product_stocks.push(newStock);
    return { rows: [newStock] };
  }

  // 7. UPDATE product_stocks SET quantity = quantity + $1 WHERE product_id = $2
  if (sql.includes('SET quantity = quantity +')) {
    const addQty = Number(params[0]);
    const productId = Number(params[1]);
    const stock = mockDb.product_stocks.find(s => s.product_id === productId);
    if (stock) {
      stock.quantity += addQty;
      stock.updated_at = new Date();
    }
    return { rows: stock ? [stock] : [] };
  }

  // 8. UPDATE product_stocks SET quantity = quantity - $1 WHERE product_id = $2
  if (sql.includes('SET quantity = quantity -')) {
    const subQty = Number(params[0]);
    const productId = Number(params[1]);
    const stock = mockDb.product_stocks.find(s => s.product_id === productId);
    if (stock) {
      stock.quantity -= subQty;
      stock.updated_at = new Date();
    }
    return { rows: stock ? [stock] : [] };
  }

  // 9. Dashboard Queries
  if (sql === 'SELECT COUNT(*)::int AS count FROM products') {
    return { rows: [{ count: mockDb.products.length }] };
  }
  if (sql === "SELECT COUNT(*)::int AS count FROM purchases WHERE status = 'active'") {
    const count = mockDb.purchases.filter(p => p.status === 'active').length;
    return { rows: [{ count }] };
  }
  if (sql === "SELECT COUNT(*)::int AS count FROM purchases WHERE status = 'cancelled'") {
    const count = mockDb.purchases.filter(p => p.status === 'cancelled').length;
    return { rows: [{ count }] };
  }
  if (sql === "SELECT SUM(total_price) AS sum FROM purchases WHERE status = 'active'") {
    const sum = mockDb.purchases.filter(p => p.status === 'active').reduce((acc, p) => acc + p.total_price, 0);
    return { rows: [{ sum }] };
  }
  if (sql.includes('SUM(s.quantity)::int AS quantity') && sql.includes('GROUP BY p.category')) {
    const catMap = {};
    mockDb.products.forEach(p => {
      const stock = mockDb.product_stocks.find(s => s.product_id === p.id);
      const qty = stock ? stock.quantity : 0;
      catMap[p.category] = (catMap[p.category] || 0) + qty;
    });
    const rows = Object.entries(catMap).map(([category, quantity]) => ({ category, quantity }));
    return { rows };
  }
  if (sql.includes('SELECT DATE(purchased_at)')) {
    const rows = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 3600 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      const sum = mockDb.purchases
        .filter(p => p.status === 'active' && p.purchased_at.toISOString().split('T')[0] === dateStr)
        .reduce((acc, p) => acc + p.total_price, 0);
      rows.push({ date: dateStr, revenue: sum });
    }
    return { rows };
  }
  if (sql.includes('ORDER BY pur.purchased_at DESC LIMIT 5')) {
    const rows = mockDb.purchases
      .filter(pur => pur.status === 'active')
      .map(pur => {
        const prod = mockDb.products.find(p => p.id === pur.product_id);
        return {
          product_name: prod ? prod.name : 'Unknown',
          quantity: pur.quantity,
          total_price: pur.total_price,
          purchased_at: pur.purchased_at
        };
      })
      .sort((a, b) => b.purchased_at - a.purchased_at)
      .slice(0, 5);
    return { rows };
  }

  // 10. Purchases Queries
  if (sql.includes('FROM purchases pur JOIN products p')) {
    let list = mockDb.purchases;
    if (params.length > 0) {
      const statusFilter = params[0];
      list = list.filter(p => p.status === statusFilter);
    }
    const rows = list.map(pur => {
      const prod = mockDb.products.find(p => p.id === pur.product_id);
      return {
        ...pur,
        product_name: prod ? prod.name : 'Unknown',
        product_price: prod ? prod.price : 0
      };
    }).sort((a, b) => b.id - a.id);
    return { rows };
  }

  // 11. Transactional Info Queries
  if (sql.includes('SELECT price FROM products WHERE id =')) {
    const id = Number(params[0]);
    const prod = mockDb.products.find(p => p.id === id);
    return { rows: prod ? [{ price: prod.price }] : [] };
  }
  if (sql.includes('SELECT quantity FROM product_stocks WHERE product_id =')) {
    const id = Number(params[0]);
    const stock = mockDb.product_stocks.find(s => s.product_id === id);
    return { rows: stock ? [{ quantity: stock.quantity }] : [] };
  }
  if (sql.includes('INSERT INTO purchases')) {
    const product_id = Number(params[0]);
    const quantity = Number(params[1]);
    const total_price = Number(params[2]);
    const notes = params[3];
    const id = mockDb.purchases.length + 1;
    const newPurchase = {
      id,
      product_id,
      quantity,
      total_price,
      status: 'active',
      notes,
      purchased_at: new Date()
    };
    mockDb.purchases.push(newPurchase);
    return { rows: [newPurchase] };
  }
  if (sql.includes('SELECT * FROM purchases WHERE id =')) {
    const id = Number(params[0]);
    const pur = mockDb.purchases.find(p => p.id === id);
    return { rows: pur ? [pur] : [] };
  }
  if (sql.includes("UPDATE purchases SET status = 'cancelled'")) {
    const id = Number(params[0]);
    const pur = mockDb.purchases.find(p => p.id === id);
    if (pur) {
      pur.status = 'cancelled';
      pur.cancelled_at = new Date();
    }
    return { rows: pur ? [pur] : [] };
  }

  // 12. Settings Configuration Queries
  if (sql.includes('SELECT * FROM settings')) {
    return { rows: mockDb.settings };
  }
  if (sql.includes('INSERT INTO settings')) {
    const key = params[0];
    const value = params[1];
    const setting = mockDb.settings.find(s => s.key === key);
    if (setting) {
      setting.value = value;
    } else {
      mockDb.settings.push({ key, value });
    }
    return { rows: [] };
  }

  return { rows: [] };
}

// Test connection and initialize tables asynchronously (only if Postgres is active)
const initDb = async () => {
  if (isMock) {
    console.log('In-memory mock database loaded successfully.');
    return;
  }
  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL database successfully.');
    
    // Create schema
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT,
        price DOUBLE PRECISION NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS product_stocks (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS purchases (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL,
        total_price DOUBLE PRECISION NOT NULL,
        status TEXT DEFAULT 'active',
        notes TEXT,
        purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        cancelled_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'admin'
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // Migrate existing admins table to add role column if it doesn't exist
    await client.query(`
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'admin';
    `);

    console.log('PostgreSQL database tables initialized.');
    client.release();
  } catch (err) {
    console.error('Error connecting to PostgreSQL database, falling back to DEMO MODE:', err.message);
    isMock = true;
  }
};

// Start initialization
const initPromise = initDb();

module.exports = {
  query: async (text, params) => {
    if (isMock) return mockQuery(text, params);
    try {
      return await pool.query(text, params);
    } catch (err) {
      console.error('PostgreSQL query failed. Falling back to in-memory mock engine:', err.message);
      isMock = true;
      return mockQuery(text, params);
    }
  },
  connect: async () => {
    if (isMock) {
      return {
        query: (text, params) => mockQuery(text, params),
        release: () => {}
      };
    }
    try {
      return await pool.connect();
    } catch (err) {
      console.error('PostgreSQL connect failed. Returning in-memory mock client:', err.message);
      isMock = true;
      return {
        query: (text, params) => mockQuery(text, params),
        release: () => {}
      };
    }
  },
  pool,
  initPromise
};
