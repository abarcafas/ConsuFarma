const express = require('express');
const router = express.Router();

const { registro, login } = require('../controllers/authController');
const { autorizarRoles, proteger } = require('../middlewares/authMiddleware');

// Ruta principal — dashboard siempre visible, autenticación manejada en frontend
router.get('/', (req, res) => {
  let usuario = null;
  try {
    const token = req.cookies.token;
    if (token) {
      usuario = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
    }
  } catch {
    res.clearCookie('token');
  }
  res.render('dashboard', { usuario });
});

router.get('/login', (req, res) => {
  // Si ya tiene sesión activa, redirigir al dashboard
  const token = req.cookies.token;
  if (token) {
    try {
      require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
      return res.redirect('/');
    } catch {
      res.clearCookie('token');
    }
  }
  res.render('login');
});

router.post('/login', login);

router.get('/register', (req, res) => {
  // Si ya tiene sesión activa, redirigir al dashboard
  const token = req.cookies.token;
  if (token) {
    try {
      require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
      return res.redirect('/');
    } catch {
      res.clearCookie('token');
    }
  }
  res.render('register');
});

router.post('/registro', registro);

// Dashboard usuario (mantener por compatibilidad)
router.get('/dashboard', proteger, autorizarRoles('usuario', 'admin'), (req, res) => {
  res.render('dashboard', { usuario: req.usuario, idioma: req.usuario.idioma });
});

// Dashboard admin
router.get('/admin/dashboard', proteger, autorizarRoles('admin'), (req, res) => {
  res.render('adminDashboard', { usuario: req.usuario });
});

router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

module.exports = router;
