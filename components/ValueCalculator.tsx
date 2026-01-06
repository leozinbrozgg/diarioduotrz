import React, { useState } from 'react';
import { CopyIcon, CheckIcon, ResetIcon } from './icons';

// Utility to extract monetary values from text
const extractValues = (text: string): number[] => {
    // Match patterns like: 6,50 / 0.50 / 34,50 / R$ 10,00 etc.
    const regex = /(?:R\$\s*)?(\d+(?:[.,]\d{1,2})?)/g;
    const values: number[] = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
        // Convert Brazilian format (comma as decimal) to number
        const numStr = match[1].replace(',', '.');
        const num = parseFloat(numStr);
        if (!isNaN(num) && num > 0 && num < 10000) { // Reasonable range for values
            values.push(num);
        }
    }

    return values;
};

const formatCurrency = (value: number): string => {
    return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });
};

export const ValueCalculator: React.FC = () => {
    const [inputText, setInputText] = useState('');
    const [result, setResult] = useState<{ values: number[]; total: number } | null>(null);
    const [copied, setCopied] = useState(false);

    const handleCalculate = () => {
        const values = extractValues(inputText);
        const total = values.reduce((sum, val) => sum + val, 0);
        setResult({ values, total });
    };

    const handleReset = () => {
        setInputText('');
        setResult(null);
    };

    const handleCopyTotal = async () => {
        if (!result) return;
        const totalText = formatCurrency(result.total);
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(totalText);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = totalText;
                textArea.style.position = 'fixed';
                textArea.style.left = '-9999px';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Falha ao copiar:', err);
        }
    };

    return (
        <div className="bg-dark-surface p-6 rounded-2xl border border-dark-border shadow-lg flex flex-col space-y-6">
            <div className="text-center">
                <h2 className="text-lg font-bold text-dark-text-primary">Calculadora de Valores</h2>
                <p className="text-sm text-dark-text-secondary mt-1">
                    Cole o texto com valores para somar automaticamente
                </p>
            </div>

            <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Cole aqui o texto com valores, por exemplo:\n\n05747612093\n6,50\n--\n07116653546\n0,50\n--\n153.364.624-46\n0,50`}
                className="w-full h-48 bg-dark-bg rounded-lg p-4 text-dark-text-primary placeholder-dark-text-secondary/50 border border-dark-border focus:border-brand-primary focus:outline-none resize-none font-mono text-sm"
            />

            {result && (
                <div className="bg-dark-bg rounded-lg p-4 border border-dark-border space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-dark-text-secondary">
                            {result.values.length} valores encontrados:
                        </span>
                    </div>

                    <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                        {result.values.map((val, idx) => (
                            <span
                                key={idx}
                                className="px-2 py-1 bg-dark-surface rounded text-xs text-dark-text-secondary"
                            >
                                {formatCurrency(val)}
                            </span>
                        ))}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-dark-border">
                        <span className="text-lg font-bold text-brand-primary">
                            Total: {formatCurrency(result.total)}
                        </span>
                        <button
                            onClick={handleCopyTotal}
                            className="flex items-center gap-1.5 text-sm text-brand-primary hover:text-brand-primary/80 transition-colors"
                        >
                            {copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
                            {copied ? 'Copiado!' : 'Copiar'}
                        </button>
                    </div>
                </div>
            )}

            <div className="flex gap-3">
                {result ? (
                    <button
                        onClick={handleReset}
                        className="flex-1 flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary/80 text-dark-bg font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-[1.02]"
                    >
                        <ResetIcon />
                        Nova Calculação
                    </button>
                ) : (
                    <button
                        onClick={handleCalculate}
                        disabled={!inputText.trim()}
                        className="flex-1 flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary/80 text-dark-bg font-bold py-3 px-4 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
                    >
                        <i className="fa-solid fa-calculator" />
                        Calcular Total
                    </button>
                )}
            </div>
        </div>
    );
};
