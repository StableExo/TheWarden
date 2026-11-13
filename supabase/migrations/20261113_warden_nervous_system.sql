-- ============================================================================
-- 20261113_warden_nervous_system.sql
-- Phase 2B: Supabase Nervous System & Memory Consolidation
--
-- ADDITIVE AND IDEMPOTENT. This migration:
--   * creates the 6 missing runtime tables and cognitive_ledger (IF NOT EXISTS)
--   * ensures warden_memories has an embedding column + HNSW cosine index
--     (the column ALREADY EXISTS live; the guard makes this a safe no-op)
--   * exposes semantic_memories as a writable compatibility VIEW over
--     warden_memories (single source of truth, no data duplication)
--   * does NOT alter, rename or drop environment_configs, environment_secrets,
--     warden_*, consciousness_states, episodic_memories, or any other object
--   * does NOT enable RLS on warden_memories (left exactly as it is today)
--
-- VERIFIED against live project pxbjuhtnmvfywbwmdkdr on 2026-11-13.
-- warden_memories live columns (confirmed by select): id, session_id, type,
-- content, significance, emotional_tag, trigger_event, consolidated,
-- created_at, metadata, content_tsv, embedding, needs_embedding.
--
-- RLS MODEL: SELECT for `authenticated`; INSERT/UPDATE/DELETE for `service_role`.
-- => Application writes must use the SERVICE ROLE key. The env loader falls back
--    to the anon key, which will NOT be able to write after this migration.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Extensions (guarded)
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;   -- pgvector
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pgvector could not be enabled (%); embedding objects will be skipped', SQLERRM;
END $$;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- 1. environment_configs  (matches SupabaseEnvStorage.EnvironmentConfig)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS environment_configs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_name      text NOT NULL UNIQUE,
  config_value     text NOT NULL,
  description      text,
  category         text CHECK (category IN ('database','api','blockchain','service','feature_flag')),
  is_required      boolean NOT NULL DEFAULT false,
  value_type       text CHECK (value_type IN ('string','number','boolean','json','url')),
  validation_regex text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  created_by       text,
  updated_by       text
);

