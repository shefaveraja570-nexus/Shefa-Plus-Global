// ===================================================================
// 👑 NEUROSHEFA CORE: EL CEREBRO DE SHEFA NEXUS
// Arquitectura: Titanio Azul | Frecuencia: 800 HZ | Abundancia: Oro Premium
// ===================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, doc, getDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ⚡ TUS LLAVES MAESTRAS DE LA BÓVEDA ⚡
const firebaseConfig = {
    apiKey: "AIzaSyAnkRzBz5SbYhRk8Y0irzZA7ujpuy0Dxu4",
    authDomain: "shefa-plus-global.firebaseapp.com",
    databaseURL: "https://shefa-plus-global-default-rtdb.firebaseio.com",
    projectId: "shefa-plus-global",
    storageBucket: "shefa-plus-global.appspot.com",
    messagingSenderId: "746532074927",
    appId: "1:746532074927:web:70811deddc66ad88d5eb5"
};

// Inicialización de la Matriz Cuántica
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Variables de estado del Inversor Logueado
let miUID = "";
let miNombre = "";
let miFoto = "";

// Variables del túnel encriptado (Chat Privado Activo)
let chatDestinoUID = "";
let unsubsChatActivo = null;

// --- SISTEMA DE NAVEGACIÓN ASIMÉTRICA ---
window.cambiarVista = function(vista) {
    // Actualizar Efecto Berajá en botones UI
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('activo'));
    document.getElementById(`nav-${vista}`).classList.add('activo');
    
    // Ocultar todas las bóvedas
    document.getElementById('vista-muro').classList.add('hidden');
    document.getElementById('vista-chats').classList.add('hidden');
    document.getElementById('vista-chat-activo').classList.add('translate-x-full'); 
    
    // Revelar la sección seleccionada
    if(vista === 'muro') document.getElementById('vista-muro').classList.remove('hidden');
    if(vista === 'chats') document.getElementById('vista-chats').classList.remove('hidden');
    if(vista === 'perfil') alert("Ojo de la Visión: Abriendo configurador de Matriz Personal (En desarrollo)");
};

// --- EL VIGILANTE: AUTENTICACIÓN DINÁMICA ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        miUID = user.uid;
        
        // Extraer la identidad de la Matriz Firestore (Registro Civil)
        try {
            const docSnap = await getDoc(doc(db, "usuarios", miUID));
            if (docSnap.exists()) {
                const datos = docSnap.data();
                miNombre = datos.nombre || "Inversor Elite";
                miFoto = datos.foto_perfil || "https://via.placeholder.com/150/050814/d4af37?text=O";
                
                // Actualizar la Interfaz con el Oro Premium
                document.getElementById('estado-red').innerHTML = `${miNombre} <span class="text-verdeVeraja">● Frecuencia Activa</span>`;
                document.getElementById('muro-mi-foto').src = miFoto;

                // Encender los motores de la Red Social
                iniciarMotorRedSocial();
            } else {
                alert("Identidad no encontrada en la Matriz. Acceso denegado.");
                signOut(auth);
                window.location.href = "acceso_inversores.html";
            }
        } catch (error) {
            console.error("Fricción al leer la matriz:", error);
        }
    } else {
        // Expulsar a la puerta de entrada
        window.location.href = "acceso_inversores.html";
    }
});

window.cerrarBoveda = function() {
    signOut(auth);
};

// --- MOTOR PRINCIPAL: INICIAR FUNCIONES DE ABUNDANCIA ---
function iniciarMotorRedSocial() {
    cargarMuroPublico();
    cargarListaUsuarios();
}

// --- 1. EL MURO PÚBLICO (EL REGISTRO CIVIL Y FEED) ---
window.publicarEnMuro = async function() {
    const input = document.getElementById('input-publicacion');
    const texto = input.value.trim();
    if(!texto) return;

    await addDoc(collection(db, "muro_publico"), {
        autor_uid: miUID,
        autor_nombre: miNombre,
        autor_foto: miFoto,
        texto: texto,
        timestamp: serverTimestamp()
    });
    input.value = '';
};

