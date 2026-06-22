const db = require('./database');

const products = [
  { id: 1, name: 'Cameo Accent Chair', category: 'SEATS', price: 2450000 },
  { id: 2, name: 'Canis Minimalist Sofa', category: 'SEATS', price: 5800000 },
  { id: 3, name: 'Cubix Pouf Ottoman', category: 'SEATS', price: 850000 },
  { id: 4, name: 'Eorde Lounge Chair', category: 'SEATS', price: 3200000 },
  { id: 5, name: 'Qaztac Nightstand Nakas', category: 'TABLE', price: 1500000 },
  { id: 6, name: 'Cubix Coffee Table', category: 'TABLE', price: 2100000 },
  { id: 7, name: 'Geom Dining Table', category: 'TABLE', price: 4500000 },
  { id: 8, name: 'Nexus Bed Frame', category: 'BEDFRAME', price: 6500000 },
  { id: 9, name: 'Kross Credenza Cabinet', category: 'CABINET', price: 3800000 },
  { id: 10, name: 'Aura Geometric Mirror', category: 'DECOR', price: 1200000 }
];

const seed = async () => {
  let client;
  try {
    client = await db.connect();
    console.log('Seeding PostgreSQL database...');
    await client.query('BEGIN');

    // Clear tables
    await client.query('TRUNCATE TABLE purchases, product_stocks, products, admins, categories CASCADE');

    // Seed default categories
    const categoriesList = ['SEATS', 'TABLE', 'BEDFRAME', 'CABINET', 'DECOR'];
    for (const cat of categoriesList) {
      await client.query('INSERT INTO categories (name) VALUES ($1)', [cat]);
    }

    // Seed products & stocks
    for (const prod of products) {
      await client.query('INSERT INTO products (id, name, category, price) VALUES ($1, $2, $3, $4)', [prod.id, prod.name, prod.category, prod.price]);
      await client.query('INSERT INTO product_stocks (product_id, quantity) VALUES ($1, $2)', [prod.id, 10]);
    }

    // Seed default admin account
    await client.query('INSERT INTO admins (username, password) VALUES ($1, $2)', ['admin', 'admin']);

    // Reset sequence counters so next inserts don't conflict
    await client.query("SELECT setval(pg_get_serial_sequence('products', 'id'), COALESCE(MAX(id), 1)) FROM products");
    await client.query("SELECT setval(pg_get_serial_sequence('categories', 'id'), COALESCE(MAX(id), 1)) FROM categories");

    await client.query('COMMIT');
    console.log('Seeding completed successfully.');
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Seeding failed:', error);
  } finally {
    if (client) {
      client.release();
    }
    process.exit();
  }
};

seed();
