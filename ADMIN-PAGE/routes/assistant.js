const express = require('express');
const { streamAIResponse, loadAISettings } = require('../services/ai');
const db = require('../db/database');
const router = express.Router();

// Helper: Format Rupiah currency
function formatRupiah(num) {
  if (num === null || num === undefined) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(num);
}

// Middleware to restrict access to super_admin role
const requireSuperAdmin = (req, res, next) => {
  if (req.session && req.session.isAdmin && req.session.role === 'super_admin') {
    return next();
  }
  res.redirect('/assistant?error=Akses ditolak. Pengaturan hanya untuk Super Admin.');
};

// Helper: Detect if message is asking about stock/inventory
function isStockQuery(message) {
  const stockKeywords = [
    'stok', 'stock', 'sisa', 'tersedia', 'habis', 'jumlah',
    'berapa', 'inventory', 'produk', 'barang', 'persediaan',
    'cek stok', 'lihat stok', 'daftar stok', 'ringkasan stok',
    'low stock', 'stok rendah', 'habis', 'kosong'
  ];
  const lowerMsg = message.toLowerCase();
  return stockKeywords.some(keyword => lowerMsg.includes(keyword));
}

// Helper: Format stock data as readable text
function formatStockResponse(products) {
  if (!products || products.length === 0) {
    return '❌ Tidak ada data produk ditemukan.';
  }

  let response = '📦 **DATA STOK PRODUK SAAT INI**\n\n';

  // Group by category
  const byCategory = {};
  products.forEach(p => {
    const cat = p.category || 'Lainnya';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(p);
  });

  // Format each category
  for (const [category, items] of Object.entries(byCategory)) {
    response += `**📂 ${category}**\n`;
    items.forEach(item => {
      const stockStatus = item.quantity === 0 ? '🔴 HABIS' :
                         item.quantity < 5 ? '🟡 RENDAH' : '🟢 TERSEDIA';
      response += `• ${item.name}: ${item.quantity} unit ${stockStatus}\n`;
    });
    response += '\n';
  }

  // Summary
  const totalProducts = products.length;
  const outOfStock = products.filter(p => p.quantity === 0).length;
  const lowStock = products.filter(p => p.quantity > 0 && p.quantity < 5).length;
  const totalStock = products.reduce((sum, p) => sum + p.quantity, 0);

  response += `**📊 RINGKASAN:**\n`;
  response += `• Total Produk: ${totalProducts}\n`;
  response += `• Total Stok: ${totalStock} unit\n`;
  response += `• Stok Habis: ${outOfStock} produk\n`;
  response += `• Stok Rendah (<5): ${lowStock} produk\n`;

  return response;
}

// Helper: Search products by name
async function searchProducts(query) {
  try {
    const result = await db.query(`
      SELECT p.name, p.category, p.price, COALESCE(ps.quantity, 0) as quantity
      FROM products p
      LEFT JOIN product_stocks ps ON p.id = ps.product_id
      WHERE LOWER(p.name) LIKE $1 OR LOWER(p.category) LIKE $1
      ORDER BY p.category, p.name
    `, [`%${query.toLowerCase()}%`]);
    return result.rows;
  } catch (err) {
    console.error('Error searching products:', err);
    return [];
  }
}

// Helper: Get stock summary
async function getStockSummary() {
  try {
    const result = await db.query(`
      SELECT p.name, p.category, p.price, COALESCE(ps.quantity, 0) as quantity
      FROM products p
      LEFT JOIN product_stocks ps ON p.id = ps.product_id
      ORDER BY p.category, p.name
    `);
    return result.rows;
  } catch (err) {
    console.error('Error getting stock summary:', err);
    return [];
  }
}

router.get('/', async (req, res) => {
  const config = await loadAISettings();
  res.render('assistant', {
    title: 'AI Assistant',
    provider: config.provider,
    model: config.model || 'gemini-2.5-flash'
  });
});

