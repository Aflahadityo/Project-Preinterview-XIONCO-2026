const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /categories - List all categories
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM categories ORDER BY name ASC');
    const categories = result.rows;
    res.render('categories/list', { categories, query: req.query });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).send('Internal Server Error');
  }
});

// POST /categories/add - Add new category
router.post('/add', async (req, res) => {
  const { name } = req.body;

  if (!name || name.trim() === '') {
    return res.redirect('/categories?error=Nama kategori tidak boleh kosong.');
  }

  const categoryName = name.trim().toUpperCase();

  try {
    // Check if category already exists
    const existing = await db.query('SELECT id FROM categories WHERE name = $1', [categoryName]);
    if (existing.rows.length > 0) {
      return res.redirect('/categories?error=Kategori tersebut sudah terdaftar.');
    }

    await db.query('INSERT INTO categories (name) VALUES ($1)', [categoryName]);
    res.redirect('/categories?success=Kategori berhasil ditambahkan.');
  } catch (error) {
    console.error('Error adding category:', error);
    res.redirect('/categories?error=Gagal menambahkan kategori.');
  }
});

module.exports = router;
