# Iran Defense Deployment Guide

## Architecture
```
Oracle Cloud Free Tier (4 ARM VMs)
    └── V2Ray Reality + XTLS (port 443)
         └── Camouflaged as microsoft.com HTTPS
              └── DPI-invisible to Iranian TIC

CodeWords Health Monitor (every 5 min)
    └── TCP check → TLS handshake → DPI detection
         └── Results → Supabase → Incidents → Alerts
```

## Step 1: Provision Oracle Cloud VMs
```bash
# Install OCI CLI first
# Set your COMPARTMENT_ID, IMAGE_ID, AD, SUBNET_ID in the script
chmod +x scripts/oracle_cloud_setup.sh
./scripts/oracle_cloud_setup.sh
```

## Step 2: Deploy V2Ray Reality on Each VM
```bash
# SSH to each server and run:
ssh ubuntu@<server-ip> 'bash -s' < scripts/v2ray_reality_deploy.sh

# SAVE the output — it contains UUID, keys, and connection string
# Register each server in Supabase warden_proxy_servers table
```

## Step 3: Register Servers in Supabase
Insert into `warden_proxy_servers`:
```sql
INSERT INTO warden_proxy_servers (name, ip_address, port, protocol, sni, status)
VALUES ('warden-proxy-us-east', '1.2.3.4', 443, 'vless-reality', 'www.microsoft.com', 'active');
```

## Step 4: Health Monitor Activates
The CodeWords health monitor (service: `warden_health_monitor_d585c11b`) 
auto-schedules every 5 min on first run. It will:
- TCP check each server
- TLS handshake test
- DPI detection (connection resets, cert anomalies)
- Log to `warden_health_checks`
- Create incidents in `warden_incidents`

## Key Resources
- **Service ID:** `warden_health_monitor_d585c11b`
- **Supabase Tables:** warden_proxy_servers, warden_health_checks, warden_incidents
- **GitHub:** StableExo/TheWarden/iran-defense/
