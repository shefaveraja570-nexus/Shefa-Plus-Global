'use strict';

/**
 * SHEFA-SHOP GLOBAL — SALES ENGINE
 * Node.js 18+
 *
 * Start: node server.js
 *
 * Environment variables:
 * PORT=3000
 * CJ_API_KEY=your_cjdropshipping_api_key
 * GEMINI_API_KEY=your_gemini_api_key
 * GEMINI_MODEL=gemini-2.5-flash
 * META_PAGE_ID=your_meta_page_id
 * META_PAGE_ACCESS_TOKEN=your_meta_page_access_token
 * META_GRAPH_VERSION=v23.0
 * SHEFA_ALLOWED_ORIGIN=https://www.shefaplusglobal.com
 *
 * Security:
 * - Never expose API keys in frontend code.
 * - Configure credentials in the hosting platform's environment variables.
 * - Shipping estimates are not fabricated.
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const APP_NAME = 'Shefa-Shop Global';
const APP_VERSION = '2.0.0';
const PORT = Number.parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

const ROOT_DIR = path.resolve(__dirname);
const MAX_BODY_SIZE = 1024 * 1024;
const REQUEST_TIMEOUT_MS = 15000;
const EXTERNAL_TIMEOUT_MS = 20000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 100;

const CJ_API_BASE = 'https://developers.cjdropshipping.com/api2.0/v1';
const CJ_AUTH_URL = `${CJ_API_BASE}/authentication/getAccessToken`;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const META_PAGE_ID = process.env.META_PAGE_ID || '';
const META_PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || '';
const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v23.0';

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
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.webmanifest': 'application/manifest+json'
});

const SECURITY_HEADERS = Object.freeze({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Resource-Policy': 'same-site'
});

const rateLimitStore = new Map();

let cjTokenCache = {
    accessToken: '',
    refreshToken: '',
    expiresAt: 0
};

let cjAuthPromise = null;

/* -------------------------------------------------------
   GENERAL UTILITIES
------------------------------------------------------- */

