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

        // Parse JSON body (handle cases where body isn't auto-parsed)
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

        const { images } = body || {};
        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ error: 'Corpo inválido. Envie { images: [{ data, mimeType }, ...] }' });
        }

        // Validate each image
        for (const img of images) {
            if (!img.data || !img.mimeType) {
                return res.status(400).json({ error: 'Cada imagem deve ter data e mimeType.' });
            }
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

        const allTexts: string[] = [];

        // Process each image
        for (const image of images) {
            const prompt = `
        Você é um especialista em OCR (reconhecimento óptico de caracteres).
        Analise esta imagem e extraia TODO o texto visível que você conseguir identificar.
        
        Regras:
        - Extraia qualquer texto visível na imagem, incluindo nomes, nicks, palavras, frases.
        - Suporte para qualquer idioma (português, inglês, chinês, japonês, coreano, etc).
        - Se houver múltiplos textos na imagem, retorne todos eles como itens separados no array.
        - Mantenha o texto exatamente como aparece (incluindo caracteres especiais, acentos, ideogramas, etc).
        - Ignore elementos que não são texto (ícones, símbolos genéricos, ruído).
        - Se não conseguir identificar nenhum texto, retorne um array vazio.
        
        Retorne um array JSON com os textos encontrados.
      `;

            const response = await callWithRetry(async () =>
                ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: {
                        parts: [
                            { text: prompt },
                            { inlineData: { data: image.data, mimeType: image.mimeType } },
                        ],
                    },
                    config: {
                        responseMimeType: 'application/json',
                        responseSchema: {
                            type: Type.ARRAY,
                            description: 'Lista de textos encontrados na imagem.',
                            items: {
                                type: Type.STRING,
                            },
                        },
                    },
                })
            );

            requestTimestamps.push(Date.now());

            const jsonString = response.text.trim();
            try {
                const parsed = JSON.parse(jsonString);
                if (Array.isArray(parsed)) {
                    allTexts.push(...parsed.filter((t: any) => typeof t === 'string' && t.trim() !== ''));
                }
            } catch (e) {
                console.error('Falha ao analisar resposta do Gemini:', jsonString, e);
                // Continue to next image even if one fails
            }

            // Small delay between images to avoid rate limiting
            if (images.indexOf(image) < images.length - 1) {
                await delay(500);
            }
        }

        return res.status(200).json({ texts: allTexts });
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
