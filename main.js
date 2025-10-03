const express = require('express');
const path = require('path');
const cors = require('cors');

require('dotenv').config();

const eventosRoutes = require('./routes/eventosRoutes');

const app = express();



app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL || 'https://tu-app-name.onrender.com'
    : ['http://localhost:3000', 'http://localhost:8080', 'http://127.0.0.1:3000', 'http://127.0.0.1:8080'],
  credentials: true
}));

// Middleware básicos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos desde public/
app.use(express.static(path.join(__dirname, 'public')));

// API info
app.get('/api', (req, res) => {
  res.json({ 
    message: 'API de Eventos Ambientales',
    version: '1.0'
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Rutas de eventos
app.use('/api/eventos', eventosRoutes);

// Rutas simples
app.get('/', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'formulario.html'))
);



// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
