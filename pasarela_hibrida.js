// ===================================================================
// 👑 PASARELA HÍBRIDA: PUENTE HACIA LA ECONOMÍA REAL
// Arquitectura: Titanio Azul | Integración: Mercado Pago API
// ===================================================================

import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js";

const functions = getFunctions();

window.iniciarTransmisionMercadoPago = async function(montoBase) {
    const boton = document.getElementById('btn-pago-mp');
    boton.innerText = "Sincronizando con Banco...";
    boton.disabled = true;

    try {
        // Llamada al cerebro seguro en la nube
        const crearPreferencia = httpsCallable(functions, 'crearPreferenciaPago');
        const resultado = await crearPreferencia({ montoBase: parseFloat(montoBase) });

        // Redirección al portal seguro de Mercado Pago
        window.location.href = resultado.data.url;
        
    } catch (error) {
        console.error("Fricción en la pasarela:", error);
        alert("El Río de Luz encontró un obstáculo. Intenta de nuevo.");
        boton.innerText = "Transmitir via Mercado Pago";
        boton.disabled = false;
    }
};
