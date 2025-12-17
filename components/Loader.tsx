import React from 'react';

export const Loader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center bg-dark-surface/50 p-6 rounded-2xl border border-dark-border shadow-lg h-full text-center">
      <div className="flex space-x-2 justify-center items-center mb-6">
        <div className="h-4 w-4 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: '-0.3s' }}></div>
        <div className="h-4 w-4 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: '-0.15s' }}></div>
        <div className="h-4 w-4 bg-brand-primary rounded-full animate-bounce"></div>
      </div>
      <p className="text-lg font-semibold text-dark-text-primary">Analisando suas jogadas...</p>
      <p className="text-sm text-dark-text-secondary mt-1">A I.A. está processando as imagens para calcular os ganhos!</p>
    </div>
  );
};