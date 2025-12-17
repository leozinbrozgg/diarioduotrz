import type { AnalysisRecord } from '../types';
import { supabaseReports } from './supabaseReports';

const STORAGE_KEY = 'trz_reports_v1';

function readAll(): AnalysisRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AnalysisRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(list: AnalysisRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function formatDefaultTournament(createdAtISO: string): string {
  const d = new Date(createdAtISO);
  const date = d.toLocaleDateString('pt-BR');
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
}

function needsNormalization(t?: string | null): boolean {
  if (t == null || t === '') return true;
  if (typeof t !== 'string') return true;
  if (/^DIÁRIO-/.test(t)) return true;
  if (/^DATA \+ HORÁRIO\b/.test(t)) return true;
  if (/^\d{2}\/\d{2}\/\d{4}[, ]\s*\d{2}:\d{2}$/.test(t)) return true;
  return false;
}

export const reportStore = {
  async getAll(): Promise<AnalysisRecord[]> {
    const all = await supabaseReports.list();
    return all.map(r => needsNormalization(r.tournament) ? { ...r, tournament: formatDefaultTournament(r.createdAt) } : r);
  },
  async add(record: AnalysisRecord): Promise<void> {
    await supabaseReports.upsert(record);
  },
  async update(id: string, patch: Partial<AnalysisRecord>): Promise<void> {
    const list = await supabaseReports.list();
    const current = list.find(r => r.id === id);
    if (!current) return;
    const updated = { ...current, ...patch } as AnalysisRecord;
    await supabaseReports.upsert(updated);
  },
  async remove(id: string): Promise<void> {
    await supabaseReports.remove(id);
  },
  async clear(): Promise<void> {
    const rows = await supabaseReports.list();
    await Promise.all(rows.map(r => supabaseReports.remove(r.id)));
  }
};

