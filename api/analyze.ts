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

    const { image } = body || {};
    if (!image || !image.data || !image.mimeType) {
      return res.status(400).json({ error: 'Corpo inválido. Envie { image: { data, mimeType } }' });
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
      Você é um especialista em analisar screenshots de partidas do jogo Free Fire.
      A imagem pode ser: uma tela de fim de partida de um único time (solo) ou de uma dupla, ou ainda uma tabela/leaderboard com vários times.
      Extraia as informações de CADA EQUIPE identificada na imagem, onde uma equipe pode ter 1 ou 2 jogadores.
      Retorne um array de objetos conforme o schema JSON fornecido.
      - "playerNames": Um array com 1 ou 2 nomes, exatamente como aparecem na imagem (não invente nomes ausentes).
      - "kills": O número total de abates (kills) do time. Se a imagem mostrar abates por jogador, some para obter o total do time.
      - "placement": A posição final do time na partida. Se não estiver claro, use null.
      Se a imagem contiver apenas o resultado de um time, retorne um array com um único objeto.
      Se for uma tabela de ranking/leaderboard, retorne um array com um objeto para cada time/linha identificada.
      Se não conseguir identificar alguma informação para um time, use o valor null para o campo correspondente.
      Se não encontrar nenhuma equipe, retorne um array vazio.
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
            description: 'Uma lista de todas as equipes (solo ou dupla) encontradas na imagem, com seus resultados.',
            items: {
              type: Type.OBJECT,
              properties: {
                playerNames: { type: Type.ARRAY, items: { type: Type.STRING } },
                kills: { type: Type.INTEGER },
                placement: { type: Type.INTEGER },
              },
              required: ['playerNames', 'kills', 'placement'],
            },
          },
        },
      })
    );

    requestTimestamps.push(Date.now());

    const jsonString = response.text.trim();
    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed)) throw new Error('Resposta não é um array.');
    } catch (e) {
      console.error('Falha ao analisar resposta do Gemini:', jsonString, e);
      return res.status(502).json({ error: 'Resposta inválida do modelo.' });
    }

    return res.status(200).json(parsed);
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
