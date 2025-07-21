/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  // Public variables (available on the client)
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;

  // Server-only variables (NEVER expose these to the client)
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  readonly ADMIN_TELEGRAM_IDS: string;
  readonly TELEGRAM_BOT_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}