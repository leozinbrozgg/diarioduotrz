import React, { useRef } from 'react';
import { UploadIcon, AnalyzeIcon, ResetIcon, XCircleIcon } from './icons';

interface ImageUploaderProps {
  imageUrls: string[];
  onImageChange: (files: FileList) => void;
  onRemoveImage: (index: number) => void;
  onAnalyze: () => void;
  onReset: () => void;
  isAnalyzing: boolean;
  hasResults: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ imageUrls, onImageChange, onRemoveImage, onAnalyze, onReset, isAnalyzing, hasResults }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onImageChange(e.target.files);
    }
    e.target.value = '';
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-dark-surface p-6 rounded-2xl border border-dark-border shadow-lg flex flex-col space-y-6">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
        multiple
        disabled={isAnalyzing}
      />
      
      {imageUrls.length === 0 ? (
        <div 
            onClick={handleUploadClick} 
            className="w-full h-60 bg-dark-bg rounded-lg flex items-center justify-center border-2 border-dashed border-dark-border cursor-pointer hover:border-brand-primary transition-colors group"
        >
          <div className="text-center text-dark-text-secondary p-4">
            <UploadIcon className="w-10 h-10 mx-auto mb-3 text-dark-text-secondary group-hover:text-brand-primary transition-colors" />
            <p className="font-semibold text-dark-text-primary">Clique para carregar os prints</p>
            <p className="text-sm">Envie as imagens de final de partida</p>
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
                disabled={isAnalyzing}
              >
                <XCircleIcon className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="w-full flex flex-col gap-3">
        <button
          onClick={handleUploadClick}
          disabled={isAnalyzing}
          className="w-full flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary/80 text-dark-bg font-bold py-3 px-4 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
        >
          <UploadIcon />
          {imageUrls.length > 0 ? 'Adicionar Mais Imagens' : 'Selecionar Imagens'}
        </button>
        {imageUrls.length > 0 && (
          <button
            onClick={hasResults ? onReset : onAnalyze}
            disabled={isAnalyzing}
            className={`w-full flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] ${hasResults ? 'bg-brand-primary hover:bg-brand-primary/80 text-dark-bg' : 'bg-brand-primary hover:bg-brand-primary/80 text-dark-bg'}`}
          >
            {isAnalyzing ? (
              'Analisando...'
            ) : hasResults ? (
              <><ResetIcon /> Nova Análise</>
            ) : (
              <><AnalyzeIcon /> Gerar Ranking ({imageUrls.length})</>
            )}
          </button>
        )}
      </div>
    </div>
  );
};