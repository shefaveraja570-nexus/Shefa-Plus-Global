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

// Resuelve tanto rutas directas como rutas limpias sin extensión .html
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
    // 1. ENDPOINT: CHAT CONTEXTUAL CON GEMINI
    // ==========================================
    if (pathname === '/api/chat' && req.method === 'POST') {
        try {
            const { mensaje, pagina } = await readJson();
            const apiKey = process.env.GEMINI_API_KEY;

            if (!apiKey) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Falta configurar GEMINI_API_KEY' }));
            }

            // --- PROMPTS EDUCADOS SEGÚN LA SECCIÓN ---
            let promptSistema = '';
            const esLabs = pagina && (pagina.includes('labs') || pagina.includes('shefa-plus-labs'));

            if (esLabs) {
                promptSistema = `Eres el Asistente Ejecutivo de "Shefa Plus Labs" (división de ingeniería de Shefa Plus Global - shefaplusglobal.com).
Tu misión comercial es:
1. Asesorar y cotizar el desarrollo de aplicaciones web y móviles a la medida (PWA, fintech, arquitecturas seguras y modo offline).
2. Asesorar en adquisición, configuración y delegación de dominios web estratégicos para empresas.
3. Resaltar la calidad de ingeniería, soporte y velocidad de entrega de Shefa Plus Labs.
Enfoque de venta: Sé persuasivo, resolutivo, técnico y formal. Invita siempre al cliente a detallar su idea para armarle una cotización y conectar con el equipo directivo. Si quien te escribe es tu CEO o fundador, dale bienvenida ejecutiva con lealtad y total disposición.`;
            } else {
                promptSistema = `Eres el Asistente Oficial de "Shefa Plus Global" (shefaplusglobal.com), ecosistema tecnológico y fintech en Colombia guiado por principios de excelencia, abundancia (Shefá) y sustento (Parnasá).
Tu misión es atender con visión de negocios a clientes e inversionistas interesados en tokenización RWA, soluciones tecnológicas y expansión corporativa. Si quien te escribe es tu CEO o fundador, salúdalo con respeto institucional y completa disposición operativa.`;
            }

            // Llamada oficial a Gemini 1.5 Flash
            const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        role: 'user',
                        parts: [{ text: `${promptSistema}\n\n[El cliente está viendo: ${pagina || 'página general'}]\nConsulta del usuario: ${mensaje}` }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 600
                    }
                })
            });

            const data = await geminiRes.json();
            const respuesta = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Estamos atentos a tu consulta. Por favor cuéntanos más detalles.';

            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ respuesta }));
        } catch (err) {
            console.error('Error en /api/chat:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Error procesando la solicitud' }));
        }
    }

    // ==========================================
    // 2. ENDPOINT: PUBLICACIÓN EN META
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

            const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: 'Redacta un post publicitario persuasivo para Facebook sobre Shefa Plus Global y Shefa Plus Labs (shefaplusglobal.com), destacando el desarrollo de aplicaciones y dominios web. Incluye llamada a la acción y 4 hashtags.' }]
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
    console.log(`Servidor Shefa Plus Global activo en puerto ${PORT}`);
});
