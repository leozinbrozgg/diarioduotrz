import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

if (!SUPABASE_URL) {
  throw new Error('VITE_SUPABASE_URL não definido. Crie um arquivo .env com VITE_SUPABASE_URL="https://<project>.supabase.co"');
}
if (!SUPABASE_ANON_KEY) {
  throw new Error('VITE_SUPABASE_ANON_KEY não definido. Crie um arquivo .env com VITE_SUPABASE_ANON_KEY="<anon key>"');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
