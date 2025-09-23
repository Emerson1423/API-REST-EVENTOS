const { db } = require('../config/firebaseConfig');
const cloudinary = require('../config/cloudinaryConfig');
const { validarEvento } = require('../model/eventosmodel');

class EventosController {
  // Obtener todos los eventos (SIMPLIFICADO - sin filtros complejos)
  async obtenerTodos(req, res) {
    try {
      const { categoria, page = 1, limit = 10 } = req.query;

      // Traemos eventos ordenados por fechaCreacion
      let query = db.collection('eventos')
        .orderBy('fechaCreacion', 'desc')
        .limit(parseInt(limit) * 5);

      const snapshot = await query.get();

      let eventos = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        eventos.push({
          id: doc.id,
          ...data,
          fecha: data.fecha?.toDate ? data.fecha.toDate().toISOString() : data.fecha,
          fechaCreacion: data.fechaCreacion?.toDate ? data.fechaCreacion.toDate().toISOString() : data.fechaCreacion
        });
      });

      // 🔹 Filtro en memoria
      if (categoria) {
        eventos = eventos.filter(e => e.categoria === categoria);
      } else {
        eventos = eventos.filter(e => e.estado === 'activo');
      }

      // 🔹 Paginación manual
      const offset = (page - 1) * parseInt(limit);
      const paginados = eventos.slice(offset, offset + parseInt(limit));

