'use strict';

/**
 * SHEFA-SHOP GLOBAL — SALES, VIDEO STREAMING & PAYMENTS ENGINE
 * Node.js 18+ (Zero external dependencies required)
 *
 * Start: node server.js
 *
 * Environment variables (Render):
 * PORT=3000
 * CJ_API_KEY=your_cjdropshipping_api_key
 * GEMINI_API_KEY=your_gemini_api_key
 * GEMINI_MODEL=gemini-2.5-flash
 * MP_ACCESS_TOKEN=APP_USR-xxxxxxxx (Token de Producción/Prueba de Mercado Pago)
 * MP_PUBLIC_KEY=APP_USR-xxxxxxxx (Public Key de Mercado Pago)
 * BBVA_ACCOUNT_NUMBER=tu_numero_cuenta_bbva (Opcional para transferencia directa BBVA)
 * BBVA_ACCOUNT_TYPE=Ahorros
 * BBVA_HOLDER_NAME=Shefa Plus Global
 * WHATSAPP_NUMBER=573000000000
 * SHEFA_ALLOWED_ORIGIN=https://www.shefaplusglobal.com
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const APP_NAME = 'Shefa-Shop Global';
const APP_VERSION = '3.0.0';
const PORT = Number.parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

const ROOT_DIR = path.resolve(__dirname);
const MAX_BODY_SIZE = 2 * 1024 * 1024;
const EXTERNAL_TIMEOUT_MS = 20000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 180;

// APIs Externas
const CJ_API_BASE = 'https://developers.cjdropshipping.com/api2.0/v1';
const CJ_AUTH_URL = `${CJ_API_BASE}/authentication/getAccessToken`;
const MP_API_BASE = 'https://api.mercadopago.com';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// Configuración de Pagos: Mercado Pago, Mastercard y BBVA
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN || '';
const MP_PUBLIC_KEY = process.env.MP_PUBLIC_KEY || process.env.MERCADOPAGO_PUBLIC_KEY || '';
const BBVA_CONFIG = Object.freeze({
    bankName: 'BBVA Colombia',
    accountType: process.env.BBVA_ACCOUNT_TYPE || 'Ahorros',
    accountNumber: process.env.BBVA_ACCOUNT_NUMBER || '',
    holderName: process.env.BBVA_HOLDER_NAME || 'Shefa Plus Global Shop',
    holderDoc: process.env.BBVA_HOLDER_DOC || '',
    whatsappNumber: process.env.WHATSAPP_NUMBER || ''
});

const ALLOWED_ORIGIN = process.env.SHEFA_ALLOWED_ORIGIN || '';

const MIME_TYPES = Object.freeze({
    '.html': 'text/html; charset=utf-8',
    '.htm': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.csv': 'text/csv; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.avif': 'image/avif',
    '.pdf': 'application/pdf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.mp4': 'video/mp4',
    '.m4v': 'video/mp4',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json',
    '.webmanifest': 'application/manifest+json'
});

const MEDIA_EXTENSIONS = new Set([
    '.mp4', '.m4v', '.mov', '.webm', '.ogg', '.mp3', '.wav',
    '.glb', '.gltf', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.avif'
]);

const STREAMABLE_EXTENSIONS = new Set(['.mp4', '.m4v', '.mov', '.webm', '.ogg', '.mp3', '.wav']);

const SECURITY_HEADERS = Object.freeze({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
});

const rateLimitStore = new Map();

let cjTokenCache = {
    accessToken: '',
    refreshToken: '',
    expiresAt: 0
};

let cjAuthPromise = null;

/* -------------------------------------------------------
   UTILIDADES GENERALES
------------------------------------------------------- */

function log(level, message, details = {}) {
    const safeDetails = { ...details };
    delete safeDetails.apiKey;
    delete safeDetails.accessToken;
    delete safeDetails.refreshToken;
    delete safeDetails.token;
    delete safeDetails.password;

    const logger = typeof console[level] === 'function' ? console[level] : console.log;
    logger(
        JSON.stringify({
            timestamp: new Date().toISOString(),
            application: APP_NAME,
            version: APP_VERSION,
            level,
            message,
            details: safeDetails
        })
    );
}

