const express = require('express');
const router = express.Router();

const { consultarMedicamento } = require('../controllers/consultaController');
const { proteger } = require('../middlewares/authMiddleware');

router.post('/consultar', proteger, consultarMedicamento);

module.exports = router;