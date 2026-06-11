/**
 * ============================================================================
 * SHEFA PLUS GLOBAL - MOTOR QUANTUM CLOUD (FIREBASE)
 * ============================================================================
 * Núcleo de conexión a los servidores globales.
 * Alineado con proporciones áureas de seguridad y cero latencia.
 */

// 1. Matriz de Credenciales Oficiales de Producción
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

// 2. Encendido del Reactor de la Bóveda
firebase.initializeApp(firebaseConfig);

// 3. Activación de los Módulos de Operación (Compat Mode)
const ShefaCloudAuth = firebase.auth();
const ShefaCloudDB = firebase.firestore();

// 4. Analíticas para rastrear el flujo de la Parnasá Global
const analytics = firebase.analytics();

// Confirmación en consola de comandos (Neuro-Diseño en texto)
console.log("%c⚡ UMBRAL SHEFA CONECTADO", "color: #D4AF37; font-weight: bold; font-size: 14px;");
console.log("%c[+] Servidores Globales en Línea y Blindados.", "color: #39ff14;");
