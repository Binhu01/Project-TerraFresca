// Cliente compartilhado do Supabase — usado em todas as páginas do site
// (não só na tela de login) para saber se o usuário está autenticado.
const SUPABASE_URL = "https://khonungotuguqyvoikrc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtob251bmdvdHVndXF5dm9pa3JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0OTUwMzgsImV4cCI6MjEwMjA3MTAzOH0.MeJ0P1Uwux2Gk580hQMrnPNDmkfK3eDEVr6eMxLrVHQ";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
