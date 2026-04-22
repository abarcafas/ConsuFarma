const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const { registro, login } = require('../controllers/authController');
const { autorizarRoles, proteger } = require('../middlewares/authMiddleware');

// Ruta principal — dashboard siempre visible
router.get('/', (req, res) => {
  let usuario = null;
  try {
    const token = req.cookies.token;
    if (token) {
      usuario = jwt.verify(token, process.env.JWT_SECRET);
      // Si es admin, redirigir al panel admin
      if (usuario.rol === 'ADMIN') return res.redirect('/admin/dashboard');
    }
  } catch {
    res.clearCookie('token');
  }
  res.render('dashboard', { usuario });
});

router.get('/login', (req, res) => {
  const token = req.cookies.token;
  if (token) {
    try {
      const usuario = jwt.verify(token, process.env.JWT_SECRET);
      // Redirigir según rol
      return res.redirect(usuario.rol === 'ADMIN' ? '/admin/dashboard' : '/');
    } catch {
      res.clearCookie('token');
    }
  }
  res.render('login');
});

router.post('/login', login);

router.get('/register', (req, res) => {
  const token = req.cookies.token;
  if (token) {
    try {
      jwt.verify(token, process.env.JWT_SECRET);
      return res.redirect('/');
    } catch {
      res.clearCookie('token');
    }
  }
  res.render('register');
});

router.post('/registro', registro);

// Dashboard usuario — redirige admin si llega aquí
router.get('/dashboard', proteger, autorizarRoles('usuario', 'admin'), (req, res) => {
  if (req.usuario.rol === 'ADMIN') return res.redirect('/admin/dashboard');
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