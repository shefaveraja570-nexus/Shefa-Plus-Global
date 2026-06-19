// ===================================================================
// 👑 MATRIZ PERFIL CORE: LA INTERFAZ DE IDENTIDAD
// Arquitectura: Titanio Azul | Frecuencia: 800 HZ
// ===================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

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
const storage = getStorage(app);

// --- FUNCIONALIDAD: CARGAR DATOS DE LA MATRIZ ---
window.cargarDatosPerfil = async function() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const docRef = doc(db, "inversores", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            // Inyectar datos en la interfaz (IDs esperados en tu HTML)
            if(document.getElementById('input-nombre')) document.getElementById('input-nombre').value = data.nombre || "";
            if(document.getElementById('input-bio')) document.getElementById('input-bio').value = data.bio || "";
            if(document.getElementById('foto-perfil-display')) document.getElementById('foto-perfil-display').src = data.foto_perfil || "default-avatar.png";
        }
    } catch (error) {
        console.error("Fricción al leer la matriz:", error);
    }
};

// --- FUNCIONALIDAD: ACTUALIZAR MATRIZ VISUAL (FOTO) ---
window.subirFotoPerfil = async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const user = auth.currentUser;
    const storageRef = ref(storage, `fotos_perfil/${user.uid}/foto.jpg`);

    try {
        // Subida al Storage
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);

        // Actualización en Firestore
        await updateDoc(doc(db, "inversores", user.uid), {
            foto_perfil: url
        });

        document.getElementById('foto-perfil-display').src = url;
        alert("Matriz Visual actualizada con éxito. Frecuencia sincronizada.");
    } catch (error) {
        console.error("Error al forjar la imagen:", error);
    }
};

// --- FUNCIONALIDAD: GUARDAR CAMBIOS DE IDENTIDAD ---
window.guardarCambiosPerfil = async function() {
    const nuevoNombre = document.getElementById('input-nombre').value;
    const nuevaBio = document.getElementById('input-bio').value;
    const user = auth.currentUser;

    try {
        await updateDoc(doc(db, "inversores", user.uid), {
            nombre: nuevoNombre,
            bio: nuevaBio
        });
        alert("Identidad forjada en la Matriz: Datos guardados.");
    } catch (error) {
        console.error("Fricción al guardar cambios:", error);
    }
};
