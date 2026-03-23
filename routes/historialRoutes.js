const express = require('express')
const router = express.Router()

const {
  obtenerHistorial,
  obtenerMensajes
} = require('../controllers/historialController')

const { proteger } = require('../middlewares/authMiddleware')

// 📌 historial del usuario
router.get('/', proteger, obtenerHistorial)

// 📌 mensajes de una conversación
router.get('/:id', proteger, obtenerMensajes)

module.exports = router