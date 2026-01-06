const fileToBase64 = async (file: File): Promise<{ data: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                const base64Data = reader.result.split(',')[1];
                resolve({ data: base64Data, mimeType: file.type });
            } else {
                reject(new Error('Failed to read file as data URL.'));
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};

export const extractTextFromImages = async (files: File[]): Promise<string[]> => {
    if (files.length === 0) {
        return [];
    }

    const images = await Promise.all(files.map(fileToBase64));
    const base = (import.meta as any).env?.VITE_API_BASE_URL || '';

    const res = await fetch(`${base}/api/ocr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images }),
    });

    if (!res.ok) {
        let msg = 'Falha ao extrair texto das imagens.';
        try {
            const err = await res.json();
            if (err?.error) msg = err.error;
        } catch { }
        throw new Error(msg);
    }

    const result = await res.json();
    if (!result.texts || !Array.isArray(result.texts)) {
        throw new Error('A resposta da IA não retornou um array de textos.');
    }

    return result.texts;
};

export const formatExtractedTexts = (texts: string[]): string => {
    if (texts.length === 0) {
        return '';
    }
    if (texts.length === 1) {
        return texts[0];
    }
    if (texts.length === 2) {
        return `${texts[0]} e ${texts[1]}`;
    }
    // 3 ou mais: "player1, player2 e player3"
    const allButLast = texts.slice(0, -1).join(', ');
    const last = texts[texts.length - 1];
    return `${allButLast} e ${last}`;
};
