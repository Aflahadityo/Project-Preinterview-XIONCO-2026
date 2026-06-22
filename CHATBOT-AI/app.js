require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', require('./routes/chat'));

// Error handling fallback
app.use((err, req, res, next) => {
  console.error('App error:', err.stack);
  res.status(500).send('Internal Server Error');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Chatbot running at http://localhost:${PORT}`);
});
