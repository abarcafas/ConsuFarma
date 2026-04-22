const pool = require('../db');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');
require('dotenv').config();


// ================= REGISTRO =================
const registro = async (req, res) => {
  try {
    const { nombre, genero, edad, password, idioma, pais } = req.body;

    if (!nombre || !genero || !edad || !password || !idioma || !pais) {
      return res.status(400).send("Faltan campos obligatorios");
    }

    const existe = await pool.query(
      "SELECT * FROM usuarios WHERE nombre = $1",
      [nombre]
    );

    if (existe.rows.length > 0) {
      return res.status(400).send("El usuario ya existe");
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    await pool.query(
  `INSERT INTO usuarios
   (rol_id, nombre, genero, edad, password_hash, idioma, pais)
   VALUES ($1,$2,$3,$4,$5,$6,$7)`,
  [
    2, // 👈 SIEMPRE USUARIO
    nombre,
    genero,
    edad,
    hash,
    idioma,
    pais
  ]
);
    res.redirect('/login');

  } catch (error) {
    console.error("Error en registro:", error);
    res.status(500).send("Error en servidor");
  }
};

// ================= LOGIN =================
const login = async (req, res) => {
  try {
    const { nombre, password } = req.body;

    const result = await pool.query(
  `SELECT 
      u.id,
      u.nombre,
      u.password_hash,
      u.idioma,          
      r.nombre AS rol
   FROM usuarios u
   JOIN roles r ON u.rol_id = r.id
   WHERE u.nombre = $1`,
  [nombre]
);
    if (result.rows.length === 0) {
      return res.status(400).send("Usuario no encontrado");
    }

    const usuario = result.rows[0];

    const passwordValida = await bcrypt.compare(password, usuario.password_hash);

    if (!passwordValida) {
      return res.status(400).send("Contraseña incorrecta");
    }

    // 🔐 Crear JWT con ROL EN TEXTO
    const token = generateToken(usuario);
    // 🍪 Guardar en cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      maxAge: 2 * 60 * 60 * 1000
    });
    console.log('ROL DEL USUARIO:', usuario.rol)

    // 🔀 Redirección por palabra
    if (usuario.rol === 'admin') {
      return res.redirect('/admin/dashboard');
    }

    return res.redirect('/dashboard');

  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).send("Error en servidor");
  }
};
module.exports = { registro, login };