function jsonResponse(res, statusCode, payload, extraHeaders = {}) {
    const body = JSON.stringify(payload);

    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        ...SECURITY_HEADERS,
        ...extraHeaders
    });

    res.end(body);
}

function successResponse(res, data, statusCode = 200) {
    return jsonResponse(res, statusCode, {
        success: true,
        data
    });
}

function errorResponse(res, statusCode, code, message) {
    return jsonResponse(res, statusCode, {
        success: false,
        error: {
            code,
            message
        }
    });
}

function isPositiveInteger(value, fallback, maximum = 100) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed) || parsed < 1) {
        return fallback;
    }
    return Math.min(parsed, maximum);
}

function cleanString(value, maximumLength = 2000) {
    if (typeof value !== 'string') {
        return '';
    }
    return value.trim().slice(0, maximumLength);
}

function isValidCountryCode(country) {
    return /^[A-Z]{2}$/.test(String(country || '').toUpperCase());
}

function getClientIdentifier(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
        return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || 'unknown';
}

function applyCors(req, res) {
    const origin = req.headers.origin;
    if (!origin) {
        return true;
    }

    if (ALLOWED_ORIGIN && origin === ALLOWED_ORIGIN) {
        res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    } else {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');
    res.setHeader('Access-Control-Max-Age', '600');
    return true;
}

function checkRateLimit(req, res) {
    const now = Date.now();
    const client = getClientIdentifier(req);

    let record = rateLimitStore.get(client);
    if (!record || now >= record.resetAt) {
        record = {
            count: 0,
            resetAt: now + RATE_LIMIT_WINDOW_MS
        };
    }

    record.count += 1;
    rateLimitStore.set(client, record);

    if (record.count > RATE_LIMIT_MAX_REQUESTS) {
        res.setHeader('Retry-After', String(Math.ceil((record.resetAt - now) / 1000)));
        errorResponse(res, 429, 'RATE_LIMIT_EXCEEDED', 'Demasiadas solicitudes. Intenta nuevamente en un momento.');
        return false;
    }

    return true;
}

const rateLimitCleanup = setInterval(() => {
    const now = Date.now();
    for (const [client, record] of rateLimitStore.entries()) {
        if (now >= record.resetAt) {
            rateLimitStore.delete(client);
        }
    }
}, RATE_LIMIT_WINDOW_MS);
rateLimitCleanup.unref();

async function readJsonBody(req, maxBytes = MAX_BODY_SIZE) {
    return new Promise((resolve, reject) => {
        let body = '';
        let bytes = 0;
        let settled = false;

        req.on('data', chunk => {
            if (settled) return;
            bytes += chunk.length;

            if (bytes > maxBytes) {
                settled = true;
                reject(Object.assign(new Error('El cuerpo de la solicitud es demasiado grande.'), { statusCode: 413 }));
                req.destroy();
                return;
            }
            body += chunk.toString('utf8');
        });

        req.on('end', () => {
            if (settled) return;
            settled = true;

            if (!body.trim()) {
                resolve({});
                return;
            }

            try {
                const parsed = JSON.parse(body);
                if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
                    reject(Object.assign(new Error('El cuerpo JSON debe ser un objeto.'), { statusCode: 400 }));
                    return;
                }
                resolve(parsed);
            } catch {
                reject(Object.assign(new Error('El JSON enviado no es válido.'), { statusCode: 400 }));
            }
        });

        req.on('error', error => {
            if (!settled) {
                settled = true;
                reject(error);
            }
        });
    });
}

async function fetchJson(url, options = {}, timeoutMs = EXTERNAL_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    timeout.unref();

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });

        const rawText = await response.text();
        let data;

        try {
            data = rawText ? JSON.parse(rawText) : {};
        } catch {
            data = { message: rawText.slice(0, 500) };
        }

        return {
            ok: response.ok,
            status: response.status,
            data
        };
    } catch (error) {
        if (error.name === 'AbortError') {
            throw Object.assign(new Error('El servicio externo tardó demasiado en responder.'), { code: 'EXTERNAL_TIMEOUT' });
        }
        throw Object.assign(new Error('No fue posible conectar con el servicio externo.'), { code: 'EXTERNAL_CONNECTION_ERROR' });
    } finally {
        clearTimeout(timeout);
    }
}

