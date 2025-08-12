'use client';

import { createClient } from '@supabase/supabase-js';

// Hardcode the values temporarily to test
const supabaseUrl = 'https://gavlijclvhmmlmhoypji.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhdmxpamNsdmhtbWxtaG95cGppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NTU2NTIsImV4cCI6MjA2OTIzMTY1Mn0.KcX-z8HSxZFxPOBqNHxKfNwgLwkBU81U1EX4W7BC6zw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;