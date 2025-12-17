import React, { useState, useEffect } from 'react';
import { DEFAULT_SLOTS } from '../constants';
import type { PrizeRules, AdjustedPrizes } from '../types';
import { SaveIcon, PlusIcon, TrashIcon, LockIcon, UnlockIcon } from './icons';

interface TournamentSettingsProps {
    slotsSold: number;
    setSlotsSold: (value: number) => void;
    adjustmentMode: 'auto' | 'fixed';
    setAdjustmentMode: (value: 'auto' | 'fixed') => void;
    fixedProfit: number;
    setFixedProfit: (value: number) => void;
    isDisabled: boolean;
    entryFee: number;
    prizeRules: PrizeRules;
    onSave: (config: { entryFee: number; prizeRules: PrizeRules }) => void;
    adjustedPrizes: AdjustedPrizes | null;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-dark-surface p-5 rounded-xl border border-dark-border">
        <h3 className="text-lg font-bold text-brand-primary mb-4">{title}</h3>
        {children}
    </div>
);

const LabeledInput: React.FC<{label: string, id: string, value: number | string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, type?: string, disabled?: boolean, min?: number, max?: number, step?: number, currency?: boolean}> = 
({ label, id, value, onChange, type = "number", disabled = false, min, max, step = "0.01", currency = false}) => (
    <div className="flex flex-col">
        <label htmlFor={id} className="block text-sm font-semibold text-dark-text-secondary mb-1">{label}</label>
        <div className="relative">
            {currency && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-text-secondary">R$</span>}
            <input
                type={type}
                id={id}
                value={value}
                onChange={onChange}
                min={min}
                max={max}
                step={step}
                disabled={disabled}
                className={`w-full bg-dark-bg p-2 rounded-lg border border-dark-border focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition disabled:opacity-50 ${currency ? 'pl-9' : ''}`}
            />
        </div>
    </div>
);

export const TournamentSettings: React.FC<TournamentSettingsProps> = ({
    slotsSold, setSlotsSold, adjustmentMode, setAdjustmentMode, fixedProfit, setFixedProfit,
    isDisabled, entryFee, prizeRules, onSave, adjustedPrizes
}) => {
    const [localEntryFee, setLocalEntryFee] = useState(entryFee);
    const [localPrizeRules, setLocalPrizeRules] = useState(prizeRules);
    const [savedMessage, setSavedMessage] = useState(false);
    const [isPrizesLocked, setIsPrizesLocked] = useState(true);

    useEffect(() => {
        setLocalEntryFee(entryFee);
        setLocalPrizeRules(prizeRules);
    }, [entryFee, prizeRules]);

    useEffect(() => {
        const h = setTimeout(() => {
            onSave({ entryFee: localEntryFee, prizeRules: localPrizeRules });
        }, 600);
        return () => clearTimeout(h);
    }, [localEntryFee, localPrizeRules, onSave]);

    const handleSave = () => {
        onSave({ entryFee: localEntryFee, prizeRules: localPrizeRules });
        setSavedMessage(true);
        setTimeout(() => setSavedMessage(false), 2000);
    };

    const handlePrizeChange = (key: 'killPrize' | number, value: number) => {
        if (key === 'killPrize') {
            setLocalPrizeRules(prev => ({ ...prev, killPrize: value }));
        } else {
            setLocalPrizeRules(prev => ({
                ...prev,
                placementPrizes: { ...prev.placementPrizes, [key]: value }
            }));
        }
    };

    const handleAddPrize = () => {
        setLocalPrizeRules(prev => {
            const existingRanks = Object.keys(prev.placementPrizes).map(Number);
            const maxRank = existingRanks.length > 0 ? Math.max(...existingRanks) : 0;
            const newRank = maxRank + 1;
            const newPrizes = { ...prev.placementPrizes, [newRank]: 0 };
            return { ...prev, placementPrizes: newPrizes };
        });
    };

    const handleRemovePrize = (rankToRemove: number) => {
        setLocalPrizeRules(prev => {
            const newPrizes = { ...prev.placementPrizes };
            delete newPrizes[rankToRemove];
            return { ...prev, placementPrizes: newPrizes };
        });
    };

    const totalCollected = slotsSold * localEntryFee;
    
    const sortedRanks = Object.keys(localPrizeRules.placementPrizes).map(Number).sort((a, b) => a - b);

    return (
        <div className="space-y-6">
            <Section title="Configurações Gerais">
                <div className="grid grid-cols-2 gap-4">
                    <LabeledInput label="Vagas Vendidas" id="slots-sold" value={slotsSold === 0 ? '' : slotsSold} onChange={(e) => setSlotsSold(parseInt(e.target.value, 10) || 0)} min={2} max={DEFAULT_SLOTS} disabled={isDisabled} />
                    <LabeledInput label="Inscrição (R$)" id="entry-fee" value={localEntryFee} onChange={(e) => setLocalEntryFee(parseFloat(e.target.value) || 0)} disabled={isDisabled} currency />
                </div>
                
                 <p className="text-sm text-dark-text-secondary mt-4">Total Arrecadado: <span className="font-bold text-brand-primary">{totalCollected.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></p>
            </Section>

            <Section title="Ajuste de Lucro">
                <div className="flex gap-4">
                    {['auto', 'fixed'].map((mode) => (
                        <button key={mode} onClick={() => setAdjustmentMode(mode as 'auto' | 'fixed')} disabled={isDisabled} className={`flex-1 p-2 rounded-lg text-sm font-bold transition ${adjustmentMode === mode ? 'bg-brand-primary text-dark-bg ring-2 ring-brand-primary' : 'bg-dark-bg text-dark-text-primary hover:bg-dark-border/50'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                            {mode === 'auto' ? 'Automático' : 'Lucro Fixo'}
                        </button>
                    ))}
                </div>
                 {adjustmentMode === 'fixed' && (
                     <div className="pt-4 animate-fade-in-up">
                        <LabeledInput label="Lucro do Organizador (R$)" id="fixed-profit" value={fixedProfit} onChange={(e) => setFixedProfit(parseFloat(e.target.value) || 0)} disabled={isDisabled} currency />
                    </div>
                )}
            </Section>
            
            <div className="bg-dark-surface p-5 rounded-xl border border-dark-border">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-brand-primary">Regras de Premiação (Base)</h3>
                    <button
                        onClick={() => setIsPrizesLocked(prev => !prev)}
                        disabled={isDisabled}
                        className="p-2 text-dark-text-secondary hover:text-dark-text-primary transition disabled:opacity-50"
                        aria-label={isPrizesLocked ? "Desbloquear edição" : "Bloquear edição"}
                    >
                        {isPrizesLocked ? <LockIcon className="h-5 w-5" /> : <UnlockIcon className="h-5 w-5" />}
                    </button>
                </div>
                 <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        {sortedRanks.map(rank => (
                            <div key={rank} className="flex items-end gap-2">
                                <div className="flex-1">
                                    <LabeledInput label={`TOP ${rank}`} id={`top${rank}-prize`} value={localPrizeRules.placementPrizes[rank] ?? 0} onChange={(e) => handlePrizeChange(rank, parseFloat(e.target.value) || 0)} disabled={isDisabled || isPrizesLocked} currency />
                                </div>
                                <button onClick={() => handleRemovePrize(rank)} disabled={isDisabled || isPrizesLocked} className="p-2 h-10 w-10 bg-dark-bg rounded-lg border border-dark-border text-brand-primary hover:bg-brand-primary/10 hover:border-brand-primary/50 transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0">
                                    <TrashIcon className="h-5 w-5 mx-auto" />
                                </button>
                            </div>
                        ))}
                    </div>
                     <button onClick={handleAddPrize} disabled={isDisabled || isPrizesLocked} className="w-full flex items-center justify-center gap-2 bg-dark-bg hover:bg-dark-border/50 text-dark-text-secondary font-bold py-2 px-4 rounded-lg transition-colors border border-dark-border disabled:opacity-50 disabled:cursor-not-allowed">
                         <PlusIcon />
                         Adicionar TOP
                     </button>
                    <div className="pt-2">
                        <LabeledInput label="Por Abate (Kill)" id="kill-prize" value={localPrizeRules.killPrize} onChange={(e) => handlePrizeChange('killPrize', parseFloat(e.target.value) || 0)} disabled={isDisabled || isPrizesLocked} currency />
                    </div>
                 </div>
            </div>

            <button onClick={handleSave} disabled={isDisabled} className="w-full flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary/80 text-dark-bg font-bold py-3 px-4 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]">
                <SaveIcon />
                {savedMessage ? 'Configurações Salvas!' : 'Salvar Configurações'}
            </button>
        </div>
    );
};