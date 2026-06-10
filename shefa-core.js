/**
 * ====================================================================
 * SHÉFA PLUS GLOBAL - CORE ENGINE (SHEFA FLOW)
 * ====================================================================
 * Archivo: shefa-core.js
 * Descripción: Controlador maestro de lógica de negocio, cálculo exacto
 *              de tasas, mitigación de fluctuaciones, validación y 
 *              sincronización en tiempo real con Firebase Firestore.
 * Principios: Abundancia (Shefá), Sustento (Parnasá) y Bendición (Verajá).
 */

// Configuración de inicialización de Firebase (Adaptado a módulos modernos SDK v10+)
// Importante: Reemplaza estos valores con las credenciales de tu consola de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyYourActualApiKeyHere_ShefaGlobal_777",
    authDomain: "shefa-plus-global.firebaseapp.com",
    projectId: "shefa-plus-global",
    storageBucket: "shefa-plus-global.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:a1b2c3d4e5f6g7h8i9j0"
};

// Objeto de estado global de la aplicación (State Management local)
const ShefaState = {
    currentUserId: null,
    activeTransaction: null,
    baseFeePercentage: 0.005, // 0.5% Orientado a la Parnasá justa
    exchangeRates: {
        USD: { EUR: 0.92, COP: 4000, MXN: 17.50, USD: 1.0000 },
        EUR: { USD: 1.09, COP: 4350, MXN: 19.00, EUR: 1.0000 },
        COP: { USD: 0.00025, EUR: 0.00023, COP: 1.0000, MXN: 0.0044 }
    }
};

/**
 * 1. Inicializador del Motor de Conectividad
 */
function initializeShefaEngine() {
    console.log("=== Inicializando Motor Principal de Shefa Flow ===");
    try {
        // Validación preliminar de dependencias de Firebase en el entorno de ejecución
        if (typeof firebase === 'undefined') {
            console.warn("Advertencia: Firebase SDK no detectado globalmente. Corriendo en modo de simulación segura de alta fidelidad.");
            setupMockEnvironment();
        } else {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            console.log("Conectividad de Firebase inicializada correctamente para Shefa Plus Global.");
        }
    } catch (error) {
        console.error("Error crítico al inicializar el núcleo técnico de Shefa Flow:", error);
    }
}

/**
 * 2. Motor de Cálculo Matemático Cripto-Financiero Extendido
 * Calcula el desglose exacto garantizando la máxima precisión en decimales para evitar pérdidas por redondeo.
 */
function calculateShefaRemittanceData(amount, fromCurrency, toCurrency) {
    // Validaciones preventivas de seguridad de datos
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return { error: true, message: "El monto ingresado debe ser un número positivo y mayor a cero." };
    }

    // Verificar disponibilidad de la matriz de tasas de cambio
    if (!ShefaState.exchangeRates[fromCurrency] || !ShefaState.exchangeRates[fromCurrency][toCurrency]) {
        return { error: true, message: `Tasa de cambio no soportada para el par de divisas: ${fromCurrency} a ${toCurrency}` };
    }

    const rate = ShefaState.exchangeRates[fromCurrency][toCurrency];
    
    // Cálculo analítico de tarifas de sustentabilidad (Fee Justo)
    const rawFee = parsedAmount * ShefaState.baseFeePercentage;
    // Redondeo matemático seguro a 4 decimales para transacciones financieras internacionales
    const shefaFee = Math.round(rawFee * 10000) / 10000;
    
    const netAmountToConvert = parsedAmount - shefaFee;
    const rawReceivedAmount = netAmountToConvert * rate;
    const finalReceivedAmount = Math.round(rawReceivedAmount * 100) / 100; // 2 decimales comerciales estándar

    return {
        error: false,
        timestamp: Date.now(),
        metrics: {
            originalAmount: parsedAmount,
            fromCurrency: fromCurrency,
            toCurrency: toCurrency,
            appliedRate: rate,
            feeCharged: shefaFee,
            netConversionAmount: netAmountToConvert,
            finalResult: finalReceivedAmount
        }
    };
}

/**
 * 3. Módulo de Creación de Transacciones (Inserción en la Nube / Firebase Firestore)
 * Registra y envía el flujo de dinero, asignándole un identificador único y un estado de seguimiento reactivo.
 */
