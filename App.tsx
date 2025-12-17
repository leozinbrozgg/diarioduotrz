import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { ResultsDisplay } from './components/ResultsDisplay';
import { Loader } from './components/Loader';
import { TournamentSettings } from './components/TournamentSettings';
import { Tabs } from './components/Tabs';
import { Header } from './components/Header';
import Dashboard from './components/Dashboard';
import { analyzeImage } from './services/geminiService';
import type { MatchResult, RankedResult, PrizeRules, AdjustedPrizes, AnalysisRecord } from './types';
import { PLACEMENT_PRIZES, KILL_PRIZE, ENTRY_FEE_PER_DUO, DEFAULT_SLOTS } from './constants';
import { UploadIcon, SettingsIcon, RankingIcon } from './components/icons';
import { reportStore } from './services/reportStore';
import { supabaseSettings } from './services/supabaseSettings';
import { supabase } from './services/supabaseClient';

const App: React.FC = () => {
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [rankedResults, setRankedResults] = useState<RankedResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'uploader' | 'settings' | 'ranking' | 'dashboard'>('settings');

  // Tournament Settings State
  const [slotsSold, setSlotsSold] = useState(DEFAULT_SLOTS);
  const [adjustmentMode, setAdjustmentMode] = useState<'auto' | 'fixed'>('auto');
  const [fixedProfit, setFixedProfit] = useState(20);
  const [entryFee, setEntryFee] = useState(ENTRY_FEE_PER_DUO);
  const [prizeRules, setPrizeRules] = useState<PrizeRules>({
    placementPrizes: PLACEMENT_PRIZES,
    killPrize: KILL_PRIZE,
  });

  useEffect(() => {
    let mounted = true;
    supabaseSettings.get().then(s => {
      if (!mounted) return;
      if (s.entryFee != null) setEntryFee(s.entryFee);
      if (s.prizeRules) setPrizeRules(s.prizeRules);
      if (s.adjustmentMode) setAdjustmentMode(s.adjustmentMode);
      if (s.fixedProfit != null) setFixedProfit(s.fixedProfit);
    }).catch(() => {});
    const onFocus = () => {
      supabaseSettings.get().then(s => {
        if (s.entryFee != null) setEntryFee(s.entryFee);
        if (s.prizeRules) setPrizeRules(s.prizeRules);
        if (s.adjustmentMode) setAdjustmentMode(s.adjustmentMode);
        if (s.fixedProfit != null) setFixedProfit(s.fixedProfit);
      }).catch(() => {});
    };
    window.addEventListener('focus', onFocus);
    const channel = supabase.channel('settings-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: 'id=eq.global' }, (payload) => {
        const row: any = payload.new ?? payload.old ?? {};
        if (row.entry_fee != null) setEntryFee(row.entry_fee);
        if (row.prize_rules) setPrizeRules(row.prize_rules);
        if (row.adjustment_mode) setAdjustmentMode(row.adjustment_mode);
        if (row.fixed_profit != null) setFixedProfit(row.fixed_profit);
      })
      .subscribe();
    return () => {
      mounted = false;
      window.removeEventListener('focus', onFocus);
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    supabaseSettings.save({ adjustmentMode, fixedProfit }).catch(() => {});
  }, [adjustmentMode, fixedProfit]);

  const getDefaultTournamentName = () => {
    const now = new Date();
    const date = now.toLocaleDateString('pt-BR');
    const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${date} ${time}`;
  };

  const adjustedPrizes = useMemo<AdjustedPrizes | null>(() => {
    if (slotsSold === 0) return null;
    
    if (slotsSold === DEFAULT_SLOTS) {
      return { placementPrizes: prizeRules.placementPrizes, killPrize: prizeRules.killPrize };
    }

    const totalCollected = slotsSold * entryFee;
    const organizerProfit = adjustmentMode === 'auto'
      ? totalCollected * 0.20
      : fixedProfit;

    const totalPrizePool = Math.max(0, totalCollected - organizerProfit);

    const baseTotalPlacementPrizes = Object.values(prizeRules.placementPrizes).reduce<number>((sum, prize) => sum + Number(prize), 0);
    const estimatedKillsInFullLobby = 60;
    const baseTotalKillPrizes = estimatedKillsInFullLobby * prizeRules.killPrize;
    const baseTotalPrizePool = baseTotalPlacementPrizes + baseTotalKillPrizes;

    if (baseTotalPrizePool === 0) {
      return { placementPrizes: {}, killPrize: 0 };
    }

    const scalingFactor = totalPrizePool / baseTotalPrizePool;

    const newPlacementPrizes: Record<number, number> = {};
    for (const rank in prizeRules.placementPrizes) {
      newPlacementPrizes[rank] = prizeRules.placementPrizes[rank] * scalingFactor;
    }

    const newKillPrize = prizeRules.killPrize;

    return { placementPrizes: newPlacementPrizes, killPrize: newKillPrize };
  }, [slotsSold, adjustmentMode, fixedProfit, entryFee, prizeRules]);

  const handleImageChange = useCallback((files: FileList) => {
    const newFiles = Array.from(files);
    setImageFiles(prev => [...prev, ...newFiles]);
    const newUrls = newFiles.map(file => URL.createObjectURL(file));
    setImageUrls(prev => [...prev, ...newUrls]);
  }, []);

  const handleRemoveImage = useCallback((index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImageUrls(prev => {
      const urlToRemove = prev[index];
      URL.revokeObjectURL(urlToRemove);
      return prev.filter((_, i) => i !== index);
    });
  }, []);
  
  const calculateEarnings = useCallback((matchResult: MatchResult): { placementPrize: number; killPrize: number; total: number; } => {
      const prizes = adjustedPrizes ?? { placementPrizes: prizeRules.placementPrizes, killPrize: prizeRules.killPrize };
      const placement = matchResult.placement ?? 0;
      const kills = matchResult.kills ?? 0;
      
      const placementPrize = prizes.placementPrizes[placement] ?? 0;
      const killPrize = kills * prizes.killPrize;
      const total = placementPrize + killPrize;

      return { placementPrize, killPrize, total };
  }, [adjustedPrizes, prizeRules]);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, Math.max(0, ms)));

  const handleAnalyze = useCallback(async () => {
    if (imageFiles.length === 0) return;
    setIsAnalyzing(true);
    setError(null);
    setRankedResults([]);
    setActiveTab('ranking');

    try {
      const resolvedTournamentName = getDefaultTournamentName();
      const resultsFromAI: Array<MatchResult[]> = [];
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const res = await analyzeImage(file);
        resultsFromAI.push(res);
        if (i < imageFiles.length - 1) await sleep(1300);
      }
      const allMatchResults = resultsFromAI.flat();

      const resultsWithEarnings: RankedResult[] = allMatchResults
        .filter(mr => mr.placement !== null && mr.placement > 0)
        .map((matchResult, index) => ({
            id: `${matchResult.playerNames?.join('') ?? 'unknown'}-${index}`,
            matchResult,
            earnings: calculateEarnings(matchResult),
        }));

      resultsWithEarnings.sort((a, b) => {
        const placementA = a.matchResult.placement ?? Infinity;
        const placementB = b.matchResult.placement ?? Infinity;
        if (placementA !== placementB) return placementA - placementB;
        const killsA = a.matchResult.kills ?? 0;
        const killsB = b.matchResult.kills ?? 0;
        return killsB - killsA;
      });
      
      setRankedResults(resultsWithEarnings);

      // Persist report to LocalStorage
      const record: AnalysisRecord = {
        id: `${Date.now()}`,
        createdAt: new Date().toISOString(),
        tournament: resolvedTournamentName || null,
        mode: null,
        entries: resultsWithEarnings,
        config: {
          entryFee,
          slotsSold,
          prizeRules,
          adjustedPrizes: adjustedPrizes ?? null,
          adjustmentMode,
          fixedProfit,
        },
      };
      await reportStore.add(record);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Ocorreu um erro desconhecido durante a análise.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [imageFiles, calculateEarnings, entryFee, slotsSold, prizeRules, adjustedPrizes, adjustmentMode, fixedProfit]);

  const handleReset = useCallback(() => {
    imageUrls.forEach(url => URL.revokeObjectURL(url));
    setImageFiles([]);
    setImageUrls([]);
    setRankedResults([]);
    setError(null);
    setIsAnalyzing(false);
    setActiveTab('uploader');
  }, [imageUrls]);

  const handleSaveSettings = useCallback(async (config: { entryFee: number; prizeRules: PrizeRules }) => {
    setEntryFee(config.entryFee);
    setPrizeRules(config.prizeRules);
    await supabaseSettings.save({ entryFee: config.entryFee, prizeRules: config.prizeRules });
  }, []);

  const hasResults = rankedResults.length > 0;

  const tabs = [
    { id: 'settings', label: 'Configurações', icon: <SettingsIcon /> },
    { id: 'uploader', label: 'Upload', icon: <UploadIcon /> },
    { id: 'ranking', label: 'Ranking', icon: <RankingIcon /> },
    { id: 'dashboard', label: 'Dashboard', icon: <RankingIcon /> },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'uploader':
        return (
          <ImageUploader
            imageUrls={imageUrls}
            onImageChange={handleImageChange}
            onRemoveImage={handleRemoveImage}
            onAnalyze={handleAnalyze}
            onReset={handleReset}
            isAnalyzing={isAnalyzing}
            hasResults={hasResults}
          />
        );
      case 'settings':
        return (
          <TournamentSettings 
            slotsSold={slotsSold}
            setSlotsSold={setSlotsSold}
            adjustmentMode={adjustmentMode}
            setAdjustmentMode={setAdjustmentMode}
            fixedProfit={fixedProfit}
            setFixedProfit={setFixedProfit}
            isDisabled={isAnalyzing || hasResults}
            entryFee={entryFee}
            prizeRules={prizeRules}
            onSave={handleSaveSettings}
            adjustedPrizes={adjustedPrizes}
          />
        );
      case 'ranking':
        if (isAnalyzing) return <Loader />;
        if (error) return (
          <div className="bg-red-900/20 p-6 rounded-2xl border border-red-500/30 text-center">
            <h3 className="text-xl font-bold text-red-400">Erro na Análise</h3>
            <p className="mt-2 text-red-300">{error}</p>
            <button
                onClick={handleReset}
                className="mt-6 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-5 rounded-lg transition-colors"
            >
                Tentar Novamente
            </button>
          </div>
        );
        return <ResultsDisplay rankedResults={rankedResults} adjustedPrizes={adjustedPrizes ?? { placementPrizes: prizeRules.placementPrizes, killPrize: prizeRules.killPrize }} />;
      case 'dashboard':
        return <Dashboard />;
      default:
        return null;
    }
  };
  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <Header />
        <main>
            <Tabs
              tabs={tabs}
              activeTab={activeTab}
              setActiveTab={(tabId) => setActiveTab(tabId as any)}
              disabled={isAnalyzing}
            />
            <div className="mt-8">
              {renderContent()}
            </div>
        </main>
      </div>
    </div>
  );
};

export default App;