function log(level, message, details = {}) {
    const safeDetails = { ...details };

    delete safeDetails.apiKey;
    delete safeDetails.accessToken;
    delete safeDetails.refreshToken;
    delete safeDetails.token;
    delete safeDetails.password;

    console[level](
        JSON.stringify({
            timestamp: new Date().toISOString(),
            application: APP_NAME,
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

function safeEqualString(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') {
        return false;
    }

    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);

    if (bufferA.length !== bufferB.length) {
        return false;
    }

    return crypto.timingSafeEqual(bufferA, bufferB);
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
    /*
     * Do not trust arbitrary X-Forwarded-For headers unless your
     * hosting infrastructure is configured to sanitize them.
     */
    return req.socket.remoteAddress || 'unknown';
}

function applyCors(req, res) {
    const origin = req.headers.origin;

    if (!origin) {
        return true;
    }

    if (ALLOWED_ORIGIN) {
        if (origin !== ALLOWED_ORIGIN) {
            return false;
        }

        res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    } else {
        /*
         * Same-origin requests work without CORS headers.
         * Cross-origin browser access is intentionally not enabled
         * by default when no allowed origin has been configured.
         */
        return false;
    }

    res.setHeader('Vary', 'Origin');
    res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, OPTIONS'
    );

    res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization'
    );

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

    res.setHeader(
        'X-RateLimit-Limit',
        String(RATE_LIMIT_MAX_REQUESTS)
    );

    res.setHeader(
        'X-RateLimit-Remaining',
        String(Math.max(0, RATE_LIMIT_MAX_REQUESTS - record.count))
    );

    if (record.count > RATE_LIMIT_MAX_REQUESTS) {
        res.setHeader(
            'Retry-After',
            String(Math.ceil((record.resetAt - now) / 1000))
        );

        errorResponse(
            res,
            429,
            'RATE_LIMIT_EXCEEDED',
            'Demasiadas solicitudes. Intenta nuevamente en un momento.'
        );

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
            if (settled) {
                return;
            }

            bytes += chunk.length;

            if (bytes > maxBytes) {
                settled = true;

                reject(
                    Object.assign(
                        new Error('El cuerpo de la solicitud es demasiado grande.'),
                        { statusCode: 413 }
                    )
                );

                req.destroy();
                return;
            }

            body += chunk.toString('utf8');
        });

        req.on('end', () => {
            if (settled) {
                return;
            }

            settled = true;

            if (!body.trim()) {
                resolve({});
                return;
            }

            try {
                const parsed = JSON.parse(body);

                if (
                    parsed === null ||
                    typeof parsed !== 'object' ||
                    Array.isArray(parsed)
                ) {
                    reject(
                        Object.assign(
                            new Error('El cuerpo JSON debe ser un objeto.'),
                            { statusCode: 400 }
                        )
                    );

                    return;
                }

                resolve(parsed);
            } catch {
                reject(
                    Object.assign(
                        new Error('El JSON enviado no es válido.'),
                        { statusCode: 400 }
                    )
                );
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

    const timeout = setTimeout(
        () => controller.abort(),
        timeoutMs
    );

    timeout.unref();

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            redirect: 'error'
        });

        const rawText = await response.text();

        let data;

        try {
            data = rawText ? JSON.parse(rawText) : {};
        } catch {
            data = {
                message: rawText.slice(0, 500)
            };
        }

        return {
            ok: response.ok,
            status: response.status,
            data
        };
    } catch (error) {
        if (error.name === 'AbortError') {
            throw Object.assign(
                new Error('El servicio externo tardó demasiado en responder.'),
                { code: 'EXTERNAL_TIMEOUT' }
            );
        }

        throw Object.assign(
            new Error('No fue posible conectar con el servicio externo.'),
            { code: 'EXTERNAL_CONNECTION_ERROR' }
        );
    } finally {
        clearTimeout(timeout);
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

    if (
        cjTokenCache.accessToken &&
        Date.now() < cjTokenCache.expiresAt - 60_000
    ) {
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

    const fetchOptions = {
        method,
        headers
    };

    if (options.body !== undefined) {
        headers['Content-Type'] = 'application/json';
        fetchOptions.body = JSON.stringify(options.body);
    }

    const result = await fetchJson(
        `${CJ_API_BASE}${endpoint}`,
        fetchOptions
    );

    /*
     * If CJ rejects the token, clear it so the next request
     * can authenticate again. No unverified retry is performed.
     */
    if (
        result.status === 401 ||
        result.status === 403
    ) {
        cjTokenCache = {
            accessToken: '',
            refreshToken: '',
            expiresAt: 0
        };

        throw Object.assign(
            new Error('CJdropshipping requiere una nueva autenticación.'),
            { code: 'CJ_AUTH_EXPIRED', upstreamStatus: result.status }
        );
    }

    if (!result.ok) {
        throw Object.assign(
            new Error('CJdropshipping no pudo completar la solicitud.'),
            {
                code: 'CJ_REQUEST_FAILED',
                upstreamStatus: result.status
            }
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
            new Error(
                cleanString(payload.message || payload.msg, 300) ||
                'CJdropshipping devolvió un error.'
            ),
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
        log('error', 'CJ status check failed', {
            code: error.code || 'CJ_ERROR'
        });

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
        return errorResponse(
            res,
            503,
            'CJ_NOT_CONFIGURED',
            'La integración con CJdropshipping no está configurada.'
        );
    }

    const page = isPositiveInteger(
        url.searchParams.get('page'),
        1,
        100000
    );

    const size = isPositiveInteger(
        url.searchParams.get('limit') ||
        url.searchParams.get('size'),
        12,
        100
    );

    try {
        const query = new URLSearchParams({
            page: String(page),
            size: String(size)
        });

        const payload = await cjRequest(
            `/product/listV2?${query.toString()}`
        );

        const data = payload.data ?? payload;

        return successResponse(res, {
            provider: 'CJdropshipping',
            page,
            limit: size,
            products: Array.isArray(data)
                ? data
                : data.list || data.content || [],
            pagination: {
                total: data.total ?? null,
                page,
                limit: size
            }
        });
    } catch (error) {
        log('error', 'CJ products request failed', {
            code: error.code || 'CJ_PRODUCTS_ERROR'
        });

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
        return errorResponse(
            res,
            503,
            'CJ_NOT_CONFIGURED',
            'La integración con CJdropshipping no está configurada.'
        );
    }

    const vid = cleanString(url.searchParams.get('vid'), 150);
    const sku = cleanString(url.searchParams.get('sku'), 150);

    if (!vid && !sku) {
        return errorResponse(
            res,
            400,
            'MISSING_PRODUCT_IDENTIFIER',
            'Debes proporcionar vid o sku.'
        );
    }

    if (vid && !/^[A-Za-z0-9_-]+$/.test(vid)) {
        return errorResponse(
            res,
            400,
            'INVALID_VARIANT_ID',
            'El identificador de variante no es válido.'
        );
    }

    if (sku && !/^[A-Za-z0-9._-]+$/.test(sku)) {
        return errorResponse(
            res,
            400,
            'INVALID_SKU',
            'El SKU no es válido.'
        );
    }

    try {
        const parameter = vid
            ? `vid=${encodeURIComponent(vid)}`
            : `sku=${encodeURIComponent(sku)}`;

        const endpoint = vid
            ? `/product/stock/queryByVid?${parameter}`
            : `/product/stock/queryBySku?${parameter}`;

        const payload = await cjRequest(endpoint);

        return successResponse(res, {
            provider: 'CJdropshipping',
            identifier: vid
                ? { vid }
                : { sku },
            inventory: payload.data ?? payload
        });
    } catch (error) {
        log('error', 'CJ stock request failed', {
            code: error.code || 'CJ_STOCK_ERROR'
        });

        return errorResponse(
            res,
            502,
            error.code || 'CJ_STOCK_ERROR',
            error.message || 'No fue posible consultar el inventario.'
        );
    }
}

function handleCJShipping(url, res) {
    const country = cleanString(
        url.searchParams.get('country') || 'CO',
        2
    ).toUpperCase();

    const productId = cleanString(
        url.searchParams.get('pid'),
        150
    );

    const variantId = cleanString(
        url.searchParams.get('vid'),
        150
    );

    const quantity = isPositiveInteger(
        url.searchParams.get('quantity'),
        1,
        100
    );

    if (!isValidCountryCode(country)) {
        return errorResponse(
            res,
            400,
            'INVALID_COUNTRY',
            'El país debe utilizar un código ISO de dos letras, por ejemplo CO.'
        );
    }

    /*
     * This endpoint deliberately does not invent shipping prices.
     * A real quote must use a supported CJ shipping endpoint and
     * all required product, variant, quantity and destination data.
     */
    return jsonResponse(res, 501, {
        success: false,
        
