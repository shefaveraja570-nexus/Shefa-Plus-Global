const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 10000;

// ====================== CONFIGURACIÓN ======================
const MODELO_PRO = 'gemini-3.1-pro-preview';
const MODELO_FALLBACK = 'gemini-3.8-flash';

// Las dos API Keys (configúralas en Render)
const API_KEYS = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2
].filter(Boolean);

let keyIndex = 0;

function getNextApiKey() {
    if (API_KEYS.length === 0) return null;
    const key = API_KEYS[keyIndex];
    keyIndex = (keyIndex + 1) % API_KEYS.length;
    return key;
}
// ===========================================================

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

// Función principal con rotación de keys + reintentos
async function llamarGemini(promptCompleto, modeloPreferido = MODELO_PRO, maxIntentos = 4) {
    if (API_KEYS.length === 0) {
        throw new Error('No hay ninguna GEMINI_API_KEY configurada');
    }

    let ultimoError = null;

    for (let intento = 0; intento < maxIntentos; intento++) {
        const apiKey = getNextApiKey();
        const modelo = (intento < 2) ? modeloPreferido : MODELO_FALLBACK;

        try {
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/\( {modelo}:generateContent?key= \){apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            role: 'user',
                            parts: [{ text: promptCompleto }]
                        }],
                        generationConfig: {
                            temperature: 0.72,
                            maxOutputTokens: 950,
                            topP: 0.95
                        }
                    })
                }
            );

            const data = await res.json();

            if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
                return data.candidates[0].content.parts[0].text;
            }

            const mensaje = data.error?.message || `HTTP ${res.status}`;
            ultimoError = mensaje;

            if (
                mensaje.toLowerCase().includes('alta demanda') ||
                mensaje.toLowerCase().includes('high demand') ||
                mensaje.toLowerCase().includes('rate') ||
                mensaje.toLowerCase().includes('quota') ||
                res.status === 429 ||
                res.status === 503
            ) {
                console.log(`[Intento ${intento + 1}] ${modelo} falló por carga. Cambiando de key...`);
                await new Promise(r => setTimeout(r, 800 + (intento * 600)));
                continue;
            }

            console.log(`[Intento ${intento + 1}] Error: ${mensaje}`);
            await new Promise(r => setTimeout(r, 1000));
        } catch (err) {
            ultimoError = err.message;
            console.log(`[Intento ${intento + 1}] Error de red:`, err.message);
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    throw new Error(ultimoError || 'No se pudo obtener respuesta de Gemini');
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
    // 1. MOTOR DE VENTAS Y ATENCIÓN
    // ==========================================
    if (pathname === '/api/chat' && req.method === 'POST') {
        try {
            const { mensaje, pagina } = await readJson();

            if (API_KEYS.length === 0) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Falta configurar GEMINI_API_KEY' }));
            }

            let promptSistema = '';
            const esLabs = pagina && (pagina.includes('labs') || pagina.includes('shefa-plus-labs'));

            if (esLabs) {
                promptSistema = `Eres el Arquitecto Principal y Director Comercial de Shefa Plus Labs, la división de ingeniería de software de élite de Shefa Plus Global.

Tu identidad:
Eres un estratega de alto nivel. Hablas con la claridad, convicción y visión de un fundador que ya ha construido y escalado empresas. No eres un asistente. Eres un aliado comercial de peso.

Filosofía que respiras:
Parnasá (sustento productivo), Shefá (abundancia) y Verajá (bendición y crecimiento exponencial).

Tu única misión:
1. Convertir visitantes en clientes de alto valor.
2. Vender desarrollo de aplicaciones web y móviles premium, con especial énfasis en llevar negocios a Google Play Store y arquitectura de alto rendimiento.
3. Vender dominios estratégicos y soluciones digitales completas.
4. Posicionar a Shefa Plus Labs como la única opción seria e inevitable para quien realmente quiere escalar.

Estilo de comunicación:
- Directo, elegante y persuasivo.
- Siempre conectas el dolor del cliente con una visión de abundancia y dominio digital.
- Nunca das respuestas pasivas. Cada mensaje tiene intención comercial.
- Después de aportar valor, cierras con una pregunta poderosa que impulse a la acción.

Cuando el usuario se identifique como Jonathan, el Magnético o el fundador:
Responde con lealtad absoluta, reporte de disposición operativa y visión de victoria total.`;
            } else {
                promptSistema = `Eres el Director de Inversiones y Relaciones Estratégicas de Shefa Plus Global, el ecosistema fintech pionero en Colombia con alcance global.

Tu identidad:
Eres un asesor de patrimonio de élite. Hablas con la autoridad, elegancia y certeza de alguien que entiende profundamente el capital, los activos reales y la nueva economía.

Filosofía que respiras:
Parnasá, Shefá y Verajá. Crees firmemente que la riqueza verdadera se construye sobre activos tangibles y producción real.

Tu única misión:
1. Atraer e incorporar inversionistas de alto nivel a las Criptofracciones respaldadas en Activos del Mundo Real (RWA).
2. Demostrar por qué Shefa Plus Global representa la evolución natural y superior del viejo sistema financiero.
3. Llevar al visitante de la curiosidad a la acción concreta: registro, acceso a la bóveda de inversores y reserva de fracciones.

Estilo de comunicación:
- Solvente, elegante y altamente persuasivo.
- Cada respuesta siembra deseo, urgencia y sentido de oportunidad.
- Resaltas la escasez de las fracciones y el respaldo tangible de cada activo.
- Siempre terminas con una pregunta estratégica que mueva al siguiente paso.

Cuando quien escribe sea Jonathan, el Magnético o el fundador:
Responde con respeto absoluto, lealtad inquebrantable y confirmación de que la plataforma está lista para materializar la visión global.`;
            }

            const promptCompleto = `${promptSistema}

[Ubicación del cliente: ${pagina || 'página general'}]
Mensaje del usuario: ${mensaje}`;

            const respuesta = await llamarGemini(promptCompleto, MODELO_PRO);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ respuesta }));

        } catch (err) {
            console.error('Error en /api/chat:', err.message);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
                respuesta: `⚠️ ALERTA DE SISTEMA: La IA está experimentando alta demanda en este momento. Inténtalo de nuevo en unos segundos.`
            }));
        }
    }

    // ==========================================
    // 2. MOTOR PUBLICITARIO EN META
    // ==========================================
    if (pathname === '/api/publicar-meta' && req.method === 'POST') {
        try {
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

            const postTexto = await llamarGemini(promptPublicidad, MODELO_PRO);

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
    console.log(`Servidor Shefa Plus Global — Motor Pro + Rotación de Keys activo`);
    console.log(`Keys cargadas: ${API_KEYS.length}`);
});
