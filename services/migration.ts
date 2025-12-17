import { supabaseReports } from './supabaseReports';
import { reportStore } from './reportStore';

const MIGRATION_FLAG = 'trz_migration_done_v1';

export function isMigrationDone(): boolean {
  try {
    return !!localStorage.getItem(MIGRATION_FLAG);
  } catch {
    return false;
  }
}

export async function migrateLocalToSupabase(): Promise<{ migrated: number }> {
  if (isMigrationDone()) return { migrated: 0 };
  const reports = reportStore.getAll();
  for (const r of reports) {
    try {
      await supabaseReports.upsert(r);
    } catch (_) {}
  }
  try {
    localStorage.setItem(MIGRATION_FLAG, new Date().toISOString());
  } catch {}
  return { migrated: reports.length };
}
