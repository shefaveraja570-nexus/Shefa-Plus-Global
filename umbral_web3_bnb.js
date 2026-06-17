/**
 * ========================================================================
 * 💎 MALJUT: UMBRAL WEB3 Y PASARELA BLOCKCHAIN (BNB)
 * ========================================================================
 * Red: Shefá Plus Global 2026
 * Arquitectura: Titanio Azul y Oro Premium | Contratos Inteligentes
 * Función: Conectar Wallets (MetaMask/Trust) y ejecutar transacciones BNB.
 * ========================================================================
 */

// ⚡ TU DIRECCIÓN DE BILLETERA MAESTRA (Donde llegará el Shefá)
const DIRECCION_DESTINO_BNB = "0xTU_DIRECCION_DE_WALLET_AQUI"; 

/**
 * 🔗 CONEXIÓN DE MATRIZ: Conecta la Wallet del Usuario
 */
export async function conectarWallet() {
    if (window.ethereum) {
        try {
            console.log("[Maljut] 🟢 Solicitando acceso a la Billetera...");
            const cuentas = await window.ethereum.request({ method: 'eth_requestAccounts' });
            return cuentas[0]; // Retorna la cuenta del socio
        } catch (error) {
            console.error("[Maljut] 🔴 Acceso denegado por el usuario: ", error);
            return null;
        }
    } else {
        alert("⚠️ El Umbral Web3 requiere una Billetera (MetaMask o TrustWallet).");
        return null;
    }
}

/**
 * 💰 PROTOCOLO DE INYECCIÓN BNB: Ejecuta el pago inteligente
 * @param {number} montoBNB - Cantidad a transferir
 * @param {string} activoNombre - Nombre del activo adquirido
 */
export async function ejecutarPagoBNB(montoBNB, activoNombre) {
    const cuenta = await conectarWallet();
    if (!cuenta) return;

    console.log(`[Maljut] 🟡 Iniciando transacción de ${montoBNB} BNB para: ${activoNombre}`);

    try {
        const parametrosTransaccion = {
            from: cuenta,
            to: DIRECCION_DESTINO_BNB,
            value: (BigInt(montoBNB * 1e18)).toString(16), // Conversión a Wei
            gas: '0x5208', // 21000 gas limit
        };

        const txHash = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [parametrosTransaccion],
        });

        console.log(`[Maljut] ✨ ¡Berajá recibida! Tx Hash: ${txHash}`);
        
        // Notificación de éxito al usuario
        alert(`¡Inversión Materializada con Éxito!\nActivo: ${activoNombre}\nTx: ${txHash.substring(0,10)}...`);
        return txHash;

    } catch (error) {
        console.error("[Maljut] 🔴 Fallo en la red blockchain: ", error);
        alert("La red rechazó la transacción. Verifica tus fondos.");
    }
}

/**
 * 🛠️ UTILIDAD: Calcular valor de BNB en tiempo real (Simulado)
 * (Nota: Aquí puedes integrar una API de precios de Chainlink)
 */
export function convertirUSD_a_BNB(montoUSD) {
    // Tasa simulada de intercambio. En producción, conectar con API de precio en vivo.
    const tasaBNB = 600; // Precio aprox actual del BNB
    return (montoUSD / tasaBNB).toFixed(4);
                                        }
