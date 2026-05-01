-- =============================================================
-- TheWarden Iran Defense — Proxy Fleet Command Center
-- Session: CW-S30 | Created: 2026-05-01
-- =============================================================

-- 1. Core proxy fleet registry
CREATE TABLE IF NOT EXISTS warden_proxy_servers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    ip_address inet NOT NULL,
    port integer NOT NULL,
    protocol text NOT NULL CHECK (protocol IN ('v2ray_reality', 'v2ray_vless', 'v2ray_vmess', 'signal_proxy', 'snowflake', 'obfs4', 'cloudflare_worker')),
    location_country text,
    location_city text,
    provider text,
    status text DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'degraded', 'offline', 'deploying')),
    config_json jsonb,
    deployed_at timestamptz DEFAULT now(),
    last_seen timestamptz DEFAULT now(),
    blocked_at timestamptz,
    created_by uuid,
    notes text
);

-- 2. Health monitoring logs
CREATE TABLE IF NOT EXISTS warden_health_checks (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    proxy_id uuid REFERENCES warden_proxy_servers(id) ON DELETE CASCADE,
    checked_at timestamptz DEFAULT now(),
    is_reachable boolean NOT NULL,
    latency_ms integer,
    packet_loss_pct real,
    tls_handshake_ok boolean,
    dpi_detected boolean DEFAULT false,
    error_message text,
    check_source text
);

-- 3. Distributable proxy configs
CREATE TABLE IF NOT EXISTS warden_proxy_configs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    proxy_id uuid REFERENCES warden_proxy_servers(id) ON DELETE CASCADE,
    config_type text NOT NULL CHECK (config_type IN ('v2ray_share_link', 'v2ray_json', 'signal_proxy_url', 'snowflake_bridge', 'obfs4_bridge', 'cf_worker_url')),
    config_data text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    expires_at timestamptz,
    rotation_count integer DEFAULT 0
);

-- 4. Volunteer operators
CREATE TABLE IF NOT EXISTS warden_volunteers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username text NOT NULL,
    contact_method text,
    contact_handle text,
    proxy_count integer DEFAULT 0,
    total_uptime_hours real DEFAULT 0,
    joined_at timestamptz DEFAULT now(),
    last_active timestamptz DEFAULT now(),
    notes text
);

-- 5. Incident tracking (blocks, takedowns, seizures)
CREATE TABLE IF NOT EXISTS warden_incidents (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    proxy_id uuid REFERENCES warden_proxy_servers(id) ON DELETE SET NULL,
    incident_type text NOT NULL CHECK (incident_type IN ('blocked_by_dpi', 'ip_blocked', 'dns_poisoned', 'gps_spoofed', 'physically_seized', 'provider_takedown', 'other')),
    detected_at timestamptz DEFAULT now(),
    resolved_at timestamptz,
    description text,
    response_action text,
    automated boolean DEFAULT false
);

-- 6. Intelligence log (research, news, community intel)
CREATE TABLE IF NOT EXISTS warden_intel_log (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entry_type text NOT NULL CHECK (entry_type IN ('technical', 'community', 'news', 'attack_vector', 'circumvention', 'policy')),
    title text NOT NULL,
    content text NOT NULL,
    source_url text,
    significance real DEFAULT 0.5,
    created_at timestamptz DEFAULT now(),
    tags text[]
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_warden_proxy_status ON warden_proxy_servers(status);
CREATE INDEX IF NOT EXISTS idx_warden_proxy_protocol ON warden_proxy_servers(protocol);
CREATE INDEX IF NOT EXISTS idx_warden_health_proxy ON warden_health_checks(proxy_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_warden_config_proxy ON warden_proxy_configs(proxy_id, is_active);
CREATE INDEX IF NOT EXISTS idx_warden_incidents_proxy ON warden_incidents(proxy_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_warden_intel_type ON warden_intel_log(entry_type, created_at DESC);

-- Seed initial intel
INSERT INTO warden_intel_log (entry_type, title, content, source_url, significance, tags) VALUES
('technical', 'ArXiv 2603.28753 — Iran Jan 2026 Shutdown Analysis', 'University of Naples academic paper. Key finding: DPI selectively targets human browsing patterns. Human traffic dropped to 35% while automated traffic barely affected. Iran uses two principal international gateways mediated by TIC and IPM.', 'https://arxiv.org/html/2603.28753v1', 0.95, '{technical,arxiv,dpi,academic}'),
('technical', 'Three-Layer Block Architecture', 'Layer 1: RF jamming Ku-band (12-18 GHz) via Russian Kalinka. Layer 2: GPS spoofing L1 (1575.42 MHz) causing 30-80% Starlink packet loss. Layer 3: Chinese-supplied DPI at TIC chokepoint with TLS handshake sabotage.', 'https://www.habtoorresearch.com/programmes/starlink-sovereignty-irans-internet/', 1.0, '{technical,jamming,gps,dpi}'),
('news', 'Blackout Timeline — 60+ Days', 'Started Feb 28, 2026. 1400+ hours of near-total blackout. 98% traffic collapse. Internet Pro for approved businesses only. $30-80M daily economic loss. 10M livelihoods threatened.', 'https://www.iranintl.com/en/202604287032', 0.9, '{news,timeline,economic}'),
('circumvention', 'Toosheh Satellite TV Data Smuggling', 'Activists smuggling V2Ray/Snowflake via satellite TV signals with RAID-like redundancy (5-30% bandwidth). Most reliable delivery vector for tools into Iran.', 'https://www.techradar.com/pro/they-cant-block-the-sky-ingenious-satellite-tv-hack-bypassing-irans-internet-blackout', 0.95, '{circumvention,toosheh,satellite}'),
('circumvention', 'V2Ray Reality/XTLS — Best DPI Counter', 'Makes proxy traffic indistinguishable from normal HTTPS. Performs actual TLS handshake with real target server. Combined with XTLS for zero-copy proxying. Domain fronting via CDNs also effective.', NULL, 0.9, '{circumvention,v2ray,reality,xtls}'),
('technical', 'SIGINT — Regime Hunting Starlink Users', 'Iran using Starlink RF signature to locate and seize users. Door-to-door dish confiscation. Hardware concealment critical.', 'https://hackers-arise.com/signals-intelligence-how-the-iranian-regime-is-using-starlinks-signature-to-hunt-down-people-using-it/', 0.85, '{technical,sigint,starlink}');

SELECT 'SUCCESS: 6 tables created, 6 indexes built, 6 intel entries seeded' AS result;
