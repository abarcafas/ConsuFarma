const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');

require('dotenv').config();

const authRoutes = require('./routes/authRoutes');

const app = express();
app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/public', express.static(path.join(__dirname, 'public')));

// 🔥 IMPORTANTE: SIN PARÉNTESIS
app.use('/', authRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor en http://localhost:${PORT}`);
});