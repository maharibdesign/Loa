import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// This client is safe for client-side use (RLS is enforced)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// For server-side, we'll create a new client with the service role key
// inside our API routes to bypass RLS when necessary.
export const createSupabaseAdmin = () => {
    const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseServiceKey) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set in environment variables.");
    }
    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
};