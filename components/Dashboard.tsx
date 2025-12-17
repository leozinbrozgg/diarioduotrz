import React, { useEffect, useMemo, useState } from 'react';
import { reportStore } from '../services/reportStore';
import type { AnalysisRecord, ReportFilters } from '../types';
import { ResultsDisplay } from './ResultsDisplay';
import { TrashIcon } from './icons';

function formatBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function passDateFilter(dateISO: string, filters: ReportFilters) {
  const d = dateISO.slice(0, 10);
  if (filters.dateFrom && d < filters.dateFrom) return false;
  if (filters.dateTo && d > filters.dateTo) return false;
  return true;
}

function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export const Dashboard: React.FC = () => {
  const [filters, setFilters] = useState<ReportFilters>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedReport, setSelectedReport] = useState<AnalysisRecord | null>(null);
  const [confirmState, setConfirmState] = useState<{ open: boolean; message: string; onConfirm?: () => void }>({ open: false, message: '' });
  const [rawData, setRawData] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const handleBackup = async () => {
    try {
      const data = await reportStore.getAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trz-reports-backup-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {}
  };

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedReport(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    reportStore.getAll()
      .then(list => { if (mounted) setRawData(list); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [refreshKey]);

  const data = useMemo(() => {
    const playerQuery = filters.playerName ? normalizeName(filters.playerName) : '';
    return rawData.filter(r => {
      if (!passDateFilter(r.createdAt, filters)) return false;
      if (filters.tournament && r.tournament !== filters.tournament) return false;
      if (playerQuery) {
        const hasPlayer = r.entries.some(e => (e.matchResult.playerNames ?? [])
          .some(n => normalizeName(n).includes(playerQuery)));
        if (!hasPlayer) return false;
      }
      return true;
    });
  }, [rawData, filters]);

  const kpis = useMemo(() => {
    let totalArrecadado = 0;
    let totalLucro = 0;
    let totalPremios = 0;
    let partidas = 0;
    let kills = 0;

    data.forEach(rec => {
      const entryFee = rec.config.entryFee;
      const slots = rec.config.slotsSold;
      const arrecadado = entryFee * slots;
      const killPrize = (rec.config.adjustedPrizes?.killPrize ?? rec.config.prizeRules.killPrize);

      const premiosColocacao = Object.values(rec.config.adjustedPrizes?.placementPrizes ?? rec.config.prizeRules.placementPrizes)
        .reduce<number>((s, v) => s + Number(v), 0);

      const killsDaPartida = rec.entries.reduce((s, e) => s + (e.matchResult.kills ?? 0), 0);
      const premiosKills = killsDaPartida * killPrize;
      const totalPremiosPartida = premiosColocacao + premiosKills;

      totalArrecadado += arrecadado;
      totalPremios += totalPremiosPartida;
      totalLucro += Math.max(0, arrecadado - totalPremiosPartida);
      partidas += 1;
      kills += killsDaPartida;
    });

    return {
      totalArrecadado,
      totalLucro,
      totalPremios,
      partidas,
      kills,
      kdMedio: partidas > 0 ? kills / partidas : 0,
    };
  }, [data]);

  const { topKills, topParticipations } = useMemo(() => {
    const killsByPlayer = new Map<string, number>();
    const gamesByPlayer = new Map<string, number>();
    const displayByKey = new Map<string, string>();
    const playerQuery = filters.playerName ? normalizeName(filters.playerName) : '';

    data.forEach(rec => {
      rec.entries.forEach(e => {
        const players = e.matchResult.playerNames ?? [];
        if (players.length === 0) return;
        const kills = e.matchResult.kills ?? 0;
        const perPlayer = players.length > 0 ? kills / players.length : 0;
        players.forEach(p => {
          const key = normalizeName(p);
          if (!displayByKey.has(key)) displayByKey.set(key, p);
          killsByPlayer.set(key, (killsByPlayer.get(key) ?? 0) + perPlayer);
          gamesByPlayer.set(key, (gamesByPlayer.get(key) ?? 0) + 1);
        });
      });
    });

    let topKills = Array.from(killsByPlayer.entries())
      .map(([key, k]) => ({ name: displayByKey.get(key) ?? key, kills: k }))
      .sort((a, b) => b.kills - a.kills)
      .slice(0, 50);
    if (playerQuery) topKills = topKills.filter(r => normalizeName(r.name).includes(playerQuery));
    topKills = topKills.slice(0, 10);

    let topParticipations = Array.from(gamesByPlayer.entries())
      .map(([key, g]) => ({ name: displayByKey.get(key) ?? key, games: g }))
      .sort((a, b) => b.games - a.games)
      .slice(0, 50);
    if (playerQuery) topParticipations = topParticipations.filter(r => normalizeName(r.name).includes(playerQuery));
    topParticipations = topParticipations.slice(0, 10);

    return { topKills, topParticipations };
  }, [data]);

  const tournaments = useMemo(() => {
    const set = new Set<string>();
    rawData.forEach(r => { if (r.tournament) set.add(r.tournament); });
    return Array.from(set);
  }, [rawData]);

  return (
    <section>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-dark-text-secondary">De</label>
            <input
              type="date"
              className="w-full mt-1 bg-dark-surface border border-dark-border rounded-lg px-3 py-2"
              value={filters.dateFrom ?? ''}
              onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value || undefined }))}
            />
          </div>
          <div>
            <label className="text-xs text-dark-text-secondary">Até</label>
            <input
              type="date"
              className="w-full mt-1 bg-dark-surface border border-dark-border rounded-lg px-3 py-2"
              value={filters.dateTo ?? ''}
              onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value || undefined }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-dark-text-secondary">Torneio</label>
            <select
              className="w-full mt-1 bg-dark-surface border border-dark-border rounded-lg px-3 py-2"
              value={filters.tournament ?? ''}
              onChange={e => setFilters(f => ({ ...f, tournament: e.target.value || undefined }))}
            >
              <option value="">Todos</option>
              {tournaments.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-dark-text-secondary">Jogador (busca)</label>
            <input
              type="text"
              className="w-full mt-1 bg-dark-surface border border-dark-border rounded-lg px-3 py-2"
              placeholder="Ex.: joao, maria..."
              value={filters.playerName ?? ''}
              onChange={e => setFilters(f => ({ ...f, playerName: e.target.value || undefined }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
          <div className="bg-dark-surface rounded-xl border border-dark-border p-4">
            <div className="text-sm text-dark-text-secondary">Arrecadação</div>
            <div className="text-xl font-bold">{formatBRL(kpis.totalArrecadado)}</div>
          </div>
          <div className="bg-dark-surface rounded-xl border border-dark-border p-4">
            <div className="text-sm text-dark-text-secondary">Lucro</div>
            <div className="text-xl font-bold">{formatBRL(kpis.totalLucro)}</div>
          </div>
          <div className="bg-dark-surface rounded-xl border border-dark-border p-4">
            <div className="text-sm text-dark-text-secondary">Prêmios Pagos</div>
            <div className="text-xl font-bold">{formatBRL(kpis.totalPremios)}</div>
          </div>
          <div className="bg-dark-surface rounded-xl border border-dark-border p-4">
            <div className="text-sm text-dark-text-secondary">Partidas</div>
            <div className="text-xl font-bold">{kpis.partidas}</div>
          </div>
          <div className="bg-dark-surface rounded-xl border border-dark-border p-4">
            <div className="text-sm text-dark-text-secondary">Kills</div>
            <div className="text-xl font-bold">{kpis.kills}</div>
          </div>
          <div className="bg-dark-surface rounded-xl border border-dark-border p-4">
            <div className="text-sm text-dark-text-secondary">Kills/Partida</div>
            <div className="text-xl font-bold">{kpis.kdMedio.toFixed(2)}</div>
          </div>
        </div>

        <div className="mt-4 bg-dark-surface rounded-xl border border-dark-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">Relatórios</h3>
            <div className="flex gap-2">
              <button
                className="text-sm bg-dark-border/50 hover:bg-dark-border text-dark-text-primary px-3 py-1.5 rounded-lg"
                onClick={handleBackup}
              >Backup (JSON)</button>
              <button
                className="text-sm bg-dark-border/50 hover:bg-dark-border text-dark-text-primary px-3 py-1.5 rounded-lg"
                onClick={() => setRefreshKey(x => x + 1)}
              >Atualizar</button>
              <button
                className="text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg"
                onClick={() => setConfirmState({
                  open: true,
                  message: 'Limpar todos os relatórios?',
                  onConfirm: async () => { await reportStore.clear(); setRefreshKey(x => x + 1); }
                })}
              >Limpar</button>
            </div>
          </div>
          {loading ? (
            <div className="text-dark-text-secondary">Carregando...</div>
          ) : data.length === 0 ? (
            <div className="text-dark-text-secondary">Sem dados para os filtros selecionados.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-dark-text-secondary">
                    <th className="py-2 pr-4">Torneio</th>
                    <th className="py-2 pr-4">Arrecadado</th>
                    <th className="py-2 pr-4">Lucro Alvo</th>
                    <th className="py-2 pr-4">Lucro Real</th>
                    <th className="py-2 pr-4">Prêmios</th>
                    <th className="py-2 pr-4">Kills</th>
                    <th className="py-2 pr-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((r) => {
                    const entryFee = r.config.entryFee;
                    const slots = r.config.slotsSold;
                    const arrecadado = entryFee * slots;
                    const killPrize = (r.config.adjustedPrizes?.killPrize ?? r.config.prizeRules.killPrize);
                    const premiosColocacao = Object.values(r.config.adjustedPrizes?.placementPrizes ?? r.config.prizeRules.placementPrizes)
                      .reduce<number>((s, v) => s + Number(v), 0);
                    const playerQuery = filters.playerName ? normalizeName(filters.playerName) : '';
                    const killsDaPartida = r.entries.reduce((s, e) => {
                      const kills = e.matchResult.kills ?? 0;
                      const players = e.matchResult.playerNames ?? [];
                      if (!playerQuery) return s + kills;
                      // se houver filtro de jogador, somar apenas as kills atribuídas a esse jogador
                      const includesPlayer = players.some(n => normalizeName(n).includes(playerQuery));
                      if (!includesPlayer) return s;
                      const perPlayer = players.length > 0 ? kills / players.length : 0;
                      return s + perPlayer;
                    }, 0);
                    const premiosKills = killsDaPartida * killPrize;
                    const premios = premiosColocacao + premiosKills;
                    const lucroReal = Math.max(0, arrecadado - premios);
                    const lucroAlvo = r.config.adjustmentMode === 'fixed'
                      ? Math.min(arrecadado, r.config.fixedProfit ?? 0)
                      : arrecadado * 0.20; // para auto, alvo = 20% do arrecadado (referência)

                    return (
                      <tr key={r.id} className="border-t border-dark-border/60">
                        <td className="py-2 pr-4">{r.tournament ?? '-'}</td>
                        <td className="py-2 pr-4">{formatBRL(arrecadado)}</td>
                        <td className="py-2 pr-4">{formatBRL(lucroAlvo)}</td>
                        <td className="py-2 pr-4">{formatBRL(lucroReal)}</td>
                        <td className="py-2 pr-4">{formatBRL(premios)}</td>
                        <td className="py-2 pr-4">{killsDaPartida}</td>
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-2">
                            <button
                              className="bg-brand-primary/90 hover:bg-brand-primary text-dark-bg text-xs font-bold px-3 py-1.5 rounded-lg"
                              onClick={() => setSelectedReport(r)}
                            >Ver</button>
                            <button
                              className="bg-dark-border/60 hover:bg-dark-border text-dark-text-primary text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1"
                              onClick={() => setConfirmState({
                                open: true,
                                message: 'Excluir este relatório?',
                                onConfirm: async () => { await reportStore.remove(r.id); setRefreshKey(x => x + 1); }
                              })}
                              aria-label="Excluir relatório"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {data.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="bg-dark-surface rounded-xl border border-dark-border p-4">
              <h3 className="font-bold mb-2">Top Players por Kills</h3>
              {topKills.length === 0 ? (
                <div className="text-dark-text-secondary">Sem dados.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-dark-text-secondary">
                      <th className="py-2 pr-4">Player</th>
                      <th className="py-2 pr-4 text-right">Kills</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topKills.map((row) => (
                      <tr key={row.name} className="border-t border-dark-border/60">
                        <td className="py-2 pr-4">{row.name}</td>
                        <td className="py-2 pr-4 text-right">{row.kills.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="bg-dark-surface rounded-xl border border-dark-border p-4">
              <h3 className="font-bold mb-2">Top Players por Participações</h3>
              {topParticipations.length === 0 ? (
                <div className="text-dark-text-secondary">Sem dados.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-dark-text-secondary">
                      <th className="py-2 pr-4">Player</th>
                      <th className="py-2 pr-4 text-right">Partidas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topParticipations.map((row) => (
                      <tr key={row.name} className="border-t border-dark-border/60">
                        <td className="py-2 pr-4">{row.name}</td>
                        <td className="py-2 pr-4 text-right">{row.games}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
      {selectedReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSelectedReport(null)}
        >
          <div
            className="bg-dark-surface w-full max-w-3xl rounded-2xl border border-dark-border flex flex-col"
            style={{ maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 px-4 sm:px-6 py-3 border-b border-dark-border flex items-center justify-between bg-dark-surface rounded-t-2xl">
              <h3 className="font-bold text-lg">Relatório completo</h3>
              <button
                className="text-dark-text-secondary hover:text-dark-text-primary"
                onClick={() => setSelectedReport(null)}
                aria-label="Fechar"
              >✕</button>
            </div>
            <div className="px-4 sm:px-6 py-4 overflow-y-auto">
              <ResultsDisplay
                rankedResults={selectedReport.entries}
                adjustedPrizes={selectedReport.config.adjustedPrizes ?? {
                  placementPrizes: selectedReport.config.prizeRules.placementPrizes,
                  killPrize: selectedReport.config.prizeRules.killPrize,
                }}
              />
            </div>
            <div className="px-4 sm:px-6 py-3 border-t border-dark-border flex justify-end">
              <button
                className="bg-dark-border/50 hover:bg-dark-border text-dark-text-primary px-4 py-2 rounded-lg"
                onClick={() => setSelectedReport(null)}
              >Fechar</button>
            </div>
          </div>
        </div>
      )}
      {confirmState.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setConfirmState({ open: false, message: '' })}>
          <div className="bg-dark-surface w-full max-w-sm rounded-2xl border border-dark-border p-5" onClick={(e) => e.stopPropagation()}>
            <div className="text-sm text-dark-text-secondary mb-3">Confirmação</div>
            <div className="text-dark-text-primary mb-5">{confirmState.message}</div>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded-lg bg-dark-border/50 hover:bg-dark-border text-dark-text-primary"
                onClick={() => setConfirmState({ open: false, message: '' })}
              >Cancelar</button>
              <button
                className="px-4 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary/80 text-dark-bg"
                onClick={() => {
                  const fn = confirmState.onConfirm;
                  setConfirmState({ open: false, message: '' });
                  fn && fn();
                }}
              >Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Dashboard;
