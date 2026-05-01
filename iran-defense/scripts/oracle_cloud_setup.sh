#!/bin/bash
# =============================================================
# TheWarden Iran Defense — Oracle Cloud Free Tier VM Setup
# =============================================================
# This script provisions 4 ARM-based VMs on Oracle Cloud Free Tier
# Total: 4 VMs × 6GB RAM × 1 OCPU = 24GB RAM, 4 OCPUs ($0/month)
# 
# Prerequisites:
#   - Oracle Cloud account (sign up at cloud.oracle.com)
#   - OCI CLI installed: https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/cliinstall.htm
#   - SSH key pair generated
# =============================================================

set -euo pipefail

# ─── CONFIG ───────────────────────────────────────────────────
COMPARTMENT_ID="${OCI_COMPARTMENT_ID}"     # Your compartment OCID
SSH_PUBLIC_KEY_FILE="$HOME/.ssh/warden_rsa.pub"
SSH_PRIVATE_KEY_FILE="$HOME/.ssh/warden_rsa"

# Free Tier ARM shape
SHAPE="VM.Standard.A1.Flex"
OCPUS=1          # 1 per VM (4 total across fleet)
MEMORY_GB=6      # 6GB per VM (24GB total across fleet)

# Ubuntu 22.04 Minimal ARM image
# Find your region's image OCID: oci compute image list --compartment-id $COMPARTMENT_ID --shape VM.Standard.A1.Flex
IMAGE_ID=""  # <-- SET THIS for your region

# Availability Domain
AD=""  # <-- SET THIS (e.g., "Ixxxx:US-ASHBURN-AD-1")

# Subnet OCID (create a VCN first if needed)
SUBNET_ID=""  # <-- SET THIS

# Server names and regions for geographic diversity
declare -A SERVERS=(
    ["warden-proxy-us-east"]="us-ashburn-1"
    ["warden-proxy-eu-west"]="eu-frankfurt-1"  
    ["warden-proxy-ap-south"]="ap-mumbai-1"
    ["warden-proxy-ap-east"]="ap-tokyo-1"
)

# ─── GENERATE SSH KEY ─────────────────────────────────────────
if [ ! -f "$SSH_PRIVATE_KEY_FILE" ]; then
    echo "🔑 Generating SSH key pair..."
    ssh-keygen -t rsa -b 4096 -f "$SSH_PRIVATE_KEY_FILE" -N "" -C "warden-fleet"
    echo "✅ SSH key generated: $SSH_PRIVATE_KEY_FILE"
fi

# ─── CREATE VCN + SUBNET (if needed) ─────────────────────────
create_networking() {
    echo "🌐 Creating VCN..."
    VCN_ID=$(oci network vcn create \
        --compartment-id "$COMPARTMENT_ID" \
        --display-name "warden-vcn" \
        --cidr-blocks '["10.0.0.0/16"]' \
        --query 'data.id' --raw-output)
    
    echo "🌐 Creating Internet Gateway..."
    IG_ID=$(oci network internet-gateway create \
        --compartment-id "$COMPARTMENT_ID" \
        --vcn-id "$VCN_ID" \
        --display-name "warden-igw" \
        --is-enabled true \
        --query 'data.id' --raw-output)
    
    echo "🌐 Creating Route Table..."
    RT_ID=$(oci network route-table create \
        --compartment-id "$COMPARTMENT_ID" \
        --vcn-id "$VCN_ID" \
        --display-name "warden-rt" \
        --route-rules "[{\"destination\":\"0.0.0.0/0\",\"networkEntityId\":\"$IG_ID\"}]" \
        --query 'data.id' --raw-output)

    echo "🌐 Creating Security List (allow 443, 22, V2Ray ports)..."
    SL_ID=$(oci network security-list create \
        --compartment-id "$COMPARTMENT_ID" \
        --vcn-id "$VCN_ID" \
        --display-name "warden-sl" \
        --ingress-security-rules '[
            {"source":"0.0.0.0/0","protocol":"6","tcpOptions":{"destinationPortRange":{"min":22,"max":22}}},
            {"source":"0.0.0.0/0","protocol":"6","tcpOptions":{"destinationPortRange":{"min":443,"max":443}}},
            {"source":"0.0.0.0/0","protocol":"6","tcpOptions":{"destinationPortRange":{"min":8443,"max":8443}}}
        ]' \
        --egress-security-rules '[{"destination":"0.0.0.0/0","protocol":"all"}]' \
        --query 'data.id' --raw-output)
    
    echo "🌐 Creating Subnet..."
    SUBNET_ID=$(oci network subnet create \
        --compartment-id "$COMPARTMENT_ID" \
        --vcn-id "$VCN_ID" \
        --display-name "warden-subnet" \
        --cidr-block "10.0.1.0/24" \
        --route-table-id "$RT_ID" \
        --security-list-ids "[\"$SL_ID\"]" \
        --query 'data.id' --raw-output)
    
    echo "✅ Networking ready. Subnet: $SUBNET_ID"
}

# ─── LAUNCH VM ────────────────────────────────────────────────
launch_vm() {
    local name=$1
    echo "🚀 Launching $name..."
    
    INSTANCE_ID=$(oci compute instance launch \
        --compartment-id "$COMPARTMENT_ID" \
        --availability-domain "$AD" \
        --shape "$SHAPE" \
        --shape-config "{\"ocpus\":$OCPUS,\"memoryInGBs\":$MEMORY_GB}" \
        --image-id "$IMAGE_ID" \
        --subnet-id "$SUBNET_ID" \
        --display-name "$name" \
        --ssh-authorized-keys-file "$SSH_PUBLIC_KEY_FILE" \
        --assign-public-ip true \
        --query 'data.id' --raw-output)
    
    echo "  Instance ID: $INSTANCE_ID"
    
    # Wait for running state
    echo "  Waiting for RUNNING state..."
    oci compute instance action --action RESET --instance-id "$INSTANCE_ID" 2>/dev/null || true
    
    # Get public IP
    sleep 30
    PUBLIC_IP=$(oci compute instance list-vnics \
        --instance-id "$INSTANCE_ID" \
        --query 'data[0]."public-ip"' --raw-output)
    
    echo "  ✅ $name launched at $PUBLIC_IP"
    echo "$name,$INSTANCE_ID,$PUBLIC_IP" >> warden_fleet.csv
}

# ─── MAIN ─────────────────────────────────────────────────────
echo "======================================"
echo " TheWarden Proxy Fleet Provisioning"
echo "======================================"
echo ""

# Step 1: Networking
if [ -z "$SUBNET_ID" ]; then
    create_networking
fi

# Step 2: Launch VMs
echo "" > warden_fleet.csv
echo "name,instance_id,public_ip" >> warden_fleet.csv

for name in "${!SERVERS[@]}"; do
    launch_vm "$name"
    sleep 5  # Avoid rate limits
done

echo ""
echo "======================================"
echo " Fleet provisioned!"
echo " See warden_fleet.csv for details"
echo "======================================"
cat warden_fleet.csv
