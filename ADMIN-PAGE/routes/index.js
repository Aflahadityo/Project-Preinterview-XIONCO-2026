const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', async (req, res) => {
  try {
    // Run all database calls in parallel using Promise.all
    const [
      totalProductsRes,
      totalActivePurchasesRes,
      totalCancelledPurchasesRes,
      revenueResultRes,
      lastTransactionsRes,
      lowStockProductsRes,
      dailySalesRes,
      categoryDistributionRes
    ] = await Promise.all([
      db.query('SELECT COUNT(*)::int AS count FROM products'),
      db.query("SELECT COUNT(*)::int AS count FROM purchases WHERE status = 'active'"),
      db.query("SELECT COUNT(*)::int AS count FROM purchases WHERE status = 'cancelled'"),
      db.query("SELECT SUM(total_price) AS sum FROM purchases WHERE status = 'active'"),
      db.query(`
        SELECT p.id, pr.name AS product_name, pr.category AS product_category, p.quantity, p.total_price, p.status, p.purchased_at 
        FROM purchases p
        JOIN products pr ON p.product_id = pr.id
        ORDER BY p.purchased_at DESC, p.id DESC
        LIMIT 5
      `),
      db.query(`
        SELECT p.id, p.name, p.category, s.quantity
        FROM products p
        JOIN product_stocks s ON p.id = s.product_id
        WHERE s.quantity <= 5
        ORDER BY s.quantity ASC
        LIMIT 5
      `),
      db.query(`
        SELECT to_char(purchased_at, 'DD/MM') AS label, SUM(total_price) AS value
        FROM purchases
        WHERE status = 'active'
        GROUP BY to_char(purchased_at, 'DD/MM'), date_trunc('day', purchased_at)
        ORDER BY date_trunc('day', purchased_at) ASC
        LIMIT 7
      `),
      db.query(`
        SELECT category, COUNT(*)::int AS count
        FROM products
        GROUP BY category
      `)
    ]);

    const totalProducts = totalProductsRes.rows[0].count;
    const totalActivePurchases = totalActivePurchasesRes.rows[0].count;
    const totalCancelledPurchases = totalCancelledPurchasesRes.rows[0].count;
    const totalRevenue = parseFloat(revenueResultRes.rows[0].sum) || 0;
    const lastTransactions = lastTransactionsRes.rows;
    const lowStockProducts = lowStockProductsRes.rows;
    
    // Parse values for Chart.js
    const dailySales = dailySalesRes.rows.map(item => ({
      label: item.label,
      value: parseFloat(item.value) || 0
    }));
    
    const categoryDistribution = categoryDistributionRes.rows;

    res.render('index', {
      totalProducts,
      totalActivePurchases,
      totalCancelledPurchases,
      totalRevenue,
      lastTransactions,
      lowStockProducts,
      dailySales,
      categoryDistribution,
      query: req.query
    });
  } catch (error) {
    console.error('Error rendering dashboard:', error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
