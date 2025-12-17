import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="mb-6">
      <div className="flex items-center gap-3">
        <img
          src="/logo.png"
          alt="Diário TRZ"
          className="h-16 w-auto select-none"
          draggable={false}
        />
        <div className="flex flex-col">
          <span className="text-lg font-extrabold text-dark-text-primary leading-none">TRZ - Calculador de Prêmios</span>
          <span className="text-xs text-dark-text-secondary leading-none mt-1">Calculador de Prêmios Inteligente.</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