/* -------------------------------------------------------
   MOTOR DE PAGOS: MERCADO PAGO + MASTERCARD + BBVA COLOMBIA
------------------------------------------------------- */

function getOriginBaseUrl(req) {
    if (ALLOWED_ORIGIN) {
        return ALLOWED_ORIGIN.replace(/\/+$/, '');
    }
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host || 'www.shefaplusglobal.com';
    return `${proto}://${host}`;
}

function handlePaymentMethods(res) {
    return successResponse(res, {
        currency: 'COP',
        mercadoPagoConfigured: Boolean(MP_ACCESS_TOKEN),
        publicKey: MP_PUBLIC_KEY || null,
        methods: [
            {
                id: 'mercadopago',
                name: 'Mercado Pago (Checkout Pro)',
                enabled: true,
                description: 'Paga seguro con tu cuenta de Mercado Pago, PSE, Nequi o efectivo.'
            },
            {
                id: 'mastercard',
                name: 'Mastercard (Crédito / Débito)',
                enabled: true,
                description: 'Tarjetas Mastercard Débito y Crédito hasta en 36 cuotas vía pasarela segura.'
            },
            {
                id: 'bbva',
                name: 'BBVA Colombia (PSE / Tarjetas BBVA / Transferencia)',
                enabled: true,
                description: 'Pago directo con tarjetas BBVA, débito PSE BBVA o transferencia bancaria BBVA.',
                bankDetails: BBVA_CONFIG.accountNumber
                    ? {
                        bank: BBVA_CONFIG.bankName,
                        accountType: BBVA_CONFIG.accountType,
                        accountNumber: BBVA_CONFIG.accountNumber,
                        holderName: BBVA_CONFIG.holderName,
                        holderDoc: BBVA_CONFIG.holderDoc
                    }
                    : null
            }
        ]
    });
}