DROP TRIGGER IF EXISTS trg_environment_configs_updated_at ON environment_configs;
CREATE TRIGGER trg_environment_configs_updated_at BEFORE UPDATE ON environment_configs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE environment_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_authenticated" ON environment_configs;
CREATE POLICY "select_authenticated" ON environment_configs
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "crud_service_role" ON environment_configs;
CREATE POLICY "crud_service_role" ON environment_configs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 2. environment_secrets  (matches SupabaseEnvStorage.EnvironmentSecret)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS environment_secrets (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id         uuid REFERENCES environment_configs(id) ON DELETE SET NULL,
  secret_name       text NOT NULL UNIQUE,
  encrypted_value   text NOT NULL,
  encryption_key_id text DEFAULT 'default',
  description       text,
  category          text CHECK (category IN ('api_key','private_key','password','token','credential')),
  allowed_services  text[] NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  last_accessed_at  timestamptz,
  created_by        text,
  updated_by        text,
  access_count      integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_environment_secrets_category ON environment_secrets(category);

DROP TRIGGER IF EXISTS trg_environment_secrets_updated_at ON environment_secrets;
CREATE TRIGGER trg_environment_secrets_updated_at BEFORE UPDATE ON environment_secrets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE environment_secrets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_authenticated" ON environment_secrets;
CREATE POLICY "select_authenticated" ON environment_secrets
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "crud_service_role" ON environment_secrets;
CREATE POLICY "crud_service_role" ON environment_secrets
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 3. consciousness_states  (matches MemoryAdapter.loadState/saveState)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consciousness_states (
  session_id            text PRIMARY KEY,
  version               text NOT NULL DEFAULT '1.0.0',
  saved_at              timestamptz NOT NULL DEFAULT now(),
  thoughts              jsonb NOT NULL DEFAULT '[]'::jsonb,
  self_awareness_state  jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata              jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE consciousness_states ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_authenticated" ON consciousness_states;
CREATE POLICY "select_authenticated" ON consciousness_states
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "crud_service_role" ON consciousness_states;
CREATE POLICY "crud_service_role" ON consciousness_states
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 4. episodic_memories  (matches MemoryAdapter.appendToLog)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS episodic_memories (
  episode_id  text PRIMARY KEY,
  type        text NOT NULL DEFAULT 'memory_log',
  context     jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  importance  numeric(3,2) NOT NULL DEFAULT 0.5,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_episodic_memories_type    ON episodic_memories(type);
CREATE INDEX IF NOT EXISTS idx_episodic_memories_created ON episodic_memories(created_at DESC);

ALTER TABLE episodic_memories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_authenticated" ON episodic_memories;
CREATE POLICY "select_authenticated" ON episodic_memories
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "crud_service_role" ON episodic_memories;
CREATE POLICY "crud_service_role" ON episodic_memories
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 5. cognitive_ledger  (unified event log, kept from Phase 2A)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cognitive_ledger (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type   text NOT NULL,
  session_id   text,
  actor        text,
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  significance numeric(3,2),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cognitive_ledger_session ON cognitive_ledger(session_id);
CREATE INDEX IF NOT EXISTS idx_cognitive_ledger_type    ON cognitive_ledger(event_type);
CREATE INDEX IF NOT EXISTS idx_cognitive_ledger_created ON cognitive_ledger(created_at DESC);

ALTER TABLE cognitive_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_authenticated" ON cognitive_ledger;
CREATE POLICY "select_authenticated" ON cognitive_ledger
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "crud_service_role" ON cognitive_ledger;
CREATE POLICY "crud_service_role" ON cognitive_ledger
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 6. execution_queue  (event-driven work queue)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS execution_queue (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind            text NOT NULL,
  target          text,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','leased','running','completed','failed','dead')),
  priority        integer NOT NULL DEFAULT 0,
  attempts        integer NOT NULL DEFAULT 0,
  max_attempts    integer NOT NULL DEFAULT 5,
  idempotency_key text UNIQUE,
  available_at    timestamptz NOT NULL DEFAULT now(),
  leased_at       timestamptz,
  leased_by       text,
  started_at      timestamptz,
  completed_at    timestamptz,
  last_error      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_execution_queue_ready ON execution_queue(status, available_at, priority DESC);
CREATE INDEX IF NOT EXISTS idx_execution_queue_kind  ON execution_queue(kind);

DROP TRIGGER IF EXISTS trg_execution_queue_updated_at ON execution_queue;
CREATE TRIGGER trg_execution_queue_updated_at BEFORE UPDATE ON execution_queue
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE execution_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_authenticated" ON execution_queue;
CREATE POLICY "select_authenticated" ON execution_queue
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "crud_service_role" ON execution_queue;
CREATE POLICY "crud_service_role" ON execution_queue
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 7. guardrail_policies  (action gating for Base Mainnet execution)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS guardrail_policies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  description text,
  scope       text,
  conditions  jsonb NOT NULL DEFAULT '{}'::jsonb,
  action      text NOT NULL CHECK (action IN ('allow','deny','require_approval','rate_limit')),
  priority    integer NOT NULL DEFAULT 100,
  enabled     boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_guardrail_policies_enabled ON guardrail_policies(enabled, priority);

DROP TRIGGER IF EXISTS trg_guardrail_policies_updated_at ON guardrail_policies;
CREATE TRIGGER trg_guardrail_policies_updated_at BEFORE UPDATE ON guardrail_policies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE guardrail_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_authenticated" ON guardrail_policies;
CREATE POLICY "select_authenticated" ON guardrail_policies
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "crud_service_role" ON guardrail_policies;
CREATE POLICY "crud_service_role" ON guardrail_policies
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Seed safe defaults (idempotent)
INSERT INTO guardrail_policies (name, description, scope, conditions, action, priority, enabled)
VALUES
  ('DRY_RUN',
   'Master switch. While enabled, live execution is denied system-wide.',
   'global',
   '{"dry_run": true}'::jsonb,
   'deny', 1, true),
  ('REQUIRE_APPROVAL_FOR_LIVE',
   'Live arbitrage actions require human approval before broadcast.',
   'base_mainnet_arbitrage',
   '{}'::jsonb,
   'require_approval', 10, true)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 8. warden_memories: ensure embedding column + HNSW index (pgvector, guarded)
--    NOTE: the `embedding` column ALREADY EXISTS live (nullable, currently
--    all NULL). ADD COLUMN IF NOT EXISTS is therefore a safe no-op; the index
--    is created if missing. No existing data is touched.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.warden_memories') IS NULL THEN
    RAISE NOTICE 'warden_memories not found; skipping embedding objects';
  ELSIF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    RAISE NOTICE 'pgvector not installed; skipping embedding index';
  ELSE
    ALTER TABLE warden_memories ADD COLUMN IF NOT EXISTS embedding vector(1536);
    CREATE INDEX IF NOT EXISTS idx_warden_memories_embedding
      ON warden_memories USING hnsw (embedding vector_cosine_ops);
    RAISE NOTICE 'warden_memories.embedding present; HNSW cosine index ensured';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 9. semantic_memories: compatibility VIEW over warden_memories
--    MemoryAdapter reads (select *, textSearch('content'), count) and writes
--    (insert memory_id/content/category/tags/importance/metadata).
--    INSTEAD OF triggers route writes back into warden_memories.
--    All referenced base columns are verified to exist live.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW semantic_memories AS
SELECT
  id::text                                   AS memory_id,
  content                                    AS content,
  COALESCE(type, 'general')                  AS category,
  CASE
    WHEN emotional_tag IS NULL THEN '{}'::text[]
    ELSE ARRAY[emotional_tag]
  END                                        AS tags,
  COALESCE(significance, 0.5)::numeric(3,2)  AS importance,
  COALESCE(metadata, '{}'::jsonb)            AS metadata,
  created_at                                 AS created_at
FROM warden_memories;

-- Access on the view (views can't hold policies; use grants)
REVOKE ALL ON semantic_memories FROM anon, authenticated;
GRANT SELECT ON semantic_memories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON semantic_memories TO service_role;

-- Write-through triggers
CREATE OR REPLACE FUNCTION semantic_memories_view_insert() RETURNS trigger AS $$
BEGIN
  INSERT INTO warden_memories (content, type, significance, emotional_tag, trigger_event)
  VALUES (
    NEW.content,
    COALESCE(NEW.category, 'general'),
    COALESCE(NEW.importance, 0.5),
    CASE
      WHEN NEW.tags IS NULL OR array_length(NEW.tags, 1) IS NULL THEN NULL
      ELSE NEW.tags[1]
    END,
    COALESCE(NEW.metadata->>'trigger_event', 'semantic_memories:insert')
  );
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION semantic_memories_view_update() RETURNS trigger AS $$
BEGIN
  UPDATE warden_memories
     SET content      = COALESCE(NEW.content, content),
         type         = COALESCE(NEW.category, type),
         significance = COALESCE(NEW.importance, significance)
   WHERE id::text = OLD.memory_id;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION semantic_memories_view_delete() RETURNS trigger AS $$
BEGIN
  DELETE FROM warden_memories WHERE id::text = OLD.memory_id;
  RETURN OLD;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_semantic_memories_ins ON semantic_memories;
CREATE TRIGGER trg_semantic_memories_ins INSTEAD OF INSERT ON semantic_memories
  FOR EACH ROW EXECUTE FUNCTION semantic_memories_view_insert();

DROP TRIGGER IF EXISTS trg_semantic_memories_upd ON semantic_memories;
CREATE TRIGGER trg_semantic_memories_upd INSTEAD OF UPDATE ON semantic_memories
  FOR EACH ROW EXECUTE FUNCTION semantic_memories_view_update();

DROP TRIGGER IF EXISTS trg_semantic_memories_del ON semantic_memories;
CREATE TRIGGER trg_semantic_memories_del INSTEAD OF DELETE ON semantic_memories
  FOR EACH ROW EXECUTE FUNCTION semantic_memories_view_delete();

-- ============================================================================
-- END 20261113_warden_nervous_system.sql
-- ============================================================================
