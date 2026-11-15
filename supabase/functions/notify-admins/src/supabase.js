import { createClient } from '@supabase/supabase-js';

const url = 'https://rvfjilocipalgnxgaimx.supabase.co/rest/v1/';
const anonKey = 'sb_publishable_O-8S4AUmvLFSQKEGxBJGUg_Z0JuVTyU';

export const supabase = createClient(url, anonKey);