async function handleCreateCheckout(req, res) {
    try {
        const body = await readJsonBody(req);
        const paymentMethod = cleanString(body.paymentMethod || body.method || 'mercadopago', 40).toLowerCase();

        // Normalizar lista de productos (acepta array "items" o un producto directo)
        const rawItems = Array.isArray(body.items) && body.items.length > 0
            ? body.items
            : [
                {
                    id: body.id || body.productId || 'SHEFA-ITEM-1',
                    title: body.title || body.name || 'Producto Shefa Plus Global',
                    quantity: body.quantity || 1,
                    unit_price: body.price || body.unit_price || body.amount || 0,
                    picture_url: body.image || body.picture_url || ''
                }
            ];

        const normalizedItems = [];
        let totalCOP = 0;

        for (const item of rawItems) {
            const title = cleanString(String(item.title || item.name || 'Producto Shefa Plus Global'), 180);
            const quantity = isPositiveInteger(item.quantity, 1, 50);
            const rawPrice = Number(String(item.unit_price ?? item.price ?? 0).replace(/[^0-9.]/g, ''));
            const unitPrice = Math.round(Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : 0);

            if (unitPrice <= 0) {
                return errorResponse(res, 400, 'INVALID_ITEM_PRICE', `El precio del producto "${title}" debe ser mayor a 0 COP.`);
            }

            totalCOP += unitPrice * quantity;
            normalizedItems.push({
                id: cleanString(String(item.id || 'SHEFA-PROD'), 80),
                title,
                quantity,
                currency_id: 'COP',
                unit_price: unitPrice
            });
        }

        const buyer = {
            name: cleanString(body.payer?.name || body.customerName || body.name || '', 120),
            email: cleanString(body.payer?.email || body.customerEmail || body.email || 'cliente@shefaplusglobal.com', 150),
            phone: cleanString(body.payer?.phone || body.customerPhone || body.phone || '', 40),
            address: cleanString(body.payer?.address || body.shippingAddress || body.address || '', 250),
            city: cleanString(body.payer?.city || body.city || 'Colombia', 100)
        };

        const orderReference = `SHEFA-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        const baseUrl = getOriginBaseUrl(req);

        // Si el cliente elige transferencia directa BBVA y hay cuenta BBVA configurada
        if (paymentMethod === 'bbva_transfer' && BBVA_CONFIG.accountNumber) {
            return successResponse(res, {
                provider: 'BBVA Colombia Directo',
                paymentMethod: 'bbva',
                orderReference,
                totalCOP,
                currency: 'COP',
                bankInstructions: {
                    bank: BBVA_CONFIG.bankName,
                    accountType: BBVA_CONFIG.accountType,
                    accountNumber: BBVA_CONFIG.accountNumber,
                    holderName: BBVA_CONFIG.holderName,
                    holderDoc: BBVA_CONFIG.holderDoc,
                    reference: orderReference
                }
            });
        }

        // Si MP_ACCESS_TOKEN está configurado en Render, creamos la Preferencia oficial en Mercado Pago
        // que procesa Mercado Pago, Tarjetas Mastercard (Crédito/Débito) y BBVA (PSE y Tarjetas BBVA).
        if (MP_ACCESS_TOKEN) {
            let excludedPaymentTypes = [];

            if (paymentMethod === 'mastercard') {
                // Prioriza el formulario de Tarjeta de Crédito / Débito Mastercard
                excludedPaymentTypes = [{ id: 'ticket' }];
            } else if (paymentMethod === 'bbva') {
                // Habilita PSE (BBVA Colombia) y Tarjetas BBVA Débito/Crédito
                excludedPaymentTypes = [{ id: 'ticket' }];
            }

            const preferencePayload = {
                items: normalizedItems,
                payer: {
                    name: buyer.name || 'Cliente Shefa Plus',
                    email: buyer.email
                },
                payment_methods: {
                    excluded_payment_types: excludedPaymentTypes,
                    installments: 36
                },
                back_urls: {
                    success: `${baseUrl}/?payment=success&ref=${encodeURIComponent(orderReference)}`,
                    failure: `${baseUrl}/?payment=failure&ref=${encodeURIComponent(orderReference)}`,
                    pending: `${baseUrl}/?payment=pending&ref=${encodeURIComponent(orderReference)}`
                },
                auto_return: 'approved',
                external_reference: orderReference,
                statement_descriptor: 'SHEFA PLUS GLOBAL',
                metadata: {
                    selected_method: paymentMethod,
                    buyer_phone: buyer.phone,
                    buyer_address: buyer.address,
                    buyer_city: buyer.city
                }
            };

            const mpResult = await fetchJson(`${MP_API_BASE}/checkout/preferences`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                    'X-Idempotency-Key': orderReference
                },
                body: JSON.stringify(preferencePayload)
            });

            if (!mpResult.ok || !mpResult.data?.init_point) {
                log('error', 'Mercado Pago preference creation failed', {
                    status: mpResult.status,
                    response: mpResult.data
                });
                return errorResponse(
                    res,
                    502,
                    'PAYMENT_GATEWAY_ERROR',
                    'No fue posible generar el link de pago con Mercado Pago. Verifica tu MP_ACCESS_TOKEN en Render.'
                );
            }

            return successResponse(res, {
                provider: 'Mercado Pago / Mastercard / BBVA',
                paymentMethod,
                orderReference,
                preferenceId: mpResult.data.id,
                checkoutUrl: mpResult.data.init_point,
                sandboxUrl: mpResult.data.sandbox_init_point || null,
                totalCOP,
                currency: 'COP'
            });
        }

        // Modo de respaldo si aún no has pegado MP_ACCESS_TOKEN en las variables de entorno de Render
        return jsonResponse(res, 200, {
            success: true,
            data: {
                provider: 'Shefa Checkout Standby',
                paymentMethod,
                orderReference,
                totalCOP,
                currency: 'COP',
                configured: false,
                message: 'Agrega MP_ACCESS_TOKEN en las variables de entorno de Render para activar el cobro automático con Mercado Pago, Mastercard y BBVA.',
                bbvaDirect: BBVA_CONFIG.accountNumber ? BBVA_CONFIG : null
            }
        });
    } catch (error) {
        log('error', 'Checkout creation error', { error: error.message });
        return errorResponse(
            res,
            error.statusCode || 500,
            'CHECKOUT_ERROR',
            error.message || 'No se pudo procesar la solicitud de pago.'
        );
    }
}

async function handleMercadoPagoWebhook(req, url, res) {
    try {
        const body = await readJsonBody(req);
        const paymentId = url.searchParams.get('data.id') || url.searchParams.get('id') || body?.data?.id || body?.id;
        const topic = url.searchParams.get('type') || url.searchParams.get('topic') || body?.type || body?.action;

        log('info', 'Webhook de pago recibido', { topic, paymentId });

        if (MP_ACCESS_TOKEN && paymentId && (topic === 'payment' || String(topic).includes('payment'))) {
            const verification = await fetchJson(`${MP_API_BASE}/v1/payments/${encodeURIComponent(String(paymentId))}`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${MP_ACCESS_TOKEN}`
                }
            });

            if (verification.ok) {
                log('info', 'Estado de pago verificado en Mercado Pago', {
                    paymentId,
                    status: verification.data?.status,
                    paymentMethodId: verification.data?.payment_method_id,
                    externalReference: verification.data?.external_reference
                });
            }
        }

        return successResponse(res, { received: true });
    } catch (error) {
        log('error', 'Error procesando webhook de Mercado Pago', { error: error.message });
        return successResponse(res, { received: true });
    }
}

