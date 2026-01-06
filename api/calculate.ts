import { GoogleGenAI, Type } from '@google/genai';

export default async function handler(req: any, res: any) {
    try {
        if (req.method !== 'POST') {
            res.setHeader('Allow', 'POST');
            return res.status(405).json({ error: 'Method Not Allowed' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'GEMINI_API_KEY não configurada no servidor.' });
        }

        // Parse JSON body
        let body = req.body;
        if (!body) {
            const chunks: Buffer[] = [];
            body = await new Promise<any>((resolve, reject) => {
                req.on('data', (chunk: Buffer) => chunks.push(chunk));
                req.on('end', () => {
                    try {
                        const raw = Buffer.concat(chunks).toString('utf8');
                        resolve(raw ? JSON.parse(raw) : {});
                    } catch (e) {
                        reject(e);
                    }
                });
                req.on('error', reject);
            });
        }

        const { text } = body || {};
        if (!text || typeof text !== 'string') {
            return res.status(400).json({ error: 'Corpo inválido. Envie { text: "..." }' });
        }

        const ai = new GoogleGenAI({ apiKey });

        const LIMIT = 5;
        const WINDOW_MS = 60_000;
        const now = Date.now();
        requestTimestamps = requestTimestamps.filter((t) => now - t < WINDOW_MS);
        if (requestTimestamps.length >= LIMIT) {
            const oldest = requestTimestamps[0];
            const waitMs = WINDOW_MS - (now - oldest);
            await delay(waitMs);
        }

        const prompt = `
      Você é um especialista em extrair valores monetários de textos.
      Analise o texto fornecido e extraia TODOS os valores monetários que encontrar.
      
      Regras:
      - Valores podem estar em formato brasileiro (ex: 6,50) ou internacional (ex: 6.50)
      - Identifique valores como 6,50 / 0,50 / 34,50 / R$ 10,00 etc.
      - Ignore números que claramente não são valores monetários (CPFs, telefones, códigos)
      - Um valor monetário geralmente tem até 2 casas decimais e representa dinheiro
      - Se um número aparecer sozinho em uma linha e parecer um valor (ex: 6,50), considere-o como valor monetário
      
      Retorne um array JSON com os valores encontrados como números decimais.
      Por exemplo: [6.50, 0.50, 34.50]
      
      Texto para analisar:
      ${text}
    `;

        const response = await callWithRetry(async () =>
            ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: {
                    parts: [{ text: prompt }],
                },
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.ARRAY,
                        description: 'Lista de valores monetários encontrados no texto.',
                        items: {
                            type: Type.NUMBER,
                        },
                    },
                },
            })
        );

        requestTimestamps.push(Date.now());

        const jsonString = response.text.trim();
        let parsed: number[] = [];
        try {
            parsed = JSON.parse(jsonString);
            if (!Array.isArray(parsed)) {
                parsed = [];
            }
            // Filter to only valid numbers
            parsed = parsed.filter((v: any) => typeof v === 'number' && !isNaN(v) && v > 0);
        } catch (e) {
            console.error('Falha ao analisar resposta do Gemini:', jsonString, e);
            return res.status(502).json({ error: 'Resposta inválida do modelo.' });
        }

        const total = parsed.reduce((sum, val) => sum + val, 0);

        return res.status(200).json({ values: parsed, total });
    } catch (err: any) {
        console.error(err);
        return res.status(500).json({ error: err?.message ?? 'Erro interno' });
    }
}

let requestTimestamps: number[] = [];

function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

function parseRetryAfterMs(err: any): number | null {
    const h = err?.response?.headers || err?.headers;
    const retryAfter = h?.['retry-after'] || h?.['Retry-After'];
    if (retryAfter) {
        const asNum = Number(retryAfter);
        if (!Number.isNaN(asNum)) return asNum * 1000;
    }
    const details = err?.error?.details || err?.details;
    if (Array.isArray(details)) {
        for (const d of details) {
            const type = d?.['@type'] || '';
            if (typeof type === 'string' && type.includes('google.rpc.RetryInfo')) {
                const delayStr = d?.retryDelay || d?.retry_delay;
                if (typeof delayStr === 'string') {
                    const sec = parseInt(delayStr, 10);
                    if (!Number.isNaN(sec)) return sec * 1000;
                }
            }
        }
    }
    return null;
}

function isRetryable(err: any): boolean {
    const msg: string = String(err?.message || '').toLowerCase();
    const status = err?.status || err?.response?.status;
    const code = err?.error?.status || err?.code;
    return (
        status === 429 ||
        code === 'RESOURCE_EXHAUSTED' ||
        msg.includes('quota') ||
        msg.includes('rate limit') ||
        msg.includes('too many requests')
    );
}

async function callWithRetry<T>(fn: () => Promise<T>, maxAttempts = 5): Promise<T> {
    let attempt = 0;
    let lastErr: any;
    while (attempt < maxAttempts) {
        try {
            return await fn();
        } catch (err: any) {
            lastErr = err;
            if (!isRetryable(err) || attempt === maxAttempts - 1) break;
            const suggested = parseRetryAfterMs(err);
            const backoff = suggested ?? Math.min(60_000, 1_000 * 2 ** attempt);
            const jitter = Math.floor(Math.random() * 250);
            await delay(backoff + jitter);
            attempt++;
        }
    }
    throw lastErr;
}
