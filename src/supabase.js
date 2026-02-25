// src/supabase.js — Cliente Supabase para CarBot System
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lpiwkennlavpzisdvnnh.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwaXdrZW5ubGF2cHppc2R2bm5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3ODE4MTEsImV4cCI6MjA4NzM1NzgxMX0.HMVGq8E2Lf5utJGxWsO8FEnJXCBzwSHVNEzeuoSm4y8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'carbot-session',
    },
});

export const SUPABASE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;
