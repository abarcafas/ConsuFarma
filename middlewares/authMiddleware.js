const jwt = require('jsonwebtoken');

// 🔐 Middleware para verificar autenticación
const proteger = (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.redirect("/login");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("🔐 Usuario autenticado:", decoded); // 👈 AQUÍ VA

    req.usuario = decoded;

    next();
  } catch (error) {
    res.clearCookie('token');
    return res.redirect("/login");
  }
};

// 👮 Middleware para verificar roles
const autorizarRoles = (...rolesPermitidos) => {
  return (req, res, next) => {
    const rolUsuario = (req.usuario?.rol || "").toLowerCase().trim();
    const rolesNormalizados = rolesPermitidos.map(r =>
      r.toLowerCase().trim()
    );

    if (!rolesNormalizados.includes(rolUsuario)) {
      return res.status(403).send("No tienes permiso para acceder a esta ruta");
    }

    next();
  };
};

module.exports = { proteger, autorizarRoles };