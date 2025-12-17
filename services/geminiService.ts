import type { MatchResult } from '../types';

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      } else {
        reject(new Error("Failed to read file as data URL."));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

export const analyzeImage = async (imageFile: File): Promise<MatchResult[]> => {
  const imagePart = await fileToGenerativePart(imageFile);
  const base = (import.meta as any).env?.VITE_API_BASE_URL || '';

  const res = await fetch(`${base}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: {
        data: imagePart.inlineData.data,
        mimeType: imagePart.inlineData.mimeType,
      },
    }),
  });

  if (!res.ok) {
    let msg = 'Falha ao analisar a imagem.';
    try {
      const err = await res.json();
      if (err?.error) msg = err.error;
    } catch {}
    throw new Error(msg);
  }

  const resultsArray = await res.json();
  if (!Array.isArray(resultsArray)) {
    throw new Error('A resposta da IA não retornou um array de resultados.');
  }

  const validatedResults: MatchResult[] = resultsArray
    .map((item) => {
      if (
        item &&
        typeof item === 'object' &&
        'kills' in item &&
        'placement' in item &&
        'playerNames' in item
      ) {
        return {
          playerNames: Array.isArray(item.playerNames) ? item.playerNames : null,
          kills: typeof item.kills === 'number' ? item.kills : null,
          placement: typeof item.placement === 'number' ? item.placement : null,
        };
      }
      return null;
    })
    .filter((item): item is MatchResult => item !== null);

  return validatedResults;
};