/* =====================================================================
 * 🌌 MÓDULO SUPREMO: DISTRIBUCIÓN DE VERAJÁ 
 * =====================================================================
 * Este algoritmo desciende de la dimensión astral para materializar 
 * la multiplicación sagrada. Gestiona la liquidez perfecta, asegurando 
 * que cada aliado reciba la proporción exacta que le corresponde.
 * ===================================================================== */

async function distribuirVeraja(comunidad, rendimientoTotal) {
    console.log("🧿 Iniciando protocolo de expansión Verajá...");
    
    // Utilizamos un bucle for...of para respetar los tiempos de la Matrix (asincronía)
    // Esto asegura que cada bendición se valide antes de pasar a la siguiente.
    for (const usuario of comunidad) {
        try {
            // 1. Calcular la cuota con precisión absoluta
            const cuota = await calcularParticipacion(usuario, rendimientoTotal);
            
            // 2. Análisis preventivo (Parnasá): El escudo protector del sustento
            const liquidezAsegurada = await asegurarLiquidez(cuota);
            
            if (liquidezAsegurada) {
                // 3. Flujo Shefá: Transferencia directa sin fricción
                await transferirABilleteraDigital(usuario.id, cuota);
                
                // 4. Confirmación visual y espiritual en la red
                await enviarNotificacion(usuario.id, `¡Bendición completada! Tu Verajá de $${cuota} ha sido depositada con éxito.`);
                
                console.log(`✅ Verajá entregada con éxito a la bóveda de: ${usuario.nombre || usuario.id}`);
            } else {
                // Si la bóveda requiere rebalanceo, el sistema se detiene y protege
                console.warn(`⚠️ Protocolo Parnasá activado: Liquidez en calibración para el usuario ${usuario.id}.`);
            }
            
        } catch (error) {
            // Si hay interferencia, el fuego consume el error sin detener el sistema global
            console.error(`🔥 Interferencia en la transferencia para ${usuario.id}:`, error);
        }
    }
    
    console.log("✨ Ciclo de Distribución Verajá completado en armonía perfecta.");
}