/* -------------------------------------------------------
   CJ DROPSHIPPING
------------------------------------------------------- */

function cjCredentialsAvailable() {
    return Boolean(process.env.CJ_API_KEY);
}

async function authenticateCJ() {
    const apiKey = process.env.CJ_API_KEY;

    if (!apiKey) {
        throw Object.assign(
            new Error('La integración con CJdropshipping no está configurada.'),
            { code: 'CJ_NOT_CONFIGURED' }
        );
    }

    if (cjTokenCache.accessToken && Date.now() < cjTokenCache.expiresAt - 60_000) {
        return cjTokenCache.accessToken;
    }

    if (cjAuthPromise) {
        return cjAuthPromise;
    }

    cjAuthPromise = (async () => {
        const result = await fetchJson(CJ_AUTH_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify({ apiKey })
        });

        if (!result.ok) {
            throw Object.assign(
                new Error('CJdropshipping rechazó la autenticación.'),
                { code: 'CJ_AUTH_FAILED', upstreamStatus: result.status }
            );
        }

        const data = result.data?.data || {};
        if (!data.accessToken) {
            throw Object.assign(
                new Error('CJdropshipping no devolvió un token válido.'),
                { code: 'CJ_INVALID_TOKEN_RESPONSE' }
            );
        }

        const expiresInSeconds = Number(data.expiresIn) || 14 * 24 * 60 * 60;
        cjTokenCache = {
            accessToken: data.accessToken,
            refreshToken: data.refreshToken || '',
            expiresAt: Date.now() + expiresInSeconds * 1000
        };

        return cjTokenCache.accessToken;
    })();

    try {
        return await cjAuthPromise;
    } finally {
        cjAuthPromise = null;
    }
}

async function cjRequest(endpoint, options = {}) {
    const token = await authenticateCJ();
    const method = options.method || 'GET';
    const headers = {
        Accept: 'application/json',
        'CJ-Access-Token': token,
        ...(options.headers || {})
    };

    const fetchOptions = { method, headers };
    if (options.body !== undefined) {
        headers['Content-Type'] = 'application/json';
        fetchOptions.body = JSON.stringify(options.body);
    }

    const result = await fetchJson(`${CJ_API_BASE}${endpoint}`, fetchOptions);

    if (result.status === 401 || result.status === 403) {
        cjTokenCache = { accessToken: '', refreshToken: '', expiresAt: 0 };
        throw Object.assign(
            new Error('CJdropshipping requiere una nueva autenticación.'),
            { code: 'CJ_AUTH_EXPIRED', upstreamStatus: result.status }
        );
    }

    if (!result.ok) {
        throw Object.assign(
            new Error('CJdropshipping no pudo completar la solicitud.'),
            { code: 'CJ_REQUEST_FAILED', upstreamStatus: result.status }
        );
    }

    const payload = result.data;
    if (
        payload &&
        typeof payload === 'object' &&
        payload.code !== undefined &&
        Number(payload.code) !== 200 &&
        Number(payload.code) !== 0
    ) {
        throw Object.assign(
            new Error(cleanString(payload.message || payload.msg, 300) || 'CJdropshipping devolvió un error.'),
            { code: 'CJ_API_ERROR' }
        );
    }

    return payload;
}

