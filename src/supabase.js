import { createClient } from '@supabase/supabase-js';

// Browser-safe public credentials only. Never put a service-role key here.
export const supabase = createClient(
  'https://yassefyrmhqoskjcpqxx.supabase.co',
  'sb_publishable_4dYIulT_GK5tnAjWbRmyzg_Gmqv_upo',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);
