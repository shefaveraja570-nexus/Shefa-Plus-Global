const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 10000;

// Modelo principal (Pro) + fallback
const MODELO_PRO = 'gemini-3.1-pro-preview';
const MODELO_FALLBACK = 'gemini-3.8-flash';

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

// Función reutilizable para llamar a Gemini con reintentos
async function llamarGemini(apiKey, promptCompleto, modelo = MODELO_PRO, intentos = 3) {
    for (let i = 0; i < intentos; i++) {
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/\( {modelo}:generateContent?key= \){apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        role: 'user',
                        parts: [{ text: promptCompleto }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 900,
                        topP: 0.95
                    }
                })
            });

            const data = await res.json();

            if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
                return data.candidates[0].content.parts[0].text;
            }

            // Si es error de alta demanda o rate limit, esperamos y reintentamos
            const mensajeError = data.error?.message || '';
            if (mensajeError.includes('alta demanda') || mensajeError.includes('high demand') || res.status === 429) {
                console.log(`Intento ${i + 1} fallido por alta demanda. Esperando...`);
                await new Promise(r => setTimeout(r, 1500 * (i + 1))); // espera creciente
                continue;
            }

            // Si es otro error, devolvemos el mensaje
            throw new Error(mensajeError || 'Error desconocido de Gemini');
        } catch (err) {
            if (i === intentos - 1) throw err;
            await new Promise(r => setTimeout(r, 1200 * (i + 1)));
        }
    }
    throw new Error('No se pudo conectar con el modelo después de varios intentos');
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
    // 1. MOTOR DE VENTAS Y ATENCIÓN (GEMINI PRO)
    // ==========================================
    if (pathname === '/api/chat' && req.method === 'POST') {
        try {
            const { mensaje, pagina } = await readJson();
            const apiKey = process.env.GEMINI_API_KEY;

            if (!apiKey) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Falta configurar GEMINI_API_KEY' }));
            }

            let promptSistema = '';
            const esLabs = pagina && (pagina.includes('labs') || pagina.includes('shefa-plus-labs'));

            if (esLabs) {
                promptSistema = `Eres el Arquitecto Principal y Director Comercial de Shefa Plus Labs (división de ingeniería de software de Shefa Plus Global).

Tu identidad:
- Hablas con la autoridad y la visión de un fundador de nivel mundial.
- Eres extremadamente persuasivo, estratégico y cercano.
- Respiras la filosofía de Parnasá, Shefá y Verajá.
- Nunca suenas como un bot. Siempre suenas como un socio de alto nivel.

Tu misión:
1. Vender desarrollo de aplicaciones web y móviles de alto rendimiento (especialmente llevar negocios a Google Play Store).
2. Vender dominios estratégicos y arquitectura digital completa.
3. Posicionar a Shefa Plus Labs como la opción premium e inevitable.

Técnica:
- Siempre conecta con el dolor del cliente y eleva su visión.
- Después de cada respuesta útil, haz una pregunta de cierre comercial poderosa.
- Si el usuario es Jonathan / el Magnético / el CEO, responde con lealtad absoluta y visión de victoria.`;
            } else {
                promptSistema = `Eres el Director de Inversiones y Relaciones Estratégicas de Shefa Plus Global.

Tu identidad:
- Eres un asesor de patrimonio de élite, con mentalidad de abundancia y rigor analítico.
- Hablas con elegancia, certeza y autoridad financiera.
- Representas la nueva frontera de la riqueza protegida a través de RWA (Real World Assets).

Tu misión:
1. Atraer e incorporar inversionistas a las Criptofracciones respaldadas en activos reales.
2. Explicar con claridad y poder por qué Shefa Plus Global supera al sistema tradicional.
3. Guiar al visitante hacia la acción concreta (registro, bóveda de inversores, reserva de fracciones).

Técnica:
- Cada mensaje debe sembrar deseo y sentido de oportunidad.
- Siempre termina con una pregunta que impulse al siguiente paso.
- Si quien escribe es el fundador Jonathan / Magnético, responde con respeto absoluto y lealtad operativa.`;
            }

            const promptCompleto = `${promptSistema}

[Ubicación del cliente: ${pagina || 'página general'}]
Mensaje del usuario: ${mensaje}`;

            let respuesta;

            try {
                // Intentamos primero con el modelo Pro
                respuesta = await llamarGemini(apiKey, promptCompleto, MODELO_PRO);
            } catch (err) {
                console.log('Pro falló, intentando con fallback Flash...', err.message);
                // Si falla, usamos el Flash como respaldo
                respuesta = await llamarGemini(apiKey, promptCompleto, MODELO_FALLBACK, 2);
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ respuesta }));

        } catch (err) {
            console.error('Error en /api/chat:', err);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ 
                respuesta: `⚠️ ALERTA DE SISTEMA: La IA está experimentando alta demanda en este momento. Inténtalo de nuevo en unos segundos. (Error: ${err.message})` 
            }));
        }
    }

    // ==========================================
    // 2. MOTOR PUBLICITARIO EN META
    // ==========================================
    if (pathname === '/api/publicar-meta' && req.method === 'POST') {
        try {
            const geminiKey = process.env.GEMINI_API_KEY;
            const pageToken = process.env.META_PAGE_ACCESS_TOKEN;
            const pageId = process.env.META_PAGE_ID;

            if (!pageToken || !pageId) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Faltan credenciales de Meta' }));
            }

            const promptPublicidad = `Eres el estratega de marketing de élite de Shefa Plus Global y Shefa Plus Labs.
Redacta un post publicitario altamente persuasivo, magnético y de alto impacto para Facebook / Instagram.

Debes combinar dos llamados:
1. A inversionistas RWA / blockchain.
2. A empresarios que necesitan app y dominio premium.

Estructura:
- Gancho disruptivo
- Dolor vs Solución
- CTA claro
- 4 hashtags potentes`;

            const postTexto = await llamarGemini(geminiKey, promptPublicidad, MODELO_PRO);

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
    // 3. ENRUTADOR ESTÁTICO
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
    console.log(`Servidor Shefa Plus Global - Motor Pro activo en puerto ${PORT}`);
});