async function handleCJStatus(res) {
    if (!cjCredentialsAvailable()) {
        return successResponse(res, {
            provider: 'CJdropshipping',
            configured: false,
            authenticated: false,
            message: 'Configura CJ_API_KEY en las variables de entorno.'
        });
    }

    try {
        await authenticateCJ();
        return successResponse(res, {
            provider: 'CJdropshipping',
            configured: true,
            authenticated: true,
            message: 'La autenticación con CJdropshipping está disponible.'
        });
    } catch (error) {
        return jsonResponse(res, 502, {
            success: false,
            error: {
                code: error.code || 'CJ_CONNECTION_ERROR',
                message: error.message
            },
            data: {
                provider: 'CJdropshipping',
                configured: true,
                authenticated: false
            }
        });
    }
}

async function handleCJProducts(url, res) {
    if (!cjCredentialsAvailable()) {
        return errorResponse(res, 503, 'CJ_NOT_CONFIGURED', 'La integración con CJdropshipping no está configurada.');
    }

    const page = isPositiveInteger(url.searchParams.get('page'), 1, 100000);
    const size = isPositiveInteger(url.searchParams.get('limit') || url.searchParams.get('size'), 12, 100);

    try {
        const query = new URLSearchParams({ page: String(page), size: String(size) });
        const payload = await cjRequest(`/product/listV2?${query.toString()}`);
        const data = payload.data ?? payload;

        return successResponse(res, {
            provider: 'CJdropshipping',
            page,
            limit: size,
            products: Array.isArray(data) ? data : data.list || data.content || [],
            pagination: {
                total: data.total ?? null,
                page,
                limit: size
            }
        });
    } catch (error) {
        return errorResponse(
            res,
            error.code === 'CJ_NOT_CONFIGURED' ? 503 : 502,
            error.code || 'CJ_PRODUCTS_ERROR',
            error.message || 'No fue posible consultar el catálogo.'
        );
    }
}

async function handleCJStock(url, res) {
    if (!cjCredentialsAvailable()) {
        return errorResponse(res, 503, 'CJ_NOT_CONFIGURED', 'La integración con CJdropshipping no está configurada.');
    }

    const vid = cleanString(url.searchParams.get('vid'), 150);
    const sku = cleanString(url.searchParams.get('sku'), 150);

    if (!vid && !sku) {
        return errorResponse(res, 400, 'MISSING_PRODUCT_IDENTIFIER', 'Debes proporcionar vid o sku.');
    }

    try {
        const parameter = vid ? `vid=${encodeURIComponent(vid)}` : `sku=${encodeURIComponent(sku)}`;
        const endpoint = vid ? `/product/stock/queryByVid?${parameter}` : `/product/stock/queryBySku?${parameter}`;
        const payload = await cjRequest(endpoint);

        return successResponse(res, {
            provider: 'CJdropshipping',
            identifier: vid ? { vid } : { sku },
            inventory: payload.data ?? payload
        });
    } catch (error) {
        return errorResponse(res, 502, error.code || 'CJ_STOCK_ERROR', error.message || 'No fue posible consultar el inventario.');
    }
}

function handleCJShipping(url, res) {
    const country = cleanString(url.searchParams.get('country') || 'CO', 2).toUpperCase();
    const productId = cleanString(url.searchParams.get('pid'), 150);
    const variantId = cleanString(url.searchParams.get('vid'), 150);
    const quantity = isPositiveInteger(url.searchParams.get('quantity'), 1, 100);

    if (!isValidCountryCode(country)) {
        return errorResponse(res, 400, 'INVALID_COUNTRY', 'El país debe utilizar un código ISO de dos letras, por ejemplo CO.');
    }

    return jsonResponse(res, 501, {
        success: false,
        error: {
            code: 'SHIPPING_QUOTE_NOT_ENABLED',
            message: 'La cotización de envío en tiempo real requiere configurar el endpoint logístico con pid, vid, cantidad y país.'
        },
        request: {
            country,
            pid: productId || null,
            vid: variantId || null,
            quantity
        }
    });
}

