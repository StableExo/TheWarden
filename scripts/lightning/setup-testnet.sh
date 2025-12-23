#!/bin/bash
# Lightning Network Testnet Setup Script
# Sets up Core Lightning node for Bitcoin testnet development

set -e

echo "⚡ Lightning Network Testnet Setup"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo -e "${YELLOW}Warning: This script is optimized for Linux. You may need to adapt it for your OS.${NC}"
fi

# Check for Bitcoin Core
if ! command -v bitcoind &> /dev/null; then
    echo -e "${YELLOW}Bitcoin Core not found.${NC}"
    echo ""
    echo "Please install Bitcoin Core manually from:"
    echo "https://bitcoin.org/en/download"
    echo ""
    echo "Or on Ubuntu/Debian:"
    echo "sudo add-apt-repository ppa:bitcoin/bitcoin"
    echo "sudo apt-get update"
    echo "sudo apt-get install bitcoind bitcoin-qt"
    exit 1
fi

# Check for Core Lightning
if ! command -v lightningd &> /dev/null; then
    echo -e "${YELLOW}Core Lightning not found.${NC}"
    echo ""
    echo "Please install Core Lightning:"
    echo "https://docs.corelightning.org/docs/installation"
    exit 1
fi

echo -e "${GREEN}✓ Dependencies found${NC}"
echo ""

# Create data directories
LIGHTNING_DIR="$HOME/.lightning-testnet"
BITCOIN_DIR="$HOME/.bitcoin"

mkdir -p "$LIGHTNING_DIR"
mkdir -p "$BITCOIN_DIR"

echo -e "${GREEN}✓ Created data directories${NC}"
echo "  Lightning: $LIGHTNING_DIR"
echo "  Bitcoin: $BITCOIN_DIR"
echo ""

echo -e "${GREEN}✓ Setup complete!${NC}"
echo ""
echo "Next steps for testnet:"
echo "1. Start Bitcoin Core testnet: bitcoind -testnet -daemon"
echo "2. Start Core Lightning: lightningd --network=testnet --daemon"
echo "3. Check status: lightning-cli --testnet getinfo"
echo ""
