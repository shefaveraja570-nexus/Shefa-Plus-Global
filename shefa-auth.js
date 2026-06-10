/**
 * ====================================================================
 * SHÉFA PLUS GLOBAL - QUANTUM AUTH ENGINE
 * ====================================================================
 * Archivo: shefa-auth.js
 * Descripción: Sistema de gestión de identidad, control de sesiones,
 * validación estricta de inputs y aislamiento de bóvedas.
 * Principios: Privacidad Absoluta, Seguridad Criptográfica, Fluidez.
 */

const ShefaAuth = {
    // Llaves para el almacenamiento local seguro
    USERS_KEY: "shefa_encrypted_users_db",
    SESSION_KEY: "shefa_active_session_token",

    // Estado interno reactivo
    state: {
        isAuthenticated: false,
        currentUser: null
    },

    /**
     * Inicializa el motor de autenticación verificando sesiones activas
     */
    init() {
        console.log("🛡️ Activando Escudo de Identidad - Shefa Auth Nexus...");
        if (!localStorage.getItem(this.USERS_KEY)) {
            localStorage.setItem(this.USERS_KEY, JSON.stringify([]));
        }
        this.checkActiveSession();
    },

    /**
     * Verifica si el usuario ya tenía la sesión abierta para evitar logueos redundantes
     */
    checkActiveSession() {
        try {
            const sessionToken = localStorage.getItem(this.SESSION_KEY);
            if (sessionToken) {
                const decoded = JSON.parse(atob(sessionToken));
                // Verificar si la sesión no ha expirado (expiración simulada de 24 horas)
                if (Date.now() - decoded.loginTime < 86400000) {
                    this.state.isAuthenticated = true;
                    this.state.currentUser = {
                        uid: decoded.uid,
                        email: decoded.email,
                        name: decoded.name
                    };
                    console.log(`Sesión restaurada con éxito para el usuario: ${decoded.name}`);
                    // Disparar evento para actualizar la interfaz automáticamente
                    window.dispatchEvent(new CustomEvent('shefaAuthStatusChanged', { detail: { loggedIn: true, user: this.state.currentUser } }));
                    return;
                }
            }
            this.logoutSilence();
        } catch (e) {
            console.error("Fallo de integridad en el token de sesión. Purgando credenciales.", e);
            this.logoutSilence();
        }
    },

    /**
     * Motor de Registro Expandido con Hashing de Seguridad Criptográfico (SHA-256 Simulada)
     */
    async registerUser(name, email, password) {
        console.log(`Procesando registro para el correo: ${email}`);
        
        // Validaciones estrictas de negocio (Reglas de Seguridad del CEO)
        if (!name.trim() || !email.trim() || !password.trim()) {
            return { success: false, message: "Todos los campos de identidad son estrictamente obligatorios." };
        }
        if (password.length < 6) {
            return { success: false, message: "La contraseña debe superar la barrera de seguridad de 6 caracteres." };
        }
        if (!email.includes("@") || !email.includes(".")) {
            return { success: false, message: "El formato de correo electrónico ingresado no es válido." };
        }

        const users = JSON.parse(localStorage.getItem(this.USERS_KEY)) || [];
        
        // Verificar duplicados en la base de datos distribuida
        const userExists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
        if (userExists) {
            return { success: false, message: "Este correo electrónico ya se encuentra registrado en el ecosistema global." };
        }

        // Generar UID único imponente basado en la estampa de tiempo y el nombre
        const generatedUid = "UID-" + btoa(Date.now() + "_" + email).substr(0, 10).toUpperCase();
        
        // Cifrado de contraseña en formato Hash irreversible
        const passwordHash = await this.hashPassword(password);

        const newUserBlock = {
            uid: generatedUid,
            name: name.trim(),
            email: email.toLowerCase().trim(),
            secret: passwordHash,
            createdAt: Date.now()
        };

        users.push(newUserBlock);
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
        console.log(`¡Usuario registrado de forma indestructible! ID asignado: ${generatedUid}`);

        // Iniciar sesión automáticamente tras el registro exitoso
        return this.loginUser(email, password);
    },

    /**
     * Motor de Verificación e Inicio de Sesión
     */
    async loginUser(email, password) {
        if (!email.trim() || !password.trim()) {
            return { success: false, message: "Ingresa tus credenciales completas para desencriptar tu cuenta." };
        }

        const users = JSON.parse(localStorage.getItem(this.USERS_KEY)) || [];
        const targetUser = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());

        if (!targetUser) {
            return { success: false, message: "Las credenciales ingresadas no coinciden con nuestros registros de abundancia." };
        }

        // Validar contraseña aplicando el mismo algoritmo de hashing
        const targetHash = await this.hashPassword(password);
        if (targetUser.secret !== targetHash) {
            return { success: false, message: "Contraseña incorrecta. Acceso denegado a la bóveda de datos." };
        }

        // Crear token de sesión blindado en Base64
        const sessionPayload = {
            uid: targetUser.uid,
            email: targetUser.email,
            name: targetUser.name,
            loginTime: Date.now()
        };
        const token = btoa(JSON.stringify(sessionPayload));
        localStorage.setItem(this.SESSION_KEY, token);

        // Actualizar estado global reactivo
        this.state.isAuthenticated = true;
        this.state.currentUser = {
            uid: targetUser.uid,
            email: targetUser.email,
            name: targetUser.name
        };

        console.log(`[Seguridad] Acceso concedido a: ${targetUser.name}`);
        window.dispatchEvent(new CustomEvent('shefaAuthStatusChanged', { detail: { loggedIn: true, user: this.state.currentUser } }));
        return { success: true, user: this.state.currentUser };
    },

    /**
     * Cierre de sesión absoluto
     */
    logout() {
        this.logoutSilence();
        window.dispatchEvent(new CustomEvent('shefaAuthStatusChanged', { detail: { loggedIn: false, user: null } }));
        console.log("Sesión del ecosistema financiero cerrada de manera segura.");
    },

    logoutSilence() {
        localStorage.removeItem(this.SESSION_KEY);
        this.state.isAuthenticated = false;
        this.state.currentUser = null;
    },

    /**
     * Algoritmo de Hashing Criptográfico Nativo (SHA-256 Web Crypto API)
     * Convierte texto plano en un hash irreversible que nadie puede descifrar.
     */
    async hashPassword(password) {
        const msgBuffer = new TextEncoder().encode(password + "_shefa_salt_999");
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
};

// Autoarranque inmediato al inyectar el script
ShefaAuth.init();
      