/* -------------------------------------------------------
   RESOLUCIÓN INTELIGENTE DE ARCHIVOS Y VIDEO STREAMING (HTTP 206)
------------------------------------------------------- */

function findFileCaseInsensitive(targetPath) {
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
        return targetPath;
    }

    const dir = path.dirname(targetPath);
    const baseLower = path.basename(targetPath).toLowerCase();

    // Buscar ignorando mayúsculas/minúsculas en el mismo directorio y en carpetas comunes de recursos
    const candidateDirs = [
        dir,
        ROOT_DIR,
        path.join(ROOT_DIR, 'assets'),
        path.join(ROOT_DIR, 'videos'),
        path.join(ROOT_DIR, 'media'),
        path.join(ROOT_DIR, 'public'),
        path.join(ROOT_DIR, 'img'),
        path.join(ROOT_DIR, 'images')
    ];

    for (const searchDir of candidateDirs) {
        try {
            if (!fs.existsSync(searchDir) || !fs.statSync(searchDir).isDirectory()) {
                continue;
            }
            const files = fs.readdirSync(searchDir);
            const match = files.find(file => file.toLowerCase() === baseLower);
            if (match) {
                const resolved = path.join(searchDir, match);
                if (fs.statSync(resolved).isFile()) {
                    return resolved;
                }
            }
        } catch {
            // Continuar con el siguiente directorio candidato
        }
    }

    return null;
}

function serveStaticFileWithStreaming(req, res, filePath) {
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const isStreamable = STREAMABLE_EXTENSIONS.has(ext);
    const rangeHeader = req.headers.range;

    // Cabeceras que garantizan la reproducción fluida en Android (Chrome) y iPhone (Safari)
    const baseHeaders = {
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Cache-Control': isStreamable ? 'public, max-age=86400' : 'public, max-age=3600'
    };

    if (rangeHeader && isStreamable) {
        const parts = rangeHeader.replace(/bytes=/, '').split('-');
        const start = Number.parseInt(parts[0], 10);
        const end = parts[1] ? Number.parseInt(parts[1], 10) : fileSize - 1;

        if (Number.isNaN(start) || Number.isNaN(end) || start >= fileSize || end >= fileSize || start > end) {
            res.writeHead(416, {
                ...baseHeaders,
                'Content-Range': `bytes */${fileSize}`
            });
            return res.end();
        }

        const chunkSize = end - start + 1;
        res.writeHead(206, {
            ...baseHeaders,
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Content-Length': String(chunkSize)
        });

        if (req.method === 'HEAD') {
            return res.end();
        }

        const stream = fs.createReadStream(filePath, { start, end });
        stream.on('error', () => {
            if (!res.headersSent) {
                res.writeHead(500);
            }
            res.end();
        });
        req.on('close', () => stream.destroy());
        return stream.pipe(res);
    }

    // Si no envía cabecera Range, igual transmitimos por stream con soporte Accept-Ranges
    res.writeHead(200, {
        ...baseHeaders,
        ...(!MEDIA_EXTENSIONS.has(ext) ? SECURITY_HEADERS : {}),
        'Content-Length': String(fileSize)
    });

    if (req.method === 'HEAD') {
        return res.end();
    }

    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
        if (!res.headersSent) {
            res.writeHead(500);
        }
        res.end();
    });
    req.on('close', () => stream.destroy());
    return stream.pipe(res);
}

/* -------------------------------------------------------
   SERVIDOR HTTP PRINCIPAL
------------------------------------------------------- */

