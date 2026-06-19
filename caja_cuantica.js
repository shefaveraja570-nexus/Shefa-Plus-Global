// ===================================================================
// 👑 CAJA CUÁNTICA CORE: MOTOR DE TRANSMISIÓN FINANCIERA
// Arquitectura: Titanio Azul | Frecuencia: 800 HZ | Protocolo: Fibonacci 3.68%
// ===================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Configuración ya establecida en la Matriz
const app = initializeApp({ /* ... tu configuración aquí ... */ });
const db = getFirestore(app);
const auth = getAuth(app);

// --- CÁLCULO DE LA FRECUENCIA ÁUREA (Tarifa) ---
window.calcularCajaCuantica = function() {
    const montoBase = parseFloat(document.getElementById('input-monto').value);
    
    if (isNaN(montoBase) || montoBase <= 0) {
        alert("Fricción: La frecuencia ingresada no es válida. El monto debe ser oro puro (número positivo).");
        return;
    }

    const TARIFA_FIBONACCI = 0.0368; // 3.68%
    const tarifaAplicada = montoBase * TARIFA_FIBONACCI;
    const totalFlujo = montoBase + tarifaAplicada;

    // Actualizamos la UI en tiempo real
    document.getElementById('display-tarifa').innerText = `$${tarifaAplicada.toFixed(2)}`;
    document.getElementById('display-total').innerText = `$${totalFlujo.toFixed(2)}`;
    
    return { montoBase, tarifaAplicada, totalFlujo };
};

// --- TRANSMISIÓN Y REGISTRO EN LA BÓVEDA ---
window.ejecutarTransmision = async function() {
    const user = auth.currentUser;
    if (!user) {
        alert("Acceso denegado: Identidad no verificada en la Matriz.");
        return;
    }

    const { montoBase, tarifaAplicada, totalFlujo } = calcularCajaCuantica();
    const metodo = document.getElementById('metodo-pago').value; // 'mercadopago' o 'web3'

    try {
        // 1. Registro del nodo de valor en Firestore
        await addDoc(collection(db, "transacciones"), {
            emisor_uid: user.uid,
            monto_neto: montoBase,
            tarifa_parnasa: tarifaAplicada,
            total: totalFlujo,
            metodo: metodo,
            timestamp: serverTimestamp(),
            estado: "procesando_canal" // Canal abierto
        });

        // 2. Simulación de ejecución (Aquí se conecta la API real)
        console.log(`Iniciando canal de ${metodo}...`);
        alert(`Transmisión iniciada por $${totalFlujo.toFixed(2)}. \n\nEl Río de Luz está procesando el flujo hacia la bóveda destino.`);
        
        // Redirección o actualización de UI
        window.location.href = "confirmacion_flujo.html";

    } catch (error) {
        console.error("Fricción en el canal cuántico:", error);
        alert("Error de conexión con la red: La transmisión ha sido rechazada por el firewall.");
    }
};
