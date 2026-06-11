// ============================================================================
// SHEFA PLUS GLOBAL - MOTOR DE CONEXIÓN A LA NUBE (FIREBASE)
// ============================================================================

const firebaseConfig = {
  apiKey: "AIzaSyAnkRzBz5SbYhRk8Y0irzZA7ujpuy0Dxu4",
  authDomain: "shefa-plus-global.firebaseapp.com",
  databaseURL: "https://shefa-plus-global-default-rtdb.firebaseio.com",
  projectId: "shefa-plus-global",
  storageBucket: "shefa-plus-global.firebasestorage.app",
  messagingSenderId: "746532074927",
  appId: "1:746532074927:web:8caa1eb6bb329e51d5eb5a",
  measurementId: "G-3880DP58KD"
};

// Inicialización del sistema
firebase.initializeApp(firebaseConfig);

// Activación de la Bóveda y la Seguridad
const ShefaCloudAuth = firebase.auth();
const ShefaCloudDB = firebase.firestore();

console.log("🟢 BÓVEDA GLOBAL CONECTADA: Infraestructura en línea y blindada.");
