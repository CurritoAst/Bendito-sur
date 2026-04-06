// Seguridad: las claves se cargan desde variables de entorno de Vite (.env)
export const CONFIG = {
    SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '',
    SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    STORAGE_BUCKET: import.meta.env.VITE_STORAGE_BUCKET || 'collab-tracks'
};