const server = http.createServer(async (req, res) => {
    try {
        applyCors(req, res);

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            return res.end();
        }

        const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
        const pathname = decodeURIComponent(parsedUrl.pathname);

        // 1. Endpoints de Salud para Render
        if (pathname === '/health' || pathname === '/api/health') {
            return successResponse(res, {
                status: 'ok',
                service: APP_NAME,
                version: APP_VERSION,
                videoStreaming: true,
                payments: ['mercadopago', 'mastercard', 'bbva']
            });
        }

        // Aplicar Rate Limit solo a rutas de API (para nunca limitar los fragmentos de video .mp4)
        if (pathname.startsWith('/api/') && !checkRateLimit(req, res)) {
            return;
        }

        // 2. Rutas de Pagos: Mercado Pago, Mastercard y BBVA Colombia
        if (pathname === '/api/payments/methods' || pathname === '/api/payments/config') {
            return handlePaymentMethods(res);
        }
        if (
            (pathname === '/api/payments/checkout' ||
                pathname === '/api/payments/create-preference' ||
                pathname === '/api/mercadopago/preference' ||
                pathname === '/api/checkout') &&
            req.method === 'POST'
        ) {
            return await handleCreateCheckout(req, res);
        }
        if (pathname === '/api/payments/webhook' && req.method === 'POST') {
            return await handleMercadoPagoWebhook(req, parsedUrl, res);
        }

        // 3. Rutas de CJ Dropshipping
        if (pathname === '/api/cj/status') {
            return await handleCJStatus(res);
        }
        if (pathname === '/api/cj/products') {
            return await handleCJProducts(parsedUrl, res);
        }
        if (pathname === '/api/cj/stock') {
            return await handleCJStock(parsedUrl, res);
        }
        if (pathname === '/api/cj/shipping') {
            return handleCJShipping(parsedUrl, res);
        }

        // 4. Servir Archivos Estáticos, Videos (.mp4), Modelos 3D (.glb) y Páginas HTML
        const relativePath = pathname === '/' ? '/index.html' : pathname;
        const safePath = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, '');
        let requestedFullPath = path.join(ROOT_DIR, safePath);
        const requestedExt = path.extname(requestedFullPath).toLowerCase();

        // Buscar el archivo (incluso si tiene diferencia de mayúsculas/minúsculas en Linux)
        let resolvedFile = findFileCaseInsensitive(requestedFullPath);

        // Si no tiene extensión (ej. /shefa-shop), probar con .html
        if (!resolvedFile && !requestedExt) {
            resolvedFile = findFileCaseInsensitive(`${requestedFullPath}.html`);
        }

        if (resolvedFile) {
            return serveStaticFileWithStreaming(req, res, resolvedFile);
        }

        // IMPORTANTE: Si lo que se pidió era un video (.mp4), imagen o modelo 3D (.glb) y no existe,
        // devolvemos 404 real y NUNCA devolvemos index.html (eso era lo que congelaba el reproductor).
        if (MEDIA_EXTENSIONS.has(requestedExt)) {
            log('warn', 'Archivo multimedia no encontrado en el repositorio', {
                requested: pathname
            });
            res.writeHead(404, {
                'Content-Type': 'application/json; charset=utf-8',
                'Cross-Origin-Resource-Policy': 'cross-origin'
            });
            return res.end(
                JSON.stringify({
                    success: false,
                    error: 'MEDIA_NOT_FOUND',
                    message: `El archivo multimedia "${pathname}" no se encontró en el servidor. Verifica que esté subido a GitHub.`
                })
            );
        }

        // Fallback para navegación de páginas de la tienda
        const fallbackShop = path.join(ROOT_DIR, 'shefa-shop.html');
        const fallbackIndex = path.join(ROOT_DIR, 'index.html');

        if (pathname.includes('shefa-shop') && fs.existsSync(fallbackShop)) {
            return serveStaticFileWithStreaming(req, res, fallbackShop);
        }
        if (fs.existsSync(fallbackIndex)) {
            return serveStaticFileWithStreaming(req, res, fallbackIndex);
        }

        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('404 - Página no encontrada en Shefa Plus Global');
    } catch (error) {
        log('error', 'Error inesperado en el servidor', { error: error.message });
        if (!res.headersSent) {
            return errorResponse(res, 500, 'INTERNAL_SERVER_ERROR', 'Error interno del servidor');
        }
        res.end();
    }
});

server.listen(PORT, HOST, () => {
    log('info', `Servidor ${APP_NAME} v${APP_VERSION} activo en http://${HOST}:${PORT}`);
});
