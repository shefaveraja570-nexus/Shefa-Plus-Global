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

const server = http.createServer(async (req, res) => {
    // Cabeceras CORS
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
    // 1. ENDPOINT: ATENCIÓN AL CLIENTE CON GEMINI
    // ==========================================
    if (pathname === '/api/chat' && req.method === 'POST') {
        try {
            const { mensaje } = await readJson();
            const apiKey = process.env.GEMINI_API_KEY;

            if (!apiKey) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Falta configurar GEMINI_API_KEY' }));
            }

            const promptSistema = `Eres el asistente oficial de confianza de Shefa Plus Global (shefaplusglobal.com), una plataforma tecnológica y fintech en Colombia basada en principios de abundancia (Shefá), sustento (Parnasá) y tecnología de punta.
Tu misión es atender con calidez, profesionalismo y visión estratégica a clientes e inversionistas. Explica los activos, proyectos y la propuesta de valor de la plataforma e invítalos cordialmente a contactarse. Respuestas concisas y profesionales.`;

            const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        role: 'user',
                        parts: [{ text: `${promptSistema}\n\nPregunta del usuario: ${mensaje}` }]
                    }]
                })
            });

            const data = await geminiRes.json();
            const respuesta = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Estamos atentos para atenderte. Por favor déjanos tu mensaje.';

            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ respuesta }));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Error procesando la solicitud' }));
        }
    }

    // ==========================================
    // 2. ENDPOINT: PUBLICAR EN META CON GEMINI
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

            // A. Redactar el post con Gemini
            const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: 'Redacta un post publicitario persuasivo y profesional para Facebook sobre Shefa Plus Global (shefaplusglobal.com), destacando la visión tecnológica, innovación y oportunidades de inversión. Incluye llamada a la acción y 4 hashtags.'
                        }]
                    }]
                })
            });

            const geminiData = await geminiRes.json();
            const postTexto = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

            // B. Publicar en Facebook/Meta Graph API
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
    // 3. SERVIR ARCHIVOS ESTÁTICOS (HTML, CSS, JS)
    // ==========================================
    let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    if (safePath === '/' || safePath === '\\') safePath = '/index.html';
    const filePath = path.join(__dirname, safePath);

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            return res.end('Página no encontrada');
        }
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
    });
});

server.listen(PORT, () => {
    console.log(`Servidor Shefa Plus Global ejecutándose en el puerto ${PORT}`);
});
  
