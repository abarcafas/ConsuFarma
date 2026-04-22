const express = require('express')
const router = express.Router()

const {
  obtenerHistorial,
  obtenerMensajes,
  eliminarConversacion
} = require('../controllers/historialController')

const { proteger } = require('../middlewares/authMiddleware')

// Historial del usuario
router.get('/', proteger, obtenerHistorial)

// Mensajes de una conversación
router.get('/:id', proteger, obtenerMensajes)

// Eliminar una conversación
router.delete('/:id', proteger, eliminarConversacion)

module.exports = router
