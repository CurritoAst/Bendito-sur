// Seguridad: las claves reales se cargan desde variables de entorno (.env)
// Nunca subas el .env a GitHub. Configura las variables en Vercel > Settings > Environment Variables.
const CONFIG = {
    SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '',
    SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    STORAGE_BUCKET: import.meta.env.VITE_STORAGE_BUCKET || 'collab-tracks'
};
