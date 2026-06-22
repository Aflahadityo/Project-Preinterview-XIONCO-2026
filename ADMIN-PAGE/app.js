require('dotenv').config();
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const db = require('./db/database');

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session Configuration
const session = require('express-session');
app.use(session({
  secret: 'xionco-secret-key-12345-furniture',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 Hours session lifetime
}));

// Format Rupiah Helper
app.locals.formatRupiah = (num) => {
  if (num === null || num === undefined) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(num);
};

// Helper for dates formatting
app.locals.formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Custom helper to expose request path to views for active navigation highlights
app.use((req, res, next) => {
  res.locals.path = req.path;
  next();
});

// Authentication Protection Middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  res.redirect('/login');
};

// Public Authentication Routes
app.get('/login', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.redirect('/');
  }
  res.render('login', { layout: false, query: req.query });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // Verify credentials against the seeded admins table in PostgreSQL
    const result = await db.query('SELECT * FROM admins WHERE username = $1 AND password = $2', [username, password]);
    const admin = result.rows[0];
    if (admin) {
      req.session.isAdmin = true;
      return res.redirect('/');
    }
  } catch (err) {
    console.error('Error querying admin from database:', err);
  }
  
  res.redirect('/login?error=Username atau password salah.');
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/login');
  });
});

// Protected Routes
app.use('/', requireAuth, require('./routes/index'));
app.use('/products', requireAuth, require('./routes/products'));
app.use('/purchases', requireAuth, require('./routes/purchases'));
app.use('/categories', requireAuth, require('./routes/categories'));
app.use('/assistant', requireAuth, require('./routes/assistant'));

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

module.exports = app;
