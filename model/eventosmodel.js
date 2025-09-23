const Joi = require('joi');


const eventoSchema = Joi.object({

  titulo: Joi.string().required().min(3).max(150),
  descripcion: Joi.string().required().min(10).max(500),
  fecha: Joi.date().required(),
  hora: Joi.string().required(),
  ubicacion: Joi.string().required().min(5).max(200),
  categoria: Joi.string().required().valid(
    'recoleccion-basura',           
    'reciclaje',                    
    'reforestacion',                
    'conservacion-fauna',           
    'educacion-ambiental',          
    'energia-renovable',            
    'agua-saneamiento',             
    'agricultura-sostenible',       
    'cambio-climatico',             
    'biodiversidad',                
    'contaminacion',                
    'economia-circular',          
    'transporte-sostenible',       
    'otro'                         
  ),
  organizador: Joi.object({
    nombre: Joi.string().required().min(3).max(100),
    email: Joi.string().email().optional(),
    telefono: Joi.string().optional(),
    whatsapp: Joi.string().optional(),        
    facebook: Joi.string().uri().optional(),  
    instagram: Joi.string().optional(),      
    sitioWeb: Joi.string().uri().optional(),
    otroContacto: Joi.string().max(200).optional() 
  }).required(),
  
  imagen: Joi.string().uri().optional(),
  
  estado: Joi.string().valid('activo', 'cancelado', 'finalizado').default('activo')
});

const validarEvento = (data) => {
  return eventoSchema.validate(data);
};

module.exports = { validarEvento };