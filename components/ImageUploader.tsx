import React, { useRef, useEffect, useState } from 'react';
import { UploadIcon, AnalyzeIcon, ResetIcon, XCircleIcon, RankingIcon, TextIcon, CopyIcon, CheckIcon, CalculatorIcon } from './icons';

export type UploaderMode = 'ranking' | 'extractor' | 'calculator';

interface ImageUploaderProps {
  imageUrls: string[];
  onImageChange: (files: FileList) => void;
  onRemoveImage: (index: number) => void;
  onAnalyze: () => void;
  onReset: () => void;
  isAnalyzing: boolean;
  hasResults: boolean;
  // Props for extractor mode
  mode: UploaderMode;
  onModeChange: (mode: UploaderMode) => void;
  extractedText: string | null;
  onExtractText: () => void;
  isExtracting: boolean;
  extractError: string | null;
  // Props for calculator mode
  calculatorText: string;
  onCalculatorTextChange: (text: string) => void;
  calculatorResult: { values: number[]; total: number } | null;
  onCalculate: () => void;
  isCalculating: boolean;
  calculateError: string | null;
}

const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  imageUrls,
  onImageChange,
  onRemoveImage,
  onAnalyze,
  onReset,
  isAnalyzing,
  hasResults,
  mode,
  onModeChange,
  extractedText,
  onExtractText,
  isExtracting,
  extractError,
  calculatorText,
  onCalculatorTextChange,
  calculatorResult,
  onCalculate,
  isCalculating,
  calculateError,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onImageChange(e.target.files);
    }
    e.target.value = '';
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Handle paste event for clipboard images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (mode !== 'extractor') return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            imageFiles.push(file);
          }
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        const dt = new DataTransfer();
        imageFiles.forEach(f => dt.items.add(f));
        onImageChange(dt.files);
      }
    };

    const container = containerRef.current;
    if (container) {
      document.addEventListener('paste', handlePaste);
    }

    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [mode, onImageChange]);

  const handleCopyText = async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
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

  const isProcessing = mode === 'ranking' ? isAnalyzing : mode === 'extractor' ? isExtracting : isCalculating;
  const hasExtractorResults = mode === 'extractor' && extractedText !== null;
  const hasCalculatorResults = mode === 'calculator' && calculatorResult !== null;

  const getModeDescription = () => {
    switch (mode) {
      case 'ranking':
        return 'Envie prints de partida para gerar o ranking e calcular prêmios';
      case 'extractor':
        return 'Envie prints de nicks para extrair os nomes dos jogadores (Ctrl+V para colar)';
      case 'calculator':
        return 'Cole um texto com valores para somar automaticamente';
    }
  };

  return (
    <div ref={containerRef} className="bg-dark-surface p-6 rounded-2xl border border-dark-border shadow-lg flex flex-col space-y-6">
      {/* Mode Toggle */}
      <div className="flex bg-dark-bg rounded-lg p-1 border border-dark-border">
        <button
          onClick={() => onModeChange('ranking')}
          disabled={isProcessing}
          className={`
            flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md font-semibold text-xs sm:text-sm transition-all duration-200
            ${mode === 'ranking'
              ? 'bg-brand-primary text-dark-bg'
              : 'text-dark-text-secondary hover:text-dark-text-primary hover:bg-dark-border/50'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          <RankingIcon />
          <span className="hidden sm:inline">Ranking</span>
        </button>
        <button
          onClick={() => onModeChange('extractor')}
          disabled={isProcessing}
          className={`
            flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md font-semibold text-xs sm:text-sm transition-all duration-200
            ${mode === 'extractor'
              ? 'bg-brand-primary text-dark-bg'
              : 'text-dark-text-secondary hover:text-dark-text-primary hover:bg-dark-border/50'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          <TextIcon />
          <span className="hidden sm:inline">Extrator</span>
        </button>
        <button
          onClick={() => onModeChange('calculator')}
          disabled={isProcessing}
          className={`
            flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md font-semibold text-xs sm:text-sm transition-all duration-200
            ${mode === 'calculator'
              ? 'bg-brand-primary text-dark-bg'
              : 'text-dark-text-secondary hover:text-dark-text-primary hover:bg-dark-border/50'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          <CalculatorIcon />
          <span className="hidden sm:inline">Calculadora</span>
        </button>
      </div>

      {/* Mode description */}
      <p className="text-sm text-dark-text-secondary text-center -mt-2">
        {getModeDescription()}
      </p>

      {/* Calculator mode - Text input */}
      {mode === 'calculator' ? (
        <>
          <textarea
            value={calculatorText}
            onChange={(e) => onCalculatorTextChange(e.target.value)}
            placeholder={`Cole aqui o texto com valores, por exemplo:\n\n05747612093\n6,50\n--\n07116653546\n0,50\n--\n153.364.624-46\n0,50`}
            className="w-full h-48 bg-dark-bg rounded-lg p-4 text-dark-text-primary placeholder-dark-text-secondary/50 border border-dark-border focus:border-brand-primary focus:outline-none resize-none font-mono text-sm"
            disabled={isCalculating}
          />

          {calculatorResult && (
            <div className="bg-dark-bg rounded-lg p-4 border border-dark-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-dark-text-secondary">
                  {calculatorResult.values.length} valores encontrados:
                </span>
              </div>

              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                {calculatorResult.values.map((val, idx) => (
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
                  Total: {formatCurrency(calculatorResult.total)}
                </span>
                <button
                  onClick={() => handleCopyText(formatCurrency(calculatorResult.total))}
                  className="flex items-center gap-1.5 text-sm text-brand-primary hover:text-brand-primary/80 transition-colors"
                >
                  {copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>
          )}

          {calculateError && (
            <div className="bg-red-900/20 p-4 rounded-lg border border-red-500/30">
              <p className="text-red-400 text-sm">{calculateError}</p>
            </div>
          )}

          <button
            onClick={hasCalculatorResults ? onReset : onCalculate}
            disabled={isCalculating || (!hasCalculatorResults && !calculatorText.trim())}
            className="w-full flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary/80 text-dark-bg font-bold py-3 px-4 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
          >
            {isCalculating ? (
              'Calculando...'
            ) : hasCalculatorResults ? (
              <><ResetIcon /> Nova Calculação</>
            ) : (
              <><CalculatorIcon /> Calcular Total</>
            )}
          </button>
        </>
      ) : (
        <>
          {/* Image upload modes (ranking & extractor) */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
            multiple
            disabled={isProcessing}
          />

          {imageUrls.length === 0 ? (
            <div
              onClick={handleUploadClick}
              className="w-full h-60 bg-dark-bg rounded-lg flex items-center justify-center border-2 border-dashed border-dark-border cursor-pointer hover:border-brand-primary transition-colors group"
            >
              <div className="text-center text-dark-text-secondary p-4">
                <UploadIcon className="w-10 h-10 mx-auto mb-3 text-dark-text-secondary group-hover:text-brand-primary transition-colors" />
                <p className="font-semibold text-dark-text-primary">
                  {mode === 'ranking' ? 'Clique para carregar os prints' : 'Clique ou cole (Ctrl+V) os prints'}
                </p>
                <p className="text-sm">
                  {mode === 'ranking' ? 'Envie as imagens de final de partida' : 'Envie imagens com nicks de jogadores'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 p-2 bg-dark-bg rounded-lg max-h-64 overflow-y-auto border border-dark-border">
              {imageUrls.map((url, index) => (
                <div key={index} className="relative group aspect-square">
                  <img src={url} alt={`Preview ${index + 1}`} className="object-cover h-full w-full rounded-md" />
                  <button
                    onClick={() => onRemoveImage(index)}
                    className="absolute top-1 right-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 flex items-center justify-center w-6 h-6"
                    aria-label="Remover imagem"
                    disabled={isProcessing}
                  >
                    <XCircleIcon className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Extracted text result */}
          {mode === 'extractor' && extractedText !== null && (
            <div className="bg-dark-bg rounded-lg p-4 border border-dark-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-dark-text-secondary">Texto extraído:</span>
                <button
                  onClick={() => handleCopyText(extractedText)}
                  className="flex items-center gap-1.5 text-sm text-brand-primary hover:text-brand-primary/80 transition-colors"
                >
                  {copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              <p className="text-dark-text-primary font-medium break-words">{extractedText}</p>
            </div>
          )}

          {/* Extract error */}
          {mode === 'extractor' && extractError && (
            <div className="bg-red-900/20 p-4 rounded-lg border border-red-500/30">
              <p className="text-red-400 text-sm">{extractError}</p>
            </div>
          )}

          <div className="w-full flex flex-col gap-3">
            <button
              onClick={handleUploadClick}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary/80 text-dark-bg font-bold py-3 px-4 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
            >
              <UploadIcon />
              {imageUrls.length > 0 ? 'Adicionar Mais Imagens' : 'Selecionar Imagens'}
            </button>

            {imageUrls.length > 0 && (
              <>
                {mode === 'ranking' ? (
                  <button
                    onClick={hasResults ? onReset : onAnalyze}
                    disabled={isAnalyzing}
                    className="w-full flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] bg-brand-primary hover:bg-brand-primary/80 text-dark-bg"
                  >
                    {isAnalyzing ? (
                      'Analisando...'
                    ) : hasResults ? (
                      <><ResetIcon /> Nova Análise</>
                    ) : (
                      <><AnalyzeIcon /> Gerar Ranking ({imageUrls.length})</>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={hasExtractorResults ? onReset : onExtractText}
                    disabled={isExtracting}
                    className="w-full flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] bg-brand-primary hover:bg-brand-primary/80 text-dark-bg"
                  >
                    {isExtracting ? (
                      'Extraindo...'
                    ) : hasExtractorResults ? (
                      <><ResetIcon /> Nova Extração</>
                    ) : (
                      <><TextIcon /> Extrair Texto ({imageUrls.length})</>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};