function cargarMuroPublico() {
    const q = query(collection(db, "muro_publico"), orderBy("timestamp", "desc"));
    onSnapshot(q, (snapshot) => {
        const feed = document.getElementById('feed-muro');
        feed.innerHTML = ''; 
        
        if (snapshot.empty) {
            feed.innerHTML = '<div class="text-center text-dorado/50 text-xs mt-10 tracking-widest uppercase font-bold">La Matriz está en silencio. Transmite la primera frecuencia de abundancia.</div>';
            return;
        }

        snapshot.forEach((docSnap) => {
            const post = docSnap.data();
            const fecha = post.timestamp ? new Date(post.timestamp.toDate()).toLocaleString() : "Transmisión en tránsito...";
            
            const html = `
            <div class="tarjeta-nexus p-4 relative mb-4">
                <div class="flex items-center gap-3 mb-3">
                    <img src="${post.autor_foto}" class="w-10 h-10 rounded-full border border-dorado object-cover glow-dorado">
                    <div>
                        <h3 class="text-white font-bold text-sm tracking-wide">${post.autor_nombre}</h3>
                        <p class="text-[0.6rem] text-dorado uppercase tracking-widest">${fecha}</p>
                    </div>
                </div>
                <p class="text-gray-300 text-sm leading-relaxed">${post.texto}</p>
                <div class="mt-4 flex gap-4 text-gray-500 border-t border-gray-800 pt-3">
                    <button class="hover:text-dorado text-xs transition uppercase font-bold tracking-widest"><i class="fas fa-hand-sparkles"></i> Berajá</button>
                    <button class="hover:text-dorado text-xs transition uppercase font-bold tracking-widest"><i class="fas fa-comment"></i> Responder</button>
                </div>
            </div>`;
            feed.insertAdjacentHTML('beforeend', html);
        });
    });
}

// --- 2. EL CONCILIO: LISTA DE USUARIOS GLOBALES ---
function cargarListaUsuarios() {
    const q = query(collection(db, "usuarios"));
    onSnapshot(q, (snapshot) => {
        const lista = document.getElementById('lista-usuarios-chat');
        lista.innerHTML = '';
        
        snapshot.forEach((docSnap) => {
            const usuario = docSnap.data();
            const uidStr = docSnap.id;
            
            // Asimetría: Ocultar mi propio nodo de la lista de contactos
            if(uidStr !== miUID) {
                const html = `
                <div onclick="abrirChatPrivado('${uidStr}', '${usuario.nombre}', '${usuario.foto_perfil}')" class="flex items-center gap-3 p-3 bg-panelGris border border-gray-800 rounded-lg cursor-pointer hover:border-dorado transition group">
                    <img src="${usuario.foto_perfil || 'https://via.placeholder.com/150/050814/d4af37?text=O'}" class="w-12 h-12 rounded-full border border-gray-600 group-hover:border-dorado object-cover transition">
                    <div class="flex-grow">
                        <h3 class="text-white font-bold text-sm group-hover:text-dorado transition tracking-wide">${usuario.nombre}</h3>
                        <p class="text-[0.65rem] text-gray-500 uppercase tracking-widest">Toca para abrir frecuencia segura</p>
                    </div>
                    <i class="fas fa-chevron-right text-gray-600 group-hover:text-dorado transition"></i>
                </div>`;
                lista.insertAdjacentHTML('beforeend', html);
            }
        });
    });
}

