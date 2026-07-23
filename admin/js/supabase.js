// Include Supabase JS SDK via CDN in HTML:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>


// admin/js/supabase.js

const SUPABASE_URL = 'https://vgudgxgqtfwphipmxojx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jiBv3ptizlkNw8o-4schqQ_VvZMKg0c'; // Your full key

// Use 'supabaseClient' instead of 'supabase' to avoid naming collisions
window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);