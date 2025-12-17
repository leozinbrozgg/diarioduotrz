import { supabase } from './supabaseClient';
import type { PrizeRules } from '../types';

const TABLE = 'settings';
const ID = 'global';

type DbSettings = {
  id: string;
  entry_fee: number | null;
  adjustment_mode: 'auto' | 'fixed' | null;
  fixed_profit: number | null;
  prize_rules: any | null;
};

export type AppSettings = {
  entryFee: number | null;
  adjustmentMode: 'auto' | 'fixed' | null;
  fixedProfit: number | null;
  prizeRules: PrizeRules | null;
};

function fromDb(row: DbSettings | null): AppSettings {
  if (!row) return { entryFee: null, adjustmentMode: null, fixedProfit: null, prizeRules: null };
  return {
    entryFee: row.entry_fee ?? null,
    adjustmentMode: (row.adjustment_mode as 'auto' | 'fixed' | null) ?? null,
    fixedProfit: row.fixed_profit ?? null,
    prizeRules: (row.prize_rules as PrizeRules | null) ?? null,
  };
}

export const supabaseSettings = {
  async get(): Promise<AppSettings> {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', ID).maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    return fromDb((data as DbSettings) ?? null);
  },
  async save(patch: Partial<AppSettings>): Promise<void> {
    const payload: Partial<DbSettings> = { id: ID };
    if (Object.prototype.hasOwnProperty.call(patch, 'entryFee')) payload.entry_fee = patch.entryFee as any;
    if (Object.prototype.hasOwnProperty.call(patch, 'adjustmentMode')) payload.adjustment_mode = patch.adjustmentMode as any;
    if (Object.prototype.hasOwnProperty.call(patch, 'fixedProfit')) payload.fixed_profit = patch.fixedProfit as any;
    if (Object.prototype.hasOwnProperty.call(patch, 'prizeRules')) payload.prize_rules = patch.prizeRules as any;
    const { error } = await supabase.from(TABLE).upsert(payload, { onConflict: 'id' });
    if (error) throw error;
  },
};