// --- 3. TÚNEL ENCRIPTADO: CHAT PRIVADO ---
window.abrirChatPrivado = function(uidDestino, nombreDestino, fotoDestino) {
    chatDestinoUID = uidDestino;
    
    // Sintonizar Interfaz
    document.getElementById('chat-nombre-destino').innerText = nombreDestino;
    document.getElementById('chat-foto-destino').src = fotoDestino;
    
    document.getElementById('vista-chat-activo').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('vista-chat-activo').classList.remove('translate-x-full');
    }, 10);

    // Encriptación del conducto: ID único bidireccional
    const conversacionID = [miUID, chatDestinoUID].sort().join("_");

    if(unsubsChatActivo) unsubsChatActivo();

    // Escuchar el Río de Datos del chat específico
    const q = query(collection(db, "chats_privados", conversacionID, "mensajes"), orderBy("timestamp", "asc"));
    unsubsChatActivo = onSnapshot(q, (snapshot) => {
        const contenedor = document.getElementById('matriz-mensajes-privados');
        contenedor.innerHTML = ''; 
        
        snapshot.forEach((docChange) => {
            const msg = docChange.data();
            const esMio = msg.emisor_uid === miUID;
            
            const htmlMensaje = esMio ? `
                <div class="flex flex-col items-end max-w-[85%] self-end mt-1">
                    <div class="bg-gradient-to-br from-titanio to-abismo border border-dorado/30 text-white p-3 rounded-[16px_16px_2px_16px] shadow-[0_0_10px_rgba(212,175,55,0.1)]">
                        <p class="text-sm font-light tracking-wide">${msg.texto}</p>
                    </div>
                </div>
            ` : `
                <div class="flex flex-col items-start max-w-[85%] mt-1">
                    <div class="bg-panelGris border border-gray-700 text-gray-200 p-3 rounded-[16px_16px_16px_2px] shadow-md">
                        <p class="text-sm font-light tracking-wide">${msg.texto}</p>
                    </div>
                </div>
            `;
            contenedor.insertAdjacentHTML('beforeend', htmlMensaje);
        });
        contenedor.scrollTop = contenedor.scrollHeight;
    });
};

window.volverAListaChats = function() {
    document.getElementById('vista-chat-activo').classList.add('translate-x-full');
    setTimeout(() => {
        document.getElementById('vista-chat-activo').classList.add('hidden');
    }, 300); 
    if(unsubsChatActivo) unsubsChatActivo();
    chatDestinoUID = "";
};

window.enviarMensajePrivado = async function() {
    if(!chatDestinoUID) return;
    const input = document.getElementById('input-mensaje-privado');
    const texto = input.value.trim();
    if(!texto) return;

    const conversacionID = [miUID, chatDestinoUID].sort().join("_");

    await addDoc(collection(db, "chats_privados", conversacionID, "mensajes"), {
        emisor_uid: miUID,
        texto: texto,
        timestamp: serverTimestamp()
    });
    input.value = '';
};

// --- 4. SISTEMA DE REMESAS: LA ECONOMÍA REAL FLUYENDO ---
window.abrirRemesaWeb3 = function() {
    alert("Ojo de la Visión: Contrato Inteligente Web3 (BNB Chain) invocado.\n\nPreparando canal de titanio para transmisión de criptoactivos a la bóveda destino.");
};

window.abrirRemesaMP = function() {
    const monto = prompt("NÚCLEO SHEFA FLOW:\nIngrese el monto a enviar por Mercado Pago (COP):");
    if(monto && !isNaN(monto) && monto > 0) {
        // Matemática de Crecimiento Divino: 3.68% de tarifa
        const tarifa = parseFloat(monto) * 0.0368;
        const total = parseFloat(monto) + tarifa;
        alert(`ESTRUCTURA BLINDADA - RESUMEN DE TRANSMISIÓN:\n\nValor Inyectado: $${parseFloat(monto).toFixed(2)}\nAporte Parnasá (Frecuencia 3.68%): $${tarifa.toFixed(2)}\n\nFlujo Total a Procesar: $${total.toFixed(2)}\n\nAbriendo pasarela asimétrica de Mercado Pago...`);
    } else if (monto !== null) {
        alert("Fricción en la matriz: El valor ingresado no cumple con la proporción áurea (debe ser un número válido).");
    }
};
