// Fill these in from your Supabase project settings (Settings > API)
const SUPABASE_URL = "https://uopcqncavzgykobrmgkz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcGNxbmNhdnpneWtvYnJtZ2t6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MDU1MTIsImV4cCI6MjEwODE4MTUxMn0.b9ZHmMxvoQhjgRqhXr9xbJzqklIx2GeWX52Z22AubOk";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
