// ===================================================================
// 👑 AUDITOR MAESTRO CORE: EL OJO DE LA VISIÓN CLARA
// Arquitectura: Titanio Azul | Frecuencia: 800 HZ | Comando General
// ===================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ⚡ TUS LLAVES MAESTRAS ⚡
const firebaseConfig = {
    apiKey: "AIzaSyAnkRzBz5SbYhRk8Y0irzZA7ujpuy0Dxu4",
    authDomain: "shefa-plus-global.firebaseapp.com",
    projectId: "shefa-plus-global",
    storageBucket: "shefa-plus-global.appspot.com",
    messagingSenderId: "746532074927",
    appId: "1:746532074927:web:70811deddc66ad88d5eb5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Verificar identidad del Comando (Seguridad Básica)
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "acceso_inversores.html";
    } else {
        iniciarEscaneoCuantico();
    }
});

// --- EL ESCÁNER DE LA MATRIZ FINANCIERA ---
function iniciarEscaneoCuantico() {
    const q = query(collection(db, "transacciones"), orderBy("timestamp", "desc"));
    
    onSnapshot(q, (snapshot) => {
        const tabla = document.getElementById('matriz-auditoria');
        tabla.innerHTML = '';
        
        let volumenTotal = 0;
        let parnasaTotal = 0;
        let conteoTxs = 0;

        if (snapshot.empty) {
            tabla.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-gray-500 tracking-widest text-xs uppercase">Aún no hay flujo en el Río de Luz.</td></tr>';
            return;
        }

        snapshot.forEach((doc) => {
            const tx = doc.data();
            conteoTxs++;
            volumenTotal += tx.monto_base || 0;
            parnasaTotal += tx.tarifa_parnasa || 0;

            const fecha = tx.timestamp ? new Date(tx.timestamp.toDate()).toLocaleString() : "Sincronizando...";
            
            // Renderizado Visual de cada fila
            const html = `
            <tr class="hover:bg-gray-900/50 transition">
                <td class="p-4 text-xs text-gray-400">${fecha}</td>
                <td class="p-4 text-xs font-mono text-gray-300" title="${tx.uid_inversor}">${tx.uid_inversor.substring(0, 8)}...</td>
                <td class="p-4 text-xs uppercase tracking-wider text-blue-400"><i class="fas fa-bolt mr-1"></i> ${tx.metodo_pago}</td>
                <td class="p-4 text-sm font-bold text-white">$${(tx.monto_base || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                <td class="p-4 text-sm font-bold text-verdeVeraja">+$${(tx.tarifa_parnasa || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                <td class="p-4">
                    <span class="text-[0.6rem] uppercase tracking-widest px-2 py-1 rounded-full ${tx.estado === 'aprobado' ? 'bg-green-900/50 text-green-400 border border-green-800' : 'bg-yellow-900/50 text-yellow-400 border border-yellow-800'}">
                        ${tx.estado}
                    </span>
                </td>
            </tr>`;
            tabla.insertAdjacentHTML('beforeend', html);
        });

        // Actualizar las Pantallas de Energía (Métricas)
        document.getElementById('metrica-volumen').innerText = `$${volumenTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        document.getElementById('metrica-parnasa').innerText = `$${parnasaTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        document.getElementById('metrica-txs').innerText = conteoTxs;
    });
}
