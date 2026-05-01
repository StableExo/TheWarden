#!/bin/bash
# =============================================================
# TheWarden — V2Ray Reality + XTLS Deployment
# =============================================================
# Run this ON EACH proxy server after provisioning.
# V2Ray Reality makes traffic indistinguishable from normal HTTPS.
# DPI cannot fingerprint it — it performs real TLS handshakes.
#
# Usage: ssh ubuntu@<server-ip> 'bash -s' < deploy_v2ray.sh
# =============================================================

set -euo pipefail

# ─── CONFIG ───────────────────────────────────────────────────
V2RAY_PORT=443
REALITY_DEST="www.microsoft.com:443"  # Camouflage target
REALITY_SERVER_NAMES="www.microsoft.com,microsoft.com"

# ─── SYSTEM SETUP ────────────────────────────────────────────
echo "📦 Updating system..."
sudo apt-get update -qq && sudo apt-get upgrade -y -qq
sudo apt-get install -y -qq curl jq openssl uuid-runtime

# ─── INSTALL XRAY (V2Ray compatible, XTLS/Reality support) ──
echo "📥 Installing Xray-core..."
bash -c "$(curl -L https://github.com/XTLS/Xray-install/raw/main/install-release.sh)" @ install

# ─── GENERATE KEYS ────────────────────────────────────────────
echo "🔑 Generating Reality keypair..."
KEYS=$(xray x25519)
PRIVATE_KEY=$(echo "$KEYS" | grep "Private" | awk '{print $3}')
PUBLIC_KEY=$(echo "$KEYS" | grep "Public" | awk '{print $3}')
SHORT_ID=$(openssl rand -hex 8)
UUID=$(uuidgen)

echo ""
echo "═══════════════════════════════════════"
echo " SAVE THESE VALUES:"
echo "═══════════════════════════════════════"
echo " UUID:        $UUID"
echo " Private Key: $PRIVATE_KEY"
echo " Public Key:  $PUBLIC_KEY"
echo " Short ID:    $SHORT_ID"
echo " Port:        $V2RAY_PORT"
echo " SNI:         $REALITY_DEST"
echo "═══════════════════════════════════════"
echo ""

# Save to file for health monitor
cat > /etc/xray/warden_config.json <<EOF
{
    "uuid": "$UUID",
    "public_key": "$PUBLIC_KEY",
    "short_id": "$SHORT_ID",
    "port": $V2RAY_PORT,
    "sni": "$(echo $REALITY_DEST | cut -d: -f1)",
    "server_ip": "$(curl -s ifconfig.me)",
    "protocol": "vless",
    "transport": "tcp",
    "security": "reality"
}
EOF

# ─── XRAY CONFIG ─────────────────────────────────────────────
echo "⚙️ Writing Xray config..."
cat > /usr/local/etc/xray/config.json <<EOF
{
    "log": {
        "loglevel": "warning",
        "access": "/var/log/xray/access.log",
        "error": "/var/log/xray/error.log"
    },
    "inbounds": [
        {
            "port": $V2RAY_PORT,
            "protocol": "vless",
            "settings": {
                "clients": [
                    {
                        "id": "$UUID",
                        "flow": "xtls-rprx-vision"
                    }
                ],
                "decryption": "none"
            },
            "streamSettings": {
                "network": "tcp",
                "security": "reality",
                "realitySettings": {
                    "show": false,
                    "dest": "$REALITY_DEST",
                    "xver": 0,
                    "serverNames": [$(echo "$REALITY_SERVER_NAMES" | sed 's/,/","/g' | sed 's/^/"/;s/$/"/')],
                    "privateKey": "$PRIVATE_KEY",
                    "shortIds": ["$SHORT_ID"]
                }
            },
            "sniffing": {
                "enabled": true,
                "destOverride": ["http", "tls", "quic"]
            }
        }
    ],
    "outbounds": [
        {
            "protocol": "freedom",
            "tag": "direct"
        },
        {
            "protocol": "blackhole",
            "tag": "block"
        }
    ],
    "routing": {
        "rules": [
            {
                "type": "field",
                "ip": ["geoip:private"],
                "outboundTag": "block"
            },
            {
                "type": "field",
                "protocol": ["bittorrent"],
                "outboundTag": "block"
            }
        ]
    }
}
EOF

# ─── FIREWALL ─────────────────────────────────────────────────
echo "🔥 Configuring firewall..."
sudo iptables -I INPUT -p tcp --dport $V2RAY_PORT -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 22 -j ACCEPT
sudo apt-get install -y -qq iptables-persistent
sudo netfilter-persistent save

# ─── START SERVICE ────────────────────────────────────────────
echo "🚀 Starting Xray..."
sudo mkdir -p /var/log/xray
sudo systemctl enable xray
sudo systemctl restart xray
sleep 2

if systemctl is-active --quiet xray; then
    echo "✅ Xray is RUNNING on port $V2RAY_PORT"
    echo ""
    echo "═══════════════════════════════════════"
    echo " CLIENT CONNECTION STRING (V2Ray):"
    echo "═══════════════════════════════════════"
    SERVER_IP=$(curl -s ifconfig.me)
    echo " vless://$UUID@$SERVER_IP:$V2RAY_PORT?encryption=none&flow=xtls-rprx-vision&security=reality&sni=$(echo $REALITY_DEST | cut -d: -f1)&fp=chrome&pbk=$PUBLIC_KEY&sid=$SHORT_ID&type=tcp#warden-$(hostname)"
    echo "═══════════════════════════════════════"
else
    echo "❌ Xray failed to start"
    sudo journalctl -u xray --no-pager -n 20
    exit 1
fi

# ─── HEALTH CHECK ENDPOINT ───────────────────────────────────
echo ""
echo "📡 Setting up health check helper..."
cat > /usr/local/bin/warden-health <<'HEALTH_EOF'
#!/bin/bash
# Quick health check — returns JSON for the health monitor
IP=$(curl -s ifconfig.me 2>/dev/null || echo "unknown")
XRAY=$(systemctl is-active xray)
UPTIME=$(uptime -p)
LOAD=$(cat /proc/loadavg | awk '{print $1}')
MEM=$(free -m | awk '/Mem:/ {printf "%.0f", $3/$2*100}')

echo "{"ip":"$IP","xray":"$XRAY","uptime":"$UPTIME","load":"$LOAD","mem_pct":"$MEM%"}"
HEALTH_EOF
chmod +x /usr/local/bin/warden-health

echo ""
echo "✅ Deployment complete!"
echo "   Run 'warden-health' for quick status check"
echo "   Config saved to /etc/xray/warden_config.json"
