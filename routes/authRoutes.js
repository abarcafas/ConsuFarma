const express = require('express');
const router = express.Router();

const { registro, login } = require('../controllers/authController');
const {autorizarRoles, proteger } = require('../middlewares/authMiddleware');

// Ruta principal
router.get('/', (req, res) => {
  res.redirect('/login');
});

router.get('/login', (req, res) => {
  res.render('login');
});

router.post('/login', login);

router.get('/register', (req, res) => {
  res.render('register');
});

router.post('/registro', registro);

// Dashboard usuario
router.get('/dashboard',proteger,autorizarRoles('usuario', 'admin'),(req, res) => {res.render('dashboard', { usuario: req.usuario, idioma:req.usuario.idioma });});

// Dashboard admin
router.get(
  '/admin/dashboard',
  proteger,
  autorizarRoles('admin'),
  (req, res) => {
    res.render('adminDashboard', { usuario: req.usuario });
  }
);

router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

module.exports = router;