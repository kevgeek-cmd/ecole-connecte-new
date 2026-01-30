import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xoorazbqxgqhzadqball.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''; // To be filled by user or from env

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
