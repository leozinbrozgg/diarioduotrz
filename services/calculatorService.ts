export interface CalculateResult {
    values: number[];
    total: number;
}

export const calculateValuesFromText = async (text: string): Promise<CalculateResult> => {
    if (!text.trim()) {
        return { values: [], total: 0 };
    }

    const base = (import.meta as any).env?.VITE_API_BASE_URL || '';

    const res = await fetch(`${base}/api/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
    });

    if (!res.ok) {
        let msg = 'Falha ao calcular valores.';
        try {
            const err = await res.json();
            if (err?.error) msg = err.error;
        } catch { }
        throw new Error(msg);
    }

    const result = await res.json();
    return {
        values: result.values || [],
        total: result.total || 0,
    };
};

export const formatCurrency = (value: number): string => {
    return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });
};
