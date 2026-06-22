const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /purchases - List all transactions (with status filter)
router.get('/', async (req, res) => {
  const { status } = req.query;
  
  try {
    let queryStr = `
      SELECT p.id, p.product_id, pr.name AS product_name, pr.category AS product_category, pr.price AS unit_price, p.quantity, p.total_price, p.status, p.notes, p.purchased_at, p.cancelled_at
      FROM purchases p
      JOIN products pr ON p.product_id = pr.id
    `;
    
    let purchases;
    if (status === 'active' || status === 'cancelled') {
      queryStr += ` WHERE p.status = $1 ORDER BY p.purchased_at DESC, p.id DESC`;
      const result = await db.query(queryStr, [status]);
      purchases = result.rows;
    } else {
      queryStr += ` ORDER BY p.purchased_at DESC, p.id DESC`;
      const result = await db.query(queryStr);
      purchases = result.rows;
    }

    res.render('purchases/list', { 
      purchases, 
      selectedStatus: status || 'all',
      query: req.query 
    });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    res.status(500).send('Internal Server Error');
  }
});

// GET /purchases/add - Form to enter a new purchase
router.get('/add', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.id, p.name, p.price, COALESCE(s.quantity, 0)::int AS stock
      FROM products p
      LEFT JOIN product_stocks s ON p.id = s.product_id
      ORDER BY p.name ASC
    `);
    const products = result.rows;

    res.render('purchases/add', { 
      products, 
      query: req.query,
      selectedProductId: req.query.product_id || '',
      selectedQty: req.query.quantity || ''
    });
  } catch (error) {
    console.error('Error loading add purchase form:', error);
    res.status(500).send('Internal Server Error');
  }
});

// POST /purchases/add - Save transaction and deduct stock
router.post('/add', async (req, res) => {
  const { product_id, quantity, notes } = req.body;

  // Validation
  if (!product_id || !quantity) {
    return res.redirect(`/purchases/add?error=Produk dan jumlah pembelian wajib diisi.&product_id=${product_id || ''}&quantity=${quantity || ''}`);
  }

  const parsedQty = parseInt(quantity);
  if (isNaN(parsedQty) || parsedQty <= 0) {
    return res.redirect(`/purchases/add?error=Jumlah pembelian harus berupa angka lebih besar dari 0.&product_id=${product_id}&quantity=${quantity}`);
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Get product price
    const productRes = await client.query('SELECT price FROM products WHERE id = $1', [product_id]);
    const product = productRes.rows[0];
    if (!product) throw new Error('product_not_found');

    // 2. Get current stock
    const stockRes = await client.query('SELECT quantity FROM product_stocks WHERE product_id = $1', [product_id]);
    const stock = stockRes.rows[0];
    if (!stock || stock.quantity < parsedQty) throw new Error('insufficient_stock');

    const totalPrice = product.price * parsedQty;

    // 3. Deduct stock
    await client.query(
      'UPDATE product_stocks SET quantity = quantity - $1, updated_at = CURRENT_TIMESTAMP WHERE product_id = $2',
      [parsedQty, product_id]
    );

    // 4. Record purchase
    await client.query(
      'INSERT INTO purchases (product_id, quantity, total_price, status, notes) VALUES ($1, $2, $3, $4, $5)',
      [product_id, parsedQty, totalPrice, 'active', notes || '']
    );

    await client.query('COMMIT');
    res.redirect('/purchases?success=Transaksi pembelian berhasil dicatat.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating purchase:', error);
    if (error.message === 'product_not_found') {
      res.redirect(`/purchases/add?error=Produk tidak ditemukan.&product_id=${product_id}&quantity=${quantity}`);
    } else if (error.message === 'insufficient_stock') {
      res.redirect(`/purchases/add?error=Stok tidak mencukupi untuk jumlah pembelian yang diminta.&product_id=${product_id}&quantity=${quantity}`);
    } else {
      res.redirect(`/purchases/add?error=Gagal menyimpan transaksi.&product_id=${product_id}&quantity=${quantity}`);
    }
  } finally {
    client.release();
  }
});

// POST /purchases/:id/cancel - Cancel transaction and return stock
router.post('/:id/cancel', async (req, res) => {
  const { id } = req.params;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Get transaction info
    const purchaseRes = await client.query('SELECT * FROM purchases WHERE id = $1', [id]);
    const purchase = purchaseRes.rows[0];
    if (!purchase) throw new Error('purchase_not_found');
    if (purchase.status === 'cancelled') throw new Error('already_cancelled');

    // 2. Mark as cancelled
    await client.query("UPDATE purchases SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP WHERE id = $1", [id]);

    // 3. Return stock to inventory
    await client.query(
      "UPDATE product_stocks SET quantity = quantity + $1, updated_at = CURRENT_TIMESTAMP WHERE product_id = $2",
      [purchase.quantity, purchase.product_id]
    );

    await client.query('COMMIT');
    res.redirect('/purchases?success=Transaksi berhasil dibatalkan dan stok dikembalikan.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error cancelling purchase:', error);
    if (error.message === 'purchase_not_found') {
      res.redirect('/purchases?error=Transaksi tidak ditemukan.');
    } else if (error.message === 'already_cancelled') {
      res.redirect('/purchases?error=Transaksi sudah dibatalkan sebelumnya.');
    } else {
      res.redirect('/purchases?error=Gagal membatalkan transaksi.');
    }
  } finally {
    client.release();
  }
});

module.exports = router;