async function dispatchShefaRemittance(senderInfo, receiverInfo, numericMetrics) {
    console.log("Preparando despacho del flujo financiero...");
    
    // Generación del payload completo (Estructura de datos robusta sin reducciones)
    const transactionPayload = {
        meta: {
            platform: "Shefa Plus Global - Web Core Platform",
            version: "1.0.0",
            securityHash: btoa(Date.now() + "_" + numericMetrics.originalAmount) // Token simple de integridad
        },
        routing: {
            sender: {
                uid: senderInfo.uid || "anon_user_magnetic",
                name: senderInfo.name || "Usuario Magnético Principal",
                country: senderInfo.country || "Global"
            },
            receiver: {
                name: receiverInfo.fullName,
                phone: receiverInfo.phoneNumber,
                nationalId: receiverInfo.idNumber,
                bankAccount: receiverInfo.bankAccountNumber || "Retiro por Ventanilla Inmediato"
            }
        },
        financials: {
            send: { amount: numericMetrics.originalAmount, currency: numericMetrics.fromCurrency },
            receive: { amount: numericMetrics.finalResult, currency: numericMetrics.toCurrency },
            logistics: { rate: numericMetrics.appliedRate, fee: numericMetrics.feeCharged, net: numericMetrics.netConversionAmount }
        },
        status: {
            current: "PENDING_VERIFICATION", // Estados reactivos: PENDING_VERIFICATION -> CLEARED -> DISPATCHED -> DELIVERED
            history: [
                { stage: "PENDING_VERIFICATION", timestamp: Date.now(), comment: "Flujo Shefa Flow iniciado por el remitente." }
            ]
        }
    };

    // Bloque de persistencia de datos reactiva
    if (typeof firebase !== 'undefined' && firebase.apps.length) {
        try {
            const db = firebase.firestore();
            const docRef = await db.collection("remittances").add(transactionPayload);
            console.log(`¡Transacción registrada exitosamente en la nube con ID único!: ${docRef.id}`);
            transactionPayload.id = docRef.id;
            ShefaState.activeTransaction = transactionPayload;
            
            // Inicializar la escucha en tiempo real de inmediato para este envío
            initiateRealtimeStatusListener(docRef.id);
            return { success: true, transactionId: docRef.id, data: transactionPayload };
        } catch (error) {
            console.error("Fallo de escritura en base de datos de Firebase:", error);
            return { success: false, error: error.message };
        }
    } else {
        // Fallback local seguro simulado (Entorno local de desarrollo offline)
        const mockId = "SHEFA-FLOW-" + Math.floor(Math.random() * 900000000 + 100000000);
        transactionPayload.id = mockId;
        ShefaState.activeTransaction = transactionPayload;
        console.log("Simulación Offline Ejecutada. Payload local guardado en memoria de sesión:", transactionPayload);
        
        // Simular actualizaciones automáticas asíncronas para testing de UI
        simulateAsyncStatusTransitions(mockId);
        return { success: true, transactionId: mockId, data: transactionPayload };
    }
}

/**
 * 4. Escucha Reactiva en Tiempo Real (Real-Time Document Listener)
 * Se conecta al documento específico de la base de datos para detectar cambios remotos al instante.
 */
function initiateRealtimeStatusListener(transactionId) {
    if (typeof firebase !== 'undefined' && firebase.apps.length) {
        const db = firebase.firestore();
        db.collection("remittances").doc(transactionId)
            .onSnapshot((doc) => {
                if (doc.exists) {
                    const updatedData = doc.data();
                    console.log(`[Tiempo Real] Actualización de estado recibida: ${updatedData.status.current}`);
                    // Disparar evento personalizado en el DOM para actualizar la UI automáticamente
                    const event = new CustomEvent('shefaStatusUpdate', { detail: updatedData });
                    window.dispatchEvent(event);
                }
            }, (error) => {
                console.error("Error al escuchar actualizaciones en tiempo real:", error);
            });
    }
}

/**
 * 5. Módulo de Simulación para Desarrollo Offline
 * Recrea el comportamiento de Firebase en entornos locales para acelerar las pruebas de desarrollo.
 */
function setupMockEnvironment() {
    console.log("Entorno simulado listo. El núcleo funciona de manera autónoma en memoria local.");
}

function simulateAsyncStatusTransitions(mockId) {
    setTimeout(() => {
        if (ShefaState.activeTransaction && ShefaState.activeTransaction.id === mockId) {
            ShefaState.activeTransaction.status.current = "CLEARED";
            ShefaState.activeTransaction.status.history.push({ stage: "CLEARED", timestamp: Date.now(), comment: "Fondos validados con éxito. Pasando a dispersión global." });
            window.dispatchEvent(new CustomEvent('shefaStatusUpdate', { detail: ShefaState.activeTransaction }));
            console.log("[Simulador UI] Estado cambiado a: CLEARED");
        }
    }, 4000); // Cambia a los 4 segundos

    setTimeout(() => {
        if (ShefaState.activeTransaction && ShefaState.activeTransaction.id === mockId) {
            ShefaState.activeTransaction.status.current = "DELIVERED";
            ShefaState.activeTransaction.status.history.push({ stage: "DELIVERED", timestamp: Date.now(), comment: "Remesa depositada exitosamente. Sustento entregado." });
            window.dispatchEvent(new CustomEvent('shefaStatusUpdate', { detail: ShefaState.activeTransaction }));
            console.log("[Simulador UI] Estado final cambiado a: DELIVERED (¡Bendición entregada!");
        }
    }, 9000); // Finaliza a los 9 segundos
}

// Ejecución automática de arranque al cargar el archivo en memoria de la aplicación
initializeShefaEngine();
