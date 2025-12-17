import React, { useState } from 'react';
import type { RankedResult, AdjustedPrizes } from '../types';
import { SkullIcon, CopyIcon, CheckIcon } from './icons';

interface ResultsDisplayProps {
  rankedResults: RankedResult[];
  adjustedPrizes: AdjustedPrizes;
}

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const getRankStyles = (rank: number, placementPrizes: Record<number, number>): { border: string; rankColor: string; prizeColor: string; } => {
  // Highlight any rank that has a placement prize greater than 0
  if (placementPrizes[rank] && placementPrizes[rank] > 0) {
      return { 
        border: 'from-brand-primary to-brand-primary', 
        rankColor: 'text-brand-primary', 
        prizeColor: 'text-dark-text-primary' 
      };
  }
  
  return { 
    border: 'from-brand-primary/50 to-dark-surface/50', 
    rankColor: 'text-dark-text-primary', 
    prizeColor: 'text-dark-text-primary' 
  };
};


export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ rankedResults, adjustedPrizes }) => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  const handleCopy = async () => {
    const getRankInfo = (rank: number) => {
      switch (rank) {
        case 1: return '🥇';
        case 2: return '🥈';
        case 3: return '🥉';
        case 4: return '4️⃣';
        case 5: return '5️⃣';
        case 6: return '6️⃣';
        case 7: return '7️⃣';
        case 8: return '8️⃣';
        case 9: return '9️⃣';
        case 10: return '🔟';
        default: return `#️⃣ ${rank}º LUGAR`;
      }
    };
    
    const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    let text = `🏆 *RESULTADO FINAL - ${today}*\n\n`;

    rankedResults.forEach((result, index) => {
      const rank = index + 1;
      const rankInfo = getRankInfo(rank);
      const playerNames = result.matchResult.playerNames?.join(' + ') || 'N/A';
      const kills = result.matchResult.kills ?? 0;
      const killReward = adjustedPrizes.killPrize;
      const killPrizeTotal = result.earnings.killPrize;
      const placementPrize = result.earnings.placementPrize;
      const totalPrize = result.earnings.total;
      
      let playerText = `${rankInfo} *${playerNames}*\n`;
      playerText += `☠️ Kills: ${kills} × ${formatCurrency(killReward)} = ${formatCurrency(killPrizeTotal)}\n`;
      
      if (placementPrize > 0) {
          playerText += `💵 Posição: ${formatCurrency(placementPrize)}\n`;
      }
      
      playerText += `💰 *Total: ${formatCurrency(totalPrize)}*`;
      
      text += playerText + '\n\n';
    });

    text += `🔥 *Parabéns aos vencedores!*`;

    const tryClipboardAPI = async (): Promise<boolean> => {
      try {
        if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') return false;
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        return false;
      }
    };

    const tryExecCommand = (): boolean => {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
      } catch {
        return false;
      }
    };

    const ok = (await tryClipboardAPI()) || tryExecCommand();
    if (ok) {
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2500);
    } else {
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 2500);
      console.error('Failed to copy text using Clipboard API and execCommand fallback.');
    }
  };
    
  if (rankedResults.length === 0) {
    return (
        <div className="bg-dark-surface p-6 rounded-2xl border border-dark-border shadow-lg text-center h-full flex items-center justify-center">
            <p className="text-dark-text-secondary">Nenhum resultado para exibir. Analise as imagens para ver o ranking.</p>
        </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="text-3xl font-bold text-brand-primary">Ranking Final</h2>
          <button
              onClick={handleCopy}
              className={`flex items-center gap-2 text-sm font-semibold py-2 px-4 rounded-lg transition-all duration-200 w-full sm:w-auto justify-center ${
                  copyStatus === 'copied' 
                  ? 'bg-green-600 text-white' 
                  : copyStatus === 'error'
                  ? 'bg-red-600 text-white'
                  : 'bg-brand-primary hover:bg-brand-primary/80 text-dark-bg'
              }`}
          >
              {copyStatus === 'copied' ? (
                  <><CheckIcon className="w-4 h-4" /> Copiado!</>
              ) : copyStatus === 'error' ? (
                  <>Falhou</>
              ) : (
                  <><CopyIcon className="w-4 h-4" /> Copiar para WhatsApp</>
              )}
          </button>
      </div>
      <div className="space-y-3">
          {rankedResults.map((result, index) => {
              const rank = index + 1;
              const { border, rankColor, prizeColor } = getRankStyles(rank, adjustedPrizes.placementPrizes);

              return (
              <div
                key={result.id}
                className="bg-dark-surface p-4 rounded-xl border border-dark-border shadow-lg transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] hover:border-brand-primary/50 relative overflow-hidden group animate-fade-in-up"
                style={{ animationDelay: `${index * 80}ms`, opacity: 0 }}
              >
                  <div className={`absolute top-0 left-0 h-full w-1.5 bg-gradient-to-b ${border}`}></div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between ml-3">
                    
                      <div className="flex items-center space-x-4 min-w-0">
                          <div className="flex flex-col items-center justify-center w-12 shrink-0">
                              <span className={`font-black text-3xl tracking-tighter ${rankColor}`}>{rank}</span>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                              <p className="font-bold text-lg text-dark-text-primary truncate" title={result.matchResult.playerNames?.join(' & ') || 'N/A'}>
                                  {result.matchResult.playerNames?.join(' & ') || 'N/A'}
                              </p>
                              <p className="text-xs text-dark-text-secondary font-mono">
                                {formatCurrency(result.earnings.placementPrize)} (Pos) + {formatCurrency(result.earnings.killPrize)} (Kills)
                              </p>
                          </div>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end sm:space-x-6 mt-3 sm:mt-0 pl-16 sm:pl-0">
                          <div className="flex items-center justify-center gap-2 text-lg text-dark-text-secondary">
                              <SkullIcon className="w-5 h-5 text-red-400" />
                              <span className="font-semibold text-dark-text-primary">{result.matchResult.kills ?? 0}</span>
                          </div>
                          
                          <div className="text-right w-28">
                              <p className={`font-bold text-xl ${prizeColor} font-mono`}>
                                  {formatCurrency(result.earnings.total)}
                              </p>
                          </div>
                      </div>

                  </div>
              </div>
          )})}
      </div>
    </div>
  );
};