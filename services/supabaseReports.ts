import { supabase } from './supabaseClient';
import type { AnalysisRecord } from '../types';

const TABLE = 'reports';

type DbReport = {
  id: string;
  created_at: string;
  tournament: string | null;
  mode: string | null;
  entries: any;
  config: any;
};

function toDb(record: AnalysisRecord): DbReport {
  return {
    id: record.id,
    created_at: new Date(record.createdAt).toISOString(),
    tournament: record.tournament ?? null,
    mode: record.mode ?? null,
    entries: record.entries,
    config: record.config,
  };
}

function fromDb(row: DbReport): AnalysisRecord {
  return {
    id: row.id,
    createdAt: row.created_at,
    tournament: row.tournament,
    mode: row.mode,
    entries: row.entries,
    config: row.config,
  };
}

export const supabaseReports = {
  async upsert(record: AnalysisRecord): Promise<void> {
    const { error } = await supabase.from(TABLE).upsert(toDb(record), { onConflict: 'id' });
    if (error) throw error;
  },
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  },
  async list(): Promise<AnalysisRecord[]> {
    const { data, error } = await supabase.from(TABLE).select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data as DbReport[]).map(fromDb);
  },
};
