const admin = require('firebase-admin');
require('dotenv').config();

let serviceAccount;

try {
  if (!process.env.FIREBASE_KEY_JSON) {
    throw new Error("❌ No se encontró FIREBASE_KEY_JSON en las variables de entorno");
  }
  
  serviceAccount = JSON.parse(process.env.FIREBASE_KEY_JSON);
} catch (parseError) {
  if (parseError.name === 'SyntaxError') {
    throw new Error("❌ Error al parsear FIREBASE_KEY_JSON: JSON inválido");
  }
  throw parseError;
}

// Verificar si ya está inicializado (útil en desarrollo)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

module.exports = { db };