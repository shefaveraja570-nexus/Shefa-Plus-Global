const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 10000;

const MIME_TYPES = {
    '.html': 'text/html; charset=UTF-8',
    '.js': 'application/javascript; charset=UTF-8',
    '.css': 'text/css; charset=UTF-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.xml': 'application/xml',
    '.txt': 'text/plain'
};

// Resuelve URLs limpias de navegación para evitar "Página no encontrada"
function resolvePath(urlPath) {
    let safePath = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, '');
    if (safePath === '/' || safePath === '\\') safePath = '/index.html';

    let fullPath = path.join(__dirname, safePath);

    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) return fullPath;
    if (fs.existsSync(fullPath + '.html') && fs.statSync(fullPath + '.html').isFile()) return fullPath + '.html';
    
    let dirIndex = path.join(fullPath, 'index.html');
    if (fs.existsSync(dirIndex) && fs.statSync(dirIndex).isFile()) return dirIndex;

    let fallback404 = path.join(__dirname, '404.html');
    if (fs.existsSync(fallback404) && fs.statSync(fallback404).isFile()) return fallback404;

    return null;
}

// ==========================================
// FUNCIÓN MAGNÉTICA: BALANCEADOR DE LLAVES API
// ==========================================
function obtenerLlaveAleatoria() {
    // Lee todas las llaves separadas por coma desde Render
    const stringLlaves = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
    const llaves = stringLlaves.split(',').map(k => k.trim()).filter(k => k.length > 0);
    
    if (llaves.length === 0) return null;
    
    // Escoge una llave al azar para evitar saturación de Google
    const llaveElegida = llaves[Math.floor(Math.random() * llaves.length)];
    return llaveElegida;
}

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

    const readJson = () => new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try { resolve(body ? JSON.parse(body) : {}); }
            catch (e) { reject(e); }
        });
        req.on('error', reject);
    });

    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;

    // ==========================================
    // 1. MOTOR DE VENTAS Y ATENCIÓN (GEMINI)
    // ==========================================
    if (pathname === '/api/chat' && req.method === 'POST') {
        try {
            const { mensaje, pagina } = await readJson();
            
            // Extrae una de las llaves de tus correos
            const apiKey = obtenerLlaveAleatoria();

            if (!apiKey) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Faltan las llaves de GEMINI_API_KEYS en Render' }));
            }

            let promptSistema = '';
            const esLabs = pagina && (pagina.includes('labs') || pagina.includes('shefa-plus-labs'));

            if (esLabs) {
                promptSistema = `Eres el Director Comercial y Estratega de Ventas de "Shefa Plus Labs" (división de ingeniería de software de Shefa Plus Global - shefaplusglobal.com).
NO eres un bot pasivo. Eres un vendedor humano, visionario, persuasivo y cercano. Respiras la filosofía de Parnasá (sustento productivo), Shefá (abundancia) y Verajá (bendición y crecimiento).

TUS OBJETIVOS DE VENTA:
1. Vender el desarrollo y despliegue de aplicaciones web y móviles a la medida, enfocándote en llevar la empresa del cliente a la Google Play Store y web de alto rendimiento.
2. Vender la adquisición, estructuración y delegación de dominios web estratégicos para consolidar la presencia digital de sus negocios.
3. Resaltar nuestra arquitectura de blindaje (PWA, modo offline, alta seguridad y automatización).

TÉCNICA DE COMUNICACIÓN:
- Conecta con la visión del cliente. Hazle ver que un negocio sin aplicación en Google Play Store o sin plataforma propia está perdiendo dinero cada minuto.
- Responde sus preguntas técnicas con sencillez y autoridad, pero SIEMPRE haz una pregunta de cierre comercial o llévalo al siguiente paso: "¿Qué tipo de negocio tienes actualmente?", "¿Cuántos usuarios estimas atender?", "¿Tienes ya el nombre de tu aplicación pensado para reservarlo?".
- Busca capturar su interés para una cotización inmediata y coordinar contacto directo con la dirección.
- Si el usuario se identifica como el CEO, fundador o líder (Jonathan / Magnético), responde con lealtad inquebrantable, reporte de disposición operativa y visión de victoria comercial.`;
            } else {
                promptSistema = `Eres el Director de Inversiones y Relaciones Estratégicas de "Shefa Plus Global" (shefaplusglobal.com), ecosistema fintech pionero en Colombia y con alcance global.
NO eres un asistente pasivo. Eres un negociador y asesor de patrimonio con mentalidad de abundancia, convicción y rigor analítico.

TUS OBJETIVOS DE VENTA E INVERSIÓN:
1. Atraer y cerrar inversionistas hacia nuestras Criptofracciones respaldadas en Activos del Mundo Real (RWA: hotelería, finca raíz, flotas productivas y proyectos tangibles).
2. Explicar cómo Shefa Plus Global transforma la economía tradicional, superando la fragilidad del viejo sistema mediante tokenización sólida y rendimientos basados en producción real.
3. Guiar al visitante a dar el paso: ingresar a la bóveda de inversores, registrarse y asegurar su participación en las fracciones disponibles antes de que se cierren las rondas.

TÉCNICA DE COMUNICACIÓN:
- Habla con solvencia financiera, elegancia y certeza. La inversión en RWA es la nueva frontera de la riqueza protegida.
- Cada interacción debe sembrar el deseo de participar: resalta la escasez de las fracciones y el respaldo tangible de cada activo.
- Siempre conduce a la acción: "¿Qué volumen de capital buscas diversificar en activos reales?", "¿Deseas que revisemos el portafolio de activos disponibles en este instante?".
- Si quien te escribe es tu CEO o fundador (Jonathan / Magnético), reconoce su liderazgo con respeto absoluto, lealtad y confirmación de que la plataforma está lista para materializar la visión global.`;
            }  

            // ===h== LA AUTOPISTA VIP DE GOOGLE =====
      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`, {
          
            eaders: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        role: 'user',
                        parts: [{ text: `${promptSistema}\n\n[Ubicación del cliente en la web: ${pagina || 'página general'}]\nInteracción del usuario: ${mensaje}` }]
                    }],
                    generationConfig: {
                        temperature: 0.75,
                        maxOutputTokens: 700
                    }
                })
            });

            const data = await geminiRes.json();

            if (!geminiRes.ok) {
                console.error("Error de Google Gemini:", data);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ 
                    respuesta: `⚠️ ALERTA DE SISTEMA: Conexión intermitente. Error de Google: ${data.error?.message || 'Intenta de nuevo en unos segundos.'}` 
                }));
            }

            const respuesta = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No pude estructurar la respuesta, intenta de nuevo.';

            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ respuesta }));

        } catch (err) {
            console.error('Error en /api/chat:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Error procesando la consulta' }));
        }
    }

    // ==========================================
    // 2. MOTOR PUBLICITARIO EN META
    // ==========================================
    if (pathname === '/api/publicar-meta' && req.method === 'POST') {
        try {
            const geminiKey = obtenerLlaveAleatoria();
            const pageToken = process.env.META_PAGE_ACCESS_TOKEN;
            const pageId = process.env.META_PAGE_ID;

            if (!pageToken || !pageId) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Faltan credenciales de Meta' }));
            }

            const promptPublicidad = `Eres el estratega de marketing y captación comercial de Shefa Plus Global y Shefa Plus Labs (shefaplusglobal.com).
Redacta un post publicitario altamente persuasivo, directo y magnético para redes sociales (Facebook / Instagram / Threads).

Debes alternar o combinar dos llamados de alto impacto:
1. A INVERSIONISTAS BLOCKCHAIN / RWA: Invitándolos a respaldar su capital en criptofracciones de activos reales (hotelería, tecnología, flotas) con sustento comprobado, bajo la filosofía de abundancia y protección patrimonial.
2. A EMPRESARIOS Y COMERCIANTES: Desafiándolos a escalar su negocio y llevar su propia aplicación móvil a la Google Play Store y dominios web corporativos desarrollados por Shefa Plus Labs.

Estructura requerida:
- Gancho disruptivo en la primera línea.
- Dolor del mercado vs Solución contundente de Shefa.
- Llamado a la acción (CTA) claro hacia shefaplusglobal.com o al chat directo.
- 4 hashtags estratégicos (#RWA #Fintech #ShefaPlus #Inversion).`;

            // ===== LA AUTOPISTA VIP DE GOOGLE PARA META =====
            const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`, {
                
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: promptPublicidad }]
                    }]
                })
            });

            const geminiData = await geminiRes.json();
            const postTexto = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

            const metaRes = await fetch(`https://graph.facebook.com/v20.0/${pageId}/feed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: postTexto,
                    access_token: pageToken
                })
            });

            const metaData = await metaRes.json();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ exito: true, publicacionId: metaData.id, post: postTexto }));
        } catch (err) {
            console.error('Error en /api/publicar-meta:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Error publicando en Meta' }));
        }
    }

    // ==========================================
    // 3. ENRUTADOR ESTÁTICO COMPLETO
    // ==========================================
    const filePath = resolvePath(pathname);

    if (!filePath) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
        return res.end('Página no encontrada');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
    console.log(`Servidor comercial Shefa Plus Global activo en puerto ${PORT}`);
});
        
