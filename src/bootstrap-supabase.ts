/**
 * Bootstrap entry point.
 *
 * NOTE: src/main.ts is now the single canonical entry point and loads
 * environment from Supabase directly via utils/supabaseEnvLoader.
 * This file is retained as a thin compatibility wrapper for deployments
 * that still reference the `start:supabase` script.
 */
import 'dotenv/config';
import { loadEnvFromSupabase } from './utils/supabaseEnvLoader';

async function bootstrap() {
  if (process.env.USE_SUPABASE === 'true') {
    const result = await loadEnvFromSupabase({
      environment: process.env.NODE_ENV || 'production',
      loadSecrets: true,
      merge: true,
      override: false,
    });
    if (!result.success) {
      console.error(
        'Bootstrap failed - Supabase environment errors: ' +
          [...result.errors, ...result.missingRequired].join('; ')
      );
      process.exit(1);
    }
  }
  const { main } = await import('./main');
  await main();
}

bootstrap().catch((error) => {
  console.error('Unhandled bootstrap error:', error);
  process.exit(1);
});
