#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Anvil default deployer key (account[0])
PRIVATE_KEY="${PRIVATE_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  CNFNC — Local anvil deployment          ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── 1. Deploy contracts ──────────────────────────────────────────────────────
echo "==> [1/2] Deploying contracts to anvil..."
cd "$ROOT_DIR/contracts"

PRIVATE_KEY="$PRIVATE_KEY" forge script script/DeployLocal.s.sol:DeployLocal \
  --rpc-url "$RPC_URL" \
  --broadcast \
  --private-key "$PRIVATE_KEY" \
  -vv

echo ""

# ── 2. Build merkle trees for all three collections ──────────────────────────
echo "==> [2/2] Building merkle trees for all collections..."
cd "$SCRIPT_DIR"

PRIVATE_KEY="$PRIVATE_KEY" RPC_URL="$RPC_URL" npx tsx update-merkle.ts

echo ""
echo "✓ Done. Start the frontend with: cd frontend && pnpm dev"
