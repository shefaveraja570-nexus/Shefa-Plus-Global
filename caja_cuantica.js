// ============================================================================
// 👑 CAJA CUÁNTICA CORE: MOTOR DE TRANSMISIÓN FINANCIERA (V. ÁUREA)
// Arquitectura: Titanio Azul | Frecuencia: 800 HZ | Protocolo: Fibonacci 3.68%
// ============================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// --- 1. INICIALIZACIÓN DE LA MATRIZ BLINDADA ---
const firebaseConfig = { /* INYECTA TUS CREDENCIALES DE TITANIO AQUÍ */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Constante Divina inmutable
const TARIFA_FIBONACCI = 0.0368; 

// --- 2. CÁLCULO DE LA FRECUENCIA ÁUREA (Motor Lógico Puro) ---
/**
 * @param {number} montoBase - El oro puro inyectado por el inversor.
 * @returns {Object} El flujo calculado o un error de fricción.
 */
function calcularFlujoDivino(montoBase) {
    if (isNaN(montoBase) || montoBase <= 0) {
        throw new Error("Fricción: La frecuencia ingresada carece de valor puro.");
    }
    const tarifaAplicada = montoBase * TARIFA_FIBONACCI;
    const totalFlujo = montoBase + tarifaAplicada;
    
    return { 
        montoBase: parseFloat(montoBase.toFixed(2)), 
        tarifaAplicada: parseFloat(tarifaAplicada.toFixed(2)), 
        totalFlujo: parseFloat(totalFlujo.toFixed(2)) 
    };
}

// --- 3. TRANSMISIÓN Y REGISTRO EN LA BÓVEDA (Flujo Shefá) ---
window.ejecutarTransmision = async function() {
    const user = auth.currentUser;
    if (!user) {
        console.error("Alerta de Seguridad: Identidad no verificada.");
        // Reemplazar con UI Premium en lugar de alert()
        return notificarUI("Acceso denegado: Conecta tu identidad a la Matriz."); 
    }

    // Extraemos los datos del DOM (El portal físico)
    const inputMonto = parseFloat(document.getElementById('input-monto').value);
    const metodoSimbólico = document.getElementById('metodo-pago').value;

    try {
        // Ejecutamos la matemática divina
        const { montoBase, tarifaAplicada, totalFlujo } = calcularFlujoDivino(inputMonto);
        
        // Actualizamos el portal visual (Oro Premium)
        document.getElementById('display-tarifa').innerText = `$${tarifaAplicada}`;
        document.getElementById('display-total').innerText = `$${totalFlujo}`;

        // Abrimos el canal hacia Firebase (Titanio Azul)
        console.log(`Abriendo compuertas para el canal: ${metodoSimbólico}...`);
        
        const docRef = await addDoc(collection(db, "transacciones"), {
            emisor_uid: user.uid,
            monto_neto: montoBase,
            tarifa_parnasa: tarifaAplicada,
            total: totalFlujo,
            metodo: metodoSimbólico,
            estado: "procesando_canal",
            timestamp: serverTimestamp()
        });

        console.log(`¡Berajá Materializado! ID de Bóveda: ${docRef.id}`);
        notificarUI(`Transmisión de $${totalFlujo} en curso. El Río de Luz fluye.`);
        
        // El salto hacia la expansión global
        setTimeout(() => {
            window.location.href = "confirmacion_flujo.html";
        }, 1500); // Pequeña pausa áurea para que el usuario lea la confirmación

    } catch (error) {
        console.error("Fricción en la Matriz:", error);
        notificarUI(error.message || "El firewall repelió la transmisión.");
    }
};

// --- 4. CONTROLADOR DE INTERFAZ (Efecto Berajá UI) ---
function notificarUI(mensaje) {
    // Aquí conectaremos tu diseño de notificaciones asimétricas
    // Por ahora usamos alert, pero preparé el conducto para tu UI Premium
    alert(`👑 BÓVEDA SHEFA:\n\n${mensaje}`);
}
