/**
 * DEPRECATED compatibility shim.
 *
 * Environment loading has been unified onto utils/supabaseEnvLoader, which is
 * now the single source of truth. This module is retained only so that existing
 * imports of `initializeEnvironment` keep working; it delegates directly to the
 * canonical loader instead of duplicating the Supabase logic.
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
