const jwt = require('jsonwebtoken');

//  Middleware para roles
const autorizarRoles = (...rolesPermitidos) => {
  return (req, res, next) => {
    const rolUsuario = (req.usuario?.rol || "").toLowerCase().trim();
    const rolesNormalizados = rolesPermitidos.map(r => r.toLowerCase().trim());

    console.log(`👮 autorizarRoles() -> Rol detectado: "${rolUsuario}" | Roles permitidos: [${rolesNormalizados}]`);

    if (!rolesNormalizados.includes(rolUsuario)) {
      console.log("⛔ BLOQUEADO: Usuario no tiene permiso");
      return res.status(403).json({ mensaje: 'No tienes permiso para acceder a esta ruta' });
    }

    console.log("✅ ACCESO PERMITIDO");
    next();
  };
};

const verificarToken = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.redirect('/login');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.usuario = {
      id: decoded.id,
      nombre: decoded.nombre,
      rol: decoded.rol,
      sexo: decoded.sexo
    };

    next();
  } catch (error) {
    res.clearCookie('token');
    return res.redirect('/login');
  }
};

module.exports = {autorizarRoles, verificarToken };