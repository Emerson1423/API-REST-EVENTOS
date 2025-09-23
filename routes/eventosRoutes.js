const express = require('express');
const multer = require('multer');
const eventosController = require('../controller/eventosController');

const router = express.Router();

// Configuración de multer para usar memoria (necesario para Cloudinary)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo imágenes permitidas'));
    }
  }
});

// Rutas básicas
router.get('/', eventosController.obtenerTodos);
router.get('/:id', eventosController.obtenerPorId);
router.post('/', upload.single('imagen'), eventosController.crear);
router.put('/:id', upload.single('imagen'), eventosController.actualizar); 
router.delete('/:id', eventosController.eliminar);

module.exports = router;