router.post('/chat', async (req, res) => {
  const { message, history = [] } = req.body;

  // Setup Server-Sent Events headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Handle stock queries locally without external AI API
  if (isStockQuery(message)) {
    try {
      let response;
      const lowerMsg = message.toLowerCase();

      // Specific stock queries
      if (lowerMsg.includes('ringkasan') || lowerMsg.includes('summary') || lowerMsg.includes('semua')) {
        const products = await getStockSummary();
        response = formatStockResponse(products);
      } else if (lowerMsg.includes('habis') || lowerMsg.includes('kosong') || lowerMsg.includes('out of stock')) {
        const products = await searchProducts('');
        const outOfStock = products.filter(p => p.quantity === 0);
        if (outOfStock.length === 0) {
          response = '✅ **Tidak ada produk yang stoknya habis saat ini.**\n\nSemua produk memiliki stok.';
        } else {
          response = `🔴 **PRODUK DENGAN STOK HABIS:**\n\n`;
          outOfStock.forEach(p => {
            response += `• ${p.name} (${p.category}) - ${formatRupiah(p.price)}\n`;
          });
        }
      } else if (lowerMsg.includes('rendah') || lowerMsg.includes('low')) {
        const products = await searchProducts('');
        const lowStock = products.filter(p => p.quantity > 0 && p.quantity < 5);
        if (lowStock.length === 0) {
          response = '✅ **Tidak ada produk dengan stok rendah (<5 unit).**';
        } else {
          response = `🟡 **PRODUK DENGAN STOK RENDAH (<5 unit):**\n\n`;
          lowStock.forEach(p => {
            response += `• ${p.name} (${p.category}): ${p.quantity} unit - ${formatRupiah(p.price)}\n`;
          });
        }
      } else if (lowerMsg.includes('kategori') || lowerMsg.includes('category')) {
        const products = await getStockSummary();
        const byCategory = {};
        products.forEach(p => {
          const cat = p.category || 'Lainnya';
          if (!byCategory[cat]) byCategory[cat] = { count: 0, totalStock: 0 };
          byCategory[cat].count++;
          byCategory[cat].totalStock += p.quantity;
        });

        response = `📂 **DAFTAR KATEGORI PRODUK:**\n\n`;
        for (const [cat, data] of Object.entries(byCategory)) {
          response += `• **${cat}**: ${data.count} produk, ${data.totalStock} unit total\n`;
        }
      } else {
        // Search by product name or get all products
        let searchTerm = '';
        // Extract potential product name from message
        const nameMatch = message.match(/(?:produk|barang|stok)\s+(.+)/i);
        if (nameMatch) {
          searchTerm = nameMatch[1];
        }

        const products = await searchProducts(searchTerm);
        if (products.length === 0 && searchTerm) {
          response = `🔍 **Tidak ditemukan produk dengan kata kunci: "${searchTerm}"**\n\nSilakan coba kata kunci lain atau tanyakan "ringkasan stok" untuk melihat semua produk.`;
        } else {
          response = formatStockResponse(products);
        }
      }

      // Send response
      res.write(`data: ${JSON.stringify({ chunk: response })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    } catch (err) {
      console.error('Error handling stock query:', err);
      res.write(`data: ${JSON.stringify({ chunk: '❌ Terjadi kesalahan saat mengambil data stok. Silakan coba lagi.' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }
  }

  // For non-stock queries, use external AI if available
  const messages = [...history, { role: 'user', content: message }];

  try {
    for await (const chunk of streamAIResponse(messages)) {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
  } catch (err) {
    console.error('Error in assistant chat streaming:', err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  } finally {
    res.end();
  }
});

router.post('/clear', (req, res) => {
  res.json({ success: true, message: 'Chat history cleared' });
});

// GET AI Configuration Panel (Super Admin only)
router.get('/settings', requireSuperAdmin, async (req, res) => {
  const settings = await loadAISettings();
  res.render('assistant/settings', {
    title: 'Pengaturan Asisten AI',
    settings,
    query: req.query
  });
});

// POST Save AI Configurations (Super Admin only)
router.post('/settings', requireSuperAdmin, async (req, res) => {
  const { ai_provider, ai_model, gemini_api_key, openai_api_key, anthropic_api_key, system_prompt } = req.body;
  
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    const upsertSetting = async (key, val) => {
      await client.query(
        'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
        [key, (val || '').trim()]
      );
    };

    await upsertSetting('ai_provider', ai_provider);
    await upsertSetting('ai_model', ai_model);
    await upsertSetting('gemini_api_key', gemini_api_key);
    await upsertSetting('openai_api_key', openai_api_key);
    await upsertSetting('anthropic_api_key', anthropic_api_key);
    await upsertSetting('system_prompt', system_prompt);

    await client.query('COMMIT');
    res.redirect('/assistant/settings?success=Pengaturan AI berhasil diperbarui.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error saving AI settings:', err);
    res.redirect('/assistant/settings?error=Gagal menyimpan pengaturan AI: ' + err.message);
  } finally {
    client.release();
  }
});

module.exports = router;