      res.json({
        success: true,
        message: `Se encontraron ${paginados.length} eventos`,
        data: paginados,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: eventos.length
        }
      });
    } catch (error) {
      console.error('Error al obtener eventos:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener eventos',
        message: error.message
      });
    }
  }

  // Crear nuevo evento (con soporte para imagen)
  async crear(req, res) {
    try {
      console.log('Creando evento:', req.body);
      console.log('Archivo recibido:', req.file);
      
      let eventoData = { ...req.body };
      let public_id = null; // Guardar public_id por separado
      
      // Si el organizador viene como string JSON, parsearlo
      if (typeof eventoData.organizador === 'string') {
        try {
          eventoData.organizador = JSON.parse(eventoData.organizador);
        } catch (e) {
          console.error('Error al parsear organizador:', e);
        }
      }
      
      // Si hay imagen en el request
      if (req.file) {
        try {
          // Subir imagen a Cloudinary desde memoria usando Promesa
          const cloudinaryResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { 
                resource_type: 'image',
                folder: 'eventos-ambientales',
                public_id: `evento_${Date.now()}`
              },
              (error, result) => {
                if (error) return reject(error);
                resolve(result);
              }
            );
            stream.end(req.file.buffer);
          });

          // Agregar URL de imagen al evento (para validación)
          eventoData.imagen = cloudinaryResult.secure_url;
          // Guardar public_id por separado (NO incluir en validación)
          public_id = cloudinaryResult.public_id;
          
        } catch (imageError) {
          console.error('Error al subir imagen:', imageError);
          // Continuar sin imagen en caso de error
        }
      }
      
      // Validar datos (SIN public_id)
      const { error, value } = validarEvento(eventoData);
      if (error) {
        console.log('Error de validación:', error.details);
        return res.status(400).json({
          success: false,
          error: 'Datos inválidos',
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        });
      }

      // Verificar contacto del organizador
      const organizador = value.organizador;
      const tieneContacto = organizador.email || 
                          organizador.telefono || 
                          organizador.whatsapp || 
                          organizador.facebook || 
                          organizador.instagram || 
                          organizador.sitioWeb || 
                          organizador.otroContacto;

      if (!tieneContacto) {
        return res.status(400).json({
          success: false,
          error: 'Falta información de contacto del organizador'
        });
      }

      // Convertir fecha
      if (typeof value.fecha === 'string') {
        value.fecha = new Date(value.fecha);
      }

      // Crear el nuevo evento (AHORA sí agregamos public_id)
      const nuevoEvento = {
        ...value,
        public_id: public_id, // Agregar public_id después de la validación
        fechaCreacion: new Date(),
        fechaActualizacion: new Date(),
        estado: 'activo'
      };

      const docRef = await db.collection('eventos').add(nuevoEvento);
      
      res.status(201).json({
        success: true,
        message: 'Evento creado exitosamente',
        data: {
          id: docRef.id,
          ...nuevoEvento,
          fecha: nuevoEvento.fecha.toISOString(),
          fechaCreacion: nuevoEvento.fechaCreacion.toISOString()
        }
      });
    } catch (error) {
      console.error('Error al crear evento:', error);
      res.status(500).json({
        success: false,
        error: 'Error al crear el evento',
        message: error.message
      });
    }
  }
  async actualizar(req, res) {
    try {
      const { id } = req.params;
      
      const docRef = db.collection('eventos').doc(id);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return res.status(404).json({
          success: false,
          error: 'Evento no encontrado'
        });
      }

      let eventoData = { ...req.body };
      let public_id = null;
      const datosExistentes = doc.data();
      
      // Si el organizador viene como string JSON, parsearlo
      if (typeof eventoData.organizador === 'string') {
        try {
          eventoData.organizador = JSON.parse(eventoData.organizador);
        } catch (e) {
          console.error('Error al parsear organizador:', e);
        }
      }
      
      // Si hay nueva imagen en el request
      if (req.file) {
        try {
          // Si había imagen anterior, eliminarla de Cloudinary
          if (datosExistentes.public_id) {
            try {
              await cloudinary.uploader.destroy(datosExistentes.public_id);
            } catch (deleteError) {
              console.error('Error al eliminar imagen anterior:', deleteError);
            }
          }

          // Subir nueva imagen a Cloudinary
          const cloudinaryResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { 
                resource_type: 'image',
                folder: 'eventos-ambientales',
                public_id: `evento_${Date.now()}`
              },
              (error, result) => {
                if (error) return reject(error);
                resolve(result);
              }
            );
            stream.end(req.file.buffer);
          });

          eventoData.imagen = cloudinaryResult.secure_url;
          public_id = cloudinaryResult.public_id;
          
        } catch (imageError) {
          console.error('Error al subir imagen:', imageError);
          return res.status(500).json({
            success: false,
            error: 'Error al subir la imagen',
            message: imageError.message
          });
        }
      }

      // Validar datos
      const { error, value } = validarEvento(eventoData);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Datos inválidos',
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        });
      }

      // Convertir fecha
      if (typeof value.fecha === 'string') {
        value.fecha = new Date(value.fecha);
      }

      const eventoActualizado = {
        ...value,
        fechaActualizacion: new Date()
      };

      // Agregar public_id si se subió nueva imagen
      if (public_id) {
        eventoActualizado.public_id = public_id;
      }

      await docRef.update(eventoActualizado);
      
      res.json({
        success: true,
        message: 'Evento actualizado exitosamente'
      });
    } catch (error) {
      console.error('Error al actualizar evento:', error);
      res.status(500).json({
        success: false,
        error: 'Error al actualizar el evento',
        message: error.message
      });
    }
  }

  // Eliminar evento
  async eliminar(req, res) {
    try {
      const { id } = req.params;
      
      const docRef = db.collection('eventos').doc(id);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return res.status(404).json({
          success: false,
          error: 'Evento no encontrado'
        });
      }

      const data = doc.data();

      // Borrar imagen en Cloudinary si existe
      if (data.public_id) {
        try {
          await cloudinary.uploader.destroy(data.public_id);
        } catch (cloudinaryError) {
          console.error('Error al eliminar imagen de Cloudinary:', cloudinaryError);
          // Continuar con la eliminación del documento aunque falle la imagen
        }
      }

      // Borrar documento en Firestore
      await docRef.delete();
      
      res.json({
        success: true,
        message: 'Evento eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar evento:', error);
      res.status(500).json({
        success: false,
        error: 'Error al eliminar el evento',
        message: error.message
      });
    }
  }

  // Obtener evento por ID
  async obtenerPorId(req, res) {
    try {
      const { id } = req.params;
      
      const doc = await db.collection('eventos').doc(id).get();
      
      if (!doc.exists) {
        return res.status(404).json({
          success: false,
          error: 'Evento no encontrado'
        });
      }

      const data = doc.data();
      const evento = {
        id: doc.id,
        ...data,
        fecha: data.fecha?.toDate ? data.fecha.toDate().toISOString() : data.fecha,
        fechaCreacion: data.fechaCreacion?.toDate ? data.fechaCreacion.toDate().toISOString() : data.fechaCreacion
      };
      res.json(evento); // ← Directamente, sin wrapper

    } catch (error) {
      console.error('Error al obtener evento:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener el evento',
        message: error.message
      });
    }
  }
}

module.exports = new EventosController();