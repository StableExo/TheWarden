/**
 * DEPRECATED compatibility shim.
 *
 * Environment loading has been unified onto utils/supabaseEnvLoader, which is
 * now the single source of truth. This module is retained only so that existing
 * imports (`initializeEnvironment`, `loadEnvFromSupabaseSync`) keep working; it
 * delegates directly to the canonical loader instead of duplicating Supabase
 * logic.
 */
export * from './supabaseEnvLoader';
import { loadEnvFromSupabase } from './supabaseEnvLoader';

/**
 * @deprecated Use `loadEnvFromSupabase` from './supabaseEnvLoader' directly.
 * Thin wrapper kept for backwards compatibility.
 */
export async function initializeEnvironment(): Promise<void> {
  const result = await loadEnvFromSupabase({
    environment: process.env.NODE_ENV || 'production',
    loadSecrets: true,
    merge: true,
    override: false,
  });
  if (!result.success) {
    throw new Error(
      'Failed to initialize environment from Supabase: ' +
        [...result.errors, ...result.missingRequired].join('; ')
    );
  }
}

/**
 * @deprecated Environment loading is asynchronous. Retained as a no-op so
 * existing callers still compile; use `loadEnvFromSupabase()` instead.
 */
export function loadEnvFromSupabaseSync(): void {
  console.warn(
    '[loadEnvFromSupabase] loadEnvFromSupabaseSync is deprecated and a no-op; use loadEnvFromSupabase().'
  );
}
