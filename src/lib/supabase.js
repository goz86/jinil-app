import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nwmdhkzdtedpqkquwqrd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_iZtuF4Zwyr4zfj5IzEsdxg_N5_bpIP9';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
