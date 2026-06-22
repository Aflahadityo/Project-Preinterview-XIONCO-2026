const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /products - List all products + current stock
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.id, p.name, p.category, p.price, COALESCE(s.quantity, 0)::int AS quantity
      FROM products p
      LEFT JOIN product_stocks s ON p.id = s.product_id
      ORDER BY p.id DESC
    `);
    const products = result.rows;
    res.render('products/list', { products, query: req.query });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).send('Internal Server Error');
  }
});

// GET /products/add - Form to add new product
router.get('/add', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM categories ORDER BY name ASC');
    const categories = result.rows;
    res.render('products/add', { categories, query: req.query });
  } catch (error) {
    console.error('Error loading categories:', error);
    res.redirect('/products?error=Gagal memuat daftar kategori.');
  }
});

// POST /products/add - Save new product + initial stock
router.post('/add', async (req, res) => {
  const { name, category, price, initial_stock } = req.body;

  // Validation
  if (!name || !price) {
    return res.redirect('/products/add?error=Nama dan harga produk wajib diisi.');
  }

  const parsedPrice = parseFloat(price);
  const parsedStock = parseInt(initial_stock) || 0;

  if (isNaN(parsedPrice) || parsedPrice <= 0) {
    return res.redirect('/products/add?error=Harga harus berupa angka lebih besar dari 0.');
  }

  if (parsedStock < 0) {
    return res.redirect('/products/add?error=Stok awal tidak boleh negatif.');
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    const productInsert = await client.query(
      'INSERT INTO products (name, category, price) VALUES ($1, $2, $3) RETURNING id',
      [name, category, parsedPrice]
    );
    const productId = productInsert.rows[0].id;

    await client.query(
      'INSERT INTO product_stocks (product_id, quantity) VALUES ($1, $2)',
      [productId, parsedStock]
    );

    await client.query('COMMIT');
    res.redirect('/products?success=Produk berhasil ditambahkan.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding product:', error);
    res.redirect('/products/add?error=Gagal menambahkan produk ke database.');
  } finally {
    client.release();
  }
});

// POST /products/:id/restock - Add stock
router.post('/:id/restock', async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;

  const parsedQty = parseInt(quantity);
  if (isNaN(parsedQty) || parsedQty <= 0) {
    return res.redirect('/products?error=Jumlah restock harus berupa angka lebih besar dari 0.');
  }

  try {
    await db.query(`
      INSERT INTO product_stocks (product_id, quantity, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (product_id)
      DO UPDATE SET quantity = product_stocks.quantity + EXCLUDED.quantity, updated_at = CURRENT_TIMESTAMP
    `, [id, parsedQty]);

    res.redirect('/products?success=Stok berhasil ditambah.');
  } catch (error) {
    console.error('Error restocking product:', error);
    res.redirect('/products?error=Gagal menambahkan stok.');
  }
});

module.exports = router;
