const express = require('express')
const router = express.Router()
const { proteger, autorizarRoles } = require('../middlewares/authMiddleware')

const {
  obtenerKPIs,
  obtenerTopMedicamentos,
  obtenerPorGenero,
  obtenerPorPais,
  obtenerPorEdad,
  obtenerTendencia,
  obtenerCruceGeneroMedicamento,
  obtenerAnalisisMedicamento,
  buscarMedicamentos
} = require('../controllers/adminController')

const adminGuard = [proteger, autorizarRoles('admin')]

router.get('/kpis',               ...adminGuard, obtenerKPIs)
router.get('/top-medicamentos',   ...adminGuard, obtenerTopMedicamentos)
router.get('/por-genero',         ...adminGuard, obtenerPorGenero)
router.get('/por-pais',           ...adminGuard, obtenerPorPais)
router.get('/por-edad',           ...adminGuard, obtenerPorEdad)
router.get('/tendencia',          ...adminGuard, obtenerTendencia)
router.get('/cruce-genero',       ...adminGuard, obtenerCruceGeneroMedicamento)
router.get('/medicamento/:id',    ...adminGuard, obtenerAnalisisMedicamento)
router.get('/buscar-medicamento', ...adminGuard, buscarMedicamentos)

module.exports = router
