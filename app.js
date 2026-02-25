// Importaciones
const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

// Inicializar app
const app = express();

// Middlewares
app.use(express.json()); // Permite recibir JSON en requests

// Ruta de prueba
app.get('/', (req, res) => {
    res.send('Servidor funcionando correctamente 🚀');
});

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ Conectado a MongoDB');
        
        // Levantar servidor solo cuando conecta la BD
        app.listen(process.env.PORT, () => {
            console.log(`🚀 Servidor corriendo en puerto ${process.env.PORT}`);
        });

    })
    .catch((error) => {
        console.error('❌ Error conectando a MongoDB:', error);
    });